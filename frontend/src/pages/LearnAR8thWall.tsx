// @ts-nocheck
// XR implementation - using backend API for data

/**
 * LearnAR8thWall.tsx
 *
 * Dedicated page for 8th Wall AR experience.
 * Uses ARContainerV2 with engine="xr" prop.
 *
 * Route: /learn-ar-xr
 * Route: /learn-ar-xr/:deckId
 *
 * Data Flow (per vercel-react-best-practices):
 * 1. Fetch deck targets from backend API (parallel with combo rules)
 * 2. Transform data and initialize AR container
 * 3. Handle combo detection from backend
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ARContainerV2, { AREngine, ARPhase } from '@/components/ar/ARContainerV2';
import { XRTargetData } from '@/lib/xr-engine-adapter';
// TODO: Create useToast hook or use existing toast system
import { ActiveViewerTarget } from '@/core/types/ARMessages';
import './LearnAR8thWall.css';

// API Base URL
const API_BASE = import.meta.env.VITE_API_BASE || 'https://edu-platform-api-do20.onrender.com';

/** API Response types */
interface BackendTargetsResponse {
  deck_id: string;
  target_count: number;
  targets: TargetData[];
}

interface TargetData {
  qr_id: string;
  word?: string;
  xr_target_json_url?: string;
  xr_target_image_url?: string;
  reference_image_url?: string;
  mind_catalog_id?: string;
  mind_target_index?: number;
  description?: string;
  animations?: string[];
  default_animation?: string;
  combo_animation?: string;
  model_3d_url?: string;
  texture_url?: string;
  position?: string;
  rotation?: string;
  scale?: string;
}

interface DeckInfo {
  deck_id: string;
  name: string;
  card_count: number;
}

