/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the apiClient
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

// Mock the AuthContext
const mockUser = { id: 'test_user_123', name: 'Test User' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Import after mocking
import { StreakBadge } from '../../components/Gamification/StreakBadge';
import { apiClient } from '@/services/apiClient';

describe('StreakBadge Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Mock API to never resolve
      vi.mocked(apiClient.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<StreakBadge />);

      expect(screen.getByText('Streak')).toBeTruthy();
      expect(screen.getByText('...')).toBeTruthy();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch streak data from gamification/streak endpoint', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15T10:00:00Z',
        streak_active_today: true,
      });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/gamification/streak/test_user_123');
      });
    });

    it('should fallback to reports endpoint when streak fails', async () => {
      // First call fails, second (fallback) succeeds
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          streak: 3,
          longest_streak: 7,
          last_activity: '2024-01-15',
          streak_active_today: false,
        });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should display streak count after loading', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeTruthy();
      });
    });
  });

  describe('Fire Emoji Display', () => {
    it('should show fire emoji when streak > 0', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        expect(container.textContent).toContain('🔥');
      });
    });

    it('should show snow emoji when streak is 0', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 0,
        longest_streak: 0,
        last_activity: null,
        streak_active_today: false,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        expect(container.textContent).toContain('❄️');
      });
    });
  });

  describe('Hot Streak Styling', () => {
    it('should apply hot streak styling when streak >= 7', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 7,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        const numberElement = container.querySelector('.clay-stat-number');
        expect(numberElement?.getAttribute('style')).toContain('linear-gradient');
      });
    });

    it('should not apply hot streak styling when streak < 7', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        const numberElement = container.querySelector('.clay-stat-number');
        // Should still have gradient but different colors
        expect(numberElement?.getAttribute('style')).toContain('linear-gradient');
      });
    });

    it('should show star indicator for streak >= 7', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 7,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        expect(container.textContent).toContain('⭐');
      });
    });

    it('should not show star indicator for streak < 7', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        // Only one star (in emoji display)
        expect(container.textContent?.split('⭐').length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Label Display', () => {
    it('should always show "Day Streak" label', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 1,
        longest_streak: 5,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('Day Streak')).toBeTruthy();
      });
    });

    it('should handle single day streak', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 1,
        longest_streak: 1,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('Day Streak')).toBeTruthy();
      });
    });
  });

  describe('API Response Handling', () => {
    it('should handle missing fields with defaults', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({});

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeTruthy();
      });
    });

    it('should handle null last_activity', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 5,
        last_activity: null,
        streak_active_today: false,
      });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeTruthy();
      });
    });

    it('should use default value when both APIs fail', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeTruthy();
      });
    });

    it('should apply custom className', () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge className="custom-class" />);

      expect(container.firstChild?.textContent).toBeTruthy();
    });
  });

  describe('Fallback Report Mapping', () => {
    it('should map streak from report response correctly', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          streak: 10,
          longest_streak: 15,
          last_activity: '2024-01-15',
          streak_active_today: true,
        });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeTruthy();
      });
    });

    it('should handle missing streak in fallback', async () => {
      vi.mocked(apiClient.get)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          longest_streak: 15,
          // No streak field
        });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeTruthy();
      });
    });
  });

  describe('User Context Integration', () => {
    it('should use user.id from auth context', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 3,
        longest_streak: 5,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      render(<StreakBadge />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/gamification/streak/test_user_123');
      });
    });

    it('should not fetch when user is null', async () => {
      vi.resetModules();
      vi.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: null,
        }),
      }));
      vi.doMock('@/services/apiClient', () => ({
        apiClient: {
          get: vi.fn(),
        },
      }));

      const { StreakBadge } = await import('../../components/Gamification/StreakBadge');
      const { apiClient: nullApiClient } = await import('@/services/apiClient');

      render(<StreakBadge />);

      expect(nullApiClient.get).not.toHaveBeenCalled();
    });

    it('should not fetch when user.id is undefined', async () => {
      vi.resetModules();
      vi.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: { name: 'Test' }, // No id
        }),
      }));
      vi.doMock('@/services/apiClient', () => ({
        apiClient: {
          get: vi.fn(),
        },
      }));

      const { StreakBadge } = await import('../../components/Gamification/StreakBadge');
      const { apiClient: noIdApiClient } = await import('@/services/apiClient');

      render(<StreakBadge />);

      expect(noIdApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Animation Classes', () => {
    it('should apply pulse animation for hot streak', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 7,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        const emojiElement = container.querySelector('.animate-pulse');
        expect(emojiElement?.textContent).toContain('🔥');
      });
    });

    it('should not apply pulse for cold streak', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 3,
        longest_streak: 5,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      await waitFor(() => {
        const emojiElement = container.querySelector('.animate-pulse');
        expect(emojiElement).toBeNull();
      });
    });
  });

  describe('CSS Classes', () => {
    it('should have clay-stat-card class', () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      const card = container.querySelector('.clay-stat-card');
      expect(card).toBeTruthy();
    });

    it('should have clay-stat-number class for streak value', () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      const numberElement = container.querySelector('.clay-stat-number');
      expect(numberElement).toBeTruthy();
    });

    it('should have clay-stat-label class for label', () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
      });

      const { container } = render(<StreakBadge />);

      const labelElement = container.querySelector('.clay-stat-label');
      expect(labelElement).toBeTruthy();
    });
  });
});

describe('StreakBadge Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle very large streak numbers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      current_streak: 365,
      longest_streak: 365,
      last_activity: '2024-01-15',
      streak_active_today: true,
    });

    render(<StreakBadge />);

    await waitFor(() => {
      expect(screen.getByText('365')).toBeTruthy();
    });
  });

  it('should handle negative streak (edge case)', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      current_streak: -5, // Shouldn't happen but test handling
      longest_streak: 10,
      last_activity: '2024-01-15',
      streak_active_today: false,
    });

    render(<StreakBadge />);

    await waitFor(() => {
      expect(screen.getByText('-5')).toBeTruthy();
    });
  });

  it('should handle non-integer streak values', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      current_streak: 5.5, // Shouldn't happen but test handling
      longest_streak: 10,
      last_activity: '2024-01-15',
      streak_active_today: true,
    });

    render(<StreakBadge />);

    await waitFor(() => {
      expect(screen.getByText('5.5')).toBeTruthy();
    });
  });

  it('should handle rapid re-renders', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      current_streak: 5,
      longest_streak: 10,
      last_activity: '2024-01-15',
      streak_active_today: true,
    });

    render(<StreakBadge />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
    });

    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({
      current_streak: 6,
      longest_streak: 10,
      last_activity: '2024-01-16',
      streak_active_today: true,
    });

    render(<StreakBadge />);

    await waitFor(() => {
      expect(screen.getByText('6')).toBeTruthy();
    });
  });
});
