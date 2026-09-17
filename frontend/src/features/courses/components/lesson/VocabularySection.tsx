import React, { useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { getPronunciationService, type PronunciationResult } from '@/services/PronunciationService';
import { eventBus } from '@/runtime/EventBus';
import { ClayButton, ClayStage, ClayPill } from './clayComponents';

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

function mapSpeechError(error?: string | null, locale: 'en' | 'vi' = 'vi'): string {
  if (!error) {
    return locale === 'vi' ? 'Không thể nhận diện giọng nói.' : 'Speech recognition error.';
  }
  const clean = error.toLowerCase();
  if (clean.includes('service-not-allowed') || clean.includes('not-allowed') || clean.includes('service')) {
    return locale === 'vi'
      ? '🎤 Luyện nói chưa khả dụng trên thiết bị này. Bé vẫn có thể nghe mẫu và tiếp tục bài học nhé.'
      : '🎤 Speech practice is not available on this device. You can still listen and continue the lesson!';
  }
  if (clean.includes('no-speech')) {
    return locale === 'vi'
      ? 'Chưa nghe thấy giọng của bé, hãy thử lại nhé!'
      : 'No speech heard, please try again!';
  }
  if (clean.includes('network')) {
    return locale === 'vi'
      ? 'Lỗi kết nối mạng khi luyện nói. Bé hãy thử lại sau nhé.'
      : 'Network error during speech practice. Please try again later.';
  }
  return locale === 'vi'
    ? 'Có lỗi khi ghi âm. Bé hãy thử lại hoặc tiếp tục bài học nhé.'
    : 'Audio recording error. Please try again or continue!';
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
      listen: 'Listen',
      speak: 'Speak',
      listening: 'Listening to you...',
      passed: 'Awesome!',
      tryAgain: 'Try Again',
      nextWord: 'Next Word →',
      finishVocab: 'Complete Words 🎉',
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
          reject(new Error(mapSpeechError('no-speech', locale)));
        }, 8000);

        const handleError = (payload: { error?: string }) => {
          window.clearTimeout(timeoutId);
          eventBus.off('PRONUNCIATION_ERROR', handleError);
          reject(new Error(mapSpeechError(payload?.error, locale)));
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
            const rawMsg = err instanceof Error ? err.message : String(err);
            reject(new Error(mapSpeechError(rawMsg, locale)));
          });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : mapSpeechError(null, locale);
      setErrorMessage(msg);
    } finally {
      setIsListeningKey(null);
    }
  };

  const handleNextWord = () => {
    if (currentIndex < vocabulary.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setErrorMessage(null);
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
      <ClayStage color="yellow" className="p-8 text-center text-slate-700">
        Không có từ vựng cho bài học này.
      </ClayStage>
    );
  }

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Header: Clay Step Indicator Pill + Interactive Page Dots */}
      <div className="flex items-center justify-between px-1">
        <ClayPill color="cyan">
          Từ {currentIndex + 1} / {vocabulary.length}
        </ClayPill>

        {/* Interactive Page Dots: ● ○ ○ */}
        <div className="flex items-center gap-2">
          {vocabulary.map((item, idx) => (
            <button
              key={item.word_en || idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setErrorMessage(null);
              }}
              aria-label={`Từ số ${idx + 1}`}
              className={`h-3.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'w-8 bg-[#20BCEB] shadow-[0_2px_0_#0284C7]'
                  : practicedWords[item.word_en.toLowerCase()]?.passed
                    ? 'w-3.5 bg-[#20D6A4] shadow-[0_2px_0_#059669]'
                    : 'w-3.5 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Child-friendly speech error notice if any */}
      {errorMessage && (
        <ClayStage
          color="yellow"
          className="p-3 text-xs font-black text-amber-950 border-2 border-amber-300 text-left animate-fade-in"
        >
          {errorMessage}
        </ClayStage>
      )}

      {/* ONE WORD AT A TIME: Horizontal Carousel Container */}
      <div className="relative overflow-hidden w-full rounded-[28px]">
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
                {/* Real Clay Hero Stage: Cyan tinted with 3D bottom extrusion */}
                <ClayStage
                  color="cyan"
                  className="flex flex-col items-center border-4 border-white p-4 sm:p-5"
                >
                  {/* Large Square Clay Image Box (No duplicate speaker button inside!) */}
                  <div className="relative w-full aspect-square max-h-[220px] sm:max-h-[240px] rounded-2xl bg-white border-3 border-[#B9E7F6] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] flex items-center justify-center overflow-hidden mb-3">
                    {visual.imageUrl ? (
                      <img
                        src={visual.imageUrl}
                        alt={item.word_en}
                        className="h-full w-full object-contain p-2.5 transition-transform hover:scale-105 duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-7xl select-none">{visual.emoji || item.emoji || '🔤'}</span>
                    )}
                  </div>

                  {/* English Word (Prominent & Playful) */}
                  <h3 className="text-3xl sm:text-4xl font-black text-slate-900 capitalize tracking-tight">
                    {item.word_en}
                  </h3>

                  {/* Vietnamese Translation */}
                  <p className="text-lg sm:text-xl font-black text-[#D97706] mt-0.5">
                    {item.word_vi}
                  </p>

                  {/* Example Sentence */}
                  {item.simple_sentence && (
                    <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-600 bg-white/80 px-3.5 py-1 rounded-xl border border-sky-100 italic max-w-xs">
                      "{item.simple_sentence}"
                    </p>
                  )}

                  {/* Secondary Learning Actions: [🔊 Nghe mẫu] and [🎤 Luyện nói] */}
                  <div className="grid grid-cols-2 gap-2.5 w-full mt-3.5">
                    <ClayButton
                      variant="blue"
                      size="md"
                      onClick={() => handlePlayAudio(item)}
                      disabled={activeWordKey === item.word_en}
                    >
                      <span className="text-base">🔊</span>
                      <span>{copy.listen}</span>
                    </ClayButton>

                    <ClayButton
                      variant={
                        isListeningKey === item.word_en.toLowerCase()
                          ? 'coral'
                          : practicedStatus?.passed
                            ? 'emerald'
                            : 'yellow'
                      }
                      size="md"
                      onClick={() => handlePracticeSpeaking(item)}
                      disabled={isListeningKey === item.word_en.toLowerCase()}
                    >
                      <span className="text-base">
                        {isListeningKey === item.word_en.toLowerCase() ? '👂' : '🎤'}
                      </span>
                      <span>
                        {isListeningKey === item.word_en.toLowerCase()
                          ? copy.listening
                          : copy.speak}
                      </span>
                    </ClayButton>
                  </div>

                  {/* Practice Feedback Badge */}
                  {practicedStatus && (
                    <div className="mt-2">
                      <ClayPill color={practicedStatus.passed ? 'emerald' : 'yellow'}>
                        {practicedStatus.passed ? `✓ ${copy.passed}` : copy.tryAgain}
                      </ClayPill>
                    </div>
                  )}
                </ClayStage>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Continue Button */}
      <div className="pt-1">
        <ClayButton
          variant="emerald"
          onClick={handleNextWord}
          size="lg"
        >
          {currentIndex < vocabulary.length - 1 ? copy.nextWord : copy.finishVocab}
        </ClayButton>
      </div>

      {/* Completion Banner */}
      {showCelebration && (
        <ClayStage
          color="emerald"
          className="p-3.5 text-center animate-fade-in mt-2 border-2 border-emerald-300"
        >
          <span className="text-2xl block mb-0.5">🎉</span>
          <p className="text-sm font-black text-emerald-950">{copy.allDone}</p>
          {onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="mt-2 text-xs font-black text-emerald-800 underline cursor-pointer hover:text-emerald-950"
            >
              Tiếp tục ngay →
            </button>
          )}
        </ClayStage>
      )}
    </section>
  );
};
