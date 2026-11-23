/**
 * MemoryPairsScreen — Memory card matching game with Claymorphic design
 * 
 * Demo content: 8 cards (4 pairs) with emojis
 * Interaction: Tap to flip, match pairs, complete all matches to win
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

interface Card {
  id: string;
  pairId: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const DEMO_EMOJIS = ['🍎', '📚', '☀️', '🌳'];

type GameState = 'READY' | 'PLAYING' | 'SUCCESS';

export const MemoryPairsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [gameState, setGameState] = useState<GameState>('READY');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [canFlip, setCanFlip] = useState(true);

  const initializeCards = () => {
    const pairs = DEMO_EMOJIS.flatMap((emoji, index) => [
      { id: `${index}-a`, pairId: `pair-${index}`, emoji, isFlipped: false, isMatched: false },
      { id: `${index}-b`, pairId: `pair-${index}`, emoji, isFlipped: false, isMatched: false },
    ]);
    
    // Shuffle
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
  };

  const handleStart = () => {
    setGameState('PLAYING');
    initializeCards();
    setFlippedCards([]);
    setMatchedCount(0);
    setMoves(0);
    setCanFlip(true);
  };

  const handleCardPress = (card: Card) => {
    if (!canFlip || card.isFlipped || card.isMatched || flippedCards.length >= 2) {
      return;
    }

    // Flip card
    const updatedCards = cards.map(c =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);

    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    // Check for match when 2 cards flipped
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setCanFlip(false);

      const [first, second] = newFlipped;

      if (first.pairId === second.pairId) {
        // Match found!
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.pairId === first.pairId ? { ...c, isMatched: true } : c
            )
          );
          setMatchedCount(prev => prev + 1);
          setFlippedCards([]);
          setCanFlip(true);

          // Check if all matched
          if (matchedCount + 1 === DEMO_EMOJIS.length) {
            setTimeout(() => setGameState('SUCCESS'), 600);
          }
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === first.id || c.id === second.id
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
          setCanFlip(true);
        }, 1000);
      }
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
            <Text style={styles.title}>🧠 Memory Pairs</Text>
            <Text style={styles.instruction}>
              Flip cards to find matching pairs! Remember where each emoji is.
            </Text>
            <Text style={styles.instructionDetail}>
              • {DEMO_EMOJIS.length * 2} cards to match{'\n'}
              • Tap to flip cards{'\n'}
              • Match all pairs to win!
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
            <Text style={styles.successTitle}>Perfect Memory!</Text>
            <Text style={styles.successMessage}>
              You matched all {DEMO_EMOJIS.length} pairs!
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{matchedCount}</Text>
                <Text style={styles.statLabel}>Pairs</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{moves}</Text>
                <Text style={styles.statLabel}>Moves</Text>
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
        <Text style={styles.headerTitle}>Memory Pairs</Text>
        <View style={styles.progressRow}>
          <View style={[styles.progressBadge, { backgroundColor: BRAND.mintGreen }]}>
            <Text style={styles.progressText}>✓ {matchedCount}/{DEMO_EMOJIS.length}</Text>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: BRAND.skyBlue }]}>
            <Text style={styles.progressText}>🎯 {moves} moves</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.playingContent}>
        <ClayCard variant="sm" color="white" style={styles.hintCard}>
          <Text style={styles.hintText}>
            👆 Tap cards to flip and find matching pairs!
          </Text>
        </ClayCard>

        <View style={styles.grid}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.id}
              onPress={() => handleCardPress(card)}
              disabled={!canFlip || card.isFlipped || card.isMatched}
              activeOpacity={0.8}
              style={styles.cardContainer}
            >
              <View
                style={[
                  styles.card,
                  card.isFlipped && styles.cardFlipped,
                  card.isMatched && styles.cardMatched,
                ]}
              >
                {card.isFlipped || card.isMatched ? (
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                ) : (
                  <Text style={styles.cardBack}>❓</Text>
                )}
                {card.isMatched && (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchCheck}>✓</Text>
                  </View>
                )}
              </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  cardContainer: {
    width: '22%',
    aspectRatio: 1,
  },
  card: {
    flex: 1,
    backgroundColor: BRAND.skyBlue,
    borderRadius: RADIUS.lg,
    borderWidth: 3,
    borderColor: '#93C5FD',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.claySm,
  },
  cardFlipped: {
    backgroundColor: '#FFF',
    borderColor: BRAND.skyBlue,
  },
  cardMatched: {
    backgroundColor: '#F0FDF4',
    borderColor: BRAND.mintGreen,
    opacity: 0.8,
  },
  cardBack: {
    fontSize: 32,
  },
  cardEmoji: {
    fontSize: 40,
  },
  matchBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: BRAND.mintGreen,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  matchCheck: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '800',
  },
  exitButton: {
    marginTop: SPACING.lg,
  },
});

export default MemoryPairsScreen;
