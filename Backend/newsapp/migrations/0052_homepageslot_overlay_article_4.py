import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0051_pushsubscription_identity_and_logs"),
    ]

    operations = [
        migrations.AddField(
            model_name="homepageslot",
            name="overlay_article_4",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="homepage_overlay_slot_4",
                to="newsapp.article",
            ),
        ),
    ]
