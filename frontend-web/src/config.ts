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
 * Get WebSocket URL based on current environment
 * Priority:
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

// Export constants for debugging
export const CONFIG = {
  get apiBase() { return getApiBase(); },
  get wsUrl() { return getWsUrl(); },
  get isDev() { return isDevelopment(); },
  get isTunnel() { return isTunnelMode(); },
} as const;