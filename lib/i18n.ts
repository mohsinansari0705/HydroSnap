import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import mr from '../locales/mr.json';
import ta from '../locales/ta.json';
import te from '../locales/te.json';
import kn from '../locales/kn.json';
import gu from '../locales/gu.json';
import ml from '../locales/ml.json';
import pa from '../locales/pa.json';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Get stored language
const getStoredLanguage = async (): Promise<string> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return language || 'en';
  } catch (error) {
    console.error('Error reading language from storage:', error);
    return 'en';
  }
};

// Store language preference
export const storeLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('Error storing language:', error);
  }
};

// Initialize i18n
const initI18n = async () => {
  const storedLanguage = await getStoredLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
        bn: { translation: bn },
        mr: { translation: mr },
        ta: { translation: ta },
        te: { translation: te },
        kn: { translation: kn },
        gu: { translation: gu },
        ml: { translation: ml },
        pa: { translation: pa },
      },
      lng: storedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

// Initialize immediately
initI18n();

export default i18n;
