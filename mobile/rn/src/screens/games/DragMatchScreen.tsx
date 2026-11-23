/**
 * DragMatchScreen — Word-to-definition matching game with Claymorphic design
 * 
 * Demo content: 5 English-Vietnamese word pairs
 * Interaction: Tap word → Tap target → Match validated
 */

import React, { useState, useEffect } from 'react';
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

interface WordPair {
  id: string;
  word: string;
  emoji: string;
  definition: string;
}

const DEMO_PAIRS: WordPair[] = [
  { id: '1', word: 'Apple', emoji: '🍎', definition: 'Táo' },
  { id: '2', word: 'Book', emoji: '📚', definition: 'Sách' },
  { id: '3', word: 'Sun', emoji: '☀️', definition: 'Mặt trời' },
  { id: '4', word: 'Tree', emoji: '🌳', definition: 'Cây' },
  { id: '5', word: 'Water', emoji: '💧', definition: 'Nước' },
];

type GameState = 'READY' | 'PLAYING' | 'SUCCESS';

export const DragMatchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [gameState, setGameState] = useState<GameState>('READY');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Shuffle definitions
  const [shuffledDefs, setShuffledDefs] = useState<WordPair[]>([]);
  
  useEffect(() => {
    setShuffledDefs([...DEMO_PAIRS].sort(() => Math.random() - 0.5));
  }, []);

  const handleStart = () => {
    setGameState('PLAYING');
    setMatchedPairs([]);
    setIncorrectAttempts(0);
    setSelectedWord(null);
    setShuffledDefs([...DEMO_PAIRS].sort(() => Math.random() - 0.5));
  };

  const handleWordPress = (id: string) => {
    if (matchedPairs.includes(id)) return;
    
    if (selectedWord === id) {
      setSelectedWord(null); // Deselect
    } else {
      setSelectedWord(id);
      // Haptic feedback animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleDefinitionPress = (defId: string) => {
    if (!selectedWord || matchedPairs.includes(defId)) return;

    if (selectedWord === defId) {
      // Correct match!
      setMatchedPairs(prev => [...prev, defId]);
      setSelectedWord(null);
      
      // Success animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();

      // Check if all matched
      if (matchedPairs.length + 1 === DEMO_PAIRS.length) {
        setTimeout(() => setGameState('SUCCESS'), 600);
      }
    } else {
      // Incorrect match
      setIncorrectAttempts(prev => prev + 1);
      setSelectedWord(null);
      
      // Error shake animation
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
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
            <Text style={styles.title}>🎯 Drag & Match</Text>
            <Text style={styles.instruction}>
              Tap an English word, then tap its Vietnamese meaning to make a match!
            </Text>
            <Text style={styles.instructionDetail}>
              • {DEMO_PAIRS.length} word pairs to match{'\n'}
              • Tap to select, tap again to match{'\n'}
              • Complete all matches to win!
            </Text>
            <ClayButton
              color="green"
              style={styles.startButton}
              onPress={handleStart}
            >
              Start Game
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
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Amazing!</Text>
            <Text style={styles.successMessage}>
              You matched all {DEMO_PAIRS.length} pairs!
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{matchedPairs.length}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{incorrectAttempts}</Text>
                <Text style={styles.statLabel}>Tries</Text>
              </View>
            </View>
            
            <ClayButton
              color="blue"
              style={styles.actionButton}
              onPress={handlePlayAgain}
            >
              Play Again
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drag & Match</Text>
        <View style={styles.progressRow}>
          <View style={[styles.progressBadge, { backgroundColor: BRAND.mintGreen }]}>
            <Text style={styles.progressText}>✓ {matchedPairs.length}/{DEMO_PAIRS.length}</Text>
          </View>
          {incorrectAttempts > 0 && (
            <View style={[styles.progressBadge, { backgroundColor: BRAND.coralPink }]}>
              <Text style={styles.progressText}>✗ {incorrectAttempts}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.playingContent}>
        {/* Instructions */}
        <ClayCard variant="sm" color="white" style={styles.hintCard}>
          <Text style={styles.hintText}>
            {selectedWord 
              ? '👆 Now tap the matching definition!' 
              : '👇 Tap an English word to start'}
          </Text>
        </ClayCard>

        {/* Word Column */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>English Words</Text>
          {DEMO_PAIRS.map(pair => {
            const isMatched = matchedPairs.includes(pair.id);
            const isSelected = selectedWord === pair.id;

            return (
              <TouchableOpacity
                key={pair.id}
                onPress={() => handleWordPress(pair.id)}
                disabled={isMatched}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.wordCard,
                    isMatched && styles.wordCardMatched,
                    isSelected && styles.wordCardSelected,
                    isSelected && { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <Text style={styles.emoji}>{pair.emoji}</Text>
                  <Text style={[styles.wordText, isMatched && styles.wordTextMatched]}>
                    {pair.word}
                  </Text>
                  {isMatched && <Text style={styles.checkMark}>✓</Text>}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Definition Column */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Vietnamese</Text>
          {shuffledDefs.map(pair => {
            const isMatched = matchedPairs.includes(pair.id);
            const canSelect = selectedWord !== null && !isMatched;

            return (
              <TouchableOpacity
                key={pair.id}
                onPress={() => handleDefinitionPress(pair.id)}
                disabled={!canSelect}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.defCard,
                    isMatched && styles.defCardMatched,
                    canSelect && styles.defCardActive,
                  ]}
                >
                  <Text style={[styles.defText, isMatched && styles.defTextMatched]}>
                    {pair.definition}
                  </Text>
                  {isMatched && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
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
  progressRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  progressBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
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
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: BRAND.skyBlue,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.claySm,
  },
  statValue: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: '#FFF',
    marginTop: SPACING.xs,
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
  column: {
    marginBottom: SPACING.lg,
  },
  columnTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: BRAND.skyBlue,
    ...SHADOWS.claySm,
  },
  wordCardSelected: {
    borderColor: BRAND.mintGreen,
    backgroundColor: '#F0FDF4',
  },
  wordCardMatched: {
    borderColor: BRAND.coralPink,
    backgroundColor: '#FFF1F2',
    opacity: 0.7,
  },
  emoji: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  wordText: {
    flex: 1,
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  wordTextMatched: {
    color: COLORS.textMuted,
  },
  checkMark: {
    fontSize: 24,
    color: BRAND.mintGreen,
  },
  defCard: {
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    ...SHADOWS.claySm,
  },
  defCardActive: {
    borderColor: BRAND.coralPink,
    backgroundColor: '#FEF3C7',
  },
  defCardMatched: {
    borderColor: BRAND.mintGreen,
    backgroundColor: '#F0FDF4',
    opacity: 0.7,
  },
  defText: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  defTextMatched: {
    color: COLORS.textMuted,
  },
  exitButton: {
    marginTop: SPACING.md,
  },
});

export default DragMatchScreen;
