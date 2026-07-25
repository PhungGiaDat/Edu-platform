/**
 * useLocale — minimal locale provider + hook for React Native.
 * In-memory state with an escape hatch for AsyncStorage persistence.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  RESOURCES,
  SUPPORTED_LOCALES,
  translate,
  type LocaleCode,
  type TranslationKey,
  type InterpolationValues,
} from './index';

export interface UseLocaleResult {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: TranslationKey, values?: InterpolationValues) => string;
  supportedLocales: readonly LocaleCode[];
}

export const useLocale = (): UseLocaleResult => {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  const setLocale = useCallback((next: LocaleCode) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: InterpolationValues) => translate(key, locale, values),
    [locale]
  );

  return useMemo(
    () => ({
      locale,
      setLocale,
      t,
      supportedLocales: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, t]
  );
};

export { DEFAULT_LOCALE, RESOURCES, SUPPORTED_LOCALES, translate };
export type { LocaleCode, TranslationKey };
