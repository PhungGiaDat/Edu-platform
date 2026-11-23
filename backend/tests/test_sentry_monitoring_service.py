"""Unit tests for the backend Sentry integration boundary."""

from services.sentry_monitoring_service import SentryMonitoringService


class FakeSentrySdk:
    def __init__(self) -> None:
        self.init_calls: list[dict] = []
        self.captured: list[BaseException] = []

    def init(self, **kwargs) -> None:
        self.init_calls.append(kwargs)

    def capture_exception(self, exception: BaseException) -> None:
        self.captured.append(exception)


def test_initialize_is_disabled_without_dsn(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    sdk = FakeSentrySdk()
    service = SentryMonitoringService(sdk=sdk)

    assert service.initialize() is False
    assert sdk.init_calls == []


def test_initialize_configures_fastapi_monitoring(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://public@example.ingest.sentry.io/1")
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "test")
    monkeypatch.setenv("SENTRY_TRACES_SAMPLE_RATE", "2")
    sdk = FakeSentrySdk()
    service = SentryMonitoringService(
        sdk=sdk,
        fastapi_integration_factory=lambda: object(),
    )

    assert service.initialize() is True
    assert len(sdk.init_calls) == 1
    init_config = sdk.init_calls[0]
    assert init_config["dsn"].endswith("/1")
    assert init_config["environment"] == "test"
    assert init_config["traces_sample_rate"] == 1.0
    assert init_config["send_default_pii"] is False
    assert len(init_config["integrations"]) == 1


def test_invalid_sample_rate_falls_back_to_safe_default(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://public@example.ingest.sentry.io/1")
    monkeypatch.setenv("SENTRY_TRACES_SAMPLE_RATE", "not-a-number")
    sdk = FakeSentrySdk()
    service = SentryMonitoringService(
        sdk=sdk,
        fastapi_integration_factory=lambda: object(),
    )

    service.initialize()

    assert sdk.init_calls[0]["traces_sample_rate"] == 0.1


def test_capture_exception_is_safe_and_reports_enabled_errors(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://public@example.ingest.sentry.io/1")
    sdk = FakeSentrySdk()
    service = SentryMonitoringService(
        sdk=sdk,
        fastapi_integration_factory=lambda: object(),
    )
    error = RuntimeError("backend failure")

    service.initialize()
    service.capture_exception(error)

    assert sdk.captured == [error]
