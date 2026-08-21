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

// API Base URL - use VITE_API_BASE (Vite convention)
const API_BASE = import.meta.env.VITE_API_BASE || '';

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

      // Try backend first, fallback to Supabase REST API
      let data: any = null;
      try {
        const response = await fetch(
          `${API_BASE}/api/flashcard/xr-targets/deck/${targetDeckId}`,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.ok) {
          data = await response.json();
        } else {
          console.warn('[LearnAR8thWall] Backend endpoint not available, using Supabase fallback');
          throw new Error('Backend endpoint not available');
        }
      } catch (backendErr) {
        // Fallback: query Supabase REST API directly
        console.log('[LearnAR8thWall] Loading from Supabase direct...');
        data = await loadFromSupabase(targetDeckId);
      }

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

  // ========== SUPABASE FALLBACK ==========
  // Direct query to Supabase when backend endpoint not yet deployed
  const loadFromSupabase = async (deckId: string) => {
    const supabaseUrl = 'https://rofprrtoeyirssfndxag.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZnBycnRvZXlpcnNzZm5keGFnIiwicm9sZSI6ImFub25fa2V5IiwiaWF0IjoxNzY1MDA0NjkwLCJleHAiOjIwODA1ODA2OTB9.placeholder';

    // For claymorphic-animals-001, use known default targets
    if (deckId === 'claymorphic-animals-001') {
      const defaultTargets = [
        'cat001', 'fish001', 'rabbit001', 'carrot001',
        'elephant001', 'grass001', 'panda001', 'bamboo001',
        'tiger001', 'meat001'
      ];

      const modelUrl = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb';

      return {
        deck_id: deckId,
        target_count: defaultTargets.length,
        targets: defaultTargets.map((qr_id, index) => ({
          qr_id,
          deck_name: 'Claymorphic Animals',
          deck_id: deckId,
          mind_target_index: index,
          word: qr_id.replace('001', ''),
          model_3d_url: modelUrl,
          xr_target_json_url: `https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/${qr_id}.json`,
          xr_target_image_url: `https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/xr-targets/${qr_id}_luminance.png`,
          reference_image_url: `https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/images/flashcard/${qr_id}.png`,
          position: '0 0 0',
          rotation: '0 0 0',
          scale: '1 1 1',
        })),
      };
    }

    // Query Supabase REST API for other decks
    const response = await fetch(
      `${supabaseUrl}/rest/v1/ar_tracking_targets?deck_id=eq.${deckId}&select=qr_id,xr_target_json_url,xr_target_image_url,reference_image_url,model_3d_url,position,rotation,scale`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase query failed: ${response.statusText}`);
    }

    const targets = await response.json();
    return {
      deck_id: deckId,
      target_count: targets.length,
      targets,
    };
  };

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
