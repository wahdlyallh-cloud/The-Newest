/**
 * Comprehensive AI Athkar Synchronization Service
 * Manages `yawmiyaty_ai_athkar_context` in localStorage and provides
 * global context injection for AI Advisors, Therapy Reports, and Chat endpoints.
 */
import { AppLanguage } from '../types';
import { getTranslation } from '../lib/languages';

export interface AthkarAIContext {
  timestamp: string;
  dailyStats: {
    todayTotal: number;
    targetGoal: number;
    completionRatePercentage: number;
    streakDays: number;
    completedCategories: string[];
  };
  activeDhikrDetail: {
    category: string;
    lastDhikrRead: string;
    remainingInCategory: number;
  };
  customAthkarCount: number;
  psychologicalSpiritualStatus: string;
}

const STORAGE_KEY_AI_CONTEXT = 'yawmiyaty_ai_athkar_context';
const STORAGE_KEY_STATS = 'yawmiyaty_athkar_stats';
const STORAGE_KEY_STREAK = 'yawmiyaty_athkar_streak';
const STORAGE_KEY_CUSTOM = 'yawmiyaty_custom_dhikr';
const STORAGE_KEY_DHIKR_DATA = 'yawmiyaty_dhikr_data_v2';

/**
 * Derives a human-readable psychological and spiritual status based on athkar completion.
 */
function derivePsychologicalSpiritualStatus(rate: number, streak: number, lastCategory: string, langCode: string = 'ar'): string {
  const t = getTranslation(langCode);
  if (rate >= 90) {
    return `${t.statusExcellent} (${rate}%)، ${t.statusExcellentDesc} ${lastCategory || 'الأذكار'}.`;
  } else if (rate >= 60) {
    return `${t.statusGood} (${rate}%)، ${t.statusGoodDesc} ${streak} ${t.days}.`;
  } else if (rate >= 30) {
    return `${t.statusMedium} (${rate}%)، ${t.statusMediumDesc}`;
  } else {
    return `${t.statusLow} (${rate}%)، ${t.statusLowDesc}`;
  }
}

/**
 * Calculates and updates the AI Athkar context in localStorage.
 * Call this whenever the user performs a tap or completes an athkar.
 */
