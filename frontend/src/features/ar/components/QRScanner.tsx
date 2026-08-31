/**
 * QRScanner.tsx
 *
 * React component that runs jsQR scanning directly in the browser runtime.
 * Replaces the ar-scanner.html iframe from the 3-iframe architecture.
 *
 * On QR detected: stops camera first, then calls onDetected(qrId) — no postMessage bridge.
 *
 * jsQR is loaded via dynamic script injection from the vendored local copy at
 * /static/vendor/jsQR-1.4.0.min.js (public/ directory).
 *
 * Camera lifecycle: the camera effect depends ONLY on [active]. Callbacks are stored
 * in a ref so they never restart the camera — only unmounting or active=false does.
 */

import React, { useEffect, useRef } from 'react';

// jsQR UMD global — injected at runtime via loadJsQR()
declare global {
  interface Window {
    jsQR?: (
      data: Uint8ClampedArray,
      width: number,
      height: number,
      options?: {
        inversionAttempts?: string;
        canBreak?: boolean;
      }
    ) => { data: string } | null;
  }
}

export interface QRScannerProps {
  onDetected: (qrId: string) => void;
  onReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
  active?: boolean;
  debug?: boolean;
}

const JSQR_SRC = '/static/vendor/jsQR-1.4.0.min.js';

function loadJsQR(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.jsQR !== 'undefined') {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = JSQR_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load jsQR'));
    document.head.appendChild(script);
  });
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onDetected,
  onReady,
  onError,
  active = true,
  debug = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDetectedRef = useRef(false);

  // Stable ref holding the latest callbacks — camera effect never restarts on callback identity change
  const callbacksRef = useRef({ onDetected, onReady, onError });
  useEffect(() => {
    callbacksRef.current = { onDetected, onReady, onError };
  }, [onDetected, onReady, onError]);

  // ---- Camera effect: depends ONLY on [active] — callbacks never restart camera ----
  useEffect(() => {
    if (!active) return;

    let mounted = true;

    async function startCamera() {
      try {
        await loadJsQR();

        if (!mounted) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        callbacksRef.current.onReady?.(stream);
        startScan();
      } catch (err) {
        if (!mounted) return;
        callbacksRef.current.onError?.(
          err instanceof Error ? err.message : 'Camera error',
        );
      }
    }

    startCamera();

    return () => {
      mounted = false;

      // Stop scan loop
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // Stop camera tracks
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
    };
  }, [active]); // <-- only active controls camera lifecycle

  // ---- jsQR polling loop ----
  function startScan() {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    function scan() {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR?.(
        imageData.data,
        imageData.width,
        imageData.height,
      );

      if (code && !isDetectedRef.current) {
        isDetectedRef.current = true;

        // Stop scan loop
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }

        // Stop camera tracks FIRST — then call onDetected
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.pause();
        }

        callbacksRef.current.onDetected(code.data);
        return;
      }

      animFrameRef.current = requestAnimationFrame(scan);
    }

    animFrameRef.current = requestAnimationFrame(scan);
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
      {debug && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: 11,
            padding: '4px 12px',
            borderRadius: 20,
            zIndex: 9999,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Scanning...
        </div>
      )}
    </div>
  );
};

export default QRScanner;
