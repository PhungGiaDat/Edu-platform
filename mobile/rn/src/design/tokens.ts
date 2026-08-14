/**
 * Claymorphic design token specifications for the EduAR mobile app.
 * Maps web design tokens to React Native equivalents.
 * v2 — Premium claymorphic children learning palette.
 *
 * Read by ClayCard, ClayButton, ClayProgressBar, and HomeScreen.
 */

export const COLORS = {
  backgroundBase: '#FFF8EE', // warm ivory
  backgroundWash: '#FFF1DD',
  primary: '#6EB9FF',
  secondary: '#B4E197',
  accent: '#FFD93D',
  coral: '#FF9F9F',
  shadowDark: 'rgba(0,0,0,0.15)',
  shadowAmbient: 'rgba(0,0,0,0.10)',
  insetHighlight: 'rgba(255,255,255,0.7)',
  white: '#FFFFFF',
  textPrimary: '#1A2744',
  textSecondary: '#4A5568',
  textMuted: '#94A3B8',
  error: '#FF6B6B',
  success: '#4CAF50',
} as const;

export const COLOR_MAP = {
  yellow: '#FFD93D',
  blue: '#6EB9FF',
  green: '#B4E197',
  coral: '#FF9F9F',
  white: '#FFFFFF',
  lavender: '#C4B5FD',
  cream: '#FFE9C2',
  orange: '#FF8C42',
  purple: '#A855F7',
  teal: '#14B8A6',
  pink: '#F472B6',
} as const;

export type ClayColor = keyof typeof COLOR_MAP;

// Premium clay shadows — soft, multi-layered
export const SHADOWS = {
  // Subtle inner-clay elevation
  clayXs: {
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  claySm: {
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  clayMd: {
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  clayLg: {
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
  },
  // Lavender glow for Lexi
  lexGlow: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 40,
  pill: 999,
} as const;

export const ANIMATION = {
  spring: { damping: 15, stiffness: 150 },
  press: { damping: 15, stiffness: 200 },
  floatY: -14,
  shimmerDuration: 1500,
  floatDuration: 3000,
} as const;

// Premium 8-pt grid
export const SPACING = {
  '0.5': 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 56,
} as const;

export const FONT = {
  primary: 'System',
  sizes: {
    '2xs': 10,
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
} as const;

// ─── Extended Brand Palette ────────────────────────────────────────────────────
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
  lavender: '#A78BFA',
  lavenderDark: '#7C3AED',
  lavenderLight: '#DDD6FE',
  lavenderSurface: '#F5F3FF',
  cream: '#FFE9C2',
  creamDark: '#E5B97A',
  warmWhite: '#FFFBF0',
  deepSlate: '#1A2744',
  mediumGray: '#4A5568',
  lightGray: '#94A3B8',
  darkBg: '#111827',
  // ── Vibrant new palette ──────────────────────────────────────────
  vibrantOrange: '#FF8C42',
  vibrantOrangeDark: '#D96A1A',
  vibrantOrangeLight: '#FFD4B0',
  electricPurple: '#A855F7',
  electricPurpleDark: '#7C22CE',
  electricPurpleLight: '#E9D5FF',
  neonTeal: '#14B8A6',
  neonTealDark: '#0E7490',
  neonTealLight: '#CCFBF1',
  bubblePink: '#F472B6',
  bubblePinkDark: '#DB2777',
  bubblePinkLight: '#FBCFE8',
} as const;

// ─── Surface palette (per-feature family) ─────────────────────────────────────
// One source of truth for home feature-card coloring.
export const FEATURE_TONES = {
  learning: {
    bg: '#FFF3A3', // soft yellow wash
    surface: '#FFE680',
    accent: BRAND.sunshineYellowDark,
    iconBg: BRAND.sunshineYellow,
  },
  courses: {
    bg: '#E0F0FF', // soft sky wash
    surface: '#C5E4FF',
    accent: BRAND.skyBlueDark,
    iconBg: BRAND.skyBlue,
  },
  games: {
    bg: '#FFE0E0', // soft coral wash
    surface: '#FFD5D5',
    accent: BRAND.coralPinkDark,
    iconBg: BRAND.coralPink,
  },
  pets: {
    bg: '#E5F8DA', // soft mint wash
    surface: '#DFFFD0',
    accent: BRAND.mintGreenDark,
    iconBg: BRAND.mintGreen,
  },
  flashcards: {
    bg: '#FFEFD9', // peach wash
    surface: '#FFE9C2',
    accent: BRAND.creamDark,
    iconBg: BRAND.cream,
  },
  progress: {
    bg: '#E0EAFF', // periwinkle wash
    surface: '#DDE6FF',
    accent: '#5673E5',
    iconBg: '#6B81E8',
  },
  lex: {
    bg: '#F0E9FF',
    surface: '#F5F3FF',
    accent: BRAND.lavenderDark,
    iconBg: BRAND.lavender,
  },
} as const;

export type FeatureTone = keyof typeof FEATURE_TONES;

// ─── Pet Rarity (port from frontend-web) ──────────────────────────────────────
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

// ─── Pet Evolution Stage ─────────────────────────────────────────────────────
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

// ─── Course Category Palette ─────────────────────────────────────────────────
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

// ─── Pet Care Stat Colors ─────────────────────────────────────────────────────
export const CARE_STAT_COLORS = {
  happiness: '#5B8DEF',
  energy: '#7BC67E',
  hunger: '#FFB347',
  xp: '#FFB347',
  streak: '#FF9F9F',
  active: '#34D399',
  activeMuted: '#10B981',
} as const;

// ─── Claymorphic Variant Layer ───────────────────────────────────────────────
export const CLAY_TONE_SHADOWS = {
  yellow: { offsetY: 6, color: BRAND.sunshineYellowDark },
  blue: { offsetY: 6, color: BRAND.skyBlueDark },
  green: { offsetY: 6, color: BRAND.mintGreenDark },
  pink: { offsetY: 6, color: BRAND.coralPinkDark },
  lavender: { offsetY: 6, color: BRAND.lavenderDark },
  white: { offsetY: 6, color: '#E2E8F0' },
  orange: { offsetY: 6, color: BRAND.vibrantOrangeDark },
  purple: { offsetY: 6, color: BRAND.electricPurpleDark },
  teal: { offsetY: 6, color: BRAND.neonTealDark },
} as const;

// ─── Motion Durations ────────────────────────────────────────────────────────
export const MOTION = {
  duration: { fast: 150, normal: 250, slow: 600, reveal: 600 },
  easing: {
    springBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    springSubtle: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
    standard: 'ease',
  },
  loop: { float: 4000, shimmer: 2000, xpPulse: 2000, floatDelay: 3500 },
  stagger: 100,
} as const;

export const CLAYMORPHIC_SPRINGS = {
  buttonPress: { damping: 15, stiffness: 200, mass: 1 },
  cardReveal: { damping: 12, stiffness: 180, mass: 1 },
  modalBounce: { damping: 11, stiffness: 220, mass: 1 },
  toast: { damping: 18, stiffness: 240, mass: 1 },
} as const;

// ─── Helper: withOpacity ─────────────────────────────────────────────────────
export function withOpacity(color: string, opacity: number): string {
  const hex = color.replace('#', '');
  if (hex.length !== 6) return color;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Type Exports ────────────────────────────────────────────────────────────
export type BrandColor = keyof typeof BRAND;
export type RarityColor = PetRarity;
export type CareStatColor = keyof typeof CARE_STAT_COLORS;
export type ClayTone = keyof typeof CLAY_TONE_SHADOWS;
