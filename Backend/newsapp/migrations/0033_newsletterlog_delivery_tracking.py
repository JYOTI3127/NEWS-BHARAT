# Generated for newsletter delivery tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0032_article_primary_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='newsletterlog',
            name='success_emails',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='failed_emails',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='delivered_emails',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='opened_emails',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='clicked_emails',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='bounced_emails',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='event_history',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='delivered_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='opened_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='clicked_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='newsletterlog',
            name='bounced_count',
            field=models.IntegerField(default=0),
        ),
    ]
