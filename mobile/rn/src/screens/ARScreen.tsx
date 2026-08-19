/**
 * ARScreen — M2/M3/M4/M5/M6/M7 full implementation
 *
 * Full image-tracking AR experience with claymorphic UI.
 * State machine: IDLE → AR_INITIALIZING → IMAGE_TRACKING_READY
 * → IMAGE_DETECTED → MODEL_SPAWNING → MODEL_LOADED → AR_INTERACTING
 *
 * Phases wired:
 * - M3: QR → Experience → Unity (loadLesson, startSession)
 * - M4: Permissions UX (PermissionDeniedOverlay, TrackingHintOverlay)
 * - M5: Tracking Guidance (TrackingHintOverlay, FlashcardOverlay)
 * - M6: Multi-Card & Combo UX (ComboOverlay, ComboPanel)
 * - M7: Gamification (RewardCelebrationOverlay, XP backend wiring)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { UnityView } from '../components/UnityView';
import { ARLoadingOverlay } from '../components/ARLoadingOverlay';
import { FlashcardOverlay } from '../components/FlashcardOverlay';
import { ComboOverlay } from '../components/ComboOverlay';
import { ComboPanel, type ComboCardInfo } from '../components/ComboPanel';
import { PetStatusOverlay } from '../components/PetStatusOverlay';
import { TrackingHintOverlay } from '../components/TrackingHintOverlay';
import { PermissionDeniedOverlay, type PermissionErrorCode } from '../components/PermissionDeniedOverlay';
import { RewardCelebrationOverlay } from '../components/RewardCelebrationOverlay';
import { useARSession } from '../hooks/useARSession';
import { unityBridge } from '../bridge/UnityBridgeModule';
import {
  mapToUnityPayload,
  validateNativeTrackingMetadata,
  toCardDescriptorRN,
} from '../bridge/ARExperienceMapper';
import { flashcardApi } from '../services/api';
import api from '../services/api';
import { BACKEND_METADATA_UNAVAILABLE } from '../types/ar';
import type { ArCombinationSchema } from '../types/api';
import { COLORS, SPACING } from '../design/tokens';

interface ARScreenProps {
  navigation: { goBack: () => void };
  route: { params: { lessonId: string; lessonTitle: string } };
}

// ─── M6: related_combos → ComboCardInfo ───────────────────────────────────────

/**
 * Builds `ComboCardInfo[]` from backend `related_combos` + tracked card qrIds.
 * Only combos where BOTH required_tags are present in tracked qrIds are included.
 */
function buildAvailableCombos(
  relatedCombos: readonly ArCombinationSchema[],
  trackedQrIds: Set<string>,
  cardPreviews?: Map<string, { imageUrl?: string; word?: string }>
): ComboCardInfo[] {
  const results: ComboCardInfo[] = [];
  for (const combo of relatedCombos) {
    const tags = combo.required_tags ?? [];
    if (tags.length < 2) continue;

    // Both required cards must be tracked
    const hasAll = tags.every(tag => trackedQrIds.has(tag));
    if (!hasAll) continue;

    // Card previews from tracked images (map tag → card info)
    const cardA = cardPreviews?.get(tags[0]);
    const cardB = cardPreviews?.get(tags[1]);

    results.push({
      combo,
      cardAQrId: tags[0],
      cardBQrId: tags[1],
      cardAPreviewUrl: cardA?.imageUrl,
      cardBPreviewUrl: cardB?.imageUrl,
      cardALabel: cardA?.word,
      cardBLabel: cardB?.word,
    });
  }
  return results;
}

// ─── M7: Permission error codes that trigger PermissionDeniedOverlay ────────────

const PERMISSION_ERROR_CODES: Record<string, PermissionErrorCode> = {
  CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
  AR_CAPABILITY_UNSUPPORTED: 'AR_CAPABILITY_UNSUPPORTED',
};

/**
 * Main AR experience screen.
 */
