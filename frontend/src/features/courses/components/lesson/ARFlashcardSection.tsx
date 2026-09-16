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
      tag: 'Interactive 3D AR',
      title: '3D AR Flashcards Experience',
      instruction: 'Scan your flashcard to bring vocabulary to life in 3D!',
      cardTitle: 'Augmented Reality Flashcards',
      cardDesc: 'Point camera at flashcards to view interactive 3D models and hear native pronunciation.',
      launchAr: 'Explore with AR Camera 📸',
      skipAr: 'Continue to Mini Games →',
      targets: '3D Flashcards in this lesson:',
    },
    vi: {
      tag: 'Công nghệ AR 3D',
      title: 'Trải nghiệm Thẻ AR 3D sống động',
      instruction: 'Quét thẻ học để xem từ vựng sống động!',
      cardTitle: 'Bộ thẻ học Flashcard AR 3D',
      cardDesc: 'Hướng camera vào thẻ học để xem mô hình 3D tương tác và nghe giọng phát âm chuẩn nhé!',
      launchAr: 'Khám phá cùng Camera AR (8th Wall) 📸',
      skipAr: 'Tiếp tục sang Trò chơi nhỏ →',
      targets: 'Thẻ AR trong bài học này:',
    },
  }[locale];

  const handleLaunchAR = () => {
    navigate('/learn-ar-xr');
  };

  return (
    <section className="space-y-4 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Title & Instruction */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 shadow-xs border border-white mb-2">
          ✨ {copy.tag}
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          📱 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.instruction}
        </p>
      </div>

      {/* Hero AR Showcase Card (Tactile Clay) */}
      <div className="rounded-3xl border-4 border-white bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 p-5 shadow-[0_8px_0_rgba(99,102,241,0.12)]">
        {/* Playful Camera Mascot */}
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl shadow-md text-white">
          📸
        </div>

        <h3 className="text-lg font-black text-slate-900">
          {copy.cardTitle}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-600 leading-relaxed">
          {copy.cardDesc}
        </p>

        {/* Available 3D Flashcards Preview */}
        {vocabulary.length > 0 && (
          <div className="mt-4 rounded-2xl border-2 border-indigo-100 bg-white/95 p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
              {copy.targets}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {vocabulary.slice(0, 3).map((item) => {
                const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);

                return (
                  <div
                    key={item.word_en}
                    className="flex flex-col items-center rounded-xl bg-slate-50 border border-slate-100 p-2 shadow-xs"
                  >
                    <div className="h-12 w-12 rounded-lg bg-white overflow-hidden flex items-center justify-center mb-1 border border-slate-200">
                      {visual.imageUrl ? (
                        <img
                          src={visual.imageUrl}
                          alt={item.word_en}
                          className="h-full w-full object-contain p-1"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xl">{visual.emoji || item.emoji || '🔤'}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-black text-slate-900 capitalize truncate w-full">
                      {item.word_en}
                    </span>
                    <span className="text-[9px] font-bold text-indigo-600">
                      3D Model
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Launch AR Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleLaunchAR}
            className="w-full min-h-[52px] rounded-2xl border-2 border-white bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-base shadow-[0_5px_0_#4338CA] hover:brightness-105 active:translate-y-1 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {copy.launchAr}
          </button>
        </div>
      </div>

      {/* Non-blocking Continue button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onContinue}
          className="w-full min-h-[52px] rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-black text-base shadow-xs hover:bg-slate-50 active:translate-y-1 transition-all cursor-pointer"
        >
          {copy.skipAr}
        </button>
      </div>
    </section>
  );
};
