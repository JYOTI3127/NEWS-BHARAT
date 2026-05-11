from django.db import migrations, models


BREAKING_NEWS_META_TITLE = "Breaking News Today in India | Live Updates - News4Bharat"
BREAKING_NEWS_META_DESCRIPTION = (
    "Read breaking news today in India with live news update in india, top "
    "headlines, politics, business, sports and real-time coverage on News4Bharat."
)


def seed_breaking_news_meta(apps, schema_editor):
    Category = apps.get_model("newsapp", "Category")
    queryset = Category.objects.filter(slug="breaking-news")
    if not queryset.exists():
        queryset = Category.objects.filter(name__iexact="Breaking News")
    queryset.update(
        meta_title=BREAKING_NEWS_META_TITLE,
        meta_description=BREAKING_NEWS_META_DESCRIPTION,
    )


def clear_breaking_news_meta(apps, schema_editor):
    Category = apps.get_model("newsapp", "Category")
    queryset = Category.objects.filter(
        meta_title=BREAKING_NEWS_META_TITLE,
        meta_description=BREAKING_NEWS_META_DESCRIPTION,
    )
    queryset.update(meta_title="", meta_description="")


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0059_article_faq_schema_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="meta_description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="category",
            name="meta_title",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.RunPython(seed_breaking_news_meta, clear_breaking_news_meta),
    ]
