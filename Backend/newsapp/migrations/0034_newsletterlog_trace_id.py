# Generated for newsletter SMTP trace ids

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0033_newsletterlog_delivery_tracking'),
    ]

    operations = [
        migrations.AddField(
            model_name='newsletterlog',
            name='trace_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=40),
        ),
    ]
