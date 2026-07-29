import * as SecureStore from 'expo-secure-store';
import { useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/secureStorage';

export interface UseAuthReturn {
  token: string | null;
  loading: boolean;
  saveToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const t = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!cancelled) { setToken(t); setLoading(false); }
      } catch {
        if (!cancelled) { setToken(null); setLoading(false); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const saveToken = useCallback(async (newToken: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const clearToken = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  }, []);

  const isAuthenticated = !!token;

  return { token, loading, saveToken, clearToken, isAuthenticated };
};
