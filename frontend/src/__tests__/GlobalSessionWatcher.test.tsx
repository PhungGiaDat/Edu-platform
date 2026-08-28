import '@testing-library/jest-dom/vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSessionWatcher } from '@/features/session/components/GlobalSessionWatcher';
import { BreakReminder } from '@/features/session/components/BreakReminder';
import { SessionProvider } from '../contexts/SessionContext';
import { LocaleProvider } from '../contexts/LocaleContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isGuest: false }),
}));

function renderWatcher(initialPath: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <SessionProvider>
          <Routes>
            <Route
              path="/courses/animals"
              element={(
                <>
                  <button type="button">Obscured course control</button>
                  <div data-testid="course-route" />
                </>
              )}
            />
            <Route path="/learn-ar" element={<div data-testid="learn-ar-route" />} />
            <Route path="/profile" element={<div data-testid="profile-route" />} />
          </Routes>
          <GlobalSessionWatcher />
        </SessionProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

function makeLocalStorageUnavailable(): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  if (!descriptor) {
    throw new Error('Expected window.localStorage to have an own-property descriptor');
  }

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => {
      throw new DOMException('blocked', 'SecurityError');
    },
  });

  return () => Object.defineProperty(window, 'localStorage', descriptor);
}

describe('GlobalSessionWatcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the learning route available while the global limit overlay is disabled', () => {
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'limit_reached',
    }));

    renderWatcher('/courses/animals');

    expect(screen.getByTestId('course-route')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-route')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('edu_session_state_v1')!).phase).toBe('limit_reached');
  });

  it('renders the session reminder in Vietnamese when the selected locale is Vietnamese', () => {
    localStorage.setItem('edu-platform-locale', 'vi');
    render(
      <LocaleProvider>
        <BreakReminder
          isWarning
          isLimitReached={false}
          remainingSeconds={65}
          onContinue={vi.fn()}
          onExit={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText('Sắp đến giờ nghỉ rồi!')).toBeInTheDocument();
    expect(screen.getByText('Còn 1 phút 5 giây nữa thôi! Bạn đã học rất chăm chỉ hôm nay!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tiếp tục học/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thoát lúc này/i })).toBeInTheDocument();
  });

  it('keeps the learning route available during cooldown while the global overlay is disabled', () => {
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: Date.now() + 5 * 60_000,
    }));

    renderWatcher('/courses/animals');

    expect(screen.getByTestId('course-route')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-route')).not.toBeInTheDocument();
  });

  it('does not intercept focus while the global session overlay is disabled', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open course';
    document.body.appendChild(trigger);
    trigger.focus();
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'limit_reached',
    }));

    try {
      renderWatcher('/courses/animals');

      expect(trigger).toHaveFocus();
      expect(screen.getByRole('button', { name: /obscured course control/i })).not.toHaveFocus();
    } finally {
      trigger.remove();
    }
  });

  it('refocuses the hard-limit action when a warning becomes a limit', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    trigger.textContent = 'Open course';
    document.body.appendChild(trigger);
    trigger.focus();

    try {
      const { rerender } = render(
        <LocaleProvider>
          <BreakReminder
            isWarning
            isLimitReached={false}
            remainingSeconds={60}
            onContinue={vi.fn()}
            onExit={vi.fn()}
          />
        </LocaleProvider>,
      );

      expect(screen.getByRole('button', { name: /sessionKeepGoing/i })).toHaveFocus();

      rerender(
        <LocaleProvider>
          <BreakReminder
            isWarning={false}
            isLimitReached
            remainingSeconds={0}
            onExit={vi.fn()}
          />
        </LocaleProvider>,
      );

      const takeBreak = screen.getByRole('button', { name: /sessionTakeBreak/i });
      expect(takeBreak).toHaveFocus();
      await user.tab();
      expect(takeBreak).toHaveFocus();
      await user.tab({ shift: true });
      expect(takeBreak).toHaveFocus();
    } finally {
      trigger.remove();
    }
  });

  it.each([
    ['/COURSES/animals/', 'course-route'],
    ['/LEARN-AR/', 'learn-ar-route'],
  ])('keeps %s available without a global cooldown overlay', (initialPath, routeTestId) => {
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: Date.now() + 5 * 60_000,
    }));

    renderWatcher(initialPath);

    expect(screen.getByTestId(routeTestId)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the learning route unchanged when break storage writes fail', () => {
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'limit_reached',
    }));
    const storageFailure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    try {
      renderWatcher('/courses/animals');

      expect(screen.getByTestId('course-route')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-route')).not.toBeInTheDocument();
    } finally {
      storageFailure.mockRestore();
    }
  });

  it('keeps the learning route available when the localStorage getter is blocked', () => {
    const restoreLocalStorage = makeLocalStorageUnavailable();

    try {
      renderWatcher('/courses/animals');

      expect(screen.getByTestId('course-route')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-route')).not.toBeInTheDocument();
    } finally {
      restoreLocalStorage();
    }
  });

  it('does not move focus when the global cooldown overlay is disabled', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: Date.now() + 5 * 60_000,
    }));

    const { unmount } = renderWatcher('/courses/animals');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('keeps LearnARV2 free of a page-local break reminder', () => {
    const learnArPath = [
      resolve(process.cwd(), 'src/pages/LearnARV2.tsx'),
      resolve(process.cwd(), 'frontend-web/src/pages/LearnARV2.tsx'),
    ].find(existsSync);

    expect(learnArPath).toBeDefined();
    const learnArSource = readFileSync(learnArPath!, 'utf8');

    expect(learnArSource).not.toContain('components/BreakReminder');
    expect(learnArSource).not.toMatch(/<BreakReminder\b/);
    expect(learnArSource).not.toMatch(/10 More Minutes \(Parent\)/);
  });
});
