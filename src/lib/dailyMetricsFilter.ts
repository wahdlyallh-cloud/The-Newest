/**
 * Safe Daily Metrics Filter & Interaction Tracker.
 * 
 * Ensures that pre-filled / baseline daily tracker defaults (water cups, sleep hours,
 * exercise minutes, anxiety symptoms checklist, mood score) are NEVER treated as real
 * user activity by Gemini, AI advisors, or mental health reports until the user has
 * explicitly tapped, adjusted, or logged them on that local date.
 */

import { AppLanguage } from './languages';

export type TrackedMetricKey = 'water' | 'sleep' | 'exercise' | 'anxietySymptoms' | 'mood';

export interface DailyTouchedRecord {
  [metric: string]: boolean | undefined;
  water?: boolean;
  sleep?: boolean;
  exercise?: boolean;
  anxietySymptoms?: boolean;
  mood?: boolean;
}

export type TouchedStore = Record<string, DailyTouchedRecord>; // Keyed by YYYY-MM-DD

const TOUCHED_STORAGE_KEY = 'yawmiyati_daily_metrics_touched';

/**
 * Returns the local date string in YYYY-MM-DD format.
 */
export function getLocalTodayYMD(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Loads all touched records from localStorage.
 */
export function loadAllTouchedMetrics(): TouchedStore {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(TOUCHED_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[dailyMetricsFilter] Failed to parse touched metrics:', e);
    return {};
  }
}

/**
 * Checks if a specific metric has been explicitly interacted with on a given date.
 */
export function isMetricTouched(dateYMD: string, metric: TrackedMetricKey, touchedStore?: TouchedStore): boolean {
  if (!dateYMD) return false;
  const store = touchedStore || loadAllTouchedMetrics();
  const dayRecord = store[dateYMD];
  return Boolean(dayRecord && dayRecord[metric] === true);
}

/**
 * Marks a metric as touched for a specific local date and persists it.
 */
export function markMetricTouched(dateYMD: string, metric: TrackedMetricKey): void {
  if (typeof window === 'undefined' || !window.localStorage || !dateYMD) return;
  try {
    const store = loadAllTouchedMetrics();
    if (!store[dateYMD]) {
      store[dateYMD] = {};
    }
    store[dateYMD][metric] = true;
    window.localStorage.setItem(TOUCHED_STORAGE_KEY, JSON.stringify(store));

    // Dispatch event so other components / views can update in real-time
    window.dispatchEvent(new CustomEvent('yawmiyati-metric-touched', {
      detail: { date: dateYMD, metric }
    }));
  } catch (e) {
    console.warn('[dailyMetricsFilter] Failed to persist touched metric:', e);
  }
}

/**
 * Localized badge label for "لم يُسجّل اليوم" across all 12 supported languages.
 */
export const NOT_RECORDED_TODAY_I18N: Record<AppLanguage, string> = {
  ar: 'لم يُسجّل اليوم',
  en: 'Not logged today',
  fr: "Non enregistré aujourd'hui",
  de: 'Heute nicht erfasst',
  es: 'No registrado hoy',
  it: 'Non registrato oggi',
  tr: 'Bugün kaydedilmedi',
  pt: 'Não registrado hoje',
  ru: 'Не записано сегодня',
  ja: '本日未記録',
  zh: '今日未记录',
  hi: 'आज दर्ज नहीं किया गया'
};

/**
 * Retrieves the localized label for untouched metrics.
 */
export function getNotRecordedTodayLabel(lang: AppLanguage = 'ar'): string {
  return NOT_RECORDED_TODAY_I18N[lang] || NOT_RECORDED_TODAY_I18N.ar;
}

/**
 * Strict AI safeguard notice instructing the model to never hallucinate or assume unlogged metrics.
 */
export const UNRECORDED_AI_DIRECTIVE = 'لم يُسجّل اليوم — لا تفترض حدوثه ولا تحسبه في التحليل أو التقرير';

export interface FilteredDiaryMetrics {
  isWaterTouched: boolean;
  waterCups: number | null;
  waterCupsFormatted: string;

  isSleepTouched: boolean;
  sleepHours: number | null;
  sleepHoursFormatted: string;

  isExerciseTouched: boolean;
  sportsDuration: number | null;
  sportsType?: string;
  exerciseFormatted: string;

  isSymptomsTouched: boolean;
  symptomsChecklist: string[];
  symptomsFormatted: string;

  isMoodTouched: boolean;
  fastMoodScore: number | null;
  moodFormatted: string;
}

/**
 * Sanitizes and filters daily metrics for a given diary entry based on its local date and touched status.
 * Any untouched metric returns null / explicit "لم يُسجّل اليوم" label.
 */
export function filterDiaryMetricsForAI(
  diary: any,
  touchedStore?: TouchedStore,
  lang: AppLanguage = 'ar'
): FilteredDiaryMetrics {
  const dateYMD = diary?.createdAt ? getLocalTodayYMD(diary.createdAt) : getLocalTodayYMD();
  const store = touchedStore || loadAllTouchedMetrics();

  const isWaterTouched = isMetricTouched(dateYMD, 'water', store);
  const isSleepTouched = isMetricTouched(dateYMD, 'sleep', store);
  const isExerciseTouched = isMetricTouched(dateYMD, 'exercise', store);
  const isSymptomsTouched = isMetricTouched(dateYMD, 'anxietySymptoms', store);
  const isMoodTouched = isMetricTouched(dateYMD, 'mood', store);

  const notLoggedText = `${getNotRecordedTodayLabel(lang)} (${UNRECORDED_AI_DIRECTIVE})`;

  return {
    isWaterTouched,
    waterCups: isWaterTouched ? (diary?.waterCups ?? null) : null,
    waterCupsFormatted: isWaterTouched ? `${diary?.waterCups ?? 0} أكواب` : notLoggedText,

    isSleepTouched,
    sleepHours: isSleepTouched ? (diary?.sleepHours ?? null) : null,
    sleepHoursFormatted: isSleepTouched ? `${diary?.sleepHours ?? 0} ساعات` : notLoggedText,

    isExerciseTouched,
    sportsDuration: isExerciseTouched ? (diary?.sportsDuration ?? null) : null,
    sportsType: isExerciseTouched ? diary?.sportsType : undefined,
    exerciseFormatted: isExerciseTouched 
      ? `${diary?.sportsDuration ?? 0} دقيقة${diary?.sportsType ? ` (${diary.sportsType})` : ''}` 
      : notLoggedText,

    isSymptomsTouched,
    symptomsChecklist: isSymptomsTouched ? (diary?.symptomsChecklist || []) : [],
    symptomsFormatted: isSymptomsTouched && diary?.symptomsChecklist?.length > 0
      ? diary.symptomsChecklist.join(', ')
      : (isSymptomsTouched ? 'لا توجد أعراض مسجلة' : notLoggedText),

    isMoodTouched,
    fastMoodScore: isMoodTouched ? (diary?.fastMoodScore ?? null) : null,
    moodFormatted: isMoodTouched && diary?.fastMoodScore !== undefined
      ? `${diary.fastMoodScore}/10`
      : notLoggedText
  };
}
