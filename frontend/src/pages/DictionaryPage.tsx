/**
 * DictionaryPage - AI Tra từ
 * Web screen for AI-powered translation
 */
import { useState, useCallback } from 'react';
import { ClayCard } from '../components/ClayCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { colors, shadows, radius } from '../design-tokens/claymorphic';
import { notebookApi } from '../services/notebookApi';
import type { TranslateResponse, WordBreakdown, RelatedWord } from '../types/notebook';
import { useAuth } from '../contexts/AuthContext';

export function DictionaryPage() {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedWord, setSavedWord] = useState<string | null>(null);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSavedWord(null);

    try {
      const response = await fetch('/api/v1/dictionary/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          context: context || undefined,
          target_lang: 'vi',
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data: TranslateResponse = await response.json();
      setResult(data);
    } catch (err) {
      console.error('[DictionaryPage] Translation failed:', err);
      setError('Không thể dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [inputText, context]);

  const handleSaveToNotebook = async () => {
    if (!result || !user) return;

    try {
      // Extract first word and save
      const words = result.original.split(/\s+/);
      const firstWord = words[0].replace(/[^a-zA-Z]/g, '');

      await notebookApi.create({
        word: firstWord || result.original.slice(0, 50),
        translation_vi: result.translation.vi,
        translation_en: result.translation.literalTranslation,
        context: result.original,
        source: 'ai_translation',
      });

      setSavedWord(firstWord);
      setTimeout(() => setSavedWord(null), 3000);
    } catch (err) {
      console.error('[DictionaryPage] Save failed:', err);
      alert('Không thể lưu vào sổ tay');
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.backgroundBase }}>
      {/* Header */}
      <div
        className="px-4 pt-8 pb-6"
        style={{
          background: `linear-gradient(135deg, ${colors.sunshineYellow}40, ${colors.mintGreen}40)`,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2" style={{ color: colors.deepSlate }}>
            🤖 Tra từ AI
          </h1>
          <p className="text-sm" style={{ color: colors.mediumGray }}>
            Dịch câu với AI, kết hợp wiki để hiểu ngữ cảnh
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
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
              disabled={loading || !inputText.trim()}
              className="w-full text-lg py-4"
              style={{
                backgroundColor: colors.skyBlue,
                boxShadow: shadows.clayBlue,
              }}
            >
              {loading ? (
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
        {error && (
          <div
            className="mt-4 p-4 rounded-xl text-center"
            style={{ backgroundColor: colors.coralPink + '20', color: colors.coralPink }}
          >
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 space-y-4 animate-fade-in">
            {/* Main Translation */}
            <ClayCard className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="primary" size="sm">
                    🤖 AI Translation
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveToNotebook}
                  disabled={!!savedWord}
                  style={{
                    backgroundColor: savedWord ? colors.mintGreen + '30' : undefined,
                  }}
                >
                  {savedWord ? `✓ Đã lưu "${savedWord}"` : '📓 Lưu vào Sổ tay'}
                </Button>
              </div>

              {/* Original */}
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                  Tiếng Anh
                </p>
                <p className="text-lg font-medium" style={{ color: colors.deepSlate }}>
                  {result.original}
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
                  {result.translation.vi}
                </p>
              </div>

              {/* Literal Translation */}
              {result.translation.literalTranslation && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.lightGray }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                    Dịch từng từ
                  </p>
                  <p className="text-sm italic" style={{ color: colors.mediumGray }}>
                    {result.translation.literalTranslation}
                  </p>
                </div>
              )}

              {/* Context Note */}
              {result.translation.contextualNote && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: colors.lightGray }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.mediumGray }}>
                    💡 Giải thích
                  </p>
                  <p className="text-sm" style={{ color: colors.deepSlate }}>
                    {result.translation.contextualNote}
                  </p>
                </div>
              )}
            </ClayCard>

            {/* Word Breakdown */}
            {result.word_breakdown && result.word_breakdown.length > 0 && (
              <ClayCard className="p-4">
                <h3 className="font-bold mb-3" style={{ color: colors.deepSlate }}>
                  📖 Phân tích từ
                </h3>
                <div className="space-y-2">
                  {result.word_breakdown.slice(0, 8).map((word: WordBreakdown, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ backgroundColor: colors.warmWhite }}
                    >
                      <span className="font-medium w-24 truncate" style={{ color: colors.deepSlate }}>
                        {word.word}
                      </span>
                      {word.pronunciation && (
                        <span className="text-xs" style={{ color: colors.mediumGray }}>
                          {word.pronunciation}
                        </span>
                      )}
                      <span className="flex-1 text-right" style={{ color: colors.skyBlue }}>
                        {word.translation}
                      </span>
                    </div>
                  ))}
                </div>
              </ClayCard>
            )}

            {/* Related Words */}
            {result.related_words && result.related_words.length > 0 && (
              <ClayCard className="p-4">
                <h3 className="font-bold mb-3" style={{ color: colors.deepSlate }}>
                  🔗 Từ liên quan
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.related_words.slice(0, 8).map((word: RelatedWord, i: number) => (
                    <Badge key={i} variant="secondary">
                      {word.word}
                    </Badge>
                  ))}
                </div>
              </ClayCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DictionaryPage;
