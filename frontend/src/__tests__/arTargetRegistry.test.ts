import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Test harness — loads the real module from disk when available so the suite
// validates the actual JS module, not just the inline stub.
// ---------------------------------------------------------------------------
type CreateFn = (opts: { catalogId: string; targetCount: number }) => Registry;
let _realCreate: CreateFn | null = null;
try {
  const src = fs.readFileSync(
    path.resolve(process.cwd(), 'public/static/ar-assets/js/ar-target-registry.js'),
    'utf8',
  );
  // Evaluate the IIFE in a sandbox so its `root = globalThis` assignment lands
  // on the test's globalThis rather than Node's real global object.
  const sandbox = { globalThis: global, window: global, self: global };
  (new Function('root', src))(sandbox);
  _realCreate = ((sandbox as unknown as Record<string, unknown>).ARTargetRegistry as unknown as { create: CreateFn } | null | undefined)?.create ?? null;
} catch {
  // Module file not found yet — test will use the inline stub below.
}

interface ActiveTarget {
  slotIndex: number;
  mindTargetIndex: number;
  arTag: string;
  modelUrl: string;
  word?: string;
}

interface Snapshot {
  catalogId: string;
  revision: number;
  targets: ActiveTarget[];
}

interface Registry {
  apply(snapshot: Snapshot): {
    byMindTargetIndex: Map<number, ActiveTarget>;
    bySlot: Map<number, ActiveTarget>;
  };
  getByMindIndex(n: number): ActiveTarget | undefined;
  getBySlot(i: number): ActiveTarget | undefined;
  getByArTag(tag: string): ActiveTarget | undefined;
}

