import re

from django.db import migrations
from django.utils import timezone


def _normalize(value):
    text = str(value or "").strip().lower()
    text = re.sub(r"[.\s]+", " ", text)
    return text.strip()


def mark_specific_guest_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("newsapp", "UserProfile")

    target_usernames = {
        _normalize("Kaanchi"),
    }
    target_full_names = {
        _normalize("Mohit Chaudhary"),
        _normalize("Mohit Chaudhary..."),
    }

    now = timezone.now()

    users = User.objects.filter(is_staff=True).only("id", "username", "first_name", "last_name")
    for user in users:
        normalized_username = _normalize(user.username)
        normalized_full_name = _normalize(f"{user.first_name} {user.last_name}")

        if (
            normalized_username not in target_usernames
            and normalized_full_name not in target_full_names
        ):
            continue

        profile = UserProfile.objects.filter(user_id=user.id).first()
        if not profile:
            continue

        update_fields = []
        if not profile.is_guest_profile:
            profile.is_guest_profile = True
            update_fields.append("is_guest_profile")
        if profile.guest_since is None:
            profile.guest_since = now
            update_fields.append("guest_since")
        if update_fields:
            profile.save(update_fields=update_fields)


def unmark_specific_guest_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("newsapp", "UserProfile")

    target_usernames = {
        _normalize("Kaanchi"),
    }
    target_full_names = {
        _normalize("Mohit Chaudhary"),
        _normalize("Mohit Chaudhary..."),
    }

    users = User.objects.filter(is_staff=True).only("id", "username", "first_name", "last_name")
    for user in users:
        normalized_username = _normalize(user.username)
        normalized_full_name = _normalize(f"{user.first_name} {user.last_name}")

        if (
            normalized_username not in target_usernames
            and normalized_full_name not in target_full_names
        ):
            continue

        profile = UserProfile.objects.filter(user_id=user.id).first()
        if not profile:
            continue

        profile.is_guest_profile = False
        profile.guest_since = None
        profile.save(update_fields=["is_guest_profile", "guest_since"])


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0070_userprofile_guest_profile_fields"),
    ]

    operations = [
        migrations.RunPython(mark_specific_guest_profiles, unmark_specific_guest_profiles),
    ]
