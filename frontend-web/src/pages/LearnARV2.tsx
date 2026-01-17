/**
 * LearnARV2.tsx - New AR Learning Page with MindAR
 * 
 * Uses ARContainerV2 with iframe swapping:
 * - SCANNING phase: ar-scanner.html (jsQR)
 * - VIEWING phase: ar-viewer.html (MindAR)
 */

import { useEffect, useState, useCallback } from 'react';
import { ARContainerV2, ARPhase } from '@/components/ar/ARContainerV2';
import ARControlPanel from '@/components/panel/ARControlPanel';
import { QuizOverlay } from '@/components/Quiz';
import { GameOverlay } from '@/components/GameOverlay';
import { useArData } from '@/hooks/useArData';
import { useQuizData } from '@/hooks/useQuizData';
import { useGameData } from '@/hooks/useGameData';
import { useGamification } from '@/hooks/useGamification';
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
    const mindUrl = arData?.targets?.[0]?.nft_base_url?.replace(/\.(fset|fset3|iset)$/, '.mind') ||
        '/assets/target/elephant_targets.mind';
    const modelUrl = arData?.targets?.[0]?.model_3d_url || '/assets/models/elephant cartoon.glb';
    const imageUrl = arData?.targets?.[0]?.image_2d_url || arData?.flashcard?.image_url || undefined;

    // ========== HANDLERS ==========
    const handleQRDetected = useCallback((qrId: string) => {
        console.log('[LearnARV2] QR Detected:', qrId);
        setDetectedQrId(qrId);
        setAppState('LOADING');
        trackFlashcardView();
    }, [trackFlashcardView]);

    const handlePhaseChange = useCallback((phase: ARPhase) => {
        console.log('[LearnARV2] Phase changed:', phase);

        if (phase === 'VIEWING') {
            setAppState('VIEWING');
        } else if (phase === 'ERROR') {
            setAppState('ERROR');
        }
    }, []);

    const handleComboDetected = useCallback(async (targets: number[]) => {
        console.log('[LearnARV2] Combo detected:', targets);
        setIsComboActive(true);
        trackComboDiscovered();

        // Check for combo via API
        try {
            const arTags = targets.map(i => encodeURIComponent(`target-${i}`));
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE || ''}/api/combos/check?tags=${arTags.join(',')}`
            );

            if (!response.ok) {
                console.warn('[LearnARV2] Combo check returned', response.status);
                return;
            }

            const data = await response.json();

            if (data.found && data.combo) {
                console.log('[LearnARV2] Combo found:', data.combo);
                // Could load combo model here
            }
        } catch (error) {
            console.error('[LearnARV2] Combo check failed:', error);
        }
    }, [trackComboDiscovered]);

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

            {/* Error State */}
            {appState === 'ERROR' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#FF6B6B',
                        fontFamily: 'Nunito, sans-serif',
                        zIndex: 100002
                    }}
                >
                    <span style={{ fontSize: 64 }}>❌</span>
                    <p style={{ fontSize: 20, marginTop: 16 }}>{error || 'Something went wrong'}</p>
                    <button
                        onClick={() => { setAppState('SCANNING'); setDetectedQrId(null); }}
                        style={{
                            marginTop: 24,
                            padding: '12px 32px',
                            background: '#4ECDC4',
                            border: 'none',
                            borderRadius: 24,
                            color: '#fff',
                            fontSize: 18,
                            cursor: 'pointer'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}
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
        { value: 'catch_word', label: 'Catch', emoji: '🎮' }
    ];

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
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
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
                                    onClick={() => onDifficultySelect(d.value)}
                                    style={{
                                        padding: '16px 24px',
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
                                    onClick={() => onGameTypeSelect(g.value)}
                                    style={{
                                        padding: '20px 16px',
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
