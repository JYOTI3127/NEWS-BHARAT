from django.core.management.base import BaseCommand
from django.db.models import Q

from newsapp.models import Article, clean_chatgpt_artifacts
from newsapp.utils import ARTICLE_CLEAN_VERSION, sanitize_article_html, strip_pasted_document_markup


class Command(BaseCommand):
    help = "Backfill old article content with normalized paragraph/block HTML."

    def add_arguments(self, parser):
        parser.add_argument(
            "--article-id",
            type=int,
            help="Only backfill one article by id.",
        )
        parser.add_argument(
            "--slug",
            help="Only backfill one article by slug.",
        )
        parser.add_argument(
            "--published-only",
            action="store_true",
            help="Only process published articles.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Process all matching articles, even if clean_version is current.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without saving changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]

        articles = Article.objects.all().only(
            "id",
            "title",
            "slug",
            "status",
            "content",
            "content_raw",
            "content_clean",
            "clean_version",
        )

        if options["published_only"]:
            articles = articles.filter(status="published")
        if options["article_id"]:
            articles = articles.filter(id=options["article_id"])
        if options["slug"]:
            articles = articles.filter(slug=options["slug"])
        if not force:
            articles = articles.filter(
                Q(clean_version__lt=ARTICLE_CLEAN_VERSION)
                | Q(content__icontains="Also Read:")
                | Q(content_clean__icontains="Also Read:")
                | Q(content_raw__icontains="font-variant")
                | Q(content_clean__icontains="font-variant")
                | Q(content__icontains="font-variant")
            )

        scanned = 0
        updated = 0
        unchanged = 0

        for article in articles.iterator(chunk_size=100):
            scanned += 1
            cleaned_raw = strip_pasted_document_markup(clean_chatgpt_artifacts(article.content_raw))
            cleaned_content = strip_pasted_document_markup(clean_chatgpt_artifacts(article.content))
            cleaned_clean = strip_pasted_document_markup(clean_chatgpt_artifacts(article.content_clean))
            source_html = cleaned_raw or cleaned_clean or cleaned_content
            normalized_clean = sanitize_article_html(source_html)

            if not normalized_clean:
                unchanged += 1
                continue

            needs_update = (
                article.content_raw != cleaned_raw
                or article.content_clean != normalized_clean
                or article.content != normalized_clean
                or article.clean_version != ARTICLE_CLEAN_VERSION
            )
            if not needs_update:
                unchanged += 1
                continue

            updated += 1
            self.stdout.write(
                f"Would update #{article.id} {article.slug}: {article.title[:80]}"
                if dry_run
                else f"Updating #{article.id} {article.slug}: {article.title[:80]}"
            )

            if dry_run:
                continue

            Article.objects.filter(pk=article.pk).update(
                content_raw=cleaned_raw,
                content_clean=normalized_clean,
                content=normalized_clean,
                clean_version=ARTICLE_CLEAN_VERSION,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Scanned {scanned} article(s), "
                f"{'would update' if dry_run else 'updated'} {updated}, unchanged/skipped {unchanged}."
            )
        )
