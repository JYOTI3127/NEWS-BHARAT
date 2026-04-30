import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone


logger = logging.getLogger(__name__)
BATCH_KEY = "default"
BATCH_TRIGGER_COUNT = 3
BATCH_WAIT_MINUTES = 30


def _is_github_dispatch_url(url):
    return "api.github.com/repos/" in url and url.rstrip("/").endswith("/dispatches")


def _event_type_for_reason(reason):
    if reason == "article_published":
        return getattr(settings, "FRONTEND_BUILD_EVENT_PUBLISHED", "article-published")
    if reason == "article_updated":
        return getattr(settings, "FRONTEND_BUILD_EVENT_UPDATED", "article-updated")
    return getattr(settings, "FRONTEND_BUILD_EVENT_FALLBACK", "rebuild-frontend")


def _get_batch_model():
    from newsapp.models import FrontendBuildBatch

    return FrontendBuildBatch


def _lock_batch_state():
    FrontendBuildBatch = _get_batch_model()
    batch, _ = FrontendBuildBatch.objects.select_for_update().get_or_create(
        batch_key=BATCH_KEY,
        defaults={"pending_article_ids": []},
    )
    if batch.pending_article_ids is None:
        batch.pending_article_ids = []
    return batch


def _reset_batch_state(batch, *, triggered_at):
    batch.pending_publish_count = 0
    batch.pending_article_ids = []
    batch.first_pending_at = None
    batch.last_queued_at = None
    batch.last_triggered_at = triggered_at
    batch.save(
        update_fields=[
            "pending_publish_count",
            "pending_article_ids",
            "first_pending_at",
            "last_queued_at",
            "last_triggered_at",
        ]
    )


def _build_batch_meta(batch, *, triggered_by_article_id=None, triggered_by_slug=""):
    return {
        "batch_size": int(batch.pending_publish_count or 0),
        "pending_article_ids": list(batch.pending_article_ids or []),
        "batch_window_started_at": batch.first_pending_at.isoformat() if batch.first_pending_at else None,
        "batch_wait_minutes": BATCH_WAIT_MINUTES,
        "batch_trigger_count": BATCH_TRIGGER_COUNT,
        "triggered_by_article_id": triggered_by_article_id,
        "triggered_by_slug": triggered_by_slug or "",
    }


def _post_frontend_hook(*, event_type, client_payload):
    hook_url = getattr(settings, "FRONTEND_BUILD_HOOK_URL", "").strip()
    if not hook_url:
        return False

    headers = {"Content-Type": "application/json"}
    token = getattr(settings, "FRONTEND_BUILD_HOOK_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if _is_github_dispatch_url(hook_url):
        headers["Accept"] = "application/vnd.github+json"
        payload = {
            "event_type": event_type,
            "client_payload": client_payload,
        }
    else:
        if token:
            headers["X-Build-Hook-Token"] = token
        payload = client_payload

    timeout = max(3, int(getattr(settings, "FRONTEND_BUILD_HOOK_TIMEOUT", 10) or 10))
    response = requests.post(hook_url, json=payload, headers=headers, timeout=timeout)
    response.raise_for_status()
    return True


def trigger_frontend_build(*, reason="article_updated", article=None, force=False, extra_payload=None):
    event_type = _event_type_for_reason(reason)
    client_payload = {
        "reason": reason,
        "event_type": event_type,
        "article_id": getattr(article, "id", None),
        "slug": getattr(article, "slug", ""),
        "previous_status": getattr(article, "_build_previous_status", None),
        "status": getattr(article, "status", ""),
    }
    if extra_payload:
        client_payload.update(extra_payload)

    try:
        triggered = _post_frontend_hook(
            event_type=event_type,
            client_payload=client_payload,
        )
        if triggered:
            logger.info(
                "Frontend build hook triggered. reason=%s event_type=%s slug=%s previous_status=%s status=%s",
                reason,
                event_type,
                client_payload["slug"],
                client_payload["previous_status"],
                client_payload["status"],
            )
        return triggered
    except Exception as exc:
        logger.warning(
            "Frontend build hook failed. reason=%s event_type=%s slug=%s error=%s",
            reason,
            event_type,
            client_payload["slug"],
            exc,
        )
        return False


def trigger_frontend_build_on_commit(*, reason="article_updated", article=None, force=False, extra_payload=None):
    transaction.on_commit(
        lambda: trigger_frontend_build(
            reason=reason,
            article=article,
            force=force,
            extra_payload=extra_payload,
        )
    )


def process_pending_frontend_build_batch(*, now=None):
    now = now or timezone.now()
    trigger_data = None

    with transaction.atomic():
        batch = _lock_batch_state()
        if (
            batch.pending_publish_count <= 0
            or not batch.first_pending_at
            or batch.first_pending_at + timedelta(minutes=BATCH_WAIT_MINUTES) > now
        ):
            return False

        trigger_data = _build_batch_meta(batch)
        _reset_batch_state(batch, triggered_at=now)

    logger.info(
        "Frontend build batch triggered after wait window. batch_size=%s article_ids=%s",
        trigger_data["batch_size"],
        trigger_data["pending_article_ids"],
    )
    return trigger_frontend_build(
        reason="article_published",
        article=None,
        force=True,
        extra_payload=trigger_data,
    )


def queue_published_article_build(*, article):
    if article is None:
        return False

    now = timezone.now()
    trigger_data = None
    trigger_article = article

    with transaction.atomic():
        batch = _lock_batch_state()

        if (
            batch.pending_publish_count > 0
            and batch.first_pending_at
            and batch.first_pending_at + timedelta(minutes=BATCH_WAIT_MINUTES) <= now
        ):
            trigger_data = _build_batch_meta(batch)
            _reset_batch_state(batch, triggered_at=now)
            batch = _lock_batch_state()

        pending_ids = [int(pk) for pk in (batch.pending_article_ids or []) if pk is not None]
        if article.id not in pending_ids:
            pending_ids.append(article.id)

        if not batch.first_pending_at:
            batch.first_pending_at = now

        batch.pending_article_ids = pending_ids
        batch.pending_publish_count = len(pending_ids)
        batch.last_queued_at = now
        batch.save(
            update_fields=[
                "pending_article_ids",
                "pending_publish_count",
                "first_pending_at",
                "last_queued_at",
            ]
        )

        if batch.pending_publish_count >= BATCH_TRIGGER_COUNT:
            trigger_data = _build_batch_meta(
                batch,
                triggered_by_article_id=article.id,
                triggered_by_slug=getattr(article, "slug", ""),
            )
            _reset_batch_state(batch, triggered_at=now)

    if trigger_data and trigger_data.get("batch_size"):
        logger.info(
            "Frontend build batch triggered. batch_size=%s article_ids=%s",
            trigger_data["batch_size"],
            trigger_data["pending_article_ids"],
        )
        return trigger_frontend_build(
            reason="article_published",
            article=trigger_article if trigger_data.get("triggered_by_article_id") else None,
            force=True,
            extra_payload=trigger_data,
        )

    logger.info(
        "Frontend build batch queued. pending_count=%s article_id=%s wait_minutes=%s",
        len((trigger_data or {}).get("pending_article_ids", [])) if trigger_data else batch.pending_publish_count,
        getattr(article, "id", None),
        BATCH_WAIT_MINUTES,
    )
    return False
