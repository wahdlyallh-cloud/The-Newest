import React from 'react';
import { DiaryEntry, AppLanguage, JournalEntryType } from '../types';
import { getJournalTypeConfig, getJournalTypeLabel } from '../lib/journalTypes';
import { normalizeMoodDistribution } from '../lib/emotionNormalization';
const cleanDiaryText = (html: string | undefined) => (html || '').replace(/<[^>]+>/g, '').trim().slice(0, 120);
import {
  Calendar,
  Scale,
  Sparkles,
  Star,
  Trash2,
  Archive,
  RefreshCw,
  FileText,
  Volume2,
  Video,
  Image as ImageIcon,
  Paperclip,
  Check
} from 'lucide-react';
import DailyProsConsMediaSelector from './DailyProsConsMediaSelector';

interface BlomeoDayCardProps {
  dayKey: string;
  formattedDayLabel: string;
  dayEntries: DiaryEntry[];
  appLanguage: AppLanguage;
  isRtl: boolean;
  t: any;
  onOpenProsCons: (dayKey: string, formattedDayLabel: string, entries: DiaryEntry[]) => void;
  onSelectDiary: (diary: DiaryEntry) => void;
  onDeleteDiary: (diaryId: string) => void;
  onToggleFavorite: (diaryId: string) => void;
  onToggleArchive: (diaryId: string) => void;
  onOpenDayRating: (dayKey: string) => void;
  onRefreshDayAIMood?: (dayKey: string) => void;
  onUpdateDiaryImportance?: (diaryId: string, importance: number) => void;
}

