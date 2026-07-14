/**
 * AuthContext.tsx
 * 
 * React Context for JWT authentication and user state management
 * Stores JWT token, user info (id, email, username), and provides auth operations
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBase } from '@/config';

const API_BASE = getApiBase();
const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';
const GUEST_KEY = 'guestMode';

// ========== Types ==========

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  full_name?: string;
  role?: string;
  is_superuser?: boolean;
}

interface ApiUserProfile {
  id: string;
  email: string;
  username: string;
  full_name?: string | null;
  role?: string | null;
  is_superuser?: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Methods
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  enterGuestMode: () => void;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

// ========== Context Creation ==========

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========== Utility Functions ==========

/**
 * Decode JWT token to extract user info
 * Note: This is a basic decode - doesn't verify signature
 */
function decodeToken(token: string): User | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(atob(parts[1]));
    
    // Extract fields from JWT payload
    return {
      id: decoded.sub || decoded.user_id || decoded.id || '',
      email: decoded.email || '',
      username: decoded.username || decoded.name || '',
      role: decoded.role,
      is_superuser: Boolean(decoded.is_superuser),
    };
  } catch (error) {
    console.error('[AuthContext] Error decoding token:', error);
    return null;
  }
}

function normalizeUser(profile: ApiUserProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    name: profile.full_name || profile.username,
    full_name: profile.full_name || undefined,
    role: profile.role || (profile.is_superuser ? 'admin' : undefined),
    is_superuser: Boolean(profile.is_superuser),
  };
}

async function fetchCurrentUser(authToken: string): Promise<User> {
  const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Could not load current user profile');
  }

  const profile: ApiUserProfile = await response.json();
  return normalizeUser(profile);
}

async function getUserForToken(authToken: string, fallbackUser?: User): Promise<User> {
  try {
    return await fetchCurrentUser(authToken);
  } catch (error) {
    console.warn('[AuthContext] Falling back to token/local user data:', error);
    const decodedUser = decodeToken(authToken);

    if (!decodedUser && fallbackUser) {
      return fallbackUser;
    }

    if (!decodedUser) {
      throw new Error('Invalid token format');
    }

    return {
      ...decodedUser,
      email: decodedUser.email || fallbackUser?.email || '',
      username: decodedUser.username || fallbackUser?.username || '',
      name: fallbackUser?.name || decodedUser.name,
      full_name: fallbackUser?.full_name || decodedUser.full_name,
      role: decodedUser.role || fallbackUser?.role,
      is_superuser: decodedUser.is_superuser || fallbackUser?.is_superuser,
    };
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const decoded = JSON.parse(atob(parts[1]));
    const expirationTime = (decoded.exp || 0) * 1000; // Convert to milliseconds

    if (expirationTime === 0) {
      // No expiration claim, consider valid
      return false;
    }

    return Date.now() >= expirationTime;
  } catch {
    return true;
  }
}

/**
 * Load token and user from localStorage
 */
function loadAuthFromStorage(): { token: string | null; user: User | null; isGuest: boolean } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const guestMode = localStorage.getItem(GUEST_KEY) === 'true';

    if (guestMode) {
      return { token: null, user: null, isGuest: true };
    }

    if (!token || !userJson) {
      return { token: null, user: null, isGuest: false };
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null, isGuest: false };
    }

    return {
      token,
      user: JSON.parse(userJson),
      isGuest: false,
    };
  } catch (error) {
    console.error('[AuthContext] Error loading auth from storage:', error);
    return { token: null, user: null, isGuest: false };
  }
}

/**
 * Save token and user to localStorage
 */
function saveAuthToStorage(token: string, user: User): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[AuthContext] Error saving auth to storage:', error);
  }
}

/**
 * Clear auth from localStorage
 */
function clearAuthFromStorage(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GUEST_KEY);
  } catch (error) {
    console.error('[AuthContext] Error clearing auth from storage:', error);
  }
}

