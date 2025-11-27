import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import en from '../i18n/en.json'
import hi from '../i18n/hi.json'
import bn from '../i18n/bn.json'
import mr from '../i18n/mr.json'
import ta from '../i18n/ta.json'
import te from '../i18n/te.json'
import kn from '../i18n/kn.json'
import gu from '../i18n/gu.json'
import ml from '../i18n/ml.json'
import pa from '../i18n/pa.json'

// Supported language codes
export type SupportedLanguage = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'kn' | 'gu' | 'ml' | 'pa'

// Language display metadata (avoids duplication elsewhere)
export const languageMeta: { code: SupportedLanguage; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
]

export async function storeLanguage(lang: SupportedLanguage) {
  try { await AsyncStorage.setItem('app_language', lang) } catch {}
}

export async function getStoredLanguage(): Promise<SupportedLanguage> {
  try {
    const v = await AsyncStorage.getItem('app_language') as SupportedLanguage | null
    return (v && languageMeta.some(l => l.code === v)) ? v : 'en'
  } catch { return 'en' }
}

const resources = {
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
}

// Initialize i18n immediately; language will be corrected after storage load
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    keySeparator: '.',
    interpolation: { escapeValue: false },
  })
}

getStoredLanguage().then((lng) => i18n.changeLanguage(lng))

export default i18n
