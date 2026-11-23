import React, { CSSProperties, ReactNode } from 'react';
import { colors } from '@/design-tokens/claymorphic';

export type ClayBadgeVariant = 'yellow' | 'blue' | 'green' | 'pink';

export interface ClayBadgeProps {
  children: ReactNode;
  variant?: ClayBadgeVariant;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * ClayBadge - Reusable claymorphic badge/pill component
 * 
 * Features:
 * - 4 color variants matching brand colors
 * - Fully rounded pill shape
 * - Optional icon support
 * - 3D shadow effect
 * 
 * @example
 * <ClayBadge variant="yellow" icon={<StarIcon />}>
 *   Most Popular
 * </ClayBadge>
 */
export const ClayBadge: React.FC<ClayBadgeProps> = ({
  children,
  variant = 'yellow',
  icon,
  className = '',
  style = {},
}) => {
  const variantMap: Record<ClayBadgeVariant, { bg: string; shadow: string; color: string }> = {
    yellow: { 
      bg: colors.sunshineYellow, 
      shadow: `0 3px 0 ${colors.sunshineYellowDark}`, 
      color: colors.deepSlate 
    },
    blue: { 
      bg: colors.skyBlue, 
      shadow: `0 3px 0 ${colors.skyBlueDark}`, 
      color: '#fff' 
    },
    green: { 
      bg: colors.mintGreen, 
      shadow: `0 3px 0 ${colors.mintGreenDark}`, 
      color: colors.deepSlate 
    },
    pink: { 
      bg: colors.coralPink, 
      shadow: `0 3px 0 ${colors.coralPinkDark}`, 
      color: colors.deepSlate 
    },
  };

  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '99px',
    padding: '6px 16px',
    fontWeight: 800,
    fontSize: '13px',
    background: variantMap[variant].bg,
    boxShadow: variantMap[variant].shadow,
    color: variantMap[variant].color,
    ...style,
  };

  return (
    <span
      className={`clay-badge-component clay-badge-${variant} ${className}`}
      style={baseStyles}
    >
      {icon && icon}
      {children}
    </span>
  );
};
