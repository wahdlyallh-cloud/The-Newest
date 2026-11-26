import React, { useState } from 'react';
import { X, Globe, Check, Sparkles, Search, Type, AlignLeft } from 'lucide-react';
import { AppLanguage, AppFontFamily, AppLineHeight } from '../types';
import { SUPPORTED_LANGUAGES, MULTI_TRANSLATIONS, getLanguageInfo } from '../lib/languages';
import { APP_FONTS, LINE_HEIGHT_OPTIONS } from '../lib/fonts';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';

interface LanguagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  appFont?: AppFontFamily;
  appLineHeight?: AppLineHeight;
  onChangeFont?: (font: AppFontFamily) => void;
  onChangeLineHeight?: (lineHeight: AppLineHeight) => void;
  isEn?: boolean;
  isFirstTime?: boolean;
}

export default function LanguagesModal({ 
  isOpen, 
  onClose, 
  appLanguage, 
  onChangeLanguage,
  appFont = 'cairo',
  appLineHeight = 'relaxed',
  onChangeFont,
  onChangeLineHeight,
  isFirstTime = false 
}: LanguagesModalProps) {
  const [activeTab, setActiveTab] = useState<'languages' | 'typography'>('languages');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const currentInfo = getLanguageInfo(appLanguage);
  const t = MULTI_TRANSLATIONS[appLanguage] || MULTI_TRANSLATIONS.ar;
  const isArabic = appLanguage === 'ar';

  useRegisterBackStep('modal_languages', 'modal', isOpen && !isFirstTime, onClose, t.languagesTitle);

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((lang) =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectLanguage = (langCode: AppLanguage) => {
    onChangeLanguage(langCode);
  };

  const headerTitle = activeTab === 'languages' ? (isFirstTime ? t.selectLanguageTitle : t.languagesTitle) : (t.typographyTabTitle);
  const headerSubtitle = activeTab === 'languages' ? (isFirstTime ? t.selectLanguageSubtitle : t.languagesSub) : (t.typographyTabSub);

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 z-[55] font-sans animate-fadeIn" 
      dir={currentInfo.dir}
    >
      <div className="bg-[#FAF8F5] border-0 sm:border-2 sm:border-[#D4A373]/40 rounded-none sm:rounded-[32px] w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl transition-all duration-300">
        
        {/* Native App Bar Header */}
        {!isFirstTime ? (
          <NativeModalHeader
            title={headerTitle}
            subtitle={headerSubtitle}
            icon={
              <div className="p-1.5 bg-[#4E685B] text-white rounded-xl shadow-xs">
                {activeTab === 'languages' ? (
                  <Globe className="w-4 h-4 text-amber-300" />
                ) : (
                  <Type className="w-4 h-4 text-amber-300" />
                )}
              </div>
            }
            onBack={onClose}
            isRtl={currentInfo.dir === 'rtl'}
            theme="light"
          />
        ) : (
          <div className="p-5 pb-3 border-b border-[#E2DCC8]/60 bg-gradient-to-r from-[#FAF8F5] via-amber-50/40 to-[#FAF8F5] flex items-center gap-3">
            <div className="p-2.5 bg-[#4E685B] text-white rounded-2xl shadow-xs">
              <Globe className="w-5 h-5 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#2B3E50] text-base sm:text-lg">
                {headerTitle}
              </h4>
              <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                {headerSubtitle}
              </p>
            </div>
          </div>
        )}

        {/* Sub Navigation Tabs */}
        {!isFirstTime && (
          <div className="px-4 py-2 border-b border-[#E2DCC8]/40 bg-white/50">
            <div className="flex items-center bg-[#E2DCC8]/50 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('languages')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'languages'
                    ? 'bg-[#4E685B] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t.languageTabLabel || t.languagesTitle}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('typography')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'typography'
                    ? 'bg-[#4E685B] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>{t.fontAndSpacingTabLabel || t.typographyTabTitle}</span>
              </button>
            </div>

            {/* Search bar for language tab */}
            {activeTab === 'languages' && (
              <div className="relative mt-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.searchLanguagePlaceholder}
                  className="w-full px-9 py-2.5 bg-white border border-[#E2DCC8] rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4E685B] shadow-3xs"
                />
                <Search className="w-4 h-4 text-gray-400 absolute end-3 top-3" />
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Language Options List */}
        {activeTab === 'languages' && (
          <div className="p-4 sm:p-6 space-y-2 overflow-y-auto flex-1 scrollbar-thin">
            <div className="grid grid-cols-1 gap-2">
              {filteredLanguages.map((lang) => {
                const isSelected = appLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black transition-all flex items-center justify-between border-2 cursor-pointer group ${
                      isSelected
                        ? 'bg-[#4E685B] text-white border-[#4E685B] shadow-md scale-[1.01]'
                        : 'bg-white border-[#E2DCC8]/80 text-gray-800 hover:border-[#4E685B]/40 hover:bg-amber-50/30 shadow-3xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                        {lang.flag}
                      </span>
                      <div className="text-start">
                        <span className="block font-black text-sm">
                          {lang.nativeName}
                        </span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-200' : 'text-gray-400'}`}>
                          {lang.name}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="p-1.5 bg-amber-300 text-gray-900 rounded-full shadow-xs shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Typography & Font Options */}
        {activeTab === 'typography' && (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">
            
            {/* Font Select */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-[#8B9D83]" />
                <span>{t.selectMainFontLabel}</span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {APP_FONTS.map((fontItem) => {
                  const isSelected = appFont === fontItem.id;
                  return (
                    <button
                      key={fontItem.id}
                      type="button"
                      onClick={() => onChangeFont && onChangeFont(fontItem.id)}
                      className={`w-full p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-right rtl:text-right ltr:text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-md'
                          : 'bg-white border-[#E2DCC8] text-gray-800 hover:border-[#8B9D83]/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm">
                            {t['font' + fontItem.id.charAt(0).toUpperCase() + fontItem.id.slice(1) + 'Name'] || fontItem.id}
                          </span>
                          {fontItem.badge && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${isSelected ? 'bg-amber-300 text-gray-900' : 'bg-amber-100 text-amber-900'}`}>
                              {fontItem.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-bold mt-1 ${isSelected ? 'text-amber-100' : 'text-gray-500'}`} style={{ fontFamily: fontItem.fontFamilyCss }}>
                          {t['font' + fontItem.id.charAt(0).toUpperCase() + fontItem.id.slice(1) + 'Sample'] || t.fontDefaultSample}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="p-1 bg-amber-300 text-gray-900 rounded-full shrink-0">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Height Select */}
            <div className="space-y-2 pt-3 border-t border-[#E2DCC8]">
              <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <AlignLeft className="w-4 h-4 text-[#D4A373]" />
                <span>{t.lineSpacingLabel}</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {LINE_HEIGHT_OPTIONS.map((lhItem) => {
                  const isSelected = appLineHeight === lhItem.id;
                  return (
                    <button
                      key={lhItem.id}
                      type="button"
                      onClick={() => onChangeLineHeight && onChangeLineHeight(lhItem.id)}
                      className={`p-3 rounded-2xl border-2 text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-sm'
                          : 'bg-white border-[#E2DCC8] text-gray-800 hover:border-[#8B9D83]/50'
                      }`}
                    >
                      <span className="block font-black text-xs">
                        {t['lineHeight' + lhItem.id.charAt(0).toUpperCase() + lhItem.id.slice(1) + 'Name'] || lhItem.id}
                      </span>
                      <span className={`text-[9px] font-bold block mt-0.5 ${isSelected ? 'text-amber-100' : 'text-gray-500'}`}>
                        {t['lineHeight' + lhItem.id.charAt(0).toUpperCase() + lhItem.id.slice(1) + 'Desc'] || ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Footer for First Time Selection or Close */}
        <div className="p-4 bg-white border-t border-[#E2DCC8] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-[#4E685B] hover:bg-[#3F5449] text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.saveAndCloseBtn}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
