import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Plus,
  Star,
  Folder,
  FileText,
  Activity,
  Archive,
  Scale
} from 'lucide-react';
import { DiaryEntry, AppLanguage, JournalEntryType, Habit, GratitudeCard, Book } from '../types';
import { ALL_JOURNAL_TYPES, getJournalTypeConfig, getJournalTypeLabel } from '../lib/journalTypes';
import BlomeoDayCard from './BlomeoDayCard';
import BlomeoNoteEditor, { BlomeoNoteEditorProps } from './BlomeoNoteEditor';
import { BackgroundAIStatus } from './BackgroundAIStatus';

export interface BlomeoDiaryWorkspaceProps {
  // Feed list props
  diaries: DiaryEntry[];
  filteredDiariesList: DiaryEntry[];
  memoizedGroupedDiaries: {
    sortedDays: string[];
    groups: { [dayKey: string]: { dayEntries: DiaryEntry[]; formattedDayLabel: string } };
  };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  diaryTypeFilter: 'all' | JournalEntryType | 'favorites' | 'with_media' | 'archived';
  setDiaryTypeFilter: (filter: 'all' | JournalEntryType | 'favorites' | 'with_media' | 'archived') => void;
  selectedTagFilter: string;
  setSelectedTagFilter: (tag: string) => void;
  allUniqueTags: string[];
  appLanguage: AppLanguage;
  isRtl: boolean;
  t: any;
  onStartNewDiary: (type?: JournalEntryType) => void;
  onSelectDiary: (diary: DiaryEntry) => void;
  onDeleteDiary: (diaryId: string) => void;
  onToggleFavorite: (diaryId: string) => void;
  onToggleArchive: (diaryId: string) => void;
  onOpenDayRating: (dayKey: string) => void;
  onOpenProsCons: (dayKey: string, formattedDayLabel: string, entries: DiaryEntry[]) => void;
  onOpenProsConsHistory: () => void;
  onOpenAttachmentsPage: () => void;
  onRefreshDayAIMood?: (dayKey: string) => void;
  onUpdateDiaryImportance?: (diaryId: string, importance: number) => void;

  // Editor props when editingDiary is active
  editingDiary: DiaryEntry | null;
  editorProps: Omit<BlomeoNoteEditorProps, 'editingDiary'>;
}

