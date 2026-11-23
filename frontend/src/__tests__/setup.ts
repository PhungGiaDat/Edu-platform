/**
 * Vitest test setup file
 */
import { vi, beforeAll, afterAll } from 'vitest';

// Type declarations for test globals
declare global {
  namespace NodeJS {
    interface Global {
      IntersectionObserver: typeof IntersectionObserver;
      ResizeObserver: typeof ResizeObserver;
    }
  }
}

// Mock Element.scrollIntoView (jsdom doesn't implement it)
Element.prototype.scrollIntoView = vi.fn();

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
window.ResizeObserver = mockResizeObserver as unknown as typeof ResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock iframe.contentWindow — jsdom returns null but the component checks
// contentWindow before posting messages. We assign a fake postMessage so
// sendActiveTargets and other iframe-send helpers can verify what they sent.
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
  get() {
    return this._mockContentWindow ?? null;
  },
  set(val) {
    this._mockContentWindow = val;
  },
  configurable: true,
  enumerable: true,
});

// Suppress console.error in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning:')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
