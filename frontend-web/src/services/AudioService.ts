// src/services/AudioService.ts
// Audio service for pronunciation playback with Web Audio API

import { getApiBase } from '../config';

const API_BASE = getApiBase();

class AudioServiceClass {
    private audioContext: AudioContext | null = null;
    private currentAudio: HTMLAudioElement | null = null;
    private isPlaying = false;

    /**
     * Initialize Web Audio API context
     */
    init(): void {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Play pronunciation audio for a word
     */
    async playPronunciation(word: string, lang: 'en' | 'vi' = 'en', audioUrl?: string): Promise<void> {
        this.init();

        const url = audioUrl || `${API_BASE}/api/v1/audio/pronounce?word=${encodeURIComponent(word)}&lang=${lang}`;

        try {
            await this.playAudio(url);
        } catch (error) {
            console.warn('[AudioService] Fallback to speech synthesis');
            this.speakWithSpeechSynthesis(word, lang);
        }
    }

    /**
     * Play audio from URL
     */
    async playAudio(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            const audio = new Audio(url);
            this.currentAudio = audio;

            audio.onended = () => {
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = (e) => {
                this.currentAudio = null;
                reject(e);
            };

            audio.play().catch(reject);
        });
    }

    /**
     * Fallback: Use Web Speech Synthesis API
     */
    speakWithSpeechSynthesis(text: string, lang: 'en' | 'vi' = 'en'): void {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;

        window.speechSynthesis.speak(utterance);
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
        }
        window.speechSynthesis?.cancel();
    }

    get playing(): boolean {
        return this.isPlaying || (this.currentAudio !== null && !this.currentAudio.paused);
    }
}

export const AudioService = new AudioServiceClass();
export default AudioService;
