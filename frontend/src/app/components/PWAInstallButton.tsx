/**
 * PWAInstallButton - UI component for "Add to Home Screen"
 * Shows install prompt or iOS instructions
 */
import { useState } from 'react';
import { usePWAInstall, isIOS, showIOSInstallInstructions } from '@/hooks/usePWAInstall';
import { colors, shadows, radius } from '@/design-tokens/claymorphic';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'chip';
  className?: string;
}

export function PWAInstallButton({ variant = 'button', className = '' }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isStandalone, install } = usePWAInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  // Already installed
  if (isInstalled || isStandalone) {
    return null;
  }

  // iOS device - show custom instructions
  if (isIOS()) {
    if (showIOSHelp) {
      return (
        <div
          className={`pwa-install-surface fixed bottom-20 left-4 right-4 z-50 p-4 rounded-${radius['3xl']} ${className}`}
          style={{
            backgroundColor: colors.warmWhite,
            boxShadow: shadows.clay,
          }}
        >
          <h3 className="text-lg font-bold mb-3" style={{ color: colors.deepSlate }}>
            📱 Cài đặt EduAR
          </h3>
          <ol className="text-sm space-y-2 mb-4" style={{ color: colors.mediumGray }}>
            <li>1. Nhấn nút Chia sẻ <span className="text-xl">⬆️</span> ở dưới màn hình Safari</li>
            <li>2. Cuộn xuống và nhấn <strong>"Thêm vào Màn hình chính"</strong></li>
            <li>3. Nhấn <strong>"Thêm"</strong> ở góc trên bên phải</li>
          </ol>
          <button
            onClick={() => setShowIOSHelp(false)}
            className="w-full py-2 rounded-xl font-semibold text-white"
            style={{
              backgroundColor: colors.skyBlue,
              boxShadow: shadows.clayBlue,
            }}
          >
            Đã hiểu!
          </button>
        </div>
      );
    }

    if (variant === 'chip') {
      return (
        <button
          onClick={() => showIOSInstallInstructions()}
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${className}`}
          style={{
            backgroundColor: colors.sunshineYellow,
            boxShadow: shadows.clayYellow,
          }}
        >
          <span className="text-lg">📱</span>
          <span className="font-semibold" style={{ color: colors.deepSlate }}>
            Thêm vào màn hình
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={() => setShowIOSHelp(true)}
        className={`flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-bold ${className}`}
        style={{
          backgroundColor: colors.sunshineYellow,
          boxShadow: shadows.clayYellow,
          color: colors.deepSlate,
        }}
      >
        <span className="text-2xl">📱</span>
        <span>Thêm vào Màn hình chính</span>
      </button>
    );
  }

  // Android/Desktop - use native install prompt
  if (canInstall && variant === 'banner') {
    return (
      <div
        className={`pwa-install-surface fixed bottom-20 left-4 right-4 z-50 p-4 rounded-${radius['3xl']} flex items-center gap-4 ${className}`}
        style={{
          backgroundColor: colors.warmWhite,
          boxShadow: shadows.clay,
        }}
      >
        <div className="flex-1">
          <p className="font-bold" style={{ color: colors.deepSlate }}>
            Cài đặt EduAR
          </p>
          <p className="text-sm" style={{ color: colors.mediumGray }}>
            Truy cập nhanh từ màn hình chính
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={install}
            className="px-4 py-2 rounded-xl font-semibold text-white"
            style={{
              backgroundColor: colors.mintGreen,
              boxShadow: shadows.clayGreen,
            }}
          >
            Cài đặt
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl font-semibold"
            style={{
              backgroundColor: colors.lightGray,
              color: colors.deepSlate,
            }}
          >
            Bỏ qua
          </button>
        </div>
      </div>
    );
  }

  if (canInstall && variant === 'chip') {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${className}`}
        style={{
          backgroundColor: colors.sunshineYellow,
          boxShadow: shadows.clayYellow,
        }}
      >
        <span className="text-lg">📲</span>
        <span className="font-semibold" style={{ color: colors.deepSlate }}>
          Cài đặt app
        </span>
      </button>
    );
  }

  return null;
}

export default PWAInstallButton;
