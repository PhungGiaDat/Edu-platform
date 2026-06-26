import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ChevronLeftIcon } from '../../components/Icons';
import { adminDecksApi, adminFlashcardsApi } from '../../services/adminApi';
import type { FlashcardCreate, FlashcardUpdate } from '../../types/admin';

interface FlashcardEditorProps {
  mode: 'deck-new' | 'deck-edit' | 'card-new' | 'card-edit';
}

const FlashcardEditor: React.FC<FlashcardEditorProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { deckId, cardId } = useParams<{ deckId?: string; cardId?: string }>();

  // Deck form state
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');

  // Card form state
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [arModelUrl, setArModelUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'deck-new') {
        await adminDecksApi.createDeck({
          name: deckName,
          description: deckDescription,
        });
        navigate('/admin/flashcards');
      } else if (mode === 'deck-edit' && deckId) {
        await adminDecksApi.updateDeck(deckId, {
          name: deckName,
          description: deckDescription,
        });
        navigate('/admin/flashcards');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deck');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data: FlashcardCreate | FlashcardUpdate = {
        front_text: frontText,
        back_text: backText,
        ar_model_url: arModelUrl,
      };

      if (mode === 'card-new' && deckId) {
        await adminFlashcardsApi.createFlashcard(deckId, data);
        navigate(`/admin/flashcards/${deckId}`);
      } else if (mode === 'card-edit' && deckId && cardId) {
        await adminFlashcardsApi.updateFlashcard(cardId, data);
        navigate(`/admin/flashcards/${deckId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = mode.startsWith('deck') ? handleDeckSubmit : handleCardSubmit;

  const getTitle = () => {
    switch (mode) {
      case 'deck-new': return 'Create New Deck';
      case 'deck-edit': return 'Edit Deck';
      case 'card-new': return 'Add New Card';
      case 'card-edit': return 'Edit Card';
      default: return '';
    }
  };

  const getBackPath = () => {
    if (mode === 'deck-new' || mode === 'deck-edit') {
      return '/admin/flashcards';
    }
    return deckId ? `/admin/flashcards/${deckId}` : '/admin/flashcards';
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(getBackPath())}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{getTitle()}</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode.startsWith('deck') ? (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Deck Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                    placeholder="Enter deck name"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={deckDescription}
                    onChange={(e) => setDeckDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                    placeholder="Enter deck description"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="frontText" className="block text-sm font-medium text-gray-700 mb-1">
                    Front Text (Question)
                  </label>
                  <textarea
                    id="frontText"
                    value={frontText}
                    onChange={(e) => setFrontText(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                    placeholder="Enter the question or prompt"
                  />
                </div>
                <div>
                  <label htmlFor="backText" className="block text-sm font-medium text-gray-700 mb-1">
                    Back Text (Answer)
                  </label>
                  <textarea
                    id="backText"
                    value={backText}
                    onChange={(e) => setBackText(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                    placeholder="Enter the answer"
                  />
                </div>
                <div>
                  <label htmlFor="arModelUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    AR Model URL (optional)
                  </label>
                  <input
                    type="url"
                    id="arModelUrl"
                    value={arModelUrl}
                    onChange={(e) => setArModelUrl(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                    placeholder="https://example.com/model.glb"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(getBackPath())}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#6EB9FF] text-white rounded-xl hover:bg-[#5BA8EF] disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

// Route components
export const DeckNewPage = () => <FlashcardEditor mode="deck-new" />;
export const DeckEditPage = () => <FlashcardEditor mode="deck-edit" />;
export const CardNewPage = () => <FlashcardEditor mode="card-new" />;
export const CardEditPage = () => <FlashcardEditor mode="card-edit" />;

export default FlashcardEditor;
