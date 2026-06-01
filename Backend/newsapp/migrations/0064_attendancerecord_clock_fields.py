from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0063_liveupdate'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='last_clock_in_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='last_clock_out_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
