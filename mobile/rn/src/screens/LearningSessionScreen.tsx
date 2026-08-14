/**
 * LearningSessionScreen — reusable lesson-learning shell.
 *
 * Compositional layout:
 * ```
 * SessionProvider
 * ├── SessionHeader         (lesson title, step counter, time)
 * ├── SessionProgress        (ring + labels)
 * ├── <LearningContent>     (children — vocabulary/flashcard slot)
 * ├── SessionTimeIndicator   (elapsed display)
 * ├── ARButton             (navigates to AR without resetting session)
 * └── SessionOverlayRoot    (warning/limit/break modals)
 *     └── CompletionShell   (shown when status === 'COMPLETED')
 * ```
 *
 * AR navigation: SessionProvider lives above the navigation stack,
 * so navigating to AR and back does NOT reset session state.
 *
 * DQ-10 integration: pass SessionConfig via SessionProvider.config prop.
 * Until DQ-10 resolves, the shell shows NORMAL status only.
 *
 * State ownership:
 * - This screen owns startSession(totalSteps), advanceStep(), endSession().
 * - The session timer is managed by SessionProvider (auto TICK on 1s interval).
 * - AppState listener auto-pauses the timer when backgrounded.
 * - AR navigation does NOT call resetSession() — context persists.
 *
 * NOT this screen's job:
 * - XP/reward backend mutation (parent handles it)
 * - Session duration policy (DQ-10 config)
 * - AR tracking logic (Unity bridge owns it)
 */
