/**
 * Badge - Tag/Chip component
 */
import { colors } from '../../design-tokens/claymorphic';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  style = {},
}: BadgeProps) {
  const variantColors = {
    primary: { bg: colors.skyBlue + '30', text: colors.skyBlue },
    secondary: { bg: colors.lightGray, text: colors.mediumGray },
    success: { bg: colors.mintGreen + '30', text: colors.mintGreen },
    warning: { bg: colors.sunshineYellow + '30', text: colors.sunshineYellow },
    error: { bg: colors.coralPink + '30', text: colors.coralPink },
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const v = variantColors[variant];

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 font-medium rounded-full
        ${sizes[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
      style={{
        backgroundColor: v.bg,
        color: v.text,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
