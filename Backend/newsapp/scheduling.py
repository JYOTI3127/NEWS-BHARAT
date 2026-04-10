from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from .frontend_build import flush_frontend_build_batch_if_due
from .models import Article


SCHEDULED_PUBLISH_CACHE_KEY = "newsapp:last_scheduled_publish_run"
SCHEDULED_PUBLISH_CACHE_TTL = 45
FRONTEND_BUILD_FLUSH_CACHE_KEY = "newsapp:last_frontend_build_flush_run"
FRONTEND_BUILD_FLUSH_CACHE_TTL = 45


def publish_due_articles(*, now=None):
    now = now or timezone.now()
    published_count = 0

    due_articles = (
        Article.objects
        .filter(status="scheduled", scheduled_at__isnull=False, scheduled_at__lte=now)
        .select_related("author")
        .order_by("scheduled_at", "id")
    )

    for article in due_articles:
        with transaction.atomic():
            locked = Article.objects.select_for_update().get(pk=article.pk)
            if locked.status != "scheduled":
                continue
            if not locked.scheduled_at or locked.scheduled_at > now:
                continue

            locked.status = "published"
            locked.published_at = locked.scheduled_at or now
            locked.scheduled_at = None
            locked.save(update_fields=["status", "published_at", "scheduled_at"])
            published_count += 1

    return published_count


def maybe_publish_due_articles(*, now=None):
    if cache.get(SCHEDULED_PUBLISH_CACHE_KEY):
        return 0

    cache.set(SCHEDULED_PUBLISH_CACHE_KEY, True, SCHEDULED_PUBLISH_CACHE_TTL)
    return publish_due_articles(now=now)


def publish_due_articles_cron():
    return publish_due_articles()


def flush_frontend_build_batch_cron():
    return flush_frontend_build_batch_if_due()


def maybe_flush_frontend_build_batch_if_due():
    if cache.get(FRONTEND_BUILD_FLUSH_CACHE_KEY):
        return False

    cache.set(FRONTEND_BUILD_FLUSH_CACHE_KEY, True, FRONTEND_BUILD_FLUSH_CACHE_TTL)
    return flush_frontend_build_batch_if_due()
