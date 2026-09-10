// frontend/src/__tests__/contexts/localeContext.test.tsx
/**
 * App-wide language setting (approved approach C — hybrid bridge):
 * - setLocale persists to localStorage and translates dict keys immediately
 * - t() falls through to the global i18next instance for keys that only
 *   exist in JSON (admin.* / learner.*)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LocaleProvider, useLocale } from '../../contexts/LocaleContext';

function Probe() {
  const { locale, setLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="hero">{t('gamesHeroTitle')}</span>
      <span data-testid="ceiling">{t('gamesTodayCeiling', { done: 2, ceiling: 12, games: 3, topics: 4 })}</span>
      <button onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}>toggle ({locale})</button>
    </div>
  );
}

describe('LocaleProvider — app-wide language setting', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('edu-platform-locale', 'en');
    localStorage.setItem('edu-platform-locale-auto-detected', '1');
  });
  afterEach(() => cleanup());

  it('renders English dict copy by default when stored locale is en', () => {
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByTestId('hero').textContent).toBe('Play with Lexi!');
  });

  it('interpolates {{var}} params in dict keys', () => {
    render(<LocaleProvider><Probe /></LocaleProvider>);
    expect(screen.getByTestId('ceiling').textContent).toBe('Today: 2/12 rounds · 3 games × 4 topics');
  });

  it('switches language immediately and persists to localStorage', () => {
    render(<LocaleProvider><Probe /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('hero').textContent).toBe('Chơi cùng Lexi nhé!');
    expect(localStorage.getItem('edu-platform-locale')).toBe('vi');
  });

  it('bridges keys missing from the dict to the global i18next instance', () => {
    // 'admin.dashboard.createCourse' exists only in admin.json (i18n instance),
    // NOT in the LocaleContext dict — the hybrid fallback must resolve it.
    render(
      <LocaleProvider>
        <BridgeProbe i18nKey="admin.dashboard.createCourse" />
      </LocaleProvider>,
    );
    const text = screen.getByTestId('bridged').textContent ?? '';
    expect(text).not.toBe('admin.dashboard.createCourse'); // not a raw key
    expect(text.length).toBeGreaterThan(0);
  });
});

function BridgeProbe({ i18nKey }: { i18nKey: string }) {
  const { t } = useLocale();
  return <span data-testid="bridged">{t(i18nKey)}</span>;
}
