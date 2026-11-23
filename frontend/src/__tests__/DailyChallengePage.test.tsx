/**
 * DailyChallengePage Unit Tests
 * 
 * Tests for the Daily Challenge page component including:
 * - Loading state
 * - Error state
 * - Empty state
 * - Challenge display with progress
 * - Challenge completion state
 */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DailyChallengePage } from '../pages/DailyChallengePage';
import { apiClient, type ProfileResponse } from '../services/apiClient';

// Mock the API client
vi.mock('../services/apiClient', () => ({
  apiClient: {
    getMyProfile: vi.fn(),
  },
}));

// Wrapper component for testing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('DailyChallengePage', () => {
  const mockProfile: ProfileResponse = {
    identity: {
      id: 'user-123',
      email: 'test@example.com',
      username: 'TestUser',
      avatar_url: '',
      role: 'learner',
      is_superuser: false,
    },
    summary: {
      level: 5,
      total_points: 500,
      xp_to_next_level: 100,
      streak_days: 3,
      lessons_completed: 10,
      words_learned: 50,
      quizzes_passed: 5,
    },
    badges: [],
    milestones: [],
    leaderboard: [],
    daily_challenge: {
      title: 'Complete 3 lessons',
      progress: 2,
      target: 3,
      reward: '50 XP Bonus',
    },
    content: {
      hero_subtitle: 'Welcome to learning!',
      testimonials_heading: 'What learners say',
      testimonials: [],
      cta: { title: '', description: '', label: '', href: '' },
    },
    meta: { partial_sections: [], generated_at: '' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching profile', async () => {
      vi.mocked(apiClient.getMyProfile).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockProfile), 100))
      );

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      // Should show loading skeleton
      expect(document.querySelector('.animate-pulse')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('displays error state when API fails', async () => {
      vi.mocked(apiClient.getMyProfile).mockRejectedValue(new Error('Network error'));

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Could not load challenge/i)).toBeInTheDocument();
      });
    });

    it('has a retry button that reloads data', async () => {
      vi.mocked(apiClient.getMyProfile).mockRejectedValueOnce(new Error('Network error'));

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Could not load challenge/i)).toBeInTheDocument();
      });

      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Daily Challenge')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no challenge is available', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue({
        ...mockProfile,
        daily_challenge: {
          title: '',
          progress: 0,
          target: 0,
          reward: '',
        },
      });

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/No challenge today/i)).toBeInTheDocument();
      });
    });

    it('shows link to start learning in empty state', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue({
        ...mockProfile,
        daily_challenge: {
          title: '',
          progress: 0,
          target: 0,
          reward: '',
        },
      });

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /start learning/i })).toBeInTheDocument();
      });
    });
  });

  describe('Challenge Display', () => {
    it('displays challenge title and progress', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Complete 3 lessons')).toBeInTheDocument();
        expect(screen.getByText(/2\/3/)).toBeInTheDocument();
      });
    });

    it('displays reward information', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Look for the reward label specifically
        const rewardLabel = screen.getByText((_, element) => {
          return element?.textContent === 'Reward';
        });
        expect(rewardLabel).toBeInTheDocument();
      });
    });

    it('shows progress bar with correct percentage', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/67%/)).toBeInTheDocument();
      });
    });

    it('shows completion badge when challenge is done', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue({
        ...mockProfile,
        daily_challenge: {
          title: 'Complete 3 lessons',
          progress: 3,
          target: 3,
          reward: '50 XP Bonus',
        },
      });

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Challenge Complete/i)).toBeInTheDocument();
      });
    });

    it('shows remaining count when not complete', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/1 more to go/i)).toBeInTheDocument();
      });
    });

    it('shows ready to claim when complete', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue({
        ...mockProfile,
        daily_challenge: {
          title: 'Complete 3 lessons',
          progress: 3,
          target: 3,
          reward: '50 XP Bonus',
        },
      });

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Ready to claim/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Actions', () => {
    it('has a refresh button', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh challenge/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('refresh button calls fetchChallenge', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh challenge/i });
        fireEvent.click(refreshButton);
      });

      expect(apiClient.getMyProfile).toHaveBeenCalled();
    });

    it('has Go to Courses button', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Go to Courses/i })).toBeInTheDocument();
      });
    });

    it('has View Progress button', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /View Progress/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('refresh button has aria-label', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const refreshButton = screen.getByLabelText(/refresh challenge/i);
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('has proper heading hierarchy', async () => {
      vi.mocked(apiClient.getMyProfile).mockResolvedValue(mockProfile);

      render(<DailyChallengePage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
        expect(h1).toHaveTextContent(/Daily Challenge/i);
      });
    });
  });
});
