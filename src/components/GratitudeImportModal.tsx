import React, { useState, useMemo, useEffect } from 'react';
import { X, CheckSquare, Square, Sparkles, Calendar, Layers, Plus } from 'lucide-react';
import { GratitudeCard, AppLanguage } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';

interface GratitudeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  gratitudeCards: GratitudeCard[];
  appLanguage: AppLanguage;
  onImportSelected: (formattedText: string) => void;
}

/**
 * Check if a date string belongs to local today in a timezone-safe manner.
 */
function isCardFromToday(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  try {
    const cardDate = new Date(createdAt);
    if (isNaN(cardDate.getTime())) return false;
    const now = new Date();
    return (
      cardDate.getFullYear() === now.getFullYear() &&
      cardDate.getMonth() === now.getMonth() &&
      cardDate.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

export default function GratitudeImportModal({
  isOpen,
  onClose,
  gratitudeCards,
  appLanguage = 'ar',
  onImportSelected
}: GratitudeImportModalProps) {
  const t = getTranslation(appLanguage);
  const langInfo = getLanguageInfo(appLanguage);
  const isAr = appLanguage === 'ar';

  const todayCards = useMemo(() => {
    return (gratitudeCards || [])
      .filter(c => isCardFromToday(c.createdAt))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [gratitudeCards]);

  const allCardsSorted = useMemo(() => {
    return [...(gratitudeCards || [])].sort((a, b) => {
      const aIsToday = isCardFromToday(a.createdAt);
      const bIsToday = isCardFromToday(b.createdAt);
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [gratitudeCards]);

  // Default to 'today' unless today is empty
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');

  const displayedCards = useMemo(() => {
    return activeTab === 'today' ? todayCards : allCardsSorted;
  }, [activeTab, todayCards, allCardsSorted]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const defaultTab = todayCards.length > 0 ? 'today' : 'all';
      setActiveTab(defaultTab);
      const targetList = defaultTab === 'today' ? todayCards : allCardsSorted;
      setSelectedIds(targetList.map(c => c.id));
    }
  }, [isOpen, todayCards, allCardsSorted]);

  // Switch tab and keep reasonable selection
  const handleTabChange = (tab: 'today' | 'all') => {
    setActiveTab(tab);
    const targetCards = tab === 'today' ? todayCards : allCardsSorted;
    setSelectedIds(targetCards.map(c => c.id));
  };

  const isAllSelected = displayedCards.length > 0 && displayedCards.every(c => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !displayedCards.some(c => c.id === id)));
    } else {
      const allDisplayedIds = displayedCards.map(c => c.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...allDisplayedIds])));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirmImport = () => {
    const selectedCards = (gratitudeCards || []).filter(c => selectedIds.includes(c.id));
    if (selectedCards.length === 0) return;

    const title = t.importGratitudeTitle || (isAr ? 'مقتطفات من جدار الامتنان' : 'Gratitude Wall Moments');
    const formatted = `\n\n🌸 ${title}:\n` + selectedCards.map((c, i) => `${i + 1}. ${c.text}`).join('\n');

    onImportSelected(formatted);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir={langInfo.dir}
    >
      <div className="bg-white border border-[#E2DCC8] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2DCC8]/70 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-[#F9F7F2] to-amber-50/60">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2.5 rounded-2xl bg-[#8B9D83]/15 text-[#5A5A40]">
              <Sparkles className="w-5 h-5 text-[#8B9D83]" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-[#3A3A3A]">
                {t.importGratitudeModalTitle || (isAr ? 'استيراد من جدار الامتنان' : 'Import from Gratitude Wall')}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {isAr
                  ? 'اختر بطاقات الامتنان التي ترغب في إضافتها إلى يوميتك الحالية'
                  : 'Select gratitude cards to cleanly add to your current diary entry'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 border border-[#E2DCC8] flex items-center justify-center transition-all cursor-pointer shadow-3xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs: Today vs All Days */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#FBF9F5] border-b border-[#E2DCC8]/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E2DCC8] rounded-2xl text-xs font-bold shadow-3xs">
            <button
              type="button"
              onClick={() => handleTabChange('today')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'today'
                  ? 'bg-[#8B9D83] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#3A3A3A] hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t.importGratitudeTabToday || (isAr ? 'اليوم' : 'Today')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {todayCards.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#8B9D83] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#3A3A3A] hover:bg-gray-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.importGratitudeTabAllDays || (isAr ? 'كل الأيام' : 'All Days')}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {(gratitudeCards || []).length}
              </span>
            </button>
          </div>

          {displayedCards.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[11px] font-bold text-[#5A5A40] hover:text-[#8B9D83] flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-white"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#8B9D83]" />
                  <span>{t.importGratitudeDeselectAll || (isAr ? 'إلغاء التحديد' : 'Deselect All')}</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-gray-400" />
                  <span>{t.importGratitudeSelectAll || (isAr ? 'تحديد الكل' : 'Select All')}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Cards List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-2.5 max-h-[50vh]">
          {displayedCards.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-gray-400">
              <span className="text-3xl block">🌸</span>
              <p className="text-xs font-bold text-gray-500">
                {activeTab === 'today'
                  ? (t.importGratitudeNoItemsToday || (isAr ? 'لا توجد بطاقات امتنان مسجلة لليوم.' : 'No gratitude entries recorded for today.'))
                  : (t.importGratitudeNoItemsAll || (isAr ? 'لا توجد بطاقات امتنان بعد.' : 'No gratitude cards found yet.'))}
              </p>
              {activeTab === 'today' && (gratitudeCards || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className="mt-2 text-xs font-bold text-[#8B9D83] hover:underline cursor-pointer"
                >
                  {isAr ? 'عرض بطاقات الأيام السابقة ➔' : 'View earlier cards ➔'}
                </button>
              )}
            </div>
          ) : (
            displayedCards.map((card) => {
              const isSelected = selectedIds.includes(card.id);
              const cardDate = card.createdAt
                ? new Date(card.createdAt).toLocaleDateString(langInfo.bcp47 || 'ar-EG', {
                    month: 'short',
                    day: 'numeric'
                  })
                : '';

              return (
                <div
                  key={card.id}
                  onClick={() => toggleItem(card.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-text ${
                    isSelected
                      ? 'bg-[#FAF6EC] border-[#8B9D83] shadow-xs'
                      : 'bg-white border-[#E2DCC8] hover:border-gray-300'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-[#8B9D83]">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#8B9D83]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-[#3A3A3A] font-medium whitespace-pre-wrap">
                      {card.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-medium">
                      {cardDate && <span>📅 {cardDate}</span>}
                      {card.category && (
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                          {card.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E2DCC8]/70 bg-[#FAF9F5] flex items-center justify-between gap-3">
          <div className="text-xs text-gray-600 font-bold">
            <span>{t.importGratitudeSelectedCount || (isAr ? 'تم تحديد' : 'Selected')}: </span>
            <span className="text-[#8B9D83] font-black">
              {displayedCards.filter(c => selectedIds.includes(c.id)).length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-700 border border-[#E2DCC8] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {t.cancelBtn || (isAr ? 'إلغاء' : 'Cancel')}
            </button>

            <button
              type="button"
              disabled={displayedCards.filter(c => selectedIds.includes(c.id)).length === 0}
              onClick={handleConfirmImport}
              className="py-2.5 px-4 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.importGratitudeAddSelected || (isAr ? 'إضافة المحدد' : 'Add Selected')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
