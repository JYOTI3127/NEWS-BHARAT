from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0055_article_clean_content_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepageadbanner',
            name='rotation_banner_ids',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='homepageadbanner',
            name='rotation_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='homepageadbanner',
            name='rotation_interval_seconds',
            field=models.PositiveIntegerField(default=10),
        ),
    ]
