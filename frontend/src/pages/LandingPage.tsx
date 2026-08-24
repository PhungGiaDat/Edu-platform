/**
 * LandingPage.tsx — EduAR Claymorphic Redesign
 *
 * Design system: "Claymorphic Storybook"
 * Colors: Sunshine Yellow #FFD93D · Sky Blue #6EB9FF · Mint Green #B4E197 · Coral Pink #FF9F9F
 * Base: Warm White #FFFBF0
 * Text: Deep Slate #1A2744
 *
 * Sections:
 *   1. Floating Navbar
 *   2. Hero — asymmetric 65/35, massive type, floating character card
 *   3. Stats strip
 *   4. Course Catalog — 3 claymorphic cards with stagger reveal
 *   5. Progress Demo — animated XP bar + level badge + streak
 *   6. Testimonials — speech bubble cards
 *   7. Enrollment CTA — full-width punchy section
 *   8. Footer
 *
 * Performance: GPU-accelerated transforms/opacity only.
 *              prefers-reduced-motion respected via CSS media query.
 *              No external animation libraries — pure CSS keyframes.
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';

// ─── Inline SVG icons (no emoji used as UI icons per ui-skills rules) ───────

const BookOpenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const StarIcon = ({ fill = 'none' }: { fill?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 2 8 6 16 6 16 2" />
    <path d="M16 6c0 4.418-1.79 8-4 8s-4-3.582-4-8" />
    <path d="M12 14v4" />
    <path d="M8 20h8" />
    <path d="M4 6h4" />
    <path d="M16 6h4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// ─── Data ────────────────────────────────────────────────────────────────────

const COURSES = [
  {
    id: 'animals',
    emoji: '🐘',
    titleKey: 'landingCourseAnimalsTitle',
    descriptionKey: 'landingCourseAnimalsDescription',
    wordsKey: 'landingCourseAnimalsWords',
    levelKey: 'landingCourseAnimalsLevel',
    color: '#B4E197',
    shadow: '#7DC760',
    badgeKey: 'landingCourseAnimalsBadge',
  },
  {
    id: 'food',
    emoji: '🍎',
    titleKey: 'landingCourseFoodTitle',
    descriptionKey: 'landingCourseFoodDescription',
    wordsKey: 'landingCourseFoodWords',
    levelKey: 'landingCourseFoodLevel',
    color: '#FFD93D',
    shadow: '#E5B800',
    badgeKey: 'landingCourseFoodBadge',
  },
  {
    id: 'vehicles',
    emoji: '🚗',
    titleKey: 'landingCourseVehiclesTitle',
    descriptionKey: 'landingCourseVehiclesDescription',
    wordsKey: 'landingCourseVehiclesWords',
    levelKey: 'landingCourseVehiclesLevel',
    color: '#6EB9FF',
    shadow: '#3A8FD1',
    badgeKey: 'landingCourseVehiclesBadge',
  },
];

const TESTIMONIALS = [
  {
    nameKey: 'landingTestimonialEmmaName',
    avatar: '👧',
    quoteKey: 'landingTestimonialEmmaQuote',
    stars: 5,
    color: '#FFD93D',
  },
  {
    nameKey: 'landingTestimonialLiamName',
    avatar: '👦',
    quoteKey: 'landingTestimonialLiamQuote',
    stars: 5,
    color: '#B4E197',
  },
  {
    nameKey: 'landingTestimonialSofiaName',
    avatar: '👧',
    quoteKey: 'landingTestimonialSofiaQuote',
    stars: 5,
    color: '#6EB9FF',
  },
];

const FEATURES = [
  'landingFeatureScan',
  'landingFeaturePronunciation',
  'landingFeatureRewards',
  'landingFeatureProgress',
];

// ─── Component ───────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const { locale, setLocale, t } = useLocale();
  // Intersection Observer for scroll-reveal animations
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div style={{ background: '#FFFBF0', minHeight: '100vh', fontFamily: '"Nunito", system-ui, sans-serif', color: '#1A2744', overflowX: 'hidden' }}>

      {/* ── Global styles ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

        .clay-card {
          border-radius: 28px;
          box-shadow: 0 8px 0 rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
        }
        .clay-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 14px 0 rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .clay-btn {
          border-radius: 20px;
          box-shadow: 0 6px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          cursor: pointer;
        }
        .clay-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 9px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .clay-btn:active {
          transform: translateY(3px);
          box-shadow: 0 3px 0 rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .reveal {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.2,0.64,1);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-14px) rotate(2deg); }
        }
        @keyframes floatDelay {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(-1deg); }
        }
        @keyframes xpPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; transform: none; transition: none; }
          .clay-card { transition: none; }
          .clay-btn { transition: none; }
          [style*="float"], .float-anim { animation: none !important; }
        }
      `}</style>

      {/* ── 1. Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'clamp(12px, 3vw, 12px)',
        paddingBottom: 'clamp(12px, 3vw, 12px)',
        paddingLeft: 'max(env(safe-area-inset-left), clamp(16px, 5vw, 24px))',
        paddingRight: 'max(env(safe-area-inset-right), clamp(16px, 5vw, 24px))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44, background: '#6EB9FF',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 0 #3A8FD1, inset 0 1px 0 rgba(255,255,255,0.5)',
            color: '#fff',
          }}>
            <BookOpenIcon />
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
            Edu<span style={{ color: '#6EB9FF' }}>AR</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 'clamp(4px, 2vw, 8px)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link to="/courses" style={{
            padding: '10px 18px', fontWeight: 700, color: '#1A2744',
            textDecoration: 'none', borderRadius: 14,
            transition: 'background 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {t('navCourses')}
          </Link>
          <Link to="/login" style={{
            padding: '10px 18px', fontWeight: 700, color: '#1A2744',
            textDecoration: 'none', borderRadius: 14,
            transition: 'background 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {t('navLogin')}
          </Link>
          <button type="button" aria-label={t('language')} style={{
            padding: '10px 12px', fontWeight: 900, color: '#1A2744',
            background: '#fff', border: '2px solid #E2E8F0',
            textDecoration: 'none', borderRadius: 14,
            minHeight: 44, cursor: 'pointer',
          }}
            onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
          >
            {t('switchLocale')}
          </button>
          <Link to="/register" className="clay-btn" style={{
            padding: '10px 22px',
            background: '#FFD93D',
            border: 'none',
            fontWeight: 900,
            fontSize: 15,
            color: '#1A2744',
            textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
            minHeight: 44,
          }}>
            {t('navGetStarted')}
          </Link>
        </div>
      </nav>

      {/* ── 2. Hero ───────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1200, margin: '0 auto',
        padding: 'clamp(30px, 8vw, 60px) clamp(16px, 5vw, 24px)',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 'clamp(32px, 8vw, 48px)',
        width: '100%', boxSizing: 'border-box',
      }}>
        <style>{`
          @media (min-width: 768px) {
            .hero-grid { grid-template-columns: 1.7fr 1fr !important; align-items: center; }
          }
        `}</style>
        <div className="hero-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr', gap: 48, alignItems: 'center'
        }}>
          {/* Left — text */}
          <div>
            {/* Pill badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#FF9F9F', borderRadius: 99,
              padding: '6px 16px', marginBottom: 24,
              fontWeight: 800, fontSize: 13, color: '#1A2744',
              boxShadow: '0 3px 0 #d97070',
            }}>
              <ZapIcon />
              {t('landingBadge')}
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(42px, 7vw, 80px)',
              fontWeight: 900,
              lineHeight: 1.05,
              margin: '0 0 24px',
              letterSpacing: '-1px',
            }}>
              {t('landingHeroTitleLine1')} <br />
              <span style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6EB9FF, #B4E197)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {t('landingHeroTitleLine2')}
              </span>
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 18, fontWeight: 600, color: '#4A5568',
              maxWidth: 480, lineHeight: 1.6, margin: '0 0 36px',
            }}>
              {t('landingHeroBody')}
            </p>

            {/* Feature checklist */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15 }}>
                  <span style={{
                    width: 26, height: 26, background: '#B4E197', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 2px 0 #7DC760',
                    color: '#1A6B2A',
                  }}>
                    <CheckIcon />
                  </span>
                  {t(f)}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/register" className="clay-btn" style={{
                background: '#6EB9FF',
                padding: '16px 32px',
                fontWeight: 900, fontSize: 17,
                color: '#fff', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                minHeight: 56,
                border: 'none',
              }}>
                {t('landingStartFree')}
                <ArrowRightIcon />
              </Link>
              <Link to="/learn-ar" className="clay-btn" style={{
                background: '#fff',
                padding: '16px 28px',
                fontWeight: 900, fontSize: 17,
                color: '#1A2744', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                minHeight: 56,
                border: '2px solid #E2E8F0',
              }}>
                <CameraIcon />
                {t('landingTryArDemo')}
              </Link>
            </div>
          </div>

          {/* Right — floating character card */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
            {/* Blob background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, #FFD93D33 0%, transparent 70%)',
              borderRadius: '50%',
            }} />

            {/* Main character card */}
            <div className="clay-card float-anim" style={{
              background: '#fff',
              padding: 24, width: '100%', maxWidth: 300,
              position: 'relative', zIndex: 2,
              animation: 'float 4s ease-in-out infinite',
              transform: 'rotate(-2deg)',
            }}>
              {/* AR preview mockup */}
              <div style={{
                background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',
                borderRadius: 20, height: 200,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 90, marginBottom: 16,
                position: 'relative', overflow: 'hidden',
              }}>
                <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>🐘</span>
                {/* AR scan lines effect */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(110,185,255,0.06) 3px, rgba(110,185,255,0.06) 4px)',
                }} />
                {/* Camera corner markers */}
                {[['0','0','borderTop','borderLeft'],['0','auto','borderTop','borderRight'],['auto','0','borderBottom','borderLeft'],['auto','auto','borderBottom','borderRight']].map(([top, right, b1, b2], i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: top === '0' ? 12 : 'auto', bottom: top === 'auto' ? 12 : 'auto',
                    left: right === '0' ? 12 : 'auto', right: right === 'auto' ? 12 : 'auto',
                    width: 18, height: 18,
                    [b1]: '3px solid #6EB9FF',
                    [b2]: '3px solid #6EB9FF',
                  }} />
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 900, fontSize: 22, margin: '0 0 4px', color: '#1A2744' }}>
                  {t('landingPreviewWord')}
                </p>
                <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, margin: 0 }}>
                  {t('landingPreviewHint')}
                </p>
              </div>

              {/* XP badge */}
              <div style={{
                position: 'absolute', top: -12, right: -12,
                background: '#FFD93D', borderRadius: 14, padding: '6px 12px',
                fontWeight: 900, fontSize: 13, color: '#1A2744',
                boxShadow: '0 4px 0 #E5B800',
              }}>
                +10 XP
              </div>
            </div>

            {/* Floating mini cards */}
            <div className="clay-card" style={{
              position: 'absolute', bottom: -10, left: -10, zIndex: 3,
              background: '#B4E197', padding: '10px 14px',
              fontSize: 22,
              animation: 'floatDelay 3.5s ease-in-out infinite',
              transform: 'rotate(5deg)',
            }}>
              🍎
            </div>
            <div className="clay-card" style={{
              position: 'absolute', top: 10, right: -20, zIndex: 3,
              background: '#FF9F9F', padding: '10px 14px',
              fontSize: 22,
              animation: 'floatDelay 4.2s ease-in-out infinite 0.8s',
              transform: 'rotate(-8deg)',
            }}>
              🚗
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Stats strip ────────────────────────────────────────────────── */}
      <section style={{
        background: '#1A2744', padding: '28px 24px',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 0, textAlign: 'center',
        }}>
          {[
            { icon: <UsersIcon />, value: '50,000+', label: t('landingHappyKids') },
            { icon: <BookOpenIcon />, value: '110+', label: t('landingArFlashcards') },
            { icon: <TrophyIcon />, value: '4.9 / 5', label: t('landingAppRating') },
            { icon: <ZapIcon />, value: '2M+', label: t('landingWordsLearned') },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{
              padding: '16px 24px', color: '#fff',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ color: '#FFD93D', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
              <p style={{ fontSize: 26, fontWeight: 900, margin: '0 0 2px' }}>{value}</p>
              <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700, margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Course Catalog ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 40px' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontWeight: 800, color: '#6EB9FF', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px' }}>
            {t('landingTeachKicker')}
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
            {t('landingTeachTitle')}
          </h2>
          <p style={{ fontSize: 17, color: '#4A5568', fontWeight: 600, maxWidth: 480, margin: '0 auto' }}>
            {t('landingTeachBody')}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {COURSES.map((course, i) => (
            <div
              key={course.id}
              className="clay-card reveal"
              style={{
                background: course.color,
                padding: 28,
                transitionDelay: `${i * 0.1}s`,
                cursor: 'pointer',
              }}
            >
              {/* Badge */}
              <div style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.5)',
                borderRadius: 99, padding: '4px 12px',
                fontSize: 12, fontWeight: 800, marginBottom: 20,
                color: '#1A2744',
              }}>
                {t(course.badgeKey)}
              </div>

              {/* Emoji */}
              <div style={{
                fontSize: 64, lineHeight: 1, marginBottom: 16,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
              }}>
                {course.emoji}
              </div>

              <h3 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', color: '#1A2744' }}>
                {t(course.titleKey)}
              </h3>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3D4A5C', margin: '0 0 20px', lineHeight: 1.5 }}>
                {t(course.descriptionKey)}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.6)', borderRadius: 10,
                  padding: '4px 12px', fontSize: 13, fontWeight: 800, color: '#1A2744',
                }}>
                  {t(course.wordsKey)}
                </span>
                <span style={{
                  background: 'rgba(255,255,255,0.6)', borderRadius: 10,
                  padding: '4px 12px', fontSize: 13, fontWeight: 800, color: '#1A2744',
                }}>
                  {t(course.levelKey)}
                </span>
              </div>

              {/* Progress bar demo */}
              <div style={{
                marginTop: 20,
                background: 'rgba(255,255,255,0.4)', borderRadius: 99, height: 8, overflow: 'hidden',
              }}>
                <div style={{
                  width: i === 0 ? '72%' : i === 1 ? '45%' : '18%',
                  height: '100%',
                  background: '#1A2744',
                  borderRadius: 99,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/courses" className="clay-btn" style={{
            background: '#1A2744', color: '#fff',
            padding: '14px 32px', fontWeight: 900, fontSize: 16,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
            border: 'none',
          }}>
            {t('landingViewAllCourses')}
            <ArrowRightIcon />
          </Link>
        </div>
      </section>

      {/* ── 5. Progress Demo ──────────────────────────────────────────────── */}
      <section style={{
        background: '#F0FAFF', margin: '40px 0',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 48, alignItems: 'center',
          }}>
            {/* Left: copy */}
            <div className="reveal">
              <p style={{ fontWeight: 800, color: '#6EB9FF', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px' }}>
                {t('landingProgressKicker')}
              </p>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.5px' }}>
                {t('landingProgressTitle')}
              </h2>
              <p style={{ fontSize: 16, color: '#4A5568', fontWeight: 600, lineHeight: 1.6, margin: '0 0 28px' }}>
                {t('landingProgressBody')}
              </p>
              <Link to="/register" className="clay-btn" style={{
                background: '#6EB9FF', padding: '14px 28px',
                fontWeight: 900, fontSize: 16, color: '#fff',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                border: 'none',
              }}>
                {t('landingCreateAccount')}
                <ArrowRightIcon />
              </Link>
            </div>

            {/* Right: demo card */}
            <div className="clay-card reveal" style={{
              background: '#fff', padding: 32,
              transitionDelay: '0.15s',
            }}>
              {/* Player header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{
                  width: 56, height: 56, background: '#FFD93D',
                  borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, boxShadow: '0 4px 0 #E5B800',
                }}>
                  🦊
                </div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 18, margin: '0 0 2px' }}>{t('landingAlexProgress')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: '#B4E197', borderRadius: 99, padding: '2px 10px',
                      fontSize: 12, fontWeight: 800, boxShadow: '0 2px 0 #7DC760',
                    }}>
                      {t('landingLevel5')}
                    </span>
                    <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>
                      {t('landingWordExplorer')}
                    </span>
                  </div>
                </div>
              </div>

              {/* XP Bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{t('landingExperiencePoints')}</span>
                  <span style={{ fontWeight: 900, fontSize: 14, color: '#6EB9FF' }}>680 / 1000 XP</span>
                </div>
                <div style={{ background: '#E2E8F0', borderRadius: 99, height: 14, overflow: 'hidden' }}>
                  <div style={{
                    width: '68%', height: '100%',
                    background: 'linear-gradient(90deg, #6EB9FF, #B4E197)',
                    borderRadius: 99,
                    animation: 'xpPulse 2s ease-in-out infinite',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      animation: 'shimmer 1.8s infinite',
                    }} />
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { icon: '🔥', value: '12', label: t('landingDayStreak') },
                  { icon: '⭐', value: '24', label: t('landingBadges') },
                  { icon: '📚', label: t('words'), value: '86' },
                ].map(s => (
                  <div key={s.label} className="clay-card" style={{
                    background: '#FFFBF0', padding: '12px 8px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 22 }}>{s.icon}</div>
                    <p style={{ fontWeight: 900, fontSize: 18, margin: '4px 0 0', color: '#1A2744' }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent badges */}
              <div>
                <p style={{ fontWeight: 800, fontSize: 13, margin: '0 0 10px', color: '#4A5568' }}>{t('landingRecentBadges')}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    `🐘 ${t('landingBadgeAnimal')}`,
                    `🍎 ${t('landingBadgeFruit')}`,
                    `🔤 ${t('landingBadgeSpeller')}`,
                  ].map(b => (
                    <span key={b} style={{
                      background: '#FFD93D', borderRadius: 10,
                      padding: '4px 10px', fontSize: 12, fontWeight: 800,
                      boxShadow: '0 2px 0 #E5B800',
                    }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Testimonials ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px' }}>
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontWeight: 800, color: '#FF9F9F', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px' }}>
            {t('landingStoriesKicker')}
          </p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
            {t('landingStoriesTitle')}
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
        }}>
          {TESTIMONIALS.map((testimonial, i) => (
            <div
              key={testimonial.nameKey}
              className="clay-card reveal"
              style={{
                background: testimonial.color,
                padding: 28,
                transitionDelay: `${i * 0.12}s`,
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array.from({ length: testimonial.stars }).map((_, j) => (
                  <span key={j} style={{ color: '#1A2744' }}><StarIcon fill="#1A2744" /></span>
                ))}
              </div>

              {/* Speech bubble tail */}
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <div style={{
                  background: 'rgba(255,255,255,0.55)',
                  borderRadius: 20, padding: '16px 20px',
                  fontSize: 15, fontWeight: 700, lineHeight: 1.5, color: '#1A2744',
                }}>
                  "{t(testimonial.quoteKey)}"
                </div>
                {/* Tail */}
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '12px solid transparent',
                  borderRight: '12px solid transparent',
                  borderTop: '14px solid rgba(255,255,255,0.55)',
                  position: 'absolute', bottom: -14, left: 28,
                }} />
              </div>

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 6 }}>
                <div style={{
                  width: 42, height: 42, background: 'rgba(255,255,255,0.6)',
                  borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, boxShadow: '0 2px 0 rgba(0,0,0,0.08)',
                }}>
                  {testimonial.avatar}
                </div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 14, margin: '0 0 1px', color: '#1A2744' }}>{t(testimonial.nameKey)}</p>
                  <p style={{ fontSize: 12, color: '#3D4A5C', fontWeight: 700, margin: 0 }}>{t('landingStudentRole')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Enrollment CTA ─────────────────────────────────────────────── */}
      <section style={{
        background: '#1A2744',
        padding: '80px 24px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: -60, right: -80, width: 300, height: 300,
          background: '#FFD93D', borderRadius: '50%', opacity: 0.06,
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -40, width: 250, height: 250,
          background: '#6EB9FF', borderRadius: '50%', opacity: 0.07,
        }} />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div className="reveal" style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
          <h2 className="reveal" style={{
            fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900,
            color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px',
            transitionDelay: '0.05s',
          }}>
            {t('landingCtaTitleLine1')}<br />{t('landingCtaTitleLine2')}
          </h2>
          <p className="reveal" style={{
            fontSize: 17, color: '#94A3B8', fontWeight: 600,
            margin: '0 0 40px', lineHeight: 1.6,
            transitionDelay: '0.1s',
          }}>
            {t('landingCtaBody')}
          </p>

          <div className="reveal" style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            transitionDelay: '0.15s',
          }}>
            <Link to="/register" className="clay-btn" style={{
              background: '#FFD93D', padding: '18px 36px',
              fontWeight: 900, fontSize: 18, color: '#1A2744',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              minHeight: 60, border: 'none',
            }}>
              {t('landingCreateAccount')}
              <ArrowRightIcon />
            </Link>
            <Link to="/learn-ar" className="clay-btn" style={{
              background: 'transparent', padding: '18px 32px',
              fontWeight: 900, fontSize: 18, color: '#fff',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
              minHeight: 60,
              border: '2px solid rgba(255,255,255,0.25)',
            }}>
              <CameraIcon />
              {t('landingTryWithoutAccount')}
            </Link>
          </div>

          {/* Trust line */}
          <p className="reveal" style={{
            fontSize: 13, color: '#64748B', fontWeight: 700, marginTop: 24,
            transitionDelay: '0.2s',
          }}>
            {t('landingTrustLine')}
          </p>
        </div>
      </section>

      {/* ── 8. Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        background: '#111827', padding: '32px 24px',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: '#6EB9FF',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <BookOpenIcon />
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>
            Edu<span style={{ color: '#6EB9FF' }}>AR</span>
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#4B5563', fontWeight: 700, margin: 0 }}>
          {t('landingFooter')}
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            t('landingPrivacy'),
            t('landingTerms'),
            t('landingContact'),
          ].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: '#4B5563', fontWeight: 700, textDecoration: 'none',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#6EB9FF')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4B5563')}
            >{l}</a>
          ))}
        </div>
      </footer>

    </div>
  );
};
