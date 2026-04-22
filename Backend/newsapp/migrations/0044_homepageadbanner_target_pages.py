from django.db import migrations, models


def set_default_target_pages(apps, schema_editor):
    HomepageAdBanner = apps.get_model('newsapp', 'HomepageAdBanner')
    HomepageAdBanner.objects.filter(target_pages=[]).update(target_pages=['home'])


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0043_update_homepage_ad_banner_placements'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepageadbanner',
            name='target_pages',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(set_default_target_pages, migrations.RunPython.noop),
    ]
