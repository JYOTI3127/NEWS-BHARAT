from pathlib import Path
from uuid import uuid4
from unittest.mock import patch

import pytest
from django.test import override_settings

from newsapp.frontend_build import trigger_frontend_build
from newsapp.frontend_prerender import (
    NonRetryablePrerenderError,
    RetryablePrerenderError,
    _read_prerender_status,
    run_prerender_pipeline,
)
from newsapp.models import Article


pytestmark = pytest.mark.django_db


def _make_article(staff_user):
    return Article.objects.create(
        author=staff_user,
        title="Prerender Story",
        content="Body",
        status="published",
        slug="prerender-story",
    )


@override_settings(FRONTEND_BUILD_MODE="local_prerender")
@patch("newsapp.frontend_build.subprocess.Popen")
def test_trigger_frontend_build_spawns_local_prerender(mock_popen, staff_user):
    article = _make_article(staff_user)

    triggered = trigger_frontend_build(reason="article_updated", article=article)

    assert triggered is True
    command = mock_popen.call_args.args[0]
    assert "prerender_article" in command
    assert "prerender-story" in command


def _workspace_temp_dir(settings):
    root = Path(settings.BASE_DIR) / ".test-artifacts" / uuid4().hex
    root.mkdir(parents=True, exist_ok=True)
    return root


def test_run_prerender_pipeline_retries_retryable_errors_then_succeeds(monkeypatch, settings):
    temp_root = _workspace_temp_dir(settings)
    settings.FRONTEND_PRERENDER_OUTPUT_DIR = str(temp_root / "__prerender")
    settings.FRONTEND_PRERENDER_LOCK_DIR = str(temp_root / "__locks")
    attempts = {"render": 0, "upload": 0}
    local_dir = temp_root / "__prerender" / "retry-story"
    local_dir.mkdir(parents=True, exist_ok=True)

    def fake_render(slug):
        attempts["render"] += 1
        if attempts["render"] == 1:
            raise RetryablePrerenderError("temporary timeout")
        return local_dir

    def fake_upload(path, slug):
        attempts["upload"] += 1
        assert Path(path) == local_dir

    monkeypatch.setattr("newsapp.frontend_prerender._render_once", fake_render)
    monkeypatch.setattr("newsapp.frontend_prerender._upload_once", fake_upload)

    assert run_prerender_pipeline(slug="retry-story", reason="article_updated") is True
    assert attempts["render"] == 2
    assert attempts["upload"] == 1


def test_run_prerender_pipeline_does_not_retry_non_retryable_errors(monkeypatch, settings):
    temp_root = _workspace_temp_dir(settings)
    settings.FRONTEND_PRERENDER_OUTPUT_DIR = str(temp_root / "__prerender")
    settings.FRONTEND_PRERENDER_LOCK_DIR = str(temp_root / "__locks")
    attempts = {"render": 0}

    def fake_render(slug):
        attempts["render"] += 1
        raise NonRetryablePrerenderError("frontend returned 404")

    monkeypatch.setattr("newsapp.frontend_prerender._render_once", fake_render)

    with pytest.raises(NonRetryablePrerenderError):
        run_prerender_pipeline(slug="missing-story", reason="article_updated")

    assert attempts["render"] == 1


@override_settings(
    FRONTEND_PRERENDER_READY_SELECTOR='meta[name="prerender-status-code"][content]',
    FRONTEND_PRERENDER_SUCCESS_STATUS="200",
    FRONTEND_PRERENDER_SETTLE_MS=0,
)
def test_read_prerender_status_from_meta_selector():
    class FakeLocator:
        def __init__(self, content):
            self._content = content
            self.first = self

        def get_attribute(self, name):
            assert name == "content"
            return self._content

    class FakePage:
        def wait_for_selector(self, selector, timeout, state):
            assert selector == 'meta[name="prerender-status-code"][content]'
            assert state == "attached"

        def wait_for_timeout(self, timeout):
            assert timeout >= 0

        def locator(self, selector):
            return FakeLocator("200")

    assert _read_prerender_status(FakePage()) == "200"


@override_settings(
    FRONTEND_PRERENDER_READY_SELECTOR="article",
    FRONTEND_PRERENDER_SUCCESS_STATUS="200",
    FRONTEND_PRERENDER_SETTLE_MS=0,
)
def test_read_prerender_status_from_generic_selector():
    class FakeLocator:
        def __init__(self):
            self.first = self

        def count(self):
            return 1

    class FakePage:
        def wait_for_selector(self, selector, timeout, state):
            assert selector == "article"
            assert state == "attached"

        def wait_for_timeout(self, timeout):
            assert timeout >= 0

        def locator(self, selector):
            return FakeLocator()

    assert _read_prerender_status(FakePage()) == "200"
