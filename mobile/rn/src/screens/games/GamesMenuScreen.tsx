/**
 * GamesMenuScreen — Entry point for all educational games
 * 
 * Lists available games with Claymorphic cards
 * Independent navigation from lesson flow
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClayCard } from '../../components/ClayCard';
import { LexiFloatingButton } from '../../components/LexiFloatingButton';
import { LexiQuickActionSheet } from '../../components/LexiQuickActionSheet';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, BRAND } from '../../design/tokens';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GameItem {
  id: string;
  title: string;
  emoji: string;
  description: string;
  screen: keyof RootStackParamList;
  color: 'blue' | 'green' | 'yellow' | 'coral';
}

const GAMES: GameItem[] = [
  {
    id: 'drag-match',
    title: 'Drag & Match',
    emoji: '🎯',
    description: 'Match English words with Vietnamese meanings',
    screen: 'DragMatch',
    color: 'blue',
  },
  {
    id: 'memory-pairs',
    title: 'Memory Pairs',
    emoji: '🧠',
    description: 'Find matching emoji pairs by memory',
    screen: 'MemoryPairs',
    color: 'green',
  },
  {
    id: 'color-learn',
    title: 'Color Learn',
    emoji: '🎨',
    description: 'Learn color names with pronunciation',
    screen: 'ColorLearn',
    color: 'yellow',
  },
];

export const GamesMenuScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [lexiVisible, setLexiVisible] = useState(false);

  const handleGamePress = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen as any);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trò chơi học tiếng Anh</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ClayCard variant="sm" color="white" style={styles.introCard}>
          <Text style={styles.introText}>
            🎮 Chơi game luyện tiếng Anh cực vui!
          </Text>
        </ClayCard>

        {GAMES.map(game => (
          <TouchableOpacity
            key={game.id}
            onPress={() => handleGamePress(game.screen)}
            activeOpacity={0.8}
          >
            <ClayCard variant="lg" color={game.color} style={styles.gameCard}>
              <View style={styles.gameCardContent}>
                <Text style={styles.gameEmoji}>{game.emoji}</Text>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle}>{game.title}</Text>
                  <Text style={styles.gameDescription}>{game.description}</Text>
                </View>
                <Text style={styles.gameArrow}>→</Text>
              </View>
            </ClayCard>
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nhiều game mới đang đến!</Text>
        </View>
      </ScrollView>

      <LexiFloatingButton onPress={() => setLexiVisible(true)} />
      <LexiQuickActionSheet
        visible={lexiVisible}
        onDismiss={() => setLexiVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
    ...SHADOWS.claySm,
  },
  backIcon: {
    fontSize: 24,
    color: BRAND.skyBlue,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  introCard: {
    marginBottom: SPACING.lg,
  },
  introText: {
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: BRAND.skyBlue,
    textAlign: 'center',
  },
  gameCard: {
    marginBottom: SPACING.md,
  },
  gameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameEmoji: {
    fontSize: 48,
    marginRight: SPACING.md,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  gameDescription: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  gameArrow: {
    fontSize: 28,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  footer: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});

export default GamesMenuScreen;
