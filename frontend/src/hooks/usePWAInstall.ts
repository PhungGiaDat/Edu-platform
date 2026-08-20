/**
 * usePWAInstall - Hook for PWA installation prompt
 * Handles "Add to Home Screen" functionality for iOS/Android
 */
import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallPrompt {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<void>;
  dismiss: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall(): PWAInstallPrompt {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (added to home screen)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      const fullscreen = (window.navigator as Navigator & { standalone?: boolean }).standalone;
      setIsStandalone(!!(standalone || fullscreen));
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);

    return () => {
      mediaQuery.removeEventListener('change', checkStandalone);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setCanInstall(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setCanInstall(false);
    setDeferredPrompt(null);
  }, []);

  return {
    canInstall,
    isInstalled,
    isStandalone,
    deferredPrompt,
    install,
    dismiss,
  };
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Get iOS version
 */
export function getIOSVersion(): number | null {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Show iOS install instructions
 */
export function showIOSInstallInstructions(): void {
  const instructions = `
📱 **Cài đặt EduAR lên màn hình chính**

**Trên iPhone/iPad:**
1. Mở Safari và truy cập EduAR
2. Nhấn nút Chia sẻ (⬆️) ở dưới màn hình
3. Cuộn xuống và nhấn "Thêm vào Màn hình chính"
4. Nhấn "Thêm" ở góc trên bên phải

**Trên Android:**
1. Mở Chrome và truy cập EduAR
2. Nhấn biểu tượng menu (⋮) ở góc trên bên phải
3. Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính"

Sau khi cài đặt, ứng dụng sẽ xuất hiện trên màn hình chính như một ứng dụng thông thường! 🎉
  `;
  alert(instructions);
}
