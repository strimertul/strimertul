import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APPNAME } from '~/ui/theme';
import { resources } from './languages';

void i18n.use(initReactI18next).init({
  resources,
  lng: navigator.language,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
    defaultVariables: {
      APPNAME,
    },
  },
});
