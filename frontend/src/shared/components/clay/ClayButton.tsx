import React, { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';
import { colors, shadows, radius } from '@/design-tokens/claymorphic';

export type ClayButtonVariant = 'yellow' | 'blue' | 'green' | 'pink' | 'white';
export type ClayButtonSize = 'sm' | 'md' | 'lg';

export interface ClayButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  children: ReactNode;
  variant?: ClayButtonVariant;
  size?: ClayButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

/**
 * ClayButton - Reusable claymorphic button component
 * 
 * Features:
 * - 5 color variants (yellow, blue, green, pink, white)
 * - 3 sizes (sm, md, lg) with proper touch targets
 * - Spring physics hover/active states
 * - Icon support (left or right)
 * - Full width option
 * 
 * @example
 * <ClayButton variant="yellow" size="lg" icon={<ArrowIcon />}>
 *   Get Started
 * </ClayButton>
 */
export const ClayButton: React.FC<ClayButtonProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  icon,
  iconPosition = 'right',
  fullWidth = false,
  className = '',
  ...rest
}) => {
  const variantMap: Record<ClayButtonVariant, { bg: string; shadow: string; color: string }> = {
    yellow: { bg: colors.sunshineYellow, shadow: shadows.clayYellow, color: colors.deepSlate },
    blue: { bg: colors.skyBlue, shadow: shadows.clayBlue, color: '#fff' },
    green: { bg: colors.mintGreen, shadow: shadows.clayGreen, color: colors.deepSlate },
    pink: { bg: colors.coralPink, shadow: shadows.clayPink, color: '#fff' },
    white: { bg: '#fff', shadow: shadows.clayWhite, color: colors.deepSlate },
  };

  const sizeMap = {
    sm: { padding: '10px 18px', fontSize: '15px', minHeight: '44px' },
    md: { padding: '16px 32px', fontSize: '17px', minHeight: '56px' },
    lg: { padding: '18px 36px', fontSize: '18px', minHeight: '60px' },
  };

  const styles: CSSProperties = {
    background: variantMap[variant].bg,
    boxShadow: variantMap[variant].shadow,
    color: variantMap[variant].color,
    borderRadius: radius.xl,
    padding: sizeMap[size].padding,
    fontSize: sizeMap[size].fontSize,
    minHeight: sizeMap[size].minHeight,
    fontWeight: 900,
    border: 'none',
    cursor: rest.disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
    width: fullWidth ? '100%' : 'auto',
    opacity: rest.disabled ? 0.6 : 1,
  };

  return (
    <button
      className={`clay-btn-component clay-btn-${variant} ${className}`}
      style={styles}
      {...rest}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
      
      <style>{`
        .clay-btn-component:hover:not(:disabled) {
          transform: translateY(-3px);
        }
        .clay-btn-component:active:not(:disabled) {
          transform: translateY(3px);
        }
      `}</style>
    </button>
  );
};
