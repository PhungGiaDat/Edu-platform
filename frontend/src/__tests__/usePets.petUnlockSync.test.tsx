import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePets } from '@/features/pets/hooks/usePets';
import { eventBus } from '@/runtime/EventBus';

const get = vi.hoisted(() => vi.fn());

vi.mock('@/services/apiClient', () => ({
  apiClient: { get },
}));

const petList = {
  pets: [],
  stats: { total: 0, unlocked: 0, common: 0, rare: 0, epic: 0, legendary: 0 },
};

describe('usePets server-unlock synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
    get.mockResolvedValue(petList);
  });

  afterEach(() => {
    eventBus.clear();
  });

  it('refreshes each mounted inventory when another hook confirms a pet unlock', async () => {
    renderHook(() => usePets('learner-1'));

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(1);
    });

    act(() => {
      eventBus.emit('PET_UNLOCKED', { pet: { pet_id: 'cube_fox' } });
    });

    await waitFor(() => {
      expect(get).toHaveBeenCalledTimes(2);
    });

    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/pets');
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/pets');
  });
});
