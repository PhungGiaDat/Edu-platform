/**
 * Dictionary feature icons — inline SVG only (spec 2026-08-30).
 *
 * Shared contract for every icon in this family:
 * 24×24 viewBox, `fill="none"`, `stroke="currentColor"`, `stroke-width 2.5`,
 * round caps/joins, and `aria-hidden="true"` so the icon never contributes an
 * accessible name (the surrounding control owns the label).
 */
import React from 'react';

export interface IconProps {
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Magnifier — lookup / search actions */
export const SearchIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/** Open book — definitions, word analysis */
export const BookIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 7h8M8 11h6" />
  </svg>
);

/** Bookmark/save — the single amber "Lưu vào Sổ tay" job */
export const SaveIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
  </svg>
);

/** Globe — language / related-word context */
export const GlobeIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
  </svg>
);

/** Triangle alert — recoverable problems (never emoji) */
export const AlertIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

/** Sparkle — explanations, hints, AI context */
export const SparkleIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z" />
    <path d="M18 16.5l.8 2.2l2.2.8l-2.2.8l-.8 2.2l-.8-2.2l-2.2-.8l2.2-.8.8-2.2z" />
  </svg>
);

/** Check — confirmation state (saved), replaces the ✓ glyph */
export const CheckIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Down arrow — English → Vietnamese flow, replaces the ⬇️ emoji */
export const ArrowDownIcon: React.FC<IconProps> = ({ className = 'h-5 w-5' }) => (
  <svg {...base} className={className}>
    <path d="M12 4v16" />
    <path d="m6 14 6 6 6-6" />
  </svg>
);