export function updateAthkarContextOnTap(params?: {
  category?: string;
  lastDhikrRead?: string;
  remainingInCategory?: number;
  incrementTaps?: number;
}, langCode: string = 'ar'): AthkarAIContext {
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Load total taps today
  let todayTotal = 0;
  try {
    const statsStr = localStorage.getItem(STORAGE_KEY_STATS);
    if (statsStr) {
      const stats = JSON.parse(statsStr);
      if (stats.date === todayDateStr) {
        todayTotal = stats.totalTapsToday || 0;
      }
    }
  } catch {
    todayTotal = 0;
  }

  if (params?.incrementTaps) {
    todayTotal += params.incrementTaps;
    try {
      localStorage.setItem(
        STORAGE_KEY_STATS,
        JSON.stringify({ date: todayDateStr, totalTapsToday: todayTotal })
      );
    } catch { /* ignore */ }
  }

  // 2. Load streak
  let streakDays = 1;
  try {
    const streakStr = localStorage.getItem(STORAGE_KEY_STREAK);
    if (streakStr) streakDays = parseInt(streakStr, 10) || 1;
  } catch {
    streakDays = 1;
  }

  // 3. Load custom athkar count
  let customAthkarCount = 0;
  try {
    const customStr = localStorage.getItem(STORAGE_KEY_CUSTOM);
    if (customStr) {
      const parsed = JSON.parse(customStr);
      if (Array.isArray(parsed)) customAthkarCount = parsed.length;
    }
  } catch {
    customAthkarCount = 0;
  }

  // 4. Calculate target goal and completed categories
  let targetGoal = 300; // default target
  const completedCategories: string[] = [];

  try {
    const dhikrDataStr = localStorage.getItem(STORAGE_KEY_DHIKR_DATA);
    if (dhikrDataStr) {
      const dhikrData = JSON.parse(dhikrDataStr);
      // Analyze completed counts across categories if stored
      if (dhikrData.general && dhikrData.general > 0) {
        completedCategories.push('التسبيح العام');
      }
    }
  } catch { /* ignore */ }

  // Check progress keys
  ['morning', 'evening', 'post_prayer', 'sleep', 'custom'].forEach(catKey => {
    try {
      const key = `yawmiyaty_athkar_progress_${todayDateStr}_${catKey}`;
      const prog = localStorage.getItem(key);
      if (prog) {
        const parsed = JSON.parse(prog);
        const remValues = Object.values(parsed) as number[];
        if (remValues.length > 0 && remValues.every(val => val === 0)) {
          const catNames: Record<string, string> = {
            morning: 'أذكار الصباح',
            evening: 'أذكار المساء',
            post_prayer: 'أذكار بعد الصلاة',
            sleep: 'أذكار النوم',
            custom: 'أذكاري الخاصة'
          };
          completedCategories.push(catNames[catKey] || catKey);
        }
      }
    } catch { /* ignore */ }
  });

  const completionRatePercentage = Math.min(100, Math.round((todayTotal / targetGoal) * 100));

  const category = params?.category || 'السبحة العامة';
  const lastDhikrRead = params?.lastDhikrRead || 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ';
  const remainingInCategory = params?.remainingInCategory !== undefined ? params.remainingInCategory : 0;

  const psychologicalSpiritualStatus = derivePsychologicalSpiritualStatus(
    completionRatePercentage,
    streakDays,
    category,
    langCode
  );

  const context: AthkarAIContext = {
    timestamp: new Date().toISOString(),
    dailyStats: {
      todayTotal,
      targetGoal,
      completionRatePercentage,
      streakDays,
      completedCategories
    },
    activeDhikrDetail: {
      category,
      lastDhikrRead,
      remainingInCategory
    },
    customAthkarCount,
    psychologicalSpiritualStatus
  };

  try {
    localStorage.setItem(STORAGE_KEY_AI_CONTEXT, JSON.stringify(context));
  } catch (e) {
    console.warn('Failed to save AI Athkar Context:', e);
  }

  return context;
}

/**
 * Retrieves the current Athkar AI Context object from localStorage.
 * Returns a fallback context if not initialized yet.
 */
export function getAthkarContextForAI(langCode: string = 'ar'): AthkarAIContext {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_CONTEXT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dailyStats) return parsed as AthkarAIContext;
    }
  } catch (e) {
    console.warn('Failed to parse AI Athkar Context:', e);
  }

  // Fallback / Initial default
  return updateAthkarContextOnTap(undefined, langCode);
}

/**
 * Returns a clean, structured Arabic string representation of the Athkar Context
 * suitable for embedding directly into Gemini system instructions or prompt contexts.
 */
export function getFormattedAthkarPromptContext(langCode: string = 'ar'): string {
  const ctx = getAthkarContextForAI(langCode);
  const completedStr = ctx.dailyStats.completedCategories.length > 0
    ? ctx.dailyStats.completedCategories.join('، ')
    : 'لم تكتمل أذَكار كاملة بعد اليوم';

  return `
[سياق أذكار المسلم والتأمل الروحي اليومي]:
- إجمالي عدد الأذكار والتسبحات المكررة اليوم: ${ctx.dailyStats.todayTotal} من أصل هدف ${ctx.dailyStats.targetGoal} (${ctx.dailyStats.completionRatePercentage}%)
- سلسلة المواظبة المستمرة: ${ctx.dailyStats.streakDays} أيام
- الأقسام المكتملة بالكامل اليوم: [${completedStr}]
- الذكر الحالي/الأخير المقروء: "${ctx.activeDhikrDetail.lastDhikrRead}" (${ctx.activeDhikrDetail.category}) - المتبقي في هذا القسم: ${ctx.activeDhikrDetail.remainingInCategory}
- عدد الأذكار الخاصة المخصصة: ${ctx.customAthkarCount}
- التقييم النفسي والروحي للالتزام: ${ctx.psychologicalSpiritualStatus}
`.trim();
}
