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
  mint: 'bg-[#E6F9F4] border-4 border-white shadow-[0_8px_0_#9FE6D4,0_12px_24px_rgba(32,214,164,0.15)] text-slate-900',
  cyan: 'bg-[#E0F4FB] border-4 border-white shadow-[0_8px_0_#96DBF0,0_12px_24px_rgba(32,188,235,0.15)] text-slate-900',
  blue: 'bg-[#E8F3FF] border-4 border-white shadow-[0_8px_0_#A8D0FD,0_12px_24px_rgba(74,159,245,0.15)] text-slate-900',
  purple: 'bg-[#F3E8FF] border-4 border-white shadow-[0_8px_0_#D1B3FC,0_12px_24px_rgba(139,92,246,0.15)] text-slate-900',
  yellow: 'bg-[#FEF8E7] border-4 border-white shadow-[0_8px_0_#FDE08B,0_12px_24px_rgba(255,211,78,0.18)] text-slate-900',
  coral: 'bg-[#FFF0EF] border-4 border-white shadow-[0_8px_0_#FFB8B3,0_12px_24px_rgba(255,120,110,0.15)] text-slate-900',
  emerald: 'bg-[#ECFDF5] border-4 border-white shadow-[0_8px_0_#A7F3D0,0_12px_24px_rgba(16,185,129,0.15)] text-slate-900',
  white: 'bg-white/95 border-4 border-slate-100 shadow-[0_8px_0_#CBD5E1,0_12px_24px_rgba(0,0,0,0.06)] text-slate-900',
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
  mint: 'bg-[#E6F9F4] text-emerald-800 border border-emerald-300 shadow-[0_2px_0_#A7F3D0]',
  cyan: 'bg-[#E0F4FB] text-sky-900 border border-sky-300 shadow-[0_2px_0_#96DBF0]',
  blue: 'bg-[#E8F3FF] text-blue-900 border border-blue-300 shadow-[0_2px_0_#A8D0FD]',
  purple: 'bg-[#F3E8FF] text-purple-900 border border-purple-300 shadow-[0_2px_0_#D1B3FC]',
  yellow: 'bg-[#FEF8E7] text-amber-900 border border-amber-300 shadow-[0_2px_0_#FDE08B]',
  coral: 'bg-[#FFF0EF] text-rose-900 border border-rose-300 shadow-[0_2px_0_#FFB8B3]',
  emerald: 'bg-[#ECFDF5] text-emerald-900 border border-emerald-300 shadow-[0_2px_0_#A7F3D0]',
  white: 'bg-white text-slate-700 border border-slate-200 shadow-[0_2px_0_#E2E8F0]',
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
