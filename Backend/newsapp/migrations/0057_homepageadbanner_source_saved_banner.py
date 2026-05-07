from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0056_homepageadbanner_rotation'),
    ]

    operations = [
        migrations.AddField(
            model_name='homepageadbanner',
            name='source_saved_banner',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='applied_homepage_banners', to='newsapp.savedadbanner'),
        ),
    ]
