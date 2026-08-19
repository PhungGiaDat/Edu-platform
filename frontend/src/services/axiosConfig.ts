/**
 * axiosConfig.ts
 * 
 * Global axios interceptor for automatic JWT token injection
 * This file handles ~5% of API calls that still use axios directly
 */

import axios from 'axios';

const TOKEN_KEY = 'authToken';

/**
 * Request interceptor - Automatically add Authorization header
 */
axios.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('[AxiosConfig] Failed to read token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle 401 Unauthorized
 */
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('authUser');
        window.location.href = '/login';
      } catch {
        // Silently ignore
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Pre-configured axios instance with interceptors
 * Use this for API calls that need automatic auth token injection
 */
export const api = axios;

export default axios;
