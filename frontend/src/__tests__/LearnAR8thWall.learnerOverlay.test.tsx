import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockQRScannerProps = {
  onDetected: (qrId: string) => void | Promise<void>;
};

let latestQRScannerProps: MockQRScannerProps | null = null;
const authState = vi.hoisted(() => ({
  user: {
    id: 'learner-001',
    email: 'learner@example.test',
    username: 'learner',
    role: 'learner',
    roles: ['learner'],
    is_superuser: false,
  } as Record<string, unknown> | null,
  isAuthenticated: true,
}));
const telegramState = vi.hoisted(() => ({
  syncTelegram: vi.fn(),
  syncStatus: 'idle',
  iframeLogs: [],
}));
const audioState = vi.hoisted(() => ({
  playPronunciation: vi.fn(),
}));

vi.mock('@/features/ar/components/QRScanner', () => ({
  QRScanner: (props: MockQRScannerProps) => {
    latestQRScannerProps = props;
    return <div data-testid="qr-scanner" />;
  },
}));

vi.mock('@/hooks/useTelegramSync', () => ({
  useTelegramSync: () => telegramState,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/services/AudioService', () => ({
  AudioService: audioState,
  default: audioState,
}));

import { LearnAR8thWall } from '@/pages/LearnAR8thWall';

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installARFetchMock() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const targets = [
      {
        qr_id: 'cat001',
        word: 'cat',
        audio_url: 'https://assets.example.test/audio/cat.mp3',
        xr_target_json_url: 'https://assets.example.test/xr-targets/cat001.json',
        xr_target_image_url: 'https://assets.example.test/xr-targets/cat001.png',
        model_3d_url: 'https://assets.example.test/ragdollcat_mobile_v1.glb',
      },
      {
        qr_id: 'fish001',
        word: 'fish',
        audio_url: 'https://assets.example.test/audio/fish.mp3',
        xr_target_json_url: 'https://assets.example.test/xr-targets/fish001.json',
        xr_target_image_url: 'https://assets.example.test/xr-targets/fish001.png',
        model_3d_url: 'https://assets.example.test/fish_mobile_v1.glb',
      },
    ];

    if (url.includes('/api/v1/flashcard/xr-targets/deck/')) {
      return jsonResponse({ targets });
    }

    if (url.includes('/api/v1/flashcard/cat001/xr-urls')) {
      return jsonResponse({
        word: 'cat',
        audio_url: 'https://assets.example.test/audio/cat.mp3',
        tracking_target: {
          xr_target_json_url: targets[0].xr_target_json_url,
          xr_target_image_url: targets[0].xr_target_image_url,
        },
        target: {
          model_3d_url: targets[0].model_3d_url,
        },
      });
    }

    if (url.includes('/api/v1/combos/rules')) {
      return jsonResponse({ rules: [] });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }));
}

function renderPage(initialEntry = '/learn-ar-xr/claymorphic-animals-001') {
  window.history.replaceState({}, '', initialEntry);
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/learn-ar-xr/:deckId" element={<LearnAR8thWall />} />
      </Routes>
    </MemoryRouter>,
  );
}

function getQRScannerProps(): MockQRScannerProps {
  if (!latestQRScannerProps) throw new Error('QRScanner was not rendered');
  return latestQRScannerProps;
}

function dispatchViewerMessage(
  type: string,
  payload: Record<string, unknown>,
  source: MessageEventSource | null,
) {
  const event = new MessageEvent('message', { data: { type, payload } });
  Object.defineProperty(event, 'source', { configurable: true, value: source });
  window.dispatchEvent(event);
}

async function startViewing(initialEntry = '/learn-ar-xr/claymorphic-animals-001') {
  renderPage(initialEntry);

  await act(async () => {
    await getQRScannerProps().onDetected('cat001');
  });

  const iframe = screen.getByTitle('AR Viewer') as HTMLIFrameElement;
  const viewerSource = window as unknown as MessageEventSource;
  Object.defineProperty(iframe, 'contentWindow', { configurable: true, value: viewerSource });

  await act(async () => {
    dispatchViewerMessage('XR_CAMERA_HAS_VIDEO', {}, viewerSource);
  });

  return viewerSource;
}

