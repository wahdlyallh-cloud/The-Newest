import { AppLanguage, DiaryEntry, Habit } from '../types';
import { DEFAULT_AI_MEDIA_ACCESS, AIMediaAccessPermission, encodePermittedMediaParts, extractDailyMediaSources } from './aiMediaAccess';
import { loadProsConsMediaPreference } from '../components/DailyProsConsMediaSelector';
import { PROS_CONS_STORAGE_KEY, DailyProsConsEntry } from '../components/DailyProsConsModal';
import { loadAllTouchedMetrics, isMetricTouched, filterDiaryMetricsForAI, TouchedStore } from './dailyMetricsFilter';
import { normalizeMoodDistribution } from './emotionNormalization';

export const OFFICIAL_PROS_CONS_STORAGE_KEY = 'officialProsConsByDate';
const REPORT_DONE_PREFIX = 'yawmiyati_daily_report_done_';
const HISTORY_KEY = 'yawmiyati_mental_health_reports_history';
const inFlightDates = new Set<string>();
let midnightTimer: ReturnType<typeof setTimeout> | null = null;
let minuteTimer: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

export function getLocalTodayYMD(input: Date | number | string = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${safe.getFullYear()}-${String(safe.getMonth() + 1).padStart(2, '0')}-${String(safe.getDate()).padStart(2, '0')}`;
}

function dayBounds(dateKey: string): { start: Date; end: Date } {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { start: new Date(year, month - 1, day, 0, 0, 0, 0), end: new Date(year, month - 1, day, 23, 59, 59, 999) };
}

function isWithinDay(value: unknown, dateKey: string): boolean {
  if (!value) return false;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return false;
  const { start, end } = dayBounds(dateKey);
  return date >= start && date <= end;
}

function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

function formatTrackerStatus(dateKey: string, touched: TouchedStore, diaries: DiaryEntry[], lang: AppLanguage): string[] {
  const labels = lang === 'ar'
    ? { water: 'الماء', exercise: 'الرياضة', sleep: 'النوم', mood: 'المزاج', habits: 'العادات', tasks: 'المهام' }
    : { water: 'Water intake', exercise: 'Exercise', sleep: 'Sleep', mood: 'Mood', habits: 'Habits', tasks: 'Tasks' };
  const values: string[] = [];
  for (const metric of ['water', 'exercise', 'sleep', 'mood'] as const) {
    const touchedToday = isMetricTouched(dateKey, metric, touched);
    if (!touchedToday) {
      values.push(`${labels[metric]}: not tracked in the app today`);
      continue;
    }
    const relevant = diaries.filter(d => isWithinDay(d.createdAt, dateKey));
    const vals = relevant.map(d => metric === 'water' ? d.waterCups : metric === 'exercise' ? d.sportsDuration : metric === 'sleep' ? d.sleepHours : d.fastMoodScore).filter(v => typeof v === 'number');
    values.push(`${labels[metric]}: ${vals.length ? vals.join(', ') : (lang === 'ar' ? 'تم التفاعل مع المتتبع دون قيمة مسجلة' : 'tracker touched; no numeric value logged')}`);
  }
  return values;
}

export interface DailyContextResult {
  dateKey: string;
  diaries: DiaryEntry[];
  mediaPreference: AIMediaAccessPermission;
  mediaParts: any[];
  context: string;
  hasActivity: boolean;
}

/** Collects only records belonging to one local calendar date; general advisor data is never read. */
export async function collectDailyContextForDate(dateKey: string, mediaPref?: AIMediaAccessPermission, appLanguage: AppLanguage = 'ar'): Promise<DailyContextResult> {
  const allDiaries = readJson<DiaryEntry[]>('yawmiyati_diaries', []).filter(d => isWithinDay(d.createdAt, dateKey));
  const mediaPreference = mediaPref || loadProsConsMediaPreference(dateKey) || DEFAULT_AI_MEDIA_ACCESS;
  const touched = loadAllTouchedMetrics();
  const lines: string[] = [`Calendar day: ${dateKey} 00:00:00–23:59:59 local time.`, 'Only use the dated records supplied below. Do not infer activity from defaults.'];
  let activity = allDiaries.length > 0;
  for (const diary of allDiaries) {
    lines.push(`Diary: ${diary.title || '(untitled)'}`, `Text: ${diary.content || '(no text)'}`);
    if (diary.moods?.length) lines.push(`Mood before writing: ${diary.moods.join(', ')}`);
    if (diary.aiMoodAnalysis?.length) lines.push(`AI-inferred mood: ${diary.aiMoodAnalysis.map(m => `${m.mood} (${m.percentage}%)`).join(', ')}`);
    if (diary.importance) lines.push(`Rating: ${diary.importance}/5`);
    if (diary.tags?.length) lines.push(`Tags: ${diary.tags.join(', ')}`);
    if (diary.tasks?.length) lines.push(`Diary tasks: ${diary.tasks.map(t => `${t.completed ? '[done]' : '[pending]'} ${t.text}`).join('; ')}`);
    const datedChat = (diary.chatLogs || []).filter(m => isWithinDay(m.createdAt, dateKey));
    if (datedChat.length) lines.push(`Inline diary consultation highlights: ${datedChat.map(m => `${m.sender}: ${m.text}`).join(' | ')}`);
    const metrics = filterDiaryMetricsForAI(diary, touched, appLanguage);
    lines.push(`Water intake: ${metrics.isWaterTouched ? metrics.waterCupsFormatted : 'not tracked in the app today'}`);
    lines.push(`Exercise: ${metrics.isExerciseTouched ? metrics.exerciseFormatted : 'not tracked in the app today'}`);
    lines.push(`Sleep: ${metrics.isSleepTouched ? metrics.sleepHoursFormatted : 'not tracked in the app today'}`);
    if (diary.customHabits?.length) lines.push(`Entry habits: ${diary.customHabits.map(h => `${h.name}: ${h.completed ? 'completed' : 'not completed'}`).join('; ')}`);
  }

  const habits = readJson<Habit[]>('yawmiyati_habits', []);
  const dateHabits: string[] = [];
  habits.forEach(h => {
    const record = (h as any).history?.[dateKey];
    if (record !== undefined) dateHabits.push(`${h.name}: ${record === true || record?.completed ? 'completed' : typeof record === 'number' ? record : 'not completed'}`);
  });
  if (dateHabits.length) { activity = true; lines.push(`Daily habits: ${dateHabits.join('; ')}`); }
  else lines.push(`Habits: not tracked in the app today`);

  const gratitude = readJson<any[]>('yawmiyati_gratitude_cards', []).filter(g => isWithinDay(g.createdAt, dateKey));
  if (gratitude.length) { activity = true; lines.push(`Gratitude: ${gratitude.map(g => g.text).join(' | ')}`); }

  const touchedDay = touched[dateKey];
  if (touchedDay && Object.values(touchedDay).some(Boolean)) activity = true;
  lines.push(...formatTrackerStatus(dateKey, touched, allDiaries, appLanguage));
  if (!allDiaries.some(d => d.tasks?.length)) lines.push('Daily tasks: not tracked in the app today');

  const attachments = extractDailyMediaSources(allDiaries);
  const filteredPermission = mediaPreference;
  const media = await encodePermittedMediaParts(attachments, filteredPermission);
  if (media.skippedOversized) lines.push('Some selected media was skipped because the safe request size limit was reached.');
  return { dateKey, diaries: allDiaries, mediaPreference, mediaParts: media.parts, context: lines.join('\n'), hasActivity: activity, };
}

function loadOfficialMap(): Record<string, DailyProsConsEntry> {
  return readJson<Record<string, DailyProsConsEntry>>(OFFICIAL_PROS_CONS_STORAGE_KEY, {});
}

export async function generateOfficialProsConsForDate(dateKey: string, userApiKey?: string, appLanguage: AppLanguage = 'ar'): Promise<boolean> {
  if (inFlightDates.has(dateKey)) return false;
  const official = loadOfficialMap();
  if (official[dateKey]) return true;
  if (localStorage.getItem(REPORT_DONE_PREFIX + dateKey)) {
    const legacyRecord = readJson<DailyProsConsEntry[]>(PROS_CONS_STORAGE_KEY, []).find(r => r.dayKey === dateKey);
    if (legacyRecord) {
      const migrated = { ...legacyRecord, isOfficialDailyReport: true };
      official[dateKey] = migrated;
      localStorage.setItem(OFFICIAL_PROS_CONS_STORAGE_KEY, JSON.stringify(official));
      return true;
    }
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (!userApiKey?.trim()) return false;
  inFlightDates.add(dateKey);
  try {
    const gathered = await collectDailyContextForDate(dateKey, loadProsConsMediaPreference(dateKey), appLanguage);
    if (!gathered.hasActivity) return false;
    const response = await fetch('/api/gemini/pros-cons-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-key': userApiKey, 'x-app-language': appLanguage },
      body: JSON.stringify({ fullCompiledContext: gathered.context, displayDate: dateKey, appLanguage, mediaAccessPermission: gathered.mediaPreference, mediaParts: gathered.mediaParts })
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => ({}));
    if (data?.success !== true) return false;
    const pros = Array.isArray(data.pros) ? data.pros : [];
    const cons = Array.isArray(data.cons) ? data.cons : [];
    const timestamp = new Date().toISOString();
    const moodInputs = gathered.diaries.flatMap(d => [
      ...(d.moods || []).map(mood => ({ mood, count: 1 })),
      ...(d.aiMoodAnalysis || []).map(item => ({ mood: item.mood, percentage: item.percentage }))
    ]);
    const moodBreakdown = normalizeMoodDistribution(moodInputs, appLanguage === 'ar' ? 'ar' : 'en');
    const record: DailyProsConsEntry = {
      dayKey: dateKey, displayDate: dateKey, aiPositives: pros, aiNegatives: cons,
      userPositives: [], userNegatives: [], aiGeneratedAt: timestamp, updatedAt: timestamp,
      isOfficialDailyReport: true, moodBreakdown
    };
    const records = readJson<DailyProsConsEntry[]>(PROS_CONS_STORAGE_KEY, []);
    const index = records.findIndex(r => r.dayKey === dateKey);
    if (index >= 0) records[index] = { ...records[index], ...record };
    else records.unshift(record);
    localStorage.setItem(PROS_CONS_STORAGE_KEY, JSON.stringify(records));
    official[dateKey] = record;
    localStorage.setItem(OFFICIAL_PROS_CONS_STORAGE_KEY, JSON.stringify(official));
    localStorage.setItem(REPORT_DONE_PREFIX + dateKey, timestamp);
    window.dispatchEvent(new CustomEvent('yawmiyati-daily-report-generated', { detail: { date: dateKey, official: true } }));
    return true;
  } catch (error) {
    console.warn('[DailyReportScheduler] Official Pros/Cons generation failed for', dateKey, error);
    return false;
  } finally {
    inFlightDates.delete(dateKey);
  }
}

function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return getLocalTodayYMD(new Date(y, m - 1, d - 1));
}

export function checkAndTriggerDailyReports(userApiKey?: string, appLanguage: AppLanguage = 'ar'): void {
  const today = getLocalTodayYMD();
  let candidate = previousDateKey(today);
  for (let i = 0; i < 7 && candidate < today; i++, candidate = previousDateKey(candidate)) {
    if (!loadOfficialMap()[candidate]) void generateOfficialProsConsForDate(candidate, userApiKey, appLanguage);
  }
}

export function initializeDailyReportScheduler(getUserApiKey: () => string | undefined, getAppLanguage: () => AppLanguage): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;
  const trigger = () => checkAndTriggerDailyReports(getUserApiKey(), getAppLanguage());
  const scheduleMidnight = () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
    midnightTimer = setTimeout(() => { trigger(); scheduleMidnight(); }, Math.max(1000, next.getTime() - now.getTime()));
  };
  trigger();
  scheduleMidnight();
  minuteTimer = setInterval(() => {
    if (getLocalTodayYMD() !== getLocalTodayYMD(new Date(Date.now() - 60_000))) trigger();
  }, 60_000);
  const onOnline = () => trigger();
  const onVisible = () => { if (document.visibilityState === 'visible') trigger(); };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  let appStateListener: { remove: () => Promise<void> } | null = null;
  void import('@capacitor/app').then(({ App }) => App.addListener('appStateChange', ({ isActive }) => { if (isActive) trigger(); })).then(listener => { appStateListener = listener; }).catch(() => {});
  return () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    if (minuteTimer) clearInterval(minuteTimer);
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    if (appStateListener) void appStateListener.remove();
    isInitialized = false;
  };
}
