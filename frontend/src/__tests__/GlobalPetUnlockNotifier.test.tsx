import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalPetUnlockNotifier } from '../App';
import { eventBus } from '@/runtime/EventBus';

const mocks = vi.hoisted(() => ({
  getPets: vi.fn(),
  unlockPet: vi.fn(),
  setActivePet: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1' } }),
}));

vi.mock('@/features/pets/hooks/usePets', () => ({
  usePets: () => ({
    unlockPet: mocks.unlockPet,
    setActivePet: mocks.setActivePet,
  }),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: mocks.getPets },
}));

vi.mock('@/features/pets/components/PetUnlockModal', () => ({
  PetUnlockModal: ({ pet, isOpen }: { pet: { name: string }; isOpen: boolean }) => (
    isOpen ? <div data-testid="unlock-modal">{pet.name}</div> : null
  ),
}));

const unlockedPet = {
  pet_id: 'cube_fox',
  name: 'Fox',
  name_vi: 'Cáo',
  model_url: '',
  texture_url: null,
  thumbnail_url: null,
  category: 'character',
  pack_source: 'cube',
  rarity: 'rare' as const,
  color: '#ff0000',
  animations: ['idle'],
  unlock_condition: { type: 'xp' as const, value: 500 },
  is_unlocked: false,
  is_active: false,
  can_unlock: true,
};

describe('GlobalPetUnlockNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
    localStorage.clear();
    mocks.getPets.mockResolvedValue({
      pets: [
        {
          ...unlockedPet,
          pet_id: 'cube_bunny',
          name: 'Bunny',
          rarity: 'common',
          unlock_condition: { type: 'free', value: 0 },
        },
        unlockedPet,
        {
          ...unlockedPet,
          pet_id: 'cube_polar',
          name: 'Polar Bear',
          rarity: 'legendary',
          unlock_condition: { type: 'xp', value: 5000 },
          can_unlock: false,
        },
      ],
      stats: { total: 3, unlocked: 0, common: 1, rare: 1, epic: 0, legendary: 1 },
    });
    mocks.unlockPet.mockImplementation(async (petId: string) => {
      if (petId !== unlockedPet.pet_id) {
        return { success: false, message: 'Unexpected pet' };
      }
      const confirmedPet = { ...unlockedPet, is_unlocked: true, can_unlock: false };
      eventBus.emit('PET_UNLOCKED', { pet: confirmedPet });
      return { success: true, message: 'Unlocked', pet: confirmedPet };
    });
  });

  afterEach(() => {
    eventBus.clear();
  });

  it('reconciles only server-eligible XP pets on login and celebrates after confirmation', async () => {
    render(<GlobalPetUnlockNotifier />);

    await waitFor(() => {
      expect(mocks.unlockPet).toHaveBeenCalledTimes(1);
      expect(mocks.unlockPet).toHaveBeenCalledWith('cube_fox');
    });

    expect(mocks.getPets).toHaveBeenCalledWith('/api/v1/pets');
    expect(await screen.findByTestId('unlock-modal')).toHaveTextContent('Fox');
    expect(mocks.unlockPet).not.toHaveBeenCalledWith('cube_bunny');
    expect(mocks.unlockPet).not.toHaveBeenCalledWith('cube_polar');
  });
});
