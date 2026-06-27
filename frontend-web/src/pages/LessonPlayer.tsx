import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { AssetTile, ImageQuiz, RewardPopup } from '@/components/courses/CourseLearningBlocks';
import { LessonMedia } from '@/components/LessonMedia';
import { LessonVideoPlayer } from '@/components/LessonVideoPlayer';
import { LessonImageGallery } from '@/components/LessonImageGallery';
import { SceneViewer } from '@/components/SceneViewer';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { eventBus } from '@/runtime/EventBus';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { cleanText, lessonDescription, lessonTitle } from '@/lib/courseLocale';
import { apiClient } from '@/services/apiClient';
import { AudioService } from '@/services/AudioService';
import { courseService } from '@/services/CourseService';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { getPronunciationService, type PronunciationResult } from '@/services/PronunciationService';
import type {
  AssetReference,
  Lesson,
  LessonSession,
  LessonSessionStepState,
  QuizSubmitResult,
  Reward,
  VocabularyItem,
} from '@/types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

const shellTone = (stepId?: string) => {
  switch (stepId) {
    case 'intro':
      return '#FFF8D8';
    case 'watch':
      return '#EAF5FF';
    case 'story':
      return '#FFE7E3';
    case 'game':
      return '#FFF1D7';
    case 'words':
      return '#EEF9E7';
    case 'read':
      return '#FFE7E3';
    case 'say':
      return '#EAF5FF';
    case 'quiz':
      return '#FFF1D7';
    case 'finish':
      return '#FFF8D8';
    default:
      return '#F7FBFF';
  }
};

type PracticeSummary = {
  transcript: string;
  score: number;
  passed: boolean;
  feedback: string;
};

const normalizeKey = (value: string) => value.trim().toLowerCase();

const resolveAudioUrl = (asset?: AssetReference | null) => getAssetCandidateUrls(asset)[0] || undefined;

const statusTone = (status?: LessonSessionStepState['status']) => {
  if (status === 'completed') return '#EEF9E7';
  if (status === 'needs_retry') return '#FFE7E3';
  if (status === 'in_progress') return '#EAF5FF';
  return '#FFFFFF';
};

const StatusPill: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = '#FFFFFF' }) => (
  <span
    className="inline-flex rounded-full border-4 border-white px-3 py-1 text-xs font-black text-slate-700 shadow-[0_4px_0_rgba(15,23,42,0.08)]"
    style={{ background: tone }}
  >
    {children}
  </span>
);

const ActionButton: React.FC<{
  children: React.ReactNode;
  tone?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, tone = '#FFD93D', onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="min-h-12 rounded-[20px] border-4 border-white px-4 py-3 text-sm font-black text-slate-800 shadow-[0_6px_0_rgba(148,163,184,0.14)] transition disabled:cursor-not-allowed disabled:opacity-50"
    style={{ background: tone }}
  >
    {children}
  </button>
);

const PracticeFeedback: React.FC<{ result?: PracticeSummary | null; emptyText: string }> = ({ result, emptyText }) => (
  <div className="rounded-[24px] border-4 border-white bg-white/90 p-4 shadow-[0_6px_0_rgba(148,163,184,0.08)]">
    {result ? (
      <>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={result.passed ? '#EEF9E7' : '#FFE7E3'}>{result.passed ? 'Passed' : 'Try again'}</StatusPill>
          <StatusPill tone="#EAF5FF">{result.score}%</StatusPill>
        </div>
        <p className="mt-3 text-sm font-black text-slate-700">{result.feedback}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">Heard: {result.transcript || '...'}</p>
      </>
    ) : (
      <p className="text-sm font-semibold text-slate-500">{emptyText}</p>
    )}
  </div>
);

const LessonMediaPreview: React.FC<{
  title: string;
  asset?: AssetReference | null;
  thumbnail?: AssetReference | null;
}> = ({ title, asset, thumbnail }) => {
  const videoCandidates = useMemo(() => getAssetCandidateUrls(asset), [asset]);
  const posterCandidates = useMemo(() => getAssetCandidateUrls(thumbnail), [thumbnail]);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [videoCandidates]);

  const currentUrl = videoCandidates[candidateIndex] || posterCandidates[0] || null;
  const posterUrl = posterCandidates[0];

  if (!currentUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[26px] bg-[#6EB9FF] px-4 text-center text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.55)]">
        <div>
          <div className="text-6xl font-black">Play</div>
          <p className="mt-3 text-2xl font-black">{title}</p>
        </div>
      </div>
    );
  }

  if (/\.mp4($|\?)/i.test(currentUrl) || /\.webm($|\?)/i.test(currentUrl)) {
    return (
      <video
        key={currentUrl}
        className="aspect-video w-full rounded-[26px] object-cover"
        controls
        playsInline
        preload="metadata"
        poster={posterUrl}
        onError={() => setCandidateIndex((current) => current + 1)}
      >
        <source src={currentUrl} />
      </video>
    );
  }

  return (
    <img
      src={currentUrl}
      alt={title}
      className="aspect-video w-full rounded-[26px] object-cover"
      onError={() => setCandidateIndex((current) => current + 1)}
    />
  );
};

