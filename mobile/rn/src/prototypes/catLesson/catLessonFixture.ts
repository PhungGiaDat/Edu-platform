import type { ImageSourcePropType } from 'react-native';

export type CatPrototypeAnimalId = 'cat' | 'dog' | 'bird';
export type CatPrototypeBlockType =
  | 'warm_up'
  | 'learn_vocabulary'
  | 'listen_choose'
  | 'match'
  | 'memory_match'
  | 'quiz'
  | 'reward';

export interface CatPrototypeAnimal {
  id: CatPrototypeAnimalId;
  vocabularyId: string;
  wordEn: string;
  wordVi: string;
  sentence: string;
  illustration: ImageSourcePropType;
  pronunciationAudio?: number;
}

export interface CatPrototypeBlock {
  id: string;
  type: CatPrototypeBlockType;
  title: string;
  eyebrow: string;
}

export interface CatPrototypeQuizQuestion {
  id: string;
  mode: 'audio_image' | 'image_word' | 'word_image';
  prompt: string;
  answerId: CatPrototypeAnimalId;
  optionIds: CatPrototypeAnimalId[];
}

const animals: Record<CatPrototypeAnimalId, CatPrototypeAnimal> = {
  cat: {
    id: 'cat',
    vocabularyId: 'animals-v1-cat',
    wordEn: 'Cat',
    wordVi: 'con mèo',
    sentence: 'The cat is small.',
    illustration: require('../../../assets/prototypes/cat-lesson/animals-v1-cat-v2.png'),
    pronunciationAudio: require('../../../assets/prototypes/cat-lesson/cat-pronunciation.wav'),
  },
  dog: {
    id: 'dog',
    vocabularyId: 'animals-v1-dog',
    wordEn: 'Dog',
    wordVi: 'con chó',
    sentence: 'The dog is friendly.',
    illustration: require('../../../assets/prototypes/cat-lesson/animals-v1-dog-v2.png'),
  },
  bird: {
    id: 'bird',
    vocabularyId: 'animals-v1-bird',
    wordEn: 'Bird',
    wordVi: 'con chim',
    sentence: 'The bird can fly.',
    illustration: require('../../../assets/prototypes/cat-lesson/animals-v1-bird-v2.png'),
  },
};

export const catLessonPrototypeFixture = {
  lessonId: 'learn-the-cat',
  title: 'Lesson 1 · Cat',
  focusAnimalId: 'cat' as const,
  contrastAnimalIds: ['dog', 'bird'] as const,
  animals,
  blocks: [
    { id: 'cat-warm-up', type: 'warm_up', title: 'Meet the Cat!', eyebrow: 'WARM-UP' },
    { id: 'cat-vocabulary', type: 'learn_vocabulary', title: 'Learn a new word', eyebrow: 'NEW WORD' },
    { id: 'cat-listen', type: 'listen_choose', title: 'Listen & Choose', eyebrow: 'LISTEN' },
    { id: 'cat-match', type: 'match', title: 'Match the animals', eyebrow: 'MATCH' },
    { id: 'cat-memory', type: 'memory_match', title: 'Memory Trail', eyebrow: 'MINI GAME' },
    { id: 'cat-quiz', type: 'quiz', title: 'Can you find Cat?', eyebrow: 'QUIZ' },
    { id: 'cat-reward', type: 'reward', title: 'Cat Champion', eyebrow: 'LESSON COMPLETE' },
  ] satisfies CatPrototypeBlock[],
  quiz: [
    {
      id: 'cat-audio-image',
      mode: 'audio_image',
      prompt: 'Listen. Which one is Cat?',
      answerId: 'cat',
      optionIds: ['dog', 'cat', 'bird'],
    },
    {
      id: 'cat-image-word',
      mode: 'image_word',
      prompt: 'Which word matches this picture?',
      answerId: 'cat',
      optionIds: ['bird', 'dog', 'cat'],
    },
    {
      id: 'cat-word-image',
      mode: 'word_image',
      prompt: 'Tap the picture for “Cat”.',
      answerId: 'cat',
      optionIds: ['cat', 'bird', 'dog'],
    },
  ] satisfies CatPrototypeQuizQuestion[],
  reward: {
    title: 'Cat Champion',
    message: 'You listened, matched, played, and found Cat!',
    xp: 50,
    score: 3,
    total: 3,
  },
} as const;

export type CatLessonPrototypeFixture = typeof catLessonPrototypeFixture;
