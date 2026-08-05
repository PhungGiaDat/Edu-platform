/**
 * ARMessages.ts
 * 
 * Typed message protocol for iframe communication.
 * Used by ARBridge to send/receive typed messages between React and MindAR iframe.
 */

// ========== MESSAGE TYPES ==========

/**
 * All message types for bidirectional communication
 */
export type ARMessageType =
    // System (Child → Parent)
    | 'SYSTEM_READY'
    | 'SYSTEM_ERROR'

    // Tracking (Child → Parent)
    | 'SCANNER_READY'
    | 'QR_DETECTED'
    | 'SCANNER_ERROR'
    | 'AR_READY'
    | 'TARGET_FOUND'
    | 'TARGET_LOST'
    | 'MULTI_TARGET_DETECTED'
    | 'COMBO_DETECTED'
    | 'MIND_BUFFER_REQUEST'

    // Interaction (Child → Parent)
    | 'MODEL_CLICKED'
    | 'ANIMATION_COMPLETE'
    | 'AUDIO_COMPLETE'

    // Commands (Parent → Child)
    | 'TRIGGER_ANIMATION'
    | 'UPDATE_TEXTURE'
    | 'PLAY_AUDIO'
    | 'SET_MODE'
    | 'PAUSE_TRACKING'
    | 'RESUME_TRACKING'
    | 'LOAD_MODEL'
    | 'MIND_BUFFER'
    | 'INITIAL_STATE';

// ========== MESSAGE INTERFACE ==========

/**
 * Standard message format for postMessage communication
 */
export interface ARMessage<T = unknown> {
    type: ARMessageType;
    payload: T;
    timestamp: number;
    origin: 'parent' | 'child';
}

// ========== PAYLOAD TYPES ==========

/**
 * Payload type mapping for type-safe message handling
 */
export interface ARMessagePayloadMap {
    // System
    SYSTEM_READY: {
        version: string;
        capabilities: string[];
        scene: 'scanner' | 'viewer';
    };
    SYSTEM_ERROR: {
        code: string;
        message: string;
        stage?: string;
        url?: string;
        elapsedMs?: number;
    };

    // Scanner
    SCANNER_READY: {
        width: number;
        height: number;
    };
    QR_DETECTED: {
        qrId: string;
        timestamp: number;
    };
    SCANNER_ERROR: {
        error: string;
    };

    // AR Viewer
    AR_READY: {
        targetCount: number;
    };
    TARGET_FOUND: {
        targetIndex: number;
        arTag?: string;
        confidence?: number;
    };
    TARGET_LOST: {
        targetIndex: number;
        arTag?: string;
    };
    MULTI_TARGET_DETECTED: {
        targets: number[];
        arTags: string[];
        comboType?: string;
    };
    COMBO_DETECTED: {
        targets: number[];
        comboId?: string;
    };
    MIND_BUFFER_REQUEST: Record<string, never>;

    // Interaction
    MODEL_CLICKED: {
        modelId: string;
        targetIndex?: number;
    };
    ANIMATION_COMPLETE: {
        clip: string;
        targetIndex?: number;
    };
    AUDIO_COMPLETE: {
        url: string;
    };

    // Commands
    TRIGGER_ANIMATION: {
        clip: string;
        loop?: boolean;
        crossFadeDuration?: number;
    };
    UPDATE_TEXTURE: {
        dataUrl: string;
        targetMesh?: string;
    };
    PLAY_AUDIO: {
        url: string;
        volume?: number;
    };
    SET_MODE: {
        mode: '2D' | '3D';
    };
    PAUSE_TRACKING: Record<string, never>;
    RESUME_TRACKING: Record<string, never>;
    LOAD_MODEL: {
        url: string;
        targetIndex: number;
        position?: string;
        rotation?: string;
        scale?: string;
    };
    MIND_BUFFER: {
        buffer: Uint8Array;
    };
    INITIAL_STATE: {
        config: Record<string, unknown>;
    };
}

// ========== HELPER FUNCTIONS ==========

/**
 * Create a typed message for sending to iframe
 */
export function createMessage<K extends ARMessageType>(
    type: K,
    payload: K extends keyof ARMessagePayloadMap ? ARMessagePayloadMap[K] : unknown
): ARMessage<typeof payload> {
    return {
        type,
        payload,
        timestamp: Date.now(),
        origin: 'parent'
    };
}

/**
 * Create a typed message for sending to parent
 */
export function createChildMessage<K extends ARMessageType>(
    type: K,
    payload: K extends keyof ARMessagePayloadMap ? ARMessagePayloadMap[K] : unknown
): ARMessage<typeof payload> {
    return {
        type,
        payload,
        timestamp: Date.now(),
        origin: 'child'
    };
}

/**
 * Type guard to check if message is valid ARMessage
 */
export function isARMessage(data: unknown): data is ARMessage {
    return (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        'timestamp' in data &&
        'origin' in data
    );
}

/**
 * Type guard for legacy message format (backwards compatibility)
 */
export function isLegacyMessage(data: unknown): data is { type: string;[key: string]: unknown } {
    return (
        typeof data === 'object' &&
        data !== null &&
        'type' in data &&
        !('origin' in data)
    );
}

/**
 * Normalize message to ARMessage format (handles legacy messages)
 */
export function normalizeMessage(data: unknown): ARMessage | null {
    if (isARMessage(data)) {
        return data;
    }

    if (isLegacyMessage(data)) {
        const { type, ...rest } = data;
        return {
            type: type as ARMessageType,
            payload: rest,
            timestamp: Date.now(),
            origin: 'child' // Assume legacy messages are from child
        };
    }

    return null;
}
