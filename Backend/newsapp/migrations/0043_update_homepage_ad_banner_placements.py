from django.db import migrations, models


def forward_placements(apps, schema_editor):
    HomepageAdBanner = apps.get_model('newsapp', 'HomepageAdBanner')
    replacements = {
        'home_after_trending': 'home_bharat_numbers_right',
        'home_mid': 'home_bharat_startups_right',
    }
    for old_placement, new_placement in replacements.items():
        old_banner = HomepageAdBanner.objects.filter(placement=old_placement).first()
        if not old_banner:
            continue
        existing = HomepageAdBanner.objects.filter(placement=new_placement).first()
        if existing:
            if not existing.image and old_banner.image:
                existing.image = old_banner.image
            if not existing.image_url and old_banner.image_url:
                existing.image_url = old_banner.image_url
            if not existing.link_url and old_banner.link_url:
                existing.link_url = old_banner.link_url
            if not existing.alt and old_banner.alt:
                existing.alt = old_banner.alt
            existing.is_active = existing.is_active or old_banner.is_active
            existing.save()
            old_banner.delete()
        else:
            old_banner.placement = new_placement
            old_banner.save(update_fields=['placement', 'updated_at'])


def reverse_placements(apps, schema_editor):
    HomepageAdBanner = apps.get_model('newsapp', 'HomepageAdBanner')
    replacements = {
        'home_bharat_numbers_right': 'home_after_trending',
        'home_bharat_startups_right': 'home_mid',
    }
    for old_placement, new_placement in replacements.items():
        banner = HomepageAdBanner.objects.filter(placement=old_placement).first()
        if banner and not HomepageAdBanner.objects.filter(placement=new_placement).exists():
            banner.placement = new_placement
            banner.save(update_fields=['placement', 'updated_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0042_backfill_article_updated_at'),
    ]

    operations = [
        migrations.RunPython(forward_placements, reverse_placements),
        migrations.AlterField(
            model_name='homepageadbanner',
            name='placement',
            field=models.CharField(
                choices=[
                    ('home_top', 'Home Top'),
                    ('home_top_mobile', 'Home Top Mobile'),
                    ('home_bharat_numbers_right', 'Home Bharat in Numbers Right'),
                    ('home_bharat_startups_right', 'Home Bharat of Startups Right'),
                    ('home_side_left', 'Home Side Left'),
                    ('home_side_right', 'Home Side Right'),
                ],
                max_length=40,
                unique=True,
            ),
        ),
    ]
