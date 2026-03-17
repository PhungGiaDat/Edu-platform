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
 *
 * Session Management:
 * - useSessionTimer tracks elapsed time
 * - BreakReminder shown at 25 min warning / 30 min limit
 * - Session logged to backend /api/v1/sessions/start + /end
 *
 * Pronunciation:
 * - Tap 🎤 Speak button → opens pronunciation overlay (PRONUNCIATION state)
 * - Tap 3D model → plays audio (existing handleModelClick)
 * - PronunciationGame upgraded with Gemini AI feedback + backend XP logging
 */

import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { ARContainerV2, ARPhase } from '@/components/ar/ARContainerV2';
import ARControlPanel from '@/components/panel/ARControlPanel';
import { ARGamificationPanel } from '@/components/Gamification/ARGamificationPanel';
import { RewardCelebration } from '@/components/Gamification/RewardCelebration';
import { ErrorFriendly } from '@/components/ErrorFriendly';
import { BreakReminder } from '@/components/BreakReminder';
import { useArData } from '@/hooks/useArData';
import { useQuizData } from '@/hooks/useQuizData';
import { useGameData } from '@/hooks/useGameData';
import { useGamification } from '@/hooks/useGamification';
import { useMultiFlashcard } from '@/hooks/useMultiFlashcard';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { SpeechService } from '@/services/SpeechService';
import { AudioService } from '@/services/AudioService';
import { eventBus } from '@/runtime/EventBus';
import { getApiBase } from '@/config';
import type { DisplayMode, AppMode } from '@/hooks/useDisplayMode';
import type { GameDifficulty, GameType } from '@/types';

const API_BASE = getApiBase();
const USER_ID = 'demo-user';

// Lazy-load heavy overlay components to reduce initial bundle
const QuizOverlay = lazy(() => import('@/components/Quiz').then(m => ({ default: m.QuizOverlay })));
const GameOverlay = lazy(() => import('@/components/GameOverlay').then(m => ({ default: m.GameOverlay })));

// Session limits (in minutes)
const SESSION_LIMIT_MINS = 30;
const SESSION_WARNING_MINS = 25;

// ========== TYPES ==========
type AppState = 'SCANNING' | 'LOADING' | 'VIEWING' | 'QUIZ' | 'GAME' | 'PRONUNCIATION' | 'ERROR';

// ========== INLINE PRONUNCIATION OVERLAY ==========
interface PronunciationOverlayProps {
    word: string;
    audioUrl?: string;
    flashcardQrId?: string;
    onClose: () => void;
}

