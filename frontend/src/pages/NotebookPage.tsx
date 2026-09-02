/**
 * NotebookPage - Sổ tay vocabulary notebook
 * Web screen for viewing and managing saved vocabulary
 */
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { notebookApi, type NotebookListResponse, type DueCardsResponse } from '../services/notebookApi';
import { apiClient } from '../services/apiClient';
import type { NotebookEntry, VocabularyTopic } from '../types/notebook';
import { useAuth } from '../contexts/AuthContext';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Badge } from '@/shared/components/ui/Badge';
import { NotebookEntryDetail } from '@/features/notebook/components/NotebookEntryDetail';
import {
  NotebookIcon,
  CardsIcon,
  PencilIcon,
  SparkleIcon,
  BookIcon,
  CheckIcon,
  GridViewIcon,
  ListViewIcon,
} from '@/features/dictionary/components/icons';
import { colors, shadows, dangerColors, withOpacity } from '../design-tokens/claymorphic';
import { VocabularyTopics } from '@/features/learning/components/VocabularyTopics';

// Decorative floating-clay 3D band — lazy so the three-vendor chunk stays out
// of the initial bundle. Error-safe: if WebGL is unavailable the Suspense
// fallback (static gradient band) simply remains.
const ClayFloat3D = lazy(() => import('@/shared/components/clay/ClayFloat3D'));

/**
 * Pastel card palette for entry cards — stable per-word assignment so each
 * word always renders in its own colour (kids recognise "their" words).
 * Ink stays deepSlate everywhere: all pastels measure ≥ 4.5:1 against it.
 */
const WORD_PASTELS = [
  { bg: colors.mintGreen, tint: 0.32 },
  { bg: colors.skyBlue, tint: 0.3 },
  { bg: colors.sunshineYellow, tint: 0.3 },
  { bg: colors.coralPink, tint: 0.28 },
  { bg: colors.lavender, tint: 0.26 },
] as const;

function wordPastel(word: string) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) % 997;
  return WORD_PASTELS[hash % WORD_PASTELS.length];
}

/** Difficulty chips — labelled clay chips instead of anonymous dots. */
const DIFFICULTY_CHIP: Record<string, { bg: string; ink: string; label: string }> = {
  easy: { bg: colors.mintGreenDark ?? '#7DC760', ink: '#14532D', label: 'Dễ' },
  medium: { bg: colors.sunshineYellow, ink: '#713F12', label: 'Vừa' },
  hard: { bg: colors.coralPink, ink: '#7F1D1D', label: 'Khó' },
};

interface NotebookPageProps {
  onNavigateToFlashcards?: () => void;
}

