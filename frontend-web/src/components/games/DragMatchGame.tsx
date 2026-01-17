/**
 * DragMatchGame.tsx
 * 
 * Mobile-responsive drag-and-drop game for matching words to images.
 * Supports touch interactions for mobile AR.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { eventBus } from '@/runtime/EventBus';
import '@/styles/Games.css';

// ========== TYPES ==========
interface Word {
    id: string;
    text: string;
    imageUrl: string;
    audioUrl?: string;
}

interface DragMatchGameProps {
    words: Word[];
    difficulty: 'easy' | 'medium' | 'hard';
    onComplete: (score: number, total: number) => void;
    onClose: () => void;
}

// ========== MAIN COMPONENT ==========

export const DragMatchGame: React.FC<DragMatchGameProps> = ({
    words,
    difficulty,
    onComplete,
    onClose
}) => {
    const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [wrongAttempts, setWrongAttempts] = useState(0);

    // Get display count based on difficulty
    const displayCount = useMemo(() => {
        switch (difficulty) {
            case 'easy': return 3;
            case 'medium': return 5;
            case 'hard': return 6;
            default: return 3;
        }
    }, [difficulty]);

    // Shuffle words for display
    const shuffledWords = useMemo(() => {
        return [...words].sort(() => Math.random() - 0.5);
    }, [words]);

    const displayWords = words.slice(0, displayCount);
    const displayShuffled = shuffledWords.slice(0, displayCount);

    // Handle word selection (touch-friendly)
    const handleWordSelect = useCallback((wordId: string) => {
        setSelectedWord(wordId);
        if (navigator.vibrate) navigator.vibrate(30);
    }, []);

    // Handle drop zone tap (touch-friendly matching)
    const handleDropZoneTap = useCallback((targetId: string) => {
        if (!selectedWord) return;

        if (selectedWord === targetId) {
            // Correct match!
            setMatchedIds(prev => new Set([...prev, selectedWord]));
            setSelectedWord(null);

            // Play audio
            const word = words.find(w => w.id === selectedWord);
            if (word?.audioUrl) {
                new Audio(word.audioUrl).play().catch(() => { });
            }

            // Trigger happy animation
            eventBus.emit('AR_COMMAND' as any, {
                type: 'TRIGGER_ANIMATION',
                payload: { clip: 'happy', loop: false }
            });

            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

            // Check if game complete
            if (matchedIds.size + 1 >= displayCount) {
                const score = displayCount - wrongAttempts;
                setTimeout(() => onComplete(Math.max(0, score), displayCount), 500);
            }
        } else {
            // Wrong match
            setWrongAttempts(prev => prev + 1);
            setSelectedWord(null);

            eventBus.emit('AR_COMMAND' as any, {
                type: 'TRIGGER_ANIMATION',
                payload: { clip: 'sad', loop: false }
            });

            if (navigator.vibrate) navigator.vibrate(100);
        }
    }, [selectedWord, matchedIds, displayCount, wrongAttempts, words, onComplete]);

    return (
        <div className="game-overlay">
            {/* Header */}
            <div className="game-header">
                <h2>🎯 Match Words!</h2>
                <button className="game-exit-btn" onClick={onClose}>✕</button>
            </div>

            {/* Score */}
            <div className="game-score">
                ✅ {matchedIds.size} / {displayCount}
                {wrongAttempts > 0 && <span style={{ color: '#FF6B6B', marginLeft: 12 }}>❌ {wrongAttempts}</span>}
            </div>

            <div className="drag-match-container">
                {/* Drop zones (images) */}
                <div className="drop-zones-grid">
                    {displayWords.map(word => (
                        <div
                            key={word.id}
                            className={`drop-zone ${matchedIds.has(word.id) ? 'matched' : ''} ${selectedWord === word.id ? 'drag-over' : ''}`}
                            onClick={() => handleDropZoneTap(word.id)}
                        >
                            <img src={word.imageUrl} alt={word.text} />
                            {matchedIds.has(word.id) && (
                                <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 16 }}>✅</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Selectable words */}
                <div className="draggable-items">
                    {displayShuffled
                        .filter(word => !matchedIds.has(word.id))
                        .map(word => (
                            <div
                                key={word.id}
                                className={`drag-item ${selectedWord === word.id ? 'selected' : ''}`}
                                onClick={() => handleWordSelect(word.id)}
                                style={{
                                    transform: selectedWord === word.id ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: selectedWord === word.id
                                        ? '0 6px 20px rgba(255, 230, 109, 0.6)'
                                        : '0 4px 12px rgba(78, 205, 196, 0.4)'
                                }}
                            >
                                {word.text}
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Game complete */}
            {matchedIds.size >= displayCount && (
                <div className="game-complete-overlay">
                    <div className="emoji">🎉</div>
                    <h2>Great Job!</h2>
                    <p>Score: {displayCount - wrongAttempts} / {displayCount}</p>
                    <button onClick={onClose}>Continue</button>
                </div>
            )}
        </div>
    );
};

export default DragMatchGame;
