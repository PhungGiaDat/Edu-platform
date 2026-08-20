/**
 * LoadingSpinner - Loading spinner component
 */
import { colors } from '../../design-tokens/claymorphic';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = colors.skyBlue,
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div
      className={`${sizes[size]} animate-spin`}
      role="status"
      aria-label="Loading"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="32"
          strokeDashoffset="12"
          style={{ color }}
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
