import { decode, encode } from '@msgpack/msgpack';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeMindTargetBuffers } from './mergeMindTargets';

function source(id: string, version = 2, targetCount = 1): Uint8Array {
    return encode({
        v: version,
        dataList: Array.from({ length: targetCount }, (_, index) => ({
            targetImage: { width: 100 + index, height: 80 + index },
            trackingData: { id: `${id}-tracking-${index}` },
            matchingData: { id: `${id}-matching-${index}` }
        }))
    });
}

describe('mergeMindTargetBuffers', () => {
    it('merges two v2 single-target files in deterministic order', () => {
        const merged = mergeMindTargetBuffers(source('first'), source('second'));
        const decoded = decode(merged) as {
            v: number;
            dataList: Array<{ trackingData: { id: string } }>;
        };
        expect({ version: decoded.v, targetCount: decoded.dataList.length })
            .toEqual({ version: 2, targetCount: 2 });
        expect(decoded.dataList.map(target => target.trackingData.id))
            .toEqual(['first-tracking-0', 'second-tracking-0']);
    });

    it('rejects incompatible versions', () => {
        expect(() => mergeMindTargetBuffers(source('first', 1), source('second')))
            .toThrow('unsupported MindAR format');
    });

    it('rejects sources containing more than one target', () => {
        expect(() => mergeMindTargetBuffers(source('first', 2, 2), source('second')))
            .toThrow('must contain exactly one tracking target');
    });

    it('rejects malformed MessagePack', () => {
        expect(() => mergeMindTargetBuffers(new Uint8Array([0xc1]), source('second')))
            .toThrow();
    });

    it('merges the repository elephant and jungle Mind targets', () => {
        const elephant = readFileSync(resolve('public/assets/target/elephant_targets.mind'));
        const jungle = readFileSync(resolve('public/assets/target/jungle_targets.mind'));
        const merged = mergeMindTargetBuffers(elephant, jungle);
        const decoded = decode(merged) as { v: number; dataList: unknown[] };
        expect(decoded.v).toBe(2);
        expect(decoded.dataList).toHaveLength(2);
    });
});
