from django.db.models.signals import post_save, pre_save, m2m_changed
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile, generate_password, generate_user_id
from newsapp.models import *
from django.db import transaction
from django.core.mail import EmailMultiAlternatives, send_mail
from django.conf import settings
from django.utils.html import escape
import re


def _admin_base_url():
    configured = getattr(settings, "NEWSROOM_ADMIN_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    return "https://news4bharat.cloud/admin"


def _article_admin_url(article_id):
    return f"{_admin_base_url()}/newsapp/article/{article_id}/change/"


def _send_rich_email(*, subject, text_body, html_body, recipient_list):
    if not recipient_list:
        return

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "") or None,
        to=recipient_list,
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=True)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and not getattr(instance, '_disable_signals', False):

        if not instance.is_staff:
            instance.is_staff = True
            instance.save(update_fields=['is_staff'])

        UserProfile.objects.get_or_create(
            user=instance,
            defaults={'plain_password': ''},
        )


# ══════════════════════════════════════════════════════════════
#  STAFF ID GENERATION — ROLES ASSIGN HONE KE BAAD
# ══════════════════════════════════════════════════════════════

@receiver(m2m_changed, sender=UserProfile.roles.through)
def generate_staff_id_after_roles(sender, instance, action, **kwargs):
    if action == "post_add" and (not instance.staff_id or instance.staff_id.startswith("N4B-GEN")):
        prefix_map = {
            "reporter":         "REP",
            "journalist":       "REP",
            "editor":           "EDT",
            "managing editor":  "EDT",
            "section editor":   "EDT",
            "video editor":     "VID",
            "social media":     "SOC",
            "fact checker":     "FCK",
            "legal reviewer":   "LGL",
            "contributor":      "CNT",
            "advertiser":       "ADV",
            "super admin":      "SAD",
        }
        first_role = instance.roles.first()
        role_prefix = "GEN"
        if first_role:
            role_prefix = prefix_map.get(first_role.name.strip().lower(), "GEN")

        with transaction.atomic():
            profiles = (
                UserProfile.objects
                .select_for_update()
                .filter(staff_id__startswith=f"N4B-{role_prefix}-")
            )
            max_num = 0
            for p in profiles:
                m = re.search(rf"N4B-{role_prefix}-(\d+)", p.staff_id or "")
                if m:
                    max_num = max(max_num, int(m.group(1)))

            next_num = str(max_num + 1).zfill(3)
            instance.staff_id = f"N4B-{role_prefix}-{next_num}"
            instance.save(update_fields=["staff_id"])


# ══════════════════════════════════════════════════════════════
#  ARTICLE SIGNALS
# ══════════════════════════════════════════════════════════════

