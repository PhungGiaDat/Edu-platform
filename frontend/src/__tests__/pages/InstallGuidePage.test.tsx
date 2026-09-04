/**
 * InstallGuidePage — "Vườn Giờ Vàng" PWA install guide (/install)
 *
 * The page reads platform/standalone state through three module-level
 * helpers, so the whole test file pivots on mocking `usePWAInstall` and
 * `services/notifications`. matchMedia is already stubbed in setup.ts.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  install: {
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    deferredPrompt: null,
    install: vi.fn(),
    dismiss: vi.fn(),
  },
  isIOS: vi.fn(() => false),
  getIOSVersion: vi.fn(() => null as number | null),
  isStandalonePwa: vi.fn(() => false),
}));

vi.mock('../../hooks/usePWAInstall', () => ({
  usePWAInstall: () => mocks.install,
  isIOS: () => mocks.isIOS(),
  getIOSVersion: () => mocks.getIOSVersion(),
}));

vi.mock('../../services/notifications', () => ({
  isStandalonePwa: () => mocks.isStandalonePwa(),
  notificationsSupported: vi.fn(() => false),
  notificationPermission: vi.fn(() => 'unsupported'),
}));

import { InstallGuidePage } from '../../pages/InstallGuidePage';

const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

const setNavigatorUserAgent = (ua: string) => {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/install']}>
      <InstallGuidePage />
    </MemoryRouter>,
  );

describe('InstallGuidePage', () => {
  beforeEach(() => {
    mocks.install.canInstall = false;
    mocks.install.isInstalled = false;
    mocks.install.isStandalone = false;
    mocks.install.install.mockClear();
    mocks.isIOS.mockReturnValue(false);
    mocks.getIOSVersion.mockReturnValue(null);
    mocks.isStandalonePwa.mockReturnValue(false);
    setNavigatorUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    ); // neutral desktop UA
  });

  it('renders the heading and the Lexi banner', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cài EduAR lên');
    expect(screen.getByText('Màn hình chính')).toBeInTheDocument();
    // Banner SVG scene + mascot sprite both expose accessible img labels.
    expect(screen.getByRole('img', { name: /Lexi vẫy tay trong vườn giờ vàng/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lexi chào bạn' })).toBeInTheDocument();
  });

  it('shows the 3 iOS steps and the verify CTA when not standalone on iOS', () => {
    mocks.isIOS.mockReturnValue(true);
    setNavigatorUserAgent(IPHONE_SAFARI_UA);
    mocks.isStandalonePwa.mockReturnValue(false);
    renderPage();

    expect(screen.getByText('Mở EduAR bằng Safari')).toBeInTheDocument();
    expect(screen.getByText('Chọn "Thêm vào Màn hình chính"')).toBeInTheDocument();
    expect(screen.getByText('Nhấn "Thêm" — xong rồi!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tôi đã cài rồi — Kiểm tra/ })).toBeInTheDocument();
    // Android one-tap install CTA must NOT be on screen while the iOS tab is active.
    expect(screen.queryByText(/Cài đặt EduAR — một chạm/)).not.toBeInTheDocument();
  });

  it('shows the success state with the Giờ vàng CTA when already installed (standalone)', () => {
    mocks.isStandalonePwa.mockReturnValue(true);
    renderPage();

    expect(screen.getByText('Bạn đã cài thành công!')).toBeInTheDocument();
    expect(screen.getByText('Lexi đang chờ con trong app đó 🌱')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bật Giờ vàng ngay/ })).toBeInTheDocument();
    // Steps are replaced entirely in State B.
    expect(screen.queryByText('Mở EduAR bằng Safari')).not.toBeInTheDocument();
  });
});
