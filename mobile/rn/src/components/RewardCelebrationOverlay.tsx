/**
 * RewardCelebrationOverlay — M7: Reward Celebration
 *
 * Shown after a successful combo fires and XP has been awarded.
 * Displays confetti-style celebration, XP amount, and optional level-up.
 *
 * Claymorphic design: vibrant gold/yellow tones, sparkle animations.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  withTiming,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { COLORS, SPACING, BRAND } from '../design/tokens';

export interface RewardCelebrationOverlayProps {
  xpAwarded: number;
  streakCount?: number;
  comboDescription?: string;
  leveledUp?: boolean;
  newLevel?: number;
  badgesEarned?: string[];
  onDismiss: () => void;
}

/** Confetti particle component */
const ConfettiPiece: React.FC<{ index: number; color: string }> = ({ index, color }) => {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(Math.random() * 20 - 10);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const delay = index * 60;
    const duration = 1200 + Math.random() * 800;
    translateY.value = withDelay(
      delay,
      withTiming(600, { duration, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(Math.random() * 60 - 30, { duration, easing: Easing.out(Easing.quad) })
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 600 }), -1, false)
    );
  }, [index, translateY, translateX, rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

/** XP counter that animates from 0 to final value */
const AnimatedXPCounter: React.FC<{ xp: number }> = ({ xp }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withDelay(300, withSpring(1.3, { damping: 8, stiffness: 200 })),
      withSpring(1, { damping: 12, stiffness: 180 })
    );
  }, [xp, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.xpAmount, animatedStyle]}>
      +{xp} XP
    </Animated.Text>
  );
};

/**
 * Full celebration overlay shown on successful combo completion.
 * Displays animated confetti, XP counter, streak, and optional level-up.
 */
export const RewardCelebrationOverlay: React.FC<RewardCelebrationOverlayProps> = ({
  xpAwarded,
  streakCount,
  comboDescription,
  leveledUp = false,
  newLevel,
  badgesEarned = [],
  onDismiss,
}) => {
  const confettiColors = [
    BRAND.sunshineYellow,
    BRAND.bubblePink,
    BRAND.vibrantOrange,
    BRAND.skyBlue,
    BRAND.mintGreen,
    BRAND.electricPurple,
  ];

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.backdrop}
    >
      {/* Confetti layer */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {Array.from({ length: 24 }).map((_, i) => (
          <ConfettiPiece
            key={i}
            index={i}
            color={confettiColors[i % confettiColors.length]}
          />
        ))}
      </View>

      {/* Main card */}
      <ClayCard variant="xl" color="yellow" padding={36} style={styles.card}>
        {/* Success emoji */}
        <Text style={styles.emoji}>🎉</Text>

        {/* Title */}
        <Text style={styles.title}>Amazing!</Text>

        {/* Combo description */}
        {comboDescription && (
          <Text style={styles.comboDescription}>{comboDescription}</Text>
        )}

        {/* XP Award */}
        <View style={styles.xpContainer}>
          <AnimatedXPCounter xp={xpAwarded} />
        </View>

        {/* Streak */}
        {streakCount != null && streakCount > 0 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakLabel}>🔥 {streakCount} streak!</Text>
          </View>
        )}

        {/* Level up */}
        {leveledUp && newLevel != null && (
          <View style={styles.levelUpContainer}>
            <Text style={styles.levelUpEmoji}>⬆️</Text>
            <Text style={styles.levelUpText}>Level {newLevel}!</Text>
          </View>
        )}

        {/* Badges earned */}
        {badgesEarned.length > 0 && (
          <View style={styles.badgesContainer}>
            {badgesEarned.map((badge, i) => (
              <Text key={i} style={styles.badgeText}>{badge}</Text>
            ))}
          </View>
        )}

        {/* Dismiss button */}
        <View style={styles.buttonContainer}>
          <ClayButton
            color="orange"
            variant="lg"
            onPress={onDismiss}
            style={styles.dismissButton}
          >
            Continue
          </ClayButton>
        </View>
      </ClayCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 10,
    height: 14,
    borderRadius: 2,
    marginLeft: -5,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    zIndex: 10,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  comboDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  xpContainer: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
  },
  xpAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: BRAND.vibrantOrange,
    textAlign: 'center',
  },
  streakContainer: {
    marginBottom: SPACING.sm,
  },
  streakLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  levelUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  levelUpEmoji: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  levelUpText: {
    fontSize: 18,
    fontWeight: '800',
    color: BRAND.electricPurple,
    textAlign: 'center',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  buttonContainer: {
    width: '100%',
    marginTop: SPACING.sm,
  },
  dismissButton: {
    width: '100%',
  },
});

export default RewardCelebrationOverlay;
