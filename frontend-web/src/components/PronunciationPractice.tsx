// src/components/PronunciationPractice.tsx
// AI-powered pronunciation practice with TTS and evaluation

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getAIPronunciationService, type EvaluationResult, type RecordingState, type TTSPlaybackState } from '@/services/AIPronunciationService';
import { AudioService } from '@/services/AudioService';

interface PronunciationPracticeProps {
    targetText: string;
    imageUrl?: string;
    audioUrl?: string;
    language?: string;
    onComplete: (score: number, result?: EvaluationResult) => void;
    onRetry?: () => void;
}

export const PronunciationPractice: React.FC<PronunciationPracticeProps> = ({
    targetText,
    imageUrl,
    audioUrl,
    language = 'en',
    onComplete,
    onRetry,
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; emoji: string; stars: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [waveform, setWaveform] = useState<number[]>([]);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [retryCount, setRetryCount] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [ttsAvailable, setTtsAvailable] = useState(true);
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const serviceRef = useRef(getAIPronunciationService());

    // Check TTS availability on mount
    useEffect(() => {
        const checkTTS = async () => {
            const status = await serviceRef.current.getTTSStatus();
            setTtsAvailable(status.available);
        };
        checkTTS();
    }, []);

    // Set up callbacks
    useEffect(() => {
        const service = serviceRef.current;
        
        service.onRecording((state: RecordingState) => {
            setIsRecording(state.isRecording);
            if (state.waveform.length > 0) {
                setWaveform(state.waveform[0].peaks);
            }
        });
        
        service.onTTSState((state: TTSPlaybackState) => {
            setIsPlaying(state.isPlaying);
            setPlaybackProgress(state.progress);
        });
        
        service.onResult((result: EvaluationResult) => {
            handleEvaluationResult(result);
        });
        
        return () => {
            service.clearCallbacks();
        };
    }, []);

    // Draw waveform visualization
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            
            ctx.clearRect(0, 0, width, height);
            
            // Draw waveform bars
            const barWidth = width / (waveform.length || 32);
            const bars = waveform.length > 0 ? waveform : new Array(32).fill(0);
            
            for (let i = 0; i < bars.length; i++) {
                const barHeight = bars[i] * height * 0.8;
                const x = i * barWidth;
                const y = (height - barHeight) / 2;
                
                // Gradient for bars
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                if (isRecording) {
                    gradient.addColorStop(0, '#ef4444');
                    gradient.addColorStop(1, '#f87171');
                } else {
                    gradient.addColorStop(0, '#3b82f6');
                    gradient.addColorStop(1, '#60a5fa');
                }
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
            }
        };
        
        draw();
    }, [waveform, isRecording]);

    const handleEvaluationResult = useCallback((result: EvaluationResult) => {
        setEvaluationResult(result);
        setScore(result.score);
        setTranscription(result.transcription);
        setIsRecording(false);
        setWaveform([]);
        
        // Set feedback
        setFeedback({
            message: result.feedback,
            emoji: result.feedback_emoji,
            stars: result.stars,
        });
        
        // Play sound effect based on score
        if (result.score >= 70) {
            AudioService.playSoundEffect('correct');
        }
        
        // Call onComplete
        onComplete(result.score, result);
        
        // Update retry count
        if (result.score < 70) {
            setRetryCount(prev => prev + 1);
            if (retryCount >= 2) {
                setShowHint(true);
            }
        }
    }, [onComplete, retryCount]);

    const handlePlayWord = useCallback(async () => {
        if (isPlaying) {
            serviceRef.current.stopTTS();
            setIsPlaying(false);
            return;
        }
        
        try {
            await serviceRef.current.playTTS(targetText, language, 0.85);
        } catch (err) {
            console.error('TTS playback failed:', err);
            // Fallback to original audio service
            AudioService.playPronunciation(targetText, language as 'en' | 'vi', audioUrl);
        }
    }, [targetText, language, audioUrl, isPlaying]);

    const handleRecord = useCallback(async () => {
        if (isRecording) {
            serviceRef.current.stopRecording();
            setIsRecording(false);
            setWaveform([]);
            return;
        }
        
        setError(null);
        setTranscription(null);
        setScore(null);
        setFeedback(null);
        setEvaluationResult(null);
        setShowHint(false);
        
        try {
            await serviceRef.current.startPractice(targetText, language);
            setIsRecording(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            if (errorMessage.includes('microphone')) {
                setError('Please allow microphone access to practice pronunciation!');
            } else {
                setError('Failed to start recording. Please try again!');
            }
        }
    }, [isRecording, targetText, language]);

    const handleTryAgain = useCallback(() => {
        setTranscription(null);
        setScore(null);
        setFeedback(null);
        setEvaluationResult(null);
        setWaveform([]);
        setShowHint(false);
        onRetry?.();
    }, [onRetry]);

    const handleShowHint = useCallback(() => {
        setShowHint(true);
    }, []);

    // Get hint text based on evaluation
    const getHintText = useCallback(() => {
        if (!evaluationResult) return '';
        
        const suggestions = evaluationResult.suggestions;
        if (suggestions.length > 0) {
            return suggestions[0];
        }
        
        return 'Try saying the word more slowly and clearly.';
    }, [evaluationResult]);

    // Highlight matching words
    const highlightWord = useCallback((word: string, _index: number) => {
        if (!transcription) return word;
        
        const words = word.split('');
        return words.map((char, i) => {
            const transcriptionLower = transcription.toLowerCase();
            const targetLower = targetText.toLowerCase();
            
            // Simple character matching
            const isMatch = i < transcriptionLower.length && 
                          (transcriptionLower[i] === targetLower[i] || 
                           transcriptionLower.includes(targetLower[i]));
            
            return (
                <span
                    key={i}
                    className={`transition-colors ${
                        isMatch ? 'text-green-600' : 'text-red-500'
                    }`}
                >
                    {char}
                </span>
            );
        });
    }, [transcription, targetText]);

    // Get grade color
    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'excellent':
                return { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' };
            case 'good':
                return { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' };
            default:
                return { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' };
        }
    };

    return (
        <div
            className="rounded-3xl p-4 shadow-lg"
            style={{
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe, #93c5fd)',
                border: '4px solid #60a5fa'
            }}
        >
            {/* Header */}
            <div className="text-center mb-4">
                <span className="text-3xl">🎤</span>
                <h3 className="font-bold text-blue-800 text-sm mt-1">
                    {isRecording ? '🔴 Recording...' : 'Say the word!'}
                </h3>
            </div>

            {/* Image */}
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

            {/* Target Word Display */}
            <div
                className="text-center p-3 mb-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.9)', border: '3px solid #3b82f6' }}
            >
                <p className="font-black text-blue-800 text-2xl">
                    {targetText.split('').map((char, i) => highlightWord(char, i))}
                </p>
                <button
                    onClick={handlePlayWord}
                    className="mt-2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-2 mx-auto"
                    style={{ background: isPlaying ? '#ef4444' : 'linear-gradient(135deg, #22c55e, #4ade80)' }}
                >
                    {isPlaying ? (
                        <>
                            <span className="animate-pulse">⏸️</span>
                            <span>Playing...</span>
                        </>
                    ) : (
                        <>
                            <span>🔊</span>
                            <span>Hear it</span>
                        </>
                    )}
                </button>
                
                {/* Playback progress bar */}
                {isPlaying && (
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-100"
                            style={{ width: `${playbackProgress * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Waveform Visualization */}
            <div className="mb-4 px-2">
                <canvas
                    ref={canvasRef}
                    width={280}
                    height={48}
                    className="w-full rounded-lg bg-white/50"
                />
            </div>

            {/* Record Button */}
            <div className="flex justify-center mb-4">
                <button
                    onClick={handleRecord}
                    disabled={!!feedback}
                    className="rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                    style={{
                        width: 72,
                        height: 72,
                        background: isRecording
                            ? 'linear-gradient(135deg, #ef4444, #f87171)'
                            : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                        border: '4px solid #fff',
                        boxShadow: isRecording 
                            ? '0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3)' 
                            : '0 8px 20px rgba(59,130,246,0.4)',
                    }}
                >
                    <span className="text-3xl">{isRecording ? '⏹️' : '🎙️'}</span>
                </button>
            </div>

            <p className="text-center text-blue-700 font-semibold text-xs mb-4">
                {isRecording 
                    ? '🔴 Speak now! Tap to stop' 
                    : feedback 
                        ? '✨ Great job!' 
                        : 'Tap to start speaking'}
            </p>

            {/* Error Display */}
            {error && (
                <div 
                    className="p-3 rounded-xl text-center mb-4" 
                    style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #f87171' }}
                >
                    <p className="text-red-600 font-bold text-sm">⚠️ {error}</p>
                </div>
            )}

            {/* Feedback Section */}
            {feedback && evaluationResult && (
                <div
                    className="p-4 rounded-2xl text-center"
                    style={{
                        background: score && score >= 70 
                            ? 'linear-gradient(135deg, #bbf7d0, #86efac)' 
                            : 'linear-gradient(135deg, #fef08a, #fde047)',
                        border: `3px solid ${score && score >= 70 ? '#22c55e' : '#eab308'}`
                    }}
                >
                    {/* Stars */}
                    <div className="mb-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <span 
                                key={i} 
                                className={`text-2xl ${i < evaluationResult.stars ? '' : 'opacity-30'}`}
                            >
                                ⭐
                            </span>
                        ))}
                    </div>
                    
                    {/* Emoji */}
                    <p className="text-3xl mb-2">{feedback.emoji}</p>
                    
                    {/* Feedback Message */}
                    <p className={`font-black ${getGradeColor(evaluationResult.grade).text}`}>
                        {feedback.message}
                    </p>
                    
                    {/* Score */}
                    <p className="text-sm font-bold text-gray-600 mt-1">
                        Score: {score}%
                    </p>
                    
                    {/* Transcription */}
                    {transcription && (
                        <p className="text-xs text-gray-500 mt-2">
                            You said: "{transcription}"
                        </p>
                    )}
                    
                    {/* Phoneme Analysis */}
                    {evaluationResult.phoneme_analysis.length > 0 && (
                        <div className="mt-3 text-xs text-left bg-white/50 rounded-lg p-2">
                            <p className="font-semibold text-gray-700 mb-1">Word Analysis:</p>
                            {evaluationResult.phoneme_analysis.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 py-1">
                                    <span className={p.is_match ? 'text-green-600' : 'text-red-500'}>
                                        {p.is_match ? '✓' : '✗'}
                                    </span>
                                    <span className="font-mono">
                                        <span className="text-gray-500">{p.expected}</span>
                                        {!p.is_match && (
                                            <>
                                                <span className="mx-1">→</span>
                                                <span className="text-red-400">{p.spoken}</span>
                                            </>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Hints */}
                    {showHint && (
                        <div className="mt-3 text-xs text-left bg-blue-50 rounded-lg p-2 border border-blue-200">
                            <p className="font-semibold text-blue-700 mb-1">💡 Hint:</p>
                            <p className="text-blue-600">{getHintText()}</p>
                        </div>
                    )}
                    
                    {/* Suggestions */}
                    {evaluationResult.suggestions.length > 0 && !showHint && (
                        <button
                            onClick={handleShowHint}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                            Need a hint?
                        </button>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="mt-4 flex justify-center gap-2">
                        {score && score < 70 && (
                            <button
                                onClick={handleTryAgain}
                                className="px-4 py-2 rounded-full text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #0ea5e9, #22c55e)' }}
                            >
                                🔄 Try Again
                            </button>
                        )}
                        {score !== null && score >= 70 && (
                            <button
                                onClick={handleTryAgain}
                                className="px-4 py-2 rounded-full text-sm font-bold text-white"
                                style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}
                            >
                                🎯 Practice More
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* TTS Not Available Notice */}
            {!ttsAvailable && !isPlaying && !feedback && (
                <div className="text-center text-xs text-gray-500 mt-2">
                    💡 TTS will use fallback audio if AI voice is unavailable
                </div>
            )}
        </div>
    );
};

export default PronunciationPractice;
