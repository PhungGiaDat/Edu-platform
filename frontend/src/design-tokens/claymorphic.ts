/**
 * Claymorphic Design Tokens
 * "Claymorphic Storybook" Design System for EduAR Platform
 * 
 * This file contains all design tokens extracted from LandingPage.tsx
 * to create a reusable, consistent design system across the platform.
 */

// ─── Colors ───────────────────────────────────────────────────
export const colors = {
  // Brand Colors
  sunshineYellow: '#FFD93D',
  sunshineYellowDark: '#E5B800',
  sunshineYellowLight: '#FFF3A3',

  skyBlue: '#6EB9FF',
  skyBlueDark: '#3A8FD1',
  skyBlueLight: '#C5E4FF',

  mintGreen: '#B4E197',
  mintGreenDark: '#7DC760',
  mintGreenLight: '#DFFFD0',

  coralPink: '#FF9F9F',
  coralPinkDark: '#D97070',
  coralPinkLight: '#FFD5D5',

  // Vibrant Palette
  vibrantOrange: '#FF8C42',
  electricPurple: '#A855F7',
  neonTeal: '#14B8A6',
  bubblePink: '#F472B6',
  lavender: '#A78BFA',

  // Neutrals
  warmWhite: '#FFFBF0',
  deepSlate: '#1A2744',
  mediumGray: '#4A5568',
  lightGray: '#94A3B8',
  darkBg: '#111827',
  backgroundBase: '#FFF8EE',
} as const;

// ─── Shadows ──────────────────────────────────────────────────
export const shadows = {
  // Card shadows (triple shadow: lift + ambient + shine)
  claySm: '0 4px 0 rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
  clay: '0 8px 0 rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
  clayLg: '0 14px 0 rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.7)',
  
  // Button shadows (colored bottom shadows for 3D depth)
  clayYellow: `0 6px 0 #E5B800, inset 0 1px 0 rgba(255,255,255,0.4)`,
  clayBlue: `0 6px 0 #3A8FD1, inset 0 1px 0 rgba(255,255,255,0.4)`,
  clayGreen: `0 6px 0 #7DC760, inset 0 1px 0 rgba(255,255,255,0.4)`,
  clayPink: `0 6px 0 #D97070, inset 0 1px 0 rgba(255,255,255,0.4)`,
  clayWhite: '0 6px 0 #E2E8F0, inset 0 1px 0 rgba(255,255,255,0.4)',
} as const;

// ─── Border Radius ────────────────────────────────────────────
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',    // Buttons
  '2xl': '24px',
  '3xl': '28px', // Cards
  '4xl': '32px',
  full: '9999px',
} as const;

// ─── Transitions ──────────────────────────────────────────────
export const transitions = {
  // Easing functions
  springBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Overshoot bounce
  springSubtle: 'cubic-bezier(0.34, 1.2, 0.64, 1)',  // Subtle bounce
  easeStandard: 'ease',
  
  // Durations
  fast: '150ms',
  normal: '250ms',
  slow: '600ms',
} as const;

// ─── Animation Durations ──────────────────────────────────────
export const animations = {
  float: '4s',
  floatDelay: '3.5s',
  xpPulse: '2s',
  shimmer: '2s',
  reveal: '600ms',
  stagger: '100ms', // Per item delay
} as const;

// ─── Spacing (Touch Targets) ──────────────────────────────────
export const spacing = {
  touchMin: '48px',
  touchMd: '56px',
  touchLg: '64px',
  touchXl: '72px',
} as const;

// ─── Typography ───────────────────────────────────────────────
export const typography = {
  weights: {
    regular: 400,
    medium: 600,
    bold: 700,
    extraBold: 800,
    black: 900,
  },
  sizes: {
    xs: '13px',
    sm: '15px',
    base: '17px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
  },
} as const;

// ─── Helper Functions ─────────────────────────────────────────

/**
 * Get color with opacity
 * @param color - Hex color code
 * @param opacity - Opacity value (0-1)
 */
export function withOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get stagger delay for animation
 * @param index - Item index
 * @param delay - Delay per item in ms (default: 100ms)
 */
export function staggerDelay(index: number, delay: number = 100): string {
  return `${index * delay}ms`;
}

// ─── Learner Brand Palette (spec 2026-08-28-gamification-mascot-ui) ─────
export const brandColors = {
  primary: '#2563EB',
  secondary: '#7C3AED',
  accent: '#F59E0B',
  background: '#EFF6FF',
  foreground: '#0F172A',
} as const;

// ─── Type Exports ─────────────────────────────────────────────
export type ColorKey = keyof typeof colors;
export type ShadowKey = keyof typeof shadows;
export type RadiusKey = keyof typeof radius;
export type TransitionKey = keyof typeof transitions;
export type AnimationKey = keyof typeof animations;
export type SpacingKey = keyof typeof spacing;
