from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0069_attendancerecord_reminder_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="guest_since",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="is_guest_profile",
            field=models.BooleanField(default=False),
        ),
    ]
