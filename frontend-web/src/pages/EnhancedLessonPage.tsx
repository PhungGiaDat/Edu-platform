/**
 * Enhanced Lesson Player Page
 * Duolingo-inspired lesson system with video, gallery, and progress tracking
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';
import { ImageGallery } from '@/components/EnhancedImageGallery';
import { Flashcard } from '@/components/Flashcard';
import { Quiz } from '@/components/Quiz';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { enhancedCourseService, type StartSessionResponse } from '@/services/EnhancedCourseService';
import type {
  LessonEnhanced,
  LessonProgressEnhanced,
  VideoContent,
  ImageGallery as ImageGalleryType,
  VocabularyItemEnhanced,
  QuizSection,
  SectionProgress,
  VocabularyMastery,
} from '@/types/enhancedLesson';

interface EnhancedLessonPageProps {
  lessonId?: string;
}

type LessonStep = 'introduction' | 'vocabulary' | 'practice' | 'quiz' | 'complete';

const stepColors: Record<LessonStep, string> = {
  introduction: '#EAF5FF',
  vocabulary: '#EEF9E7',
  practice: '#FFF1D7',
  quiz: '#FFE7E3',
  complete: '#FFF8D8',
};

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
  const [isCompleting, setIsCompleting] = useState(false);

  // Vocabulary practice state
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [vocabMastery, setVocabMastery] = useState<Map<string, VocabularyMastery>>(new Map());
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Video state
  const [videoCompleted, setVideoCompleted] = useState(false);

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

        // Initialize vocabulary mastery map
        const masteryMap = new Map<string, VocabularyMastery>();
        sessionData.progress.vocabulary_mastery.forEach((m) => {
          masteryMap.set(m.word_id, m);
        });
        setVocabMastery(masteryMap);

        // Determine starting step based on progress
        if (sessionData.progress.overall_progress > 0) {
          const completedSections = sessionData.progress.completed_sections;
          if (completedSections.includes('introduction') && lesson?.introduction_video) {
            if (completedSections.includes('vocabulary') && lesson.vocabulary?.length) {
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

  // Handle vocabulary practice
  const handleVocabCorrect = useCallback(async (wordId: string) => {
    if (!lesson?.vocabulary) return;

    try {
      const result = await enhancedCourseService.submitVocabularyPractice(lessonId!, {
        userId: learnerId,
        lessonId: lessonId!,
        sessionId: session!.session_id,
        wordId,
        isCorrect: true,
      });

      // Update local mastery
      const newMastery = new Map(vocabMastery);
      result.mastery.forEach((m) => newMastery.set(m.word_id, m));
      setVocabMastery(newMastery);

      // Move to next word or complete section
      if (currentVocabIndex < lesson.vocabulary.length - 1) {
        setCurrentVocabIndex((prev) => prev + 1);
        setShowFlashcardAnswer(false);
      } else {
        // All vocabulary practiced
        await updateProgress('vocabulary', 100, 100);
      }
    } catch (err) {
      console.error('[EnhancedLessonPage] vocab practice error:', err);
    }
  }, [lesson, lessonId, learnerId, session, currentVocabIndex, vocabMastery, updateProgress]);

  const handleVocabIncorrect = useCallback(() => {
    // Just show feedback, user can try again
  }, []);

  // Handle quiz submission
  const handleQuizSubmit = useCallback(async () => {
    if (!lesson?.quiz) return;

    // Calculate score
    let correct = 0;
    lesson.quiz.questions.forEach((q) => {
      const answer = quizAnswers[q.question_id];
      const correctOption = q.options.find((o) => o.is_correct);
      if (correctOption && answer === correctOption.option_id) {
        correct++;
      }
    });

    const score = Math.round((correct / lesson.quiz.questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    await updateProgress('quiz', 100, score);
  }, [lesson, quizAnswers, updateProgress]);

  // Handle lesson completion
  const handleCompleteLesson = useCallback(async () => {
    if (!lesson) return;

    setIsCompleting(true);
    try {
      const masteredVocab = Array.from(vocabMastery.values())
        .filter((m) => m.is_mastered)
        .map((m) => m.word_id);

      const result = await enhancedCourseService.completeLesson(lessonId!, {
        userId: learnerId,
        sessionId: session!.session_id,
        totalTimeSpent: 0,
        finalScore: quizScore || 0,
        vocabularyLearned: masteredVocab,
        quizScore: quizScore || undefined,
      });

      if (result.success) {
        setProgress(result.updated_progress);
        // Show celebration/reward
        setCurrentStep('complete');
      }
    } catch (err) {
      console.error('[EnhancedLessonPage] complete error:', err);
    } finally {
      setIsCompleting(false);
    }
  }, [lesson, lessonId, learnerId, session, vocabMastery, quizScore]);

  // Navigation
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
    if (lesson.vocabulary && lesson.vocabulary.length > 0) {
      steps.push('vocabulary');
    }
    if (lesson.quiz && lesson.quiz.questions.length > 0) {
      steps.push('quiz');
    }
    steps.push('complete');
    return steps;
  }, [lesson]);

  // Get current step index
  const currentStepIndex = availableSteps.indexOf(currentStep);
  const overallProgress = progress
    ? Math.round(
        availableSteps.reduce((sum, step, idx) => {
          if (idx < currentStepIndex) return sum + 100;
          if (idx === currentStepIndex) return sum + (progress.overall_progress || 0);
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
              {progress?.overall_progress || 0}%
            </span>
            <span className="text-sm font-bold text-slate-500">{lesson.xp_reward} XP</span>
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
          {availableSteps.map((step, idx) => (
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
        {currentStep === 'introduction' && lesson.introduction_video && (
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
              src={`/${lesson.introduction_video.primary_source.bucket}/${lesson.introduction_video.primary_source.path}`}
              thumbnailUrl={`/${lesson.introduction_video.thumbnail.bucket}/${lesson.introduction_video.thumbnail.path}`}
              title={lesson.introduction_video.title}
              captions={lesson.introduction_video.captions}
              chapterMarkers={lesson.introduction_video.chapter_markers}
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
        {currentStep === 'vocabulary' && lesson.vocabulary && (
          <section className="space-y-6">
            <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {locale === 'vi' ? 'Từ vựng' : 'Vocabulary'}
                  </h2>
                  <p className="mt-1 text-slate-500">
                    {currentVocabIndex + 1} / {lesson.vocabulary.length}
                  </p>
                </div>
                <div className="h-8 w-32 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${((currentVocabIndex + 1) / lesson.vocabulary.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Vocabulary Gallery */}
            {lesson.vocabulary_gallery && (
              <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
                <ImageGallery gallery={lesson.vocabulary_gallery} locale={locale} />
              </div>
            )}

            {/* Flashcard Practice */}
            {lesson.vocabulary.length > 0 && (
              <div className="rounded-3xl border-4 border-white bg-[#EEF9E7] p-6 shadow-lg">
                <Flashcard
                  word={lesson.vocabulary[currentVocabIndex].word_en}
                  translation={lesson.vocabulary[currentVocabIndex].word_vi}
                  imageUrl={`/${lesson.vocabulary[currentVocabIndex].image.bucket}/${lesson.vocabulary[currentVocabIndex].image.path}`}
                  audioUrl={`/${lesson.vocabulary[currentVocabIndex].audio.bucket}/${lesson.vocabulary[currentVocabIndex].audio.path}`}
                  exampleSentence={locale === 'vi' ? lesson.vocabulary[currentVocabIndex].example_sentence_vi : lesson.vocabulary[currentVocabIndex].example_sentence_en}
                  isFlipped={showFlashcardAnswer}
                  onFlip={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
                  onCorrect={() => handleVocabCorrect(lesson.vocabulary[currentVocabIndex].word_id)}
                  onIncorrect={handleVocabIncorrect}
                />

                {/* Mastery indicator */}
                {vocabMastery.has(lesson.vocabulary[currentVocabIndex].word_id) && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Mastery:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-3 w-3 rounded-full ${
                            (vocabMastery.get(lesson.vocabulary[currentVocabIndex].word_id)?.mastery_level || 0) >= level
                              ? 'bg-green-500'
                              : 'bg-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (currentVocabIndex > 0) {
                    setCurrentVocabIndex((prev) => prev - 1);
                    setShowFlashcardAnswer(false);
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
            </div>

            <div className="rounded-3xl border-4 border-white bg-[#FFE7E3] p-6 shadow-lg">
              <Quiz
                questions={lesson.quiz.questions.map((q) => ({
                  question_id: q.question_id,
                  type: q.type as 'image_choice' | 'sound_choice' | 'word_choice',
                  prompt_vi: q.question_vi,
                  questionAudioText: q.question,
                  options: q.options.map((o) => ({
                    option_id: o.option_id,
                    label: o.text,
                    image: o.image,
                  })),
                  correctOptionId: q.options.find((o) => o.is_correct)?.option_id || '',
                  feedbackCorrect: '',
                  feedbackIncorrect: '',
                }))}
                answers={quizAnswers}
                onAnswer={(questionId, optionId) => {
                  setQuizAnswers((prev) => ({ ...prev, [questionId]: optionId }));
                  setQuizSubmitted(false);
                }}
              />
            </div>

            {/* Quiz Results */}
            {quizSubmitted && quizScore !== null && (
              <div className="rounded-3xl border-4 border-white bg-white p-6 text-center shadow-lg">
                <p className="text-4xl font-black text-slate-800">{quizScore}%</p>
                <p className={`mt-2 text-lg font-bold ${quizScore >= 70 ? 'text-green-600' : 'text-rose-600'}`}>
                  {quizScore >= 70
                    ? locale === 'vi'
                      ? 'Tuyệt vời! Bạn đã qua!'
                      : 'Great job! You passed!'
                    : locale === 'vi'
                    ? 'Cố gắng lên! Hãy thử lại.'
                    : 'Keep trying! You can do it.'}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => goToStep('vocabulary')}
                className="rounded-2xl border-4 border-white bg-white px-6 py-3 font-bold text-slate-700 shadow transition-all hover:bg-slate-50"
              >
                ← {locale === 'vi' ? 'Quay lại' : 'Back'}
              </button>

              {!quizSubmitted ? (
                <button
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(quizAnswers).length < lesson.quiz!.questions.length}
                  className="rounded-2xl border-4 border-white bg-yellow-400 px-6 py-3 font-bold text-slate-800 shadow transition-all hover:bg-yellow-500 disabled:opacity-50"
                >
                  {locale === 'vi' ? 'Nộp bài' : 'Submit'} ({Object.keys(quizAnswers).length}/{lesson.quiz!.questions.length})
                </button>
              ) : (
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
                  <p className="text-3xl font-black text-yellow-600">{lesson.xp_reward}</p>
                  <p className="text-sm text-slate-500">XP</p>
                </div>
                <div className="rounded-2xl bg-green-100 p-4">
                  <p className="text-3xl font-black text-green-600">
                    {Array.from(vocabMastery.values()).filter((m) => m.is_mastered).length}
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
            {progress?.earned_badges && progress.earned_badges.length > 0 && (
              <div className="rounded-3xl border-4 border-white bg-white p-6 shadow-lg">
                <h3 className="text-xl font-bold text-slate-800">
                  {locale === 'vi' ? 'Huy hiệu đã nhận' : 'Badges Earned'}
                </h3>
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  {progress.earned_badges.map((badge) => (
                    <div
                      key={badge.badge_id}
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