export const BlomeoDiaryWorkspace: React.FC<BlomeoDiaryWorkspaceProps> = ({
  diaries,
  filteredDiariesList,
  memoizedGroupedDiaries,
  searchQuery,
  setSearchQuery,
  diaryTypeFilter,
  setDiaryTypeFilter,
  selectedTagFilter,
  setSelectedTagFilter,
  allUniqueTags,
  appLanguage,
  isRtl,
  t,
  onStartNewDiary,
  onSelectDiary,
  onDeleteDiary,
  onToggleFavorite,
  onToggleArchive,
  onOpenDayRating,
  onOpenProsCons,
  onOpenProsConsHistory,
  onOpenAttachmentsPage,
  onRefreshDayAIMood,
  onUpdateDiaryImportance,
  editingDiary,
  editorProps
}) => {
  // If editingDiary is open, render the Adaptive Obsidian/Samsung Notes Editor
  if (editingDiary) {
    return (
      <BlomeoNoteEditor
        allDiariesVault={diaries}
        onSelectVaultEntry={onSelectDiary}
        {...editorProps}
        editingDiary={editingDiary}
      />
    );
  }

  // Otherwise, render the Outer Day-Grouped Feed (BlomeoDayCard)
  const { sortedDays, groups } = memoizedGroupedDiaries;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* 1. TOP UTILITY HEADER: Background AI Status + Quick Nav to Attachments & Pros/Cons History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 rounded-3xl p-3.5 sm:p-4 shadow-3xs">
        <BackgroundAIStatus appLanguage={appLanguage} />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Access to Attachments Page */}
          <button
            type="button"
            onClick={onOpenAttachmentsPage}
            className="px-3 py-1.5 rounded-xl border border-[rgba(45,106,79,0.2)] dark:border-[#1E4D3B]/40 bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#14302B] text-xs font-bold text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] hover:border-[#2D6A4F] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
            title={t?.attachmentsPageTitle || (isRtl ? 'الملحقات والوسائط' : 'Attachments')}
          >
            <Folder className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#74C69D]" />
            <span>{t?.attachmentsPageTitle || (isRtl ? 'الملحقات' : 'Attachments')}</span>
          </button>

          {/* Quick Access to Pros & Cons History Log */}
          <button
            type="button"
            onClick={onOpenProsConsHistory}
            className="px-3 py-1.5 rounded-xl border border-[rgba(45,106,79,0.2)] dark:border-[#1E4D3B]/40 bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#14302B] text-xs font-bold text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] hover:border-[#2D6A4F] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
            title={isRtl ? 'سجل تقارير الإيجابيات والسلبيات' : 'Pros & Cons Log'}
          >
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            <span>{isRtl ? 'سجل الميزان والتقارير' : 'Pros & Cons Log'}</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH BAR & PROMINENT "+ كتابة تدوينة جديدة" BUTTON */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t?.searchDiariesPlaceholder || (isRtl ? 'ابحث في التدوينات، المشاعر، أو الملاحظات...' : 'Search entries...')}
              className="w-full bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] border border-[rgba(45,106,79,0.18)] dark:border-[#1E4D3B]/40 focus:border-[#2D6A4F] dark:focus:border-[#74C69D] focus:ring-2 focus:ring-[#2D6A4F]/20 rounded-2xl pr-10 pl-9 py-2.5 text-xs text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] placeholder-gray-400 font-bold shadow-3xs outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3 p-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Prominent "+ كتابة تدوينة جديدة" Button */}
          <button
            type="button"
            onClick={() => onStartNewDiary()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#1E4D3B] via-[#2D6A4F] to-[#15382B] text-white rounded-2xl text-xs font-black shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? '+ كتابة تدوينة جديدة' : '+ Write New Entry'}</span>
          </button>
        </div>

        {/* 3. SCROLLABLE CATEGORY / FILTER CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {/* All */}
          <button
            type="button"
            onClick={() => setDiaryTypeFilter('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              diaryTypeFilter === 'all'
                ? 'bg-[#2D6A4F] text-white shadow-3xs scale-102'
                : 'bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] text-gray-600 dark:text-gray-300 border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 hover:bg-gray-50'
            }`}
          >
            <span>🌐</span>
            <span>{t?.allFilterTab || (isRtl ? 'الكل' : 'All')}</span>
          </button>

          {/* 9 Journal Classification Types */}
          {ALL_JOURNAL_TYPES.map((typeKey) => {
            const cfg = getJournalTypeConfig(typeKey);
            const isSelected = diaryTypeFilter === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setDiaryTypeFilter(typeKey)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-3xs scale-102'
                    : 'bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] text-gray-600 dark:text-gray-300 border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 hover:bg-gray-50'
                }`}
              >
                <span>{cfg.icon}</span>
                <span>{getJournalTypeLabel(typeKey, t)}</span>
              </button>
            );
          })}

          {/* Favorites Filter */}
          <button
            type="button"
            onClick={() => setDiaryTypeFilter('favorites')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              diaryTypeFilter === 'favorites'
                ? 'bg-amber-600 text-white border-amber-600 shadow-3xs scale-102'
                : 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{t?.favoritesLabel || (isRtl ? 'المفضلة' : 'Favorites')}</span>
          </button>

          {/* With Media Filter */}
          <button
            type="button"
            onClick={() => setDiaryTypeFilter('with_media')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              diaryTypeFilter === 'with_media'
                ? 'bg-teal-700 text-white border-teal-700 shadow-3xs scale-102'
                : 'bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-900 hover:bg-teal-100'
            }`}
          >
            <span>📎</span>
            <span>{isRtl ? 'تحتوي وسائط' : 'With Media'}</span>
          </button>

          {/* Archived Filter */}
          <button
            type="button"
            onClick={() => setDiaryTypeFilter('archived')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
              diaryTypeFilter === 'archived'
                ? 'bg-gray-700 text-white border-gray-700 shadow-3xs scale-102'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الأرشيف' : 'Archived'}</span>
          </button>
        </div>

        {/* Unique Tags Horizontal Filter */}
        {allUniqueTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">{isRtl ? 'الوسوم:' : 'Tags:'}</span>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black cursor-pointer ${
                selectedTagFilter === ''
                  ? 'bg-[#2D6A4F] text-white shadow-3xs'
                  : 'bg-white dark:bg-[#14302B] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            {allUniqueTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTagFilter(tag)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black cursor-pointer ${
                  selectedTagFilter === tag
                    ? 'bg-[#2D6A4F] text-white shadow-3xs'
                    : 'bg-white dark:bg-[#14302B] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. DAY-GROUPED FEED (BlomeoDayCard) */}
      {sortedDays.length === 0 ? (
        <div className="bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 rounded-3xl p-10 text-center text-gray-400 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F] dark:text-[#74C69D] flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          {searchQuery ? (
            <>
              <p className="font-extrabold text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] text-sm">
                {t?.noMatchFoundFor || (isRtl ? 'لم يتم العثور على نتائج لـ' : 'No matches for')} "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[#2D6A4F] text-white rounded-xl text-xs font-black shadow-3xs cursor-pointer"
              >
                {t?.clearSearchWordBtn || (isRtl ? 'مسح البحث' : 'Clear Search')}
              </button>
            </>
          ) : (
            <>
              <p className="font-extrabold text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2]">
                {t?.noMatchingDiariesNow || (isRtl ? 'لا توجد تدوينات في هذا القسم' : 'No entries found')}
              </p>
              <button
                type="button"
                onClick={() => onStartNewDiary()}
                className="px-4 py-2 bg-[#2D6A4F] text-white rounded-xl text-xs font-black shadow-3xs cursor-pointer"
              >
                {isRtl ? '+ ابدأ تدوينتك الأولى' : '+ Write first entry'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((dayKey) => {
            const dayData = groups[dayKey] || { dayEntries: [], formattedDayLabel: dayKey };
            return (
              <BlomeoDayCard
                key={dayKey}
                dayKey={dayKey}
                formattedDayLabel={dayData.formattedDayLabel}
                dayEntries={dayData.dayEntries}
                appLanguage={appLanguage}
                isRtl={isRtl}
                t={t}
                onOpenProsCons={onOpenProsCons}
                onSelectDiary={onSelectDiary}
                onDeleteDiary={onDeleteDiary}
                onToggleFavorite={onToggleFavorite}
                onToggleArchive={onToggleArchive}
                onOpenDayRating={onOpenDayRating}
                onRefreshDayAIMood={onRefreshDayAIMood}
                onUpdateDiaryImportance={onUpdateDiaryImportance}
              />
            );
          })}
        </div>
      )}

      {/* Floating "+ تدوينة جديدة" FAB on Mobile */}
      <div className="fixed bottom-6 end-6 z-40 sm:hidden">
        <button
          type="button"
          onClick={() => onStartNewDiary()}
          className="p-4 bg-gradient-to-r from-[#1E4D3B] via-[#2D6A4F] to-[#15382B] text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all border-2 border-white/20"
          title={isRtl ? 'تدوينة جديدة' : 'New Note'}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default BlomeoDiaryWorkspace;
