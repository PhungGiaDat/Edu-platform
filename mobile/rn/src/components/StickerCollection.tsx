/**
 * StickerCollection — grid display of collected and locked stickers.
 * Claymorphic frame style with colored backgrounds for unlocked stickers.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { BRAND, COLORS, FONT, SPACING, withOpacity } from '../design/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 4;
const STICKER_SIZE = (SCREEN_WIDTH - SPACING.base * 2 - SPACING.sm * (COLUMNS - 1)) / COLUMNS;

const STICKER_COLORS = [
  BRAND.sunshineYellow,
  BRAND.coralPink,
  BRAND.mintGreen,
  BRAND.lavender,
  BRAND.skyBlue,
  BRAND.electricPurple,
  BRAND.neonTeal,
  BRAND.bubblePink,
];

export interface StickerItem {
  id: string;
  emoji: string;
  name: string;
  unlocked: boolean;
}

export interface StickerCollectionProps {
  stickers: StickerItem[];
  onStickerPress?: (sticker: StickerItem) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const StickerCard: React.FC<{
  sticker: StickerItem;
  colorIndex: number;
  onPress?: (sticker: StickerItem) => void;
}> = ({ sticker, colorIndex, onPress }) => {
  const scale = useSharedValue(1);
  const backgroundColor = STICKER_COLORS[colorIndex % STICKER_COLORS.length];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => onPress?.(sticker)}
      onPressIn={() => { scale.value = 0.9; }}
      onPressOut={() => { scale.value = 1; }}
      style={[styles.stickerWrapper, animatedStyle]}
    >
      <ClayCard
        variant="md"
        color={sticker.unlocked ? 'white' : 'white'}
        padding={0}
        style={[
          styles.stickerFrame,
          sticker.unlocked && { borderColor: withOpacity(backgroundColor, 0.3) },
        ]}
      >
        <View
          style={[
            styles.stickerInner,
            sticker.unlocked
              ? { backgroundColor: withOpacity(backgroundColor, 0.15) }
              : styles.stickerLocked,
          ]}
        >
          {sticker.unlocked ? (
            <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
          ) : (
            <View style={styles.puzzlePiece}>
              <Text style={styles.puzzleText}>?</Text>
            </View>
          )}
        </View>
      </ClayCard>
      <Text
        style={[styles.stickerName, !sticker.unlocked && styles.stickerNameLocked]}
        numberOfLines={1}
      >
        {sticker.unlocked ? sticker.name : '???'
        }
      </Text>
    </AnimatedPressable>
  );
};

export const StickerCollection: React.FC<StickerCollectionProps> = ({
  stickers,
  onStickerPress,
}) => {
  const unlockedCount = stickers.filter((s) => s.unlocked).length;
  const rows: StickerItem[][] = [];
  for (let i = 0; i < stickers.length; i += COLUMNS) {
    rows.push(stickers.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.container}>
      {/* Collection progress */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {unlockedCount} / {stickers.length} stickers
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(unlockedCount / stickers.length) * 100}%`,
                backgroundColor: BRAND.lavender,
              },
            ]}
          />
        </View>
      </View>

      {/* Sticker grid */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((sticker, idx) => (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              colorIndex={rowIndex * COLUMNS + idx}
              onPress={onStickerPress}
            />
          ))}
          {/* Fill empty slots */}
          {row.length < COLUMNS &&
            Array.from({ length: COLUMNS - row.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.stickerWrapper} />
            ))}
        </View>
      ))}

      {stickers.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌟</Text>
          <Text style={styles.emptyText}>Chưa có sticker nào</Text>
          <Text style={styles.emptySubtext}>Hoàn thành thử thách để mở khóa stickers!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  progressHeader: {
    marginBottom: SPACING.sm,
  },
  progressText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: withOpacity(BRAND.lavender, 0.2),
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  stickerWrapper: {
    width: STICKER_SIZE,
    alignItems: 'center',
  },
  stickerFrame: {
    width: STICKER_SIZE,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  stickerInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  stickerLocked: {
    backgroundColor: withOpacity(COLORS.textMuted, 0.08),
  },
  stickerEmoji: {
    fontSize: 28,
  },
  puzzlePiece: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: withOpacity(COLORS.textMuted, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  puzzleText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  stickerName: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  stickerNameLocked: {
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default StickerCollection;