export const LearnAR8thWall: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();
  const { showToast } = { showToast: (msg: string, _type?: string) => console.log('[Toast]', msg) };

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deckInfo, setDeckInfo] = useState<DeckInfo | null>(null);
  const [targets, setTargets] = useState<XRTargetData[]>([]);
  const [activeTargets, setActiveTargets] = useState<ActiveViewerTarget[]>([]);
  const [comboRules, setComboRules] = useState<any[]>([]);
  const [foundCards, setFoundCards] = useState<Set<string>>(new Set());
  const [activeCombo, setActiveCombo] = useState<string | null>(null);
  const [phase, setPhase] = useState<ARPhase>('LOADING');

  /** Default deck ID */
  const targetDeckId = useMemo(() => deckId || 'claymorphic-animals-001', [deckId]);

  /**
   * Fetch XR targets and combo rules in PARALLEL.
   * Per async-parallel rule: independent ops should run concurrently.
   *
   * WORKAROUND (2026-08-24): The `/xr-targets/deck/{deck_id}` endpoint returns
   * HTTP 500 (Postgres SQL error in ar_object_repository.get_tracking_targets_with_xr).
   * We bypass it by calling `/flashcard/{qr_id}/xr-urls` (status 200) for each
   * known qr_id in the deck. The deck → qr_id mapping is hard-coded for now.
   * TODO: revert once the deck endpoint is fixed in ar_object_repository.py.
   */
  const loadARData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Known qr_ids per deck — replace once `/xr-targets/deck/{deck_id}` is fixed.
    const DECK_QR_IDS: Record<string, string[]> = {
      'claymorphic-animals-001': [
        'cat001', 'fish001', 'rabbit001', 'carrot001', 'elephant001',
        'grass001', 'panda001', 'bamboo001', 'tiger001', 'meat001',
      ],
    };
    const qrIds = DECK_QR_IDS[targetDeckId] || [];

    if (!qrIds.length) {
      setError(`No QR IDs configured for deck: ${targetDeckId}`);
      setIsLoading(false);
      return;
    }

    try {
      // Parallel fetch: XR targets per qr_id + combo rules (no dependencies).
      const xrUrlPromises = qrIds.map(qrId =>
        fetch(`${API_BASE}/api/v1/flashcard/${qrId}/xr-urls`, {
          headers: { 'Content-Type': 'application/json' },
        }).then(r => (r.ok ? r.json() : null)).catch(() => null)
      );
      const combosPromise = fetch(
        `${API_BASE}/api/v1/combinations/rules?flashcard_set=${encodeURIComponent(targetDeckId)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const [xrResults, combosRes] = await Promise.all([
        Promise.all(xrUrlPromises),
        combosPromise,
      ]);

      const targetsData = xrResults.filter(Boolean);
      if (!targetsData.length) {
        throw new Error('No XR targets found for this deck');
      }

      // Parse combos (may fail if endpoint not available)
      let combos: any[] = [];
      if (combosRes.ok) {
        const combosData = await combosRes.json();
        combos = combosData.rules || combosData || [];
      }

      // Set deck info
      setDeckInfo({
        deck_id: targetDeckId,
        name: 'AR Deck',
        card_count: targetsData.length,
      });

      // Build ActiveViewerTarget / XRTargetData list
      const viewerTargets: ActiveViewerTarget[] = targetsData.map((t: any, index: number) => ({
        slotIndex: (index % 2) as ActiveViewerTarget['slotIndex'],
        mindTargetIndex: t.tracking_target?.mind_target_index ?? index,
        arTag: t.qr_id,
        modelUrl: t.target?.model_3d_url || '',
        textureUrl: t.target?.texture_url,
        word: t.word || t.qr_id.replace('001', ''),
        position: t.target?.position || '0 0 0',
        rotation: t.target?.rotation || '0 0 0',
        scale: t.target?.scale || '1 1 1',
        xr_target_json_url: t.xr_target_json_url,
        xr_target_image_url: t.xr_target_image_url,
        animations: t.target?.animations,
        default_animation: t.target?.default_animation,
        combo_animation: t.target?.combo_animation,
      }));
      const xrTargets: XRTargetData[] = targetsData.map((t: any) => ({
        qr_id: t.qr_id,
        xr_target_json_url: t.xr_target_json_url,
        xr_target_image_url: t.xr_target_image_url,
        reference_image_url: t.tracking_target?.reference_image_url,
        mind_catalog_id: t.target?.mind_catalog_id,
        mind_target_index: t.tracking_target?.mind_target_index,
        model_3d_url: t.target?.model_3d_url,
        texture_url: t.target?.texture_url,
        animations: t.target?.animations,
        default_animation: t.target?.default_animation || 'IDLE',
        combo_animation: t.target?.combo_animation,
        position: t.target?.position || '0 0 0',
        rotation: t.target?.rotation || '0 0 0',
        scale: t.target?.scale || '1 1 1',
      }));

      setTargets(xrTargets);
      setActiveTargets(viewerTargets);
      setComboRules(combos);

    } catch (err) {
      console.error('[LearnAR8thWall] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AR content');
    } finally {
      setIsLoading(false);
    }
  }, [targetDeckId]);

  // Load on mount
  useEffect(() => {
    loadARData();
  }, [loadARData]);

  // ========== AR EVENT HANDLERS ==========
  const handlePhaseChange = useCallback((newPhase: ARPhase) => {
    setPhase(newPhase);
  }, []);

  const handleTargetFound = useCallback(
    (targetIndex: number) => {
      const target = activeTargets[targetIndex];
      const qrId = target?.arTag || `target_${targetIndex}`;
      console.log('[LearnAR8thWall] Target found:', targetIndex, qrId);
      setFoundCards((prev) => new Set([...prev, qrId]));
      showToast(`Found: ${qrId}`, 'success');
    },
    [activeTargets, showToast]
  );

  const handleTargetLost = useCallback((targetIndex: number) => {
    console.log('[LearnAR8thWall] Target lost:', targetIndex);
  }, []);

  const handleComboDetected = useCallback(
    (targetIndices: number[]) => {
      console.log('[LearnAR8thWall] Combo detected:', targetIndices);

      // Check combo rules from backend
      const foundTags = targetIndices
        .map((i) => activeTargets[i]?.arTag)
        .filter(Boolean);

      const matchedCombo = comboRules.find((rule) =>
        rule.required_tags?.every((tag: string) => foundTags.includes(tag)) ||
        rule.tags?.every((tag: string) => foundTags.includes(tag))
      );

      if (matchedCombo) {
        console.log('[LearnAR8thWall] Combo matched:', matchedCombo.combo_name);
        setActiveCombo(matchedCombo.combo_id);
        showToast(matchedCombo.phrase || 'Combo activated!', 'success');
      } else if (targetIndices.length >= 2) {
        setActiveCombo('generic_combo');
        showToast('Combo detected! Great job!', 'success');
      }
    },
    [activeTargets, comboRules, showToast]
  );

  const handleError = useCallback(
    (errorMsg: string, code?: string) => {
      console.error('[LearnAR8thWall] AR Error:', errorMsg, code);
      showToast(`AR Error: ${errorMsg}`, 'error');
    },
    [showToast]
  );

  const handleReady = useCallback(() => {
    console.log('[LearnAR8thWall] AR Ready');
    setPhase('VIEWING');
    showToast('Point camera at flashcard', 'info');
  }, [showToast]);

  // ========== NAVIGATION ==========
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSwitchToMindAR = useCallback(() => {
    navigate('/learn-ar');
  }, [navigate]);

  // ========== RENDER ==========
  if (isLoading) {
    return (
      <div className="ar-xr-loading">
        <div className="loading-spinner" />
        <p>Loading 8th Wall AR...</p>
        <p className="loading-hint">Connecting to AR engine</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ar-xr-error">
        <div className="error-icon">
          <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth={2}>
            <circle cx={12} cy={12} r={10} />
            <line x1={15} y1={9} x2={9} y2={15} />
            <line x1={9} y1={9} x2={15} y2={15} />
          </svg>
        </div>
        <h2>Could not load AR</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button className="btn-primary" onClick={loadARData}>Try Again</button>
          <button className="btn-secondary" onClick={handleBack}>Go Back</button>
        </div>
      </div>
    );
  }

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
          <h1>{deckInfo?.name || '8th Wall AR'}</h1>
          <span className="card-count">
            {foundCards.size}/{targets.length} cards found
          </span>
        </div>
        <button className="engine-switch" onClick={handleSwitchToMindAR}>
          Switch to MindAR
        </button>
      </div>

      {/* AR Container */}
      <ARContainerV2
        engine="xr"
        initialPhase={phase}
        modelUrl={targets[0]?.model_3d_url}
        activeTargets={activeTargets}
        onPhaseChange={handlePhaseChange}
        onTargetFound={handleTargetFound}
        onTargetLost={handleTargetLost}
        onComboDetected={handleComboDetected}
        onViewerAssetError={(data) => handleError(data.error, data.code)}
        onReady={handleReady}
      />

      {/* Found Cards Overlay */}
      {foundCards.size > 0 && (
        <div className="found-cards-overlay">
          <div className="found-cards-title">Found Cards</div>
          <div className="found-cards-list">
            {Array.from(foundCards).map((card) => (
              <div key={card} className="found-card-badge">{card}</div>
            ))}
          </div>
        </div>
      )}

      {/* Combo Celebration */}
      {activeCombo && (
        <div className="combo-celebration">
          <div className="combo-content">
            <div className="combo-icon">🎉</div>
            <h2>Combo!</h2>
            <p>Great job combining the cards!</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="ar-instructions">
        <p>Point your camera at a flashcard to see the AR content</p>
      </div>
    </div>
  );
};

export default LearnAR8thWall;
