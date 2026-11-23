import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PetsPage from '../features/pets/pages/PetsPage';
import type { Pet } from '../features/pets/hooks/usePets';

const pet = (id: string, name: string, over: Partial<Pet>): Pet => ({
  pet_id: id, name, name_vi: name, model_url: '', texture_url: null, thumbnail_url: null,
  category: 'animal', pack_source: 'cube', rarity: 'common', color: '#fff', animations: [],
  unlock_condition: { type: 'free', value: 0 }, is_unlocked: false, is_active: false, can_unlock: false,
  ...over,
});

const dog = pet('cube_dog', 'Dog', { is_unlocked: true });
const cat = pet('cube_cat', 'Cat', { can_unlock: true });
const beaver = pet('cube_beaver', 'Beaver', { unlock_condition: { type: 'xp', value: 1500 } });

const mocks = vi.hoisted(() => ({ unlockPet: vi.fn(), setActivePet: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1' }, isLoading: false, isAuthenticated: true }),
}));

vi.mock('@/features/pets/hooks/usePets', () => ({
  usePets: () => ({
    pets: [dog, cat, beaver],
    activePet: null,
    setActivePet: mocks.setActivePet,
    unlockPet: mocks.unlockPet,
    isLoading: false,
  }),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn().mockResolvedValue({}), getUserStats: vi.fn().mockResolvedValue({}), post: vi.fn() },
}));

describe('PetsPage claimable pets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Claim Pet only for locked pets that can unlock', () => {
    render(<PetsPage />);
    expect(screen.getAllByRole('button', { name: 'Claim Pet' })).toHaveLength(1);
    expect(screen.getByText('1500 XP')).toBeInTheDocument();
  });

  it('claims once, disables while pending, then selects the returned pet', async () => {
    let resolve!: (v: unknown) => void;
    mocks.unlockPet.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<PetsPage />);
    expect(screen.getAllByRole('heading', { name: 'Cat' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Claim Pet' }));
    const pending = screen.getByRole('button', { name: 'Claiming...' });
    expect(pending).toBeDisabled();
    fireEvent.click(pending);
    expect(mocks.unlockPet).toHaveBeenCalledTimes(1);
    expect(mocks.unlockPet).toHaveBeenCalledWith('cube_cat');
    expect(mocks.setActivePet).not.toHaveBeenCalled();

    await act(async () => resolve({ success: true, message: 'ok', pet: { ...cat, is_unlocked: true } }));
    // Card heading + the detail panel heading now both show the claimed pet.
    expect(screen.getAllByRole('heading', { name: 'Cat' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Claim Pet' })).toBeEnabled();
  });

  it('keeps activation on click for unlocked pets', () => {
    render(<PetsPage />);
    fireEvent.click(screen.getAllByRole('heading', { name: 'Dog' })[0]);
    expect(mocks.setActivePet).toHaveBeenCalledWith('cube_dog');
  });
});
