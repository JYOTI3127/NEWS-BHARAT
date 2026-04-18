from django.db import migrations, models


def copy_legacy_ad_banner(apps, schema_editor):
    HomepageSlot = apps.get_model('newsapp', 'HomepageSlot')
    HomepageAdBanner = apps.get_model('newsapp', 'HomepageAdBanner')
    legacy_slot = HomepageSlot.objects.filter(slot_name='ad_banner').first()
    if not legacy_slot:
        return

    image = getattr(legacy_slot, 'ad_image', None)
    image_url = getattr(legacy_slot, 'ad_image_url', '') or ''
    link_url = getattr(legacy_slot, 'ad_link_url', '') or ''
    if not image and not image_url and not link_url:
        return

    banner, _created = HomepageAdBanner.objects.get_or_create(placement='home_top')
    banner.image = image
    banner.image_url = image_url
    banner.link_url = link_url
    banner.is_active = bool(getattr(legacy_slot, 'is_active', True))
    banner.save()


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0039_newslettercard_chosen_articles_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='HomepageAdBanner',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('placement', models.CharField(choices=[('home_top', 'Home Top'), ('home_top_mobile', 'Home Top Mobile'), ('home_after_trending', 'Home After Trending'), ('home_mid', 'Home Mid'), ('home_side_left', 'Home Side Left'), ('home_side_right', 'Home Side Right')], max_length=40, unique=True)),
                ('image', models.ImageField(blank=True, null=True, upload_to='homepage_ads/')),
                ('image_url', models.URLField(blank=True, default='')),
                ('link_url', models.URLField(blank=True, default='')),
                ('alt', models.CharField(blank=True, default='Sponsored advertisement', max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Homepage Ad Banner',
                'verbose_name_plural': 'Homepage Ad Banners',
                'ordering': ['placement'],
            },
        ),
        migrations.RunPython(copy_legacy_ad_banner, migrations.RunPython.noop),
    ]
