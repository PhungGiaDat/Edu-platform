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

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Small Badge + Heading + Short Helper */}
      <div>
        <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-700 shadow-2xs border border-white mb-1.5">
          ✨ {copy.badge}
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          📱 {copy.title}
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600">
          {copy.helper}
        </p>
      </div>

      {/* One Prominent Flat AR Launch Card (No nested cards) */}
      <div className="rounded-3xl border-4 border-white bg-gradient-to-b from-purple-50/70 to-indigo-50/70 p-4 shadow-[0_8px_0_rgba(147,51,234,0.12)]">
        {/* 3 Tiny Vocabulary Previews */}
        {vocabulary.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              {copy.preview}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {vocabulary.slice(0, 3).map((item) => {
                const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);

                return (
                  <div
                    key={item.word_en}
                    className="flex flex-col items-center rounded-xl bg-white/90 border border-purple-100 p-2 shadow-2xs"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center mb-1 border border-slate-100">
                      {visual.imageUrl ? (
                        <img
                          src={visual.imageUrl}
                          alt={item.word_en}
                          className="h-full w-full object-contain p-0.5"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-lg">{visual.emoji || item.emoji || '🔤'}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-black text-slate-800 capitalize truncate w-full">
                      {item.word_en}
                    </span>
                    <span className="text-[9px] font-black text-purple-600">
                      3D
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Single Strong Purple CTA */}
        <button
          type="button"
          onClick={handleLaunchAR}
          aria-label={copy.accessibleAr}
          className="w-full min-h-[54px] rounded-2xl border-2 border-white bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-base shadow-[0_6px_0_#6B21A8] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>{copy.launchAr}</span>
        </button>
      </div>

      {/* Non-blocking Secondary Continue Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onContinue}
          className="w-full min-h-[48px] rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-black text-sm shadow-xs hover:bg-slate-50 active:translate-y-0.5 transition-all cursor-pointer"
        >
          {copy.continue}
        </button>
      </div>
    </section>
  );
};
