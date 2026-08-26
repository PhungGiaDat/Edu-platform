/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * - GlobalSessionWatcher tracks elapsed time across learning routes
 * - Normal sessions use 25/30 min; ?debug=true uses 7h55/8h for testing
 * - Session logged to backend /api/v1/sessions/start + /end
 *
 * Pronunciation:
 * - Tap 🎤 Speak button → opens pronunciation overlay (PRONUNCIATION state)
 * - Tap 3D model → plays audio (existing handleModelClick)
 * - PronunciationGame upgraded with Gemini AI feedback + backend XP logging
 */

import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { ARContainerV2, ARPhase } from '@/components/ar/ARContainerV2';
import { ArCardRejectedToast, type ArCardRejectedData } from '@/components/ar/ArCardRejectedToast';
import { applyInteractionFeedback } from '@/components/ar/modelInteractionPolicy';
import ARControlPanel from '@/components/panel/ARControlPanel';
import { ARGamificationPanel } from '@/components/Gamification/ARGamificationPanel';
import { PetSelector } from '@/components/pets/PetSelector';
import { RewardCelebration } from '@/components/Gamification/RewardCelebration';
import { ErrorFriendly } from '@/components/ErrorFriendly';
import { useArData } from '@/hooks/useArData';
import { useQuizData } from '@/hooks/useQuizData';
import { useGameData } from '@/hooks/useGameData';
import { usePets } from '@/hooks/usePets';
import { useGamification } from '@/hooks/useGamification';
import { useMultiFlashcard } from '@/hooks/useMultiFlashcard';
import { useFlashcardSnapshot } from '@/hooks/useFlashcardSnapshot';
import { useARFallback } from '@/hooks/useARFallback';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { SpeechService } from '@/services/SpeechService';
import { AudioService } from '@/services/AudioService';
import { eventBus } from '@/runtime/EventBus';
import { getApiBase, AR_MAX_TRACKS, isPersistentMindViewerEnabled } from '@/config';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import type { DisplayMode, AppMode } from '@/hooks/useDisplayMode';
import type { GameDifficulty, GameType } from '@/types';

const API_BASE = getApiBase();

// Lazy-load heavy overlay components to reduce initial bundle
const QuizOverlay = lazy(() => import('@/components/Quiz').then(m => ({ default: m.QuizOverlay })));
const GameOverlay = lazy(() => import('@/components/GameOverlay').then(m => ({ default: m.GameOverlay })));

const RECOVERABLE_AR_ERROR_CODES = new Set([
    'MODEL_LOAD_ERROR',
    'IMAGE_LOAD_ERROR',
    'TEXTURE_LOAD_ERROR',
    'TEXTURE_APPLY_ERROR'
]);

