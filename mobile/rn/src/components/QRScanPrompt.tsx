import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QRScanPromptProps {
  isScanning?: boolean;
}

/**
 * QRScanPrompt - Shows prompt when camera is scanning for AR flashcards
 * 
 * Phase 1: Static placeholder
 * Phase 2: Animated scan frame synced with camera feed
 */
export const QRScanPrompt: React.FC<QRScanPromptProps> = ({
  isScanning = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.scanFrame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
      
      <Text style={styles.promptText}>
        {isScanning ? 'Scanning...' : 'Point camera at flashcard'}
      </Text>
      
      <Text style={styles.subText}>
        Position the QR code within the frame
      </Text>
    </View>
  );
};

const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#007AFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  promptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
