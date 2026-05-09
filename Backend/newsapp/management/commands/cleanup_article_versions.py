from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from newsapp.models import ArticleVersion, _normalize_version_html, _normalize_version_text

PREPUBLISH_STATUSES = {
    "draft",
    "review",
    "fact_check",
    "legal",
    "approved",
    "scheduled",
    "rejected",
}


class Command(BaseCommand):
    help = (
        "Remove consecutive duplicate article version snapshots, optionally "
        "delete versions from pre-publish articles, and renumber remaining "
        "versions per article."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--article-id",
            type=int,
            help="Only clean versions for a single article id.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be removed without saving changes.",
        )
        parser.add_argument(
            "--remove-prepublish",
            action="store_true",
            help=(
                "Delete versions belonging to articles that are still in a "
                "pre-publish status like draft/review/legal/scheduled."
            ),
        )

    def handle(self, *args, **options):
        article_id = options.get("article_id")
        dry_run = options.get("dry_run", False)
        remove_prepublish = options.get("remove_prepublish", False)

        versions = ArticleVersion.objects.select_related("article").order_by("article_id", "version_number", "id")
        if article_id:
            versions = versions.filter(article_id=article_id)

        versions = list(versions)
        if not versions:
            self.stdout.write(self.style.WARNING("No article versions found for cleanup."))
            return

        duplicate_ids = []
        duplicate_counts = defaultdict(int)
        prepublish_ids = []
        prepublish_counts = defaultdict(int)
        versions_by_article = defaultdict(list)

        previous_key = None
        previous_article_id = None
        for version in versions:
            versions_by_article[version.article_id].append(version)
            if remove_prepublish and version.article.status in PREPUBLISH_STATUSES:
                prepublish_ids.append(version.id)
                prepublish_counts[version.article_id] += 1
                continue

            current_key = (
                _normalize_version_text(version.title),
                _normalize_version_text(version.subtitle),
                _normalize_version_html(version.content),
            )
            if version.article_id == previous_article_id and current_key == previous_key:
                duplicate_ids.append(version.id)
                duplicate_counts[version.article_id] += 1
            else:
                previous_key = current_key
                previous_article_id = version.article_id

        affected_articles = sorted(duplicate_counts.keys())
        self.stdout.write(f"Scanned {len(versions)} version row(s) across {len(versions_by_article)} article(s).")
        self.stdout.write(f"Consecutive duplicate rows found: {len(duplicate_ids)}")
        if remove_prepublish:
            self.stdout.write(f"Pre-publish article version rows marked for deletion: {len(prepublish_ids)}")

        if affected_articles:
            for current_article_id in affected_articles[:20]:
                self.stdout.write(
                    f"Article {current_article_id}: {duplicate_counts[current_article_id]} duplicate version(s)"
                )
            if len(affected_articles) > 20:
                self.stdout.write(f"...and {len(affected_articles) - 20} more article(s).")

        prepublish_articles = sorted(prepublish_counts.keys())
        if prepublish_articles:
            for current_article_id in prepublish_articles[:20]:
                self.stdout.write(
                    f"Article {current_article_id}: {prepublish_counts[current_article_id]} pre-publish version(s)"
                )
            if len(prepublish_articles) > 20:
                self.stdout.write(f"...and {len(prepublish_articles) - 20} more pre-publish article(s).")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run only. No article versions were changed."))
            return

        with transaction.atomic():
            if prepublish_ids:
                ArticleVersion.objects.filter(id__in=prepublish_ids).delete()
            if duplicate_ids:
                ArticleVersion.objects.filter(id__in=duplicate_ids).delete()

            versions_to_renumber = ArticleVersion.objects.order_by("article_id", "version_number", "id")
            if article_id:
                versions_to_renumber = versions_to_renumber.filter(article_id=article_id)

            current_article_id = None
            next_version_number = 1
            updated_rows = 0

            for version in versions_to_renumber.iterator():
                if version.article_id != current_article_id:
                    current_article_id = version.article_id
                    next_version_number = 1

                if version.version_number != next_version_number:
                    ArticleVersion.objects.filter(pk=version.pk).update(version_number=next_version_number)
                    updated_rows += 1
                next_version_number += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleanup complete. Deleted {len(prepublish_ids)} pre-publish row(s), "
                f"{len(duplicate_ids)} duplicate row(s), and "
                f"renumbered {updated_rows} row(s)."
            )
        )
