/**
 * ARModal.tsx
 * 
 * Modal wrapper for AR experiences within courses.
 * Allows AR to be triggered from lesson content.
 * 
 * Usage:
 * <ARModal 
 *   isOpen={showAR}
 *   flashcardId="elephant_001"
 *   onComplete={(result) => { updateProgress(result); setShowAR(false); }}
 *   onClose={() => setShowAR(false)}
 * />
 */

import React, { useState, useCallback } from 'react';
import { ARContainerV2, ARPhase } from './ARContainerV2';
import { useArData } from '@/hooks/useArData';
import { eventBus } from '@/runtime/EventBus';

interface ARModalProps {
    isOpen: boolean;
    flashcardId?: string;
    onQRDetected?: (qrId: string) => void;
    onComplete?: (result: ARResult) => void;
    onClose: () => void;
}

interface ARResult {
    flashcardId: string;
    xpEarned: number;
    completed: boolean;
    timeSpent: number;
}

export const ARModal: React.FC<ARModalProps> = ({
    isOpen,
    flashcardId: initialFlashcardId,
    onQRDetected,
    onComplete,
    onClose
}) => {
    const [currentFlashcardId, setCurrentFlashcardId] = useState<string | null>(initialFlashcardId || null);
    const [phase, setPhase] = useState<ARPhase>('SCANNING');
    const [startTime] = useState(Date.now());

    // Fetch AR data when flashcard ID is detected
    const { arData } = useArData(currentFlashcardId);

    // Handle QR detection
    const handleQRDetected = useCallback((qrId: string) => {
        console.log('[ARModal] QR Detected:', qrId);
        setCurrentFlashcardId(qrId);
        onQRDetected?.(qrId);
    }, [onQRDetected]);

    // Handle completion
    const handleComplete = useCallback(() => {
        const result: ARResult = {
            flashcardId: currentFlashcardId || '',
            xpEarned: 50, // Base XP for completing AR
            completed: true,
            timeSpent: Math.floor((Date.now() - startTime) / 1000)
        };
        onComplete?.(result);
    }, [currentFlashcardId, startTime, onComplete]);

    // Build mind URL from arData
    const getMindUrl = useCallback(() => {
        if (!arData?.targets?.[0]?.nft_base_url) return undefined;
        // Convert NFT URL to mind URL format
        // For now, we'll need to set up .mind files
        return arData.targets[0].nft_base_url.replace(/\.(fset|fset3|iset)$/, '.mind');
    }, [arData]);

    const getModelUrl = useCallback(() => {
        return arData?.targets?.[0]?.model_3d_url;
    }, [arData]);

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <div
            className="ar-modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                background: '#000'
            }}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 20,
                    left: 20,
                    zIndex: 100003,
                    background: 'rgba(255, 107, 107, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    color: '#fff',
                    fontSize: 24,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
            >
                ✕
            </button>

            {/* AR Container */}
            <ARContainerV2
                initialPhase={currentFlashcardId ? 'VIEWING' : 'SCANNING'}
                mindUrl={getMindUrl()}
                modelUrl={getModelUrl()}
                onPhaseChange={setPhase}
                onQRDetected={handleQRDetected}
                onModelClick={() => {
                    // Play audio or show info
                    eventBus.emit('AR_MODEL_CLICKED' as any, {
                        flashcardId: currentFlashcardId
                    });
                }}
                onComboDetected={(targets) => {
                    console.log('[ARModal] Combo detected:', targets);
                    eventBus.emit('AR_COMBO_ACTIVATED' as any, { targets });
                }}
            >
                {/* Control Panel */}
                <div
                    className="ar-control-panel"
                    style={{
                        position: 'fixed',
                        bottom: 30,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: 16,
                        zIndex: 100002
                    }}
                >
                    {/* 2D/3D Toggle */}
                    <button
                        onClick={() => eventBus.emit('AR_SET_MODE' as any, { mode: '2D' })}
                        style={{
                            background: 'rgba(78, 205, 196, 0.9)',
                            border: 'none',
                            borderRadius: 12,
                            padding: '12px 20px',
                            color: '#fff',
                            fontSize: 16,
                            fontFamily: 'Nunito, sans-serif',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    >
                        📸 2D
                    </button>
                    <button
                        onClick={() => eventBus.emit('AR_SET_MODE' as any, { mode: '3D' })}
                        style={{
                            background: 'rgba(255, 107, 107, 0.9)',
                            border: 'none',
                            borderRadius: 12,
                            padding: '12px 20px',
                            color: '#fff',
                            fontSize: 16,
                            fontFamily: 'Nunito, sans-serif',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    >
                        🎮 3D
                    </button>

                    {/* Complete Button (when viewing) */}
                    {phase === 'VIEWING' && (
                        <button
                            onClick={handleComplete}
                            style={{
                                background: 'rgba(255, 230, 109, 0.9)',
                                border: 'none',
                                borderRadius: 12,
                                padding: '12px 20px',
                                color: '#292F36',
                                fontSize: 16,
                                fontFamily: 'Nunito, sans-serif',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}
                        >
                            ✅ Done
                        </button>
                    )}
                </div>

                {/* Flashcard Info */}
                {arData && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 20,
                            right: 20,
                            background: 'rgba(0,0,0,0.7)',
                            padding: '12px 20px',
                            borderRadius: 12,
                            color: '#fff',
                            fontFamily: 'Nunito, sans-serif',
                            zIndex: 100001
                        }}
                    >
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                            {arData.flashcard.word}
                        </div>
                        <div style={{ fontSize: 14, opacity: 0.8 }}>
                            {arData.flashcard.translation?.vi}
                        </div>
                    </div>
                )}
            </ARContainerV2>
        </div>
    );
};

export default ARModal;
