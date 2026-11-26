import React, { useState, useEffect } from 'react';
import { 
  Scale, Brain, Sparkles, Plus, Trash2, Download, Printer, Copy, Check, 
  X, RefreshCw, FileText, CheckCircle2, XCircle, Edit3, Save, FileCheck2, Clock, Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { exportBlobSafe, captureElementToCanvas } from '../lib/exportUtils';
import { DiaryEntry, Habit, GratitudeCard, Book, AppLanguage } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';
import { copyTextSafe } from '../lib/clipboard';

import { normalizeMoodDistribution, MoodPercentageEntry } from '../lib/emotionNormalization';
import AIMediaAccessSelector from './AIMediaAccessSelector';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';
import {
  AIMediaAccessPermission,
  DEFAULT_AI_MEDIA_ACCESS,
  extractAvailableAttachments
} from '../lib/aiMediaAccess';

export interface DailyProsConsEntry {
  dayKey: string; // 'YYYY-MM-DD'
  displayDate: string; // e.g. "الثلاثاء، 4 أغسطس 2026"
  aiPositives: string[];
  aiNegatives: string[];
  aiGeneratedAt?: string;
  userPositives: string[];
  userNegatives: string[];
  updatedAt?: string;
  moodBreakdown?: MoodPercentageEntry[]; // Full-Day Mood Breakdown strictly normalized to 100%
}

// Safe Cross-Browser Rounded Rectangle Canvas Drawer (Supports older Mobile Safari / WebKit)
const drawRoundRect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    let radius = r;
    if (w < 2 * radius) radius = w / 2;
    if (h < 2 * radius) radius = h / 2;
    c.beginPath();
    c.moveTo(x + radius, y);
    c.arcTo(x + w, y, x + w, y + h, radius);
    c.arcTo(x + w, y + h, x, y + h, radius);
    c.arcTo(x, y + h, x, y, radius);
    c.arcTo(x, y, x + w, y, radius);
    c.closePath();
  }
};

interface DailyProsConsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  displayDate: string;
  dayDiaries: DiaryEntry[];
  allHabits?: Habit[];
  allGratitudeCards?: GratitudeCard[];
  allBooks?: Book[];
  allDiaries?: DiaryEntry[];
  userApiKey?: string;
  appLanguage?: AppLanguage;
  onSaveSuccess?: () => void;
}

// Storage Key
export const PROS_CONS_STORAGE_KEY = 'yawmiyati_pros_cons_history';

