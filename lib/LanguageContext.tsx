import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { defaultLanguage, getSystemLanguage, translate, languageNames, SupportedLanguage } from '../i18n'

type LanguageContextType = {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: (key: string, params?: Record<string, string | number>) => string
  languages: { code: SupportedLanguage; name: string }[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(defaultLanguage)

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('app_language')
        if (saved && (languageNames as any)[saved]) {
          setLanguageState(saved as SupportedLanguage)
        } else {
          setLanguageState(getSystemLanguage())
        }
      } catch {
        setLanguageState(defaultLanguage)
      }
    })()
  }, [])

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang)
    AsyncStorage.setItem('app_language', lang).catch(() => {})
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(language, key, params)
  }, [language])

  const languages = useMemo(
    () => (Object.keys(languageNames) as SupportedLanguage[]).map((code) => ({ code, name: languageNames[code] })),
    []
  )

  const value = useMemo(() => ({ language, setLanguage, t, languages }), [language, setLanguage, t, languages])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
