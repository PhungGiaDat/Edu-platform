import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayProgressBar } from './ClayProgressBar';
import { ClayButton } from './ClayButton';
import { COLORS, SPACING } from '../design/tokens';

export type LoadingState = 'initializing' | 'loading_model' | 'error' | 'cached';
export type LoadingStage = 'download' | 'load' | 'instantiate';

export interface ARLoadingOverlayProps {
  state: LoadingState;
  progress?: number; // 0.0 – 1.0
  stage?: LoadingStage;
  modelName?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const STATE_LABELS: Record<LoadingState, { title: string; icon: string }> = {
  initializing: { title: 'Preparing AR...', icon: '✨' },
  loading_model: { title: 'Loading Model...', icon: '📦' },
  error: { title: 'Oops!', icon: '😢' },
  cached: { title: 'Ready!', icon: '🎉' },
};

const STAGE_LABELS: Record<LoadingStage, string> = {
  download: 'Downloading...',
  load: 'Loading model...',
  instantiate: 'Placing in scene...',
};

/**
 * Full-screen claymorphic overlay shown during AR initialization and model loading.
 * Hybrid approach: RN shows immediately, Unity shows subtle in-scene progress.
 */
export const ARLoadingOverlay: React.FC<ARLoadingOverlayProps> = ({
  state,
  progress = 0,
  stage,
  modelName,
  errorMessage = 'Something went wrong. Please try again.',
  onRetry,
  onDismiss,
}) => {
  const { title, icon } = STATE_LABELS[state];
  const showProgress = state === 'loading_model';
  const showRetry = state === 'error';
  const showDismiss = state === 'cached';

  const handleDismiss = () => {
    onDismiss?.();
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <ClayCard variant="lg" color="white" padding={32} style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>

          {modelName && (
            <Text style={styles.modelName}>{modelName}</Text>
          )}

          {showProgress && (
            <View style={styles.progressSection}>
              {stage && (
                <Text style={styles.stageLabel}>
                  {STAGE_LABELS[stage]}
                </Text>
              )}
              <ClayProgressBar
                progress={progress}
                fillColor={COLORS.primary}
                height={14}
                showShimmer
              />
              <Text style={styles.progressLabel}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          )}

          {state === 'initializing' && (
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}

          {showRetry && (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <ClayButton
                color="coral"
                variant="md"
                onPress={onRetry ?? (() => {})}
                style={styles.retryButton}
              >
                Try Again
              </ClayButton>
            </View>
          )}

          {showDismiss && (
            <View style={styles.dismissSection}>
              <ClayButton
                color="green"
                variant="md"
                onPress={handleDismiss}
                style={styles.dismissButton}
              >
                Let's Go!
              </ClayButton>
            </View>
          )}
        </ClayCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modelName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  progressSection: {
    width: '100%',
    marginTop: SPACING.md,
  },
  stageLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  spinnerContainer: {
    marginTop: SPACING.lg,
  },
  errorSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    width: '100%',
  },
  dismissSection: {
    width: '100%',
    marginTop: SPACING.md,
  },
  dismissButton: {
    width: '100%',
  },
});
