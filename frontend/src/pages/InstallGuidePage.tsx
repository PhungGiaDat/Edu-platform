/**
 * InstallGuidePage — "Vườn Giờ Vàng" PWA install guide (public route /install)
 *
 * Design source of truth: docs/design/install-guide-mockup.html (Phương án A).
 * Mobile-first standalone page (no Layout wrapper, no auth). Vietnamese copy.
 *
 * States:
 * - A (browser): banner + platform segmented control + iOS 3-step guide /
 *   Android one-tap `beforeinstallprompt` install + notification preview.
 * - B (installed / standalone): mint success card + CTA → /notifications.
 * - C (iOS < 16.4): coral warning card — Web Push unavailable.
 *
 * Icons: Material Symbols Rounded via Google Fonts CDN (see index.html +
 * `.msr` in styles/global.css) — zero new npm dependencies.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodexPetSprite } from '../features/pets/components';
import { usePWAInstall, isIOS, getIOSVersion } from '../hooks/usePWAInstall';
import { isStandalonePwa } from '../services/notifications';
import { colors, shadows, withOpacity } from '../design-tokens/claymorphic';

const SITE_URL = 'https://learnvocab.pages.dev';
const DISPLAY_FONT = "'Nunito', 'DM Sans', sans-serif";
const BODY_FONT = "'DM Sans', 'Nunito', sans-serif";
const BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

type Platform = 'ios' | 'android';
type View = 'guide' | 'installed';

// ─── Small primitives ─────────────────────────────────────────

/** Material Symbols Rounded glyph (decorative — hidden from a11y tree). */
const Msr: React.FC<{
  icon: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ icon, size = 22, color, style }) => (
  <span aria-hidden="true" className="msr" style={{ fontSize: size, color, ...style }}>
    {icon}
  </span>
);

/** Clay step card: icon tile + bold title + gray subtitle (mockup .step-card). */
const StepCard: React.FC<{
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
}> = ({ icon, iconColor, iconBg, title, subtitle }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 18,
      backgroundColor: colors.warmWhite,
      boxShadow: shadows.claySm,
    }}
  >
    <div
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        borderRadius: 16,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        backgroundColor: iconBg,
      }}
    >
      <Msr icon={icon} size={22} color={iconColor} />
    </div>
    <div>
      <b style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 15, color: colors.deepSlate, display: 'block' }}>
        {title}
      </b>
      <span style={{ fontSize: 13, color: colors.mediumGray }}>{subtitle}</span>
    </div>
  </div>
);

/** Full-width claymorphic CTA (mockup .clay-btn). Touch target ≥ 48px. */
const ClayButton: React.FC<{
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  gradient: string;
  boxShadow: string;
}> = ({ icon, children, onClick, disabled, gradient, boxShadow }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      fontFamily: DISPLAY_FONT,
      fontWeight: 900,
      fontSize: 16,
      color: colors.deepSlate,
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 24,
      padding: '16px 22px',
      minHeight: 54,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      background: gradient,
      boxShadow: disabled ? 'none' : boxShadow,
      opacity: disabled ? 0.65 : 1,
      transition: `transform 0.18s ${BOUNCE}, box-shadow 0.18s ${BOUNCE}`,
    }}
  >
    <Msr icon={icon} size={20} />
    {children}
  </button>
);

// ─── Banner (inline clay SVG scene + Lexi sprite) ─────────────

