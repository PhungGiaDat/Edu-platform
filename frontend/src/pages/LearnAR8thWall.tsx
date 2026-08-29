// @ts-nocheck
/**
 * LearnAR8thWall.tsx
 *
 * Standalone 8th Wall AR page — ZERO overlap with MindAR.
 * Flow: Scanner (ar-scanner.html iframe) → Fetch XR target per QR → Viewer (ar-xr.html iframe)
 *
 * Route: /learn-ar-xr
 * Route: /learn-ar-xr/:deckId
 *
 * State machine:
 *   SCANNING  → show ar-scanner.html (jsQR camera)
 *   LOADING   → show spinner while fetching XR target data
 *   VIEWING   → show ar-xr.html (8th Wall XR engine)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegramSync } from '@/hooks/useTelegramSync';
import '../styles/LearnAR8thWall.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://edu-platform-api-do20.onrender.com';

type Phase =
  | 'SCANNING'
  | 'LOADING_TARGET'
  | 'RELEASING_CAMERA'
  | 'XR_BOOTING'
  | 'VIEWING'
  | 'ERROR';

/** XR target data for one flashcard, fetched after QR scan */
interface XRTarget {
  qr_id: string;
  word: string;
  xr_target_json_url?: string;
  xr_target_image_url?: string;
  model_3d_url?: string;
  texture_url?: string;
  animations?: string[];
  default_animation?: string;
  combo_animation?: string;
  position?: string;
  rotation?: string;
  scale?: string;
}

