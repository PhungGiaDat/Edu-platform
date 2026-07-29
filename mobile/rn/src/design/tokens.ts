/**
 * Claymorphic design token specifications for the EduAR mobile app.
 * Maps web design tokens to React Native equivalents.
 * See: docs/superpowers/plans/2026-07-23-phase2-claymorphic-ar-loading-plan.md §2
 */

export const COLORS = {
  backgroundBase: '#FFFBF0',
  primary: '#6EB9FF',
  secondary: '#B4E197',
  accent: '#FFD93D',
  coral: '#FF9F9F',
  shadowDark: 'rgba(0,0,0,0.15)',
  shadowAmbient: 'rgba(0,0,0,0.10)',
  insetHighlight: 'rgba(255,255,255,0.7)',
  white: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  error: '#FF6B6B',
  success: '#4CAF50',
} as const;

export const COLOR_MAP = {
  yellow: '#FFD93D',
  blue: '#6EB9FF',
  green: '#B4E197',
  coral: '#FF9F9F',
  white: '#FFFFFF',
} as const;

export type ClayColor = keyof typeof COLOR_MAP;

export const SHADOWS = {
  claySm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  clayMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  clayLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
} as const;

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const ANIMATION = {
  spring: {
    damping: 15,
    stiffness: 150,
  },
  press: {
    damping: 15,
    stiffness: 200,
  },
  floatY: -14,
  shimmerDuration: 1500,
  floatDuration: 3000,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const FONT = {
  primary: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 28,
  },
} as const;

// ─── Extended Brand Palette (port from frontend-web/src/design-tokens/claymorphic.ts) ─────
// Single source of truth for the RN app; web keeps its own copy. Tasks 2.0/2.1 of the
// migration plan map these into ClayCard/ClayButton/ClayProgressBar consumers.
export const BRAND = {
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
  warmWhite: '#FFFBF0',
  deepSlate: '#1A2744',
  mediumGray: '#4A5568',
  lightGray: '#94A3B8',
  darkBg: '#111827',
} as const;

// ─── Pet Rarity (port from frontend-web/src/components/pets/PetCard.tsx rarityConfig) ─────
export const RARITY_COLORS = {
  common: {
    base: '#9CA3AF',
    dark: '#4B5563',
    badge: '🥉',
    glow: 'rgba(156, 163, 175, 0.4)',
    gradient: ['#9CA3AF', '#4B5563'] as const,
  },
  rare: {
    base: '#60A5FA',
    dark: '#2563EB',
    badge: '🥈',
    glow: 'rgba(96, 165, 250, 0.4)',
    gradient: ['#60A5FA', '#2563EB'] as const,
  },
  epic: {
    base: '#A78BFA',
    dark: '#7C3AED',
    badge: '🏵️',
    glow: 'rgba(167, 139, 250, 0.4)',
    gradient: ['#A78BFA', '#7C3AED'] as const,
  },
  legendary: {
    base: '#FBBF24',
    dark: '#F97316',
    badge: '👑',
    glow: 'rgba(251, 191, 36, 0.5)',
    gradient: ['#FBBF24', '#F97316'] as const,
  },
} as const;
export type PetRarity = keyof typeof RARITY_COLORS;

// ─── Pet Evolution Stage (port from frontend-web/src/pages/PetsPage.tsx STAGE_*) ─────
export const STAGE_GRADIENTS = {
  baby: { from: 'rgba(252, 211, 77, 0.45)', to: 'rgba(254, 240, 138, 0.45)', base: '#FCD34D' },
  child: { from: 'rgba(134, 239, 172, 0.45)', to: 'rgba(187, 247, 208, 0.45)', base: '#86EFAC' },
  teen: { from: 'rgba(147, 197, 253, 0.45)', to: 'rgba(199, 210, 254, 0.45)', base: '#93C5FD' },
  adult: { from: 'rgba(216, 180, 254, 0.45)', to: 'rgba(249, 168, 212, 0.45)', base: '#D8B4FE' },
} as const;
export const EVOLUTION_EMOJI = {
  baby: '🥚',
  child: '🐣',
  teen: '🦋',
  adult: '🌟',
} as const;
export type PetStage = keyof typeof STAGE_GRADIENTS;

