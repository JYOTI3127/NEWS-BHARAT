from django.core.management.base import BaseCommand, CommandError

from newsapp.frontend_prerender import (
    NonRetryablePrerenderError,
    RetryablePrerenderError,
    run_prerender_pipeline,
)


class Command(BaseCommand):
    help = "Render and upload a prerendered HTML snapshot for a published frontend article page."

    def add_arguments(self, parser):
        parser.add_argument("slug", help="Published article slug to prerender.")
        parser.add_argument(
            "--reason",
            default="article_updated",
            help="Reason for triggering the prerender job.",
        )

    def handle(self, *args, **options):
        slug = str(options["slug"] or "").strip()
        reason = str(options["reason"] or "article_updated").strip()

        try:
            run_prerender_pipeline(slug=slug, reason=reason)
        except NonRetryablePrerenderError as exc:
            raise CommandError(str(exc)) from exc
        except RetryablePrerenderError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(f"Prerender completed for slug '{slug}'"))
