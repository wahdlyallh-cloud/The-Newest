import React, { memo, useMemo } from 'react';
import {
  Archive,
  Clock3,
  FileText,
  Heart,
  Image as ImageIcon,
  Mic2,
  PenTool,
  Paperclip,
  Scale,
  Sparkles,
  Star,
  Video
} from 'lucide-react';
import { DiaryEntry } from '../types';
import { extractEntryPreMoods, getJournalTypeBadge } from '../lib/journalTypes';

export interface BlomeoDayCardProps {
  dayKey: string;
  formattedDayLabel: string;
  entries: DiaryEntry[];
  /** Backward-compatible alias used by earlier vault revisions. */
  dayEntries?: DiaryEntry[];
  appLanguage?: string;
  isRtl: boolean;
  t?: any;
  onSelectDiary: (diary: DiaryEntry) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onOpenDayRating: (dayKey: string) => void;
  onOpenProsCons: (dayKey: string, formattedDayLabel: string, entries: DiaryEntry[]) => void;
  onRefreshDayAIMood?: (dayKey: string) => void;
  onUpdateDiaryImportance?: (diaryId: string, importance: number) => void;
}

const MOOD_COLORS = ['#2D6A4F', '#D4A359', '#72A99A', '#B9876A', '#8D9BC4'];

