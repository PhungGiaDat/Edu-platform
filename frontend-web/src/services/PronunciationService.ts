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

        this.recognition.onend = () => {
            this.isListening = false;
            eventBus.emit('PRONUNCIATION_ENDED' as any, {});
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
            this.stopListening();
        }

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

        let result: PronunciationResult = {
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
     * Calculate string similarity (Levenshtein-based)
     */
    private calculateSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1;

        // Simple matching
        let matches = 0;
        const longerArr = longer.split('');
        const shorterArr = shorter.split('');

        for (let i = 0; i < shorterArr.length; i++) {
            if (shorterArr[i] === longerArr[i]) matches++;
        }

        return matches / longer.length;
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
