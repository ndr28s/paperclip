import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en/translation.json';
import ko from '../locales/ko/translation.json';

const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('paperclip-language') : null;
const initialLang = savedLang === 'en' || savedLang === 'ko' ? savedLang : 'ko';

// Ensure the stored value is valid (migrates any old/invalid value to 'ko')
if (typeof localStorage !== 'undefined' && savedLang !== initialLang) {
  localStorage.setItem('paperclip-language', initialLang);
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
    },
    lng: initialLang,
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
