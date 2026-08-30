# backend/services/llm_health.py
"""
LLM provider health registry — startup ping + cascade filtering.

Providers are cheaply probed (GET {base_url}/models, no token burn) at app
startup and whenever the model cascade needs to skip a dead provider fast.
Outcomes of real generation calls feed back into the same registry, so a
failing key is bypassed for LLM_HEALTH_RECHECK_SECONDS instead of burning
the caller's timeout budget.
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


@dataclass
class ProviderHealth:
    status: str = "unknown"  # unknown | healthy | unhealthy
    last_checked: float = 0.0  # monotonic clock
    latency_ms: Optional[int] = None


_registry: dict[str, ProviderHealth] = {}


def configured_providers() -> list[dict]:
    """Ordered provider configs (first = preferred primary)."""
    providers: list[dict] = []
    if settings.TOKENROUTER_API_KEY:
        providers.append(
            {
                "name": "tokenrouter",
                "base_url": settings.TOKENROUTER_BASE_URL,
                "api_key": settings.TOKENROUTER_API_KEY.get_secret_value(),
                "default_model": settings.MODEL_GENERATOR,
            }
        )
    if settings.BAI_API_KEY:
        providers.append(
            {
                "name": "bai",
                "base_url": settings.BAI_BASE_URL,
                "api_key": settings.BAI_API_KEY.get_secret_value(),
                "default_model": settings.BAI_GENERATION_MODEL,
            }
        )
    return providers


async def ping_provider(
    base_url: str,
    api_key: str,
    timeout: Optional[float] = None,
    client_factory: Optional[Callable[[], httpx.AsyncClient]] = None,
) -> tuple[bool, float]:
    """Cheap liveness probe: GET {base_url}/models. Returns (ok, latency_ms)."""
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


def record(name: str, ok: bool, latency_ms: Optional[float] = None) -> None:
    """Feed a real outcome (probe or generation call) into the registry."""
    health = _registry.setdefault(name, ProviderHealth())
    health.status = "healthy" if ok else "unhealthy"
    health.last_checked = time.monotonic()
    if latency_ms is not None:
        health.latency_ms = int(latency_ms)


def get_status(name: str) -> str:
    return _registry.get(name, ProviderHealth()).status


def is_cascade_ready(name: str) -> bool:
    """
    Healthy/unknown → ready. Unhealthy → ready only after the recheck
    cooldown, so one dead key never costs the caller its full timeout.
    """
    health = _registry.get(name)
    if health is None or health.status in ("unknown", "healthy"):
        return True
    return (
        time.monotonic() - health.last_checked
    ) >= settings.LLM_HEALTH_RECHECK_SECONDS


async def probe_all() -> list[dict]:
    """Ping every configured provider concurrently; update the registry."""
    providers = configured_providers()
    if not providers:
        return []

    async def _probe(provider: dict) -> dict:
        ok, latency_ms = await ping_provider(provider["base_url"], provider["api_key"])
        record(provider["name"], ok, latency_ms)
        return {
            "provider": provider["name"],
            "status": "healthy" if ok else "unhealthy",
            "latency_ms": int(latency_ms),
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
                "default_model": provider["default_model"],
                "key_hint": f"***{key[-4:]}" if key else None,
            }
        )
    return out
