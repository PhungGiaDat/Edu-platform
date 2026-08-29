/**
 * DictionaryPage — Tra từ (word lookup) primary mode
 *
 * Note on AuthContext: the module exports the context object as its DEFAULT
 * export (`export default AuthContext`) and only `useAuth`/`AuthProvider` as
 * named exports, so the provider is imported as a default here.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DictionaryPage } from '../../pages/DictionaryPage';
import { dictionaryApi } from '../../services/dictionaryApi';
import { notebookApi } from '../../services/notebookApi';
import AuthContext from '../../contexts/AuthContext';

vi.mock('../../services/dictionaryApi');
vi.mock('../../services/notebookApi');

const mockAuth = { user: { id: 'u1', username: 'Lan' }, isGuest: false } as never;
const renderPage = () => render(
  <AuthContext.Provider value={mockAuth}><DictionaryPage /></AuthContext.Provider>
);

const lookupResult = {
  word: 'elephant', pronunciation: '/ˈel.ə.fənt/', part_of_speech: 'noun',
  definition_en: 'A very large grey animal with a long trunk.',
  translation_vi: 'con voi', example_sentence: 'The elephant drinks water.',
  wiki_summary: 'Elephants are the largest land animals.', sources: ['qdrant', 'wikipedia'],
};

describe('DictionaryPage — word lookup (primary mode)', () => {
  // NOTE: the body must stay a block — `() => spy.mockReset()` returns the spy,
  // and Vitest treats a function returned from a hook as a cleanup callback
  // (which would invoke lookup() a second time at teardown).
  beforeEach(() => {
    vi.mocked(dictionaryApi.lookup).mockReset();
  });

  it('renders the Tra từ tab as selected by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Tra từ/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Dịch câu/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the rich definition card after lookup', async () => {
    vi.mocked(dictionaryApi.lookup).mockResolvedValue(lookupResult);
    renderPage();
    await userEvent.type(screen.getByLabelText(/Từ cần tra/i), 'elephant');
    await userEvent.click(screen.getByRole('button', { name: /Tra từ/i }));
    expect(await screen.findByText('con voi')).toBeInTheDocument();
    expect(screen.getByText('/ˈel.ə.fənt/')).toBeInTheDocument();
    expect(screen.getByText(/Wikipedia/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu vào Sổ tay/i })).toBeInTheDocument();
  });

  it('saves the full rich payload to the notebook', async () => {
    vi.mocked(dictionaryApi.lookup).mockResolvedValue(lookupResult);
    vi.mocked(notebookApi.create).mockResolvedValue({} as never);
    renderPage();
    await userEvent.type(screen.getByLabelText(/Từ cần tra/i), 'elephant');
    await userEvent.click(screen.getByRole('button', { name: /Tra từ/i }));
    await screen.findByText('con voi');
    await userEvent.click(screen.getByRole('button', { name: /Lưu vào Sổ tay/i }));
    await waitFor(() => expect(notebookApi.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(notebookApi.create).mock.calls[0][0]).toEqual(expect.objectContaining({
      word: 'elephant', pronunciation: '/ˈel.ə.fənt/', part_of_speech: 'noun',
      definition_en: 'A very large grey animal with a long trunk.',
      wiki_summary: 'Elephants are the largest land animals.', source: 'word_lookup',
    }));
  });

  it('shows the kid-friendly message when the word is blocked (422)', async () => {
    vi.mocked(dictionaryApi.lookup).mockRejectedValue({ status: 422 });
    renderPage();
    await userEvent.type(screen.getByLabelText(/Từ cần tra/i), 'badword');
    await userEvent.click(screen.getByRole('button', { name: /Tra từ/i }));
    expect(await screen.findByText(/không phù hợp/i)).toBeInTheDocument();
    // The page hosts Lexi in both the header and the blocked panel, so this is
    // an existence check across the mascot instances rather than a unique one.
    expect(screen.getAllByRole('img', { name: /Lexi/ }).length).toBeGreaterThan(0);
  });
});

describe('DictionaryPage — sentence mode', () => {
  beforeEach(() => {
    vi.mocked(dictionaryApi.translate).mockReset();
    vi.mocked(dictionaryApi.lookup).mockReset();
  });

  it('translates a sentence and renders clickable word chips', async () => {
    vi.mocked(dictionaryApi.translate).mockResolvedValue({
      original: 'The elephant drinks water',
      translation: { vi: 'Con voi uống nước' },
      word_breakdown: [
        { word: 'elephant', translation: 'voi' },
        { word: 'drinks', translation: 'uống' },
      ],
    } as never);
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Dịch câu/i }));
    await userEvent.type(screen.getByLabelText(/Câu tiếng Anh/i), 'The elephant drinks water');
    await userEvent.click(screen.getByRole('button', { name: /Dịch ngay/i }));
    expect(await screen.findByText('Con voi uống nước')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tra từ: elephant' })).toBeInTheDocument();
  });

  it('switches to word mode and looks up the clicked chip word', async () => {
    vi.mocked(dictionaryApi.translate).mockResolvedValue({
      original: 'The elephant drinks water', translation: { vi: 'Con voi uống nước' },
      word_breakdown: [{ word: 'elephant', translation: 'voi' }],
    } as never);
    vi.mocked(dictionaryApi.lookup).mockResolvedValue(lookupResult);
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Dịch câu/i }));
    await userEvent.type(screen.getByLabelText(/Câu tiếng Anh/i), 'The elephant drinks water');
    await userEvent.click(screen.getByRole('button', { name: /Dịch ngay/i }));
    await screen.findByRole('button', { name: 'Tra từ: elephant' });
    await userEvent.click(screen.getByRole('button', { name: 'Tra từ: elephant' }));
    await waitFor(() => expect(dictionaryApi.lookup).toHaveBeenCalledWith('elephant'));
    expect(await screen.findByText('con voi')).toBeInTheDocument();
  });
});
