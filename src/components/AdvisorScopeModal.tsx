import React, { useState } from 'react';
import { Calendar, Filter, Image, Video, Music, FileText, Check, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';

export type TimeRangePreset = '1d' | '7d' | '1m' | '3m' | '6m' | '1y' | 'custom';
export type CustomDateType = 'single' | 'range';
export type MediaScopeMode = 'text-only' | 'by-category' | 'manual';

export interface AdvisorScopeConfig {
  timeRange: TimeRangePreset;
  customType: CustomDateType;
  customDate: string; // YYYY-MM-DD
  customStartDate: string; // YYYY-MM-DD
  customEndDate: string; // YYYY-MM-DD
  mediaMode: MediaScopeMode;
  categoryPhotos: boolean;
  categoryVideos: boolean;
  categoryAudios: boolean;
  categoryDocs: boolean;
  selectedManualFileIds: string[];
}

export interface AvailableMediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  date: string; // ISO string
}

interface AdvisorScopeModalProps {
  open: boolean;
  onClose: () => void;
  config: AdvisorScopeConfig;
  onChangeConfig: (newConfig: AdvisorScopeConfig) => void;
  availableMedia: AvailableMediaItem[];
  entriesCountInRange: number;
  mediaCountInRange: number;
  appLanguage?: AppLanguage;
}

