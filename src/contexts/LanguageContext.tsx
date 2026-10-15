import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Language } from '@/types';
import { translate, getDirection, type TranslationKey } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Language;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('celia-lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('celia-lang', newLang);
  }, []);

  const dir = getDirection(lang);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    return translate(lang, key, params);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
