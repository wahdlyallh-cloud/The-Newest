import React, { memo, useMemo } from 'react';
import { Archive, Clock3, FileText, Heart, Image as ImageIcon, Mic2, MoreHorizontal, Paperclip, Play, Scale, Star, Sparkles, Video } from 'lucide-react';
import { DiaryEntry } from '../types';
import { extractEntryPreMoods, getJournalTypeBadge } from '../lib/journalTypes';

export interface BlomeoDayCardProps {
  dayKey: string;
  formattedDayLabel: string;
  entries: DiaryEntry[];
  t: any;
  isRtl: boolean;
  onSelectDiary: (diary: DiaryEntry) => void;
  onToggleFavorite: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onOpenDayRating: (dayKey: string) => void;
  onOpenProsCons: (dayKey: string, label: string, entries: DiaryEntry[]) => void;
  onRefreshDayAIMood?: (dayKey: string) => void;
  onUpdateDiaryImportance?: (id: string, importance: number) => void;
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const moodColors = ['#2D6A4F', '#D4A359', '#72A99A', '#B9876A', '#8D9BC4'];

export const BlomeoDayCard = memo(function BlomeoDayCard({
  dayKey, formattedDayLabel, entries, t, isRtl, onSelectDiary, onToggleFavorite, onToggleArchive,
  onOpenDayRating, onOpenProsCons, onRefreshDayAIMood, onUpdateDiaryImportance
}: BlomeoDayCardProps) {
  const distribution = useMemo(() => {
    const explicit = entries.flatMap((entry) => entry.aiMoodAnalysis || []);
    if (explicit.length) {
      const totals = explicit.reduce<Record<string, number>>((acc, item) => {
        acc[item.mood] = (acc[item.mood] || 0) + Math.max(0, item.percentage || 0);
        return acc;
      }, {});
      const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
      return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([mood, value]) => ({ mood, percentage: Math.round(value / sum * 100) }));
    }
    const moods = entries.flatMap(extractEntryPreMoods);
    const totals = moods.reduce<Record<string, number>>((acc, mood) => { acc[mood] = (acc[mood] || 0) + 1; return acc; }, {});
    const sum = moods.length || 1;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([mood, value]) => ({ mood, percentage: Math.round(value / sum * 100) }));
  }, [entries]);

