# backend/services/llm_health.py
"""
LLM provider health registry — generation-aware ping + sticky preferred provider.

Design (v2):
  - Startup probe runs a REAL 1-token completion against each provider's
    default model, so a key whose models are gone (503 model_not_found) is
    detected before the first user request — a /models 200 is not enough.
  - Errors are classified: "permanent" (model gone, auth) marks the provider
    unhealthy immediately; "transient" (timeout, 429, 5xx) needs
    2 consecutive failures.
  - The first healthy provider becomes the *preferred* provider: the model
    cascade puts it first and keeps it there (sticky switch) until it fails.
  - Unhealthy providers are never hard-skipped — they drop to the END of the
    cascade as a last resort, so "All models exhausted" cannot happen while
    any configured provider exists.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Callable, Optional

import httpx

from settings import settings

logger = logging.getLogger(__name__)

_TRANSIENT_FAILURE_THRESHOLD = 2

_PERMANENT_MARKERS = (
    "model_not_found",
    "no available channel",
    "error code: 401",
    "error code: 403",
    "error code: 404",
)


@dataclass
class ProviderHealth:
    status: str = "unknown"  # unknown | healthy | unhealthy
    last_checked: float = 0.0  # monotonic clock
    latency_ms: Optional[int] = None
    consecutive_failures: int = 0
    last_error_kind: Optional[str] = None  # permanent | transient
    preferred: bool = False


_registry: dict[str, ProviderHealth] = {}


def classify_error(exc: BaseException) -> str:
    """permanent = retrying the same provider is pointless; transient = maybe."""
    msg = str(exc).lower()
    if any(marker in msg for marker in _PERMANENT_MARKERS):
        return "permanent"
    return "transient"


def configured_providers() -> list[dict]:
    """Ordered provider configs (first = preferred primary)."""
    from services.llm_clients import _has_configured_key

    providers: list[dict] = []
    if _has_configured_key(settings.TOKENROUTER_API_KEY):
        providers.append(
            {
                "name": "tokenrouter",
                "base_url": settings.TOKENROUTER_BASE_URL,
                "api_key": settings.TOKENROUTER_API_KEY.get_secret_value(),
                "default_model": settings.MODEL_GENERATOR,
            }
        )
    if _has_configured_key(settings.BAI_API_KEY):
        providers.append(
            {
                "name": "bai",
                "base_url": settings.BAI_BASE_URL,
                "api_key": settings.BAI_API_KEY.get_secret_value(),
                "default_model": settings.BAI_GENERATION_MODEL,
            }
        )
    return providers


def record(
    name: str,
    ok: bool,
    latency_ms: Optional[float] = None,
    kind: Optional[str] = None,
) -> None:
    """Feed a real outcome (probe or generation call) into the registry."""
    health = _registry.setdefault(name, ProviderHealth())
    health.last_checked = time.monotonic()
    if latency_ms is not None:
        health.latency_ms = int(latency_ms)

    if ok:
        health.status = "healthy"
        health.consecutive_failures = 0
        health.last_error_kind = None
        _set_preferred(name)
        return

    health.consecutive_failures += 1
    health.last_error_kind = kind or "transient"
    if (
        kind == "permanent"
        or health.consecutive_failures >= _TRANSIENT_FAILURE_THRESHOLD
    ):
        health.status = "unhealthy"
        if health.preferred:
            health.preferred = False
    else:
        # A single transient failure does not take a provider out of rotation.
        health.status = "healthy"


def _set_preferred(name: str) -> None:
    for other_name, health in _registry.items():
        health.preferred = other_name == name


def preferred_provider() -> Optional[str]:
    for name, health in _registry.items():
        if health.preferred:
            return name
    return None


def get_status(name: str) -> str:
    return _registry.get(name, ProviderHealth()).status


def is_cascade_ready(name: str) -> bool:
    """Ordering hint: unhealthy providers drop to the end of the cascade."""
    health = _registry.get(name)
    if health is None or health.status in ("unknown", "healthy"):
        return True
    return (
        time.monotonic() - health.last_checked
    ) >= settings.LLM_HEALTH_RECHECK_SECONDS


async def ping_provider(
    base_url: str,
    api_key: str,
    timeout: Optional[float] = None,
    client_factory: Optional[Callable[[], httpx.AsyncClient]] = None,
) -> tuple[bool, float]:
    """Cheap key liveness probe: GET {base_url}/models (does NOT validate models)."""
    started = time.monotonic()
    try:
        if client_factory is not None:
            client = client_factory()
        else:
            client = httpx.AsyncClient(
                timeout=timeout or settings.LLM_HEALTH_TIMEOUT_SECONDS
            )
        async with client:
            resp = await client.get(
                f"{base_url.rstrip('/')}/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except Exception as exc:  # noqa: BLE001 — any failure counts as down
        logger.warning(f"[LLMHealth] ping failed for {base_url}: {exc!r}")
        return False, (time.monotonic() - started) * 1000
    return resp.status_code == 200, (time.monotonic() - started) * 1000


async def ping_provider_generation(
    base_url: str,
    api_key: str,
    model: str,
    timeout: Optional[float] = None,
    client_factory: Optional[Callable[[], httpx.AsyncClient]] = None,
) -> tuple[bool, float, Optional[str]]:
    """
    Real 1-token completion against `model` — validates the key AND the model.
    Returns (ok, latency_ms, error_kind).
    """
    started = time.monotonic()
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 1,
    }
    try:
        if client_factory is not None:
            client = client_factory()
        else:
            client = httpx.AsyncClient(
                timeout=timeout or settings.LLM_HEALTH_TIMEOUT_SECONDS
            )
        async with client:
            resp = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[LLMHealth] generation ping failed for {base_url}: {exc!r}")
        kind = (
            "permanent"
            if _is_permanent_status(getattr(exc, "status_code", None))
            else "transient"
        )
        if isinstance(exc, httpx.TimeoutException):
            kind = "transient"
        return False, (time.monotonic() - started) * 1000, kind

    if resp.status_code == 200:
        return True, (time.monotonic() - started) * 1000, None

    body = ""
    try:
        body = resp.text[:500].lower()
    except Exception:  # noqa: BLE001
        pass
    permanent = _is_permanent_status(resp.status_code) or any(
        marker in body for marker in _PERMANENT_MARKERS
    )
    return (
        False,
        (time.monotonic() - started) * 1000,
        "permanent" if permanent else "transient",
    )


def _is_permanent_status(status_code: Optional[int]) -> bool:
    return status_code in (401, 403, 404)


async def probe_all() -> list[dict]:
    """Generation-ping every configured provider concurrently; update registry."""
    providers = configured_providers()
    if not providers:
        return []

    async def _probe(provider: dict) -> dict:
        ok, latency_ms, kind = await ping_provider_generation(
            provider["base_url"], provider["api_key"], provider["default_model"]
        )
        record(provider["name"], ok, latency_ms, kind=kind)
        health = _registry[provider["name"]]
        return {
            "provider": provider["name"],
            "status": health.status,
            "latency_ms": health.latency_ms,
            "preferred": health.preferred,
            "error_kind": health.last_error_kind,
        }

    return list(await asyncio.gather(*(_probe(p) for p in providers)))


def snapshot() -> list[dict]:
    """Masked registry view for diagnostics endpoints (never leak keys)."""
    out: list[dict] = []
    for provider in configured_providers():
        health = _registry.get(provider["name"], ProviderHealth())
        key: str = provider["api_key"]
        out.append(
            {
                "provider": provider["name"],
                "status": health.status,
                "latency_ms": health.latency_ms,
                "preferred": health.preferred,
                "consecutive_failures": health.consecutive_failures,
                "default_model": provider["default_model"],
                "key_hint": f"***{key[-4:]}" if key else None,
            }
        )
    return out
