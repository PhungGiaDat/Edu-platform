// frontend/src/__tests__/pages/gamesPageCatalog.test.tsx
/**
 * GamesPage dynamic catalog tests (2026-09-09 activation, spec §3.3):
 * - API success → topics/games render from catalog (only playable game_types)
 * - API failure → hardcoded fallback (Play area must never blank)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { GamesPage } from '../../pages/GamesPage';
import * as vocabService from '../../services/gamesVocabService';

vi.mock('../../services/gamesVocabService', async () => {
  const actual = await vi.importActual<typeof vocabService>('../../services/gamesVocabService');
  return {
    ...actual,
    fetchGameCatalog: vi.fn(),
    topicBackgroundUrl: () => null,
  };
});

vi.mock('@/features/pets/components', () => ({
  CodexPetSprite: () => <div data-testid="lexi" />,
}));

const renderPage = () =>
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={['/games']}>
        <GamesPage />
      </MemoryRouter>
    </LocaleProvider>,
  );

describe('GamesPage dynamic catalog', () => {
  beforeEach(() => {
    vi.mocked(vocabService.fetchGameCatalog).mockReset();
    localStorage.clear();
  });
  afterEach(() => cleanup());

  it('renders hardcoded fallback topics when the catalog API fails', async () => {
    vi.mocked(vocabService.fetchGameCatalog).mockRejectedValue(new Error('network down'));
    renderPage();
    await waitFor(() => {
      // Seed topics are always present (fallback path)
      expect(screen.getAllByText('Animals').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nature').length).toBeGreaterThan(0);
    expect(screen.getAllByText('School & Food').length).toBeGreaterThan(0);
  });

  it('renders catalog topics when the API succeeds', async () => {
    vi.mocked(vocabService.fetchGameCatalog).mockResolvedValue({
      topics: [
        { id: 't1', slug: 'animals', name: 'Animals', name_vi: 'Động vật' },
        { id: 't2', slug: 'space', name: 'Space', name_vi: 'Không gian' },
      ],
      games: [],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Space').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Animals').length).toBeGreaterThan(0);
  });

  it('shows only playable catalog games inside a topic (catch_word has no standalone page)', async () => {
    vi.mocked(vocabService.fetchGameCatalog).mockResolvedValue({
      topics: [{ id: 't1', slug: 'animals', name: 'Animals', name_vi: 'Động vật' }],
      games: [
        { id: 'g1', slug: 'g1', title: 'Bắt chữ rơi — Động vật', title_vi: '', game_type: 'catch_word', topic_id: 't1', config: {} },
        { id: 'g2', slug: 'g2', title: 'Ghép cặp của thầy Nam', title_vi: '', game_type: 'drag_match', topic_id: 't1', config: {} },
      ],
    });
    renderPage();
    await waitFor(() => screen.getAllByText('Animals').length > 0);
    // enter topic
    (screen.getAllByText('Animals')[0].closest('button') as HTMLButtonElement).click();
    await waitFor(() => {
      expect(screen.getByText('Ghép cặp của thầy Nam')).toBeTruthy();
    });
    expect(screen.queryByText('Bắt chữ rơi — Động vật')).toBeNull();
  });
});
