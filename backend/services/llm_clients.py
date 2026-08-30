"""
LLM Clients — TokenRouter factory, centralized retry, circuit breaker, model router.

Architecture:
  - get_tokenrouter_llm()      — ChatOpenAI factory with TokenRouter base URL
  - CircuitBreaker             — minimal in-process breaker (fail_max / reset_timeout)
  - ModelRouter               — primary → cascade fallback across models per role
  - call_with_retry()         — tenacity retry wrapper for any LLM call

All LLM calls in agentic_rag_service.py go through here.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import TYPE_CHECKING, Any, Callable, Iterator, Optional

import tenacity
from langchain_openai import ChatOpenAI

from settings import settings

if TYPE_CHECKING:
    from tenacity import RetryCallState

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# 1. TokenRouter ChatOpenAI factory
# ──────────────────────────────────────────────

def get_tokenrouter_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """
    Return a ChatOpenAI client routed through TokenRouter.

    Uses max_retries=0 so the central retry wrapper controls all backoff.
    """
    return ChatOpenAI(
        model=model,
        api_key=settings.TOKENROUTER_API_KEY.get_secret_value() if settings.TOKENROUTER_API_KEY else "",
        base_url=settings.TOKENROUTER_BASE_URL,
        timeout=timeout or settings.AI_CONTENT_TIMEOUT_SECONDS,
        max_retries=0,
        temperature=temperature,
    )


def get_bai_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """
    Return a ChatOpenAI client routed through B.AI (OpenAI-compatible).
    Used as the health-checked fallback provider when TokenRouter is down.
    """
    return ChatOpenAI(
        model=model,
        api_key=settings.BAI_API_KEY.get_secret_value() if settings.BAI_API_KEY else "",
        base_url=settings.BAI_BASE_URL,
        timeout=timeout or settings.AI_CONTENT_TIMEOUT_SECONDS,
        max_retries=0,
        temperature=temperature,
    )


# ──────────────────────────────────────────────
# 2. Circuit Breaker
# ──────────────────────────────────────────────

class CircuitOpenError(RuntimeError):
    """Raised when the circuit is open and no calls should be attempted."""


class CircuitBreaker:
    """
    Minimal in-process circuit breaker.

    States:
      CLOSED  — normal operation, requests pass through
      OPEN    — too many recent failures, requests raise CircuitOpenError immediately
      HALF    — after reset_timeout, one test request is allowed through

    Thread-unsafe (single async event loop) — acceptable for FastAPI / uvicorn workers.
    """

    def __init__(
        self,
        name: str,
        fail_max: int = 5,
        reset_timeout: float = 60.0,
    ) -> None:
        self.name = name
        self.fail_max = fail_max
        self.reset_timeout = reset_timeout
        self._failures = 0
        self._opened_at: float = 0.0
        self._state: str = "closed"

    @property
    def state(self) -> str:
        if self._state == "open":
            if time.monotonic() - self._opened_at >= self.reset_timeout:
                self._state = "half"
                logger.info(f"[CircuitBreaker] {self.name} → HALF (reset window elapsed)")
                return "half"
            return "open"
        return self._state

    def _record_success(self) -> None:
        self._failures = 0
        if self._state == "half":
            self._state = "closed"
            logger.info(f"[CircuitBreaker] {self.name} → CLOSED (test succeeded)")

    def _record_failure(self) -> None:
        self._failures += 1
        if self._failures >= self.fail_max and self._state != "open":
            self._state = "open"
            self._opened_at = time.monotonic()
            logger.warning(
                f"[CircuitBreaker] {self.name} → OPEN "
                f"(failures={self._failures}, reset in {self.reset_timeout}s)"
            )

    def call(self, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Synchronous wrapper — call(fn) and record outcome."""
        if self.state == "open":
            raise CircuitOpenError(f"CircuitBreaker '{self.name}' is open")
        try:
            result = fn(*args, **kwargs)
            self._record_success()
            return result
        except Exception as exc:
            self._record_failure()
            raise exc

    async def acall(self, fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Async wrapper — await fn(*args, **kwargs) and record outcome."""
        if self.state == "open":
            raise CircuitOpenError(f"CircuitBreaker '{self.name}' is open")
        try:
            result = await fn(*args, **kwargs)
            self._record_success()
            return result
        except Exception as exc:
            self._record_failure()
            raise exc


# ──────────────────────────────────────────────
# 3. Centralized retry wrapper (replaces inline _call_llm_with_retry)
# ──────────────────────────────────────────────

def _is_retryable(exc: Exception) -> bool:
    """Return True if the exception warrants a retry."""
    msg = str(exc).lower()
    return any(
        kw in msg
        for kw in ("429", "resource_exhausted", "quota", "rate", "503", "502", "504", "timeout")
    )


def _on_retry(state: RetryCallState) -> None:
    attempt = state.attempt_number
    wait = state.next_action.sleep if state.next_action else 0
    logger.warning(
        f"[LLMRetry] attempt {attempt} failed, retrying in ~{wait:.1f}s..."
    )


_retry = tenacity.retry(
    retry=tenacity.retry_if_exception(_is_retryable),
    wait=tenacity.wait_exponential(multiplier=1, min=2, max=30),
    stop=tenacity.stop_after_attempt(3),
    reraise=True,
    after=_on_retry,
)


def call_with_retry(fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    """
    Call fn synchronously with tenacity retry.
    Use acall_with_retry for async fns.
    """
    return _retry(fn)(*args, **kwargs)


async def acall_with_retry(fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    """
    Await fn with tenacity retry.
    tenacity >= 8.2 supports async natively.
    """
    async_retry = tenacity.AsyncRetrying(
        retry=tenacity.retry_if_exception(_is_retryable),
        wait=tenacity.wait_exponential(multiplier=1, min=2, max=30),
        stop=tenacity.stop_after_attempt(3),
        reraise=True,
        after=_on_retry,
    )
    async for attempt in async_retry:
        with attempt:
            return await fn(*args, **kwargs)


# ──────────────────────────────────────────────
# 4. Model Router — primary → fallback cascade
# ──────────────────────────────────────────────

class ModelRouter:
    """
    Routes LLM calls to a primary model with automatic fallback cascade.

    Usage:
        router = ModelRouter(role="generator")
        llm = router.get_llm()           # primary (or first available)
        # or iterate:
        for llm, model_name in router.llm_cascade():
            try:
                return await call_with_retry(llm.ainvoke, inputs)
            except Exception as exc:
                logger.warning(f"[ModelRouter] {model_name} failed: {exc}, trying next...")
                continue

    Attributes:
        role: "planner" | "generator" | "validator"
    """

    def __init__(
        self,
        role: str,
        primary_model: Optional[str] = None,
        fallback_models: Optional[list[str]] = None,
    ) -> None:
        self.role = role
        self.primary_model = primary_model or self._default_for_role(role)
        self.fallback_models = fallback_models or self._parse_fallbacks()
        self._breaker = CircuitBreaker(
            name=f"llm.{role}.{self.primary_model}",
            fail_max=settings.LLM_CIRCUIT_BREAKER_FAIL_MAX,
            reset_timeout=float(settings.LLM_CIRCUIT_BREAKER_RESET_SECONDS),
        )

    # ── Helpers ────────────────────────────────

    @staticmethod
    def _default_for_role(role: str) -> str:
        return {
            "planner": settings.MODEL_PLANNER,
            "generator": settings.MODEL_GENERATOR,
            "validator": settings.MODEL_VALIDATOR,
        }.get(role, settings.MODEL_PLANNER)

    def _parse_fallbacks(self) -> list[str]:
        raw = settings.MODEL_FALLBACKS or ""
        return [m.strip() for m in raw.split(",") if m.strip()]

    # ── Public API ──────────────────────────────

    def get_llm(self) -> ChatOpenAI:
        """Return the primary LLM. Use llm_cascade() when you want automatic fallback."""
        return get_tokenrouter_llm(self.primary_model)

    def _cascade_entries(self) -> Iterator[tuple[str, ChatOpenAI, str]]:
        """
        Yield (provider, llm, model_name) in cascade order, skipping providers
        the health registry marked unhealthy inside the recheck window:
          1. TokenRouter primary model
          2. TokenRouter fallback models (deduped)
          3. B.AI generation model (when BAI_API_KEY is configured)
        """
        from services import llm_health

        seen: set[str] = {self.primary_model}
        entries: list[tuple[str, ChatOpenAI, str]] = [
            ("tokenrouter", get_tokenrouter_llm(self.primary_model), self.primary_model)
        ]
        for model in self.fallback_models:
            if model not in seen:
                seen.add(model)
                entries.append(("tokenrouter", get_tokenrouter_llm(model), model))
        if settings.BAI_API_KEY:
            bai_model = settings.BAI_GENERATION_MODEL
            if bai_model not in seen:
                entries.append(
                    ("bai", get_bai_llm(bai_model), f"bai/{bai_model}")
                )

        for provider, llm, model_name in entries:
            if not llm_health.is_cascade_ready(provider):
                logger.warning(
                    f"[ModelRouter/{self.role}] skipping provider={provider} "
                    "(unhealthy inside recheck window)"
                )
                continue
            yield provider, llm, model_name

    def llm_cascade(self) -> Iterator[tuple[ChatOpenAI, str]]:
        """
        Yield (llm, model_name) in health-aware cascade order.
        See _cascade_entries() for the ordering and skipping rules.
        """
        for _provider, llm, model_name in self._cascade_entries():
            yield llm, model_name

    def circuit_breaker(self) -> CircuitBreaker:
        return self._breaker

    async def call_with_fallback(
        self,
        fn: Callable[..., Any],
        *args: Any,
        **kwargs: Any,
    ) -> tuple[Any, str]:
        """
        Call fn(llm, *args, **kwargs) with automatic cascade.

        Returns (result, model_name) of the first successful call.
        Raises last exception if all models in the cascade fail.
        Outcomes are recorded into the LLM health registry so later calls
        skip dead providers without waiting for their timeout.
        """
        from services import llm_health

        for llm, model_name in self.llm_cascade():
            provider = "bai" if model_name.startswith("bai/") else "tokenrouter"
            started = time.monotonic()
            try:
                result = await acall_with_retry(fn, llm, *args, **kwargs)
                llm_health.record(provider, True, (time.monotonic() - started) * 1000)
                return result, model_name
            except Exception as exc:  # noqa: PERF203
                llm_health.record(provider, False)
                logger.warning(
                    f"[ModelRouter/{self.role}] model={model_name} failed "
                    f"after retries: {exc!r}. Trying next..."
                )
                continue
        # All exhausted
        raise RuntimeError(
            f"[ModelRouter/{self.role}] All models exhausted — "
            f"primary={self.primary_model}, fallbacks={self.fallback_models}"
        )
