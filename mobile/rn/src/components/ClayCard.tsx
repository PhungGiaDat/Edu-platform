import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, COLOR_MAP, SHADOWS, RADIUS, type ClayColor } from '../design/tokens';

export type ClayVariant = 'sm' | 'md' | 'lg';

export interface ClayCardProps {
  variant?: ClayVariant;
  color?: ClayColor;
  borderRadius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  children: React.ReactNode;
}

/**
 * Claymorphic card using native boxShadow (RN 0.86+) + LinearGradient top-edge highlight.
 * Renders 3-layer claymorphic effect: drop shadow + ambient shadow + gradient highlight.
 */
export const ClayCard: React.FC<ClayCardProps> = ({
  variant = 'md',
  color = 'white',
  borderRadius,
  padding = 16,
  style,
  onPress,
  children,
}) => {
  const radius = borderRadius ?? RADIUS[variant];
  const shadowKey = `clay${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof SHADOWS;
  const shadowStyle = SHADOWS[shadowKey];
  const backgroundColor = COLOR_MAP[color];

  const cardContent = (
    <View
      style={[
        styles.container,
        {
          borderRadius: radius,
          shadowColor: shadowStyle.shadowColor,
          shadowOffset: shadowStyle.shadowOffset,
          shadowOpacity: shadowStyle.shadowOpacity,
          shadowRadius: shadowStyle.shadowRadius,
          elevation: shadowStyle.elevation,
        },
        style,
      ]}
    >
      <View style={[styles.inner, { backgroundColor, borderRadius: radius }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'transparent']}
          style={[styles.highlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.25 }}
        />
        <View style={[styles.content, { padding }]}>{children}</View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  inner: {
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '25%',
  },
  content: {
    zIndex: 1,
  },
});