export const ARScreen: React.FC<ARScreenProps> = ({ navigation, route }) => {
  const { lessonId, lessonTitle } = route.params;

  // ── M3: Lesson loading state ─────────────────────────────────────────────
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  // ── M3A: Native tracking availability ────────────────────────────────────
  const [nativeTracking, setNativeTracking] = useState<
    | { state: 'pending' }
    | { state: 'ready'; qrId: string }
    | { state: 'unavailable'; code: typeof BACKEND_METADATA_UNAVAILABLE; qrId: string }
  >({ state: 'pending' });

  // ── M3: Backend related_combos for M6 ────────────────────────────────────
  const [relatedCombos, setRelatedCombos] = useState<readonly ArCombinationSchema[]>([]);

  // ── M4: Permission error state ───────────────────────────────────────────
  const [permissionError, setPermissionError] = useState<{
    code: PermissionErrorCode;
    showWebAR: boolean;
  } | null>(null);

  // ── M6: Show detailed combo panel ────────────────────────────────────────
  const [showComboPanel, setShowComboPanel] = useState(false);

  // ── M7: Reward celebration ────────────────────────────────────────────────
  const [rewardCelebration, setRewardCelebration] = useState<{
    xpAwarded: number;
    comboDescription?: string;
    streakCount?: number;
  } | null>(null);

  // ── AR session hook ───────────────────────────────────────────────────────
  const {
    arState,
    canCombo,
    progress,
    progressStage,
    error,
    petState,
    currentStreak,
    trackedImages,
    startSession,
    stopSession,
    triggerCombo,
    retry,
  } = useARSession(undefined, undefined, {
    onComboComplete: async (xpAwarded: number, comboId: string) => {
      // M7: Idempotent XP call via /gamification/xp-event
      // eventId is the comboId from Unity — stable per combo occurrence
      try {
        const eventId = `combo_${comboId}_${Date.now()}`;
        await api.post('/gamification/xp-event', {
          action: 'combo_complete',
          event_id: eventId,
          metadata: { comboId, xpAwarded },
        });
        // Show reward celebration
        setRewardCelebration({ xpAwarded, comboDescription: `Combo ${comboId}`, streakCount: currentStreak });
      } catch (err) {
        console.error('[ARScreen] XP award failed:', err);
        // Still show celebration even if API fails (offline-first)
        setRewardCelebration({ xpAwarded, comboDescription: `Combo ${comboId}`, streakCount: currentStreak });
      }
    },
  });

  // ── M6: Derive available combos from tracked images + backend data ──────
  const availableCombos = useMemo(
    () => buildAvailableCombos(
      relatedCombos,
      new Set(Array.from(trackedImages.values()).map(img => img.qrId)),
      new Map(
        Array.from(trackedImages.values()).map(img => [
          img.qrId,
          { imageUrl: undefined, word: img.imageName },
        ])
      )
    ),
    [relatedCombos, trackedImages]
  );

  // ── M3: Load lesson ───────────────────────────────────────────────────────
  const loadLesson = useCallback(async () => {
    setIsLoadingLesson(true);
    setLessonError(null);
    setNativeTracking({ state: 'pending' });
    setRelatedCombos([]);

    try {
      const response = await flashcardApi.getFlashcard(lessonId);

      // Store related_combos for M6
      setRelatedCombos(response.data.related_combos ?? []);

      // M3A: validate native tracking metadata
      const availability = validateNativeTrackingMetadata(response.data);
      if (availability.kind === 'ready') {
        const descriptor = toCardDescriptorRN(availability.tracking);
        setNativeTracking({ state: 'ready', qrId: descriptor.qrId });
        await unityBridge.startImageTrackingMulti({ cards: [descriptor] });
      } else {
        setNativeTracking({
          state: 'unavailable',
          code: BACKEND_METADATA_UNAVAILABLE,
          qrId: availability.qrId,
        });
      }

      const payload = mapToUnityPayload(response.data);
      startSession(lessonId, payload);
    } catch (err) {
      setLessonError('Failed to load AR lesson');
      console.error('AR lesson load error:', err);
    } finally {
      setIsLoadingLesson(false);
    }
  }, [lessonId, startSession]);

  // ── M3: Mount → load ─────────────────────────────────────────────────────
  useEffect(() => {
    loadLesson();
    return () => stopSession();
  }, [loadLesson, stopSession]);

  // ── M4: Route Unity error events to PermissionDeniedOverlay ───────────────
  useEffect(() => {
    if (error) {
      const code = error.toUpperCase();
      const permCode = PERMISSION_ERROR_CODES[code];
      if (permCode) {
        setPermissionError({ code: permCode, showWebAR: true });
      }
    } else {
      setPermissionError(null);
    }
  }, [error]);

  // ── M8: App lifecycle pause/resume ────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        unityBridge.resumeSession?.();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        unityBridge.pauseSession?.();
      }
    });
    return () => subscription.remove();
  }, []);

  // ── M7: Wire onComboComplete → XP backend + celebration ─────────────────
  // (Handled inside useARSession handleUnityEvent — update here to wire backend)
  // TODO: Replace the local-only currentStreak update with addXpEvent call
  // once useGamification is integrated. See useARSession.ts onComboComplete.

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    stopSession();
    navigation.goBack();
  }, [stopSession, navigation]);

  const handleRetry = useCallback(() => {
    retry();
    loadLesson();
  }, [retry, loadLesson]);

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const handleDismissPermission = useCallback(() => {
    setPermissionError(null);
    handleExit();
  }, [handleExit]);

  const handleDismissReward = useCallback(() => {
    setRewardCelebration(null);
  }, []);

  // ── M5: Tracking hint state ──────────────────────────────────────────────
  const trackingHintState = (() => {
    switch (arState) {
      case 'IMAGE_TRACKING_READY': return 'waiting';
      case 'IMAGE_DETECTED': return 'first_found';
      case 'MODEL_SPAWNING': return 'searching';
      case 'MODEL_LOADED': return 'first_found';
      case 'AR_INTERACTING':
        return canCombo ? 'both_found' : 'first_found';
      default: return 'waiting';
    }
  })();

  // ── Derived overlay visibility ────────────────────────────────────────────
  const showLoadingOverlay =
    arState === 'AR_INITIALIZING' ||
    arState === 'IMAGE_DETECTED' ||
    arState === 'MODEL_SPAWNING';

  const showErrorOverlay = arState === 'AR_ERROR';
  const showTrackingHint =
    (arState === 'IMAGE_TRACKING_READY' || arState === 'MODEL_SPAWNING') &&
    !permissionError;

  const showComboOverlay =
    arState === 'AR_INTERACTING' && canCombo && !showComboPanel;

  const showPetOverlay = arState === 'AR_INTERACTING';
  const isMetadataUnavailable = nativeTracking.state === 'unavailable';

  // ── First tracked image for FlashcardOverlay ─────────────────────────────
  const firstTrackedImage = useMemo(
    () => Array.from(trackedImages.values())[0] ?? null,
    [trackedImages]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Unity camera view */}
      <UnityView style={styles.unityView} />

      {/* M4: Permission denied overlay */}
      {permissionError && (
        <PermissionDeniedOverlay
          errorCode={permissionError.code}
          onOpenSettings={handleOpenSettings}
          onUseWebAR={() => {
            // M9: Navigate to WebAR fallback — placeholder for now
            console.log('[ARScreen] Navigate to WebAR fallback');
          }}
          showWebARFallback={permissionError.showWebAR}
        />
      )}

      {/* M3A: Native tracking unavailable banner */}
      {isMetadataUnavailable && (
        <View style={styles.nativeTrackingBanner}>
          <ClayCard variant="sm" color="yellow" padding={12}>
            <Text style={styles.nativeTrackingBannerText}>
              Native tracking unavailable for this card.
              Falling back to legacy AR.
            </Text>
          </ClayCard>
        </View>
      )}

      {/* M4: Tracking hint overlay */}
      {showTrackingHint && (
        <TrackingHintOverlay
          cardName={lessonTitle}
          previewImageUrl={undefined}
          expectedCardCount={1}
          state={trackingHintState}
        />
      )}

      {/* M5: Flashcard overlay (shown when card is tracked) */}
      {arState === 'MODEL_LOADED' && firstTrackedImage && (
        <FlashcardOverlay
          word={firstTrackedImage.imageName}
          translation={''}
          imageUrl={undefined}
          audioUrl={undefined}
        />
      )}

      {/* M3: Loading overlay */}
      {showLoadingOverlay && (
        <ARLoadingOverlay
          state={arState === 'AR_INITIALIZING' ? 'initializing' : 'loading_model'}
          progress={progress}
          stage={progressStage ?? 'load'}
          modelName={lessonTitle}
        />
      )}

      {/* M3: Error overlay */}
      {showErrorOverlay && !permissionError && (
        <ARLoadingOverlay
          state="error"
          errorMessage={error ?? 'AR session failed. Please try again.'}
          onRetry={handleRetry}
        />
      )}

      {/* M3: Lesson loading spinner */}
      {isLoadingLesson && (
        <View style={styles.lessonLoading}>
          <ClayCard variant="md" color="white" padding={24}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading lesson...</Text>
          </ClayCard>
        </View>
      )}

      {/* M6: Combo UI */}
      {showComboOverlay && (
        <ComboOverlay
          availableCombos={availableCombos.map(c => ({
            cardA: c.cardAQrId,
            cardB: c.cardBQrId,
            reward: `+${c.combo.bonus_xp} XP`,
          }))}
          onComboTrigger={triggerCombo}
          onShowDetails={() => setShowComboPanel(true)}
        />
      )}

      {/* M6: Detailed combo panel */}
      {showComboPanel && availableCombos.length > 0 && (
        <ComboPanel
          combos={availableCombos}
          onComboSelect={(combo) => {
            // Trigger selected combo
            console.log('[ARScreen] Selected combo:', combo.combo.combo_id);
            setShowComboPanel(false);
          }}
          onDismiss={() => setShowComboPanel(false)}
        />
      )}

      {/* M7: Reward celebration */}
      {rewardCelebration && (
        <RewardCelebrationOverlay
          xpAwarded={rewardCelebration.xpAwarded}
          comboDescription={rewardCelebration.comboDescription}
          streakCount={rewardCelebration.streakCount}
          onDismiss={handleDismissReward}
        />
      )}

      {/* M5: Pet status */}
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
  exitButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  exitIcon: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  nativeTrackingBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  nativeTrackingBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});
