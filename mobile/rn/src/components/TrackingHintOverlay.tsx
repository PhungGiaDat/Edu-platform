/**
 * TrackingHintOverlay — M5: Tracking Guidance UX
 *
 * Shown during IMAGE_TRACKING_READY state while waiting for card detection.
 * Displays a card preview image + contextual guidance text.
 *
 * Claymorphic design: soft surfaces, vibrant accent colors, kid-friendly language.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { COLORS, SPACING, BRAND } from '../design/tokens';

export interface TrackingHintOverlayProps {
  /** Card name to display in guidance text */
  cardName?: string;
  /** Preview image URL (reference_image_url from backend) */
  previewImageUrl?: string;
  /** Number of cards expected (1 = single, 2 = multi-card) */
  expectedCardCount?: number;
  /** Current tracking state */
  state: 'waiting' | 'searching' | 'first_found' | 'both_found';
}

/** Returns kid-friendly guidance text based on state and card count. */
function getHintText(state: TrackingHintOverlayProps['state'], cardName?: string, count = 1): string {
  switch (state) {
    case 'waiting':
      return count === 1
        ? `Point camera at "${cardName ?? 'your card'}"`
        : `Find all ${count} cards!`;
    case 'searching':
      return cardName ? `Looking for "${cardName}"...` : 'Scanning...';
    case 'first_found':
      return count === 2 ? 'Great! Now find the second card' : 'Card found!';
    case 'both_found':
      return 'Both cards found!';
    default:
      return 'Point camera at your flashcard';
  }
}

function getHintEmoji(state: TrackingHintOverlayProps['state']): string {
  switch (state) {
    case 'waiting': return '📷';
    case 'searching': return '🔍';
    case 'first_found': return '✅';
    case 'both_found': return '🎉';
    default: return '📷';
  }
}

/**
 * Positioned overlay prompting the user to point the camera.
 * Uses Animated Reanimated for smooth fade transitions.
 */
export const TrackingHintOverlay: React.FC<TrackingHintOverlayProps> = ({
  cardName,
  previewImageUrl,
  expectedCardCount = 1,
  state: trackingState,
}) => {
  const hintText = getHintText(trackingState, cardName, expectedCardCount);
  const hintEmoji = getHintEmoji(trackingState);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <ClayCard variant="lg" color="blue" padding={20} style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.emoji}>{hintEmoji}</Text>
          <Text style={styles.hintText}>{hintText}</Text>
        </View>

        {/* Card preview image */}
        {previewImageUrl ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.previewImage}
              resizeMode="contain"
              accessibilityLabel={`Preview of ${cardName ?? 'flashcard'}`}
            />
            <Text style={styles.previewLabel}>{cardName ?? 'Flashcard'}</Text>
          </View>
        ) : (
          /* Fallback placeholder when no preview image available */
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderEmoji}>🃏</Text>
            <Text style={styles.placeholderLabel}>Your flashcard</Text>
          </View>
        )}

        {/* Scanning animation indicator */}
        {trackingState === 'searching' && (
          <View style={styles.scanIndicator}>
            <View style={styles.scanBar} />
          </View>
        )}

        {/* Both-found success badge */}
        {trackingState === 'both_found' && (
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>Ready to play!</Text>
          </View>
        )}
      </ClayCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  hintText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  placeholderEmoji: {
    fontSize: 56,
  },
  placeholderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  scanIndicator: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  scanBar: {
    width: '40%',
    height: '100%',
    backgroundColor: BRAND.sunshineYellow,
    borderRadius: 2,
  },
  successBadge: {
    backgroundColor: BRAND.mintGreen,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    marginTop: SPACING.xs,
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
});

export default TrackingHintOverlay;
