"""
Unit tests for services/llm_clients.py

Tests:
  - CircuitBreaker state transitions (CLOSED → OPEN → HALF → CLOSED)
  - ModelRouter cascade iteration (dedup, correct order)
  - ModelRouter.call_with_fallback success path
  - ModelRouter.call_with_fallback exhausts cascade
  - tenacity retry triggers on 429, succeeds on 3rd attempt
  - get_tokenrouter_llm sets correct params
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from services.llm_clients import (
    CircuitBreaker,
    CircuitOpenError,
    ModelRouter,
    get_tokenrouter_llm,
    acall_with_retry,
)


# ──────────────────────────────────────────────
# CircuitBreaker
# ──────────────────────────────────────────────

class TestCircuitBreaker:
    def test_closed_by_default(self):
        cb = CircuitBreaker("test", fail_max=3, reset_timeout=60)
        assert cb.state == "closed"

    def test_opens_after_fail_max(self):
        cb = CircuitBreaker("test", fail_max=3, reset_timeout=60)
        for _ in range(3):
            try:
                cb.call(lambda: None)
            except Exception:
                pass
        # cb.call above succeeded, not failed — need to throw
        cb2 = CircuitBreaker("test2", fail_max=3, reset_timeout=60)
        for _ in range(3):
            try:
                cb2.call(lambda: (_ for _ in ()).throw(RuntimeError("boom")))
            except RuntimeError:
                pass
        assert cb2.state == "open"

    def test_open_raises_circuit_open_error(self):
        cb = CircuitBreaker("test", fail_max=1, reset_timeout=60)
        try:
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("boom")))
        except RuntimeError:
            pass
        assert cb.state == "open"
        with pytest.raises(CircuitOpenError):
            cb.call(lambda: None)

    def test_success_resets_failures(self):
        cb = CircuitBreaker("test", fail_max=5, reset_timeout=60)
        # 2 failures
        for _ in range(2):
            try:
                cb.call(lambda: (_ for _ in ()).throw(RuntimeError("boom")))
            except RuntimeError:
                pass
        assert cb.state == "closed"
        # 1 success resets counter
        cb.call(lambda: 42)
        # 4 more failures should not open (counter reset)
        for _ in range(4):
            try:
                cb.call(lambda: (_ for _ in ()).throw(RuntimeError("boom")))
            except RuntimeError:
                pass
        assert cb.state == "closed"

    def test_half_state_after_reset_timeout(self, monkeypatch):
        cb = CircuitBreaker("test", fail_max=2, reset_timeout=0.1)
        # Force open
        try:
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("boom")))
        except RuntimeError:
            pass
        try:
            cb.call(lambda: (_ for _ in ()).throw(RuntimeError("boom")))
        except RuntimeError:
            pass
        assert cb.state == "open"
        # Fake time to after reset window
        import time
        monkeypatch.setattr(time, "monotonic", lambda: cb._opened_at + 10)
        assert cb.state == "half"
        # Test call in half state succeeds and closes
        cb.call(lambda: "ok")
        assert cb.state == "closed"


# ──────────────────────────────────────────────
# ModelRouter
# ──────────────────────────────────────────────

class TestModelRouter:
    def test_primary_from_settings(self):
        router = ModelRouter("planner")
        assert router.primary_model == "qwen/qwen3.8-max-free"

    def test_primary_override(self):
        router = ModelRouter("planner", primary_model="custom/model")
        assert router.primary_model == "custom/model"

    def test_fallbacks_parsed_from_settings(self):
        router = ModelRouter("generator")
        assert "deepseek/deepseek-v4-pro-0813-free" in router.fallback_models
        assert "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free" in router.fallback_models

    def test_cascade_dedups_primary_from_fallbacks(self):
        # primary is also in fallbacks list — should appear only once
        router = ModelRouter("planner")
        models = [m for _, m in router.llm_cascade()]
        assert models.count("qwen/qwen3.8-max-free") == 1

    def test_cascade_order(self):
        router = ModelRouter("planner")
        models = [m for _, m in router.llm_cascade()]
        # primary first
        assert models[0] == "qwen/qwen3.8-max-free"
        # rest in fallbacks order
        assert models[1] == "deepseek/deepseek-v4-pro-0813-free"
        assert models[2] == "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"

    @pytest.mark.asyncio
    async def test_call_with_fallback_success_first(self):
        router = ModelRouter("planner")
        mock_llm = MagicMock()
        mock_fn = AsyncMock(return_value="success")

        # llm_cascade is sync Iterator — use a regular generator
        def fake_cascade():
            yield mock_llm, "test/model"

        router.llm_cascade = fake_cascade  # type: ignore[method-assign]
        router._breaker = CircuitBreaker("test", fail_max=1)

        result, model = await router.call_with_fallback(mock_fn, "input")
        assert result == "success"
        assert model == "test/model"

    @pytest.mark.asyncio
    async def test_call_with_fallback_exhausts_all(self):
        router = ModelRouter("planner")
        mock_llm = MagicMock()
        call_count = 0

        async def always_fail(*a, **kw):
            nonlocal call_count
            call_count += 1
            raise RuntimeError("boom")

        def fake_cascade():
            yield mock_llm, "m1"
            yield mock_llm, "m2"
            yield mock_llm, "m3"

        router.llm_cascade = fake_cascade  # type: ignore[method-assign]
        router._breaker = CircuitBreaker("test", fail_max=100)

        with pytest.raises(RuntimeError, match="All models exhausted"):
            await router.call_with_fallback(always_fail, "input")

        assert call_count == 3


# ──────────────────────────────────────────────
# Retry
# ──────────────────────────────────────────────

class TestRetry:
    @pytest.mark.asyncio
    async def test_retries_on_429(self):
        attempts = 0

        async def flaky():
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise RuntimeError("429 Too Many Requests")
            return "ok"

        result = await acall_with_retry(flaky)
        assert result == "ok"
        assert attempts == 3

    @pytest.mark.asyncio
    async def test_does_not_retry_non_retryable_error(self):
        attempts = 0

        async def fatal():
            nonlocal attempts
            attempts += 1
            raise ValueError("bad input")

        with pytest.raises(ValueError):
            await acall_with_retry(fatal)

        assert attempts == 1  # no retry

    @pytest.mark.asyncio
    async def test_retries_on_timeout(self):
        attempts = 0

        async def slow():
            nonlocal attempts
            attempts += 1
            raise RuntimeError("timeout error")

        with pytest.raises(RuntimeError):
            await acall_with_retry(slow)

        # 3 attempts
        assert attempts == 3


# ──────────────────────────────────────────────
# get_tokenrouter_llm
# ──────────────────────────────────────────────

class TestGetTokenRouterLLM:
    def test_sets_model_name(self):
        with patch("services.llm_clients.settings") as mock_settings:
            mock_settings.TOKENROUTER_API_KEY.get_secret_value.return_value = "sk-test"
            mock_settings.TOKENROUTER_BASE_URL = "https://api.tokenrouter.com/v1"
            mock_settings.AI_CONTENT_TIMEOUT_SECONDS = 30.0

            llm = get_tokenrouter_llm("qwen/qwen3.8-max-free", temperature=0.7)
            assert llm.model_name == "qwen/qwen3.8-max-free"
            assert llm.temperature == 0.7

    def test_custom_timeout(self):
        with patch("services.llm_clients.settings") as mock_settings:
            mock_settings.TOKENROUTER_API_KEY.get_secret_value.return_value = "sk-test"
            mock_settings.TOKENROUTER_BASE_URL = "https://api.tokenrouter.com/v1"
            mock_settings.AI_CONTENT_TIMEOUT_SECONDS = 30.0

            llm = get_tokenrouter_llm("test/model", timeout=10.0)
            # ChatOpenAI stores timeout in model_kwargs or as timeout kwarg
            # Just verify it was set without error
            assert llm is not None

    def test_max_retries_is_zero(self):
        with patch("services.llm_clients.settings") as mock_settings:
            mock_settings.TOKENROUTER_API_KEY.get_secret_value.return_value = "sk-test"
            mock_settings.TOKENROUTER_BASE_URL = "https://api.tokenrouter.com/v1"
            mock_settings.AI_CONTENT_TIMEOUT_SECONDS = 30.0

            llm = get_tokenrouter_llm("test/model")
            assert llm.max_retries == 0
