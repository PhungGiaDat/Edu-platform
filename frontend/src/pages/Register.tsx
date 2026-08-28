import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { ClayButton } from '@/shared/components/clay/ClayButton';

const pageBackground =
  'radial-gradient(circle at 15% 20%, rgba(180, 225, 151, 0.32), transparent 45%), radial-gradient(circle at 85% 88%, rgba(255, 179, 71, 0.3), transparent 42%), linear-gradient(140deg, #eefdf4 0%, #fffaf0 48%, #eef7ff 100%)';

const panelBackground =
  'radial-gradient(circle at 52% 16%, rgba(255,255,255,0.78), rgba(255,255,255,0) 52%), linear-gradient(160deg, #94d97d 0%, #72c55d 45%, #7ad0ac 100%)';

const SparkIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M4.9 4.9l2.8 2.8" />
    <path d="M16.3 16.3l2.8 2.8" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
    <path d="M4.9 19.1l2.8-2.8" />
    <path d="M16.3 7.7l2.8-2.8" />
  </svg>
);

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();
  const { register, enterGuestMode, isLoading } = useAuth();
  const { t } = useLocale();

  const errorText = useMemo(() => localError.trim(), [localError]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const result = await register(email, password, name);
    if (result.success) {
      navigate('/courses');
      return;
    }
    setLocalError(result.error || 'Registration failed');
  };

  const handleTryWithoutAccount = () => {
    enterGuestMode();
    navigate('/courses');
  };

  return (
    <div className="absolute inset-0 z-50 min-h-screen w-full overflow-hidden" style={{ background: pageBackground }}>
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col lg:flex-row lg:items-stretch">
        <section className="flex w-full items-center justify-center px-4 py-10 sm:px-8 lg:w-[44%]">
          <ClayCard
            color="warmWhite"
            size="lg"
            hover={false}
            className="w-full max-w-[560px] p-6 sm:p-8"
            style={{ border: '3px solid #e4f2e0' }}
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                style={{ background: 'linear-gradient(145deg, #7fc862, #5dac46)', boxShadow: '0 6px 0 #4f943d' }}
              >
                <span className="text-xl">B</span>
              </div>
              <p className="text-2xl font-black text-slate-800">EduPlatform</p>
            </div>

            <div className="mb-6">
              <h1 className="font-['Baloo_2'] text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                {t('registerTitle')}
              </h1>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {errorText && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorText}
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{t('registerName')}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('registerNamePlaceholder')}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-green-400"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{t('registerEmail')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@example.com"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-green-400"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">{t('registerPassword')}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none transition focus:border-green-400"
                  required
                />
              </label>

              <ClayButton type="submit" variant="green" size="lg" fullWidth disabled={isLoading}>
                {isLoading ? t('registerSubmitting') : t('registerSubmit')}
              </ClayButton>

              <ClayButton
                type="button"
                variant="blue"
                size="md"
                fullWidth
                onClick={handleTryWithoutAccount}
                icon={<SparkIcon />}
              >
                {t('registerTryWithout')}
              </ClayButton>

              <p className="pt-1 text-center text-sm text-slate-600 sm:text-base">
                {t('registerAlready')}{' '}
                <Link to="/login" className="font-bold text-green-700 hover:text-green-800">
                  {t('registerSignIn')}
                </Link>
              </p>
            </form>
          </ClayCard>
        </section>

        <section className="hidden flex-1 items-center justify-center p-8 lg:flex">
          <ClayCard
            color="mintGreen"
            size="lg"
            hover={false}
            className="relative w-full max-w-[740px] overflow-hidden p-10 text-white"
            style={{ background: panelBackground, border: '3px solid #83c873' }}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-16 left-8 h-52 w-52 rounded-full bg-[#ffd93d]/30 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-green-100">Explore English</p>
              <h2 className="mt-3 font-['Baloo_2'] text-5xl font-extrabold leading-tight">Learn in 3D worlds</h2>
              <p className="mt-4 max-w-xl text-xl text-green-50">
                Build vocabulary with interactive scenes, quizzes, and pronunciation feedback.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center font-bold">Courses</div>
                <div className="rounded-2xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center font-bold">AR Practice</div>
                <div className="rounded-2xl border-2 border-white/40 bg-white/20 px-4 py-3 text-center font-bold">Daily Goals</div>
              </div>
            </div>
          </ClayCard>
        </section>
      </div>
    </div>
  );
};