// ─── Course Category Palette (port from frontend-web/src/pages/CourseList.tsx pathPalette) ─────
export const CATEGORY_COLORS = {
  home_family: {
    shell: '#FFF1D7',
    border: 'rgba(255, 217, 61, 0.38)',
    accent: BRAND.sunshineYellow,
    accentDark: BRAND.sunshineYellowDark,
  },
  nature: {
    shell: '#EAF5FF',
    border: 'rgba(110, 185, 255, 0.34)',
    accent: BRAND.skyBlue,
    accentDark: BRAND.skyBlueDark,
  },
  school_food: {
    shell: '#EEF9E7',
    border: 'rgba(180, 225, 151, 0.40)',
    accent: BRAND.mintGreen,
    accentDark: BRAND.mintGreenDark,
  },
  animals: {
    shell: '#FFE7E3',
    border: 'rgba(255, 159, 159, 0.40)',
    accent: BRAND.coralPink,
    accentDark: BRAND.coralPinkDark,
  },
} as const;
export type CourseCategoryKey = keyof typeof CATEGORY_COLORS;

// ─── Pet Care Stat Colors (port from frontend-web/src/pages/PetsPage.tsx ProgressBar uses) ─────
export const CARE_STAT_COLORS = {
  happiness: '#5B8DEF',
  energy: '#7BC67E',
  hunger: '#FFB347',
  xp: '#FFB347',
  streak: '#FF9F9F',
  active: '#34D399',
  activeMuted: '#10B981',
} as const;

// ─── Claymorphic Variant Layer (darker drop-shadow bottom for colored buttons) ─────
// Mirrors web shadows.clayYellow/Blue/Green/Pink/White via the existing SHADOWS.clayMd/Lg
// base + a colored offset. Use on ClayButton `<color>` prop plus a `tone` modifier if needed.
export const CLAY_TONE_SHADOWS = {
  yellow: { offsetY: 6, color: BRAND.sunshineYellowDark },
  blue: { offsetY: 6, color: BRAND.skyBlueDark },
  green: { offsetY: 6, color: BRAND.mintGreenDark },
  pink: { offsetY: 6, color: BRAND.coralPinkDark },
  white: { offsetY: 6, color: '#E2E8F0' },
} as const;

// ─── Motion Durations (port from frontend-web/src/design-tokens/claymorphic.ts animations) ─────
// Use these for Reanimated `withTiming`/CSS keyframes. Spring configs remain in `ANIMATION`.
export const MOTION = {
  duration: { fast: 150, normal: 250, slow: 600, reveal: 600 },
  // Cubic-bezier easing string constants — Ionic/CSS only; translate to AnimationCurve for RN.
  easing: {
    springBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springSubtle: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
    standard: 'ease',
  },
  loop: { float: 4000, shimmer: 2000, xpPulse: 2000, floatDelay: 3500 },
  stagger: 100, // ms per item
} as const;

// ─── Reanimated Spring presets matching web claymorphic spring behavior ─────
export const CLAYMORPHIC_SPRINGS = {
  buttonPress: { damping: 15, stiffness: 200, mass: 1 },
  cardReveal: { damping: 12, stiffness: 180, mass: 1 },
  modalBounce: { damping: 11, stiffness: 220, mass: 1 },
  toast: { damping: 18, stiffness: 240, mass: 1 },
} as const;

// ─── Helper: withOpacity (port from web design-tokens/claymorphic.ts withOpacity) ─────
export function withOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Type Exports ─────
export type BrandColor = keyof typeof BRAND;
export type RarityColor = PetRarity;
export type CareStatColor = keyof typeof CARE_STAT_COLORS;
export type ClayTone = keyof typeof CLAY_TONE_SHADOWS;
