// Shared types for step components

import type {
  AssetReference,
  Lesson,
  LessonMedia,
  LessonSessionStepState,
  PronunciationTask,
  ReadAloudStory,
  Reward,
  SectionGame,
  VocabularyItem,
} from '@/types/course';

// Common props shared across all step components
export interface BaseStepProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
}

// Intro step props
export interface StepIntroProps extends BaseStepProps {
  onIntroComplete: () => Promise<void>;
  onIntroSkip: () => Promise<void>;
  busyKey: string | null;
  lessonMedia?: LessonMedia | null;
}

// Watch step props
export interface StepWatchProps extends BaseStepProps {
  videoUrl?: string | null;
  videoPoster?: string | null;
  onWatchComplete: () => Promise<void>;
  busyKey: string | null;
}

// Story step props
export interface StepStoryProps extends BaseStepProps {
  scenes: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    title: string;
    narrationText?: string;
    duration: number;
  }>;
  storyIndex: number;
  onStoryAdvance: () => Promise<void>;
  onSceneChange: (scene: { id: string; narrationText?: string }) => void;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Game step props
export interface StepGameProps extends BaseStepProps {
  game?: SectionGame | null;
  gameFeedback?: { choiceId?: string; correct: boolean; message: string } | null;
  onGameChoice: (choiceId: string, label: string) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
}

// Words step props
export interface StepWordsProps extends BaseStepProps {
  wordPractice: Record<string, PracticeSummary>;
  onWordPractice: (item: VocabularyItem) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Read aloud step props
export interface StepReadProps extends BaseStepProps {
  readAloudStory?: ReadAloudStory | null;
  readPractice: Record<string, PracticeSummary>;
  onReadPractice: (pageId: string, text: string, highlightedWords: string[]) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Pronunciation step props
export interface StepSayProps extends BaseStepProps {
  pronunciation?: PronunciationTask | null;
  sayPractice: Record<string, PracticeSummary>;
  onSayPractice: (word: string) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Quiz step props
export interface StepQuizProps extends BaseStepProps {
  answers: Record<string, string>;
  result?: { score: number; passed: boolean } | null;
  onAnswer: (questionId: string, optionId: string) => void;
}

// Finish step props
export interface StepFinishProps extends BaseStepProps {
  result?: { score: number; passed: boolean } | null;
}

// Practice summary used for pronunciation feedback
export interface PracticeSummary {
  transcript: string;
  score: number;
  passed: boolean;
  feedback: string;
}

// Copy/translations interface
export interface StepCopy {
  intro: string;
  watch: string;
  story: string;
  words: string;
  read: string;
  say: string;
  game: string;
  quiz: string;
  finish: string;
  introTitle: string;
  storyTitle: string;
  gameTitle: string;
  wordsTitle: string;
  readTitle: string;
  sayTitle: string;
  rewardTitle: string;
  readyReward: string;
  finishPrompt: string;
  completed: string;
  active: string;
  retryNeeded: string;
  stepGuide: string;
  markWatched: string;
  watchedDone: string;
  playLine: string;
  nextScene: string;
  finishStory: string;
  gamePrompt: string;
  hearIt: string;
  trySpeaking: string;
  readAloud: string;
  speakNow: string;
  keepGoing: string;
  listening: string;
  speechEmpty: string;
  wordPractice: string;
  pagePractice: string;
  sayPractice: string;
  stepSaved: string;
  answerFirst: string;
  promptHeard: string;
  audioReady: string;
  videoReady: string;
  wordDone: string;
  pageDone: string;
  speakingDone: string;
  duration: string;
  scenes: string;
  passed: string;
  retry: string;
}
