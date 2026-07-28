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
const PALM_TREE_MODEL_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/models3d/palm_tree.glb';
const PALM_IMAGE_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/model2d/Palm.jpg';
const ELEPHANT_IMAGE_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/model2d/Elephant.jpg';
const COMBO_MODEL_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/models/combos/cute_elephant_jungle.glb';
const COMBO_IMAGE_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/model2d/elephant_tree_combo_layered.png';
const COMBO_MIND_URL = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/mind-files/combo_targets.mind';

function normalizeArAssetUrl(url?: string): string | undefined {
    if (!url) return undefined;
    const lower = url.toLowerCase();
    if (lower.includes('/ar_models/models/palm_tree.glb') || lower.includes('/assets/models/palm_tree.glb')) return PALM_TREE_MODEL_URL;
    if (lower.includes('/assets/model2d/palm.jpg') || lower.endsWith('/palm.jpg')) return PALM_IMAGE_URL;
    if (lower.includes('/frontend/model2d/elephant.jpg') || lower.endsWith('/elephant.jpg')) return ELEPHANT_IMAGE_URL;
    if (lower.endsWith('/jungle_combo.jpg')) return '/assets/model2D/jungle_combo.jpg';
    if (lower.endsWith('/cute_elephant_jungle.glb')) return COMBO_MODEL_URL;
    if (lower.endsWith('/elephant_tree_combo_layered.png')) return COMBO_IMAGE_URL;
    if (lower.endsWith('/combo_targets.mind')) return COMBO_MIND_URL;
    return url;
}

function emitArDebug(label: string, details: Record<string, unknown>) {
    window.postMessage({
        type: 'AR_DEBUG',
        payload: { label, details, source: 'useMultiFlashcard' },
        timestamp: Date.now()
    }, window.location.origin);
}

