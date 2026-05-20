import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import type { Locale } from '../i18n/translations';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial locale from localStorage or default to 'ar'
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('arbaa-locale');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('arbaa-locale', newLocale);
  };

  // Sync HTML dir and lang attributes
  useEffect(() => {
    const direction = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => {
    const translationSet = translations[locale] || translations.ar;
    // Attempt lookup in current language, fallback to Arabic, then key
    return (translationSet as any)[key] || (translations.ar as any)[key] || key;
  };

  const isRtl = locale === 'ar';

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
};
