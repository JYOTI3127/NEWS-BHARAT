import os
import re

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from newsapp.models import Article


def _seo_friendly_article_image_name(article, original_filename, extension):
    base_name = os.path.splitext(os.path.basename(original_filename or "article-image"))[0]
    safe_base = slugify(base_name)[:45] or "article-image"
    safe_slug = slugify(getattr(article, "slug", "") or getattr(article, "title", ""))[:80] or "article"
    article_id = str(getattr(article, "pk", "") or "").strip()

    name_parts = [safe_slug]
    if safe_base and safe_base != safe_slug:
        name_parts.append(safe_base)
    if article_id:
        name_parts.append(article_id)

    clean_name = "-".join(part for part in name_parts if part).strip("-")
    clean_name = re.sub(r"-{2,}", "-", clean_name)
    return f"articles/{clean_name}{extension}"


class Command(BaseCommand):
    help = "Rename stored article images to SEO-friendly filenames."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show which files would be renamed without making changes.",
        )
        parser.add_argument(
            "--keep-old",
            action="store_true",
            help="Do not delete the old storage object after copying to the new SEO-friendly filename.",
        )

    def handle(self, *args, **options):
        dry_run = bool(options["dry_run"])
        keep_old = bool(options["keep_old"])

        articles = Article.objects.exclude(image__isnull=True).exclude(image__exact="")
        renamed = 0
        skipped = 0

        for article in articles.iterator():
            image_field = article.image
            current_name = str(getattr(image_field, "name", "") or "").strip()
            if not current_name:
                skipped += 1
                continue

            extension = os.path.splitext(current_name)[1].lower() or ".webp"
            target_name = _seo_friendly_article_image_name(article, article.slug or article.title, extension)

            if current_name == target_name:
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f"DRY RUN: {current_name} -> {target_name}")
                renamed += 1
                continue

            storage = image_field.storage
            with storage.open(current_name, "rb") as source_handle:
                saved_name = storage.save(target_name, ContentFile(source_handle.read()))

            article.image.name = saved_name
            article.save(update_fields=["image"])

            if not keep_old and current_name != saved_name:
                try:
                    storage.delete(current_name)
                except Exception as exc:
                    self.stdout.write(
                        self.style.WARNING(f"Renamed but could not delete old file {current_name}: {exc}")
                    )

            self.stdout.write(f"RENAMED: {current_name} -> {saved_name}")
            renamed += 1

        summary = f"Completed. Renamed: {renamed}, skipped: {skipped}."
        self.stdout.write(self.style.SUCCESS(summary))
