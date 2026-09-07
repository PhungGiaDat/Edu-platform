import { describe, expect, it } from 'vitest';
import { buildCourseExploreCards } from '@/features/courses/courseExploreRail';
import type { Lesson } from '@/types/course';

const asset = (type: 'image' | 'video') => ({ bucket: 'AR_models', path: `course/demo.${type === 'image' ? 'png' : 'mp4'}`, type, status: 'pending' as const });
const lesson = {
  lesson_id: 'one', title: 'One', title_vi: '', order: 1, duration_minutes: 5, video_duration: 0,
  vocabulary: [{ word_en: 'Cat', word_vi: 'Meo', emoji: '', image: asset('image'), audio: { ...asset('image'), type: 'audio' as const }, simple_sentence: '' }],
  videoLesson: { title: 'Watch cat', duration_seconds: 20, video: asset('video'), thumbnail: asset('image'), scenes: [] },
  game: { game_id: 'game', type: 'picture_match' as const, instruction_vi: 'Ghep hinh', prompt_audio_text: '', items: [], feedback_positive_vi: '' },
  quiz: [], images: [], scene_images: [], generatedMedia: [],
} as Lesson;

describe('buildCourseExploreCards', () => {
  it('creates authored video, game, and picture discovery cards that navigate to the owning lesson', () => {
    const cards = buildCourseExploreCards([lesson]);
    expect(cards.map((card) => card.kind)).toEqual(['video', 'game', 'picture']);
    expect(cards.every((card) => card.lessonId === 'one')).toBe(true);
  });
});
