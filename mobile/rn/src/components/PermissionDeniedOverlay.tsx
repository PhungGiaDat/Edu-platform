/**
 * PermissionDeniedOverlay — M4: Permission & AR Readiness UX
 *
 * Shown when Unity AR subsystem reports CAMERA_PERMISSION_DENIED or
 * AR_CAPABILITY_UNSUPPORTED. Provides a kid-friendly explanation and a
 * Settings button to open the OS permissions panel.
 *
 * Claymorphic design: soft surfaces, vibrant accent colors, large touch targets.
 */
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { COLORS, SPACING, BRAND } from '../design/tokens';

export type PermissionErrorCode = 'CAMERA_PERMISSION_DENIED' | 'AR_CAPABILITY_UNSUPPORTED';

export interface PermissionDeniedOverlayProps {
  errorCode: PermissionErrorCode;
  onOpenSettings?: () => void;
  onUseWebAR?: () => void;
  showWebARFallback?: boolean;
}

const CONFIG: Record<PermissionErrorCode, {
  emoji: string;
  title: string;
  message: string;
  primaryAction: string;
  primaryColor: typeof BRAND.bubblePink | typeof BRAND.skyBlue | typeof BRAND.sunshineYellow;
}> = {
  CAMERA_PERMISSION_DENIED: {
    emoji: '📷',
    title: 'Camera Access Needed!',
    message: 'To see flashcards come alive,\nwe need to use your camera.',
    primaryAction: 'Open Settings',
    primaryColor: BRAND.bubblePink,
  },
  AR_CAPABILITY_UNSUPPORTED: {
    emoji: '🤖',
    title: 'AR Not Available',
    message: 'Your device doesn\'t support AR yet.\nTry Web AR instead!',
    primaryAction: 'Try Web AR',
    primaryColor: BRAND.skyBlue,
  },
};

/**
 * Opens the app's OS-level settings panel (iOS Settings app or Android
 * app details screen). Falls back to no-op if Linking fails.
 */
export function openAppSettings(): void {
  Linking.openSettings().catch(() => {
    console.warn('[PermissionDeniedOverlay] Linking.openSettings failed');
  });
}

/**
 * Full-screen claymorphic overlay for permission / capability errors.
 */
export const PermissionDeniedOverlay: React.FC<PermissionDeniedOverlayProps> = ({
  errorCode,
  onOpenSettings,
  onUseWebAR,
  showWebARFallback = false,
}) => {
  const config = CONFIG[errorCode] ?? CONFIG['CAMERA_PERMISSION_DENIED'];

  const handlePrimary = () => {
    if (errorCode === 'CAMERA_PERMISSION_DENIED') {
      onOpenSettings?.();
      openAppSettings();
    } else {
      onUseWebAR?.();
    }
  };

  return (
    <View style={styles.backdrop}>
      <ClayCard variant="xl" color="white" padding={36} style={styles.card}>
        {/* Emoji hero */}
        <Text style={styles.emoji}>{config.emoji}</Text>

        {/* Title */}
        <Text style={styles.title}>{config.title}</Text>

        {/* Message */}
        <Text style={styles.message}>{config.message}</Text>

        {/* Primary action button */}
        <View style={styles.primaryButtonContainer}>
          <ClayButton
            color={config.primaryColor === BRAND.sunshineYellow ? 'yellow' :
                   config.primaryColor === BRAND.skyBlue ? 'blue' : 'pink'}
            variant="lg"
            onPress={handlePrimary}
            style={styles.primaryButton}
          >
            {config.primaryAction}
          </ClayButton>
        </View>

        {/* Web AR fallback button */}
        {showWebARFallback && (
          <View style={styles.secondaryButtonContainer}>
            <ClayButton
              color="green"
              variant="md"
              onPress={onUseWebAR ?? (() => {})}
              style={styles.secondaryButton}
            >
              Try Web AR Instead
            </ClayButton>
          </View>
        )}

        {/* Dismiss hint */}
        <Text style={styles.dismissHint}>Tap back to return</Text>
      </ClayCard>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  primaryButtonContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButtonContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  secondaryButton: {
    width: '100%',
  },
  dismissHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default PermissionDeniedOverlay;
