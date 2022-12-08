import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APPNAME } from '~/ui/theme';

import en from './en/translation.json';
import it from './it/translation.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en,
    },
    it: {
      translation: it,
    },
  },
  lng: navigator.language,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
    defaultVariables: {
      APPNAME,
    },
  },
});
