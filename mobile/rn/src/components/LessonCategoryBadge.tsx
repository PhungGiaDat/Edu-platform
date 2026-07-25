/**
 * LessonCategoryBadge — small claymorphic pill that tags a course by its category.
 * Reads CATEGORY_COLORS from mobile/rn/src/design/tokens.ts. No raw hex literals.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import {
  CATEGORY_COLORS,
  RADIUS,
  type CourseCategoryKey,
} from '../design/tokens';

const KNOWN_CATEGORIES = Object.keys(CATEGORY_COLORS) as CourseCategoryKey[];

const FALLBACK_CATEGORY: CourseCategoryKey = 'home_family';

function resolveCategoryKey(category: string | null | undefined): CourseCategoryKey {
  if (category && (KNOWN_CATEGORIES as string[]).includes(category)) {
    return category as CourseCategoryKey;
  }
  return FALLBACK_CATEGORY;
}

export interface LessonCategoryBadgeProps {
  category: string | null | undefined;
  label?: string;
  style?: ViewStyle;
}

export const LessonCategoryBadge: React.FC<LessonCategoryBadgeProps> = ({
  category,
  label,
  style,
}) => {
  const key = resolveCategoryKey(category);
  const palette = CATEGORY_COLORS[key];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.shell,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: palette.accentDark }]}>
        {label ?? key.replace('_', ' ').toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default LessonCategoryBadge;
