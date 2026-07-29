import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './navigation/AppNavigator';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { isAuthenticated, loading, saveToken, clearToken } = useAuth();

  const handleLoginSuccess = useCallback(() => {
    // Navigation will automatically update due to isAuthenticated state change
    console.log('Login successful');
  }, []);

  const handleLogout = useCallback(async () => {
    await clearToken();
  }, [clearToken]);

  if (loading) {
    // Could add a splash screen here
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator
        isAuthenticated={isAuthenticated}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </>
  );
}
