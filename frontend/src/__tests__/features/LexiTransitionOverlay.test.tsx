/**
 * LexiTransitionOverlay — global route-transition overlay behavior.
 *
 * Drives the real history.pushState patch: cross-page pushes show the
 * overlay, same-path/query-only and AR-related pushes stay suppressed,
 * and the overlay self-dismisses (1.2s visible + 0.4s fade).
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LexiTransitionOverlay } from '../../features/shared/lexi-transition/LexiTransitionOverlay';

const OVERLAY = { name: /Lexi đang chuẩn bị trang/ };
const push = (path: string) => window.history.pushState({}, '', path);

describe('LexiTransitionOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is hidden initially', () => {
    render(<LexiTransitionOverlay />);
    expect(screen.queryByRole('status', OVERLAY)).not.toBeInTheDocument();
  });

  it('shows on cross-page pushState and auto-dismisses', () => {
    render(<LexiTransitionOverlay />);
    act(() => { push('/courses'); });
    expect(screen.getByRole('status', OVERLAY)).toBeInTheDocument();
    expect(screen.getByText(/Lexi đang dọn khu chơi/)).toBeInTheDocument();

    // min visible (1200ms) + fade (400ms): root reaches opacity 0 ("hidden" phase
    // then unmounts; aria-live regions may persist through the fade, so we
    // assert visual dismissal via the leaving/hidden opacity, then unmount).
    act(() => { vi.advanceTimersByTime(1250); });
    const root = screen.getByRole('status', OVERLAY);
    expect(root.className).toContain('lto-leaving'); // fade-out started
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByRole('status', OVERLAY)).not.toBeInTheDocument(); // unmounted
  });

  it('does not show for same-path query-only changes', () => {
    window.history.replaceState({}, '', '/games');
    render(<LexiTransitionOverlay />);
    act(() => { push('/games?topic=animals'); });
    expect(screen.queryByRole('status', OVERLAY)).not.toBeInTheDocument();
  });

  it('does not show when entering or leaving AR routes', () => {
    render(<LexiTransitionOverlay />);
    act(() => { push('/learn-ar'); }); // into AR — suppressed
    expect(screen.queryByRole('status', OVERLAY)).not.toBeInTheDocument();
    act(() => { push('/courses'); }); // out of AR — suppressed
    expect(screen.queryByRole('status', OVERLAY)).not.toBeInTheDocument();
  });

  it('does not show when starting from auth pages (LexiLoginLoader owns that moment)', () => {
    window.history.replaceState({}, '', '/login');
    render(<LexiTransitionOverlay />);
    act(() => { push('/courses'); });
    expect(screen.queryByRole('status', OVERLAY)).not.toBeInTheDocument();
  });
});
