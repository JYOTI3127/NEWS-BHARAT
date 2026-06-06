from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0068_userprofile_profile_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendancerecord",
            name="auto_clocked_out_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="clock_in_first_reminder_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="clock_in_second_reminder_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="clock_out_first_reminder_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="attendancerecord",
            name="clock_out_second_reminder_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
