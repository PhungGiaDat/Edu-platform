import type { Locale } from '@/contexts/LocaleContext';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

import type { CourseExploreCard } from '../courseExploreRail';

export interface CourseExploreRailProps {
  cards: CourseExploreCard[];
  locale: Locale;
  onLessonOpen: (lessonId: string) => void;
}

const copy = {
  en: { title: 'Discover in this course', open: 'Open lesson', video: 'Watch', game: 'Play', picture: 'Look', story: 'Read' },
  vi: { title: 'Khám phá trong khóa học', open: 'Mở bài học', video: 'Xem video', game: 'Chơi game', picture: 'Xem hình', story: 'Đọc truyện' },
} as const;

const tones = ['#EAF5FF', '#FFF1D7', '#EEF9E7', '#FFE7E3'];

export function CourseExploreRail({ cards, locale, onLessonOpen }: CourseExploreRailProps) {
  if (cards.length === 0) return null;
  const ui = copy[locale];

  return (
    <section aria-labelledby="course-explore-title" className="mt-8 overflow-hidden rounded-[34px] border-4 border-white bg-white p-5 shadow-[0_10px_0_rgba(91,141,239,0.12)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="course-explore-title" className="text-3xl font-black text-slate-800">{ui.title}</h2>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-3 pr-1">
        {cards.map((card, index) => {
          const imageUrl = card.asset?.status === 'ready' ? getAssetCandidateUrls(card.asset)[0] : undefined;
          return (
            <article key={card.id} className="w-[236px] shrink-0 snap-start rounded-[28px] border-4 border-white p-3 shadow-[0_7px_0_rgba(15,23,42,0.10)]" style={{ background: tones[index % tones.length] }}>
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[22px] border-4 border-white bg-white">
                {imageUrl ? <img src={imageUrl} alt={card.title} className="h-full w-full object-cover" /> : <span className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-lg font-black text-slate-700">{ui[card.kind]}</span>}
              </div>
              <p className="mt-3 text-sm font-black text-sky-700">{ui[card.kind]}</p>
              <h3 className="mt-1 line-clamp-2 text-xl font-black text-slate-800">{card.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-600">{card.subtitle}</p>
              <button type="button" onClick={() => onLessonOpen(card.lessonId)} className="clay-btn mt-4 min-h-12 w-full justify-center bg-white text-slate-800">
                {ui.open}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default CourseExploreRail;
