import React, { useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { getPronunciationService, type PronunciationResult } from '@/services/PronunciationService';
import { eventBus } from '@/runtime/EventBus';
import { FeedbackMascot } from './FeedbackMascot';

export interface PracticeResult {
  transcript: string;
  score: number;
  passed: boolean;
  feedback: string;
}

interface VocabularySectionProps {
  lesson: Lesson;
  onWordPracticed: (wordEn: string, result: PracticeResult) => void;
  practicedWords: Record<string, PracticeResult>;
  locale: 'en' | 'vi';
  onComplete?: () => void;
}

export const VocabularySection: React.FC<VocabularySectionProps> = ({
  lesson,
  onWordPracticed,
  practicedWords,
  locale,
  onComplete,
}) => {
  const vocabulary = lesson.vocabulary || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [isListeningKey, setIsListeningKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const copy = {
    en: {
      instruction: 'Listen carefully & repeat after Momo',
      listen: 'Nghe mẫu',
      speak: 'Luyện nói',
      listening: 'Listening to you...',
      passed: 'Awesome!',
      tryAgain: 'Try Again',
      nextWord: 'Tiếp tục →',
      finishVocab: 'Hoàn thành từ mới 🎉',
      allDone: `You've learned all ${vocabulary.length} words!`,
    },
    vi: {
      instruction: 'Bé hãy nghe và đọc theo Momo nhé',
      listen: 'Nghe mẫu',
      speak: 'Luyện nói',
      listening: 'Đang lắng nghe bé nói...',
      passed: 'Giỏi lắm!',
      tryAgain: 'Bé thử lại nhé',
      nextWord: 'Tiếp tục →',
      finishVocab: 'Hoàn thành từ mới 🎉',
      allDone: `Con đã học xong ${vocabulary.length} từ mới!`,
    },
  }[locale];

  const handlePlayAudio = async (item: VocabularyItem) => {
    setActiveWordKey(item.word_en);
    try {
      const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
      await AudioService.playPronunciation(item.word_en, 'en', visual?.imageUrl || undefined);
    } catch (err) {
      console.warn('[VocabularySection] audio play error:', err);
    } finally {
      setActiveWordKey(null);
    }
  };

  const handlePracticeSpeaking = async (item: VocabularyItem) => {
    const wordKey = item.word_en.toLowerCase();
    setIsListeningKey(wordKey);
    setErrorMessage(null);

    const service = getPronunciationService();

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          eventBus.off('PRONUNCIATION_ERROR', handleError);
          service.stopListening();
          reject(
            new Error(
              locale === 'vi'
                ? 'Chưa nghe thấy giọng của bé, hãy thử lại nhé!'
                : 'No speech heard, please try again!'
            )
          );
        }, 8000);

        const handleError = (payload: { error?: string }) => {
          window.clearTimeout(timeoutId);
          eventBus.off('PRONUNCIATION_ERROR', handleError);
          reject(
            new Error(
              payload?.error ||
                (locale === 'vi'
                  ? 'Không thể nhận diện giọng nói.'
                  : 'Speech recognition error.')
            )
          );
        };

        eventBus.on('PRONUNCIATION_ERROR', handleError);

        service
          .startListening(item.word_en, async (result: PronunciationResult) => {
            window.clearTimeout(timeoutId);
            eventBus.off('PRONUNCIATION_ERROR', handleError);

            const score = result.accuracy || Math.round((result.confidence || 0) * 100);
            const passed = Boolean(result.isCorrect || score >= 60);

            const summary: PracticeResult = {
              transcript: result.transcript || item.word_en,
              score,
              passed,
              feedback: result.feedback || (passed ? copy.passed : copy.tryAgain),
            };

            await AudioService.playSoundEffect(passed ? 'correct' : 'wrong');
            onWordPracticed(item.word_en, summary);
            resolve();
          })
          .catch((err: unknown) => {
            window.clearTimeout(timeoutId);
            eventBus.off('PRONUNCIATION_ERROR', handleError);
            reject(err);
          });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi khi ghi âm.';
      setErrorMessage(msg);
    } finally {
      setIsListeningKey(null);
    }
  };

  const handleNextWord = () => {
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowCelebration(true);
      if (onComplete) {
        window.setTimeout(() => {
          onComplete();
        }, 800);
      }
    }
  };

  if (!vocabulary.length) {
    return (
      <div className="rounded-3xl border-4 border-white bg-white/90 p-8 text-center text-slate-500 shadow-md">
        Không có từ vựng cho bài học này.
      </div>
    );
  }

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Header & Page Dots */}
      <div className="flex items-center justify-between px-1">
        <FeedbackMascot
          mode="companion"
          message={`Từ ${currentIndex + 1} / ${vocabulary.length}`}
        />

        {/* Interactive Page Dots: ● ○ ○ */}
        <div className="flex items-center gap-2">
          {vocabulary.map((item, idx) => (
            <button
              key={item.word_en || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Từ số ${idx + 1}`}
              className={`h-3 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'w-7 bg-sky-500 shadow-xs'
                  : practicedWords[item.word_en.toLowerCase()]?.passed
                    ? 'w-3 bg-emerald-400'
                    : 'w-3 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* ONE WORD AT A TIME: Horizontal Carousel Container */}
      <div className="relative overflow-hidden w-full rounded-3xl">
        <div
          className="flex w-full transition-transform duration-400 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {vocabulary.map((item) => {
            const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
            const practicedStatus = practicedWords[item.word_en.toLowerCase()];

            return (
              <div
                key={item.word_en}
                className="w-full shrink-0 px-0.5"
              >
                <div className="rounded-3xl border-4 border-white bg-white/95 p-4 sm:p-5 shadow-[0_8px_0_rgba(0,0,0,0.06)] flex flex-col items-center">
                  {/* Large Clay Image Card (Roughly square, visual hero) */}
                  <div className="relative w-full aspect-square max-h-[220px] sm:max-h-[250px] rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden mb-2.5">
                    {visual.imageUrl ? (
                      <img
                        src={visual.imageUrl}
                        alt={item.word_en}
                        className="h-full w-full object-contain p-2 transition-transform hover:scale-105 duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-7xl">{visual.emoji || item.emoji || '🔤'}</span>
                    )}

                    {/* Quick audio speaker button inside image */}
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(item)}
                      className="absolute bottom-2.5 right-2.5 h-11 w-11 rounded-2xl bg-white/95 shadow-md border-2 border-slate-100 flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      aria-label={`Nghe ${item.word_en}`}
                    >
                      🔊
                    </button>
                  </div>

                  {/* English Word (Prominent) */}
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-900 capitalize tracking-tight">
                    {item.word_en}
                  </h3>

                  {/* Vietnamese Translation */}
                  <p className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">
                    {item.word_vi}
                  </p>

                  {/* Example Sentence */}
                  {item.simple_sentence && (
                    <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 italic max-w-xs">
                      "{item.simple_sentence}"
                    </p>
                  )}

                  {/* Listen & Speak Actions (Clay buttons) */}
                  <div className="grid grid-cols-2 gap-2.5 w-full mt-3.5">
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(item)}
                      disabled={activeWordKey === item.word_en}
                      className="min-h-12 rounded-2xl border-2 border-white bg-gradient-to-r from-[#6EB9FF] to-[#3A8FD1] text-white font-black text-sm shadow-[0_4px_0_#2B76B3] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-base">🔊</span>
                      <span>{copy.listen}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePracticeSpeaking(item)}
                      disabled={isListeningKey === item.word_en.toLowerCase()}
                      className={`min-h-12 rounded-2xl border-2 border-white font-black text-sm shadow-[0_4px_0_rgba(0,0,0,0.15)] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isListeningKey === item.word_en.toLowerCase()
                          ? 'bg-amber-400 text-slate-900 animate-pulse'
                          : practicedStatus?.passed
                            ? 'bg-emerald-500 text-white shadow-[0_4px_0_#059669]'
                            : 'bg-[#FFD93D] text-slate-900 shadow-[0_4px_0_#EAB308]'
                      }`}
                    >
                      <span className="text-base">
                        {isListeningKey === item.word_en.toLowerCase() ? '👂' : '🎤'}
                      </span>
                      <span>
                        {isListeningKey === item.word_en.toLowerCase()
                          ? copy.listening
                          : copy.speak}
                      </span>
                    </button>
                  </div>

                  {/* Practice Feedback Badge */}
                  {practicedStatus && (
                    <div
                      className={`mt-2 text-xs font-black px-3 py-1 rounded-full ${
                        practicedStatus.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {practicedStatus.passed ? `✓ ${copy.passed}` : copy.tryAgain}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Continue Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleNextWord}
          className="w-full min-h-[56px] rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-base sm:text-lg shadow-[0_6px_0_#0D9488] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {currentIndex < vocabulary.length - 1 ? copy.nextWord : copy.finishVocab}
          </span>
        </button>
      </div>

      {/* Completion Banner */}
      {showCelebration && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3.5 text-center shadow-md animate-fade-in mt-2">
          <span className="text-2xl block mb-0.5">🎉</span>
          <p className="text-sm font-black text-emerald-900">{copy.allDone}</p>
          {onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="mt-2 text-xs font-black text-emerald-700 underline cursor-pointer"
            >
              Tiếp tục ngay →
            </button>
          )}
        </div>
      )}
    </section>
  );
};
