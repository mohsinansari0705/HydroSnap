export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'bn'
  | 'mr'
  | 'ta'
  | 'te'
  | 'kn'
  | 'gu'
  | 'ml'
  | 'pa'

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  gu: 'Gujarati',
  ml: 'Malayalam',
  pa: 'Punjabi',
}

const resources: Record<SupportedLanguage, any> = {
  en: require('./en.json'),
  hi: require('./hi.json'),
  bn: require('./bn.json'),
  mr: require('./mr.json'),
  ta: require('./ta.json'),
  te: require('./te.json'),
  kn: require('./kn.json'),
  gu: require('./gu.json'),
  ml: require('./ml.json'),
  pa: require('./pa.json'),
}

export const defaultLanguage: SupportedLanguage = 'en'

export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const parts = key.split('.')
  let node: any = resources[lang]
  for (const p of parts) {
    if (!node || typeof node !== 'object') break
    node = node[p]
  }
  let text = typeof node === 'string' ? node : key
  if (params) {
    Object.keys(params).forEach((k) => {
      const val = String(params[k])
      text = text.replace(new RegExp(`{${k}}`, 'g'), val)
    })
  }
  return text
}

export function getSystemLanguage(): SupportedLanguage {
  const candidate = (Intl as any)?.DateTimeFormat?.().resolvedOptions?.().locale
    ? String(Intl.DateTimeFormat().resolvedOptions().locale).slice(0, 2)
    : 'en'
  const supported = Object.keys(languageNames)
  return supported.includes(candidate) ? (candidate as SupportedLanguage) : defaultLanguage
}
