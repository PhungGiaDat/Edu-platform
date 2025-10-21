// src/hooks/useVerificationSocket.ts

import { useEffect, useRef } from 'react';
import { createVerifySocket } from '../services/WebSocketQRServices';
import type { VerifyResult } from '../services/WebSocketQRServices';
import { getWsUrl } from '../config'; // ✅ Import config

const VERIFY_INTERVAL = 8000;

export function useVerificationSocket(
  qrId: string | null,
  arVideoElement: HTMLVideoElement | null,
  enabled: boolean
) {
  const socketRef = useRef<ReturnType<typeof createVerifySocket> | null>(null);

  useEffect(() => {
    if (!enabled || !qrId) {
      if (socketRef.current) { 
        socketRef.current.close(); 
        socketRef.current = null; 
      }
      return;
    }

    if (!socketRef.current) {
      // ✅ Dynamic WebSocket URL
      const WS_URL = `${getWsUrl()}/ws/qr/verify`;
      
      socketRef.current = createVerifySocket(WS_URL, (result: VerifyResult) => {
        if (!result.valid) {
          console.warn(`Verification failed for QR: ${qrId}`, result.reason);
        }
      });
      
      socketRef.current.connect().catch(err => 
        console.error("Failed to connect WebSocket:", err)
      );
    }

    const sendFrame = () => {
      if (!arVideoElement || !socketRef.current?.connected || arVideoElement.videoWidth === 0) {
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = arVideoElement.videoWidth;
      canvas.height = arVideoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(arVideoElement, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        socketRef.current.sendFrameBase64(qrId, base64);
      }
    };

    const intervalId = setInterval(sendFrame, VERIFY_INTERVAL);

    return () => {
      clearInterval(intervalId);
      if (socketRef.current) { 
        socketRef.current.close(); 
        socketRef.current = null; 
      }
    };
  }, [enabled, qrId, arVideoElement]);
}
