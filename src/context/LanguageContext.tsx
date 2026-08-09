import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage } from '../types';
import { translations } from '../i18n/translations';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'rtl' | 'ltr';
  speechLang: string;
  aiPromptLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', speechLang: 'ar-SA', aiPromptLang: 'Arabic (العربية)' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', speechLang: 'en-US', aiPromptLang: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', speechLang: 'de-DE', aiPromptLang: 'German (Deutsch)' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', speechLang: 'fr-FR', aiPromptLang: 'French (Français)' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', speechLang: 'es-ES', aiPromptLang: 'Spanish (Español)' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr', speechLang: 'it-IT', aiPromptLang: 'Italian (Italiano)' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr', speechLang: 'ru-RU', aiPromptLang: 'Russian (Русский)' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr', speechLang: 'zh-CN', aiPromptLang: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr', speechLang: 'ja-JP', aiPromptLang: 'Japanese (日本語)' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', speechLang: 'tr-TR', aiPromptLang: 'Turkish (Türkçe)' }
];

export function getLanguageInfo(code?: SupportedLanguage | string | null): LanguageInfo {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return found || SUPPORTED_LANGUAGES[0];
}

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: keyof typeof translations.ar) => string;
  dir: 'rtl' | 'ltr';
  currentLangInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // FIXED to Arabic only - i18n architecture preserved for future scalability
  const [language, setLanguageState] = useState<SupportedLanguage>('ar');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Force Arabic as default and only active language (i18n framework preserved)
    const langInfo = getLanguageInfo('ar');
    document.documentElement.dir = langInfo.dir;
    document.documentElement.lang = 'ar';
    localStorage.setItem('appLanguage', 'ar');
    setIsInitialized(true);
  }, []);

  // Locked to Arabic - function preserved for i18n scalability
  const setLanguage = (lang: SupportedLanguage) => {
    // Currently locked to Arabic only - remove this comment to enable multi-language
    const forcedLang: SupportedLanguage = 'ar';
    setLanguageState(forcedLang);
    localStorage.setItem('appLanguage', forcedLang);
    const langInfo = getLanguageInfo(forcedLang);
    document.documentElement.dir = langInfo.dir;
    document.documentElement.lang = forcedLang;
  };

  const t = (key: keyof typeof translations.ar): string => {
    const langTranslations = translations[language];
    // Fallback to Arabic if translation is missing
    return langTranslations[key] || translations.ar[key] || key;
  };

  const currentLangInfo = getLanguageInfo(language);

  useEffect(() => {
    if (isInitialized) {
      document.documentElement.dir = currentLangInfo.dir;
      document.documentElement.lang = language;
    }
  }, [language, isInitialized, currentLangInfo.dir]);

  if (!isInitialized) {
    return null; // Or loading spinner
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: currentLangInfo.dir, currentLangInfo }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
