import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PetsPage from '../features/pets/pages/PetsPage';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getUserStats: vi.fn(),
  setActivePet: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'learner-1' },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock('@/features/pets/hooks/usePets', () => ({
  usePets: () => ({
    pets: [],
    activePet: null,
    setActivePet: mocks.setActivePet,
    isLoading: false,
  }),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: mocks.get,
    getUserStats: mocks.getUserStats,
    post: vi.fn(),
  },
}));

describe('PetsPage gamification stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({});
    mocks.getUserStats.mockResolvedValue({
      total_points: 2030,
      streak_days: 7,
    });
  });

  it('renders the authenticated learner total XP and streak instead of demo values', async () => {
    render(<PetsPage />);

    await waitFor(() => {
      expect(screen.getByText('2030')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    expect(mocks.getUserStats).toHaveBeenCalledWith('learner-1');
    expect(screen.queryByText('1250')).not.toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });
});
