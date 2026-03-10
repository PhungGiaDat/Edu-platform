/**
 * LearnARV2.tsx - New AR Learning Page with MindAR
 * 
 * Uses ARContainerV2 with iframe swapping:
 * - SCANNING phase: ar-scanner.html (jsQR)
 * - VIEWING phase: ar-viewer.html (MindAR)
 * 
 * Multi-Flashcard Detection:
 * - Scan multiple QR codes to detect flashcards
 * - Auto-check for combo when 2+ flashcards detected
 * - Proximity detection triggers combo effects when cards are close
 */

import { useEffect, useState, useCallback } from 'react';
import { ARContainerV2, ARPhase } from '@/components/ar/ARContainerV2';
import ARControlPanel from '@/components/panel/ARControlPanel';
import { QuizOverlay } from '@/components/Quiz';
import { GameOverlay } from '@/components/GameOverlay';
import { ARGamificationPanel } from '@/components/Gamification/ARGamificationPanel';
import { RewardCelebration } from '@/components/Gamification/RewardCelebration';
import { ErrorFriendly } from '@/components/ErrorFriendly';
import { useArData } from '@/hooks/useArData';
import { useQuizData } from '@/hooks/useQuizData';
import { useGameData } from '@/hooks/useGameData';
import { useGamification } from '@/hooks/useGamification';
import { useMultiFlashcard } from '@/hooks/useMultiFlashcard';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { eventBus } from '@/runtime/EventBus';
import type { DisplayMode, AppMode } from '@/hooks/useDisplayMode';
import type { GameDifficulty, GameType } from '@/types';

// ========== TYPES ==========
type AppState = 'SCANNING' | 'LOADING' | 'VIEWING' | 'QUIZ' | 'GAME' | 'ERROR';

