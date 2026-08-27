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
import '../styles/LearnAR8thWall.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://edu-platform-api-do20.onrender.com';

type Phase = 'SCANNING' | 'LOADING' | 'VIEWING' | 'ERROR';

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

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('SCANNING');

  // Current scanned target
  const [currentTarget, setCurrentTarget] = useState<XRTarget | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // All scanned cards this session
  const [foundCards, setFoundCards] = useState<Set<string>>(new Set());

  // ========================================================================
  // LISTEN: QR_DETECTED from scanner iframe
  // ========================================================================
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      // Handle debug bridge messages from scanner
      if (data.type === 'AR_DEBUG') {
        console.log('[LearnAR8thWall:scanner]', data.payload?.label, data.payload?.details);
        return;
      }

      if (data.type !== 'QR_DETECTED') return;

      const { qrId } = data.payload || {};
      if (!qrId) return;

      console.log('[LearnAR8thWall] QR detected:', qrId);

      // Prevent re-scanning the same card in this session
      if (foundCards.has(qrId)) {
        console.log('[LearnAR8thWall] Already scanned:', qrId);
        return;
      }

      // Switch to loading state
      setPhase('LOADING');
      setCurrentTarget(null);
      setScanError(null);

      try {
        // Fetch XR target data for this specific QR
        const res = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}/xr-urls`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const raw = await res.json();

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

        if (!target.xr_target_json_url && !target.xr_target_image_url) {
          throw new Error(`No XR target URL for: ${qrId}`);
        }

        setCurrentTarget(target);
        setFoundCards(prev => new Set([...prev, qrId]));
        setPhase('VIEWING');

      } catch (err) {
        console.error('[LearnAR8thWall] Fetch error:', err);
        setScanError(err instanceof Error ? err.message : 'Failed to load XR target');
        setPhase('ERROR');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [foundCards]);

  // ========================================================================
  // LISTEN: messages from viewer iframe
  // ========================================================================
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'AR_DEBUG') {
        console.log('[LearnAR8thWall:viewer]', data.payload?.label, data.payload?.details);
        return;
      }

      if (data.type === 'AR_READY') {
        console.log('[LearnAR8thWall] AR viewer ready');
      }

      if (data.type === 'TARGET_FOUND') {
        console.log('[LearnAR8thWall] Target found in viewer:', data.payload);
      }

      if (data.type === 'TARGET_LOST') {
        console.log('[LearnAR8thWall] Target lost in viewer:', data.payload);
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
  return (
    <div className="ar-xr-page">

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

        {/* SCANNING: camera + jsQR */}
        {phase === 'SCANNING' && (
          <iframe
            ref={scannerRef}
            src="/ar-scanner.html?debug=true"
            title="AR Scanner"
            allow="camera; xr-spatial-tracking"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}

        {/* LOADING: spinner while fetching XR target */}
        {phase === 'LOADING' && (
          <div className="ar-loading">
            <div className="loading-spinner" />
            <p>Loading XR target...</p>
            <p className="loading-hint">Connecting to 8th Wall engine</p>
          </div>
        )}

        {/* VIEWING: 8th Wall XR viewer */}
        {phase === 'VIEWING' && viewerSrc && (
          <iframe
            ref={viewerRef}
            src={viewerSrc}
            title="AR Viewer"
            allow="camera; xr-spatial-tracking; gyroscope; accelerometer"
            style={{ width: '100%', height: '100%', border: 'none' }}
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
