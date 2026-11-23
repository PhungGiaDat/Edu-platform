/**
 * LearningPathScreen — topic selection and learning journey visualization.
 *
 * Shows available topics/units with clear progression states:
 * - LOCKED: not yet available
 * - AVAILABLE: ready to start
 * - CURRENT: in progress
 * - COMPLETED: finished
 *
 * Child-friendly visual hierarchy with large touch targets.
 * Uses Claymorphic design tokens only.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { useLocale } from '../i18n/useLocale';
import { useCourses } from '../hooks/useCourses';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  withOpacity,
} from '../design/tokens';

type TopicStatus = 'LOCKED' | 'AVAILABLE' | 'CURRENT' | 'COMPLETED';

interface LearningTopic {
  id: string;
  title: string;
  description: string;
  status: TopicStatus;
  progress: number; // 0-100
  lessonCount: number;
  courseId?: string;
}

const StatusBadge: React.FC<{ status: TopicStatus }> = ({ status }) => {
  const badgeColor = useMemo(() => {
    switch (status) {
      case 'LOCKED':
        return COLORS.textMuted;
      case 'AVAILABLE':
        return BRAND.skyBlue;
      case 'CURRENT':
        return BRAND.mintGreen;
      case 'COMPLETED':
        return BRAND.coralPink;
      default:
        return COLORS.textSecondary;
    }
  }, [status]);

  const badgeText = useMemo(() => {
    switch (status) {
      case 'LOCKED':
        return '🔒';
      case 'AVAILABLE':
        return '✨';
      case 'CURRENT':
        return '▶️';
      case 'COMPLETED':
        return '✓';
      default:
        return '';
    }
  }, [status]);

  return (
    <View style={[styles.statusBadge, { backgroundColor: withOpacity(badgeColor, 0.15) }]}>
      <Text style={styles.statusEmoji}>{badgeText}</Text>
    </View>
  );
};

const TopicCard: React.FC<{
  topic: LearningTopic;
  onPress: (topic: LearningTopic) => void;
}> = ({ topic, onPress }) => {
  const isInteractive = topic.status === 'AVAILABLE' || topic.status === 'CURRENT';
  
  const getCardColor = (): 'green' | 'blue' | 'yellow' | 'white' => {
    if (topic.status === 'COMPLETED') return 'green';
    if (topic.status === 'CURRENT') return 'blue';
    if (topic.status === 'AVAILABLE') return 'yellow';
    return 'white';
  };

  return (
    <Pressable
      disabled={!isInteractive}
      onPress={() => onPress(topic)}
      style={({ pressed }) => [
        styles.topicCard,
        !isInteractive && styles.topicCardDisabled,
        pressed && styles.topicCardPressed,
      ]}
    >
      <ClayCard
        variant="lg"
        color={getCardColor()}
        style={styles.topicCardInner}
      >
        <View style={styles.topicHeader}>
          <Text style={styles.topicTitle} numberOfLines={2}>
            {topic.title}
          </Text>
          <StatusBadge status={topic.status} />
        </View>

        <Text style={styles.topicDescription} numberOfLines={2}>
          {topic.description}
        </Text>

        <View style={styles.topicMeta}>
          <Text style={styles.topicMetaText}>
            {topic.lessonCount} {topic.lessonCount === 1 ? 'lesson' : 'lessons'}
          </Text>
          {topic.progress > 0 && (
            <Text style={styles.topicMetaText}>{topic.progress}% complete</Text>
          )}
        </View>

        {topic.progress > 0 && topic.status !== 'COMPLETED' && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${topic.progress}%`,
                  backgroundColor:
                    topic.status === 'CURRENT' ? BRAND.mintGreen : BRAND.skyBlue,
                },
              ]}
            />
          </View>
        )}
      </ClayCard>
    </Pressable>
  );
};

export const LearningPathScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLocale();
  const { courses, loading, refreshing, error, refresh } = useCourses();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const nav = navigation as unknown as {
    navigate: (route: string, params?: object) => void;
    goBack: () => void;
  };

  // Transform courses into learning topics with mock progression states
  const learningTopics: LearningTopic[] = useMemo(() => {
    return courses.slice(0, 6).map((course, index) => {
      let status: TopicStatus = 'LOCKED';
      let progress = 0;

      // Mock progression logic for demo
      if (index === 0) {
        status = 'CURRENT';
        progress = 45;
      } else if (index === 1) {
        status = 'AVAILABLE';
        progress = 0;
      } else if (index === 2) {
        status = 'COMPLETED';
        progress = 100;
      }

      return {
        id: course.course_id,
        title: course.title,
        description: course.description || 'Learn essential vocabulary and phrases',
        status,
        progress,
        lessonCount: 8, // Mock lesson count
        courseId: course.course_id,
      };
    });
  }, [courses]);

  const handleTopicPress = useCallback(
    (topic: LearningTopic) => {
      if (topic.status === 'LOCKED') {
        return;
      }
      setSelectedTopicId(topic.id);
      // Navigate to course detail for now
      if (topic.courseId) {
        nav.navigate('CourseDetail', {
          courseId: topic.courseId,
          courseTitle: topic.title,
        });
      }
    },
    [nav]
  );

  if (loading && learningTopics.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Lộ trình học</Text>
          <Text style={styles.subtitle}>Chọn hành trình của bạn</Text>
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

        <View style={styles.topicGrid}>
          {learningTopics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} onPress={handleTopicPress} />
          ))}
        </View>

        {learningTopics.length === 0 && !loading && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No learning paths available</Text>
            <ClayButton
              color="blue"
              style={styles.emptyButton}
              onPress={() => void refresh()}
            >
              Refresh
            </ClayButton>
          </View>
        )}

        <ClayButton
          color="blue"
          style={styles.backButton}
          onPress={() => nav.goBack()}
        >
          Back to home
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundBase,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
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
  topicGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  topicCard: {
    marginBottom: SPACING.sm,
  },
  topicCardDisabled: {
    opacity: 0.5,
  },
  topicCardPressed: {
    opacity: 0.8,
  },
  topicCardInner: {
    padding: SPACING.md,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  topicTitle: {
    flex: 1,
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.claySm,
  },
  statusEmoji: {
    fontSize: 18,
  },
  topicDescription: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  topicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicMetaText: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: withOpacity(COLORS.textMuted, 0.15),
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  emptyState: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT.sizes.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  emptyButton: {
    minWidth: 120,
  },
  backButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
});

export default LearningPathScreen;
