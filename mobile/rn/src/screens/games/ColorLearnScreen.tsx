/**
 * ColorLearnScreen — Color learning game with tap-to-hear pronunciation
 * 
 * Demo content: 6 basic colors with CSS colors
 * Interaction: Tap color → hear pronunciation → visual feedback
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClayCard } from '../../components/ClayCard';
import { ClayButton } from '../../components/ClayButton';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, BRAND } from '../../design/tokens';

interface ColorItem {
  id: string;
  name: string;
  nameVi: string;
  hex: string;
  tapped: boolean;
}

const DEMO_COLORS: Omit<ColorItem, 'tapped'>[] = [
  { id: '1', name: 'Red', nameVi: 'Đỏ', hex: '#EF4444' },
  { id: '2', name: 'Blue', nameVi: 'Xanh dương', hex: '#3B82F6' },
  { id: '3', name: 'Green', nameVi: 'Xanh lá', hex: '#22C55E' },
  { id: '4', name: 'Yellow', nameVi: 'Vàng', hex: '#EAB308' },
  { id: '5', name: 'Orange', nameVi: 'Cam', hex: '#F97316' },
  { id: '6', name: 'Purple', nameVi: 'Tím', hex: '#A855F7' },
];

type GameState = 'READY' | 'PLAYING' | 'SUCCESS';

export const ColorLearnScreen: React.FC = () => {
  const navigation = useNavigation();
  const [gameState, setGameState] = useState<GameState>('READY');
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [scaleAnims] = useState(
    DEMO_COLORS.reduce((acc, color) => {
      acc[color.id] = new Animated.Value(1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  const handleStart = () => {
    setGameState('PLAYING');
    setColors(DEMO_COLORS.map(c => ({ ...c, tapped: false })));
    setSelectedColor(null);
  };

  const handleColorPress = (color: ColorItem) => {
    // Mark as tapped
    setColors(prev =>
      prev.map(c => (c.id === color.id ? { ...c, tapped: true } : c))
    );
    setSelectedColor(color.id);

    // Animate
    const anim = scaleAnims[color.id];
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    // Play pronunciation (simulated with timeout)
    // In real app: AudioService.playPronunciation(color.name, 'en')
    
    // Check if all colors tapped
    const allTapped = colors.filter(c => c.id !== color.id).every(c => c.tapped) && colors.length > 0;
    if (allTapped) {
      setTimeout(() => setGameState('SUCCESS'), 800);
    }
  };

  const handlePlayAgain = () => {
    setGameState('READY');
  };

  const handleExit = () => {
    navigation.goBack();
  };

  // READY State
  if (gameState === 'READY') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ClayCard variant="lg" color="blue" style={styles.instructionCard}>
            <Text style={styles.title}>🎨 Color Learn</Text>
            <Text style={styles.instruction}>
              Tap each color to learn its name! Listen to the pronunciation.
            </Text>
            <Text style={styles.instructionDetail}>
              • {DEMO_COLORS.length} colors to learn{'\n'}
              • Tap to hear the color name{'\n'}
              • Tap all colors to complete!
            </Text>
            <ClayButton
              color="green"
              style={styles.startButton}
              onPress={handleStart}
            >
              Start Learning
            </ClayButton>
          </ClayCard>

          <ClayButton
            color="yellow"
            style={styles.backButton}
            onPress={handleExit}
          >
            Back to Games
          </ClayButton>
        </ScrollView>
      </View>
    );
  }

  // SUCCESS State
  if (gameState === 'SUCCESS') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ClayCard variant="lg" color="green" style={styles.successCard}>
            <Text style={styles.successEmoji}>🌈</Text>
            <Text style={styles.successTitle}>Great Job!</Text>
            <Text style={styles.successMessage}>
              You learned all {DEMO_COLORS.length} colors!
            </Text>
            
            <ClayButton
              color="blue"
              style={styles.actionButton}
              onPress={handlePlayAgain}
            >
              Learn Again
            </ClayButton>
            <ClayButton
              color="yellow"
              style={styles.actionButton}
              onPress={handleExit}
            >
              Back to Games
            </ClayButton>
          </ClayCard>
        </ScrollView>
      </View>
    );
  }

  // PLAYING State
  const tappedCount = colors.filter(c => c.tapped).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Color Learn</Text>
        <View style={[styles.progressBadge, { backgroundColor: BRAND.mintGreen }]}>
          <Text style={styles.progressText}>
            ✓ {tappedCount}/{DEMO_COLORS.length} colors
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.playingContent}>
        <ClayCard variant="sm" color="white" style={styles.hintCard}>
          <Text style={styles.hintText}>
            👆 Tap each color to hear its name!
          </Text>
        </ClayCard>

        <View style={styles.colorGrid}>
          {colors.map(color => (
            <TouchableOpacity
              key={color.id}
              onPress={() => handleColorPress(color)}
              activeOpacity={0.8}
              style={styles.colorCardContainer}
            >
              <Animated.View
                style={[
                  styles.colorCard,
                  { transform: [{ scale: scaleAnims[color.id] }] },
                ]}
              >
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color.hex },
                    color.tapped && styles.colorSwatchTapped,
                  ]}
                >
                  {color.tapped && (
                    <View style={styles.checkmarkBadge}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                  {selectedColor === color.id && (
                    <View style={styles.speakerBadge}>
                      <Text style={styles.speaker}>🔊</Text>
                    </View>
                  )}
                </View>
                <View style={styles.colorInfo}>
                  <Text style={styles.colorNameEn}>{color.name}</Text>
                  <Text style={styles.colorNameVi}>{color.nameVi}</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        <ClayButton
          color="yellow"
          style={styles.exitButton}
          onPress={handleExit}
        >
          Exit Game
        </ClayButton>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: 80,
  },
  playingContent: {
    padding: SPACING.md,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  progressBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  progressText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: '#FFF',
  },
  instructionCard: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  instruction: {
    fontSize: FONT.sizes.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  instructionDetail: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  startButton: {
    marginTop: SPACING.md,
  },
  backButton: {
    marginTop: SPACING.sm,
  },
  successCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  successTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  successMessage: {
    fontSize: FONT.sizes.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: SPACING.sm,
    width: '100%',
  },
  hintCard: {
    marginBottom: SPACING.md,
  },
  hintText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: BRAND.skyBlue,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  colorCardContainer: {
    width: '45%',
  },
  colorCard: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    ...SHADOWS.clayMd,
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  colorSwatch: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  colorSwatchTapped: {
    opacity: 0.9,
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.claySm,
  },
  checkmark: {
    fontSize: 20,
    color: BRAND.mintGreen,
    fontWeight: '800',
  },
  speakerBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: SPACING.sm,
  },
  speaker: {
    fontSize: 32,
  },
  colorInfo: {
    alignItems: 'center',
  },
  colorNameEn: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  colorNameVi: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  exitButton: {
    marginTop: SPACING.lg,
  },
});

export default ColorLearnScreen;
