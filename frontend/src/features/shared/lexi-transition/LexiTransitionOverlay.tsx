/**
 * LexiTransitionOverlay — Duolingo-style route transition overlay.
 *
 * Activated on BUTTON-DRIVEN navigations: a one-time, guarded patch of
 * history.pushState catches every Link click / navigate() call, dispatches
 * an internal event, and this overlay plays a claymorphic Lexi moment
 * while the next page mounts. Back/forward (popstate) intentionally do
 * NOT trigger it; redirects (replaceState) intentionally do NOT either.
 *
 * Suppression rules (approved design 2026-09-06):
 * - AR routes are excluded both ways (/learn-ar*, /scan) — camera/XR
 *   surfaces must never be covered or delayed.
 * - /login and /register are excluded — LexiLoginLoader already owns the
 *   post-login moment there.
 * - Query-only changes (same pathname, e.g. /games?topic=...) are excluded
 *   to avoid spamming the player inside the games hub.
 *
 * UX parameters: min visible 1.2s (never flashes), hard cap 2.5s (never
 * traps the child), 400ms fade-out. Reduced motion → fade only, no bounce.
 * Accessibility: role="status", aria-live="polite".
 */
import React, { useEffect, useState } from 'react';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';

type Phase = 'hidden' | 'showing' | 'leaving';

const MIN_VISIBLE_MS = 1200;
const LEAVE_MS = 400;
const EVENT = 'lexitransition:navigate';

const MESSAGES = [
  'Lexi đang dọn khu chơi...',
  'Chuẩn bị bài học mới...',
  'Sắp xong rồi!',
];

const isArPath = (p: string) =>
  p.startsWith('/learn-ar') || p.startsWith('/learn-ar-xr') || p.startsWith('/scan');

const isAuthPath = (p: string) => p === '/login' || p === '/register';

const pathOf = (p: string) => p.split('?')[0].split('#')[0];

/** One-time, idempotent history.pushState wrapper. */
let patched = false;
function patchHistoryOnce(): void {
  if (patched || typeof window === 'undefined') return;
  patched = true;
  const originalPush = window.history.pushState.bind(window.history);
  window.history.pushState = function pushStateWrapper(...args: Parameters<History['pushState']>) {
    const from = window.location.pathname;
    const result = originalPush(...args);
    let to = from;
    try {
      const url = args[2];
      if (typeof url === 'string') to = new URL(url, window.location.href).pathname;
    } catch {
      to = window.location.pathname;
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { from, to } }));
    return result;
  };
}

const STYLES = `
  .lto-root {
    position: fixed; inset: 0; z-index: 9999; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(160deg, #FFF3A3 0%, #FFF8EE 45%, #FFD5D5 100%);
  }
  .lto-showing { animation: lto-fade-in .25s ease-out forwards; }
  .lto-leaving { animation: lto-fade-out .4s ease-in forwards; }
  @keyframes lto-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lto-fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes lto-blob-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(24px,-18px) scale(1.08); } }
  @keyframes lto-blob-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,16px) scale(1.12); } }
  @keyframes lto-sparkle { 0%,100% { opacity: 0; transform: scale(.5) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(20deg); } }
  @keyframes lto-dot { 0%,80%,100% { transform: translateY(0); opacity: .45; } 40% { transform: translateY(-6px); opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .lto-showing, .lto-leaving { animation-duration: .01s; }
    .lto-blob, .lto-spark { animation: none !important; }
  }
`;

