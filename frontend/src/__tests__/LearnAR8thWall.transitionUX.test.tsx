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
const telegramState = vi.hoisted(() => ({
  syncTelegram: vi.fn(),
  syncStatus: 'idle',
  iframeLogs: [],
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

import {
  canUseAROperatorControls,
  isARDebugRequested,
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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
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
    telegramState.syncTelegram.mockReset();
    telegramState.syncStatus = 'idle';
    telegramState.iframeLogs = [];
    installARFetchMock();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows Lexi waving with the approved PREPARING copy while target metadata is unresolved', async () => {
    const entryTarget = createDeferred<Response>();
    const sessionCatalogue = createDeferred<Response>();

    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/flashcard/cat001/xr-urls')) {
        return entryTarget.promise;
      }
      if (url.includes('/api/v1/flashcard/xr-targets/deck/')) {
        return sessionCatalogue.promise;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    renderPage();

    await act(async () => {
      void getQRScannerProps().onDetected('cat001');
    });

    expect(await screen.findByTestId('ar-transition-overlay')).toHaveClass(
      'ar-transition-overlay',
      'is-visible',
    );
    expect(screen.getByText('✨ Đã tìm thấy thẻ!')).toBeInTheDocument();
    expect(screen.getByText('Lexi đang chuẩn bị thế giới AR cho bé...')).toBeInTheDocument();
    expect(screen.getByTestId('ar-transition-lexi')).toHaveAttribute(
      'src',
      '/assets/pets/lexi/ar-transition/lexi-waving.png',
    );
    expect(screen.queryByTestId('ar-transition-clay-orb')).not.toBeInTheDocument();
    expect(screen.getByTestId('ar-transition-status-card')).toBeInTheDocument();
    expect(screen.getByTestId('ar-transition-dots')).toBeInTheDocument();
    expect(screen.queryByTitle('AR Viewer')).not.toBeInTheDocument();
  });

  it('shows Lexi waiting above its mounted iframe during XR_BOOTING without rendering a scanner snapshot', async () => {
    await startPreparing();

    expect(screen.getByTestId('ar-transition-overlay')).toHaveClass(
      'ar-transition-overlay',
      'is-visible',
    );
    expect(screen.queryByTestId('ar-transition-frame')).not.toBeInTheDocument();
    expect(screen.getByText('Đang mở thế giới AR...')).toBeInTheDocument();
    expect(screen.getByText('Chỉ mất một chút thôi')).toBeInTheDocument();
    expect(screen.getByTestId('ar-transition-lexi')).toHaveAttribute(
      'src',
      '/assets/pets/lexi/ar-transition/lexi-waiting.png',
    );
    expect(screen.queryByTestId('ar-transition-clay-orb')).not.toBeInTheDocument();
    expect(screen.getByTestId('ar-transition-status-card')).toBeInTheDocument();
    expect(screen.getByTestId('ar-transition-dots')).toBeInTheDocument();
    expect(screen.getByTitle('AR Viewer')).toHaveAttribute('src', expect.stringContaining('qr_id=cat001'));
  });

  it('keeps every decorative transition layer out of the accessibility tree', async () => {
    await startPreparing();

    const overlay = screen.getByTestId('ar-transition-overlay');
    for (const className of [
      'ar-transition-backdrop',
      'ar-transition-ambient',
      'ar-transition-visual',
    ]) {
      expect(overlay.querySelector(`.${className}`)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('uses a page-level visual cover contract so operator chrome cannot compete during boot', async () => {
    await startPreparing();

    expect(document.querySelector('.ar-xr-page')).toHaveClass('ar-xr-page--transitioning');

    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/LearnAR8thWall.css'),
      'utf8',
    );
    expect(css).toMatch(/\.ar-xr-page--transitioning\s+\.ar-xr-header[\s\S]*visibility:\s*hidden/);
    expect(css).toMatch(/\.ar-xr-page--transitioning\s+\.telegram-sync-btn[\s\S]*opacity:\s*0/);
    expect(css).toMatch(/\.ar-xr-page--transitioning\s+\.found-cards-overlay/);
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
    expect(screen.getByTestId('learner-ar-overlay')).toHaveAttribute('data-mode', 'compact');
    expect(screen.getByText('Hold a card in the camera view.')).toBeInTheDocument();
  });

  it('keeps the overlay visible for iframe, model, target, camera, and XR started events before camera video', async () => {
    await startPreparing();

    const viewer = screen.getByTitle('AR Viewer');
    fireEvent.load(viewer);
    act(() => {
      postViewerMessage('MODEL_LOAD_COMPLETE', { targetName: 'neutralTarget' });
      postViewerMessage('IMAGE_FOUND', { targetName: 'neutralTarget' });
      postViewerMessage('XR_STARTED');
      postViewerMessage('XR_CAMERA_STATUS', { status: 'hasStream' });
    });

    expect(screen.getByTestId('ar-transition-overlay')).toHaveAttribute('data-visible', 'true');
    expect(screen.queryByText('Đưa thẻ vào khung để khám phá ✨')).not.toBeInTheDocument();
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

  it('keeps XR loading presentation until the dual boot gate reveals AR', () => {
    const viewerSource = readFileSync(
      resolve(process.cwd(), 'public/ar-xr.html'),
      'utf8',
    );
    const showOverlayStart = viewerSource.indexOf('function showOverlay(');
    const showOverlayEnd = viewerSource.indexOf('// ========== CAT TAP / MEOW', showOverlayStart);
    const showOverlayBlock = viewerSource.slice(showOverlayStart, showOverlayEnd);
    const hasVideoStart = viewerSource.indexOf("if (status === 'hasVideo') {");
    const hasVideoEnd = viewerSource.indexOf("if (status === 'failed')", hasVideoStart);
    const hasVideoBlock = viewerSource.slice(hasVideoStart, hasVideoEnd);
    const bootGateStart = viewerSource.indexOf('function maybeRevealAR(');
    const bootGateEnd = viewerSource.indexOf('// Update overlay text based on boot state', bootGateStart);
    const bootGateBlock = viewerSource.slice(bootGateStart, bootGateEnd);

    expect(showOverlayBlock).not.toContain('if (bootState.cameraReady) return;');
    expect(showOverlayBlock).toContain("overlay.classList.remove('hidden');");
    expect(viewerSource).toContain('updateOverlayForBoot(null);');
    expect(viewerSource).toContain('function showError(msg)');
    expect(hasVideoBlock).toContain('bootState.cameraReady = true;');
    expect(hasVideoBlock).toContain("sendMessage('XR_CAMERA_HAS_VIDEO', {");
    expect(hasVideoBlock).toContain("maybeRevealAR({ trigger: 'cameraReady' });");
    expect(hasVideoBlock).not.toContain('hideOverlay()');
    expect(bootGateBlock).toContain('shouldRevealAR({');
    expect(bootGateBlock).toContain('cameraReady: bootState.cameraReady,');
    expect(bootGateBlock).toContain('primaryReady: bootState.primaryReady,');
    expect(bootGateBlock).toMatch(/hideOverlay\(\);[\s\S]*setPhase\('viewing'\)/);
  });

  it('keeps only child-facing navigation while hiding AR operator controls from a learner', async () => {
    renderPage('/learn-ar-xr/claymorphic-animals-001?debug=true');

    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Khám phá AR' })).toBeInTheDocument();
    expect(screen.queryByText('MindAR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send scanning ar logs to telegram/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase:/)).not.toBeInTheDocument();
    expect(screen.queryByText('8th Wall XR')).not.toBeInTheDocument();
    expect(screen.queryByText(/cards? scanned/i)).not.toBeInTheDocument();

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

  it('keeps an authorized admin on the normal URL in the learner experience', async () => {
    authState.user = {
      id: 'admin-001',
      email: 'admin@example.test',
      username: 'admin',
      role: 'admin',
      roles: ['admin'],
      is_superuser: false,
    };

    renderPage('/learn-ar-xr/claymorphic-animals-001');

    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Khám phá AR' })).toBeInTheDocument();
    expect(screen.queryByText('MindAR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send scanning ar logs to telegram/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase:/)).not.toBeInTheDocument();
    expect(screen.queryByText('8th Wall XR')).not.toBeInTheDocument();
    expect(screen.queryByText(/cards? scanned/i)).not.toBeInTheDocument();

    await act(async () => {
      await getQRScannerProps().onDetected('cat001');
    });

    expect(screen.getByTestId('ar-transition-lexi')).toBeInTheDocument();
    expect(screen.queryByText('Scanned')).not.toBeInTheDocument();
    const viewerUrl = new URL(
      screen.getByTitle('AR Viewer').getAttribute('src') || '',
      window.location.origin,
    );
    expect(viewerUrl.searchParams.get('debug')).toBeNull();

    act(() => {
      postViewerMessage('XR_CAMERA_HAS_VIDEO');
    });
    expect(screen.getByTestId('learner-ar-overlay')).toHaveAttribute('data-mode', 'compact');
    expect(screen.getByText('Hold a card in the camera view.')).toBeInTheDocument();
  });

  it('keeps capture mode learner-clean even when an authorized admin requests debug', async () => {
    authState.user = {
      id: 'admin-001',
      email: 'admin@example.test',
      username: 'admin',
      role: 'admin',
      roles: ['admin'],
      is_superuser: false,
    };

    renderPage('/learn-ar-xr/claymorphic-animals-001?capture=true&debug=true');

    expect(screen.getByRole('button', { name: /quay/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AR/i })).toBeInTheDocument();
    expect(screen.queryByText('MindAR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send scanning ar logs to telegram/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Phase:/)).not.toBeInTheDocument();

    await act(async () => {
      await getQRScannerProps().onDetected('cat001');
    });

    expect(screen.queryByText('Scanned')).not.toBeInTheDocument();
    expect(screen.queryByText('1 card scanned')).not.toBeInTheDocument();
    expect(screen.queryByTestId('learner-ar-overlay')).not.toBeInTheDocument();

    const viewerUrl = new URL(
      screen.getByTitle('AR Viewer').getAttribute('src') || '',
      window.location.origin,
    );
    expect(viewerUrl.searchParams.get('debug')).toBeNull();
  });

  it('keeps AR operator controls available to an authorized admin only when debug is requested', async () => {
    authState.user = {
      id: 'admin-001',
      email: 'admin@example.test',
      username: 'admin',
      role: 'admin',
      roles: ['admin'],
      is_superuser: false,
    };

    renderPage('/learn-ar-xr/claymorphic-animals-001?debug=true');

    expect(document.querySelector('.ar-xr-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '8th Wall XR' })).toBeInTheDocument();
    expect(screen.getByText('MindAR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send scanning ar logs to telegram/i })).toBeInTheDocument();
    expect(screen.getByText(/Phase:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /send scanning ar logs to telegram/i }));
    expect(telegramState.syncTelegram).toHaveBeenCalledTimes(1);

    await act(async () => {
      await getQRScannerProps().onDetected('cat001');
    });

    expect(screen.getByText('Scanned')).toBeInTheDocument();
    expect(screen.getByText('1 card scanned')).toBeInTheDocument();

    const adminViewerUrl = new URL(
      screen.getByTitle('AR Viewer').getAttribute('src') || '',
      window.location.origin,
    );
    expect(adminViewerUrl.searchParams.get('debug')).toBe('true');
  });

  it('uses the warm Lexi story-stage contract instead of the rejected lavender mesh', async () => {
    await startPreparing();

    expect(screen.getByTestId('ar-transition-overlay')).toHaveClass(
      'ar-transition-overlay--lexi',
      'ar-transition-overlay--story',
    );
    expect(screen.getByTestId('ar-transition-lexi')).toBeInTheDocument();

    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/LearnAR8thWall.tsx'),
      'utf8',
    );
    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/LearnAR8thWall.css'),
      'utf8',
    );

    expect(source).not.toContain('ar-transition-mesh');
    expect(source).not.toContain('ar-transition-blob');
    expect(css).toContain('.ar-transition-overlay--story');
    expect(css).not.toContain('linear-gradient(148deg, #3f47a7');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ar-transition-lexi/);
  });

  it('matches the backend elevated-role contract for AR operator controls', () => {
    expect(canUseAROperatorControls(null, false)).toBe(false);
    expect(canUseAROperatorControls({ role: 'learner', roles: ['learner'] }, true)).toBe(false);
    expect(canUseAROperatorControls({ role: 'teacher' }, true)).toBe(true);
    expect(canUseAROperatorControls({ role: 'learner', roles: ['admin'] }, true)).toBe(true);
    expect(canUseAROperatorControls({ role: 'learner', is_superuser: true }, true)).toBe(true);
  });

  it('recognizes only an explicit true debug query as an AR debug request', () => {
    expect(isARDebugRequested('')).toBe(false);
    expect(isARDebugRequested('?debug=false')).toBe(false);
    expect(isARDebugRequested('?debug=true')).toBe(true);
  });
});
