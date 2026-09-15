import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

vi.mock('@/features/ar/components/QRScanner', () => ({
  QRScanner: (props: MockQRScannerProps) => {
    latestQRScannerProps = props;
    return <div data-testid="qr-scanner" />;
  },
}));

vi.mock('@/hooks/useTelegramSync', () => ({
  useTelegramSync: () => ({
    syncTelegram: vi.fn(),
    syncStatus: 'idle',
    iframeLogs: [],
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import {
  canUseAROperatorControls,
  LearnAR8thWall,
} from '@/pages/LearnAR8thWall';

function getQRScannerProps(): MockQRScannerProps {
  if (!latestQRScannerProps) {
    throw new Error('QRScanner was not rendered');
  }
  return latestQRScannerProps;
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installARFetchMock() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/v1/combos/rules')) {
      return jsonResponse({ rules: [] });
    }

    if (url.includes('/api/v1/flashcard/ar-preload/deck/')) {
      return jsonResponse({
        primary: {
          qr_id: 'cat001',
          model_3d_url: 'https://assets.example.test/ragdollcat_mobile_v1.glb',
        },
        targets: [
          {
            qr_id: 'cat001',
            word: 'cat',
            xr_target_json_url: 'https://assets.example.test/xr-targets/cat001.json',
            xr_target_image_url: 'https://assets.example.test/xr-targets/cat001.png',
            model_3d_url: 'https://assets.example.test/ragdollcat_mobile_v1.glb',
          },
        ],
      });
    }

    if (url.includes('/api/v1/flashcard/xr-targets/deck/')) {
      return jsonResponse({
        targets: [
          {
            qr_id: 'cat001',
            word: 'cat',
            xr_target_json_url: 'https://assets.example.test/xr-targets/cat001.json',
            xr_target_image_url: 'https://assets.example.test/xr-targets/cat001.png',
            model_3d_url: 'https://assets.example.test/ragdollcat_mobile_v1.glb',
          },
        ],
      });
    }

    if (url.includes('/api/v1/flashcard/cat001/xr-urls')) {
      return jsonResponse({
        word: 'cat',
        tracking_target: {
          xr_target_json_url: 'https://assets.example.test/xr-targets/cat001.json',
          xr_target_image_url: 'https://assets.example.test/xr-targets/cat001.png',
        },
        target: {
          model_3d_url: 'https://assets.example.test/ragdollcat_mobile_v1.glb',
        },
      });
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

function postViewerMessage(type: string, payload: Record<string, unknown> = {}) {
  window.dispatchEvent(new MessageEvent('message', {
    data: { type, payload },
  }));
}

async function startPreparing() {
  renderPage();

  await act(async () => {
    await getQRScannerProps().onDetected('cat001');
  });
}

describe('LearnAR8thWall transition UX', () => {
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
    installARFetchMock();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows an animated XR boot overlay after QR detection without rendering a scanner snapshot', async () => {
    await startPreparing();

    expect(screen.getByTestId('ar-transition-overlay')).toHaveClass(
      'ar-transition-overlay',
      'is-visible',
    );
    expect(screen.queryByTestId('ar-transition-frame')).not.toBeInTheDocument();
    expect(screen.getByText('Đang mở camera AR...')).toBeInTheDocument();
    expect(screen.getByText('Chỉ mất một chút thôi')).toBeInTheDocument();
    expect(screen.getByTitle('AR Viewer')).toHaveAttribute('src', expect.stringContaining('qr_id=cat001'));
  });

  it('keeps the QR-detection overlay presentation-only and out of viewer state', async () => {
    await startPreparing();

    expect(await screen.findByTestId('ar-transition-overlay')).toBeInTheDocument();
    expect(screen.queryByTestId('ar-transition-frame')).not.toBeInTheDocument();
    expect(screen.getByTitle('AR Viewer')).toBeInTheDocument();
  });

  it('dismisses the transition only after XR_CAMERA_HAS_VIDEO', async () => {
    await startPreparing();

    expect(await screen.findByTestId('ar-transition-overlay')).toHaveAttribute('data-visible', 'true');

    act(() => {
      postViewerMessage('XR_ENGINE_READY');
      postViewerMessage('XR_PIPELINE_READY');
    });

    expect(screen.getByTestId('ar-transition-overlay')).toHaveAttribute('data-visible', 'true');

    act(() => {
      postViewerMessage('XR_CAMERA_HAS_VIDEO');
    });

    expect(screen.getByTestId('ar-transition-overlay')).toHaveAttribute('data-visible', 'false');
    expect(screen.getByText('Đưa thẻ vào khung để khám phá AR')).toBeInTheDocument();
  });

  it('does not treat AR_DEBUG XR_CAMERA_HAS_VIDEO telemetry as the parent lifecycle event', async () => {
    await startPreparing();

    expect(await screen.findByTestId('ar-transition-overlay')).toHaveAttribute('data-visible', 'true');

    act(() => {
      postViewerMessage('AR_DEBUG', { label: 'XR_CAMERA_HAS_VIDEO' });
    });

    expect(screen.getByTestId('ar-transition-overlay')).toHaveAttribute('data-visible', 'true');
  });

  it('clears the transition overlay when XR enters the existing error flow', async () => {
    await startPreparing();

    act(() => {
      postViewerMessage('XR_ERROR', { message: 'XR boot failed' });
    });

    expect(screen.getByText('Could not load XR target')).toBeInTheDocument();
    expect(screen.queryByTestId('ar-transition-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scan Again' }));

    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
    expect(screen.queryByTestId('ar-transition-overlay')).not.toBeInTheDocument();
  });

  it('keeps XR_CAMERA_HAS_VIDEO as the VIEWING authority and presentation state outside viewerSrc', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const viewerStart = source.indexOf('const viewerSrc =');
    const viewerEnd = source.indexOf('// Track when viewerSrc is set');
    const viewerBlock = source.slice(viewerStart, viewerEnd);

    expect(source).toMatch(/case 'XR_CAMERA_HAS_VIDEO':[\s\S]*setPhase\('VIEWING'\)/);
    expect(source).toContain("phase === 'XR_BOOTING' || phase === 'VIEWING'");
    expect(source).not.toContain('getUserMedia(');
    expect(source).not.toContain('transitionFrame');
    expect(source).not.toContain('onTransitionFrame');
    expect(source).not.toContain('Loading XR target...');
    expect(source).not.toContain('Preparing AR experience...');
    const iframeLoadStart = source.indexOf('onLoad={() => {');
    const iframeLoadEnd = source.indexOf('onError={() => {', iframeLoadStart);
    expect(source.slice(iframeLoadStart, iframeLoadEnd)).not.toContain('dismissTransition');
    expect(viewerBlock).not.toContain('transitionFrame');
    expect(viewerBlock).not.toContain('transitionVisible');
    expect(viewerBlock).not.toContain('transitionMounted');
  });

  it('removes QR canvas serialization because presentation must not freeze a camera frame', () => {
    const scannerSource = readFileSync(
      resolve(process.cwd(), 'src/features/ar/components/QRScanner.tsx'),
      'utf8',
    );
    const pageSource = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );

    expect(scannerSource).not.toContain('captureTransitionFrame');
    expect(scannerSource).not.toContain('onTransitionFrame');
    expect(pageSource).not.toContain('ar-transition-frame');
  });

  it('requires the iframe to send XR_CAMERA_HAS_VIDEO as a control-plane event', () => {
    const parentSource = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const viewerSource = readFileSync(
      resolve(process.cwd(), 'public/ar-xr.html'),
      'utf8',
    );
    const hasVideoStart = viewerSource.indexOf("if (status === 'hasVideo') {");
    const hasVideoEnd = viewerSource.indexOf("if (status === 'failed')", hasVideoStart);
    const hasVideoBlock = viewerSource.slice(hasVideoStart, hasVideoEnd);

    expect(hasVideoBlock).toContain("sendARDebug('XR_CAMERA_HAS_VIDEO', {});");
    expect(hasVideoBlock).toContain("sendMessage('XR_CAMERA_HAS_VIDEO', {");
    expect(parentSource).toMatch(
      /case 'XR_CAMERA_HAS_VIDEO':[\s\S]*setPhase\('VIEWING'\)[\s\S]*dismissTransition\(\)/,
    );
  });

  it('hides AR operator overlays and controls from a learner even when debug is requested', async () => {
    renderPage('/learn-ar-xr/claymorphic-animals-001?debug=true');

    expect(document.querySelector('.ar-xr-header')).not.toBeInTheDocument();
    expect(screen.queryByText('MindAR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send scanning ar logs to telegram/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase:/)).not.toBeInTheDocument();

    await act(async () => {
      await getQRScannerProps().onDetected('cat001');
    });

    expect(screen.queryByText('Scanned')).not.toBeInTheDocument();
    const learnerViewerUrl = new URL(
      screen.getByTitle('AR Viewer').getAttribute('src') || '',
      window.location.origin,
    );
    expect(learnerViewerUrl.searchParams.get('debug')).toBeNull();
  });

  it('keeps AR operator controls available to teacher and admin roles', async () => {
    authState.user = {
      id: 'teacher-001',
      email: 'teacher@example.test',
      username: 'teacher',
      role: 'teacher',
      roles: ['teacher'],
      is_superuser: false,
    };

    renderPage('/learn-ar-xr/claymorphic-animals-001?debug=true');

    expect(document.querySelector('.ar-xr-header')).toBeInTheDocument();
    expect(screen.getByText('MindAR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send scanning ar logs to telegram/i })).toBeInTheDocument();
    expect(screen.getByText(/Phase:/)).toBeInTheDocument();

    await act(async () => {
      await getQRScannerProps().onDetected('cat001');
    });

    const teacherViewerUrl = new URL(
      screen.getByTitle('AR Viewer').getAttribute('src') || '',
      window.location.origin,
    );
    expect(teacherViewerUrl.searchParams.get('debug')).toBe('true');
  });

  it('matches the backend elevated-role contract for AR operator controls', () => {
    expect(canUseAROperatorControls(null, false)).toBe(false);
    expect(canUseAROperatorControls({ role: 'learner', roles: ['learner'] }, true)).toBe(false);
    expect(canUseAROperatorControls({ role: 'teacher' }, true)).toBe(true);
    expect(canUseAROperatorControls({ role: 'learner', roles: ['admin'] }, true)).toBe(true);
    expect(canUseAROperatorControls({ role: 'learner', is_superuser: true }, true)).toBe(true);
  });
});
