// frontend-web/src/pages/admin/FlashcardEditor.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type Konva from 'konva';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ChevronLeftIcon } from '../../components/Icons';
import { adminDecksApi, adminFlashcardsApi } from '../../services/adminApi';
import useFlashcardEditorStore from '../../stores/flashcard-editor.store';
import FlashcardCanvas from '../../components/flashcard-editor/FlashcardCanvas';
import EditorToolbar from '../../components/flashcard-editor/EditorToolbar';
import PropertiesPanel from '../../components/flashcard-editor/PropertiesPanel';
import { exportDualImages, base64ToPlain } from '../../utils/flashcard-export';
import type { Flashcard as AdminFlashcard, FlashcardCreate, FlashcardUpdate } from '../../types/admin';

interface FlashcardEditorProps {
  mode: 'deck-new' | 'deck-edit' | 'card-new' | 'card-edit';
}

const FlashcardEditor: React.FC<FlashcardEditorProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { deckId, cardId } = useParams<{ deckId?: string; cardId?: string }>();
  const stageRef = useRef<Konva.Stage>(null);

  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');

  const [qrId, setQrId] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canvas editor store
  const {
    elements,
    showQR,
    qrData,
    frontText,
    backText,
    setQrId: setStoreQrId,
    setFrontText,
    setBackText,
    setShowQR,
    isExporting,
    setIsExporting,
    saveToHistory,
  } = useFlashcardEditorStore();

  // Load existing data for edit mode
  useEffect(() => {
    if (mode !== 'deck-edit' && mode !== 'card-edit') return;

    let cancelled = false;
    const loadEditorData = async () => {
      setIsLoadingInitial(true);
      setError(null);
      try {
        if (mode === 'deck-edit' && deckId) {
          const deck = await adminDecksApi.getDeck(deckId);
          if (!cancelled) {
            setDeckName(deck.name);
            setDeckDescription(deck.description || '');
          }
        }

        if (mode === 'card-edit' && deckId && cardId) {
          const response = await adminFlashcardsApi.getFlashcardsInDeck(deckId, { limit: 100 });
          const card = response.items.find((item) => item.qr_id === cardId);
          if (!card) throw new Error('Flashcard not found in this deck.');
          if (!cancelled) {
            setQrId(card.qr_id || cardId);
            setStoreQrId(card.qr_id || cardId);
            
            // Find text elements and update them
            const frontTextEl = elements.find(el => el.type === 'text' && el.x < 400);
            const backTextEl = elements.find(el => el.type === 'text' && el.y > 200);
            
            if (frontTextEl) {
              setFrontText(card.word);
            }
            if (backTextEl) {
              const translation = card.translation.vi || card.translation.en || '';
              setBackText(translation);
            }
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load editor data');
        }
      } finally {
        if (!cancelled) setIsLoadingInitial(false);
      }
    };

    void loadEditorData();
    return () => {
      cancelled = true;
    };
  }, [cardId, deckId, mode, elements, setFrontText, setBackText, setStoreQrId]);

  // Handle QR ID changes
  const handleQrIdChange = useCallback((value: string) => {
    setQrId(value);
    setStoreQrId(value);
    saveToHistory();
  }, [setStoreQrId, saveToHistory]);

  // Handle deck submit
  const handleDeckSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'deck-new') {
        await adminDecksApi.createDeck({
          name: deckName.trim(),
          description: deckDescription.trim(),
        });
      } else if (mode === 'deck-edit' && deckId) {
        await adminDecksApi.updateDeck(deckId, {
          name: deckName.trim(),
          description: deckDescription.trim(),
        });
      }
      navigate('/admin/flashcards');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save deck');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate card
  const validateCard = useCallback((): boolean => {
    const cleanQrId = qrId.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(cleanQrId)) {
      setError('QR ID can only contain letters, numbers, hyphens, and underscores.');
      return false;
    }
    return true;
  }, [qrId]);

  // Handle card submit with canvas export
  const handleCardSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validateCard()) return;

    setIsSubmitting(true);
    setIsExporting(true);

    try {
      // Export canvas to two images
      const { imageWithQr, imageWithoutQr } = await exportDualImages(
        stageRef,
        qrId.trim(),
        showQR
      );

      // Upload to Supabase
      const uploadResult = await adminFlashcardsApi.uploadFlashcardImage(
        qrId.trim(),
        base64ToPlain(imageWithoutQr),
        base64ToPlain(imageWithQr)
      );

      // Create or update flashcard
      const translation = {
        en: frontText.trim(),
        vi: backText.trim(),
      };

      if (mode === 'card-new' && deckId) {
        const data: FlashcardCreate = {
          qr_id: qrId.trim(),
          word: frontText.trim(),
          translation,
          image_url: uploadResult.image_url,
        };
        await adminFlashcardsApi.createFlashcard(deckId, data);
      } else if (mode === 'card-edit' && cardId) {
        const data: FlashcardUpdate = {
          word: frontText.trim(),
          translation,
          image_url: uploadResult.image_url,
        };
        await adminFlashcardsApi.updateFlashcard(cardId, data);
      }

      navigate(deckId ? `/admin/flashcards/${deckId}` : '/admin/flashcards');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save flashcard');
    } finally {
      setIsSubmitting(false);
      setIsExporting(false);
    }
  };

  const handleSubmit = mode.startsWith('deck') ? handleDeckSubmit : handleCardSubmit;
  const isCardMode = mode.startsWith('card');

  const getTitle = () => {
    switch (mode) {
      case 'deck-new': return 'Create New Deck';
      case 'deck-edit': return 'Edit Deck';
      case 'card-new': return 'Create Flashcard (Canvas)';
      case 'card-edit': return 'Edit Flashcard (Canvas)';
      default: return '';
    }
  };

  const getBackPath = () => {
    if (mode === 'deck-new' || mode === 'deck-edit') return '/admin/flashcards';
    return deckId ? `/admin/flashcards/${deckId}` : '/admin/flashcards';
  };

  if (isLoadingInitial) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto animate-pulse" aria-label="Loading flashcard editor">
          <div className="h-11 w-28 rounded-xl bg-gray-200 mb-6" />
          <div className="h-[900px] rounded-2xl bg-white shadow-sm" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={`${isCardMode ? 'max-w-7xl' : 'max-w-2xl'} mx-auto`}>
        <button
          type="button"
          onClick={() => navigate(getBackPath())}
          className="mb-6 flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-950 active:translate-y-px"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back
        </button>

        {isCardMode ? (
          <div className="space-y-6">
            <div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">{getTitle()}</h1>
              <p className="text-sm leading-6 text-gray-600">
                Design your flashcard on the canvas, add text and images, then save to generate the QR code.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                {error}
              </div>
            )}

            {/* Main Editor Area */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Left: Canvas and Toolbar */}
              <div className="space-y-4">
                {/* Metadata */}
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="qrId" className="mb-2 block text-sm font-semibold text-gray-800">
                        QR ID *
                      </label>
                      <input
                        type="text"
                        id="qrId"
                        value={qrId}
                        onChange={(e) => handleQrIdChange(e.target.value)}
                        required
                        disabled={mode === 'card-edit'}
                        pattern="[A-Za-z0-9_-]+"
                        className="min-h-10 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35 disabled:cursor-not-allowed disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="frontText" className="mb-2 block text-sm font-semibold text-gray-800">
                        Front Text *
                      </label>
                      <input
                        type="text"
                        id="frontText"
                        value={frontText}
                        onChange={(e) => {
                          setFrontText(e.target.value);
                          saveToHistory();
                        }}
                        required
                        className="min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                      />
                    </div>
                    <div>
                      <label htmlFor="backText" className="mb-2 block text-sm font-semibold text-gray-800">
                        Back Text *
                      </label>
                      <input
                        type="text"
                        id="backText"
                        value={backText}
                        onChange={(e) => {
                          setBackText(e.target.value);
                          saveToHistory();
                        }}
                        required
                        className="min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                      />
                    </div>
                  </div>
                </div>

                {/* Toolbar */}
                <EditorToolbar />

                {/* Canvas */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <FlashcardCanvas stageRef={stageRef} />
                      {/* QR Overlay */}
                      {showQR && (
                        <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-white p-2 shadow-lg">
                          <div className="text-xs text-gray-500 mb-1 text-center">QR Preview</div>
                          {/* QR will be rendered by the canvas */}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(getBackPath())}
                    className="min-h-11 rounded-xl border border-gray-300 px-6 font-semibold text-gray-800 transition-colors hover:bg-gray-50 active:translate-y-px"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="flashcard-form"
                    disabled={isSubmitting || isExporting}
                    className="min-h-11 rounded-xl bg-[#247CC2] px-7 font-semibold text-white transition-colors hover:bg-[#176AA9] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmitting || isExporting ? 'Exporting...' : 'Save Flashcard'}
                  </button>
                </div>
              </div>

              {/* Right: Properties Panel */}
              <div className="lg:sticky lg:top-6">
                <PropertiesPanel />

                {/* QR Toggle */}
                <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">QR Code</h3>
                      <p className="text-sm text-gray-500">Include in exported image</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={showQR}
                        onChange={(e) => setShowQR(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden form for submit */}
            <form id="flashcard-form" onSubmit={handleSubmit} className="hidden" />
          </div>
        ) : (
          /* Deck Mode */
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">{getTitle()}</h1>

            {error && (
              <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-800">
                  Deck Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={deckName}
                  onChange={(event) => setDeckName(event.target.value)}
                  required
                  className="min-h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                  placeholder="Enter deck name"
                />
              </div>
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-800">
                  Description
                </label>
                <textarea
                  id="description"
                  value={deckDescription}
                  onChange={(event) => setDeckDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                  placeholder="Enter deck description"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(getBackPath())}
                  className="min-h-12 rounded-xl border border-gray-300 px-6 font-semibold text-gray-800 transition-colors hover:bg-gray-50 active:translate-y-px"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-12 rounded-xl bg-[#247CC2] px-7 font-semibold text-white transition-colors hover:bg-[#176AA9] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isSubmitting ? 'Saving...' : 'Save Deck'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export const DeckNewPage = () => <FlashcardEditor mode="deck-new" />;
export const DeckEditPage = () => <FlashcardEditor mode="deck-edit" />;
export const CardNewPage = () => <FlashcardEditor mode="card-new" />;
export const CardEditPage = () => <FlashcardEditor mode="card-edit" />;

export default FlashcardEditor;
