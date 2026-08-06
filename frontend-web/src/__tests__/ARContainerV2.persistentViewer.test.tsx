/**
 * ARContainerV2.persistentViewer.test.tsx
 *
 * Lifecycle regression tests for the Shared-Mind Persistent Viewer.
 *
 * Verifies:
 * 1. First render creates one iframe with catalog URL params
 * 2. Second render (with additional target) keeps the SAME iframe (same node reference)
 * 3. Second render sends SET_ACTIVE_TARGETS with revision 2, NOT MIND_BUFFER
 * 4. AR_READY message from viewer triggers ACK of initial targets
 * 5. No iframe src/key change on second card
 * 6. 7-second ACK timeout calls rejection
 * 7. ACTIVE_TARGETS_APPLIED calls onActiveTargetsApplied
 * 8. ACTIVE_TARGETS_REJECTED calls onActiveTargetsRejected
 */

import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveViewerTarget } from '@/core/types/ARMessages';

// ---- Helpers to build stable target fixtures ----

function makeTarget(overrides: Partial<ActiveViewerTarget> = {}): ActiveViewerTarget {
  return {
    slotIndex: 0,
    mindTargetIndex: 0,
    arTag: 'card-elephant',
    modelUrl: 'https://example.com/elephant.glb',
    textureUrl: 'https://example.com/elephant.png',
    word: 'elephant',
    ...overrides,
  };
}

// ---- Fake contentWindow shared across all rendered iframes ----
// jsdom returns null for iframe.contentWindow; we give it a postMessage
// that we can spy on to verify what the component sent.
const fakePostMessage = vi.fn();
const fakeIframeWindow = {
  postMessage: fakePostMessage,
} as unknown as Window;

/**
 * Give every iframe element in the document a fake contentWindow
 * with a spyable postMessage. Call this after render().
 */
function giveIframesFakeContentWindow() {
  const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe');
  for (const iframe of iframes) {
    Object.defineProperty(iframe, 'contentWindow', {
      value: fakeIframeWindow,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Dispatch a synthetic child→parent AR message through the React component's
 * message handler. We fire a MessageEvent on window so the registered listener
 * picks it up. The source is the fake iframe window so the guard
 * "event.source === iframeRef.current?.contentWindow" passes.
 */
function dispatchARMessage(
  type: string,
  payload: Record<string, unknown> = {}
) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type, payload, timestamp: Date.now(), origin: 'child' },
      source: fakeIframeWindow as unknown as MessagePort,
    })
  );
}

// Stable mock viewer URL
const MIND_URL = '/ar-viewer.html';

