/**
 * QuizActivityRenderer — learner-safe runtime for one schema-v2 quiz activity.
 *
 * Question ordering and answer authority belong to the backend lesson session.
 * This component only presents hydrated questions and forwards selected identity.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ClayButton } from './ClayButton';
import { ClayCard } from './ClayCard';
import { coursesApi } from '../services/api';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';
import type {
  LessonActivity,
  QuizActivityAnswerResult,
  QuizActivityHydration,
  QuizActivityQuestion,
} from '../types/course';
import { createQuizAnswerPayload, isRenderableQuizQuestion } from './quizActivityRuntime';

type QuizActivity = Extract<LessonActivity, { type: 'quiz' }>;

export interface QuizActivityRendererProps {
  activity: QuizActivity;
  courseId: string;
  lessonId: string;
  onComplete: () => void;
}

const feedbackMessage = (result: QuizActivityAnswerResult): string =>
  result.correct ? 'Chính xác! Con làm rất tốt.' : 'Chưa đúng, nhưng con đã cố gắng rất tốt.';

export const QuizActivityRenderer: React.FC<QuizActivityRendererProps> = ({
  activity,
  courseId,
  lessonId,
  onComplete,
}) => {
  const [hydration, setHydration] = useState<QuizActivityHydration | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<QuizActivityAnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHydration(null);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setAnswerResult(null);

    try {
      const response = await coursesApi.getQuizActivity(courseId, lessonId, activity.activity_id);
      const nextHydration = response.data;
      if (
        nextHydration.activity_id !== activity.activity_id ||
        !Array.isArray(nextHydration.questions) ||
        nextHydration.questions.length === 0
      ) {
        setError('Bài kiểm tra này chưa có câu hỏi để học.');
        return;
      }
      if (!nextHydration.questions.every(isRenderableQuizQuestion)) {
        setError('Nội dung bài kiểm tra chưa phù hợp để hiển thị.');
        return;
      }

      // Keep the backend/session-provided order exactly as hydrated.
      setHydration(nextHydration);
    } catch {
      setError('Không thể tải bài kiểm tra. Con thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }, [activity.activity_id, courseId, lessonId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const currentQuestion = hydration?.questions[currentIndex] ?? null;
  const isFinalQuestion = Boolean(hydration && currentIndex === hydration.questions.length - 1);
  const canSelect = !submitting && answerResult === null;

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || !selectedOptionId || submitting || answerResult) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await coursesApi.submitQuizActivityAnswer(
        courseId,
        lessonId,
        activity.activity_id,
        createQuizAnswerPayload(currentQuestion, selectedOptionId),
      );
      setAnswerResult(response.data);
    } catch {
      // Keep the selected identity in local presentation state so a transport
      // failure can be retried. Correctness is never inferred locally.
      setError('Không thể gửi câu trả lời. Con thử lại nhé!');
    } finally {
      setSubmitting(false);
    }
  }, [activity.activity_id, answerResult, courseId, currentQuestion, lessonId, selectedOptionId, submitting]);

  const handleNext = useCallback(() => {
    if (!answerResult || !hydration) return;

    if (answerResult.completed) {
      onComplete();
      return;
    }
    if (isFinalQuestion) {
      setError('Máy chủ chưa xác nhận hoàn thành bài kiểm tra.');
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedOptionId(null);
    setAnswerResult(null);
    setError(null);
  }, [answerResult, hydration, isFinalQuestion, onComplete]);

  const progressLabel = useMemo(() => {
    if (!hydration) return null;
    return `Câu ${currentIndex + 1} / ${hydration.questions.length}`;
  }, [currentIndex, hydration]);

  if (loading) {
    return (
      <ClayCard variant="lg" style={styles.stateCard}>
        <ActivityIndicator size="large" color={BRAND.skyBlue} />
        <Text style={styles.stateText}>Đang chuẩn bị câu hỏi…</Text>
      </ClayCard>
    );
  }

  if (error && !currentQuestion) {
    return (
      <ClayCard variant="lg" color="white" style={styles.stateCard}>
        <Text style={styles.errorTitle}>Chưa thể mở bài kiểm tra</Text>
        <Text style={styles.stateText}>{error}</Text>
        <ClayButton color="blue" onPress={() => void hydrate()}>
          Thử lại
        </ClayButton>
      </ClayCard>
    );
  }

  if (!currentQuestion || !hydration) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progressLabel}>{progressLabel}</Text>
      {activity.instructions ? <Text style={styles.instructions}>{activity.instructions}</Text> : null}
      <ClayCard variant="lg" color="white" style={styles.questionCard}>
        <Text style={styles.questionType}>
          {currentQuestion.question_type === 'true_false' ? 'ĐÚNG HAY SAI?' : 'CHỌN ĐÁP ÁN'}
        </Text>
        <Text style={styles.prompt}>{currentQuestion.prompt}</Text>
      </ClayCard>

      <View style={styles.options}>
        {currentQuestion.options.map((option) => {
          const isSelected = selectedOptionId === option.option_id;
          return (
            <ClayCard
              key={option.option_id}
              variant="md"
              color={isSelected ? 'blue' : 'white'}
              onPress={canSelect ? () => setSelectedOptionId(option.option_id) : undefined}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </ClayCard>
          );
        })}
      </View>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      {answerResult ? (
        <ClayCard
          variant="md"
          color={answerResult.correct ? 'green' : 'yellow'}
          style={styles.feedbackCard}
        >
          <Text style={styles.feedbackTitle}>{answerResult.correct ? 'Giỏi lắm! 🎉' : 'Cùng tiếp tục nhé! 💪'}</Text>
          <Text style={styles.feedbackText}>{feedbackMessage(answerResult)}</Text>
          <ClayButton color="blue" onPress={handleNext} style={styles.nextButton}>
            {answerResult.completed ? 'Hoàn thành bài kiểm tra' : 'Câu tiếp theo'}
          </ClayButton>
        </ClayCard>
      ) : (
        <ClayButton
          color="blue"
          onPress={() => void handleSubmit()}
          disabled={!selectedOptionId}
          loading={submitting}
        >
          {error ? 'Gửi lại câu trả lời' : 'Kiểm tra đáp án'}
        </ClayButton>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  stateCard: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  stateText: { color: COLORS.textSecondary, fontSize: FONT.sizes.md, fontWeight: '600', textAlign: 'center' },
  errorTitle: { color: COLORS.textPrimary, fontSize: FONT.sizes.lg, fontWeight: '800', textAlign: 'center' },
  progressLabel: { color: BRAND.skyBlueDark, fontSize: FONT.sizes.sm, fontWeight: '800', textAlign: 'center' },
  instructions: { color: COLORS.textSecondary, fontSize: FONT.sizes.sm, fontWeight: '600', textAlign: 'center' },
  questionCard: { gap: SPACING.sm },
  questionType: { color: BRAND.skyBlueDark, fontSize: FONT.sizes.xs, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  prompt: { color: COLORS.textPrimary, fontSize: FONT.sizes.xl, fontWeight: '800', lineHeight: 28, textAlign: 'center' },
  options: { gap: SPACING.sm },
  optionCard: { borderWidth: 2, borderColor: 'transparent' },
  optionCardSelected: { borderColor: withOpacity(BRAND.skyBlueDark, 0.65) },
  optionText: { color: COLORS.textPrimary, fontSize: FONT.sizes.md, fontWeight: '700', textAlign: 'center' },
  optionTextSelected: { color: COLORS.textPrimary },
  inlineError: { color: BRAND.coralPinkDark, fontSize: FONT.sizes.sm, fontWeight: '700', textAlign: 'center' },
  feedbackCard: { gap: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.lg },
  feedbackTitle: { color: COLORS.textPrimary, fontSize: FONT.sizes.lg, fontWeight: '800', textAlign: 'center' },
  feedbackText: { color: COLORS.textSecondary, fontSize: FONT.sizes.md, fontWeight: '600', textAlign: 'center' },
  nextButton: { alignSelf: 'stretch', marginTop: SPACING.xs },
});

export default QuizActivityRenderer;
