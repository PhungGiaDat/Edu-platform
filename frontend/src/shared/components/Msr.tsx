/**
 * Msr — Material Symbols Rounded glyph (shared).
 * Font loaded via Google Fonts in index.html; variation settings in global.css.
 */
import React from 'react';

export const Msr: React.FC<{
  icon: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ icon, size = 20, color, style }) => (
  <span
    aria-hidden="true"
    className="msr"
    style={{ fontSize: size, color, ...style }}
  >
    {icon}
  </span>
);

export default Msr;
