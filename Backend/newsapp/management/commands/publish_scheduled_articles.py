from django.core.management.base import BaseCommand

from newsapp.scheduling import publish_due_articles


class Command(BaseCommand):
    help = "Publish all scheduled articles whose scheduled_at time has passed."

    def handle(self, *args, **options):
        count = publish_due_articles()
        self.stdout.write(self.style.SUCCESS(f"Published {count} scheduled article(s)."))