  return (
    <section className="rounded-[24px] border border-black/10 bg-[var(--blomeo-surface)] p-3.5 shadow-[0_12px_30px_-22px_rgba(17,38,28,.5)] dark:border-white/10" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--blomeo-text)]">{formattedDayLabel}</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[var(--blomeo-text-muted)]">{entries.length} {isRtl ? 'تدوينات' : 'entries'}</p>
        </div>
        <button type="button" onClick={() => onOpenDayRating(dayKey)} className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--blomeo-surface-nested)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--blomeo-gold)]" aria-label={isRtl ? 'تقييم اليوم' : 'Rate day'}>
          <Star className="h-3.5 w-3.5 fill-current" /> <span>☆</span>
        </button>
      </header>

      <div className="mb-3 rounded-2xl bg-[var(--blomeo-surface-nested)] p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[10px] font-black text-[var(--blomeo-text-secondary)]"><Sparkles className="h-3.5 w-3.5 text-[var(--blomeo-gold)]" />{isRtl ? 'مزاج اليوم بالذكاء الاصطناعي' : "Today's AI mood"}</span>
          <button type="button" onClick={() => onRefreshDayAIMood?.(dayKey)} className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold text-[var(--blomeo-accent)] hover:bg-[var(--blomeo-surface)]">{isRtl ? 'تحديث' : 'Refresh'}</button>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/10" aria-label="AI mood distribution">
          {distribution.length ? distribution.map((item, index) => <span key={`${item.mood}-${index}`} style={{ width: `${item.percentage}%`, background: moodColors[index % moodColors.length] }} />) : <span className="w-full bg-[var(--blomeo-accent)]/30" />}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {(distribution.length ? distribution : [{ mood: isRtl ? 'هادئ' : 'Calm', percentage: 100 }]).map((item, index) => <span key={`${item.mood}-legend`} className="shrink-0 whitespace-nowrap rounded-full border border-black/5 bg-[var(--blomeo-surface)] px-2 py-1 text-[9px] font-bold text-[var(--blomeo-text-secondary)]"><i className="me-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: moodColors[index % moodColors.length] }} />{item.percentage}% {item.mood}</span>)}
        </div>
      </div>

      <button type="button" onClick={() => onOpenProsCons(dayKey, formattedDayLabel, entries)} className="mb-3 flex min-h-10 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--blomeo-gold)]/25 bg-[var(--blomeo-gold)]/10 px-3 py-2 text-start text-[11px] font-black text-[var(--blomeo-text)] hover:bg-[var(--blomeo-gold)]/15">
        <span className="flex min-w-0 items-center gap-2"><Scale className="h-4 w-4 shrink-0 text-[var(--blomeo-gold)]" /><span className="truncate">⚖️ {isRtl ? 'ميزان الإيجابيات والسلبيات والتقرير اليومي' : 'Daily pros, cons & report'}</span></span><span className="shrink-0 text-[9px] font-semibold text-[var(--blomeo-text-muted)]">12:00 ص · {isRtl ? 'نص فقط' : 'Text'}</span>
      </button>

      <div className="space-y-2">
        {entries.map((entry) => {
          const moods = extractEntryPreMoods(entry);
          const mediaCount = (entry.audioRecordings?.length || 0) + (entry.images?.length || 0) + (entry.videos?.length || 0) + (entry.files?.length || 0) + (entry.drawings?.length || (entry.drawing ? 1 : 0));
          return <article key={entry.id} className="group rounded-[19px] border border-black/5 bg-[var(--blomeo-surface-nested)] p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/5" onDoubleClick={() => onSelectDiary(entry)}>
            <div className="flex items-start gap-2.5">
              <button type="button" onClick={() => onSelectDiary(entry)} className="min-w-0 flex-1 text-start">
                <div className="mb-1 flex items-center gap-1.5"><span className="text-[10px]">{getJournalTypeBadge(entry.diaryType, t).split(' ')[0]}</span><h3 className="truncate text-xs font-black text-[var(--blomeo-text)]">{entry.title || (isRtl ? 'يومية بدون عنوان' : 'Untitled')}</h3></div>
                <p className="line-clamp-2 text-[11px] leading-5 text-[var(--blomeo-text-secondary)]">{stripHtml(entry.content || (isRtl ? 'لا يوجد نص بعد' : 'No text yet'))}</p>
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" onClick={() => onToggleFavorite(entry.id)} className={`rounded-full p-1.5 ${entry.isFavorite ? 'text-rose-500' : 'text-[var(--blomeo-text-muted)]'}`} aria-label={isRtl ? 'المفضلة' : 'Favorite'}><Heart className="h-4 w-4" fill={entry.isFavorite ? 'currentColor' : 'none'} /></button>
                <button type="button" onClick={() => onToggleArchive(entry.id)} className={`rounded-full p-1.5 ${entry.isArchived ? 'text-[var(--blomeo-gold)]' : 'text-[var(--blomeo-text-muted)]'}`} aria-label={isRtl ? 'أرشفة' : 'Archive'}><Archive className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none">
                <div className="flex shrink-0 items-center gap-0.5" aria-label={isRtl ? 'أهمية التدوينة' : 'Importance'}>{[1,2,3,4,5].map((star) => <button key={star} type="button" onClick={() => onUpdateDiaryImportance?.(entry.id, star)} className={`p-0 text-[12px] ${star <= (entry.importance || 0) ? 'text-[var(--blomeo-gold)]' : 'text-[var(--blomeo-text-muted)]/40'}`}>★</button>)}</div>
                {moods.slice(0, 3).map((mood) => <span key={mood} className="shrink-0 whitespace-nowrap rounded-full bg-[var(--blomeo-surface)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--blomeo-text-secondary)]">{mood}</span>)}
                {entry.aiMoodAnalysis?.length ? <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--blomeo-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--blomeo-accent)]">✨ {isRtl ? 'تحليل AI' : 'AI analysis'}</span> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[9px] text-[var(--blomeo-text-muted)]"><Clock3 className="h-3 w-3" />{new Date(entry.updatedAt || entry.createdAt).toLocaleTimeString(isRtl ? 'ar' : 'en', { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--blomeo-text-muted)]">
              <div className="flex items-center gap-2">{entry.audioRecordings?.length ? <Mic2 className="h-3 w-3" /> : null}{entry.images?.length ? <ImageIcon className="h-3 w-3" /> : null}{entry.videos?.length ? <Video className="h-3 w-3" /> : null}{entry.files?.length ? <FileText className="h-3 w-3" /> : null}{mediaCount > 0 ? <span>{mediaCount}</span> : null}</div><MoreHorizontal className="h-3.5 w-3.5 opacity-50" />
            </div>
          </article>;
        })}
      </div>
    </section>
  );
});

export default BlomeoDayCard;
