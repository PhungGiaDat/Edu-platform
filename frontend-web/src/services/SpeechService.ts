// src/services/SpeechService.ts
// Speech recognition service for pronunciation evaluation

// Web Speech API types (not built into TypeScript)
interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

class SpeechServiceClass {
    private recognition: any = null; // Use any for cross-browser compatibility
    private isListening = false;
    private isSupported = false;

    constructor() {
        // Check browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        this.isSupported = !!SpeechRecognition;

        if (this.isSupported) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    }

    /**
     * Check if speech recognition is supported
     */
    get supported(): boolean {
        return this.isSupported;
    }

    /**
     * Check if currently listening
     */
    get listening(): boolean {
        return this.isListening;
    }

    /**
     * Start listening for speech and return transcription
     */
    startListening(lang: 'en' | 'vi' = 'en', timeout = 5000): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject(new Error('Speech recognition not supported'));
                return;
            }

            if (this.isListening) {
                reject(new Error('Already listening'));
                return;
            }

            this.recognition.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
            this.isListening = true;

            let timeoutId: ReturnType<typeof setTimeout>;

            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
                clearTimeout(timeoutId);
                this.isListening = false;
                const transcript = event.results[0][0].transcript;
                resolve(transcript);
            };

            this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                clearTimeout(timeoutId);
                this.isListening = false;
                reject(new Error(event.error));
            };

            this.recognition.onend = () => {
                this.isListening = false;
            };

            timeoutId = setTimeout(() => {
                this.stopListening();
                reject(new Error('Timeout: No speech detected'));
            }, timeout);

            this.recognition.start();
        });
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
     * Calculate Levenshtein distance
     */
    private levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    /**
     * Score pronunciation accuracy (lenient for kids)
     */
    scorePronunciation(expected: string, actual: string): number {
        const normalizedExpected = expected.toLowerCase().trim();
        const normalizedActual = actual.toLowerCase().trim();

        if (normalizedExpected === normalizedActual) return 100;

        const distance = this.levenshteinDistance(normalizedExpected, normalizedActual);
        const maxLen = Math.max(normalizedExpected.length, 1);
        const similarity = Math.max(0, 1 - (distance / maxLen));

        // +20% bonus for kids encouragement
        return Math.min(100, Math.round(similarity * 100) + 20);
    }

    /**
     * Get encouraging feedback
     */
    getFeedback(score: number): { message: string; emoji: string; stars: number } {
        if (score >= 90) return { message: 'Perfect! Amazing!', emoji: '🌟🎉', stars: 3 };
        if (score >= 70) return { message: 'Great job!', emoji: '⭐✨', stars: 2 };
        if (score >= 50) return { message: 'Good try!', emoji: '👍💪', stars: 1 };
        return { message: 'Keep practicing!', emoji: '🌈💖', stars: 1 };
    }
}

export const SpeechService = new SpeechServiceClass();
export default SpeechService;
