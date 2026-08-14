/**
 * LessonPlayerScreen — premium lesson playback screen.
 *
 * Information architecture:
 *   1. Lesson hero header (title, category badge, breadcrumb)
 *   2. AR entry card — primary CTA (large, dominant, clay)
 *   3. Lesson info card (vocabulary count, difficulty, duration)
 *   4. Vocabulary preview chips
 *   5. Bottom back button
 *   6. LexiOrb floating
 *
 * Uses: ClayCard, ClayContinueCard-style AR card, LessonCategoryBadge,
 *       LexiOrb, LexiBottomSheet, ClayIcon.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { LexiOrb } from '../components/LexiOrb';
import { LexiBottomSheet } from '../components/LexiBottomSheet';
import { ClayIcon } from '../components/icons/ClayIcons';
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

export const LessonPlayerScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'LessonPlayer'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { lessonTitle, qrCode } = route.params;

  const nav = navigation as unknown as {
    goBack: () => void;
    navigate: (screen: string, params: object) => void;
  };

  const [lexiVisible, setLexiVisible] = useState(false);

  // Press animation for the AR card
  const arCardScale = useSharedValue(1);
  const arCardAnimated = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(arCardScale.value, { damping: 14, stiffness: 180 }) },
    ],
  }));

  const handleAROpen = () => {
    nav.navigate('AR', {
      lessonId: route.params.lessonId,
      lessonTitle: route.params.lessonTitle,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.base },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero header ─────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            <Pressable onPress={() => nav.goBack()} style={styles.breadcrumbBack}>
              <ClayIcon name="arrowLeft" size={16} color={BRAND.skyBlueDark} />
              <Text style={styles.breadcrumbBackText}>Quay lại</Text>
            </Pressable>
            <View style={styles.breadcrumbSep}>
              <Text style={styles.breadcrumbSepText}>/</Text>
            </View>
            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
              {lessonTitle}
            </Text>
          </View>

          <Text style={styles.heroTitle} numberOfLines={3}>
            {lessonTitle}
          </Text>

          <View style={styles.heroMeta}>
            <LessonCategoryBadge category="nature" />
            {qrCode ? (
              <View style={[styles.qrChip, { backgroundColor: withOpacity(BRAND.skyBlue, 0.12) }]}>
                <Text style={styles.qrChipText}>QR · {qrCode}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ─── AR Entry card — primary CTA ───────────────────────── */}
        <View style={styles.section}>
          <AnimatedPressable
            onPress={handleAROpen}
            onPressIn={() => { arCardScale.value = 0.975; }}
            onPressOut={() => { arCardScale.value = 1; }}
          >
            <Animated.View style={[arCardAnimated]}>
              <ClayCard variant="xl" padding={0}>
                {/* Top band — teal/AR tone */}
                <View style={[styles.arCardBand, { backgroundColor: withOpacity(BRAND.skyBlue, 0.18) }]}>
                  <View style={styles.arCardBandLeft}>
                    <Text style={styles.arCardEyebrow}>TRẢI NGHIỆM AR</Text>
                    <Text style={styles.arCardTitle}>Mở thực tế tăng cường</Text>
                    <Text style={styles.arCardSubtitle}>
                      Quét thẻ AR để học từ vựng bằng hình ảnh 3D
                    </Text>
                  </View>
                  {/* AR illustration well */}
                  <View style={[styles.arIllustration, { backgroundColor: withOpacity(BRAND.skyBlue, 0.12) }]}>
                    <ClayIcon name="camera" size={32} color={BRAND.skyBlueDark} />
                  </View>
                </View>

                {/* CTA row */}
                <View style={styles.arCardCta}>
                  <View style={styles.arCardCtaText}>
                    <Text style={styles.arCardCtaTitle}>Bắt đầu AR</Text>
                    <Text style={styles.arCardCtaSubtitle}>
                      Cần quyền camera để quét thẻ AR
                    </Text>
                  </View>
                  <View style={styles.arCardArrow}>
                    <ClayIcon name="arrowRight" size={22} color={BRAND.skyBlueDark} />
                  </View>
                </View>
              </ClayCard>
            </Animated.View>
          </AnimatedPressable>
        </View>

        {/* ─── Lesson info card ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin bài học</Text>

          <ClayCard variant="lg" color="white">
            <View style={styles.infoGrid}>
              <InfoRow
                icon="book"
                label="Tên bài"
                value={lessonTitle}
              />
              <InfoRow
                icon="cards"
                label="Từ vựng"
                value="8 từ"
              />
              <InfoRow
                icon="bolt"
                label="Phần thưởng"
                value="+50 XP"
              />
              {qrCode ? (
                <InfoRow
                  icon="cloud"
                  label="Mã QR"
                  value={qrCode}
                />
              ) : null}
            </View>
          </ClayCard>
        </View>

        {/* ─── Vocabulary preview ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Từ vựng học hôm nay</Text>
          <View style={styles.vocabChips}>
            {VOCAB_PREVIEW.map((word, i) => (
              <View
                key={word}
                style={[
                  styles.vocabChip,
                  { backgroundColor: VOCAB_COLORS[i % VOCAB_COLORS.length].bg },
                ]}
              >
                <Text
                  style={[
                    styles.vocabChipText,
                    { color: VOCAB_COLORS[i % VOCAB_COLORS.length].text },
                  ]}
                >
                  {word}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.vocabHint}>
            Học thêm từ vựng bằng AR hoặc nhắn cho Lexi để ôn tập nhé!
          </Text>
        </View>

        {/* ─── Back button ─────────────────────────────────────── */}
        <View style={styles.section}>
          <ClayButton
            color="white"
            style={styles.backButton}
            onPress={() => nav.goBack()}
          >
            Quay về khóa học
          </ClayButton>
        </View>

        {/* Bottom safe spacer */}
        <View style={{ height: SPACING['3xl'] * 2 }} />
      </ScrollView>

      {/* ─── Floating LexiOrb ──────────────────────────────────── */}
      <View style={[styles.lexiOrbContainer, { bottom: insets.bottom + 84 }]}>
        <LexiOrb
          onPress={() => setLexiVisible(true)}
          animationState="idle"
        />
      </View>

      <LexiBottomSheet
        visible={lexiVisible}
        onDismiss={() => setLexiVisible(false)}
      />
    </View>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  icon: 'book' | 'cards' | 'bolt' | 'cloud' | 'star' | 'flame';
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWell}>
      <ClayIcon name={icon} size={16} color={BRAND.skyBlueDark} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
  </View>
);

