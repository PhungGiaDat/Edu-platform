/**
 * Leaderboard Unit Tests
 * 
 * Tests for the Leaderboard page component including:
 * - Loading state
 * - Error state
 * - Empty state
 * - Leaderboard display with top 3 podium
 * - Time filter tabs
 * - User position display
 */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Leaderboard } from '../pages/Leaderboard';
import { GamificationService, type LeaderboardEntry } from '../services/GamificationService';

// Mock the gamification service
vi.mock('../services/GamificationService', () => ({
  GamificationService: {
    getLeaderboard: vi.fn(),
  },
}));

// Mock the auth context
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Leaderboard', () => {
  const mockLeaderboardEntries: LeaderboardEntry[] = [
    { user_id: 'user-1', username: 'Alice', points: 1500, rank: 1 },
    { user_id: 'user-2', username: 'Bob', points: 1200, rank: 2 },
    { user_id: 'user-3', username: 'Charlie', points: 900, rank: 3 },
    { user_id: 'user-4', username: 'Diana', points: 800, rank: 4 },
    { user_id: 'user-5', username: 'Eve', points: 700, rank: 5 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching data', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockLeaderboardEntries), 100))
      );

      render(<Leaderboard />, { wrapper: TestWrapper });

      // Should show loading skeleton with animate-pulse
      expect(document.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('displays error state when API fails', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockRejectedValue(new Error('Network error'));

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Could not load leaderboard/i)).toBeInTheDocument();
      });
    });

    it('has a retry button in error state', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockRejectedValue(new Error('Network error'));

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('retry button reloads data', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockRejectedValueOnce(new Error('Network error'));

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Could not load leaderboard/i)).toBeInTheDocument();
      });

      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no entries', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/No rankings yet/i)).toBeInTheDocument();
      });
    });

    it('shows trophy emoji in empty state', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('🏆')).toBeInTheDocument();
      });
    });

    it('has link to start learning in empty state', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /start learning/i })).toBeInTheDocument();
      });
    });
  });

  describe('Leaderboard Display', () => {
    it('displays leaderboard title', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Leaderboard/i);
      });
    });

    it('shows top 3 entries', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
      });
    });

    it('displays points for each user', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/1,500/)).toBeInTheDocument();
        expect(screen.getByText(/1,200/)).toBeInTheDocument();
        expect(screen.getByText(/900/)).toBeInTheDocument();
      });
    });

    it('shows XP label', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getAllByText('XP')).toBeTruthy();
      });
    });

    it('shows medals for top 3', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('🥇')).toBeInTheDocument();
        expect(screen.getByText('🥈')).toBeInTheDocument();
        expect(screen.getByText('🥉')).toBeInTheDocument();
      });
    });
  });

  describe('Top Three Podium', () => {
    it('displays podium section', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Check for crown emoji (for first place)
        expect(screen.getByText('👑')).toBeInTheDocument();
      });
    });

    it('shows usernames on podium', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
      });
    });
  });

  describe('Time Filter Tabs', () => {
    it('displays All, Weekly, Daily filter tabs', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Weekly/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Daily/i })).toBeInTheDocument();
      });
    });

    it('All tab is selected by default', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        const allTab = screen.getByRole('button', { name: /All/i });
        expect(allTab).toHaveClass('bg-white');
      });
    });

    it('can switch between filter tabs', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        const weeklyTab = screen.getByRole('button', { name: /Weekly/i });
        fireEvent.click(weeklyTab);
      });

      await waitFor(() => {
        const weeklyTab = screen.getByRole('button', { name: /Weekly/i });
        expect(weeklyTab).toHaveClass('bg-white');
      });
    });

    it('tabs have proper capitalization', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Weekly')).toBeInTheDocument();
        expect(screen.getByText('Daily')).toBeInTheDocument();
      });
    });
  });

  describe('User Actions', () => {
    it('has a refresh button', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        const refreshButton = screen.getByLabelText(/refresh leaderboard/i);
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('has CTA link to courses', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Start a lesson/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has aria-label on refresh button', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByLabelText(/refresh leaderboard/i)).toBeInTheDocument();
      });
    });

    it('has proper heading hierarchy', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
        expect(h1).toHaveTextContent(/Leaderboard/i);
      });
    });

    it('filter tabs are accessible buttons', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue(mockLeaderboardEntries);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        const tabs = screen.getAllByRole('button');
        expect(tabs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty leaderboard gracefully', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/No rankings yet/i)).toBeInTheDocument();
      });
    });

    it('handles single entry', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([
        { user_id: 'user-1', username: 'Solo', points: 100, rank: 1 },
      ]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Solo')).toBeInTheDocument();
        expect(screen.getByText('🏆')).toBeInTheDocument();
      });
    });

    it('handles two entries', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([
        { user_id: 'user-1', username: 'First', points: 200, rank: 1 },
        { user_id: 'user-2', username: 'Second', points: 100, rank: 2 },
      ]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
      });
    });

    it('formats large point numbers with commas', async () => {
      vi.mocked(GamificationService.getLeaderboard).mockResolvedValue([
        { user_id: 'user-1', username: 'Rich', points: 1000000, rank: 1 },
      ]);

      render(<Leaderboard />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
      });
    });
  });
});
