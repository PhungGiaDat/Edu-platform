/**
 * useARAudio.ts
 * 
 * Task 3.8: Audio playback for AR events
 * Triggers audio in React (parent) to avoid autoplay blocking in iframes
 */

import { useEffect, useRef, useCallback } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { AREvent } from '@/core/types/AREvents';

// ========== TYPES ==========
export interface ARAudioConfig {
    nftFoundSound?: string;    // URL or path to sound file
    comboActivatedSound?: string;
    errorSound?: string;
    enabled?: boolean;
    volume?: number;
}

const DEFAULT_CONFIG: ARAudioConfig = {
    nftFoundSound: '/static/audio/nft-found.mp3',
    comboActivatedSound: '/static/audio/combo.mp3',
    errorSound: '/static/audio/error.mp3',
    enabled: true,
    volume: 0.5
};

// ========== HOOK ==========
export function useARAudio(config: ARAudioConfig = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());
    const isUnlockedRef = useRef(false);

    /**
     * Preload audio file
     */
    const preloadAudio = useCallback((url: string) => {
        if (!url || audioCache.current.has(url)) return;

        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = mergedConfig.volume || 0.5;
        audioCache.current.set(url, audio);
        console.log('[ARAudio] 🔊 Preloaded:', url);
    }, [mergedConfig.volume]);

    /**
     * Play audio by URL
     */
    const playAudio = useCallback((url: string) => {
        if (!mergedConfig.enabled || !url) return;

        let audio = audioCache.current.get(url);

        if (!audio) {
            audio = new Audio(url);
            audio.volume = mergedConfig.volume || 0.5;
            audioCache.current.set(url, audio);
        }

        // Reset and play
        audio.currentTime = 0;
        audio.play().catch(err => {
            console.warn('[ARAudio] Playback failed (autoplay policy?):', err.message);
        });

        console.log('[ARAudio] 🔊 Playing:', url);
    }, [mergedConfig.enabled, mergedConfig.volume]);

    /**
     * Unlock audio context on first user interaction
     * Required for iOS Safari and some browsers
     */
    const unlockAudio = useCallback(() => {
        if (isUnlockedRef.current) return;

        // Create a silent audio context to unlock
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            ctx.resume();
        }

        isUnlockedRef.current = true;
        console.log('[ARAudio] 🔓 Audio unlocked');
    }, []);

    /**
     * Specific sound triggers
     */
    const playNFTFoundSound = useCallback(() => {
        if (mergedConfig.nftFoundSound) {
            playAudio(mergedConfig.nftFoundSound);
        }
    }, [mergedConfig.nftFoundSound, playAudio]);

    const playComboSound = useCallback(() => {
        if (mergedConfig.comboActivatedSound) {
            playAudio(mergedConfig.comboActivatedSound);
        }
    }, [mergedConfig.comboActivatedSound, playAudio]);

    const playErrorSound = useCallback(() => {
        if (mergedConfig.errorSound) {
            playAudio(mergedConfig.errorSound);
        }
    }, [mergedConfig.errorSound, playAudio]);

    // ========== PRELOAD SOUNDS ==========
    useEffect(() => {
        if (mergedConfig.nftFoundSound) preloadAudio(mergedConfig.nftFoundSound);
        if (mergedConfig.comboActivatedSound) preloadAudio(mergedConfig.comboActivatedSound);
        if (mergedConfig.errorSound) preloadAudio(mergedConfig.errorSound);
    }, [mergedConfig.nftFoundSound, mergedConfig.comboActivatedSound, mergedConfig.errorSound, preloadAudio]);

    // ========== EVENTBUS SUBSCRIPTIONS ==========
    useEffect(() => {
        if (!mergedConfig.enabled) return;

        // Task 3.8: Play sound when NFT is found
        const handleNFTFound = (_payload: { markerId: string }) => {
            console.log('[ARAudio] 🎵 NFT found, playing sound');
            playNFTFoundSound();
        };

        // Play sound on combo activation
        const handleComboActivated = (_payload: any) => {
            console.log('[ARAudio] 🎵 Combo activated, playing sound');
            playComboSound();
        };

        // Play sound on error
        const handleError = (_payload: { error: Error }) => {
            console.log('[ARAudio] 🎵 Error, playing sound');
            playErrorSound();
        };

        eventBus.on(AREvent.MARKER_FOUND, handleNFTFound);
        eventBus.on(AREvent.COMBO_ACTIVATED, handleComboActivated);
        eventBus.on(AREvent.AR_ERROR, handleError);

        // Unlock audio on first touch/click
        const handleInteraction = () => unlockAudio();
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('click', handleInteraction, { once: true });

        return () => {
            eventBus.off(AREvent.MARKER_FOUND, handleNFTFound);
            eventBus.off(AREvent.COMBO_ACTIVATED, handleComboActivated);
            eventBus.off(AREvent.AR_ERROR, handleError);
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('click', handleInteraction);
        };
    }, [mergedConfig.enabled, playNFTFoundSound, playComboSound, playErrorSound, unlockAudio]);

    return {
        playAudio,
        playNFTFoundSound,
        playComboSound,
        playErrorSound,
        unlockAudio,
        isUnlocked: isUnlockedRef.current
    };
}

export default useARAudio;
