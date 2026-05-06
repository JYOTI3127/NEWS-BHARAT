from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0052_homepageslot_overlay_article_4'),
    ]

    operations = [
        migrations.CreateModel(
            name='SavedAdBanner',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('placement', models.CharField(choices=[('home_top', 'Home Top'), ('home_top_mobile', 'Home Top Mobile'), ('home_bharat_numbers_right', 'Home Bharat in Numbers Right'), ('home_bharat_startups_right', 'Home Bharat of Startups Right'), ('home_side_left', 'Home Side Left'), ('home_side_right', 'Home Side Right')], max_length=40)),
                ('image', models.ImageField(blank=True, null=True, upload_to='saved_homepage_ads/')),
                ('image_url', models.URLField(blank=True, default='')),
                ('link_url', models.URLField(blank=True, default='')),
                ('alt', models.CharField(blank=True, default='Sponsored advertisement', max_length=255)),
                ('target_pages', models.JSONField(blank=True, default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Saved Ad Banner',
                'verbose_name_plural': 'Saved Ad Banners',
                'ordering': ['-updated_at', '-created_at'],
            },
        ),
    ]