// ========== Context Provider ==========

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    let isCancelled = false;

    const initializeAuth = async () => {
      const { token: storedToken, user: storedUser, isGuest: storedGuest } = loadAuthFromStorage();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        try {
          const currentUser = await getUserForToken(storedToken, storedUser);
          if (isCancelled) return;

          setUser(currentUser);
          saveAuthToStorage(storedToken, currentUser);
          console.log('[AuthContext] Restored auth from backend profile:', currentUser);
        } catch (authError) {
          console.error('[AuthContext] Stored auth is invalid:', authError);
          if (isCancelled) return;

          setToken(null);
          setUser(null);
          clearAuthFromStorage();
        }
      } else if (storedGuest) {
        setIsGuest(true);
        console.log('[AuthContext] Restored guest mode from localStorage');
      }

      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isCancelled = true;
    };
  }, []);

  // ========== Login ==========

   const login = useCallback(
     async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
       setIsLoading(true);
       setError(null);

       try {
         // Backend expects OAuth2PasswordRequestForm (form-encoded, not JSON)
         const formData = new URLSearchParams();
         formData.append('username', email);
         formData.append('password', password);

         const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/x-www-form-urlencoded',
           },
           body: formData.toString(),
         });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.detail || 'Login failed';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        const data = await response.json();
        const authToken = data.access_token || data.token;

        if (!authToken) {
          throw new Error('No token received from server');
        }

        const authenticatedUser = await getUserForToken(authToken);

        // Save to state and localStorage
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
        setToken(authToken);
        setUser(authenticatedUser);
        saveAuthToStorage(authToken, authenticatedUser);

        console.log('[AuthContext] Login successful:', authenticatedUser);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Login failed';
        setError(errorMsg);
        console.error('[AuthContext] Login error:', err);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ========== Register ==========

   const register = useCallback(
     async (email: string, password: string, username: string): Promise<{ success: boolean; error?: string }> => {
       setIsLoading(true);
       setError(null);

       try {
         const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ email, password, username, full_name: username }),
         });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.detail || 'Registration failed';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        const data = await response.json();
        const authToken = data.access_token || data.token;

        if (!authToken) {
          throw new Error('No token received from server');
        }

        // Decode token to extract user info
        const decodedUser = decodeToken(authToken);
        if (!decodedUser) {
          throw new Error('Invalid token format');
        }

        // Save to state and localStorage
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
        setToken(authToken);
        setUser(decodedUser);
        saveAuthToStorage(authToken, decodedUser);

        console.log('[AuthContext] Registration successful:', decodedUser);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Registration failed';
        setError(errorMsg);
        console.error('[AuthContext] Register error:', err);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ========== Logout ==========

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsGuest(false);
    clearAuthFromStorage();
    console.log('[AuthContext] Logout successful');
  }, []);

  const enterGuestMode = useCallback(() => {
    setError(null);
    setToken(null);
    setUser(null);
    setIsGuest(true);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.setItem(GUEST_KEY, 'true');
    } catch (storageError) {
      console.error('[AuthContext] Error enabling guest mode:', storageError);
    }
  }, []);

  // ========== Refresh Token ==========

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!token) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If refresh fails, logout user
        logout();
        return false;
      }

      const data = await response.json();
      const newToken = data.access_token || data.token;

      if (!newToken) {
        logout();
        return false;
      }

      // Update token
      setToken(newToken);
      if (user) {
        saveAuthToStorage(newToken, user);
      }

      console.log('[AuthContext] Token refreshed successfully');
      return true;
    } catch (err) {
      console.error('[AuthContext] Token refresh error:', err);
      logout();
      return false;
    }
  }, [token, user, logout]);

  // ========== Clear Error ==========

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ========== Context Value ==========

  const value: AuthContextType = {
    user,
    token,
    isGuest,
    isLoading,
    error,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    enterGuestMode,
    register,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ========== Hook for using AuthContext ==========

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export default AuthContext;
