/**
 * CourseListScreen — top-level course catalog.
 * Uses useCourses + CourseCard. Pull-to-refresh + a friendly empty/error state.
 * No AR. No raw hex — all colors from design tokens.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  type ListRenderItem,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CourseCard } from '../components/CourseCard';
import { ClayButton } from '../components/ClayButton';
import { useCourses } from '../hooks/useCourses';
import { useLocale } from '../i18n/useLocale';
import { COLORS, FONT, RADIUS, SPACING } from '../design/tokens';
import type { Course } from '../types/course';

export const CourseListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { courses, loading, refreshing, error, refresh } = useCourses();
  const { t } = useLocale();

  const goToCourseDetail = useCallback(
    (courseId: string, courseTitle: string) => {
      const nav = navigation as unknown as {
        navigate: (route: string, params: { courseId: string; courseTitle: string }) => void;
      };
      if (typeof nav.navigate === 'function') {
        nav.navigate('CourseDetail', { courseId, courseTitle });
      }
    },
    [navigation],
  );

  const renderItem: ListRenderItem<Course> = useCallback(
    ({ item }) => (
      <CourseCard
        course={item}
        onPress={() => goToCourseDetail(item.course_id, item.title)}
      />
    ),
    [goToCourseDetail],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('courses.title')}</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <ClayButton
            color="yellow"
            onPress={() => void refresh()}
            style={styles.retryButton}
          >
            {t('common.retry')}
          </ClayButton>
        </View>
      ) : null}

      <FlatList
        data={courses}
        keyExtractor={(c) => c.course_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('common.empty')}</Text>
            </View>
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
  title: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
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
  errorBanner: {
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONT.sizes.md,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: SPACING.xs,
  },
});

export default CourseListScreen;
