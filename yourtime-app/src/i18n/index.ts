import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './es.json';
import en from './en.json';

export type Lang = 'es' | 'en';
const LANG_KEY = 'yt:lang';

/**
 * Detección del idioma inicial:
 *  1. Preferencia guardada en localStorage
 *  2. Idioma del browser (`navigator.language`)
 *  3. Default: español
 */
export function detectInitialLang(): Lang {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.toLowerCase() ?? '';
    if (lang.startsWith('en')) return 'en';
  }
  return 'es';
}

export function persistLang(lang: Lang): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANG_KEY, lang);
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: detectInitialLang(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;