function PronunciationOverlay({ word, audioUrl, flashcardQrId, onClose }: PronunciationOverlayProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'ai_loading' | 'result'>('idle');
    const [transcription, setTranscription] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; emoji: string; stars: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);

    const handlePlayWord = useCallback(() => {
        HapticService.tap();
        SoundEffectService.play('tap');
        AudioService.playPronunciation(word, 'en', audioUrl);
    }, [word, audioUrl]);

    const fetchAiFeedback = useCallback(async (spokenText: string, sc: number) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/pronunciation/ai-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, spoken_text: spokenText, score: sc }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch {
            if (sc >= 90) return { message: 'Perfect! You are a star!', emoji: '🌟🎉', stars: 3 };
            if (sc >= 70) return { message: 'Great job! Keep it up!', emoji: '⭐✨', stars: 2 };
            if (sc >= 50) return { message: 'Good try!', emoji: '👍💪', stars: 1 };
            return { message: 'Keep practicing!', emoji: '🌈💖', stars: 1 };
        }
    }, [word]);

    const logAttempt = useCallback(async (spokenText: string, sc: number) => {
        try {
            await fetch(`${API_BASE}/api/v1/pronunciation/attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: USER_ID,
                    flashcard_qr_id: flashcardQrId || word,
                    spoken_text: spokenText,
                    score: sc,
                    feedback: null,
                    audio_url: null,
                }),
            });
        } catch (e) {
            console.warn('[PronunciationOverlay] log attempt failed:', e);
        }
    }, [flashcardQrId, word]);

    const handleRecord = useCallback(async () => {
        if (status === 'recording') {
            SpeechService.stopListening();
            setStatus('idle');
            return;
        }
        if (!SpeechService.supported) {
            setError("Your browser doesn't support speech recognition. Try Chrome!");
            return;
        }
        HapticService.tap();
        SoundEffectService.play('tap');
        setStatus('recording');
        setError(null);
        setTranscription(null);
        setScore(null);
        setFeedback(null);

        try {
            const spoken = await SpeechService.startListening('en', 5000);
            setTranscription(spoken);
            setStatus('processing');

            const sc = SpeechService.scorePronunciation(word, spoken);
            if (sc >= 70) { HapticService.success(); SoundEffectService.play('success'); }
            else if (sc >= 50) { HapticService.tap(); SoundEffectService.play('tap'); }
            else { HapticService.error(); SoundEffectService.play('error'); }

            setScore(sc);
            setStatus('ai_loading');

            const [aiFeedback] = await Promise.all([
                fetchAiFeedback(spoken, sc),
                logAttempt(spoken, sc),
            ]);

            setFeedback(aiFeedback);
            setStatus('result');
            setAttempts(a => a + 1);

            eventBus.emit('PRONUNCIATION_RESULT' as any, { word, score: sc, feedback: aiFeedback.message });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            HapticService.error();
            setStatus('idle');
            setError(
                msg.includes('Timeout') ? "I didn't hear anything! Try again? 🎤"
                : msg.includes('not-allowed') ? 'Please allow microphone access! 🎙️'
                : `Oops! ${msg}`
            );
        }
    }, [status, word, fetchAiFeedback, logAttempt]);

    const handleTryAgain = () => {
        HapticService.tap();
        setStatus('idle'); setScore(null); setFeedback(null); setTranscription(null); setError(null);
    };

    const isProcessing = status === 'processing' || status === 'ai_loading' || status === 'result';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                zIndex: 200000,
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(180deg, #1e40af 0%, #1d4ed8 100%)',
                    borderRadius: '28px 28px 0 0',
                    padding: '24px 20px max(24px, env(safe-area-inset-bottom))',
                    width: '100%',
                    maxWidth: 480,
                    textAlign: 'center',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: 0 }}>🎤 Say the word!</p>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                            width: 40, height: 40, color: '#fff', fontSize: 18, cursor: 'pointer'
                        }}
                    >✕</button>
                </div>

                {/* Word + play button */}
                <div style={{
                    background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '12px 20px', marginBottom: 20
                }}>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: 36, margin: '0 0 8px 0' }}>{word}</p>
                    <button
                        onClick={handlePlayWord}
                        style={{
                            background: 'linear-gradient(135deg,#22c55e,#4ade80)', border: 'none',
                            borderRadius: 20, padding: '8px 20px', color: '#fff', fontWeight: 700,
                            fontSize: 14, cursor: 'pointer', minHeight: 44
                        }}
                    >🔊 Hear It</button>
                </div>

                {/* Microphone */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <button
                        onClick={handleRecord}
                        disabled={isProcessing}
                        style={{
                            width: 110, height: 110,
                            borderRadius: '50%',
                            background: status === 'recording'
                                ? 'linear-gradient(135deg,#ef4444,#f87171)'
                                : isProcessing
                                ? 'linear-gradient(135deg,#9ca3af,#d1d5db)'
                                : 'linear-gradient(135deg,#f59e0b,#fbbf24)',
                            border: '6px solid #fff',
                            boxShadow: status === 'recording'
                                ? '0 0 30px rgba(239,68,68,0.6)'
                                : '0 8px 24px rgba(245,158,11,0.5)',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            animation: status === 'recording' ? 'pronPulse2 1s infinite' : 'none',
                        }}
                    >
                        <span style={{ fontSize: 42 }}>
                            {status === 'recording' ? '⏹️' : status === 'ai_loading' ? '🤖' : '🎙️'}
                        </span>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, marginTop: 2 }}>
                            {status === 'recording' ? 'Stop' : status === 'ai_loading' ? 'Thinking...' : 'Speak'}
                        </span>
                    </button>
                </div>

                {/* Status */}
                <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                    {status === 'idle' && '👆 Tap the microphone and say the word!'}
                    {status === 'recording' && '🔴 Listening... Speak now!'}
                    {status === 'processing' && '✨ Checking your pronunciation...'}
                    {status === 'ai_loading' && '🤖 Getting your feedback...'}
                    {status === 'result' && feedback && feedback.emoji}
                </p>

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.2)', border: '2px solid #f87171',
                        borderRadius: 12, padding: '8px 16px', marginBottom: 12
                    }}>
                        <p style={{ color: '#fca5a5', fontWeight: 700, fontSize: 14, margin: 0 }}>{error}</p>
                    </div>
                )}

                {/* Result */}
                {status === 'result' && feedback && score !== null && (
                    <div style={{
                        background: score >= 70 ? 'linear-gradient(135deg,#bbf7d0,#86efac)'
                            : score >= 50 ? 'linear-gradient(135deg,#fef08a,#fde047)'
                            : 'linear-gradient(135deg,#fecaca,#fca5a5)',
                        border: `4px solid ${score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'}`,
                        borderRadius: 16, padding: 16, marginBottom: 12
                    }}>
                        <div>
                            {Array.from({ length: feedback.stars }).map((_, i) => (
                                <span key={i} style={{ fontSize: 28, animationDelay: `${i * 0.1}s` }}>⭐</span>
                            ))}
                        </div>
                        <p style={{ fontSize: 32, margin: '4px 0' }}>{feedback.emoji}</p>
                        <p style={{
                            fontWeight: 900, fontSize: 18, margin: '4px 0',
                            color: score >= 70 ? '#15803d' : score >= 50 ? '#a16207' : '#dc2626'
                        }}>{feedback.message}</p>
                        <p style={{ fontSize: 13, color: '#555', margin: '4px 0' }}>Score: {score}%</p>
                        {transcription && (
                            <p style={{ fontSize: 12, color: '#777', margin: '4px 0' }}>You said: "{transcription}"</p>
                        )}
                        {score < 70 && (
                            <button
                                onClick={handleTryAgain}
                                style={{
                                    marginTop: 8, padding: '8px 20px',
                                    background: 'linear-gradient(135deg,#8b5cf6,#a855f7)',
                                    border: 'none', borderRadius: 20, color: '#fff',
                                    fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 44
                                }}
                            >🔄 Try Again</button>
                        )}
                    </div>
                )}

                {attempts > 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Attempts: {attempts}</p>
                )}
            </div>

            <style>{`
                @keyframes pronPulse2 {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.06); }
                }
            `}</style>
        </div>
    );
}


