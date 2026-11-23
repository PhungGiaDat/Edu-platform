/**
 * ArCardRejectedToast.tsx
 *
 * Claymorphic + Vibrant notification shown when a flashcard QR is rejected.
 *
 * Design:
 * - Claymorphic card: rounded corners (32px), soft warm shadows, cream background
 * - Vibrant accents: coral red (#FF6B6B) for error icon, sunset orange gradient
 * - Animated entrance: slide-up + scale with spring bounce
 * - Shows the rejected word and friendly error message
 * - "Try Again" button with tactile press effect
 */
import React, { useEffect, useState, useCallback } from 'react';

export interface ArCardRejectedData {
  qrId: string;
  word?: string;
  errorCode: string;
  errorMessage?: string;
}

interface ArCardRejectedToastProps {
  data: ArCardRejectedData;
  onDismiss: () => void;
  autoHideMs?: number;
}

// Error code → friendly Vietnamese message
const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  'MODEL_ASSET_UNAVAILABLE': {
    title: 'Ôi không! 😿',
    body: 'Card này chưa sẵn sàng. Hãy thử card khác nhé!',
  },
  'MIND_CATALOG_MISMATCH': {
    title: 'Sai bản đồ rồi! 🗺️',
    body: 'Card này không khớp với danh sách. Thử lại sau nhé!',
  },
  'MIND_TARGET_INDEX_INVALID': {
    title: 'Lỗi số thứ tự! 🔢',
    body: 'Card bị đánh sai vị trí. Báo cô giáo để sửa nhé!',
  },
  'CATALOG_FETCH_FAILED': {
    title: 'Mất kết nối! 📡',
    body: 'Không tải được danh sách card. Kiểm tra internet và thử lại nhé!',
  },
  'CATALOG_FETCH_NOT_FOUND': {
    title: 'Không tìm thấy! 🔍',
    body: 'Danh sách card bị mất. Báo cô giáo để cập nhật nhé!',
  },
  'QR_NOT_IN_CATALOG': {
    title: 'Card lạ! 🃏',
    body: 'Card này chưa được thêm vào danh sách. Thử card đã học nhé!',
  },
  'DEFAULT': {
    title: 'Ồ! Có lỗi rồi! ⚡',
    body: 'Có gì đó không đúng. Hãy thử quét lại nhé!',
  },
};

function getErrorMessage(errorCode: string): { title: string; body: string } {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['DEFAULT'];
}

// Sad cat SVG illustration
const SadCatIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Cat body */}
    <ellipse cx="40" cy="50" rx="24" ry="20" fill="#FF9F9F" />
    {/* Cat head */}
    <circle cx="40" cy="32" r="18" fill="#FF9F9F" />
    {/* Left ear */}
    <path d="M24 18 L28 28 L18 28 Z" fill="#FF9F9F" />
    {/* Right ear */}
    <path d="M56 18 L52 28 L62 28 Z" fill="#FF9F9F" />
    {/* Inner left ear */}
    <path d="M25 20 L27 26 L21 26 Z" fill="#FFD5D5" />
    {/* Inner right ear */}
    <path d="M55 20 L53 26 L59 26 Z" fill="#FFD5D5" />
    {/* Left eye - sad (looking down) */}
    <ellipse cx="34" cy="30" rx="3" ry="3.5" fill="#1A2744" />
    <circle cx="35" cy="31" r="1" fill="white" />
    {/* Right eye - sad */}
    <ellipse cx="46" cy="30" rx="3" ry="3.5" fill="#1A2744" />
    <circle cx="47" cy="31" r="1" fill="white" />
    {/* Eyebrows - sad (tilted up) */}
    <path d="M30 25 Q34 23 38 26" stroke="#1A2744" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M42 26 Q46 23 50 25" stroke="#1A2744" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Nose */}
    <ellipse cx="40" cy="36" rx="2" ry="1.5" fill="#D97070" />
    {/* Mouth - sad (inverted) */}
    <path d="M36 40 Q40 37 44 40" stroke="#1A2744" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Whiskers - droopy */}
    <line x1="20" y1="35" x2="30" y2="37" stroke="#D97070" strokeWidth="1" strokeLinecap="round" />
    <line x1="20" y1="39" x2="30" y2="39" stroke="#D97070" strokeWidth="1" strokeLinecap="round" />
    <line x1="60" y1="35" x2="50" y2="37" stroke="#D97070" strokeWidth="1" strokeLinecap="round" />
    <line x1="60" y1="39" x2="50" y2="39" stroke="#D97070" strokeWidth="1" strokeLinecap="round" />
    {/* Sweat drop */}
    <ellipse cx="58" cy="24" rx="3" ry="4" fill="#6EB9FF" opacity="0.7" />
    {/* Tear */}
    <ellipse cx="32" cy="38" rx="2" ry="3" fill="#6EB9FF" opacity="0.6" />
  </svg>
);

