from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0064_attendancerecord_clock_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='digilocker_document_types',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='digilocker_last_error',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='digilocker_last_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='digilocker_reference_id',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='digilocker_status',
            field=models.CharField(
                choices=[
                    ('not_started', 'Not Started'),
                    ('pending', 'Pending'),
                    ('verified', 'Verified'),
                    ('failed', 'Failed'),
                    ('config_pending', 'Config Pending'),
                ],
                default='not_started',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='digilocker_verified_payload',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
