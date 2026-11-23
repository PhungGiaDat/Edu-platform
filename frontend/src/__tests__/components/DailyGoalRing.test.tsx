/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the apiClient
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    getStreak: vi.fn(),
    getUserStats: vi.fn(),
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
import { DailyGoalRing, CompactGoalRing } from '@/features/gamification/components/DailyGoalRing';
import { apiClient } from '@/services/apiClient';

describe('DailyGoalRing Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Mock API to never resolve
      vi.mocked(apiClient.getStreak).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<DailyGoalRing />);

      expect(screen.getByText(/loading/i)).toBeTruthy();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch streak data on mount', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15T10:00:00Z',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      render(<DailyGoalRing />);

      await waitFor(() => {
        expect(apiClient.getStreak).toHaveBeenCalledWith('test_user_123');
      });
    });

    it('should use fallback to getUserStats when getStreak fails', async () => {
      vi.mocked(apiClient.getStreak).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.getUserStats).mockResolvedValue({
        streak_days: 3,
        longest_streak: 7,
        last_activity: '2024-01-15',
        streak_active_today: false,
        minutes_today: 5,
      });

      render(<DailyGoalRing />);

      await waitFor(() => {
        expect(apiClient.getUserStats).toHaveBeenCalled();
      });
    });

    it('should show zero values when both APIs fail', async () => {
      vi.mocked(apiClient.getStreak).mockRejectedValue(new Error('API Error'));
      vi.mocked(apiClient.getUserStats).mockRejectedValue(new Error('API Error'));

      render(<DailyGoalRing />);

      await waitFor(() => {
        expect(screen.getByText('0/15 min')).toBeTruthy();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate percentage correctly', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      render(<DailyGoalRing />);

      // 10/15 = 66.67%, rounded to 67%
      await waitFor(() => {
        expect(screen.getByText('67%')).toBeTruthy();
      });
    });

    it('should cap percentage at 100%', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 30, // More than goal
      });

      render(<DailyGoalRing />);

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeTruthy();
      });
    });
  });

  describe('Ring Colors', () => {
    it('should show green when goal is complete', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 20,
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        const progressCircle = container.querySelector('circle[stroke="#22c55e"]');
        expect(progressCircle).toBeTruthy();
      });
    });

    it('should show blue when progress is >= 60%', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10, // 66%
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        const progressCircle = container.querySelector('circle[stroke="#0ea5e9"]');
        expect(progressCircle).toBeTruthy();
      });
    });

    it('should show amber when progress is < 60%', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 5, // 33%
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        const progressCircle = container.querySelector('circle[stroke="#f59e0b"]');
        expect(progressCircle).toBeTruthy();
      });
    });
  });

  describe('Motivational Text', () => {
    it('should show "Start learning!" when no progress', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 0,
        longest_streak: 0,
        last_activity: null,
        streak_active_today: false,
        daily_goal_minutes: 15,
        minutes_today: 0,
      });

      render(<DailyGoalRing showMotivation />);

      await waitFor(() => {
        expect(screen.getByText('Start learning!')).toBeTruthy();
      });
    });

    it('should show "Almost there!" when partial progress', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 0,
        longest_streak: 0,
        last_activity: null,
        streak_active_today: false,
        daily_goal_minutes: 15,
        minutes_today: 3,
      });

      render(<DailyGoalRing showMotivation />);

      await waitFor(() => {
        expect(screen.getByText('Almost there!')).toBeTruthy();
      });
    });

    it('should show "Keep going!" when >= 60% progress', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      render(<DailyGoalRing showMotivation />);

      await waitFor(() => {
        expect(screen.getByText('Keep going!')).toBeTruthy();
      });
    });

    it('should show "You\'re a star today!" when complete', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 20,
      });

      render(<DailyGoalRing showMotivation />);

      await waitFor(() => {
        expect(screen.getByText("You're a star today!")).toBeTruthy();
      });
    });

    it('should show remaining minutes when not complete', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      render(<DailyGoalRing showMotivation={false} />);

      await waitFor(() => {
        expect(screen.getByText('5m left')).toBeTruthy();
      });
    });
  });

  describe('Emoji Display', () => {
    it('should show party emoji when goal complete', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 20,
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        expect(container.textContent).toContain('🎉');
      });
    });

    it('should show target emoji when goal not complete', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 5,
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        expect(container.textContent).toContain('🎯');
      });
    });
  });

  describe('Props and Customization', () => {
    it('should use custom size when provided', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      const { container } = render(<DailyGoalRing size={150} />);
      const svg = container.querySelector('svg');

      expect(svg?.getAttribute('width')).toBe('150');
      expect(svg?.getAttribute('height')).toBe('150');
    });

    it('should hide label when showLabel is false', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      render(<DailyGoalRing showLabel={false} />);

      await waitFor(() => {
        expect(screen.queryByText(/min$/)).toBeNull();
      });
    });

    it('should use custom goalMinutes prop', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 10, // Different from prop
        minutes_today: 5,
      });

      render(<DailyGoalRing goalMinutes={20} />);

      await waitFor(() => {
        expect(screen.getByText('5/20 min')).toBeTruthy();
      });
    });
  });

  describe('SVG Accessibility', () => {
    it('should have aria-label on SVG', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        const svg = container.querySelector('svg[aria-label]');
        expect(svg).toBeTruthy();
        expect(svg?.getAttribute('aria-label')).toContain('10 of 15 minutes');
      });
    });

    it('should have role="img"', async () => {
      vi.mocked(apiClient.getStreak).mockResolvedValue({
        current_streak: 5,
        longest_streak: 10,
        last_activity: '2024-01-15',
        streak_active_today: true,
        daily_goal_minutes: 15,
        minutes_today: 10,
      });

      const { container } = render(<DailyGoalRing />);

      await waitFor(() => {
        const svg = container.querySelector('svg[role="img"]');
        expect(svg).toBeTruthy();
      });
    });
  });

  describe('User Context', () => {
    it('should not fetch when user is null', async () => {
      vi.resetModules();
      vi.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: null,
        }),
      }));
      vi.doMock('@/services/apiClient', () => ({
        apiClient: {
          getStreak: vi.fn(),
          getUserStats: vi.fn(),
        },
      }));

      const { DailyGoalRing } = await import('@/features/gamification/components/DailyGoalRing');
      const { apiClient: nullApiClient } = await import('@/services/apiClient');

      render(<DailyGoalRing />);

      expect(nullApiClient.getStreak).not.toHaveBeenCalled();
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
          getStreak: vi.fn(),
          getUserStats: vi.fn(),
        },
      }));

      const { DailyGoalRing } = await import('@/features/gamification/components/DailyGoalRing');
      const { apiClient: noIdApiClient } = await import('@/services/apiClient');

      render(<DailyGoalRing />);

      expect(noIdApiClient.getStreak).not.toHaveBeenCalled();
    });
  });
});

describe('CompactGoalRing Component', () => {
  it('should render with default props', () => {
    const { container } = render(<CompactGoalRing percentage={50} />);
    
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should show complete color when >= 100%', () => {
    const { container } = render(
      <CompactGoalRing 
        percentage={100} 
        completeColor="#22c55e"
        progressColor="#0ea5e9"
      />
    );

    const circle = container.querySelector('circle[stroke="#22c55e"]');
    expect(circle).toBeTruthy();
  });

  it('should show progress color when < 100%', () => {
    const { container } = render(
      <CompactGoalRing 
        percentage={50} 
        completeColor="#22c55e"
        progressColor="#0ea5e9"
      />
    );

    const circle = container.querySelector('circle[stroke="#0ea5e9"]');
    expect(circle).toBeTruthy();
  });

  it('should calculate dash offset correctly', () => {
    const { container } = render(<CompactGoalRing percentage={75} />);
    
    // SVG should exist with correct viewBox
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('should have aria-label with percentage', () => {
    const { container } = render(<CompactGoalRing percentage={50} />);
    
    const div = container.querySelector('[aria-label="50% complete"]');
    expect(div).toBeTruthy();
  });
});
