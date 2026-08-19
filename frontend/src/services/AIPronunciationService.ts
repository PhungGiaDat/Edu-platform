/**
 * AIPronunciationService.ts
 * 
 * AI-powered pronunciation service with:
 * - TTS playback with audio visualization
 * - Recording with waveform display
 * - Real-time feedback display
 * - Progress tracking
 * 
 * Integrates with backend TTS and evaluation endpoints.
 */

import { eventBus } from '@/runtime/EventBus';
import { getApiBase } from '@/config';

const API_BASE = getApiBase();

export interface TTSStatus {
    available: boolean;
    xtts_available: boolean;
    google_tts_available: boolean;
    supported_languages: string[];
}

export interface EvaluationStatus {
    available: boolean;
    model_loaded: boolean;
}

export interface TTSGenerationResult {
    success: boolean;
    text: string;
    language: string;
    duration_seconds: number;
    source: string;
}

export interface PhonemeAnalysis {
    expected: string;
    spoken: string;
    is_match: boolean;
    confidence: number;
    suggestion?: string;
}

export interface EvaluationResult {
    score: number;
    grade: 'excellent' | 'good' | 'needs_practice';
    stars: number;
    transcription: string;
    confidence: number;
    feedback: string;
    feedback_emoji: string;
    phoneme_analysis: PhonemeAnalysis[];
    areas_for_improvement: string[];
    strengths: string[];
    suggestions: string[];
    language: string;
    source: string;
}

export interface AudioVisualizationData {
    peaks: number[];
    timestamp: number;
}

export interface RecordingState {
    isRecording: boolean;
    duration: number;
    waveform: AudioVisualizationData[];
}

export interface TTSPlaybackState {
    isPlaying: boolean;
    progress: number;
    duration: number;
}

type PronunciationCallback = (result: EvaluationResult) => void;
type RecordingCallback = (state: RecordingState) => void;
type TTSCallback = (state: TTSPlaybackState) => void;

