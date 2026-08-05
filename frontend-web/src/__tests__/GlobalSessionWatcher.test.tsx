import '@testing-library/jest-dom/vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSessionWatcher } from '../components/GlobalSessionWatcher';
import { BreakReminder } from '../components/BreakReminder';
import { SessionProvider } from '../context/SessionContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isGuest: false }),
}));

function renderWatcher(initialPath: string) {
  return render(
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
    </MemoryRouter>,
  );
}

describe('GlobalSessionWatcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lets a child take a break and leave the limit overlay', async () => {
    const user = userEvent.setup();
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'limit_reached',
    }));

    renderWatcher('/courses/animals');

    expect(screen.getByText('Time for a Break!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /take a break/i }));
    expect(screen.getByTestId('profile-route')).toBeInTheDocument();
    expect(screen.queryByText('Time for a Break!')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('edu_session_state_v1')!).phase).toBe('on_break');
    expect(screen.queryByRole('button', { name: /10 more minutes/i })).not.toBeInTheDocument();
  });

  it('shows a cooldown notice on learning routes and returns to the profile', async () => {
    const user = userEvent.setup();
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: Date.now() + 5 * 60_000,
    }));

    renderWatcher('/courses/animals');

    expect(screen.getByRole('dialog', { name: /break time in progress/i })).toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to profile/i }));
    expect(screen.getByTestId('profile-route')).toBeInTheDocument();
  });

  it('contains focus in the hard-limit reminder and restores it after navigation', async () => {
    const user = userEvent.setup();
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
      const takeBreak = screen.getByRole('button', { name: /take a break/i });

      expect(takeBreak).toHaveFocus();
      await user.tab();
      expect(takeBreak).toHaveFocus();
      await user.tab({ shift: true });
      expect(takeBreak).toHaveFocus();
      expect(screen.getByRole('button', { name: /obscured course control/i })).not.toHaveFocus();

      await user.click(takeBreak);
      expect(screen.getByTestId('profile-route')).toBeInTheDocument();
      expect(trigger).toHaveFocus();
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
        <BreakReminder
          isWarning
          isLimitReached={false}
          remainingSeconds={60}
          onContinue={vi.fn()}
          onExit={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /keep going/i })).toHaveFocus();

      rerender(
        <BreakReminder
          isWarning={false}
          isLimitReached
          remainingSeconds={0}
          onExit={vi.fn()}
        />,
      );

      const takeBreak = screen.getByRole('button', { name: /take a break/i });
      expect(takeBreak).toHaveFocus();
      await user.tab();
      expect(takeBreak).toHaveFocus();
      await user.tab({ shift: true });
      expect(takeBreak).toHaveFocus();
    } finally {
      trigger.remove();
    }
  });

  it.each(['/COURSES/animals/', '/LEARN-AR/'])('shows cooldown on a React Router learning-path variant: %s', initialPath => {
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: Date.now() + 5 * 60_000,
    }));

    renderWatcher(initialPath);

    expect(screen.getByRole('dialog', { name: /break time in progress/i })).toBeInTheDocument();
  });

  it('returns to profile after take-break storage writes fail', async () => {
    const user = userEvent.setup();
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'limit_reached',
    }));
    const storageFailure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    try {
      renderWatcher('/courses/animals');

      await user.click(screen.getByRole('button', { name: /take a break/i }));
      expect(screen.getByTestId('profile-route')).toBeInTheDocument();
    } finally {
      storageFailure.mockRestore();
    }
  });

  it('traps focus in the cooldown dialog and restores the prior focus on unmount', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    localStorage.setItem('edu_session_state_v1', JSON.stringify({
      version: 1,
      phase: 'on_break',
      breakUntil: Date.now() + 5 * 60_000,
    }));

    const { unmount } = renderWatcher('/courses/animals');
    const backToProfile = screen.getByRole('button', { name: /back to profile/i });

    expect(backToProfile).toHaveFocus();
    await user.tab();
    expect(backToProfile).toHaveFocus();
    await user.tab({ shift: true });
    expect(backToProfile).toHaveFocus();

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
