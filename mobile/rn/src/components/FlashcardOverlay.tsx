import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface FlashcardOverlayProps {
  word: string;
  translation: string;
  audioUrl?: string;
}

/**
 * FlashcardOverlay - Displays AR flashcard information overlay
 * 
 * Phase 1: Static placeholder with demo data
 * Phase 2: Will be rendered on top of Unity AR view
 */
export const FlashcardOverlay: React.FC<FlashcardOverlayProps> = ({
  word,
  translation,
  audioUrl,
}) => {
  const handlePlayAudio = () => {
    if (audioUrl) {
      console.log('Playing audio:', audioUrl);
      // Audio playback will be implemented in Phase 2
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.word}>{word}</Text>
        <Text style={styles.translation}>{translation}</Text>
        
        {audioUrl && (
          <View style={styles.audioContainer}>
            <Text style={styles.audioButton} onPress={handlePlayAudio}>
              🔊 Play Audio
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  word: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  translation: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  audioContainer: {
    alignItems: 'center',
  },
  audioButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
