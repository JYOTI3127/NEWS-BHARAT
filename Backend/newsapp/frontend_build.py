import logging
from datetime import datetime

import requests
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone


logger = logging.getLogger(__name__)

FRONTEND_BUILD_DEBOUNCE_CACHE_KEY = "newsapp:frontend_build_hook:debounce"
FRONTEND_BUILD_BATCH_CACHE_KEY = "newsapp:frontend_build_hook:batch_state"
FRONTEND_BUILD_BATCH_LOCK_CACHE_KEY = "newsapp:frontend_build_hook:batch_lock"


def _is_github_dispatch_url(url):
    return "api.github.com/repos/" in url and url.rstrip("/").endswith("/dispatches")


def _event_type_for_reason(reason):
    mapping = {
        "article_published": getattr(
            settings,
            "FRONTEND_BUILD_EVENT_PUBLISHED",
            "article-published",
        ),
        "article_updated": getattr(
            settings,
            "FRONTEND_BUILD_EVENT_UPDATED",
            "article-updated",
        ),
        "article_batch": getattr(
            settings,
            "FRONTEND_BUILD_EVENT_BATCH",
            getattr(settings, "FRONTEND_BUILD_EVENT_FALLBACK", "rebuild-frontend"),
        ),
    }
    return mapping.get(
        reason,
        getattr(settings, "FRONTEND_BUILD_EVENT_FALLBACK", "rebuild-frontend"),
    )


def _batch_threshold():
    return max(1, int(getattr(settings, "FRONTEND_BUILD_BATCH_THRESHOLD", 1) or 1))


def _batch_max_wait_seconds():
    return max(0, int(getattr(settings, "FRONTEND_BUILD_BATCH_MAX_WAIT_SECONDS", 0) or 0))


def _batching_enabled():
    return _batch_threshold() > 1 or _batch_max_wait_seconds() > 0


def _empty_batch_state():
    return {
        "slugs": [],
        "reasons": [],
        "statuses": {},
        "previous_statuses": {},
        "first_queued_at": None,
        "last_reason": None,
        "latest_slug": "",
        "latest_title": "",
        "notification_sent_at": None,
    }