export default function AdvisorScopeModal({
  open,
  onClose,
  config,
  onChangeConfig,
  availableMedia,
  entriesCountInRange,
  mediaCountInRange,
  appLanguage = 'ar'
}: AdvisorScopeModalProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  if (!open) return null;

  const isWideRange = ['3m', '6m', '1y'].includes(config.timeRange);
  const hasHeavyMedia = config.mediaMode === 'by-category' && (config.categoryVideos || config.categoryAudios);

  const presets: Array<{ id: TimeRangePreset; label: string }> = [
    { id: '1d', label: t.timeRangeToday || 'آخر يوم (اليوم)' },
    { id: '7d', label: t.timeRange7d || 'آخر 7 أيام' },
    { id: '1m', label: t.timeRange1m || 'آخر شهر (30 يومًا)' },
    { id: '3m', label: t.timeRange3m || 'آخر 3 شهور' },
    { id: '6m', label: t.timeRange6m || 'آخر 6 شهور' },
    { id: '1y', label: t.timeRange1y || 'آخر سنة' },
    { id: 'custom', label: t.timeRangeCustom || 'مخصص' }
  ];

  const update = (partial: Partial<AdvisorScopeConfig>) => {
    onChangeConfig({ ...config, ...partial });
  };

  const toggleManualFile = (id: string) => {
    const exists = config.selectedManualFileIds.includes(id);
    const updated = exists
      ? config.selectedManualFileIds.filter(fId => fId !== id)
      : [...config.selectedManualFileIds, id];
    update({ selectedManualFileIds: updated });
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200"
      dir={langInfo.dir}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.timeRangeScope || 'نطاق البيانات والوسائط'}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 bg-white dark:bg-[#0E2320] text-[#12261D] dark:text-[#EBF5F2] shadow-2xl transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 px-5 py-4 bg-[#F3F8F5] dark:bg-[#14302B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 text-[#2D6A4F] dark:text-[#48B89F]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#12261D] dark:text-[#EBF5F2]">
                {t.timeRangeScope || 'نطاق البيانات والوسائط'}
              </h2>
              <p className="text-xs text-[#4A6357] dark:text-[#9EC2B8]">
                {entriesCountInRange} {t.diaryEntries || 'تدوينة'} • {mediaCountInRange} {t.multimediaLabel || 'ملفات'}
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

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 bg-[#EFF4F1]/50 dark:bg-[#071614]/50">
          
          {/* Part A: Time-Range Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#4A6357] dark:text-[#9EC2B8]">
                {t.timeRangeScope || 'النطاق الزمني للتحليل'}
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {presets.map(preset => {
                const isSelected = config.timeRange === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => update({ timeRange: preset.id })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] border-transparent shadow-xs'
                        : 'bg-white dark:bg-[#0E2320] border-[#2D6A4F]/15 dark:border-[#48B89F]/15 text-[#12261D] dark:text-[#EBF5F2] hover:border-[#2D6A4F]/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Range Sub-options */}
            {config.timeRange === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0E2320] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 space-y-3 animate-in fade-in duration-150">
                <div className="flex rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => update({ customType: 'single' })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      config.customType === 'single'
                        ? 'bg-white dark:bg-[#0E2320] text-[#2D6A4F] dark:text-[#48B89F] shadow-xs'
                        : 'text-[#4A6357] dark:text-[#9EC2B8]'
                    }`}
                  >
                    {t.timeRangeCustomSingle || 'يوم محدد'}
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ customType: 'range' })}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      config.customType === 'range'
                        ? 'bg-white dark:bg-[#0E2320] text-[#2D6A4F] dark:text-[#48B89F] shadow-xs'
                        : 'text-[#4A6357] dark:text-[#9EC2B8]'
                    }`}
                  >
                    {t.timeRangeCustomRange || 'فترة محددة'}
                  </button>
                </div>

                {config.customType === 'single' ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#4A6357] dark:text-[#9EC2B8] block">
                      {t.timeRangeSingleDate || 'تاريخ اليوم المحدد:'}
                    </label>
                    <input
                      type="date"
                      value={config.customDate}
                      onChange={e => update({ customDate: e.target.value })}
                      className="w-full rounded-xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 bg-[#F3F8F5] dark:bg-[#14302B] px-3 py-2 text-xs text-[#12261D] dark:text-[#EBF5F2] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#4A6357] dark:text-[#9EC2B8] block">
                        {t.timeRangeStartDate || 'من تاريخ:'}
                      </label>
                      <input
                        type="date"
                        value={config.customStartDate}
                        onChange={e => update({ customStartDate: e.target.value })}
                        className="w-full rounded-xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 bg-[#F3F8F5] dark:bg-[#14302B] px-3 py-2 text-xs text-[#12261D] dark:text-[#EBF5F2] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#4A6357] dark:text-[#9EC2B8] block">
                        {t.timeRangeEndDate || 'إلى تاريخ:'}
                      </label>
                      <input
                        type="date"
                        value={config.customEndDate}
                        onChange={e => update({ customEndDate: e.target.value })}
                        className="w-full rounded-xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 bg-[#F3F8F5] dark:bg-[#14302B] px-3 py-2 text-xs text-[#12261D] dark:text-[#EBF5F2] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Part B: Media Scope Mode */}
          <div className="space-y-3 pt-3 border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15">
            <span className="text-xs font-black uppercase tracking-wider text-[#4A6357] dark:text-[#9EC2B8]">
              {t.mediaPermissionsTitle || 'وضع الوسائط (محصور ضمن النطاق الزمني المحدد)'}
            </span>

            {/* 3 Main Media Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => update({ mediaMode: 'text-only' })}
                className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                  config.mediaMode === 'text-only'
                    ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F] shadow-xs'
                    : 'bg-white dark:bg-[#0E2320] border-[#2D6A4F]/15 dark:border-[#48B89F]/15 hover:border-[#2D6A4F]/40'
                }`}
              >
                <div className="font-bold text-xs text-[#12261D] dark:text-[#EBF5F2]">
                  {t.mediaScopeTextOnly || 'نص فقط (توفير)'}
                </div>
                <div className="text-[10px] text-[#4A6357] dark:text-[#9EC2B8] mt-0.5">
                  {appLanguage === 'ar' ? 'إرسال النصوص والمشاعر والعادات بلا وسائط' : 'Send entries, moods & habits without media'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => update({ mediaMode: 'by-category' })}
                className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                  config.mediaMode === 'by-category'
                    ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F] shadow-xs'
                    : 'bg-white dark:bg-[#0E2320] border-[#2D6A4F]/15 dark:border-[#48B89F]/15 hover:border-[#2D6A4F]/40'
                }`}
              >
                <div className="font-bold text-xs text-[#12261D] dark:text-[#EBF5F2]">
                  {t.mediaScopeByCategory || 'حسب الفئة'}
                </div>
                <div className="text-[10px] text-[#4A6357] dark:text-[#9EC2B8] mt-0.5">
                  {appLanguage === 'ar' ? 'تحديد فئات الوسائط المسموح بها' : 'Select allowed media categories'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => update({ mediaMode: 'manual' })}
                className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                  config.mediaMode === 'manual'
                    ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F] shadow-xs'
                    : 'bg-white dark:bg-[#0E2320] border-[#2D6A4F]/15 dark:border-[#48B89F]/15 hover:border-[#2D6A4F]/40'
                }`}
              >
                <div className="font-bold text-xs text-[#12261D] dark:text-[#EBF5F2]">
                  {t.mediaScopeManual || 'اختيار يدوي'}
                </div>
                <div className="text-[10px] text-[#4A6357] dark:text-[#9EC2B8] mt-0.5">
                  {appLanguage === 'ar' ? 'انتقاء ملفات محددة بالاسم' : 'Select exact files individually'}
                </div>
              </button>
            </div>

            {/* By-category options */}
            {config.mediaMode === 'by-category' && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0E2320] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 space-y-3 animate-in fade-in duration-150">
                {/* Mandatory confirmation badge */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.mediaAlwaysIncluded || '✓ النصوص مدمجة تلقائيًا دائمًا'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={config.categoryPhotos}
                      onChange={e => update({ categoryPhotos: e.target.checked })}
                      className="w-4 h-4 accent-[#2D6A4F] dark:accent-[#48B89F] rounded"
                    />
                    <Image className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.mediaScopeImages || 'الصور'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={config.categoryVideos}
                      onChange={e => update({ categoryVideos: e.target.checked })}
                      className="w-4 h-4 accent-[#2D6A4F] dark:accent-[#48B89F] rounded"
                    />
                    <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>{t.mediaScopeVideos || 'الفيديوهات'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={config.categoryAudios}
                      onChange={e => update({ categoryAudios: e.target.checked })}
                      className="w-4 h-4 accent-[#2D6A4F] dark:accent-[#48B89F] rounded"
                    />
                    <Music className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{t.mediaScopeAudios || 'الصوتيات'}</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={config.categoryDocs}
                      onChange={e => update({ categoryDocs: e.target.checked })}
                      className="w-4 h-4 accent-[#2D6A4F] dark:accent-[#48B89F] rounded"
                    />
                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{t.mediaScopeDocs || 'المستندات والملفات'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Manual Selection Options */}
            {config.mediaMode === 'manual' && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0E2320] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.mediaAlwaysIncluded || '✓ النصوص مدمجة تلقائيًا دائمًا'}</span>
                </div>

                <div className="text-xs font-bold text-[#4A6357] dark:text-[#9EC2B8]">
                  {appLanguage === 'ar' ? 'ملفات الوسائط ضمن النطاق الزمني المحدد:' : 'Media files within selected time range:'}
                </div>

                {availableMedia.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    {appLanguage === 'ar' ? 'لا توجد ملفات وسائط مسجلة في هذا النطاق الزمني.' : 'No media files found in this date range.'}
                  </div>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {availableMedia.map(item => {
                      const isChecked = config.selectedManualFileIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] cursor-pointer text-xs font-bold"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleManualFile(item.id)}
                              className="w-4 h-4 accent-[#2D6A4F] dark:accent-[#48B89F] rounded shrink-0"
                            />
                            <span className="truncate max-w-[200px] text-[#12261D] dark:text-[#EBF5F2]">
                              {item.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(item.date).toLocaleDateString(langInfo.bcp47)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Quota Advisory Note */}
            {isWideRange && (config.mediaMode === 'manual' || hasHeavyMedia) && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {t.wideRangeQuotaWarning || 'تنبيه حصة الاستخدام: النطاق الزمني الطويل مع ملفات الوسائط المتعددة قد يستهلك رصيد استهلاك كبير من API.'}
                </span>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15 px-5 py-3.5 bg-[#F3F8F5] dark:bg-[#14302B] flex items-center justify-between">
          <div className="text-[11px] font-bold text-[#4A6357] dark:text-[#9EC2B8]">
            {(t.contextItemCountBadge || '{entries} تدوينة • {files} ملفات ضمن النطاق المحدد')
              .replace('{entries}', String(entriesCountInRange))
              .replace('{files}', String(mediaCountInRange))}
          </div>
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