async function probeArAsset(label: string, url?: string): Promise<boolean> {
    if (!url) {
        emitArDebug('COMBO_ASSET_INVALID', { label, url });
        return false;
    }
    try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        emitArDebug('COMBO_ASSET_PROBE', {
            label, url, status: response.status,
            contentType: response.headers.get('content-type')
        });
        return response.ok;
    } catch (error) {
        emitArDebug('COMBO_ASSET_PROBE_FAILED', {
            label, url,
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}

interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    category: string; // NEW - category from API response
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
    targetOrder: string[];
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

type ComboResolution = 'idle' | 'checking' | 'found' | 'not_found' | 'rejected' | 'error';

interface ComboResolutionState {
    key: string | null;
    status: ComboResolution;
    reason?: string;
}

interface MultiFlashcardState {
    detectedFlashcards: Map<string, FlashcardData>;
    activeCombo: ComboData | null;
    isCheckingCombo: boolean;
    comboMindUrl: string | null;
    mode: 'SINGLE' | 'MULTI' | 'COMBO' | 'PROXIMITY_COMBO';
    proximity: ProximityData;
    comboTriggered: boolean;
    comboResolution: ComboResolutionState;
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
        comboTriggered: false,
        comboResolution: { key: null, status: 'idle' }
    });

    const comboCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const proximityComboRef = useRef<boolean>(false);
    const stateRef = useRef(state);
    // Edit J: serializes every addFlashcard call so concurrent scans never
    // overwrite each other's setState. The chain head silently absorbs
    // rejections so a slow fetch doesn't poison subsequent calls.
    // The 10s per-fetch abort timeout (see addFlashcard body) prevents the
    // chain from queueing indefinitely behind a dead promise — see
    // Constraint Guardian #3.
    const addFlashcardChainRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const buildUrl = useCallback((path?: string): string | undefined => {
        if (!path) return undefined;
        const normalized = normalizeArAssetUrl(path);
        if (!normalized) return undefined;
        if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/assets/')) {
            return normalized;
        }
        const cleanPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
        return `${API_BASE}${cleanPath}`;
    }, []);

    /**
     * Add a newly detected flashcard
     */
    const addFlashcardImpl = useCallback(async (qrId: string, signal: AbortSignal): Promise<FlashcardData | null> => {
        // Skip if already detected
        const existing = stateRef.current.detectedFlashcards.get(qrId);
        if (existing) {
            console.log('[MultiFlashcard] QR already detected:', qrId);
            return existing;
        }
        if (stateRef.current.detectedFlashcards.size >= 2) {
            emitArDebug('FLASHCARD_LIMIT_REACHED', { qrId, limit: 2 });
            return null;
        }

        console.log('[MultiFlashcard] 📱 New QR detected:', qrId);

        // Fetch flashcard data
        try {
            const response = await fetch(`${API_BASE}/api/v1/flashcard/${qrId}`, { signal });
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
                category: flashcard.category || 'unknown', // NEW - store category
                model3dUrl: buildUrl(arObject?.model_3d_url) || '',
                image2dUrl: buildUrl(arObject?.image_2d_url) || '',
                textureUrl: buildUrl(arObject?.texture_url),
                mindUrl: arObject?.nft_base_url || '',
                detectedAt: Date.now()
            };

            emitArDebug('FLASHCARD_RESOLVED', {
                qrId,
                arTag: flashcardData.arTag,
                mindUrl: flashcardData.mindUrl,
                model3dUrl: flashcardData.model3dUrl,
                image2dUrl: flashcardData.image2dUrl
            });

            setState(prev => {
                if (prev.detectedFlashcards.has(qrId)) return prev;

                const newMap = new Map(prev.detectedFlashcards);
                newMap.set(qrId, flashcardData);

                const newMode = newMap.size >= 2 ? 'MULTI' : 'SINGLE';
                const newComboKey = newMap.size === 2
                    ? Array.from(newMap.values()).map(card => card.arTag).sort().join('|')
                    : null;
                console.log('[MultiFlashcard] Mode:', newMode, 'Cards:', newMap.size);

                return {
                    ...prev,
                    detectedFlashcards: newMap,
                    mode: newMode,
                    activeCombo: null,
                    comboMindUrl: null,
                    comboResolution: { key: newComboKey, status: 'idle' }
                };
            });

            return flashcardData;

        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                emitArDebug('FLASHCARD_FETCH_ABORTED', { qrId });
                return null;
            }
            console.error('[MultiFlashcard] Error fetching flashcard:', error);
            return null;
        }
    }, [buildUrl]);

    const addFlashcard = useCallback((qrId: string): Promise<FlashcardData | null> => {
        // 10s per-fetch safety timeout so a stuck request can't starve the
        // chain forever (Constraint Guardian #3). The AbortController is
        // local to this invocation.
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);

        const nextLink = addFlashcardChainRef.current
            .catch(() => { /* swallow prior errors so they don't poison */ })
            .then(() => addFlashcardImpl(qrId, controller.signal));

        // Always clear timeout — whether the chain resolves, rejects, or hangs,
        // we don't leak the timer.
        nextLink.finally(() => window.clearTimeout(timeoutId)).catch(() => {});

        // Update chain head AFTER the local link resolves — this serializes
        // callers without holding the chain head open prematurely. The .then
        // forces the chain head back to `Promise<void>` (the original type),
        // discarding the resolved FlashcardData | null that the inner link
        // carries for the caller.
        addFlashcardChainRef.current = nextLink.then(() => undefined, () => undefined);

        return nextLink;
    }, [addFlashcardImpl]);

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
                comboMindUrl: newMap.size < 2 ? null : prev.comboMindUrl,
                comboResolution: newMap.size < 2
                    ? { key: null, status: 'idle' }
                    : prev.comboResolution
            };
        });
    }, []);

    /**
     * Check for combo when we have 2+ flashcards
     */
    const checkCombo = useCallback(async () => {
        const snapshot = stateRef.current;
        const flashcards = Array.from(snapshot.detectedFlashcards.values()).slice(0, 2);
        if (flashcards.length !== 2) return null;

        const arTags = flashcards.map(card => card.arTag);
        const comboKey = [...arTags].sort().join('|');

        // NEW: Check 1 - Validate categories match before checking combo
        const [card1, card2] = flashcards;
        if (card1.category !== card2.category) {
            console.log('[MultiFlashcard] 🔍 Different categories, skipping combo check:',
                card1.category, 'vs', card2.category);
            emitArDebug('COMBO_CATEGORY_MISMATCH', {
                arTags,
                category1: card1.category,
                category2: card2.category
            });
            setState(prev => prev.comboResolution.key !== comboKey ? prev : ({
                ...prev,
                isCheckingCombo: false,
                comboResolution: {
                    key: comboKey,
                    status: 'not_found',
                    reason: 'different_categories'
                }
            }));
            return null;
        }

        if (snapshot.comboResolution.key === comboKey && snapshot.comboResolution.status !== 'idle') return null;

        emitArDebug('COMBO_LOOKUP_STARTED', { arTags, comboKey });
        emitArDebug('COMBO_RESOLUTION_CHANGED', { comboKey, status: 'checking' });
        setState(prev => ({
            ...prev,
            isCheckingCombo: true,
            comboResolution: { key: comboKey, status: 'checking' }
        }));

        try {
            const response = await fetch(
                `${API_BASE}/api/v1/combos/check?tags=${encodeURIComponent(arTags.join(','))}`
            );
            if (!response.ok) {
                throw new Error(`Combo lookup returned HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.found || !data.combo) {
                // Always extract combo_mind_url from backend response — even when combo
                // is not found locally, the backend may have pre-built combo mind files.
                // We store it so LearnARV2 can decide to use it instead of merging.
                const backendMindUrl = data.combo?.combo_mind_url
                    ? buildUrl(data.combo.combo_mind_url) || null
                    : null;
                emitArDebug('COMBO_RESOLUTION_CHANGED', { comboKey, status: 'not_found', backendMindUrl });
                setState(prev => prev.comboResolution.key !== comboKey ? prev : ({
                    ...prev,
                    isCheckingCombo: false,
                    // Store backend combo_mind_url even if combo not found locally
                    comboMindUrl: backendMindUrl ?? prev.comboMindUrl,
                    comboResolution: { key: comboKey, status: 'not_found' }
                }));
                return null;
            }

            const comboMindUrl = buildUrl(data.combo.combo_mind_url) || null;
            const model3dUrl = buildUrl(data.combo.model_3d_url) || '';
            const image2dUrl = buildUrl(data.combo.image_2d_url) || '';
            const textureUrl = buildUrl(data.combo.texture_url);
            const requiredTags: string[] = Array.isArray(data.combo.required_tags)
                ? data.combo.required_tags
                : [];
            const targetOrder: string[] | null = Array.isArray(data.combo.target_order)
                ? data.combo.target_order
                : null;
            const hasValidTargetOrder = Boolean(
                targetOrder
                && targetOrder.length === requiredTags.length
                && new Set(targetOrder).size === targetOrder.length
                && targetOrder.every(tag => requiredTags.includes(tag))
            );
            if (!hasValidTargetOrder || !targetOrder) {
                emitArDebug('COMBO_REJECTED_ORIGINALS_PRESERVED', {
                    comboId: data.combo.combo_id,
                    arTags,
                    reason: 'missing_or_invalid_target_order'
                });
                setState(prev => ({
                    ...prev,
                    activeCombo: null,
                    comboMindUrl: null,
                    mode: prev.detectedFlashcards.size >= 2 ? 'MULTI' : 'SINGLE',
                    isCheckingCombo: false,
                    comboResolution: {
                        key: comboKey,
                        status: 'rejected',
                        reason: 'missing_or_invalid_target_order'
                    }
                }));
                return null;
            }
            const probes = await Promise.all([
                probeArAsset('mind', comboMindUrl || undefined),
                probeArAsset('model3d', model3dUrl),
                probeArAsset('image2d', image2dUrl),
                textureUrl ? probeArAsset('texture', textureUrl) : Promise.resolve(true)
            ]);

            if (probes.some(ok => !ok)) {
                emitArDebug('COMBO_REJECTED_ORIGINALS_PRESERVED', {
                    comboId: data.combo.combo_id, arTags,
                    comboMindUrl, model3dUrl, image2dUrl
                });
                setState(prev => ({
                    ...prev,
                    activeCombo: null,
                    comboMindUrl: null,
                    mode: prev.detectedFlashcards.size >= 2 ? 'MULTI' : 'SINGLE',
                    isCheckingCombo: false,
                    comboResolution: { key: comboKey, status: 'rejected', reason: 'combo_asset_preflight' }
                }));
                emitArDebug('COMBO_RESOLUTION_CHANGED', {
                    comboKey,
                    status: 'rejected',
                    reason: 'combo_asset_preflight'
                });
                return null;
            }

            emitArDebug('COMBO_ASSETS_READY', {
                comboId: data.combo.combo_id,
                requiredTags: data.combo.required_tags,
                targetOrder,
                comboMindUrl, model3dUrl, image2dUrl
            });
            setState(prev => ({
                ...prev,
                activeCombo: {
                    comboId: data.combo.combo_id,
                    description: data.combo.description,
                    requiredTags,
                    targetOrder,
                    model3dUrl,
                    image2dUrl,
                    textureUrl,
                    comboMindUrl,
                    bonusXp: data.combo.bonus_xp || 100
                },
                comboMindUrl,
                mode: 'COMBO',
                isCheckingCombo: false,
                comboResolution: { key: comboKey, status: 'found' }
            }));
            emitArDebug('COMBO_RESOLUTION_CHANGED', { comboKey, status: 'found' });
            return data.combo;
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            emitArDebug('COMBO_LOOKUP_FAILED', {
                arTags,
                error: reason
            });
            emitArDebug('COMBO_RESOLUTION_CHANGED', { comboKey, status: 'error', reason });
            setState(prev => prev.comboResolution.key !== comboKey ? prev : ({
                ...prev,
                isCheckingCombo: false,
                comboResolution: {
                    key: comboKey,
                    status: 'error',
                    reason
                }
            }));
            return null;
        }
    }, [buildUrl]);

    const rejectCombo = useCallback((reason: string) => {
        const arTags = Array.from(stateRef.current.detectedFlashcards.values()).map(card => card.arTag);
        const comboKey = [...arTags].sort().join('|');
        emitArDebug('COMBO_ROLLBACK_ORIGINALS_PRESERVED', { reason, arTags });
        emitArDebug('COMBO_RESOLUTION_CHANGED', { comboKey, status: 'rejected', reason });
        setState(prev => ({
            ...prev,
            activeCombo: null,
            comboMindUrl: null,
            isCheckingCombo: false,
            comboTriggered: false,
            mode: prev.detectedFlashcards.size >= 2 ? 'MULTI' : 'SINGLE',
            comboResolution: { key: comboKey, status: 'rejected', reason }
        }));
    }, []);

    // Edit K: ref-captured snapshot of the combo-check pre-conditions. The
    // timer only restarts when (size, status, activeCombo) actually changes,
    // so transient state updates within the 500 ms window don't cancel the
    // debounce. Addresses Skeptic Objection #5.
    const comboCheckSnapshotRef = useRef<{ size: number; status: ComboResolution; hasActiveCombo: boolean }>({
        size: 0,
        status: 'idle',
        hasActiveCombo: false
    });

    /**
     * Auto-check for combo when we have 2+ flashcards
     */
    useEffect(() => {
        const snapshot = {
            size: state.detectedFlashcards.size,
            status: state.comboResolution.status,
            hasActiveCombo: Boolean(state.activeCombo)
        };

        const prev = comboCheckSnapshotRef.current;
        const sameAsPrev =
            prev.size === snapshot.size &&
            prev.status === snapshot.status &&
            prev.hasActiveCombo === snapshot.hasActiveCombo;
        comboCheckSnapshotRef.current = snapshot;

        if (snapshot.size !== 2) return;
        if (snapshot.hasActiveCombo) return;
        // Only restart the debounce when the conditions actually change.
        // Within the same (size, status, hasActiveCombo) tuple, additional
        // renders don't restart the timer — solving the 'debounce dies on
        // every setState' bug from the DEBUG report.
        if (sameAsPrev && comboCheckTimeoutRef.current) return;
        if (snapshot.status !== 'idle') return;

        if (comboCheckTimeoutRef.current) {
            clearTimeout(comboCheckTimeoutRef.current);
        }
        comboCheckTimeoutRef.current = setTimeout(() => {
            checkCombo();
        }, 500);

        return () => {
            if (comboCheckTimeoutRef.current) {
                clearTimeout(comboCheckTimeoutRef.current);
                comboCheckTimeoutRef.current = null;
            }
        };
    }, [state.detectedFlashcards.size, state.activeCombo, state.comboResolution.status, checkCombo]);

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
            comboTriggered: false,
            comboResolution: { key: null, status: 'idle' }
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
     * MindAR target indexes follow combo.target_order, not QR scan order or
     * the unordered set of required_tags.
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

    /**
     * Get unique categories from detected flashcards
     */
    const getCategories = useCallback((): string[] => {
        const categories = Array.from(state.detectedFlashcards.values()).map(f => f.category);
        return [...new Set(categories)];
    }, [state.detectedFlashcards]);

    /**
     * Check if all detected flashcards have the same category
     */
    const hasSameCategory = useCallback((): boolean => {
        const categories = getCategories();
        return categories.length === 1;
    }, [getCategories]);

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
        comboKey: state.comboResolution.key,
        comboResolution: state.comboResolution.status,
        comboResolutionReason: state.comboResolution.reason,

        // Actions
        addFlashcard,
        removeFlashcard,
        checkCombo,
        rejectCombo,
        reset,

        // Proximity handlers (to be connected to AR message events)
        handleProximityDetected,
        handleProximityEnded,
        handleProximityUpdate,

        // Helpers
        getFlashcardByIndex,
        getFlashcardByTag,
        getArTags,
        getCategories,
        hasSameCategory,

        // Derived
        hasCombo: !!state.activeCombo,
        isMultiMode: state.mode === 'MULTI' || state.mode === 'COMBO' || state.mode === 'PROXIMITY_COMBO',
        isProximityCombo: state.mode === 'PROXIMITY_COMBO',
        // Use backend combo_mind_url when available — no merge needed
        shouldUseComboMindUrl: state.detectedFlashcards.size === 2 &&
            state.comboMindUrl !== null,
        // Fallback: merge 2 separate .mind files only when no combo_mind_url from backend
        shouldPrepareIndependentMulti: state.detectedFlashcards.size === 2 &&
            state.comboResolution.key !== null &&
            state.comboMindUrl === null &&
            ['not_found', 'rejected', 'error'].includes(state.comboResolution.status)
    };
}

export type { FlashcardData, ComboData, MultiFlashcardState, ProximityData, ComboResolution, ComboResolutionState };
