import React, { useState } from 'react';
import { ChatService } from '../services/ChatService';

interface PronunciationPracticeProps {
    targetText: string;
    onComplete: (score: number) => void;
}

export const PronunciationPractice: React.FC<PronunciationPracticeProps> = ({ targetText, onComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [audioText, setAudioText] = useState(''); // Simulated speech-to-text

    const handleRecordToggle = async () => {
        if (isRecording) {
            // Stop recording (Simulated)
            setIsRecording(false);
            // In a real app, we would process audio blob here.
            // For now, we'll simulate a "good" attempt if the user typed something or just random success
            const simulatedText = audioText || targetText;

            const result = await ChatService.analyzePronunciation(targetText, simulatedText);
            setFeedback(result.feedback);
            onComplete(85); // Mock score
        } else {
            setIsRecording(true);
            setFeedback(null);
            setAudioText('');
        }
    };

    return (
        <div className="bg-white p-6 rounded-3xl border-2 border-neutral-200 text-center">
            <h3 className="text-neutral-500 font-bold uppercase tracking-widest text-sm mb-4">Speak this sentence</h3>
            <p className="text-2xl font-bold text-neutral-800 mb-8">{targetText}</p>

            <div className="flex justify-center mb-6">
                <button
                    onClick={handleRecordToggle}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all ${isRecording
                            ? 'bg-danger animate-pulse text-white'
                            : 'bg-primary text-white hover:scale-110'
                        }`}
                >
                    {isRecording ? '⏹️' : '🎤'}
                </button>
            </div>

            {/* Simulation Input for testing without mic */}
            {isRecording && (
                <input
                    type="text"
                    value={audioText}
                    onChange={(e) => setAudioText(e.target.value)}
                    placeholder="Simulate speech..."
                    className="w-full mb-4 p-2 border rounded"
                />
            )}

            {feedback && (
                <div className="bg-secondary-light/20 p-4 rounded-xl text-secondary-dark font-bold animate-fadeIn">
                    {feedback}
                </div>
            )}
        </div>
    );
};