export const ArCardRejectedToast: React.FC<ArCardRejectedToastProps> = ({
  data,
  onDismiss,
  autoHideMs = 4000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { title, body } = getErrorMessage(data.errorCode);

  // Trigger entrance animation
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Auto-hide with exit animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 400); // Match exit animation duration
    }, autoHideMs);

    return () => clearTimeout(timer);
  }, [autoHideMs, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(onDismiss, 400);
  }, [onDismiss]);

  return (
    <>
      {/* Backdrop - semi-transparent */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'rgba(26, 39, 68, 0.3)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isVisible && !isLeaving ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
        aria-hidden="true"
      />

      {/* Toast Card */}
      <div
        role="alertdialog"
        aria-labelledby="rejected-title"
        aria-describedby="rejected-body"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: isLeaving
            ? 'translate(-50%, -50%) scale(0.85)'
            : isVisible
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -40%) scale(0.8)',
          opacity: isVisible && !isLeaving ? 1 : 0,
          zIndex: 99999,
          width: 'min(340px, calc(100vw - 48px))',
          background: 'linear-gradient(160deg, #FFF7EC 0%, #FFF0E0 100%)',
          borderRadius: '32px',
          border: '4px solid white',
          boxShadow: '0 8px 0 rgba(91,141,239,0.18), 0 16px 48px rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.8)',
          padding: '28px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px',
          transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease',
        }}
      >
        {/* Gradient top accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '6px',
          borderRadius: '0 0 12px 12px',
          background: 'linear-gradient(90deg, #FF9F9F, #FFB347, #FFD93D)',
        }} aria-hidden="true" />

        {/* Sad cat illustration */}
        <div style={{
          width: '80px',
          height: '80px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
          animation: 'catShake 0.6s ease-in-out',
        }}>
          <SadCatIllustration />
        </div>

        {/* Word badge (if we have the word) */}
        {data.word && (
          <div style={{
            background: 'linear-gradient(135deg, #FF9F9F, #FFB347)',
            color: 'white',
            fontSize: '15px',
            fontWeight: 800,
            padding: '6px 16px',
            borderRadius: '20px',
            boxShadow: '0 3px 0 #D97070',
            letterSpacing: '0.5px',
          }}>
            {data.word}
          </div>
        )}

        {/* Title */}
        <h2
          id="rejected-title"
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 900,
            color: '#1A2744',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h2>

        {/* Body message */}
        <p
          id="rejected-body"
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#4A5568',
            lineHeight: 1.5,
          }}
        >
          {body}
        </p>

        {/* QR ID trace (dev info, shown subtly) */}
        {data.qrId && (
          <div style={{
            fontSize: '11px',
            color: '#94A3B8',
            fontFamily: 'monospace',
          }}>
            {data.qrId}
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
          marginTop: '4px',
        }}>
          {/* Try Again */}
          <button
            onClick={handleDismiss}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'linear-gradient(160deg, #5B8DEF, #3A8FD1)',
              border: '3px solid white',
              borderRadius: '20px',
              boxShadow: '0 6px 0 #2B5BA0',
              color: 'white',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'transform 100ms ease, box-shadow 100ms ease',
              letterSpacing: '0.3px',
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(4px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 0 #2B5BA0';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 0 #2B5BA0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 0 #2B5BA0';
            }}
          >
            📷 Quét lại
          </button>

          {/* Dismiss (X button style) */}
          <button
            onClick={handleDismiss}
            aria-label="Đóng thông báo"
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(160deg, #F3F4F6, #E5E7EB)',
              border: '3px solid white',
              borderRadius: '16px',
              boxShadow: '0 4px 0 #9CA3AF',
              color: '#4A5568',
              fontSize: '20px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 100ms ease, box-shadow 100ms ease',
              flexShrink: 0,
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 0 #9CA3AF';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 0 #9CA3AF';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 0 #9CA3AF';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <style>{`
        @keyframes catShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-4px) rotate(-5deg); }
          40% { transform: translateX(4px) rotate(5deg); }
          60% { transform: translateX(-2px) rotate(-3deg); }
          80% { transform: translateX(2px) rotate(2deg); }
        }
      `}</style>
    </>
  );
};
