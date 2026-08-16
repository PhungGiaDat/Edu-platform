import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ClayButton } from './ClayButton';
import { ClayCard } from './ClayCard';
import { useFlashcardAudio } from '../hooks/useFlashcardAudio';
import { coursesApi } from '../services/api';
import { BRAND, COLORS, FONT, RADIUS, SPACING, withOpacity } from '../design/tokens';
import type { LessonActivity, VocabularyActivityHydration } from '../types/course';

type LearnVocabularyActivity = Extract<LessonActivity, { type: 'learn_vocabulary' }>;

export interface LearnVocabularyActivityRendererProps {
  activity: LearnVocabularyActivity;
  courseId: string;
  lessonId: string;
  onComplete: () => void;
}

export const LearnVocabularyActivityRenderer: React.FC<LearnVocabularyActivityRendererProps> = ({
  activity,
  courseId,
  lessonId,
  onComplete,
}) => {
  const [hydration, setHydration] = useState<VocabularyActivityHydration | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isPlaying, playVocabulary, stop } = useFlashcardAudio();

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await coursesApi.getVocabularyActivity(courseId, lessonId, activity.activity_id);
      if (data.activity_id !== activity.activity_id || data.items.length === 0) throw new Error();
      setHydration(data);
      setIndex(0);
    } catch {
      setError('Không thể tải từ vựng. Con thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }, [activity.activity_id, courseId, lessonId]);

  useEffect(() => { void hydrate(); }, [hydrate]);
  const item = hydration?.items[index] ?? null;
  const isLast = Boolean(hydration && index === hydration.items.length - 1);

  const advance = useCallback(async () => {
    if (!hydration || submitting) return;
    if (!isLast) {
      await stop();
      setIndex((value) => value + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await coursesApi.submitLessonStep(courseId, lessonId, {
        step_id: activity.activity_id,
        attempt_type: 'learn_vocabulary',
        passed: true,
        score: 100,
        response_data: { viewed_vocabulary_ids: hydration.items.map((entry) => entry.vocabulary_id) },
        mastery_words: hydration.items.map((entry) => entry.vocabulary_id),
      });
      onComplete();
    } catch {
      setError('Không thể lưu bước học. Con thử lại nhé!');
    } finally {
      setSubmitting(false);
    }
  }, [activity.activity_id, courseId, hydration, isLast, lessonId, onComplete, stop, submitting]);

  if (loading) return <ClayCard><ActivityIndicator color={BRAND.skyBlue} /></ClayCard>;
  if (!item) return <ClayCard><Text style={styles.error}>{error}</Text><ClayButton color="blue" onPress={() => void hydrate()}>Thử lại</ClayButton></ClayCard>;

  return (
    <View style={styles.root}>
      <Text style={styles.progress}>Từ {index + 1} / {hydration?.items.length ?? 0}</Text>
      {activity.instructions ? <Text style={styles.instructions}>{activity.instructions}</Text> : null}
      <ClayCard variant="lg" color="white" style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nghe phát âm"
          onPress={() => void playVocabulary(item.pronunciation_audio.url)}
          style={styles.imageButton}
        >
          <Image source={{ uri: item.illustration.url }} style={styles.image} />
          <View style={styles.audioPill}>
            <Text style={styles.audioText}>{isPlaying ? 'Đang phát…' : '🔊 Chạm để nghe'}</Text>
          </View>
        </Pressable>
      </ClayCard>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ClayButton color="blue" loading={submitting} onPress={() => void advance()}>
        {isLast ? 'Hoàn thành từ vựng' : 'Từ tiếp theo'}
      </ClayButton>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { gap: SPACING.md },
  progress: { color: BRAND.skyBlueDark, fontSize: FONT.sizes.sm, fontWeight: '800', textAlign: 'center' },
  instructions: { color: COLORS.textSecondary, fontSize: FONT.sizes.sm, textAlign: 'center' },
  card: { alignItems: 'center' },
  imageButton: { alignItems: 'center', gap: SPACING.md, width: '100%' },
  image: { width: 220, height: 220, resizeMode: 'contain' },
  audioPill: { backgroundColor: withOpacity(BRAND.skyBlue, 0.15), borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  audioText: { color: BRAND.skyBlueDark, fontSize: FONT.sizes.md, fontWeight: '800' },
  error: { color: BRAND.coralPinkDark, fontSize: FONT.sizes.sm, fontWeight: '700', textAlign: 'center' },
});

export default LearnVocabularyActivityRenderer;