// ========== PET CHAT POPUP ==========
// Shown when user taps the pet in ARGamificationPanel

function PetChatPopup({ petName, word, onClose }: { petName: string; word: string; onClose: () => void }) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        let cancelled = false;
        const fetchMessage = async () => {
            setLoading(true);
            setDisplayed('');
            try {
                const prompt = word
                    ? `You are ${petName}, a friendly pet. The student just learned '${word}'. Say something fun and encouraging in 1 short sentence.`
                    : `You are ${petName}, a friendly learning pet. Say a short, fun encouraging message to a student in 1 sentence.`;
                const res = await fetch(`${API_BASE}/api/v1/chat/rag`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: prompt, session_id: 'pet-chat' }),
                });
                if (!res.ok) throw new Error('Chat failed');
                const data = await res.json();
                if (!cancelled) setMessage(data.response || 'Keep learning! You are doing great!');
            } catch {
                if (!cancelled) setMessage('You are doing amazing! Keep it up!');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchMessage();
        return () => { cancelled = true; };
    }, [petName, word]);

    // Typewriter effect
    useEffect(() => {
        if (loading || !message) return;
        let i = 0;
        setDisplayed('');
        const interval = setInterval(() => {
            i++;
            setDisplayed(message.slice(0, i));
            if (i >= message.length) clearInterval(interval);
        }, 28);
        return () => clearInterval(interval);
    }, [loading, message]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                zIndex: 500,
                background: 'rgba(0,0,0,0.45)',
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg, #e0f2fe 0%, #f0fdf4 100%)',
                    borderRadius: '24px 24px 0 0',
                    padding: '24px 20px max(24px, env(safe-area-inset-bottom))',
                    width: '100%',
                    maxWidth: 460,
                    textAlign: 'center',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
                    border: '3px solid #bae6fd',
                    borderBottom: 'none',
                }}
            >
                <div style={{ fontSize: 56, marginBottom: 8 }}>
                    {petName === 'Buddy' ? '🐰' : '🐾'}
                </div>
                <p style={{ fontWeight: 800, fontSize: 18, color: '#0369a1', marginBottom: 12 }}>
                    {petName} says...
                </p>
                <div style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '14px 18px',
                    minHeight: 60,
                    border: '2px solid #7dd3fc',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1e293b',
                    lineHeight: 1.5,
                }}>
                    {loading ? (
                        <span style={{ color: '#94a3b8' }}>Thinking...</span>
                    ) : (
                        displayed || '\u00A0'
                    )}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        marginTop: 16,
                        padding: '10px 28px',
                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                        border: 'none',
                        borderRadius: 20,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: 'pointer',
                        minHeight: 44,
                    }}
                >
                    Thanks!
                </button>
            </div>
        </div>
    );
}


