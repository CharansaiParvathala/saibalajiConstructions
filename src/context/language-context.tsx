import React, { createContext, useContext, useState, useEffect } from 'react';

// Import language files
import en from '@/locales/en.json';
import te from '@/locales/te.json';
import kn from '@/locales/kn.json';

type Language = 'en' | 'te' | 'kn';

export interface LanguageOption {
  id: Language;
  name: string;
  nativeName: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, any>) => string;
  languageOptions: LanguageOption[];
}

const languageOptions: LanguageOption[] = [
  { id: 'en', name: 'English', nativeName: 'English' },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' }
];

const translations = {
  en,
  te,
  kn
};

const LANGUAGE_KEY = 'app_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  languageOptions: languageOptions
});

export const useLanguage = () => useContext(LanguageContext);

// Add interpolation helper
const interpolate = (str: string, vars?: Record<string, any>) => {
  if (!vars) return str;
  return str.replace(/{{(.*?)}}/g, (_, v) => (vars[v.trim()] !== undefined ? vars[v.trim()] : `{{${v}}}`));
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get language from localStorage, fallback to browser language or 'en'
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'te' || savedLanguage === 'kn')) {
      return savedLanguage as Language;
    }
    
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'te' || browserLang === 'kn') {
      return browserLang as Language;
    }
    
    return 'en';
  });

  // Set document language when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translations[language].app?.name || 'Sai Balaji Progress Tracker';
  }, [language]);

  // Function to get nested values using dot notation
  const getNestedTranslation = (obj: any, path: string): string => {
    if (!path) return '';
    
    const keys = path.split('.');
    let result = keys.reduce((acc, key) => {
      if (acc && typeof acc === 'object' && key in acc) {
        return acc[key];
      }
      return undefined;
    }, obj);
    
    // Handle undefined or non-string values
    if (result === undefined) {
      // Try to get from English as fallback
      if (language !== 'en') {
        result = keys.reduce((acc, key) => {
          if (acc && typeof acc === 'object' && key in acc) {
            return acc[key];
          }
          return undefined;
        }, translations['en']);
      }
      
      // If still undefined, return the original key
      if (result === undefined) {
        return path;
      }
    }
    
    return typeof result === 'string' ? result : path;
  };

  // Update translate to support variables
  const translate = (key: string, vars?: Record<string, any>): string => {
    if (!key) return '';
    const currentTranslations = translations[language];
    const translated = getNestedTranslation(currentTranslations, key);
    return interpolate(translated, vars);
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem(LANGUAGE_KEY, newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate, languageOptions }}>
      {children}
    </LanguageContext.Provider>
  );
};
