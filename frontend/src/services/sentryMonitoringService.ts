import * as Sentry from '@sentry/react';
import type { Scope, SeverityLevel } from '@sentry/react';

export type MonitoringContext = Record<string, unknown>;

type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | SanitizedValue[]
  | { [key: string]: SanitizedValue };

export interface ApiFailureContext extends MonitoringContext {
  endpoint?: string;
  method?: string;
  status?: number;
}

const DEFAULT_TRACE_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAY_SESSION_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAY_ON_ERROR_SAMPLE_RATE = 1;
const MAX_STRING_LENGTH = 1_000;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 50;
const MAX_CONTEXT_DEPTH = 4;
const REDACTED_VALUE = '[REDACTED]';
const TRUNCATED_VALUE = '[TRUNCATED]';

const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|secret|token|api[-_]?key|email|phone/i;
const URL_KEY_PATTERN = /url|uri|href|endpoint|path/i;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[^\s]+/gi;
const SENSITIVE_QUERY_PATTERN =
  /([?&](?:authorization|password|secret|token|api[-_]?key)=)[^&#\s]+/gi;
const SENSITIVE_ASSIGNMENT_PATTERN =
  /(\b(?:authorization|password|secret|token|api[-_]?key)\s*[:=]\s*)[^\s,;]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const TAG_KEYS = new Set([
  'feature',
  'component',
  'engine',
  'phase',
  'operation',
  'status',
]);

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_STRING_LENGTH)}…`;
}

function sanitizeDiagnosticString(value: string): string {
  return truncateString(
    value
      .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]')
      .replace(SENSITIVE_QUERY_PATTERN, '$1[REDACTED]')
      .replace(SENSITIVE_ASSIGNMENT_PATTERN, '$1[REDACTED]')
      .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]'),
  );
}

function stripUrlQuery(value: string): string {
  return value.replace(/[?#].*$/, '');
}

function sanitizePrimitive(value: unknown, key: string): SanitizedValue {
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED_VALUE;

  if (typeof value === 'string') {
    const safeValue = URL_KEY_PATTERN.test(key) ? stripUrlQuery(value) : value;
    return sanitizeDiagnosticString(safeValue);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === 'boolean' || value === null) return value;
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'undefined') return '[undefined]';
  if (typeof value === 'symbol') return String(value);
  if (typeof value === 'function') return '[function]';

  return '[unknown]';
}

function sanitizeValue(
  value: unknown,
  key: string,
  depth: number,
  seen: WeakSet<object>,
): SanitizedValue {
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED_VALUE;

  if (value === null || typeof value !== 'object') {
    return sanitizePrimitive(value, key);
  }

  if (seen.has(value)) return '[circular]';
  if (depth >= MAX_CONTEXT_DEPTH) return TRUNCATED_VALUE;

  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, key, depth + 1, seen));

    if (value.length > MAX_ARRAY_ITEMS) items.push(TRUNCATED_VALUE);
    seen.delete(value);
    return items;
  }

  if (value instanceof Date) {
    seen.delete(value);
    return value.toISOString();
  }

  const result: { [key: string]: SanitizedValue } = {};
  const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);

  for (const [childKey, childValue] of entries) {
    result[childKey] = sanitizeValue(childValue, childKey, depth + 1, seen);
  }

  if (Object.keys(value).length > MAX_OBJECT_KEYS) {
    result.__truncated__ = TRUNCATED_VALUE;
  }

  seen.delete(value);
  return result;
}

/**
 * Remove sensitive values and cap diagnostic payloads before they reach Sentry.
 * This function is exported so callers can reuse the same policy in tests or
 * for future monitoring integrations.
 */
export function sanitizeMonitoringContext(value: unknown): SanitizedValue {
  return sanitizeValue(value, '', 0, new WeakSet<object>());
}

export function normalizeMonitoringError(error: unknown): Error {
  if (error instanceof Error) {
    const safeMessage = sanitizeDiagnosticString(error.message);
    if (safeMessage === error.message) return error;

    const normalizedError = new Error(safeMessage);
    normalizedError.name = error.name;
    if (error.stack) normalizedError.stack = sanitizeDiagnosticString(error.stack);
    return normalizedError;
  }
  if (typeof error === 'string') {
    return new Error(sanitizeDiagnosticString(error));
  }

  try {
    return new Error(JSON.stringify(sanitizeMonitoringContext(error)));
  } catch {
    return new Error('Unknown frontend error');
  }
}

function parseSampleRate(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

function readEnvValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getTagValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return undefined;
}

function getStatus(context: MonitoringContext): number | undefined {
  return typeof context.status === 'number' ? context.status : undefined;
}

function isExpectedApiFailure(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500;
}

/**
 * Single application boundary for frontend Sentry usage.
 *
 * The rest of the frontend reports domain failures here instead of importing
 * Sentry directly. That keeps privacy rules, sampling and event shape in one
 * place and makes replacing the provider possible later.
 */
export class SentryMonitoringService {
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    const dsn = readEnvValue(import.meta.env.VITE_SENTRY_DSN);
    if (!dsn) return;

    try {
      Sentry.init({
        dsn,
        enabled: true,
        environment:
          readEnvValue(import.meta.env.VITE_SENTRY_ENVIRONMENT) ||
          import.meta.env.MODE ||
          'production',
        sendDefaultPii: false,
        dataCollection: {
          userInfo: false,
          httpBodies: [],
        },
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: false,
          }),
        ],
        tracesSampleRate: parseSampleRate(
          import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
          DEFAULT_TRACE_SAMPLE_RATE,
        ),
        replaysSessionSampleRate: parseSampleRate(
          import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
          DEFAULT_REPLAY_SESSION_SAMPLE_RATE,
        ),
        replaysOnErrorSampleRate: parseSampleRate(
          import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
          DEFAULT_REPLAY_ON_ERROR_SAMPLE_RATE,
        ),
      });

      this.initialized = true;
    } catch (error) {
      // Monitoring must never prevent the learner application from starting.
      console.error('[SentryMonitoring] Initialization failed:', error);
    }
  }

  isEnabled(): boolean {
    return this.initialized;
  }

  captureException(error: unknown, context: MonitoringContext = {}): void {
    this.withScope('error', context, () => {
      Sentry.captureException(normalizeMonitoringError(error));
    });
  }

  captureMessage(
    message: string,
    level: SeverityLevel = 'info',
    context: MonitoringContext = {},
  ): void {
    this.withScope(level, context, () => {
      Sentry.captureMessage(sanitizeDiagnosticString(message), level);
    });
  }

  addBreadcrumb(
    message: string,
    context: MonitoringContext = {},
    level: SeverityLevel = 'info',
    category = 'frontend',
  ): void {
    if (!this.initialized) return;

    try {
      const data = sanitizeMonitoringContext(context);
      Sentry.addBreadcrumb({
        category,
        level,
        message: sanitizeDiagnosticString(message),
        data: this.asBreadcrumbData(data),
      });
    } catch (error) {
      console.error('[SentryMonitoring] Breadcrumb failed:', error);
    }
  }

  captureApiFailure(error: unknown, context: ApiFailureContext = {}): void {
    const status = getStatus(context);
    const method = context.method || 'GET';
    const endpoint = context.endpoint || 'unknown endpoint';
    const safeEndpoint = stripUrlQuery(endpoint);

    this.addBreadcrumb(
      `${method.toUpperCase()} ${safeEndpoint} failed`,
      context,
      status && status >= 500 ? 'error' : 'warning',
      'api',
    );

    // Validation, auth and not-found responses are expected application
    // outcomes. Keep them as breadcrumbs to avoid turning normal UX into
    // Sentry issue noise; network and server failures remain full events.
    if (isExpectedApiFailure(status)) return;

    this.captureException(error, {
      ...context,
      feature: context.feature || 'api',
      errorMessage: normalizeMonitoringError(error).message,
    });
  }

  private withScope(
    level: SeverityLevel,
    context: MonitoringContext,
    capture: () => void,
  ): void {
    if (!this.initialized) return;

    try {
      Sentry.withScope((scope) => {
        this.applyScope(scope, level, context);
        capture();
      });
    } catch (error) {
      console.error('[SentryMonitoring] Event capture failed:', error);
    }
  }

  private applyScope(
    scope: Scope,
    level: SeverityLevel,
    context: MonitoringContext,
  ): void {
    const sanitizedContext = sanitizeMonitoringContext(context);
    scope.setLevel(level);
    scope.setTag('app.surface', 'frontend-web');
    scope.setContext('frontend', this.asContext(sanitizedContext));

    for (const [key, value] of Object.entries(context)) {
      if (!TAG_KEYS.has(key)) continue;

      const tagValue = getTagValue(sanitizeMonitoringContext(value));
      if (tagValue !== undefined) scope.setTag(key, tagValue);
    }
  }

  private asContext(value: SanitizedValue): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { value };
  }

  private asBreadcrumbData(value: SanitizedValue): Record<string, unknown> {
    return this.asContext(value);
  }
}

export const sentryMonitoringService = new SentryMonitoringService();
