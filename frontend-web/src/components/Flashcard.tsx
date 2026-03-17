// frontend-web/src/components/Flashcard.tsx
// Flashcard with tap-to-play audio and optional image animation.
// - Clicking the image plays audio from audioUrl (Supabase) or falls back to SpeechSynthesis.
// - imageAnimationType: "bounce" | "pulse" | "wiggle" maps to Tailwind / custom CSS.
// - On each tap a brief bounce is triggered regardless of imageAnimationType.

import { QRCodeCanvas } from "qrcode.react";
import { useState, useRef, useCallback } from "react";

type FlashcardProps = {
  word: string;
  bgUrl: string;
  imgUrl: string;
  qrData: string;
  audioUrl?: string;           // Supabase public URL
  imageAnimationType?: string; // "bounce" | "pulse" | "wiggle" | undefined
  translation?: string;        // shown on hover / flip
};

// Mapping from imageAnimationType to Tailwind animation class
const ANIMATION_CLASS: Record<string, string> = {
  bounce: "animate-bounce",
  pulse:  "animate-pulse",
  wiggle: "animate-wiggle",   // custom keyframe defined in index.css / tailwind.config
};

function speakWord(word: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(word);
  utt.lang = "en-US";
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

export default function Flashcard({
  word,
  bgUrl,
  imgUrl,
  qrData,
  audioUrl,
  imageAnimationType,
  translation,
}: FlashcardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tapped, setTapped] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determine persistent animation class from prop
  const persistentAnim =
    imageAnimationType && ANIMATION_CLASS[imageAnimationType]
      ? ANIMATION_CLASS[imageAnimationType]
      : "";

  // Tap-triggered one-shot bounce (always applies on click)
  const tapAnim = tapped ? "animate-bounce" : "";

  const handleImageClick = useCallback(() => {
    // Trigger brief bounce animation
    setTapped(true);
    setTimeout(() => setTapped(false), 600);

    // Play audio
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setIsPlaying(true);

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play()
        .then(() => {
          audio.onended = () => setIsPlaying(false);
        })
        .catch(() => {
          speakWord(word);
          setIsPlaying(false);
        });
    } else {
      speakWord(word);
      // SpeechSynthesis has no reliable end event for short words; reset after 1.5s
      setTimeout(() => setIsPlaying(false), 1500);
    }
  }, [isPlaying, audioUrl, word]);

  return (
    <div
      id="flashcard"
      className="w-80 h-96 rounded-2xl shadow-xl overflow-hidden relative border-4 border-green-400"
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-blue-200 bg-opacity-50" />

      {/* QR Code — top right */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg z-30">
        <QRCodeCanvas value={qrData} size={60} />
      </div>

      {/* Speaker icon — top left, pulses while playing */}
      <button
        onClick={handleImageClick}
        aria-label={`Play pronunciation of ${word}`}
        className={`absolute top-4 left-4 z-30 bg-white rounded-full p-2 shadow-md
          transition-transform active:scale-95
          ${isPlaying ? "animate-pulse ring-2 ring-blue-400" : "hover:scale-110"}`}
      >
        <span className="text-xl">{isPlaying ? "🔊" : "🔈"}</span>
      </button>

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-center items-center p-6">
        {/* Main image — clickable, animated */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <button
            onClick={handleImageClick}
            aria-label={`Tap to hear ${word}`}
            className={`bg-yellow-100 p-4 rounded-xl shadow-lg max-w-xs max-h-64
              cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-300
              ${persistentAnim || tapAnim}`}
            style={{ border: "3px solid transparent" }}
          >
            <img
              src={imgUrl}
              alt={word}
              className="max-h-48 max-w-full object-contain rounded-lg select-none"
              draggable={false}
            />
          </button>
        </div>

        {/* Word label */}
        <div className="bg-orange-200 bg-opacity-95 px-6 py-3 rounded-xl shadow-lg text-center">
          <span className="text-2xl font-bold text-pink-500 tracking-wide">
            {word.toUpperCase()}
          </span>
          {translation && (
            <p className="text-sm font-semibold text-orange-700 mt-1">{translation}</p>
          )}
        </div>
      </div>
    </div>
  );
}
