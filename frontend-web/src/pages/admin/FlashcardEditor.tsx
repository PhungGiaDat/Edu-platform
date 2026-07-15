import React, { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import Flashcard from '../../components/Flashcard';
import { ChevronLeftIcon } from '../../components/Icons';
import { adminDecksApi, adminFlashcardsApi } from '../../services/adminApi';
import type { Flashcard as AdminFlashcard, FlashcardCreate, FlashcardUpdate } from '../../types/admin';

interface FlashcardEditorProps {
  mode: 'deck-new' | 'deck-edit' | 'card-new' | 'card-edit';
}

const FLASHCARD_BACKGROUND_URL = '/assets/flashcards/jungle.jpg';
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getTranslationText = (card: AdminFlashcard): string =>
  card.translation.vi || card.translation.en || Object.values(card.translation).find(Boolean) || '';

const readImageFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Could not read the selected image.'));
  reader.readAsDataURL(file);
});

const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load an image for the card.'));
  image.src = src;
});

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const drawImageCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

const drawImageContain = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
};

const safeFileName = (value: string): string =>
  value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'flashcard';

const FlashcardEditor: React.FC<FlashcardEditorProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { deckId, cardId } = useParams<{ deckId?: string; cardId?: string }>();
  const qrExportRef = useRef<HTMLDivElement>(null);

  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');

  const [qrId, setQrId] = useState(cardId || '');
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [arModelUrl, setArModelUrl] = useState('');

  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setFrontText(card.word);
            setBackText(getTranslationText(card));
            setImageUrl(card.image_url || '');
            setImageName(card.image_url ? 'Current flashcard image' : '');
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
  }, [cardId, deckId, mode]);

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

  const validateCard = (): boolean => {
    const cleanQrId = qrId.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(cleanQrId)) {
      setError('QR ID can only contain letters, numbers, hyphens, and underscores.');
      return false;
    }
    if (!imageUrl) {
      setImageError('Choose an image to generate the flashcard.');
      return false;
    }
    return true;
  };

  const handleCardSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!validateCard()) return;
    setIsSubmitting(true);

    const translation = {
      en: frontText.trim(),
      vi: backText.trim(),
    };

    try {
      if (mode === 'card-new' && deckId) {
        const data: FlashcardCreate = {
          qr_id: qrId.trim(),
          word: frontText.trim(),
          translation,
          image_url: imageUrl,
          ar_model_url: arModelUrl.trim() || undefined,
        };
        await adminFlashcardsApi.createFlashcard(deckId, data);
      } else if (mode === 'card-edit' && deckId && cardId) {
        const data: FlashcardUpdate = {
          word: frontText.trim(),
          translation,
          image_url: imageUrl,
          ar_model_url: arModelUrl.trim() || undefined,
        };
        await adminFlashcardsApi.updateFlashcard(cardId, data);
      }
      navigate(`/admin/flashcards/${deckId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save flashcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Use a PNG, JPG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be 2 MB or smaller.');
      event.target.value = '';
      return;
    }

    try {
      setImageUrl(await readImageFile(file));
      setImageName(file.name);
    } catch (readError) {
      setImageError(readError instanceof Error ? readError.message : 'Could not read the image.');
    }
  };

  const handleDownloadArtwork = async () => {
    setError(null);
    if (!validateCard() || !frontText.trim()) {
      if (!frontText.trim()) setError('Add front text before downloading the flashcard.');
      return;
    }

    const qrCanvas = qrExportRef.current?.querySelector('canvas');
    if (!qrCanvas) {
      setError('The QR preview is not ready yet.');
      return;
    }

    setIsGenerating(true);
    try {
      const [cardImage, backgroundImage] = await Promise.all([
        loadImage(imageUrl),
        loadImage(FLASHCARD_BACKGROUND_URL).catch(() => null),
      ]);
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 960;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not create the card image.');

      roundedRect(context, 5, 5, 790, 950, 36);
      context.save();
      context.clip();
      if (backgroundImage) {
        drawImageCover(context, backgroundImage, 0, 0, canvas.width, canvas.height);
      } else {
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#dbeafe');
        gradient.addColorStop(1, '#bae6fd');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.fillStyle = 'rgba(191, 219, 254, 0.55)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

      context.strokeStyle = '#4ade80';
      context.lineWidth = 10;
      roundedRect(context, 7, 7, 786, 946, 34);
      context.stroke();

      context.fillStyle = '#ffffff';
      roundedRect(context, 604, 38, 158, 158, 22);
      context.fill();
      context.drawImage(qrCanvas, 623, 57, 120, 120);

      context.fillStyle = '#fef3c7';
      roundedRect(context, 105, 215, 590, 515, 30);
      context.fill();
      drawImageContain(context, cardImage, 145, 250, 510, 445);

      context.fillStyle = 'rgba(254, 215, 170, 0.97)';
      roundedRect(context, 105, 765, 590, 142, 30);
      context.fill();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#ec4899';
      context.font = '800 50px system-ui, sans-serif';
      context.fillText(frontText.trim().toUpperCase(), 400, 815, 530);
      context.fillStyle = '#c2410c';
      context.font = '700 27px system-ui, sans-serif';
      context.fillText(backText.trim(), 400, 866, 520);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Could not export the flashcard image.'));
        }, 'image/png');
      });

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${safeFileName(qrId)}-flashcard.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Could not generate the flashcard image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = mode.startsWith('deck') ? handleDeckSubmit : handleCardSubmit;
  const isCardMode = mode.startsWith('card');

  const getTitle = () => {
    switch (mode) {
      case 'deck-new': return 'Create New Deck';
      case 'deck-edit': return 'Edit Deck';
      case 'card-new': return 'Create Flashcard';
      case 'card-edit': return 'Edit Flashcard';
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
        <div className="max-w-5xl mx-auto animate-pulse" aria-label="Loading flashcard editor">
          <div className="h-11 w-28 rounded-xl bg-gray-200 mb-6" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-[620px] rounded-2xl bg-white shadow-sm" />
            <div className="h-[480px] rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={`${isCardMode ? 'max-w-6xl' : 'max-w-2xl'} mx-auto`}>
        <button
          type="button"
          onClick={() => navigate(getBackPath())}
          className="mb-6 flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-950 active:translate-y-px"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back
        </button>

        <div className={isCardMode ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start' : ''}>
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">{getTitle()}</h1>
            {isCardMode && (
              <p className="mb-7 max-w-2xl text-sm leading-6 text-gray-600">
                Add the learning content, upload one clear image, and choose the QR ID students will scan.
              </p>
            )}

            {error && (
              <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode.startsWith('deck') ? (
                <>
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
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="qrId" className="mb-2 block text-sm font-semibold text-gray-800">
                      QR ID
                    </label>
                    <input
                      type="text"
                      id="qrId"
                      value={qrId}
                      onChange={(event) => setQrId(event.target.value)}
                      required
                      disabled={mode === 'card-edit'}
                      pattern="[A-Za-z0-9_-]+"
                      className="min-h-12 w-full rounded-xl border border-gray-300 px-4 font-mono text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
                      placeholder="example: apple_001"
                      aria-describedby="qrIdHelp"
                    />
                    <p id="qrIdHelp" className="mt-2 text-xs leading-5 text-gray-600">
                      Use a unique ID with letters, numbers, hyphens, or underscores. This exact value is encoded in the QR code.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="frontText" className="mb-2 block text-sm font-semibold text-gray-800">
                        Front Text
                      </label>
                      <textarea
                        id="frontText"
                        value={frontText}
                        onChange={(event) => setFrontText(event.target.value)}
                        required
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                        placeholder="Word or question"
                      />
                    </div>
                    <div>
                      <label htmlFor="backText" className="mb-2 block text-sm font-semibold text-gray-800">
                        Back Text
                      </label>
                      <textarea
                        id="backText"
                        value={backText}
                        onChange={(event) => setBackText(event.target.value)}
                        required
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                        placeholder="Answer or translation"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cardImage" className="mb-2 block text-sm font-semibold text-gray-800">
                      Flashcard Image
                    </label>
                    <label
                      htmlFor="cardImage"
                      className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-6 text-center transition-colors hover:border-[#6EB9FF] hover:bg-blue-50/60"
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        {imageName || 'Choose an image'}
                      </span>
                      <span className="mt-1 text-xs text-gray-600">PNG, JPG, or WebP up to 2 MB</span>
                    </label>
                    <input
                      id="cardImage"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageChange}
                      required={!imageUrl}
                      className="sr-only"
                    />
                    {imageError && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{imageError}</p>}
                  </div>

                  <div>
                    <label htmlFor="arModelUrl" className="mb-2 block text-sm font-semibold text-gray-800">
                      AR Model URL <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="url"
                      id="arModelUrl"
                      value={arModelUrl}
                      onChange={(event) => setArModelUrl(event.target.value)}
                      className="min-h-12 w-full rounded-xl border border-gray-300 px-4 text-gray-950 outline-none transition focus:border-[#3A8FD1] focus:ring-2 focus:ring-[#6EB9FF]/35"
                      placeholder="https://example.com/model.glb"
                    />
                  </div>
                </>
              )}

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
                  {isSubmitting ? 'Saving...' : isCardMode ? 'Save Flashcard' : 'Save Deck'}
                </button>
              </div>
            </form>
          </div>

          {isCardMode && (
            <aside className="rounded-2xl bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-950">Live Preview</h2>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  The QR code and image update automatically as you edit.
                </p>
              </div>

              {imageUrl ? (
                <div className="overflow-x-auto pb-2">
                  <div className="pointer-events-none mx-auto w-80" aria-label="Generated flashcard preview">
                    <Flashcard
                      word={frontText.trim() || 'New card'}
                      translation={backText.trim() || 'Answer'}
                      bgUrl={FLASHCARD_BACKGROUND_URL}
                      imgUrl={imageUrl}
                      qrData={qrId.trim() || 'flashcard-preview'}
                    />
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="cardImage"
                  className="flex aspect-[5/6] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-7 text-center"
                >
                  <span className="text-sm font-semibold text-gray-800">Your card will appear here</span>
                  <span className="mt-2 text-xs leading-5 text-gray-600">Upload an image to generate the preview.</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleDownloadArtwork}
                disabled={!imageUrl || !qrId.trim() || !frontText.trim() || isGenerating}
                className="mt-4 min-h-12 w-full rounded-xl border border-[#247CC2] bg-white px-4 font-semibold text-[#176AA9] transition-colors hover:bg-blue-50 active:translate-y-px disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
              >
                {isGenerating ? 'Generating...' : 'Download Card Image'}
              </button>

              <div ref={qrExportRef} aria-hidden="true" className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
                <QRCodeCanvas value={qrId.trim() || 'flashcard-preview'} size={256} level="H" />
              </div>
            </aside>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export const DeckNewPage = () => <FlashcardEditor mode="deck-new" />;
export const DeckEditPage = () => <FlashcardEditor mode="deck-edit" />;
export const CardNewPage = () => <FlashcardEditor mode="card-new" />;
export const CardEditPage = () => <FlashcardEditor mode="card-edit" />;

export default FlashcardEditor;
