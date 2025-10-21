// src/hooks/useArQrScanner.ts

import { useState, useEffect, useRef, MutableRefObject } from 'react';
import { detectQRService } from '../services/DetectQrService';

/**
 * Hook chuyên dụng để quét QR code từ một luồng video có sẵn (từ AR.js).
 * v18.0: Continuous scanning with proper cleanup and state management.
 * @param arVideoRef - Ref chứa element video đang được sử dụng bởi AR.js.
 * @param enabled - Cờ để bật/tắt vòng lặp quét.
 * @returns qrId - ID của QR code tìm thấy (null nếu chưa tìm thấy).
 */
export function useArQrScanner(
  arVideoRef: MutableRefObject<HTMLVideoElement | null>,
  enabled: boolean
) {
  const [qrId, setQrId] = useState<string | null>(null);
  const isScanningRef = useRef<boolean>(false); // ✅ Use ref to avoid stale closure

  useEffect(() => {
    // ✅ Guard: Chỉ chạy khi được kích hoạt và đã có video element
    if (!enabled || !arVideoRef.current) {
      console.log('⏸️ QR Scanner paused:', { enabled, hasVideo: !!arVideoRef.current });
      return;
    }

    const arVideoElement = arVideoRef.current;
    console.log('🔍 useArQrScanner v18.0: Starting continuous QR scan...');
    
    isScanningRef.current = true;

    const scanLoop = async () => {
      while (isScanningRef.current) {
        // ✅ Check if video is ready (HAVE_CURRENT_DATA or higher)
        if (arVideoElement.readyState >= 2) {
          try {
            console.log('🔄 Attempting QR scan...'); // ✅ ADD THIS
            const result = await detectQRService.decodeFromVideo(arVideoElement);
            
            if (result && isScanningRef.current) {
              console.log(`✅ QR Code detected: ${result}`);
              setQrId(result);
              // ✅ DON'T stop scanning here - let parent control via enabled flag
            }
          } catch (error) {
            console.log('❌ Scan error:', error); // ✅ ADD THIS
            // ✅ ZXing throws error when no QR found - this is normal
            // Silent fail to avoid console spam
          }
        } else {
          console.log('⏳ Video not ready, readyState:', arVideoElement.readyState); // ✅ ADD THIS
        }

        // ✅ Throttle: Wait before next scan (500ms for better responsiveness)
        if (isScanningRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    // ✅ Wait for video to have data before starting scan loop
    const startScanning = () => {
      if (arVideoElement.readyState >= 2) {
        console.log('▶️ Video ready, starting scan loop');
        scanLoop();
      } else {
        console.log('⏳ Waiting for video data...');
        const onLoadedData = () => {
          console.log('▶️ Video data loaded, starting scan loop');
          scanLoop();
        };
        arVideoElement.addEventListener('loadeddata', onLoadedData, { once: true });
      }
    };

    startScanning();

    // ✅ Cleanup: Stop scanning when component unmounts or enabled changes
    return () => {
      console.log('🛑 useArQrScanner v18.0: Stopping QR scan');
      isScanningRef.current = false;
    };
  }, [arVideoRef, enabled]);

  return { qrId };
}