from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0066_report"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="kra",
            field=models.TextField(blank=True),
        ),
    ]
