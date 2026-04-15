/**
 * PronunciationService.ts
 * 
 * Hybrid speech recognition service for pronunciation practice.
 * 
 * Strategy:
 * 1. Use Web Speech API for Chrome (fast, free, no network latency)
 * 2. Fall back to server-side Whisper for Safari/Firefox
 * 
 * The service automatically detects browser support and uses the
 * appropriate method.
 */

import { eventBus } from '@/runtime/EventBus';
import { getApiBase } from '@/config';

const API_BASE = getApiBase();

export interface PronunciationResult {
    transcript: string;
    confidence: number;
    accuracy?: number;
    feedback?: string;
    isCorrect?: boolean;
    source?: 'webspeech' | 'whisper';  // Which engine was used
}

export interface TranscriptionStatus {
    available: boolean;
    model_loaded: boolean;
    model_name: string | null;
    active_transcriptions: number;
    max_concurrent: number;
    supported_formats: string[];
}

export interface GeneratedFeedback {
    message: string;
    emoji: string;
    stars: number;
    category: string;
    encouragement: string;
}

type PronunciationCallback = (result: PronunciationResult) => void;

class PronunciationService {
    private recognition: any = null;
    private isListening = false;
    private expectedWord = '';
    private onResultCallback: PronunciationCallback | null = null;
    private sessionId = 0;
    
    // Hybrid fallback state
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private useServerFallback = false;
    private serverAvailable: boolean | null = null; // null = not checked yet

    constructor() {
        this.initRecognition();
    }

    private initRecognition(): void {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('[Pronunciation] Web Speech API not supported, will use server fallback');
            this.useServerFallback = true;
            this.checkServerAvailability();
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;

        this.recognition.onresult = (event: any) => {
            const result = event.results[0][0];
            this.handleResult(result.transcript, result.confidence, 'webspeech');
        };

        this.recognition.onerror = (event: any) => {
            console.error('[Pronunciation] Web Speech error:', event.error);
            this.isListening = false;

            // On certain errors, try server fallback
            if (['network', 'service-not-allowed', 'not-allowed'].includes(event.error)) {
                console.log('[Pronunciation] Trying server fallback due to error');
                this.useServerFallback = true;
                this.checkServerAvailability();
            }

            eventBus.emit('PRONUNCIATION_ERROR' as any, {
                error: event.error
            });
        };

        const boundSessionId = this.sessionId;
        this.recognition.onend = () => {
            if (boundSessionId === this.sessionId) {
                this.isListening = false;
                eventBus.emit('PRONUNCIATION_ENDED' as any, {});
            }
        };

        console.log('[Pronunciation] Service initialized with Web Speech API');
    }

