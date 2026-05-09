from django.core.management.base import BaseCommand
from django.db.models import Q

from newsapp.models import Article, clean_chatgpt_artifacts
from newsapp.utils import ARTICLE_CLEAN_VERSION, sanitize_article_html


class Command(BaseCommand):
    help = (
        "Remove ChatGPT wrapper HTML and data-start/data-end style attributes "
        "from saved article content fields."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--article-id",
            type=int,
            help="Only fix a single article id.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many articles would be cleaned without saving.",
        )

    def handle(self, *args, **options):
        article_id = options.get("article_id")
        dry_run = options.get("dry_run", False)

        articles = Article.objects.filter(
            Q(content__icontains='text-token') |
            Q(content_raw__icontains='text-token') |
            Q(content_clean__icontains='text-token') |
            Q(content__icontains='data-start=') |
            Q(content_raw__icontains='data-start=') |
            Q(content_clean__icontains='data-start=') |
            Q(content__icontains='data-end=') |
            Q(content_raw__icontains='data-end=') |
            Q(content_clean__icontains='data-end=')
        ).only('id', 'title', 'content', 'content_raw', 'content_clean', 'clean_version')

        if article_id:
            articles = articles.filter(id=article_id)

        articles = list(articles)
        self.stdout.write(f"Articles needing ChatGPT HTML cleanup: {len(articles)}")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run only. No articles updated."))
            return

        updated = 0
        for article in articles:
            cleaned_raw = clean_chatgpt_artifacts(article.content_raw)
            cleaned_clean = clean_chatgpt_artifacts(article.content_clean)
            cleaned_content = clean_chatgpt_artifacts(article.content)
            source_html = cleaned_raw or cleaned_clean or cleaned_content
            normalized_clean = sanitize_article_html(source_html)

            Article.objects.filter(pk=article.pk).update(
                content_raw=cleaned_raw,
                content_clean=normalized_clean,
                content=normalized_clean,
                clean_version=ARTICLE_CLEAN_VERSION,
            )
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} article(s)."))
