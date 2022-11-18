import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en/translation.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
  },
  lng: navigator.language,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});
