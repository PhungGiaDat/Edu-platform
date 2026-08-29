/**
 * SentenceTranslateCard — "Dịch câu" mode (spec 2026-08-30, Task 10).
 *
 * Owns its own translate request lifecycle so the page only has to decide what
 * happens when a child taps a word: `onWordSelect` hands the bare word back to
 * the page, which switches to "Tra từ" and runs the rich lookup.
 *
 * Every content word is a chip, so a child can turn any sentence into vocabulary
 * without leaving it ("save-any-word").
 */
import { useCallback, useState } from 'react';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { brandColors } from '@/design-tokens/claymorphic';
import { dictionaryApi } from '@/services/dictionaryApi';
import type { TranslateResponse, WordBreakdown, RelatedWord } from '@/types/notebook';
import { SearchIcon, BookIcon, SparkleIcon, GlobeIcon, ArrowDownIcon, AlertIcon } from './icons';

export interface SentenceTranslateCardProps {
  /** Called with a single word when the child taps one of the result chips. */
  onWordSelect: (word: string) => void;
}

export function SentenceTranslateCard({ onWordSelect }: SentenceTranslateCardProps) {
  const [inputText, setInputText] = useState('');
  const [context, setContext] = useState('');
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResponse | null>(null);

  const handleTranslate = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setTranslating(true);
    setError(null);
    setResult(null);

    try {
      const data = await dictionaryApi.translate(text, context.trim() || undefined);
      setResult(data);
    } catch (err) {
      console.error('[SentenceTranslateCard] Translation failed:', err);
      setError('Không dịch được câu này. Con thử lại nhé!');
    } finally {
      setTranslating(false);
    }
  }, [inputText, context]);

  const words = result?.word_breakdown?.slice(0, 8) ?? [];
  const related = result?.related_words?.slice(0, 8) ?? [];

  return (
    <div className="space-y-4">
      {/* Input */}
      <ClayCard className="p-4" hover={false}>
        <div className="space-y-4">
          <div>
            <label htmlFor="sentence-input" className="block text-sm font-medium mb-2" style={{ color: brandColors.foreground }}>
              Câu tiếng Anh
            </label>
            <Input
              id="sentence-input"
              type="text"
              placeholder="Nhập câu tiếng Anh..."
              value={inputText}
              maxLength={500}
              autoComplete="off"
              lang="en"
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleTranslate(); }}
              className="w-full text-lg"
            />
          </div>

          <div>
            <label htmlFor="sentence-context" className="block text-sm font-medium mb-2" style={{ color: brandColors.foreground }}>
              Ngữ cảnh (tùy chọn)
            </label>
            <textarea
              id="sentence-context"
              placeholder="Thêm ngữ cảnh để dịch chính xác hơn..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full px-4 py-3 rounded-xl resize-none"
              style={{
                backgroundColor: '#F8FAFC',
                border: '2px solid #E2E8F0',
                color: brandColors.foreground,
              }}
            />
          </div>

          <Button
            variant="primary"
            onClick={() => void handleTranslate()}
            disabled={translating || !inputText.trim()}
            className="w-full text-lg py-4"
            style={{ backgroundColor: brandColors.primary, boxShadow: '0 6px 0 #1D4ED8, inset 0 1px 0 rgba(255,255,255,0.4)' }}
          >
            {translating ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" /> Đang dịch...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <SearchIcon className="h-5 w-5" />
                Dịch ngay
              </span>
            )}
          </Button>
        </div>
      </ClayCard>

      {/* Async results are announced politely */}
      <div aria-live="polite">
        {translating && (
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: '#F8FAFC' }} role="status">
            <LoadingSpinner size="sm" />
            <span className="text-sm" style={{ color: brandColors.foreground }}>Lexi đang dịch câu cho bạn...</span>
          </div>
        )}

        {error && !translating && (
          <div
            className="p-4 rounded-2xl flex flex-col gap-3"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.10)' }}
            role="alert"
          >
            <p className="text-sm font-semibold flex items-center gap-2" style={{ color: '#DC2626' }}>
              <AlertIcon className="h-4 w-4" />
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => void handleTranslate()} className="self-start">
              Thử lại
            </Button>
          </div>
        )}

        {result && !translating && (
          <ClayCard className="p-5" hover={false} style={{ backgroundColor: '#FFFFFF' }}>
            <div role="region" aria-label="Kết quả dịch câu">
              <span className="dict-source-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold">
                <SparkleIcon className="h-3.5 w-3.5" />
                AI Translation
              </span>

              <p className="text-xs uppercase tracking-wider mt-3 mb-1" style={{ color: '#64748B' }}>
                Tiếng Anh
              </p>
              <p className="text-lg font-medium break-words" style={{ color: brandColors.foreground }} lang="en">
                {result.original}
              </p>

              <div className="flex justify-center py-2" aria-hidden="true">
                <ArrowDownIcon className="h-5 w-5" />
              </div>

              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>
                Tiếng Việt
              </p>
              <p className="text-[22px] font-bold leading-snug" style={{ color: brandColors.primary }}>
                {result.translation.vi}
              </p>

              {result.translation.literalTranslation && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>
                    Dịch từng từ
                  </p>
                  <p className="text-sm italic" style={{ color: '#64748B' }} lang="en">
                    {result.translation.literalTranslation}
                  </p>
                </div>
              )}

              {words.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: brandColors.foreground }}>
                    <BookIcon className="h-4 w-4" />
                    Chạm vào từ con muốn học
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {words.map((w: WordBreakdown, i: number) => (
                      <button
                        key={`${w.word}-${i}`}
                        type="button"
                        className="dict-word-chip"
                        aria-label={`Tra từ: ${w.word}`}
                        onClick={() => onWordSelect(w.word)}
                      >
                        {w.word}
                        {w.translation ? ` · ${w.translation}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {result.translation.contextualNote && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: '#64748B' }}>
                    <SparkleIcon className="h-3.5 w-3.5" />
                    Giải thích
                  </p>
                  <p className="text-sm" style={{ color: brandColors.foreground }}>
                    {result.translation.contextualNote}
                  </p>
                </div>
              )}

              {related.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#64748B' }}>
                    <GlobeIcon className="h-3.5 w-3.5" />
                    Từ liên quan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {related.map((w: RelatedWord, i: number) => (
                      <Badge key={`${w.word}-${i}`} variant="secondary" size="sm">
                        {w.word}
                        {w.translation ? ` · ${w.translation}` : ''}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ClayCard>
        )}
      </div>
    </div>
  );
}

export default SentenceTranslateCard;
