/**
 * ARContainerXR.tsx
 *
 * 8th Wall AR Container - Additive component, does NOT modify ARContainerV2.
 * Shares the same ARContainerV2 interface/contract for consistent parent usage.
 *
 * Usage:
 *   <ARContainerXR
 *     deckId="claymorphic-animals-001"
 *     engine="xr"
 *     targets={xrTargets}
 *     modelUrl={modelUrl}
 *     onTargetFound={...}
 *     onTargetLost={...}
 *     onComboDetected={...}
 *   />
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  XREngine,
  XRTargetData,
  getXRTargetJSONs,
} from '@/lib/xr-engine-adapter';
import {
  ARMessage,
  normalizeMessage,
} from '@/core/types/ARMessages';

// ========== TYPES ==========
export type ARPhase = 'IDLE' | 'SCANNING' | 'LOADING' | 'VIEWING' | 'ERROR';

export interface ARContainerXRProps {
  /** Engine type - for compatibility with engine selection */
  engine?: XREngine;
  /** Deck ID for API calls */
  deckId?: string;
  /** XR target data from database */
  targets?: XRTargetData[];
  /** Model URL for 3D content */
  modelUrl?: string;
  /** Deck name for display */
  deckName?: string;
  /** Initial phase */
  initialPhase?: ARPhase;
  /** Called when AR system is ready */
  onReady?: () => void;
  /** Called when target is found */
  onTargetFound?: (targetIndex: number, qrId: string) => void;
  /** Called when target is lost */
  onTargetLost?: (targetIndex: number) => void;
  /** Called when combo is detected (2 targets tracked) */
  onComboDetected?: (targets: number[]) => void;
  /** Called when error occurs */
  onError?: (error: string, code?: string) => void;
  /** Called when phase changes */
  onPhaseChange?: (phase: ARPhase) => void;
  /** Called when model is clicked */
  onModelClick?: (modelId: string, targetIndex?: number) => void;
  /** Children (overlays, controls) */
  children?: React.ReactNode;
}

