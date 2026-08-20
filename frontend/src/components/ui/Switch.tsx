/**
 * Switch - Toggle component
 */
import { colors } from '../../design-tokens/claymorphic';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  activeColor = colors.neonTeal,
  size = 'md',
}: SwitchProps) {
  const sizes = {
    sm: { w: 36, h: 20, dot: 16 },
    md: { w: 48, h: 26, dot: 22 },
    lg: { w: 56, h: 30, dot: 26 },
  };

  const s = sizes[size];
  const bgColor = checked ? activeColor : colors.lightGray;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex shrink-0 cursor-pointer rounded-full
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
      `}
      style={{
        width: s.w,
        height: s.h,
        backgroundColor: bgColor,
        boxShadow: checked
          ? `0 2px 8px ${activeColor}40`
          : `inset 0 1px 3px rgba(0,0,0,0.1)`,
      }}
    >
      <span
        className="pointer-events-none rounded-full shadow-md transform transition-transform duration-200 ease-in-out"
        style={{
          width: s.dot,
          height: s.dot,
          backgroundColor: 'white',
          margin: (s.h - s.dot) / 2,
          transform: checked ? `translateX(${s.w - s.dot - (s.h - s.dot)})` : 'translateX(0)',
        }}
      />
    </button>
  );
}