export const LexiTransitionOverlay: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    patchHistoryOnce();

    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { from: string; to: string };
      // Suppression rules — AR both ways, auth pages, same-path (query-only)
      if (isArPath(detail.from) || isArPath(detail.to)) return;
      if (isAuthPath(detail.from)) return;
      if (pathOf(detail.from) === pathOf(detail.to)) return;

      setMsgIndex(0);
      setPhase('showing');
    };
    window.addEventListener(EVENT, onNavigate);
    return () => window.removeEventListener(EVENT, onNavigate);
  }, []);

  // Phase timers: showing → (min 1.2s) → leaving → (400ms) → hidden
  useEffect(() => {
    if (phase === 'showing') {
      const t = window.setTimeout(() => setPhase('leaving'), MIN_VISIBLE_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === 'leaving') {
      const t = window.setTimeout(() => setPhase('hidden'), LEAVE_MS);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  // Rotate Vietnamese messages while showing
  useEffect(() => {
    if (phase !== 'showing') return;
    const t = window.setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 1100);
    return () => window.clearInterval(t);
  }, [phase]);

  if (phase === 'hidden') return null;

  const leaving = phase === 'leaving';

  return (
    <div
      className={`lto-root ${leaving ? 'lto-leaving' : 'lto-showing'}`}
      role="status"
      aria-live="polite"
      aria-label="Lexi đang chuẩn bị trang cho bạn"
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

        {/* Clay ambient blobs */}
        <div aria-hidden="true" className="lto-blob" style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%', opacity: 0.5, top: '8%', left: '-4%',
          background: 'radial-gradient(circle, rgba(255,217,61,.55) 0%, transparent 70%)', animation: 'lto-blob-a 7s ease-in-out infinite',
        }} />
        <div aria-hidden="true" className="lto-blob" style={{
          position: 'absolute', width: 220, height: 220, borderRadius: '50%', opacity: 0.45, bottom: '10%', right: '-2%',
          background: 'radial-gradient(circle, rgba(255,159,159,.5) 0%, transparent 70%)', animation: 'lto-blob-b 8s ease-in-out infinite',
        }} />
        <div aria-hidden="true" className="lto-blob" style={{
          position: 'absolute', width: 180, height: 180, borderRadius: '50%', opacity: 0.4, top: '55%', left: '8%',
          background: 'radial-gradient(circle, rgba(180,225,151,.5) 0%, transparent 70%)', animation: 'lto-blob-a 9s ease-in-out infinite reverse',
        }} />

        {/* Clay sparkles */}
        {[
          { top: '18%', right: '16%', size: 30, delay: '0s' },
          { top: '30%', left: '14%', size: 22, delay: '.5s' },
          { bottom: '24%', right: '24%', size: 26, delay: '1s' },
          { bottom: '32%', left: '22%', size: 18, delay: '1.4s' },
        ].map((s, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="msr lto-spark"
            style={{
              position: 'absolute', fontSize: s.size, color: 'rgba(255,217,61,.9)',
              top: s.top, left: s.left, right: s.right, bottom: s.bottom,
              textShadow: '0 3px 0 rgba(229,184,0,.45)', animation: `lto-sparkle 1.6s ease-in-out ${s.delay} infinite`,
            }}
          >
            auto_awesome
          </span>
        ))}

        {/* Lexi + badge */}
        <div style={{
          position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <CodexPetSprite
            animationState={leaving ? 'jumping' : 'waving'}
            label="Lexi đang chuẩn bị trang"
            size={150}
          />
          <span
            style={{
              fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: 15,
              background: '#FFFBF0', color: '#1A2744', borderRadius: 999, padding: '7px 18px',
              boxShadow: '0 5px 0 rgba(26,39,68,.10), inset 0 2px 0 rgba(255,255,255,.85)',
            }}
          >
            Lexi
          </span>
        </div>

        {/* Message + dots */}
        <p
          style={{
            position: 'relative', zIndex: 2, marginTop: 10, fontFamily: "'Nunito', sans-serif",
            fontWeight: 800, fontSize: 17, color: '#1A2744', textAlign: 'center', padding: '0 28px',
          }}
        >
          {MESSAGES[msgIndex]}
        </p>
        <div aria-hidden="true" style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 8, marginTop: 6 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 10, height: 10, borderRadius: '50%', background: '#1A2744',
                animation: `lto-dot 1.1s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
  );
};

export default LexiTransitionOverlay;
