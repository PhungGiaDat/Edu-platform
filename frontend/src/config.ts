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
export const AR_READY_TIMEOUT_MS = 10_000; // 10 seconds
/** Minimum FPS before triggering performance-based fallback to XR. */
export const MIN_PERFORMANCE_FPS = 15;
/** Maximum AR session duration before the session is ended. */
export const AR_SESSION_LIMIT_MINS = 30;
/** Warning threshold displayed before the AR session limit. */
export const AR_SESSION_WARNING_MINS = 25;
/** Maximum number of AR tracks processed simultaneously. */
export const AR_MAX_TRACKS = 2;

/** Maximum session duration before hard lock (30 minutes = 1800 seconds). */
export const SESSION_LIMIT_SECS = 30 * 60;
/** Warning threshold shown before hard lock (25 minutes = 1500 seconds). */
export const SESSION_WARNING_SECS = 25 * 60;
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
 * Task 9: Check if persistent MindAR viewer is enabled.
 * Fails closed — returns false when flag is absent.
 */
export function isPersistentMindViewerEnabled(): boolean {
  return import.meta.env.VITE_PERSISTENT_MIND_VIEWER === 'true';
}

// Export constants for debugging
export const CONFIG = {
  get apiBase() { return getApiBase(); },
  get wsUrl() { return getWsUrl(); },
  get isDev() { return isDevelopment(); },
  get isTunnel() { return isTunnelMode(); },
} as const;