// ========== MAIN COMPONENT ==========
export default function LearnARV2() {

    // ========== STATE ==========
    const [appState, setAppState] = useState<AppState>('SCANNING');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('3D');
    const [appMode, setAppMode] = useState<AppMode>('LEARNING');
    const [detectedQrId, setDetectedQrId] = useState<string | null>(null);
    const [_isComboActive, setIsComboActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBreakReminder, setShowBreakReminder] = useState(false);
    // Mirror showBreakReminder in a ref so the unmount cleanup reads the latest value
    // (the cleanup effect has an empty dep array and would otherwise capture a stale false)
    const showBreakReminderRef = useRef(false);

    // Pet chat popup state
    const [petChat, setPetChat] = useState<{ petName: string; word: string } | null>(null);

    // Track whether the AR target marker is visible (for 2D overlay)
    const [markerFound, setMarkerFound] = useState(false);

    // Session ID returned from backend when we POST /sessions/start
    const sessionIdRef = useRef<string | null>(null);

    // Game selection
    const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
    const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
    const [showGameSelector, setShowGameSelector] = useState(false);

    // ========== SESSION TIMER ==========
    const sessionTimer = useSessionTimer({
        limitMins: SESSION_LIMIT_MINS,
        warningMins: SESSION_WARNING_MINS,
        onWarning: () => setShowBreakReminder(true),
        onLimitReached: () => setShowBreakReminder(true),
    });

    // Keep ref in sync with state so unmount cleanup can read the latest value
    useEffect(() => {
        showBreakReminderRef.current = showBreakReminder;
    }, [showBreakReminder]);

    // ── Start backend session on mount ──────────────────────────────────────────
    useEffect(() => {
        const startSession = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/sessions/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: USER_ID, active_topic: null }),
                });
                if (res.ok) {
                    const data = await res.json();
                    sessionIdRef.current = data._id;
                }
            } catch (e) {
                console.warn('[LearnARV2] Failed to start session:', e);
            }
        };
        startSession();
    }, []);

    // ── End backend session on unmount ──────────────────────────────────────────
    useEffect(() => {
        return () => {
            const sid = sessionIdRef.current;
            if (!sid) return;
            // Fire-and-forget (page unmounting)
            fetch(`${API_BASE}/api/v1/sessions/${sid}/end`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ break_reminder_sent: showBreakReminderRef.current }),
                keepalive: true,
            }).catch(() => {});
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        reset: resetMultiFlashcard,
        getFlashcardByIndex
    } = useMultiFlashcard();

    // ========== DATA HOOKS ==========
    const { arData, error: arError } = useArData(detectedQrId);
    const { quizData } = useQuizData(detectedQrId);
    const { gameData } = useGameData(
        detectedQrId,
        selectedDifficulty,
        selectedGameType
    );

    // Gamification
    const { trackFlashcardView, trackComboDiscovered } = useGamification(USER_ID);

    // ========== AR DATA ==========
    const mindUrl = hasCombo && comboMindUrl
        ? comboMindUrl
        : arData?.targets?.[0]?.nft_base_url?.replace(/\.(fset|fset3|iset)$/, '.mind');

    const modelUrl = hasCombo && activeCombo?.model3dUrl
        ? activeCombo.model3dUrl
        : arData?.targets?.[0]?.model_3d_url;

    const imageUrl = hasCombo && activeCombo?.image2dUrl
        ? activeCombo.image2dUrl
        : arData?.targets?.[0]?.image_2d_url || arData?.flashcard?.image_url;

    const modelUrl2 = getFlashcardByIndex(1)?.model3dUrl || arData?.targets?.[1]?.model_3d_url;
    const imageUrl2 = getFlashcardByIndex(1)?.image2dUrl || arData?.targets?.[1]?.image_2d_url;

    // ========== HANDLERS ==========
    const handleQRDetected = useCallback((qrId: string) => {
        console.log('[LearnARV2] QR Detected:', qrId);
        addFlashcard(qrId);
        if (!detectedQrId) setDetectedQrId(qrId);
        setAppState('LOADING');
        trackFlashcardView();
        console.log('[LearnARV2] Multi-mode:', multiMode, 'Cards:', flashcardCount + 1);
    }, [trackFlashcardView, addFlashcard, detectedQrId, multiMode, flashcardCount]);

    const handlePhaseChange = useCallback((phase: ARPhase) => {
        console.log('[LearnARV2] Phase changed:', phase);
        if (phase === 'VIEWING') setAppState('VIEWING');
        else if (phase === 'ERROR') setAppState('ERROR');
    }, []);

    const handleComboDetected = useCallback(async (targets: number[]) => {
        console.log('[LearnARV2] 🔗 AR Combo detected - targets:', targets);
        setIsComboActive(true);
        trackComboDiscovered();
        if (hasCombo && activeCombo) {
            HapticService.levelUp();
            SoundEffectService.play('levelUp');
            eventBus.emit('AR_COMMAND' as any, {
                type: 'TRIGGER_ANIMATION',
                payload: { clip: 'celebrate', loop: false }
            });
        }
    }, [trackComboDiscovered, hasCombo, activeCombo]);

    const handleARMessage = useCallback((event: MessageEvent) => {
        const data = event.data;
        if (!data || !data.type) return;
        const { type, payload } = data;
        switch (type) {
            case 'COMBO_PROXIMITY_DETECTED':
                handleProximityDetected(payload); break;
            case 'COMBO_PROXIMITY_ENDED':
                handleProximityEnded(payload); break;
            case 'COMBO_PROXIMITY_UPDATE':
                handleProximityUpdate(payload); break;
            case 'MULTI_TARGET_DETECTED':
                handleComboDetected(payload.targets); break;
        }
    }, [handleProximityDetected, handleProximityEnded, handleProximityUpdate, handleComboDetected]);

    const handleModelClick = useCallback((modelId: string, targetIndex?: number) => {
        console.log('[LearnARV2] Model clicked:', modelId, 'Index:', targetIndex);
        let targetWord = "";
        let audioUrl = "";
        if (targetIndex === 1) {
            const card2 = getFlashcardByIndex(1);
            if (card2) targetWord = card2.word;
        } else {
            targetWord = arData?.flashcard?.word || "";
            audioUrl = arData?.flashcard?.audio_url || "";
        }
        console.log('[LearnARV2] Pronouncing:', targetWord);
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play().catch((err) => console.log('Audio play error:', err));
        } else if (targetWord) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(targetWord);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                window.speechSynthesis.speak(utterance);
            }
        }
        eventBus.emit('AR_COMMAND' as any, {
            type: 'TRIGGER_ANIMATION',
            payload: { clip: 'tap', loop: false, targetId: modelId }
        });
    }, [arData, getFlashcardByIndex]);

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
        } else if (mode === 'SPEAK') {
            setAppState('PRONUNCIATION');
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

    const handleExitPronunciation = useCallback(() => {
        setAppState('VIEWING');
        setAppMode('LEARNING');
    }, []);

    // Break reminder handlers
    const handleBreakContinue = useCallback(() => {
        setShowBreakReminder(false);
    }, []);

    const handleBreakExtend = useCallback((mins: number) => {
        sessionTimer.extendTime(mins);
        setShowBreakReminder(false);
    }, [sessionTimer]);

    const handleBreakExit = useCallback(async () => {
        // End session on backend
        const sid = sessionIdRef.current;
        if (sid) {
            try {
                await fetch(`${API_BASE}/api/v1/sessions/${sid}/end`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ break_reminder_sent: true }),
                });
            } catch { /* ignore */ }
        }
        // Navigate back to home
        window.location.href = '/';
    }, []);

    // ========== EFFECTS ==========
    useEffect(() => {
        if (arData && appState === 'LOADING') setAppState('VIEWING');
    }, [arData, appState]);

    useEffect(() => {
        if (arError) { setError(arError); setAppState('ERROR'); }
    }, [arError]);

    useEffect(() => {
        window.addEventListener('message', handleARMessage);
        return () => window.removeEventListener('message', handleARMessage);
    }, [handleARMessage]);

    // Pet chat popup — listen for tap on pet in ARGamificationPanel
    useEffect(() => {
        const handler = (data: { petName: string; word: string }) => {
            setPetChat(data);
        };
        eventBus.on('PET_CHAT_OPEN' as any, handler);
        return () => eventBus.off('PET_CHAT_OPEN' as any, handler);
    }, []);

    // ========== RENDER ==========
    return (
        <div className="learn-ar-v2" style={{ position: 'fixed', inset: 0 }}>
            {/* AR Container with iframe swapping */}
            <ARContainerV2
                initialPhase={detectedQrId ? 'VIEWING' : 'SCANNING'}
                mindUrl={mindUrl}
                modelUrl={modelUrl}
                imageUrl={imageUrl}
                modelUrl2={modelUrl2}
                imageUrl2={imageUrl2}
                onPhaseChange={handlePhaseChange}
                onQRDetected={handleQRDetected}
                onTargetFound={(idx) => { console.log('[LearnARV2] Target found:', idx); if (idx === 0) setMarkerFound(true); }}
                onTargetLost={(idx) => { console.log('[LearnARV2] Target lost:', idx); if (idx === 0) setMarkerFound(false); }}
                onModelClick={handleModelClick}
                onComboDetected={handleComboDetected}
            >
                {/* Control Panel - Only show during VIEWING */}
                {appState === 'VIEWING' && (
                    <ARControlPanel
                        displayMode={displayMode}
                        appMode={appMode}
                        onDisplayModeToggle={() => handleDisplayModeChange(displayMode === '2D' ? '3D' : '2D')}
                        onAppModeSwitch={handleAppModeChange}
                    />
                )}
            </ARContainerV2>

            {/* 2D Animated Image Overlay — shown when display mode is 2D and marker not visible */}
            {appState === 'VIEWING' && displayMode === '2D' && !markerFound && arData?.flashcard?.image_url && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        pointerEvents: 'none',
                        background: 'rgba(0,0,0,0.35)',
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.95)',
                            borderRadius: 24,
                            padding: 16,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            textAlign: 'center',
                        }}
                    >
                        <img
                            src={arData.flashcard.image_url}
                            alt={arData.flashcard.word}
                            style={{
                                width: 180,
                                height: 180,
                                objectFit: 'cover',
                                borderRadius: 16,
                                animation: arData.flashcard.image_animation_type === 'bounce'
                                    ? 'imgBounce 1.2s ease-in-out infinite'
                                    : arData.flashcard.image_animation_type === 'pulse'
                                    ? 'imgPulse 1.5s ease-in-out infinite'
                                    : arData.flashcard.image_animation_type === 'wiggle'
                                    ? 'imgWiggle 1s ease-in-out infinite'
                                    : 'imgBounce 2s ease-in-out infinite',
                            }}
                        />
                        <p style={{ fontWeight: 900, fontSize: 24, color: '#1e40af', margin: '10px 0 2px' }}>
                            {arData.flashcard.word}
                        </p>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                            Point your camera at the flashcard
                        </p>
                    </div>
                </div>
            )}

            {/* Quiz Overlay */}
            {appState === 'QUIZ' && quizData && (
                <Suspense fallback={null}>
                    <QuizOverlay quizSession={quizData} onExit={handleExitQuiz} />
                </Suspense>
            )}

            {/* Game Overlay */}
            {appState === 'GAME' && gameData && (
                <Suspense fallback={null}>
                    <GameOverlay gameSession={gameData} onExit={handleExitGame} />
                </Suspense>
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

            {/* Pronunciation Overlay (SPEAK mode) */}
            {appState === 'PRONUNCIATION' && (
                <PronunciationOverlay
                    word={arData?.flashcard?.word || ''}
                    audioUrl={arData?.flashcard?.audio_url}
                    flashcardQrId={detectedQrId || undefined}
                    onClose={handleExitPronunciation}
                />
            )}

            {/* Error State */}
            {appState === 'ERROR' && (
                <ErrorFriendly
                    type="general"
                    title="Oops!"
                    message={error || "Something went wrong. Let's try again!"}
                    onRetry={() => {
                        setAppState('SCANNING');
                        setDetectedQrId(null);
                        resetMultiFlashcard();
                    }}
                    fullScreen
                />
            )}

            {/* Combo Indicator */}
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
                        <p style={{ color: '#fff', fontWeight: 800, fontSize: '18px', textAlign: 'center', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            ✨ COMBO DISCOVERED! ✨
                        </p>
                        {activeCombo && (
                            <p style={{ color: '#fff', fontSize: '14px', textAlign: 'center', margin: '4px 0 0 0', opacity: 0.9 }}>
                                +{activeCombo.bonusXp} XP Bonus!
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Gamification Panel */}
            {appState === 'VIEWING' && (
                <ARGamificationPanel userId={USER_ID} />
            )}

            {/* Reward Celebration Overlay */}
            <RewardCelebration autoListen={true} />

            {/* Break Reminder Overlay */}
            <BreakReminder
                remainingMins={sessionTimer.remainingMins}
                isWarning={showBreakReminder && !sessionTimer.isLimitReached}
                isLimitReached={showBreakReminder && sessionTimer.isLimitReached}
                onContinue={handleBreakContinue}
                onExtend={handleBreakExtend}
                onExit={handleBreakExit}
            />

            {/* Pet Chat Popup — shown when user taps the pet */}
            {petChat && (
                <PetChatPopup
                    petName={petChat.petName}
                    word={petChat.word}
                    onClose={() => setPetChat(null)}
                />
            )}

            {/* Global Animations */}
            <style>{`
                @keyframes comboPulse {
                    0%, 100% { transform: translateX(-50%) scale(1); }
                    50% { transform: translateX(-50%) scale(1.05); }
                }
                @keyframes imgBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
                @keyframes imgPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.85; transform: scale(1.05); }
                }
                @keyframes imgWiggle {
                    0%, 100% { transform: rotate(0deg); }
                    20% { transform: rotate(-8deg); }
                    40% { transform: rotate(8deg); }
                    60% { transform: rotate(-5deg); }
                    80% { transform: rotate(5deg); }
                }
            `}</style>
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
                    textAlign: 'center',
                    position: 'relative'
                }}
            >
                <button
                    onClick={() => { HapticService.tap(); SoundEffectService.play('tap'); onClose(); }}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
                        width: 48, height: 48, minWidth: 48, minHeight: 48,
                        color: '#fff', fontSize: 20, cursor: 'pointer'
                    }}
                >✕</button>

                {!selectedDifficulty ? (
                    <>
                        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 24 }}>🎮 Select Difficulty</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {difficulties.map((d) => (
                                <button
                                    key={d.value}
                                    onClick={() => { HapticService.tap(); SoundEffectService.play('tap'); onDifficultySelect(d.value); }}
                                    style={{
                                        padding: '16px 24px', minHeight: '56px',
                                        background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 16,
                                        fontSize: 18, fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12
                                    }}
                                >
                                    <span style={{ fontSize: 24 }}>{d.emoji}</span>{d.label}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 style={{ color: '#fff', marginBottom: 24, fontSize: 24 }}>🎯 Select Game</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {gameTypes.map((g) => (
                                <button
                                    key={g.value}
                                    onClick={() => { HapticService.success(); SoundEffectService.play('success'); onGameTypeSelect(g.value); }}
                                    style={{
                                        padding: '20px 16px', minHeight: '80px',
                                        background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 16,
                                        fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <span style={{ fontSize: 32 }}>{g.emoji}</span>{g.label}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