export function NotebookPage({ onNavigateToFlashcards }: NotebookPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const handlePractice = onNavigateToFlashcards ?? (() => navigate('/flashcards'));
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [topics, setTopics] = useState<VocabularyTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dueCards, setDueCards] = useState<DueCardsResponse | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntry | null>(null);

  // Debounce search input by 300ms before triggering a fetch
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response: NotebookListResponse = await notebookApi.list({
        topic: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
        search: debouncedSearch || undefined,
        page: 1,
        per_page: 50,
      });

      setEntries(response.items);

      // Also fetch due cards count
      const dueResponse = await notebookApi.getDueCards(10);
      setDueCards(dueResponse);
    } catch (err) {
      console.error('[NotebookPage] Failed to fetch entries:', err);
      setError('Không thể tải danh sách từ vựng');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, selectedTopic, selectedDifficulty]);

  // Fetch topics — via apiClient so the request honours VITE_API_BASE and
  // carries the auth header (a bare relative fetch() 404s on any deploy
  // where the frontend origin differs from the API origin).
  const fetchTopics = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/v1/vocabulary/topics');
      setTopics(data.items || []);
    } catch (err) {
      console.error('[NotebookPage] Failed to fetch topics:', err);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchTopics();
  }, [fetchEntries, fetchTopics]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Delete entry — also closes the detail dialog if that entry was open
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa từ này?')) return;

    try {
      await notebookApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setSelectedEntry(prev => (prev?.id === id ? null : prev));
    } catch (err) {
      console.error('[NotebookPage] Delete failed:', err);
      alert('Xóa thất bại');
    }
  };

  // Where an entry came from, shown as a line icon rather than an emoji
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai_translation': return <SparkleIcon className="h-5 w-5" />;
      case 'flashcard': return <CardsIcon className="h-5 w-5" />;
      case 'manual': return <PencilIcon className="h-5 w-5" />;
      default: return <NotebookIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.backgroundBase }}>
      {/* Header — vibrant clay gradient with floating 3D clay shapes */}
      <div
        className="px-4 pt-8 pb-6 rounded-b-[2.5rem]"
        style={{
          background: `linear-gradient(135deg, ${withOpacity(colors.lavender, 0.5)}, ${withOpacity(colors.skyBlue, 0.45)} 55%, ${withOpacity(colors.bubblePink, 0.35)})`,
          boxShadow: shadows.clay,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0">
              <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: colors.deepSlate }}>
                <span
                  className="inline-flex items-center justify-center h-10 w-10 rounded-2xl shrink-0"
                  style={{ backgroundColor: colors.sunshineYellow, boxShadow: shadows.clayYellow }}
                >
                  <NotebookIcon className="h-6 w-6" />
                </span>
                Sổ tay từ vựng
              </h1>
              <p className="text-sm mt-2 font-semibold" style={{ color: colors.mediumGray }}>
                {entries.length} từ đã lưu
                {dueCards && dueCards.count > 0 && (
                  <span className="ml-2 font-bold" style={{ color: dangerColors.ink }}>
                    • {dueCards.count} cần ôn tập
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                aria-label={viewMode === 'grid' ? 'Chuyển sang dạng danh sách' : 'Chuyển sang dạng lưới'}
              >
                {viewMode === 'grid' ? <ListViewIcon className="h-5 w-5" /> : <GridViewIcon className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Floating clay 3D decorative band (lazy, reduced-motion aware) */}
          <Suspense
            fallback={
              <div
                className="mt-2 rounded-3xl h-16"
                style={{
                  background: `linear-gradient(90deg, ${withOpacity(colors.sunshineYellow, 0.5)}, ${withOpacity(colors.coralPink, 0.4)}, ${withOpacity(colors.mintGreen, 0.5)})`,
                }}
                aria-hidden="true"
              />
            }
          >
            <ClayFloat3D height={92} className="mt-1" />
          </Suspense>

          {/* Search */}
          <Input
            type="search"
            aria-label="Tìm kiếm từ đã lưu"
            placeholder="Tìm kiếm từ..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />

          {/* Quick Stats — playful review reminder */}
          {dueCards && dueCards.count > 0 && (
            <ClayCard
              className="mt-4 p-4"
              onClick={handlePractice}
              style={{ backgroundColor: colors.warmWhite }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: withOpacity(colors.neonTeal, 0.35), color: colors.deepSlate, boxShadow: shadows.claySm }}
                >
                  <BookIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black" style={{ color: colors.deepSlate }}>
                    Đến lúc ôn tập!
                  </p>
                  <p className="text-sm" style={{ color: colors.mediumGray }}>
                    {dueCards.count} từ cần xem lại ngay
                  </p>
                </div>
                <Button size="sm" variant="primary" onClick={handlePractice}>
                  Luyện tập
                </Button>
              </div>
            </ClayCard>
          )}
        </div>
      </div>

      {/* Topic Filter */}
      <div className="px-4 py-3 max-w-4xl mx-auto">
        <VocabularyTopics
          topics={topics}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
        />

        {/* Difficulty Filter — labelled clay chips */}
        <div className="flex gap-2 mt-3">
          {[null, 'easy', 'medium', 'hard'].map((diff) => {
            const selected = selectedDifficulty === diff;
            const chip = diff ? DIFFICULTY_CHIP[diff] : undefined;
            return (
              <button
                key={diff || 'all'}
                type="button"
                onClick={() => setSelectedDifficulty(diff)}
                aria-pressed={selected}
                className="rounded-full px-3.5 py-1.5 text-sm font-bold cursor-pointer transition-colors duration-200"
                style={{
                  backgroundColor: chip && selected ? chip.bg : withOpacity(colors.warmWhite, 0.85),
                  color: chip && selected ? chip.ink : colors.mediumGray,
                  boxShadow: selected ? shadows.claySm : 'none',
                }}
              >
                {chip ? chip.label : 'Tất cả'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchEntries}>Thử lại</Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="mx-auto mb-4 flex items-center justify-center h-20 w-20 rounded-full"
              style={{ backgroundColor: withOpacity(colors.sunshineYellow, 0.4), boxShadow: shadows.clay, color: colors.deepSlate }}
            >
              <NotebookIcon className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-black mb-2" style={{ color: colors.deepSlate }}>
              Sổ tay còn trống
            </h3>
            <p className="text-sm max-w-xs mx-auto" style={{ color: colors.mediumGray }}>
              Tra một từ ở tab <strong>Tra từ</strong> rồi bấm “Lưu vào Sổ tay” để bắt đầu bộ sưu tập của bạn nhé!
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-8">
            {entries.map((entry) => {
              const pastel = wordPastel(entry.word);
              const diffChip = entry.difficulty ? DIFFICULTY_CHIP[entry.difficulty] : undefined;
              return (
                <ClayCard
                  key={entry.id}
                  className="p-4"
                  onClick={() => setSelectedEntry(entry)}
                  style={{ backgroundColor: withOpacity(pastel.bg, pastel.tint) }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="inline-flex items-center justify-center h-8 w-8 rounded-xl"
                      style={{ backgroundColor: withOpacity(colors.warmWhite, 0.85), color: colors.deepSlate }}
                      aria-hidden="true"
                    >
                      {getSourceIcon(entry.source)}
                    </span>
                    {diffChip && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: diffChip.bg, color: diffChip.ink }}
                      >
                        {diffChip.label}
                      </span>
                    )}
                  </div>

                  <h3 className="mb-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntry(entry);
                      }}
                      className="font-black text-lg text-left break-words leading-snug"
                      style={{ color: colors.deepSlate }}
                      aria-label={`Xem chi tiết ${entry.word}`}
                    >
                      {entry.word}
                    </button>
                  </h3>
                  <p className="text-sm font-semibold" style={{ color: colors.mediumGray }}>
                    {entry.translation_vi}
                  </p>

                  {entry.topic && (
                    <Badge variant="secondary" size="sm" className="mt-2">
                      {entry.topic}
                    </Badge>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: withOpacity(colors.mediumGray, 0.18) }}>
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: colors.mediumGray }}>
                      <CheckIcon className="h-3.5 w-3.5" />
                      {entry.review_count} lần ôn
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry.id);
                      }}
                      className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{ backgroundColor: dangerColors.surface, color: dangerColors.ink }}
                    >
                      Xóa
                    </button>
                  </div>
                </ClayCard>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {entries.map((entry) => {
              const pastel = wordPastel(entry.word);
              const diffChip = entry.difficulty ? DIFFICULTY_CHIP[entry.difficulty] : undefined;
              return (
                <ClayCard
                  key={entry.id}
                  className="p-4 flex items-center gap-4"
                  onClick={() => setSelectedEntry(entry)}
                  style={{ backgroundColor: withOpacity(pastel.bg, pastel.tint * 0.75) }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: withOpacity(colors.warmWhite, 0.9), color: colors.deepSlate, boxShadow: shadows.claySm }}
                    aria-hidden="true"
                  >
                    {getSourceIcon(entry.source)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(entry);
                          }}
                          className="font-black text-left truncate"
                          style={{ color: colors.deepSlate }}
                          aria-label={`Xem chi tiết ${entry.word}`}
                        >
                          {entry.word}
                        </button>
                      </h3>
                      {diffChip && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: diffChip.bg, color: diffChip.ink }}
                        >
                          {diffChip.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: colors.mediumGray }}>
                      {entry.translation_vi}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.topic && (
                      <Badge variant="secondary" size="sm">
                        {entry.topic}
                      </Badge>
                    )}
                    <span
                      className="text-xs flex items-center gap-1 font-semibold"
                      style={{ color: colors.mediumGray }}
                      aria-label={`${entry.review_count} lần ôn`}
                    >
                      {entry.review_count}
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </ClayCard>
              );
            })}
          </div>
        )}
      </div>

      {selectedEntry && (
        <NotebookEntryDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  );
}

export default NotebookPage;
