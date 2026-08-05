import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSessionWatcher } from '../components/GlobalSessionWatcher';
import { SessionProvider } from '../context/SessionContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isGuest: false }),
}));

function renderWatcher(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionProvider>
        <Routes>
          <Route path="/courses/animals" element={<div data-testid="course-route" />} />
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
});
