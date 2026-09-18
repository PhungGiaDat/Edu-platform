import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';

interface ARFlashcardSectionProps {
  lesson: Lesson;
  onContinue: () => void;
  locale: 'en' | 'vi';
}

export const ARFlashcardSection: React.FC<ARFlashcardSectionProps> = ({
  lesson,
  onContinue,
  locale,
}) => {
  const navigate = useNavigate();
  const vocabulary = lesson.vocabulary || [];

  const copy = {
    en: {
      badge: 'AR 3D',
      title: 'Trải nghiệm Thẻ AR 3D sống động',
      helper: 'Point your camera to see interactive 3D models!',
      launchAr: 'Mở Camera AR 📸',
      accessibleAr: 'Khám phá cùng Camera AR',
      continue: 'Tiếp tục sang Trò chơi nhỏ →',
      preview: 'Vocabulary models in this lesson:',
    },
    vi: {
      badge: 'AR 3D',
      title: 'Trải nghiệm Thẻ AR 3D sống động',
      helper: 'Hướng camera vào thẻ học để xem mô hình 3D tương tác nhé!',
      launchAr: 'Mở Camera AR 📸',
      accessibleAr: 'Khám phá cùng Camera AR',
      continue: 'Tiếp tục sang Trò chơi nhỏ →',
      preview: 'Mô hình trong bài học:',
    },
  }[locale];

  const handleLaunchAR = () => {
    navigate('/learn-ar-xr');
  };

  const orbitPositions = [
    'top-1 left-1/2 -translate-x-1/2',
    'bottom-8 left-0',
    'bottom-8 right-0',
  ];

  return (
    <section className="animate-fade-in w-full text-center max-w-md mx-auto">
      <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-700 shadow-2xs border border-white mb-1.5">
        ✨ {copy.badge}
      </span>
      <h2 className="text-xl font-black text-slate-900 tracking-tight">📱 {copy.title}</h2>

      {/* AR portal: circular purple stage with orbiting vocab objects, CTA embedded at center */}
      <div className="relative mx-auto mt-5 h-[260px] w-[260px]">
        {/* Portal glow rings */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-300/40 to-indigo-400/30 blur-xl" />
        <div
          className="absolute inset-3 rounded-full border-[6px] border-white shadow-[0_10px_0_#6B21A8,0_16px_28px_rgba(107,33,168,0.3)]"
          style={{ background: 'radial-gradient(circle at 35% 30%, #C79BF9, #7C3AED 70%)' }}
        />

        {/* Orbiting vocabulary objects around the portal edge */}
        {vocabulary.slice(0, 3).map((item, idx) => {
          const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
          return (
            <div key={item.word_en} className={`absolute ${orbitPositions[idx % 3]} z-10 flex flex-col items-center`}>
              <div className="h-12 w-12 rounded-full bg-white border-[3px] border-white shadow-[0_3px_0_#E9D5FF] overflow-hidden flex items-center justify-center">
                {visual.imageUrl ? (
                  <img src={visual.imageUrl} alt={item.word_en} className="h-full w-full object-contain p-1" loading="lazy" />
                ) : (
                  <span className="text-xl">{visual.emoji || item.emoji || '🔤'}</span>
                )}
              </div>
              <span className="mt-0.5 text-[9px] font-black text-purple-900 bg-white/90 rounded-full px-1.5 capitalize">
                {item.word_en}
              </span>
            </div>
          );
        })}

        {/* Center: CTA embedded in the portal */}
        <button
          type="button"
          onClick={handleLaunchAR}
          aria-label={copy.accessibleAr}
          className="absolute inset-0 m-auto h-[104px] w-[104px] rounded-full border-4 border-white bg-white/95 text-purple-800 font-black text-xs shadow-[0_6px_0_rgba(107,33,168,0.3)] hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_rgba(107,33,168,0.3)] transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
        >
          <span className="text-2xl">📸</span>
          <span>{copy.launchAr.replace(' 📸', '')}</span>
        </button>
      </div>

      <p className="mt-3 text-xs font-bold text-slate-600">{copy.helper}</p>

      {/* Secondary continue, visually quiet */}
      <div className="mt-3">
        <button
          type="button"
          onClick={onContinue}
          className="text-xs font-black text-slate-500 underline underline-offset-2 cursor-pointer hover:text-slate-700"
        >
          {copy.continue}
        </button>
      </div>
    </section>
  );
};
