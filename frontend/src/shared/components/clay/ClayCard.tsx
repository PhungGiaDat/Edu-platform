import React, { CSSProperties, ReactNode } from 'react';
import { colors, shadows, radius } from '@/design-tokens/claymorphic';

export interface ClayCardProps {
  children: ReactNode;
  color?: keyof typeof colors;
  size?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  staggerDelay?: number;
}

/**
 * ClayCard - Reusable claymorphic card component
 * 
 * Features:
 * - Three sizes (sm, md, lg) with different shadow depths
 * - Optional hover effect with spring physics
 * - Stagger animation support
 * - Customizable background color
 * 
 * @example
 * <ClayCard color="mintGreen" size="md" hover>
 *   <h3>My Card</h3>
 * </ClayCard>
 */
export const ClayCard: React.FC<ClayCardProps> = ({
  children,
  color = 'warmWhite',
  size = 'md',
  hover = true,
  className = '',
  style = {},
  onClick,
  staggerDelay = 0,
}) => {
  const sizeMap = {
    sm: { shadow: shadows.claySm, radius: radius['2xl'] },
    md: { shadow: shadows.clay, radius: radius['3xl'] },
    lg: { shadow: shadows.clayLg, radius: radius['4xl'] },
  };

  const baseStyles: CSSProperties = {
    backgroundColor: colors[color],
    borderRadius: sizeMap[size].radius,
    boxShadow: sizeMap[size].shadow,
    transition: `transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease`,
    transitionDelay: `${staggerDelay}ms`,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  return (
    <div
      className={`clay-card-component ${hover ? 'clay-card-hover' : 'clay-card-no-hover'} ${className}`}
      style={baseStyles}
      onClick={onClick}
    >
      {children}
      
      <style>{`
        .clay-card-hover:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: ${sizeMap.lg.shadow};
        }
        .clay-card-no-hover:hover {
          transform: none;
        }
      `}</style>
    </div>
  );
};
