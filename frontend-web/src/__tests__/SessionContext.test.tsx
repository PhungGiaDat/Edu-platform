import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useSession } from '../context/SessionContext';
import sessionApi from '../services/sessionApi';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isGuest: false }),
}));

vi.mock('../services/sessionApi', () => ({
  default: {
    endSession: vi.fn(),
    heartbeat: vi.fn().mockResolvedValue(null),
  },
}));

let navigateTo: (path: string) => void;

function RouterSessionProvider({ children, initialPath }: {
  children: React.ReactNode;
  initialPath: string;
}) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteController>
        <SessionProvider>{children}</SessionProvider>
      </RouteController>
    </MemoryRouter>
  );
}

function RouteController({ children }: { children: React.ReactNode }) {
  navigateTo = useNavigate();
  return <>{children}</>;
}

describe('SessionContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T00:00:00Z'));
    localStorage.clear();
    vi.mocked(sessionApi.endSession).mockReset();
    vi.mocked(sessionApi.endSession).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('commits on_break locally even when backend cleanup fails', () => {
    vi.mocked(sessionApi.endSession).mockResolvedValue(false);
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'limit_reached',
    }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <RouterSessionProvider initialPath="/courses/animals">{children}</RouterSessionProvider>
      ),
    });

    act(() => result.current.takeBreak());

    expect(result.current.isOnBreak).toBe(true);
    expect(JSON.parse(localStorage.getItem('edu_session_state_v1')!).phase).toBe('on_break');

    return Promise.resolve().then(() => {
      expect(sessionApi.endSession).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith('[SessionContext] backend cleanup failed');
    });
  });

  it('does not start a session on /profile', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <RouterSessionProvider initialPath="/profile">{children}</RouterSessionProvider>
      ),
    });

    expect(result.current.phase).toBeNull();
    expect(localStorage.getItem('edu_session_state_v1')).toBeNull();
  });

  it('starts a session on /courses/animals', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <RouterSessionProvider initialPath="/courses/animals">{children}</RouterSessionProvider>
      ),
    });

    expect(result.current.phase).toBe('active');
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('pauses elapsed time after leaving a learning route', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => (
        <RouterSessionProvider initialPath="/courses/animals">{children}</RouterSessionProvider>
      ),
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.elapsedSeconds).toBe(60);

    act(() => {
      navigateTo('/profile');
    });
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });

    expect(result.current.elapsedSeconds).toBe(60);
    expect(result.current.isPaused).toBe(true);
  });
});
