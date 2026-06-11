import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import si from './locales/si.json';
import { readStorageItem, writeStorageItem } from './utils/browserStorage';

const savedLanguage = readStorageItem('njstore-language');
const initialLanguage = savedLanguage === 'si' || savedLanguage === 'en' ? savedLanguage : 'en';
const textDirections: Record<string, 'ltr' | 'rtl'> = {
  en: 'ltr',
  si: 'ltr'
};

const syncDocumentLanguage = (language: string): void => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.lang = language;
  document.documentElement.dir = textDirections[language] ?? 'ltr';
};

void i18n.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: 'en',
  debug: false,
  showSupportNotice: false,
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: en },
    si: { translation: si }
  }
});

syncDocumentLanguage(initialLanguage);

i18n.on('languageChanged', (language) => {
  writeStorageItem('njstore-language', language);
  syncDocumentLanguage(language);
});

export default i18n;