function resolveMindUrl(rawUrl?: string): string | undefined {
    if (!rawUrl) return undefined;
    const trimmed = rawUrl.trim();
    if (!trimmed) return undefined;

    const match = trimmed.match(/^([^?#]*)([?#].*)?$/);
    if (!match) return undefined;

    const path = match[1];
    const suffix = match[2] || '';

    if (path.toLowerCase().endsWith('.mind')) {
        return trimmed;
    }

    if (/\.(fset|fset3|iset)$/i.test(path)) {
        return `${path.replace(/\.(fset|fset3|iset)$/i, '.mind')}${suffix}`;
    }

    const lastSegment = path.split('/').pop() || '';
    if (lastSegment && !lastSegment.includes('.')) {
        return `${path}.mind${suffix}`;
    }

    return trimmed;
}

// ========== TYPES ==========
type AppState = 'SCANNING' | 'LOADING' | 'VIEWING' | 'QUIZ' | 'GAME' | 'PRONUNCIATION' | 'ERROR';

// ========== INLINE PRONUNCIATION OVERLAY ==========
interface PronunciationOverlayProps {
    word: string;
    audioUrl?: string;
    flashcardQrId?: string;
    userId?: string | null;
    authToken?: string | null;
    isGuest?: boolean;
    onClose: () => void;
}

function PronunciationOverlay({ word, audioUrl, flashcardQrId, userId, authToken, isGuest, onClose }: PronunciationOverlayProps) {
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
        if (isGuest || !authToken || !userId) return;
        try {
            await apiClient.post('/api/v1/pronunciation/attempt', {
                user_id: userId,
                flashcard_qr_id: flashcardQrId || word,
                spoken_text: spokenText,
                score: sc,
                feedback: null,
                audio_url: null,
            });
        } catch (e) {
            console.warn('[PronunciationOverlay] log attempt failed:', e);
        }
    }, [flashcardQrId, word, userId, authToken, isGuest]);

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
                                    background: 'linear-gradient(135deg,#0ea5e9,#22c55e)',
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
    const { user, token, isGuest, isAuthenticated, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    const emitMobileDebug = useCallback((label: string, details: Record<string, unknown> = {}) => {
        // 1. Local desktop: postMessage for the browser console panel
        window.postMessage({
            type: 'AR_DEBUG',
            payload: { label, details, source: 'learn-ar-page' },
            timestamp: Date.now(),
            origin: 'parent'
        }, '*');

        // 2. Vercel function logs — always logged so you can tail in Vercel dashboard
        console.log(`[AR_DEBUG] ${label}`, details);

        // 3. Mobile on Vercel: fire-and-forget POST to Render backend
        //    Logs appear in Render's log stream (render.com → your service → Logs)
        fetch(`${API_BASE}/api/v1/debug/ar-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, details, source: 'learn-ar-page', timestamp: Date.now() }),
        }).catch(() => {}); // swallow errors — never block UX
    }, []);

    // Redirect to login if not authenticated (after auth finishes loading)
    useEffect(() => {
        if (!authLoading && !isAuthenticated && !isGuest) {
            navigate('/login', { replace: true });
        }
    }, [authLoading, isAuthenticated, isGuest, navigate]);

    // Derive user ID from JWT; guest mode has no user id and must stay read-only
    const USER_ID = isGuest ? null : (user?.id ?? null);

    // ========== STATE ==========
    const [appState, setAppState] = useState<AppState>('SCANNING');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('3D');
    const [appMode, setAppMode] = useState<AppMode>('LEARNING');
    const [detectedQrId, setDetectedQrId] = useState<string | null>(null);
    const [committedComboId, setCommittedComboId] = useState<string | null>(null);
    const [multiPreparation, setMultiPreparation] = useState<{
        key: string | null;
        status: 'idle' | 'preparing' | 'ready' | 'committed' | 'error';
        mindUrl: string | null;
        mindBuffer: Uint8Array | null;
        progress: number;
        error: string | null;
    }>({ key: null, status: 'idle', mindUrl: null, mindBuffer: null, progress: 0, error: null });
    // Persistent mode: combo resolution is driven by the backend. No runtime merge state needed.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_multiRetryToken, setMultiRetryToken] = useState(0);
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [, setIsComboActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pet chat popup state
    const [petChat, setPetChat] = useState<{ petName: string; word: string } | null>(null);
    const [isPetSelectorOpen, setIsPetSelectorOpen] = useState(false);

    // Card rejection toast state
    const [rejectedCard, setRejectedCard] = useState<ArCardRejectedData | null>(null);

    // ========== MULTI-FLASHCARD DETECTION ==========
    const {
        addFlashcard,
        removeFlashcard,
        detectedFlashcards,
        flashcardCount,
        activeCombo,
        comboMindUrl,
        hasCombo,
        isProximityCombo,
        comboTriggered,
        comboKey,
        comboResolution,
        shouldUseComboMindUrl,
        proximity: _proximity, // eslint-disable-line @typescript-eslint/no-unused-vars
        handleProximityDetected,
        handleProximityEnded,
        handleProximityUpdate,
        rejectCombo,
        reset: resetMultiFlashcard,
        getFlashcardByIndex,
        getFlashcardByTag,
    } = useMultiFlashcard((event) => {
        setRejectedCard({
            qrId: event.qrId,
            errorCode: event.code,
            errorMessage: event.message,
        });
    });

    // Realtime Offset Tuning State
    const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 });
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleSyncDiscord = useCallback(async () => {
        if (syncStatus === 'syncing') return;
        setSyncStatus('syncing');
        HapticService.tap();
        const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1542098492200189964/sP6wSXxxHXqm7uFVn3s1W_sfHLwKaqW1T2kg1GP5e6JvcGKlKeFA2TDDFO-Lo-F4K0Is";
        
        // Collect logs from parent buffer
        let logs = (window as any).MobileDebug?.getLogs?.() || "No logs found in Parent buffer.";
        
        // Discord has a 2000 character limit for 'content'. 
        // We'll keep metadata and take the last 1400 chars of logs to be safe.
        const metadata = `🚀 **AR Sync Report**\n` +
            `**Offset:** X:${manualOffset.x}, Y:${manualOffset.y}\n` +
            `**Flashcards:** ${flashcardCount}\n` +
            `**Engine:** ${(window as any).MobileDebug?.activeEngine || 'unknown'}\n` +
            `**Time:** ${new Date().toISOString()}\n\n` +
            `**Logs Snapshot:**\n`;
            
        const maxLogChars = 2000 - metadata.length - 10; // -10 for code block backticks
        const slicedLogs = logs.length > maxLogChars ? `...${logs.slice(-maxLogChars)}` : logs;
        const content = `${metadata}\`\`\`\n${slicedLogs}\n\`\`\``;

        try {
            const response = await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                setSyncStatus('success');
                HapticService.success();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (e) {
            console.error('❌ Parent Discord Sync Failed:', e);
            setSyncStatus('error');
            HapticService.error();
            // Fallback: try to trigger iframe sync
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ type: 'SYNC_DISCORD_REQUEST' }, '*');
            }
        } finally {
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    }, [manualOffset, flashcardCount, comboKey, syncStatus]);

    const handleAdjustOffset = useCallback((axis: 'x' | 'y', delta: number) => {
        setManualOffset(prev => {
            const nextValue = parseFloat((prev[axis as keyof typeof prev] + delta).toFixed(2));
            const next = { ...prev, [axis]: nextValue };
            
            // Update URL for persistence
            const url = new URL(window.location.href);
            url.searchParams.set(`pModelOffset${axis.toUpperCase()}`, nextValue.toString());
            window.history.replaceState({}, '', url.toString());
            
            // Send update to Iframe immediately using stable ref
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ 
                    type: 'UPDATE_MANUAL_OFFSET', 
                    payload: next 
                }, '*');
            }
            HapticService.tap();
            return next;
        });
    }, []);

    // Task 9: Callbacks for revision ACK/reject from persistent viewer
    const handleActiveTargetsApplied = useCallback((revision: number) => {
        emitMobileDebug('PERSISTENT_TARGETS_APPLIED', { revision });
    }, [emitMobileDebug]);

    // handleActiveTargetsRejected removed as handleActiveTargetsRejectedInternal is used instead.

    // Track whether the AR target marker is visible (for 2D overlay)
    const [markerFound, setMarkerFound] = useState(false);
    // Freeze Pose: track which target is currently stabilized
    const [_stableTarget, setStableTarget] = useState<number | null>(null);
    const detectedQrIdRef = useRef<string | null>(null);
    const isAddingCardRef = useRef(false);
    const qrGateRef = useRef<Map<string, number>>(new Map());
    const lastTargetEventRef = useRef(0);
    const multiPreparingKeyRef = useRef<string | null>(null);

    // Session ID returned from backend when we POST /sessions/start
    const sessionIdRef = useRef<string | null>(null);

    // Game selection
    const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);
    const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
    const [showGameSelector, setShowGameSelector] = useState(false);

    // ── Start backend session on mount (only when authenticated) ────────────────
    useEffect(() => {
        if (!USER_ID || !token) return;
        const startSession = async () => {
            try {
                const data = await apiClient.post('/api/v1/sessions/start', {
                    user_id: USER_ID,
                    active_topic: null,
                });
                if (data?._id) {
                    sessionIdRef.current = data._id;
                }
            } catch (e) {
                console.warn('[LearnARV2] Failed to start session:', e);
            }
        };
        startSession();
     
    }, [USER_ID, token]);

    // ── End backend session on unmount ──────────────────────────────────────────
    // Capture token in a ref so the cleanup closure always has the latest value
    const tokenRef = useRef(token);
    useEffect(() => { tokenRef.current = token; }, [token]);

    useEffect(() => {
        return () => {
            const sid = sessionIdRef.current;
            if (!sid) return;
            if (!tokenRef.current) return;
            // Fire-and-forget (page unmounting)
            apiClient.patch(
                `/api/v1/sessions/${sid}/end`,
                { break_reminder_sent: false },
                { keepalive: true }
            ).catch(() => {});
        };
         
    }, []);



    // ========== PERSISTENT VIEWER FLAG (must be before other refs/constants that use it) ==========
    const isPersistentViewerEnabled = isPersistentMindViewerEnabled();

	    // Spec A: enable auto QR-in-scene when persistent viewer active, VIEWING phase, and fewer than 2 cards
	    const autoQrScanEnabled =
	        isPersistentViewerEnabled &&
	        appState === 'VIEWING' &&
	        flashcardCount < 2;
	    
	    // Explicitly force isAddingCard to false to hide any legacy UI triggers
	    useEffect(() => {
	        if (isPersistentViewerEnabled && isAddingCard) {
	            setIsAddingCard(false);
	        }
	    }, [isAddingCard, isPersistentViewerEnabled]);

    // ========== DATA HOOKS ==========
    const { arData, error: arError } = useArData(detectedQrId);
    const { quizData } = useQuizData(detectedQrId, selectedDifficulty);
    const { gameData } = useGameData(
        detectedQrId,
        selectedDifficulty,
        selectedGameType
    );

    // Gamification
    const { progress, trackFlashcardView, trackComboDiscovered } = useGamification(USER_ID);

    // AR Engine Fallback (MindAR → 8th Wall)
    const {
        engine,
        fallbackTriggered,
        handleSystemError,
    } = useARFallback({
        initialEngine: 'mindar',
        timeoutMs: 55_000,  // used only if automatic fallback is re-enabled later
        // This deck currently has no XR target endpoint (it returns 404).
        // Keep the working MindAR session instead of navigating to a broken
        // fallback. ?force-fallback=xr remains available for explicit tests.
        automaticFallbackEnabled: false,
        onFallbackTriggered: (reason) => {
            console.warn('[LearnARV2] AR fallback triggered:', reason);
            emitMobileDebug('AR_FALLBACK_TRIGGERED', { reason });
        },
    });

    // Pets
    const { pets, unlockPet, setActivePet, recentlyUnlocked } = usePets(USER_ID);

    // ========== AR DATA ==========
    useEffect(() => {
        detectedQrIdRef.current = detectedQrId;
    }, [detectedQrId]);

    useEffect(() => {
        isAddingCardRef.current = isAddingCard;
    }, [isAddingCard]);

    useEffect(() => {
        if (!hasCombo || !activeCombo || !comboMindUrl || flashcardCount < 2) return;
        if (committedComboId === activeCombo.comboId) return;

        let cancelled = false;
        let timeoutId: number | undefined;

        const commitWhenTrackingSettles = () => {
            const msSinceTargetEvent = Date.now() - lastTargetEventRef.current;
            if (msSinceTargetEvent < 900) {
                timeoutId = window.setTimeout(commitWhenTrackingSettles, 900 - msSinceTargetEvent);
                return;
            }
            if (!cancelled) {
                console.log('[LearnARV2] Committing combo viewer:', activeCombo.comboId);
                setCommittedComboId(activeCombo.comboId);
            }
        };

        timeoutId = window.setTimeout(commitWhenTrackingSettles, 700);
        return () => {
            cancelled = true;
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, [hasCombo, activeCombo, comboMindUrl, flashcardCount, committedComboId]);

    // Task 10: Combo viewer is active when:
    // - Legacy mode: combo found + merge committed (no pending add)
    // - Persistent mode: combo found + not in add mode (no merge needed)
    const isComboViewer = Boolean(
        comboResolution === 'found' &&
        !isAddingCard &&
        (
            (!isPersistentViewerEnabled && multiPreparation.status === 'committed') ||
            (isPersistentViewerEnabled)
        )
    );

    useEffect(() => {
        if (!isAddingCard || comboResolution !== 'found') return;
        setIsAddingCard(false);
        setAppState('VIEWING');
        window.setTimeout(() => {
            eventBus.emit('AR_SWITCH_TO_VIEWER' as any, {});
        }, 100);
    }, [isAddingCard, comboResolution]);

    const flashcardSnapshot = useFlashcardSnapshot((i) => getFlashcardByIndex(i));
    const scannedTarget0 = flashcardSnapshot.card0;
    const scannedTarget1 = flashcardSnapshot.card1;
    const scannedTargets = Array.from(detectedFlashcards.values()).slice(0, AR_MAX_TRACKS);

    // ── AR Engine Fallback: navigate to 8th Wall when MindAR fails ──────────────
    useEffect(() => {
        if (engine === 'xr' && fallbackTriggered) {
            const deckId = scannedTarget0?.mindCatalogId || 'claymorphic-animals-001';
            navigate(`/learn-ar-xr/${deckId}`, { replace: true });
        }
    }, [engine, fallbackTriggered, scannedTarget0, navigate]);

    // Effect: Use backend combo_mind_url directly (no merge needed)
    // Task 9: Skip this effect when persistent viewer is enabled - combos use tag resolution instead
    useEffect(() => {
        if (!shouldUseComboMindUrl || !comboMindUrl || !comboKey) return;
        if (isPersistentViewerEnabled) {
            emitMobileDebug('PERSISTENT_SKIP_COMBO_MIND_URL', { comboKey });
            return;
        }

        emitMobileDebug('COMBO_MIND_URL_FROM_BACKEND', {
            comboKey,
            comboMindUrl,
            flashcardCount
        });

        // Use the backend-provided combo mind URL directly — no merge needed.
        // This is the pre-built combo .mind file that contains both target images.
        setMultiPreparation(prev => {
            // Skip if already preparing or committed for this combo
            if (prev.key === comboKey && prev.status !== 'idle') return prev;
            return {
                key: comboKey,
                status: 'ready',
                mindUrl: comboMindUrl,
                mindBuffer: null, // Not using buffer — using URL directly
                progress: 100,
                error: null
            };
        });
    }, [shouldUseComboMindUrl, comboMindUrl, comboKey, isPersistentViewerEnabled, emitMobileDebug]);

    // Persistent mode: combos are resolved by the backend and sent via
    // SET_ACTIVE_TARGETS. No runtime merge is needed.

    // In persistent mode, combos use the backend-provided mindUrl from the
    // combo detection response. No runtime buffer merge is needed.

    // Resolve combo mind URL from backend — single source for both legacy and persistent paths.
    const resolvedComboMindUrl = comboMindUrl || activeCombo?.comboMindUrl || undefined;

    // Determine which mind URL to use:
    // - Combo mode (isComboViewer) → use combo_mind_url from backend (resolvedComboMindUrl)
    // - Single card → use first card's mindUrl
    const mindUrl = isComboViewer
        ? resolveMindUrl(resolvedComboMindUrl)
        : resolveMindUrl(scannedTarget0?.mindUrl || arData?.targets?.[0]?.nft_base_url);

    const comboTarget0 = scannedTarget0;
    const comboTarget1 = scannedTarget1;
    const fallbackTarget1 = scannedTarget1;

    const modelUrl = comboTarget0?.model3dUrl || arData?.targets?.[0]?.model_3d_url;

    const imageUrl = comboTarget0?.image2dUrl || arData?.targets?.[0]?.image_2d_url || arData?.flashcard?.image_url;
    const textureUrl = comboTarget0?.textureUrl || arData?.targets?.[0]?.texture_url;

    const comboModelUrl = isComboViewer ? activeCombo?.model3dUrl : undefined;
    const comboImageUrl = isComboViewer ? activeCombo?.image2dUrl : undefined;
    const modelUrl2 = comboTarget1?.model3dUrl || fallbackTarget1?.model3dUrl || arData?.targets?.[1]?.model_3d_url;
    const imageUrl2 = comboTarget1?.image2dUrl || fallbackTarget1?.image2dUrl || arData?.targets?.[1]?.image_2d_url;
    const textureUrl2 = comboTarget1?.textureUrl || fallbackTarget1?.textureUrl || arData?.targets?.[1]?.texture_url;
    
    // Combo model URL for proximity combo replacement
    const comboTextureUrl = isComboViewer ? activeCombo?.textureUrl : undefined;
    const comboPhrase = isComboViewer && activeCombo?.description
        || [comboTarget0?.word || arData?.flashcard?.word, comboTarget1?.word || fallbackTarget1?.word].filter(Boolean).join(' in ');

    // Order targets by backend targetOrder so mindTargetIndex matches file positions.
    // Fall back to scan order when no targetOrder is available.
    const orderedComboTargets =
        isComboViewer && activeCombo?.targetOrder?.length
            ? activeCombo.targetOrder
                .map(tag => getFlashcardByTag(tag))
                .filter(Boolean) as import('@/hooks/useMultiFlashcard').FlashcardData[]
            : scannedTargets;
    const orderedViewerTargets = orderedComboTargets;
    const committedViewerTargetCount = isComboViewer ? 2 : 1;
    const viewerTargets = orderedViewerTargets.length
        ? orderedViewerTargets.map(target => ({
            modelUrl: target.model3dUrl,
            imageUrl: target.image2dUrl,
            textureUrl: target.textureUrl,
            word: target.word
        }))
        : [{
            modelUrl,
            imageUrl,
            textureUrl,
            word: comboTarget0?.word || arData?.flashcard?.word
        }];

    useEffect(() => {
        emitMobileDebug('LEARNAR_VIEWER_INPUTS', {
            appState,
            isAddingCard,
            isComboViewer,
            flashcardCount,
            comboKey,
            comboResolution,
            displayMode,
            detectedQrId,
            mindUrl,
            activeCombo: activeCombo ? {
                comboId: activeCombo.comboId,
                requiredTags: activeCombo.requiredTags,
                targetOrder: activeCombo.targetOrder,
                model3dUrl: activeCombo.model3dUrl,
                image2dUrl: activeCombo.image2dUrl,
                comboMindUrl: activeCombo.comboMindUrl,
                textureUrl: activeCombo.textureUrl
            } : null,
            target0: comboTarget0 ? {
                qrId: comboTarget0.qrId,
                arTag: comboTarget0.arTag,
                word: comboTarget0.word,
                model3dUrl: comboTarget0.model3dUrl,
                image2dUrl: comboTarget0.image2dUrl,
                textureUrl: comboTarget0.textureUrl
            } : null,
            target1: comboTarget1 ? {
                qrId: comboTarget1.qrId,
                arTag: comboTarget1.arTag,
                word: comboTarget1.word,
                model3dUrl: comboTarget1.model3dUrl,
                image2dUrl: comboTarget1.image2dUrl,
                textureUrl: comboTarget1.textureUrl
            } : null,
            fallbackTarget1: fallbackTarget1 ? {
                qrId: fallbackTarget1.qrId,
                arTag: fallbackTarget1.arTag,
                word: fallbackTarget1.word,
                model3dUrl: fallbackTarget1.model3dUrl,
                image2dUrl: fallbackTarget1.image2dUrl,
                textureUrl: fallbackTarget1.textureUrl
            } : null,
            viewerProps: {
                modelUrl,
                imageUrl,
                textureUrl,
                modelUrl2,
                imageUrl2,
                textureUrl2,
                comboModelUrl,
                comboImageUrl,
                comboTextureUrl,
                comboPhrase
            }
        });
    }, [emitMobileDebug, appState, isAddingCard, isComboViewer, flashcardCount, comboKey, comboResolution, displayMode, detectedQrId, mindUrl, activeCombo, comboTarget0, comboTarget1, fallbackTarget1, modelUrl, imageUrl, textureUrl, modelUrl2, imageUrl2, textureUrl2, comboModelUrl, comboImageUrl, comboTextureUrl, comboPhrase]);

    const handleViewerAssetError = useCallback((data: { code?: string; error: string; url?: string }) => {
        if (!isComboViewer) return;
        emitMobileDebug('COMBO_VIEWER_FAILED_RESTORING_ORIGINALS', {
            ...data,
            comboId: activeCombo?.comboId,
            originalTargets: scannedTargets.map(target => ({
                qrId: target.qrId,
                arTag: target.arTag,
                mindUrl: target.mindUrl,
                model3dUrl: target.model3dUrl,
                image2dUrl: target.image2dUrl
            }))
        });
        setCommittedComboId(null);
        setIsComboActive(false);
        rejectCombo(data.code || data.error);
    }, [isComboViewer, emitMobileDebug, comboKey, activeCombo, scannedTargets, rejectCombo]);

    // ========== HANDLERS ==========
    const handleQRDetected = useCallback((qrId: string) => {
        console.log('[LearnARV2] QR Detected:', qrId);
        if (!qrId) return;

        const now = Date.now();
        const lastSeenAt = qrGateRef.current.get(qrId) || 0;
        if (now - lastSeenAt < 2500) {
            console.log('[LearnARV2] QR ignored during cooldown:', qrId);
            emitMobileDebug('LEARNAR_QR_GATE_COOLDOWN', {
                qrId,
                msSinceLastSeen: now - lastSeenAt,
                appState,
                isAddingCard: isAddingCardRef.current,
                detectedQrId: detectedQrIdRef.current,
                flashcardCount
            });
            return;
        }
        qrGateRef.current.set(qrId, now);

        const isFirstQr = !detectedQrIdRef.current;
        const isControlledAdd = isAddingCardRef.current;
        void addFlashcard(qrId).then((flashcardData) => {
            if (!flashcardData) {
                emitMobileDebug('LEARNAR_QR_REJECTED', {
                    qrId,
                    isFirstQr,
                    isControlledAdd,
                    detectedQrId: detectedQrIdRef.current
                });
                console.warn('[LearnARV2] Ignoring QR without validated flashcard data:', qrId);
                return;
            }

            const wasExistingCard = flashcardData.detectedAt < now;
            emitMobileDebug('LEARNAR_QR_VALIDATED', {
                qrId,
                isFirstQr,
                isControlledAdd,
                detectedQrIdBefore: detectedQrIdRef.current,
                wasExistingCard,
                flashcardCountBefore: flashcardCount,
                flashcard: {
                    qrId: flashcardData.qrId,
                    arTag: flashcardData.arTag,
                    word: flashcardData.word,
                    model3dUrl: flashcardData.model3dUrl,
                    image2dUrl: flashcardData.image2dUrl,
                    textureUrl: flashcardData.textureUrl
                }
            });

            if (!isFirstQr && !isControlledAdd) {
                emitMobileDebug('LEARNAR_QR_VALIDATED_OUTSIDE_ADD_MODE', {
                    qrId,
                    detectedQrId: detectedQrIdRef.current,
                    flashcardCount,
                    wasExistingCard
                });
            }

            if (isFirstQr && !detectedQrIdRef.current) {
                detectedQrIdRef.current = qrId;
                setDetectedQrId(qrId);
                setAppState('LOADING');
            } else if (isControlledAdd) {
                setIsAddingCard(false);
                setAppState('VIEWING');
                window.setTimeout(() => {
                    eventBus.emit('AR_SWITCH_TO_VIEWER' as any, {});
                }, 100);
            }

            trackFlashcardView();
        });
    }, [trackFlashcardView, addFlashcard, emitMobileDebug, appState, flashcardCount]);

    // Task 9: Callbacks for revision ACK/reject from persistent viewer


    // Task 9: Derive catalog props from the first card's flashcard data
    // The catalog is shared across all cards in a lesson, so we use the first card's catalog identity
    const catalogId = scannedTarget0?.mindCatalogId || null;
    const catalogMindUrl = isComboViewer
        ? (resolveMindUrl(resolvedComboMindUrl) || scannedTarget0?.mindUrl || null)
        : (scannedTarget0?.mindUrl || null);

    // Task 9: Derive activeTargets from scanned flashcards
    // slotIndex follows scan order (0, 1), mindTargetIndex comes from flashcard data
    // In combo mode, orderedComboTargets respects backend targetOrder so mindTargetIndex matches file positions
    const activeTargets: import('@/core/types/ARMessages').ActiveViewerTarget[] | undefined =
        orderedComboTargets.length > 0 && catalogId && catalogMindUrl
            ? orderedComboTargets.map((target, index) => ({
                slotIndex: index as 0 | 1,
	                mindTargetIndex: Number(target.mindTargetIndex ?? index),
                arTag: target.arTag,
                modelUrl: target.model3dUrl,
                textureUrl: target.textureUrl,
                word: target.word,
              }))
            : undefined;

    const handleCancelAddCardScan = useCallback(() => {
        HapticService.tap();
        setIsAddingCard(false);
        setAppState('VIEWING');
        eventBus.emit('AR_SWITCH_TO_VIEWER' as any, {});
    }, []);

    const handlePhaseChange = useCallback((phase: ARPhase) => {
        console.log('[LearnARV2] Phase changed:', phase);
        setAppState(prev => {
            if (phase === 'SCANNING') return 'SCANNING';
            if (phase === 'VIEWING') return 'VIEWING';
            if (phase === 'ERROR') return 'ERROR';
            return prev;
        });
    }, []);

    const handleTargetFound = useCallback((idx: number) => {
        console.log('[LearnARV2] Target found:', idx);
        lastTargetEventRef.current = Date.now();
        if (idx === 0) setMarkerFound(true);
        if (idx === 1 && isComboViewer && comboKey) {
            const secondCard = getFlashcardByIndex(1);
            emitMobileDebug('COMBO_TARGET_1_FOUND', {
                comboKey,
                elapsedMs: secondCard ? Date.now() - secondCard.detectedAt : undefined
            });
        }
    }, [isComboViewer, comboKey, getFlashcardByIndex, emitMobileDebug]);

    // Late binding for handleActiveTargetsRejected to use handleSystemError from useARFallback
    const handleActiveTargetsRejectedInternal = useCallback((error: { revision: number; code: string; stage: string; message: string }) => {
        emitMobileDebug('PERSISTENT_TARGETS_REJECTED', error);
        if (!window.location.search.includes('debug=true')) {
            handleSystemError(error.code);
        }
    }, [emitMobileDebug, handleSystemError]);

    const handleTargetLost = useCallback((idx: number) => {
        console.log('[LearnARV2] Target lost:', idx);
        lastTargetEventRef.current = Date.now();
        if (idx === 0) setMarkerFound(false);
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
            case 'SYSTEM_ERROR':
            case 'AR_ERROR': {
                const code = payload?.code;
                if (code && RECOVERABLE_AR_ERROR_CODES.has(code)) {
                    emitMobileDebug('LEARNAR_RECOVERABLE_AR_ERROR', {
                        code,
                        payload,
                        appState,
                        flashcardCount
                    });
                    return;
                }
                break;
            }
            case 'COMBO_PROXIMITY_DETECTED':
                handleProximityDetected(payload);
                handleComboDetected(payload.targets);
                break;
            case 'COMBO_PROXIMITY_ENDED':
                handleProximityEnded(payload); break;
            case 'COMBO_PROXIMITY_UPDATE':
                handleProximityUpdate(payload); break;
            case 'MULTI_TARGET_DETECTED':
                console.log('[LearnARV2] Multi-target visible:', payload.targets); break;
            case 'AR_TRACKING_STATE':
                console.log('[LearnARV2] AR tracking state:', payload); break;
        }
    }, [emitMobileDebug, appState, flashcardCount, handleProximityDetected, handleProximityEnded, handleProximityUpdate, handleComboDetected]);

    const handleModelClick = useCallback((modelId: string, targetIndex?: number) => {
        console.log('[LearnARV2] Model clicked:', modelId, 'Index:', targetIndex);

        // Spec B: interaction feedback — animation + sound (fail-closed: no policy → pronunciation)
        const tappedCard = typeof targetIndex === 'number'
            ? getFlashcardByIndex(targetIndex)
            : undefined;
        const reacted = applyInteractionFeedback(eventBus, tappedCard, targetIndex ?? 0);

        // Fall back to pronunciation only when no interaction policy exists
        if (!reacted) {
            let targetWord = "";
            let audioUrl = "";
            if (typeof targetIndex === 'number') {
                const scannedCard = getFlashcardByIndex(targetIndex);
                targetWord = scannedCard?.word || (targetIndex === 0 ? arData?.flashcard?.word || "" : "");
                if (targetIndex === 0) audioUrl = arData?.flashcard?.audio_url || "";
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
        }
    }, [arData, getFlashcardByIndex, eventBus]);

    // Mode toggles
    const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
        setDisplayMode(mode);
        eventBus.emit('AR_SET_MODE' as any, { mode });
    }, []);

    useEffect(() => {
        if (appState !== 'VIEWING') return;
        const timers = [120, 600, 1200].map(delay => window.setTimeout(() => {
            eventBus.emit('AR_SET_MODE' as any, { mode: displayMode });
        }, delay));
        return () => timers.forEach(window.clearTimeout);
    }, [appState, displayMode, mindUrl]);

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

    // ========== EFFECTS ==========
    useEffect(() => {
        if (arData && mindUrl && appState === 'LOADING') {
            setAppState('VIEWING');
        }
    }, [arData, mindUrl, appState]);

    useEffect(() => {
        if (appState !== 'LOADING') return;
        const timeoutId = window.setTimeout(() => {
            if (!mindUrl) {
                setError('AR target file could not be resolved. Please scan again.');
                setAppState('ERROR');
            }
        }, 10000);

        return () => window.clearTimeout(timeoutId);
    }, [appState, mindUrl]);

    useEffect(() => {
        if (arError) { setError(arError); setAppState('ERROR'); }
    }, [arError]);

    useEffect(() => {
        window.addEventListener('message', handleARMessage);
        return () => window.removeEventListener('message', handleARMessage);
    }, [handleARMessage]);

    // ── Freeze Pose: listen for ar:target-stable events ───────────────────────────
    useEffect(() => {
        const handleStable = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            console.log('[LearnARV2] ar:target-stable', detail);
            setStableTarget(detail?.targetIndex ?? null);
        };
        document.addEventListener('ar:target-stable', handleStable);
        return () => document.removeEventListener('ar:target-stable', handleStable);
    }, []);

    // Pet chat popup — listen for tap on pet in ARGamificationPanel
    useEffect(() => {
        const handler = (data: { petName: string; word: string }) => {
            setPetChat(data);
        };
        eventBus.on('PET_CHAT_OPEN' as any, handler);
        return () => eventBus.off('PET_CHAT_OPEN' as any, handler);
    }, []);

    // ========== RENDER ==========
    // While auth is resolving show a minimal spinner — avoids flash of AR UI for unauthenticated users
    if (authLoading || (!isAuthenticated && !isGuest)) {
        return (
            <div style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#0ea5e9', flexDirection: 'column', gap: 16
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: '6px solid rgba(255,255,255,0.3)',
                    borderTop: '6px solid #fff',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Loading...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="learn-ar-v2" style={{ position: 'fixed', inset: 0 }}>
            {/* AR Container with iframe swapping */}


            <ARContainerV2
                ref={iframeRef}
                engine={engine}
                initialPhase={detectedQrId ? 'VIEWING' : 'SCANNING'}
                // Spec A: auto QR-in-scene (single camera, no separate scanner phase)
                autoQrScanEnabled={autoQrScanEnabled}
                // Task 9: Pass catalog props when persistent viewer is enabled and we have catalog data
                catalogId={isPersistentViewerEnabled ? catalogId : undefined}
                mindUrl={isPersistentViewerEnabled ? catalogMindUrl : mindUrl}
                catalogTargetCount={isPersistentViewerEnabled ? 2 : undefined}
                activeTargets={isPersistentViewerEnabled ? activeTargets : undefined}
                onActiveTargetsApplied={isPersistentViewerEnabled ? handleActiveTargetsApplied : undefined}
                onActiveTargetsRejected={isPersistentViewerEnabled ? handleActiveTargetsRejectedInternal : undefined}
                // Legacy props: no longer used in persistent mode
                modelUrl={modelUrl}
                imageUrl={imageUrl}
                textureUrl={textureUrl}
                modelUrl2={modelUrl2}
                imageUrl2={imageUrl2}
                textureUrl2={textureUrl2}
                word={comboTarget0?.word || arData?.flashcard?.word}
                word2={comboTarget1?.word || fallbackTarget1?.word}
                targets={viewerTargets}
                cardCount={committedViewerTargetCount}
                comboModelUrl={comboModelUrl}
                comboImageUrl={comboImageUrl}
                comboTextureUrl={comboTextureUrl}
                comboPhrase={comboPhrase}
                enableBackgroundScanner={false}
                deferQrTransition={isAddingCard}
                onPhaseChange={handlePhaseChange}
                onQRDetected={handleQRDetected}
                onTargetFound={handleTargetFound}
                onTargetLost={handleTargetLost}
                onModelClick={handleModelClick}
                onComboDetected={handleComboDetected}
                onViewerAssetError={handleViewerAssetError}
            >
                {/* Card Rejection Toast */}
                {rejectedCard && (
                    <ArCardRejectedToast
                        data={rejectedCard}
                        onDismiss={() => setRejectedCard(null)}
                        autoHideMs={5000}
                    />
                )}
                {/* Control Panel - Only show during VIEWING */}
                {appState === 'VIEWING' && (
                    <ARControlPanel
                        displayMode={displayMode}
                        appMode={appMode}
                        onDisplayModeToggle={() => handleDisplayModeChange(displayMode === '2D' ? '3D' : '2D')}
                        onAppModeSwitch={handleAppModeChange}
                    />
                )}
                {appState === 'VIEWING' && multiPreparation.status === 'preparing' && (
                    <div style={{
                        position: 'fixed', left: '50%', top: 20, transform: 'translateX(-50%)',
                        zIndex: 100006, minWidth: 220, padding: '12px 16px', borderRadius: 18,
                        color: '#fff', background: 'rgba(15,23,42,0.88)', textAlign: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ fontWeight: 800 }}>Preparing both cards...</div>
                        <div style={{ height: 5, marginTop: 8, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                            <div style={{ width: `${multiPreparation.progress}%`, height: '100%', background: '#2dd4bf', transition: 'width 180ms ease' }} />
                        </div>
                    </div>
                )}
                {appState === 'VIEWING' && multiPreparation.status === 'error' && flashcardCount === 2 && (
                    <div style={{
                        position: 'fixed', left: '50%', top: 20, transform: 'translateX(-50%)',
                        zIndex: 100006, width: 'min(360px, calc(100vw - 32px))', padding: 16,
                        borderRadius: 18, color: '#fff', background: 'rgba(127,29,29,0.94)', textAlign: 'center'
                    }}>
                        <div style={{ fontWeight: 800 }}>Could not prepare both cards.</div>
                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10 }}>
                            <button type="button" onClick={() => {
                                multiPreparingKeyRef.current = null;
                                setMultiPreparation(prev => ({
                                    ...prev,
                                    status: 'idle',
                                    mindUrl: null,
                                    mindBuffer: null,
                                    error: null
                                }));
                                setMultiRetryToken(value => value + 1);
                            }} style={{ padding: '9px 14px', border: 0, borderRadius: 14, fontWeight: 800, cursor: 'pointer' }}>Retry</button>
                            <button type="button" onClick={() => {
                                if (scannedTarget1) removeFlashcard(scannedTarget1.qrId);
                            }} style={{ padding: '9px 14px', border: '1px solid #fff', borderRadius: 14, color: '#fff', background: 'transparent', fontWeight: 800, cursor: 'pointer' }}>Remove second card</button>
                        </div>
                    </div>
                )}
                {isAddingCard && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 'max(92px, env(safe-area-inset-top))',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100004,
                            width: 'min(92vw, 360px)',
                            padding: '10px 14px',
                            borderRadius: 18,
                            background: 'rgba(15,23,42,0.82)',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 14,
                            textAlign: 'center',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div>Scan the second flashcard QR</div>
                        <button
                            type="button"
                            onClick={handleCancelAddCardScan}
                            style={{
                                marginTop: 8,
                                minHeight: 36,
                                padding: '6px 14px',
                                borderRadius: 18,
                                border: '1px solid rgba(255,255,255,0.5)',
                                background: 'rgba(255,255,255,0.16)',
                                color: '#fff',
                                fontWeight: 800,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
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

				            {/* Parent Debug Overlay - Minimal Tuner */}
				            {appState === 'VIEWING' && window.location.search.includes('debug=true') && (
				                <div style={{
				                    position: 'fixed', 
				                    top: 'max(140px, calc(env(safe-area-inset-top) + 120px))', 
				                    left: 10,
				                    zIndex: 2147483647, 
				                    display: 'flex', 
				                    flexDirection: 'column', 
				                    gap: 12,
				                    pointerEvents: 'auto',
				                    touchAction: 'none'
				                }}>
				                    <div style={{
				                        background: 'rgba(15,23,42,0.92)', padding: 12, borderRadius: 20,
				                        color: 'white', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8,
				                        border: '2px solid #38bdf8', minWidth: 160,
				                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
				                    }}>
				                        <div style={{ fontWeight: 900, color: '#38bdf8', textAlign: 'center', fontSize: 14 }}>Offset Tuner</div>
				                        
				                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				                            <span style={{ fontWeight: 800 }}>X: {manualOffset.x.toFixed(2)}</span>
				                            <div style={{ display: 'flex', gap: 6 }}>
				                                <button type="button" onClick={() => handleAdjustOffset('x', -0.05)} style={{ width: 36, height: 36, background: '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: 10, fontWeight: 900 }}>-</button>
				                                <button type="button" onClick={() => handleAdjustOffset('x', 0.05)} style={{ width: 36, height: 36, background: '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: 10, fontWeight: 900 }}>+</button>
				                            </div>
				                        </div>
				                        
				                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				                            <span style={{ fontWeight: 800 }}>Y: {manualOffset.y.toFixed(2)}</span>
				                            <div style={{ display: 'flex', gap: 6 }}>
				                                <button type="button" onClick={() => handleAdjustOffset('y', -0.05)} style={{ width: 36, height: 36, background: '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: 10, fontWeight: 900 }}>-</button>
				                                <button type="button" onClick={() => handleAdjustOffset('y', 0.05)} style={{ width: 36, height: 36, background: '#1e293b', color: '#fff', border: '1px solid #38bdf8', borderRadius: 10, fontWeight: 900 }}>+</button>
				                            </div>
				                        </div>

				                        <button 
				                            type="button"
				                            onClick={handleSyncDiscord}
				                            disabled={syncStatus === 'syncing'}
				                            style={{
				                                marginTop: 4, padding: '8px 12px', 
				                                background: syncStatus === 'success' ? '#3ba55c' : (syncStatus === 'error' ? '#ed4245' : '#5865F2'), 
				                                color: 'white',
				                                border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 11,
				                                cursor: syncStatus === 'syncing' ? 'wait' : 'pointer',
				                                transition: 'all 0.3s ease',
				                                opacity: syncStatus === 'syncing' ? 0.7 : 1
				                            }}
				                        >
				                            {syncStatus === 'syncing' ? '⌛ Syncing...' : 
				                             syncStatus === 'success' ? '✅ Synced!' : 
				                             syncStatus === 'error' ? '❌ Failed' : '🚀 Sync Discord'}
				                        </button>
				                    </div>
				                </div>
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
                    userId={USER_ID}
                    authToken={token}
                    isGuest={isGuest}
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

            {/* Gamification Panel (disabled in guest mode) */}
            {appState === 'VIEWING' && USER_ID && (
                <ARGamificationPanel 
                    userId={USER_ID} 
                    onPetClick={() => setIsPetSelectorOpen(true)}
                />
            )}

            {/* Pet Selector Modal */}
            <PetSelector
                isOpen={isPetSelectorOpen}
                onClose={() => setIsPetSelectorOpen(false)}
                pets={pets}
                userXP={progress?.total_xp || 0}
                userStreak={progress?.current_streak || 0}
                onUnlock={unlockPet}
                onSetActive={setActivePet}
                recentlyUnlockedPet={recentlyUnlocked}
            />

            {/* Reward Celebration Overlay */}
            <RewardCelebration autoListen={true} />

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
