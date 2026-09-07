import type { AssetReference, Lesson } from '@/types/course';

export type CourseExploreKind = 'video' | 'game' | 'picture' | 'story';

export type CourseExploreCard = {
  id: string;
  lessonId: string;
  kind: CourseExploreKind;
  title: string;
  subtitle: string;
  asset?: AssetReference | null;
};

const lessonTitle = (lesson: Lesson) => lesson.title_vi.trim() || lesson.title.trim() || 'Lesson';

const firstImage = (lesson: Lesson): AssetReference | null | undefined =>
  lesson.vocabulary[0]?.image
  ?? lesson.readAloudStory?.pages[0]?.image
  ?? lesson.generatedMedia.find((media) => media.asset.type === 'image')?.asset;

export function buildCourseExploreCards(lessons: Lesson[], limit = 6): CourseExploreCard[] {
  const cards: CourseExploreCard[] = [];
  const seen = new Set<string>();
  const ordered = [...lessons].sort((left, right) => left.order - right.order);

  for (const lesson of ordered) {
    const title = lessonTitle(lesson);
    const video = lesson.videoLesson?.video
      ?? lesson.generatedMedia.find((media) => media.asset.type === 'video')?.asset;
    const candidates: Array<Omit<CourseExploreCard, 'id' | 'lessonId'>> = [
      ...(video ? [{ kind: 'video' as const, title, subtitle: lesson.videoLesson?.title || 'Video with Lexi', asset: video }] : []),
      ...(lesson.game || lesson.activity ? [{ kind: 'game' as const, title, subtitle: lesson.game?.instruction_vi || lesson.activity?.instruction_vi || 'Play and match', asset: firstImage(lesson) }] : []),
      ...(firstImage(lesson) ? [{ kind: 'picture' as const, title, subtitle: lesson.vocabulary[0]?.word_en || 'Picture discovery', asset: firstImage(lesson) }] : []),
      ...(lesson.readAloudStory ? [{ kind: 'story' as const, title, subtitle: lesson.readAloudStory.title, asset: lesson.readAloudStory.pages[0]?.image }] : []),
    ];

    for (const candidate of candidates) {
      const id = `${lesson.lesson_id}:${candidate.kind}`;
      if (!seen.has(id)) {
        seen.add(id);
        cards.push({ id, lessonId: lesson.lesson_id, ...candidate });
      }
      if (cards.length === limit) return cards;
    }
  }
  return cards;
}
