// src/config.ts - Smart API & WebSocket detection

/**
 * Get API base URL based on current environment
 * - HTTPS (tunnel/production): Use relative path → Vite proxy
 * - HTTP (localhost): Use direct connection
 */
export const getApiBase = (): string => {
  // If running through tunnel (HTTPS), use relative path (Vite proxy)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return ''; // Relative → proxy to localhost:8000
  }

  // Define api base for localhost or development
  const ApiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  
  // If localhost, use direct connection (FIX: http:// not http//)
  if (!ApiBase.startsWith('http://') && !ApiBase.startsWith('https://')) {
    return `http://${ApiBase}`;
  }

  return ApiBase;
};

/**
 * Get WebSocket URL based on current environment
 * - HTTPS (tunnel): Use wss:// with same host
 * - HTTP (localhost): Use ws:// direct connection
 */
export const getWsUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // If tunnel (HTTPS), use same host with wss
  if (window.location.protocol === 'https:') {
    return `${protocol}//${host}`;
  }
  
  // If localhost, use direct WS connection
  return import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
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