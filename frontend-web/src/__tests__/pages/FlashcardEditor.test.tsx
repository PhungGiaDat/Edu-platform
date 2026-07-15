/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const apiMocks = vi.hoisted(() => ({
  createFlashcard: vi.fn(),
  getFlashcardsInDeck: vi.fn(),
  updateFlashcard: vi.fn(),
  createDeck: vi.fn(),
  getDeck: vi.fn(),
  updateDeck: vi.fn(),
}));

vi.mock('../../services/adminApi', () => ({
  adminDecksApi: {
    createDeck: apiMocks.createDeck,
    getDeck: apiMocks.getDeck,
    updateDeck: apiMocks.updateDeck,
  },
  adminFlashcardsApi: {
    createFlashcard: apiMocks.createFlashcard,
    getFlashcardsInDeck: apiMocks.getFlashcardsInDeck,
    updateFlashcard: apiMocks.updateFlashcard,
  },
}));

vi.mock('../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/Flashcard', () => ({
  default: ({ word, qrData }: { word: string; qrData: string }) => (
    <div data-testid="flashcard-preview">{word}:{qrData}</div>
  ),
}));

vi.mock('../../components/Icons', () => ({
  ChevronLeftIcon: () => <span aria-hidden="true" />,
}));

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: () => <canvas />,
}));

import { CardNewPage } from '../../pages/admin/FlashcardEditor';

const renderCardEditor = () => render(
  <MemoryRouter initialEntries={['/admin/flashcards/deck-123/new']}>
    <Routes>
      <Route path="/admin/flashcards/:deckId/new" element={<CardNewPage />} />
      <Route path="/admin/flashcards/:deckId" element={<div>Deck detail</div>} />
    </Routes>
  </MemoryRouter>,
);

describe('FlashcardEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.createFlashcard.mockResolvedValue({});
  });

  it('creates a flashcard with QR ID, localized text, and uploaded image data', async () => {
    renderCardEditor();

    fireEvent.change(screen.getByLabelText('QR ID'), { target: { value: 'apple_001' } });
    fireEvent.change(screen.getByLabelText('Front Text'), { target: { value: 'Apple' } });
    fireEvent.change(screen.getByLabelText('Back Text'), { target: { value: 'Quả táo' } });

    const image = new File(['image-content'], 'apple.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Flashcard Image'), { target: { files: [image] } });

    await waitFor(() => expect(screen.getByTestId('flashcard-preview')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Save Flashcard' }));

    await waitFor(() => {
      expect(apiMocks.createFlashcard).toHaveBeenCalledWith(
        'deck-123',
        expect.objectContaining({
          qr_id: 'apple_001',
          word: 'Apple',
          translation: { en: 'Apple', vi: 'Quả táo' },
          image_url: expect.stringMatching(/^data:image\/png;base64,/),
        }),
      );
    });
  });

  it('rejects unsupported image formats inline', async () => {
    renderCardEditor();

    const image = new File(['image-content'], 'apple.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByLabelText('Flashcard Image'), { target: { files: [image] } });

    expect(await screen.findByText('Use a PNG, JPG, or WebP image.')).toBeTruthy();
    expect(screen.queryByTestId('flashcard-preview')).toBeNull();
  });
});
