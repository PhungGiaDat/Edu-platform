import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClayCard } from '@/components/clay/ClayCard';
import { ClayButton } from '@/components/clay/ClayButton';

const bgLayers = {
  page: {
    background:
      'radial-gradient(circle at 12% 18%, rgba(255, 217, 61, 0.35), transparent 46%), radial-gradient(circle at 88% 84%, rgba(180, 225, 151, 0.35), transparent 42%), linear-gradient(135deg, #f7fbff 0%, #fff8ed 52%, #edf9ff 100%)',
  },
  mascot: {
    background:
      'radial-gradient(circle at 50% 12%, rgba(255,255,255,0.8), rgba(255,255,255,0) 50%), linear-gradient(165deg, #6eb9ff 0%, #72c7ff 36%, #9dd8ff 100%)',
  },
} as const;

const EyeIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();
  const { login, enterGuestMode, isLoading } = useAuth();

  const errorText = useMemo(() => localError.trim(), [localError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const result = await login(email, password);
    if (result.success) {
      navigate('/courses');
      return;
    }
    setLocalError(result.error || 'Login failed');
  };

  const handleTryWithoutAccount = () => {
    enterGuestMode();
    navigate('/courses');
  };

  return (
    <div className="absolute inset-0 z-50 min-h-screen w-full overflow-hidden" style={bgLayers.page}>
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col lg:flex-row lg:items-stretch">
        <section className="flex w-full items-center justify-center px-4 py-10 sm:px-8 lg:w-[44%]">
          <ClayCard
            color="warmWhite"
            size="lg"
            hover={false}
            className="w-full max-w-[560px] p-6 sm:p-8"
            style={{ border: '3px solid #e6eef8' }}
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                style={{ background: 'linear-gradient(145deg, #ffb347, #f09a2f)', boxShadow: '0 6px 0 #d5811f' }}
              >
                <span className="text-xl">B</span>
              </div>
              <p className="text-2xl font-black text-slate-800">EduPlatform</p>
            </div>

            <div className="mb-6">
              <h1 className="font-['Baloo_2'] text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                Welcome back
              </h1>
              <p className="mt-2 text-base text-slate-600 sm:text-lg">
                Continue learning with AR flashcards, games, and your progress streak.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {errorText && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorText}
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@example.com"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-sky-400"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-sky-400"
                  required
                />
              </label>

              <ClayButton type="submit" variant="blue" size="lg" fullWidth disabled={isLoading}>
                {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              </ClayButton>

              <ClayButton type="button" variant="green" size="md" fullWidth onClick={handleTryWithoutAccount} icon={<EyeIcon />}>
                TRY WITHOUT ACCOUNT
              </ClayButton>

              <p className="text-center text-xs text-slate-500 sm:text-sm">
                Guest mode: AR + courses only (read-only), no pets, no session saving.
              </p>

              <p className="pt-1 text-center text-sm text-slate-600 sm:text-base">
                New here?{' '}
                <Link to="/register" className="font-bold text-sky-700 hover:text-sky-800">
                  Create an account
                </Link>
              </p>
            </form>
          </ClayCard>
        </section>

        <section className="hidden flex-1 items-center justify-center p-8 lg:flex">
          <ClayCard
            color="skyBlue"
            size="lg"
            hover={false}
            className="relative w-full max-w-[740px] overflow-hidden p-10 text-white"
            style={{ ...bgLayers.mascot, border: '3px solid #78b9e9' }}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-16 left-8 h-52 w-52 rounded-full bg-[#b4e197]/30 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-100">Learning Adventure</p>
              <h2 className="mt-3 font-['Baloo_2'] text-5xl font-extrabold leading-tight">Scan. Speak. Grow.</h2>
              <p className="mt-4 max-w-xl text-xl text-sky-50">
                Pick a lesson, open AR mode, and practice pronunciation with live feedback.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center font-bold">AR Models</div>
                <div className="rounded-2xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center font-bold">Voice Practice</div>
                <div className="rounded-2xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center font-bold">XP Rewards</div>
              </div>
            </div>
          </ClayCard>
        </section>
      </div>
    </div>
  );
};
