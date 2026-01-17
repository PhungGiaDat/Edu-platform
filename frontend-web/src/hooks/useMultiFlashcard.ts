/**
 * useMultiFlashcard - Dynamic Multi-Flashcard Detection Hook
 * 
 * Flow:
 * 1. Track multiple QR codes detected in scanner
 * 2. Fetch AR data for each detected flashcard
 * 3. When 2+ flashcards detected, check for combo
 * 4. Provide combo mind URL for AR viewer
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBase } from '../config';

const API_BASE = getApiBase();

interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    model3dUrl: string;
    image2dUrl: string;
    mindUrl: string;
    detectedAt: number;
}

interface ComboData {
    comboId: string;
    description: string;
    requiredTags: string[];
    model3dUrl: string;
    image2dUrl: string;
    comboMindUrl?: string;
    bonusXp: number;
}

interface MultiFlashcardState {
    detectedFlashcards: Map<string, FlashcardData>;
    activeCombo: ComboData | null;
    isCheckingCombo: boolean;
    comboMindUrl: string | null;
    mode: 'SINGLE' | 'MULTI' | 'COMBO';
}

export function useMultiFlashcard() {
    const [state, setState] = useState<MultiFlashcardState>({
        detectedFlashcards: new Map(),
        activeCombo: null,
        isCheckingCombo: false,
        comboMindUrl: null,
        mode: 'SINGLE'
    });

    const comboCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Add a newly detected flashcard
     */
    const addFlashcard = useCallback(async (qrId: string) => {
        // Skip if already detected
        if (state.detectedFlashcards.has(qrId)) {
            console.log('[MultiFlashcard] QR already detected:', qrId);
            return;
        }

        console.log('[MultiFlashcard] 📱 New QR detected:', qrId);

        // Fetch flashcard data
        try {
            const response = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}`);
            if (!response.ok) {
                console.error('[MultiFlashcard] Failed to fetch flashcard:', qrId);
                return;
            }

            const data = await response.json();
            const flashcard = data.flashcard;
            const arObject = data.ar_objects?.[0];

            const flashcardData: FlashcardData = {
                qrId,
                arTag: flashcard.ar_tag || `tag_${qrId}`,
                word: flashcard.word || qrId,
                model3dUrl: arObject?.model_3d_url || '',
                image2dUrl: arObject?.image_2d_url || '',
                mindUrl: arObject?.nft_base_url || '',
                detectedAt: Date.now()
            };

            setState(prev => {
                const newMap = new Map(prev.detectedFlashcards);
                newMap.set(qrId, flashcardData);

                const newMode = newMap.size >= 2 ? 'MULTI' : 'SINGLE';
                console.log('[MultiFlashcard] Mode:', newMode, 'Cards:', newMap.size);

                return {
                    ...prev,
                    detectedFlashcards: newMap,
                    mode: newMode
                };
            });

        } catch (error) {
            console.error('[MultiFlashcard] Error fetching flashcard:', error);
        }
    }, [state.detectedFlashcards]);

    /**
     * Remove a flashcard (e.g., when target lost for extended time)
     */
    const removeFlashcard = useCallback((qrId: string) => {
        setState(prev => {
            const newMap = new Map(prev.detectedFlashcards);
            newMap.delete(qrId);

            return {
                ...prev,
                detectedFlashcards: newMap,
                mode: newMap.size >= 2 ? 'MULTI' : 'SINGLE',
                activeCombo: newMap.size < 2 ? null : prev.activeCombo,
                comboMindUrl: newMap.size < 2 ? null : prev.comboMindUrl
            };
        });
    }, []);

    /**
     * Check for combo when we have 2+ flashcards
     */
    const checkCombo = useCallback(async () => {
        const flashcards = Array.from(state.detectedFlashcards.values());

        if (flashcards.length < 2) {
            console.log('[MultiFlashcard] Not enough flashcards for combo');
            return null;
        }

        const arTags = flashcards.map(f => f.arTag);
        console.log('[MultiFlashcard] 🔗 Checking combo for tags:', arTags);

        setState(prev => ({ ...prev, isCheckingCombo: true }));

        try {
            const response = await fetch(
                `${API_BASE}/api/v1/combos/check?tags=${arTags.join(',')}`
            );

            if (!response.ok) {
                console.warn('[MultiFlashcard] Combo check failed:', response.status);
                setState(prev => ({ ...prev, isCheckingCombo: false }));
                return null;
            }

            const data = await response.json();

            if (data.found && data.combo) {
                console.log('[MultiFlashcard] ✅ Combo found:', data.combo.combo_id);

                // Determine combo mind URL
                const comboMindUrl = data.combo.combo_mind_url ||
                    '/assets/target/combo_targets.mind';

                setState(prev => ({
                    ...prev,
                    activeCombo: {
                        comboId: data.combo.combo_id,
                        description: data.combo.description,
                        requiredTags: data.combo.required_tags,
                        model3dUrl: data.combo.model_3d_url,
                        image2dUrl: data.combo.image_2d_url,
                        comboMindUrl,
                        bonusXp: data.combo.bonus_xp || 100
                    },
                    comboMindUrl,
                    mode: 'COMBO',
                    isCheckingCombo: false
                }));

                return data.combo;
            }

            console.log('[MultiFlashcard] No combo found for these tags');
            setState(prev => ({ ...prev, isCheckingCombo: false }));
            return null;

        } catch (error) {
            console.error('[MultiFlashcard] Combo check error:', error);
            setState(prev => ({ ...prev, isCheckingCombo: false }));
            return null;
        }
    }, [state.detectedFlashcards]);

    /**
     * Auto-check for combo when we have 2+ flashcards
     */
    useEffect(() => {
        if (state.detectedFlashcards.size >= 2 && !state.activeCombo && !state.isCheckingCombo) {
            // Debounce combo check
            if (comboCheckTimeoutRef.current) {
                clearTimeout(comboCheckTimeoutRef.current);
            }

            comboCheckTimeoutRef.current = setTimeout(() => {
                checkCombo();
            }, 500);
        }

        return () => {
            if (comboCheckTimeoutRef.current) {
                clearTimeout(comboCheckTimeoutRef.current);
            }
        };
    }, [state.detectedFlashcards.size, state.activeCombo, state.isCheckingCombo, checkCombo]);

    /**
     * Reset all state
     */
    const reset = useCallback(() => {
        setState({
            detectedFlashcards: new Map(),
            activeCombo: null,
            isCheckingCombo: false,
            comboMindUrl: null,
            mode: 'SINGLE'
        });
    }, []);

    /**
     * Get flashcard by index (for target mapping)
     */
    const getFlashcardByIndex = useCallback((index: number): FlashcardData | null => {
        const flashcards = Array.from(state.detectedFlashcards.values());
        return flashcards[index] || null;
    }, [state.detectedFlashcards]);

    /**
     * Get all ar_tags for combo checking
     */
    const getArTags = useCallback((): string[] => {
        return Array.from(state.detectedFlashcards.values()).map(f => f.arTag);
    }, [state.detectedFlashcards]);

    return {
        // State
        detectedFlashcards: state.detectedFlashcards,
        flashcardCount: state.detectedFlashcards.size,
        activeCombo: state.activeCombo,
        comboMindUrl: state.comboMindUrl,
        mode: state.mode,
        isCheckingCombo: state.isCheckingCombo,

        // Actions
        addFlashcard,
        removeFlashcard,
        checkCombo,
        reset,

        // Helpers
        getFlashcardByIndex,
        getArTags,

        // Derived
        hasCombo: !!state.activeCombo,
        isMultiMode: state.mode === 'MULTI' || state.mode === 'COMBO'
    };
}

export type { FlashcardData, ComboData, MultiFlashcardState };
