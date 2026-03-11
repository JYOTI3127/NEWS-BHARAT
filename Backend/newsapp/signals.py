from django.db.models.signals import post_save,pre_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile, generate_password
from .models import generate_user_id
from newsapp.models import *

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        password = generate_password()

        instance.set_password(password)
        instance.is_staff = True
        instance.save(update_fields=['password', 'is_staff'])

        UserProfile.objects.create(
            user=instance,
            plain_password=password,
        )

# ───────── Staff ID Generation After Roles ─────────
from django.db import transaction
from django.db.models import Max
import re
from django.db.models.signals import post_save, m2m_changed

@receiver(m2m_changed, sender=UserProfile.roles.through)
def generate_staff_id_after_roles(sender, instance, action, **kwargs):

    if action == "post_add" and (not instance.staff_id or instance.staff_id.startswith("N4B-GEN")):

        prefix_map = {
            "reporter": "REP",
            "journalist": "REP",
            "editor": "EDT",
            "managing editor": "EDT",
            "section editor": "EDT",
            "video editor": "VID",
            "social media": "SOC",
            "fact checker": "FCK",
            "legal reviewer": "LGL",
            "contributor": "CNT",
            "advertiser": "ADV",
            "super admin": "SAD",
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

from .models import Article
from .models import Notification

# Pehle old value store karo
@receiver(pre_save, sender=Article)
def store_old_assigned(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_assigned_to = Article.objects.get(pk=instance.pk).assigned_to
        except Article.DoesNotExist:
            instance._old_assigned_to = None
    else:
        instance._old_assigned_to = None

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


# ───────── Article Status Change ─────────
@receiver(post_save, sender=Article)
def article_status_notification(sender, instance, **kwargs):
    if instance.status == "published":
        Notification.objects.create(
            user=instance.author,
            notif_type="article",
            title="Article Published",
            message=f"Your article '{instance.title}' is now published!",
            icon=""  
        )

# ───────── Role Assigned / Updated ─────────
@receiver(m2m_changed, sender=UserProfile.roles.through)
def role_change_notification(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        for role_id in pk_set:
            role = Role.objects.get(pk=role_id)
            Notification.objects.create(
                user=instance.user,
                notif_type="role",
                title="Role Updated",
                message=f"Your role has been updated: {role.name}",
                icon="",  
                action_url=f"/admin/newsapp/role/{instance.id}/change/"
            )

# ───────── Category Assigned ─────────
@receiver(m2m_changed, sender=UserProfile.assigned_categories.through)
def category_assignment_notification(sender, instance, action, pk_set, **kwargs):
    if action == "post_add":
        for cat_id in pk_set:
            category = Category.objects.get(pk=cat_id)
            Notification.objects.create(
                user=instance.user,
                notif_type="category",
                title="New Category Assigned",
                message=f"You have been assigned to category '{category.name}'.",
                icon="", 
                action_url=f"/admin/newsapp/category/{instance.id}/change/"
            )

# ───────── New User Created ─────────
@receiver(post_save, sender=User)
def new_user_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance,
            notif_type="message",
            title="Welcome!",
            message=f"Welcome {instance.username}! Your account has been created.",
            icon="",
            action_url=f"/admin/newsapp/userprofile/{instance.user.id}/change/"
        )