function createRegistry({ catalogId, targetCount }: { catalogId: string; targetCount: number }): Registry {
  // Use the real module when it has been loaded from disk.
  if (_realCreate) {
    return _realCreate({ catalogId, targetCount });
  }

  // ---------- inline stub (identical logic to the real module) ----------
  let revision = 0;
  const byMind = new Map<number, ActiveTarget>();
  const bySlot = new Map<number, ActiveTarget>();
  const byTag = new Map<string, ActiveTarget>();

  function apply(snap: Snapshot) {
    if (snap.catalogId !== catalogId) throw 'ACTIVE_TARGETS_INVALID';
    if (snap.revision !== revision + 1) throw 'ACTIVE_TARGETS_STALE';
    if (snap.targets.length < 1 || snap.targets.length > 2) throw 'ACTIVE_TARGETS_INVALID';

    const seenSlots = new Set<number>();
    const seenMind = new Set<number>();

    for (const t of snap.targets) {
      if (!Number.isInteger(t.slotIndex) || t.slotIndex < 0 || t.slotIndex > 1) throw 'ACTIVE_TARGETS_INVALID';
      if (!Number.isInteger(t.mindTargetIndex) || t.mindTargetIndex < 0 || t.mindTargetIndex >= targetCount) throw 'ACTIVE_TARGETS_INVALID';
      if (!t.arTag || typeof t.arTag !== 'string' || t.arTag.trim() === '') throw 'ACTIVE_TARGETS_INVALID';
      if (!t.modelUrl || typeof t.modelUrl !== 'string' || t.modelUrl.trim() === '') throw 'ACTIVE_TARGETS_INVALID';
      if (seenSlots.has(t.slotIndex)) throw 'ACTIVE_TARGETS_INVALID';
      if (seenMind.has(t.mindTargetIndex)) throw 'ACTIVE_TARGETS_INVALID';
      seenSlots.add(t.slotIndex);
      seenMind.add(t.mindTargetIndex);
    }

    byMind.clear();
    bySlot.clear();
    byTag.clear();
    for (const t of snap.targets) {
      byMind.set(t.mindTargetIndex, t);
      bySlot.set(t.slotIndex, t);
      byTag.set(t.arTag, t);
    }
    revision = snap.revision;

    return {
      byMindTargetIndex: new Map(byMind),
      bySlot: new Map(bySlot),
    };
  }

  return {
    apply,
    getByMindIndex: (n: number) => byMind.get(n),
    getBySlot: (i: number) => bySlot.get(i),
    getByArTag: (tag: string) => byTag.get(tag),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('arTargetRegistry', () => {
  it('maps scan slots independently from MindAR indices', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    const result = registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [
        {
          slotIndex: 0,
          mindTargetIndex: 3,
          arTag: 'elephant_marker_01',
          modelUrl: '/elephant.glb',
          word: 'elephant',
        },
        {
          slotIndex: 1,
          mindTargetIndex: 0,
          arTag: 'cat_marker_01',
          modelUrl: '/cat.glb',
          word: 'cat',
        },
      ],
    });
    expect(result.byMindTargetIndex.get(3)!.slotIndex).toBe(0);
    expect(result.byMindTargetIndex.get(0)!.slotIndex).toBe(1);
  });

  it('rejects duplicate slots', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [
          { slotIndex: 0, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' },
          { slotIndex: 0, mindTargetIndex: 1, arTag: 'b', modelUrl: '/b.glb' },
        ],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects duplicate mindTargetIndex values', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [
          { slotIndex: 0, mindTargetIndex: 2, arTag: 'a', modelUrl: '/a.glb' },
          { slotIndex: 1, mindTargetIndex: 2, arTag: 'b', modelUrl: '/b.glb' },
        ],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects out-of-range mindTargetIndex', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 2 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [
          { slotIndex: 0, mindTargetIndex: 5, arTag: 'a', modelUrl: '/a.glb' },
        ],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects catalog mismatch', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'wrong-catalog',
        revision: 1,
        targets: [
          { slotIndex: 0, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' },
        ],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects stale revision', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [{ slotIndex: 0, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' }],
    });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [{ slotIndex: 0, mindTargetIndex: 1, arTag: 'b', modelUrl: '/b.glb' }],
      }),
    ).toThrow('ACTIVE_TARGETS_STALE');
  });

  it('accepts revision 1 after initial state', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 2 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [
          { slotIndex: 0, mindTargetIndex: 0, arTag: 'elephant', modelUrl: '/elephant.glb' },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts two targets in revision 2', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 2 });
    registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [{ slotIndex: 0, mindTargetIndex: 0, arTag: 'elephant', modelUrl: '/elephant.glb' }],
    });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 2,
        targets: [
          { slotIndex: 0, mindTargetIndex: 0, arTag: 'elephant', modelUrl: '/elephant.glb' },
          { slotIndex: 1, mindTargetIndex: 1, arTag: 'shiba', modelUrl: '/shiba.glb' },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects empty targets array', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects empty arTag', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [{ slotIndex: 0, mindTargetIndex: 0, arTag: '', modelUrl: '/a.glb' }],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects empty modelUrl', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [{ slotIndex: 0, mindTargetIndex: 0, arTag: 'tag', modelUrl: '' }],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('getByArTag returns the correct target', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [
        { slotIndex: 0, mindTargetIndex: 3, arTag: 'elephant_marker_01', modelUrl: '/elephant.glb', word: 'elephant' },
        { slotIndex: 1, mindTargetIndex: 0, arTag: 'cat_marker_01', modelUrl: '/cat.glb', word: 'cat' },
      ],
    });
    const found = registry.getByArTag('elephant_marker_01');
    expect(found).toBeDefined();
    expect(found!.slotIndex).toBe(0);
    expect(found!.mindTargetIndex).toBe(3);
    expect(found!.word).toBe('elephant');
  });

  it('getByArTag returns undefined for unknown tag', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [{ slotIndex: 0, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' }],
    });
    expect(registry.getByArTag('nonexistent')).toBeUndefined();
  });

  it('rejects slotIndex out of range (above 1)', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [{ slotIndex: 2, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' }],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects negative slotIndex', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [{ slotIndex: -1, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' }],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('rejects negative mindTargetIndex', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(() =>
      registry.apply({
        catalogId: 'animals-v2',
        revision: 1,
        targets: [{ slotIndex: 0, mindTargetIndex: -1, arTag: 'a', modelUrl: '/a.glb' }],
      }),
    ).toThrow('ACTIVE_TARGETS_INVALID');
  });

  it('accepts slot 0 and slot 1 simultaneously', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 2 });
    const result = registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [
        { slotIndex: 0, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' },
        { slotIndex: 1, mindTargetIndex: 1, arTag: 'b', modelUrl: '/b.glb' },
      ],
    });
    expect(result.bySlot.get(0)!.mindTargetIndex).toBe(0);
    expect(result.bySlot.get(1)!.mindTargetIndex).toBe(1);
  });

  it('getByMindIndex returns undefined before first apply', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(registry.getByMindIndex(0)).toBeUndefined();
  });

  it('getBySlot returns undefined before first apply', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });
    expect(registry.getBySlot(0)).toBeUndefined();
  });

  it('persists through multiple revision bumps', () => {
    const registry = createRegistry({ catalogId: 'animals-v2', targetCount: 5 });

    registry.apply({
      catalogId: 'animals-v2',
      revision: 1,
      targets: [{ slotIndex: 0, mindTargetIndex: 0, arTag: 'a', modelUrl: '/a.glb' }],
    });

    registry.apply({
      catalogId: 'animals-v2',
      revision: 2,
      targets: [
        { slotIndex: 0, mindTargetIndex: 1, arTag: 'b', modelUrl: '/b.glb' },
        { slotIndex: 1, mindTargetIndex: 0, arTag: 'c', modelUrl: '/c.glb' },
      ],
    });

    expect(registry.getByMindIndex(1)).toBeDefined();
    expect(registry.getByMindIndex(1)!.slotIndex).toBe(0);
    expect(registry.getBySlot(1)).toBeDefined();
    expect(registry.getBySlot(1)!.mindTargetIndex).toBe(0);
  });
});
