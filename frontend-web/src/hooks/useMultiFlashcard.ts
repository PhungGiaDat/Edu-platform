/**
 * useMultiFlashcard - Dynamic Multi-Flashcard Detection Hook
 * 
 * Flow:
 * 1. Track multiple QR codes detected in scanner
 * 2. Fetch AR data for each detected flashcard
 * 3. When 2+ flashcards detected, check for combo
 * 4. Listen for proximity events from AR viewer
 * 5. Trigger combo effects when cards are close together
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBase } from '../config';
import { HapticService } from '../services/HapticService';
import { SoundEffectService } from '../services/SoundEffectService';

const API_BASE = getApiBase();

interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    mindUrl: string;
    detectedAt: number;
}

interface ComboData {
    comboId: string;
    description: string;
    requiredTags: string[];
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    comboMindUrl?: string | null;
    bonusXp: number;
}

interface ProximityData {
    isClose: boolean;
    distance: number;
    midpoint: { x: number; y: number; z: number } | null;
    lastDetected: number;
}

interface MultiFlashcardState {
    detectedFlashcards: Map<string, FlashcardData>;
    activeCombo: ComboData | null;
    isCheckingCombo: boolean;
    comboMindUrl: string | null;
    mode: 'SINGLE' | 'MULTI' | 'COMBO' | 'PROXIMITY_COMBO';
    proximity: ProximityData;
    comboTriggered: boolean;
}

export function useMultiFlashcard() {
    const [state, setState] = useState<MultiFlashcardState>({
        detectedFlashcards: new Map(),
        activeCombo: null,
        isCheckingCombo: false,
        comboMindUrl: null,
        mode: 'SINGLE',
        proximity: {
            isClose: false,
            distance: Infinity,
            midpoint: null,
            lastDetected: 0
        },
        comboTriggered: false
    });

    const comboCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const proximityComboRef = useRef<boolean>(false);
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const buildUrl = useCallback((path?: string): string | undefined => {
        if (!path) return undefined;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_BASE}${cleanPath}`;
    }, []);

    /**
     * Add a newly detected flashcard
     */
    const addFlashcard = useCallback(async (qrId: string): Promise<FlashcardData | null> => {
        // Skip if already detected
        const existing = stateRef.current.detectedFlashcards.get(qrId);
        if (existing) {
            console.log('[MultiFlashcard] QR already detected:', qrId);
            return existing;
        }

        console.log('[MultiFlashcard] 📱 New QR detected:', qrId);

        // Fetch flashcard data
        try {
            const response = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}`);
            if (!response.ok) {
                console.error('[MultiFlashcard] Failed to fetch flashcard:', qrId);
                return null;
            }

            const data = await response.json();
            if (!data || !data.flashcard) {
                console.error('[MultiFlashcard] Flashcard data missing in response:', qrId);
                return null;
            }

            const flashcard = data.flashcard;
            const arObject = data.target || data.ar_objects?.[0];

            const flashcardData: FlashcardData = {
                qrId,
                arTag: arObject?.ar_tag || flashcard.ar_tag || `tag_${qrId}`,
                word: flashcard.word || qrId,
                model3dUrl: buildUrl(arObject?.model_3d_url) || '',
                image2dUrl: buildUrl(arObject?.image_2d_url) || '',
                textureUrl: buildUrl(arObject?.texture_url),
                mindUrl: arObject?.nft_base_url || '',
                detectedAt: Date.now()
            };

            setState(prev => {
                if (prev.detectedFlashcards.has(qrId)) return prev;

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

            return flashcardData;

        } catch (error) {
            console.error('[MultiFlashcard] Error fetching flashcard:', error);
            return null;
        }
    }, [buildUrl]);

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
                `${API_BASE}/api/v1/combos/check?tags=${encodeURIComponent(arTags.join(','))}`
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
                const comboMindUrl = buildUrl(data.combo.combo_mind_url) || null;

                setState(prev => ({
                    ...prev,
                    activeCombo: {
                        comboId: data.combo.combo_id,
                        description: data.combo.description,
                        requiredTags: data.combo.required_tags,
                        model3dUrl: buildUrl(data.combo.model_3d_url) || '',
                        image2dUrl: buildUrl(data.combo.image_2d_url) || '',
                        textureUrl: buildUrl(data.combo.texture_url),
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
    }, [state.detectedFlashcards, buildUrl]);

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
     * Handle proximity detected event from AR viewer
     */
    const handleProximityDetected = useCallback((data: {
        targets: number[];
        distance: number;
        midpoint: { x: number; y: number; z: number };
    }) => {
        console.log('[MultiFlashcard] 🎯 Proximity detected:', data);

        setState(prev => ({
            ...prev,
            proximity: {
                isClose: true,
                distance: data.distance,
                midpoint: data.midpoint,
                lastDetected: Date.now()
            },
            mode: prev.mode === 'MULTI' ? 'PROXIMITY_COMBO' : prev.mode
        }));

        // Trigger combo effects if not already triggered
        if (!proximityComboRef.current) {
            proximityComboRef.current = true;
            
            // Haptic and sound feedback for combo discovery
            HapticService.combo();
            SoundEffectService.play('combo');

            console.log('[MultiFlashcard] ✨ COMBO DISCOVERED via proximity!');

            setState(prev => ({
                ...prev,
                comboTriggered: true,
                mode: 'PROXIMITY_COMBO'
            }));

            // Check for combo data from API
            checkCombo();
        }
    }, [checkCombo]);

    /**
     * Handle proximity ended event from AR viewer
     */
    const handleProximityEnded = useCallback((data: {
        targets: number[];
        distance?: number;
    }) => {
        console.log('[MultiFlashcard] 👋 Proximity ended:', data);

        proximityComboRef.current = false;

        setState(prev => ({
            ...prev,
            proximity: {
                isClose: false,
                distance: data.distance || Infinity,
                midpoint: null,
                lastDetected: prev.proximity.lastDetected
            },
            comboTriggered: false,
            mode: prev.detectedFlashcards.size >= 2 ? 'MULTI' : 'SINGLE'
        }));
    }, []);

    /**
     * Handle proximity update event (continuous updates while close)
     */
    const handleProximityUpdate = useCallback((data: {
        targets: number[];
        distance: number;
        midpoint: { x: number; y: number; z: number };
    }) => {
        setState(prev => ({
            ...prev,
            proximity: {
                ...prev.proximity,
                distance: data.distance,
                midpoint: data.midpoint
            }
        }));
    }, []);

    /**
     * Reset all state
     */
    const reset = useCallback(() => {
        proximityComboRef.current = false;
        setState({
            detectedFlashcards: new Map(),
            activeCombo: null,
            isCheckingCombo: false,
            comboMindUrl: null,
            mode: 'SINGLE',
            proximity: {
                isClose: false,
                distance: Infinity,
                midpoint: null,
                lastDetected: 0
            },
            comboTriggered: false
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
     * Get flashcard by AR tag. This is used for combo target mapping because
     * MindAR target indexes follow combo.required_tags order, not QR scan order.
     */
    const getFlashcardByTag = useCallback((arTag: string): FlashcardData | null => {
        const flashcards = Array.from(state.detectedFlashcards.values());
        return flashcards.find(f => f.arTag === arTag) || null;
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
        proximity: state.proximity,
        comboTriggered: state.comboTriggered,

        // Actions
        addFlashcard,
        removeFlashcard,
        checkCombo,
        reset,

        // Proximity handlers (to be connected to AR message events)
        handleProximityDetected,
        handleProximityEnded,
        handleProximityUpdate,

        // Helpers
        getFlashcardByIndex,
        getFlashcardByTag,
        getArTags,

        // Derived
        hasCombo: !!state.activeCombo,
        isMultiMode: state.mode === 'MULTI' || state.mode === 'COMBO' || state.mode === 'PROXIMITY_COMBO',
        isProximityCombo: state.mode === 'PROXIMITY_COMBO'
    };
}

export type { FlashcardData, ComboData, MultiFlashcardState, ProximityData };
