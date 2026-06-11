from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0074_leaverequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="leaverequest",
            name="is_half_day",
            field=models.BooleanField(default=False),
        ),
    ]
