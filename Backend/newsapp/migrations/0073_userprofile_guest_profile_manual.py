from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0072_force_guest_profiles_by_name_fragments"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="guest_profile_manual",
            field=models.BooleanField(default=False),
        ),
    ]
