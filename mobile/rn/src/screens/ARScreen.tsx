import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { ClayProgressBar } from '../components/ClayProgressBar';
import { UnityView } from '../components/UnityView';
import { ARLoadingOverlay } from '../components/ARLoadingOverlay';
import { ComboOverlay } from '../components/ComboOverlay';
import { PetStatusOverlay } from '../components/PetStatusOverlay';
import { useARSession } from '../hooks/useARSession';
import { mapToUnityPayload } from '../bridge/ARExperienceMapper';
import { flashcardApi } from '../services/api';
import { COLORS, SPACING } from '../design/tokens';

type RootStackParamList = {
  Home: undefined;
  AR: { lessonId: string; lessonTitle: string };
};

interface ARScreenProps {
  navigation: { goBack: () => void };
  route: { params: { lessonId: string; lessonTitle: string } };
}

/**
 * ARScreen — full image-tracking AR experience with claymorphic UI.
 * Implements the complete state machine: IDLE → AR_INITIALIZING → IMAGE_TRACKING_READY
 * → IMAGE_DETECTED → MODEL_SPAWNING → MODEL_LOADED → AR_INTERACTING
 */
export const ARScreen: React.FC<ARScreenProps> = ({ navigation, route }) => {
  const { lessonId, lessonTitle } = route.params;
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const {
    arState,
    canCombo,
    progress,
    progressStage,
    error,
    petState,
    currentStreak,
    startSession,
    stopSession,
    triggerCombo,
    retry,
  } = useARSession();

  const loadLesson = useCallback(async () => {
    setIsLoadingLesson(true);
    setLessonError(null);

    try {
      const response = await flashcardApi.getFlashcard(lessonId);
      const payload = mapToUnityPayload(response.data);
      startSession(lessonId, payload);
    } catch (err) {
      setLessonError('Failed to load AR lesson');
      console.error('AR lesson load error:', err);
    } finally {
      setIsLoadingLesson(false);
    }
  }, [lessonId, startSession]);

  useEffect(() => {
    loadLesson();
    return () => {
      stopSession();
    };
  }, [loadLesson, stopSession]);

  const handleExit = useCallback(() => {
    stopSession();
    navigation.goBack();
  }, [stopSession, navigation]);

  const handleRetry = useCallback(() => {
    retry();
    loadLesson();
  }, [retry, loadLesson]);

  const showLoadingOverlay =
    arState === 'AR_INITIALIZING' ||
    arState === 'IMAGE_DETECTED' ||
    arState === 'MODEL_SPAWNING';

  const showErrorOverlay = arState === 'AR_ERROR';
  const showComboOverlay = arState === 'AR_INTERACTING' && canCombo;
  const showPetOverlay = arState === 'AR_INTERACTING';
  const showTrackingHint = arState === 'IMAGE_TRACKING_READY';

  return (
    <View style={styles.container}>
      {/* Unity camera view */}
      <UnityView style={styles.unityView} />

      {/* Claymorphic loading overlay */}
      {showLoadingOverlay && (
        <ARLoadingOverlay
          state={arState === 'AR_INITIALIZING' ? 'initializing' : 'loading_model'}
          progress={progress}
          stage={progressStage ?? 'load'}
          modelName={lessonTitle}
        />
      )}

      {/* Claymorphic error overlay */}
      {showErrorOverlay && (
        <ARLoadingOverlay
          state="error"
          errorMessage={error ?? 'AR session failed. Please try again.'}
          onRetry={handleRetry}
        />
      )}

      {/* Lesson loading spinner */}
      {isLoadingLesson && (
        <View style={styles.lessonLoading}>
          <ClayCard variant="md" color="white" padding={24}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading lesson...</Text>
          </ClayCard>
        </View>
      )}

      {/* Tracking hint */}
      {showTrackingHint && (
        <View style={styles.hintContainer}>
          <ClayCard variant="sm" color="blue" padding={16}>
            <Text style={styles.hintEmoji}>📷</Text>
            <Text style={styles.hintText}>Point camera at flashcard</Text>
          </ClayCard>
        </View>
      )}

      {/* Combo UI */}
      {showComboOverlay && (
        <ComboOverlay
          onComboTrigger={triggerCombo}
        />
      )}

      {/* Pet status */}
      {showPetOverlay && (
        <PetStatusOverlay
          petState={petState}
          currentStreak={currentStreak}
        />
      )}

      {/* Exit button — always visible */}
      <TouchableOpacity
        style={styles.exitButton}
        onPress={handleExit}
        activeOpacity={0.7}
      >
        <ClayCard variant="sm" color="white" padding={8}>
          <Text style={styles.exitIcon}>✕</Text>
        </ClayCard>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  unityView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lessonLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  hintContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintEmoji: {
    fontSize: 32,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  exitIcon: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
});
