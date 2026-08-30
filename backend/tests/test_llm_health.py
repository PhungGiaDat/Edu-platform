"""Tests for LLM provider health registry (B.AI + TokenRouter cascade readiness)."""
import httpx
import pytest
from pydantic import SecretStr

from settings import settings
from services import llm_health


@pytest.fixture(autouse=True)
def _clean_registry():
    llm_health._registry.clear()
    yield
    llm_health._registry.clear()


def _transport_factory(handler):
    def factory():
        return httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return factory


@pytest.mark.asyncio
async def test_ping_provider_healthy_on_200():
    ok, ms = await llm_health.ping_provider(
        "https://x.example/v1",
        "k",
        client_factory=_transport_factory(
            lambda req: httpx.Response(200, json={"data": [{"id": "m"}]})
        ),
    )
    assert ok is True and ms >= 0


@pytest.mark.asyncio
async def test_ping_provider_unhealthy_on_401():
    ok, _ms = await llm_health.ping_provider(
        "https://x.example/v1",
        "bad",
        client_factory=_transport_factory(lambda req: httpx.Response(401, json={})),
    )
    assert ok is False


@pytest.mark.asyncio
async def test_ping_provider_unreachable_is_unhealthy():
    def boom():
        raise RuntimeError("no network")

    ok, _ms = await llm_health.ping_provider(
        "https://x.example/v1", "k", client_factory=boom
    )
    assert ok is False


@pytest.mark.asyncio
async def test_probe_all_records_registry(monkeypatch):
    providers = [
        {"name": "tokenrouter", "base_url": "https://a/v1", "api_key": "k1", "default_model": "m1"},
        {"name": "bai", "base_url": "https://b/v1", "api_key": "k2", "default_model": "m2"},
    ]

    async def fake_ping(base_url, api_key, timeout=None):
        return base_url.startswith("https://a"), 12.0

    monkeypatch.setattr(llm_health, "configured_providers", lambda: providers)
    monkeypatch.setattr(llm_health, "ping_provider", fake_ping)

    snap = await llm_health.probe_all()

    assert {s["provider"]: s["status"] for s in snap} == {
        "tokenrouter": "healthy",
        "bai": "unhealthy",
    }
    assert llm_health.get_status("tokenrouter") == "healthy"
    assert llm_health.get_status("bai") == "unhealthy"


def test_configured_providers_respects_keys(monkeypatch):
    monkeypatch.setattr(settings, "TOKENROUTER_API_KEY", SecretStr("k1"))
    monkeypatch.setattr(settings, "BAI_API_KEY", None)
    assert [p["name"] for p in llm_health.configured_providers()] == ["tokenrouter"]

    monkeypatch.setattr(settings, "BAI_API_KEY", SecretStr("k2"))
    assert [p["name"] for p in llm_health.configured_providers()] == [
        "tokenrouter",
        "bai",
    ]


def test_snapshot_masks_api_key(monkeypatch):
    monkeypatch.setattr(settings, "TOKENROUTER_API_KEY", SecretStr("supersecretkey"))
    snap = llm_health.snapshot()
    entry = next(s for s in snap if s["provider"] == "tokenrouter")
    assert entry["key_hint"].startswith("***")
    assert "supersecretkey" not in entry["key_hint"]


def test_is_cascade_ready_unknown_and_cooldown():
    # unknown provider → ready (let the actual call decide)
    assert llm_health.is_cascade_ready("tokenrouter") is True

    # fresh failure → NOT ready (skip fast, protect UX)
    llm_health.record("tokenrouter", False, latency_ms=10)
    assert llm_health.is_cascade_ready("tokenrouter") is False

    # stale failure past recheck cooldown → ready again
    llm_health._registry["tokenrouter"].last_checked -= (
        settings.LLM_HEALTH_RECHECK_SECONDS + 1
    )
    assert llm_health.is_cascade_ready("tokenrouter") is True


def test_record_success_marks_healthy():
    llm_health.record("bai", True, latency_ms=123)
    assert llm_health.get_status("bai") == "healthy"
    assert llm_health._registry["bai"].latency_ms == 123
