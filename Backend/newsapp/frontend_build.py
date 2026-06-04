import logging

import requests
from django.conf import settings
from django.db import transaction


logger = logging.getLogger(__name__)


def _build_article_dispatch_payload(article):
    if article is None:
        return None

    from .serializers import ArticleSerializer

    serialized = ArticleSerializer(article).data
    primary_category = serialized.get("primary_category_details") or serialized.get("primary_category") or {}
    tags = serialized.get("tags_list")
    if not isinstance(tags, list):
        raw_tags = serialized.get("tags") or ""
        tags = [tag.strip() for tag in str(raw_tags).split(",") if tag.strip()]

    author_name = (
        serialized.get("display_author_name")
        or serialized.get("author_display_name")
        or getattr(getattr(article, "author", None), "get_full_name", lambda: "")()
        or getattr(getattr(article, "author", None), "username", "")
    )

    return {
        "id": serialized.get("id"),
        "title": serialized.get("title") or "",
        "slug": serialized.get("slug") or "",
        "subtitle": serialized.get("subtitle") or "",
        "content_html": serialized.get("content_html") or "",
        "image_url": serialized.get("image_url") or "",
        "image_alt": serialized.get("image_alt") or "",
        "primary_category": {
            "id": primary_category.get("id"),
            "name": primary_category.get("name") or "",
            "slug": primary_category.get("slug") or "",
        } if primary_category else None,
        "tags": tags,
        "author_name": author_name or "",
        "author_display_name": serialized.get("author_display_name") or author_name or "",
        "published_at": serialized.get("published_at"),
        "updated_at": serialized.get("updated_at"),
        "canonical_url": serialized.get("canonical_url") or "",
        "meta_title": serialized.get("meta_title") or "",
        "meta_description": serialized.get("meta_description") or "",
    }


def _is_github_dispatch_url(url):
    return "api.github.com/repos/" in url and url.rstrip("/").endswith("/dispatches")


def _event_type_for_reason(reason):
    if reason == "article_published":
        return getattr(settings, "FRONTEND_BUILD_EVENT_PUBLISHED", "article-published")
    if reason in {"article_updated", "article_categories_updated"}:
        return getattr(settings, "FRONTEND_BUILD_EVENT_UPDATED", "article-updated")
    return getattr(settings, "FRONTEND_BUILD_EVENT_FALLBACK", "rebuild-frontend")


def _post_frontend_hook(*, event_type, client_payload):
    hook_url = getattr(settings, "FRONTEND_BUILD_HOOK_URL", "").strip()
    if not hook_url:
        logger.warning("Frontend build hook skipped because FRONTEND_BUILD_HOOK_URL is empty.")
        return False

    headers = {"Content-Type": "application/json"}
    token = getattr(settings, "FRONTEND_BUILD_HOOK_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if _is_github_dispatch_url(hook_url):
        headers["Accept"] = "application/vnd.github+json"
        headers["X-GitHub-Api-Version"] = "2022-11-28"
        if token:
            headers["Authorization"] = f"token {token}"
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
    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        body_preview = (response.text or "").strip()
        if len(body_preview) > 500:
            body_preview = body_preview[:500] + "..."
        raise requests.HTTPError(
            f"{exc}. status={response.status_code} response={body_preview}"
        ) from exc
    return True


def trigger_frontend_build(*, reason="article_updated", article=None, force=False, extra_payload=None):
    event_type = _event_type_for_reason(reason)
    client_payload = {
        "reason": reason,
        "event_type": event_type,
        "build_mode": "immediate",
        "article_id": getattr(article, "id", None),
        "slug": getattr(article, "slug", ""),
        "article": _build_article_dispatch_payload(article),
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
    logger.info("Frontend build batch processor skipped because immediate build mode is enabled.")
    return False


def queue_published_article_build(*, article):
    if article is None:
        return False
    logger.info(
        "Frontend build triggering immediately for published article. article_id=%s slug=%s",
        getattr(article, "id", None),
        getattr(article, "slug", ""),
    )
    return trigger_frontend_build(
        reason="article_published",
        article=article,
        force=True,
    )
