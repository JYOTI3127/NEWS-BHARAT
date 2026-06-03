from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0067_userprofile_kra'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='profile_image',
            field=models.ImageField(blank=True, null=True, upload_to='profile_images/'),
        ),
    ]
