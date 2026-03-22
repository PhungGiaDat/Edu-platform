// src/components/PronunciationPractice.tsx
// Kid-friendly pronunciation practice with speech recognition

import React, { useState, useCallback } from 'react';
import { SpeechService } from '@/services/SpeechService';
import { AudioService } from '@/services/AudioService';

interface PronunciationPracticeProps {
    targetText: string;
    imageUrl?: string;
    audioUrl?: string;
    onComplete: (score: number) => void;
}

export const PronunciationPractice: React.FC<PronunciationPracticeProps> = ({
    targetText,
    imageUrl,
    audioUrl,
    onComplete
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; emoji: string; stars: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePlayWord = useCallback(() => {
        AudioService.playPronunciation(targetText, 'en', audioUrl);
    }, [targetText, audioUrl]);

    const handleRecord = useCallback(async () => {
        if (isRecording) {
            SpeechService.stopListening();
            setIsRecording(false);
            return;
        }

        if (!SpeechService.supported) {
            setError('Speech recognition not supported. Try Chrome!');
            return;
        }

        setIsRecording(true);
        setError(null);
        setTranscription(null);
        setScore(null);
        setFeedback(null);

        try {
            const result = await SpeechService.startListening('en', 5000);
            setTranscription(result);

            const pronunciationScore = SpeechService.scorePronunciation(targetText, result);
            setScore(pronunciationScore);

            const feedbackResult = SpeechService.getFeedback(pronunciationScore);
            setFeedback(feedbackResult);

            if (pronunciationScore >= 70) {
                AudioService.playSoundEffect('correct');
            }

            onComplete(pronunciationScore);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage.includes('Timeout') ? 'No speech detected. Try again!' : `Error: ${errorMessage}`);
        } finally {
            setIsRecording(false);
        }
    }, [isRecording, targetText, onComplete]);

    const handleTryAgain = useCallback(() => {
        setTranscription(null);
        setScore(null);
        setFeedback(null);
        setError(null);
    }, []);

    return (
        <div
            className="rounded-3xl p-4 shadow-lg"
            style={{
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe, #93c5fd)',
                border: '4px solid #60a5fa'
            }}
        >
            <div className="text-center mb-4">
                <span className="text-3xl">🎤</span>
                <h3 className="font-bold text-blue-800 text-sm mt-1">Say the word!</h3>
            </div>

            {imageUrl && (
                <div className="mb-4 flex justify-center">
                    <img
                        src={imageUrl}
                        alt={targetText}
                        className="w-24 h-24 rounded-2xl object-cover shadow-md"
                        style={{ border: '3px solid #fff' }}
                    />
                </div>
            )}

            <div
                className="text-center p-3 mb-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.9)', border: '3px solid #3b82f6' }}
            >
                <p className="font-black text-blue-800 text-2xl">{targetText}</p>
                <button
                    onClick={handlePlayWord}
                    className="mt-2 px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #4ade80)' }}
                >
                    🔊 Hear it
                </button>
            </div>

            <div className="flex justify-center mb-4">
                <button
                    onClick={handleRecord}
                    disabled={!!feedback}
                    className="rounded-full flex items-center justify-center transition-all"
                    style={{
                        width: 72,
                        height: 72,
                        background: isRecording
                            ? 'linear-gradient(135deg, #ef4444, #f87171)'
                            : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                        border: '4px solid #fff',
                        boxShadow: isRecording ? '0 0 20px rgba(239,68,68,0.5)' : '0 8px 20px rgba(59,130,246,0.4)',
                    }}
                >
                    <span className="text-3xl">{isRecording ? '⏹️' : '🎙️'}</span>
                </button>
            </div>

            <p className="text-center text-blue-700 font-semibold text-xs mb-4">
                {isRecording ? '🔴 Listening... Speak now!' : 'Tap to start speaking'}
            </p>

            {error && (
                <div className="p-3 rounded-xl text-center mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #f87171' }}>
                    <p className="text-red-600 font-bold text-sm">⚠️ {error}</p>
                </div>
            )}

            {feedback && (
                <div
                    className="p-4 rounded-2xl text-center"
                    style={{
                        background: score && score >= 70
                            ? 'linear-gradient(135deg, #bbf7d0, #86efac)'
                            : 'linear-gradient(135deg, #fef08a, #fde047)',
                        border: score && score >= 70 ? '3px solid #22c55e' : '3px solid #eab308'
                    }}
                >
                    <div className="mb-2">
                        {Array.from({ length: feedback.stars }).map((_, i) => <span key={i} className="text-2xl">⭐</span>)}
                    </div>
                    <p className="text-3xl mb-2">{feedback.emoji}</p>
                    <p className="font-black" style={{ color: score && score >= 70 ? '#15803d' : '#a16207' }}>
                        {feedback.message}
                    </p>
                    <p className="text-sm font-bold text-gray-600 mt-1">Score: {score}%</p>
                    {transcription && <p className="text-xs text-gray-500 mt-2">You said: "{transcription}"</p>}
                    <button
                        onClick={handleTryAgain}
                        className="mt-3 px-4 py-2 rounded-full text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #22c55e)' }}
                    >
                        🔄 Try Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default PronunciationPractice;
