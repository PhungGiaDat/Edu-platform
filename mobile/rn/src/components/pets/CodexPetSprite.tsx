/**
 * CodexPetSprite — RN port of frontend-web/src/components/pets/CodexPetSprite.tsx.
 *
 * Renders the Lexi butterfly spritesheet via Image + clipping.
 * Uses the same 8x9 atlas layout (192x208 cells) and animation timing as web.
 *
 * Asset: mobile/rn/assets/pets/lexi/spritesheet.webp
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  View,
  StyleSheet,
  type DimensionValue,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';

export type CodexPetAnimationState =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review';

export interface CodexPetSpriteProps {
  animationState?: CodexPetAnimationState;
  label?: string;
  size?: number | DimensionValue;
  style?: ViewStyle;
}

const ATLAS_COLUMNS = 8;
const ATLAS_ROWS = 9;
const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;

const ANIMATION_ROWS: Record<CodexPetAnimationState, { row: number; durations: number[] }> = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
  'running-right': { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  'running-left': { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { row: 3, durations: [140, 140, 140, 280] },
  jumping: { row: 4, durations: [140, 140, 140, 140, 280] },
  failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
  running: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
};

const CELL_ASPECT = CELL_WIDTH / CELL_HEIGHT;
const SPRITESHEET = require('../../../assets/pets/lexi/spritesheet.webp');

export function CodexPetSprite({
  animationState = 'idle',
  label = 'Lexi',
  size = '100%',
  style,
}: CodexPetSpriteProps) {
  const animation = useMemo(() => ANIMATION_ROWS[animationState], [animationState]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
  }, [animationState]);

  useEffect(() => {
    const duration = animation.durations[frame] ?? animation.durations[0];
    const timer = setTimeout(() => {
      setFrame((current) => (current + 1) % animation.durations.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [animation, frame]);

  const safeFrame = Math.min(frame, animation.durations.length - 1);
  // The image is sized to cover all 8 columns. We translate it so the
  // current cell column lands at left=0. Then we crop vertically with the
  // parent container's aspectRatio + the row offset via negative top%.
  const translateXPercent = (safeFrame / (ATLAS_COLUMNS - 1)) * 100;
  const rowOffsetPercent = -(animation.row / (ATLAS_ROWS - 1)) * 100;

  const numericSize = typeof size === 'number' ? size : null;

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[
        styles.container,
        numericSize !== null
          ? { width: numericSize, height: numericSize / CELL_ASPECT }
          : { width: size as DimensionValue, aspectRatio: CELL_ASPECT },
        style,
      ]}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={SPRITESHEET}
          style={[
            styles.spriteImage,
            {
              // Width is 8x the wrapper width; we translate to show the right column
              width: `${ATLAS_COLUMNS * 100}%` as `${number}%`,
              height: `${ATLAS_ROWS * 100}%` as `${number}%`,
              left: `-${translateXPercent}%` as `${number}%`,
              top: `${rowOffsetPercent}%` as `${number}%`,
            } as ImageStyle,
          ]}
          resizeMode="stretch"
          fadeDuration={0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: `${100 / ATLAS_ROWS}%`,
    overflow: 'hidden',
  },
  spriteImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default CodexPetSprite;