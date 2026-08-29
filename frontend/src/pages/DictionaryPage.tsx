/**
 * DictionaryPage - Tra từ
 * Two-mode lookup surface (spec 2026-08-30):
 *   1. "Tra từ"   — primary: single-word lookup with a rich definition card
 *   2. "Dịch câu" — secondary: sentence translation with save-any-word chips
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Badge } from '@/shared/components/ui/Badge';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { DefinitionCard } from '@/features/dictionary/components/DefinitionCard';
import { SearchIcon, AlertIcon } from '@/features/dictionary/components/icons';
import { colors, shadows } from '../design-tokens/claymorphic';
import { dictionaryApi } from '../services/dictionaryApi';
import { notebookApi } from '../services/notebookApi';
import { apiClient } from '../services/apiClient';
import type { LookupResponse } from '../types/dictionary';
import type { TranslateResponse, WordBreakdown, RelatedWord } from '../types/notebook';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'word' | 'sentence';
type LookupState = 'idle' | 'loading' | 'error' | 'blocked';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** A 422 from the backend means the safety gate rejected the word. */
function isBlockedError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  const message = String((err as { message?: string } | null)?.message ?? '');
  return status === 422 || message.includes('422');
}

export function DictionaryPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('word');

  // ── Tra từ (primary) ────────────────────────────────────────────────────
  const [word, setWord] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveResetTimer = useRef<number | undefined>(undefined);

  // ── Dịch câu (secondary) ────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [context, setContext] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<TranslateResponse | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);

  useEffect(() => () => window.clearTimeout(saveResetTimer.current), []);

  const handleLookup = useCallback(async (rawWord?: string) => {
    const target = (rawWord ?? '').trim() || word.trim();
    if (!target) return;
    if (rawWord) setWord(target);

    setLookupState('loading');
    setResult(null);
    setSaveState('idle');

    try {
      const data = await dictionaryApi.lookup(target);
      setResult(data);
      setLookupState('idle');
    } catch (err) {
      console.error('[DictionaryPage] Lookup failed:', err);
      setLookupState(isBlockedError(err) ? 'blocked' : 'error');
    }
  }, [word]);

  const handleSave = useCallback(async () => {
    if (!result || !user) return;
    setSaveState('saving');
    try {
      await notebookApi.create({
        word: result.word,
        translation_vi: result.translation_vi,
        translation_en: result.definition_en,
        pronunciation: result.pronunciation,
        part_of_speech: result.part_of_speech,
        definition_en: result.definition_en,
        wiki_summary: result.wiki_summary,
        source: 'word_lookup',
      });
      setSaveState('saved');
      window.clearTimeout(saveResetTimer.current);
      saveResetTimer.current = window.setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      console.error('[DictionaryPage] Save failed:', err);
      setSaveState('error');
    }
  }, [result, user]);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;

    setTranslating(true);
    setTranslateError(null);
    setTranslation(null);

    try {
      // dictionaryApi injects the API base URL + Bearer token through apiClient
      const data = await apiClient.post('/api/v1/dictionary/translate', {
        text: inputText,
        context: context || undefined,
        target_lang: 'vi',
      }) as TranslateResponse;
      setTranslation(data);
    } catch (err) {
      console.error('[DictionaryPage] Translation failed:', err);
      setTranslateError('Không thể dịch. Vui lòng thử lại.');
    } finally {
      setTranslating(false);
    }
  }, [inputText, context]);

  return (
    <div className="dict-page min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="max-w-2xl mx-auto flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black mb-1" style={{ color: colors.deepSlate }}>
              Tra từ
            </h1>
            <p className="text-sm" style={{ color: '#475569' }}>
              Tra nghĩa một từ tiếng Anh, hoặc dịch cả câu rồi chạm vào từ bạn muốn học.
            </p>
          </div>
          <CodexPetSprite animationState="waving" label="Lexi chào bạn" size={56} />
        </div>

        {/* Mode tabs */}
        <div role="tablist" aria-label="Chế độ tra cứu" className="flex gap-2 mt-5">
          {(['word', 'sentence'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              id={`tab-${m}`}
              aria-selected={mode === m}
              aria-controls={`panel-${m}`}
              onClick={() => setMode(m)}
              className="dict-mode-tab"
            >
              {m === 'word' ? 'Tra từ' : 'Dịch câu'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto">
        {mode === 'word' && (
          <div id="panel-word" role="tabpanel" aria-labelledby="tab-word" className="space-y-4">
            <ClayCard className="p-4" hover={false}>
              <div>
                <label htmlFor="lookup-word" className="block text-sm font-medium mb-2" style={{ color: colors.deepSlate }}>
                  Từ cần tra
                </label>
                <Input
                  id="lookup-word"
                  type="text"
                  placeholder="Ví dụ: elephant"
                  value={word}
                  maxLength={100}
                  autoComplete="off"
                  lang="en"
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleLookup(); }}
                  className="w-full text-lg"
                />
              </div>

              <Button
                variant="primary"
                onClick={() => void handleLookup()}
                disabled={lookupState === 'loading' || !word.trim()}
                className="w-full text-lg py-4 mt-4"
                style={{ backgroundColor: colors.skyBlue, boxShadow: shadows.clayBlue }}
              >
                {lookupState === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" /> Đang tra từ...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <SearchIcon className="h-5 w-5" />
                    Tra từ
                  </span>
                )}
              </Button>
            </ClayCard>

            {/* Async results are announced politely */}
            <div aria-live="polite">
              {lookupState === 'loading' && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: colors.warmWhite }} role="status">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm" style={{ color: colors.deepSlate }}>Lexi đang tra từ cho bạn...</span>
                </div>
              )}

              {lookupState === 'blocked' && (
                <div
                  className="p-4 rounded-2xl flex items-start gap-3"
                  style={{ backgroundColor: colors.coralPink + '20', color: colors.coralPink }}
                  role="alert"
                >
                  <CodexPetSprite animationState="waiting" label="Lexi đang chờ từ khác" size={48} />
                  <p className="text-sm font-semibold">
                    Từ này không phù hợp để tra. Bạn thử từ khác nhé!
                  </p>
                </div>
              )}

              {lookupState === 'error' && (
                <div
                  className="p-4 rounded-2xl flex flex-col gap-3"
                  style={{ backgroundColor: colors.coralPink + '20', color: colors.coralPink }}
                  role="alert"
                >
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <AlertIcon className="h-4 w-4" />
                    Dịch vụ tra từ đang bận. Thử lại sau nhé!
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void handleLookup()} className="self-start">
                    Thử lại
                  </Button>
                </div>
              )}

              {lookupState === 'idle' && result && (
                <DefinitionCard result={result} saveState={saveState} onSave={() => void handleSave()} />
              )}
            </div>
          </div>
        )}

        {mode === 'sentence' && (
          <div id="panel-sentence" role="tabpanel" aria-labelledby="tab-sentence" className="space-y-4">
            {/* Input Section */}
            <ClayCard className="p-4">
              <div className="space-y-4">
                {/* Main Input */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.deepSlate }}>
                    Câu tiếng Anh
                  </label>
                  <Input
                    type="text"
                    placeholder="Nhập câu tiếng Anh..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                    className="w-full text-lg"
                  />
                </div>

                {/* Context (Optional) */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.deepSlate }}>
                    Ngữ cảnh (tùy chọn)
                  </label>
                  <textarea
                    placeholder="Thêm ngữ cảnh để dịch chính xác hơn..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl resize-none"
                    style={{
                      backgroundColor: colors.warmWhite,
                      border: `2px solid ${colors.lightGray}`,
                      color: colors.deepSlate,
                    }}
                    rows={2}
                  />
                </div>

                {/* Translate Button */}
                <Button
                  variant="primary"
                  onClick={handleTranslate}
                  disabled={translating || !inputText.trim()}
                  className="w-full text-lg py-4"
                  style={{
                    backgroundColor: colors.skyBlue,
                    boxShadow: shadows.clayBlue,
                  }}
                >
                  {translating ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" /> Đang dịch...
                    </span>
                  ) : (
                    '🔍 Dịch ngay'
                  )}
                </Button>
              </div>
            </ClayCard>

            {/* Error Message */}
            {translateError && (
              <div
                className="mt-4 p-4 rounded-xl text-center"
                style={{ backgroundColor: colors.coralPink + '20', color: colors.coralPink }}
              >
                {translateError}
              </div>
            )}

            {/* Result */}
            {translation && (
              <div className="mt-6 space-y-4 animate-fade-in">
                {/* Main Translation */}
                <ClayCard className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge variant="primary" size="sm">
                        🤖 AI Translation
                      </Badge>
                    </div>
                  </div>

                  {/* Original */}
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                      Tiếng Anh
                    </p>
                    <p className="text-lg font-medium" style={{ color: colors.deepSlate }}>
                      {translation.original}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center py-2">
                    <span className="text-2xl">⬇️</span>
                  </div>

                  {/* Translation */}
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                      Tiếng Việt
                    </p>
                    <p className="text-xl font-bold" style={{ color: colors.skyBlue }}>
                      {translation.translation.vi}
                    </p>
                  </div>

                  {/* Literal Translation */}
                  {translation.translation.literalTranslation && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.lightGray }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                        Dịch từng từ
                      </p>
                      <p className="text-sm italic" style={{ color: colors.mediumGray }}>
                        {translation.translation.literalTranslation}
                      </p>
                    </div>
                  )}

                  {/* Context Note */}
                  {translation.translation.contextualNote && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.lightGray }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                        💡 Giải thích
                      </p>
                      <p className="text-sm" style={{ color: colors.deepSlate }}>
                        {translation.translation.contextualNote}
                      </p>
                    </div>
                  )}
                </ClayCard>

                {/* Word Breakdown */}
                {translation.word_breakdown && translation.word_breakdown.length > 0 && (
                  <ClayCard className="p-4">
                    <h3 className="font-bold mb-3" style={{ color: colors.deepSlate }}>
                      📖 Phân tích từ
                    </h3>
                    <div className="space-y-2">
                      {translation.word_breakdown.slice(0, 8).map((w: WordBreakdown, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2 rounded-lg"
                          style={{ backgroundColor: colors.warmWhite }}
                        >
                          <span className="font-medium w-24 truncate" style={{ color: colors.deepSlate }}>
                            {w.word}
                          </span>
                          {w.pronunciation && (
                            <span className="text-xs" style={{ color: colors.mediumGray }}>
                              {w.pronunciation}
                            </span>
                          )}
                          <span className="flex-1 text-right" style={{ color: colors.skyBlue }}>
                            {w.translation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ClayCard>
                )}

                {/* Related Words */}
                {translation.related_words && translation.related_words.length > 0 && (
                  <ClayCard className="p-4">
                    <h3 className="font-bold mb-3" style={{ color: colors.deepSlate }}>
                      🔗 Từ liên quan
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {translation.related_words.slice(0, 8).map((w: RelatedWord, i: number) => (
                        <Badge key={i} variant="secondary">
                          {w.word}
                        </Badge>
                      ))}
                    </div>
                  </ClayCard>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DictionaryPage;
