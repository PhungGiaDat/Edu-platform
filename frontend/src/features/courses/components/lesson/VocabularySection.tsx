import React, { useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { AudioService } from '@/services/AudioService';
import { getPronunciationService, type PronunciationResult } from '@/services/PronunciationService';
import { eventBus } from '@/runtime/EventBus';

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
}

export const VocabularySection: React.FC<VocabularySectionProps> = ({
  lesson,
  onWordPracticed,
  practicedWords,
  locale,
}) => {
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const [isListeningKey, setIsListeningKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copy = {
    en: {
      title: 'Vocabulary Cards',
      subtitle: 'Tap the speaker to hear the word. Tap the microphone to practice speaking!',
      listen: 'Listen',
      speak: 'Speak',
      listening: 'Listening...',
      passed: 'Awesome!',
      tryAgain: 'Try Again',
      score: 'Score',
      example: 'Example sentence',
      done: 'Mastered',
    },
    vi: {
      title: 'Thẻ từ vựng sinh động',
      subtitle: 'Bấm vào chiếc loa để nghe phát âm chuẩn. Bấm micro để luyện nói cùng Momo nhé!',
      listen: 'Nghe mẫu',
      speak: 'Luyện nói',
      listening: 'Đang lắng nghe...',
      passed: 'Xuất sắc!',
      tryAgain: 'Thử lại nhé',
      score: 'Điểm',
      example: 'Câu ví dụ',
      done: 'Đã hoàn thành',
    },
  }[locale];

  const handlePlayAudio = async (item: VocabularyItem) => {
    setActiveWordKey(item.word_en);
    try {
      const audioUrl = getAssetCandidateUrls(item.audio)[0];
      await AudioService.playPronunciation(item.word_en, 'en', audioUrl);
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
          reject(new Error(locale === 'vi' ? 'Chưa nghe thấy giọng của bé, hãy thử lại nhé!' : 'No speech heard, please try again!'));
        }, 8000);

        const handleError = (payload: { error?: string }) => {
          window.clearTimeout(timeoutId);
          eventBus.off('PRONUNCIATION_ERROR', handleError);
          reject(new Error(payload?.error || (locale === 'vi' ? 'Không thể nhận diện giọng nói.' : 'Speech recognition error.')));
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
          .catch((err) => {
            window.clearTimeout(timeoutId);
            eventBus.off('PRONUNCIATION_ERROR', handleError);
            reject(err);
          });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsListeningKey(null);
    }
  };

  const vocabulary = lesson.vocabulary || [];

  return (
    <section className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          🔤 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-3 text-center text-xs sm:text-sm font-bold text-rose-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Vocabulary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vocabulary.map((item, idx) => {
          const wordKey = item.word_en.toLowerCase();
          const practice = practicedWords[wordKey];
          const imgUrl = getAssetCandidateUrls(item.image)[0];
          const isListening = isListeningKey === wordKey;
          const isPlaying = activeWordKey === item.word_en;

          return (
            <article
              key={item.word_en || idx}
              className={`flex flex-col justify-between rounded-3xl border-4 bg-white p-5 shadow-md transition-all hover:shadow-xl ${
                practice?.passed
                  ? 'border-emerald-300 ring-2 ring-emerald-100'
                  : 'border-slate-100'
              }`}
            >
              <div>
                {/* Header status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    #{idx + 1}
                  </span>
                  {practice?.passed && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 flex items-center gap-1">
                      <span>✓</span> {copy.done}
                    </span>
                  )}
                </div>

                {/* Card Image */}
                <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center border-2 border-slate-100">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={item.word_en}
                      className="h-full w-full object-contain p-2 transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-6xl">{item.emoji || '✨'}</span>
                  )}
                </div>

                {/* English Word & Vietnamese meaning */}
                <div className="text-center mb-3">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 capitalize">
                    {item.word_en}
                  </h3>
                  <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
                    {item.word_vi}
                  </p>
                </div>

                {/* Example sentence */}
                {item.simple_sentence && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center text-xs sm:text-sm font-semibold text-slate-600 mb-4 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wider mb-0.5">
                      {copy.example}
                    </span>
                    <p className="italic text-sky-800 font-bold">"{item.simple_sentence}"</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  {/* Listen Button */}
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(item)}
                    disabled={isPlaying}
                    className="min-h-11 flex items-center justify-center gap-1.5 rounded-xl border-2 border-sky-200 bg-sky-50 px-3 py-2 text-xs sm:text-sm font-black text-sky-800 hover:bg-sky-100 active:scale-95 transition-all"
                  >
                    <span>{isPlaying ? '🔊' : '🔈'}</span>
                    <span>{copy.listen}</span>
                  </button>

                  {/* Speak Button */}
                  <button
                    type="button"
                    onClick={() => handlePracticeSpeaking(item)}
                    disabled={isListening}
                    className={`min-h-11 flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs sm:text-sm font-black active:scale-95 transition-all ${
                      isListening
                        ? 'border-rose-400 bg-rose-100 text-rose-800 animate-pulse'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{isListening ? '🔴' : '🎤'}</span>
                    <span>{isListening ? copy.listening : copy.speak}</span>
                  </button>
                </div>

                {/* Practice score pill if attempted */}
                {practice && (
                  <div
                    className={`rounded-xl p-2 text-center text-xs font-black flex items-center justify-between px-3 ${
                      practice.passed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <span>{practice.feedback}</span>
                    <span className="rounded-md bg-white px-2 py-0.5 shadow-xs">
                      {practice.score}%
                    </span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
