import { afterEach, describe, expect, it, vi } from 'vitest';

const sentryMocks = vi.hoisted(() => {
  const scope = {
    setContext: vi.fn(),
    setLevel: vi.fn(),
    setTag: vi.fn(),
  };

  return {
    scope,
    init: vi.fn(),
    browserTracingIntegration: vi.fn(() => ({ name: 'browser-tracing' })),
    replayIntegration: vi.fn(() => ({ name: 'replay' })),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  };
});

vi.mock('@sentry/react', () => ({
  init: sentryMocks.init,
  browserTracingIntegration: sentryMocks.browserTracingIntegration,
  replayIntegration: sentryMocks.replayIntegration,
  captureException: sentryMocks.captureException,
  captureMessage: sentryMocks.captureMessage,
  addBreadcrumb: sentryMocks.addBreadcrumb,
  withScope: (callback: (scope: typeof sentryMocks.scope) => void) =>
    callback(sentryMocks.scope),
}));

import {
  sanitizeMonitoringContext,
  SentryMonitoringService,
} from '@/services/sentryMonitoringService';

describe('SentryMonitoringService', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('does not initialize without a DSN and initializes only once with a DSN', () => {
    const disabledService = new SentryMonitoringService();
    disabledService.initialize();

    expect(sentryMocks.init).not.toHaveBeenCalled();
    expect(disabledService.isEnabled()).toBe(false);

    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
    const enabledService = new SentryMonitoringService();
    enabledService.initialize();
    enabledService.initialize();

    expect(sentryMocks.init).toHaveBeenCalledTimes(1);
    expect(sentryMocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.ingest.sentry.io/1',
        enabled: true,
        sendDefaultPii: false,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1,
      }),
    );
    expect(enabledService.isEnabled()).toBe(true);
  });

  it('sanitizes credentials, query strings and oversized values', () => {
    const context = sanitizeMonitoringContext({
      authorization: 'Bearer private-token',
      email: 'learner@example.com',
      endpoint: '/api/v1/profile?access_token=private-token',
      nested: { password: 'secret-password' },
      longValue: 'x'.repeat(1_001),
    }) as Record<string, unknown>;

    expect(context).toEqual({
      authorization: '[REDACTED]',
      email: '[REDACTED]',
      endpoint: '/api/v1/profile',
      nested: { password: '[REDACTED]' },
      longValue: `${'x'.repeat(1_000)}…`,
    });
  });

  it('captures exceptions with a sanitized frontend context', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
    const service = new SentryMonitoringService();
    service.initialize();

    service.captureException(new Error('AR failed'), {
      feature: 'ar',
      endpoint: '/ar-viewer?token=private-token',
      authorization: 'Bearer private-token',
    });

    expect(sentryMocks.captureException).toHaveBeenCalledWith(expect.any(Error));
    expect(sentryMocks.scope.setContext).toHaveBeenCalledWith('frontend', {
      feature: 'ar',
      endpoint: '/ar-viewer',
      authorization: '[REDACTED]',
    });
    expect(sentryMocks.scope.setTag).toHaveBeenCalledWith('feature', 'ar');
  });

  it('keeps expected API client failures as breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
    const service = new SentryMonitoringService();
    service.initialize();

    service.captureApiFailure(new Error('Unauthorized'), {
      feature: 'api-client',
      method: 'get',
      endpoint: '/api/v1/profile?token=private-token',
      status: 401,
    });

    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'GET /api/v1/profile failed',
      }),
    );
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it('captures server and network API failures as exceptions', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://public@example.ingest.sentry.io/1');
    const service = new SentryMonitoringService();
    service.initialize();

    service.captureApiFailure(new Error('Server error'), {
      feature: 'api-client',
      method: 'post',
      endpoint: '/api/v1/telegram/sync',
      status: 500,
    });

    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
