from django.core.management.base import BaseCommand

from newsapp.models import Article


def build_meta_title(title):
    text = " ".join(str(title or "").strip().split())
    if not text:
        return ""

    if len(text) <= 70:
        return text

    shortened = text[:70].rsplit(" ", 1)[0].strip()
    if len(shortened) < 30:
        shortened = text[:70].strip()
    return shortened


class Command(BaseCommand):
    help = "Backfill blank meta_title values from article title for existing articles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--published-only",
            action="store_true",
            help="Only update published articles.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many articles would be updated without saving changes.",
        )

    def handle(self, *args, **options):
        articles = Article.objects.filter(meta_title__exact="")
        if options["published_only"]:
            articles = articles.filter(status="published")

        total = articles.count()
        self.stdout.write(f"Blank meta titles found: {total}")

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("Dry run only. No changes saved."))
            return

        updated = 0
        for article in articles.iterator():
            meta_title = build_meta_title(article.title)
            if not meta_title:
                continue
            article.meta_title = meta_title
            article.save(update_fields=["meta_title"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} article(s)."))
