/**
 * apiClient.ts
 * 
 * Centralized API client with automatic JWT token handling
 * - Automatically adds Authorization header
 * - Handles 401 responses with logout
 * - Provides methods for GET, POST, PUT, DELETE, PATCH
 */

import { getApiBase } from '@/config';

const API_BASE = getApiBase();
const TOKEN_KEY = 'authToken';

export interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean; // Skip adding Authorization header
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Get current auth token from localStorage
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Handle 401 Unauthorized response by logging out
 */
function handle401(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('authUser');
    window.location.href = '/login';
  } catch {
    // Silently ignore
  }
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });

    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Prepare request headers with Authorization
 */
function prepareHeaders(options: ApiClientOptions = {}): Headers {
  const headers = new Headers(options.headers || {});

  // Set default Content-Type if not set
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Add Authorization header if not skipped
  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

/**
 * Handle API response
 */
async function handleResponse(response: Response): Promise<any> {
  // Handle 401 Unauthorized
  if (response.status === 401) {
    handle401();
    throw new Error('Unauthorized');
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    throw new Error('Forbidden');
  }

  // Handle 404 Not Found
  if (response.status === 404) {
    throw new Error('Not found');
  }

  // Handle server errors
  if (response.status >= 500) {
    throw new Error('Server error');
  }

  // Parse JSON response
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const data = await response.json();

    // Check for non-ok responses with error details
    if (!response.ok && data.detail) {
      throw new Error(data.detail);
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // For non-JSON responses
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response;
}

/**
 * Generic fetch wrapper
 */
async function request(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<any> {
  const { params, skipAuth, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);
  const headers = prepareHeaders({ ...fetchOptions, skipAuth });

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error(`[ApiClient] ${options.method || 'GET'} ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API Client with convenience methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: (endpoint: string, options?: ApiClientOptions) =>
    request(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: (endpoint: string, body?: any, options?: ApiClientOptions) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  /**
   * PUT request
   */
  put: (endpoint: string, body?: any, options?: ApiClientOptions) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  /**
   * PATCH request
   */
  patch: (endpoint: string, body?: any, options?: ApiClientOptions) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  /**
   * DELETE request
   */
  delete: (endpoint: string, options?: ApiClientOptions) =>
    request(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Raw request with full control
   */
  request,
};

export default apiClient;
