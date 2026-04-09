import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.db import transaction


logger = logging.getLogger(__name__)

FRONTEND_BUILD_DEBOUNCE_CACHE_KEY = "newsapp:frontend_build_hook:debounce"


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
    }
    return mapping.get(
        reason,
        getattr(settings, "FRONTEND_BUILD_EVENT_FALLBACK", "rebuild-frontend"),
    )


def trigger_frontend_build(*, reason="article_change", article=None, force=False):
    hook_url = getattr(settings, "FRONTEND_BUILD_HOOK_URL", "").strip()
    if not hook_url:
        return False

    debounce_seconds = max(
        0,
        int(getattr(settings, "FRONTEND_BUILD_HOOK_DEBOUNCE_SECONDS", 120) or 0),
    )

    if not force and debounce_seconds:
        acquired = cache.add(FRONTEND_BUILD_DEBOUNCE_CACHE_KEY, reason, debounce_seconds)
        if not acquired:
            logger.info(
                "Skipped frontend build hook due to debounce window. reason=%s slug=%s",
                reason,
                getattr(article, "slug", ""),
            )
            return False

    headers = {"Content-Type": "application/json"}
    token = getattr(settings, "FRONTEND_BUILD_HOOK_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    client_payload = {
        "reason": reason,
        "article_id": getattr(article, "id", None),
        "slug": getattr(article, "slug", ""),
        "status": getattr(article, "status", ""),
    }

    if _is_github_dispatch_url(hook_url):
        headers["Accept"] = "application/vnd.github+json"
        payload = {
            "event_type": _event_type_for_reason(reason),
            "client_payload": client_payload,
        }
    else:
        if token:
            headers["X-Build-Hook-Token"] = token
        payload = client_payload

    timeout = max(3, int(getattr(settings, "FRONTEND_BUILD_HOOK_TIMEOUT", 10) or 10))

    try:
        response = requests.post(hook_url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
        logger.info(
            "Frontend build hook triggered successfully. reason=%s slug=%s status=%s",
            reason,
            getattr(article, "slug", ""),
            response.status_code,
        )
        return True
    except Exception as exc:
        if debounce_seconds:
            cache.delete(FRONTEND_BUILD_DEBOUNCE_CACHE_KEY)
        logger.warning(
            "Frontend build hook failed. reason=%s slug=%s error=%s",
            reason,
            getattr(article, "slug", ""),
            exc,
        )
        return False


def trigger_frontend_build_on_commit(*, reason="article_change", article=None, force=False):
    transaction.on_commit(
        lambda: trigger_frontend_build(reason=reason, article=article, force=force)
    )