class AIPronunciationService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private recordingStartTime: number = 0;
    private animationFrameId: number | null = null;
    
    private onResultCallback: PronunciationCallback | null = null;
    private onRecordingCallback: RecordingCallback | null = null;
    private onTTSCallback: TTSCallback | null = null;
    
    private expectedWord = '';
    private sessionId = 0;
    private currentAudio: HTMLAudioElement | null = null;
    private language = 'en';

    constructor() {
        // Initialize audio context on first user interaction
        this.initAudioContext();
    }

    private initAudioContext(): void {
        if (this.audioContext) return;
        
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            console.log('[AI Pronunciation] Audio context initialized');
        } catch (err) {
            console.error('[AI Pronunciation] Failed to initialize audio context:', err);
        }
    }

    /**
     * Check TTS service availability
     */
    async getTTSStatus(): Promise<TTSStatus> {
        try {
            const response = await fetch(`${API_BASE}/api/v1/pronunciation/tts/status`);
            if (!response.ok) {
                return { available: false, xtts_available: false, google_tts_available: false, supported_languages: [] };
            }
            return await response.json();
        } catch (err) {
            console.warn('[AI Pronunciation] Failed to get TTS status:', err);
            return { available: false, xtts_available: false, google_tts_available: false, supported_languages: [] };
        }
    }

    /**
     * Check evaluation service availability
     */
    async getEvaluationStatus(): Promise<EvaluationStatus> {
        try {
            const response = await fetch(`${API_BASE}/api/v1/pronunciation/evaluate/status`);
            if (!response.ok) {
                return { available: false, model_loaded: false };
            }
            return await response.json();
        } catch (err) {
            console.warn('[AI Pronunciation] Failed to get evaluation status:', err);
            return { available: false, model_loaded: false };
        }
    }

    /**
     * Generate TTS audio for a word
     */
    async generateTTS(
        text: string,
        language: string = 'en',
        speed: number = 0.9
    ): Promise<Blob | null> {
        console.log(`[AI Pronunciation] Generating TTS for: "${text}" (${language})`);
        
        try {
            const params = new URLSearchParams({ language, speed: speed.toString() });
            const response = await fetch(`${API_BASE}/api/v1/pronunciation/tts/stream/${encodeURIComponent(text)}?${params}`, {
                method: 'GET',
                headers: {
                    'Accept': 'audio/wav',
                },
            });
            
            if (!response.ok) {
                throw new Error(`TTS generation failed: ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log(`[AI Pronunciation] TTS generated: ${blob.size} bytes`);
            return blob;
        } catch (err) {
            console.error('[AI Pronunciation] TTS generation failed:', err);
            return null;
        }
    }

    /**
     * Play TTS audio with progress tracking
     */
    async playTTS(
        text: string,
        language: string = 'en',
        speed: number = 0.9
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.stopTTS();
            this.initAudioContext();
            
            fetch(`${API_BASE}/api/v1/pronunciation/tts/stream/${encodeURIComponent(text)}?language=${language}&speed=${speed}`)
                .then(response => {
                    if (!response.ok) throw new Error('TTS fetch failed');
                    return response.blob();
                })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    this.currentAudio = audio;
                    
                    audio.addEventListener('loadedmetadata', () => {
                        this.onTTSCallback?.({
                            isPlaying: true,
                            progress: 0,
                            duration: audio.duration,
                        });
                    });
                    
                    audio.addEventListener('timeupdate', () => {
                        const progress = audio.duration ? audio.currentTime / audio.duration : 0;
                        this.onTTSCallback?.({
                            isPlaying: true,
                            progress,
                            duration: audio.duration,
                        });
                    });
                    
                    audio.addEventListener('ended', () => {
                        URL.revokeObjectURL(url);
                        this.onTTSCallback?.({
                            isPlaying: false,
                            progress: 1,
                            duration: audio.duration,
                        });
                        resolve();
                    });
                    
                    audio.addEventListener('error', (err) => {
                        URL.revokeObjectURL(url);
                        this.onTTSCallback?.({
                            isPlaying: false,
                            progress: 0,
                            duration: 0,
                        });
                        reject(err);
                    });
                    
                    audio.play().catch(reject);
                })
                .catch(reject);
        });
    }

    /**
     * Stop TTS playback
     */
    stopTTS(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        this.onTTSCallback?.({
            isPlaying: false,
            progress: 0,
            duration: 0,
        });
    }

    /**
     * Start recording with waveform visualization
     */
    async startRecording(
        expectedWord: string,
        language: string = 'en'
    ): Promise<void> {
        this.sessionId++;
        this.expectedWord = expectedWord.toLowerCase().trim();
        this.language = language;
        this.audioChunks = [];
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Connect to audio context for visualization
            if (this.audioContext && this.analyser) {
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(this.analyser);
            }
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.getSupportedMimeType()
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                await this.sendAudioForEvaluation();
            };
            
            this.mediaRecorder.start(100); // Capture every 100ms
            this.recordingStartTime = Date.now();
            
            // Start visualization
            this.visualizeRecording();
            
            eventBus.emit('PRONUNCIATION_STARTED', {
                expectedWord: this.expectedWord,
                language: this.language,
            });
            
            console.log(`[AI Pronunciation] Recording started for: "${this.expectedWord}"`);
        } catch (err) {
            console.error('[AI Pronunciation] Failed to start recording:', err);
            throw err;
        }
    }

    /**
     * Visualize recording in real-time
     */
    private visualizeRecording(): void {
        if (!this.analyser || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
            return;
        }
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Convert to peaks (0-1)
        const peaks: number[] = [];
        const step = Math.ceil(bufferLength / 32);
        for (let i = 0; i < bufferLength; i += step) {
            peaks.push(dataArray[i] / 255);
        }
        
        const duration = (Date.now() - this.recordingStartTime) / 1000;
        
        this.onRecordingCallback?.({
            isRecording: true,
            duration,
            waveform: [{ peaks, timestamp: Date.now() }],
        });
        
        this.animationFrameId = requestAnimationFrame(() => this.visualizeRecording());
    }

    /**
     * Stop recording
     */
    stopRecording(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            console.log('[AI Pronunciation] Recording stopped');
        }
        
        this.onRecordingCallback?.({
            isRecording: false,
            duration: (Date.now() - this.recordingStartTime) / 1000,
            waveform: [],
        });
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
            'audio/wav',
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return 'audio/webm';
    }

    /**
     * Send recorded audio for evaluation
     */
    private async sendAudioForEvaluation(): Promise<void> {
        if (this.audioChunks.length === 0) {
            console.warn('[AI Pronunciation] No audio recorded');
            return;
        }
        
        const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('target_text', this.expectedWord);
        formData.append('language', this.language);
        
        try {
            const response = await fetch(`${API_BASE}/api/v1/pronunciation/evaluate`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error(`Evaluation failed: ${response.status}`);
            }
            
            const result: EvaluationResult = await response.json();
            
            eventBus.emit('PRONUNCIATION_RESULT', result);
            this.onResultCallback?.(result);
            
            console.log(`[AI Pronunciation] Evaluation complete: score=${result.score}`);
        } catch (err) {
            console.error('[AI Pronunciation] Evaluation failed:', err);
            eventBus.emit('PRONUNCIATION_ERROR', { error: 'evaluation-failed' });
        }
    }

    /**
     * Evaluate pre-transcribed text
     */
    async evaluateTranscription(
        transcribedText: string,
        targetText: string,
        language: string = 'en',
        confidence: number = 1.0
    ): Promise<EvaluationResult> {
        console.log(`[AI Pronunciation] Evaluating transcription: "${transcribedText}" vs "${targetText}"`);
        
        const response = await fetch(`${API_BASE}/api/v1/pronunciation/evaluate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcribed_text: transcribedText,
                target_text: targetText,
                language,
                confidence,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Evaluation failed: ${response.status}`);
        }
        
        const result: EvaluationResult = await response.json();
        this.onResultCallback?.(result);
        
        return result;
    }

    /**
     * Full pronunciation practice flow
     */
    async startPractice(
        expectedWord: string,
        language: string = 'en',
        onResult?: PronunciationCallback
    ): Promise<void> {
        if (onResult) {
            this.onResultCallback = onResult;
        }
        
        this.sessionId++;
        this.expectedWord = expectedWord.toLowerCase().trim();
        this.language = language;
        this.audioChunks = [];
        
        this.initAudioContext();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Connect to analyser for visualization
            if (this.audioContext && this.analyser) {
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(this.analyser);
            }
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.getSupportedMimeType()
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                
                // Send for evaluation
                await this.sendAudioForEvaluation();
            };
            
            this.mediaRecorder.start(100);
            this.recordingStartTime = Date.now();
            
            // Start visualization
            this.visualizeRecording();
            
            eventBus.emit('PRONUNCIATION_STARTED', {
                expectedWord: this.expectedWord,
                language: this.language,
            });
            
            console.log(`[AI Pronunciation] Practice started for: "${this.expectedWord}"`);
            
            // Auto-stop after 8 seconds (kids shouldn't speak longer)
            setTimeout(() => {
                if (this.mediaRecorder?.state === 'recording') {
                    this.stopRecording();
                }
            }, 8000);
            
        } catch (err) {
            console.error('[AI Pronunciation] Failed to start practice:', err);
            throw err;
        }
    }

    /**
     * Set callback for pronunciation results
     */
    onResult(callback: PronunciationCallback): void {
        this.onResultCallback = callback;
    }

    /**
     * Set callback for recording state changes
     */
    onRecording(callback: RecordingCallback): void {
        this.onRecordingCallback = callback;
    }

    /**
     * Set callback for TTS playback state
     */
    onTTSState(callback: TTSCallback): void {
        this.onTTSCallback = callback;
    }

    /**
     * Get recording state
     */
    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }

    /**
     * Get recording duration
     */
    getRecordingDuration(): number {
        if (!this.isRecording()) return 0;
        return (Date.now() - this.recordingStartTime) / 1000;
    }

    /**
     * Clear callbacks
     */
    clearCallbacks(): void {
        this.onResultCallback = null;
        this.onRecordingCallback = null;
        this.onTTSCallback = null;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.stopTTS();
        this.stopRecording();
        this.clearCallbacks();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
    }
}

// Singleton instance
let _aiPronunciationService: AIPronunciationService | null = null;

export function getAIPronunciationService(): AIPronunciationService {
    if (!_aiPronunciationService) {
        _aiPronunciationService = new AIPronunciationService();
    }
    return _aiPronunciationService;
}

export default AIPronunciationService;
