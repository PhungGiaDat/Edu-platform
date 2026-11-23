/**
 * FlashcardOverlay — M5: Tracking Guidance UX
 *
 * Claymorphic flashcard overlay shown when a card is tracked.
 * Displays word, translation, audio button with spring-bounce press feedback.
 *
 * Claymorphic design: soft surfaces, vibrant accent colors, large touch targets.
 * No emojis used as icons — SVG via ClayButton is preferred.
 */
import React, { useCallback, useEffect } from 'react';
import { Image, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { useFlashcardAudio } from '../hooks/useFlashcardAudio';
import { useFlashcardState, FlashcardState } from '../hooks/useFlashcardState';
import { COLORS, SPACING, BRAND, ANIMATION } from '../design/tokens';

export interface FlashcardOverlayProps {
  word: string;
  translation: string;
  imageUrl?: string;
  audioUrl?: string;
  isLoading?: boolean;
  onAudioStateChange?: (isPlaying: boolean) => void;
  onStateChange?: (state: FlashcardState) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Claymorphic flashcard information overlay.
 * Shown on top of Unity AR camera view when a card is tracked.
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

  const audioPressed = useSharedValue(0);

  useEffect(() => {
    onAudioStateChange?.(isPlaying);
  }, [isPlaying, onAudioStateChange]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    stop();
  }, [audioUrl, stop]);

  const handlePlayTap = useCallback(()  => {
    if (isLoading) return;
    dispatch({ type: 'TAP' });
    playVocabulary(audioUrl);
  }, [audioUrl, dispatch, isLoading, playVocabulary]);

  const audioAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(audioPressed.value ? 0.9 : 1, ANIMATION.press) },
    ],
  }));

  const handleAudioPressIn = () => { audioPressed.value = 1; };
  const handleAudioPressOut = () => { audioPressed.value = 0; };

  const showMissingAudioNote = lastError?.kind === 'MISSING_AUDIO_METADATA';

  return (
    <View style={styles.container}>
      <ClayCard variant="lg" color="white" padding={24} style={styles.card}>
        {/* Word */}
        <Text style={styles.word} numberOfLines={2}>{word}</Text>

        {/* Translation */}
        {translation.length > 0 && (
          <Text style={styles.translation} numberOfLines={1}>{translation}</Text>
        )}

        {/* Card image + audio button row */}
        <View style={styles.mediaRow}>
          {imageUrl ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.vocabImage}
                resizeMode="contain"
                accessibilityLabel={`${word} illustration`}
              />
            </View>
          ) : null}

          {/* Audio button — always shown */}
          <AnimatedTouchable
            onPress={handlePlayTap}
            onPressIn={handleAudioPressIn}
            onPressOut={handleAudioPressOut}
            disabled={isLoading}
            activeOpacity={1}
            style={[styles.audioButton, audioAnimatedStyle]}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? `Playing pronunciation of ${word}` : `Play pronunciation of ${word}`}
          >
            <ClayCard
              variant="md"
              color={isPlaying ? 'yellow' : 'blue'}
              padding={16}
              style={styles.audioButtonInner}
            >
              <Text style={styles.audioEmoji}>{isPlaying ? '🔊' : '🔈'}</Text>
              <Text style={styles.audioLabel}>{isPlaying ? 'Playing...' : 'Play'}</Text>
            </ClayCard>
          </AnimatedTouchable>
        </View>

        {/* Debug note */}
        {showMissingAudioNote ? (
          <Text style={styles.debugNote}>[no audio URL in content]</Text>
        ) : null}
      </ClayCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  card: {
    alignItems: 'center',
  },
  word: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 34,
  },
  translation: {
    fontSize: 16,
    fontWeight: '500',
    color: BRAND.lavenderDark,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  vocabImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  audioButton: {
    alignItems: 'center',
  },
  audioButtonInner: {
    alignItems: 'center',
    padding: 16,
    minWidth: 80,
  },
  audioEmoji: {
    fontSize: 36,
    marginBottom: 4,
    textAlign: 'center',
  },
  audioLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  debugNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default FlashcardOverlay;
