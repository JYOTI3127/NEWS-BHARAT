from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import UserProfile, generate_password
from .models import generate_user_id

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