// frontend-web/src/pages/admin/FlashcardManager.tsx
/**
 * Flashcard Manager - CRUD operations for flashcards and decks
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard } from '../../components/admin/AdminCard';
import { adminDecksApi, adminFlashcardsApi } from '../../services/adminApi';
import type { FlashcardDeck, Flashcard, PaginatedResponse } from '../../types/admin';
import { CardsIcon, PlusIcon, BookOpenIcon, TrashIcon, EditIcon, ChevronRightIcon } from '../../components/Icons';

type ViewMode = 'decks' | 'deck-detail';

const FlashcardManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('decks');
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Load decks
  const loadDecks = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 0 : page;
      const skip = currentPage * limit;
      
      const response: PaginatedResponse<FlashcardDeck> = await adminDecksApi.getDecks({ skip, limit });
      
      if (resetPage) {
        setDecks(response.items);
      } else {
        setDecks(prev => [...prev, ...response.items]);
      }
      setHasMore(response.has_more);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load decks:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Load flashcards in deck
  const loadFlashcards = useCallback(async (deckId: string, resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 0 : page;
      const skip = currentPage * limit;
      
      const response: PaginatedResponse<Flashcard> = await adminFlashcardsApi.getFlashcardsInDeck(deckId, { skip, limit });
      
      if (resetPage) {
        setFlashcards(response.items);
      } else {
        setFlashcards(prev => [...prev, ...response.items]);
      }
      setHasMore(response.has_more);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (viewMode === 'decks') {
      loadDecks(true);
    } else if (selectedDeck) {
      loadFlashcards(selectedDeck.deck_id, true);
    }
  }, [viewMode, selectedDeck?.deck_id]);

  const handleSelectDeck = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    setViewMode('deck-detail');
    setPage(0);
  };

  const handleBackToDecks = () => {
    setViewMode('decks');
    setSelectedDeck(null);
    setFlashcards([]);
    setPage(0);
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('admin.flashcards.confirmDeleteDeck'))) return;
    
    try {
      await adminDecksApi.deleteDeck(deckId);
      setDecks(prev => prev.filter(d => d.deck_id !== deckId));
    } catch (error) {
      console.error('Failed to delete deck:', error);
    }
  };

  const handleDeleteFlashcard = async (qrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('admin.flashcards.confirmDeleteCard'))) return;
    
    try {
      await adminFlashcardsApi.deleteFlashcard(qrId);
      setFlashcards(prev => prev.filter(f => f.qr_id !== qrId));
    } catch (error) {
      console.error('Failed to delete flashcard:', error);
    }
  };

  // Deck View
  if (viewMode === 'deck-detail' && selectedDeck) {
    return (
      <AdminLayout>
        {/* Back Button */}
        <button
          onClick={handleBackToDecks}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronRightIcon className="w-5 h-5 rotate-180" />
          {t('admin.flashcards.backToDecks')}
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedDeck.name?.en || selectedDeck.name?.vi || t('admin.flashcards.untitledDeck')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('admin.flashcards.cardsCount', { count: selectedDeck.card_count || 0 })}
            </p>
          </div>
          <button
            onClick={() => navigate(`/admin/flashcards/${selectedDeck.deck_id}/new`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6EB9FF] text-white font-medium hover:bg-[#3A8FD1] transition-colors shadow-lg shadow-blue-500/20"
          >
            <PlusIcon className="w-5 h-5" />
            {t('admin.flashcards.addCard')}
          </button>
        </div>

        {/* Flashcards Grid */}
        {loading && flashcards.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#6EB9FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flashcards.length === 0 ? (
          <AdminCard className="text-center py-12">
            <CardsIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('admin.flashcards.noCards')}</p>
            <button
              onClick={() => navigate(`/admin/flashcards/${selectedDeck.deck_id}/new`)}
              className="px-4 py-2 rounded-xl bg-[#6EB9FF] text-white font-medium"
            >
              {t('admin.flashcards.addFirstCard')}
            </button>
          </AdminCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {flashcards.map((card) => (
              <AdminCard
                key={card.qr_id}
                className="p-4 cursor-pointer"
                onClick={() => navigate(`/admin/flashcards/${selectedDeck.deck_id}/${card.qr_id}`)}
              >
                {/* Card Preview */}
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#6EB9FF]/10 to-[#B4E197]/10 mb-3 flex items-center justify-center overflow-hidden">
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.word} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-[#6EB9FF]/30">
                      {card.word.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Word */}
                <h3 className="font-semibold text-gray-800 truncate">{card.word}</h3>
                <p className="text-sm text-gray-500 truncate">
                  {card.translation?.en || card.translation?.vi || '-'}
                </p>
                
                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-medium
                    ${card.difficulty === 'easy' ? 'bg-green-100 text-green-700' : 
                      card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-red-100 text-red-700'}
                  `}>
                    {card.difficulty || 'easy'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/flashcards/${selectedDeck.deck_id}/${card.qr_id}/edit`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteFlashcard(card.qr_id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </AdminLayout>
    );
  }

  // Deck List View
  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('admin.flashcards.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('admin.flashcards.description', { count: total })}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/flashcards/new-deck')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6EB9FF] text-white font-medium hover:bg-[#3A8FD1] transition-colors shadow-lg shadow-blue-500/20"
        >
          <PlusIcon className="w-5 h-5" />
          {t('admin.flashcards.createDeck')}
        </button>
      </div>

      {/* Deck List */}
      {loading && decks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#6EB9FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : decks.length === 0 ? (
        <AdminCard className="text-center py-12">
          <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{t('admin.flashcards.noDecks')}</p>
          <button
            onClick={() => navigate('/admin/flashcards/new-deck')}
            className="px-4 py-2 rounded-xl bg-[#6EB9FF] text-white font-medium"
          >
            {t('admin.flashcards.createFirstDeck')}
          </button>
        </AdminCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <AdminCard
              key={deck.deck_id}
              className="p-4 cursor-pointer"
              onClick={() => handleSelectDeck(deck)}
            >
              {/* Deck Cover */}
              <div className="h-24 rounded-2xl bg-gradient-to-br from-[#6EB9FF]/20 to-[#B4E197]/20 mb-3 flex items-center justify-center">
                {deck.cover_image_url ? (
                  <img src={deck.cover_image_url} alt={deck.name?.en} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <CardsIcon className="w-10 h-10 text-[#6EB9FF]/50" />
                )}
              </div>
              
              {/* Deck Info */}
              <h3 className="font-semibold text-gray-800 truncate">
                {deck.name?.en || deck.name?.vi || t('admin.flashcards.untitledDeck')}
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                {deck.card_count || 0} {t('admin.flashcards.cards')}
              </p>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {deck.category || 'general'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/flashcards/${deck.deck_id}/edit`);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteDeck(deck.deck_id, e)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 ml-2" />
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default FlashcardManager;
