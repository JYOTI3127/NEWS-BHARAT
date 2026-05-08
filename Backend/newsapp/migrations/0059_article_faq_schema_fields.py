from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0058_article_schema_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="faq_schema_description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="article",
            name="faq_schema_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="article",
            name="faq_schema_items",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="article",
            name="faq_schema_title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
