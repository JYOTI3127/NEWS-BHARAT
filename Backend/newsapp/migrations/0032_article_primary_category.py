from django.db import migrations, models


def populate_primary_category(apps, schema_editor):
    Article = apps.get_model("newsapp", "Article")

    for article in Article.objects.all().iterator():
        if article.primary_category_id:
            continue

        first_category = article.categories.order_by("name").first()
        if first_category:
            article.primary_category_id = first_category.id
            article.save(update_fields=["primary_category"])


def clear_primary_category(apps, schema_editor):
    Article = apps.get_model("newsapp", "Article")
    Article.objects.update(primary_category=None)


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0031_newsletter"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="primary_category",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="primary_articles",
                to="newsapp.category",
            ),
        ),
        migrations.RunPython(populate_primary_category, clear_primary_category),
    ]
