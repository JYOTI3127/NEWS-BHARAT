from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("newsapp", "0057_homepageadbanner_source_saved_banner"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="schema_alternative_headline",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_article_section",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_author_name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_author_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_custom_jsonld",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_date_modified",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_date_published",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_headline",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_image_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_keywords",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_organization_sameas",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_organization_type",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_publisher_logo_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_publisher_name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="article",
            name="schema_types",
            field=models.CharField(blank=True, default="NewsArticle,Article", max_length=120),
        ),
    ]
