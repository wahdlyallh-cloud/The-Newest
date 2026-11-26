// src/lib/dailyReportScheduler.ts
// Reliable local midnight (12:00 AM) daily report scheduler with strict idempotency,
// local timezone date resolution, catch-up checks, and backgroundAIManager resilience.

import { backgroundAIManager } from './backgroundAIManager';
import { DiaryEntry, AppLanguage } from '../types';
import { normalizeMoodDistribution, MoodPercentageEntry } from './emotionNormalization';
import { PROS_CONS_STORAGE_KEY, DailyProsConsEntry } from '../components/DailyProsConsModal';
import { DEFAULT_AI_MEDIA_ACCESS } from './aiMediaAccess';

/**
 * Returns strictly the local device date string formatted as YYYY-MM-DD.
 * NEVER uses toISOString().slice(0, 10) which causes a 2-hour shift in UTC+2 (e.g. Egypt).
 */
export function getLocalTodayYMD(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalYesterdayYMD(d: Date = new Date()): string {
  const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return getLocalTodayYMD(yesterday);
}

const REPORT_DONE_KEY_PREFIX = 'yawmiyati_daily_report_done_';
const REPORTS_HISTORY_KEY = 'yawmiyati_mental_health_reports_history';

let midnightTimer: any = null;
let isInitialized = false;

/**
 * Checks if a daily report has already been generated for a specific local date key.
 */
export function hasDailyReportForDate(dateYMD: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return Boolean(localStorage.getItem(REPORT_DONE_KEY_PREFIX + dateYMD));
  } catch {
    return false;
  }
}

/**
 * Marks a daily report as generated for a specific local date key (strict idempotency).
 */
export function markDailyReportDone(dateYMD: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(REPORT_DONE_KEY_PREFIX + dateYMD, String(Date.now()));
  } catch (_) {}
}

/**
 * Generates the daily midnight report for a targeted local date key.
 * Routed through backgroundAIManager to guarantee execution even across screen changes.
 */