    /**
     * Check if server-side transcription is available
     */
    async checkServerAvailability(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/api/v1/pronunciation/transcribe/status`);
            if (!response.ok) {
                this.serverAvailable = false;
                return false;
            }
            
            const status: TranscriptionStatus = await response.json();
            this.serverAvailable = status.available;
            
            console.log(`[Pronunciation] Server transcription: ${status.available ? 'available' : 'unavailable'}`);
            return status.available;
        } catch (err) {
            console.warn('[Pronunciation] Failed to check server status:', err);
            this.serverAvailable = false;
            return false;
        }
    }

    /**
     * Start listening for pronunciation
     */
    async startListening(expectedWord: string, onResult?: PronunciationCallback): Promise<void> {
        // Increment session ID to invalidate any pending callbacks
        this.sessionId++;
        this.expectedWord = expectedWord.toLowerCase().trim();
        this.onResultCallback = onResult || null;

        if (this.useServerFallback) {
            await this.startServerListening();
        } else {
            this.startWebSpeechListening();
        }
    }

    /**
     * Start Web Speech API listening
     */
    private startWebSpeechListening(): void {
        if (!this.recognition) {
            console.error('[Pronunciation] Web Speech API not available');
            return;
        }

        if (this.isListening) {
            this.recognition.abort();
            this.isListening = false;
        }

        try {
            this.recognition.start();
            this.isListening = true;

            eventBus.emit('PRONUNCIATION_STARTED' as any, {
                expectedWord: this.expectedWord,
                source: 'webspeech'
            });

            console.log(`[Pronunciation] Web Speech listening for: "${this.expectedWord}"`);
        } catch (err) {
            console.error('[Pronunciation] Failed to start Web Speech:', err);
        }
    }

    /**
     * Start server-side transcription with audio recording
     */
    private async startServerListening(): Promise<void> {
        // Check server availability if not yet checked
        if (this.serverAvailable === null) {
            await this.checkServerAvailability();
        }

        if (!this.serverAvailable) {
            console.error('[Pronunciation] Server transcription not available');
            eventBus.emit('PRONUNCIATION_ERROR' as any, {
                error: 'Speech recognition not available in this browser'
            });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.getSupportedMimeType()
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
                
                // Send audio to server for transcription
                await this.sendAudioToServer();
            };

            this.mediaRecorder.start();
            this.isListening = true;

            eventBus.emit('PRONUNCIATION_STARTED' as any, {
                expectedWord: this.expectedWord,
                source: 'whisper'
            });

            console.log(`[Pronunciation] Server recording for: "${this.expectedWord}"`);

            // Auto-stop after 5 seconds (kids shouldn't speak longer)
            setTimeout(() => {
                if (this.isListening && this.mediaRecorder?.state === 'recording') {
                    this.stopListening();
                }
            }, 5000);

        } catch (err) {
            console.error('[Pronunciation] Failed to start recording:', err);
            eventBus.emit('PRONUNCIATION_ERROR' as any, {
                error: 'microphone-not-allowed'
            });
        }
    }

    /**
     * Get supported MIME type for audio recording
     */
    private getSupportedMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm'; // Fallback
    }

    /**
     * Send recorded audio to server for transcription
     */
    private async sendAudioToServer(): Promise<void> {
        if (this.audioChunks.length === 0) {
            console.warn('[Pronunciation] No audio recorded');
            return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', 'en');

        try {
            const response = await fetch(`${API_BASE}/api/v1/pronunciation/transcribe`, {
                method: 'POST',
                body: formData,
            });

            if (response.status === 429) {
                // Rate limited
                eventBus.emit('PRONUNCIATION_ERROR' as any, {
                    error: 'rate-limited'
                });
                return;
            }

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            this.handleResult(result.text, result.confidence, 'whisper');

        } catch (err) {
            console.error('[Pronunciation] Server transcription failed:', err);
            eventBus.emit('PRONUNCIATION_ERROR' as any, {
                error: 'transcription-failed'
            });
        } finally {
            this.isListening = false;
            eventBus.emit('PRONUNCIATION_ENDED' as any, {});
        }
    }

    /**
     * Stop listening
     */
    stopListening(): void {
        if (this.useServerFallback) {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        } else if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
    }

    /**
     * Handle speech recognition result (from either source)
     */
    private async handleResult(
        transcript: string,
        confidence: number,
        source: 'webspeech' | 'whisper'
    ): Promise<void> {
        const cleanTranscript = transcript.toLowerCase().trim();

        console.log(`[Pronunciation] [${source}] Heard: "${transcript}" (${(confidence * 100).toFixed(1)}%)`);

        // Local accuracy check with kid bonus
        const localAccuracy = this.calculateSimilarity(cleanTranscript, this.expectedWord);
        const kidBonus = 0.2; // +20% bonus for kids (as per design)
        const finalAccuracy = Math.min(1, localAccuracy + (localAccuracy > 0.5 ? kidBonus * (1 - localAccuracy) : 0));

        const result: PronunciationResult = {
            transcript,
            confidence,
            accuracy: Math.round(finalAccuracy * 100),
            isCorrect: finalAccuracy > 0.7, // Lower threshold for kids
            source,
        };

        // Get dynamic feedback from database templates
        try {
            const feedback = await this.getDynamicFeedback(
                this.expectedWord,
                result.accuracy || 0
            );
            result.feedback = `${feedback.emoji} ${feedback.message}`;
        } catch {
            // Fallback to simple messages
            result.feedback = result.isCorrect
                ? "Great job! 🌟"
                : "Good try! Let's practice more! 💪";
        }

        // Emit result
        eventBus.emit('PRONUNCIATION_RESULT' as any, result);

        // Call callback if provided
        if (this.onResultCallback) {
            this.onResultCallback(result);
        }
    }

    /**
     * Calculate string similarity using Levenshtein distance.
     * Handles common speech variations like "the cat" vs "cat".
     */
    private calculateSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;

        // Check if expected word appears in transcript (handles "the cat" matching "cat")
        if (str1.includes(str2) || str2.includes(str1)) {
            return 0.95;
        }

        // Levenshtein distance calculation
        const m = str1.length;
        const n = str2.length;
        const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
            Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = str1[i - 1] === str2[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }

        return 1 - dp[m][n] / Math.max(m, n);
    }

    /**
     * Get dynamic feedback from database templates
     */
    private async getDynamicFeedback(word: string, score: number): Promise<GeneratedFeedback> {
        const response = await fetch(`${API_BASE}/api/v1/pronunciation/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word,
                score,
                attempt_number: 1,
                language: 'en'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get feedback');
        }

        return await response.json();
    }

    /**
     * Check if speech recognition is supported (either Web Speech or server)
     */
    isSupported(): boolean {
        return !!this.recognition || this.serverAvailable === true;
    }

    /**
     * Check if Web Speech API is available
     */
    hasWebSpeech(): boolean {
        return !!this.recognition;
    }

    /**
     * Check if using server fallback
     */
    isUsingServerFallback(): boolean {
        return this.useServerFallback;
    }

    /**
     * Get listening state
     */
    getIsListening(): boolean {
        return this.isListening;
    }

    /**
     * Force use of server fallback (useful for testing)
     */
    setUseServerFallback(use: boolean): void {
        this.useServerFallback = use;
        if (use) {
            this.checkServerAvailability();
        }
    }
}

// Singleton instance
let _pronunciationService: PronunciationService | null = null;

export function getPronunciationService(): PronunciationService {
    if (!_pronunciationService) {
        _pronunciationService = new PronunciationService();
    }
    return _pronunciationService;
}

export default PronunciationService;
