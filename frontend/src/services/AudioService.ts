// src/services/AudioService.ts
// Audio service for pronunciation playback with Web Audio API

import { getApiBase } from '../config';

const API_BASE = getApiBase();

class AudioServiceClass {
    private audioContext: AudioContext | null = null;
    private currentAudio: HTMLAudioElement | null = null;
    private currentPlaybackResolve: (() => void) | null = null;
    private isPlaying = false;

    /**
     * Initialize Web Audio API context
     */
    init(): void {
        // AudioContext is optional: asset playback uses HTMLAudioElement and does
        // not depend on it. Never let a missing/failing AudioContext block playback.
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return;
            if (!this.audioContext) {
                this.audioContext = new Ctx();
            }
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch {
            this.audioContext = null;
        }
    }

    /**
     * Play pronunciation audio for a word
     */
    async playPronunciation(word: string, lang: 'en' | 'vi' = 'en', audioUrl?: string): Promise<void> {
        this.init();

        const urls = [
            audioUrl,
            `${API_BASE}/api/v1/pronunciation/tts/stream/${encodeURIComponent(word)}?language=${lang}`,
        ].filter((url): url is string => Boolean(url));

        let lastError: unknown;
        for (const url of urls) {
            try {
                await this.playAudio(url);
                return;
            } catch (error) {
                lastError = error;
            }
        }

        if (await this.speakWithSpeechSynthesis(word, lang)) return;
        throw lastError || new Error('Pronunciation audio unavailable');
    }

    /**
     * Play audio from URL
     */
    async playAudio(url: string): Promise<void> {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.currentPlaybackResolve?.();
            this.currentPlaybackResolve = null;
        }

        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            this.currentAudio = audio;
            this.currentPlaybackResolve = resolve;

            audio.onended = () => {
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                    this.currentPlaybackResolve = null;
                }
                resolve();
            };

            audio.onerror = (e) => {
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                    this.currentPlaybackResolve = null;
                }
                reject(e);
            };

            audio.play().catch((error) => {
                if (this.currentAudio === audio) {
                    this.currentAudio = null;
                    this.currentPlaybackResolve = null;
                }
                reject(error);
            });
        });
    }

    /**
     * Fallback: Use Web Speech Synthesis API
     */
    speakWithSpeechSynthesis(text: string, lang: 'en' | 'vi' = 'en'): Promise<boolean> {
        if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
            return Promise.resolve(false);
        }

        window.speechSynthesis.cancel();

        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
            utterance.rate = 0.8;
            utterance.pitch = 1.1;
            utterance.onend = () => resolve(true);
            utterance.onerror = () => resolve(false);
            window.speechSynthesis.speak(utterance);
        });
    }

    /**
     * Play a sound effect
     */
    async playSoundEffect(type: 'correct' | 'wrong' | 'celebrate' | 'click'): Promise<void> {
        const soundUrls: Record<string, string> = {
            correct: '/audio/correct.mp3',
            wrong: '/audio/wrong.mp3',
            celebrate: '/audio/celebrate.mp3',
            click: '/audio/click.mp3',
        };

        const url = soundUrls[type];
        if (url) {
            try {
                await this.playAudio(url);
            } catch {
                // Silent fail for effects
            }
        }
    }

    /**
     * Stop all audio
     */
    stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.currentPlaybackResolve?.();
            this.currentPlaybackResolve = null;
        }
        window.speechSynthesis?.cancel();
    }

    get playing(): boolean {
        return this.isPlaying || (this.currentAudio !== null && !this.currentAudio.paused);
    }
}

export const AudioService = new AudioServiceClass();
export default AudioService;
