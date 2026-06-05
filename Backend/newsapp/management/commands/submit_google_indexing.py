from django.core.management.base import BaseCommand, CommandError

from newsapp.models import Article, Category
from newsapp.seo_direct import (
    GoogleIndexingAPI,
    article_related_urls,
    category_url,
    static_page_urls,
)


class Command(BaseCommand):
    help = "Submit News4Bharat URLs to the Google Indexing API."

    def add_arguments(self, parser):
        parser.add_argument(
            "--scope",
            choices=["sitewide", "articles", "categories", "static", "article"],
            default="sitewide",
            help="Which URLs to submit.",
        )
        parser.add_argument("--slug", help="Article slug for --scope article.")
        parser.add_argument("--limit", type=int, default=200, help="Maximum URLs to submit.")
        parser.add_argument("--offset", type=int, default=0, help="How many URLs to skip first.")
        parser.add_argument("--dry-run", action="store_true", help="Print URLs without submitting.")

    def handle(self, *args, **options):
        scope = options["scope"]
        limit = max(1, int(options["limit"] or 200))
        offset = max(0, int(options["offset"] or 0))
        dry_run = options["dry_run"]

        urls = self._build_urls(scope=scope, slug=options.get("slug"))
        urls = urls[offset: offset + limit]

        if not urls:
            self.stdout.write(self.style.WARNING("No URLs found for submission."))
            return

        self.stdout.write(f"Prepared {len(urls)} URL(s) for scope '{scope}'.")
        for url in urls:
            self.stdout.write(url)

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry run complete."))
            return

        results = GoogleIndexingAPI.submit_many(urls)
        success_count = sum(1 for item in results if item.get("success"))
        failure_count = len(results) - success_count

        self.stdout.write(
            self.style.SUCCESS(
                f"Submitted {success_count} URL(s) successfully; {failure_count} failed."
            )
        )

    def _build_urls(self, *, scope, slug=None):
        if scope == "static":
            return static_page_urls()

        if scope == "categories":
            return [
                category_url(category.slug)
                for category in Category.objects.filter(status="active").order_by("name")
                if category.slug
            ]

        if scope == "article":
            if not slug:
                raise CommandError("--slug is required when --scope article is used.")
            article = Article.objects.filter(status="published", slug=slug).prefetch_related("categories").first()
            if article is None:
                raise CommandError(f"Published article not found for slug '{slug}'.")
            return article_related_urls(article)

        if scope == "articles":
            urls = []
            queryset = (
                Article.objects.filter(status="published", in_sitemap=True)
                .prefetch_related("categories")
                .order_by("-published_at", "-created_at")
            )
            for article in queryset:
                urls.extend(article_related_urls(article))
            return list(dict.fromkeys(urls))

        sitewide_urls = static_page_urls()
        sitewide_urls.extend(
            category_url(category.slug)
            for category in Category.objects.filter(status="active").order_by("name")
            if category.slug
        )
        queryset = (
            Article.objects.filter(status="published", in_sitemap=True)
            .prefetch_related("categories")
            .order_by("-published_at", "-created_at")
        )
        for article in queryset:
            sitewide_urls.extend(article_related_urls(article))
        return list(dict.fromkeys(sitewide_urls))
