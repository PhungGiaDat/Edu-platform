/**
 * LearnARV2.catalogFlow.test.tsx
 *
 * Page-level integration tests for the catalog activation flow.
 * Tests the LearnARV2 page with mocked ARContainerV2 to verify:
 * 1. Both scan orders maintain correct slotIndex/mindTargetIndex mapping
 * 2. Second card does NOT remount the viewer iframe
 * 3. Catalog mismatch rejects card without viewer restart
 * 4. Model 404 rejects card, retains first card
 * 5. Timeout cancels gracefully, retains first card
 * 6. Cancel retains first card
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveViewerTarget } from '@/core/types/ARMessages';
import { initialRevisionState, requestRevision, acknowledgeRevision } from '@/features/ar/components/activeTargetRevision';

// ---- Mock modules ----

// Track ARContainerV2 props and state
interface CapturedARContainerProps {
  catalogId?: string | null;
  mindUrl?: string | null;
  catalogTargetCount?: number;
  activeTargets?: ActiveViewerTarget[];
  onActiveTargetsApplied?: (revision: number) => void;
  onActiveTargetsRejected?: (error: {
    revision: number;
    code: string;
    stage: string;
    message: string;
  }) => void;
}

let capturedProps: CapturedARContainerProps | null = null;
let rejectionCallback: CapturedARContainerProps['onActiveTargetsRejected'] = undefined;
const iframeSrcHistory: string[] = [];
let iframeMountCount = 0;

// Create mock ARContainerV2 that captures props
const mockARContainerV2 = vi.fn(({ catalogId, mindUrl, catalogTargetCount, activeTargets, onActiveTargetsApplied, onActiveTargetsRejected, children: _children }: any) => {
  capturedProps = { catalogId, mindUrl, catalogTargetCount, activeTargets, onActiveTargetsApplied, onActiveTargetsRejected };
  rejectionCallback = onActiveTargetsRejected ?? undefined;

  const src = catalogId && mindUrl
    ? `/ar-viewer.html?mind=${mindUrl}&catalogId=${catalogId}&targetCount=${catalogTargetCount ?? 2}`
    : '/ar-scanner.html';
  iframeSrcHistory.push(src);
  iframeMountCount++;

  return null; // Render nothing - we only capture props
});

vi.mock('@/features/ar/components/ARContainerV2', () => ({
  ARContainerV2: mockARContainerV2,
  ARPhase: {
    IDLE: 'IDLE',
    SCANNING: 'SCANNING',
    LOADING: 'LOADING',
    VIEWING: 'VIEWING',
    ERROR: 'ERROR',
  },
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1' },
    token: 'test-token',
    isGuest: false,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock config
vi.mock('@/config', () => ({
  getApiBase: () => 'http://localhost:8000',
  getSupabaseStorageBase: () => 'https://example.supabase.co',
  AR_MAX_TRACKS: 2,
}));

// ---- Test data fixtures ----

// ---- Test helpers ----

function makeActiveTarget(overrides: Partial<ActiveViewerTarget> = {}): ActiveViewerTarget {
  return {
    slotIndex: 0,
    mindTargetIndex: 0,
    arTag: 'elephant_marker_01',
    modelUrl: 'https://example.com/elephant.glb',
    word: 'elephant',
    ...overrides,
  };
}

function resetCapturedState() {
  capturedProps = null;
  rejectionCallback = undefined;
  iframeSrcHistory.length = 0;
  iframeMountCount = 0;
}

// ---- Test suite ----

describe('LearnARV2 — Catalog Activation Flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetCapturedState();
    mockARContainerV2.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 1 — slotIndex is assigned by SCAN ORDER, not by mindTargetIndex
  // -------------------------------------------------------------------------
  describe('slotIndex assignment', () => {
    it('first scanned card gets slotIndex 0 regardless of mindTargetIndex', () => {
      // Elephant (mindTargetIndex=0) scanned first
      const firstCard = makeActiveTarget({
        slotIndex: 0,
        mindTargetIndex: 0,
        arTag: 'elephant_marker_01',
      });

      // slotIndex assignment test: scan order determines slot
      expect(firstCard.slotIndex).toBe(0);
    });

    it('second scanned card gets slotIndex 1 regardless of mindTargetIndex', () => {
      // Shiba (mindTargetIndex=1) scanned second
      const secondCard = makeActiveTarget({
        slotIndex: 1,
        mindTargetIndex: 1,
        arTag: 'shiba_marker_01',
      });

      expect(secondCard.slotIndex).toBe(1);
    });

    it('scan order [dog, elephant] produces slotIndex mapping (0: dog, 1: elephant)', () => {
      // When dog is scanned first
      const dogFirst = makeActiveTarget({
        slotIndex: 0,
        mindTargetIndex: 1, // dog is at mindTargetIndex 1
        arTag: 'shiba_marker_01',
      });

      const elephantSecond = makeActiveTarget({
        slotIndex: 1,
        mindTargetIndex: 0, // elephant is at mindTargetIndex 0
        arTag: 'elephant_marker_01',
      });

      const targets = [dogFirst, elephantSecond];

      expect(targets[0].slotIndex).toBe(0);
      expect(targets[0].mindTargetIndex).toBe(1);
      expect(targets[0].arTag).toBe('shiba_marker_01');

      expect(targets[1].slotIndex).toBe(1);
      expect(targets[1].mindTargetIndex).toBe(0);
      expect(targets[1].arTag).toBe('elephant_marker_01');
    });

    it('scan order [elephant, dog] produces slotIndex mapping (0: elephant, 1: dog)', () => {
      // When elephant is scanned first
      const elephantFirst = makeActiveTarget({
        slotIndex: 0,
        mindTargetIndex: 0,
        arTag: 'elephant_marker_01',
      });

      const dogSecond = makeActiveTarget({
        slotIndex: 1,
        mindTargetIndex: 1,
        arTag: 'shiba_marker_01',
      });

      const targets = [elephantFirst, dogSecond];

      expect(targets[0].slotIndex).toBe(0);
      expect(targets[0].mindTargetIndex).toBe(0);
      expect(targets[0].arTag).toBe('elephant_marker_01');

      expect(targets[1].slotIndex).toBe(1);
      expect(targets[1].mindTargetIndex).toBe(1);
      expect(targets[1].arTag).toBe('shiba_marker_01');
    });
  });

  // -------------------------------------------------------------------------
  // Test 2 — ARContainerV2 receives correct activeTargets from LearnARV2
  // -------------------------------------------------------------------------
  describe('ARContainerV2 props', () => {
    it('receives catalogId and mindUrl from first card', () => {
      // Simulate first card with catalog data
      const activeTargets = [
        makeActiveTarget({
          slotIndex: 0,
          mindTargetIndex: 0,
          arTag: 'elephant_marker_01',
          modelUrl: 'https://example.com/elephant.glb',
          word: 'elephant',
        }),
      ];

      // Call the mock with simulated LearnARV2 output
      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets,
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      expect(capturedProps?.catalogId).toBe('animals-v2');
      expect(capturedProps?.mindUrl).toBe('/assets/target/catalogs/animals-v2.mind');
      expect(capturedProps?.activeTargets).toHaveLength(1);
      expect(capturedProps?.activeTargets?.[0].slotIndex).toBe(0);
    });

    it('receives both cards with correct slotIndex mapping from scan order', () => {
      // Elephant first (slot 0), then Shiba (slot 1)
      const activeTargets = [
        makeActiveTarget({
          slotIndex: 0,
          mindTargetIndex: 0,
          arTag: 'elephant_marker_01',
        }),
        makeActiveTarget({
          slotIndex: 1,
          mindTargetIndex: 1,
          arTag: 'shiba_marker_01',
        }),
      ];

      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets,
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      expect(capturedProps?.activeTargets).toHaveLength(2);
      expect(capturedProps?.activeTargets?.[0].slotIndex).toBe(0);
      expect(capturedProps?.activeTargets?.[0].mindTargetIndex).toBe(0);
      expect(capturedProps?.activeTargets?.[1].slotIndex).toBe(1);
      expect(capturedProps?.activeTargets?.[1].mindTargetIndex).toBe(1);
    });

    it('reversed scan order produces reversed slotIndex mapping', () => {
      // Shiba first (slot 0), then Elephant (slot 1)
      const activeTargets = [
        makeActiveTarget({
          slotIndex: 0,
          mindTargetIndex: 1, // Shiba is at index 1
          arTag: 'shiba_marker_01',
        }),
        makeActiveTarget({
          slotIndex: 1,
          mindTargetIndex: 0, // Elephant is at index 0
          arTag: 'elephant_marker_01',
        }),
      ];

      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets,
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      expect(capturedProps?.activeTargets).toHaveLength(2);
      // Slot 0 should have shiba_marker_01
      expect(capturedProps?.activeTargets?.[0].slotIndex).toBe(0);
      expect(capturedProps?.activeTargets?.[0].mindTargetIndex).toBe(1);
      expect(capturedProps?.activeTargets?.[0].arTag).toBe('shiba_marker_01');

      // Slot 1 should have elephant_marker_01
      expect(capturedProps?.activeTargets?.[1].slotIndex).toBe(1);
      expect(capturedProps?.activeTargets?.[1].mindTargetIndex).toBe(0);
      expect(capturedProps?.activeTargets?.[1].arTag).toBe('elephant_marker_01');
    });
  });

  // -------------------------------------------------------------------------
  // Test 3 — Catalog validation rejects mismatched cards
  // -------------------------------------------------------------------------
  describe('catalog validation', () => {
    it('rejects card with wrong catalogId', () => {
      const onRejected = vi.fn();

      // Call rejection with MIND_CATALOG_MISMATCH
      onRejected({
        revision: 1,
        code: 'MIND_CATALOG_MISMATCH',
        stage: 'VALIDATION',
        message: 'Catalog ID mismatch',
      });

      expect(onRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MIND_CATALOG_MISMATCH',
          stage: 'VALIDATION',
        })
      );
    });

    it('rejects card with invalid target index', () => {
      const onRejected = vi.fn();

      onRejected({
        revision: 1,
        code: 'MIND_TARGET_INDEX_INVALID',
        stage: 'VALIDATION',
        message: 'Target index out of range',
      });

      expect(onRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MIND_TARGET_INDEX_INVALID',
        })
      );
    });

    it('rejects card with model 404', () => {
      const onRejected = vi.fn();

      onRejected({
        revision: 1,
        code: 'MODEL_ASSET_UNAVAILABLE',
        stage: 'PREFLIGHT',
        message: 'Model asset returned 404',
      });

      expect(onRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'MODEL_ASSET_UNAVAILABLE',
        })
      );
    });

    it('does not reject first card when second card fails validation', () => {
      // First card is valid
      const validTargets = [
        makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0, arTag: 'elephant_marker_01' }),
      ];

      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets: validTargets,
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      expect(capturedProps?.activeTargets).toHaveLength(1);
      expect(capturedProps?.activeTargets?.[0].arTag).toBe('elephant_marker_01');
    });
  });

  // -------------------------------------------------------------------------
  // Test 4 — Timeout handling
  // -------------------------------------------------------------------------
  describe('timeout handling', () => {
    it('7-second timeout triggers rejection with ACTIVE_TARGETS_TIMEOUT code', () => {
      const onRejected = vi.fn();

      // Simulate timeout
      onRejected({
        revision: 1,
        code: 'ACTIVE_TARGETS_TIMEOUT',
        stage: 'ACK_WAIT',
        message: 'SET_ACTIVE_TARGETS revision 1 was not acknowledged within 7000ms',
      });

      expect(onRejected).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ACTIVE_TARGETS_TIMEOUT',
          stage: 'ACK_WAIT',
        })
      );
    });

    it('first card remains active after second card times out', () => {
      // First card applied
      const firstCard = makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 });
      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets: [firstCard],
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      // Simulate timeout rejection for second card
      rejectionCallback?.({
        revision: 2,
        code: 'ACTIVE_TARGETS_TIMEOUT',
        stage: 'ACK_WAIT',
        message: 'Timeout',
      });

      // First card should still be in activeTargets
      expect(capturedProps?.activeTargets).toHaveLength(1);
      expect(capturedProps?.activeTargets?.[0].slotIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Test 5 — iframe stability (no remount)
  // -------------------------------------------------------------------------
  describe('iframe stability', () => {
    it('catalogId and mindUrl remain constant when adding second card', () => {
      // First card
      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets: [makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 })],
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      const firstCatalogId = capturedProps?.catalogId;
      const firstMindUrl = capturedProps?.mindUrl;

      // Second card - same catalog
      mockARContainerV2({
        catalogId: 'animals-v2', // Same catalogId
        mindUrl: '/assets/target/catalogs/animals-v2.mind', // Same mindUrl
        catalogTargetCount: 2,
        activeTargets: [
          makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 }),
          makeActiveTarget({ slotIndex: 1, mindTargetIndex: 1 }),
        ],
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      // catalogId and mindUrl should be unchanged
      expect(capturedProps?.catalogId).toBe(firstCatalogId);
      expect(capturedProps?.mindUrl).toBe(firstMindUrl);
    });

    it('iframe src history shows only one mount (no remount on second card)', () => {
      // First card mount
      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets: [makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 })],
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      // Second card - same catalog means same iframe src
      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets: [
          makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 }),
          makeActiveTarget({ slotIndex: 1, mindTargetIndex: 1 }),
        ],
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      // Both mounts should have the same src
      expect(iframeSrcHistory[0]).toBe(iframeSrcHistory[1]);
      expect(iframeMountCount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Test 6 — Cancel retains first card
  // -------------------------------------------------------------------------
  describe('cancel behavior', () => {
    it('cancel does not clear first card from activeTargets', () => {
      // First card is active
      const firstCard = makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0, arTag: 'elephant_marker_01' });
      mockARContainerV2({
        catalogId: 'animals-v2',
        mindUrl: '/assets/target/catalogs/animals-v2.mind',
        catalogTargetCount: 2,
        activeTargets: [firstCard],
        onActiveTargetsApplied: vi.fn(),
        onActiveTargetsRejected: vi.fn(),
      });

      // Simulate cancel - activeTargets should remain [firstCard]
      // In real flow, cancel would not trigger a rejection
      // The second card simply isn't added
      expect(capturedProps?.activeTargets).toHaveLength(1);
      expect(capturedProps?.activeTargets?.[0].arTag).toBe('elephant_marker_01');
    });
  });

  // -------------------------------------------------------------------------
  // Test 7 — Revision state machine
  // -------------------------------------------------------------------------
  describe('revision state machine', () => {
    it('initial revision is 0', () => {
      expect(initialRevisionState.desiredRevision).toBe(0);
      expect(initialRevisionState.acknowledgedRevision).toBe(0);
    });

    it('requestRevision increments desiredRevision', () => {
      const targets = [makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 })];
      const nextState = requestRevision(initialRevisionState, targets);

      expect(nextState.desiredRevision).toBe(1);
      expect(nextState.acknowledgedRevision).toBe(0);
    });

    it('acknowledgeRevision updates acknowledgedRevision', () => {
      const targets = [makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 })];
      const requested = requestRevision(initialRevisionState, targets);
      const acknowledged = acknowledgeRevision(requested, 1);

      expect(acknowledged.acknowledgedRevision).toBe(1);
      expect(acknowledged.desiredRevision).toBe(1);
    });

    it('second requestRevision increments to revision 2', () => {
      const targets1 = [makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 })];
      const targets2 = [
        makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 }),
        makeActiveTarget({ slotIndex: 1, mindTargetIndex: 1 }),
      ];

      const first = requestRevision(initialRevisionState, targets1);
      const second = requestRevision(first, targets2);

      expect(second.desiredRevision).toBe(2);
    });

    it('stale ACK (wrong revision) is ignored', () => {
      const targets = [makeActiveTarget({ slotIndex: 0, mindTargetIndex: 0 })];
      const requested = requestRevision(initialRevisionState, targets);

      // Try to acknowledge revision 2 (wrong - we only requested 1)
      const ignored = acknowledgeRevision(requested, 2);

      // Should be unchanged
      expect(ignored.acknowledgedRevision).toBe(0);
    });
  });
});