const VOCAB_PREVIEW = [
  'Hello',
  'Apple',
  'Dog',
  'Book',
  'Happy',
  'Fish',
];

const VOCAB_COLORS = [
  { bg: withOpacity(BRAND.skyBlue, 0.15), text: BRAND.skyBlueDark },
  { bg: withOpacity(BRAND.sunshineYellow, 0.15), text: BRAND.sunshineYellowDark },
  { bg: withOpacity(BRAND.mintGreen, 0.15), text: BRAND.mintGreenDark },
  { bg: withOpacity(BRAND.coralPink, 0.15), text: BRAND.coralPinkDark },
  { bg: withOpacity(BRAND.lavender, 0.15), text: BRAND.lavenderDark },
];

// ─── Styles ───────────────────────────────────────────────────────────────
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
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 6,
  },
  breadcrumbBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.12),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  breadcrumbBackText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: BRAND.skyBlueDark,
  },
  breadcrumbSep: {},
  breadcrumbSepText: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
  },
  breadcrumbCurrent: {
    flex: 1,
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  heroTitle: {
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
  sectionTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
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

  // Info grid
  infoGrid: {
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoIconWell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    width: 90,
    flexShrink: 0,
  },
  infoValue: {
    flex: 1,
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Vocab chips
  vocabChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  vocabChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  vocabChipText: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
  },
  vocabHint: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Back button
  backButton: {
    borderWidth: 1.5,
    borderColor: withOpacity(BRAND.skyBlue, 0.3),
  },

  // Lexi
  lexiOrbContainer: {
    position: 'absolute',
    right: SPACING.base,
    alignItems: 'center',
  },
});

export default LessonPlayerScreen;
