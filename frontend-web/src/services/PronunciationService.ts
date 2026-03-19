/**
 * PronunciationService.ts
 * 
 * Web Speech API integration for pronunciation practice.
 * Uses browser's speech recognition to capture child's voice.
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
}

type PronunciationCallback = (result: PronunciationResult) => void;

class PronunciationService {
    private recognition: any = null;
    private isListening = false;
    private expectedWord = '';
    private onResultCallback: PronunciationCallback | null = null;
    private sessionId = 0; // Track session to prevent stale callbacks

    constructor() {
        this.initRecognition();
    }

    private initRecognition(): void {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('[Pronunciation] Speech recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;

        this.recognition.onresult = (event: any) => {
            const result = event.results[0][0];
            this.handleResult(result.transcript, result.confidence);
        };

        this.recognition.onerror = (event: any) => {
            console.error('[Pronunciation] Error:', event.error);
            this.isListening = false;

            eventBus.emit('PRONUNCIATION_ERROR' as any, {
                error: event.error
            });
        };

        // Store session ID at creation for stale callback detection
        const boundSessionId = this.sessionId;
        this.recognition.onend = () => {
            // Ignore stale callbacks from previous sessions
            if (boundSessionId === this.sessionId) {
                this.isListening = false;
                eventBus.emit('PRONUNCIATION_ENDED' as any, {});
            }
        };

        console.log('[Pronunciation] Service initialized');
    }

    /**
     * Start listening for pronunciation
     */
    startListening(expectedWord: string, onResult?: PronunciationCallback): void {
        if (!this.recognition) {
            console.error('[Pronunciation] Not supported');
            return;
        }

        if (this.isListening) {
            // Abort immediately to prevent race condition
            this.recognition.abort();
            this.isListening = false;
        }

        // Increment session ID to invalidate any pending callbacks
        this.sessionId++;

        this.expectedWord = expectedWord.toLowerCase().trim();
        this.onResultCallback = onResult || null;

        try {
            this.recognition.start();
            this.isListening = true;

            eventBus.emit('PRONUNCIATION_STARTED' as any, {
                expectedWord: this.expectedWord
            });

            console.log(`[Pronunciation] Listening for: "${expectedWord}"`);
        } catch (err) {
            console.error('[Pronunciation] Failed to start:', err);
        }
    }

    /**
     * Stop listening
     */
    stopListening(): void {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    /**
     * Handle speech recognition result
     */
    private async handleResult(transcript: string, confidence: number): Promise<void> {
        const cleanTranscript = transcript.toLowerCase().trim();

        console.log(`[Pronunciation] Heard: "${transcript}" (${(confidence * 100).toFixed(1)}%)`);

        // Local accuracy check
        const localAccuracy = this.calculateSimilarity(cleanTranscript, this.expectedWord);

        const result: PronunciationResult = {
            transcript,
            confidence,
            accuracy: Math.round(localAccuracy * 100),
            isCorrect: localAccuracy > 0.8
        };

        // Try AI assessment for detailed feedback
        try {
            const aiResult = await this.assessWithAI(this.expectedWord, transcript);
            if (aiResult.feedback) {
                result.feedback = aiResult.feedback;
            }
        } catch {
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
        // Common for kids adding articles/filler words
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

        // Convert distance to similarity (0 to 1)
        return 1 - dp[m][n] / Math.max(m, n);
    }

    /**
     * Call backend AI for detailed pronunciation assessment
     */
    private async assessWithAI(targetWord: string, transcript: string): Promise<{ feedback?: string }> {
        try {
            const response = await fetch(`${API_BASE}/api/v1/ai/assess-pronunciation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_word: targetWord,
                    transcript: transcript
                })
            });

            if (!response.ok) throw new Error('API error');

            return await response.json();
        } catch {
            return {};
        }
    }

    /**
     * Check if speech recognition is supported
     */
    isSupported(): boolean {
        return !!this.recognition;
    }

    /**
     * Get listening state
     */
    getIsListening(): boolean {
        return this.isListening;
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
