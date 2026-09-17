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
from services.rag_trace_context import TRACE_HANDLER

if TYPE_CHECKING:
    from tenacity import RetryCallState

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# 1. TokenRouter ChatOpenAI factory
# ──────────────────────────────────────────────


def _has_configured_key(key: Any) -> bool:
    """
    True only when a SecretStr key exists AND is non-blank.

    A SecretStr("") is still truthy as an object, so a bare `if key:`
    passes for blank env values — and constructing a ChatOpenAI with a
    blank key raises OpenAIError("Missing credentials") at build time.
    """
    if key is None:
        return False
    try:
        return bool(key.get_secret_value().strip())
    except AttributeError:
        return bool(key)


def get_openrouter_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """Return a ChatOpenAI client routed through OpenRouter."""
    api_key = (
        settings.OPENROUTER_API_KEY.get_secret_value()
        if settings.OPENROUTER_API_KEY
        else ""
    )
    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=settings.OPENROUTER_BASE_URL,
        timeout=timeout or settings.AI_CONTENT_TIMEOUT_SECONDS,
        max_retries=0,
        temperature=temperature,
        callbacks=[TRACE_HANDLER],
        default_headers={
            "HTTP-Referer": "https://eduplatform.app",
            "X-Title": "EduPlatform Lexi Chatbot",
        },
    )


def get_tokenrouter_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """
    Fallback TokenRouter client if configured, otherwise routes to OpenRouter.
    """
    if not _has_configured_key(settings.TOKENROUTER_API_KEY):
        return get_openrouter_llm(model, temperature, timeout)
    return ChatOpenAI(
        model=model,
        api_key=settings.TOKENROUTER_API_KEY.get_secret_value(),
        base_url=settings.TOKENROUTER_BASE_URL,
        timeout=timeout or settings.AI_CONTENT_TIMEOUT_SECONDS,
        max_retries=0,
        temperature=temperature,
        callbacks=[TRACE_HANDLER],
    )


def get_bai_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """
    B.AI deprecated/disabled — routed safely to OpenRouter.
    """
    return get_openrouter_llm(settings.CHAT_PRIMARY_MODEL, temperature, timeout)


def get_justwoker_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """Return a ChatOpenAI client routed through the Justwoker gateway."""
    api_key = (
        settings.JUSTWOKER_API_KEY.get_secret_value()
        if settings.JUSTWOKER_API_KEY
        else ""
    )
    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=settings.JUSTWOKER_BASE_URL,
        timeout=timeout or settings.AI_CONTENT_TIMEOUT_SECONDS,
        max_retries=0,
        temperature=temperature,
        callbacks=[TRACE_HANDLER],
    )


