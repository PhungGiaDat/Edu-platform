// frontend-web/src/pages/public/FlashcardView.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, VolumeUpIcon } from '../../components/Icons';
import { apiClient } from '../../services/apiClient';
import type { Flashcard } from '../../types';

interface PublicFlashcardResponse {
  qr_id: string;
  word: string;
  translation: Record<string, string>;
  image_url: string;
  audio_url?: string;
  category: string;
  ar_tag?: string;
  image_animation_type?: string;
  editor_elements?: unknown[];
  canvas_width?: number;
  canvas_height?: number;
}

const FlashcardView: React.FC = () => {
  const { qrId } = useParams<{ qrId: string }>();
  const navigate = useNavigate();
  
  const [flashcard, setFlashcard] = useState<PublicFlashcardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (!qrId) return;

    const fetchFlashcard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(`/f/${qrId}`);
        setFlashcard(response as PublicFlashcardResponse);
      } catch (err) {
        console.error('[FlashcardView] Error:', err);
        setError('Flashcard not found or QR code is invalid.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchFlashcard();
  }, [qrId]);

  const handlePlayAudio = async () => {
    if (!flashcard?.audio_url || isPlayingAudio) return;

    setIsPlayingAudio(true);
    try {
      const audio = new Audio(flashcard.audio_url);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch (err) {
      console.error('[FlashcardView] Audio error:', err);
      setIsPlayingAudio(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const getTranslation = (): string => {
    if (!flashcard) return '';
    // Prefer English, then any available translation
    return flashcard.translation.en || Object.values(flashcard.translation)[0] || '';
  };

  const getAnimationClass = (): string => {
    if (!flashcard?.image_animation_type) return '';
    switch (flashcard.image_animation_type) {
      case 'bounce': return 'animate-bounce';
      case 'pulse': return 'animate-pulse';
      case 'wiggle': return 'animate-wiggle';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flashcard...</p>
        </div>
      </div>
    );
  }

  if (error || !flashcard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">QR Code Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This QR code is not associated with any flashcard.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ChevronLeftIcon className="w-6 h-6" />
          <span className="font-medium">Back</span>
        </button>
        
        <div className="text-sm text-gray-500">
          {flashcard.category && (
            <span className="px-3 py-1 bg-white/80 rounded-full">
              {flashcard.category}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md cursor-pointer"
          onClick={handleFlip}
        >
          {/* Flashcard */}
          <div 
            className={`relative transition-transform duration-500 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front */}
            <div className={`
              bg-white rounded-3xl shadow-xl overflow-hidden
              ${!isFlipped ? '' : 'hidden'}
            `}>
              {/* Card Image */}
              {flashcard.image_url && (
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={flashcard.image_url}
                    alt={flashcard.word}
                    className={`w-full h-full object-cover ${getAnimationClass()}`}
                  />
                </div>
              )}

              {/* Card Content */}
              <div className="p-6 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {flashcard.word}
                </h1>
                <p className="text-gray-500 text-sm">
                  Tap to flip
                </p>
              </div>

              {/* Audio Button */}
              {flashcard.audio_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePlayAudio();
                  }}
                  className="absolute bottom-4 right-4 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
                >
                  <VolumeUpIcon className={`w-6 h-6 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                </button>
              )}
            </div>

            {/* Back */}
            <div className={`
              bg-gradient-to-br from-green-50 to-emerald-100 rounded-3xl shadow-xl p-6
              ${isFlipped ? '' : 'hidden'}
            `}>
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">✨</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {getTranslation()}
                </h2>
                
                {flashcard.ar_tag && (
                  <div className="mt-4 px-4 py-2 bg-white/80 rounded-xl">
                    <p className="text-sm text-gray-600">
                      AR: {flashcard.ar_tag}
                    </p>
                  </div>
                )}

                <p className="text-gray-500 text-sm mt-4">
                  Tap to flip back
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center">
        <p className="text-sm text-gray-500">
          Powered by Eduplatform
        </p>
      </footer>

      {/* QR ID Badge */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900/80 text-white text-sm font-mono rounded-full">
        {flashcard.qr_id}
      </div>
    </div>
  );
};

export default FlashcardView;
