import { decode, encode } from '@msgpack/msgpack';

interface MindV2Payload {
    v: number;
    dataList: unknown[];
}

function validateSingleTargetMind(buffer: ArrayBuffer | Uint8Array, source: string): MindV2Payload {
    let payload: Partial<MindV2Payload> | null;
    try {
        payload = decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)) as Partial<MindV2Payload> | null;
    } catch (error) {
        throw new Error(`${source} is not valid MessagePack`, { cause: error });
    }
    if (!payload || payload.v !== 2) {
        throw new Error(`${source} uses an unsupported MindAR format (expected v2)`);
    }
    if (!Array.isArray(payload.dataList) || payload.dataList.length !== 1) {
        throw new Error(`${source} must contain exactly one tracking target`);
    }
    const target = payload.dataList[0] as Record<string, unknown> | null;
    if (!target || typeof target !== 'object') {
        throw new Error(`${source} has malformed tracking data`);
    }
    if (!('targetImage' in target) || !('trackingData' in target) || !('matchingData' in target)) {
        throw new Error(`${source} has incomplete tracking data`);
    }
    return payload as MindV2Payload;
}

/**
 * Merge two single-target MindAR v2 files while preserving scan order.
 *
 * Ordering invariant: callers must bind targetIndex 0 to `first` card content
 * and targetIndex 1 to `second` card content. The array below is the source of
 * truth for the runtime-compiled MULTI viewer; changing it independently of
 * viewerTargets would recreate the combo target-order bug.
 */
export function mergeMindTargetBuffers(
    first: ArrayBuffer | Uint8Array,
    second: ArrayBuffer | Uint8Array
): Uint8Array {
    const firstMind = validateSingleTargetMind(first, 'First Mind file');
    const secondMind = validateSingleTargetMind(second, 'Second Mind file');
    return encode({
        v: 2,
        dataList: [firstMind.dataList[0], secondMind.dataList[0]]
    });
}