const InstallBanner: React.FC = () => (
  <div
    style={{
      position: 'relative',
      maxWidth: 448,
      margin: '0 auto',
      borderRadius: '0 0 32px 32px',
      overflow: 'hidden',
    }}
  >
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="Lexi vẫy tay trong vườn giờ vàng, cạnh điện thoại hiện nút chia sẻ"
      style={{ display: 'block', width: '100%', height: 'auto' }}
    >
      <defs>
        <linearGradient id="install-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD93D" />
          <stop offset="55%" stopColor="#FFB84D" />
          <stop offset="100%" stopColor="#FF9F9F" />
        </linearGradient>
        <radialGradient id="install-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3A3" />
          <stop offset="70%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#FFE066" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#install-sky)" />
      <circle cx="322" cy="64" r="78" fill="url(#install-sun)" />
      <ellipse cx="76" cy="50" rx="44" ry="15" fill="#fff" opacity=".5" />
      <ellipse cx="118" cy="64" rx="28" ry="11" fill="#fff" opacity=".5" />
      <circle cx="52" cy="150" r="7" fill="#fff" opacity=".7" />
      <circle cx="366" cy="164" r="5" fill="#fff" opacity=".6" />
      <ellipse cx="320" cy="288" rx="195" ry="50" fill="#A9D98B" />
      <ellipse cx="80" cy="298" rx="165" ry="46" fill="#B4E197" />
      {/* floating clay phone with share glyph */}
      <g transform="translate(252,128) rotate(8)">
        <rect width="62" height="104" rx="16" fill="#1A2744" />
        <rect x="6" y="6" width="50" height="92" rx="11" fill="#6EB9FF" opacity=".92" />
        <circle cx="31" cy="44" r="15" fill="#FFFBF0" />
        <rect x="24" y="41" width="14" height="12" rx="4" fill="none" stroke="#1A2744" strokeWidth="2.6" />
        <path
          d="M31 31 V43 M26.5 35.5 L31 31 L35.5 35.5"
          stroke="#1A2744"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="14" y="68" width="34" height="9" rx="4.5" fill="#FFFBF0" opacity=".85" />
      </g>
    </svg>
    <div style={{ position: 'absolute', left: '14%', bottom: 4, pointerEvents: 'none' }}>
      <CodexPetSprite animationState="waving" label="Lexi chào bạn" size={150} />
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────

export function InstallGuidePage() {
  const navigate = useNavigate();
  const { canInstall, isInstalled, install } = usePWAInstall();

  const [view, setView] = useState<View>(() => (isStandalonePwa() ? 'installed' : 'guide'));
  const [platform, setPlatform] = useState<Platform>(() => (isIOS() ? 'ios' : 'android'));
  const [hint, setHint] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const iosDevice = isIOS();
  const androidDevice = /Android/i.test(navigator.userAgent);
  const mobileDevice = iosDevice || androidDevice;

  /**
   * STATE C — iOS < 16.4. getIOSVersion() only returns the major, so the
   * minor is parsed from the UA to make the 16.4 threshold exact.
   */
  const iosBelow164 = useMemo(() => {
    const major = getIOSVersion();
    if (major === null) return false;
    if (major !== 16) return major < 16;
    const minorMatch = navigator.userAgent.match(/OS 16_(\d+)/);
    const minor = minorMatch ? parseInt(minorMatch[1], 10) : 0;
    return minor < 4;
  }, []);

  // `appinstalled` (or standalone flip) → Trạng thái B.
  useEffect(() => {
    if (isInstalled) setView('installed');
  }, [isInstalled]);

  const handleVerifyInstall = () => {
    if (isStandalonePwa()) {
      setView('installed');
    } else {
      setHint('Hãy mở EduAR từ biểu tượng Màn hình chính (không phải tab Safari) rồi quay lại đây nhé.');
    }
  };

  const handleAndroidInstall = () => {
    void install();
  };

  const handleCopyLink = () => {
    navigator.clipboard
      ?.writeText(SITE_URL)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.backgroundBase,
        paddingTop: 'max(0px, env(safe-area-inset-top))', // Dynamic Island safe area
        paddingBottom: 40,
        fontFamily: BODY_FONT,
        color: colors.deepSlate,
      }}
    >
      <InstallBanner />

      <main
        style={{
          maxWidth: 448,
          margin: '0 auto',
          padding: '22px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <h1
          style={{
            fontFamily: DISPLAY_FONT,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: 0,
            color: colors.deepSlate,
          }}
        >
          Cài EduAR lên
          <br />
          <span style={{ color: colors.vibrantOrange }}>Màn hình chính</span>
        </h1>

        <p style={{ fontSize: 15, color: colors.mediumGray, margin: 0 }}>
          Một lần cài — mỗi ngày Lexi sẽ mời con vào vườn từ đúng giờ vàng nhé.
        </p>

        {view === 'installed' ? (
          /* ── STATE B — đã cài (standalone / appinstalled) ── */
          <div
            style={{
              backgroundColor: withOpacity(colors.mintGreen, 0.45),
              borderRadius: 24,
              boxShadow: shadows.clay,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <Msr icon="check_circle" size={44} color="#4C8A2A" />
            <b style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 20 }}>Bạn đã cài thành công!</b>
            <p style={{ fontSize: 14, color: colors.mediumGray, margin: 0 }}>
              Lexi đang chờ con trong app đó 🌱
            </p>
            <div style={{ width: '100%', marginTop: 8 }}>
              <ClayButton
                icon="bolt"
                gradient={`linear-gradient(145deg, ${colors.mintGreenLight}, ${colors.mintGreen})`}
                boxShadow={shadows.clayGreen}
                onClick={() => navigate('/notifications')}
              >
                Bật Giờ vàng ngay →
              </ClayButton>
            </div>
          </div>
        ) : (
          <>
            {/* ── Platform segmented control ── */}
            <div
              role="tablist"
              aria-label="Xem hướng dẫn theo nền tảng"
              style={{
                display: 'flex',
                backgroundColor: withOpacity(colors.deepSlate, 0.07),
                borderRadius: 16,
                padding: 4,
                gap: 4,
              }}
            >
              {(
                [
                  { key: 'ios' as const, icon: 'phone_iphone', label: 'iPhone · Safari' },
                  { key: 'android' as const, icon: 'android', label: 'Android · Chrome' },
                ]
              ).map(({ key, icon, label }) => {
                const active = platform === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPlatform(key)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 800,
                      fontSize: 14,
                      color: active ? colors.deepSlate : colors.mediumGray,
                      background: active ? colors.warmWhite : 'transparent',
                      border: 'none',
                      borderRadius: 12,
                      padding: '13px 8px',
                      minHeight: 48,
                      cursor: 'pointer',
                      boxShadow: active ? '0 3px 0 rgba(26,39,68,.10), inset 0 1px 0 rgba(255,255,255,.8)' : 'none',
                      transition: 'background .2s ease, color .2s ease, box-shadow .2s ease',
                    }}
                  >
                    <Msr icon={icon} size={16} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── STATE C — iOS < 16.4 warning ── */}
            {platform === 'ios' && iosDevice && iosBelow164 && (
              <div
                style={{
                  borderLeft: `6px solid ${colors.coralPink}`,
                  backgroundColor: withOpacity(colors.coralPink, 0.2),
                  borderRadius: 16,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: colors.deepSlate,
                }}
                role="alert"
              >
                Máy này chưa nhận thông báo từ web — cần cập nhật iOS lên 16.4 để nhận lời mời từ Lexi.
              </div>
            )}

            {/* ── iOS flow — manual 3-step guide (Apple blocks programmatic prompt) ── */}
            {platform === 'ios' && (
              <>
                <StepCard
                  icon="ios_share"
                  iconColor="#E5B800"
                  iconBg={withOpacity(colors.sunshineYellow, 0.35)}
                  title="Mở EduAR bằng Safari"
                  subtitle="Trên iPhone, nhấn nút Chia sẻ ở dưới màn hình"
                />
                <StepCard
                  icon="add_circle"
                  iconColor="#3A8FD1"
                  iconBg={withOpacity(colors.skyBlue, 0.35)}
                  title='Chọn "Thêm vào Màn hình chính"'
                  subtitle="Cuộn xuống giữa danh sách chia sẻ"
                />
                <StepCard
                  icon="check_circle"
                  iconColor="#4C8A2A"
                  iconBg={withOpacity(colors.mintGreen, 0.45)}
                  title='Nhấn "Thêm" — xong rồi!'
                  subtitle="Biểu tượng EduAR sẽ nằm ngay trên màn hình"
                />
                <ClayButton
                  icon="task_alt"
                  gradient={`linear-gradient(145deg, ${colors.sunshineYellowLight}, ${colors.sunshineYellow})`}
                  boxShadow={shadows.clayYellow}
                  onClick={handleVerifyInstall}
                >
                  Tôi đã cài rồi — Kiểm tra
                </ClayButton>
                {hint && (
                  <div
                    role="status"
                    style={{
                      backgroundColor: colors.coralPinkLight,
                      borderRadius: 16,
                      padding: '12px 14px',
                      fontSize: 13,
                      color: colors.deepSlate,
                    }}
                  >
                    {hint}
                  </div>
                )}
                <p style={{ fontSize: 12, color: colors.lightGray, textAlign: 'center', margin: 0 }}>
                  Nhắc nhở cần iOS 16.4 trở lên. Sau khi cài, mở EduAR từ biểu tượng Màn hình chính (không phải tab
                  Safari).
                </p>
              </>
            )}

            {/* ── Android flow — real PWA install button (beforeinstallprompt) ── */}
            {platform === 'android' && (
              <>
                <ClayButton
                  icon="install_mobile"
                  gradient={`linear-gradient(145deg, ${colors.skyBlueLight}, ${colors.skyBlue})`}
                  boxShadow={shadows.clayBlue}
                  disabled={!canInstall}
                  onClick={handleAndroidInstall}
                >
                  {canInstall ? 'Cài đặt EduAR — một chạm' : 'Đang chuẩn bị… hoặc dùng menu ⋮ → Cài đặt ứng dụng'}
                </ClayButton>
                <StepCard
                  icon="download"
                  iconColor="#3A8FD1"
                  iconBg={withOpacity(colors.skyBlue, 0.35)}
                  title='Chrome hỏi xác nhận → nhấn "Cài đặt"'
                  subtitle="Không cần vào menu — app tự vào Màn hình chính"
                />
                <p style={{ fontSize: 12, color: colors.lightGray, textAlign: 'center', margin: 0 }}>
                  Nút trên là nút install PWA thật (beforeinstallprompt → prompt()) — trình duyệt Android hiện dialog
                  gốc, tương tự cài app từ store.
                </p>
              </>
            )}

            {/* ── Desktop / unknown — send the link to the phone ── */}
            {!mobileDevice && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ClayButton
                  icon="content_copy"
                  gradient={`linear-gradient(145deg, ${colors.mintGreenLight}, ${colors.mintGreen})`}
                  boxShadow={shadows.clayGreen}
                  onClick={handleCopyLink}
                >
                  Sao chép liên kết
                </ClayButton>
                {copied && (
                  <p
                    role="status"
                    style={{ fontSize: 13, fontWeight: 700, color: '#4C8A2A', textAlign: 'center', margin: 0 }}
                  >
                    Đã sao chép liên kết! Gửi sang điện thoại để cài nhé.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Shared — notification preview (the "desire" card) ── */}
        <div
          style={{
            backgroundColor: '#fff',
            border: `2px solid ${withOpacity(colors.skyBlue, 0.55)}`,
            borderRadius: 18,
            padding: '12px 14px',
            boxShadow: '0 6px 0 rgba(26,39,68,.06), 0 10px 20px rgba(26,39,68,.10)',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: colors.sunshineYellow,
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,.6), 0 3px 0 rgba(26,39,68,.1)',
            }}
          >
            <Msr icon="notifications_active" size={20} color={colors.deepSlate} />
          </div>
          <div>
            <b style={{ fontFamily: DISPLAY_FONT, fontSize: 14, fontWeight: 900, display: 'block', color: colors.deepSlate }}>
              Lexi có tin vui! 🌱
            </b>
            <p style={{ fontSize: 13, color: colors.mediumGray, margin: 0 }}>
              Vườn từ của con có 5 hạt cần tưới nè. Vào chơi cùng Lexi nhé?
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InstallGuidePage;