def get_google_llm(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """
    Return a ChatOpenAI client routed through Google's Gemini
    OpenAI-compatible endpoint (free tier, reuses GOOGLE_API_KEY).
    """
    return ChatOpenAI(
        model=model,
        api_key=settings.GOOGLE_API_KEY or "",
        base_url=settings.GOOGLE_LLM_BASE_URL,
        timeout=timeout or settings.AI_CONTENT_TIMEOUT_SECONDS,
        max_retries=0,
        temperature=temperature,
        callbacks=[TRACE_HANDLER],
    )


# ──────────────────────────────────────────────
# 1b. Provider-prefixed model routing
# ──────────────────────────────────────────────

_PROVIDER_PREFIXES = ("openrouter/", "google/", "bai/", "justwoker/")


def parse_provider_model(model: str) -> tuple[str, str]:
    """
    Split a possibly provider-prefixed model id into (provider, bare_model).
    """
    if model.startswith("openrouter/"):
        return "openrouter", model[len("openrouter/"):]
    if model.startswith("google/gemini"):
        return "google", model[len("google/"):]
    if model.startswith("justwoker/"):
        return "justwoker", model[len("justwoker/"):]
    # Default to openrouter for gemma, nemotron, and other models
    return "openrouter", model


def build_llm_for_model(
    model: str,
    temperature: float = 0.4,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """Factory dispatch for provider-prefixed model ids."""
    provider, bare = parse_provider_model(model)
    if provider == "google" and _has_configured_key(settings.GOOGLE_API_KEY):
        return get_google_llm(bare, temperature, timeout)
    if provider == "justwoker" and _has_configured_key(settings.JUSTWOKER_API_KEY):
        return get_justwoker_llm(bare, temperature, timeout)
    return get_openrouter_llm(model, temperature, timeout)


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
                logger.info(
                    f"[CircuitBreaker] {self.name} → HALF (reset window elapsed)"
                )
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
    # Permanent failures: retrying the same model is pointless — fail over now.
    permanent_markers = (
        "model_not_found",
        "no available channel",
        "error code: 401",
        "error code: 403",
        "insufficient balance",
        "insufficient_user_quota",
        "balance=0",
    )
    if any(marker in msg for marker in permanent_markers):
        return False
    return any(
        kw in msg
        for kw in (
            "429",
            "resource_exhausted",
            "quota",
            "rate",
            "503",
            "502",
            "504",
            "timeout",
        )
    )


def _on_retry(state: RetryCallState) -> None:
    attempt = state.attempt_number
    wait = state.next_action.sleep if state.next_action else 0
    logger.warning(f"[LLMRetry] attempt {attempt} failed, retrying in ~{wait:.1f}s...")


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
        """Return the primary LLM (provider-routed by model prefix).
        Use llm_cascade() when you want automatic fallback."""
        return build_llm_for_model(self.primary_model)

    def _cascade_entries(self) -> Iterator[tuple[str, ChatOpenAI, str]]:
        """
        Yield (provider, llm, model_name) ordered for sticky fast failover:
          1. The preferred provider (last one that succeeded) if ready
          2. Other ready providers (configured order)
          3. Unhealthy providers LAST — still yielded as a last resort, so a
             total "All models exhausted" outage cannot happen while any
             provider is configured.
        Models are provider-routed by prefix ("google/…", "bai/…", bare =
        tokenrouter). Entries whose provider has no configured API key are
        omitted entirely: constructing a ChatOpenAI with an empty key raises
        OpenAIError ("Missing credentials") before any network call, which
        used to kill the whole cascade (503) even when another provider was
        healthy.
        """
        from services import llm_health

        provider_keys = {
            "openrouter": settings.OPENROUTER_API_KEY,
            "google": settings.GOOGLE_API_KEY,
            "justwoker": settings.JUSTWOKER_API_KEY,
            "bai": None,
            "tokenrouter": None,
        }
        entries: list[tuple[str, ChatOpenAI, str]] = []
        seen: set[str] = set()

        def add(model: str) -> None:
            provider, _bare = parse_provider_model(model)
            if not _has_configured_key(provider_keys.get(provider)) or model in seen:
                return
            seen.add(model)
            entries.append((provider, build_llm_for_model(model), model))

        add(self.primary_model)
        for model in self.fallback_models:
            add(model)
        add(settings.CHAT_PRIMARY_MODEL)
        add(settings.CHAT_FALLBACK_MODEL)

        preferred = llm_health.preferred_provider()

        def _rank(entry: tuple[str, ChatOpenAI, str]) -> tuple[int, int]:
            provider, _llm, _name = entry
            if provider == preferred:
                return (0, 0)
            if llm_health.is_cascade_ready(provider):
                return (1, 0)
            return (2, 0)  # last resort — still tried, just ordered last

        for provider, llm, model_name in sorted(entries, key=_rank):
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
            provider = parse_provider_model(model_name)[0]
            started = time.monotonic()
            try:
                result = await acall_with_retry(fn, llm, *args, **kwargs)
                llm_health.record(provider, True, (time.monotonic() - started) * 1000)
                return result, model_name
            except Exception as exc:  # noqa: PERF203
                llm_health.record(provider, False, kind=llm_health.classify_error(exc))
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
