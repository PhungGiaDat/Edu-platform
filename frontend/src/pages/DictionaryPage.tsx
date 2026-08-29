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
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { DefinitionCard } from '@/features/dictionary/components/DefinitionCard';
import { SentenceTranslateCard } from '@/features/dictionary/components/SentenceTranslateCard';
import { SearchIcon, AlertIcon } from '@/features/dictionary/components/icons';
import { colors, shadows } from '../design-tokens/claymorphic';
import { dictionaryApi } from '../services/dictionaryApi';
import { notebookApi } from '../services/notebookApi';
import type { LookupResponse } from '../types/dictionary';
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

  // Dịch câu (secondary) keeps its own state inside SentenceTranslateCard.

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
          <div id="panel-sentence" role="tabpanel" aria-labelledby="tab-sentence">
            <SentenceTranslateCard
              onWordSelect={(w) => {
                setMode('word');
                void handleLookup(w);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default DictionaryPage;