export const BlomeoDayCard: React.FC<BlomeoDayCardProps> = ({
  dayKey,
  formattedDayLabel,
  dayEntries,
  appLanguage,
  isRtl,
  t,
  onOpenProsCons,
  onSelectDiary,
  onDeleteDiary,
  onToggleFavorite,
  onToggleArchive,
  onOpenDayRating,
  onRefreshDayAIMood,
  onUpdateDiaryImportance
}) => {
  // Compute normalized 100% daily mood breakdown across entries
  const moodInputs: Array<{ mood: string; count?: number; percentage?: number }> = [];
  dayEntries.forEach(d => {
    const moodsList = (d.preMoods && d.preMoods.length > 0)
      ? d.preMoods
      : (d.moods && d.moods.length > 0)
      ? d.moods
      : d.mood ? [d.mood] : [];
    moodsList.forEach(m => {
      if (m) moodInputs.push({ mood: m, count: 1 });
    });
    if (d.aiMoodAnalysis && Array.isArray(d.aiMoodAnalysis)) {
      d.aiMoodAnalysis.forEach(item => {
        if (item && item.mood) {
          moodInputs.push({ mood: item.mood, percentage: item.percentage });
        }
      });
    }
  });

  const dayBreakdown = normalizeMoodDistribution(moodInputs, isRtl ? 'ar' : 'en');

  const barColors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'
  ];
  const pillColors = [
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
  ];

  return (
    <div className="bg-[var(--blomeo-surface,#FFFFFF)] border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 transition-all">
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[rgba(45,106,79,0.12)] dark:border-[#1E4D3B]/30 pb-3 gap-2.5">
        <div className="flex items-center space-x-2.5 space-x-reverse flex-wrap gap-2">
          <div className="p-2 bg-[#2D6A4F]/10 dark:bg-[#74C69D]/20 text-[#2D6A4F] dark:text-[#74C69D] rounded-2xl shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-[var(--blomeo-text,#12261D)] dark:text-[#EAEFEA] text-sm md:text-base">
              {formattedDayLabel}
            </h3>
            <span className="text-[10.5px] font-bold text-gray-400 dark:text-gray-400">
              {dayEntries.length} {t?.entriesCountSuffix || (isRtl ? 'تدوينات' : 'entries')}
            </span>
          </div>

          {/* Day Star Rating Trigger */}
          <button
            type="button"
            onClick={() => onOpenDayRating(dayKey)}
            className="p-1.5 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200/60 dark:border-amber-800/60 transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
            title={isRtl ? 'تقييم اليوم' : 'Rate this day'}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold hidden sm:inline">{isRtl ? 'تقييم اليوم' : 'Rate Day'}</span>
          </button>
        </div>

        {/* Action Button: Daily Pros & Cons & Report */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenProsCons(dayKey, formattedDayLabel, dayEntries)}
            className="px-3 py-1.5 bg-gradient-to-r from-[#1E4D3B] via-[#2D6A4F] to-[#15382B] text-white rounded-xl text-xs font-black shadow-3xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-97 border border-white/20 shrink-0"
            title={t?.reviewProsConsTitle || (isRtl ? 'ميزان الإيجابيات والسلبيات والتقرير اليومي' : 'Pros & Cons and Daily Report')}
          >
            <Scale className="w-3.5 h-3.5 text-amber-200" />
            <span>⚖️ {isRtl ? 'ميزان الإيجابيات والسلبيات والتقرير اليومي' : 'Daily Pros & Cons & Report'}</span>
          </button>
          <DailyProsConsMediaSelector dateKey={dayKey} diaries={dayEntries} appLanguage={appLanguage} />
        </div>
      </div>

      {/* AI Daily Mood Breakdown Bar (100% Normalized) */}
      <div className="bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#14302B]/60 p-3 rounded-2xl border border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/40 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-black text-[var(--blomeo-text,#12261D)] dark:text-[#EAEFEA]">
          <div className="flex items-center gap-1.5">
            <span>✨</span>
            <span>{isRtl ? 'توزيع المزاج اليومي (100% بالذكاء الاصطناعي):' : 'AI Daily Mood Breakdown (100%):'}</span>
          </div>
          {onRefreshDayAIMood && (
            <button
              type="button"
              onClick={() => onRefreshDayAIMood(dayKey)}
              className="px-2 py-0.5 text-[10px] font-bold text-[#2D6A4F] dark:text-[#74C69D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{isRtl ? '✨ تحديث بالـ AI' : '✨ Refresh AI'}</span>
            </button>
          )}
        </div>

        {/* Stacked Proportional Bar */}
        <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex shadow-inner border border-gray-300 dark:border-gray-700">
          {dayBreakdown.length > 0 ? (
            dayBreakdown.map((item, idx) => (
              <div
                key={item.mood}
                style={{ width: `${item.percentage}%` }}
                className={`${barColors[idx % barColors.length]} h-full transition-all duration-500`}
                title={`${item.mood}: ${item.percentage}%`}
              />
            ))
          ) : (
            <div className="w-full h-full bg-emerald-400" title="100% Normal" />
          )}
        </div>

        {/* Legend Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {dayBreakdown.map((item, idx) => (
            <span
              key={item.mood}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 shadow-3xs ${pillColors[idx % pillColors.length]}`}
            >
              <span>{item.percentage}%</span>
              <span>{item.mood}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Entry Cards for that Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {dayEntries.map((diary) => {
          const typeCfg = getJournalTypeConfig(diary.diaryType);
          const isFavorite = diary.isFavorite === true || (diary.isFavorite === undefined && (diary.importance || 0) >= 4);
          const hasAudio = (diary.audioRecordings || []).length > 0;
          const hasImages = (diary.images || []).length > 0;
          const hasVideos = (diary.videos || []).length > 0;
          const hasFiles = (diary.files || []).length > 0;
          const hasDrawings = Boolean((diary.drawings && diary.drawings.length > 0) || diary.drawing);

          const preMoods = (diary.preMoods && diary.preMoods.length > 0)
            ? diary.preMoods
            : (diary.moods && diary.moods.length > 0)
            ? diary.moods
            : diary.mood ? [diary.mood] : [];

          return (
            <div
              key={diary.id}
              onClick={() => onSelectDiary(diary)}
              className="group relative bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2621] border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 hover:border-[#2D6A4F] dark:hover:border-[#74C69D] rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-3xs hover:shadow-xs space-y-2.5"
            >
              {/* Card Top: Type Badge + Star Rating + Action Icons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black shrink-0 border ${typeCfg.pillBadgeClass}`}>
                    {typeCfg.icon} {getJournalTypeLabel(diary.diaryType, t)}
                  </span>
                  {/* Interactive 5-Star Rating */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onUpdateDiaryImportance) {
                            onUpdateDiaryImportance(diary.id, s);
                          }
                        }}
                        className="cursor-pointer p-0.5 hover:scale-120 transition-transform"
                        title={`${s} ${isRtl ? 'نجوم' : 'stars'}`}
                      >
                        <Star
                          className={`w-3 h-3 ${s <= (diary.importance || 1) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {/* Favorite Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(diary.id)}
                    className="p-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-500 transition-colors"
                    title={isFavorite ? (isRtl ? 'إزالة من المفضلة' : 'Remove favorite') : (isRtl ? 'إضافة للمفضلة' : 'Add favorite')}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
                  </button>

                  {/* Archive Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleArchive(diary.id)}
                    className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
                    title={diary.isArchived ? (isRtl ? 'استعادة من الأرشيف' : 'Restore from archive') : (isRtl ? 'أرشفة هذه المذكرة' : 'Archive note')}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>

                  {/* Trash */}
                  <button
                    type="button"
                    onClick={() => onDeleteDiary(diary.id)}
                    className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 transition-colors"
                    title={t?.moveToTrash || (isRtl ? 'حذف' : 'Delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Snippet */}
              <div className="space-y-1">
                <h4 className="font-extrabold text-[var(--blomeo-text,#12261D)] dark:text-[#EAEFEA] text-xs md:text-sm line-clamp-1 group-hover:text-[#2D6A4F] dark:group-hover:text-[#74C69D] transition-colors">
                  {diary.title || t?.subNoteDefaultTitle || (isRtl ? 'تدوينة بدون عنوان' : 'Untitled Note')}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                  {cleanDiaryText(diary.content) || <em className="text-gray-400 font-light text-[11px]">{t?.audioDrawingsOnly || (isRtl ? 'ملحقات وتسجيلات صوتية' : 'Attachments only')}</em>}
                </p>
                {/* Edit Count and Time */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold pt-0.5">
                  <span>{new Date(diary.updatedAt || diary.createdAt).toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  {(diary.isEdited || (diary.edits && diary.edits.length > 0)) && (
                    <span className="bg-[#2D6A4F]/10 dark:bg-[#74C69D]/20 text-[#214E3A] dark:text-[#74C69D] px-1.5 py-0.2 rounded-md font-extrabold text-[9px]">
                      {isRtl ? 'معدلة' : 'edited'} {diary.edits?.length ? `(${diary.edits.length})` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact Media Badges */}
              {(hasAudio || hasImages || hasVideos || hasFiles || hasDrawings) && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  {hasAudio && (
                    <span className="flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                      <Volume2 className="w-2.5 h-2.5" />
                      <span>{diary.audioRecordings.length}</span>
                    </span>
                  )}
                  {hasImages && (
                    <span className="flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                      <ImageIcon className="w-2.5 h-2.5" />
                      <span>{diary.images.length}</span>
                    </span>
                  )}
                  {hasVideos && (
                    <span className="flex items-center gap-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      <Video className="w-2.5 h-2.5" />
                      <span>{diary.videos.length}</span>
                    </span>
                  )}
                  {hasFiles && (
                    <span className="flex items-center gap-0.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-900">
                      <Paperclip className="w-2.5 h-2.5" />
                      <span>{diary.files.length}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Bottom: Multi-Select Pre-Writing Mood pills vs AI Sentiment */}
              <div className="pt-2 border-t border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/30 flex flex-wrap items-center justify-between gap-1.5">
                {/* Pre-writing moods */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-bold text-[#2D6A4F] dark:text-[#74C69D]">{isRtl ? 'مزاج البداية:' : 'Pre-Mood:'}</span>
                  {preMoods.slice(0, 3).map((m, idx) => (
                    <span
                      key={idx}
                      className="bg-[#2D6A4F]/10 dark:bg-[#74C69D]/20 text-[#214E3A] dark:text-[#74C69D] text-[9.5px] px-1.5 py-0.5 rounded-md font-extrabold border border-[#2D6A4F]/20"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                {/* AI Sentiment Analysis badge */}
                {diary.aiMoodAnalysis && diary.aiMoodAnalysis.length > 0 && (
                  <span
                    className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[9.5px] px-1.5 py-0.5 rounded-md font-bold border border-purple-200 dark:border-purple-800 flex items-center gap-1"
                    title={isRtl ? 'تحليل الذكاء الاصطناعي للكتابة' : 'AI Writing Sentiment'}
                  >
                    <span>✨</span>
                    <span>{diary.aiMoodAnalysis[0].mood} ({diary.aiMoodAnalysis[0].percentage}%)</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default BlomeoDayCard;
