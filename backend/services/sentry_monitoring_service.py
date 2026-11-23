"""Sentry integration boundary for backend error monitoring."""

from __future__ import annotations

import logging
import math
import os
from typing import Any

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
except ImportError:  # pragma: no cover - production installs the requirement
    sentry_sdk = None
    FastApiIntegration = None


logger = logging.getLogger(__name__)

_DEFAULT_ENVIRONMENT = "production"
_DEFAULT_TRACES_SAMPLE_RATE = 0.1


def _parse_sample_rate(raw_value: str | None) -> float:
    """Return a safe Sentry sample rate in the inclusive range [0, 1]."""
    try:
        value = float(raw_value) if raw_value is not None else _DEFAULT_TRACES_SAMPLE_RATE
    except (TypeError, ValueError):
        value = _DEFAULT_TRACES_SAMPLE_RATE

    if not math.isfinite(value):
        return _DEFAULT_TRACES_SAMPLE_RATE

    return max(0.0, min(1.0, value))


class SentryMonitoringService:
    """Own Sentry setup and exception reporting for the FastAPI process."""

    def __init__(
        self,
        sdk: Any = sentry_sdk,
        fastapi_integration_factory: Any = FastApiIntegration,
    ) -> None:
        self._sdk = sdk
        self._fastapi_integration_factory = fastapi_integration_factory
        self._initialized = False
        self._enabled = False

    def initialize(self) -> bool:
        """Initialize Sentry when a DSN is configured.

        Monitoring is intentionally optional so a missing local dependency or
        DSN never prevents the API from starting.
        """
        if self._initialized:
            return self._enabled

        self._initialized = True
        dsn = os.getenv("SENTRY_DSN", "").strip()
        if (
            not dsn
            or self._sdk is None
            or self._fastapi_integration_factory is None
        ):
            logger.info("Sentry monitoring disabled")
            return False

        try:
            environment = os.getenv("SENTRY_ENVIRONMENT", "").strip()
            self._sdk.init(
                dsn=dsn,
                environment=environment or _DEFAULT_ENVIRONMENT,
                integrations=[self._fastapi_integration_factory()],
                traces_sample_rate=_parse_sample_rate(
                    os.getenv("SENTRY_TRACES_SAMPLE_RATE")
                ),
                send_default_pii=False,
            )
        except Exception:
            logger.exception("Sentry initialization failed; continuing without monitoring")
            return False

        self._enabled = True
        logger.info("Sentry monitoring enabled")
        return True

    def capture_exception(self, exception: BaseException) -> None:
        """Report an already-handled server exception without changing its flow."""
        if not self._enabled or self._sdk is None:
            return

        try:
            self._sdk.capture_exception(exception)
        except Exception:
            # Monitoring must never turn a handled API error into a new failure.
            logger.exception("Sentry failed to capture backend exception")


sentry_monitoring_service = SentryMonitoringService()
