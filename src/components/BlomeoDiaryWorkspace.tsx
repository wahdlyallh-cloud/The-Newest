import React, { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  ChevronLeft,
  Folder,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Scale,
  Search,
  Sparkles,
  Star,
  X
} from 'lucide-react';
import { DiaryEntry, AppLanguage, JournalEntryType } from '../types';
import { ALL_JOURNAL_TYPES, getJournalTypeLabel } from '../lib/journalTypes';
import BlomeoDayCard from './BlomeoDayCard';
import BlomeoNoteEditor, { BlomeoNoteEditorProps } from './BlomeoNoteEditor';
import { BackgroundAIStatus } from './BackgroundAIStatus';

/**
 * Public contract consumed by App.tsx. Kept byte-for-byte compatible with the
 * approved prototype so App.tsx needs zero edits.
 */
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

type FilterValue = BlomeoDiaryWorkspaceProps['diaryTypeFilter'];

interface FeedControlsProps {
  props: BlomeoDiaryWorkspaceProps;
  compact?: boolean;
}

/** Search, category chips, quick-access pills and the primary new-entry CTA. */
function FeedControls({ props, compact = false }: FeedControlsProps) {
  const { isRtl, t } = props;

  const filterItems: Array<{ value: FilterValue; label: string }> = [
    { value: 'all', label: t?.allFilterTab || (isRtl ? 'الكل' : 'All') },
    ...ALL_JOURNAL_TYPES.map((type) => ({ value: type as FilterValue, label: getJournalTypeLabel(type, t) })),
    { value: 'favorites', label: t?.favoritesLabel || (isRtl ? 'المفضلة' : 'Favorites') },
    { value: 'with_media', label: isRtl ? 'بها وسائط' : 'With media' },
    { value: 'archived', label: isRtl ? 'الأرشيف' : 'Archived' }
  ];

  return (
    <div className="space-y-2.5">
      {/* Search + primary CTA */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--blomeo-text-muted)]" />
          <input
            type="text"
            value={props.searchQuery}
            onChange={(event) => props.setSearchQuery(event.target.value)}
            placeholder={t?.searchDiariesPlaceholder || (isRtl ? 'ابحث في التدوينات، المشاعر، أو الملاحظات...' : 'Search entries, moods, notes...')}
            className="h-10.5 w-full rounded-2xl border border-black/10 blomeo-surface ps-9 pe-9 text-xs font-bold text-[var(--blomeo-text)] outline-none transition focus:border-[var(--blomeo-accent)] focus:ring-2 focus:ring-[var(--blomeo-accent)]/15 dark:border-white/10"
            aria-label={isRtl ? 'بحث في اليوميات' : 'Search diaries'}
          />
          {props.searchQuery ? (
            <button
              type="button"
              data-compact-control="true"
              onClick={() => props.setSearchQuery('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full blomeo-surface-nested p-1 text-[var(--blomeo-text-muted)] transition hover:text-[var(--blomeo-text)]"
              aria-label={isRtl ? 'مسح البحث' : 'Clear search'}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => props.onStartNewDiary()}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[var(--blomeo-accent)] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>{isRtl ? '+ تدوينة جديدة' : '+ New entry'}</span>
        </button>
      </div>

      {/* Quick-access pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <button
          type="button"
          onClick={props.onOpenProsConsHistory}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 blomeo-surface-nested px-3 py-1.5 text-[10px] font-black text-[var(--blomeo-text)] transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
        >
          <Scale className="h-3.5 w-3.5 text-[var(--blomeo-gold)]" />
          <span>{isRtl ? 'سجل الإيجابيات والسلبيات' : 'Pros & cons history'}</span>
        </button>
        <button
          type="button"
          onClick={props.onOpenAttachmentsPage}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 blomeo-surface-nested px-3 py-1.5 text-[10px] font-black text-[var(--blomeo-text)] transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
        >
          <Folder className="h-3.5 w-3.5 text-[var(--blomeo-accent)]" />
          <span>{t?.attachmentsPageTitle || (isRtl ? 'المرفقات' : 'Attachments')}</span>
        </button>
      </div>

      {/* Horizontally scrollable filter chips — never clip Arabic labels */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        {filterItems.map((item) => {
          const active = props.diaryTypeFilter === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => props.setDiaryTypeFilter(item.value)}
              className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black transition ${
                active
                  ? 'border-[var(--blomeo-accent)] bg-[var(--blomeo-accent)] text-white shadow-sm'
                  : 'border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] hover:border-[var(--blomeo-accent)] dark:border-white/10'
              }`}
            >
              {item.value === 'favorites' ? <Star className="h-3 w-3" /> : null}
              {item.value === 'archived' ? <Archive className="h-3 w-3" /> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Unique tags */}
      {props.allUniqueTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="shrink-0 whitespace-nowrap text-[9px] font-black text-[var(--blomeo-text-muted)]">
            {isRtl ? 'الوسوم:' : 'Tags:'}
          </span>
          <button
            type="button"
            onClick={() => props.setSelectedTagFilter('')}
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black transition ${
              props.selectedTagFilter === ''
                ? 'bg-[var(--blomeo-accent)] text-white'
                : 'border border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] dark:border-white/10'
            }`}
          >
            {isRtl ? 'الكل' : 'All'}
          </button>
          {props.allUniqueTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => props.setSelectedTagFilter(tag)}
              className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-black transition ${
                props.selectedTagFilter === tag
                  ? 'bg-[var(--blomeo-accent)] text-white'
                  : 'border border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] dark:border-white/10'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
      {compact ? null : null}
    </div>
  );
}

export const BlomeoDiaryWorkspace: React.FC<BlomeoDiaryWorkspaceProps> = (props) => {
  // All hooks unconditionally at the top — before the editingDiary early return.
  const [vaultOpen, setVaultOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  const groupedDays = useMemo(() => {
    const { sortedDays, groups } = props.memoizedGroupedDiaries;
    return sortedDays
      .map((dayKey) => ({
        dayKey,
        dayEntries: groups[dayKey]?.dayEntries || [],
        formattedDayLabel: groups[dayKey]?.formattedDayLabel || dayKey
      }))
      .filter((day) => day.dayEntries.length > 0);
  }, [props.memoizedGroupedDiaries]);

  const dayCards = useMemo(
    () =>
      groupedDays.map((day) => (
        <BlomeoDayCard
          key={day.dayKey}
          dayKey={day.dayKey}
          formattedDayLabel={day.formattedDayLabel}
          entries={day.dayEntries}
          appLanguage={props.appLanguage}
          isRtl={props.isRtl}
          t={props.t}
          onSelectDiary={props.onSelectDiary}
          onToggleFavorite={props.onToggleFavorite}
          onToggleArchive={props.onToggleArchive}
          onOpenDayRating={props.onOpenDayRating}
          onOpenProsCons={props.onOpenProsCons}
          onRefreshDayAIMood={props.onRefreshDayAIMood}
          onUpdateDiaryImportance={props.onUpdateDiaryImportance}
        />
      )),
    [groupedDays, props]
  );

  // Editing mode: the editor renders its own adaptive three-pane workspace.
  if (props.editingDiary) {
    return (
      <BlomeoNoteEditor
        allDiariesVault={props.diaries}
        onSelectVaultEntry={props.onSelectDiary}
        {...props.editorProps}
        editingDiary={props.editingDiary}
      />
    );
  }

  const { isRtl, t } = props;

  return (
    <div className="blomeo-topographic-canvas min-h-[calc(100dvh-6rem)] w-full px-3 pb-nav-safe pt-3 sm:px-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex w-full max-w-[1500px] gap-4">
        {/* DESKTOP LEFT: collapsible day vault ------------------------ */}
        {vaultOpen && !focusMode && (
          <aside className="hidden w-80 shrink-0 lg:block" aria-label={isRtl ? 'خزنة اليوميات' : 'Diary vault'}>
            <div className="sticky top-3 max-h-[calc(100dvh-6rem)] space-y-3 overflow-y-auto pe-1 scrollbar-none">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--blomeo-text-muted)]">blomeo / diary</p>
                  <h1 className="truncate text-lg font-black text-[var(--blomeo-text)]">
                    {isRtl ? 'خزنة اليوميات' : 'Diary vault'}
                  </h1>
                </div>
                <button
                  type="button"
                  data-compact-control="true"
                  onClick={() => setVaultOpen(false)}
                  className="shrink-0 rounded-full border border-black/10 blomeo-surface p-2 text-[var(--blomeo-text-secondary)] transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
                  title={isRtl ? 'إخفاء الخزنة' : 'Hide vault'}
                  aria-label={isRtl ? 'إخفاء الخزنة' : 'Hide vault'}
                >
                  <ChevronLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="rounded-[22px] border border-black/10 blomeo-surface p-3 shadow-sm dark:border-white/10">
                <FeedControls props={props} compact />
              </div>

              <div className="space-y-3">{dayCards}</div>
            </div>
          </aside>
        )}

        {!vaultOpen && !focusMode && (
          <button
            type="button"
            onClick={() => setVaultOpen(true)}
            className="hidden h-10 w-10 shrink-0 items-center justify-center self-start rounded-full border border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] transition hover:border-[var(--blomeo-accent)] lg:flex dark:border-white/10"
            title={isRtl ? 'إظهار الخزنة' : 'Show vault'}
            aria-label={isRtl ? 'إظهار الخزنة' : 'Show vault'}
          >
            <ChevronLeft className={`h-4 w-4 ${isRtl ? '' : 'rotate-180'}`} />
          </button>
        )}

        {/* CENTER: calm editorial writing pane ----------------------- */}
        <main className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-2 rounded-[22px] border border-black/10 blomeo-surface px-3 py-2.5 shadow-sm dark:border-white/10">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--blomeo-gold)]" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-[var(--blomeo-text)]">
                  {isRtl ? 'مساحتك الهادئة للكتابة' : 'Your calm writing space'}
                </p>
                <p className="truncate text-[10px] text-[var(--blomeo-text-muted)]">
                  {isRtl ? 'كل يوم صفحة جديدة من قصتك.' : 'Every day is a new page of your story.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-compact-control="true"
              onClick={() => setFocusMode((value) => !value)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 blomeo-surface-nested px-2.5 py-1.5 text-[10px] font-black text-[var(--blomeo-text-secondary)] transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
              title={isRtl ? 'وضع التركيز' : 'Focus / Zen mode'}
            >
              {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isRtl ? (focusMode ? 'إنهاء التركيز' : 'وضع التركيز') : focusMode ? 'Exit focus' : 'Focus'}</span>
            </button>
          </div>

          {/* Mobile / tablet feed: controls live here, desktop hides them */}
          <div className="space-y-3 lg:hidden">
            <div className="rounded-[22px] border border-black/10 blomeo-surface p-3 shadow-sm dark:border-white/10">
              <FeedControls props={props} />
            </div>
            {dayCards}
          </div>

          {/* Desktop editorial canvas */}
          <div className={`${focusMode ? 'mx-auto max-w-4xl' : ''} hidden space-y-4 lg:block`}>
            <section className="overflow-hidden rounded-[28px] border border-black/10 blomeo-surface p-6 shadow-sm dark:border-white/10">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blomeo-gold)]/15 px-2.5 py-1 text-[10px] font-black text-[var(--blomeo-text)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--blomeo-gold)]" />
                    {isRtl ? 'مساحة كتابة هادئة' : 'A calm writing space'}
                  </span>
                  <h2 className="mt-3 text-2xl font-black leading-snug text-[var(--blomeo-text)] xl:text-3xl">
                    {isRtl ? 'ماذا تريد أن تتذكر من اليوم؟' : 'What do you want to remember from today?'}
                  </h2>
                  <p className="mt-2 max-w-xl text-[13px] leading-6 text-[var(--blomeo-text-secondary)]">
                    {isRtl
                      ? 'اكتب دون أحكام. ستبقى أفكارك مرتبة، قابلة للبحث، ومتصلة بمزاجك اليومي.'
                      : 'Write without judgement. Your thoughts stay organized, searchable, and connected to your daily mood.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => props.onStartNewDiary()}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--blomeo-accent)] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:brightness-110 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isRtl ? 'ابدأ الكتابة الآن' : 'Start writing now'}</span>
                  </button>
                </div>
                <BookOpen className="hidden h-14 w-14 shrink-0 text-[var(--blomeo-accent)]/25 xl:block" aria-hidden="true" />
              </div>
            </section>

            {/* Recent entries preview grid */}
            {props.filteredDiariesList.length > 0 && (
              <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {props.filteredDiariesList.slice(0, 6).map((diary) => (
                  <button
                    key={diary.id}
                    type="button"
                    onClick={() => props.onSelectDiary(diary)}
                    className="rounded-[22px] border border-black/10 blomeo-surface p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="shrink-0 text-[10px] font-bold text-[var(--blomeo-text-muted)]">
                        {new Date(diary.updatedAt || diary.createdAt).toLocaleDateString(isRtl ? 'ar' : 'en', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span className={`shrink-0 text-[11px] ${diary.isFavorite ? 'text-rose-500' : 'text-[var(--blomeo-text-muted)]/50'}`}>
                        <Star className="h-4 w-4" fill={diary.isFavorite ? 'currentColor' : 'none'} />
                      </span>
                    </div>
                    <h3 className="truncate text-xs font-black text-[var(--blomeo-text)]">
                      {diary.title || (isRtl ? 'يومية بدون عنوان' : 'Untitled entry')}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--blomeo-text-secondary)]">
                      {(diary.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
                        (isRtl ? 'لا يوجد نص بعد' : 'No text yet')}
                    </p>
                  </button>
                ))}
              </section>
            )}
          </div>
        </main>

        {/* RIGHT: calm context rail ----------------------------------- */}
        {!focusMode && (
          <aside className="hidden w-72 shrink-0 space-y-3 xl:block" aria-label={isRtl ? 'لوحة السياق' : 'Context rail'}>
            <div className="rounded-[22px] border border-black/10 blomeo-surface p-3.5 shadow-sm dark:border-white/10">
              <p className="mb-2 text-[10px] font-black text-[var(--blomeo-text)]">
                {isRtl ? 'حالة المساعد الذكي' : 'Background AI'}
              </p>
              <BackgroundAIStatus appLanguage={props.appLanguage} />
            </div>
            <button
              type="button"
              onClick={props.onOpenProsConsHistory}
              className="flex w-full items-center gap-2 rounded-[22px] border border-[var(--blomeo-gold)]/25 bg-[var(--blomeo-gold)]/10 p-3.5 text-start transition hover:bg-[var(--blomeo-gold)]/20"
            >
              <Scale className="h-4 w-4 shrink-0 text-[var(--blomeo-gold)]" />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black text-[var(--blomeo-text)]">
                  {isRtl ? 'ميزان الإيجابيات والسلبيات' : 'Pros & cons balance'}
                </span>
                <span className="block truncate text-[9px] text-[var(--blomeo-text-muted)]">
                  {isRtl ? 'سجل التقارير اليومية' : 'Daily report history'}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={props.onOpenAttachmentsPage}
              className="flex w-full items-center gap-2 rounded-[22px] border border-black/10 blomeo-surface p-3.5 text-start shadow-sm transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-[var(--blomeo-accent)]" />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black text-[var(--blomeo-text)]">
                  {t?.attachmentsPageTitle || (isRtl ? 'المرفقات والوسائط' : 'Attachments & media')}
                </span>
                <span className="block truncate text-[9px] text-[var(--blomeo-text-muted)]">
                  {isRtl ? 'صور، صوت، فيديو، وملفات' : 'Images, audio, video & files'}
                </span>
              </span>
            </button>
          </aside>
        )}
      </div>

      {/* Mobile FAB — never locks body scroll */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] end-4 z-20 lg:hidden">
        <button
          type="button"
          onClick={() => props.onStartNewDiary()}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--blomeo-accent)] text-white shadow-2xl transition hover:scale-105 active:scale-95"
          title={isRtl ? 'تدوينة جديدة' : 'New entry'}
          aria-label={isRtl ? 'تدوينة جديدة' : 'New entry'}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default BlomeoDiaryWorkspace;
