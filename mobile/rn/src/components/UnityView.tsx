/**
 * UnityView — renders the Unity AR camera view via native module.
 *
 * Android: Unity runs in `RNUnityPlayerActivity` (same-package Activity).
 * The UnityView shows an AR-active indicator since the camera lives in the
 * separate Activity. On real devices the camera IS visible through the Activity.
 *
 * iOS: Unity runs as an embedded framework via UnityViewManager (native UIView).
 * The native component hosts the Unity CADisplayLink-driven rendering view as
 * a subview of the React Native view hierarchy.
 *
 * Fallback: When native module is unavailable (development), shows a
 * claymorphic placeholder.
 */
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { ClayCard } from './ClayCard';
import { COLORS } from '../design/tokens';

// ─── Platform detection ───────────────────────────────────────────────────────

const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios';

// ─── iOS: lazily-loaded native UnityView component ────────────────────────────

type NativeUnityViewProps = {
  style?: ViewStyle;
  onUnityReady?: () => void;
  onUnityError?: (event: { nativeEvent: { message: string } }) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNativeUnityView(): React.ComponentType<NativeUnityViewProps> | null {
  if (!isIOS) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const req = require('react-native') as any;
    return req.requireNativeComponent('UnityViewNative') as React.ComponentType<NativeUnityViewProps>;
  } catch {
    return null;
  }
}

const NativeUnityView = getNativeUnityView();

// ─── Placeholder (development / fallback) ─────────────────────────────────────

function UnityPlaceholder({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.placeholderRoot, style]}>
      <ClayCard variant="lg" color="white" padding={40} style={styles.placeholderCard}>
        <Text style={styles.placeholderIcon}>🎮</Text>
        <Text style={styles.placeholderTitle}>Unity AR View</Text>
        <Text style={styles.placeholderSubtitle}>
          {isAndroid
            ? 'AR camera will appear here on device'
            : 'Unity view will appear here on iOS device'}
        </Text>
      </ClayCard>
    </View>
  );
}

// ─── AR Active indicator (Android — AR camera is in the separate Activity) ────

function AndroidARActiveIndicator() {
  return (
    <View style={styles.androidIndicator}>
      <View style={styles.androidIndicatorDot} />
      <Text style={styles.androidIndicatorText}>AR Camera Active</Text>
    </View>
  );
}

// ─── UnityView Props ──────────────────────────────────────────────────────────

export interface UnityViewProps {
  onModelLoaded?: () => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const UnityView: React.FC<UnityViewProps> = ({
  onModelLoaded,
  onError,
  style,
}) => {
  // ── iOS: native Unity view ────────────────────────────────────────────────
  if (isIOS && NativeUnityView) {
    return (
      <NativeUnityView
        style={style}
        onUnityReady={onModelLoaded}
        onUnityError={(e) => onError?.(e.nativeEvent.message)}
      />
    );
  }

  // ── Android: native available — show AR-active indicator ─────────────────
  if (isAndroid) {
    // On Android, the Unity AR Activity renders on top.
    // This view container fills the space; the AR camera shows through it.
    return (
      <View style={[styles.root, styles.androidRoot, style]}>
        <AndroidARActiveIndicator />
      </View>
    );
  }

  // ── Development fallback ────────────────────────────────────────────────────
  return <UnityPlaceholder style={style} />;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  androidRoot: {
    backgroundColor: '#000',
  },
  placeholderRoot: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderCard: {
    alignItems: 'center',
    maxWidth: 300,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  androidIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  androidIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  androidIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UnityView;
