"""Tests for the authenticated Telegram debug-sync gateway."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from api.telegram import (
    TELEGRAM_CHUNK_CONTENT_LENGTH,
    TELEGRAM_MAX_MESSAGE_LENGTH,
    TELEGRAM_MAX_REPORT_LENGTH,
    router,
    split_telegram_report,
)
from core.security import get_current_teacher, get_current_user
from settings import settings


@pytest.fixture
def app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(router, prefix="/api/v1")
    test_app.dependency_overrides[get_current_teacher] = lambda: SimpleNamespace(id="user-1")
    return test_app


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


def test_sync_requires_authentication() -> None:
    test_app = FastAPI()
    test_app.include_router(router, prefix="/api/v1")

    response = TestClient(test_app).post(
        "/api/v1/telegram/sync",
        json={"text": "report"},
    )

    assert response.status_code == 401


def test_sync_requires_teacher_access() -> None:
    test_app = FastAPI()
    test_app.include_router(router, prefix="/api/v1")
    test_app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id="learner-1",
        is_superuser=False,
        role="learner",
        roles=[],
    )

    response = TestClient(test_app).post(
        "/api/v1/telegram/sync",
        json={"text": "report"},
    )

    assert response.status_code == 403


def test_sync_returns_service_unavailable_when_not_configured(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", None)
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", None)

    response = client.post(
        "/api/v1/telegram/sync",
        json={"text": "report"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Telegram sync is not configured"


def test_sync_forwards_text_to_telegram(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", SecretStr("test-bot-token"))
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "-100123")

    response_from_telegram = httpx.Response(
        200,
        json={"ok": True, "result": {"message_id": 1}},
        request=httpx.Request("POST", "https://api.telegram.org/bot/sendMessage"),
    )
    upstream = AsyncMock()
    upstream.post.return_value = response_from_telegram
    client_context = AsyncMock()
    client_context.__aenter__.return_value = upstream

    with patch("api.telegram.httpx.AsyncClient", return_value=client_context):
        response = client.post(
            "/api/v1/telegram/sync",
            json={"text": "AR report"},
        )

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    upstream.post.assert_awaited_once_with(
        "https://api.telegram.org/bottest-bot-token/sendMessage",
        json={"chat_id": "-100123", "text": "AR report"},
    )


def test_split_telegram_report_preserves_all_content() -> None:
    report = "first-line\n" + ("x" * TELEGRAM_CHUNK_CONTENT_LENGTH) + "\nlast-line"

    chunks = split_telegram_report(report)

    assert "".join(chunks) == report
    assert all(len(chunk) <= TELEGRAM_CHUNK_CONTENT_LENGTH for chunk in chunks)


def test_sync_sends_long_reports_as_ordered_messages(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", SecretStr("test-bot-token"))
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "-100123")

    report = "first-line\n" + ("x" * 8500) + "\nlast-line"
    response_from_telegram = httpx.Response(
        200,
        json={"ok": True, "result": {"message_id": 1}},
        request=httpx.Request("POST", "https://api.telegram.org/bot/sendMessage"),
    )
    upstream = AsyncMock()
    upstream.post.return_value = response_from_telegram
    client_context = AsyncMock()
    client_context.__aenter__.return_value = upstream

    with patch("api.telegram.httpx.AsyncClient", return_value=client_context):
        response = client.post(
            "/api/v1/telegram/sync",
            json={"text": report},
        )

    assert response.status_code == 200
    messages = [call.kwargs["json"]["text"] for call in upstream.post.await_args_list]
    assert len(messages) > 1
    assert all(len(message) <= TELEGRAM_MAX_MESSAGE_LENGTH for message in messages)

    content = []
    for index, message in enumerate(messages, start=1):
        prefix = f"[AR Sync {index}/{len(messages)}]\n"
        assert message.startswith(prefix)
        content.append(message.removeprefix(prefix))
    assert "".join(content) == report


def test_sync_maps_telegram_rejection_to_bad_gateway(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", SecretStr("test-bot-token"))
    monkeypatch.setattr(settings, "TELEGRAM_CHAT_ID", "-100123")

    response_from_telegram = httpx.Response(
        200,
        json={"ok": False, "description": "invalid chat"},
        request=httpx.Request("POST", "https://api.telegram.org/bot/sendMessage"),
    )
    upstream = AsyncMock()
    upstream.post.return_value = response_from_telegram
    client_context = AsyncMock()
    client_context.__aenter__.return_value = upstream

    with patch("api.telegram.httpx.AsyncClient", return_value=client_context):
        response = client.post(
            "/api/v1/telegram/sync",
            json={"text": "AR report"},
        )

    assert response.status_code == 502
    assert response.json()["detail"] == "Telegram rejected the message"


def test_sync_rejects_reports_over_request_limit(client: TestClient) -> None:
    response = client.post(
        "/api/v1/telegram/sync",
        json={"text": "x" * (TELEGRAM_MAX_REPORT_LENGTH + 1)},
    )

    assert response.status_code == 422
