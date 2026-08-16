/**
 * @file useFlashcardAudio — vocabulary pronunciation audio playback.
 *
 * Implements the R5 tap-to-hear audio pipeline:
 *   Learner taps flashcard image → play vocabulary audioUrl → return to idle.
 *
 * Repeated-tap behavior: restarts current audio from beginning.
 * Missing audio: gracefully ignored, no crash.
 * Playback failure: non-blocking, no state corruption.
 *
 * Backend field consumed: `ARExperienceResponse.audio_url` (supabase public URL).
 * RN owns this playback — pronunciation audio does NOT route through Unity.
 *
 * Created: C14 (tap-to-hear + visual feedback).
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------

/** Audio metadata absent from content payload — not a playback failure. */
export interface MissingAudioError {
  readonly kind: 'MISSING_AUDIO_METADATA';
}

/** Audio load or playback threw — recoverable, no crash. */
export interface PlaybackError {
  readonly kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED';
  readonly message?: string;
}

/** Union of recoverable error shapes. */
export type FlashcardAudioError = MissingAudioError | PlaybackError;

// ---------------------------------------------------------------------------
// Hook return value
// ---------------------------------------------------------------------------

export interface FlashcardAudioResult {
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /**
   * Play vocabulary pronunciation audio.
   *
   * Repeated taps: restarts audio from beginning.
   * Missing audioUrl: no-op (MISSING_AUDIO_METADATA error emitted).
   * Load/playback failure: no crash, PLAYBACK_FAILED error emitted.
   */
  playVocabulary: (audioUrl?: string | null) => Promise<void>;
  /**
   * Stop any in-progress audio immediately.
   * Safe to call even when nothing is playing.
   */
  stop: () => Promise<void>;
  /** The most recent recoverable error, or null. */
  lastError: FlashcardAudioError | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFlashcardAudio(): FlashcardAudioResult {
  // Sound is held in a ref so the onPlaybackStatusUpdate callback always
  // reads the current instance without stale-closure issues.
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastErrorRef = useRef<FlashcardAudioError | null>(null);
  const [, forceUpdate] = useState(0);

  // Stable error-reporting helper — triggers a re-render so callers can
  // read the current error via the `lastError` return value.
  const reportError = useCallback((err: FlashcardAudioError) => {
    lastErrorRef.current = err;
    forceUpdate((n) => n + 1);
  }, []);

  const clearError = useCallback(() => {
    lastErrorRef.current = null;
    forceUpdate((n) => n + 1);
  }, []);

  const playVocabulary = useCallback(
    async (audioUrl?: string | null): Promise<void> => {
      // ── Missing audio metadata — non-blocking no-op ──────────────────────
      if (!audioUrl) {
        reportError({ kind: 'MISSING_AUDIO_METADATA' });
        return;
      }

      // ── Stop any previous playback ───────────────────────────────────────
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {
          // Ignore errors when stopping/unloading — we want a clean slate.
        }
        soundRef.current = null;
      }

      try {
        // ── Load the audio clip ─────────────────────────────────────────────
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate,
        );
        soundRef.current = sound;
        setIsPlaying(true);
        clearError();
      } catch (err) {
        reportError({
          kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED',
          message: err instanceof Error ? err.message : undefined,
        });
        setIsPlaying(false);
      }
    }, // end playVocabulary
  [clearError, reportError],
);

  const stop = useCallback(async (): Promise<void> => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore stop/unload errors — best-effort.
      }
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      // Playback finished or errored.
      setIsPlaying(false);
      return;
    }
    setIsPlaying(!status.didJustFinish && !status.isBuffering && status.isPlaying);
  }, []);

  useEffect(() => () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) void sound.unloadAsync().catch(() => {});
  }, []);

  return {
    isPlaying,
    playVocabulary,
    stop,
    lastError: lastErrorRef.current,
  };
}
