// @ts-nocheck
/**
 * LearnAR8thWall.tsx
 *
 * Standalone 8th Wall AR page — ZERO overlap with MindAR.
 * Flow: QRScanner (React jsQR component) → Fetch XR target per QR → Viewer (ar-xr.html iframe)
 *
 * Route: /learn-ar-xr
 * Route: /learn-ar-xr/:deckId
 *
 * State machine (5 phases):
 *   SCANNING  → QRScanner mounted, jsQR polling
 *   PREPARING → API fetch in flight, scanner stopping
 *   XR_BOOTING → ar-xr.html iframe loading
 *   VIEWING   → XR camera live
 *   ERROR     → retry option
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegramSync } from '@/hooks/useTelegramSync';
import { QRScanner } from '@/features/ar/components/QRScanner';
import '../styles/LearnAR8thWall.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://edu-platform-api-do20.onrender.com';

type Phase =
  | 'SCANNING'
  | 'PREPARING'
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

  // ========== AR RUNTIME PREWARM (runs once on mount) ==========
  useEffect(() => {
    const ensureLink = (rel: string, href: string, as?: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      link.crossOrigin = 'anonymous';
      if (as) link.as = as;
      document.head.appendChild(link);
    };

    // Connection warmup
    ensureLink('preconnect', 'https://cdn.jsdelivr.net');
    ensureLink('preconnect', 'https://rofprrtoeyirssfndxag.supabase.co');

    // 8th Wall engine — heaviest dependency
    ensureLink('preload', 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js', 'script');

    // Three.js module + GLTFLoader
    ensureLink('modulepreload', 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js');
    ensureLink('modulepreload', 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js');

    // Viewer HTML
    ensureLink('prefetch', '/ar-xr.html');
  }, []);

  // Viewer iframe ref
  const viewerRef = useRef<HTMLIFrameElement>(null);

  // Iframe timing instrumentation
  const iframeTimingRef = useRef<{ srcSet: number; onLoad: number; onError: number } | null>(null);

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('SCANNING');

  // Flags that gate XR_BOOTING transition
  const [cameraReleased, setCameraReleased] = useState(false);
  const [targetReady, setTargetReady] = useState(false);

  // Current scanned target
  const [currentTarget, setCurrentTarget] = useState<XRTarget | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // All scanned cards this session
  const [foundCards, setFoundCards] = useState<Set<string>>(new Set());

  // Buffer AR_DEBUG messages from viewer iframe for Telegram sync
  const arDebugBufferRef = useRef<string[]>([]);

  // Parent-side trace logs for Telegram sync (React state, always accessible)
  const [parentTraceLogs, setParentTraceLogs] = useState<string[]>([]);

  // Helper: push timestamped trace into parentTraceLogs state AND persistent control buffer
  const trace = (label: string, detail: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    const entry = `${ts} [${label}] ${detail}`;
    setParentTraceLogs(prev => {
      const next = [...prev, entry];
      return next.length > 200 ? next.slice(-200) : next;
    });
    // Dual sink: also write to persistent ARControlTrace ring buffer (survives reload, immune to drop_console)
    window.ARControlTrace?.(`AR_${label}`, { detail, phase });
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

  // Debug: log phase changes
  useEffect(() => {
    console.log('[LearnAR8thWall] Phase changed to:', phase);
  }, [phase]);

  // ========================================================================
  // XR_BOOTING TRIGGER
  // Fires when both the camera has been released and the API has returned.
  // No more unreliable postMessage bridging.
  // ========================================================================
  useEffect(() => {
    if (phase === 'PREPARING' && targetReady && cameraReleased && currentTarget) {
      setPhase('XR_BOOTING');
      trace('XR_BOOTING', 'both ready — transitioning');
    }
  }, [phase, targetReady, cameraReleased, currentTarget]);

  // ========================================================================
  // handleQRDetected — called by QRScanner when QR is found.
  // QRScanner calls stopCamera() internally before this fires.
  // We record cameraReleased here since we know the camera was just stopped.
  // ========================================================================
  const handleQRDetected = useCallback(async (qrId: string) => {
    if (foundCards.has(qrId)) {
      trace('QR_DUPLICATE', `Already scanned: ${qrId}`);
      return;
    }

    trace('QR_DETECTED', `QR=${qrId} → PHASE=PREPARING`);

    setPhase('PREPARING');
    setTargetReady(false);
    setCameraReleased(true); // QRScanner already stopped the camera
    // Step 9: SCANNER_CAMERA_STOP — prove camera was actually stopped
    navigator.mediaDevices?.getUserMedia({ video: true })?.then(mediaStream => {
      const tracks = mediaStream.getVideoTracks();
      trace('SCANNER_CAMERA_STOP', JSON.stringify({
        trackCount: tracks.length,
        tracks: tracks.map(t => ({ kind: t.kind, readyState: t.readyState, label: t.label })),
      }));
      tracks.forEach(t => t.stop());
    }).catch(() => {});
    setCurrentTarget(null);
    setScanError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}/xr-urls`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const raw = await res.json();
      trace('API_RESPONSE', JSON.stringify(raw).substring(0, 200));

      const modelUrl = raw.target?.model_3d_url || raw.model_3d_url;
      const targetJsonUrl = raw.tracking_target?.xr_target_json_url || raw.xr_target_json_url;

      // PERFORMANCE: preload GLB immediately — model can download while XR iframe boots
      if (modelUrl) {
        const key = `ar-model-${modelUrl}`;
        if (!document.querySelector(`[data-preload="${key}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'fetch';
          link.href = modelUrl;
          link.crossOrigin = 'anonymous';
          link.dataset.preload = key;
          link.dataset.arModel = modelUrl;
          document.head.appendChild(link);
          trace('MODEL_PRELOAD', modelUrl);
        }
      }
      // Also preload target JSON
      if (targetJsonUrl) {
        const key = `ar-target-${targetJsonUrl}`;
        if (!document.querySelector(`[data-preload="${key}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'fetch';
          link.href = targetJsonUrl;
          link.crossOrigin = 'anonymous';
          link.dataset.preload = key;
          link.dataset.arTarget = targetJsonUrl;
          document.head.appendChild(link);
          trace('TARGET_PRELOAD', targetJsonUrl);
        }
      }

      const target: XRTarget = {
        qr_id: qrId,
        word: raw.word || qrId.replace('001', ''),
        xr_target_json_url: targetJsonUrl,
        xr_target_image_url: raw.tracking_target?.xr_target_image_url || raw.xr_target_image_url,
        model_3d_url: modelUrl,
        texture_url: raw.target?.texture_url || raw.texture_url,
        animations: raw.target?.animations || raw.animations,
        default_animation: raw.target?.default_animation || raw.default_animation || 'IDLE',
        combo_animation: raw.target?.combo_animation || raw.combo_animation,
        position: raw.target?.position || '0 0 0',
        rotation: raw.target?.rotation || '0 0 0',
        scale: raw.target?.scale || '1 1 1',
      };

      if (!target.xr_target_json_url && !target.xr_target_image_url) {
        throw new Error(`No XR target URL for: ${qrId}`);
      }

      setCurrentTarget(target);
      setFoundCards(prev => new Set([...prev, qrId]));
      setTargetReady(true);
      trace('TARGET_READY', qrId);
    } catch (err) {
      trace('API_ERROR', String(err));
      setScanError(err instanceof Error ? err.message : 'Failed to load XR target');
      setPhase('ERROR');
    }
  }, [foundCards]);

  // ========================================================================
  // LISTEN: messages from viewer iframe (XR lifecycle events from ar-xr.html)
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
    setCameraReleased(false);
    setTargetReady(false);
  }, []);

  const handleSwitchToMindAR = useCallback(() => {
    navigate('/learn-ar');
  }, [navigate]);

  // ========================================================================
  // BUILD VIEWER IFRAME SRC
  // ========================================================================
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

  // Track when viewerSrc is set — timing instrumentation after viewerSrc is initialized
  useEffect(() => {
    if (!viewerSrc) return;
    iframeTimingRef.current = { srcSet: Date.now(), onLoad: 0, onError: 0 };
    trace('VIEWER_SRC_SET', viewerSrc);
  }, [viewerSrc]);

  // ========================================================================
  // RENDER
  // ========================================================================
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true';

  return (
    <div className="ar-xr-page">

      {/* Debug Phase Indicator */}
      {isDebugMode && (
        <div className="debug-phase-indicator">
          Phase: <strong>{phase}</strong> |
          Scanner: <strong>{phase === 'SCANNING' ? 'active' : 'hidden'}</strong> |
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

        {/* SCANNING: QRScanner React component */}
        {phase === 'SCANNING' && (
          <QRScanner
            onDetected={handleQRDetected}
            onReady={() => trace('SCANNER_READY', 'getUserMedia succeeded')}
            onError={(msg) => {
              trace('SCANNER_ERROR', msg);
              setScanError(msg);
              setPhase('ERROR');
            }}
            active={phase === 'SCANNING'}
            debug={isDebugMode}
          />
        )}

        {/* PREPARING: overlay while fetching XR target */}
        {phase === 'PREPARING' && (
          <div className="ar-loading">
            <div className="loading-spinner" />
            <p>Loading XR target...</p>
            <p className="loading-hint">Preparing AR experience</p>
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
            onLoad={() => {
              iframeTimingRef.current = {
                ...(iframeTimingRef.current || {}),
                onLoad: Date.now(),
              } as { srcSet: number; onLoad: number; onError: number };
              const t = iframeTimingRef.current;
              const delta = t.onLoad - (t as any).srcSet;
              trace('VIEWER_IFRAME_LOADED', `srcSet→load Δ${delta}ms`);
            }}
            onError={() => {
              trace('VIEWER_IFRAME_ERROR', viewerSrc);
            }}
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

      {/* Telegram Sync Button: available throughout the AR lifecycle */}
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

      {(phase === 'PREPARING' || phase === 'XR_BOOTING') && (
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
