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
  const getStyles = () => {
    const base = {
      primary: {
        backgroundColor: colors.skyBlue,
        color: 'white',
        boxShadow: shadows.clayBlue,
        border: 'none' as const,
      },
      secondary: {
        backgroundColor: colors.warmWhite,
        color: colors.deepSlate,
        boxShadow: shadows.clay,
        border: 'none' as const,
      },
      outline: {
        backgroundColor: 'transparent',
        color: colors.deepSlate,
        boxShadow: 'none',
        border: `2px solid ${colors.lightGray}`,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.mediumGray,
        boxShadow: 'none',
        border: 'none' as const,
      },
    };
    return base[variant];
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const style = getStyles();

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
      style={style}
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
