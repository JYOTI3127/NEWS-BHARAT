from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0054_savedadbanner_bundle_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='clean_version',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='article',
            name='content_clean',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='article',
            name='content_raw',
            field=models.TextField(blank=True, default=''),
        ),
    ]
