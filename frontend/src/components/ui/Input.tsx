/**
 * Input - Text input component
 */
import { colors } from '../../design-tokens/claymorphic';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  error,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        className={`
          w-full px-4 py-3 rounded-xl text-base
          transition-all duration-200
          focus:outline-none focus:ring-2
          placeholder:text-gray-400
          ${icon ? 'pl-10' : ''}
          ${className}
        `}
        style={{
          backgroundColor: colors.warmWhite,
          border: `2px solid ${error ? colors.coralPink : colors.lightGray}`,
          color: colors.deepSlate,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        }}
        {...props}
      />
      {error && (
        <p className="text-sm mt-1" style={{ color: colors.coralPink }}>
          {error}
        </p>
      )}
    </div>
  );
}
