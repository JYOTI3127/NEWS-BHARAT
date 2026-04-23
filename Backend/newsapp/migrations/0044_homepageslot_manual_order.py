from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0043_update_homepage_ad_banner_placements'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepageslot',
            name='manual_order',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
