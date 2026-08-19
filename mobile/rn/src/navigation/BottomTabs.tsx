/**
 * BottomTabs — premium claymorphic bottom navigation bar.
 *
 * 5 primary destinations: Home / Learn / Games / Pets / Profile.
 * Lexi floats above the navigation as an assistant orb (see LexiOrb).
 *
 * Uses vector icons via ClayIcons — no random emoji icons.
 * Active tab uses clay pill indicator with semantic color tone.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayIcon, type ClayIconName } from '../components/icons/ClayIcons';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, BRAND } from '../design/tokens';

export type BottomTabKey = 'Home' | 'Learning' | 'Chat' | 'Games' | 'Pets' | 'Profile';

export interface BottomTabsProps {
  active: BottomTabKey;
  onChange: (next: BottomTabKey) => void;
}

interface TabEntry {
  key: BottomTabKey;
  label: string;
  icon: ClayIconName;
  color: string;
  bgColor: string;
}

const TABS: TabEntry[] = [
  {
    key: 'Home',
    label: 'Trang chủ',
    icon: 'home',
    color: BRAND.sunshineYellowDark,
    bgColor: 'rgba(255,217,61,0.18)',
  },
  {
    key: 'Learning',
    label: 'Học',
    icon: 'compass',
    color: BRAND.skyBlueDark,
    bgColor: 'rgba(110,185,255,0.18)',
  },
  {
    key: 'Chat',
    label: 'Lexi',
    icon: 'lexi',
    color: BRAND.purple,
    bgColor: 'rgba(168,85,247,0.15)',
  },
  {
    key: 'Games',
    label: 'Trò chơi',
    icon: 'games',
    color: BRAND.coralPinkDark,
    bgColor: 'rgba(255,159,159,0.18)',
  },
  {
    key: 'Pets',
    label: 'Thú cưng',
    icon: 'paw',
    color: BRAND.mintGreenDark,
    bgColor: 'rgba(180,225,151,0.18)',
  },
  {
    key: 'Profile',
    label: 'Hồ sơ',
    icon: 'profile',
    color: BRAND.deepSlate,
    bgColor: 'rgba(26,39,68,0.10)',
  },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const TabButton: React.FC<{
  tab: TabEntry;
  isActive: boolean;
  onPress: (key: BottomTabKey) => void;
}> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(scale.value, { damping: 16, stiffness: 280 }) },
    ],
  }));

  return (
    <AnimatedTouchable
      activeOpacity={0.7}
      onPress={() => onPress(tab.key)}
      onPressIn={() => { scale.value = 0.92; }}
      onPressOut={() => { scale.value = 1; }}
      style={[styles.tabButton, animatedStyle]}
    >
      <View
        style={[
          styles.iconWell,
          isActive && {
            backgroundColor: tab.bgColor,
            borderColor: tab.color,
          },
        ]}
      >
        <ClayIcon
          name={tab.icon}
          size={22}
          color={isActive ? tab.color : COLORS.textMuted}
          strokeWidth={isActive ? 2.4 : 2}
        />
      </View>
      <Text
        style={[
          styles.label,
          isActive && {
            color: tab.color,
            fontWeight: '800',
          },
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
      {isActive && (
        <View style={[styles.activeDot, { backgroundColor: tab.color }]} />
      )}
    </AnimatedTouchable>
  );
};

export const BottomTabs: React.FC<BottomTabsProps> = ({ active, onChange }) => (
  <View style={styles.container}>
    <View style={[styles.bar, SHADOWS.clayMd]}>
      {TABS.map((tab) => (
        <TabButton
          key={tab.key}
          tab={tab}
          isActive={active === tab.key}
          onPress={onChange}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.backgroundBase,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  iconWell: {
    width: 56,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  label: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    width: 20,
    height: 3,
    borderRadius: 2,
    alignSelf: 'center',
  },
});

export default BottomTabs;