import { useEffect, useRef, useCallback } from 'react';
import { VerifySocket, type VerifyResult } from '../services/WebSocketQRServices';
import { captureFrame } from '../services/RealtimeQRServices';

/**
 * Custom hook để quản lý WebSocket verification
 * Isolated logic để tránh infinite loops trong component chính
 */
export function useVerifySocket(
  wsUrl: string,
  currentQrId: string | null,
  arVideo: HTMLVideoElement | null,
  onVerificationResult: (result: VerifyResult) => void
) {
  const socketRef = useRef<VerifySocket>();
  const verifyTimerRef = useRef<number>();
  const isActiveRef = useRef(false);

  // Memoized callback để tránh re-creation
  const handleVerificationResult = useCallback((result: VerifyResult) => {
    console.log('📨 Verification result:', result);
    onVerificationResult(result);
  }, [onVerificationResult]);

  // Setup WebSocket connection (chỉ chạy khi wsUrl thay đổi)
  useEffect(() => {
    if (!wsUrl) return;

    const initSocket = async () => {
      try {
        const socket = new VerifySocket(
          wsUrl,
          handleVerificationResult,
          (error: unknown) => console.error('❌ WebSocket error:', error),
          () => console.log('🔗 WebSocket connected'),
          () => console.log('🔌 WebSocket disconnected')
        );

        await socket.connect();
        socketRef.current = socket;
        console.log('✅ Verification socket initialized');
      } catch (error) {
        console.error('❌ Failed to initialize verification socket:', error);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = undefined;
      }
    };
  }, [wsUrl, handleVerificationResult]);

  // Start/stop verification based on QR and video availability
  useEffect(() => {
    // Clear existing timer
    if (verifyTimerRef.current) {
      clearInterval(verifyTimerRef.current);
      verifyTimerRef.current = undefined;
    }

    // Only start verification if we have all required data
    if (!currentQrId || !arVideo || !socketRef.current) {
      isActiveRef.current = false;
      return;
    }

    isActiveRef.current = true;
    
    // Reset failure counter for new QR
    socketRef.current.resetFailures();

    const startVerification = async () => {
      if (!isActiveRef.current || !socketRef.current || !arVideo) return;

      try {
        const frameBlob = await captureFrame(arVideo, 'image/jpeg', 0.92);
        socketRef.current.sendFrame(currentQrId, frameBlob);
      } catch (error) {
        console.warn('Frame capture failed:', error);
      }
    };

    // Initial verification sau 2 seconds
    const initialTimeout = setTimeout(startVerification, 2000);

    // Periodic verification mỗi 8 seconds
    verifyTimerRef.current = window.setInterval(startVerification, 8000);

    return () => {
      isActiveRef.current = false;
      clearTimeout(initialTimeout);
      if (verifyTimerRef.current) {
        clearInterval(verifyTimerRef.current);
      }
    };
  }, [currentQrId, arVideo]); // Chỉ dependency cần thiết

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (verifyTimerRef.current) {
        clearInterval(verifyTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    isConnected: socketRef.current?.connected ?? false,
    resetFailures: () => socketRef.current?.resetFailures()
  };
}
