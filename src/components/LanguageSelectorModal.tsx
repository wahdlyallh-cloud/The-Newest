import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageInfo } from '../context/LanguageContext';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLanguage: (lang: string) => void;
}

export function LanguageSelectorModal({ isOpen, onClose, onSelectLanguage }: LanguageSelectorModalProps) {
  const { language, setLanguage } = useLanguage();

  if (!isOpen) return null;

  const handleSelect = (code: string) => {
    setLanguage(code as any);
    onSelectLanguage(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
            اختر لغتك المفضلة
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mt-2">
            Select your preferred language
          </p>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-3">
            {SUPPORTED_LANGUAGES.map((lang: LanguageInfo) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                  ${language === lang.code 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                `}
              >
                <span className="text-4xl">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {lang.nativeName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {lang.name}
                  </p>
                </div>
                {language === lang.code && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LanguageSelectorModal;
