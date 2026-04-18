from django.db import migrations
from django.utils import timezone


def backfill_article_updated_at(apps, schema_editor):
    Article = apps.get_model('newsapp', 'Article')
    for article in Article.objects.filter(updated_at__isnull=True).only(
        'id',
        'updated_at',
        'published_at',
        'created_at',
    ):
        article.updated_at = article.published_at or article.created_at or timezone.now()
        article.save(update_fields=['updated_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('newsapp', '0041_article_updated_at'),
    ]

    operations = [
        migrations.RunPython(backfill_article_updated_at, migrations.RunPython.noop),
    ]
