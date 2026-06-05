from django.db.models.signals import post_save, pre_save, m2m_changed
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile, generate_password, generate_user_id
from newsapp.models import *
from django.db import transaction
from django.core.mail import EmailMultiAlternatives, send_mail
from django.conf import settings
from django.utils.html import escape, strip_tags
import re
from .utils import build_article_review_action_token, get_article_render_content


def _admin_base_url():
    configured = getattr(settings, "NEWSROOM_ADMIN_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    return "https://news4bharat.cloud/admin"


def _article_admin_url(article_id):
    return f"{_admin_base_url()}/newsapp/article/{article_id}/change/"


def _site_base_url():
    configured = getattr(settings, "NEWSROOM_SITE_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    admin_base = _admin_base_url()
    if admin_base.endswith("/admin"):
        return admin_base[:-6]
    return admin_base


def _article_review_action_url(article_id, action):
    token = build_article_review_action_token(article_id, action)
    return f"{_site_base_url()}/api/articles/{article_id}/review-action/{action}/?token={token}"


def _article_comments_admin_url(article_id):
    return f"{_article_admin_url(article_id)}?focus=editorial-comments#editorial-comments"


def _article_preview_paragraphs(article, limit=3):
    content = str(
        getattr(article, "content_clean", "")
        or getattr(article, "content", "")
        or getattr(article, "content_raw", "")
        or ""
    )
    if not content:
        return []

    normalized = re.sub(r"</(p|div|h[1-6]|li|blockquote)>", r"</\1>\n", content, flags=re.IGNORECASE)
    normalized = re.sub(r"<br\s*/?>", "\n", normalized, flags=re.IGNORECASE)
    text = strip_tags(normalized)
    text = text.replace("\r", "\n")
    blocks = [re.sub(r"\s+", " ", block).strip() for block in text.split("\n") if block.strip()]
    return blocks[:limit]


def _article_preview_email_html(article):
    content = str(get_article_render_content(article) or "").strip()
    if not content:
        return ""

    html = content
    html = re.sub(r"<p(\b[^>]*)>", r"<p\1 style=\"margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<h1(\b[^>]*)>", r"<h1\1 style=\"margin:24px 0 12px;font-size:30px;line-height:1.25;color:#0f172a;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<h2(\b[^>]*)>", r"<h2\1 style=\"margin:22px 0 10px;font-size:24px;line-height:1.3;color:#0f172a;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<h3(\b[^>]*)>", r"<h3\1 style=\"margin:18px 0 10px;font-size:20px;line-height:1.35;color:#0f172a;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<blockquote(\b[^>]*)>", r"<blockquote\1 style=\"margin:18px 0;padding:12px 16px;border-left:4px solid #cbd5e1;background:#f8fafc;color:#334155;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<ul(\b[^>]*)>", r"<ul\1 style=\"margin:0 0 16px 20px;padding:0;color:#334155;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<ol(\b[^>]*)>", r"<ol\1 style=\"margin:0 0 16px 20px;padding:0;color:#334155;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<li(\b[^>]*)>", r"<li\1 style=\"margin:0 0 8px;line-height:1.8;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<a(\b[^>]*)>", r"<a\1 style=\"color:#1d4ed8;text-decoration:underline;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<hr(\b[^>]*)/?>", r"<hr\1 style=\"border:none;border-top:1px solid #e5e7eb;margin:22px 0;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<table(\b[^>]*)>", r"<table\1 style=\"width:100%;border-collapse:collapse;margin:0 0 16px;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<th(\b[^>]*)>", r"<th\1 style=\"border:1px solid #cbd5e1;padding:8px 10px;background:#f8fafc;color:#0f172a;text-align:left;\">", html, flags=re.IGNORECASE)
    html = re.sub(r"<td(\b[^>]*)>", r"<td\1 style=\"border:1px solid #cbd5e1;padding:8px 10px;color:#334155;vertical-align:top;\">", html, flags=re.IGNORECASE)
    return html


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


def _create_or_refresh_notification(*, user, notif_type, title, message, action_url='', icon=''):
    """
    Keep one active notification per user/type/title/action_url and refresh it
    instead of creating duplicates every time a status flips back and forth.
    """
    existing = list(
        Notification.objects.filter(
            user=user,
            notif_type=notif_type,
            title=title,
            action_url=action_url,
        ).order_by('-created_at', '-id')
    )
    if existing:
        primary = existing[0]
        changed_fields = []
        if primary.message != message:
            primary.message = message
            changed_fields.append('message')
        if (primary.icon or '') != (icon or ''):
            primary.icon = icon or ''
            changed_fields.append('icon')
        if primary.is_archived:
            primary.is_archived = False
            changed_fields.append('is_archived')
        if primary.is_read:
            primary.is_read = False
            changed_fields.append('is_read')
        if changed_fields:
            primary.save(update_fields=changed_fields)
        duplicate_ids = [item.id for item in existing[1:]]
        if duplicate_ids:
            Notification.objects.filter(id__in=duplicate_ids).delete()
        return primary

    return Notification.objects.create(
        user=user,
        notif_type=notif_type,
        title=title,
        message=message,
        icon=icon or '',
        action_url=action_url,
    )


def _superadmin_notification_recipients(*, exclude_user=None):
    recipients = User.objects.filter(is_active=True, is_superuser=True)
    exclude_user_id = getattr(exclude_user, "pk", exclude_user)
    if exclude_user_id:
        recipients = recipients.exclude(pk=exclude_user_id)
    return recipients


def notify_superadmins(*, title, message, action_url="", icon="", notif_type="message", exclude_user=None):
    for admin_user in _superadmin_notification_recipients(exclude_user=exclude_user):
        _create_or_refresh_notification(
            user=admin_user,
            notif_type=notif_type,
            title=title,
            message=message,
            action_url=action_url,
            icon=icon,
        )


def notify_attendance_event(actor, event_key):
    actor_name = actor.get_full_name() or actor.username
    if event_key == "clock_in":
        title = "Attendance Clock In"
        message = f"{actor_name} clocked in."
    else:
        title = "Attendance Clock Out"
        message = f"{actor_name} clocked out."

    notify_superadmins(
        title=title,
        message=message,
        action_url=f"/admin/attendance/?member={actor.pk}&event={event_key}",
        icon="AT",
        notif_type="message",
        exclude_user=actor,
    )

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
        _create_or_refresh_notification(
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
    comments_admin_url = _article_comments_admin_url(instance.id)
    author_name = instance.author.get_full_name() or instance.author.username 
    safe_title = escape(instance.title)
    safe_subtitle = escape(instance.subtitle or "")
    safe_author_name = escape(author_name)
    safe_article_admin_url = escape(article_admin_url)
    safe_comments_admin_url = escape(comments_admin_url)
    approve_review_url = _article_review_action_url(instance.id, "approve")
    safe_approve_review_url = escape(approve_review_url)
    preview_source_html = str(get_article_render_content(instance) or "").strip()
    preview_text = strip_tags(
        re.sub(r"</(p|div|h[1-6]|li|blockquote|tr)>", r"</\1>\n", preview_source_html, flags=re.IGNORECASE)
    ).strip()
    preview_html = _article_preview_email_html(instance)
    subtitle_html = (
        f"<p style='margin:0 0 14px;font-size:18px;line-height:1.55;color:#475569;'>{safe_subtitle}</p>"
        if safe_subtitle else ""
    )
    if not preview_html:
        preview_html = "<p style='margin:0;font-size:15px;line-height:1.75;color:#64748b;'>Article preview was not available in the email.</p>"

    if instance.status == "review":
        super_admins = User.objects.filter(
            is_active=True,
            is_superuser=True,
        ).exclude(email__exact="")

        for admin_user in super_admins:
            _create_or_refresh_notification(
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
                        f"{f'Subtitle: {instance.subtitle}\\n' if instance.subtitle else ''}"
                        f"Submitted By: {author_name}\n"
                        f"{f'Preview:\\n{preview_text}\\n\\n' if preview_text else ''}"
                        f"Review Link: {article_admin_url}\n\n"
                        f"Editorial Comments: {comments_admin_url}\n"
                        f"Approve Now: {approve_review_url}\n\n"
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
                        f"<div style='font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 10px;'>Article Preview</div>"
                        f"<h1 style='margin:0 0 10px;font-size:28px;line-height:1.25;color:#0f172a;'>{safe_title}</h1>"
                        f"{subtitle_html}"
                        f"<p style='margin:0 0 16px;font-size:14px;color:#64748b;'><strong>By:</strong> {safe_author_name}</p>"
                        f"{preview_html}"
                        f"</div>"
                        f"<p style='margin:0 0 14px;'>Please review the article in the admin panel. The workflow will move forward <strong>only after admin approval</strong>.</p>"
                        f"<div style='margin:0 0 18px;'>"
                        f"<a href='{safe_article_admin_url}' style='display:inline-block;background:#d80100;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;margin-right:10px;'>Open Article In Admin</a>"
                        f"<a href='{safe_comments_admin_url}' style='display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;margin-right:10px;'>Add Editorial Comments</a>"
                        f"<a href='{safe_approve_review_url}' style='display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700;'>Approve Article</a>"
                        f"</div>"
                        f"<p style='margin:0 0 10px;'>If anything looks unclear or you need more context before approving, please contact the admin team.</p>"
                        f"<p style='margin:0;color:#6b7280;font-size:13px;'>Direct link: <a href='{safe_article_admin_url}'>{safe_article_admin_url}</a></p>"
                        f"</div>"
                    ),
                )
            except Exception:
                pass

    if instance.status == "approved":
        _create_or_refresh_notification(
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
        _create_or_refresh_notification(
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
                _create_or_refresh_notification(
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
                _create_or_refresh_notification(
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
            _create_or_refresh_notification(
                user=instance,
                notif_type="message",
                title="Welcome!",
                message=f"Welcome {instance.username}! Your account has been created.",
                icon="",
                action_url=f"/admin/newsapp/userprofile/{instance.id}/change/"
            )
        except Exception:
            pass


@receiver(post_save, sender=ContactQuery)
def contact_query_notification(sender, instance, created, **kwargs):
    if not created:
        return

    notify_superadmins(
        title="New Contact Query",
        message=f'{instance.full_name} sent a contact query about "{instance.subject}".',
        action_url=f"/admin/contact-queries/{instance.pk}/",
        icon="CQ",
        notif_type="message",
    )


@receiver(post_save, sender=CareerApplication)
def career_application_notification(sender, instance, created, **kwargs):
    if not created:
        return

    notify_superadmins(
        title="New Career Application",
        message=f'{instance.full_name} applied for "{instance.job_title}".',
        action_url=f"/admin/career-applications/{instance.pk}/",
        icon="CV",
        notif_type="message",
    )


@receiver(post_save, sender=Report)
def report_activity_notification(sender, instance, created, **kwargs):
    actor_name = instance.user.get_full_name() or instance.user.username
    title = "New Report Submitted" if created else "Report Updated"
    verb = "submitted" if created else "updated"

    notify_superadmins(
        title=title,
        message=f'{actor_name} {verb} a {instance.get_period_type_display().lower()} report for {instance.period_label}.',
        action_url=f"/admin/newsapp/report/?edit={instance.pk}",
        icon="RP",
        notif_type="message",
        exclude_user=instance.user,
    )

import requests

def ping_google_sitemap():
    sitemap_url = "https://news4bharat.com/sitemap_index.xml"
    google_ping = f"https://www.google.com/ping?sitemap={sitemap_url}"

    try:
        requests.get(google_ping)
    except Exception as e:
        print("Ping failed:", e)
