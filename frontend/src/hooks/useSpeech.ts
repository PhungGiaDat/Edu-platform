/**
 * Speech Synthesis hook for pronunciation
 * Uses Web Speech API with graceful fallback
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

interface SpeechState {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, lang?: string) => void;
  cancel: () => void;
}

export function useSpeech(options: UseSpeechOptions = {}): SpeechState {
  const { rate = 0.9, pitch = 1 } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Cleanup helper — clears pending timer and voiceschanged listener
  const cleanup = useCallback(() => {
    if (voiceTimerRef.current !== null) {
      clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.onvoiceschanged = null;
    }
  }, []);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      cleanup();
      synthRef.current?.cancel();
    };
  }, [cleanup]);

  const speak = useCallback((text: string, lang: string = 'en-US') => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    // Cancel any ongoing speech and reset pending async work
    synth.cancel();
    cleanup();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Guard: speechSynthesis may be null in unsupported environments
    if (!synth) {
      return;
    }

    const selectAndSpeak = () => {
      // Bail if synth was cancelled or unmounted
      if (!synthRef.current || !utterance) return;

      const voices = synth.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synth.speak(utterance);
    };

    // Voices may load asynchronously in Chrome/Safari — attempt immediately,
    // then retry once when the voiceschanged event fires.
    const voices = synth.getVoices();
    if (voices.length > 0) {
      selectAndSpeak();
    } else {
      // Store timer ID so cleanup() can cancel it if speak() is called again
      voiceTimerRef.current = setTimeout(() => {
        voiceTimerRef.current = null;
        // If voices still not loaded, just use the default
        selectAndSpeak();
      }, 100);

      synth.onvoiceschanged = () => {
        if (voiceTimerRef.current !== null) {
          clearTimeout(voiceTimerRef.current);
          voiceTimerRef.current = null;
        }
        selectAndSpeak();
      };
    }
  }, [rate, pitch, isSupported, cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported, cleanup]);

  return { isSpeaking, isSupported, speak, cancel };
}