import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { LessonCategoryBadge } from '../components/LessonCategoryBadge';
import { SessionProgress } from '../components/SessionProgress';
import { SessionTimeIndicator } from '../components/SessionTimeIndicator';
import { SessionOverlayRoot } from '../components/SessionOverlayRoot';
import { CompletionShell } from '../components/CompletionShell';
import { SessionProvider, useSession } from '../hooks/SessionContext';
import type { SessionConfig } from '../types/session-state';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LearningSessionScreenProps {
  /**
   * Lesson title shown in the session header.
   */
  lessonTitle: string;

  /**
   * Category badge text (e.g., "nature", "food").
   */
  category?: string;

  /**
   * Total number of steps/items in this lesson.
   * Used to initialize session progress.
   */
  totalSteps: number;

  /**
   * QR code associated with this lesson (optional).
   */
  qrCode?: string;

  /**
   * XP reward string for display (e.g., "+50 XP").
   * Not mutation — just a display label.
   */
  xpReward?: string;

  /**
   * Session policy config (DQ-10 injection point).
   * Until DQ-10 resolves, omit or pass zeros:
   *   { limitSeconds: 0, warningSeconds: 0, breakSeconds: 0 }
   *
   * Example (30/25/5 web values):
   *   { limitSeconds: 1800, warningSeconds: 1500, breakSeconds: 300 }
   */
  sessionConfig?: Partial<SessionConfig>;

  /**
   * Called when the session ends (status === 'COMPLETED').
   * Parent owns the backend completion call.
   */
  onSessionEnd?: () => void;

  /**
   * Called when user taps the AR entry button.
   * Parent owns the navigation to AR.
   */
  onAROpen?: () => void;

  /**
   * Content slot for the learning activity (vocabulary/flashcard/quiz).
   * Receives currentStepIndex for keyed rendering.
   */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Inner screen (inside SessionProvider)
// ---------------------------------------------------------------------------

const LearningSessionInner: React.FC<LearningSessionScreenProps> = ({
  lessonTitle,
  category,
  totalSteps,
  qrCode,
  xpReward,
  onSessionEnd,
  onAROpen,
  children,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {
    sessionState,
    startSession,
    advanceStep,
    endSession,
    startBreak,
    setStatus,
  } = useSession();

  // Press animation for the AR card
  const arCardScale = useSharedValue(1);
  const arCardAnimated = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(arCardScale.value, { damping: 14, stiffness: 180 }) },
    ],
  }));

  // ── Start session on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (totalSteps > 0) {
      startSession(totalSteps);
    }
    // startSession only depends on totalSteps, stable across re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Notify parent when session ends ──────────────────────────────────────
  useEffect(() => {
    if (sessionState.status === 'COMPLETED') {
      onSessionEnd?.();
    }
  }, [sessionState.status, onSessionEnd]);

  // ── AR navigation ────────────────────────────────────────────────────────
  const handleAROpen = useCallback(() => {
    // Session context persists across navigation (provider is above nav stack)
    // So sessionState is NOT reset when navigating to AR and back
    onAROpen?.();
  }, [onAROpen]);

  // ── Advance step (connect to lesson interaction) ──────────────────────────
  // Called by children via onComplete/onNext. Safe to call multiple times.
  const handleAdvance = useCallback(() => {
    if (sessionState.completedCount < totalSteps) {
      advanceStep();
    }
  }, [advanceStep, sessionState.completedCount, totalSteps]);

  // ── Derived display values ────────────────────────────────────────────────
  const isCompleted = sessionState.status === 'COMPLETED';
  const progressRatio = sessionState.progressRatio;

  // ── AR card visual config ───────────────────────────────────────────────
  const xpDisplay = xpReward ?? '+50 XP';

  if (isCompleted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + SPACING.base }]}>
        <CompletionShell
          title={lessonTitle}
          completedCount={sessionState.completedCount}
          totalCount={totalSteps}
          progressRatio={progressRatio}
          onContinue={undefined}
          onBack={undefined}
          continueLabel="Tiếp tục học"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.base },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero / Session header ──────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.lessonTitle} numberOfLines={2}>
            {lessonTitle}
          </Text>

          <View style={styles.heroMeta}>
            {category && (
              <LessonCategoryBadge category={category} />
            )}
            {qrCode && (
              <View
                style={[
                  styles.qrChip,
                  { backgroundColor: withOpacity(BRAND.skyBlue, 0.12) },
                ]}
              >
                <Text style={styles.qrChipText} suppressHighlighting selectable={false}>
                  QR · {qrCode}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Session Progress ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SessionProgress
            completedCount={sessionState.completedCount}
            totalCount={totalSteps}
            progressRatio={progressRatio}
          />
        </View>

        {/* ── Learning Content slot ─────────────────────────────────────── */}
        <View style={styles.section}>
          {children}
        </View>

        {/* ── Session Time Indicator ─────────────────────────────────────── */}
        <View style={styles.section}>
          <SessionTimeIndicator
            elapsedSeconds={sessionState.elapsedSeconds}
            status={sessionState.status}
            breakRemainingSeconds={sessionState.breakRemainingSeconds}
          />
        </View>

        {/* ── AR Entry card ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <AnimatedPressable
            onPress={handleAROpen}
            onPressIn={() => {
              arCardScale.value = 0.975;
            }}
            onPressOut={() => {
              arCardScale.value = 1;
            }}
          >
            <Animated.View style={arCardAnimated}>
              <ClayCard variant="xl" padding={0}>
                {/* Top band — AR tone */}
                <View
                  style={[
                    styles.arCardBand,
                    { backgroundColor: withOpacity(BRAND.skyBlue, 0.18) },
                  ]}
                >
                  <View style={styles.arCardBandLeft}>
                    <Text style={styles.arCardEyebrow}>TRẢI NGHIỆM AR</Text>
                    <Text style={styles.arCardTitle}>Mở thực tế tăng cường</Text>
                    <Text style={styles.arCardSubtitle}>
                      Quét thẻ AR để học từ vựng bằng hình ảnh 3D
                    </Text>
                  </View>
                  {/* Camera icon well */}
                  <View
                    style={[
                      styles.arIllustration,
                      { backgroundColor: withOpacity(BRAND.skyBlue, 0.12) },
                    ]}
                  >
                    <Text style={styles.arIconText}>📷</Text>
                  </View>
                </View>

                {/* CTA row */}
                <Pressable
                  onPress={handleAROpen}
                  style={styles.arCardCta}
                  android_ripple={{ color: withOpacity(BRAND.skyBlue, 0.12) }}
                >
                  <View style={styles.arCardCtaText}>
                    <Text style={styles.arCardCtaTitle}>Bắt đầu AR</Text>
                    <Text style={styles.arCardCtaSubtitle}>
                      Cần quyền camera để quét thẻ AR
                    </Text>
                  </View>
                  <View style={styles.arCardArrow}>
                    <Text style={styles.arArrowText}>›</Text>
                  </View>
                </Pressable>
              </ClayCard>
            </Animated.View>
          </AnimatedPressable>
        </View>

        {/* Bottom safe spacer */}
        <View style={{ height: SPACING['3xl'] * 2 }} />
      </ScrollView>

      {/* ── Session overlays (warning/limit/break modals) ──────────────── */}
      <SessionOverlayRoot
        status={sessionState.status}
        breakRemainingSeconds={sessionState.breakRemainingSeconds}
        onStartBreak={() => startBreak(sessionState.breakRemainingSeconds > 0 ? sessionState.breakRemainingSeconds : 300)}
        onEndSession={endSession}
        onDismissWarning={() => setStatus('NORMAL')}
        onContinueSession={() => setStatus('NORMAL')}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Exported screen (wraps with SessionProvider)
// ---------------------------------------------------------------------------

/**
 * LearningSessionScreen — exported with SessionProvider wrapper.
 * For a standalone usage without SessionProvider (e.g., in a test),
 * import `LearningSessionInner` directly and wrap with a provider.
 */
export const LearningSessionScreen: React.FC<LearningSessionScreenProps> = (
  props,
) => {
  return (
    <SessionProvider config={props.sessionConfig}>
      <LearningSessionInner {...props} />
    </SessionProvider>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },

  // Hero
  hero: {
    marginBottom: SPACING.lg,
  },
  lessonTitle: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    marginBottom: SPACING.sm,
    lineHeight: 38,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  qrChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  qrChipText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: BRAND.skyBlueDark,
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },

  // AR card
  arCardBand: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  arCardBandLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  arCardEyebrow: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    color: BRAND.skyBlueDark,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  arCardTitle: {
    fontSize: FONT.sizes.xl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 26,
  },
  arCardSubtitle: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  arIllustration: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  arIconText: {
    fontSize: 32,
  },
  arCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderTopColor: withOpacity(BRAND.skyBlue, 0.12),
  },
  arCardCtaText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  arCardCtaTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  arCardCtaSubtitle: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  arCardArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  arArrowText: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND.skyBlueDark,
    lineHeight: 28,
  },
});

export default LearningSessionScreen;