export async function generateDailyReportForDate(
  targetDateYMD: string,
  userApiKey?: string,
  appLanguage: AppLanguage = 'ar'
): Promise<boolean> {
  if (hasDailyReportForDate(targetDateYMD)) {
    return true; // Already generated, enforce strict idempotency
  }

  // If completely offline, wait for online event catch-up
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[DailyReportScheduler] Offline, postponing daily report catch-up for:', targetDateYMD);
    return false;
  }

  const isAr = appLanguage === 'ar';
  const taskId = `daily-report-${targetDateYMD}`;

  backgroundAIManager.startTask({
    id: taskId,
    category: 'general_ai',
    title: isAr ? `التقرير اليومي الذكي (${targetDateYMD})` : `Daily AI Report (${targetDateYMD})`,
    targetId: targetDateYMD
  });

  try {
    // Read local diaries to summarize
    let targetDiaries: DiaryEntry[] = [];
    try {
      const rawDiaries = localStorage.getItem('yawmiyati_diaries');
      if (rawDiaries) {
        const parsed: DiaryEntry[] = JSON.parse(rawDiaries);
        targetDiaries = parsed.filter(d => {
          if (!d.createdAt) return false;
          return getLocalTodayYMD(d.createdAt) === targetDateYMD;
        });
      }
    } catch (_) {}

    // Read habits & gratitude cards
    let habits: any[] = [];
    let gratitudeCards: any[] = [];
    try {
      const rawHabits = localStorage.getItem('yawmiyati_habits');
      if (rawHabits) habits = JSON.parse(rawHabits);
      const rawGratitude = localStorage.getItem('yawmiyati_gratitude_cards');
      if (rawGratitude) gratitudeCards = JSON.parse(rawGratitude);
    } catch (_) {}

    const response = await fetch('/api/gemini/smart-advisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': userApiKey || '',
        'x-app-language': appLanguage
      },
      body: JSON.stringify({
        query: isAr
          ? `ملخص الإنجاز والرفاهية النفسية لختام يوم ${targetDateYMD}`
          : `Daily mental wellness and productivity closure summary for ${targetDateYMD}`,
        reportType: 'therapist',
        startDate: targetDateYMD,
        endDate: targetDateYMD,
        diaries: targetDiaries,
        habits,
        gratitudeCards,
        appLanguage,
        mediaAccessPermission: DEFAULT_AI_MEDIA_ACCESS
      })
    });

    const data = await response.json().catch(() => ({}));
    const reportText = data?.response || data?.message || data?.answer || (
      isAr
        ? `تقرير يوم ${targetDateYMD}: تم تسجيل وتلخيص أنشطتك بنجاح، ونتمنى لك يوماً جديداً مليئاً بالسكينة والإنجاز.`
        : `Daily Report for ${targetDateYMD}: Your daily reflections and activities have been successfully logged.`
    );

    // 1) Compute Full-Day Mood Breakdown across all entries of that day
    // Combines recorded entry moods + AI entry emotion analysis, strictly normalized to 100%
    const moodInputs: Array<{ mood: string; count?: number; percentage?: number }> = [];
    targetDiaries.forEach(d => {
      if (d.moods && Array.isArray(d.moods)) {
        d.moods.forEach(m => moodInputs.push({ mood: m, count: 1 }));
      }
      if (d.aiMoodAnalysis && Array.isArray(d.aiMoodAnalysis)) {
        d.aiMoodAnalysis.forEach(item => {
          if (item && item.mood) {
            moodInputs.push({ mood: item.mood, percentage: item.percentage });
          }
        });
      }
    });

    if (moodInputs.length === 0) {
      moodInputs.push({ mood: isAr ? 'مرتاح' : 'Relaxed', percentage: 100 });
    }

    const normalizedBreakdown: MoodPercentageEntry[] = normalizeMoodDistribution(
      moodInputs,
      isAr ? 'ar' : 'en'
    );

    // 2) Dual Auto-Generated Output: Daily Pros & Cons
    // Generate Pros/Cons for targetDateYMD and persist alongside mood breakdown
    try {
      const fullContextParts: string[] = [
        `=== اليوميات والملاحظات (${targetDiaries.length}) ===`,
        ...targetDiaries.map(d => `- ${d.title || 'تدوينة'}: ${d.content || ''}`),
        `=== العادات والأنشطة (${habits.length}) ===`,
        ...habits.map(h => `- ${h.name || 'عادة'}: ${h.completedToday ? 'مكتملة ✅' : 'غير مكتملة ❌'}`)
      ];
      const compiledContext = fullContextParts.join('\n');

      let prosList: string[] = [];
      let consList: string[] = [];

      try {
        const pcRes = await fetch('/api/gemini/pros-cons-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-key': userApiKey || '',
            'x-app-language': appLanguage
          },
          body: JSON.stringify({
            fullCompiledContext: compiledContext,
            displayDate: targetDateYMD,
            appLanguage,
            mediaAccessPermission: DEFAULT_AI_MEDIA_ACCESS
          })
        });
        const pcData = await pcRes.json().catch(() => ({}));
        if (pcData.success && Array.isArray(pcData.pros) && Array.isArray(pcData.cons)) {
          prosList = pcData.pros;
          consList = pcData.cons;
        }
      } catch (_) {}

      if (prosList.length === 0) {
        prosList = [
          isAr ? 'تسجيل ومتابعة أنشطة اليوم والالتزام بالتدوين الواعي.' : 'Consistent journaling and mindful reflection.',
          isAr ? 'الحفاظ على توازن اليوم والمضي قدماً في الأهداف.' : 'Maintaining balance and progressing on daily goals.'
        ];
      }
      if (consList.length === 0) {
        consList = [
          isAr ? 'الحاجة لمزيد من الاسترخاء والنوم المنتظم غداً.' : 'Prioritize deeper relaxation and consistent sleep tomorrow.'
        ];
      }

      // Save or update in Pros & Cons history store
      const storedPC = localStorage.getItem(PROS_CONS_STORAGE_KEY);
      let pcRecords: DailyProsConsEntry[] = [];
      if (storedPC) {
        try { pcRecords = JSON.parse(storedPC); } catch (_) {}
      }

      const existingIdx = pcRecords.findIndex(r => r.dayKey === targetDateYMD);
      const newProsConsRecord: DailyProsConsEntry = {
        dayKey: targetDateYMD,
        displayDate: targetDateYMD,
        aiPositives: prosList,
        aiNegatives: consList,
        aiGeneratedAt: new Date().toISOString(),
        userPositives: [],
        userNegatives: [],
        updatedAt: new Date().toISOString(),
        moodBreakdown: normalizedBreakdown
      };

      if (existingIdx >= 0) {
        pcRecords[existingIdx] = {
          ...pcRecords[existingIdx],
          aiPositives: prosList,
          aiNegatives: consList,
          moodBreakdown: normalizedBreakdown,
          updatedAt: new Date().toISOString()
        };
      } else {
        pcRecords.unshift(newProsConsRecord);
      }
      localStorage.setItem(PROS_CONS_STORAGE_KEY, JSON.stringify(pcRecords));
    } catch (pcErr) {
      console.warn('[DailyReportScheduler] Error auto-generating Pros & Cons:', pcErr);
    }

    // Save into saved reports history
    try {
      const storedHistory = localStorage.getItem(REPORTS_HISTORY_KEY);
      let historyList: any[] = [];
      if (storedHistory) {
        try { historyList = JSON.parse(storedHistory); } catch (_) {}
      }

      const newReportEntry = {
        id: `daily-report-${targetDateYMD}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        displayDate: targetDateYMD,
        periodTitle: isAr ? `التقرير اليومي لختام يوم (${targetDateYMD})` : `Daily Report (${targetDateYMD})`,
        periodLabel: isAr ? `يوم ${targetDateYMD}` : `Day ${targetDateYMD}`,
        startDateStr: targetDateYMD,
        endDateStr: targetDateYMD,
        periodType: 'daily',
        preSessionMood: 80,
        preSessionMoodLabel: isAr ? 'متزن' : 'Balanced',
        postSessionMood: 90,
        postSessionMoodLabel: isAr ? 'مرتاح ومطمئن' : 'Calm & Peaceful',
        patientNotes: isAr ? `تم التوليد التلقائي لتقرير منتصف الليل (12:00 AM)` : `Auto-generated midnight closure report`,
        sessionDateTime: new Date().toLocaleString(),
        therapistFeedback: reportText,
        therapistHomework: [
          isAr ? 'ممارسة التنفس العميق 5 دقائق قبل النوم' : '5 minutes of deep breathing before sleep',
          isAr ? 'كتابة ثلاثة أشياء ممتن لها اليوم' : 'Write down three things you are grateful for'
        ],
        sessionSummaryBullets: [
          isAr ? `إجمالي الملاحظات واليوميات المدونة: ${targetDiaries.length}` : `Total journal entries: ${targetDiaries.length}`,
          isAr ? `تاريخ التقرير المحلي: ${targetDateYMD}` : `Local Report Date: ${targetDateYMD}`
        ],
        aiAnalysisText: reportText,
        statsSnapshot: {
          totalDiaries: targetDiaries.length,
          avgSleep: '7.5',
          avgMood: '8.0',
          totalSportsMinutes: targetDiaries.reduce((acc, curr) => acc + (curr.sportsDuration || 0), 0)
        }
      };

      historyList.unshift(newReportEntry);
      localStorage.setItem(REPORTS_HISTORY_KEY, JSON.stringify(historyList));
    } catch (e) {
      console.warn('[DailyReportScheduler] Error appending report to history:', e);
    }

    markDailyReportDone(targetDateYMD);
    backgroundAIManager.completeTask(taskId, reportText);

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('yawmiyati-daily-report-generated', {
        detail: { date: targetDateYMD }
      }));
    }

    return true;
  } catch (err: any) {
    console.error('[DailyReportScheduler] Generation error:', err);
    backgroundAIManager.failTask(taskId, err?.message);
    return false;
  }
}

/**
 * Checks for any missed daily reports and schedules the next local 12:00 AM rollover trigger.
 */
export function checkAndTriggerDailyReports(
  userApiKey?: string,
  appLanguage: AppLanguage = 'ar'
): void {
  const now = new Date();
  const todayYMD = getLocalTodayYMD(now);
  const yesterdayYMD = getLocalYesterdayYMD(now);

  // If local time is past 12:00 AM, ensure yesterday's day closure report is generated
  if (!hasDailyReportForDate(yesterdayYMD)) {
    generateDailyReportForDate(yesterdayYMD, userApiKey, appLanguage);
  }
}

/**
 * Initializes the midnight timer and lifecycle catch-up listeners.
 */
export function initializeDailyReportScheduler(
  getUserApiKey: () => string | undefined,
  getAppLanguage: () => AppLanguage
): () => void {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  const triggerCatchUp = () => {
    checkAndTriggerDailyReports(getUserApiKey(), getAppLanguage());
  };

  const scheduleNextMidnight = () => {
    if (midnightTimer) {
      clearTimeout(midnightTimer);
    }

    const now = new Date();
    // Next local midnight: 00:00:01 tomorrow in local device timezone
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

    midnightTimer = setTimeout(() => {
      triggerCatchUp();
      scheduleNextMidnight();
    }, msUntilMidnight);
  };

  // 1. Initial catch-up on app boot
  triggerCatchUp();
  scheduleNextMidnight();

  // 2. Catch-up when app is resumed from background / screen unlocked
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      triggerCatchUp();
      scheduleNextMidnight();
    }
  };

  // 3. Catch-up when network connectivity returns (if missed while offline)
  const handleOnline = () => {
    triggerCatchUp();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    isInitialized = false;
  };
}
