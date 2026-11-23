/**
 * CategoryChip — pill-shaped filter chip for course categories and levels.
 *
 * States: active (filled, colored) / inactive (outline, muted).
 * Used in CourseListScreen and HomeScreen category filter rows.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayIcon } from './icons/ClayIcons';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';

export interface CategoryChipProps {
  label: string;
  icon?: string;
  active?: boolean;
  accentColor?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  icon,
  active = false,
  accentColor = BRAND.skyBlue,
  onPress,
}) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(pressed.value ? 0.95 : 1, { damping: 15, stiffness: 200 }) },
    ],
  }));

  const bgColor = active
    ? withOpacity(accentColor, 0.15)
    : 'transparent';
  const borderColor = active
    ? withOpacity(accentColor, 0.35)
    : withOpacity(COLORS.textMuted, 0.3);
  const textColor = active ? accentColor : COLORS.textSecondary;
  const iconColor = active ? accentColor : COLORS.textMuted;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { pressed.value = 1; }}
      onPressOut={() => { pressed.value = 0; }}
      style={animatedStyle}
    >
      <View
        style={[
          styles.chip,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
          },
        ]}
      >
        {icon ? (
          <ClayIcon
            name={icon as never}
            size={14}
            color={iconColor}
            strokeWidth={2}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            { color: textColor },
            icon ? { marginLeft: 4 } : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
  },
  label: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
  },
});

export default CategoryChip;