export default function LearnARV2() {

    // ========== STATE ==========
    const [appState, setAppState] = useState<AppState>('SCANNING');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('3D');
    const [appMode, setAppMode] = useState<AppMode>('LEARNING');
    const [detectedQrId, setDetectedQrId] = useState<string | null>(null);
    const [_isComboActive, setIsComboActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Game selection
    const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
    const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
    const [showGameSelector, setShowGameSelector] = useState(false);

    // ========== MULTI-FLASHCARD DETECTION ==========
    const {
        addFlashcard,
        flashcardCount,
        activeCombo,
        comboMindUrl,
        mode: multiMode,
        hasCombo,
        isProximityCombo,
        comboTriggered,
        proximity: _proximity,
        handleProximityDetected,
        handleProximityEnded,
        handleProximityUpdate,
        reset: resetMultiFlashcard
    } = useMultiFlashcard();

    // ========== DATA HOOKS ==========
    const { arData, error: arError } = useArData(detectedQrId);
    const { quizData } = useQuizData(detectedQrId);
    const { gameData } = useGameData(
        detectedQrId,
        selectedDifficulty,
        selectedGameType
    );

    // Gamification (use user ID from auth context in production)
    const { trackFlashcardView, trackComboDiscovered } = useGamification('demo-user');

    // ========== AR DATA ==========
    // Use combo mind URL when combo is active, otherwise use single flashcard
    const mindUrl = hasCombo && comboMindUrl
        ? comboMindUrl
        : arData?.targets?.[0]?.nft_base_url?.replace(/\.(fset|fset3|iset)$/, '.mind');

    const modelUrl = hasCombo && activeCombo?.model3dUrl
        ? activeCombo.model3dUrl
        : arData?.targets?.[0]?.model_3d_url;

    const imageUrl = hasCombo && activeCombo?.image2dUrl
        ? activeCombo.image2dUrl
        : arData?.targets?.[0]?.image_2d_url || arData?.flashcard?.image_url;

    // Get second model for multi-target (target-1) - TODO: pass to ARContainerV2 when supported
    // const model2Url = hasCombo
    //     ? getFlashcardByIndex(1)?.model3dUrl
    //     : undefined;

    // ========== HANDLERS ==========
    const handleQRDetected = useCallback((qrId: string) => {
        console.log('[LearnARV2] QR Detected:', qrId);

        // Add to multi-flashcard tracker
        addFlashcard(qrId);

        // Set as primary if no QR detected yet
        if (!detectedQrId) {
            setDetectedQrId(qrId);
        }

        setAppState('LOADING');
        trackFlashcardView();

        console.log('[LearnARV2] Multi-mode:', multiMode, 'Cards:', flashcardCount + 1);
    }, [trackFlashcardView, addFlashcard, detectedQrId, multiMode, flashcardCount]);

    const handlePhaseChange = useCallback((phase: ARPhase) => {
        console.log('[LearnARV2] Phase changed:', phase);

        if (phase === 'VIEWING') {
            setAppState('VIEWING');
        } else if (phase === 'ERROR') {
            setAppState('ERROR');
        }
    }, []);

    const handleComboDetected = useCallback(async (targets: number[]) => {
        console.log('[LearnARV2] 🔗 AR Combo detected - targets:', targets);
        setIsComboActive(true);
        trackComboDiscovered();

        // The combo is already checked by useMultiFlashcard hook
        // Just log and celebrate if combo exists
        if (hasCombo && activeCombo) {
            console.log('[LearnARV2] ✅ Active combo:', activeCombo.comboId);
            console.log('[LearnARV2] 🎁 Bonus XP:', activeCombo.bonusXp);

            // Trigger celebration
            HapticService.levelUp();
            SoundEffectService.play('levelUp');

            eventBus.emit('AR_COMMAND' as any, {
                type: 'TRIGGER_ANIMATION',
                payload: { clip: 'celebrate', loop: false }
            });
        }
    }, [trackComboDiscovered, hasCombo, activeCombo]);

    /**
     * Handle proximity events from AR viewer iframe
     */
    const handleARMessage = useCallback((event: MessageEvent) => {
        const data = event.data;
        if (!data || !data.type) return;

        const { type, payload } = data;

        switch (type) {
            case 'COMBO_PROXIMITY_DETECTED':
                console.log('[LearnARV2] 🎯 Proximity combo detected:', payload);
                handleProximityDetected(payload);
                break;

            case 'COMBO_PROXIMITY_ENDED':
                console.log('[LearnARV2] 👋 Proximity combo ended:', payload);
                handleProximityEnded(payload);
                break;

            case 'COMBO_PROXIMITY_UPDATE':
                handleProximityUpdate(payload);
                break;

            case 'MULTI_TARGET_DETECTED':
                console.log('[LearnARV2] 🔗 Multi-target detected:', payload);
                handleComboDetected(payload.targets);
                break;
        }
    }, [handleProximityDetected, handleProximityEnded, handleProximityUpdate, handleComboDetected]);

    const handleModelClick = useCallback((modelId: string) => {
        console.log('[LearnARV2] Model clicked:', modelId);

        // Play audio
        if (arData?.flashcard?.audio_url) {
            const audio = new Audio(arData.flashcard.audio_url);
            audio.play().catch(() => { });
        }

        // Trigger "tap" animation in AR
        eventBus.emit('AR_COMMAND' as any, {
            type: 'TRIGGER_ANIMATION',
            payload: { clip: 'tap', loop: false }
        });
    }, [arData]);

    // Mode toggles
    const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
        setDisplayMode(mode);
        eventBus.emit('AR_SET_MODE' as any, { mode });
    }, []);

    const handleAppModeChange = useCallback((mode: AppMode) => {
        setAppMode(mode);
        if (mode === 'QUIZ') {
            setAppState('QUIZ');
        } else if (mode === 'GAME') {
            setShowGameSelector(true);
        } else {
            setAppState('VIEWING');
        }
    }, []);

    // Game selection
    const handleDifficultySelect = useCallback((difficulty: GameDifficulty) => {
        setSelectedDifficulty(difficulty);
    }, []);

    const handleGameTypeSelect = useCallback((gameType: GameType) => {
        setSelectedGameType(gameType);
        setShowGameSelector(false);
        setAppState('GAME');
    }, []);

    // Exit handlers
    const handleExitQuiz = useCallback(() => {
        setAppState('VIEWING');
        setAppMode('LEARNING');
    }, []);

    const handleExitGame = useCallback(() => {
        setAppState('VIEWING');
        setAppMode('LEARNING');
        setSelectedDifficulty(null);
        setSelectedGameType(null);
    }, []);

    // Exit to flashcards (can be used via close button if added)

    // ========== EFFECTS ==========
    useEffect(() => {
        if (arData && appState === 'LOADING') {
            setAppState('VIEWING');
        }
    }, [arData, appState]);

    useEffect(() => {
        if (arError) {
            setError(arError);
            setAppState('ERROR');
        }
    }, [arError]);

    // Listen for AR messages (proximity events)
    useEffect(() => {
        window.addEventListener('message', handleARMessage);
        return () => {
            window.removeEventListener('message', handleARMessage);
        };
    }, [handleARMessage]);

    // ========== RENDER ==========
    return (
        <div className="learn-ar-v2" style={{ position: 'fixed', inset: 0 }}>
            {/* AR Container with iframe swapping */}
            <ARContainerV2
                initialPhase={detectedQrId ? 'VIEWING' : 'SCANNING'}
                mindUrl={mindUrl}
                modelUrl={modelUrl}
                imageUrl={imageUrl}
                onPhaseChange={handlePhaseChange}
                onQRDetected={handleQRDetected}
                onTargetFound={(idx) => console.log('[LearnARV2] Target found:', idx)}
                onTargetLost={(idx) => console.log('[LearnARV2] Target lost:', idx)}
                onModelClick={handleModelClick}
                onComboDetected={handleComboDetected}
            >
                {/* Control Panel - Only show after QR detected */}
                {appState === 'VIEWING' && (
                    <ARControlPanel
                        displayMode={displayMode}
                        appMode={appMode}
                        onDisplayModeToggle={() => handleDisplayModeChange(displayMode === '2D' ? '3D' : '2D')}
                        onAppModeSwitch={handleAppModeChange}
                    />
                )}

                {/* Flashcard Info - Removed per user request */}
                {/* Loading indicator - Removed per user request */}
            </ARContainerV2>

            {/* Quiz Overlay */}
            {appState === 'QUIZ' && quizData && (
                <QuizOverlay
                    quizSession={quizData}
                    onExit={handleExitQuiz}
                />
            )}

            {/* Game Overlay */}
            {appState === 'GAME' && gameData && (
                <GameOverlay
                    gameSession={gameData}
                    onExit={handleExitGame}
                />
            )}

            {/* Game Selector */}
            {showGameSelector && (
                <GameSelector
                    selectedDifficulty={selectedDifficulty}
                    onDifficultySelect={handleDifficultySelect}
                    onGameTypeSelect={handleGameTypeSelect}
                    onClose={() => setShowGameSelector(false)}
                />
            )}

            {/* Error State - Kid-Friendly */}
            {appState === 'ERROR' && (
                <ErrorFriendly
                    type="general"
                    title="Oops!"
                    message={error || 'Something went wrong. Let\'s try again!'}
                    onRetry={() => {
                        setAppState('SCANNING');
                        setDetectedQrId(null);
                        resetMultiFlashcard();
                    }}
                    fullScreen
                />
            )}

            {/* Combo Indicator - Shows when proximity combo is active */}
            {isProximityCombo && comboTriggered && appState === 'VIEWING' && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 'max(100px, env(safe-area-inset-bottom))',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100001,
                        pointerEvents: 'none'
                    }}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #FFD700 0%, #FF6B6B 50%, #A855F7 100%)',
                            padding: '12px 24px',
                            borderRadius: '24px',
                            boxShadow: '0 4px 20px rgba(255, 107, 107, 0.5)',
                            border: '3px solid #fff',
                            animation: 'comboPulse 1s ease-in-out infinite'
                        }}
                    >
                        <p
                            style={{
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '18px',
                                textAlign: 'center',
                                margin: 0,
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                        >
                            ✨ COMBO DISCOVERED! ✨
                        </p>
                        {activeCombo && (
                            <p
                                style={{
                                    color: '#fff',
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    margin: '4px 0 0 0',
                                    opacity: 0.9
                                }}
                            >
                                +{activeCombo.bonusXp} XP Bonus!
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Combo pulse animation */}
            <style>{`
                @keyframes comboPulse {
                    0%, 100% { transform: translateX(-50%) scale(1); }
                    50% { transform: translateX(-50%) scale(1.05); }
                }
            `}</style>

            {/* Gamification Panel - Pet & Leaderboard (visible during VIEWING) */}
            {appState === 'VIEWING' && (
                <ARGamificationPanel userId="demo-user" />
            )}

            {/* Reward Celebration Overlay - auto-listens to EventBus */}
            <RewardCelebration autoListen={true} />
        </div>
    );
}

// ========== GAME SELECTOR COMPONENT ==========
interface GameSelectorProps {
    selectedDifficulty: GameDifficulty | null;
    onDifficultySelect: (d: GameDifficulty) => void;
    onGameTypeSelect: (t: GameType) => void;
    onClose: () => void;
}

function GameSelector({ selectedDifficulty, onDifficultySelect, onGameTypeSelect, onClose }: GameSelectorProps) {
    const difficulties: { value: GameDifficulty; label: string; emoji: string }[] = [
        { value: 'easy', label: 'Easy', emoji: '🌱' },
        { value: 'medium', label: 'Medium', emoji: '🌿' },
        { value: 'hard', label: 'Hard', emoji: '🌳' }
    ];

    const gameTypes: { value: GameType; label: string; emoji: string }[] = [
        { value: 'drag_match', label: 'Match', emoji: '🎯' },
        { value: 'memory_match', label: 'Memory', emoji: '🧠' },
        { value: 'word_scramble', label: 'Scramble', emoji: '🔤' },
        { value: 'catch_word', label: 'Catch', emoji: '🎮' },
        { value: 'pronunciation', label: 'Speak', emoji: '🎤' }
    ];

    const handleDifficultyClick = (value: GameDifficulty) => {
        HapticService.tap();
        SoundEffectService.play('tap');
        onDifficultySelect(value);
    };

    const handleGameTypeClick = (value: GameType) => {
        HapticService.success();
        SoundEffectService.play('success');
        onGameTypeSelect(value);
    };

    const handleClose = () => {
        HapticService.tap();
        SoundEffectService.play('tap');
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100003
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: 32,
                    borderRadius: 24,
                    maxWidth: 400,
                    width: '90%',
                    textAlign: 'center'
                }}
            >
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 48,
                        height: 48,
                        minWidth: 48,
                        minHeight: 48,
                        color: '#fff',
                        fontSize: 20,
                        cursor: 'pointer'
                    }}
                >
                    ✕
                </button>

                {!selectedDifficulty ? (
                    <>
                        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 24 }}>
                            🎮 Select Difficulty
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {difficulties.map((d) => (
                                <button
                                    key={d.value}
                                    onClick={() => handleDifficultyClick(d.value)}
                                    style={{
                                        padding: '16px 24px',
                                        minHeight: '56px',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: 'none',
                                        borderRadius: 16,
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 12
                                    }}
                                >
                                    <span style={{ fontSize: 24 }}>{d.emoji}</span>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 24 }}>
                            🎯 Select Game
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {gameTypes.map((g) => (
                                <button
                                    key={g.value}
                                    onClick={() => handleGameTypeClick(g.value)}
                                    style={{
                                        padding: '20px 16px',
                                        minHeight: '80px',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: 'none',
                                        borderRadius: 16,
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 8
                                    }}
                                >
                                    <span style={{ fontSize: 32 }}>{g.emoji}</span>
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
