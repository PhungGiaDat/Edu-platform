/**
 * CourseDetailScreen — single-course detail with lesson list.
 * Uses useCourseDetail + LessonRow + LessonCategoryBadge.
 * Tapping a lesson navigates to LessonPlayer (no AR — placeholder fallback
 * for any lesson that originally had an arReference).
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { ClayButton } from '../components/ClayButton';
import { ClayCard } from '../components/ClayCard';
import { LessonRow } from '../components/LessonRow';
import { LessonCategoryBadge } from '../components/LessonCategoryBadge';
import { useCourseDetail } from '../hooks/useCourseDetail';
import { useLocale } from '../i18n/useLocale';
import { COLORS, FONT, RADIUS, SPACING } from '../design/tokens';
import type { Lesson } from '../types/course';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const CourseDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'CourseDetail'>>();
  const navigation = useNavigation();
  const { courseId, courseTitle } = route.params;
  const { course, lessons, loading, refreshing, error, refresh } =
    useCourseDetail(courseId);
  const { t } = useLocale();

  const nav = navigation as unknown as {
    navigate: (
      route: string,
      params: {
        lessonId: string;
        lessonTitle: string;
        qrCode?: string;
      },
    ) => void;
  };

  const onLessonPress = useCallback(
    (lesson: Lesson) => {
      nav.navigate('LessonPlayer', {
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.title,
        qrCode: lesson.qr_code,
      });
    },
    [nav],
  );

  if (loading && !course) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {course?.title ?? courseTitle}
        </Text>
        {course ? (
          <View style={styles.headerMeta}>
            <LessonCategoryBadge category={course.title} />
            <Text style={styles.lessonCount}>
              {lessons.length} {t('courses.lessonsHeader').toLowerCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {course ? (
        <ClayCard variant="sm" color="white" style={styles.descriptionCard}>
          <Text style={styles.description}>{course.description}</Text>
        </ClayCard>
      ) : null}

      <View style={styles.lessonsHeader}>
        <Text style={styles.lessonsHeaderText}>
          {t('courses.lessonsHeader')}
        </Text>
      </View>

      <FlatList
        data={lessons}
        keyExtractor={(item) => item.lesson_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item, index }) => (
          <LessonRow
            index={index + 1}
            title={item.title}
            subtitle={item.qr_code ? `QR · ${item.qr_code}` : undefined}
            onPress={() => onLessonPress(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('common.empty')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          lessons.length > 0 ? (
            <ClayButton
              color="green"
              style={styles.startButton}
              onPress={() =>
                lessons[0]
                  ? onLessonPress(lessons[0])
                  : undefined
              }
            >
              {t('courses.expand')}
            </ClayButton>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundBase,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
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
  lessonCount: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONT.sizes.md,
    textAlign: 'center',
  },
  descriptionCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  lessonsHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  lessonsHeaderText: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  emptyState: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT.sizes.md,
    color: COLORS.textMuted,
  },
  startButton: {
    marginTop: SPACING.md,
  },
});

export default CourseDetailScreen;
