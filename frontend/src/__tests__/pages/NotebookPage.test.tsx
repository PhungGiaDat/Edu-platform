/**
 * NotebookPage — entry detail dialog (spec 2026-08-30, Task 11)
 *
 * Note on AuthContext: the module exports the context object as its DEFAULT
 * export (`export default AuthContext`), so the provider is imported as a
 * default here.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotebookPage } from '../../pages/NotebookPage';
import { notebookApi } from '../../services/notebookApi';
import AuthContext from '../../contexts/AuthContext';

vi.mock('../../services/notebookApi');

// fetchTopics goes through apiClient (honours VITE_API_BASE + auth header);
// mock it so the page loads offline-deterministically without global fetch.
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

// jsdom has no WebGL — mock the decorative 3D band so tests stay deterministic.
vi.mock('@/shared/components/clay/ClayFloat3D', () => ({
  default: () => <div data-testid="clay-float-3d" />,
}));

const mockAuth = { user: { id: 'u1' }, isGuest: false } as never;
const entry = {
  id: 'e1', user_id: 'u1', word: 'elephant', translation_vi: 'con voi',
  pronunciation: '/ˈel.ə.fənt/', part_of_speech: 'noun',
  definition_en: 'A very large grey animal.', wiki_summary: 'Largest land animal.',
  source: 'word_lookup', review_count: 2, ease_factor: 2.5, interval_days: 3,
  created_at: '2026-08-01T00:00:00Z',
} as never;

const renderPage = (withProbe = false) => render(
  <MemoryRouter initialEntries={['/notebook']}>
    <Routes>
      <Route path='/notebook' element={<AuthContext.Provider value={mockAuth}><NotebookPage /></AuthContext.Provider>} />
      {withProbe && <Route path='/flashcards' element={<div>flashcards-probe</div>} />}
    </Routes>
  </MemoryRouter>
);

describe('NotebookPage — practice navigation', () => {
  const practiceEntry = {
    id: 'p1', user_id: 'u1', word: 'sunflower', translation_vi: 'hoa huong duong',
    source: 'word_lookup', review_count: 0, ease_factor: 2.5, interval_days: 0,
    created_at: '2026-08-30T00:00:00Z',
  } as never;

  beforeEach(() => {
    vi.mocked(notebookApi.list).mockResolvedValue({
      items: [practiceEntry], total: 1, page: 1, per_page: 50, total_pages: 1,
    });
    vi.mocked(notebookApi.getDueCards).mockResolvedValue({ items: [], count: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('navigates to /flashcards from the due-cards banner button', async () => {
    renderPage(true);
    await screen.findByText('sunflower');
    fireEvent.click(screen.getByRole('button', { name: /Luy/i }));
    expect(screen.getByText('flashcards-probe')).toBeInTheDocument();
  });
});
describe('NotebookPage — entry detail', () => {
  beforeEach(() => {
    // Topics come via the mocked apiClient (see top of file).
    vi.mocked(notebookApi.list).mockResolvedValue({
      items: [entry], total: 1, page: 1, per_page: 50, total_pages: 1,
    });
    vi.mocked(notebookApi.getDueCards).mockResolvedValue({ items: [], count: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the detail dialog from a card click and shows rich fields', async () => {
    renderPage();
    await screen.findByText('elephant');
    await userEvent.click(screen.getByText('elephant'));

    const dialog = await screen.findByRole('dialog', { name: /elephant/i });
    expect(dialog).toBeInTheDocument();
    // Scoped to the dialog: the summary card behind it also renders the translation.
    expect(within(dialog).getByText('/ˈel.ə.fənt/')).toBeInTheDocument();
    expect(within(dialog).getByText(/Largest land animal\./)).toBeInTheDocument();
    expect(within(dialog).getByText('con voi')).toBeInTheDocument();
    expect(within(dialog).getByText('noun')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    renderPage();
    await screen.findByText('elephant');
    await userEvent.click(screen.getByText('elephant'));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    renderPage();
    await screen.findByText('elephant');
    await userEvent.click(screen.getByText('elephant'));
    const dialog = await screen.findByRole('dialog');
    // The overlay is the dialog's direct parent; clicking it (not the panel) closes.
    await userEvent.click(dialog.parentElement ?? dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