export const LessonPlayer: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();

  const learnerId = getLearnerId(user?.id);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [gameFeedback, setGameFeedback] = useState<{ choiceId?: string; correct: boolean; message: string } | null>(null);
  const [wordPractice, setWordPractice] = useState<Record<string, PracticeSummary>>({});
  const [readPractice, setReadPractice] = useState<Record<string, PracticeSummary>>({});
  const [sayPractice, setSayPractice] = useState<Record<string, PracticeSummary>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = {
    en: {
      lessonNotFound: 'Lesson not found.',
      loadingLesson: 'Opening lesson...',
      back: 'Back',
      sections: 'Sections',
      intro: 'Intro',
      watch: 'Watch',
      story: 'Story',
      words: 'Words',
      read: 'Read',
      say: 'Say',
      game: 'Game',
      quiz: 'Quiz',
      finish: 'Finish',
      introTitle: 'Watch & Learn',
      storyTitle: 'Short video story',
      gameTitle: 'Quick game',
      wordsTitle: 'New words',
      readTitle: 'Read with Momo',
      sayTitle: 'Say it aloud',
      rewardTitle: 'Earn reward',
      readyReward: 'Ready for your reward?',
      finishPrompt: 'Finish the lesson and save your progress.',
      previous: 'Previous',
      next: 'Next',
      grading: 'Grading...',
      passed: 'Great job! You passed the quiz.',
      retry: 'Nice try! Try again to earn the reward.',
      lessonOverview: 'Lesson overview',
      duration: 'Duration',
      vocabulary: 'Vocabulary',
      scenes: 'Scenes',
      reward: 'Reward',
      descriptionFallback: 'Short learning block for young learners.',
      markWatched: 'I watched it',
      watchedDone: 'Watch complete',
      playLine: 'Play line',
      nextScene: 'Next scene',
      finishStory: 'Finish story',
      gamePrompt: 'Tap the matching picture.',
      hearIt: 'Hear it',
      trySpeaking: 'Try speaking',
      readAloud: 'Read aloud',
      speakNow: 'Speak now',
      keepGoing: 'Keep going',
      startQuiz: 'Submit quiz',
      finishLesson: 'Complete lesson',
      listening: 'Listening...',
      speechEmpty: 'Try speaking after pressing the microphone.',
      wordPractice: 'Practice this word with your voice.',
      pagePractice: 'Read the sentence out loud.',
      sayPractice: 'Say the word clearly and confidently.',
      stepSaved: 'Progress saved',
      answerFirst: 'Choose an answer for every question first.',
      speechUnsupported: 'Speech recognition is not available right now.',
      promptHeard: 'Prompt',
      courseProgress: 'Course progress',
      sessionProgress: 'Lesson progress',
      completed: 'Completed',
      active: 'Active',
      locked: 'Locked',
      retryNeeded: 'Retry',
      audioReady: 'Audio ready',
      videoReady: 'Video ready',
      wordDone: 'Word complete',
      pageDone: 'Page complete',
      speakingDone: 'Speaking complete',
      stepGuide: 'One small step at a time.',
      introComplete: 'Continue to vocabulary',
      skipIntro: 'Skip intro',
    },
    vi: {
      lessonNotFound: 'Khong tim thay bai hoc.',
      loadingLesson: 'Dang mo bai hoc...',
      back: 'Quay lai',
      sections: 'Phan hoc',
      intro: 'Gioi thieu',
      watch: 'Xem',
      story: 'Truyen',
      words: 'Tu moi',
      read: 'Doc',
      say: 'Noi',
      game: 'Tro choi',
      quiz: 'Quiz',
      finish: 'Hoan thanh',
      introTitle: 'Xem va hoc',
      storyTitle: 'Cau chuyen ngan',
      gameTitle: 'Tro choi nhanh',
      wordsTitle: 'Tu moi',
      readTitle: 'Doc cung Momo',
      sayTitle: 'Noi that to',
      rewardTitle: 'Nhan phan thuong',
      readyReward: 'San sang nhan phan thuong chua?',
      finishPrompt: 'Hoan thanh bai hoc va luu tien do.',
      previous: 'Truoc',
      next: 'Tiep',
      grading: 'Dang cham diem...',
      passed: 'Gioi qua! Ban da qua bai quiz.',
      retry: 'Tot lam! Thu lai de nhan phan thuong.',
      lessonOverview: 'Tong quan bai hoc',
      duration: 'Thoi luong',
      vocabulary: 'Tu moi',
      scenes: 'Canh',
      reward: 'Thuong',
      descriptionFallback: 'Bai hoc ngan danh cho tre nho.',
      markWatched: 'Con da xem xong',
      watchedDone: 'Da xem xong',
      playLine: 'Nghe cau nay',
      nextScene: 'Canh tiep theo',
      finishStory: 'Xong cau chuyen',
      gamePrompt: 'Cham vao hinh dung nhe.',
      hearIt: 'Nghe mau',
      trySpeaking: 'Thu noi',
      readAloud: 'Doc thanh tieng',
      speakNow: 'Noi ngay',
      keepGoing: 'Tiep tuc nhe',
      startQuiz: 'Nop quiz',
      finishLesson: 'Hoan thanh bai hoc',
      listening: 'Dang nghe...',
      speechEmpty: 'Hay noi sau khi bam micro.',
      wordPractice: 'Tap noi tu nay bang giong cua con.',
      pagePractice: 'Doc to cau nay.',
      sayPractice: 'Noi ro rang va tu tin nhe.',
      stepSaved: 'Da luu tien do',
      answerFirst: 'Hay chon dap an cho tat ca cau hoi truoc nhe.',
      speechUnsupported: 'Tinh nang nhan giong noi chua san sang luc nay.',
      promptHeard: 'Loi nhac',
      courseProgress: 'Tien do khoa hoc',
      sessionProgress: 'Tien do bai hoc',
      completed: 'Da xong',
      active: 'Dang hoc',
      locked: 'Khoa',
      retryNeeded: 'Can thu lai',
      audioReady: 'Am thanh san sang',
      videoReady: 'Video san sang',
      wordDone: 'Da xong tu nay',
      pageDone: 'Da xong trang nay',
      speakingDone: 'Da xong phan noi',
      stepGuide: 'Moi buoc mot chut thoi.',
      introComplete: 'Tiep tuc tu moi',
      skipIntro: 'Bo qua gioi thieu',
    },
  }[locale];

  const lessonSummary = useMemo(() => {
    if (!lesson) return [];
    const videoScenes = lesson.videoLesson?.scenes;
    return [
      `${copy.duration}: ${lesson.duration_minutes ?? 0}m`,
      `${copy.vocabulary}: ${lesson.vocabulary?.length ?? 0}`,
      `${copy.scenes}: ${videoScenes?.length ?? 0}`,
      `${copy.reward}: ${lesson.reward?.xp ?? 0} XP`,
    ];
  }, [copy.duration, copy.reward, copy.scenes, copy.vocabulary, lesson]);

  const stepOrder = useMemo(() => {
    if (!lesson) return [];
    const vocabularyCount = lesson.vocabulary?.length ?? 0;
    const quizCount = lesson.quiz?.length ?? 0;
    const imagesCount = lesson.images?.length ?? 0;
    const scenesCount = lesson.videoLesson?.scenes?.length ?? 0;
    return [
      (lesson.video_url || lesson.intro_video_url || imagesCount || lesson.lesson_media) && { id: 'intro', label: copy.intro, title: copy.introTitle },
      lesson.videoLesson && { id: 'watch', label: copy.watch, title: cleanText(lesson.videoLesson.title, lessonTitle(lesson, locale)) },
      scenesCount && { id: 'story', label: copy.story, title: copy.storyTitle },
      lesson.game && { id: 'game', label: copy.game, title: copy.gameTitle },
      vocabularyCount && { id: 'words', label: copy.words, title: copy.wordsTitle },
      lesson.readAloudStory && { id: 'read', label: copy.read, title: copy.readTitle },
      lesson.pronunciation && { id: 'say', label: copy.say, title: copy.sayTitle },
      quizCount && { id: 'quiz', label: copy.quiz, title: copy.quiz },
      { id: 'finish', label: copy.finish, title: copy.rewardTitle },
    ].filter(Boolean) as Array<{ id: string; label: string; title: string }>;
  }, [copy.finish, copy.game, copy.gameTitle, copy.intro, copy.introTitle, copy.quiz, copy.read, copy.readTitle, copy.rewardTitle, copy.say, copy.sayTitle, copy.story, copy.storyTitle, copy.watch, copy.words, copy.wordsTitle, lesson, locale]);

  const sessionSteps = useMemo(() => {
    const map = new Map<string, LessonSessionStepState>();
    session?.steps.forEach((step) => map.set(step.step_id, step));
    return map;
  }, [session]);

  useEffect(() => {
    if (!courseId || !lessonId) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);
    setResult(null);
    setReward(null);

    Promise.all([
      courseService.getLesson(courseId, lessonId),
      courseService.startLessonSession(courseId, lessonId, learnerId),
    ])
      .then(([lessonData, sessionData]) => {
        setLesson(lessonData);
        setSession(sessionData);
        setActiveStep(sessionData.current_step_index || 0);
        setSessionStartTime(Date.now());
      })
      .catch((loadError) => {
        console.error('[LessonPlayer] load error:', loadError);
        setError(copy.lessonNotFound);
      })
      .finally(() => setIsLoading(false));
  }, [copy.lessonNotFound, courseId, learnerId, lessonId]);

  const runPronunciationCheck = async (expectedText: string): Promise<PracticeSummary> => {
    const service = getPronunciationService();
    return new Promise(async (resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        eventBus.off('PRONUNCIATION_ERROR', handleError);
        service.stopListening();
        reject(new Error(copy.speechEmpty));
      }, 9000);

      const handleError = (payload: { error?: string }) => {
        window.clearTimeout(timeoutId);
        eventBus.off('PRONUNCIATION_ERROR', handleError);
        reject(new Error(payload?.error || copy.speechUnsupported));
      };

      eventBus.on('PRONUNCIATION_ERROR', handleError);

      try {
        await service.startListening(expectedText, async (result: PronunciationResult) => {
          window.clearTimeout(timeoutId);
          eventBus.off('PRONUNCIATION_ERROR', handleError);
          resolve({
            transcript: result.transcript,
            score: result.accuracy || Math.round((result.confidence || 0) * 100),
            passed: Boolean(result.isCorrect),
            feedback: result.feedback || copy.keepGoing,
          });
        });
      } catch (listenError) {
        window.clearTimeout(timeoutId);
        eventBus.off('PRONUNCIATION_ERROR', handleError);
        reject(listenError instanceof Error ? listenError : new Error(copy.speechUnsupported));
      }
    });
  };

  const playModelAudio = async (text: string, asset?: AssetReference | null) => {
    await AudioService.playPronunciation(text, 'en', resolveAudioUrl(asset));
  };

  const savePronunciationAttempt = async (
    sectionId: string,
    targetText: string,
    resultSummary: PracticeSummary,
  ) => {
    if (!courseId || !lessonId) return;
    await apiClient.post('/api/v1/pronunciation/attempt', {
      user_id: learnerId,
      flashcard_qr_id: normalizeKey(targetText),
      spoken_text: resultSummary.transcript,
      score: resultSummary.score,
      feedback: resultSummary.feedback,
      course_id: courseId,
      lesson_id: lessonId,
      section_id: sectionId,
      session_id: session?.session_id,
      target_text: targetText,
    });
  };

  const saveStepProgress = async (
    stepId: string,
    payload: {
      passed: boolean;
      score: number;
      attemptType?: string;
      responseData?: Record<string, unknown>;
      masteryWords?: string[];
    },
  ) => {
    if (!courseId || !lessonId) return null;
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
    setActiveStep(nextSession.current_step_index);
    return nextSession;
  };

  const handleWatchComplete = async () => {
    setBusyKey('watch');
    try {
      await saveStepProgress('watch', {
        passed: true,
        score: 100,
        responseData: { watched: true, step_complete: true },
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleIntroComplete = async () => {
    setBusyKey('intro');
    try {
      await saveStepProgress('intro', {
        passed: true,
        score: 100,
        responseData: { intro_watched: true, step_complete: true },
      });
      setNotice(copy.stepSaved);
    } finally {
      setBusyKey(null);
    }
  };

  const handleIntroSkip = async () => {
    setBusyKey('intro');
    try {
      await saveStepProgress('intro', {
        passed: true,
        score: 100,
        responseData: { intro_skipped: true, step_complete: true },
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleStoryAdvance = async () => {
    if (!lesson?.videoLesson) return;
    const totalScenes = lesson.videoLesson.scenes.length;
    const nextIndex = Math.min(storyIndex + 1, totalScenes - 1);
    const isLastScene = storyIndex >= totalScenes - 1;

    if (isLastScene) {
      setBusyKey('story');
      try {
        await saveStepProgress('story', {
          passed: true,
          score: 100,
          responseData: { scene_index: totalScenes, total_scenes: totalScenes, step_complete: true },
        });
      } finally {
        setBusyKey(null);
      }
      return;
    }

    setStoryIndex(nextIndex);
      await saveStepProgress('story', {
        passed: true,
        score: Math.round(((nextIndex + 1) / totalScenes) * 100),
        responseData: { scene_index: nextIndex + 1, total_scenes: totalScenes, step_complete: false },
      });
      setNotice(copy.stepSaved);
    };

  const handleGameChoice = async (choiceId: string, label: string) => {
    if (!lesson?.game) return;
    const target = normalizeKey(lesson.game.prompt_audio_text).replace(/[^a-z ]/g, '').split(' ').pop() || '';
    const isCorrect = normalizeKey(label).includes(target);
    const message = isCorrect ? cleanText(lesson.game.feedback_positive_vi, copy.passed) : copy.retry;
    setGameFeedback({ choiceId, correct: isCorrect, message });
    await AudioService.playSoundEffect(isCorrect ? 'correct' : 'wrong');
    await saveStepProgress('game', {
      passed: isCorrect,
      score: isCorrect ? 100 : 20,
      responseData: { choice_id: choiceId, choice_label: label, target, step_complete: isCorrect },
      masteryWords: isCorrect ? [label] : [],
    });
  };

  const handleWordPractice = async (item: VocabularyItem) => {
    if (!lesson) return;
    const vocabulary = lesson.vocabulary ?? [];
    const key = normalizeKey(item.word_en);
    setBusyKey(`word:${key}`);
    try {
      const resultSummary = await runPronunciationCheck(item.word_en);
      await savePronunciationAttempt('words', item.word_en, resultSummary);
      const next = { ...wordPractice, [key]: resultSummary };
      setWordPractice(next);
      const passedCount = vocabulary.filter((word) => next[normalizeKey(word.word_en)]?.passed).length;
      await AudioService.playSoundEffect(resultSummary.passed ? 'correct' : 'wrong');
      await saveStepProgress('words', {
        passed: resultSummary.passed,
        score: resultSummary.score,
        attemptType: 'word_practice',
        responseData: {
          word: item.word_en,
          transcript: resultSummary.transcript,
          feedback: resultSummary.feedback,
          completed_words: passedCount,
          total_words: vocabulary.length,
          step_complete: passedCount === vocabulary.length,
        },
        masteryWords: [item.word_en],
      });
      setNotice(resultSummary.feedback);
    } catch (practiceError) {
      console.error('[LessonPlayer] word practice error:', practiceError);
      setNotice(practiceError instanceof Error ? practiceError.message : copy.speechUnsupported);
    } finally {
      setBusyKey(null);
    }
  };

  const handleReadPractice = async (pageId: string, text: string, highlightedWords: string[]) => {
    if (!lesson?.readAloudStory) return;
    setBusyKey(`read:${pageId}`);
    try {
      const resultSummary = await runPronunciationCheck(text);
      await savePronunciationAttempt('read', text, resultSummary);
      const next = { ...readPractice, [pageId]: resultSummary };
      setReadPractice(next);
      const passedCount = lesson.readAloudStory.pages.filter((page) => next[page.page_id]?.passed).length;
      await AudioService.playSoundEffect(resultSummary.passed ? 'correct' : 'wrong');
      await saveStepProgress('read', {
        passed: resultSummary.passed,
        score: resultSummary.score,
        attemptType: 'read_aloud',
        responseData: {
          page_id: pageId,
          transcript: resultSummary.transcript,
          feedback: resultSummary.feedback,
          completed_pages: passedCount,
          total_pages: lesson.readAloudStory.pages.length,
          step_complete: passedCount === lesson.readAloudStory.pages.length,
        },
        masteryWords: highlightedWords,
      });
      setNotice(resultSummary.feedback);
    } catch (practiceError) {
      console.error('[LessonPlayer] read practice error:', practiceError);
      setNotice(practiceError instanceof Error ? practiceError.message : copy.speechUnsupported);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSayPractice = async (word: string) => {
    if (!lesson?.pronunciation) return;
    const key = normalizeKey(word);
    setBusyKey(`say:${key}`);
    try {
      const resultSummary = await runPronunciationCheck(word);
      await savePronunciationAttempt('say', word, resultSummary);
      const next = { ...sayPractice, [key]: resultSummary };
      setSayPractice(next);
      const passedCount = lesson.pronunciation.target_words.filter((target) => next[normalizeKey(target)]?.passed).length;
      await AudioService.playSoundEffect(resultSummary.passed ? 'correct' : 'wrong');
      await saveStepProgress('say', {
        passed: resultSummary.passed,
        score: resultSummary.score,
        attemptType: 'speaking_drill',
        responseData: {
          target_word: word,
          transcript: resultSummary.transcript,
          feedback: resultSummary.feedback,
          completed_words: passedCount,
          total_words: lesson.pronunciation.target_words.length,
          step_complete: passedCount === lesson.pronunciation.target_words.length,
        },
        masteryWords: [word],
      });
      setNotice(resultSummary.feedback);
    } catch (practiceError) {
      console.error('[LessonPlayer] say practice error:', practiceError);
      setNotice(practiceError instanceof Error ? practiceError.message : copy.speechUnsupported);
    } finally {
      setBusyKey(null);
    }
  };

  const allAnswered = useMemo(() => {
    if (!lesson?.quiz?.length) return false;
    return lesson.quiz.every((question) => Boolean(answers[question.question_id]));
  }, [answers, lesson]);

  const handleQuizSubmit = async () => {
    if (!courseId || !lessonId || !lesson) return;
    if (!allAnswered) {
      setNotice(copy.answerFirst);
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
    try {
      const quizResult = await courseService.submitQuiz(courseId, lessonId, answers, learnerId);
      setResult(quizResult);
      await AudioService.playSoundEffect(quizResult.passed ? 'correct' : 'wrong');
      await saveStepProgress('quiz', {
        passed: quizResult.passed,
        score: quizResult.score,
        attemptType: 'quiz_submit',
        responseData: { ...quizResult, step_complete: quizResult.passed },
      });
      if (quizResult.passed && quizResult.reward) {
        setReward(quizResult.reward);
        // Play reward sounds and haptics
        HapticService.reward();
        SoundEffectService.play('success').catch(() => {});
      }
      setNotice(quizResult.passed ? copy.passed : copy.retry);
    } catch (submitError) {
      console.error('[LessonPlayer] quiz submit error:', submitError);
      setError(copy.lessonNotFound);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishLesson = async () => {
    if (!courseId || !lessonId || !result?.passed || !lesson) return;
    setIsSubmitting(true);
    try {
      const wordsLearned = lesson.vocabulary
        .filter((item) => wordPractice[normalizeKey(item.word_en)]?.passed)
        .map((item) => item.word_en);
      const pronunciationScores = Object.fromEntries(
        Object.entries(sayPractice)
          .filter(([, practice]) => practice?.passed)
          .map(([word, practice]) => [word, practice.score]),
      );
      const gamesPlayed = session?.steps.some((step) => step.step_id === 'game' && step.passed) ? 1 : 0;

      await courseService.completeLesson(courseId, lessonId, learnerId, {
        score: result.score,
        timeSpent: sessionStartTime > 0 ? Math.ceil((Date.now() - sessionStartTime) / 60000) : 0,
        wordsLearned,
        pronunciationScores,
        gamesPlayed,
      });
      
      await saveStepProgress('finish', {
        passed: true,
        score: result.score,
        attemptType: 'lesson_complete',
        responseData: { reward_xp: lesson?.reward?.xp || 0, step_complete: true },
      });
      if (lesson?.reward) {
        setReward(lesson.reward);
        // Play reward sounds and haptics
        HapticService.reward();
        SoundEffectService.play('success').catch(() => {});
      }
      setNotice(copy.stepSaved);
    } catch (finishError) {
      console.error('[LessonPlayer] finish error:', finishError);
      setError(copy.lessonNotFound);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepId = stepOrder[Math.min(activeStep, Math.max(stepOrder.length - 1, 0))]?.id;
  const currentSessionStep = currentStepId ? sessionSteps.get(currentStepId) : undefined;
  const progress = session?.progress_percent ?? Math.round(((activeStep + 1) / Math.max(stepOrder.length, 1)) * 100);

  const isStepLocked = (stepId: string) => sessionSteps.get(stepId)?.status === 'locked';

  const introContent = lesson ? (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#FFF8D8] p-5 shadow-[0_12px_0_rgba(229,184,0,0.14)]">
      <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(229,184,0,0.08)]">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="#FFF1D7">{copy.intro}</StatusPill>
          <StatusPill tone={statusTone(currentSessionStep?.status)}>
            {currentSessionStep?.status === 'completed' ? copy.completed : copy.active}
          </StatusPill>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.introTitle}</h2>
        <p className="mt-2 font-bold leading-7 text-slate-600">
          {cleanText(lessonDescription(lesson!, locale), copy.descriptionFallback)}
        </p>
      </div>

      {/* Duolingo-style media component */}
      <LessonMedia
        media={lesson.lesson_media || {
          video_url: lesson.video_url,
          video_thumbnail_url: lesson.video_thumbnail,
          video_duration_seconds: lesson.video_duration,
          intro_video_url: lesson.intro_video_url,
          intro_video_thumbnail: lesson.intro_video_thumbnail,
          intro_video_duration: lesson.video_duration,
          images: lesson.images,
          scene_images: lesson.scene_images,
          auto_play_intro: true,
        }}
        autoPlay
        onIntroComplete={handleIntroComplete}
        onIntroSkip={handleIntroSkip}
        locale={locale}
      />

      <div className="flex justify-end">
        <ActionButton onClick={handleIntroComplete} disabled={busyKey === 'intro' || currentSessionStep?.status === 'completed'}>
          {busyKey === 'intro' ? copy.stepSaved : currentSessionStep?.status === 'completed' ? copy.introComplete : copy.introComplete}
        </ActionButton>
      </div>
    </section>
  ) : null;

  const canGoNext = useMemo(() => {
    if (!stepOrder.length) return false;
    const next = stepOrder[activeStep + 1];
    if (!next) return false;
    return !isStepLocked(next.id);
  }, [activeStep, stepOrder, sessionSteps]);

  // Video URL from lesson or lesson_media
  const videoUrl = lesson?.video_url || lesson?.lesson_media?.video_url || 
    (lesson?.videoLesson?.video ? getAssetCandidateUrls(lesson.videoLesson.video)[0] : undefined);
  const videoPoster = lesson?.video_thumbnail || lesson?.lesson_media?.video_thumbnail_url ||
    (lesson?.videoLesson?.thumbnail ? getAssetCandidateUrls(lesson.videoLesson.thumbnail)[0] : undefined);

  const watchContent = (lesson?.videoLesson || videoUrl) ? (
    <section className="rounded-[34px] border-4 border-white bg-[#EAF5FF] p-5 shadow-[0_12px_0_rgba(91,141,239,0.14)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[28px] border-4 border-white bg-[#1A2744] p-4 shadow-[0_8px_0_rgba(15,23,42,0.18)]">
          {videoUrl ? (
            <LessonVideoPlayer
              src={videoUrl}
              poster={videoPoster}
              onEnded={handleWatchComplete}
              onTimeUpdate={() => {
                // Track video progress if needed
              }}
            />
          ) : lesson?.videoLesson ? (
            <LessonMediaPreview
              title={cleanText(lesson.videoLesson.title, lessonTitle(lesson, locale))}
              asset={lesson.videoLesson.video}
              thumbnail={lesson.videoLesson.thumbnail}
            />
          ) : null}
        </div>
        <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(91,141,239,0.10)]">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="#EEF9E7">{copy.videoReady}</StatusPill>
            <StatusPill tone={statusTone(currentSessionStep?.status)}>
              {currentSessionStep?.status === 'completed' ? copy.completed : copy.active}
            </StatusPill>
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.watch}</h2>
          <p className="mt-2 font-bold leading-7 text-slate-600">
            {cleanText(lesson ? lessonDescription(lesson, locale) : '', copy.descriptionFallback)}
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-500">{copy.stepGuide}</p>
          <div className="mt-5">
            <ActionButton onClick={handleWatchComplete} disabled={busyKey === 'watch' || currentSessionStep?.status === 'completed'}>
              {busyKey === 'watch' ? copy.stepSaved : currentSessionStep?.status === 'completed' ? copy.watchedDone : copy.markWatched}
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  // Transform video scenes to SceneViewer format
  const videoScenes = lesson?.videoLesson?.scenes.map((scene, index) => ({
    id: scene.scene_id || `scene-${index}`,
    imageUrl: scene.scene_image_url || '',
    thumbnailUrl: scene.scene_thumbnail_url || scene.scene_image_url || '',
    title: scene.audio_text_en,
    narrationText: scene.narration_vi,
    duration: scene.duration_seconds,
  })) || [];

  const handleSceneChange = (scene: { id: string; narrationText?: string }) => {
    const index = videoScenes.findIndex(s => s.id === scene.id);
    if (index !== -1 && index !== storyIndex) {
      setStoryIndex(index);
    }
  };

  const storyScene = lesson?.videoLesson?.scenes[storyIndex];
  const storyContent = lesson?.videoLesson && storyScene ? (
    <section className="rounded-[34px] border-4 border-white bg-[#FFE7E3] p-5 shadow-[0_12px_0_rgba(244,114,182,0.14)]">
      {/* SceneViewer component for story scenes */}
      <div className="mb-4">
        <SceneViewer
          scenes={videoScenes}
          showNavigation={true}
          showThumbnails={true}
          showNarration={true}
          enableAudioSync={false}
          onSceneChange={handleSceneChange}
          onComplete={handleStoryAdvance}
        />
      </div>
      
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <AssetTile
          asset={storyScene.image}
          label={`${copy.story} ${storyScene.order}`}
          emoji={`0${storyScene.order}`}
          showAssetMeta
          className="min-h-[260px]"
        />
        <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(244,114,182,0.10)]">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="#EAF5FF">{copy.scenes}: {storyScene.order}/{lesson.videoLesson.scenes.length}</StatusPill>
            <StatusPill tone="#FFF1D7">{copy.duration}: {storyScene.duration_seconds}s</StatusPill>
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-800">{cleanText(storyScene.audio_text_en, copy.storyTitle)}</h2>
          <p className="mt-2 text-lg font-bold text-slate-500">{cleanText(storyScene.narration_vi, storyScene.audio_text_en)}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton tone="#EAF5FF" onClick={() => playModelAudio(storyScene.audio_text_en)}>
              {copy.playLine}
            </ActionButton>
            <ActionButton onClick={handleStoryAdvance} disabled={busyKey === 'story'}>
              {busyKey === 'story'
                ? copy.stepSaved
                : storyIndex >= lesson.videoLesson.scenes.length - 1
                  ? copy.finishStory
                  : copy.nextScene}
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  const gameContent = lesson?.game ? (
    <section className="rounded-[34px] border-4 border-white bg-[#FFF1D7] p-5 shadow-[0_12px_0_rgba(229,184,0,0.16)]">
      <div className="rounded-[28px] border-4 border-white bg-white/90 p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="#FFFFFF">{copy.promptHeard}: {lesson.game.prompt_audio_text}</StatusPill>
          <StatusPill tone={statusTone(currentSessionStep?.status)}>
            {currentSessionStep?.status === 'needs_retry' ? copy.retryNeeded : copy.active}
          </StatusPill>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.gameTitle}</h2>
        <p className="mt-2 font-bold text-slate-600">{copy.gamePrompt}</p>
        <div className="mt-4">
          <ActionButton tone="#EAF5FF" onClick={() => playModelAudio(lesson.game!.prompt_audio_text)}>
            {copy.hearIt}
          </ActionButton>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {lesson.game.items.map((item, index) => {
          const label = String(item.label || item.word || item.id || `choice-${index + 1}`);
          const selected = gameFeedback?.choiceId === item.id;
          return (
            <button
              key={String(item.id || label)}
              type="button"
              onClick={() => handleGameChoice(String(item.id || label), label)}
              className={`rounded-[28px] border-4 p-3 text-left transition ${
                selected
                  ? gameFeedback?.correct
                    ? 'border-emerald-300 bg-white shadow-[0_8px_0_rgba(16,185,129,0.16)]'
                    : 'border-rose-300 bg-white shadow-[0_8px_0_rgba(244,63,94,0.16)]'
                  : 'border-white bg-white/90 shadow-[0_8px_0_rgba(148,163,184,0.12)]'
              }`}
            >
              <AssetTile asset={item.image as AssetReference} label={label} emoji={`0${index + 1}`} showAssetMeta />
            </button>
          );
        })}
      </div>
      {gameFeedback && (
        <div className="mt-5 rounded-[24px] border-4 border-white bg-white/90 p-4 text-center">
          <p className={`text-lg font-black ${gameFeedback.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
            {gameFeedback.message}
          </p>
        </div>
      )}
    </section>
  ) : null;

  // Transform vocabulary images to gallery format
  const vocabularyImages = lesson?.vocabulary.map((item) => ({
    id: item.word_en,
    src: getAssetCandidateUrls(item.image)[0] || '',
    thumbnail: getAssetCandidateUrls(item.image)[0] || '',
    alt: item.word_en,
    caption: item.word_en,
  })) || [];

  const wordsContent = lesson ? (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#EEF9E7] p-5 shadow-[0_12px_0_rgba(125,199,96,0.14)]">
      {/* Image gallery for vocabulary */}
      {vocabularyImages.length > 0 && (
        <div className="mb-4">
          <LessonImageGallery
            images={vocabularyImages}
            columns={3}
            gap="sm"
            enableLightbox={true}
            enableZoom={true}
            enableSwipe={true}
          />
        </div>
      )}
      {lesson.vocabulary.map((item) => {
        const key = normalizeKey(item.word_en);
        const practice = wordPractice[key];
        return (
          <article key={item.word_en} className="rounded-[30px] border-4 border-white bg-[#FFF1D7] p-4 shadow-[0_8px_0_rgba(148,163,184,0.08)]">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <AssetTile asset={item.image} label={item.word_en} emoji={item.word_en.slice(0, 2).toUpperCase()} showAssetMeta className="min-h-[220px]" />
              <div className="space-y-4 rounded-[24px] border-4 border-white bg-white/90 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="#EAF5FF">{copy.audioReady}</StatusPill>
                  {practice?.passed && <StatusPill tone="#EEF9E7">{copy.wordDone}</StatusPill>}
                </div>
                <div>
                  <h3 className="text-4xl font-black text-slate-800">{item.word_en}</h3>
                  <p className="mt-2 text-lg font-bold text-slate-500">{cleanText(item.word_vi, item.word_en)}</p>
                  <p className="mt-4 rounded-[20px] bg-slate-50 px-4 py-3 text-sm font-bold text-sky-700">{cleanText(item.simple_sentence, item.word_en)}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton tone="#EAF5FF" onClick={() => playModelAudio(item.word_en, item.audio)}>
                    {copy.hearIt}
                  </ActionButton>
                  <ActionButton onClick={() => handleWordPractice(item)} disabled={busyKey === `word:${key}`}>
                    {busyKey === `word:${key}` ? copy.listening : copy.trySpeaking}
                  </ActionButton>
                </div>
                <PracticeFeedback result={practice} emptyText={copy.wordPractice} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  ) : null;

  const readContent = lesson?.readAloudStory ? (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#FFE7E3] p-5 shadow-[0_12px_0_rgba(244,114,182,0.14)]">
      {lesson.readAloudStory.pages.map((page) => {
        const practice = readPractice[page.page_id];
        return (
          <article key={page.page_id} className="rounded-[30px] border-4 border-white bg-[#FFF1D7] p-4 shadow-[0_8px_0_rgba(148,163,184,0.08)]">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <AssetTile asset={page.image} label={`${copy.read} ${page.order}`} emoji={`P${page.order}`} showAssetMeta className="min-h-[220px]" />
              <div className="space-y-4 rounded-[24px] border-4 border-white bg-white/90 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="#EAF5FF">{copy.audioReady}</StatusPill>
                  {practice?.passed && <StatusPill tone="#EEF9E7">{copy.pageDone}</StatusPill>}
                </div>
                <p className="text-3xl font-black text-slate-800">{cleanText(page.text_en, `Page ${page.order}`)}</p>
                <p className="text-lg font-bold text-slate-500">{cleanText(page.text_vi, page.text_en)}</p>
                <div className="flex flex-wrap gap-2">
                  {page.highlighted_words.map((word) => (
                    <StatusPill key={word} tone="#FFF1D7">{word}</StatusPill>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton tone="#EAF5FF" onClick={() => playModelAudio(page.text_en, page.audio)}>
                    {copy.hearIt}
                  </ActionButton>
                  <ActionButton onClick={() => handleReadPractice(page.page_id, page.text_en, page.highlighted_words)} disabled={busyKey === `read:${page.page_id}`}>
                    {busyKey === `read:${page.page_id}` ? copy.listening : copy.readAloud}
                  </ActionButton>
                </div>
                <PracticeFeedback result={practice} emptyText={copy.pagePractice} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  ) : null;

  const sayContent = lesson?.pronunciation ? (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#EAF5FF] p-5 shadow-[0_12px_0_rgba(91,141,239,0.14)]">
      <div className="rounded-[28px] border-4 border-white bg-white/90 p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="#FFFFFF">{copy.promptHeard}: {lesson.pronunciation.prompt_audio_text}</StatusPill>
          <StatusPill tone="#EEF9E7">{lesson.pronunciation.pass_score}%</StatusPill>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.sayTitle}</h2>
        <p className="mt-2 font-bold text-slate-600">{copy.sayPractice}</p>
        <div className="mt-4">
          <ActionButton tone="#EAF5FF" onClick={() => playModelAudio(lesson.pronunciation!.prompt_audio_text, lesson.pronunciation!.audio)}>
            {copy.hearIt}
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {lesson.pronunciation.target_words.map((word) => {
          const key = normalizeKey(word);
          const practice = sayPractice[key];
          return (
            <article key={word} className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(91,141,239,0.10)]">
              <div className="flex flex-wrap gap-2">
                {practice?.passed && <StatusPill tone="#EEF9E7">{copy.speakingDone}</StatusPill>}
              </div>
              <h3 className="mt-4 text-4xl font-black text-slate-800">{word}</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton tone="#EAF5FF" onClick={() => playModelAudio(word)}>
                  {copy.hearIt}
                </ActionButton>
                <ActionButton onClick={() => handleSayPractice(word)} disabled={busyKey === `say:${key}`}>
                  {busyKey === `say:${key}` ? copy.listening : copy.speakNow}
                </ActionButton>
              </div>
              <div className="mt-4">
                <PracticeFeedback result={practice} emptyText={copy.sayPractice} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  ) : null;

  const quizContent = lesson ? (
    <section className="space-y-4">
      <ImageQuiz
        questions={lesson.quiz}
        answers={answers}
        onAnswer={(questionId, optionId) => {
          setAnswers((current) => ({ ...current, [questionId]: optionId }));
          setResult(null);
          setError(null);
        }}
      />
      {result && (
        <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 text-center shadow-[0_8px_0_rgba(148,163,184,0.10)]">
          <p className="text-4xl font-black text-slate-800">{result.score}%</p>
          <p className={`mt-2 text-lg font-black ${result.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
            {result.passed ? copy.passed : copy.retry}
          </p>
        </div>
      )}
    </section>
  ) : null;

  const finishContent = lesson ? (
    <section className="rounded-[34px] border-4 border-white bg-[#FFF8D8] p-6 text-center shadow-[0_10px_0_rgba(229,184,0,0.16)]">
      <div className="mx-auto max-w-2xl rounded-[28px] border-4 border-white bg-white/90 p-5">
        <AssetTile
          asset={lesson.reward?.sticker}
          label={lesson.reward?.badgeTitle || copy.rewardTitle}
          emoji="XP"
          className="mx-auto max-w-sm"
          showAssetMeta
        />
        <p className="mt-5 text-3xl font-black text-slate-800">{copy.readyReward}</p>
        <p className="mt-2 font-bold text-slate-500">{copy.finishPrompt}</p>
        {result && (
          <div className="mx-auto mt-4 max-w-sm rounded-[24px] bg-slate-50 px-5 py-4 shadow-[0_6px_0_rgba(148,163,184,0.10)]">
            <p className="text-3xl font-black text-slate-800">{result.score}%</p>
            <p className="font-bold text-slate-600">
              {result.passed ? copy.passed : copy.retry}
            </p>
          </div>
        )}
      </div>
    </section>
  ) : null;

  const stepContentMap: Record<string, React.ReactNode> = {
    intro: introContent,
    watch: watchContent,
    story: storyContent,
    game: gameContent,
    words: wordsContent,
    read: readContent,
    say: sayContent,
    quiz: quizContent,
    finish: finishContent,
  };

  if (isLoading) {
    return <div className="min-h-screen clay-bg-playful p-6 text-center text-xl font-black text-slate-700">{copy.loadingLesson}</div>;
  }

  if (!lesson || error) {
    return (
      <div className="min-h-screen clay-bg-playful p-6 text-center">
        <p className="text-xl font-black text-rose-600">{error || copy.lessonNotFound}</p>
        <button type="button" onClick={() => navigate('/courses')} className="clay-cta-primary mt-4">
          {copy.back}
        </button>
      </div>
    );
  }

  const currentStep = stepOrder[Math.min(activeStep, stepOrder.length - 1)];

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] min-w-0 flex-col overflow-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+7rem)] md:pb-6">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-3 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="rounded-[22px] border-4 border-white bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(148,163,184,0.18)]"
          >
            {copy.back}
          </button>
          <div className="rounded-full border-4 border-white bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(148,163,184,0.12)]">
            {copy.sections} {lesson.order} - {progress}%
          </div>
        </div>

        <header className="mb-4 rounded-[34px] border-4 border-white bg-white/95 p-4 shadow-[0_12px_0_rgba(91,141,239,0.12)]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="min-w-0">
              <p className="text-sm font-black text-sky-600">{currentStep.label}</p>
              <h1 className="mt-1 text-4xl font-black leading-tight text-slate-800 sm:text-6xl">
                {lessonTitle(lesson, locale)}
              </h1>
              <p className="mt-2 text-lg font-bold text-slate-500">{currentStep.title}</p>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                {cleanText(lessonDescription(lesson!, locale), copy.descriptionFallback)}
              </p>
            </div>
            <div className="rounded-[26px] border-4 border-white bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">{copy.lessonOverview}</div>
              <div className="mt-3 space-y-2">
                {lessonSummary.map((item) => (
                  <div
                    key={item}
                    className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-[0_4px_0_rgba(148,163,184,0.10)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-[0_4px_0_rgba(148,163,184,0.10)]">
                {copy.sessionProgress}: {session?.progress_percent || 0}%
              </div>
            </div>
          </div>

          <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100 shadow-[inset_0_2px_4px_rgba(15,23,42,0.08)]">
            <div
              className="h-full rounded-full bg-[#6EB9FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {stepOrder.map((step, index) => {
              const sessionStep = sessionSteps.get(step.id);
              const locked = sessionStep?.status === 'locked';
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => !locked && setActiveStep(index)}
                  disabled={locked}
                  className={`min-h-12 shrink-0 rounded-[20px] border-4 px-5 text-sm font-black transition ${
                    index === activeStep
                      ? 'border-white bg-[#FFF1D7] text-slate-800 shadow-[0_6px_0_rgba(229,184,0,0.16)]'
                      : 'border-white bg-white text-slate-500 shadow-[0_4px_0_rgba(148,163,184,0.10)]'
                  } ${locked ? 'opacity-40' : ''}`}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </header>

        <main
          className="min-h-0 flex-1 overflow-y-auto rounded-[36px] border-4 border-white p-4 shadow-[0_12px_0_rgba(91,141,239,0.10)] sm:p-5"
          style={{ background: shellTone(currentStep?.id) }}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusPill tone={statusTone(currentSessionStep?.status)}>
              {currentSessionStep?.status === 'completed'
                ? copy.completed
                : currentSessionStep?.status === 'needs_retry'
                  ? copy.retryNeeded
                  : currentSessionStep?.status === 'locked'
                    ? copy.locked
                    : copy.active}
            </StatusPill>
            <StatusPill tone="#FFFFFF">{copy.courseProgress}: {progress}%</StatusPill>
          </div>
          {stepContentMap[currentStep.id]}
          {notice && (
            <div className="mt-4 rounded-[24px] border-4 border-white bg-white/90 px-4 py-3 text-sm font-black text-slate-700 shadow-[0_6px_0_rgba(148,163,184,0.08)]">
              {notice}
            </div>
          )}
        </main>

        <footer className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:justify-between">
          <button
            type="button"
            onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
            disabled={activeStep === 0}
            className="min-h-16 rounded-[24px] border-4 border-white bg-white px-5 text-base font-black text-slate-700 shadow-[0_8px_0_rgba(148,163,184,0.18)] disabled:opacity-50"
          >
            {copy.previous}
          </button>

          {currentStep.id === 'quiz' ? (
            <button
              type="button"
              onClick={handleQuizSubmit}
              disabled={!allAnswered || isSubmitting}
              className="min-h-16 rounded-[24px] border-4 border-white bg-[#FFD93D] px-5 text-base font-black text-slate-800 shadow-[0_8px_0_rgba(229,184,0,0.22)] disabled:opacity-60"
            >
              {isSubmitting ? copy.grading : copy.startQuiz}
            </button>
          ) : currentStep.id === 'finish' ? (
            <button
              type="button"
              onClick={handleFinishLesson}
              disabled={!result?.passed || isSubmitting || currentSessionStep?.status === 'completed'}
              className="min-h-16 rounded-[24px] border-4 border-white bg-[#FFD93D] px-5 text-base font-black text-slate-800 shadow-[0_8px_0_rgba(229,184,0,0.22)] disabled:opacity-60"
            >
              {isSubmitting ? copy.grading : copy.finishLesson}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => canGoNext && setActiveStep((step) => Math.min(stepOrder.length - 1, step + 1))}
              disabled={!canGoNext}
              className="min-h-16 rounded-[24px] border-4 border-white bg-[#FFD93D] px-5 text-base font-black text-slate-800 shadow-[0_8px_0_rgba(229,184,0,0.22)] disabled:opacity-60"
            >
              {copy.next}
            </button>
          )}
        </footer>
      </div>

      {reward && <RewardPopup reward={reward} onClose={() => setReward(null)} />}
    </div>
  );
};

export default LessonPlayer;
