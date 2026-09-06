// Shared UI components for step components

import React from 'react';

// Status pill component
export const StatusPill: React.FC<{ children: React.ReactNode; tone?: string }> = ({
  children,
  tone = '#FFFFFF',
}) => (
  <span
    className="inline-flex rounded-full border-4 border-white px-3 py-1 text-xs font-black text-slate-700 shadow-[0_4px_0_rgba(15,23,42,0.08)]"
    style={{ background: tone }}
  >
    {children}
  </span>
);

// Action button component
export const ActionButton: React.FC<{
  children: React.ReactNode;
  tone?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, tone = '#FFD93D', onClick, disabled, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="min-h-12 rounded-[20px] border-4 border-white px-4 py-3 text-sm font-black text-slate-800 shadow-[0_6px_0_rgba(148,163,184,0.14)] transition disabled:cursor-not-allowed disabled:opacity-50"
    style={{ background: tone }}
  >
    {children}
  </button>
);

// Practice feedback component
export interface PracticeSummary {
  transcript: string;
  score: number;
  passed: boolean;
  feedback: string;
}

export const PracticeFeedback: React.FC<{
  result?: PracticeSummary | null;
  emptyText: string;
}> = ({ result, emptyText }) => (
  <div className="rounded-[24px] border-4 border-white bg-white/90 p-4 shadow-[0_6px_0_rgba(148,163,184,0.08)]">
    {result ? (
      <>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={result.passed ? '#EEF9E7' : '#FFE7E3'}>
            {result.passed ? 'Passed' : 'Try again'}
          </StatusPill>
          <StatusPill tone="#EAF5FF">{result.score}%</StatusPill>
        </div>
        <p className="mt-3 text-sm font-black text-slate-700">{result.feedback}</p>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Heard: {result.transcript || '...'}
        </p>
      </>
    ) : (
      <p className="text-sm font-semibold text-slate-500">{emptyText}</p>
    )}
  </div>
);

// Get status tone color
export const statusTone = (status?: string) => {
  if (status === 'completed') return '#EEF9E7';
  if (status === 'needs_retry') return '#FFE7E3';
  if (status === 'in_progress') return '#EAF5FF';
  return '#FFFFFF';
};
