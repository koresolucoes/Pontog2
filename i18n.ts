import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './i18n/locales/en.json';
import ptTranslations from './i18n/locales/pt.json';
import esTranslations from './i18n/locales/es.json';

const resources = {
  en: {
    translation: enTranslations
  },
  pt: {
    translation: ptTranslations
  },
  es: {
    translation: esTranslations
  }
};

i18n
  .use(LanguageDetector) // Detects user language automatically
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: 'pt', // Default to Portuguese if not found
    supportedLngs: ['en', 'pt', 'es'],
    interpolation: {
      escapeValue: false // React already safes from xss
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;
