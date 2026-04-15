# Generated for Brevo Transactional API message tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0034_newsletterlog_trace_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='newsletterlog',
            name='brevo_message_ids',
            field=models.JSONField(default=list),
        ),
    ]
