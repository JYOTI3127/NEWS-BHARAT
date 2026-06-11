import logging
import os
import subprocess
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from shlex import quote as sh_quote

from django.conf import settings


logger = logging.getLogger(__name__)


class PrerenderError(Exception):
    retryable = False


class RetryablePrerenderError(PrerenderError):
    retryable = True


class NonRetryablePrerenderError(PrerenderError):
    retryable = False


def _log(level, message, *args):
    logger.log(level, message, *args)
    log_file = str(getattr(settings, "FRONTEND_PRERENDER_LOG_FILE", "") or "").strip()
    if not log_file:
        return
    try:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        rendered = message % args if args else message
        with open(log_file, "a", encoding="utf-8") as handle:
            handle.write(f"{datetime.utcnow().isoformat()}Z {logging.getLevelName(level)} {rendered}\n")
    except Exception:
        logger.exception("Failed writing prerender log file.")


def _slug_url(slug):
    base_url = str(getattr(settings, "FRONTEND_PRERENDER_BASE_URL", "") or "").rstrip("/")
    if not base_url:
        raise NonRetryablePrerenderError("FRONTEND_PRERENDER_BASE_URL is not configured.")
    try:
        from newsapp.models import Article
        from newsapp.seo_direct import article_url
    except Exception as exc:
        raise NonRetryablePrerenderError("Could not import article URL helpers for prerender.") from exc

    try:
        article = (
            Article.objects
            .select_related("primary_category")
            .prefetch_related("categories")
            .get(slug=slug)
        )
    except Article.DoesNotExist as exc:
        raise NonRetryablePrerenderError(f"Article with slug '{slug}' does not exist.") from exc

    return article_url(article, base_url)


def _article_for_slug(slug):
    from newsapp.models import Article

    try:
        return (
            Article.objects
            .select_related("primary_category")
            .prefetch_related("categories")
            .get(slug=slug)
        )
    except Article.DoesNotExist as exc:
        raise NonRetryablePrerenderError(f"Article with slug '{slug}' does not exist.") from exc


def _output_file_path(slug):
    try:
        from newsapp.seo_direct import primary_category_slug
    except Exception as exc:
        raise NonRetryablePrerenderError("Could not import category helpers for prerender output path.") from exc

    article = _article_for_slug(slug)
    category_slug = (primary_category_slug(article) or "").strip()
    if not category_slug:
        raise NonRetryablePrerenderError(f"Published article '{slug}' has no category slug for prerender output path.")

    output_dir = _output_root() / category_slug
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{slug}.html"


def _output_root():
    output_dir = str(getattr(settings, "FRONTEND_PRERENDER_OUTPUT_DIR", "") or "").strip()
    if not output_dir:
        raise NonRetryablePrerenderError("FRONTEND_PRERENDER_OUTPUT_DIR is not configured.")
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _lock_dir():
    configured = str(getattr(settings, "FRONTEND_PRERENDER_LOCK_DIR", "") or "").strip()
    if configured:
        target = Path(configured)
    else:
        target = _output_root().parent / ".locks"
    target.mkdir(parents=True, exist_ok=True)
    return target


@contextmanager
def _slug_lock(slug):
    safe_slug = "".join(ch for ch in slug if ch.isalnum() or ch in {"-", "_"}).strip() or "article"
    lock_path = _lock_dir() / f"{safe_slug}.lock"
    try:
        fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as exc:
        raise NonRetryablePrerenderError(f"Prerender already in progress for slug '{slug}'.") from exc
    try:
        os.write(fd, str(os.getpid()).encode("utf-8"))
        os.close(fd)
        yield lock_path
    finally:
        try:
            lock_path.unlink(missing_ok=True)
        except Exception:
            _log(logging.WARNING, "Could not remove prerender lock for slug=%s", slug)


def _timeout_ms():
    return max(1000, int(getattr(settings, "FRONTEND_PRERENDER_TIMEOUT_MS", 30000) or 30000))


def _settle_ms():
    return max(0, int(getattr(settings, "FRONTEND_PRERENDER_SETTLE_MS", 10000) or 10000))


def _is_meta_selector(selector):
    trimmed = str(selector or "").strip().lower()
    return trimmed.startswith("meta[")


def _read_prerender_status(page):
    selector = str(getattr(settings, "FRONTEND_PRERENDER_READY_SELECTOR", "") or "").strip()
    if not selector:
        raise NonRetryablePrerenderError("FRONTEND_PRERENDER_READY_SELECTOR is not configured.")

    try:
        page.wait_for_selector(selector, timeout=_timeout_ms(), state="attached")
    except Exception as exc:
        raise RetryablePrerenderError(
            f"Timed out waiting for prerender readiness selector: {selector}"
        ) from exc

    if _settle_ms():
        page.wait_for_timeout(_settle_ms())

    locator = page.locator(selector).first
    if _is_meta_selector(selector):
        status = locator.get_attribute("content")
        return str(status or "").strip()

    try:
        if locator.count() <= 0:
            raise RetryablePrerenderError(
                f"Prerender readiness selector appeared empty after wait: {selector}"
            )
    except AttributeError:
        # Real Playwright Locator does not expose count on .first; if wait_for_selector passed,
        # treat the element as present.
        pass

    return str(getattr(settings, "FRONTEND_PRERENDER_SUCCESS_STATUS", "200") or "200").strip()


