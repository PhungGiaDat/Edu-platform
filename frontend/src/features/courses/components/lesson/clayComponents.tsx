import React from 'react';

/**
 * Reusable Claymorphic Primitives for the Young Learner Lesson Experience
 * Implements the "Soft 3D Toy UI" specification:
 * - Tinted pastel/vibrant surfaces (Mint, Cyan, Blue, Purple, Yellow, Coral)
 * - Chunky 24-28px radius with 3-4px border highlights
 * - Visible darker bottom extrusion depth (4px - 8px)
 * - Tactile active/pressed states that depress the extrusion
 */

export type ClayColor = 'mint' | 'cyan' | 'blue' | 'purple' | 'yellow' | 'coral' | 'emerald' | 'white';

interface ClayStageProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: ClayColor;
  className?: string;
  children: React.ReactNode;
}

const STAGE_COLOR_STYLES: Record<ClayColor, string> = {
  mint: 'bg-[#B8F0DD] border-4 border-white shadow-[0_10px_0_#4FCFA0,0_16px_28px_rgba(32,214,164,0.28)] text-slate-900',
  cyan: 'bg-[#AEE6F7] border-4 border-white shadow-[0_10px_0_#2FAEDA,0_16px_28px_rgba(32,188,235,0.28)] text-slate-900',
  blue: 'bg-[#BBD9FE] border-4 border-white shadow-[0_10px_0_#5B96EE,0_16px_28px_rgba(74,159,245,0.28)] text-slate-900',
  purple: 'bg-[#DABCFB] border-4 border-white shadow-[0_10px_0_#9D5EF0,0_16px_28px_rgba(139,92,246,0.28)] text-slate-900',
  yellow: 'bg-[#FCE59A] border-4 border-white shadow-[0_10px_0_#F0B72B,0_16px_28px_rgba(255,211,78,0.3)] text-slate-900',
  coral: 'bg-[#FFC4BE] border-4 border-white shadow-[0_10px_0_#F24E42,0_16px_28px_rgba(255,120,110,0.28)] text-slate-900',
  emerald: 'bg-[#A0F0CB] border-4 border-white shadow-[0_10px_0_#22C481,0_16px_28px_rgba(16,185,129,0.28)] text-slate-900',
  white: 'bg-white border-4 border-slate-100 shadow-[0_10px_0_#CBD5E1,0_16px_28px_rgba(0,0,0,0.08)] text-slate-900',
};

export const ClayStage: React.FC<ClayStageProps> = ({
  color = 'cyan',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-[28px] p-4 sm:p-5 transition-all duration-300 relative overflow-hidden ${STAGE_COLOR_STYLES[color]} ${className}`}
      {...props}
    >
      {/* Subtle top gloss highlight */}
      <div className="pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-white/30 blur-2xl" />
      {children}
    </div>
  );
};

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'emerald' | 'yellow' | 'blue' | 'purple' | 'coral' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const BUTTON_STYLES = {
  emerald: 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-[0_6px_0_#0D9488,0_8px_16px_rgba(13,148,136,0.25)] hover:brightness-105 active:shadow-[0_2px_0_#0D9488]',
  yellow: 'bg-gradient-to-r from-[#FFD34E] to-[#FBBF24] text-slate-900 shadow-[0_6px_0_#D97706,0_8px_16px_rgba(217,119,6,0.25)] hover:brightness-105 active:shadow-[0_2px_0_#D97706]',
  blue: 'bg-gradient-to-r from-[#4A9FF5] to-[#2563EB] text-white shadow-[0_6px_0_#1D4ED8,0_8px_16px_rgba(29,78,216,0.25)] hover:brightness-105 active:shadow-[0_2px_0_#1D4ED8]',
  purple: 'bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white shadow-[0_6px_0_#4F46E5,0_8px_16px_rgba(79,70,229,0.25)] hover:brightness-105 active:shadow-[0_2px_0_#4F46E5]',
  coral: 'bg-gradient-to-r from-[#FF786E] to-[#F43F5E] text-white shadow-[0_6px_0_#BE123C,0_8px_16px_rgba(190,18,60,0.25)] hover:brightness-105 active:shadow-[0_2px_0_#BE123C]',
  ghost: 'bg-white/90 border-2 border-slate-200 text-slate-700 shadow-[0_4px_0_#CBD5E1] hover:bg-white active:shadow-[0_1px_0_#CBD5E1]',
};

const BUTTON_SIZES = {
  sm: 'min-h-[44px] px-3.5 py-1.5 text-xs font-black rounded-xl border-2 border-white/80',
  md: 'min-h-[50px] px-5 py-2.5 text-sm sm:text-base font-black rounded-2xl border-2 border-white',
  lg: 'min-h-[56px] px-6 py-3 text-base sm:text-lg font-black rounded-2xl border-3 border-white',
};

export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = 'emerald',
  size = 'lg',
  fullWidth = true,
  className = '',
  disabled,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:translate-y-1 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_currentColor] ${
        fullWidth ? 'w-full' : ''
      } ${BUTTON_STYLES[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface ClayPillProps {
  color?: ClayColor;
  className?: string;
  children: React.ReactNode;
}

const PILL_STYLES: Record<ClayColor, string> = {
  mint: 'bg-[#8FE6C4] text-emerald-950 border-2 border-white shadow-[0_3px_0_#22C481]',
  cyan: 'bg-[#83D9F2] text-sky-950 border-2 border-white shadow-[0_3px_0_#2FAEDA]',
  blue: 'bg-[#9CC3FD] text-blue-950 border-2 border-white shadow-[0_3px_0_#5B96EE]',
  purple: 'bg-[#C79BF9] text-purple-950 border-2 border-white shadow-[0_3px_0_#9D5EF0]',
  yellow: 'bg-[#FBD65C] text-amber-950 border-2 border-white shadow-[0_3px_0_#F0B72B]',
  coral: 'bg-[#FF9E94] text-rose-950 border-2 border-white shadow-[0_3px_0_#F24E42]',
  emerald: 'bg-[#7BE8B8] text-emerald-950 border-2 border-white shadow-[0_3px_0_#22C481]',
  white: 'bg-white text-slate-700 border-2 border-slate-200 shadow-[0_3px_0_#E2E8F0]',
};

export const ClayPill: React.FC<ClayPillProps> = ({
  color = 'cyan',
  className = '',
  children,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-full ${PILL_STYLES[color]} ${className}`}
    >
      {children}
    </span>
  );
};
