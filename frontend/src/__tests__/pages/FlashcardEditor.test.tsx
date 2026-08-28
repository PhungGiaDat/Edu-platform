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
  uploadFlashcardImage: vi.fn(),
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
    uploadFlashcardImage: apiMocks.uploadFlashcardImage,
  },
}));

vi.mock('@/features/admin/components/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/components/icons/Icons', () => ({
  ChevronLeftIcon: () => <span aria-hidden="true" />,
}));

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: () => <canvas />,
}));

// Create a mock store state that can be updated
const mockStoreState = {
  elements: [],
  showQR: false,
  frontText: '',
  backText: '',
  setQrId: vi.fn(),
  setFrontText: vi.fn(),
  setBackText: vi.fn(),
  setShowQR: vi.fn(),
  isExporting: false,
  setIsExporting: vi.fn(),
  saveToHistory: vi.fn(),
};

vi.mock('../../stores/flashcard-editor.store', () => ({
  __esModule: true,
  default: () => mockStoreState,
}));

// Mock konva and stage
vi.mock('konva', () => ({
  default: {
    Stage: vi.fn().mockImplementation(() => ({
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
    })),
  },
}));

// Mock canvas export utility
vi.mock('../../utils/flashcard-export', () => ({
  exportDualImages: vi.fn().mockResolvedValue({
    imageWithQr: 'data:image/png;base64,test1',
    imageWithoutQr: 'data:image/png;base64,test2',
  }),
  base64ToPlain: vi.fn().mockReturnValue('test-base64-data'),
}));

// Mock sub-components
vi.mock('@/features/admin/components/flashcard-editor/FlashcardCanvas', () => ({
  default: vi.fn(() => <div data-testid="flashcard-canvas">Canvas</div>),
}));

vi.mock('@/features/admin/components/flashcard-editor/EditorToolbar', () => ({
  default: vi.fn(() => <div data-testid="editor-toolbar">Toolbar</div>),
}));

vi.mock('@/features/admin/components/flashcard-editor/PropertiesPanel', () => ({
  default: vi.fn(() => <div data-testid="properties-panel">Properties</div>),
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
    // Reset mock store state
    mockStoreState.frontText = '';
    mockStoreState.backText = '';
    mockStoreState.setFrontText.mockImplementation((val) => { mockStoreState.frontText = val; });
    mockStoreState.setBackText.mockImplementation((val) => { mockStoreState.backText = val; });

    apiMocks.uploadFlashcardImage.mockResolvedValue({
      image_url: 'https://example.com/image.png',
    });
    apiMocks.createFlashcard.mockResolvedValue({});
  });

  it('renders the flashcard editor form with all required fields', async () => {
    renderCardEditor();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create flashcard/i })).toBeTruthy();
    });

    // Check all form fields exist
    expect(screen.getByRole('textbox', { name: /qr id/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /ar tag/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /front text/i })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /back text/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /save flashcard/i })).toBeTruthy();
  });

  it('calls createFlashcard API when form is submitted', async () => {
    renderCardEditor();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save flashcard/i })).toBeTruthy();
    });

    // Fill in the form fields
    const qrIdInput = screen.getByRole('textbox', { name: /qr id/i });
    fireEvent.change(qrIdInput, { target: { value: 'apple_001' } });

    // Submit the form
    const saveButton = screen.getByRole('button', { name: /save flashcard/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiMocks.uploadFlashcardImage).toHaveBeenCalled();
      expect(apiMocks.createFlashcard).toHaveBeenCalledWith(
        'deck-123',
        expect.objectContaining({
          qr_id: 'apple_001',
        }),
      );
    });
  });

  it('shows QR code toggle option in the properties panel', async () => {
    renderCardEditor();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create flashcard/i })).toBeTruthy();
    });

    // Check for the QR toggle section (use more specific selector)
    expect(screen.getByText(/include in exported image/i)).toBeTruthy();
  });
});