export const LearnAR8thWall: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();

  const deckIdRef = useRef(deckId || 'claymorphic-animals-001');

  // Scanner iframe ref
  const scannerRef = useRef<HTMLIFrameElement>(null);
  // Viewer iframe ref
  const viewerRef = useRef<HTMLIFrameElement>(null);
  // Retry timer for RELEASE_CAMERA postMessage (cleared on SCANNER_CAMERA_RELEASED)
  const releaseRetryRef = useRef<number | null>(null);

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('SCANNING');

  // Debug: log phase changes
  useEffect(() => {
    console.log('[LearnAR8thWall] Phase changed to:', phase);
    console.log('[LearnAR8thWall] Scanner iframe:', scannerRef.current ? 'exists' : 'null');
  }, [phase]);

  // Current scanned target
  const [currentTarget, setCurrentTarget] = useState<XRTarget | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // All scanned cards this session
  const [foundCards, setFoundCards] = useState<Set<string>>(new Set());

  // Buffer AR_DEBUG messages from viewer iframe for Telegram sync
  const arDebugBufferRef = useRef<string[]>([]);

  // Parent-side trace logs for Telegram sync (React state, always accessible)
  const [parentTraceLogs, setParentTraceLogs] = useState<string[]>([]);

  // Helper: push timestamped trace into parentTraceLogs state
  const trace = (label: string, detail: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    const entry = `${ts} [${label}] ${detail}`;
    setParentTraceLogs(prev => {
      const next = [...prev, entry];
      return next.length > 200 ? next.slice(-200) : next;
    });
  };

  // Telegram Sync integration
  const { syncTelegram, syncStatus, iframeLogs } = useTelegramSync({
    iframeRef: viewerRef,
    flashcardCount: foundCards.size || 1,
    getParentLogs: () => {
      const arDebug = arDebugBufferRef.current.join('\n') || 'No AR_DEBUG logs';
      const traces = parentTraceLogs.join('\n') || 'No parent traces';
      return `=== PARENT TRACES ===\n${traces}\n\n=== AR_DEBUG BUFFER ===\n${arDebug}`;
    },
    getActiveEngine: () => '8th-wall',
  });

  // Keyboard shortcut for Telegram sync (Ctrl+Shift+S)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        syncTelegram();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [syncTelegram]);

  // ========================================================================
  // LISTEN: QR_DETECTED from scanner iframe
  // ========================================================================
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      // Log all incoming messages for debugging
      console.log('[LearnAR8thWall:message]', data.type, data);

      // Handle debug bridge messages from scanner
      if (data.type === 'AR_DEBUG') {
        console.log('[LearnAR8thWall:scanner]', data.payload?.label, data.payload?.details);
        return;
      }

      // Orchestrator: wait for camera release before mounting viewer
      if (data.type === 'SCANNER_CAMERA_RELEASED') {
        console.log('[LearnAR8thWall] Scanner camera released — mounting viewer');
        trace('SCANNER_CAMERA_RELEASED', 'Camera released, transitioning to XR_BOOTING');
        // Clear any pending retry timer — release succeeded.
        if (releaseRetryRef.current) {
          clearTimeout(releaseRetryRef.current);
          releaseRetryRef.current = null;
        }
        // Move to XR_BOOTING — this mounts the viewer iframe.
        // The XR engine will boot inside it; we only go to VIEWING once
        // we receive XR_CAMERA_HAS_VIDEO from the viewer.
        setPhase('XR_BOOTING');
        trace('XR_BOOTING', 'ar-xr.html iframe loading, XR engine initializing...');
        return;
      }

      if (data.type !== 'QR_DETECTED') return;

      // Scanner sends: { type: 'QR_DETECTED', qrId: 'cat001', timestamp: ... }
      // Some senders nest it in payload — handle both shapes.
      const qrId = data.qrId || data.payload?.qrId;
      if (!qrId) return;

      console.log('[LearnAR8thWall] QR detected:', qrId);

      // Prevent re-scanning the same card in this session
      if (foundCards.has(qrId)) {
        trace('QR_DUPLICATE', `Already scanned: ${qrId}`);
        return;
      }

      // Orchestrator step 1: fetch XR metadata while scanner is still running
      setPhase('LOADING_TARGET');
      setCurrentTarget(null);
      setScanError(null);

      trace('QR_DETECTED_PARENT', `QR=${qrId} → PHASE=LOADING_TARGET`);

      try {
        // Fetch XR target data for this specific QR
        const res = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}/xr-urls`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const raw = await res.json();
        trace('API_RESPONSE', JSON.stringify(raw).substring(0, 200));

        // Build XRTarget from API response
        const target: XRTarget = {
          qr_id: qrId,
          word: raw.word || qrId.replace('001', ''),
          // 8th Wall needs the compiled target JSON (from Supabase)
          xr_target_json_url: raw.tracking_target?.xr_target_json_url || raw.xr_target_json_url,
          xr_target_image_url: raw.tracking_target?.xr_target_image_url || raw.xr_target_image_url,
          model_3d_url: raw.target?.model_3d_url || raw.model_3d_url,
          texture_url: raw.target?.texture_url || raw.texture_url,
          animations: raw.target?.animations || raw.animations,
          default_animation: raw.target?.default_animation || raw.default_animation || 'IDLE',
          combo_animation: raw.target?.combo_animation || raw.combo_animation,
          position: raw.target?.position || '0 0 0',
          rotation: raw.target?.rotation || '0 0 0',
          scale: raw.target?.scale || '1 1 1',
        };

        trace('XR_TARGET_BUILT', JSON.stringify(target).substring(0, 300));

        if (!target.xr_target_json_url && !target.xr_target_image_url) {
          throw new Error(`No XR target URL for: ${qrId}`);
        }

        // Store target — do NOT transition phase yet.
        // Scanner stays alive throughout LOADING_TARGET and RELEASING_CAMERA.
        setCurrentTarget(target);
        setFoundCards(prev => new Set([...prev, qrId]));

        // Orchestrator step 2: transition to RELEASING_CAMERA
        // Scanner iframe stays mounted so we can send RELEASE_CAMERA to it.
        setPhase('RELEASING_CAMERA');
        trace('RELEASING_CAMERA', 'Camera release in progress...');

        // Orchestrator step 3: tell scanner to release camera BEFORE XR starts
        // CRITICAL on iOS Safari — 8th Wall needs sole camera access.
        // Guard: throw if scannerRef is already gone (would indicate a bug).
        const scannerWindow = scannerRef.current?.contentWindow;

        trace('CAMERA_RELEASE_SEND_ATTEMPT', JSON.stringify({
          scannerRefExists: !!scannerRef.current,
          contentWindowExists: !!scannerWindow,
        }));

        if (!scannerWindow) {
          // This would be a bug — scanner should still be alive in RELEASING_CAMERA
          trace('CAMERA_RELEASE_SEND_FAILED', 'Scanner iframe/contentWindow is null');
          throw new Error('Cannot release camera: scanner iframe already unmounted');
        }

        scannerWindow.postMessage({ type: 'RELEASE_CAMERA' }, '*');
        trace('CAMERA_RELEASE_REQUESTED', 'RELEASE_CAMERA actually posted');

        // Retry safety net: iOS Safari may suspend idle iframes, dropping
        // the first postMessage. Retry up to 3 times with 500ms backoff.
        // Once SCANNER_CAMERA_RELEASED arrives, we clear the retry timer
        // (handled in the message handler via releaseRetryRef).
        if (releaseRetryRef.current) clearTimeout(releaseRetryRef.current);
        let attempts = 0;
        const sendReleaseWithRetry = () => {
          attempts += 1;
          const w = scannerRef.current?.contentWindow;
          if (!w) return; // scanner unmounted — release already succeeded
          if (attempts > 3) {
            trace('CAMERA_RELEASE_RETRY_EXHAUSTED', `${attempts - 1} retries failed`);
            return;
          }
          w.postMessage({ type: 'RELEASE_CAMERA' }, '*');
          trace('CAMERA_RELEASE_RETRY', `attempt ${attempts}/3`);
          releaseRetryRef.current = window.setTimeout(sendReleaseWithRetry, 500);
        };
        releaseRetryRef.current = window.setTimeout(sendReleaseWithRetry, 500);

      } catch (err) {
        trace('API_ERROR', String(err));
        setScanError(err instanceof Error ? err.message : 'Failed to load XR target');
        setPhase('ERROR');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [foundCards]);

  // ========================================================================
  // LISTEN: messages from viewer iframe (orchestrated lifecycle events)
  // ========================================================================
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'AR_DEBUG') {
        const label = data.payload?.label || '?';
        const details = data.payload?.details || {};
        const ts = new Date().toISOString().substring(11, 23);
        const entry = `${ts} [${label}] ${JSON.stringify(details)}`;
        arDebugBufferRef.current.push(entry);
        if (arDebugBufferRef.current.length > 200) arDebugBufferRef.current.shift();
        return;
      }

      // XR lifecycle events from ar-xr.html (orchestrated by parent)
      switch (data.type) {
        case 'XR_ENGINE_READY':
          console.log('[LearnAR8thWall] XR engine ready');
          trace('XR_ENGINE_READY', '8th Wall binary loaded');
          break;

        case 'XR_SLAM_LOADED':
          console.log('[LearnAR8thWall] XR SLAM loaded');
          trace('XR_SLAM_LOADED', 'Camera+tracking module ready');
          break;

        case 'XR_PIPELINE_READY':
          console.log('[LearnAR8thWall] XR pipeline ready');
          trace('XR_PIPELINE_READY', 'All pipeline modules registered');
          break;

        case 'XR_CAMERA_STATUS':
          trace('XR_CAMERA_STATUS', data.payload?.status || '?');
          break;

        case 'XR_CAMERA_HAS_VIDEO':
          console.log('[LearnAR8thWall] XR camera has video — AR is LIVE');
          trace('XR_CAMERA_HAS_VIDEO', 'Camera feed visible, AR tracking active');
          // Only transition to VIEWING once the camera feed is actually live.
          // The user can now see the AR scene.
          setPhase('VIEWING');
          trace('PHASE', 'VIEWING — AR session active');
          break;

        case 'XR_STARTED':
          console.log('[LearnAR8thWall] AR viewer ready');
          break;

        case 'XR_ERROR':
          console.error('[LearnAR8thWall] XR error:', data.payload);
          trace('XR_ERROR', data.payload?.message || 'Unknown XR error');
          setScanError(data.payload?.message || 'XR session failed');
          setPhase('ERROR');
          break;

        case 'TARGET_FOUND':
          console.log('[LearnAR8thWall] Target found in viewer:', data.payload);
          break;

        case 'TARGET_LOST':
          console.log('[LearnAR8thWall] Target lost in viewer:', data.payload);
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ========================================================================
  // NAVIGATION
  // ========================================================================
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setPhase('SCANNING');
    setScanError(null);
    setCurrentTarget(null);
  }, []);

  const handleSwitchToMindAR = useCallback(() => {
    navigate('/learn-ar');
  }, [navigate]);

  // ========================================================================
  // BUILD VIEWER IFRAME SRC
  // ========================================================================
  // Build viewer iframe src — param names match ar-xr.html exactly
  const viewerSrc = (() => {
    if (!currentTarget) return '';
    const params = new URLSearchParams();
    params.set('qr_id', currentTarget.qr_id);
    params.set('word', currentTarget.word);
    if (currentTarget.xr_target_json_url)   params.set('xr_target_json_url', currentTarget.xr_target_json_url);
    if (currentTarget.xr_target_image_url)   params.set('xr_target_image_url', currentTarget.xr_target_image_url);
    if (currentTarget.model_3d_url)         params.set('model_3d_url', currentTarget.model_3d_url);
    if (currentTarget.position)  params.set('position', currentTarget.position);
    if (currentTarget.rotation)  params.set('rotation', currentTarget.rotation);
    if (currentTarget.scale)     params.set('scale', currentTarget.scale);
    params.set('debug', 'true');
    return `/ar-xr.html?${params.toString()}`;
  })();

  // ========================================================================
  // RENDER
  // ========================================================================
  // Debug overlay for diagnostics
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true';

  return (
    <div className="ar-xr-page">

      {/* Debug Phase Indicator */}
      {isDebugMode && (
        <div className="debug-phase-indicator">
          Phase: <strong>{phase}</strong> |
          Scanner: <strong>{['SCANNING', 'LOADING_TARGET', 'RELEASING_CAMERA'].includes(phase) ? 'active' : 'hidden'}</strong> |
          Camera: <strong>{foundCards.size}</strong> cards
        </div>
      )}

      {/* Header */}
      <div className="ar-xr-header">
        <button className="back-btn" onClick={handleBack}>
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="header-title">
          <h1>{currentTarget?.word || '8th Wall XR'}</h1>
          <span className="card-count">
            {foundCards.size} card{foundCards.size !== 1 ? 's' : ''} scanned
          </span>
        </div>
        <button className="engine-switch" onClick={handleSwitchToMindAR}>
          MindAR
        </button>
      </div>

      {/* AR Viewport */}
      <div className="ar-viewport">

        {/* SCANNING | LOADING_TARGET | RELEASING_CAMERA: scanner iframe stays alive
            so we can send RELEASE_CAMERA before XR starts. */}
        {['SCANNING', 'LOADING_TARGET', 'RELEASING_CAMERA'].includes(phase) && (
          <iframe
            ref={scannerRef}
            src="/ar-scanner.html?debug=true"
            title="AR Scanner"
            allow="camera; xr-spatial-tracking"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}

        {/* LOADING_TARGET: overlay while fetching XR target */}
        {(phase === 'LOADING_TARGET') && (
          <div className="ar-loading">
            <div className="loading-spinner" />
            <p>Loading XR target...</p>
            <p className="loading-hint">Fetching AR data</p>
          </div>
        )}

        {/* RELEASING_CAMERA: overlay while waiting for scanner to release camera */}
        {phase === 'RELEASING_CAMERA' && (
          <div className="ar-loading">
            <div className="loading-spinner" />
            <p>Preparing AR...</p>
            <p className="loading-hint">Releasing camera for XR engine</p>
          </div>
        )}

        {/* XR_BOOTING | VIEWING: 8th Wall XR viewer */}
        {(phase === 'XR_BOOTING' || phase === 'VIEWING') && viewerSrc && (
          <iframe
            ref={viewerRef}
            src={viewerSrc}
            title="AR Viewer"
            allow="camera; xr-spatial-tracking; gyroscope; accelerometer"
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => trace('VIEWER_IFRAME_LOADED', viewerSrc)}
          />
        )}

        {/* ERROR: retry option */}
        {phase === 'ERROR' && (
          <div className="ar-error">
            <div className="error-icon">
              <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth={2}>
                <circle cx={12} cy={12} r={10} />
                <line x1={15} y1={9} x2={9} y2={15} />
                <line x1={9} y1={9} x2={15} y2={15} />
              </svg>
            </div>
            <h2>Could not load XR target</h2>
            <p>{scanError}</p>
            <div className="error-actions">
              <button className="btn-primary" onClick={handleRetry}>Scan Again</button>
              <button className="btn-secondary" onClick={handleBack}>Go Back</button>
            </div>
          </div>
        )}

      </div>

      {/* Telegram Sync Button: available throughout the AR lifecycle for debugging. */}
      <button
        type="button"
        className={`telegram-sync-btn ${syncStatus}`}
        onClick={syncTelegram}
        disabled={syncStatus === 'syncing'}
        aria-label={`Send ${phase.toLowerCase()} AR logs to Telegram`}
        title={`Sync ${phase.toLowerCase()} logs to Telegram (Ctrl+Shift+S)`}
      >
        {syncStatus === 'syncing' ? '...' : syncStatus === 'success' ? 'OK' : syncStatus === 'error' ? 'ERR' : 'TG'}
      </button>

      {/* Found Cards Badge */}
      {foundCards.size > 0 && (
        <div className="found-cards-overlay">
          <div className="found-cards-title">Scanned</div>
          <div className="found-cards-list">
            {Array.from(foundCards).map(card => (
              <div key={card} className="found-card-badge">{card}</div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {phase === 'SCANNING' && (
        <div className="ar-instructions">
          <p>Point camera at flashcard QR code</p>
        </div>
      )}

      {(phase === 'LOADING_TARGET' || phase === 'RELEASING_CAMERA' || phase === 'XR_BOOTING') && (
        <div className="ar-instructions">
          <p>Preparing AR experience...</p>
        </div>
      )}

      {phase === 'VIEWING' && (
        <div className="ar-instructions">
          <button className="btn-secondary scan-more-btn" onClick={handleRetry}>
            Scan Another Card
          </button>
        </div>
      )}

    </div>
  );
};

export default LearnAR8thWall;
