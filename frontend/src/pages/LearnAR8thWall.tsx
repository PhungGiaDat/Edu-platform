// @ts-nocheck
// XR implementation in progress - disabling type checking for now

/**
 * LearnAR8thWall.tsx
 *
 * Dedicated page for 8th Wall AR experience.
 * Uses ARContainerV2 with engine="xr" prop.
 *
 * Route: /learn-ar-xr
 *
 * Features:
 * - Loads XR targets from backend API
 * - Uses ARContainerV2 with engine="xr"
 * - Supports deck selection
 * - Handles combo detection
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ARContainerV2, { AREngine, ARPhase } from '@/components/ar/ARContainerV2';
import { XRTargetData, getXRTargetJSONs, buildMindARConfig } from '@/lib/xr-engine-adapter';
import { useToast } from '@/hooks/useToast';
import { ActiveViewerTarget } from '@/core/types/ARMessages';
import './LearnAR8thWall.css';

// API Base URL - adjust for your environment
const API_BASE = process.env.REACT_APP_API_URL || '';

interface DeckInfo {
  deck_id: string;
  name: string;
  description?: string;
  category?: string;
  card_count?: number;
}

interface ARExperienceData {
  qr_id: string;
  word: string;
  translation_vi: string;
  model_url?: string;
  animation_type?: string;
  xr_target_json_url?: string;
  xr_target_image_url?: string;
  reference_image_url?: string;
}

export const LearnAR8thWall: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deckInfo, setDeckInfo] = useState<DeckInfo | null>(null);
  const [targets, setTargets] = useState<XRTargetData[]>([]);
  const [modelUrl, setModelUrl] = useState<string>('');
  const [foundCards, setFoundCards] = useState<Set<string>>(new Set());
  const [activeCombo, setActiveCombo] = useState<string | null>(null);
  const [phase, setPhase] = useState<ARPhase>('LOADING');

  // ========== LOAD XR TARGETS ==========
  const [activeTargets, setActiveTargets] = useState<ActiveViewerTarget[]>([]);

  const loadXRTargets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use deck ID from URL or default to claymorphic deck
      const targetDeckId = deckId || 'claymorphic-animals-001';

      // Fetch XR targets from backend
      const response = await fetch(
        `${API_BASE}/api/flashcard/xr-targets/deck/${targetDeckId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load XR targets: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract deck info
      if (data.targets?.length > 0) {
        setDeckInfo({
          deck_id: targetDeckId,
          name: data.targets[0]?.deck_name || 'AR Deck',
          card_count: data.target_count,
        });

        // Transform to XRTargetData format
        const xrTargets: XRTargetData[] = data.targets.map((t: any) => ({
          qr_id: t.qr_id,
          xr_target_json_url: t.xr_target_json_url,
          xr_target_image_url: t.xr_target_image_url,
          reference_image_url: t.reference_image_url,
          mind_file_url: t.mind_file_url,
          mind_catalog_id: t.mind_catalog_id,
          model_3d_url: t.model_3d_url,
          texture_url: t.texture_url,
          animation_type: t.animation_type,
          position: t.position,
          rotation: t.rotation,
          scale: t.scale,
        }));

        setTargets(xrTargets);

        // Build ActiveViewerTarget for ARContainerV2 with XR URLs
        const viewerTargets: ActiveViewerTarget[] = data.targets.map((t: any, index: number) => ({
          slotIndex: index as ActiveViewerTarget['slotIndex'],
          mindTargetIndex: t.mind_target_index ?? index,
          arTag: t.qr_id,
          modelUrl: t.model_3d_url || '',
          textureUrl: t.texture_url,
          word: t.word || t.qr_id,
          position: t.position || '0 0 0',
          rotation: t.rotation || '0 0 0',
          scale: t.scale || '1 1 1',
          xr_target_json_url: t.xr_target_json_url,
          xr_target_image_url: t.xr_target_image_url,
        }));

        setActiveTargets(viewerTargets);

        // Use first target's model URL as default
        if (xrTargets[0]?.model_3d_url) {
          setModelUrl(xrTargets[0].model_3d_url);
        }
      } else {
        setError('No XR targets found for this deck');
      }
    } catch (err) {
      console.error('[LearnAR8thWall] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AR content');
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  // Load on mount
  useEffect(() => {
    loadXRTargets();
  }, [loadXRTargets]);

  // ========== AR EVENT HANDLERS ==========
  const handlePhaseChange = useCallback((newPhase: ARPhase) => {
    setPhase(newPhase);
  }, []);

  const handleTargetFound = useCallback(
    (targetIndex: number) => {
      // Find the target by index from activeTargets
      const target = activeTargets[targetIndex];
      const qrId = target?.arTag || `target_${targetIndex}`;
      console.log('[LearnAR8thWall] Target found:', targetIndex, qrId);
      setFoundCards((prev) => {
        const next = new Set(prev);
        next.add(qrId);
        return next;
      });
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
      if (targetIndices.length >= 2) {
        setActiveCombo('combo_activated');
        showToast('Combo detected! Great job!', 'success');
      }
    },
    [showToast]
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
          <svg
            width={64}
            height={64}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF6B6B"
            strokeWidth={2}
          >
            <circle cx={12} cy={12} r={10} />
            <line x1={15} y1={9} x2={9} y2={15} />
            <line x1={9} y1={9} x2={15} y2={15} />
          </svg>
        </div>
        <h2>Could not load AR</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button className="btn-primary" onClick={loadXRTargets}>
            Try Again
          </button>
          <button className="btn-secondary" onClick={handleBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-xr-page">
      {/* Header */}
      <div className="ar-xr-header">
        <button className="back-btn" onClick={handleBack}>
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
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

      {/* AR Container - Use ARContainerV2 with engine="xr" */}
      <ARContainerV2
        engine="xr"
        initialPhase={phase}
        modelUrl={modelUrl}
        activeTargets={activeTargets}
        onPhaseChange={handlePhaseChange}
        onTargetFound={handleTargetFound}
        onTargetLost={handleTargetLost}
        onComboDetected={handleComboDetected}
        onViewerAssetError={(data) => handleError(data.error, data.code)}
      />

      {/* Found Cards Overlay */}
      {foundCards.size > 0 && (
        <div className="found-cards-overlay">
          <div className="found-cards-title">Found Cards</div>
          <div className="found-cards-list">
            {Array.from(foundCards).map((card) => (
              <div key={card} className="found-card-badge">
                {card}
              </div>
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
