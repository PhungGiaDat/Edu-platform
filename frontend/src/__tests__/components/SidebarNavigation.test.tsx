/**
 * Sidebar — Dictionary & Notebook navigation entries (spec 2026-08-30, Task 12)
 *
 * The Sidebar tree pulls in SessionTimerBadge (useSession) and gamification
 * widgets (apiClient), so those boundaries are stubbed here rather than
 * provisioning the whole app context stack.
 */
import '@testing-library/jest-dom/vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from '../../app/components/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/LocaleContext', () => ({ useLocale: vi.fn() }));
vi.mock('../../contexts/SessionContext', () => ({
  useSession: () => ({ isInitialized: false, phase: null }),
}));
vi.mock('../../services/CourseService', () => ({
  courseService: {
    listCourses: vi.fn().mockResolvedValue([]),
    getProgress: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    getStickers: vi.fn().mockResolvedValue([]),
    getStickerCatalog: vi.fn().mockResolvedValue([]),
    getStreak: vi.fn().mockResolvedValue({ minutes_today: 0 }),
    getDailyGoal: vi.fn().mockResolvedValue(null),
  },
  request: vi.fn().mockResolvedValue(null),
  default: { getStreak: vi.fn().mockResolvedValue({ minutes_today: 0 }) },
}));

const authedUser = { isGuest: false, user: { id: 'u1' } } as never;
const guest = { isGuest: true, user: null } as never;
const localeEn = { locale: 'en', setLocale: vi.fn(), t: (k: string) => k } as never;

const renderSidebar = () => render(
  <MemoryRouter initialEntries={['/courses']}>
    <Sidebar isDesktopExpanded onDesktopExpandedChange={vi.fn()} />
  </MemoryRouter>
);

describe('Sidebar — Dictionary & Notebook entries', () => {
  it('links to /dictionary and /notebook in the desktop nav', () => {
    vi.mocked(useAuth).mockReturnValue(authedUser);
    vi.mocked(useLocale).mockReturnValue(localeEn);
    renderSidebar();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/dictionary');
    expect(hrefs).toContain('/notebook');
  });

  it('offers both entries inside the mobile More sheet', async () => {
    vi.mocked(useAuth).mockReturnValue(authedUser);
    vi.mocked(useLocale).mockReturnValue(localeEn);
    renderSidebar();
    await userEvent.click(screen.getByRole('button', { name: /navMore/i }));
    expect(screen.getByRole('button', { name: /navDictionary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /navNotebook/i })).toBeInTheDocument();
  });

  it('hides both entries for guests', () => {
    vi.mocked(useAuth).mockReturnValue(guest);
    vi.mocked(useLocale).mockReturnValue(localeEn);
    renderSidebar();
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/notebook');
    expect(hrefs).not.toContain('/dictionary');
  });

  it('hides the mobile navigation bar when visiting a lesson route', () => {
    vi.mocked(useAuth).mockReturnValue(authedUser);
    vi.mocked(useLocale).mockReturnValue(localeEn);
    const { container } = render(
      <MemoryRouter initialEntries={['/courses/momo-home/lessons/hello-family']}>
        <Sidebar isDesktopExpanded onDesktopExpandedChange={vi.fn()} />
      </MemoryRouter>
    );
    expect(container.querySelector('.learner-mobile-nav')).toBeNull();
  });

  it('shows while scrolling and hides 1200ms after the last scroll event', () => {
    vi.useFakeTimers();
    try {
      vi.mocked(useAuth).mockReturnValue(authedUser);
      vi.mocked(useLocale).mockReturnValue(localeEn);
      const { container } = renderSidebar();
      const mobileNav = container.querySelector('.learner-mobile-nav');

      expect(mobileNav).not.toHaveClass('learner-mobile-nav--hidden');

      act(() => {
        vi.advanceTimersByTime(1200);
      });
      expect(mobileNav).toHaveClass('learner-mobile-nav--hidden');

      act(() => {
        document.dispatchEvent(new Event('scroll'));
      });
      expect(mobileNav).not.toHaveClass('learner-mobile-nav--hidden');

      act(() => {
        vi.advanceTimersByTime(900);
        document.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(900);
      });
      expect(mobileNav).not.toHaveClass('learner-mobile-nav--hidden');

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mobileNav).toHaveClass('learner-mobile-nav--hidden');
    } finally {
      vi.useRealTimers();
    }
  });
});