describe('ARContainerV2 — Persistent Viewer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakePostMessage.mockReset();
    fakePostMessage.mockImplementation(() => {
      // no-op — messages verified via the mock, not dispatched anywhere
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 1 — First render creates one iframe with catalog URL params
  // -------------------------------------------------------------------------
  it('renders an iframe pointing at the viewer with catalog params on first load', async () => {
    const { container } = render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
      />
    );

    giveIframesFakeContentWindow();

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();

    // Viewer URL must contain mind, catalogId, targetCount — but NOT modelUrls or words
    const src = iframe!.getAttribute('src')!;
    expect(src).toContain('mind=');
    expect(src).toContain('catalogId=animals-v2');
    expect(src).toContain('targetCount=2');
    expect(src).not.toContain('model=');
    expect(src).not.toContain('word=');
  });

  // -------------------------------------------------------------------------
  // Test 2 — iframe node stays the same when a second target is added
  // -------------------------------------------------------------------------
  it('keeps the same iframe node when a second card is added (no remount)', async () => {
    const { container, rerender } = render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
      />
    );

    giveIframesFakeContentWindow();

    const iframeBefore = container.querySelector('iframe')!;
    const srcBefore = iframeBefore.getAttribute('src');

    // Simulate the viewer sending AR_READY
    act(() => {
      dispatchARMessage('AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
    });

    // Now add a second target
    rerender(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[
          makeTarget({ slotIndex: 0, mindTargetIndex: 0 }),
          makeTarget({ slotIndex: 1, mindTargetIndex: 1 }),
        ]}
      />
    );

    const iframeAfter = container.querySelector('iframe')!;

    // The iframe node reference must be identical — no remount
    expect(iframeAfter).toBe(iframeBefore);
    // The src must also be unchanged (key is derived from catalog identity, not targets)
    expect(iframeAfter.getAttribute('src')).toBe(srcBefore);
  });

  // -------------------------------------------------------------------------
  // Test 3 — Second render sends SET_ACTIVE_TARGETS revision 2, NOT MIND_BUFFER
  // -------------------------------------------------------------------------
  it('sends SET_ACTIVE_TARGETS revision 2 (not MIND_BUFFER) after AR_READY when a second target is added', async () => {
    const { rerender } = render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
      />
    );

    giveIframesFakeContentWindow();

    act(() => {
      dispatchARMessage('AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
    });

    fakePostMessage.mockClear();

    act(() => {
      rerender(
        <TestableARContainerV2
          initialPhase="VIEWING"
          catalogId="animals-v2"
          mindUrl={MIND_URL}
          catalogTargetCount={2}
          activeTargets={[
            makeTarget({ slotIndex: 0, mindTargetIndex: 0 }),
            makeTarget({ slotIndex: 1, mindTargetIndex: 1 }),
          ]}
        />
      );
    });

    const posted = fakePostMessage.mock.calls.map(([data]) => data as { type: string; payload: unknown });

    // Must send SET_ACTIVE_TARGETS for revision 2
    const setActiveTargets = posted.find((m) => m.type === 'SET_ACTIVE_TARGETS');
    expect(setActiveTargets).toBeDefined();

    const payload = setActiveTargets!.payload as {
      catalogId: string;
      revision: number;
      targets: ActiveViewerTarget[];
    };
    expect(payload.catalogId).toBe('animals-v2');
    expect(payload.revision).toBe(2);
    expect(payload.targets).toHaveLength(2);

    // Must NOT send MIND_BUFFER
    const mindBufferMsgs = posted.filter((m) => m.type === 'MIND_BUFFER');
    expect(mindBufferMsgs).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 4 — AR_READY triggers SET_ACTIVE_TARGETS with revision 1 (initial)
  // -------------------------------------------------------------------------
  it('AR_READY triggers SET_ACTIVE_TARGETS revision 1 with the initial activeTargets', async () => {
    const initialTargets = [
      makeTarget({ slotIndex: 0, mindTargetIndex: 0 }),
    ];

    render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={initialTargets}
      />
    );

    giveIframesFakeContentWindow();

    fakePostMessage.mockClear();

    act(() => {
      dispatchARMessage('AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
    });

    const posted = fakePostMessage.mock.calls.map(([data]) => data as { type: string; payload: unknown });
    const setActiveTargets = posted.find((m) => m.type === 'SET_ACTIVE_TARGETS');
    expect(setActiveTargets).toBeDefined();

    const payload = setActiveTargets!.payload as {
      catalogId: string;
      revision: number;
      targets: ActiveViewerTarget[];
    };
    expect(payload.catalogId).toBe('animals-v2');
    expect(payload.revision).toBe(1);
    expect(payload.targets).toEqual(initialTargets);
  });

  // -------------------------------------------------------------------------
  // Test 5 — onActiveTargetsApplied callback is called when child ACKs revision
  // -------------------------------------------------------------------------
  it('calls onActiveTargetsApplied with the revision number when child sends ACTIVE_TARGETS_APPLIED', async () => {
    const appliedRevisions: number[] = [];

    const { rerender } = render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
        onActiveTargetsApplied={(rev) => appliedRevisions.push(rev)}
      />
    );

    giveIframesFakeContentWindow();

    act(() => {
      dispatchARMessage('AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
    });

    // Simulate child ACKing revision 1
    act(() => {
      dispatchARMessage('ACTIVE_TARGETS_APPLIED', {
        catalogId: 'animals-v2',
        revision: 1,
        targets: [],
      });
    });

    expect(appliedRevisions).toContain(1);

    // Add second target → revision 2
    rerender(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[
          makeTarget({ slotIndex: 0, mindTargetIndex: 0 }),
          makeTarget({ slotIndex: 1, mindTargetIndex: 1 }),
        ]}
        onActiveTargetsApplied={(rev) => appliedRevisions.push(rev)}
      />
    );

    // Simulate child ACKing revision 2
    act(() => {
      dispatchARMessage('ACTIVE_TARGETS_APPLIED', {
        catalogId: 'animals-v2',
        revision: 2,
        targets: [],
      });
    });

    expect(appliedRevisions).toEqual([1, 2]);
  });

  // -------------------------------------------------------------------------
  // Test 6 — onActiveTargetsRejected callback is called on ACTIVE_TARGETS_REJECTED
  // -------------------------------------------------------------------------
  it('calls onActiveTargetsRejected with error details when child sends ACTIVE_TARGETS_REJECTED', async () => {
    const rejections: Array<{
      revision: number;
      code: string;
      stage: string;
      message: string;
    }> = [];

    render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
        onActiveTargetsRejected={(err) => rejections.push(err)}
      />
    );

    giveIframesFakeContentWindow();

    act(() => {
      dispatchARMessage('AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
    });

    act(() => {
      dispatchARMessage('ACTIVE_TARGETS_REJECTED', {
        catalogId: 'animals-v2',
        revision: 1,
        code: 'TARGET_INDEX_OUT_OF_RANGE',
        stage: 'BIND_ANCHOR',
        message: 'mindTargetIndex 99 is beyond catalog size',
      });
    });

    expect(rejections).toHaveLength(1);
    expect(rejections[0]).toEqual({
      revision: 1,
      code: 'TARGET_INDEX_OUT_OF_RANGE',
      stage: 'BIND_ANCHOR',
      message: 'mindTargetIndex 99 is beyond catalog size',
    });
  });

  // -------------------------------------------------------------------------
  // Test 7 — 7-second ACK timeout triggers rejection with ACTIVE_TARGETS_TIMEOUT
  // -------------------------------------------------------------------------
  it('7-second timeout calls onActiveTargetsRejected with ACTIVE_TARGETS_TIMEOUT code', async () => {
    const rejections: Array<{
      revision: number;
      code: string;
      stage: string;
      message: string;
    }> = [];

    render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
        onActiveTargetsRejected={(err) => rejections.push(err)}
      />
    );

    giveIframesFakeContentWindow();

    act(() => {
      dispatchARMessage('AR_READY', { targetCount: 2, catalogId: 'animals-v2' });
    });

    // Fast-forward past the 7-second ACK timeout (no ACK arrives in time)
    act(() => {
      vi.advanceTimersByTime(7_000);
    });

    expect(rejections).toHaveLength(1);
    expect(rejections[0].code).toBe('ACTIVE_TARGETS_TIMEOUT');
  });

  // -------------------------------------------------------------------------
  // Test 8 — mindIdentityKey does NOT change when activeTargets changes
  // -------------------------------------------------------------------------
  it('iframe key (mindIdentityKey) is unchanged when only activeTargets prop changes', async () => {
    const { container, rerender } = render(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[makeTarget({ slotIndex: 0, mindTargetIndex: 0 })]}
      />
    );

    giveIframesFakeContentWindow();

    const iframeBefore = container.querySelector('iframe')!;

    rerender(
      <TestableARContainerV2
        initialPhase="VIEWING"
        catalogId="animals-v2"
        mindUrl={MIND_URL}
        catalogTargetCount={2}
        activeTargets={[
          makeTarget({ slotIndex: 0, mindTargetIndex: 0 }),
          makeTarget({ slotIndex: 1, mindTargetIndex: 1 }),
        ]}
      />
    );

    const iframeAfter = container.querySelector('iframe')!;

    // Same node = same React key = no remount
    expect(iframeAfter).toBe(iframeBefore);
  });
});

// =============================================================================
// Testable wrapper — strips all runtime/infra dependencies so the component
// can be tested in isolation.
// =============================================================================

type PersistentViewerProps = {
  initialPhase?: React.ComponentProps<typeof RealARContainerV2>['initialPhase'];
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
};

function TestableARContainerV2(props: PersistentViewerProps) {
  return <RealARContainerV2 {...props} />;
}

// Re-export the real component so the test file is self-contained.
import { ARContainerV2 as RealARContainerV2 } from '@/components/ar/ARContainerV2';
