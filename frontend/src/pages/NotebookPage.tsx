/**
 * NotebookPage - Sổ tay vocabulary notebook
 * Web screen for viewing and managing saved vocabulary
 */
import { useState, useEffect, useCallback } from 'react';
import { notebookApi, type NotebookListResponse, type DueCardsResponse } from '../services/notebookApi';
import type { NotebookEntry, VocabularyTopic } from '../types/notebook';
import { useAuth } from '../contexts/AuthContext';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Badge } from '@/shared/components/ui/Badge';
import { colors, shadows } from '../design-tokens/claymorphic';
import { VocabularyTopics } from '@/features/learning/components/VocabularyTopics';

interface NotebookPageProps {
  onNavigateToFlashcards?: () => void;
}

export function NotebookPage({ onNavigateToFlashcards }: NotebookPageProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [topics, setTopics] = useState<VocabularyTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dueCards, setDueCards] = useState<DueCardsResponse | null>(null);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response: NotebookListResponse = await notebookApi.list({
        topic: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
        search: searchQuery || undefined,
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
  }, [user, searchQuery, selectedTopic, selectedDifficulty]);

  // Fetch topics
  const fetchTopics = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/vocabulary/topics');
      const data = await response.json();
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

  // Delete entry
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa từ này?')) return;

    try {
      await notebookApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('[NotebookPage] Delete failed:', err);
      alert('Xóa thất bại');
    }
  };

  // Get source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai_translation': return '🤖';
      case 'flashcard': return '🃏';
      case 'manual': return '✏️';
      default: return '📝';
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return colors.mintGreen;
      case 'medium': return colors.sunshineYellow;
      case 'hard': return colors.coralPink;
      default: return colors.mediumGray;
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: colors.backgroundBase }}>
      {/* Header */}
      <div
        className="px-4 pt-8 pb-6"
        style={{
          background: `linear-gradient(135deg, ${colors.lavender}40, ${colors.skyBlue}40)`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.deepSlate }}>
                📓 Sổ tay từ vựng
              </h1>
              <p className="text-sm" style={{ color: colors.mediumGray }}>
                {entries.length} từ đã lưu
                {dueCards && dueCards.count > 0 && (
                  <span className="ml-2 text-red-500 font-semibold">
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
              >
                {viewMode === 'grid' ? '📋' : '🔲'}
              </Button>
            </div>
          </div>

          {/* Search */}
          <Input
            type="search"
            placeholder="Tìm kiếm từ..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />

          {/* Quick Stats */}
          {dueCards && dueCards.count > 0 && (
            <div
              className="mt-4 p-4 rounded-2xl cursor-pointer"
              style={{
                backgroundColor: colors.warmWhite,
                boxShadow: shadows.clay,
              }}
              onClick={onNavigateToFlashcards}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: colors.neonTeal + '30' }}
                >
                  📚
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: colors.deepSlate }}>
                    Đến lúc ôn tập!
                  </p>
                  <p className="text-sm" style={{ color: colors.mediumGray }}>
                    {dueCards.count} từ cần xem lại ngay
                  </p>
                </div>
                <Button size="sm" variant="primary">
                  Luyện tập
                </Button>
              </div>
            </div>
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

        {/* Difficulty Filter */}
        <div className="flex gap-2 mt-3">
          {[null, 'easy', 'medium', 'hard'].map((diff) => (
            <Badge
              key={diff || 'all'}
              variant={selectedDifficulty === diff ? 'primary' : 'secondary'}
              onClick={() => setSelectedDifficulty(diff)}
              style={{
                backgroundColor: diff
                  ? selectedDifficulty === diff
                    ? getDifficultyColor(diff) + '40'
                    : colors.lightGray
                  : undefined,
              }}
            >
              {diff ? diff.charAt(0).toUpperCase() + diff.slice(1) : 'Tất cả'}
            </Badge>
          ))}
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
            <div className="text-5xl mb-4">📓</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: colors.deepSlate }}>
              Chưa có từ nào
            </h3>
            <p className="text-sm" style={{ color: colors.mediumGray }}>
              Lưu từ từ AI translation hoặc flashcard để xem ở đây
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-8">
            {entries.map((entry) => (
              <ClayCard
                key={entry.id}
                className="p-4 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {/* TODO: Show detail */}}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg">{getSourceIcon(entry.source)}</span>
                  {entry.difficulty && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getDifficultyColor(entry.difficulty) }}
                    />
                  )}
                </div>

                <h3 className="font-bold text-lg mb-1" style={{ color: colors.deepSlate }}>
                  {entry.word}
                </h3>
                <p className="text-sm" style={{ color: colors.mediumGray }}>
                  {entry.translation_vi}
                </p>

                {entry.topic && (
                  <Badge variant="secondary" size="sm" className="mt-2">
                    {entry.topic}
                  </Badge>
                )}

                <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: colors.lightGray }}>
                  <span className="text-xs" style={{ color: colors.mediumGray }}>
                    {entry.review_count} lần ôn
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: colors.coralPink + '20', color: colors.coralPink }}
                  >
                    Xóa
                  </button>
                </div>
              </ClayCard>
            ))}
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {entries.map((entry) => (
              <ClayCard
                key={entry.id}
                className="p-4 flex items-center gap-4"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: colors.skyBlue + '20' }}
                >
                  {getSourceIcon(entry.source)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold" style={{ color: colors.deepSlate }}>
                      {entry.word}
                    </h3>
                    {entry.difficulty && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getDifficultyColor(entry.difficulty) }}
                      />
                    )}
                  </div>
                  <p className="text-sm truncate" style={{ color: colors.mediumGray }}>
                    {entry.translation_vi}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {entry.topic && (
                    <Badge variant="secondary" size="sm">
                      {entry.topic}
                    </Badge>
                  )}
                  <span className="text-xs" style={{ color: colors.mediumGray }}>
                    {entry.review_count} ✓
                  </span>
                </div>
              </ClayCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotebookPage;
