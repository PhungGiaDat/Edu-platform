/**
 * MemoryGame.tsx
 * 
 * Mobile-responsive memory matching game.
 * Touch-friendly card flipping for mobile AR.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { eventBus } from '@/runtime/EventBus';
import '@/styles/Games.css';

// ========== TYPES ==========
interface Card {
    id: string;
    type: 'word' | 'image';
    content: string;
    pairId: string;
}

interface MemoryGameProps {
    items: Array<{
        id: string;
        word: string;
        imageUrl: string;
        audioUrl?: string;
    }>;
    difficulty: 'easy' | 'medium' | 'hard';
    onComplete: (score: number, total: number) => void;
    onClose: () => void;
}

// ========== MAIN COMPONENT ==========

export const MemoryGame: React.FC<MemoryGameProps> = ({
    items,
    difficulty,
    onComplete,
    onClose
}) => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedIds, setFlippedIds] = useState<string[]>([]);
    const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
    const [attempts, setAttempts] = useState(0);
    const [isChecking, setIsChecking] = useState(false);

    // Get pair count based on difficulty
    const pairCount = useMemo(() => {
        switch (difficulty) {
            case 'easy': return 3;
            case 'medium': return 5;
            case 'hard': return 8;
            default: return 3;
        }
    }, [difficulty]);

    // Initialize cards
    useEffect(() => {
        const selectedItems = items.slice(0, pairCount);
        const newCards: Card[] = [];

        selectedItems.forEach((item, index) => {
            newCards.push({
                id: `word-${index}`,
                type: 'word',
                content: item.word,
                pairId: item.id
            });
            newCards.push({
                id: `image-${index}`,
                type: 'image',
                content: item.imageUrl,
                pairId: item.id
            });
        });

        setCards(newCards.sort(() => Math.random() - 0.5));
    }, [items, pairCount]);

    // Handle card tap
    const handleCardTap = useCallback((cardId: string) => {
        if (isChecking) return;
        if (flippedIds.includes(cardId)) return;

        const card = cards.find(c => c.id === cardId);
        if (!card || matchedPairs.has(card.pairId)) return;

        if (navigator.vibrate) navigator.vibrate(30);

        const newFlipped = [...flippedIds, cardId];
        setFlippedIds(newFlipped);

        if (newFlipped.length === 2) {
            setIsChecking(true);
            setAttempts(prev => prev + 1);

            const [first, second] = newFlipped.map(id => cards.find(c => c.id === id)!);

            setTimeout(() => {
                if (first.pairId === second.pairId) {
                    // Match!
                    setMatchedPairs(prev => new Set([...prev, first.pairId]));

                    const item = items.find(i => i.id === first.pairId);
                    if (item?.audioUrl) {
                        new Audio(item.audioUrl).play().catch(() => { });
                    }

                    eventBus.emit('AR_COMMAND' as any, {
                        type: 'TRIGGER_ANIMATION',
                        payload: { clip: 'happy', loop: false }
                    });

                    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

                    if (matchedPairs.size + 1 >= pairCount) {
                        setTimeout(() => onComplete(pairCount, attempts + 1), 500);
                    }
                } else {
                    if (navigator.vibrate) navigator.vibrate(100);
                }

                setFlippedIds([]);
                setIsChecking(false);
            }, 800);
        }
    }, [cards, flippedIds, matchedPairs, isChecking, attempts, items, pairCount, onComplete]);

    return (
        <div className="game-overlay">
            {/* Header */}
            <div className="game-header">
                <h2>🧠 Memory Match!</h2>
                <button className="game-exit-btn" onClick={onClose}>✕</button>
            </div>

            {/* Score */}
            <div className="game-score">
                ✅ {matchedPairs.size} / {pairCount} pairs | Attempts: {attempts}
            </div>

            {/* Card Grid */}
            <div className={`memory-grid ${difficulty}`}>
                {cards.map(card => {
                    const isFlipped = flippedIds.includes(card.id);
                    const isMatched = matchedPairs.has(card.pairId);

                    return (
                        <div
                            key={card.id}
                            className={`memory-card ${isFlipped || isMatched ? 'face-up' : 'face-down'} ${isMatched ? 'matched' : ''}`}
                            onClick={() => handleCardTap(card.id)}
                        >
                            {(isFlipped || isMatched) ? (
                                card.type === 'word' ? (
                                    <span className="card-content">{card.content}</span>
                                ) : (
                                    <img src={card.content} alt="" />
                                )
                            ) : (
                                <span style={{ fontSize: 20 }}>❓</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Game complete */}
            {matchedPairs.size >= pairCount && (
                <div className="game-complete-overlay">
                    <div className="emoji">🏆</div>
                    <h2>Amazing!</h2>
                    <p>Completed in {attempts} attempts</p>
                    <button onClick={onClose}>Continue</button>
                </div>
            )}
        </div>
    );
};

export default MemoryGame;
