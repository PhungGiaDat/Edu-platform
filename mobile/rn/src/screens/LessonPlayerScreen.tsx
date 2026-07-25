/**
 * LessonPlayerScreen — non-AR lesson playback.
 * Phase-2 AR work is out of scope. This screen renders a graceful
 * placeholder explaining AR is unavailable on this device/build, plus
 * the lesson metadata so the navigation flow stays usable end-to-end.
 * Does NOT import UnityView.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { LessonCategoryBadge } from '../components/LessonCategoryBadge';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING } from '../design/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const LessonPlayerScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'LessonPlayer'>>();
  const navigation = useNavigation();
  const { lessonTitle, qrCode } = route.params;
  const nav = navigation as unknown as {
    goBack: () => void;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {lessonTitle}
        </Text>
        <View style={styles.headerMeta}>
          <LessonCategoryBadge category="nature" />
          {qrCode ? (
            <Text style={styles.qrCode}>QR · {qrCode}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ClayCard variant="lg" color="yellow" style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>AR coming soon</Text>
          <Text style={styles.placeholderBody}>
            AR not available on this device. The mobile build of this
            experience focuses on courses, pets, and gamification.
          </Text>
        </ClayCard>

        <ClayCard variant="md" color="white" style={styles.infoCard}>
          <Text style={styles.infoHeading}>Lesson details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Title</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {lessonTitle}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>QR</Text>
            <Text style={styles.infoValue}>{qrCode ?? '—'}</Text>
          </View>
        </ClayCard>

        <ClayButton
          color="blue"
          style={styles.backButton}
          onPress={() => nav.goBack()}
        >
          Back to course
        </ClayButton>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  qrCode: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.md,
  },
  placeholderCard: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.clayMd,
  },
  placeholderTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  placeholderBody: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoHeading: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    width: 80,
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: FONT.sizes.md,
    color: COLORS.textPrimary,
  },
  backButton: {
    marginTop: SPACING.md,
  },
});

export default LessonPlayerScreen;
