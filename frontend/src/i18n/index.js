import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import kn from './locales/kn.json';
import pa from './locales/pa.json';
import ml from './locales/ml.json';

export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  gu: { translation: gu },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
  kn: { translation: kn },
  pa: { translation: pa },
  ml: { translation: ml },
};

const savedLanguage = window.localStorage.getItem('mediconnect-language');
const initialLanguage = supportedLanguages.some(({ code }) => code === savedLanguage)
  ? savedLanguage
  : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem('mediconnect-language', language);
  } catch (error) {
    console.error('Unable to save the language preference:', error);
  }
});

document.documentElement.lang = initialLanguage;

export default i18n;
