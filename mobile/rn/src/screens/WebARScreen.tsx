/**
 * WebARScreen.tsx — M9: WebAR Fallback với WebView Bridge
 *
 * Sử dụng WebView để load ar-viewer.html từ frontend
 * Bridge qua postMessage để xử lý AR events
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { useWebARSession, type WebARPhase } from '../hooks/useWebARSession';
import { BRAND, COLORS, SPACING, FONT, RADIUS, withOpacity } from '../design/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

type RootStackParamList = {
  WebAR: { lessonId?: string; lessonTitle?: string; catalogId?: string };
  AR: { lessonId: string; lessonTitle: string };
};

interface WebARMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// ─── AR Status Overlay ────────────────────────────────────────────────────────

interface ARStatusOverlayProps {
  phase: WebARPhase;
  error: string | null;
  trackedCount: number;
  onRetry?: () => void;
  onGoBack?: () => void;
}

function ARStatusOverlay({
  phase,
  error,
  trackedCount,
  onRetry,
  onGoBack,
}: ARStatusOverlayProps) {
  const getStatusContent = () => {
    if (error) {
      return { icon: '❌', title: 'Lỗi AR', subtitle: error, color: BRAND.coralPink };
    }
    switch (phase) {
      case 'LOADING':
        return { icon: '⏳', title: 'Đang tải...', subtitle: 'Khởi tạo camera AR', color: BRAND.sunshineYellow };
      case 'SCANNING':
        return { icon: '📷', title: 'Đang quét...', subtitle: `Đã tìm thấy ${trackedCount} thẻ`, color: BRAND.skyBlue };
      case 'VIEWING':
        return { icon: '🎯', title: 'Đang xem', subtitle: `${trackedCount} thẻ đang hiển thị`, color: BRAND.mintGreen };
      case 'COMBO':
        return { icon: '🔥', title: 'COMBO!', subtitle: 'Đang ghép thẻ!', color: BRAND.vibrantOrange };
      default:
        return null;
    }
  };

  const status = getStatusContent();
  if (!status) return null;

  return (
    <View style={styles.statusOverlay}>
      <View style={[styles.statusCard, { backgroundColor: withOpacity(status.color, 0.95) }]}>
        <Text style={styles.statusIcon}>{status.icon}</Text>
        <Text style={styles.statusTitle}>{status.title}</Text>
        <Text style={styles.statusSubtitle}>{status.subtitle}</Text>

        {(error || phase === 'LOADING') && (
          <View style={styles.statusActions}>
            {onRetry && (
              <ClayButton color="white" onPress={onRetry} style={styles.statusButton}>
                <Text style={styles.statusButtonText}>Thử lại</Text>
              </ClayButton>
            )}
            {onGoBack && (
              <ClayButton color="white" onPress={onGoBack} style={styles.statusButton}>
                <Text style={styles.statusButtonText}>Quay lại</Text>
              </ClayButton>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const WebARScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'WebAR'>>();
  const webViewRef = useRef<WebView>(null);

  const { lessonId, lessonTitle, catalogId } = route.params || {};
  const [webViewUrl, setWebViewUrl] = useState<string>('');

  // ── WebAR Session State ──────────────────────────────────────────────────────

  const {
    phase,
    isReady,
    error,
    trackedTargets,
    comboActive,
    arViewerUrl,
    handleWebViewMessage,
    reset,
  } = useWebARSession({
    lessonId,
    catalogId,
    onQRDetected: (qrId) => console.log('[WebAR] QR:', qrId),
    onTargetFound: (target) => console.log('[WebAR] Target:', target),
    onTargetLost: (targetIndex) => console.log('[WebAR] Lost:', targetIndex),
    onComboDetected: (targets) => {
      console.log('[WebAR] Combo:', targets);
      Alert.alert('🔥 Combo!', 'Bạn đã ghép thành công các thẻ!');
    },
    onXpAward: (xp, source) => console.log('[WebAR] XP:', xp, source),
    onReady: () => console.log('[WebAR] Ready'),
    onError: (err) => console.error('[WebAR] Error:', err),
  });

  // ── Build URL on mount ───────────────────────────────────────────────────────

  useEffect(() => {
    setWebViewUrl(arViewerUrl);
  }, [arViewerUrl]);

  // ── Handle back button ───────────────────────────────────────────────────────

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleGoBack();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // ── Send message to WebView ─────────────────────────────────────────────────

  const sendToWebView = useCallback((type: string, payload?: Record<string, unknown>) => {
    const message: WebARMessage = { type, payload };
    const js = `
      (function() {
        const event = new MessageEvent('message', { data: JSON.stringify(${JSON.stringify(JSON.stringify(message))}) });
        window.dispatchEvent(event);
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  // ── WebView event handlers ───────────────────────────────────────────────────

  const handleWebViewLoadStart = useCallback(() => {
    console.log('[WebAR] Loading WebView...');
  }, []);

  const handleWebViewError = useCallback((event: { nativeEvent: { description?: string } }) => {
    console.error('[WebAR] WebView error:', event.nativeEvent.description);
  }, []);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    console.log('[WebAR] Nav:', navState.url, navState.loading);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    webViewRef.current?.stopLoading();
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    reset();
    webViewRef.current?.reload();
  }, [reset]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!webViewUrl) {
    return (
      <View style={styles.container}>
        <ClayCard variant="lg" color="white" padding={SPACING.xl} style={styles.loadingCard}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
          <Text style={styles.loadingText}>Đang khởi tạo WebAR...</Text>
        </ClayCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: webViewUrl }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        onLoadStart={handleWebViewLoadStart}
        onError={handleWebViewError}
        onNavigationStateChange={handleNavigationStateChange}
        // Permissions
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Android
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        // Cache
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        // Behavior
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      {/* AR Status overlay */}
      <ARStatusOverlay
        phase={phase}
        error={error}
        trackedCount={trackedTargets.length}
        onRetry={handleRetry}
        onGoBack={handleGoBack}
      />

      {/* Exit button */}
      <View style={styles.exitButtonContainer}>
        <ClayButton color="white" onPress={handleGoBack}>
          <Text style={styles.exitButtonText}>✕ Đóng</Text>
        </ClayButton>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.darkBg,
  },
  webView: {
    flex: 1,
  },

  // Loading
  loadingCard: {
    margin: SPACING.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Status overlay
  statusOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 50,
  },
  statusCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  statusTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '900',
    color: COLORS.white,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 2,
  },
  statusActions: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  statusButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  statusButtonText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: BRAND.darkBg,
  },

  // Exit button
  exitButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    right: 16,
    zIndex: 100,
  },
  exitButtonText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});

export default WebARScreen;
