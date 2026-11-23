"""Tests for LLM provider health registry — sticky preferred provider + error kinds."""
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


# ── classify_error ────────────────────────────────────────────────────────

def test_classify_error_permanent_model_not_found():
    exc = RuntimeError(
        "Error code: 503 - {'error': {'code': 'model_not_found', "
        "'message': 'No available channel for model qwen/... under group default'}}"
    )
    assert llm_health.classify_error(exc) == "permanent"


def test_classify_error_permanent_auth():
    assert llm_health.classify_error(RuntimeError("Error code: 401 - invalid key")) == "permanent"
    assert llm_health.classify_error(RuntimeError("Error code: 403 - forbidden")) == "permanent"


def test_classify_error_transient_timeout_and_5xx():
    assert llm_health.classify_error(RuntimeError("Request timed out.")) == "transient"
    assert llm_health.classify_error(RuntimeError("Error code: 503 - upstream busy")) == "transient"
    assert llm_health.classify_error(RuntimeError("429 rate limited")) == "transient"


# ── record: transient needs 2 strikes, permanent is immediate ────────────

def test_record_transient_single_failure_stays_usable():
    llm_health.record("bai", False, kind="transient")
    assert llm_health.get_status("bai") == "healthy"  # one timeout ≠ dead
    assert llm_health._registry["bai"].consecutive_failures == 1


def test_record_transient_two_failures_marks_unhealthy():
    llm_health.record("bai", False, kind="transient")
    llm_health.record("bai", False, kind="transient")
    assert llm_health.get_status("bai") == "unhealthy"


def test_record_permanent_failure_marks_unhealthy_immediately():
    llm_health.record("tokenrouter", False, kind="permanent")
    assert llm_health.get_status("tokenrouter") == "unhealthy"


def test_record_success_resets_and_sets_preferred():
    llm_health.record("tokenrouter", True)
    assert llm_health.preferred_provider() == "tokenrouter"
    llm_health.record("bai", True)
    assert llm_health.preferred_provider() == "bai"
    assert llm_health._registry["tokenrouter"].preferred is False


def test_record_success_clears_failures():
    llm_health.record("bai", False, kind="transient")
    llm_health.record("bai", True)
    assert llm_health._registry["bai"].consecutive_failures == 0
    assert llm_health.get_status("bai") == "healthy"


# ── cascade readiness (ordering hint only — never a hard skip) ───────────

def test_is_cascade_ready_unhealthy_within_cooldown():
    llm_health.record("tokenrouter", False, kind="permanent")
    assert llm_health.is_cascade_ready("tokenrouter") is False


def test_is_cascade_ready_after_cooldown():
    llm_health.record("tokenrouter", False, kind="permanent")
    llm_health._registry["tokenrouter"].last_checked -= settings.LLM_HEALTH_RECHECK_SECONDS + 1
    assert llm_health.is_cascade_ready("tokenrouter") is True


# ── generation-aware ping ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ping_generation_200_is_healthy():
    ok, ms, kind = await llm_health.ping_provider_generation(
        "https://x.example/v1",
        "k",
        "test-model",
        client_factory=_transport_factory(
            lambda req: httpx.Response(200, json={"choices": [{"message": {"content": "pong"}}]})
        ),
    )
    assert ok is True and kind is None and ms >= 0


@pytest.mark.asyncio
async def test_ping_generation_model_not_found_is_permanent():
    def handler(req):
        return httpx.Response(
            503,
            json={"error": {"code": "model_not_found", "message": "No available channel"}},
        )

    ok, _ms, kind = await llm_health.ping_provider_generation(
        "https://x.example/v1", "k", "dead-model", client_factory=_transport_factory(handler)
    )
    assert ok is False and kind == "permanent"


@pytest.mark.asyncio
async def test_ping_generation_timeout_is_transient():
    def boom():
        raise httpx.ReadTimeout("timed out")

    ok, _ms, kind = await llm_health.ping_provider_generation(
        "https://x.example/v1", "k", "m", client_factory=boom
    )
    assert ok is False and kind == "transient"


@pytest.mark.asyncio
async def test_ping_generation_sends_model_and_max_tokens():
    seen = {}

    def handler(req):
        seen["body"] = req.read()
        return httpx.Response(200, json={"choices": []})

    await llm_health.ping_provider_generation(
        "https://x.example/v1", "k", "glm-5.3-flash", client_factory=_transport_factory(handler)
    )
    assert b'"max_tokens":1' in seen["body"].replace(b" ", b"")
    assert b"glm-5.3-flash" in seen["body"]


# ── probe_all uses generation ping + reports preferred ───────────────────

@pytest.mark.asyncio
async def test_probe_all_switches_preferred_to_healthy_provider(monkeypatch):
    providers = [
        {"name": "tokenrouter", "base_url": "https://a/v1", "api_key": "k1", "default_model": "dead-free"},
        {"name": "bai", "base_url": "https://b/v1", "api_key": "k2", "default_model": "glm-5.3-flash"},
    ]
    monkeypatch.setattr(llm_health, "configured_providers", lambda: providers)

    async def fake_ping(base_url, api_key, model, timeout=None):
        # tokenrouter: permanent model failure; bai: healthy
        if base_url.startswith("https://a"):
            return False, 10.0, "permanent"
        return True, 40.0, None

    monkeypatch.setattr(llm_health, "ping_provider_generation", fake_ping)

    snap = await llm_health.probe_all()
    by_name = {s["provider"]: s for s in snap}
    assert by_name["tokenrouter"]["status"] == "unhealthy"
    assert by_name["bai"]["status"] == "healthy"
    assert by_name["bai"]["preferred"] is True
    assert llm_health.preferred_provider() == "bai"


# ── snapshot shape ────────────────────────────────────────────────────────

def test_snapshot_masks_key_and_reports_preferred(monkeypatch):
    monkeypatch.setattr(settings, "TOKENROUTER_API_KEY", SecretStr("supersecretkey"))
    llm_health.record("tokenrouter", True)
    snap = llm_health.snapshot()
    entry = next(s for s in snap if s["provider"] == "tokenrouter")
    assert entry["key_hint"].startswith("***")
    assert "supersecretkey" not in entry["key_hint"]
    assert entry["preferred"] is True