/** Safely turns rich editor HTML into a calm single-line plain-text excerpt. */
export const stripDiaryHtml = (value?: string): string =>
  (value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Day-grouped card shared by the desktop vault and the mobile list.
 * All colours come from the active Blomeo theme tokens so light stays
 * sage/ivory and dark stays aquatic-emerald with zero white leaks.
 */
export const BlomeoDayCard = memo(function BlomeoDayCard({
  dayKey,
  formattedDayLabel,
  entries,
  dayEntries,
  isRtl,
  t,
  onSelectDiary,
  onToggleFavorite,
  onToggleArchive,
  onOpenDayRating,
  onOpenProsCons,
  onRefreshDayAIMood,
  onUpdateDiaryImportance
}: BlomeoDayCardProps) {
  // Hooks unconditionally at the top, before any early return.
  const dayItems = useMemo(() => (entries && entries.length ? entries : dayEntries || []), [entries, dayEntries]);

  const distribution = useMemo(() => {
    const explicit = dayItems.flatMap((entry) => entry.aiMoodAnalysis || []);
    let buckets: Array<[string, number]>;

    if (explicit.length > 0) {
      const totals: Record<string, number> = {};
      explicit.forEach((item) => {
        totals[item.mood] = (totals[item.mood] || 0) + Math.max(0, item.percentage || 0);
      });
      buckets = Object.entries(totals);
    } else {
      const moods = dayItems.flatMap((entry) => extractEntryPreMoods(entry));
      const totals: Record<string, number> = {};
      moods.forEach((mood) => {
        totals[mood] = (totals[mood] || 0) + 1;
      });
      buckets = Object.entries(totals);
    }

    const total = buckets.reduce((sum, [, value]) => sum + value, 0);
    if (!total) return [] as Array<{ mood: string; percentage: number }>;

    const normalized = buckets
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([mood, value]) => ({ mood, percentage: Math.round((value / total) * 100) }));

    // Keep the stacked bar exactly 100% even after rounding.
    const drift = 100 - normalized.reduce((sum, item) => sum + item.percentage, 0);
    if (normalized.length && drift !== 0) {
      normalized[0].percentage = Math.max(0, normalized[0].percentage + drift);
    }
    return normalized;
  }, [dayItems]);

  const legend = distribution.length
    ? distribution
    : [{ mood: isRtl ? 'هادئ' : 'Calm', percentage: 100 }];

  return (
    <section
      className="rounded-[22px] border border-black/10 blomeo-surface p-3 shadow-[0_10px_26px_-20px_rgba(17,38,28,.45)] dark:border-white/10"
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={formattedDayLabel}
    >
      {/* Day header ---------------------------------------------------- */}
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-black text-[var(--blomeo-text)]">{formattedDayLabel}</h3>
            <p className="mt-0.5 text-[10px] font-semibold text-[var(--blomeo-text-muted)]">
              {dayItems.length} {isRtl ? 'تدوينة' : 'entries'}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--blomeo-accent)]/10 px-2 py-0.5 text-[9px] font-black text-[var(--blomeo-accent)]">
            {dayItems.length}
          </span>
        </div>
        <button
          type="button"
          data-compact-control="true"
          onClick={() => onOpenDayRating(dayKey)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--blomeo-gold)]/25 bg-[var(--blomeo-gold)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--blomeo-gold)] transition hover:bg-[var(--blomeo-gold)]/20"
          aria-label={isRtl ? 'تقييم اليوم' : 'Rate this day'}
          title={isRtl ? 'تقييم اليوم' : 'Rate this day'}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          <span>☆</span>
        </button>
      </header>

      {/* AI daily-mood breakdown --------------------------------------- */}
      <div className="mb-2.5 rounded-2xl border border-black/5 blomeo-surface-nested p-2.5 dark:border-white/5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-[10px] font-black text-[var(--blomeo-text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--blomeo-gold)]" />
            <span className="truncate">{t?.dailyMoodAnalysis || (isRtl ? 'تحليل مزاج اليوم بالذكاء الاصطناعي' : 'AI daily mood breakdown')}</span>
          </span>
          <button
            type="button"
            data-compact-control="true"
            onClick={() => onRefreshDayAIMood?.(dayKey)}
            className="shrink-0 rounded-full px-2 py-1 text-[9px] font-black text-[var(--blomeo-accent)] transition hover:bg-[var(--blomeo-card)]"
            title={isRtl ? 'تحديث تحليل اليوم' : 'Refresh AI mood'}
          >
            ✨ {isRtl ? 'تحديث بالـ AI' : 'Refresh with AI'}
          </button>
        </div>
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
          role="img"
          aria-label={isRtl ? 'توزيع مشاعر اليوم' : 'Daily mood distribution'}
        >
          {legend.map((item, index) => (
            <span
              key={`${item.mood}-${index}`}
              className="h-full transition-all duration-500"
              style={{ width: `${item.percentage}%`, backgroundColor: MOOD_COLORS[index % MOOD_COLORS.length] }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {legend.map((item, index) => (
            <span
              key={`${item.mood}-legend-${index}`}
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-black/5 blomeo-surface px-2 py-0.5 text-[9px] font-bold text-[var(--blomeo-text-secondary)] dark:border-white/10"
            >
              <i
                className="me-1 inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: MOOD_COLORS[index % MOOD_COLORS.length] }}
              />
              {item.percentage}% {item.mood}
            </span>
          ))}
        </div>
      </div>

      {/* Direct daily pros/cons strip ---------------------------------- */}
      <button
        type="button"
        onClick={() => onOpenProsCons(dayKey, formattedDayLabel, dayItems)}
        className="mb-2.5 flex min-h-10 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--blomeo-gold)]/25 bg-[var(--blomeo-gold)]/10 px-3 py-2 text-start transition hover:bg-[var(--blomeo-gold)]/20"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Scale className="h-4 w-4 shrink-0 text-[var(--blomeo-gold)]" />
          <span className="truncate text-[11px] font-black text-[var(--blomeo-text)]">
            ⚖️ {isRtl ? 'ميزان الإيجابيات والسلبيات والتقرير اليومي' : 'Daily pros, cons & report'}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full blomeo-surface px-1.5 py-0.5 text-[9px] font-semibold text-[var(--blomeo-text-muted)]">
          {isRtl ? '12:00 ص · نص فقط' : '12:00 AM · Text only'}
        </span>
      </button>

      {/* Entry cards ---------------------------------------------------- */}
      <div className="space-y-2">
        {dayItems.map((entry) => {
          const moods = extractEntryPreMoods(entry);
          const audioCount = entry.audioRecordings?.length || 0;
          const imageCount = entry.images?.length || 0;
          const videoCount = entry.videos?.length || 0;
          const fileCount = entry.files?.length || 0;
          const sketchCount = (entry.drawings?.length || 0) + (entry.drawing ? 1 : 0);
          const mediaCount = audioCount + imageCount + videoCount + fileCount + sketchCount;
          const edited = Boolean(entry.isEdited || (entry.edits && entry.edits.length > 0));
          const time = new Date(entry.updatedAt || entry.createdAt).toLocaleTimeString(isRtl ? 'ar' : 'en', {
            hour: 'numeric',
            minute: '2-digit'
          });

          return (
            <article
              key={entry.id}
              className="group rounded-[18px] border border-black/5 blomeo-surface-nested p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/5"
              onClick={() => onSelectDiary(entry)}
            >
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-[11px]" aria-hidden="true">
                      {getJournalTypeBadge(entry.diaryType, t).split(' ')[0]}
                    </span>
                    <h4 className="truncate text-xs font-black text-[var(--blomeo-text)]">
                      {entry.title || (isRtl ? 'يومية بدون عنوان' : 'Untitled entry')}
                    </h4>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-5 text-[var(--blomeo-text-secondary)]">
                    {stripDiaryHtml(entry.content) || (isRtl ? 'لا يوجد نص بعد' : 'No text yet')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    data-compact-control="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(entry.id);
                    }}
                    className={`rounded-full p-1.5 transition hover:bg-[var(--blomeo-card)] ${
                      entry.isFavorite ? 'text-rose-500' : 'text-[var(--blomeo-text-muted)]'
                    }`}
                    aria-label={isRtl ? 'إضافة للمفضلة' : 'Toggle favorite'}
                    title={isRtl ? 'المفضلة' : 'Favorite'}
                  >
                    <Heart className="h-4 w-4" fill={entry.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    data-compact-control="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleArchive(entry.id);
                    }}
                    className={`rounded-full p-1.5 transition hover:bg-[var(--blomeo-card)] ${
                      entry.isArchived ? 'text-[var(--blomeo-gold)]' : 'text-[var(--blomeo-text-muted)]'
                    }`}
                    aria-label={isRtl ? 'أرشفة' : 'Toggle archive'}
                    title={isRtl ? 'الأرشيف' : 'Archive'}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <div className="flex shrink-0 items-center gap-0" aria-label={isRtl ? 'أهمية التدوينة' : 'Entry importance'}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        data-compact-control="true"
                        onClick={(event) => {
                          event.stopPropagation();
                          onUpdateDiaryImportance?.(entry.id, star);
                        }}
                        className={`px-0 text-[12px] leading-none transition ${
                          star <= (entry.importance || 0)
                            ? 'text-[var(--blomeo-gold)]'
                            : 'text-[var(--blomeo-text-muted)]/40'
                        }`}
                        aria-label={`${star} ${isRtl ? 'نجوم' : 'stars'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {moods.slice(0, 3).map((mood) => (
                    <span
                      key={mood}
                      className="shrink-0 whitespace-nowrap rounded-full blomeo-surface px-1.5 py-0.5 text-[9px] font-bold text-[var(--blomeo-text-secondary)]"
                    >
                      {mood}
                    </span>
                  ))}
                  {entry.aiMoodAnalysis?.length ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--blomeo-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--blomeo-accent)]">
                      ✨ {isRtl ? 'تحليل الذكاء الاصطناعي للكتابة' : 'AI writing analysis'}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[9px] font-semibold text-[var(--blomeo-text-muted)]">
                  <Clock3 className="h-3 w-3" />
                  <span>{time}</span>
                  {edited ? <span className="text-[var(--blomeo-accent)]">· {isRtl ? 'معدّل' : 'edited'}</span> : null}
                </div>
              </div>

              {mediaCount > 0 && (
                <div className="mt-2 flex items-center gap-2 border-t border-black/5 pt-1.5 text-[var(--blomeo-text-muted)] dark:border-white/5">
                  {audioCount > 0 && (
                    <span className="inline-flex items-center gap-0.5" title={isRtl ? 'تسجيلات صوتية / تفريغ' : 'Audio / transcription'}>
                      <Mic2 className="h-3 w-3" />
                      <span className="text-[9px]">{audioCount}</span>
                    </span>
                  )}
                  {imageCount > 0 && (
                    <span className="inline-flex items-center gap-0.5" title={isRtl ? 'صور' : 'Images'}>
                      <ImageIcon className="h-3 w-3" />
                      <span className="text-[9px]">{imageCount}</span>
                    </span>
                  )}
                  {videoCount > 0 && (
                    <span className="inline-flex items-center gap-0.5" title={isRtl ? 'فيديو' : 'Video'}>
                      <Video className="h-3 w-3" />
                      <span className="text-[9px]">{videoCount}</span>
                    </span>
                  )}
                  {fileCount > 0 && (
                    <span className="inline-flex items-center gap-0.5" title={isRtl ? 'ملفات PDF ووثائق' : 'PDF & files'}>
                      <FileText className="h-3 w-3" />
                      <span className="text-[9px]">{fileCount}</span>
                    </span>
                  )}
                  {sketchCount > 0 && (
                    <span className="inline-flex items-center gap-0.5" title={isRtl ? 'رسومات' : 'Sketches'}>
                      <PenTool className="h-3 w-3" />
                      <span className="text-[9px]">{sketchCount}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-0.5" title={isRtl ? 'مرفقات' : 'Attachments'}>
                    <Paperclip className="h-3 w-3" />
                    <span className="text-[9px]">{mediaCount}</span>
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
});

export default BlomeoDayCard;
