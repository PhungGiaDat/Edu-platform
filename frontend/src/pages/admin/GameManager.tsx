// frontend/src/pages/admin/GameManager.tsx
/**
 * Game Manager — list admin-created games (spec §3.3, approved 2026-09-09)
 * Pattern: CourseManager (list cards + error banner/retry + delete confirm)
 * Style: Clay Editorial (admin.css tokens via Tailwind arbitrary values)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../node_modules/react-i18next';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminCard } from '@/features/admin/components/AdminCard';
import { adminGamesApi, type AdminGame, type AdminGameType } from '../../services/gamesAdminApi';
import { PlusIcon, TrashIcon, EditIcon } from '@/shared/components/icons/Icons';

export const GAME_TYPE_LABELS: Record<AdminGameType, { vi: string; en: string }> = {
  drag_match: { vi: 'Ghép cặp', en: 'Drag Match' },
  catch_word: { vi: 'Bắt chữ rơi', en: 'Catch Words' },
  word_scramble: { vi: 'Xếp chữ', en: 'Word Scramble' },
  memory_match: { vi: 'Lật thẻ nhớ', en: 'Memory Match' },
};

const GameManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const lang = (i18n.language || 'vi').startsWith('vi') ? 'vi' : 'en';

  const loadGames = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const items = await adminGamesApi.listGames();
      setGames(items);
    } catch (error) {
      console.error('Failed to load games:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleDeleteGame = async (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('admin.games.confirmDelete', 'Bạn có chắc muốn xóa trò chơi này?'))) return;
    setDeletingId(gameId);
    try {
      await adminGamesApi.deleteGame(gameId);
      setGames(prev => prev.filter(g => g.id !== gameId));
      setLoadError(null);
    } catch (error) {
      console.error('Failed to delete game:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('admin.games.title', 'Trò chơi')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('admin.games.description', 'Tạo và quản lý trò chơi từ vựng cho học viên.')}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/games/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-[13px] bg-[#0d9488] text-white font-semibold hover:bg-[#0b6b60] transition-colors shadow-[0_5px_0_#0b6b60]"
        >
          <PlusIcon className="w-5 h-5" />
          {t('admin.games.createNew', 'Tạo game')}
        </button>
      </div>

      {/* Error banner */}
      {loadError && (
        <div
          role="alert"
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-[13px] bg-[rgba(220,38,38,0.09)] border border-[rgba(220,38,38,0.25)]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span className="text-sm font-semibold text-[#dc2626] flex-1">
            {t('admin.games.loadError', 'Không tải được danh sách trò chơi')}: {loadError}
          </span>
          <button
            onClick={loadGames}
            className="px-3 py-1.5 rounded-[10px] bg-white text-[#dc2626] text-sm font-bold shadow-[0_2px_0_rgba(34,48,58,0.08)] hover:bg-red-50 transition-colors"
          >
            {t('admin.common.retry', 'Thử lại')}
          </button>
        </div>
      )}

      {/* Game list */}
      {loading && games.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#0d9488] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <AdminCard className="text-center py-12">
          <svg className="w-12 h-12 mx-auto mb-4 text-[#0d9488]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="4" /><path d="M6 12h4M8 10v4" /><circle cx="15.5" cy="11" r="0.8" fill="currentColor" /><circle cx="17.5" cy="13" r="0.8" fill="currentColor" /></svg>
          <p className="text-gray-500 mb-4">{t('admin.games.empty', 'Chưa có trò chơi nào')}</p>
          <button
            onClick={() => navigate('/admin/games/new')}
            className="px-4 py-2 rounded-[13px] bg-[#0d9488] text-white font-semibold shadow-[0_4px_0_#0b6b60]"
          >
            {t('admin.games.createFirst', 'Tạo trò chơi đầu tiên')}
          </button>
        </AdminCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {games.map((game) => (
            <AdminCard
              key={game.id}
              className="p-0 overflow-hidden cursor-pointer"
              onClick={() => navigate(`/admin/games/${game.id}/edit`)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 line-clamp-1">{game.title}</h3>
                  <span
                    className={`shrink-0 ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      game.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {game.is_published ? t('admin.games.published', 'Đã XB') : t('admin.games.draft', 'Nháp')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {t('admin.games.typeLabel', 'Loại')}: {GAME_TYPE_LABELS[game.game_type]?.[lang] ?? game.game_type}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="truncate max-w-[60%]">topic: {game.topic_id}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/games/${game.id}/edit`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                      aria-label={t('admin.common.edit', 'Sửa')}
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteGame(game.id, e)}
                      disabled={deletingId === game.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-50"
                      aria-label={t('admin.common.delete', 'Xóa')}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default GameManager;
