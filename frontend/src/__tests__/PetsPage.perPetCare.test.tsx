import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PetsPage from '../features/pets/pages/PetsPage';
import type { Pet } from '../features/pets/hooks/usePets';

const pet = (id: string, name: string, over: Partial<Pet> = {}): Pet => ({
  pet_id: id, name, name_vi: name, model_url: '', texture_url: null, thumbnail_url: null,
  category: 'animal', pack_source: 'cube', rarity: 'common', color: '#fff', animations: [],
  unlock_condition: { type: 'free', value: 0 }, is_unlocked: true, is_active: false, can_unlock: false,
  ...over,
});

const elephant = pet('cube_elephant', 'Elephant', { is_active: true });
const cat = pet('cube_cat', 'Cat');

type Care = { happiness: number; hunger: number; energy: number; mood: string; xp_earned: number; stage: string };
const server = vi.hoisted(() => ({ pets: {} as Record<string, Care>, failFeed: false }));

const mocks = vi.hoisted(() => ({
  get: vi.fn(async (url: string) => {
    const petId = new URL(url, 'http://x').searchParams.get('pet_id')!;
    const care = server.pets[petId];
    if (url.includes('/pet-xp/')) return { xp: care.xp_earned, stage: care.stage, progress: { next_stage: null } };
    return { ...care, last_action: 'idle' };
  }),
  post: vi.fn(async (url: string, body: { pet_id: string }) => {
    if (server.failFeed) throw new Error('500');
    const care = server.pets[body.pet_id];
    if (url.endsWith('/feed')) {
      Object.assign(care, { hunger: care.hunger - 35, happiness: care.happiness + 10, energy: care.energy + 5, xp_earned: care.xp_earned + 5 });
    }
    return { ...care, success: true, pet_xp: care.xp_earned, evolved: false };
  }),
  setActivePet: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'learner-1' }, isLoading: false, isAuthenticated: true }),
}));

vi.mock('@/features/pets/hooks/usePets', () => ({
  usePets: () => ({ pets: [elephant, cat], activePet: elephant, setActivePet: mocks.setActivePet, unlockPet: vi.fn(), isLoading: false }),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: mocks.get, post: mocks.post, getUserStats: vi.fn().mockResolvedValue({}) },
}));

const bar = (label: string) => screen.getByText(label).parentElement!.textContent;
const panelFeed = () => screen.getAllByRole('button', { name: /Feed/ }).at(-1)!;
const selectCard = (name: string) => fireEvent.click(screen.getAllByRole('heading', { name })[0]);

describe('PetsPage per-pet care state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.failFeed = false;
    server.pets = {
      cube_elephant: { happiness: 40, hunger: 80, energy: 60, mood: 'content', xp_earned: 20, stage: 'baby' },
      cube_cat: { happiness: 70, hunger: 30, energy: 50, mood: 'content', xp_earned: 5, stage: 'baby' },
    };
  });

  it('loads only the displayed pet, feeds only it, and restores each pet on switch', async () => {
    render(<PetsPage />);
    await waitFor(() => expect(bar('Hunger')).toBe('Hunger80/100'));
    expect(mocks.get).not.toHaveBeenCalledWith(expect.stringContaining('pet_id=cube_cat'));

    await act(async () => { fireEvent.click(panelFeed()); });
    await waitFor(() => expect(bar('Hunger')).toBe('Hunger45/100'));
    expect(bar('Happiness')).toBe('Happiness50/100');
    expect(screen.getByText('25 XP')).toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledWith('/api/v1/gamification/pet/feed', expect.objectContaining({ pet_id: 'cube_elephant' }));

    selectCard('Cat');
    await waitFor(() => expect(bar('Hunger')).toBe('Hunger30/100'));
    expect(bar('Happiness')).toBe('Happiness70/100');
    expect(screen.getByText('5 XP')).toBeInTheDocument();

    selectCard('Elephant');
    await waitFor(() => expect(bar('Hunger')).toBe('Hunger45/100'));
    expect(screen.getByText('25 XP')).toBeInTheDocument();
  });

  it('drops the optimistic bump and shows the server state when feeding fails', async () => {
    server.failFeed = true;
    render(<PetsPage />);
    await waitFor(() => expect(bar('Hunger')).toBe('Hunger80/100'));

    await act(async () => { fireEvent.click(panelFeed()); });

    await waitFor(() => expect(bar('Hunger')).toBe('Hunger80/100'));
    expect(bar('Happiness')).toBe('Happiness40/100');
  });
});
