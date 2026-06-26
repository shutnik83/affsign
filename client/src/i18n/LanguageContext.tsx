import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import translations, { Locale, TranslationKey } from './translations';

interface LanguageContextType {
  locale: Locale;
  t: (key: TranslationKey) => string;
  toggleLocale: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem('affsign_locale');
    if (saved === 'en' || saved === 'ru') return saved;
  } catch {}
  return 'ru';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    localStorage.setItem('affsign_locale', locale);
  }, [locale]);

  const t = (key: TranslationKey): string => translations[locale][key];

  const toggleLocale = () => setLocale((prev) => (prev === 'en' ? 'ru' : 'en'));

  return (
    <LanguageContext.Provider value={{ locale, t, toggleLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
