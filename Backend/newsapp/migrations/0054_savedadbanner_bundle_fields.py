from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0053_savedadbanner'),
    ]

    operations = [
        migrations.AddField(
            model_name='savedadbanner',
            name='bundle_key',
            field=models.CharField(blank=True, default='', max_length=40),
        ),
        migrations.AddField(
            model_name='savedadbanner',
            name='bundle_name',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
    ]
