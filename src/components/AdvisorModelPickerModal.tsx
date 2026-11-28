import React, { useState } from 'react';
import { Sparkles, RefreshCw, X, Check, Zap, Award, Layers } from 'lucide-react';
import { GeminiModelMode, DiscoveredGeminiModel } from '../lib/geminiModelRouter';
import { AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';

interface AdvisorModelPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentMode: GeminiModelMode;
  onSelectMode: (mode: GeminiModelMode) => void;
  discoveredModels: DiscoveredGeminiModel[];
  onRefreshModels: () => Promise<void>;
  isRefreshing: boolean;
  appLanguage?: AppLanguage;
}

export default function AdvisorModelPickerModal({
  open,
  onClose,
  currentMode,
  onSelectMode,
  discoveredModels,
  onRefreshModels,
  isRefreshing,
  appLanguage = 'ar'
}: AdvisorModelPickerModalProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  if (!open) return null;

  const routingModes = [
    {
      id: 'auto',
      title: t.geminiModeAuto || 'متكيف تلقائي',
      desc: appLanguage === 'ar' ? 'توجيه ذكي ديناميكي بين النماذج النشطة حسب نوع المهمة والوسائط' : 'Smart adaptive routing across active models based on task & media',
      icon: Layers,
      color: 'emerald'
    },
    {
      id: 'fast',
      title: t.geminiModeFast || 'سريع',
      desc: appLanguage === 'ar' ? 'أسرع نموذج Flash متاح لردود فائقة السرعة وتوفير الرصيد' : 'Fastest active Flash model for ultra-low latency & efficiency',
      icon: Zap,
      color: 'amber'
    },
    {
      id: 'precision',
      title: t.geminiModePrecision || 'دقة عالية Pro',
      desc: appLanguage === 'ar' ? 'أعلى نموذج Pro كفاءة وتحليلًا عميقًا ودقيقًا' : 'Highest-capability active Pro model for deep & accurate reasoning',
      icon: Award,
      color: 'purple'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200"
      dir={langInfo.dir}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.modelPickerTitle || 'اختيار نموذج الذكاء الاصطناعي'}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 bg-white dark:bg-[#0E2320] text-[#12261D] dark:text-[#EBF5F2] shadow-2xl transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 px-5 py-4 bg-[#F3F8F5] dark:bg-[#14302B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 text-[#2D6A4F] dark:text-[#48B89F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#12261D] dark:text-[#EBF5F2]">
                {t.modelPickerTitle || 'اختيار نموذج الذكاء الاصطناعي'}
              </h2>
              <p className="text-xs text-[#4A6357] dark:text-[#9EC2B8]">
                {t.smartRoutingModes || 'أوضاع التوجيه الذكي'} &amp; Gemini Models
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close || 'إغلاق'}
            className="rounded-full p-2 text-[#4A6357] dark:text-[#9EC2B8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5 bg-[#EFF4F1]/50 dark:bg-[#071614]/50">
          {/* Section 1: Smart Routing Modes */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#4A6357] dark:text-[#9EC2B8] px-1">
              {t.smartRoutingModes || 'أوضاع التوجيه الذكي'}
            </h3>
            <div className="space-y-2">
              {routingModes.map(mode => {
                const isSelected = currentMode === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onSelectMode(mode.id);
                      onClose();
                    }}
                    className={`w-full text-start p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F] shadow-xs'
                        : 'bg-white dark:bg-[#0E2320] border-[#2D6A4F]/15 dark:border-[#48B89F]/15 hover:border-[#2D6A4F]/40 dark:hover:border-[#48B89F]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        mode.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        mode.color === 'amber' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      }`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#12261D] dark:text-[#EBF5F2]">
                          {mode.title}
                        </div>
                        <div className="text-[11px] text-[#4A6357] dark:text-[#9EC2B8] line-clamp-1">
                          {mode.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Live Available Models from API */}
          <div className="space-y-2.5 pt-2 border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#4A6357] dark:text-[#9EC2B8]">
                {t.availableModelsFromApi || 'النماذج النشطة لمفتاح API'}
              </h3>
              <button
                type="button"
                onClick={onRefreshModels}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#2D6A4F] dark:text-[#48B89F] hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/15 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{t.refreshModelsFromApi || 'تحديث القائمة من الـ API ↻'}</span>
              </button>
            </div>

            {discoveredModels.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E2320] border border-[#2D6A4F]/10 dark:border-[#48B89F]/15 text-center text-xs text-[#4A6357] dark:text-[#9EC2B8]">
                {appLanguage === 'ar' ? 'لا توجد نماذج مخصصة محملة حالياً، يُستخدم التوجيه الذكي التلقائي.' : 'No custom models cached yet; auto-adaptive routing is used.'}
              </div>
            ) : (
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {discoveredModels.map(model => {
                  const isSelected = currentMode === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelectMode(model.id);
                        onClose();
                      }}
                      className={`w-full text-start p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F] shadow-xs'
                          : 'bg-white dark:bg-[#0E2320] border-[#2D6A4F]/10 dark:border-[#48B89F]/10 hover:border-[#2D6A4F]/30 dark:hover:border-[#48B89F]/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-[#12261D] dark:text-[#EBF5F2] truncate">
                          {model.displayName || model.id}
                        </div>
                        <div className="text-[10px] text-[#4A6357] dark:text-[#9EC2B8] font-mono truncate" dir="ltr">
                          {model.id}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="p-1 rounded-full bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15 px-5 py-3.5 bg-[#F3F8F5] dark:bg-[#14302B] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] text-xs font-bold shadow-xs hover:bg-[#214E3A] transition-colors cursor-pointer"
          >
            {t.done || 'تم'}
          </button>
        </div>
      </div>
    </div>
  );
}