async function emitStableFound(
  source: MessageEventSource | null,
  targetName: string,
  word = 'untrusted-word',
) {
  await act(async () => {
    dispatchViewerMessage('AR_LEARNER_TARGET_STABLE_FOUND', {
      targetName,
      word,
      acquiredAt: 100,
    }, source);
  });
}

describe('LearnAR8thWall learner overlay orchestration', () => {
  beforeEach(() => {
    latestQRScannerProps = null;
    authState.user = {
      id: 'learner-001',
      email: 'learner@example.test',
      username: 'learner',
      role: 'learner',
      roles: ['learner'],
      is_superuser: false,
    };
    authState.isAuthenticated = true;
    telegramState.syncTelegram.mockReset();
    telegramState.syncStatus = 'idle';
    telegramState.iframeLogs = [];
    audioState.playPronunciation.mockReset();
    installARFetchMock();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('accepts learner events only from the current iframe and ignores raw or debug event types', async () => {
    const viewerSource = await startViewing();

    await act(async () => {
      dispatchViewerMessage('TARGET_FOUND', { qrId: 'cat001' }, viewerSource);
      dispatchViewerMessage('TARGET_LOST', { qrId: 'cat001' }, viewerSource);
      dispatchViewerMessage('AR_DEBUG', { label: 'TARGET_FOUND' }, viewerSource);
      dispatchViewerMessage('AR_LEARNER_TARGET_STABLE_FOUND', {
        targetName: 'cat001',
        word: 'cat',
        acquiredAt: 100,
      }, null);
      dispatchViewerMessage('AR_LEARNER_TARGET_STABLE_FOUND', {
        targetName: 42,
        acquiredAt: 100,
      }, viewerSource);
    });

    expect(screen.getByTestId('learner-ar-overlay')).toBeInTheDocument();
    expect(screen.getByText('0 active cards')).toBeInTheDocument();
    expect(screen.queryByText('Cat')).not.toBeInTheDocument();

    await emitStableFound(viewerSource, 'cat001');

    expect(screen.getByTestId('learner-ar-overlay')).toBeInTheDocument();
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.queryByText('untrusted-word')).not.toBeInTheDocument();
  });

  it('resolves catalogue metadata generically, keeps simultaneous targets, and removes only the confirmed loss', async () => {
    const viewerSource = await startViewing();

    await emitStableFound(viewerSource, 'cat001');
    await emitStableFound(viewerSource, 'fish001');
    fireEvent.click(screen.getByRole('button', { name: 'Show all active cards' }));

    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('Fish')).toBeInTheDocument();
    expect(screen.getByText('2 active cards')).toBeInTheDocument();

    await act(async () => {
      dispatchViewerMessage('AR_LEARNER_TARGET_STABLE_LOST', {
        targetName: 'cat001',
        lostAt: 900,
      }, viewerSource);
    });

    expect(screen.queryByText('Cat')).not.toBeInTheDocument();
    expect(screen.getByText('Fish')).toBeInTheDocument();
    expect(screen.getByText('1 active card')).toBeInTheDocument();
  });

  it('delegates speaker playback to AudioService without autoplay', async () => {
    const viewerSource = await startViewing();

    await emitStableFound(viewerSource, 'cat001');

    expect(audioState.playPronunciation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hear Cat' }));
    expect(audioState.playPronunciation).toHaveBeenCalledWith(
      'cat',
      'en',
      'https://assets.example.test/audio/cat.mp3',
    );
  });

  it('keeps operator controls gated for an unauthorized learner even with debug requested', async () => {
    const viewerSource = await startViewing('/learn-ar-xr/claymorphic-animals-001?debug=true');

    await emitStableFound(viewerSource, 'cat001');

    expect(screen.queryByRole('button', { name: /telegram/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Scanned')).not.toBeInTheDocument();
    expect(screen.getByTestId('learner-ar-overlay')).toBeInTheDocument();
  });
});
