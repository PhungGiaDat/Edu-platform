import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { LessonPlayerSkeleton } from '@/shared/components/feedback/Skeleton';
import { RewardPopup } from '@/features/courses/components/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { apiClient } from '@/services/apiClient';
import { AudioService } from '@/services/AudioService';
import { courseService } from '@/services/CourseService';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import type {
  Course,
  Lesson,
  LessonSession,
  QuizSubmitResult,
  Reward,
} from '@/types/course';

import {
  LessonShell,
  WarmUpSection,
  LessonVideoSection,
  VocabularySection,
  ListenChooseSection,
  MatchSection,
  ARFlashcardSection,
  MiniGamesSection,
  QuizSection,
  RewardSection,
  JOURNEY_STEPS,
  type JourneyStepId,
  type PracticeResult,
} from '@/features/courses/components/lesson';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

export const LessonPlayer: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { locale } = useLocale();

  const learnerId = getLearnerId(user?.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Stepper & Activities State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<JourneyStepId>>(new Set());

  // Interactive activities state
  const [isWatched, setIsWatched] = useState(false);
  const [practicedWords, setPracticedWords] = useState<Record<string, PracticeResult>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [isLessonFinished, setIsLessonFinished] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = {
    en: {
      lessonNotFound: 'Lesson not found or failed to load.',
      back: 'Back to Courses',
      stepSaved: 'Progress recorded!',
      quizPassed: 'Great job! You passed the quiz.',
      quizRetry: 'Keep trying! You can retake the quiz.',
      lessonCompleted: 'Lesson complete! Progress saved to your profile.',
    },
    vi: {
      lessonNotFound: 'Không tìm thấy bài học hoặc có lỗi khi tải.',
      back: 'Quay lại danh sách',
      stepSaved: 'Đã lưu tiến độ thành công!',
      quizPassed: 'Xuất sắc! Bé đã vượt qua bài kiểm tra.',
      quizRetry: 'Cố gắng lên nhé! Bé có thể làm lại bài kiểm tra.',
      lessonCompleted: 'Chúc mừng bé! Đã hoàn thành bài học và lưu kết quả.',
    },
  }[locale];

  // Map backend steps to frontend journey
  const syncSessionProgress = (sessionData?: LessonSession | null) => {
    if (!sessionData?.steps) return;
    const completedSet = new Set<JourneyStepId>();

    sessionData.steps.forEach((step) => {
      if (step.status === 'completed') {
        if (step.step_id === 'intro') completedSet.add('warmup');
        if (step.step_id === 'watch') {
          completedSet.add('video');
          setIsWatched(true);
        }
        if (step.step_id === 'words') {
          completedSet.add('vocabulary');
          completedSet.add('listen_choose');
          completedSet.add('match');
        }
        if (step.step_id === 'game') completedSet.add('mini_game');
        if (step.step_id === 'quiz') completedSet.add('quiz');
        if (step.step_id === 'finish') {
          completedSet.add('reward');
          setIsLessonFinished(true);
        }
      }
    });

    setCompletedSteps(completedSet);
  };

  // Load Course, Lesson, and Session on mount
  useEffect(() => {
    if (!courseId || !lessonId) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);
    setQuizResult(null);
    setReward(null);

    Promise.allSettled([
      courseService.getCourse(courseId),
      courseService.getLesson(courseId, lessonId),
      isGuest
        ? Promise.resolve(null)
        : courseService.startLessonSession(courseId, lessonId, learnerId),
    ])
      .then(([courseRes, lessonRes, sessionRes]) => {
        if (courseRes.status === 'fulfilled') {
          setCourse(courseRes.value);
        }

        if (lessonRes.status === 'fulfilled' && lessonRes.value) {
          const lessonData = lessonRes.value;
          setLesson(lessonData);

          let sessionData: LessonSession | null = null;
          if (sessionRes.status === 'fulfilled') {
            sessionData = sessionRes.value;
            setSession(sessionData);
          }

          syncSessionProgress(sessionData);
          setSessionStartTime(Date.now());
        } else {
          setError(copy.lessonNotFound);
        }
      })
      .catch((loadError) => {
        console.error('[LessonPlayer] load error:', loadError);
        setError(copy.lessonNotFound);
      })
      .finally(() => setIsLoading(false));
  }, [courseId, lessonId, learnerId, isGuest]);

  // Submit Step Attempt to Backend Session
  const trySubmitBackendStep = async (
    stepId: string,
    payload: {
      passed: boolean;
      score: number;
      attemptType?: string;
      responseData?: Record<string, unknown>;
      masteryWords?: string[];
    }
  ) => {
    if (!courseId || !lessonId || !session) return null;

    // Check if backend step exists in session
    const backendStep = session.steps.find((s) => s.step_id === stepId);
    if (!backendStep) return null;

    // Backend validates step_id === session.current_step_id
    if (session.current_step_id !== stepId) {
      console.log(`[LessonPlayer] Step ${stepId} is not current backend step (${session.current_step_id}), skipping API call.`);
      return null;
    }

    try {
      const nextSession = await courseService.submitLessonStep(courseId, lessonId, {
        user_id: learnerId,
        step_id: stepId,
        attempt_type: payload.attemptType || stepId,
        passed: payload.passed,
        score: payload.score,
        response_data: payload.responseData || {},
        mastery_words: payload.masteryWords || [],
      });
      setSession(nextSession);
      return nextSession;
    } catch (err) {
      console.warn(`[LessonPlayer] submitLessonStep for ${stepId} notice:`, err);
      return null;
    }
  };

  // Step 1: Warm-up completed
  const handleWarmupStart = async () => {
    setCompletedSteps((prev) => new Set(prev).add('warmup'));
    await trySubmitBackendStep('intro', {
      passed: true,
      score: 100,
      attemptType: 'intro_viewed',
      responseData: { intro_viewed: true },
    });
    setCurrentStepIndex(1); // Advance to video
  };

  // Step 2: Video Watched
  const handleVideoWatched = async () => {
    setIsWatched(true);
    setCompletedSteps((prev) => new Set(prev).add('video'));
    await trySubmitBackendStep('watch', {
      passed: true,
      score: 100,
      attemptType: 'video_watched',
      responseData: { watched: true },
    });
    setNotice(copy.stepSaved);
    handleNext();
  };

  const handleQuizRetry = () => {
    setQuizResult(null);
    setQuizAnswers({});
  };

  // Step 3: Vocabulary word practiced
  const handleWordPracticed = async (wordEn: string, result: PracticeResult) => {
    const key = wordEn.toLowerCase();
    const updated = { ...practicedWords, [key]: result };
    setPracticedWords(updated);

    // Save pronunciation attempt to backend
    if (courseId && lessonId) {
      apiClient
        .post('/api/v1/pronunciation/attempt', {
          user_id: learnerId,
          flashcard_qr_id: key,
          spoken_text: result.transcript,
          score: result.score,
          feedback: result.feedback,
          course_id: courseId,
          lesson_id: lessonId,
          section_id: 'words',
          session_id: session?.session_id,
          target_text: wordEn,
        })
        .catch((err) => console.warn('[LessonPlayer] pronunciation log:', err));
    }

    // If at least one or all words passed, mark step completed
    const vocabList = lesson?.vocabulary || [];
    const passedCount = vocabList.filter((v) => updated[v.word_en.toLowerCase()]?.passed).length;
    if (passedCount > 0) {
      setCompletedSteps((prev) => new Set(prev).add('vocabulary'));
    }

    if (passedCount >= vocabList.length && vocabList.length > 0) {
      await trySubmitBackendStep('words', {
        passed: true,
        score: Math.round(
          Object.values(updated).reduce((sum, r) => sum + r.score, 0) / vocabList.length
        ),
        attemptType: 'word_practice',
        responseData: { completed_words: passedCount, total_words: vocabList.length },
        masteryWords: vocabList.map((v) => v.word_en),
      });
    }
  };

  // Step 4: Listen & Choose Completed
  const handleListenChooseComplete = () => {
    setCompletedSteps((prev) => new Set(prev).add('listen_choose'));
    setNotice(copy.stepSaved);
  };

  // Step 5: Match Completed
  const handleMatchComplete = () => {
    setCompletedSteps((prev) => new Set(prev).add('match'));
    setNotice(copy.stepSaved);
  };

  // Step 6: AR Flashcards Continued
  const handleARContinue = () => {
    setCompletedSteps((prev) => new Set(prev).add('ar_flashcards'));
    setCurrentStepIndex(6); // Advance to Mini Games
  };

  // Step 7: Mini Games Completed
  const handleMiniGameComplete = async () => {
    setCompletedSteps((prev) => new Set(prev).add('mini_game'));
    await trySubmitBackendStep('game', {
      passed: true,
      score: 100,
      attemptType: 'mini_game_completed',
      responseData: { game_completed: true },
    });
    setNotice(copy.stepSaved);
  };

  // Step 8: Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!courseId || !lessonId || !lesson) return;
    setIsSubmitting(true);
    setNotice(null);

    try {
      const qResult = await courseService.submitQuiz(courseId, lessonId, quizAnswers, learnerId);
      setQuizResult(qResult);

      await AudioService.playSoundEffect(qResult.passed ? 'correct' : 'wrong');

      if (qResult.passed) {
        setCompletedSteps((prev) => new Set(prev).add('quiz'));
        await trySubmitBackendStep('quiz', {
          passed: true,
          score: qResult.score,
          attemptType: 'quiz_submit',
          responseData: { ...qResult },
        });

        if (qResult.reward) {
          setReward(qResult.reward);
          HapticService.reward();
          SoundEffectService.play('success').catch(() => {});
        }
        setNotice(copy.quizPassed);

        // Advance to reward after brief delay
        window.setTimeout(() => {
          setCurrentStepIndex(8);
        }, 1500);
      } else {
        setNotice(copy.quizRetry);
      }
    } catch (err) {
      console.error('[LessonPlayer] submitQuiz error:', err);
      // Client-side fallback scoring if network/backend issue occurs
      const questions = lesson.quiz || [];
      const correctCount = questions.filter(
        (q) => quizAnswers[q.question_id] === q.correctOptionId
      ).length;
      const score = Math.round((correctCount / Math.max(questions.length, 1)) * 100);
      const passed = score >= 70;

      const fallbackResult: QuizSubmitResult = {
        score,
        passed,
        correct: correctCount,
        total: questions.length,
        feedback: [],
        reward: passed ? lesson.reward || undefined : undefined,
      };
      setQuizResult(fallbackResult);
      if (passed) {
        setCompletedSteps((prev) => new Set(prev).add('quiz'));
        if (lesson.reward) setReward(lesson.reward);
        window.setTimeout(() => setCurrentStepIndex(8), 1500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 9: Finish Lesson & Save Authoritative Progress
  const handleFinishLesson = async () => {
    if (!courseId || !lessonId || !lesson) return;
    setIsSubmitting(true);

    try {
      const timeSpentMinutes =
        sessionStartTime > 0 ? Math.ceil((Date.now() - sessionStartTime) / 60000) : 5;
      const wordsLearned = (lesson.vocabulary || []).map((v) => v.word_en);

      await courseService.completeLesson(courseId, lessonId, learnerId, {
        score: quizResult?.score ?? 100,
        timeSpent: timeSpentMinutes,
        wordsLearned,
        gamesPlayed: 1,
      });

      await trySubmitBackendStep('finish', {
        passed: true,
        score: quizResult?.score ?? 100,
        attemptType: 'lesson_complete',
        responseData: { reward_xp: lesson.reward?.xp || 25 },
      });

      setIsLessonFinished(true);
      setCompletedSteps((prev) => new Set(prev).add('reward'));
      if (lesson.reward) setReward(lesson.reward);
      setNotice(copy.lessonCompleted);

      HapticService.reward();
      SoundEffectService.play('success').catch(() => {});
    } catch (err) {
      console.error('[LessonPlayer] completeLesson error:', err);
      setIsLessonFinished(true);
      setCompletedSteps((prev) => new Set(prev).add('reward'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    const currentStepMeta = JOURNEY_STEPS[currentStepIndex];
    if (currentStepMeta.id === 'quiz') {
      handleSubmitQuiz();
    } else if (currentStepMeta.id === 'reward') {
      handleFinishLesson();
    } else {
      setCurrentStepIndex((prev) => Math.min(JOURNEY_STEPS.length - 1, prev + 1));
    }
  };

  const handleReplayLesson = () => {
    setCurrentStepIndex(0);
    setQuizAnswers({});
    setQuizResult(null);
  };

  // Render current step component
  const renderCurrentStepContent = () => {
    if (!lesson) return null;
    const currentStepId = JOURNEY_STEPS[currentStepIndex]?.id;

    switch (currentStepId) {
      case 'warmup':
        return (
          <WarmUpSection
            lesson={lesson}
            course={course}
            onStart={handleWarmupStart}
            locale={locale}
          />
        );

      case 'video':
        return (
          <LessonVideoSection
            lesson={lesson}
            onWatched={handleVideoWatched}
            isWatched={isWatched}
            locale={locale}
          />
        );

      case 'vocabulary':
        return (
          <VocabularySection
            lesson={lesson}
            onWordPracticed={handleWordPracticed}
            practicedWords={practicedWords}
            locale={locale}
            onComplete={handleNext}
          />
        );

      case 'listen_choose':
        return (
          <ListenChooseSection
            lesson={lesson}
            onComplete={handleListenChooseComplete}
            locale={locale}
          />
        );

      case 'match':
        return (
          <MatchSection
            lesson={lesson}
            onComplete={handleMatchComplete}
            locale={locale}
          />
        );

      case 'ar_flashcards':
        return (
          <ARFlashcardSection
            lesson={lesson}
            onContinue={handleARContinue}
            locale={locale}
          />
        );

      case 'mini_game':
        return (
          <MiniGamesSection
            lesson={lesson}
            onComplete={handleMiniGameComplete}
            locale={locale}
          />
        );

      case 'quiz':
        return (
          <QuizSection
            lesson={lesson}
            answers={quizAnswers}
            onAnswerChange={(qId, optId) =>
              setQuizAnswers((prev) => ({ ...prev, [qId]: optId }))
            }
            onSubmit={handleSubmitQuiz}
            isSubmitting={isSubmitting}
            result={quizResult}
            locale={locale}
            onRetry={handleQuizRetry}
          />
        );

      case 'reward':
        return (
          <RewardSection
            course={course}
            lesson={lesson}
            courseId={courseId || ''}
            quizResult={quizResult}
            onFinishLesson={handleFinishLesson}
            isSubmitting={isSubmitting}
            isCompleted={isLessonFinished}
            onReplayLesson={handleReplayLesson}
            locale={locale}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <LessonPlayerSkeleton />;
  }

  if (!lesson || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-xl font-black text-rose-600 mb-4">{error || copy.lessonNotFound}</p>
        <button
          type="button"
          onClick={() => navigate('/courses')}
          className="rounded-2xl border-2 border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-800 shadow-md hover:bg-slate-50 transition-all cursor-pointer"
        >
          ← {copy.back}
        </button>
      </div>
    );
  }

  const currentStepId = JOURNEY_STEPS[currentStepIndex]?.id;
  const hasStepOwnCta = ['warmup', 'video', 'vocabulary', 'ar_flashcards', 'quiz', 'reward'].includes(currentStepId);

  return (
    <>
      <LessonShell
        course={course}
        lesson={lesson}
        courseId={courseId || ''}
        currentStepIndex={currentStepIndex}
        completedSteps={completedSteps}
        onSelectStep={(idx) => setCurrentStepIndex(idx)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isSubmitting={isSubmitting}
        canGoNext={true}
        showFooterNext={!hasStepOwnCta}
        notice={notice}
        locale={locale}
      >
        {renderCurrentStepContent()}
      </LessonShell>

      {reward && <RewardPopup reward={reward} onClose={() => setReward(null)} />}
    </>
  );
};

export default LessonPlayer;
