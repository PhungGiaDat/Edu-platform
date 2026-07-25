/**
 * BottomTabs — claymorphic bottom-tab navigation strip.
 *
 * Avoids `@react-navigation/bottom-tabs` because the project doesn't have it
 * installed and the directive forbids running `npm install`. Renders a clay
 * strip with 4 entries (Home / Courses / Pets / Profile) using existing
 * ClayCard primitives + token colors. Active tab receives a colored clay shell
 * + bolder weight.
 *
 * Each entry surfaces an onSelect callback so the parent can wire it to
 * react-navigation's `navigation.navigate(...)`.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING } from '../design/tokens';export type BottomTabKey = 'Home' | 'Courses' | 'Pets' | 'Profile';

export interface BottomTabsProps {
  active: BottomTabKey;
  onChange: (next: BottomTabKey) => void;
}

interface TabEntry {
  key: BottomTabKey;
  label: string;
  icon: string;
  color: string;
}

const TABS: TabEntry[] = [
  { key: 'Home', label: 'Home', icon: '🏠', color: COLORS.primary },
  { key: 'Courses', label: 'Courses', icon: '📚', color: COLORS.accent },
  { key: 'Pets', label: 'Pets', icon: '🐾', color: COLORS.secondary },
  { key: 'Profile', label: 'Profile', icon: '👤', color: COLORS.coral },
];

export const BottomTabs: React.FC<BottomTabsProps> = ({ active, onChange }) => (
  <View style={styles.container}>
    <View style={[styles.bar, SHADOWS.clayMd]}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onChange(tab.key)}
            style={styles.tabButton}
          >
            <View
              style={[
                styles.iconWell,
                isActive && {
                  backgroundColor: tab.color,
                },
              ]}
            >
              <Text style={styles.icon}>{tab.icon}</Text>
            </View>
            <Text
              style={[
                styles.label,
                isActive && {
                  color: tab.color,
                  fontWeight: '800',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.backgroundBase,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  iconWell: {
    width: 40,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});

export default BottomTabs;
