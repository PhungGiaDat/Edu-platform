/**
 * Button - Button component with Claymorphism style
 */
import { colors, shadows } from '../../design-tokens/claymorphic';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: {
      backgroundColor: colors.skyBlue,
      color: 'white',
      boxShadow: shadows.clayBlue,
    },
    secondary: {
      backgroundColor: colors.warmWhite,
      color: colors.deepSlate,
      boxShadow: shadows.clay,
    },
    outline: {
      backgroundColor: 'transparent',
      color: colors.deepSlate,
      border: `2px solid ${colors.lightGray}`,
      boxShadow: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.mediumGray,
      boxShadow: 'none',
    },
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const v = variantStyles[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        ${sizes[size]}
        ${className}
      `}
      style={{
        backgroundColor: v.backgroundColor,
        color: v.color,
        boxShadow: v.boxShadow,
        border: v.border,
        ...(variant === 'primary' && { border: 'none' }),
      }}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : icon ? (
        <span className="text-lg">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
