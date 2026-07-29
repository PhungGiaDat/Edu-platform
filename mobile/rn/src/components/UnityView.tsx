import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../design/tokens';
import type { ARMessage } from '../bridge/arMessages';

interface UnityViewProps {
  onUnityEvent?: (event: ARMessage) => void;
  onModelLoaded?: () => void;
  onError?: (error: string) => void;
  style?: object;
}

/**
 * UnityView — renders the Unity AR camera view via native module.
 * Phase 2: Full integration with Unity bridge. Falls back to placeholder in development.
 */
export const UnityView: React.FC<UnityViewProps> = ({
  onUnityEvent,
  onModelLoaded,
  onError,
  style,
}) => {
  const isAvailable = false; // Phase 2: Check unityBridge.checkAvailability()

  if (!isAvailable) {
    // Development fallback: placeholder with claymorphic styling
    return (
      <View style={[styles.container, styles.fallback, style]}>
        <View style={styles.placeholder}>
          <Text style={styles.icon}>🎮</Text>
          <Text style={styles.text}>Unity AR View</Text>
          <Text style={styles.subtext}>
            AR camera view will appear here
          </Text>
        </View>
      </View>
    );
  }

  // Phase 2 full implementation: render native Unity view
  // const { UnityViewNative } = require('./UnityViewNative');
  return (
    <View style={[styles.container, styles.fullscreen, style]}>
      {/* Native Unity view rendered here */}
      {/* Wire up events: onUnityEvent, onModelLoaded, onError */}
      <View style={styles.nativeOverlay}>
        <Text style={styles.nativeText}>AR Camera Active</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullscreen: {
    backgroundColor: '#000',
  },
  fallback: {
    backgroundColor: COLORS.backgroundBase,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  nativeOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nativeText: {
    color: '#fff',
    fontSize: 12,
  },
});
