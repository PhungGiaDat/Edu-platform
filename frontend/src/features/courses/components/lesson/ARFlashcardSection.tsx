import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

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
      title: '3D AR Flashcard Experience',
      subtitle: 'Bring vocabulary to life with Augmented Reality! Point your camera at the target flashcards.',
      techBadge: '8th Wall WebAR Powered',
      cardTitle: 'Physical AR Flashcard Deck',
      cardDesc: 'Hold up your printable or on-screen flashcard to see the 3D model appear and speak.',
      launchAr: 'Launch AR Camera (WebXR)',
      continueText: 'Or continue with next game',
      availableTargets: 'Available 3D AR Targets in this lesson:',
      skipAr: 'Continue to Mini Games →',
    },
    vi: {
      title: 'Trải nghiệm Thẻ AR 3D sống động',
      subtitle: 'Mang từ vựng ra thế giới thực với công nghệ thực tế ảo tăng cường AR! Hướng camera vào thẻ để khám phá.',
      techBadge: 'Tích hợp công nghệ 8th Wall WebAR',
      cardTitle: 'Bộ thẻ học Flashcard AR',
      cardDesc: 'Quét thẻ học để mô hình 3D tương tác xuất hiện sống động cùng giọng phát âm chuẩn.',
      launchAr: 'Khám phá cùng Camera AR (8th Wall)',
      continueText: 'Hoặc tiếp tục với trò chơi tiếp theo',
      availableTargets: 'Các thẻ AR 3D trong bài học này:',
      skipAr: 'Tiếp tục sang Trò chơi nhỏ →',
    },
  }[locale];

  const handleLaunchAR = () => {
    // Navigate to existing WebAR route /learn-ar-xr
    navigate('/learn-ar-xr');
  };

  return (
    <section className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800 mb-2">
          <span>✨</span>
          <span>{copy.techBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          📱 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* Hero AR Showcase Card */}
      <div className="rounded-3xl border-4 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 sm:p-8 shadow-xl text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-purple-200/50 blur-2xl pointer-events-none" />

        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-indigo-500 text-4xl shadow-md text-white">
          🥽
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
          {copy.cardTitle}
        </h3>
        <p className="mt-2 text-sm sm:text-base font-medium text-slate-600 max-w-md mx-auto">
          {copy.cardDesc}
        </p>

        {/* Target Flashcards Preview */}
        <div className="mt-6 rounded-2xl border-2 border-indigo-100 bg-white/90 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
            {copy.availableTargets}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {vocabulary.map((item) => {
              const imgUrl = getAssetCandidateUrls(item.image)[0];
              return (
                <div
                  key={item.word_en}
                  className="flex flex-col items-center rounded-xl border border-slate-100 p-2.5 bg-slate-50 shadow-xs"
                >
                  <div className="h-14 w-14 rounded-lg bg-white overflow-hidden flex items-center justify-center mb-1.5 border border-slate-200">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.word_en}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xl">{item.emoji || '🔤'}</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-900 capitalize">
                    {item.word_en}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    3D Model
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AR CTA Actions */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleLaunchAR}
            className="w-full sm:w-auto sm:min-w-[260px] min-h-14 rounded-2xl border-4 border-white bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-4 text-base font-black text-white shadow-xl hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            📸 {copy.launchAr}
          </button>

          <p className="text-xs text-slate-400">
            {copy.continueText}
          </p>
        </div>
      </div>

      {/* Non-blocking Continue button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          {copy.skipAr}
        </button>
      </div>
    </section>
  );
};