// ========== COMPONENT ==========
export const ARContainerXR: React.FC<ARContainerXRProps> = ({
  engine = 'xr',
  deckId,
  targets = [],
  modelUrl,
  deckName,
  initialPhase = 'LOADING',
  onReady,
  onTargetFound,
  onTargetLost,
  onComboDetected,
  onError,
  onPhaseChange,
  onModelClick,
  children,
}) => {
  const [phase, setPhase] = useState<ARPhase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [foundTargets, setFoundTargets] = useState<Set<number>>(new Set());

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callbacksRef = useRef({
    onTargetFound,
    onTargetLost,
    onComboDetected,
    onError,
    onPhaseChange,
    onModelClick,
    onReady,
  });

  // Update callbacks ref when props change
  useEffect(() => {
    callbacksRef.current = {
      onTargetFound,
      onTargetLost,
      onComboDetected,
      onError,
      onPhaseChange,
      onModelClick,
      onReady,
    };
  }, [
    onTargetFound,
    onTargetLost,
    onComboDetected,
    onError,
    onPhaseChange,
    onModelClick,
    onReady,
  ]);

  const transitionTo = useCallback((newPhase: ARPhase) => {
    if (newPhase === phase) return;
    console.log(`[ARContainerXR] Phase: ${phase} → ${newPhase}`);
    setPhase(newPhase);
    callbacksRef.current.onPhaseChange?.(newPhase);
  }, [phase]);

  // ========== BUILD VIEWER URL ==========
  const viewerSrc = useMemo(() => {
    const params = new URLSearchParams();

    // Add deck info
    if (deckName) params.set('deck', deckName);
    if (deckId) params.set('deckId', deckId);

    // Add model URL if provided
    if (modelUrl) params.set('model', modelUrl);

    // Add XR target JSON URLs for 8th Wall
    const xrTargets = getXRTargetJSONs(targets);
    if (xrTargets.length > 0) {
      const targetList = xrTargets.map(t => t.jsonUrl).join(',');
      params.set('targets', targetList);
      params.set('targetCount', String(xrTargets.length));
    }

    // 8th Wall tuning params
    params.set('antialias', 'true');
    params.set('shadowEnabled', 'true');

    return `/ar-xr.html?${params.toString()}`;
  }, [targets, modelUrl, deckName, deckId]);

  // ========== MESSAGE HANDLING ==========
  const handleMessage = useCallback((event: MessageEvent) => {
    // Only handle messages from our iframe
    if (event.source !== iframeRef.current?.contentWindow) return;

    const msg = normalizeMessage(event.data);
    if (!msg) return;

    const { type, payload } = msg as ARMessage;

    switch (type) {
      case 'SYSTEM_READY':
      case 'AR_READY': {
        console.log('[ARContainerXR] AR Ready', payload);
        setIsReady(true);
        transitionTo('VIEWING');
        callbacksRef.current.onReady?.();
        break;
      }

      case 'TARGET_FOUND': {
        const data = payload as { targetIndex: number; qrId?: string };
        console.log('[ARContainerXR] Target Found:', data);

        // Update found targets
        setFoundTargets(prev => {
          const next = new Set(prev);
          next.add(data.targetIndex);
          return next;
        });

        callbacksRef.current.onTargetFound?.(
          data.targetIndex,
          data.qrId || `target_${data.targetIndex}`
        );

        // Check for combo (2+ targets found)
        const currentFound = foundTargets;
        if (currentFound.size >= 1) {
          const allTargets = [...currentFound, data.targetIndex];
          if (allTargets.length === 2) {
            callbacksRef.current.onComboDetected?.(allTargets);
          }
        }
        break;
      }

      case 'TARGET_LOST': {
        const data = payload as { targetIndex: number };
        console.log('[ARContainerXR] Target Lost:', data);

        // Update found targets
        setFoundTargets(prev => {
          const next = new Set(prev);
          next.delete(data.targetIndex);
          return next;
        });

        callbacksRef.current.onTargetLost?.(data.targetIndex);
        break;
      }

      case 'MODEL_CLICKED': {
        const data = payload as { modelId: string; targetIndex?: number };
        callbacksRef.current.onModelClick?.(data.modelId, data.targetIndex);
        break;
      }

      case 'COMBO_DETECTED': {
        const data = payload as { targets: number[] };
        callbacksRef.current.onComboDetected?.(data.targets);
        break;
      }

      case 'SYSTEM_ERROR': {
        const data = payload as { error?: string; message?: string; code?: string };
        const errorMsg = data.error || data.message || 'Unknown error';
        console.error('[ARContainerXR] Error:', errorMsg, data.code);

        setError(errorMsg);
        transitionTo('ERROR');
        callbacksRef.current.onError?.(errorMsg, data.code);
        break;
      }

      case 'SCANNER_ERROR': {
        const data = payload as { error?: string };
        const errorMsg = data.error || 'Scanner error';
        setError(errorMsg);
        transitionTo('ERROR');
        callbacksRef.current.onError?.(errorMsg);
        break;
      }
    }
  }, [transitionTo, foundTargets]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // ========== SEND TO IFRAME ==========
  const sendToIframe = useCallback((type: string, data: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage({ type, ...data }, '*');
  }, []);

  // ========== HANDLE SCAN AGAIN ==========
  const handleScanAgain = useCallback(() => {
    setError(null);
    setIsReady(false);
    setFoundTargets(new Set());
    transitionTo('LOADING');
    sendToIframe('RESUME_SCANNING');
  }, [transitionTo, sendToIframe]);

  // ========== RENDER ==========
  return (
    <div
      className="ar-container-xr"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        zIndex: 99999,
      }}
    >
      {/* Error Overlay */}
      {phase === 'ERROR' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            color: '#FF6B6B',
            padding: 20,
          }}
        >
          <svg
            width={48}
            height={48}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF6B6B"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={12} cy={12} r={10} />
            <line x1={15} y1={9} x2={9} y2={15} />
            <line x1={9} y1={9} x2={15} y2={15} />
          </svg>
          <p style={{ marginTop: 16, textAlign: 'center' }}>
            {error || "AR couldn't start. Let's try again."}
          </p>
          <button
            onClick={handleScanAgain}
            style={{
              marginTop: 24,
              padding: '12px 24px',
              background: '#4ECDC4',
              border: 'none',
              borderRadius: 20,
              color: '#fff',
              cursor: 'pointer',
              minHeight: 48,
              minWidth: 120,
              fontSize: 16,
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Iframe - 8th Wall AR */}
      {viewerSrc && (
        <iframe
          ref={iframeRef}
          key={`xr-viewer-${deckId || 'default'}`}
          src={viewerSrc}
          onLoad={() => {
            console.log('[ARContainerXR] iframe loaded', viewerSrc);
          }}
          allow="camera; microphone; autoplay; fullscreen; xr-spatial-tracking"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Loading Overlay (while iframe loads) */}
      {phase === 'LOADING' && !isReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid rgba(255,255,255,0.2)',
              borderTopColor: '#4ECDC4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ marginTop: 16, fontSize: 18 }}>
            Loading 8th Wall AR...
          </p>
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
            Point camera at a flashcard
          </p>
        </div>
      )}

      {/* Overlays (controls, info) */}
      <div style={{ position: 'relative', zIndex: 100 }}>{children}</div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: 8,
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'monospace',
            zIndex: 1000,
          }}
        >
          <div>Engine: {engine}</div>
          <div>Phase: {phase}</div>
          <div>Targets: {foundTargets.size}/{targets.length}</div>
          <div>Ready: {isReady ? 'YES' : 'NO'}</div>
        </div>
      )}
    </div>
  );
};

export default ARContainerXR;