def _render_once(slug):
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        raise NonRetryablePrerenderError(
            "Playwright is not installed or could not be imported."
        ) from exc

    target_url = _slug_url(slug)
    html_file = _output_file_path(slug)

    _log(logging.INFO, "Prerender start slug=%s url=%s", slug, target_url)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        page = browser.new_page()
        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=_timeout_ms())
            status = _read_prerender_status(page)
            success_status = str(getattr(settings, "FRONTEND_PRERENDER_SUCCESS_STATUS", "200") or "200").strip()
            non_retry_statuses = set(getattr(settings, "FRONTEND_PRERENDER_NON_RETRY_STATUSES", ("404", "500")) or ())
            if status == success_status:
                html = page.content()
            elif status in non_retry_statuses:
                raise NonRetryablePrerenderError(f"Frontend prerender reported terminal status {status} for slug '{slug}'.")
            else:
                raise RetryablePrerenderError(f"Frontend prerender reported retryable status '{status}' for slug '{slug}'.")
        finally:
            browser.close()

    html_file.write_text(html, encoding="utf-8")
    _log(logging.INFO, "Prerender HTML saved slug=%s file=%s", slug, html_file)
    return html_file


def _upload_once(local_file, slug):
    remote_user = str(getattr(settings, "FRONTEND_PRERENDER_REMOTE_USER", "") or "").strip()
    remote_host = str(getattr(settings, "FRONTEND_PRERENDER_REMOTE_HOST", "") or "").strip()
    remote_path = str(getattr(settings, "FRONTEND_PRERENDER_REMOTE_PATH", "") or "").strip()
    ssh_key = str(getattr(settings, "FRONTEND_PRERENDER_SSH_KEY", "") or "").strip()
    remote_port = str(getattr(settings, "FRONTEND_PRERENDER_REMOTE_PORT", "22") or "22").strip()

    if not all([remote_user, remote_host, remote_path, ssh_key]):
        raise NonRetryablePrerenderError("Remote upload settings are incomplete.")

    local_file = Path(local_file)
    relative_path = local_file.relative_to(_output_root())
    remote_target = f"{remote_user}@{remote_host}:{remote_path.rstrip('/')}/{relative_path.as_posix()}"

    mkdir_command = [
        "ssh",
        "-p",
        remote_port,
        "-i",
        ssh_key,
        "-o",
        "StrictHostKeyChecking=no",
        f"{remote_user}@{remote_host}",
        f"mkdir -p {sh_quote((Path(remote_path) / relative_path.parent).as_posix())}",
    ]

    try:
        subprocess.run(mkdir_command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        stderr_preview = (exc.stderr or exc.stdout or "").strip()
        if len(stderr_preview) > 500:
            stderr_preview = stderr_preview[:500] + "..."
        raise RetryablePrerenderError(
            f"Remote directory creation failed for slug '{slug}'. {stderr_preview}"
        ) from exc

    command = [
        "scp",
        "-P",
        remote_port,
        "-i",
        ssh_key,
        "-o",
        "StrictHostKeyChecking=no",
        str(local_file),
        remote_target,
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        stderr_preview = (exc.stderr or exc.stdout or "").strip()
        if len(stderr_preview) > 500:
            stderr_preview = stderr_preview[:500] + "..."
        raise RetryablePrerenderError(
            f"SCP upload failed for slug '{slug}'. {stderr_preview}"
        ) from exc

    _log(logging.INFO, "Prerender upload success slug=%s remote_path=%s", slug, remote_target)


def run_prerender_pipeline(*, slug, reason="article_updated"):
    slug = str(slug or "").strip()
    if not slug:
        raise NonRetryablePrerenderError("Slug is required for prerender.")

    max_attempts = max(1, int(getattr(settings, "FRONTEND_PRERENDER_MAX_ATTEMPTS", 3) or 3))
    last_error = None
    with _slug_lock(slug):
        for attempt in range(1, max_attempts + 1):
            try:
                _log(logging.INFO, "Prerender attempt=%s/%s slug=%s reason=%s", attempt, max_attempts, slug, reason)
                local_dir = _render_once(slug)
                _upload_once(local_dir, slug)
                _log(logging.INFO, "Prerender complete slug=%s reason=%s", slug, reason)
                return True
            except NonRetryablePrerenderError as exc:
                _log(logging.ERROR, "Prerender failed without retry slug=%s reason=%s error=%s", slug, reason, exc)
                raise
            except RetryablePrerenderError as exc:
                last_error = exc
                _log(logging.WARNING, "Prerender retryable failure slug=%s attempt=%s/%s error=%s", slug, attempt, max_attempts, exc)
                if attempt >= max_attempts:
                    break

    raise RetryablePrerenderError(
        f"Prerender exhausted retries for slug '{slug}'. Last error: {last_error}"
    )