// Helper to load all stored records
export const loadAllProsConsRecords = (): DailyProsConsEntry[] => {
  try {
    const stored = localStorage.getItem(PROS_CONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading pros & cons history:', e);
  }
  return [];
};

// Helper to save all records
export const saveAllProsConsRecords = (records: DailyProsConsEntry[]) => {
  try {
    localStorage.setItem(PROS_CONS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving pros & cons history:', e);
  }
};

export default function DailyProsConsModal({
  isOpen,
  onClose,
  dayKey,
  displayDate,
  dayDiaries,
  allHabits,
  allGratitudeCards,
  allBooks,
  allDiaries,
  userApiKey,
  appLanguage = "ar",
  onSaveSuccess
}: DailyProsConsModalProps) {
  const isAr = appLanguage === "ar";
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  useRegisterBackStep('modal_daily_pros_cons', 'modal', isOpen, onClose, t.prosConsReportTitle);
  const [aiPositives, setAiPositives] = useState<string[]>([]);
  const [aiNegatives, setAiNegatives] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [userPositives, setUserPositives] = useState<string[]>([]);
  const [userNegatives, setUserNegatives] = useState<string[]>([]);
  const [moodBreakdown, setMoodBreakdown] = useState<MoodPercentageEntry[]>([]);
  const [mediaAccessPermission, setMediaAccessPermission] = useState<AIMediaAccessPermission>(DEFAULT_AI_MEDIA_ACCESS);

  const [newUserPositive, setNewUserPositive] = useState('');
  const [newUserNegative, setNewUserNegative] = useState('');

  const [copySuccess, setCopySuccess] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [generatedImageModalUrl, setGeneratedImageModalUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Comprehensive Data Gatherer across ALL app modules for dayKey
  const compileFullDayData = (): string => {
    const contextLines: string[] = [];

    // Source A: Diaries & Thoughts
    const targetDiaries = (allDiaries && allDiaries.length > 0)
      ? allDiaries.filter(d => {
          const entryDate = d.createdAt ? d.createdAt.split('T')[0] : '';
          return entryDate === dayKey || (dayDiaries && dayDiaries.some(dd => dd.id === d.id));
        })
      : dayDiaries;

    if (targetDiaries && targetDiaries.length > 0) {
      contextLines.push(`=== 1) المذكرات والخواطر والفضفضة (${targetDiaries.length} مذكرات) ===`);
      targetDiaries.forEach((d, idx) => {
        const typeMapAr: Record<string, string> = {
          diary: 'مذكرة يومية',
          thought: 'خاطرة',
          gratitude: 'امتنان',
          wisdom: 'حكمة',
          quote: 'اقتباس',
          idea: 'فكرة',
          goal: 'هدف'
        };
        contextLines.push(`- النوع: ${typeMapAr[d.diaryType || 'diary'] || 'مذكرة'}`);
        contextLines.push(`- العنوان: ${d.title || 'بدون عنوان'}`);
        contextLines.push(`- المحتوى: ${d.content || 'لا يوجد نص'}`);
        
        if (d.moods && d.moods.length > 0) {
          contextLines.push(`- المزاج المدون: ${d.moods.join(', ')}`);
        }
        if (d.aiMoodAnalysis && d.aiMoodAnalysis.length > 0) {
          contextLines.push(`- تحليل المشاعر الذكي: ${d.aiMoodAnalysis.map(m => `${m.mood} (${m.percentage}%)`).join(', ')}`);
        }
        if (d.fastMoodScore) {
          contextLines.push(`- تقييم المزاج السريع: ${d.fastMoodScore}/10`);
        }
        if (d.tags && d.tags.length > 0) {
          contextLines.push(`- الوسوم والأنشطة: ${d.tags.join(', ')}`);
        }

        // Audio Transcriptions & Vocal Emotions
        if (d.audioRecordings && d.audioRecordings.length > 0) {
          d.audioRecordings.forEach((aud, aIdx) => {
            if (aud.transcription) {
              contextLines.push(`- تفريغ تسجيل صوتي #${aIdx + 1}: "${aud.transcription}"`);
            }
            if (aud.speechEmotion) {
              contextLines.push(`- تحليل نبرة الصوت والمشاعر الصوتية: ${aud.speechEmotion.primaryEmotion} (شدة: ${aud.speechEmotion.intensity}) ${aud.speechEmotion.vocalToneDetails || ''}`);
            }
          });
        }

        // Tasks inside Diary
        if (d.tasks && d.tasks.length > 0) {
          const doneTasks = d.tasks.filter(taskItem => taskItem.completed).map(taskItem => taskItem.text);
          const pendingTasks = d.tasks.filter(taskItem => !taskItem.completed).map(taskItem => taskItem.text);
          if (doneTasks.length > 0) {
            contextLines.push(`- المهام المكتملة في المذكرة: ${doneTasks.join(' | ')} ✅`);
          }
          if (pendingTasks.length > 0) {
            contextLines.push(`- المهام المتبقية في المذكرة: ${pendingTasks.join(' | ')} ⏳`);
          }
        }

        // CBT Worksheets inside Diary
        if (d.cbtWorksheets && d.cbtWorksheets.length > 0) {
          d.cbtWorksheets.forEach((cbt, cIdx) => {
            contextLines.push(`- تمرين تفنيد الأفكار CBT #${cIdx + 1}:`);
            contextLines.push(`  * الحدث المثبت: ${cbt.triggerEvent}`);
            contextLines.push(`  * الفكرة التلقائية السلبية: ${cbt.negativeThoughts}`);
            contextLines.push(`  * التشوه المعرفي: ${cbt.cognitiveDistortion}`);
            contextLines.push(`  * البديل العقلاني المنطقي: ${cbt.rationalAlternative}`);
            contextLines.push(`  * مستوى الانفعال العاطفي: قبل (${cbt.emotionBefore}/10) -> بعد (${cbt.emotionAfter}/10)`);
          });
        }

        // Health, Sleep, Sports, Water, Symptoms
        const healthDetails: string[] = [];
        if (d.sleepHours) healthDetails.push(`النوم: ${d.sleepHours} ساعة`);
        if (d.sportsDuration) healthDetails.push(`الرياضة: ${d.sportsDuration} دقيقة`);
        if (d.waterCups) healthDetails.push(`شرب الماء: ${d.waterCups} كوب`);
        if (d.symptomsChecklist && d.symptomsChecklist.length > 0) healthDetails.push(`الأعراض الجسدية/النفسية: ${d.symptomsChecklist.join(', ')}`);
        
        if (healthDetails.length > 0) {
          contextLines.push(`- المؤشرات الصحية والبدنية: ${healthDetails.join(' | ')}`);
        }

        if (d.medications && d.medications.length > 0) {
          const medStr = d.medications.map(m => `${m.name} (${m.time}) -> ${m.taken ? 'تم التناول ✅' : 'لم يتم التناول ❌'}`).join(', ');
          contextLines.push(`- متابعة الأدوية والعلاجات: ${medStr}`);
        }

        if (d.customHabits && d.customHabits.length > 0) {
          const habStr = d.customHabits.map(h => `${h.name}: ${h.completed ? 'مكتملة ✅' : 'غير مكتملة ❌'}`).join(', ');
          contextLines.push(`- العادات المرفقة بالمذكرة: ${habStr}`);
        }
      });
    }

    // Source B: Habit Tracker Section
    const resolvedHabits = allHabits || (() => {
      try {
        const saved = localStorage.getItem('yawmiyati_habits');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    })();

    if (resolvedHabits && resolvedHabits.length > 0) {
      const dayHabitsCompleted: string[] = [];
      const dayHabitsMissed: string[] = [];

      resolvedHabits.forEach((h: Habit) => {
        if (h.history && h.history[dayKey] !== undefined) {
          const val = h.history[dayKey];
          if (val === true || (typeof val === 'object' && (val as any).completed)) {
            dayHabitsCompleted.push(`${h.name} ${h.icon || ''}`);
          } else if (typeof val === 'number') {
            dayHabitsCompleted.push(`${h.name} (المقدار المسجل: ${val} ${h.unit || ''})`);
          } else if (val === false || (typeof val === 'object' && (val as any).completed === false)) {
            dayHabitsMissed.push(`${h.name}`);
          }
        }
      });

      if (dayHabitsCompleted.length > 0 || dayHabitsMissed.length > 0) {
        contextLines.push(`=== 2) متابعة العادات اليومية من قسم العادات ===`);
        if (dayHabitsCompleted.length > 0) {
          contextLines.push(`- العادات الناجحة والمكتملة اليوم: ${dayHabitsCompleted.join(', ')} ✅`);
        }
        if (dayHabitsMissed.length > 0) {
          contextLines.push(`- العادات غير المكتملة أو المتروكة اليوم: ${dayHabitsMissed.join(', ')} ❌`);
        }
      }
    }

    // Source C: Gratitude Cards
    const resolvedGratitude = allGratitudeCards || (() => {
      try {
        const saved = localStorage.getItem('yawmiyati_gratitude_cards');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    })();

    const dayGratitude = resolvedGratitude.filter((g: GratitudeCard) => g.createdAt && g.createdAt.startsWith(dayKey));
    if (dayGratitude.length > 0) {
      contextLines.push(`=== 3) مفكرة الامتنان والخواطر الإيجابية (${dayGratitude.length} بطاقات) ===`);
      dayGratitude.forEach((g: GratitudeCard, i: number) => {
        contextLines.push(`- بطاقة امتنان #${i + 1}: "${g.text}" 🌸`);
      });
    }

    // Source D: Books & Reading
    const resolvedBooks = allBooks || (() => {
      try {
        const saved = localStorage.getItem('yawmiyati_books');
        return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
    })();

    const dayBooks = resolvedBooks.filter((b: Book) => b.createdAt && b.createdAt.startsWith(dayKey));
    if (dayBooks.length > 0) {
      contextLines.push(`=== 4) الكتب والقراءة والملخصات (${dayBooks.length} كتب) ===`);
      dayBooks.forEach((b: Book, i: number) => {
        contextLines.push(`- كتاب #${i + 1}: "${b.title}" (التقييم: ${b.rating || 5}/5) - ملاحظات: ${b.notes || 'لا يوجد'}`);
      });
    }

    // Source E: Standalone CBT Coping Cards
    try {
      const copingCardsRaw = localStorage.getItem('app_custom_coping_cards');
      if (copingCardsRaw) {
        const cards = JSON.parse(copingCardsRaw);
        const dayCards = Array.isArray(cards) ? cards.filter((c: any) => c.createdAt && c.createdAt.startsWith(dayKey)) : [];
        if (dayCards.length > 0) {
          contextLines.push(`=== 5) بطاقات التكيف والتفكير الإيجابي CBT ===`);
          dayCards.forEach((c: any) => {
            contextLines.push(`- بطاقة تكيف: [${c.title || 'بطاقة موجهة'}] - النص: ${c.content || c.text || ''}`);
          });
        }
      }
    } catch (e) { console.warn(e); }

    return contextLines.join('\n');
  };

  // Load existing record for dayKey or generate default
  useEffect(() => {
    if (!isOpen || !dayKey) return;

    const allRecords = loadAllProsConsRecords();
    const existing = allRecords.find(r => r.dayKey === dayKey);

    if (existing) {
      setAiPositives(existing.aiPositives || []);
      setAiNegatives(existing.aiNegatives || []);
      setUserPositives(existing.userPositives || []);
      setUserNegatives(existing.userNegatives || []);
      if (existing.moodBreakdown && existing.moodBreakdown.length > 0) {
        setMoodBreakdown(existing.moodBreakdown);
      } else {
        computeLocalMoodBreakdown();
      }
    } else {
      // Auto trigger AI generation if no existing record
      setUserPositives([]);
      setUserNegatives([]);
      computeLocalMoodBreakdown();
      generateAiAnalysis();
    }
  }, [isOpen, dayKey]);

  // Compute normalized mood distribution across all entries of the day
  const computeLocalMoodBreakdown = () => {
    const targetDiaries = (allDiaries && allDiaries.length > 0)
      ? allDiaries.filter(d => {
          const entryDate = d.createdAt ? d.createdAt.split('T')[0] : '';
          return entryDate === dayKey || (dayDiaries && dayDiaries.some(dd => dd.id === d.id));
        })
      : dayDiaries;

    const moodInputs: Array<{ mood: string; count?: number; percentage?: number }> = [];
    (targetDiaries || []).forEach(d => {
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

    const normalized = normalizeMoodDistribution(moodInputs, isAr ? 'ar' : 'en');
    setMoodBreakdown(normalized);
    return normalized;
  };

  // AI Generation Logic with Strict Structured JSON (Zero System Prompt Leakage)
  const generateAiAnalysis = async () => {
    setIsGeneratingAi(true);

    const fullCompiledContext = compileFullDayData();

    if (!fullCompiledContext || fullCompiledContext.trim().length === 0) {
      setAiPositives([isAr ? "بدء تدوين الملاحظات والمشاعر لليوم هي خطوة واعية ممتازة لتعزيز صفاء الذهن." : (t.noEntriesLoggedForPositives || "No entries logged yet for positives.")]);
      setAiNegatives([isAr ? "لا توجد تحديات أو سلبيات مسجلة حتى الآن لهذا اليوم." : (t.noNegativesDetectedTest || "No negatives detected yet.")]);
      setIsGeneratingAi(false);
      return;
    }

    try {
      const response = await fetch('/api/gemini/pros-cons-report', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-key': userApiKey || '',
          'x-app-language': appLanguage
        },
        body: JSON.stringify({
          fullCompiledContext,
          displayDate,
          userApiKey,
          appLanguage,
          mediaAccessPermission
        })
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.pros) && Array.isArray(data.cons) && data.pros.length > 0) {
        setAiPositives(data.pros);
        setAiNegatives(data.cons);
      } else {
        fallbackNlpExtraction(fullCompiledContext);
      }
    } catch (e) {
      fallbackNlpExtraction(fullCompiledContext);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Parsing helper for AI response
  const parseAiText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const posList: string[] = [];
    const negList: string[] = [];

    let currentSection: 'pos' | 'neg' | null = null;

    for (const line of lines) {
      if (line.includes('الإيجابيات') || line.includes('ايجابيات')) {
        currentSection = 'pos';
        continue;
      }
      if (line.includes('السلبيات') || line.includes('سلبيات')) {
        currentSection = 'neg';
        continue;
      }

      const cleanLine = line.replace(/^[-•*1-9.\s]+/, '').trim();
      if (!cleanLine) continue;

      if (currentSection === 'pos') {
        posList.push(cleanLine);
      } else if (currentSection === 'neg') {
        negList.push(cleanLine);
      }
    }

    setAiPositives(posList.length > 0 ? posList : [t.defaultMindfulJournalingPositive]);
    setAiNegatives(negList.length > 0 ? negList : [t.defaultPassingStressorsChallenge]);
  };

  // Rule-based Fallback NLP extraction if AI service is offline
  const fallbackNlpExtraction = (compiledContextStr: string) => {
    const pos: string[] = [];
    const neg: string[] = [];
    const txt = compiledContextStr.toLowerCase();

    // Check CBT
    if (txt.includes('cbt') || txt.includes('تفنيد') || txt.includes('البديل العقلاني')) {
      pos.push('ممارسة تمارين العلاج المعرفي السلوكي (CBT) وصياغة البدائل العقلانية للأفكار.');
    }
    // Check Gratitude
    if (txt.includes('امتنان') || txt.includes('بطاقة امتنان')) {
      pos.push('التعبير عن الامتنان والتركيز على النعم واللحظات الإيجابية.');
    }
    // Check Habits
    if (txt.includes('مكتملة ✅')) {
      pos.push('الالتزام بإنجاز العادات والأنشطة اليومية المستهدفة.');
    }
    if (txt.includes('غير مكتملة ❌') || txt.includes('لم يتم')) {
      neg.push('تعثر في استكمال بعض العادات أو المهام اليومية المخططة.');
    }
    // Check Health / Sports / Sleep
    if (txt.includes('ساعة') && txt.includes('نوم')) {
      pos.push('تأطير روتين النوم ومتابعة مؤشر الاسترخاء.');
    }
    if (txt.includes('رياضة') || txt.includes('دقيقة')) {
      pos.push('ممارسة النشاط البدني والحفاظ على حيوية الجسد.');
    }
    // Check Mood / Positives
    if (txt.includes('سعيد') || txt.includes('صلاة') || txt.includes('الحمد') || txt.includes('أمل') || txt.includes('نجاح') || txt.includes('هادئ')) {
      pos.push(t.prosConsFallbackPositive);
    }
    // Check Negatives
    if (txt.includes('قلق') || txt.includes('تعب') || txt.includes('ضغط') || txt.includes('حزن') || txt.includes('أرق') || txt.includes('خوف') || txt.includes('صداع')) {
      neg.push(t.prosConsFallbackNegative);
    }

    if (pos.length === 0) pos.push(t.prosConsFallbackCommitment);
    if (neg.length === 0) neg.push(t.prosConsFallbackChallenges);

    setAiPositives(pos);
    setAiNegatives(neg);
  };

  // Add items
  const handleAddUserPositive = () => {
    if (!newUserPositive.trim()) return;
    setUserPositives(prev => [...prev, newUserPositive.trim()]);
    setNewUserPositive('');
  };

  const handleAddUserNegative = () => {
    if (!newUserNegative.trim()) return;
    setUserNegatives(prev => [...prev, newUserNegative.trim()]);
    setNewUserNegative('');
  };

  // Save record
  const handleSave = () => {
    const allRecords = loadAllProsConsRecords();
    const existingIndex = allRecords.findIndex(r => r.dayKey === dayKey);

    const updatedEntry: DailyProsConsEntry = {
      dayKey,
      displayDate,
      aiPositives,
      aiNegatives,
      aiGeneratedAt: new Date().toISOString(),
      userPositives,
      userNegatives,
      updatedAt: new Date().toISOString(),
      moodBreakdown: moodBreakdown.length > 0 ? moodBreakdown : computeLocalMoodBreakdown()
    };

    if (existingIndex >= 0) {
      allRecords[existingIndex] = updatedEntry;
    } else {
      allRecords.push(updatedEntry);
    }

    saveAllProsConsRecords(allRecords);
    showToast(t.prosConsSavedSuccess);
    if (onSaveSuccess) onSaveSuccess();
  };

  // Copy Summary
  const handleCopy = async () => {
    const summary = `⚖️ ${t.dailyProsConsReportTitle} - ${displayDate}
----------------------------------------
🧠 ${t.aiPositivesHeader}
${aiPositives.map(p => `• ${p}`).join('\n')}

🧠 ${t.aiNegativesHeader}
${aiNegatives.map(n => `• ${n}`).join('\n')}

✍️ ${t.userManualPositivesHeader}
${userPositives.length > 0 ? userPositives.map(p => `• ${p}`).join('\n') : (t.noProsConsEntriesDefault)}

✍️ ${t.userManualNegativesHeader}
${userNegatives.length > 0 ? userNegatives.map(n => `• ${n}`).join('\n') : (t.noProsConsEntriesDefault)}

---
${t.generatedByHayatAiNotice}`;

    const ok = await copyTextSafe(summary);
    if (ok) {
      setCopySuccess(true);
      showToast(t.copied || (isAr ? 'تم نسخ التقرير بنجاح! 📋' : 'Report copied successfully! 📋'));
      setTimeout(() => setCopySuccess(false), 2500);
    } else {
      showToast(t.copyFailedToast || (isAr ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy to clipboard'));
    }
  };

  // Export Word Document
  const handleDownloadWord = () => {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${t.prosConsReportTitle} - ${displayDate}</title></head>
      <body style="font-family: Arial, sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; padding: 20px;">
        <h1 style="color: #2B3E50;">⚖️ ${t.dailyProsConsReportTitle}</h1>
        <h3>${t.dateLabelColon} ${displayDate}</h3>
        <hr/>
        <h2 style="color: #2D5A27;">🧠 ${t.aiPositivesHeader}</h2>
        <ul>${aiPositives.map(p => `<li>${p}</li>`).join('')}</ul>
        
        <h2 style="color: #902923;">🧠 ${t.aiNegativesHeader}</h2>
        <ul>${aiNegatives.map(n => `<li>${n}</li>`).join('')}</ul>
        <hr/>
        <h2 style="color: #2D5A27;">✍️ ${t.userManualPositivesHeader}</h2>
        <ul>${userPositives.map(p => `<li>${p}</li>`).join('')}</ul>

        <h2 style="color: #902923;">✍️ ${t.userManualNegativesHeader}</h2>
        <ul>${userNegatives.map(n => `<li>${n}</li>`).join('')}</ul>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pros_Cons_Report_${dayKey}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(t.exportedWordSuccess);
  };

  // Helper to render formatted markdown text with **bold**
  const renderFormattedText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-[#1E293B]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Trigger Print / Save PDF with exact layout match
  const handlePrintPdf = () => {
    handleSave();

    const existingFrame = document.getElementById('yawmiyati-proscons-print-iframe');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'yawmiyati-proscons-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const formatBold = (str: string) => {
      return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    };

    const aiPosHtml = aiPositives.length > 0 ? aiPositives.map(p => `
      <div class="item-card">
        <span class="bullet-dot">🟢</span>
        ${formatBold(p)}
      </div>
    `).join('') : `<div class="empty-msg">${t.prosConsNoPositives}</div>`;

    const aiNegHtml = aiNegatives.length > 0 ? aiNegatives.map(n => `
      <div class="item-card">
        <span class="bullet-dot">🔴</span>
        ${formatBold(n)}
      </div>
    `).join('') : `<div class="empty-msg">${t.prosConsNoNegatives}</div>`;

    const userPosHtml = userPositives.length > 0 ? userPositives.map(p => `
      <div class="manual-item-card">
        • ${formatBold(p)}
      </div>
    `).join('') : `<div class="empty-msg">${t.prosConsNoManualPoints}</div>`;

    const userNegHtml = userNegatives.length > 0 ? userNegatives.map(n => `
      <div class="manual-item-card">
        • ${formatBold(n)}
      </div>
    `).join('') : `<div class="empty-msg">${t.prosConsNoManualPoints}</div>`;

    const printContent = `
      <!DOCTYPE html>
      <html dir="${langInfo.dir}" lang="${langInfo.code}">
      <head>
        <meta charset="utf-8">
        <title>${t.prosConsBtnLabel} - ${displayDate}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            background-color: #ffffff;
            color: #2D3748;
            direction: ${langInfo.dir};
            text-align: ${langInfo.dir === 'rtl' ? 'right' : 'left'};
            padding: 15px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4 portrait; margin: 8mm; }
          .report-container {
            max-width: 820px;
            margin: 0 auto;
            border: 2px solid #E2DCC8;
            border-radius: 20px;
            overflow: hidden;
            background-color: #FAF8F5;
          }
          .report-header {
            background: linear-gradient(135deg, #2B3E50 0%, #3B5066 50%, #5A5A40 100%);
            color: #ffffff;
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #E2DCC8;
          }
          .header-title-group {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .icon-box {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 12px;
            padding: 8px 12px;
            font-size: 22px;
          }
          .header-text h1 {
            font-size: 17px;
            font-weight: 900;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          .badge-tag {
            background-color: #8B9D83;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 10px;
          }
          .header-date {
            font-size: 12px;
            color: #E2DCC8;
            font-weight: 600;
          }
          .report-body {
            padding: 20px;
          }
          .section-title-container {
            border-bottom: 2px solid #E2DCC8;
            padding-bottom: 8px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .section-title {
            font-size: 13.5px;
            font-weight: 900;
            color: #2B3E50;
          }
          .section-subtitle {
            font-size: 11px;
            color: #718096;
            font-weight: 700;
          }
          .two-columns {
            display: flex;
            gap: 14px;
            margin-bottom: 20px;
          }
          .column-box {
            flex: 1;
            width: 50%;
            border-radius: 16px;
            padding: 14px;
            border: 2px solid;
          }
          .positives-box {
            background-color: #F2F7F2;
            border-color: #C2DCBE;
          }
          .negatives-box {
            background-color: #FDF3F2;
            border-color: #F5C6C3;
          }
          .box-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .positives-box .box-header { border-color: #C2DCBE; }
          .negatives-box .box-header { border-color: #F5C6C3; }
          .box-header-title {
            font-size: 12px;
            font-weight: 900;
          }
          .positives-box .box-header-title { color: #2D5A27; }
          .negatives-box .box-header-title { color: #902923; }
          .count-badge {
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 6px;
          }
          .positives-box .count-badge { background-color: #D1E7DD; color: #0F5132; }
          .negatives-box .count-badge { background-color: #F8D7DA; color: #842029; }
          .item-cards-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .item-card {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 9px 11px;
            font-size: 11.5px;
            line-height: 1.6;
            border: 1px solid;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          }
          .positives-box .item-card { border-color: #C2DCBE; color: #1A365D; }
          .negatives-box .item-card { border-color: #F5C6C3; color: #1A365D; }
          .bullet-dot { margin-left: 4px; }
          .manual-box {
            background-color: #ffffff;
            border: 2px solid #E2DCC8;
          }
          .manual-box .box-header { border-color: #F0EDE4; }
          .manual-box .box-header-title { color: #5A5A40; }
          .manual-box .count-badge { background-color: #F0EDE4; color: #4A5568; }
          .manual-item-card {
            background-color: #FAF8F5;
            border: 1px solid #E2DCC8;
            border-radius: 10px;
            padding: 8px 11px;
            font-size: 11.5px;
            color: #2D3748;
            line-height: 1.5;
          }
          .empty-msg {
            font-size: 11px;
            color: #A0AEC0;
            text-align: center;
            padding: 8px;
          }
          .report-footer {
            border-top: 1px solid #E2DCC8;
            padding: 10px 18px;
            background-color: #F0EDE4;
            font-size: 10.5px;
            color: #5A5A40;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="report-header">
            <div class="header-title-group">
              <div class="icon-box">⚖️</div>
              <div class="header-text">
                <h1>
                  <span>${t.prosConsReportTitle}</span>
                  <span class="badge-tag">{t.prosConsAiManual}</span>
                </h1>
                <div class="header-date">📅 ${displayDate}</div>
              </div>
            </div>
          </div>

          <div class="report-body">
            <!-- Section 1: AI Generated -->
            <div class="section-title-container">
              <div class="section-title">${t.prosConsAiSection}</div>
              <div class="section-subtitle">${t.prosConsAiSubtitle}</div>
            </div>

            <div class="two-columns">
              <!-- AI Positives (Right Column in RTL) -->
              <div class="column-box positives-box">
                <div class="box-header">
                  <div class="box-header-title">
                    <span>${t.prosConsAiPositives}</span>
                  </div>
                  <span class="count-badge">${aiPositives.length} {t.prosConsPoints}</span>
                </div>
                <div class="item-cards-list">
                  ${aiPosHtml}
                </div>
              </div>

              <!-- AI Negatives (Left Column in RTL) -->
              <div class="column-box negatives-box">
                <div class="box-header">
                  <div class="box-header-title">
                    <span>${t.prosConsAiNegatives}</span>
                  </div>
                  <span class="count-badge">${aiNegatives.length} {t.prosConsPoints}</span>
                </div>
                <div class="item-cards-list">
                  ${aiNegHtml}
                </div>
              </div>
            </div>

            <!-- Section 2: User Manual Inputs -->
            <div class="section-title-container">
              <div class="section-title">${t.prosConsManualSection}</div>
              <div class="section-subtitle">${t.prosConsManualSubtitle}</div>
            </div>

            <div class="two-columns">
              <!-- Manual Positives (Right Column) -->
              <div class="column-box manual-box">
                <div class="box-header">
                  <div class="box-header-title">
                    {t.prosConsManualPositives}
                  </div>
                  <span class="count-badge">${userPositives.length} {t.prosConsPoints}</span>
                </div>
                <div class="item-cards-list">
                  ${userPosHtml}
                </div>
              </div>

              <!-- Manual Negatives (Left Column) -->
              <div class="column-box manual-box">
                <div class="box-header">
                  <div class="box-header-title">
                    {t.prosConsManualNegatives}
                  </div>
                  <span class="count-badge">${userNegatives.length} {t.prosConsPoints}</span>
                </div>
                <div class="item-cards-list">
                  ${userNegHtml}
                </div>
              </div>
            </div>

          </div>

          <div class="report-footer">
            {t.prosConsFooterBrand}
            {t.prosConsFooterPrivacy}
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    doc.open();
    doc.write(printContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        window.print();
      }
    }, 400);
  };

  // Export report as high-resolution PNG image identical to report layout on all devices
  const handleSaveAsImage = async () => {
    handleSave();
    setIsCapturingImage(true);
    showToast(t.generatingImageToast);

    let container: HTMLDivElement | null = null;

    try {
      await new Promise(r => setTimeout(r, 100));

      // Create a fixed 880px-wide offscreen container for consistent 2-column layout on all mobile/desktop devices
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0px';
      container.style.width = '880px';
      container.style.backgroundColor = '#FAF9F6';
      container.style.direction = langInfo.dir;
      container.style.fontFamily = "'Segoe UI', 'Cairo', -apple-system, BlinkMacSystemFont, Tahoma, sans-serif";
      container.style.color = '#1E293B';

      const formatBoldHtml = (str: string) => {
        return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      };

      const aiPosHtml = aiPositives.length > 0 ? aiPositives.map(p => `
        <div style="background-color: #ffffff; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; font-size: 13.5px; line-height: 1.65; color: #1E293B; box-shadow: 0 2px 6px rgba(16,185,129,0.06); display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 14px; margin-top: 2px;">🟢</span>
          <div style="flex: 1;">${formatBoldHtml(p)}</div>
        </div>
      `).join('') : `<div style="font-size: 12px; color: #94A3B8; text-align: center; padding: 14px;">${t.noPositivesLoggedToday || 'لا توجد إيجابيات مدونة اليوم'}</div>`;

      const aiNegHtml = aiNegatives.length > 0 ? aiNegatives.map(n => `
        <div style="background-color: #ffffff; border: 1.5px solid #FECDD3; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; font-size: 13.5px; line-height: 1.65; color: #1E293B; box-shadow: 0 2px 6px rgba(244,63,94,0.06); display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 14px; margin-top: 2px;">🔴</span>
          <div style="flex: 1;">${formatBoldHtml(n)}</div>
        </div>
      `).join('') : `<div style="font-size: 12px; color: #94A3B8; text-align: center; padding: 14px;">${t.noNegativesLoggedToday || 'لا توجد سلبيات مدونة اليوم'}</div>`;

      const userPosHtml = userPositives.length > 0 ? userPositives.map(p => `
        <div style="background-color: #FAF9F6; border: 1px solid #E2DCC8; border-radius: 12px; padding: 10px 14px; margin-bottom: 8px; font-size: 13px; color: #334155; line-height: 1.6;">
          • ${formatBoldHtml(p)}
        </div>
      `).join('') : `<div style="font-size: 12px; color: #94A3B8; text-align: center; padding: 12px;">${t.noCustomPointsEntered || 'لا توجد نقاط مخصصة'}</div>`;

      const userNegHtml = userNegatives.length > 0 ? userNegatives.map(n => `
        <div style="background-color: #FAF9F6; border: 1px solid #E2DCC8; border-radius: 12px; padding: 10px 14px; margin-bottom: 8px; font-size: 13px; color: #334155; line-height: 1.6;">
          • ${formatBoldHtml(n)}
        </div>
      `).join('') : `<div style="font-size: 12px; color: #94A3B8; text-align: center; padding: 12px;">${t.noCustomPointsEntered || 'لا توجد نقاط مخصصة'}</div>`;

      container.innerHTML = `
        <div style="border: 2px solid #E2DCC8; border-radius: 28px; overflow: hidden; background-color: #FAF9F6; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1E293B 0%, #2B3E50 55%, #334155 100%); color: #ffffff; padding: 26px 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2DCC8;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 18px; padding: 12px 16px; font-size: 28px; display: flex; align-items: center; justify-content: center;">⚖️</div>
              <div>
                <div style="font-size: 21px; font-weight: 900; display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <span>${t.prosConsReportTitle}</span>
                  <span style="background-color: #10B981; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 12px;">${t.prosConsAiManual}</span>
                </div>
                <div style="font-size: 13px; color: #E2DCC8; font-weight: 600;">📅 ${displayDate}</div>
              </div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 8px 16px; font-size: 12px; font-weight: 800; color: #F8FAFC;">
              🌱 حياة AI • Hayat
            </div>
          </div>

          <!-- Body -->
          <div style="padding: 28px 32px;">
            <!-- Section 1: AI Generated Insights -->
            <div style="border-bottom: 2px solid #E2DCC8; padding-bottom: 12px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
              <div style="font-size: 16px; font-weight: 900; color: #1E293B; display: flex; align-items: center; gap: 6px;">
                <span>✨</span>
                <span>${t.prosConsAiSection}</span>
              </div>
              <div style="font-size: 12px; color: #64748B; font-weight: 700;">${t.prosConsAiSubtitle}</div>
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 26px;">
              <!-- Right: Positives (Green Accent) -->
              <div style="flex: 1; background-color: #F0FDF4; border: 2px solid #BBF7D0; border-radius: 20px; padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #DCFCE7; padding-bottom: 10px; margin-bottom: 14px;">
                  <span style="font-size: 14px; font-weight: 900; color: #15803D;">${t.prosConsAiPositives}</span>
                  <span style="font-size: 11px; font-weight: 800; background-color: #DCFCE7; color: #166534; padding: 3px 10px; border-radius: 10px;">${aiPositives.length} ${t.prosConsPoints}</span>
                </div>
                ${aiPosHtml}
              </div>

              <!-- Left: Negatives (Rose Accent) -->
              <div style="flex: 1; background-color: #FFF1F2; border: 2px solid #FECDD3; border-radius: 20px; padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #FFE4E6; padding-bottom: 10px; margin-bottom: 14px;">
                  <span style="font-size: 14px; font-weight: 900; color: #BE123C;">${t.prosConsAiNegatives}</span>
                  <span style="font-size: 11px; font-weight: 800; background-color: #FFE4E6; color: #9F1239; padding: 3px 10px; border-radius: 10px;">${aiNegatives.length} ${t.prosConsPoints}</span>
                </div>
                ${aiNegHtml}
              </div>
            </div>

            <!-- Section 2: User Manual Entries -->
            <div style="border-bottom: 2px solid #E2DCC8; padding-bottom: 12px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
              <div style="font-size: 16px; font-weight: 900; color: #1E293B; display: flex; align-items: center; gap: 6px;">
                <span>✍️</span>
                <span>${t.prosConsManualSection}</span>
              </div>
              <div style="font-size: 12px; color: #64748B; font-weight: 700;">${t.prosConsManualSubtitle}</div>
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 16px;">
              <!-- Right: Manual Positives -->
              <div style="flex: 1; background-color: #ffffff; border: 2px solid #E2DCC8; border-radius: 20px; padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #F0EDE4; padding-bottom: 10px; margin-bottom: 14px;">
                  <span style="font-size: 14px; font-weight: 900; color: #5A5A40;">${t.prosConsManualPositives}</span>
                  <span style="font-size: 11px; font-weight: 800; background-color: #F0EDE4; color: #4A5568; padding: 3px 10px; border-radius: 10px;">${userPositives.length} ${t.prosConsPoints}</span>
                </div>
                ${userPosHtml}
              </div>

              <!-- Left: Manual Negatives -->
              <div style="flex: 1; background-color: #ffffff; border: 2px solid #E2DCC8; border-radius: 20px; padding: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #F0EDE4; padding-bottom: 10px; margin-bottom: 14px;">
                  <span style="font-size: 14px; font-weight: 900; color: #5A5A40;">${t.prosConsManualNegatives}</span>
                  <span style="font-size: 11px; font-weight: 800; background-color: #F0EDE4; color: #4A5568; padding: 3px 10px; border-radius: 10px;">${userNegatives.length} ${t.prosConsPoints}</span>
                </div>
                ${userNegHtml}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 2px solid #E2DCC8; padding: 16px 32px; background-color: #F0EDE4; font-size: 12px; color: #5A5A40; display: flex; align-items: center; justify-content: space-between; font-weight: 800;">
            <span>${t.prosConsFooterBrand}</span>
            <span>${t.prosConsFooterPrivacy}</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      await new Promise(r => setTimeout(r, 150));

      const canvas = await captureElementToCanvas(container, {
        scale: 2, // Ultra Crisp High DPI
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FAF8F5',
        logging: false
      });

      const imageBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png', 1.0);
      });

      if (imageBlob) {
        const fileName = `pros_cons_report_${dayKey}.png`;
        await exportBlobSafe({
          blob: imageBlob,
          filename: fileName,
          title: t.prosConsReportTitle || 'تقرير الإيجابيات والسلبيات اليومي',
          mimeType: 'image/png',
          onShareCancelled: () => {
            showToast(isAr ? 'تم إلغاء المشاركة' : 'Sharing cancelled');
          },
          onSuccess: () => {
            showToast(t.imageSavedToast);
          },
          onError: () => {
            showToast(t.imageSaveError);
          }
        });
      }
    } catch (err) {
      console.error('Error rendering report image:', err);
      showToast(t.imageSaveError);
    } finally {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setIsCapturingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Printable Area Wrapper */}
      <div id="pros-cons-modal-printable-card" className="bg-[#FAF8F5] border-0 sm:border-2 sm:border-[#E2DCC8] rounded-none sm:rounded-3xl shadow-2xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden text-start font-sans" dir={langInfo.dir}>
        
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.prosConsReportTitle}
          subtitle={displayDate}
          icon={<Scale className="w-5 h-5 text-amber-200" />}
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="slate"
          rightAction={
            <span className="bg-[#8B9D83] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {t.prosConsAiManual}
            </span>
          }
        />

        {/* Modal Middle Content Scrollable Area */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-6 flex-1 text-gray-800">

          {/* Side-by-Side Top Section: Full-Day Mood Percentage Breakdown (Strict 100% Normalized) */}
          <div className="bg-gradient-to-r from-[#FAF8F5] via-white to-[#FAF8F5] border-2 border-[#E2DCC8] rounded-2xl p-4 shadow-3xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DCC8]/60 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🌈</span>
                <span className="text-xs sm:text-sm font-black text-[#2B3E50]">
                  {isAr ? 'توزيع المزاج على مدار اليوم كامل (100%)' : 'Full-Day Mood Percentage Breakdown (100%)'}
                </span>
              </div>
              <span className="text-[10.5px] font-bold text-gray-500 bg-[#EFECE6] px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                {isAr ? 'تجميع المشاعر وتحليل الذكاء الاصطناعي' : 'Entry Moods + AI Emotion Analysis'}
              </span>
            </div>

            {/* Slim Proportional Color Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner border border-gray-200">
              {moodBreakdown.map((item, idx) => {
                const colors = [
                  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 
                  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500'
                ];
                const colorClass = colors[idx % colors.length];
                return (
                  <div
                    key={item.mood}
                    style={{ width: `${item.percentage}%` }}
                    className={`${colorClass} h-full transition-all duration-500`}
                    title={`${item.mood}: ${item.percentage}%`}
                  />
                );
              })}
            </div>

            {/* Percentage Pills Side-by-Side */}
            <div className="flex flex-wrap gap-2 items-center">
              {moodBreakdown.map((item, idx) => {
                const colors = [
                  'bg-emerald-50 text-emerald-800 border-emerald-200',
                  'bg-blue-50 text-blue-800 border-blue-200',
                  'bg-purple-50 text-purple-800 border-purple-200',
                  'bg-amber-50 text-amber-800 border-amber-200',
                  'bg-rose-50 text-rose-800 border-rose-200',
                  'bg-teal-50 text-teal-800 border-teal-200'
                ];
                const pillColor = colors[idx % colors.length];
                return (
                  <span
                    key={item.mood}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-3xs ${pillColor}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                    <span>{item.percentage}% {item.mood}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Quick Action Bar (Regenerate AI + Quick Stats & Media Access Control) */}
          <div data-html2canvas-ignore="true" className="space-y-2">
            <AIMediaAccessSelector
              permission={mediaAccessPermission}
              onChange={setMediaAccessPermission}
              availableAttachments={extractAvailableAttachments(allDiaries || dayDiaries || [])}
              appLanguage={appLanguage}
              compact={true}
            />

            <div className="bg-white border border-[#E2DCC8] rounded-2xl p-3 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#5A5A40] font-extrabold">
                <Brain className="w-4 h-4 text-[#8B9D83]" />
                <span>{t.prosConsAnalyzeAll}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  computeLocalMoodBreakdown();
                  generateAiAnalysis();
                }}
                disabled={isGeneratingAi}
                className="px-3.5 py-2 bg-[#8B9D83] hover:bg-[#5A5A40] text-white rounded-xl text-xs font-black shadow-3xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? (t.analyzing) : (t.regenerateAll)}</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: AI Generated Positives (Right) vs Negatives (Left) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2DCC8] pb-2">
              <h4 className="text-sm font-black text-[#2B3E50] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8B9D83]" />
                {t.prosConsAiSection}
              </h4>
              <span className="text-[11px] text-[#5A5A40] font-bold">{t.prosConsAiSubtitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* AI Positives (Right in RTL) */}
              <div className="bg-[#F2F7F2] border-2 border-[#C2DCBE] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#C2DCBE] pb-2">
                  <span className="text-xs font-black text-[#2D5A27] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {t.prosConsAiPositives}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                    {aiPositives.length} {t.prosConsPoints}
                  </span>
                </div>

                <ul className="space-y-2">
                  {aiPositives.map((pos, idx) => (
                    <li key={idx} className="bg-white border border-[#C2DCBE] p-2.5 rounded-xl text-xs text-gray-800 font-medium flex items-start justify-between gap-2 shadow-3xs transition-all hover:border-emerald-400">
                      <span className="leading-relaxed flex-1">🟢 {renderFormattedText(pos)}</span>
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => setAiPositives(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer shrink-0"
                        title={t.deleteThisItemTooltip}
                        aria-label={t.deleteThisItemTooltip}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Negatives (Left in RTL) */}
              <div className="bg-[#FDF3F2] border-2 border-[#F5C6C3] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F5C6C3] pb-2">
                  <span className="text-xs font-black text-[#902923] flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    {t.prosConsAiNegatives}
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md">
                    {aiNegatives.length} {t.prosConsPoints}
                  </span>
                </div>

                <ul className="space-y-2">
                  {aiNegatives.map((neg, idx) => (
                    <li key={idx} className="bg-white border border-[#F5C6C3] p-2.5 rounded-xl text-xs text-gray-800 font-medium flex items-start justify-between gap-2 shadow-3xs transition-all hover:border-rose-400">
                      <span className="leading-relaxed flex-1">🔴 {renderFormattedText(neg)}</span>
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => setAiNegatives(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer shrink-0"
                        title={t.deleteThisItemTooltip}
                        aria-label={t.deleteThisItemTooltip}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* SECTION 2: User Manual Inputs for Positives (Right) vs Negatives (Left) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2DCC8] pb-2">
              <h4 className="text-sm font-black text-[#2B3E50] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#5A5A40]" />
                {t.prosConsManualSection}
              </h4>
              <span className="text-[11px] text-gray-400 font-bold">{t.prosConsManualSubtitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* User Manual Positives (Right) */}
              <div className="bg-white border-2 border-[#E2DCC8] hover:border-[#8B9D83] rounded-2xl p-4 space-y-3 transition-all">
                <div className="flex items-center justify-between border-b border-[#F0EDE4] pb-2">
                  <span className="text-xs font-black text-[#5A5A40] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#8B9D83]" />
                    {t.prosConsManualPositives}
                  </span>
                  <span className="text-[10px] bg-[#F0EDE4] text-gray-700 font-bold px-2 py-0.5 rounded-md">
                    {userPositives.length} {t.prosConsPoints}
                  </span>
                </div>

                <div className="space-y-2">
                  {userPositives.map((pos, idx) => (
                    <div key={idx} className="bg-[#FAF8F5] border border-[#E2DCC8] p-2.5 rounded-xl text-xs text-gray-800 flex items-center justify-between gap-2">
                      <span className="flex-1">• {pos}</span>
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => setUserPositives(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer shrink-0"
                        title={t.deleteThisItemTooltip}
                        aria-label={t.deleteThisItemTooltip}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div data-html2canvas-ignore="true" className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newUserPositive}
                    onChange={(e) => setNewUserPositive(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUserPositive()}
                    placeholder={t.writePositiveToday}
                    className="flex-1 bg-[#FAF8F5] border border-[#E2DCC8] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
                  />
                  <button
                    type="button"
                    onClick={handleAddUserPositive}
                    className="px-3 py-1.5 bg-[#5A5A40] text-white rounded-xl text-xs font-black hover:bg-[#8B9D83] cursor-pointer"
                  >
                    + إضافة
                  </button>
                </div>
              </div>

              {/* User Manual Negatives (Left) */}
              <div className="bg-white border-2 border-[#E2DCC8] hover:border-rose-400 rounded-2xl p-4 space-y-3 transition-all">
                <div className="flex items-center justify-between border-b border-[#F0EDE4] pb-2">
                  <span className="text-xs font-black text-[#5A5A40] flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    {t.prosConsManualNegatives}
                  </span>
                  <span className="text-[10px] bg-[#F0EDE4] text-gray-700 font-bold px-2 py-0.5 rounded-md">
                    {userNegatives.length} {t.prosConsPoints}
                  </span>
                </div>

                <div className="space-y-2">
                  {userNegatives.map((neg, idx) => (
                    <div key={idx} className="bg-[#FAF8F5] border border-[#E2DCC8] p-2.5 rounded-xl text-xs text-gray-800 flex items-center justify-between gap-2">
                      <span className="flex-1">• {neg}</span>
                      <button
                        type="button"
                        data-html2canvas-ignore="true"
                        onClick={() => setUserNegatives(prev => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer shrink-0"
                        title={t.deleteThisItemTooltip}
                        aria-label={t.deleteThisItemTooltip}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div data-html2canvas-ignore="true" className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newUserNegative}
                    onChange={(e) => setNewUserNegative(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUserNegative()}
                    placeholder={t.writeNegativeToday}
                    className="flex-1 bg-[#FAF8F5] border border-[#E2DCC8] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddUserNegative}
                    className="px-3 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-black hover:bg-rose-800 cursor-pointer"
                  >
                    + إضافة
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Clean Footer inside the export card */}
          <div className="pt-2 border-t border-[#E2DCC8] flex items-center justify-between text-[11px] text-[#5A5A40] font-bold">
            {t.prosConsFooterBrand}
            {t.prosConsFooterPrivacy}
          </div>

        </div>

        {/* Modal Bottom Footer Actions & Exports */}
        <div className="p-4 bg-[#F0EDE4] border-t border-[#E2DCC8] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print-capture">
          
          {/* Quick Exports */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all active:scale-95"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copySuccess ? (t.copied) : (t.copyText)}</span>
            </button>

            <button
              onClick={handleDownloadWord}
              className="px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Word (.doc)</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#5A5A40]" />
              <span>{t.printSavePDF}</span>
            </button>

            <button
              onClick={handleSaveAsImage}
              disabled={isCapturingImage}
              className="px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs disabled:opacity-50 transition-all active:scale-95"
              title={t.saveReportAsPngTooltip}
            >
              {isCapturingImage ? (
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
              )}
              <span>{isCapturingImage ? (t.savingImage) : (t.saveAsImage)}</span>
            </button>
          </div>

          {/* Main Action Buttons */}
          <div className="flex items-center space-x-2 space-x-reverse w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              {t.close}
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-tr from-[#5A5A40] to-[#8B9D83] hover:from-[#5A5A40]/90 hover:to-[#8B9D83]/90 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap active:scale-95 transition-all"
            >
              <Save className="w-4 h-4 text-[#FEFAE0] shrink-0" />
              <span className="whitespace-nowrap">{t.saveToProsCons}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 end-4 z-80 bg-[#2B3E50] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
