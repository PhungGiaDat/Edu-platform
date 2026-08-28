/**
 * Enhanced Lesson Player Page
 * Duolingo-inspired lesson system with video, gallery, and progress tracking
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EnhancedVideoPlayer } from '@/features/courses/components/EnhancedVideoPlayer';
import { ImageGallery } from '@/features/courses/components/EnhancedImageGallery';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { enhancedCourseService, type StartSessionResponse } from '@/services/EnhancedCourseService';
import type {
  LessonEnhanced,
  LessonProgressEnhanced,
  VocabularyMasteryRecord,
  GalleryImage,
} from '@/types/enhancedLesson';

interface EnhancedLessonPageProps {
  lessonId?: string;
}

type LessonStep = 'introduction' | 'vocabulary' | 'practice' | 'quiz' | 'complete';

const stepIcons: Record<LessonStep, string> = {
  introduction: '🎬',
  vocabulary: '📚',
  practice: '✏️',
  quiz: '❓',
  complete: '🏆',
};

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

export const EnhancedLessonPage: React.FC<EnhancedLessonPageProps> = ({ lessonId: propLessonId }) => {
  const { lessonId: paramLessonId, courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();

  const lessonId = propLessonId || paramLessonId || '';
  const learnerId = getLearnerId(user?.id);

  // State
  const [lesson, setLesson] = useState<LessonEnhanced | null>(null);
  const [progress, setProgress] = useState<LessonProgressEnhanced | null>(null);
  const [session, setSession] = useState<StartSessionResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>('introduction');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vocabulary practice state
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [vocabMastery, setVocabMastery] = useState<Map<string, VocabularyMasteryRecord>>(new Map());

  // Quiz state
  const [_quizSubmitted, _setQuizSubmitted] = useState(false);
  const [quizScore, _setQuizScore] = useState<number | null>(null);
  const [quizAnswers, _setQuizAnswers] = useState<Record<string, string>>({});

  // Video state
  const [, setVideoCompleted] = useState(false);

  // Load lesson data
  useEffect(() => {
    const loadLesson = async () => {
      if (!lessonId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Start session and get lesson
        const sessionData = await enhancedCourseService.startSession(lessonId, learnerId);
        setSession(sessionData);
        setLesson(sessionData.lesson);
        setProgress(sessionData.progress);

        // Determine starting step based on progress
        if (sessionData.progress.overallProgress > 0) {
          const completedSections = sessionData.progress.completedSections || [];
          if (completedSections.includes('introduction') && lesson?.introductionVideo) {
            if (completedSections.includes('vocabulary') && lesson.vocabularyGallery?.allImages?.length) {
              if (completedSections.includes('quiz') && lesson.quiz) {
                setCurrentStep('complete');
              } else {
                setCurrentStep('quiz');
              }
            } else {
              setCurrentStep('vocabulary');
            }
          }
        }
      } catch (err) {
        console.error('[EnhancedLessonPage] load error:', err);
        setError('Failed to load lesson');
      } finally {
        setIsLoading(false);
      }
    };

    loadLesson();
  }, [lessonId, learnerId]);

  // Update progress
  const updateProgress = useCallback(
    async (sectionId: string, sectionProgress: number, score?: number) => {
      if (!session) return;

      try {
        const result = await enhancedCourseService.submitSectionProgress(lessonId!, {
          userId: learnerId,
          sessionId: session.session_id,
          sectionId,
          progress: sectionProgress,
          timeSpent: 0,
          score,
        });
        setProgress(result.progress);
        return result.progress;
      } catch (err) {
        console.error('[EnhancedLessonPage] progress update error:', err);
      }
    },
    [lessonId, learnerId, session]
  );

  // Handle video completion
  const handleVideoComplete = useCallback(async () => {
    setVideoCompleted(true);
    await updateProgress('introduction', 100, 100);
  }, [updateProgress]);

  // Handle vocabulary gallery selection
  const handleVocabImageSelect = useCallback(
    async (image: GalleryImage, _index: number) => {
      const wordId = image.image_id;
      if (!wordId) return;

      try {
        const result = await enhancedCourseService.submitVocabularyPractice(lessonId, {
          userId: learnerId,
          lessonId,
          sessionId: session?.session_id || '',
          wordId,
          isCorrect: true,
        });
        const newMastery = new Map(vocabMastery);
        const existing = newMastery.get(wordId);
        newMastery.set(wordId, {
          wordId,
          masteryLevel: existing?.masteryLevel ?? 0,
          correctAttempts: existing?.correctAttempts ?? 0,
          incorrectAttempts: existing?.incorrectAttempts ?? 0,
          lastPracticedAt: existing?.lastPracticedAt ?? new Date().toISOString(),
          isMastered: result.success,
        });
        setVocabMastery(newMastery);
      } catch {
        // Non-blocking — vocab practice is optional
      }
    },
    [lessonId, learnerId, session, vocabMastery]
  );

  // Handle quiz answer selection
  const handleQuizAnswer = useCallback((questionId: string, optionId: string) => {
    _setQuizAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }, []);

  // Handle quiz submission
  const handleQuizSubmit = useCallback(async () => {
    if (!lesson?.quiz) return;

    const questions = lesson.quiz.questions;
    if (Object.keys(quizAnswers).length < questions.length) return;

    let correct = 0;
    questions.forEach((q) => {
      const selectedOptionId = quizAnswers[q.question_id];
      const correctOption = q.options.find((o) => o.isCorrect);
      if (correctOption && selectedOptionId === correctOption.option_id) {
        correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    _setQuizSubmitted(true);
    _setQuizScore(score);

    await updateProgress('quiz', 100, score);

    if (score >= 70) {
      await updateProgress('complete', 100, score);
      setCurrentStep('complete');
    }
  }, [lesson, quizAnswers, updateProgress]);

  // Handle quiz exit (skip)
  const handleQuizExit = useCallback(() => {
    goToStep('vocabulary');
  }, []);
  const goToStep = (step: LessonStep) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    const steps: LessonStep[] = ['introduction', 'vocabulary', 'practice', 'quiz', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  // Determine available steps
  const availableSteps = useMemo((): LessonStep[] => {
    if (!lesson) return [];

    const steps: LessonStep[] = ['introduction'];
    if (lesson.vocabularyGallery?.allImages && lesson.vocabularyGallery.allImages.length > 0) {
      steps.push('vocabulary');
    }
    if (lesson.quiz?.questions && lesson.quiz.questions.length > 0) {
      steps.push('quiz');
    }
    steps.push('complete');
    return steps;
  }, [lesson]);

  // Get current step index
  const currentStepIndex = availableSteps.indexOf(currentStep);
  const overallProgress = progress
    ? Math.round(
        availableSteps.reduce((sum, _step, idx) => {
          if (idx < currentStepIndex) return sum + 100;
          if (idx === currentStepIndex) return sum + (progress.overallProgress || 0);
          return sum;
        }, 0) / availableSteps.length
      )
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen clay-bg-playful flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="mt-4 text-xl font-bold text-slate-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen clay-bg-playful flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-rose-600">{error || 'Lesson not found'}</p>
          <button
            onClick={() => navigate('/courses')}
            className="mt-4 rounded-xl bg-yellow-400 px-6 py-3 font-bold text-slate-800"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen clay-bg-playful">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-white bg-white/95 px-4 py-3 shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={() => navigate(courseId ? `/courses/${courseId}` : '/courses')}
            className="flex items-center gap-2 rounded-xl border-4 border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 transition-colors hover:border-slate-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-yellow-400 px-4 py-1 text-sm font-bold text-slate-800">
              {progress?.overallProgress || 0}%
            </span>
            <span className="text-sm font-bold text-slate-500">{lesson.xpReward} XP</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-3 max-w-4xl">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Step tabs */}
      <div className="border-b-4 border-white bg-white px-4 py-2 shadow-sm">
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto">
          {availableSteps.map((step) => (
            <button
              key={step}
              onClick={() => goToStep(step)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl border-4 px-4 py-2 text-sm font-bold transition-all ${
                currentStep === step
                  ? 'border-yellow-400 bg-yellow-400 text-slate-900'
                  : 'border-white bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{stepIcons[step]}</span>
              <span className="capitalize">{step}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Introduction Step */}
        {currentStep === 'introduction' && lesson.introductionVideo && (
          <section className="space-y-6">
            <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
              <h2 className="text-2xl font-black text-slate-800">
                {locale === 'vi' ? 'Giới thiệu' : 'Introduction'}
              </h2>
              <p className="mt-2 text-slate-600">
                {locale === 'vi' ? lesson.description_vi : lesson.description_en}
              </p>
            </div>

            <EnhancedVideoPlayer
              src={`/${lesson.introductionVideo.primarySource.bucket}/${lesson.introductionVideo.primarySource.path}`}
              thumbnailUrl={`/${lesson.introductionVideo.thumbnail.bucket}/${lesson.introductionVideo.thumbnail.path}`}
              title={lesson.introductionVideo.title}
              captions={lesson.introductionVideo.captions}
              chapterMarkers={lesson.introductionVideo.chapterMarkers}
              onEnded={handleVideoComplete}
            />

            <div className="flex justify-center">
              <button
                onClick={nextStep}
                className="rounded-2xl border-4 border-white bg-yellow-400 px-8 py-4 text-xl font-black text-slate-800 shadow-lg transition-all hover:scale-105 hover:bg-yellow-500"
              >
                {locale === 'vi' ? 'Tiếp tục' : 'Continue'} →
              </button>
            </div>
          </section>
        )}

        {/* Vocabulary Step */}
        {currentStep === 'vocabulary' && lesson.vocabularyGallery && lesson.vocabularyGallery.allImages && lesson.vocabularyGallery.allImages.length > 0 && (
          <section className="space-y-6">
            <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {locale === 'vi' ? 'Từ vựng' : 'Vocabulary'}
                  </h2>
                  <p className="mt-1 text-slate-500">
                    {currentVocabIndex + 1} / {lesson.vocabularyGallery.allImages.length}
                  </p>
                </div>
                <div className="h-8 w-32 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${((currentVocabIndex + 1) / (lesson.vocabularyGallery.allImages?.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Vocabulary Gallery */}
            <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
              <ImageGallery
                gallery={lesson.vocabularyGallery}
                locale={locale}
                onImageSelect={handleVocabImageSelect}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (currentVocabIndex > 0) {
                    setCurrentVocabIndex((prev) => prev - 1);
                  } else {
                    goToStep('introduction');
                  }
                }}
                disabled={currentVocabIndex === 0 && currentStepIndex === 0}
                className="rounded-2xl border-4 border-white bg-white px-6 py-3 font-bold text-slate-700 shadow transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                ← {locale === 'vi' ? 'Quay lại' : 'Back'}
              </button>

              <button
                onClick={nextStep}
                className="rounded-2xl border-4 border-white bg-yellow-400 px-6 py-3 font-bold text-slate-800 shadow transition-all hover:bg-yellow-500"
              >
                {locale === 'vi' ? 'Tiếp tục' : 'Continue'} →
              </button>
            </div>
          </section>
        )}

        {/* Quiz Step */}
        {currentStep === 'quiz' && lesson.quiz && (
          <section className="space-y-6">
            <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
              <h2 className="text-2xl font-black text-slate-800">
                {locale === 'vi' ? 'Bài kiểm tra' : 'Quiz'}
              </h2>
              <p className="mt-1 text-slate-500">
                {locale === 'vi' ? 'Hoàn thành bài quiz để nhận phần thưởng!' : 'Complete the quiz to earn your reward!'}
              </p>
              <p className="mt-4 text-lg text-slate-600">
                {lesson.quiz.questions.length} questions
              </p>
            </div>

            {/* Quiz Questions */}
            {lesson.quiz.questions.map((question, qIdx) => (
              <div key={question.question_id} className="rounded-3xl border-4 border-white bg-[#FFE7E3] p-6 shadow-lg">
                <div className="mb-4">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                    {locale === 'vi' ? 'Câu' : 'Question'} {qIdx + 1}
                  </span>
                  {quizAnswers[question.question_id] && (
                    <span className="ml-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mb-4 text-xl font-black text-slate-800">
                  {locale === 'vi' ? question.question_vi : question.question}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option) => {
                    const isSelected = quizAnswers[question.question_id] === option.option_id;
                    return (
                      <button
                        key={option.option_id}
                        onClick={() => handleQuizAnswer(question.question_id, option.option_id)}
                        className={`rounded-2xl border-4 p-4 text-left font-bold transition-all ${
                          isSelected
                            ? 'border-yellow-400 bg-yellow-100 text-slate-900'
                            : 'border-white bg-white text-slate-700 hover:border-yellow-200 hover:bg-yellow-50'
                        }`}
                      >
                        <span className="mr-2">{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Submit Button */}
            {lesson.quiz.questions.length > 0 && Object.keys(quizAnswers).length === lesson.quiz.questions.length && (
              <div className="flex justify-center">
                <button
                  onClick={handleQuizSubmit}
                  className="rounded-2xl border-4 border-white bg-yellow-400 px-8 py-4 text-xl font-black text-slate-800 shadow-lg transition-all hover:scale-105 hover:bg-yellow-500"
                >
                  {locale === 'vi' ? 'Nộp bài' : 'Submit Quiz'}
                </button>
              </div>
            )}

            {Object.keys(quizAnswers).length > 0 && Object.keys(quizAnswers).length < lesson.quiz.questions.length && (
              <p className="text-center text-sm text-slate-500">
                {locale === 'vi'
                  ? `Đã trả lời ${Object.keys(quizAnswers).length} / ${lesson.quiz.questions.length} câu`
                  : `Answered ${Object.keys(quizAnswers).length} / ${lesson.quiz.questions.length} questions`}
              </p>
            )}

            <div className="flex justify-between">
              <button
                onClick={handleQuizExit}
                className="rounded-2xl border-4 border-white bg-white px-6 py-3 font-bold text-slate-700 shadow transition-all hover:bg-slate-50"
              >
                ← {locale === 'vi' ? 'Quay lại' : 'Back'}
              </button>

              {Object.keys(quizAnswers).length < lesson.quiz.questions.length && (
                <button
                  onClick={nextStep}
                  className="rounded-2xl border-4 border-white bg-yellow-400 px-6 py-3 font-bold text-slate-800 shadow transition-all hover:bg-yellow-500"
                >
                  {locale === 'vi' ? 'Tiếp tục' : 'Continue'} →
                </button>
              )}
            </div>
          </section>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <section className="space-y-6 text-center">
            <div className="rounded-3xl border-4 border-yellow-400 bg-white p-8 shadow-xl">
              <div className="text-8xl">🎉</div>
              <h2 className="mt-4 text-3xl font-black text-slate-800">
                {locale === 'vi' ? 'Chúc mừng!' : 'Congratulations!'}
              </h2>
              <p className="mt-2 text-lg text-slate-600">
                {locale === 'vi'
                  ? `Bạn đã hoàn thành bài học "${lesson.title_vi}"`
                  : `You completed "${lesson.title_en}"`}
              </p>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-yellow-100 p-4">
                  <p className="text-3xl font-black text-yellow-600">{lesson.xpReward}</p>
                  <p className="text-sm text-slate-500">XP</p>
                </div>
                <div className="rounded-2xl bg-green-100 p-4">
                  <p className="text-3xl font-black text-green-600">
                    {Array.from(vocabMastery.values()).filter((m) => m.isMastered).length}
                  </p>
                  <p className="text-sm text-slate-500">{locale === 'vi' ? 'Từ đã học' : 'Words learned'}</p>
                </div>
                <div className="rounded-2xl bg-blue-100 p-4">
                  <p className="text-3xl font-black text-blue-600">{quizScore || 0}%</p>
                  <p className="text-sm text-slate-500">{locale === 'vi' ? 'Điểm quiz' : 'Quiz score'}</p>
                </div>
              </div>
            </div>

            {/* Badges earned */}
            {progress?.earnedBadges && progress.earnedBadges.length > 0 && (
              <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800">
                  {locale === 'vi' ? 'Huy hiệu đã nhận' : 'Badges Earned'}
                </h3>
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  {progress.earnedBadges.map((badge) => (
                    <div
                      key={badge.badgeId}
                      className="flex flex-col items-center rounded-2xl bg-yellow-50 p-4"
                    >
                      <span className="text-4xl">{badge.icon}</span>
                      <span className="mt-2 font-bold text-slate-700">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate(courseId ? `/courses/${courseId}` : '/courses')}
                className="rounded-2xl border-4 border-white bg-white px-6 py-3 font-bold text-slate-700 shadow transition-all hover:bg-slate-50"
              >
                {locale === 'vi' ? 'Quay lại khóa học' : 'Back to Course'}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="rounded-2xl border-4 border-white bg-yellow-400 px-6 py-3 font-bold text-slate-800 shadow transition-all hover:bg-yellow-500"
              >
                {locale === 'vi' ? 'Học lại' : 'Practice Again'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default EnhancedLessonPage;
