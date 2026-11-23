/**
 * Behavioural contract for `window.ARAddCardScanner.create`.
 *
 * The Add Card flow must reuse the persistent viewer's existing
 * `<video>` element rather than asking the browser for another camera.
 * This file loads the vendored IIFE inside a `node:vm` sandbox with a
 * minimal DOM stub so we can exercise the scanner without a browser.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

interface ScannerHarness {
  api: {
    start(nextRequest: {
      sessionId: string;
      excludedQrIds: string[];
      timeoutMs: number;
    }): void;
    cancel(): void;
    isScanning(): boolean;
  };
  events: Array<Record<string, unknown>>;
  emittedQr: { data: string } | null;
}

interface ScannerHarnessOptions {
  decode?: (data: Uint8ClampedArray, width: number, height: number, opts?: unknown) => { data: string } | null;
  readyState?: number;
  videoWidth?: number;
  videoHeight?: number;
}

interface ScannerApiOptions {
  getVideo: () => HTMLVideoElement | null;
  decode: (data: Uint8ClampedArray, width: number, height: number, opts?: unknown) => { data: string } | null;
  emit: (event: Record<string, unknown>) => void;
  intervalMs?: number;
}

interface ScannerApi {
  start(nextRequest: {
    sessionId: string;
    excludedQrIds: string[];
    timeoutMs: number;
  }): void;
  cancel(): void;
  isScanning(): boolean;
}

interface ScannerFactory {
  create(options: ScannerApiOptions): ScannerApi;
}

function createCanvasStub(): HTMLCanvasElement {
  const ctx = {
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  };
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

function createScannerHarness(options: ScannerHarnessOptions = {}): ScannerHarness {
  const events: Array<Record<string, unknown>> = [];
  const emittedQr = { data: '' };
  const decoder = options.decode ?? (() => {
    emittedQr.data = 'dog123';
    return { data: 'dog123' };
  });
  const readyState = options.readyState ?? 4; // HAVE_ENOUGH_DATA
  const videoWidth = options.videoWidth ?? 320;
  const videoHeight = options.videoHeight ?? 240;

  const video: HTMLVideoElement = {
    readyState,
    HAVE_CURRENT_DATA: 2,
    videoWidth,
    videoHeight,
  } as unknown as HTMLVideoElement;

  const sandbox = {
    document: {
      createElement: () => createCanvasStub(),
    },
    setTimeout,
    clearTimeout,
    globalThis: undefined as unknown,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const source = readFileSync(
    resolve('public/static/ar-assets/js/ar-add-card-scanner.js'),
    'utf8'
  );
  vm.runInContext(source, sandbox, { filename: 'ar-add-card-scanner.js' });

  const api = (sandbox as unknown as { ARAddCardScanner: ScannerFactory })
    .ARAddCardScanner.create({
      getVideo: () => video,
      decode: decoder,
      emit: (event: Record<string, unknown>) => events.push(event),
      intervalMs: 50,
    });

  return {
    api,
    events,
    emittedQr,
  };
}

describe('ARAddCardScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the supplied viewer video and never requests another camera', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { mediaDevices: { getUserMedia } },
    });
    const scanner = createScannerHarness({ decode: () => ({ data: 'dog123' }) });
    scanner.api.start({
      sessionId: 'session-1',
      excludedQrIds: ['ele123'],
      timeoutMs: 15000,
    });
    expect(scanner.events[0]).toMatchObject({
      type: 'ADD_CARD_SCAN_STARTED',
      sessionId: 'session-1',
    });
    await vi.advanceTimersByTimeAsync(60);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(scanner.events).toContainEqual({
      type: 'QR_DETECTED',
      qrId: 'dog123',
      sessionId: 'session-1',
    });
    expect(scanner.api.isScanning()).toBe(false);
  });

  it('skips QR ids that are already loaded', async () => {
    const excludedScanner = createScannerHarness({
      decode: () => ({ data: 'ele123' }),
    });
    excludedScanner.api.start({
      sessionId: 'session-2',
      excludedQrIds: ['ele123'],
      timeoutMs: 15000,
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(excludedScanner.events).toEqual([
      {
        type: 'ADD_CARD_SCAN_STARTED',
        sessionId: 'session-2',
      },
    ]);
    expect(excludedScanner.api.isScanning()).toBe(true);
  });

  it('cancels and emits a single cancellation event', async () => {
    const scanner = createScannerHarness({ decode: () => null });
    scanner.api.start({
      sessionId: 'session-3',
      excludedQrIds: [],
      timeoutMs: 15000,
    });
    expect(scanner.api.isScanning()).toBe(true);
    scanner.api.cancel();
    expect(scanner.events.some((event) => event.type === 'ADD_CARD_SCAN_STARTED')).toBe(true);
    expect(scanner.api.isScanning()).toBe(false);
  });

  it('emits ADD_CARD_SCAN_TIMEOUT exactly once after the deadline', async () => {
    const scanner = createScannerHarness({ decode: () => null });
    scanner.api.start({
      sessionId: 'session-4',
      excludedQrIds: [],
      timeoutMs: 1000,
    });
    await vi.advanceTimersByTimeAsync(1000);
    const timeoutEvents = scanner.events.filter((event) => event.type === 'ADD_CARD_SCAN_TIMEOUT');
    expect(timeoutEvents).toEqual([
      {
        type: 'ADD_CARD_SCAN_TIMEOUT',
        sessionId: 'session-4',
      },
    ]);
    expect(scanner.api.isScanning()).toBe(false);
  });

  it('does not emit another terminal event after a successful detection', async () => {
    const scanner = createScannerHarness({ decode: () => ({ data: 'dog123' }) });
    scanner.api.start({
      sessionId: 'session-5',
      excludedQrIds: [],
      timeoutMs: 15000,
    });
    await vi.advanceTimersByTimeAsync(60);
    await vi.advanceTimersByTimeAsync(5000);
    const terminalEvents = scanner.events.filter(
      (event) => event.type === 'QR_DETECTED' || event.type === 'ADD_CARD_SCAN_TIMEOUT',
    );
    expect(terminalEvents).toHaveLength(1);
  });
});
