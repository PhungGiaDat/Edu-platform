/**
 * i18n — lightweight, dependency-free translation provider.
 * Supports nested keys (e.g. "pets.mood.idle") and {placeholder} interpolation.
 * RN-compatible: no DOM, no native modules.
 */
import en from './en.json';
import vi from './vi.json';

export type LocaleCode = 'en' | 'vi';

export const SUPPORTED_LOCALES: readonly LocaleCode[] = ['en', 'vi'] as const;

export const DEFAULT_LOCALE: LocaleCode = 'en';

export type Translations = typeof en;

export const RESOURCES: Record<LocaleCode, Translations> = {
  en,
  vi,
};

export type TranslationKey = NestedPaths<Translations>;

type NestedPaths<T, Prev extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prev}${K}`
    : NestedPaths<T[K], `${Prev}${K}.`>;
}[keyof T & string];

export interface InterpolationValues {
  [key: string]: string | number;
}

const getNested = (obj: Translations, path: string): string | undefined => {
  const segments = path.split('.');
  let cursor: unknown = obj;
  for (const segment of segments) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return typeof cursor === 'string' ? cursor : undefined;
};

const interpolate = (template: string, values?: InterpolationValues): string => {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in values ? String(values[key]) : match;
  });
};

export const translate = (
  key: TranslationKey,
  locale: LocaleCode = DEFAULT_LOCALE,
  values?: InterpolationValues
): string => {
  const resource = RESOURCES[locale] ?? RESOURCES[DEFAULT_LOCALE];
  const value = getNested(resource, key);
  if (value === undefined) return key;
  return interpolate(value, values);
};

export default translate;
