import i18n from 'i18next';
import { initReactI18next } from '../../node_modules/react-i18next';
import enAdmin from './locales/en/admin.json';
import viAdmin from './locales/vi/admin.json';

const STORAGE_KEY = 'edu-platform-locale';

const getInitialLanguage = () => {
  try {
    const storedLocale = localStorage.getItem(STORAGE_KEY);
    return storedLocale === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: enAdmin },
      vi: { translation: viAdmin },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

export default i18n;
