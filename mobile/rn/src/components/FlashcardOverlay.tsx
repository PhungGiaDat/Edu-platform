/**
 * @file FlashcardOverlay — AR flashcard information overlay.
 *
 * Phase 1 (C14): tap the card image → plays vocabulary pronunciation audio
 *   with spring-bounce visual feedback. Repeated taps restart the audio.
 *   Missing audio does not crash.
 *
 * Phase 2: rendered on top of the Unity AR view.
 *
 * Backend contract: `ARExperienceResponse.audio_url` (Supabase public URL).
 * RN owns pronunciation audio — NOT routed through Unity.
 *
 * Created: C14 (tap-to-hear + visual feedback).
 */
import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { FlashcardInteraction } from './FlashcardInteraction';
import { useFlashcardAudio } from '../hooks/useFlashcardAudio';
import { useFlashcardState, FlashcardState } from '../hooks/useFlashcardState';

export interface FlashcardOverlayProps {
  word: string;
  translation: string;
  imageUrl?: string;
  audioUrl?: string;
  /**
   * Set to true while parent is loading content — prevents interaction
   * until data is ready.
   */
  isLoading?: boolean;
  /**
   * Exposed so parent screens (e.g. ARScreen) can read the audio state.
   */
  onAudioStateChange?: (isPlaying: boolean) => void;
  /**
   * Exposed so parent screens can observe flashcard learning-state changes.
   */
  onStateChange?: (state: FlashcardState) => void;
}

/**
 * FlashcardOverlay — displays vocabulary information with tap-to-hear audio.
 *
 * Primary tap target: the vocabulary image.
 * Repeated taps restart the current audio cleanly.
 * Missing audio: graceful no-op, no crash.
 */
export const FlashcardOverlay: React.FC<FlashcardOverlayProps> = ({
  word,
  translation,
  imageUrl,
  audioUrl,
  isLoading = false,
  onAudioStateChange,
  onStateChange,
}) => {
  const { isPlaying, playVocabulary, stop, lastError } = useFlashcardAudio();
  const { state, dispatch } = useFlashcardState(word);

  // Propagate audio state to parent if requested.
  useEffect(() => {
    onAudioStateChange?.(isPlaying);
  }, [isPlaying, onAudioStateChange]);

  // Propagate flashcard learning-state to parent if requested.
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // When audio URL changes (new flashcard), stop any previous playback.
  useEffect(() => {
    stop();
  }, [audioUrl, stop]);

  const handleImageTap = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'TAP' });
    playVocabulary(audioUrl);
  }, [audioUrl, dispatch, isLoading, playVocabulary]);

  const handleSpeakerTap = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'TAP' });
    playVocabulary(audioUrl);
  }, [audioUrl, dispatch, isLoading, playVocabulary]);

  const showMissingAudioNote = lastError?.kind === 'MISSING_AUDIO_METADATA';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Word label */}
        <Text style={styles.word}>{word}</Text>
        <Text style={styles.translation}>{translation}</Text>

        {/* Vocabulary image — primary tap target */}
        {imageUrl ? (
          <View style={styles.imageContainer}>
            <FlashcardInteraction
              onTap={handleImageTap}
              disabled={isLoading}
              accessibilityLabel={`Tap to hear pronunciation of ${word}`}
              style={styles.interactionWrapper}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.vocabImage}
                resizeMode="contain"
                accessibilityLabel={`${word} illustration`}
              />
            </FlashcardInteraction>

            {/* Speaker icon — explicit replay control */}
            <Text
              style={[
                styles.speakerIcon,
                isPlaying && styles.speakerIconPlaying,
              ]}
              onPress={handleSpeakerTap}
              accessibilityRole="button"
              accessibilityLabel={
                isPlaying
                  ? `Playing pronunciation of ${word}`
                  : `Play pronunciation of ${word}`
              }
            >
              {isPlaying ? '🔊' : '🔈'}
            </Text>
          </View>
        ) : (
          /* Fallback when no image is available */
          <View style={styles.noImageContainer}>
            <Text
              style={styles.speakerFallback}
              onPress={handleSpeakerTap}
              accessibilityRole="button"
              accessibilityLabel={`Play pronunciation of ${word}`}
            >
              {isPlaying ? '🔊 Play again' : '🔈 Play audio'}
            </Text>
          </View>
        )}

        {/* Debug note — shows only when backend has no audio_url for this item */}
        {showMissingAudioNote ? (
          <Text style={styles.debugNote}>[no audio URL in content]</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  word: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  translation: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  imageContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  interactionWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  vocabImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  speakerIcon: {
    fontSize: 28,
    marginTop: 8,
    textAlign: 'center',
  },
  speakerIconPlaying: {
    opacity: 0.8,
  },
  noImageContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  speakerFallback: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  debugNote: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
  },
});
