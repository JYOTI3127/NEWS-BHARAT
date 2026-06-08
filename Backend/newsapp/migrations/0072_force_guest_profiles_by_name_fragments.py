from django.db import migrations
from django.db.models import Q
from django.utils import timezone


def force_guest_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("newsapp", "UserProfile")

    users = User.objects.filter(
        is_staff=True,
    ).filter(
        Q(username__iexact="kaanchi")
        | Q(username__icontains="kaanchi")
        | Q(first_name__iexact="kaanchi")
        | Q(first_name__icontains="kaanchi")
        | Q(last_name__iexact="kaanchi")
        | Q(last_name__icontains="kaanchi")
        | Q(email__icontains="kaanchi")
        | (
            Q(first_name__icontains="mohit")
            & (
                Q(first_name__icontains="chaudhary")
                | Q(last_name__icontains="chaudhary")
                | Q(username__icontains="chaudhary")
                | Q(email__icontains="chaudhary")
            )
        )
        | (
            Q(username__icontains="mohit")
            & (
                Q(username__icontains="chaudhary")
                | Q(email__icontains="chaudhary")
            )
        )
        | Q(email__icontains="mohit.chaudhary")
    ).only("id")

    now = timezone.now()
    for user in users:
        profile = UserProfile.objects.filter(user_id=user.id).first()
        if not profile:
            continue
        profile.is_guest_profile = True
        if profile.guest_since is None:
            profile.guest_since = now
            profile.save(update_fields=["is_guest_profile", "guest_since"])
        else:
            profile.save(update_fields=["is_guest_profile"])


def revert_guest_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("newsapp", "UserProfile")

    users = User.objects.filter(
        is_staff=True,
    ).filter(
        Q(username__icontains="kaanchi")
        | Q(first_name__icontains="kaanchi")
        | Q(last_name__icontains="kaanchi")
        | Q(email__icontains="kaanchi")
        | Q(first_name__icontains="mohit")
        | Q(last_name__icontains="chaudhary")
        | Q(username__icontains="chaudhary")
        | Q(email__icontains="mohit")
    ).only("id")

    for user in users:
        profile = UserProfile.objects.filter(user_id=user.id).first()
        if not profile:
            continue
        profile.is_guest_profile = False
        profile.guest_since = None
        profile.save(update_fields=["is_guest_profile", "guest_since"])


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0071_mark_specific_guest_profiles"),
    ]

    operations = [
        migrations.RunPython(force_guest_profiles, revert_guest_profiles),
    ]