def _parse_iso_datetime(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _get_batch_state():
    state = cache.get(FRONTEND_BUILD_BATCH_CACHE_KEY)
    if isinstance(state, dict):
        return state
    return _empty_batch_state()


def _set_batch_state(state):
    ttl = max(_batch_max_wait_seconds(), 3600)
    cache.set(FRONTEND_BUILD_BATCH_CACHE_KEY, state, ttl)


def _clear_batch_state():
    cache.delete(FRONTEND_BUILD_BATCH_CACHE_KEY)


def _batch_window_end_iso(state):
    first_queued_at = _parse_iso_datetime(state.get("first_queued_at"))
    if not first_queued_at:
        return None
    max_wait = _batch_max_wait_seconds()
    if max_wait <= 0:
        return first_queued_at.isoformat()
    return (first_queued_at + timezone.timedelta(seconds=max_wait)).isoformat()


def _batch_should_flush(state, *, now=None):
    now = now or timezone.now()
    count = len(state.get("slugs") or [])
    threshold = _batch_threshold()
    max_wait = _batch_max_wait_seconds()
    first_queued_at = _parse_iso_datetime(state.get("first_queued_at"))

    if threshold > 1 and count >= threshold:
        return "threshold"
    if max_wait > 0 and first_queued_at and (now - first_queued_at).total_seconds() >= max_wait:
        return "max_wait"
    return None


def _queue_batch_event(*, reason, article):
    now = timezone.now()
    slug = getattr(article, "slug", "")
    previous_status = getattr(article, "_build_previous_status", None)
    current_status = getattr(article, "status", "")

    lock_acquired = cache.add(FRONTEND_BUILD_BATCH_LOCK_CACHE_KEY, True, 10)
    if not lock_acquired:
        state = _get_batch_state()
        return state, _batch_should_flush(state, now=now)

    try:
        state = _get_batch_state()
        if not state.get("first_queued_at"):
            state["first_queued_at"] = now.isoformat()
        state["last_reason"] = reason

        if reason and reason not in state["reasons"]:
            state["reasons"].append(reason)

        if slug and slug not in state["slugs"]:
            state["slugs"].append(slug)
        if slug:
            state["statuses"][slug] = current_status
            state["previous_statuses"][slug] = previous_status
            state["latest_slug"] = slug
            state["latest_title"] = getattr(article, "title", "") or ""

        _set_batch_state(state)
        return state, _batch_should_flush(state, now=now)
    finally:
        cache.delete(FRONTEND_BUILD_BATCH_LOCK_CACHE_KEY)


def _build_payload_context(reason, article=None, batch_state=None, batch_trigger=None):
    event_type = _event_type_for_reason(reason)
    payload = {
        "reason": reason,
        "event_type": event_type,
        "article_id": getattr(article, "id", None),
        "slug": getattr(article, "slug", ""),
        "previous_status": getattr(article, "_build_previous_status", None),
        "status": getattr(article, "status", ""),
    }

    if batch_state:
        payload.update({
            "batch_trigger": batch_trigger or "",
            "batch_count": len(batch_state.get("slugs") or []),
            "batch_first_queued_at": batch_state.get("first_queued_at"),
            "batched_slugs": batch_state.get("slugs") or [],
            "batched_reasons": batch_state.get("reasons") or [],
            "batched_previous_statuses": batch_state.get("previous_statuses") or {},
            "batched_statuses": batch_state.get("statuses") or {},
        })

    return event_type, payload


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


def _send_scheduled_batch_notification(state):
    if state.get("notification_sent_at"):
        return True

    event_type = getattr(settings, "FRONTEND_BUILD_EVENT_SCHEDULED_BATCH", "rebuild-frontend")
    client_payload = {
        "reason": "scheduled-batch",
        "article_count": len(state.get("slugs") or []),
        "window_start": state.get("first_queued_at") or "",
        "window_end": _batch_window_end_iso(state) or "",
        "latest_slug": state.get("latest_slug") or "",
        "latest_title": state.get("latest_title") or "",
    }

    _post_frontend_hook(event_type=event_type, client_payload=client_payload)
    state["notification_sent_at"] = timezone.now().isoformat()
    _set_batch_state(state)
    logger.info(
        "Scheduled batch notification sent. event_type=%s article_count=%s window_start=%s window_end=%s latest_slug=%s",
        event_type,
        client_payload["article_count"],
        client_payload["window_start"],
        client_payload["window_end"],
        client_payload["latest_slug"],
    )
    return True


def trigger_frontend_build(*, reason="article_change", article=None, force=False):
    hook_url = getattr(settings, "FRONTEND_BUILD_HOOK_URL", "").strip()
    if not hook_url:
        return False

    batch_state = None
    batch_trigger = None
    if not force and _batching_enabled() and article is not None:
        batch_state, batch_trigger = _queue_batch_event(reason=reason, article=article)
        logger.info(
            "Queued frontend build batch. slug=%s reason=%s pending_articles=%s trigger=%s first_queued_at=%s",
            getattr(article, "slug", ""),
            reason,
            len(batch_state.get("slugs") or []),
            batch_trigger or "",
            batch_state.get("first_queued_at"),
        )
        if not batch_state.get("notification_sent_at"):
            try:
                _send_scheduled_batch_notification(batch_state)
            except Exception as exc:
                logger.warning(
                    "Failed to send scheduled batch notification. slug=%s pending_articles=%s error=%s",
                    getattr(article, "slug", ""),
                    len(batch_state.get("slugs") or []),
                    exc,
                )
        if not batch_trigger:
            return False
        reason = "article_batch"
        force = True

    debounce_seconds = max(
        0,
        int(getattr(settings, "FRONTEND_BUILD_HOOK_DEBOUNCE_SECONDS", 120) or 0),
    )

    event_type, client_payload = _build_payload_context(
        reason,
        article=article,
        batch_state=batch_state,
        batch_trigger=batch_trigger,
    )

    if not force and debounce_seconds:
        acquired = cache.add(FRONTEND_BUILD_DEBOUNCE_CACHE_KEY, reason, debounce_seconds)
        if not acquired:
            logger.info(
                "Skipped frontend build hook due to debounce window. reason=%s event_type=%s slug=%s previous_status=%s current_status=%s",
                reason,
                event_type,
                getattr(article, "slug", ""),
                getattr(article, "_build_previous_status", None),
                getattr(article, "status", ""),
            )
            return False

    try:
        _post_frontend_hook(event_type=event_type, client_payload=client_payload)
        if batch_state:
            _clear_batch_state()
        logger.info(
            "Frontend build hook triggered successfully. reason=%s event_type=%s slug=%s previous_status=%s current_status=%s batch_count=%s batch_trigger=%s",
            reason,
            event_type,
            getattr(article, "slug", ""),
            getattr(article, "_build_previous_status", None),
            getattr(article, "status", ""),
            client_payload.get("batch_count"),
            client_payload.get("batch_trigger"),
        )
        return True
    except Exception as exc:
        if debounce_seconds:
            cache.delete(FRONTEND_BUILD_DEBOUNCE_CACHE_KEY)
        logger.warning(
            "Frontend build hook failed. reason=%s event_type=%s slug=%s previous_status=%s current_status=%s batch_count=%s batch_trigger=%s error=%s",
            reason,
            event_type,
            getattr(article, "slug", ""),
            getattr(article, "_build_previous_status", None),
            getattr(article, "status", ""),
            client_payload.get("batch_count"),
            client_payload.get("batch_trigger"),
            exc,
        )
        return False


def trigger_frontend_build_on_commit(*, reason="article_change", article=None, force=False):
    transaction.on_commit(
        lambda: trigger_frontend_build(reason=reason, article=article, force=force)
    )


def flush_frontend_build_batch_if_due():
    if not _batching_enabled():
        return False

    state = _get_batch_state()
    batch_trigger = _batch_should_flush(state)
    if not batch_trigger:
        return False

    reason = "article_batch"
    event_type, client_payload = _build_payload_context(
        reason,
        batch_state=state,
        batch_trigger=batch_trigger,
    )

    hook_url = getattr(settings, "FRONTEND_BUILD_HOOK_URL", "").strip()
    if not hook_url:
        return False

    try:
        _post_frontend_hook(event_type=event_type, client_payload=client_payload)
        _clear_batch_state()
        logger.info(
            "Frontend build batch flushed successfully. event_type=%s batch_count=%s batch_trigger=%s",
            event_type,
            client_payload.get("batch_count"),
            batch_trigger,
        )
        return True
    except Exception as exc:
        logger.warning(
            "Frontend build batch flush failed. event_type=%s batch_count=%s batch_trigger=%s error=%s",
            event_type,
            client_payload.get("batch_count"),
            batch_trigger,
            exc,
        )
        return False