@receiver(pre_save, sender=Article)
def store_old_assigned(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_article = Article.objects.get(pk=instance.pk)
            instance._old_assigned_to = old_article.assigned_to
            instance._old_status = old_article.status
        except Article.DoesNotExist:
            instance._old_assigned_to = None
            instance._old_status = None
    else:
        instance._old_assigned_to = None
        instance._old_status = None


@receiver(post_save, sender=Article)
def article_assigned(sender, instance, created, **kwargs):
    if not instance.assigned_to:
        return
    old_assigned = getattr(instance, '_old_assigned_to', None)
    if created or (old_assigned != instance.assigned_to):
        Notification.objects.create(
            user=instance.assigned_to,
            notif_type="assign",
            title="New Assignment",
            message=f'You were assigned "{instance.title}"',
            icon="",
            action_url=f"/admin/newsapp/article/{instance.id}/change/"
        )


@receiver(post_save, sender=Article)
def article_status_notification(sender, instance, **kwargs):
    old_status = getattr(instance, '_old_status', None)

    if old_status == instance.status:
        return

    article_admin_url = _article_admin_url(instance.id)
    author_name = instance.author.get_full_name() or instance.author.username 
    safe_title = escape(instance.title)
    safe_author_name = escape(author_name)
    safe_article_admin_url = escape(article_admin_url)

    if instance.status == "review":
        super_admins = User.objects.filter(
            is_active=True,
            is_superuser=True,
        ).exclude(email__exact="")

        for admin_user in super_admins:
            Notification.objects.create(
                user=admin_user,
                notif_type="article",
                title="Article Sent For Review",
                message=f"'{instance.title}' has been submitted for review by {instance.author.get_full_name() or instance.author.username}.",
                icon="",
                action_url=article_admin_url,
            )

        recipient_list = list(super_admins.values_list("email", flat=True))
        if recipient_list:
            try:
                _send_rich_email(
                    subject=f"Article Submitted For Review: {instance.title}",
                    text_body=(
                        f"Hello Team,\n\n"
                        f"A new article has been submitted for editorial review on News4Bharat.\n\n"
                        f"Article Title: {instance.title}\n"
                        f"Submitted By: {author_name}\n"
                        f"Review Link: {article_admin_url}\n\n"
                        f"Please review the article in the admin panel. The publishing workflow will move forward only after an admin approves it.\n\n"
                        f"If anything looks unclear, or if you need context before approving, please coordinate with the editorial admin team.\n\n"
                        f"Regards,\nNews4Bharat CMS"
                    ),
                    recipient_list=recipient_list,
                    html_body=(
                        f"<div style='font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;'>"
                        f"<p style='margin:0 0 12px;'>Hello Team,</p>"
                        f"<p style='margin:0 0 14px;'>A new article has been submitted for editorial review on <strong>News4Bharat</strong>.</p>"
                        f"<div style='background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:0 0 16px;'>"
                        f"<p style='margin:0 0 8px;'><strong>Article Title:</strong> {safe_title}</p>"
                        f"<p style='margin:0;'><strong>Submitted By:</strong> {safe_author_name}</p>"
                        f"</div>"
                        f"<p style='margin:0 0 14px;'>Please review the article in the admin panel. The workflow will move forward <strong>only after admin approval</strong>.</p>"
                        f"<p style='margin:0 0 18px;'><a href='{safe_article_admin_url}' style='display:inline-block;background:#d80100;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;'>Open Article In Admin</a></p>"
                        f"<p style='margin:0 0 10px;'>If anything looks unclear or you need more context before approving, please contact the admin team.</p>"
                        f"<p style='margin:0;color:#6b7280;font-size:13px;'>Direct link: <a href='{safe_article_admin_url}'>{safe_article_admin_url}</a></p>"
                        f"</div>"
                    ),
                )
            except Exception:
                pass

    if instance.status == "approved":
        Notification.objects.create(
            user=instance.author,
            notif_type="article",
            title="Article Approved",
            message=f"Your article '{instance.title}' has been approved by admin.",
            icon="",
            action_url=article_admin_url,
        )
        if instance.author.email:
            try:
                _send_rich_email(
                    subject=f"Article Approved: {instance.title}",
                    text_body=(
                        f"Hello {author_name},\n\n"
                        f"Good news. Your article has been approved by admin and the workflow has moved to the next stage.\n\n"
                        f"Article Title: {instance.title}\n"
                        f"Open Article: {article_admin_url}\n\n"
                        f"You may now review the latest status in the admin panel. If you have any questions, please contact the admin team.\n\n"
                        f"Regards,\nNews4Bharat CMS"
                    ),
                    recipient_list=[instance.author.email],
                    html_body=(
                        f"<div style='font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;'>"
                        f"<p style='margin:0 0 12px;'>Hello {safe_author_name},</p>"
                        f"<p style='margin:0 0 14px;'>Good news. Your article has been <strong>approved by admin</strong> and the workflow has moved forward.</p>"
                        f"<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin:0 0 16px;'>"
                        f"<p style='margin:0;'><strong>Article Title:</strong> {safe_title}</p>"
                        f"</div>"
                        f"<p style='margin:0 0 18px;'><a href='{safe_article_admin_url}' style='display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;'>View Article Status</a></p>"
                        f"<p style='margin:0 0 10px;'>You can review the latest status in the admin panel. If anything is unclear, please contact the admin team.</p>"
                        f"<p style='margin:0;color:#6b7280;font-size:13px;'>Direct link: <a href='{safe_article_admin_url}'>{safe_article_admin_url}</a></p>"
                        f"</div>"
                    ),
                )
            except Exception:
                pass

    if instance.status == "published":
        Notification.objects.create(
            user=instance.author,
            notif_type="article",
            title="Article Published",
            message=f"Your article '{instance.title}' is now published!",
            icon="",
            action_url=article_admin_url,
        )


# ══════════════════════════════════════════════════════════════
#  ROLE & CATEGORY CHANGE NOTIFICATIONS
# ══════════════════════════════════════════════════════════════

@receiver(m2m_changed, sender=UserProfile.roles.through)
def role_change_notification(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        for role_id in pk_set:
            try:
                role = Role.objects.get(pk=role_id)
                Notification.objects.create(
                    user=instance.user,
                    notif_type="role",
                    title="Role Updated",
                    message=f"Your role has been updated: {role.name}",
                    icon="",
                    action_url=f"/admin/newsapp/role/{instance.id}/change/"
                )
            except Exception:
                pass


@receiver(m2m_changed, sender=UserProfile.assigned_categories.through)
def category_assignment_notification(sender, instance, action, pk_set, **kwargs):
    if action == "post_add":
        for cat_id in pk_set:
            try:
                category = Category.objects.get(pk=cat_id)
                Notification.objects.create(
                    user=instance.user,
                    notif_type="category",
                    title="New Category Assigned",
                    message=f"You have been assigned to category '{category.name}'.",
                    icon="",
                    action_url=f"/admin/newsapp/category/{instance.id}/change/"
                )
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════
#  WELCOME NOTIFICATION
# ══════════════════════════════════════════════════════════════

@receiver(post_save, sender=User)
def new_user_notification(sender, instance, created, **kwargs):
    if created:
        try:
            Notification.objects.create(
                user=instance,
                notif_type="message",
                title="Welcome!",
                message=f"Welcome {instance.username}! Your account has been created.",
                icon="",
                action_url=f"/admin/newsapp/userprofile/{instance.id}/change/"
            )
        except Exception:
            pass

import requests

def ping_google_sitemap():
    sitemap_url = "https://news4bharat.com/sitemap_index.xml"
    google_ping = f"https://www.google.com/ping?sitemap={sitemap_url}"

    try:
        requests.get(google_ping)
    except Exception as e:
        print("Ping failed:", e)
