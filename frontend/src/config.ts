// src/config.ts - Smart API & WebSocket detection

/**
 * Get API base URL based on current environment
 * Priority:
 * 1. VITE_API_BASE env variable (set in Vercel/local .env)
 * 2. Localhost fallback for development
 */
export const getApiBase = (): string => {
  // Always prioritize VITE_API_BASE if set
  const envApiBase = import.meta.env.VITE_API_BASE;

  if (envApiBase) {
    // Ensure proper protocol
    if (!envApiBase.startsWith('http://') && !envApiBase.startsWith('https://')) {
      return `https://${envApiBase}`;
    }
    return envApiBase;
  }

  // Fallback for local development without .env
  return 'http://localhost:8000';
};

/**
 * Get Supabase public-storage base URL for AR assets (3D models, MIND files,
 * combo images, fallbacks).
 *
 * Priority:
 * 1. VITE_SUPABASE_STORAGE_BASE env variable (set in Vercel/local .env)
 * 2. Dev fallback pointing at the project's primary Supabase bucket
 *
 * The returned URL has no trailing slash. Callers append `/storage/v1/object/public/<bucket>/<path>`.
 */
export const getSupabaseStorageBase = (): string => {
  const envBase = import.meta.env.VITE_SUPABASE_STORAGE_BASE;

  if (envBase) {
    return envBase.replace(/\/$/, '');
  }

  // Fallback for local development without .env. The bucket is the same
  // default the backend uses (see backend/settings.py -> SUPABASE_STORAGE_BUCKET).
  return 'https://rofprrtoeyirssfndxag.supabase.co';
};

/** Timeout for MindAR to emit AR_READY before triggering fallback (ms). */
export const AR_READY_TIMEOUT_MS = 20_000; // 20 seconds - increased for debugging
/** Minimum FPS before triggering performance-based fallback to XR. */
export const MIN_PERFORMANCE_FPS = 15;
export interface SessionWindowConfig {
  limitMins: number;
  warningMins: number;
  storageKey: string;
}

/**
 * Keep the child-safe 30-minute window for normal traffic, but give
 * `?debug=true` a separate eight-hour session for long mobile AR tests.
 * A separate key prevents an old `limit_reached` state from the normal
 * session immediately locking a new debug session.
 */
export const resolveSessionWindow = (search = ''): SessionWindowConfig => {
  const isDebugSession = new URLSearchParams(search).get('debug') === 'true';
  return isDebugSession
    ? { limitMins: 8 * 60, warningMins: 8 * 60 - 5, storageKey: 'edu_session_state_debug_8h_v1' }
    : { limitMins: 30, warningMins: 25, storageKey: 'edu_session_state_v1' };
};

const sessionWindow = resolveSessionWindow(
  typeof window === 'undefined' ? '' : window.location.search,
);

/** Maximum AR session duration before the session is ended. */
export const AR_SESSION_LIMIT_MINS = sessionWindow.limitMins;
/** Warning threshold displayed before the AR session limit. */
export const AR_SESSION_WARNING_MINS = sessionWindow.warningMins;
/** Maximum number of AR tracks processed simultaneously. */
export const AR_MAX_TRACKS = 2;

/** Maximum session duration before hard lock. */
export const SESSION_LIMIT_SECS = AR_SESSION_LIMIT_MINS * 60;
/** Warning threshold shown before hard lock. */
export const SESSION_WARNING_SECS = AR_SESSION_WARNING_MINS * 60;
/** Storage key is isolated for the extended debug session. */
export const SESSION_STATE_STORAGE_KEY = sessionWindow.storageKey;
/** Mandatory cooldown after a completed learning session (5 minutes). */
export const SESSION_BREAK_SECS = 5 * 60;
/** Keep aliases for backward compat with LearnARV2 */
export const AR_SESSION_LIMIT_SECS = SESSION_LIMIT_SECS;
export const AR_SESSION_WARNING_SECS = SESSION_WARNING_SECS;

/**
 * Get WebSocket URL based on current environment
 * 1. VITE_WS_URL env variable
 * 2. Derive from API base URL
 * 3. Localhost fallback
 */
export const getWsUrl = (): string => {
  // Prioritize VITE_WS_URL if set
  const envWsUrl = import.meta.env.VITE_WS_URL;
  
  if (envWsUrl) {
    return envWsUrl;
  }

  // Derive from API base
  const apiBase = getApiBase();
  if (apiBase.startsWith('https://')) {
    return apiBase.replace('https://', 'wss://');
  }
  if (apiBase.startsWith('http://')) {
    return apiBase.replace('http://', 'ws://');
  }
  
  // Fallback
  return 'ws://localhost:8000';
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.MODE === 'development';
};

/**
 * Check if running through tunnel (HTTPS)
 */
export const isTunnelMode = (): boolean => {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
};

/**
 * Resolve the persistent MindAR viewer rollout flag.
 * The continuous single-camera flow is now the default. Set the flag to the
 * literal string "false" only when an explicit legacy rollback is required.
 */
export function resolvePersistentMindViewerEnabled(flagValue: string | undefined): boolean {
  return flagValue !== 'false';
}

export function isPersistentMindViewerEnabled(): boolean {
  return resolvePersistentMindViewerEnabled(import.meta.env.VITE_PERSISTENT_MIND_VIEWER);
}

// Export constants for debugging
export const CONFIG = {
  get apiBase() { return getApiBase(); },
  get wsUrl() { return getWsUrl(); },
  get isDev() { return isDevelopment(); },
  get isTunnel() { return isTunnelMode(); },
} as const;
