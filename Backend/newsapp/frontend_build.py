import logging

import requests
from django.conf import settings
from django.db import transaction


logger = logging.getLogger(__name__)


def _is_github_dispatch_url(url):
    return "api.github.com/repos/" in url and url.rstrip("/").endswith("/dispatches")


def _event_type_for_reason(reason):
    if reason == "article_published":
        return getattr(settings, "FRONTEND_BUILD_EVENT_PUBLISHED", "article-published")
    if reason == "article_updated":
        return getattr(settings, "FRONTEND_BUILD_EVENT_UPDATED", "article-updated")
    return getattr(settings, "FRONTEND_BUILD_EVENT_FALLBACK", "rebuild-frontend")


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


def trigger_frontend_build(*, reason="article_updated", article=None, force=False):
    event_type = _event_type_for_reason(reason)
    client_payload = {
        "reason": reason,
        "event_type": event_type,
        "article_id": getattr(article, "id", None),
        "slug": getattr(article, "slug", ""),
        "previous_status": getattr(article, "_build_previous_status", None),
        "status": getattr(article, "status", ""),
    }

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


def trigger_frontend_build_on_commit(*, reason="article_updated", article=None, force=False):
    transaction.on_commit(
        lambda: trigger_frontend_build(reason=reason, article=article, force=force)
    )
