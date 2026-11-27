import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import {
  Plus, Search, Calendar, Heart, BookOpen, Brain, Scale,
  Settings as SettingsIcon, Sparkles, LogOut, CheckSquare,
  Trash2, Edit3, Trash, Star, Image, Paperclip, Mic, MicOff,
  Smile, ShieldCheck, Download, Upload, Activity, Moon, Pill,
  User, Printer, ChevronRight, ArrowRight, ArrowLeft, Lock, Eye, EyeOff, Flame, Bell, Key, Archive, RotateCcw, ChevronDown, ChevronUp, Compass,
  Cloud, RefreshCw, Copy, Check, Mail, Send, Video, Camera, PenTool, Music, ExternalLink, Globe, Fingerprint, X, Smartphone, BellRing, Info, Maximize, Minimize, Maximize2, Minimize2,
  MoreVertical, MoreHorizontal, Folder, FileText
} from 'lucide-react';
import { DiaryEntry, AppSettings, TaskItem, AudioRecording, FileAttachment, Habit, GratitudeCard, ChatLogEntry, Book, AppReminder, AuthUser, AppLanguage, JournalEntryType } from './types';
import { JOURNAL_TYPES_CONFIG, ALL_JOURNAL_TYPES, getJournalTypeConfig, getJournalTypeLabel, getJournalTypeDescription } from './lib/journalTypes';
import StaticNotification from './components/StaticNotification';
import FloatingBall from './components/FloatingBall';
import DrawingCanvas from './components/DrawingCanvas';
import TherapistReportModal from './components/TherapistReportModal';
import RatingModal from './components/RatingModal';
import ContactOwnerModal from './components/ContactOwnerModal';
import GeminiKeyModal from './components/GeminiKeyModal';
import BackupSyncModal from './components/BackupSyncModal';
import LanguagesModal from './components/LanguagesModal';
import TypographySettingsSection from './components/TypographySettingsSection';
import { getFontCss, getLineHeightCss } from './lib/fonts';
import { exportBlobSafe, captureElementToCanvas } from './lib/exportUtils';
import { backgroundAIManager } from './lib/backgroundAIManager';
import { BackgroundAIStatus } from './components/BackgroundAIStatus';
import WriteDiaryImporter from './components/WriteDiaryImporter';
import { uploadToGeminiFilesAPI } from './services/attachmentService';
import { cleanDiaryText, generateGeminiContentDirect } from './lib/gemini';
import { migrateSettingsApiKeys, getActiveApiKeyFromSettings } from './lib/apiKeyManager';
import { getLocalizedAIError } from './services/aiLanguageContract';
import SmartAdvisor from './components/SmartAdvisor';
import GratitudeJournal from './components/GratitudeJournal';
import LifeMap from './components/LifeMap';
import PINLock from './components/PINLock';
import PasskeyAuth from './components/PasskeyAuth';
import { registerBiometrics } from './lib/biometrics';
import { TasksChecklistSection } from './components/TasksChecklistSection';
import { CBTExercisesSection } from './components/CBTExercisesSection';
import { MULTI_TRANSLATIONS, SUPPORTED_LANGUAGES, getLanguageInfo, getTranslation, getHabitDisplayName, getReminderDisplayName, t, DEFAULT_GLOBAL_TRANSLATION_PROXY } from './lib/languages';
import IntegratedTherapyReport from './components/IntegratedTherapyReport';
import WeeklyHabitsMoodChart from './components/WeeklyHabitsMoodChart';
import SleepMoodCorrelationChart from './components/SleepMoodCorrelationChart';
import SmartRemindersModal from './components/SmartRemindersModal';
import InAppReminderOverlay, { InAppReminderData } from './components/InAppReminderOverlay';
import SmartReminder, { syncAllRemindersNative, isNativeAndroid } from './lib/smartReminderBridge';
import { AuthModal } from './components/AuthModal';
import {
  saveAttachmentBlob,
  getAttachmentBlob,
  getAttachmentObjectUrl,
  deleteAttachmentBlob,
  cleanOrphanAttachments,
  sanitizeDiariesForLocalStorage
} from './lib/attachmentStore';
import DailyProsConsModal from './components/DailyProsConsModal';
import ProsConsHistoryLog from './components/ProsConsHistoryLog';
import FullAthkarModal from './components/FullAthkarModal';
import LockScreenAthkarOverlay from './components/LockScreenAthkarOverlay';
import { navigationStack, useRegisterBackStep } from './lib/navigationStack';
import { App as CapApp } from '@capacitor/app';
import PsychologicalGrowthTree from './components/PsychologicalGrowthTree';
import ShareableGratitudeCardModal, { CardExportData } from './components/ShareableGratitudeCardModal';
import BehavioralCorrelationCard from './components/BehavioralCorrelationCard';
import OfflineSyncBanner from './components/OfflineSyncBanner';
import AppUpdateBanner from './components/AppUpdateBanner';
import AIMediaAccessSelector from './components/AIMediaAccessSelector';
import {
  AIMediaAccessPermission,
  DEFAULT_AI_MEDIA_ACCESS,
  extractAvailableAttachments,
  encodePermittedMediaParts
} from './lib/aiMediaAccess';
import {
  loadAllTouchedMetrics,
  isMetricTouched,
  markMetricTouched,
  getNotRecordedTodayLabel,
  filterDiaryMetricsForAI,
  TrackedMetricKey,
  TouchedStore
} from './lib/dailyMetricsFilter';
import SettingsPanel from './components/SettingsPanel';
import { normalizeMoodDistribution } from './lib/emotionNormalization';
import { initializeDailyReportScheduler } from './lib/dailyReportScheduler';
import PredictiveHealthInsightsModal from './components/PredictiveHealthInsightsModal';
import AIVoiceJournalModal from './components/AIVoiceJournalModal';
import MarkdownMessage from './components/MarkdownMessage';
import OnboardingTourModal from './components/OnboardingTourModal';
import ExportDiaryModal from './components/ExportDiaryModal';
import AttachmentsPage from './components/AttachmentsPage';
import VoiceVentModal from './components/VoiceVentModal';
import GratitudeImportModal from './components/GratitudeImportModal';
import { copyTextSafe } from './lib/clipboard';
import { compressImageFile } from './lib/mediaStorage';
import { SpeechRecognitionManager } from './lib/speechRecognition';
import { formatDate, formatTime, formatDateTime, formatNumber } from './lib/formatters';

// Dynamic Mood & Tag Localization Helpers
export function getMoodLabel(mood?: string, t?: any): string {
  if (!mood) return '';
  if (!t) return mood;
  const moodMap: Record<string, string> = {
    'سعيد': t.mood_happy,
    'سعيد جدًا': t.mood_very_happy,
    'ممتن': t.mood_grateful,
    'مطمئن': t.mood_calm,
    'أمل': t.mood_hopeful,
    'مرتاح': t.mood_relaxed,
    'حماس': t.mood_enthusiastic,
    'متحمس': t.mood_excited,
    'قلق': t.mood_anxious,
    'حزين': t.mood_sad,
    'خوف': t.mood_afraid,
    'أرق': t.mood_insomnia,
    'مرهق': t.mood_exhausted,
    'غضب': t.mood_angry,
    'طبيعي': t.mood_normal
  };
  return moodMap[mood] || mood;
}

export function getTagLabel(tag?: string, t?: any): string {
  if (!tag) return '';
  if (!t) return tag;
  const tagMap: Record<string, string> = {
    'دراسة': t.tag_study,
    'عائلة': t.tag_family,
    'أمل': t.tag_hope,
    'أرق': t.tag_insomnia,
    'قلق': t.tag_anxiety,
    'تحدي': t.tag_challenge,
    'إنجاز': t.tag_achievement,
    'سعادة': t.tag_happiness,
    'قراءة': t.tag_reading,
    'تأمل': t.tag_mindfulness,
    'عمل': t.tag_work,
    'رياضة': t.tag_sports
  };
  return tagMap[tag] || tag;
}


// Recharts components for gorgeous analytics
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

// Initial Mock Diaries for demonstration so analytics and timeline look incredible instantly
const INITIAL_DIARIES: DiaryEntry[] = [
  {
    id: 'diary-1',
    title: 'تخطيط للأسبوع الدراسي الجديد وغداء عائلي ومشاعر أمل',
    content: 'بدأت اليوم ببعض القلق والتوتر بشأن تراكم المواد الدراسية والامتحانات القادمة في الجامعة. جلست مع عائلتي لاحقاً وتناولنا الغداء معاً في جو دافئ، وتحدثنا في مواضيع ممتعة فخفت حدة القلق تماماً وتحول شعوري للامتنان والأمل. أحس أن التحدث مع من نحب هو أفضل علاج سلوكي مهدئ للروح.',
    createdAt: '2026-07-15T21:30:00.000Z',
    updatedAt: '2026-07-15T21:30:00.000Z',
    moods: ['قلق', 'ممتن', 'سعيد'],
    aiMoodAnalysis: [
      { mood: 'سعيد', percentage: 40 },
      { mood: 'قلق', percentage: 30 },
      { mood: 'ممتن', percentage: 30 }
    ],
    importance: 4,
    color: 'bg-[#CCD5AE]/15 border-[#CCD5AE]',
    images: [],
    videos: [],
    audioRecordings: [],
    files: [],
    tasks: [
      { id: 't1', text: 'مراجعة أول فصلين في الكيمياء', completed: true },
      { id: 't2', text: 'شراء الدواء الشهري', completed: true }
    ],
    tags: ['دراسة', 'عائلة', 'أمل'],
    chatLogs: [],
    isLocked: false,
    sleepHours: 7.5,
    sportsDuration: 30,
    medications: [
      { id: 'm1', name: 'فيتامين D3 جرعة أسبوعية', time: '10:00 ص', taken: true }
    ]
  },
  {
    id: 'diary-2',
    title: 'نوبة أرق في منتصف الليل وتفكير زائد في المستقبل',
    content: 'لم أستطع النوم جيداً الليلة الماضية بسبب كثرة التفكير والسيناريوهات الكارثية حول مستقبلي المهني والجامعي. استيقظت في الصباح وأنا أشعر بخمول شديد وإرهاق وضيق في الصدر. قررت في المساء تحدي نفسي والذهاب لممارسة المشي السريع لمدة 45 دقيقة، والحمد لله أحسست ببعض الارتياح والهدوء التدريجي بعد الرياضة.',
    createdAt: '2026-07-14T09:45:00.000Z',
    updatedAt: '2026-07-14T09:45:00.000Z',
    moods: ['مرهق', 'قلق', 'حزين'],
    aiMoodAnalysis: [
      { mood: 'قلق', percentage: 50 },
      { mood: 'مرهق', percentage: 35 },
      { mood: 'حزين', percentage: 15 }
    ],
    importance: 3,
    color: 'bg-[#FAEDCD]/30 border-[#E2DCC8]',
    images: [],
    videos: [],
    audioRecordings: [
      {
        id: 'rec-1',
        name: 'فضفضة الأرق وتفريغ الأفكار.mp3',
        dataUrl: '#',
        duration: 48,
        transcription: 'أنا أسجل هذا المقطع الصوتي لأني أشعر بخوف شديد ولا أستطيع تهدئة نبضات قلبي بسبب التفكير في الامتحانات القادمة...'
      }
    ],
    files: [],
    tasks: [
      { id: 't3', text: 'تمرين تنفس بطني دقيقتين قبل النوم', completed: false }
    ],
    tags: ['أرق', 'قلق', 'تحدي'],
    chatLogs: [],
    isLocked: false,
    sleepHours: 4.5,
    sportsDuration: 45,
    medications: [
      { id: 'm1', name: 'فيتامين D3 جرعة أسبوعية', time: '10:00 ص', taken: false }
    ]
  },
  {
    id: 'diary-3',
    title: 'إنجاز كبير في المشروع وقراءة كتاب رائع قبل النوم',
    content: 'الحمد لله اليوم كان استثنائياً ومبهجاً جداً! أنجزت العرض التقديمي لمشروع الجامعة وحصلت على ثناء كبير جداً من زملائي والدكتور المشرف. غمرتني طاقة مذهلة من الحماس والفرح والرضا عن نفسي. قبل النوم، أعددت كوب بابونج دافئ وقرأت فصلاً ممتعاً للغاية من كتاب العلاج السلوكي المعرفي للتغلب على القلق النفسي.',
    createdAt: '2026-07-12T22:00:00.000Z',
    updatedAt: '2026-07-12T22:00:00.000Z',
    moods: ['سعيد جدًا', 'متحمس', 'مرتاح'],
    aiMoodAnalysis: [
      { mood: 'سعيد جدًا', percentage: 60 },
      { mood: 'متحمس', percentage: 30 },
      { mood: 'مرتاح', percentage: 10 }
    ],
    importance: 5,
    color: 'bg-[#F0EDE4] border-[#E2DCC8]',
    images: [],
    videos: [],
    audioRecordings: [],
    files: [],
    tasks: [],
    tags: ['إنجاز', 'سعادة', 'قراءة'],
    chatLogs: [],
    isLocked: false,
    sleepHours: 8.5,
    sportsDuration: 60,
    medications: [
      { id: 'm1', name: 'فيتامين D3 جرعة أسبوعية', time: '10:00 ص', taken: true }
    ]
  }
];

const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: false,
  notificationsEnabled: true,
  lockScreenWidgetEnabled: true,
  fullscreenModeEnabled: false,
  autoHideHeaderOnScroll: true,
  appLanguage: 'ar',
  appFont: 'cairo',
  appLineHeight: 'relaxed',
  floatingBallEnabled: true,
  appPinCode: '',
  isAppLocked: false, // Default to false so user can preview and test all features instantly
  backupSettings: {
    autoBackup: 'daily'
  },
  reminders: [
    {
      id: 'rem-1',
      title: 'منبه كتابة الخواطر واليوميات ✍️',
      time: '21:00',
      active: true,
      type: 'diary',
      frequency: 'daily',
      selectedDays: [0, 1, 2, 3, 4, 5, 6],
      motivationalNote: 'تدوين خواطرك يفرغ طاقة التوتر ويمنحك السكينة والوضوح الذهني. ✨',
      categoryIcon: '✍️'
    },
    {
      id: 'rem-2',
      title: 'تنبيه العناية بالذات وشرب الماء 💧',
      time: '08:00',
      active: true,
      type: 'habit',
      frequency: 'daily',
      selectedDays: [0, 1, 2, 3, 4, 5, 6],
      motivationalNote: 'بداية يوم جديدة مليئة بالنشاط! اعتَنِ بجسدك ونفسك أولاً. 💖',
      categoryIcon: '💧'
    },
    {
      id: 'rem-3',
      title: 'جلسة الاسترخاء الذهني والتأمل 🧘‍♂️',
      time: '17:30',
      active: true,
      type: 'meditation',
      frequency: 'custom_days',
      selectedDays: [0, 2, 4],
      motivationalNote: 'أنت تقوم بعمل رائع! خذ 3 أنفاس عميقة واسترح الآن.',
      categoryIcon: '🧘‍♀️'
    },
  ]
};

const INITIAL_HABITS: Habit[] = [
  {
    id: 'habit-1',
    name: 'شرب 2 لتر ماء دافئ',
    category: 'health',
    frequency: 'daily',
    reminderTime: '08:00',
    reminderEnabled: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    history: {
      '2026-07-14': true,
      '2026-07-15': true,
      '2026-07-16': true,
    }
  },
  {
    id: 'habit-2',
    name: 'تأمل واسترخاء العضلات (10 د)',
    category: 'mind',
    frequency: 'daily',
    reminderTime: '07:30',
    reminderEnabled: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    history: {
      '2026-07-15': true,
      '2026-07-16': false,
    }
  },
  {
    id: 'habit-3',
    name: 'المشي السريع أو تمرين منزلي',
    category: 'sport',
    frequency: 'daily',
    reminderTime: '17:00',
    reminderEnabled: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    history: {
      '2026-07-14': true,
      '2026-07-15': true,
      '2026-07-16': true,
    }
  },
  {
    id: 'habit-4',
    name: 'قراءة في كتاب النفس السلوكي',
    category: 'culture',
    frequency: 'daily',
    reminderTime: '21:00',
    reminderEnabled: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    history: {
      '2026-07-14': true,
      '2026-07-15': false,
      '2026-07-16': true,
    }
  }
];


const getHabitCategoryLabel = (category?: string, trans?: any): string => {
  const tr = trans || t;
  switch (category) {
    case 'health': return tr.healthCategoryFilter || 'Physical Health 🥦';
    case 'mind': return tr.mindCategoryFilter || 'Mind & Meditation 🧠';
    case 'sport': return tr.sportCategoryFilter || 'Sports & Fitness 🏃';
    case 'culture': return tr.cultureCategoryFilter || 'Reading & Culture 📚';
    case 'custom':
    default: return tr.customCategoryFilter || 'Other Goals 🎯';
  }
};


const HABIT_CATEGORIES: Record<string, { label: string; color: string; dot: string }> = {
  health: { label: 'health', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  mind: { label: 'mind', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  sport: { label: 'sport', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  culture: { label: 'culture', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  custom: { label: 'custom', color: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-500' },
};

// --- Streak Tracker calculation helper ---
const calculateStreak = (entries: DiaryEntry[]) => {
  if (!Array.isArray(entries)) return { currentStreak: 0, maxStreak: 0, hasLoggedToday: false };
  const loggedDates = new Set<string>();

  entries.forEach(e => {
    if (e && e.createdAt) {
      try {
        const d = new Date(e.createdAt);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          loggedDates.add(`${year}-${month}-${day}`);
        }
      } catch {
        // Safe fallback
      }
    }
  });

  const today = new Date();
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(today);
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  let currentStreak = 0;
  const hasLoggedToday = loggedDates.has(todayStr);
  const hasLoggedYesterday = loggedDates.has(yesterdayStr);

  if (hasLoggedToday) {
    currentStreak = 1;
    let checkDate = new Date(today);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = formatDate(checkDate);
      if (loggedDates.has(checkStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else if (hasLoggedYesterday) {
    currentStreak = 1;
    let checkDate = new Date(yesterday);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = formatDate(checkDate);
      if (loggedDates.has(checkStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate Max Streak of all time
  const sortedDates = Array.from(loggedDates).filter(Boolean).sort();
  let maxStreak = 0;
  let tempStreak = 0;
  let prevDateMs: number | null = null;

  for (const dateStr of sortedDates) {
    const currentDate = new Date(`${dateStr}T12:00:00`);
    const currentDateMs = currentDate.getTime();
    if (isNaN(currentDateMs)) continue;

    if (prevDateMs === null) {
      tempStreak = 1;
    } else {
      const diffTime = Math.abs(currentDateMs - prevDateMs);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > maxStreak) {
      maxStreak = tempStreak;
    }
    prevDateMs = currentDateMs;
  }

  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
  }

  return {
    currentStreak,
    maxStreak,
    hasLoggedToday
  };
};

export const TRANSLATIONS = {
  ar: {
    appName: "حياة AI",
    settingsTitle: "الإعدادات العامة",
    settingsSubtitle: "تخصيص مساعد الذكي، قفل الحماية، وتزامن بياناتك",
    apiKeyTitle: "مفتاح API الخاص بك 🔑",
    floatingBallTitle: "عرض الكرة العائمة 🔘",
    backupTitle: "النسخ الاحتياطي والمزامنة ☁️",
    appLockTitle: "قفل التطبيق 🔐",
    favoritesTitle: "الملاحظات المفضلة ⭐",
    remindersTitle: "التذكيرات والمنبهات ⏰",
    archiveTitle: "أرشيف اليوميات 📥",
    trashTitle: "سلة المهملات 🗑️",
    darkModeTitle: "الوضع الداكن ☀️/🌙",
    notificationsTitle: "الإشعارات 🔔",
    languagesTitle: "لغات التطبيق 🌐",
    rateTitle: "قيمنا 👍",
    contactTitle: "تواصل مع مالك التطبيق للاقتراح والتطوير ✉️",
    homeTab: "الرئيسية",
    diariesTab: "اليوميات",
    advisorTab: "المستشار",
    analyticsTab: "التقدم والبيانات",
    settingsTab: "الإعدادات",
    apiKeySub: "حالة المفتاح: مخصّص ونشط محلياً 🟢",
    apiKeySubAuto: "حالة المفتاح: يتم التوفير سحابياً تلقائياً وبأمان ☁️",
    floatingBallSub: "تسهيل التنقل والتحكم السريع بالمساعد الذكي في أي وقت",
    backupSub: "حفظ ومزامنة مذكراتك سحابياً ومحلياً لمنع فقدان البيانات",
    appLockSub: "تأمين مذكراتك برمز مرور PIN مكوّن من 4 أرقام عند بدء التشغيل",
    favoritesSub: "تصفح والوصول السريع للمذكرات الأكثر أهمية (ذات 4 نجوم فما فوق)",
    remindersSub: "إدارة منبهات المهام المجدولة واليوميات",
    archiveSub: "استعراض مذكراتك المؤرشفة والقديمة",
    trashSub: "استعادة مذكراتك المحذوفة مؤخراً أو تصفيتها",
    darkModeSub: "تفعيل مظهر الوضع الليلي لحماية عينيك",
    notificationsSub: "تلقي تنبيهات دورية للعادات والتذكيرات اليومية",
    languagesSub: "تغيير لغة واجهة مستخدم التطبيق",
    rateSub: "ساعدنا على مواصلة تحسين التطبيق لرأيك الغالي",
    contactSub: "راسلنا باقتراحاتك وملاحظاتك القيمة لتطوير التطبيق",
  },
  en: {
    appName: "Hayat AI",
    settingsTitle: "General Settings",
    settingsSubtitle: "Customize your smart assistant, privacy lock, and sync your data",
    apiKeyTitle: "Your API Key 🔑",
    floatingBallTitle: "Display Floating Ball 🔘",
    backupTitle: "Backup & Sync ☁️",
    appLockTitle: "App Lock 🔐",
    favoritesTitle: "Favorite Notes ⭐",
    remindersTitle: "Reminders & Alarms ⏰",
    archiveTitle: "Diary Archive 📥",
    trashTitle: "Trash Can 🗑️",
    darkModeTitle: "Dark Mode ☀️/🌙",
    notificationsTitle: "Notifications 🔔",
    languagesTitle: "App Languages 🌐",
    rateTitle: "Rate Us 👍",
    contactTitle: "Contact App Owner ✉️",
    homeTab: "Home",
    diariesTab: "Diaries",
    advisorTab: "Advisor",
    analyticsTab: "Analytics",
    settingsTab: "Settings",
    apiKeySub: "Key status: Customized & active locally 🟢",
    apiKeySubAuto: "Key status: Provided securely via cloud automatically ☁️",
    floatingBallSub: "Quick navigation and shortcut controls for your AI assistant",
    backupSub: "Sync and backup your diaries locally & to cloud securely",
    appLockSub: "Secure your notes with a 4-digit PIN lock on launch",
    favoritesSub: "Browse and quickly access your most important diaries (4+ stars)",
    remindersSub: "Manage scheduled task alarms and diary reminders",
    archiveSub: "Browse archived and older diary notes",
    trashSub: "Restore recently deleted diaries or filter them",
    darkModeSub: "Enable dark mode appearance to protect your eyes",
    notificationsSub: "Receive periodic alerts for habits and daily reminders",
    languagesSub: "Change the application user interface language",
    rateSub: "Help us continue improving the application with your feedback",
    contactSub: "Send us your valuable suggestions and notes to develop the app",
  }
};

const TAG_DICTIONARY_EN: Record<string, string> = {
  'دراسة': 'study',
  'عائلة': 'family',
  'أمل': 'hope',
  'أرق': 'insomnia',
  'تحدي': 'challenge',
  'نجاح': 'success',
  'قراءة': 'reading',
  'سعادة': 'happiness',
  'امتنان': 'gratitude',
  'تأمل_إيجابي': 'positive_reflection',
  'خواطر': 'thoughts',
  'صفاء': 'serenity',
  'إلهام': 'inspiration',
  'صحة': 'health',
  'رياضة': 'sports',
  'عام': 'general',
  'تنمية ذاتية': 'self_development',
  'علم نفس': 'psychology',
  'صحة نفسية': 'mental_health'
};

const TAG_DICTIONARY_AR: Record<string, string> = {
  'study': 'دراسة',
  'family': 'عائلة',
  'hope': 'أمل',
  'insomnia': 'أرق',
  'challenge': 'تحدي',
  'success': 'نجاح',
  'reading': 'قراءة',
  'happiness': 'سعادة',
  'gratitude': 'امتنان',
  'positive_reflection': 'تأمل_إيجابي',
  'thoughts': 'خواطر',
  'serenity': 'صفاء',
  'inspiration': 'إلهام',
  'health': 'صحة',
  'sports': 'رياضة',
  'general': 'عام',
  'self_development': 'تنمية ذاتية',
  'psychology': 'علم نفس',
  'mental_health': 'صحة نفسية'
};

export function getTranslatedTag(tag: string, langOrT?: any): string {
  if (!tag) return '';
  const t = typeof langOrT === 'object' && langOrT !== null ? langOrT : getTranslation(langOrT);
  const canonicalKey = 'tag_' + tag.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (t[canonicalKey]) return t[canonicalKey];
  return tag;
}

export function getInitialDiaries(lang: AppLanguage): DiaryEntry[] {
  const isAr = lang === 'ar';
  if (isAr) {
    return [
      {
        id: 'diary-1',
        title: 'تخطيط للأسبوع الدراسي الجديد وغداء عائلي ومشاعر أمل',
        content: 'بدأت اليوم ببعض القلق والتوتر بشأن تراكم المواد الدراسية والامتحانات القادمة في الجامعة. جلست مع عائلتي لاحقاً وتناولنا الغداء معاً في جو دافئ، وتحدثنا في مواضيع ممتعة فخفت حدة القلق تماماً وتحول شعوري للامتنان والأمل. أحس أن التحدث مع من نحب هو أفضل علاج سلوكي مهدئ للروح.',
        createdAt: '2026-07-15T21:30:00.000Z',
        updatedAt: '2026-07-15T21:30:00.000Z',
        moods: ['قلق', 'ممتن', 'سعيد'],
        aiMoodAnalysis: [
          { mood: 'سعيد', percentage: 40 },
          { mood: 'قلق', percentage: 30 },
          { mood: 'ممتن', percentage: 30 }
        ],
        importance: 4,
        color: 'bg-[#CCD5AE]/15 border-[#CCD5AE]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: [
          { id: 't1', text: 'مراجعة أول فصلين في الكيمياء', completed: true },
          { id: 't2', text: 'شراء الدواء الشهري', completed: true }
        ],
        tags: ['دراسة', 'عائلة', 'أمل'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 7.5,
        sportsDuration: 30,
        medications: [
          { id: 'm1', name: 'فيتامين D3 جرعة أسبوعية', time: '10:00 ص', taken: true }
        ]
      },
      {
        id: 'diary-2',
        title: 'نوبة أرق في منتصف الليل وتفكير زائد في المستقبل',
        content: 'لم أستطع النوم جيداً الليلة الماضية بسبب كثرة التفكير والسيناريوهات الكارثية حول مستقبلي المهني والجامعي. استيقظت في الصباح وأنا أشعر بخمول شديد وإرهاق وضيق في الصدر. قررت في المساء تحدي نفسي والذهاب لممارسة المشي السريع لمدة 45 دقيقة، والحمد لله أحسست ببعض الارتياح والهدوء التدريجي بعد الرياضة.',
        createdAt: '2026-07-14T09:45:00.000Z',
        updatedAt: '2026-07-14T09:45:00.000Z',
        moods: ['مرهق', 'قلق', 'حزين'],
        aiMoodAnalysis: [
          { mood: 'قلق', percentage: 50 },
          { mood: 'مرهق', percentage: 35 },
          { mood: 'حزين', percentage: 15 }
        ],
        importance: 3,
        color: 'bg-[#FAEDCD]/30 border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [
          {
            id: 'rec-1',
            name: 'فضفضة الأرق وتفريغ الأفكار.mp3',
            dataUrl: '#',
            duration: 48,
            transcription: 'أنا أسجل هذا المقطع الصوتي لأني أشعر بخوف شديد ولا أستطيع تهدئة نبضات قلبي بسبب التفكير في الامتحانات القادمة...'
          }
        ],
        files: [],
        tasks: [
          { id: 't3', text: 'تمرين تنفس بطني دقيقتين قبل النوم', completed: false }
        ],
        tags: ['أرق', 'قلق', 'تحدي'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 4.5,
        sportsDuration: 45,
        medications: [
          { id: 'm1', name: 'فيتامين D3 جرعة أسبوعية', time: '10:00 ص', taken: false }
        ]
      },
      {
        id: 'diary-3',
        title: 'إنجاز كبير في المشروع وقراءة كتاب رائع قبل النوم',
        content: 'الحمد لله اليوم كان استثنائياً ومبهجاً جداً! أنجزت العرض التقديمي لمشروع الجامعة وحصلت على ثناء كبير جداً من زملائي والدكتور المشرف. غمرتني طاقة مذهلة من الحماس والفرح والرضا عن نفسي. قبل النوم، أعددت كوب بابونج دافئ وقرأت فصلاً ممتعاً للغاية من كتاب العلاج السلوكي المعرفي للتغلب على القلق النفسي.',
        createdAt: '2026-07-12T22:00:00.000Z',
        updatedAt: '2026-07-12T22:00:00.000Z',
        moods: ['سعيد جدًا', 'متحمس', 'مرتاح'],
        aiMoodAnalysis: [
          { mood: 'سعيد جدًا', percentage: 60 },
          { mood: 'متحمس', percentage: 30 },
          { mood: 'مرتاح', percentage: 10 }
        ],
        importance: 5,
        color: 'bg-[#F0EDE4] border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: [
          { id: 't4', text: 'قراءة الفصل الرابع من كتاب CBT', completed: true }
        ],
        tags: ['نجاح', 'قراءة', 'سعادة'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 8.0,
        sportsDuration: 0,
        medications: []
      }
    ];
  } else {
    return [
      {
        id: 'diary-1',
        title: 'Weekly Academic Planning, Family Lunch & Hopeful Feelings',
        content: 'Started the day with some anxiety regarding accumulated coursework and upcoming university exams. Later sat with my family for a warm lunch and engaging conversations, which completely eased my anxiety and filled me with gratitude and hope. Talking with loved ones is truly a comforting remedy.',
        createdAt: '2026-07-15T21:30:00.000Z',
        updatedAt: '2026-07-15T21:30:00.000Z',
        moods: ['Anxious', 'Grateful', 'Happy'],
        aiMoodAnalysis: [
          { mood: 'Happy', percentage: 40 },
          { mood: 'Anxious', percentage: 30 },
          { mood: 'Grateful', percentage: 30 }
        ],
        importance: 4,
        color: 'bg-[#CCD5AE]/15 border-[#CCD5AE]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: [
          { id: 't1', text: 'Review first 2 chemistry chapters', completed: true },
          { id: 't2', text: 'Purchase monthly medication', completed: true }
        ],
        tags: ['study', 'family', 'hope'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 7.5,
        sportsDuration: 30,
        medications: [
          { id: 'm1', name: 'Vitamin D3 Weekly Supplement', time: '10:00 AM', taken: true }
        ]
      },
      {
        id: 'diary-2',
        title: 'Midnight Insomnia & Overthinking the Future',
        content: 'Could not sleep well last night due to catastrophic scenarios about my academic and career future. Woke up feeling fatigued and exhausted. In the evening, I challenged myself to a 45-minute brisk walk, which brought gradual relief and calm.',
        createdAt: '2026-07-14T09:45:00.000Z',
        updatedAt: '2026-07-14T09:45:00.000Z',
        moods: ['Exhausted', 'Anxious', 'Sad'],
        aiMoodAnalysis: [
          { mood: 'Anxious', percentage: 50 },
          { mood: 'Exhausted', percentage: 35 },
          { mood: 'Sad', percentage: 15 }
        ],
        importance: 3,
        color: 'bg-[#FAEDCD]/30 border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [
          {
            id: 'rec-1',
            name: 'Insomnia Venting & Thought Dump.mp3',
            dataUrl: '#',
            duration: 48,
            transcription: 'Recording this voice note because I feel anxious and cannot quiet my racing heart...'
          }
        ],
        files: [],
        tasks: [
          { id: 't3', text: '2-minute deep breathing exercise before bed', completed: false }
        ],
        tags: ['insomnia', 'anxiety', 'challenge'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 4.5,
        sportsDuration: 45,
        medications: [
          { id: 'm1', name: 'Vitamin D3 Weekly Supplement', time: '10:00 AM', taken: false }
        ]
      },
      {
        id: 'diary-3',
        title: 'Project Achievement & Mindful Evening Reading',
        content: 'Finished my university project presentation and received great praise from my peers and supervisor. Felt an overwhelming surge of excitement, joy, and self-satisfaction. Read a chapter on CBT before bed with a warm chamomile tea.',
        createdAt: '2026-07-12T22:00:00.000Z',
        updatedAt: '2026-07-12T22:00:00.000Z',
        moods: ['Very Happy', 'Excited', 'Relaxed'],
        aiMoodAnalysis: [
          { mood: 'Very Happy', percentage: 60 },
          { mood: 'Excited', percentage: 30 },
          { mood: 'Relaxed', percentage: 10 }
        ],
        importance: 5,
        color: 'bg-[#F0EDE4] border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: [
          { id: 't4', text: 'Read Chapter 4 of CBT book', completed: true }
        ],
        tags: ['success', 'reading', 'happiness'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 8.0,
        sportsDuration: 0,
        medications: []
      }
    ];
  }
}

export function getInitialHabits(lang: AppLanguage): Habit[] {
  const t = getTranslation(lang);
  return [
    {
      id: 'habit-1',
      name: t.habitWater2L,
      category: 'health',
      frequency: 'daily',
      reminderTime: '08:00',
      reminderEnabled: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      history: {
        '2026-07-14': true,
        '2026-07-15': true,
        '2026-07-16': true,
      }
    },
    {
      id: 'habit-2',
      name: t.habitMeditation10min,
      category: 'mind',
      frequency: 'daily',
      reminderTime: '07:30',
      reminderEnabled: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      history: {
        '2026-07-15': true,
        '2026-07-16': false,
      }
    },
    {
      id: 'habit-3',
      name: t.habitBriskWalk,
      category: 'sport',
      frequency: 'daily',
      reminderTime: '17:00',
      reminderEnabled: false,
      createdAt: '2026-07-01T00:00:00.000Z',
      history: {
        '2026-07-14': true,
        '2026-07-15': true,
        '2026-07-16': true,
      }
    },
    {
      id: 'habit-4',
      name: t.habitRead10Pages,
      category: 'culture',
      frequency: 'daily',
      reminderTime: '21:00',
      reminderEnabled: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      history: {
        '2026-07-14': true,
        '2026-07-15': false,
        '2026-07-16': true,
      }
    }
  ];
}

export function getInitialGratitudeCards(lang: AppLanguage): GratitudeCard[] {
  const t = getTranslation(lang);
  return [
    {
      id: 'grat-1',
      color: 'green',
      text: t.gratitudeCardSample1,
      category: 'life',
      createdAt: '2026-07-14T08:00:00.000Z',
      tags: [t.tag_gratitude, t.tag_morning]
    },
    {
      id: 'grat-2',
      color: 'peach',
      text: t.gratitudeCardSample2,
      category: 'relationships',
      createdAt: '2026-07-15T09:30:00.000Z',
      tags: [t.tag_family, t.tag_warmth]
    },
    {
      id: 'grat-3',
      color: 'lavender',
      text: t.gratitudeCardSample3,
      category: 'work',
      createdAt: '2026-07-16T14:15:00.000Z',
      tags: [t.tag_achievement, t.tag_growth]
    }
  ];
}

export function getReminderTitle(rem: any, t: any): string {
  if (!rem) return '';
  if (rem.key && t[rem.key]) return t[rem.key];
  if (rem.title) {
    if (rem.title.includes('أذكار الصباح') || rem.title.includes('Morning Athkar') || rem.title.includes('Morning Dhikr')) return t.reminder_morning_athkar || rem.title;
    if (rem.title.includes('شرب الماء') || rem.title.includes('Drink Water')) return t.reminder_water || rem.title;
    if (rem.title.includes('أذكار المساء') || rem.title.includes('Evening Athkar') || rem.title.includes('Evening Dhikr')) return t.reminder_evening_athkar || rem.title;
    if (rem.title.includes('تدوين اليوميات') || rem.title.includes('Daily Journal') || rem.title.includes('Daily Diary')) return t.reminder_daily_diary || rem.title;
  }
  return rem.title || '';
}

function localizeHabit(habit: Habit, t: any): Habit {
  if (!habit) return habit;
  const name = habit.name;
  if (name.includes('ماء') || name.includes('Water') || name.includes('Eau') || name.includes('Wasser') || name.includes('Su') || name.includes('Agua') || name.includes('Acqua') || name.includes('Вод') || name.includes('水') || name.includes('पानी')) {
    return { ...habit, name: t.habitWaterName };
  }
  if (name.includes('تأمل') || name.includes('Meditation') || name.includes('Méditation') || name.includes('Meditación') || name.includes('Meditazione') || name.includes('Медитация') || name.includes('瞑想') || name.includes('冥想') || name.includes('ध्यान')) {
    return { ...habit, name: t.habitMeditationName };
  }
  if (name.includes('مشي') || name.includes('Walk') || name.includes('Marche') || name.includes('Gehen') || name.includes('Caminar') || name.includes('Camminata') || name.includes('Yürüyüş') || name.includes('Caminhada') || name.includes('Ходьба') || name.includes('ウォーキング') || name.includes('散步') || name.includes('सैर')) {
    return { ...habit, name: t.habitWalkingName };
  }
  if (name.includes('قراءة') || name.includes('Read') || name.includes('Lecture') || name.includes('Lesen') || name.includes('Leer') || name.includes('Leggere') || name.includes('Okuma') || name.includes('Leitura') || name.includes('Чтение') || name.includes('読書') || name.includes('阅读') || name.includes('पढ़ना')) {
    return { ...habit, name: t.habitReadingName };
  }
  return habit;
}

function localizeGratitudeCard(card: GratitudeCard, t: any): GratitudeCard {
  if (!card) return card;
  if (card.id === 'grat-1') {
    return { ...card, text: t.gratitudeDemoText1 || card.text, tags: [t.tag_gratitude, t.tag_morning] };
  }
  if (card.id === 'grat-2') {
    return { ...card, text: t.gratitudeDemoText2 || card.text, tags: [t.tag_family, t.tag_warmth] };
  }
  if (card.id === 'grat-3') {
    return { ...card, text: t.gratitudeDemoText3 || card.text, tags: [t.tag_achievement, t.tag_growth] };
  }
  return card;
}

function localizeDiaryEntry(entry: DiaryEntry, t: any): DiaryEntry {
  if (!entry) return entry;
  if (entry.id === 'diary-1') {
    return {
      ...entry,
      title: t.diaryDemoTitle1 || entry.title,
      content: t.diaryDemoContent1 || entry.content,
      moods: [t.mood_anxious, t.mood_grateful, t.mood_happy],
      tags: [t.tag_study, t.tag_family, t.tag_hope]
    };
  }
  if (entry.id === 'diary-2') {
    return {
      ...entry,
      title: t.diaryDemoTitle2 || entry.title,
      content: t.diaryDemoContent2 || entry.content,
      moods: [t.mood_exhausted, t.mood_anxious, t.mood_sad],
      tags: [t.tag_insomnia, t.tag_anxiety, t.tag_challenge]
    };
  }
  if (entry.id === 'diary-3') {
    return {
      ...entry,
      title: t.diaryDemoTitle3 || entry.title,
      content: t.diaryDemoContent3 || entry.content,
      moods: [t.mood_joyful, t.mood_excited, t.mood_satisfied],
      tags: [t.tag_achievement, t.tag_reading, t.tag_happiness]
    };
  }
  return entry;
}

const AudioPlayerWithIndexedDBFallback: React.FC<{
  rec: AudioRecording;
  onToggleRecording: () => void;
}> = ({ rec, onToggleRecording }) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    return (rec.dataUrl && rec.dataUrl !== '#') ? rec.dataUrl : (rec.blobUrl && rec.blobUrl !== '#' ? rec.blobUrl : null);
  });

  useEffect(() => {
    let isMounted = true;
    if ((!resolvedSrc || resolvedSrc === '#' || resolvedSrc.startsWith('blob:')) && rec.attachmentId) {
      getAttachmentObjectUrl(rec.attachmentId).then((url) => {
        if (isMounted && url) {
          setResolvedSrc(url);
        }
      });
    }
    return () => { isMounted = false; };
  }, [rec.attachmentId, rec.dataUrl, rec.blobUrl]);

  if (resolvedSrc && resolvedSrc !== '#') {
    return (
      <div className="bg-white p-3 rounded-xl border border-[#D0C8B0] shadow-2xs space-y-1.5 my-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#5A5A40]">
          <span className="flex items-center gap-1.5">
            <span>🎧</span>
            <span>{t?.audioRecordingPlayer || "Audio Recording Player:"}</span>
          </span>
          <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
            جاهز للتشغيل والاستماع
          </span>
        </div>
        <audio controls src={resolvedSrc} className="w-full h-9 rounded-lg cursor-pointer bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between my-1">
      <span>⚠️ {t?.audioCannotPlay || "Cannot play audio (file not fully saved)."}</span>
      <button
        type="button"
        onClick={() => onToggleRecording()}
        className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg font-bold cursor-pointer transition-colors text-[10px] shrink-0"
      >
        إعادة التسجيل 🎙️
      </button>
    </div>
  );
};

export default function App() {
  // --- Persistent State Hooks ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_settings');
      const parsed: AppSettings = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
      const directLang = localStorage.getItem('app_language') as AppLanguage;
      if (directLang && ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'].includes(directLang)) {
        parsed.appLanguage = directLang;
      }
      const savedCredId = localStorage.getItem('yawmiyati_biometric_cred_id');
      if (savedCredId && !parsed.biometricCredentialId) {
        parsed.biometricCredentialId = savedCredId;
      }
      // Migrate / resolve master lock state
      const rawStoredLock = localStorage.getItem('appLockEnabled');
      if (rawStoredLock !== null) {
        parsed.appLockEnabled = rawStoredLock === 'true';
      } else if (parsed.appLockEnabled !== undefined) {
        localStorage.setItem('appLockEnabled', String(parsed.appLockEnabled));
      } else {
        // If neither was explicitly set, default to false
        parsed.appLockEnabled = false;
        localStorage.setItem('appLockEnabled', 'false');
      }
      // If appLockEnabled is false, enforce isAppLocked = false on boot
      if (!parsed.appLockEnabled) {
        parsed.isAppLocked = false;
      } else {
        // On cold start with lock enabled, require lock
        parsed.isAppLocked = true;
      }
      const migrated = migrateSettingsApiKeys(parsed || DEFAULT_SETTINGS);
      try {
        localStorage.setItem('yawmiyati_settings', JSON.stringify(migrated));
      } catch (_) {}
      return migrated;
    } catch (e) {
      console.error('Error loading saved settings:', e);
      return DEFAULT_SETTINGS;
    }
  });

  const langInfo = getLanguageInfo(settings?.appLanguage || 'ar');
  const isAr = (settings?.appLanguage || 'ar') === 'ar';
  const isEn = (settings?.appLanguage || 'ar') === 'en';
  const isRtl = (langInfo?.dir || 'rtl') === 'rtl';
  const t = getTranslation(settings?.appLanguage || 'ar');

  const [diaries, setDiaries] = useState<DiaryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_diaries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved diaries:', e);
    }
    return getInitialDiaries(settings?.appLanguage || 'ar');
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_habits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved habits:', e);
    }
    return getInitialHabits(settings?.appLanguage || 'ar');
  });

  const [gratitudeCards, setGratitudeCards] = useState<GratitudeCard[]>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_gratitude_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved gratitude cards:', e);
    }
    return getInitialGratitudeCards(settings?.appLanguage || 'ar');
  });

  const displayedDiaries = useMemo(() => {
    if (!Array.isArray(diaries)) return [];
    return diaries.map(d => localizeDiaryEntry(d, t));
  }, [diaries, t]);

  const displayedHabits = useMemo(() => {
    if (!Array.isArray(habits)) return [];
    return habits.map(h => localizeHabit(h, t));
  }, [habits, t]);

  const displayedGratitudeCards = useMemo(() => {
    if (!Array.isArray(gratitudeCards)) return [];
    return gratitudeCards.map(c => localizeGratitudeCard(c, t));
  }, [gratitudeCards, t]);

  const [activeDiariesSubTab, setActiveDiariesSubTab] = useState<'journal' | 'gratitude' | 'cbt' | 'tasks'>('journal');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'report' | 'charts' | 'pros_cons'>('report');
  const [diaryTypeFilter, setDiaryTypeFilter] = useState<'all' | JournalEntryType | 'favorites'>('all');
  const [diaryChatMessage, setDiaryChatMessage] = useState('');
  const [diaryChatLoading, setDiaryChatLoading] = useState(false);
  const [diaryChatMediaPermission, setDiaryChatMediaPermission] = useState<AIMediaAccessPermission>(DEFAULT_AI_MEDIA_ACCESS);

  // States for Daily Pros & Cons Modal (الإيجابيات والسلبيات)
  const [isProsConsModalOpen, setIsProsConsModalOpen] = useState(false);
  const [prosConsDayKey, setProsConsDayKey] = useState('');
  const [prosConsDisplayDate, setProsConsDisplayDate] = useState('');
  const [prosConsDayDiaries, setProsConsDayDiaries] = useState<DiaryEntry[]>([]);

  // States for Athkar Modals
  const [isFullAthkarModalOpen, setIsFullAthkarModalOpen] = useState(false);
  const [isLockScreenAthkarOpen, setIsLockScreenAthkarOpen] = useState(false);

  const handleOpenProsConsForDay = (dayKey: string, displayDate: string, dayDiaries: DiaryEntry[]) => {
    setProsConsDayKey(dayKey);
    setProsConsDisplayDate(displayDate);
    setProsConsDayDiaries(dayDiaries);
    setIsProsConsModalOpen(true);
  };

  // Daily Psychological Inspiration quote state
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string; isAiGenerated?: boolean } | null>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_daily_quote');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isAiGenerated && parsed.quote) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Breathing Box Session states
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [breathingCycle, setBreathingCycle] = useState(0);

  // CBT wizard modal state
  const [showAddCbtModal, setShowAddCbtModal] = useState(false);
  const [cbtStep, setCbtStep] = useState(1);
  const [cbtTriggerEvent, setCbtTriggerEvent] = useState('');
  const [cbtNegativeThoughts, setCbtNegativeThoughts] = useState('');
  const [cbtCognitiveDistortion, setCbtCognitiveDistortion] = useState('');
  const [cbtRationalAlternative, setCbtRationalAlternative] = useState('');
  const [cbtEmotionBefore, setCbtEmotionBefore] = useState(7);
  const [cbtEmotionAfter, setCbtEmotionAfter] = useState(4);
  const [cbtLoading, setCbtLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'diaries' | 'advisor' | 'analytics' | 'settings'>(() => {
    return (localStorage.getItem('yawmiyati_active_tab') as any) || 'dashboard';
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Daily Metrics Touched Interaction State (Tracked per YYYY-MM-DD date)
  const [dailyTouchedMetrics, setDailyTouchedMetrics] = useState<TouchedStore>(() => {
    return loadAllTouchedMetrics();
  });

  useEffect(() => {
    const handleMetricTouchedEvent = () => {
      setDailyTouchedMetrics(loadAllTouchedMetrics());
    };
    window.addEventListener('yawmiyati-metric-touched', handleMetricTouchedEvent);
    return () => {
      window.removeEventListener('yawmiyati-metric-touched', handleMetricTouchedEvent);
    };
  }, []);

  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('');

  // Auto-save notification helper
  const triggerAutoSaveFeedback = () => {
    setAutoSaveStatus('saving');
    const nowStr = new Date().toLocaleTimeString(langInfo?.bcp47 || (settings?.appLanguage === 'ar' ? 'ar-SA' : 'en-US'), { hour: '2-digit', minute: '2-digit' });
    setTimeout(() => {
      setAutoSaveStatus('saved');
      setLastAutoSaveTime(nowStr);
    }, 300);
  };

  // Save activeTab to localStorage immediately on change
  useEffect(() => {
    localStorage.setItem('yawmiyati_active_tab', activeTab);
  }, [activeTab]);

  // Dynamic Font Family & Line Height Styling Effect
  useEffect(() => {
    const fontCss = getFontCss(settings.appFont);
    const lhCss = getLineHeightCss(settings.appLineHeight);
    document.documentElement.style.fontFamily = fontCss;
    document.documentElement.style.lineHeight = `${lhCss}`;
    document.body.style.fontFamily = fontCss;
    document.body.style.lineHeight = `${lhCss}`;
  }, [settings.appFont, settings.appLineHeight]);

  // Synchronize document dir and lang dynamically across all 12 locales
  useEffect(() => {
    const info = getLanguageInfo(settings.appLanguage || 'ar');
    document.documentElement.setAttribute('dir', info.dir);
    document.documentElement.setAttribute('lang', info.code);
    document.documentElement.dir = info.dir;
    document.documentElement.lang = info.code;
  }, [settings.appLanguage]);

  // Mobile Top Header & Bottom Navigation State (Stable native navigation)
  const [isHeaderCollapsedOnMobile, setIsHeaderCollapsedOnMobile] = useState(false);
  const [isBottomNavCollapsedOnMobile, setIsBottomNavCollapsedOnMobile] = useState(false);

  // Mobile Virtual Keyboard detection (hides bottom nav during typing to prevent jumping)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };
    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight - 120;
        setIsKeyboardOpen(isShrunk);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, []);

  // Reveals header if collapsed
  const revealHeaderTemporarily = useCallback(() => {
    setIsHeaderCollapsedOnMobile(false);
  }, []);

  // Reveals bottom nav if collapsed
  const revealBottomNavTemporarily = useCallback(() => {
    setIsBottomNavCollapsedOnMobile(false);
  }, []);

  // Collapses top header on mobile when explicitly requested
  const collapseHeaderOnMobile = useCallback(() => {
    // Kept for backward compatibility
  }, []);

  // Navbar More Menu Dropdown State & Ref
  const [showNavMoreMenu, setShowNavMoreMenu] = useState(false);
  const navMoreMenuRef = useRef<HTMLDivElement | null>(null);

  // Close Navbar More Menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navMoreMenuRef.current && !navMoreMenuRef.current.contains(event.target as Node)) {
        setShowNavMoreMenu(false);
      }
    };
    if (showNavMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNavMoreMenu]);

  // Fullscreen Toggle Helper
  const handleToggleFullscreen = async () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const diariesSaveDebounceRef = useRef<any>(null);

  // Debounced Auto-Save for diaries to prevent main-thread lag during typing/editing
  useEffect(() => {
    if (diariesSaveDebounceRef.current) {
      clearTimeout(diariesSaveDebounceRef.current);
    }

    diariesSaveDebounceRef.current = setTimeout(() => {
      try {
        const safeDiaries = sanitizeDiariesForLocalStorage(diaries || []);
        localStorage.setItem('yawmiyati_diaries', JSON.stringify(safeDiaries));
        triggerAutoSaveFeedback();
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }, 1200);

    return () => {
      if (diariesSaveDebounceRef.current) {
        clearTimeout(diariesSaveDebounceRef.current);
      }
    };
  }, [diaries]);

  useEffect(() => {
    try {
      localStorage.setItem('yawmiyati_settings', JSON.stringify(settings));
      triggerAutoSaveFeedback();
    } catch (e) { console.warn(e); }
  }, [settings]);

  // Global rehydration of attachments from IndexedDB on startup:
  // Rehydrates fresh object URLs for images and audio files so cards and players display cleanly offline
  useEffect(() => {
    let isCancelled = false;
    const rehydrateAllDiaries = async () => {
      let anyRehydrated = false;
      const updatedDiaries = await Promise.all(
        diaries.map(async (d) => {
          let modified = false;
          let newImages = [...(d.images || [])];
          let newAudio = [...(d.audioRecordings || [])];

          // Check images
          if (d.imageAttachmentIds && d.imageAttachmentIds.length > 0) {
            for (let i = 0; i < d.imageAttachmentIds.length; i++) {
              const aid = d.imageAttachmentIds[i];
              if (aid && (!newImages[i] || newImages[i] === '#' || newImages[i].startsWith('blob:'))) {
                const fresh = await getAttachmentObjectUrl(aid);
                if (fresh) {
                  newImages[i] = fresh;
                  modified = true;
                }
              }
            }
          }

          // Check audio recordings
          if (d.audioRecordings && d.audioRecordings.length > 0) {
            for (let i = 0; i < d.audioRecordings.length; i++) {
              const rec = d.audioRecordings[i];
              if (rec.attachmentId && (!rec.dataUrl || rec.dataUrl === '#' || rec.dataUrl.startsWith('blob:'))) {
                const fresh = await getAttachmentObjectUrl(rec.attachmentId);
                if (fresh) {
                  newAudio[i] = { ...rec, dataUrl: fresh, blobUrl: fresh };
                  modified = true;
                }
              }
            }
          }

          if (modified) {
            anyRehydrated = true;
            return {
              ...d,
              images: newImages,
              audioRecordings: newAudio
            };
          }
          return d;
        })
      );

      if (!isCancelled && anyRehydrated) {
        setDiaries(updatedDiaries);
      }
    };

    rehydrateAllDiaries();
    return () => {
      isCancelled = true;
    };
  }, []);

  // --- Active Diary Editing State ---
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video' | 'audio' | 'pdf', url: string, name?: string } | null>(null);
  const [showExportDiaryModal, setShowExportDiaryModal] = useState<boolean>(false);
  const [isTopDrawerOpen, setIsTopDrawerOpen] = useState<boolean>(false);
  const [editingDrawingIndex, setEditingDrawingIndex] = useState<number | null>(null);
  const [showAttachmentsPage, setShowAttachmentsPage] = useState<boolean>(false);
  const [showVoiceVentModal, setShowVoiceVentModal] = useState<boolean>(false);
  const [pendingNativeQuickAction, setPendingNativeQuickAction] = useState<'new_note' | 'voice' | 'mood' | 'ai' | 'notes' | null>(null);
  const [showGratitudeImportModal, setShowGratitudeImportModal] = useState<boolean>(false);
  const [globalCopyToast, setGlobalCopyToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showGlobalCopyToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setGlobalCopyToast({ message: msg, type });
    setTimeout(() => {
      setGlobalCopyToast(prev => (prev?.message === msg ? null : prev));
    }, 2500);
  }, []);
  const [selectedChatIndices, setSelectedChatIndices] = useState<number[]>([]);
  const [isChatSelectMode, setIsChatSelectMode] = useState<boolean>(false);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(() => {
    const saved = localStorage.getItem('yawmiyati_draft_editing_diary');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });

  const isSavingDiaryRef = useRef<boolean>(false);
  const [isSavingDiary, setIsSavingDiary] = useState<boolean>(false);

  // --- Pure Event-Driven File Picker Guard & Synchronous Draft Persistence ---
  const isFilePickerActiveRef = useRef<boolean>(false);

  const saveDraftSynchronously = useCallback((draft: DiaryEntry | null) => {
    if (draft) {
      try {
        const safeDraft = {
          ...draft,
          videos: (draft.videos || []).map(v => (v && v.length > 500000) ? '#' : v),
          images: (draft.images || []).map(img => (img && img.length > 500000) ? '' : img).filter(Boolean),
          audioRecordings: (draft.audioRecordings || []).map(r => ({
            ...r,
            dataUrl: (r.attachmentId || (r.dataUrl && r.dataUrl.length > 500000)) ? '#' : r.dataUrl
          })),
          files: (draft.files || []).map(f => ({
            ...f,
            dataUrl: (f.attachmentId || (f.dataUrl && f.dataUrl.length > 500000)) ? '#' : f.dataUrl
          })),
          drawing: (draft.drawingAttachmentId || (draft.drawing && draft.drawing.length > 200000)) ? '#' : draft.drawing,
          drawings: (draft.drawings || []).map((drawItem, dIdx) => {
            const aId = draft.drawingAttachmentIds?.[dIdx];
            return (aId || (drawItem && drawItem.length > 200000)) ? '#' : drawItem;
          })
        };
        localStorage.setItem('yawmiyati_draft_editing_diary', JSON.stringify(safeDraft));
      } catch (e) {
        console.warn('Failed synchronous draft save:', e);
      }
    } else {
      try {
        localStorage.removeItem('yawmiyati_draft_editing_diary');
      } catch (e) {}
    }
  }, []);

  const markFilePickerActive = useCallback(() => {
    isFilePickerActiveRef.current = true;
    // Instant sync: Ensure current editor DOM content is persisted to localStorage immediately before picker opens
    if (editorRef.current && editingDiary) {
      const htmlContent = editorRef.current.innerHTML;
      const currentDraft = { ...editingDiary, content: htmlContent };
      saveDraftSynchronously(currentDraft);
    }
  }, [editingDiary, saveDraftSynchronously]);

  const resetFilePickerGuard = useCallback(() => {
    isFilePickerActiveRef.current = false;
  }, []);

  // Auto-lock when user leaves tab/window, hides page, or switches applications
  useEffect(() => {
    const handleAutoLock = () => {
      // Do NOT auto-lock if user is currently picking a file / taking a photo / recording audio!
      if (isFilePickerActiveRef.current) {
        return;
      }
      if (document.visibilityState === 'hidden' || document.hidden) {
        // Only lock if master app lock toggle is enabled
        const isMasterLockEnabled = settings.appLockEnabled === true || localStorage.getItem('appLockEnabled') === 'true';
        if (isMasterLockEnabled) {
          setSettings(prev => {
            const next = { ...prev, isAppLocked: true };
            try {
              localStorage.setItem('yawmiyati_settings', JSON.stringify(next));
            } catch (e) { console.warn(e); }
            return next;
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleAutoLock);
    window.addEventListener('pagehide', handleAutoLock);

    return () => {
      document.removeEventListener('visibilitychange', handleAutoLock);
      window.removeEventListener('pagehide', handleAutoLock);
    };
  }, [settings.appPinCode, settings.isAppLocked, settings.appLockEnabled]);


  useEffect(() => {
    try {
      localStorage.setItem('yawmiyati_habits', JSON.stringify(habits));
      triggerAutoSaveFeedback();
    } catch (e) { console.warn(e); }
  }, [habits]);

  useEffect(() => {
    try {
      localStorage.setItem('yawmiyati_gratitude_cards', JSON.stringify(gratitudeCards));
      triggerAutoSaveFeedback();
    } catch (e) { console.warn(e); }
  }, [gratitudeCards]);

  useEffect(() => {
    try {
      localStorage.setItem('yawmiyati_daily_quote', JSON.stringify(dailyQuote));
    } catch (e) { console.warn(e); }
  }, [dailyQuote]);

  // Reliable Local-Midnight (12:00 AM) Daily Report Scheduler (Catch-up, Idempotent & Background Task Safe)
  useEffect(() => {
    const cleanupScheduler = initializeDailyReportScheduler(
      () => settings.userApiKey,
      () => settings.appLanguage || 'ar'
    );
    return cleanupScheduler;
  }, [settings.userApiKey, settings.appLanguage]);

  // Window beforeunload fail-safe auto-saver
  useEffect(() => {
    const performFullSave = () => {
      try {
        const safeDiaries = sanitizeDiariesForLocalStorage(diaries || []);
        localStorage.setItem('yawmiyati_diaries', JSON.stringify(safeDiaries));
        localStorage.setItem('yawmiyati_settings', JSON.stringify(settings));
        localStorage.setItem('yawmiyati_habits', JSON.stringify(habits));
        localStorage.setItem('yawmiyati_gratitude_cards', JSON.stringify(gratitudeCards));
        localStorage.setItem('yawmiyati_daily_quote', JSON.stringify(dailyQuote));
      } catch (e) {
        console.error('Fail-safe auto save error:', e);
      }
    };

    window.addEventListener('beforeunload', performFullSave);

    const handleSwitchTab = (e: Event) => {
      const customEv = e as CustomEvent;
      if (customEv.detail) {
        if (customEv.detail === 'lockscreen') {
          setIsFullAthkarModalOpen(false);
          setIsLockScreenAthkarOpen(true);
        } else if (['dashboard', 'diaries', 'advisor', 'analytics', 'settings'].includes(customEv.detail)) {
          setIsFullAthkarModalOpen(false);
          setActiveTab(customEv.detail as any);
        }
      }
    };

    const handleOpenFullAthkarModal = () => {
      setIsLockScreenAthkarOpen(false);
      setIsFullAthkarModalOpen(true);
    };

    const handleSettingsUpdated = (e: any) => {
      if (e?.detail) {
        setSettings(prev => ({ ...prev, ...e.detail }));
      }
    };

    window.addEventListener('yawmiyaty_switch_app_tab', handleSwitchTab);
    window.addEventListener('open_full_athkar_modal', handleOpenFullAthkarModal);
    window.addEventListener('yawmiyati_settings_updated', handleSettingsUpdated);

    return () => {
      window.removeEventListener('beforeunload', performFullSave);
      window.removeEventListener('yawmiyaty_switch_app_tab', handleSwitchTab);
      window.removeEventListener('open_full_athkar_modal', handleOpenFullAthkarModal);
      window.removeEventListener('yawmiyati_settings_updated', handleSettingsUpdated);
    };
  }, [diaries, settings, habits, gratitudeCards, dailyQuote]);

  // Breathing Box Session Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isBreathingActive) {
      interval = setInterval(() => {
        setBreathingTimer(prev => {
          if (prev === 1) {
            // Move to next phase
            setBreathingPhase(phase => {
              if (phase === 'inhale') {
                return 'hold1';
              } else if (phase === 'hold1') {
                return 'exhale';
              } else if (phase === 'exhale') {
                return 'hold2';
              } else {
                setBreathingCycle(c => c + 1);
                return 'inhale';
              }
            });
            return 4; // Reset to 4 seconds
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathingTimer(4);
      setBreathingPhase('inhale');
      setBreathingCycle(0);
    }
    return () => clearInterval(interval);
  }, [isBreathingActive]);

  // --- 👤 User Authentication & Session State ---
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('yawmiyati_auth_token'));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check existing session token on mount
  useEffect(() => {
    const checkUserSession = async () => {
      // 1. First restore local user profile immediately if present
      const savedProfile = localStorage.getItem('yawmiyati_user_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setCurrentUser(parsed);
        } catch (e) {
          console.error('Profile parse error:', e);
        }
      }

      const token = localStorage.getItem('yawmiyati_auth_token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const res = await response.json();
            if (res.success && res.user) {
              setCurrentUser(res.user);
              localStorage.setItem('yawmiyati_user_profile', JSON.stringify(res.user));
              setAuthToken(token);
              // Fetch account-specific cloud data
              handleCloudRestoreWithToken(token);
            }
          } else if (response.status === 401) {
            // Explicit unauthenticated status from backend
            localStorage.removeItem('yawmiyati_auth_token');
            localStorage.removeItem('yawmiyati_user_profile');
            setAuthToken(null);
            setCurrentUser(null);
          }
        } catch (e) {
          console.error('Session validation server check (kept local session):', e);
          // Keep local user session intact if server is unreachable or deployed as static site
        }
      }
    };
    checkUserSession();
  }, []);

  // --- ☁️ Real-time Cloud Synchronization Engine ---
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);

  const performCloudSync = async (forceData?: { diaries?: DiaryEntry[], habits?: Habit[], settings?: AppSettings, gratitudeCards?: GratitudeCard[] }) => {
    setIsCloudSyncing(true);
    const payload = {
      diaries: forceData?.diaries || diaries,
      habits: forceData?.habits || habits,
      settings: forceData?.settings || settings,
      gratitudeCards: forceData?.gratitudeCards || gratitudeCards,
      chatMessages: (() => {
        try {
          const raw = localStorage.getItem('yawmiyati_chat_messages');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })(),
      activeTab: localStorage.getItem('yawmiyati_active_tab') || 'dashboard',
      syncTime: new Date().toISOString()
    };
    try {

      const token = authToken || localStorage.getItem('yawmiyati_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/cloud-sync/save', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        setCloudSyncMessage(data.message || `${t.cloudSyncSuccess}: ${new Date().toLocaleTimeString(langInfo?.bcp47 || "en-US")}`);
      } else {
        setCloudSyncMessage('فشل التزامن السحابي التلقائي');
      }
    } catch (e) {
      console.error('Cloud Sync error:', e);
      try {
        localStorage.setItem('yawmiyati_cloud_sync_backup', JSON.stringify(payload));
        setCloudSyncMessage(`${t.backupSavedSuccess}: ${new Date().toLocaleTimeString(langInfo?.bcp47 || "en-US")}`);
      } catch (err) {
        setCloudSyncMessage(`${t.cloudSyncSuccess}: ${new Date().toLocaleTimeString(langInfo?.bcp47 || "en-US")}`);
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCloudRestoreWithToken = async (tokenOverride?: string) => {
    setIsCloudSyncing(true);
    setCloudSyncMessage('جاري استيراد نسختك الاحتياطية من السحابة...');
    try {
      const token = tokenOverride || authToken || localStorage.getItem('yawmiyati_auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/cloud-sync/fetch', { headers });
      const res = await response.json();
      if (res.success && res.data) {
        if (res.data.diaries) {
          setDiaries(res.data.diaries);
          localStorage.setItem('yawmiyati_diaries', JSON.stringify(res.data.diaries));
        }
        if (res.data.habits) {
          setHabits(res.data.habits);
          localStorage.setItem('yawmiyati_habits', JSON.stringify(res.data.habits));
        }
        if (res.data.settings) {
          setSettings(res.data.settings);
          localStorage.setItem('yawmiyati_settings', JSON.stringify(res.data.settings));
        }
        if (res.data.gratitudeCards) {
          setGratitudeCards(res.data.gratitudeCards);
          localStorage.setItem('yawmiyati_gratitude_cards', JSON.stringify(res.data.gratitudeCards));
        }
        if (res.data.chatMessages) {
          localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(res.data.chatMessages));
        }
        setCloudSyncMessage('تمت استعادة كل مذكراتك ومحادثاتك من السحابة بنجاح! 🎉☁️');
      } else {
        setCloudSyncMessage('حسابك جديد ومتصل بالسحابة، يمكنك بدء التدوين وحفظ بياناتك تلقائياً.');
      }
    } catch (e) {
      console.error('Restore error:', e);
      setCloudSyncMessage('خطأ أثناء استعادة البيانات السحابية');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleCloudRestore = () => handleCloudRestoreWithToken();

  const handleLoginSuccess = (user: AuthUser, token: string, userData?: any) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('yawmiyati_auth_token', token);
    localStorage.setItem('yawmiyati_user_profile', JSON.stringify(user));

    if (userData) {
      if (userData.diaries) {
        setDiaries(userData.diaries);
        localStorage.setItem('yawmiyati_diaries', JSON.stringify(userData.diaries));
      }
      if (userData.habits) {
        setHabits(userData.habits);
        localStorage.setItem('yawmiyati_habits', JSON.stringify(userData.habits));
      }
      if (userData.settings) {
        setSettings(userData.settings);
        localStorage.setItem('yawmiyati_settings', JSON.stringify(userData.settings));
      }
      if (userData.gratitudeCards) {
        setGratitudeCards(userData.gratitudeCards);
        localStorage.setItem('yawmiyati_gratitude_cards', JSON.stringify(userData.gratitudeCards));
      }
      if (userData.chatMessages) {
        localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(userData.chatMessages));
      }
      setCloudSyncMessage(`${t.welcomeCloudSync} ${user.name}! ${t.cloudSyncRestored}`);
    } else {
      handleCloudRestoreWithToken(token);
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('yawmiyati_auth_token');
    localStorage.removeItem('yawmiyati_user_profile');
    setAuthToken(null);
    setCurrentUser(null);
    setCloudSyncMessage(t.logoutSuccess);
  };

  // Auto-restore on load if local storage is completely empty (safeguard for clean/reset installs)
  useEffect(() => {
    const checkAndRestore = async () => {
      try {
        const token = localStorage.getItem('yawmiyati_auth_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch('/api/cloud-sync/fetch', { headers });
        const res = await response.json();
        if (res.success && res.data) {
          const localDiaries = localStorage.getItem('yawmiyati_diaries');
          let hasLocal = false;
          try {
            if (localDiaries) {
              const parsed = JSON.parse(localDiaries);
              if (Array.isArray(parsed) && parsed.length > 0) hasLocal = true;
            }
          } catch (e) {}

          if (!hasLocal) {
            console.log("No local diaries, auto-restoring from server cloud backup...");
            if (res.data.diaries) setDiaries(res.data.diaries);
            if (res.data.habits) setHabits(res.data.habits);
            if (res.data.settings) setSettings(res.data.settings);
            if (res.data.gratitudeCards) setGratitudeCards(res.data.gratitudeCards);
            if (res.data.chatMessages) {
              localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(res.data.chatMessages));
            }
            setCloudSyncMessage('أهلاً بك! تم تحميل يومياتك ومحادثاتك سحابياً تلقائياً ☁️🟢');
          }
        }
      } catch (err) {
        console.error("Auto-sync load check failed:", err);
      }
    };
    checkAndRestore();
  }, []);

  // Sync to cloud on local changes with 1.5s debounce to keep database safe
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performCloudSync();
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [diaries, habits, settings, gratitudeCards]);

  const [activeHabitReminder, setActiveHabitReminder] = useState<{ id: string; name: string } | null>(null);

  // --- Gratitude Journal Reminders & Notifications ---
  const [activeGratitudeReminderNotification, setActiveGratitudeReminderNotification] = useState(false);
  const lastFiredGratitudeMinuteRef = React.useRef<string>('');

  useEffect(() => {
    const checkReminder = () => {
      const isEnabled = localStorage.getItem('yawmiyati_gratitude_reminder_enabled') !== 'false';
      const reminderTime = localStorage.getItem('yawmiyati_gratitude_reminder_time') || '21:00';

      if (!isEnabled) return;

      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;

      if (currentTimeStr === reminderTime && lastFiredGratitudeMinuteRef.current !== currentTimeStr) {
        lastFiredGratitudeMinuteRef.current = currentTimeStr;
        setActiveGratitudeReminderNotification(true);
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 15000);
    return () => clearInterval(interval);
  }, []);

  // --- Persistent Lock Screen Notification Widget Helper ---
  const triggerLockScreenNotification = useCallback(async () => {
    if (isNativeAndroid) {
      await SmartReminder.setLockScreenNotification({
        enabled: true,
        title: t.lockScreenNotificationTitle || 'حياة AI — وصول سريع',
        body: t.lockScreenPermanentDesc || 'كتابة وفضفضة سريعة من شاشة القفل',
        writeLabel: t.write || 'كتابة',
        voiceLabel: t.voiceRecord || 'تسجيل صوتي',
        moodLabel: t.mood || 'مزاج',
        advisorLabel: t.smartAdvisorTab || 'مستشار'
      });
      return;
    }
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error(e);
      }
    }

    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.register('/sw.js').catch(() => null);
          if (reg && reg.showNotification) {
            await reg.showNotification(t.notificationActiveNow, {
              body: 'كيف تشعر الآن يا صديقي؟ 😊 | اضغط للوصول السريع لتدوين المذكرات، التسجيل الصوتي، والمستشار الذكي.',
              tag: 'yawmiyati-lockscreen-widget',
              requireInteraction: true,
              renotify: true,
              icon: '/icon-192.png',
              badge: '/icon-192.png'
            });
            return;
          }
        }
        new Notification(t.notificationActiveNow, {
          body: 'كيف تشعر الآن يا صديقي؟ 😊 | اضغط للوصول السريع لتدوين المذكرات، التسجيل الصوتي، والمستشار الذكي.',
          tag: 'yawmiyati-lockscreen-widget',
          requireInteraction: true
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (settings.lockScreenWidgetEnabled !== false && settings.notificationsEnabled) {
      triggerLockScreenNotification().catch(() => {});
    } else if (isNativeAndroid) {
      SmartReminder.setLockScreenNotification({ enabled: false }).catch(() => {});
    }
  }, [settings.lockScreenWidgetEnabled, settings.notificationsEnabled, triggerLockScreenNotification]);

  // --- Smart Reminders Logic ---
  const [showSmartRemindersModal, setShowSmartRemindersModal] = useState(false);
  const [triggeredReminder, setTriggeredReminder] = useState<AppReminder | null>(null);
  const [activeInAppReminder, setActiveInAppReminder] = useState<InAppReminderData | null>(null);

  // Sync reminders natively with Android AlarmManager
  useEffect(() => {
    if (settings.reminders) {
      syncAllRemindersNative(settings.reminders);
    }
  }, [settings.reminders]);

  // Handle answers to reminder prompts
  const handleReminderResponse = useCallback((reminderId: string, answer: 'yes' | 'no' | 'dismissed') => {
    if (answer === 'yes') {
      setHabits(prev => prev.map(h => {
        if (h.id === reminderId || (h.name && h.name.includes(reminderId))) {
          return { ...h, isCompleted: true };
        }
        return h;
      }));
      showGlobalCopyToast('تم تسجيل الإجابة بنجاح! أحسنت 🌟', 'success');
    }
    setActiveInAppReminder(null);
  }, [showGlobalCopyToast]);

  // Sync pending responses on launch and visibilitychange
  useEffect(() => {
    const syncResponses = async () => {
      try {
        const res = await SmartReminder.consumePendingResponses();
        if (res?.responses && res.responses.length > 0) {
          for (const item of res.responses) {
            if (item.answer === 'yes' || item.answer === 'no' || item.answer === 'dismissed') {
              handleReminderResponse(item.reminderId, item.answer);
            }
          }
        }
      } catch {}
    };

    syncResponses();
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        syncResponses();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [handleReminderResponse]);
  const lastFiredReminderRef = React.useRef<{ [id: string]: string }>({});

  useEffect(() => {
    const checkSmartReminders = () => {
      if (!settings.notificationsEnabled) return;
      const reminders = settings.reminders || [];
      if (reminders.length === 0) return;

      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMinute}`;
      const currentDay = now.getDay(); // 0 = Sun, 6 = Sat

      reminders.forEach(r => {
        if (!r.active) return;
        if (r.time !== currentTimeStr) return;

        let matchDay = false;
        if (r.frequency === 'daily') {
          matchDay = true;
        } else if (r.frequency === 'weekly') {
          matchDay = r.selectedDays?.includes(currentDay) ?? (currentDay === new Date().getDay());
        } else if (r.frequency === 'custom_days') {
          matchDay = r.selectedDays ? r.selectedDays.includes(currentDay) : true;
        }

        if (matchDay && lastFiredReminderRef.current[r.id] !== currentTimeStr) {
          lastFiredReminderRef.current[r.id] = currentTimeStr;
          setTriggeredReminder(r);
          setActiveInAppReminder({
            id: r.id,
            title: `${r.categoryIcon || '🔔'} ${r.title}`,
            body: r.motivationalNote || '',
            isQuestion: !!r.isQuestion,
            yesLabel: r.yesLabel,
            noLabel: r.noLabel
          });

          try {
            const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
            if (AudioContext) {
              const ctx = new AudioContext();
              const n = ctx.currentTime;
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(523.25, n);
              osc.frequency.exponentialRampToValueAtTime(783.99, n + 0.3);
              gain.gain.setValueAtTime(0.2, n);
              gain.gain.exponentialRampToValueAtTime(0.001, n + 0.5);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(n);
              osc.stop(n + 0.5);
            }
          } catch {
            // Audio context disabled
          }
        }
      });
    };

    checkSmartReminders();
    const interval = setInterval(checkSmartReminders, 15000);
    return () => clearInterval(interval);
  }, [settings.notificationsEnabled, settings.reminders]);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🎯');
  const [newHabitCategory, setNewHabitCategory] = useState<'health' | 'mind' | 'sport' | 'culture' | 'custom'>('custom');
  const [newHabitReminderTime, setNewHabitReminderTime] = useState('08:00');
  const [newHabitReminderEnabled, setNewHabitReminderEnabled] = useState(true);
  const [selectedHabitCategory, setSelectedHabitCategory] = useState<string>('all');

  // Habits evaluation period analytics
  const [habitPeriod, setHabitPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'custom'>('weekly');
  const [habitCustomStart, setHabitCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [habitCustomEnd, setHabitCustomEnd] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [habitEvaluationReport, setHabitEvaluationReport] = useState('');
  const [habitEvaluationLoading, setHabitEvaluationLoading] = useState(false);

  const toggleHabitCompletion = (habitId: string, dateStr: string, customVal?: any) => {
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        let newVal: any;
        if (customVal !== undefined) {
          if (customVal === 'skip') {
            newVal = { completed: false, skipped: true };
          } else {
            newVal = customVal;
          }
        } else {
          const currentVal = h.history[dateStr];
          let isComp = false;
          if (typeof currentVal === 'boolean') isComp = currentVal;
          else if (typeof currentVal === 'number') isComp = currentVal > 0;
          else if (typeof currentVal === 'object' && currentVal) isComp = currentVal.completed;
          newVal = !isComp;
        }
        return {
          ...h,
          history: {
            ...h.history,
            [dateStr]: newVal
          }
        };
      }
      return h;
    }));
  };

  const deleteHabit = (habitId: string) => {
    if (confirm(t.confirmDeleteHabitPermanent)) {
      setHabits(prev => prev.filter(h => h.id !== habitId));
    }
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name: newHabitName.trim(),
      icon: newHabitIcon,
      category: newHabitCategory,
      frequency: 'daily',
      reminderTime: newHabitReminderTime,
      reminderEnabled: newHabitReminderEnabled,
      createdAt: new Date().toISOString(),
      history: {}
    };

    setHabits(prev => [...prev, newHabit]);
    setNewHabitName('');
    setNewHabitIcon('🎯');
    setNewHabitCategory('custom');
    setNewHabitReminderTime('08:00');
    setNewHabitReminderEnabled(true);
    setShowAddHabitModal(false);
  };

  const triggerSimulatedHabitNotification = (habit: Habit) => {
    setActiveHabitReminder({ id: habit.id, name: habit.name });
    // Clear after 6 seconds
    setTimeout(() => {
      setActiveHabitReminder(null);
    }, 6000);
  };

  const generateHabitReport = async () => {
    setHabitEvaluationLoading(true);
    setHabitEvaluationReport('');

    try {
      let start = new Date();
      let end = new Date();
      const endStr = end.toISOString().split('T')[0];

      if (habitPeriod === 'daily') {
        start.setDate(start.getDate() - 1);
      } else if (habitPeriod === 'weekly') {
        start.setDate(start.getDate() - 7);
      } else if (habitPeriod === 'monthly') {
        start.setDate(start.getDate() - 30);
      } else if (habitPeriod === 'quarterly') {
        start.setDate(start.getDate() - 90);
      } else if (habitPeriod === 'semi-annually') {
        start.setDate(start.getDate() - 180);
      } else if (habitPeriod === 'annually') {
        start.setDate(start.getDate() - 365);
      } else {
        start = new Date(habitCustomStart);
        end = new Date(habitCustomEnd);
      }

      const startStr = start.toISOString().split('T')[0];

      // Generate dates in range
      const datesList: string[] = [];
      const currentCursor = new Date(start);
      // set hours to 0 to prevent date rollover issues
      currentCursor.setHours(12, 0, 0, 0);
      const endCheck = new Date(end);
      endCheck.setHours(12, 0, 0, 0);

      while (currentCursor <= endCheck) {
        datesList.push(currentCursor.toISOString().split('T')[0]);
        currentCursor.setDate(currentCursor.getDate() + 1);
      }

      // Calculate compliance: (completed slots / total possible slots)
      let totalSlots = habits.length * datesList.length;
      let completedSlots = 0;

      habits.forEach(h => {
        datesList.forEach(d => {
          if (h.history[d]) {
            completedSlots++;
          }
        });
      });

      const overallCompliance = totalSlots > 0 ? Math.round((completedSlots / totalSlots) * 100) : 0;

      const res = await fetch('/api/gemini/evaluate-habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({
          habits,
          period: habitPeriod === 'custom' ? `${t.customPeriod} ${startStr} - ${endStr}` : habitPeriod,
          startDate: startStr,
          endDate: endStr,
          overallCompliance
        })
      });

      const data = await res.json();
      if (data.success) {
        setHabitEvaluationReport(data.answer);
      } else {
        setHabitEvaluationReport(t.systemUnavailable);
      }
    } catch (err) {
      console.error(err);
      setHabitEvaluationReport(t.errorEvaluatingHabits);
    } finally {
      setHabitEvaluationLoading(false);
    }
  };

  // --- Restore IndexedDB Attachment Blobs into ObjectURLs on Mount & Diary Selection ---
  useEffect(() => {
    let isCancelled = false;
    const restoreIndexedDBAttachments = async () => {
      if (!editingDiary) return;
      let hasChanges = false;

      const restoredFiles = await Promise.all((editingDiary.files || []).map(async (f) => {
        if (f.attachmentId && (!f.dataUrl || f.dataUrl === '#' || f.dataUrl.startsWith('blob:'))) {
          const objectUrl = await getAttachmentObjectUrl(f.attachmentId);
          if (objectUrl) {
            hasChanges = true;
            return { ...f, dataUrl: objectUrl };
          }
        }
        return f;
      }));

      const restoredAudio = await Promise.all((editingDiary.audioRecordings || []).map(async (r) => {
        if (r.attachmentId && (!r.dataUrl || r.dataUrl === '#' || r.dataUrl.startsWith('blob:'))) {
          const objectUrl = await getAttachmentObjectUrl(r.attachmentId);
          if (objectUrl) {
            hasChanges = true;
            return { ...r, dataUrl: objectUrl, blobUrl: objectUrl };
          }
        }
        return r;
      }));

      // Rehydrate Images from imageAttachmentIds in IndexedDB + persistent non-blob images + legacy files
      const imageAttIds = editingDiary.imageAttachmentIds || [];
      const restoredFromImageIds = await Promise.all(imageAttIds.map(async (id) => {
        return await getAttachmentObjectUrl(id);
      }));
      const validRestoredImageUrls = restoredFromImageIds.filter(Boolean) as string[];

      const persistentImages = (editingDiary.images || []).filter(img => img && !img.startsWith('blob:'));

      const legacyFileImageUrls = restoredFiles
        .filter(f => (f.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name || ''))
        .map(f => f.dataUrl)
        .filter(Boolean) as string[];

      const restoredImages = Array.from(new Set([...persistentImages, ...validRestoredImageUrls, ...legacyFileImageUrls]));
      if (restoredImages.length > 0 && JSON.stringify(restoredImages) !== JSON.stringify(editingDiary.images || [])) {
        hasChanges = true;
      }

      // Rehydrate Videos from videoAttachmentIds in IndexedDB + persistent non-blob videos + legacy files
      const videoAttIds = editingDiary.videoAttachmentIds || [];
      const restoredFromVideoIds = await Promise.all(videoAttIds.map(async (id) => {
        return await getAttachmentObjectUrl(id);
      }));
      const validRestoredVideoUrls = restoredFromVideoIds.filter(Boolean) as string[];

      const persistentVideos = (editingDiary.videos || []).filter(vid => vid && !vid.startsWith('blob:'));

      const legacyFileVideoUrls = restoredFiles
        .filter(f => (f.type || '').startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(f.name || ''))
        .map(f => f.dataUrl)
        .filter(Boolean) as string[];

      const restoredVideos = Array.from(new Set([...persistentVideos, ...validRestoredVideoUrls, ...legacyFileVideoUrls]));
      if (restoredVideos.length > 0 && JSON.stringify(restoredVideos) !== JSON.stringify(editingDiary.videos || [])) {
        hasChanges = true;
      }

      // Rehydrate Drawings from IndexedDB if needed (Multiple Drawings Support)
      let restoredDrawings = (Array.isArray(editingDiary.drawings) && editingDiary.drawings.length > 0)
        ? [...editingDiary.drawings]
        : (editingDiary.drawing ? [editingDiary.drawing] : []);
      const attIds = (Array.isArray(editingDiary.drawingAttachmentIds) && editingDiary.drawingAttachmentIds.length > 0)
        ? editingDiary.drawingAttachmentIds
        : (editingDiary.drawingAttachmentId ? [editingDiary.drawingAttachmentId] : []);

      if (attIds.length > 0) {
        for (let i = 0; i < attIds.length; i++) {
          const aid = attIds[i];
          if (aid && (!restoredDrawings[i] || restoredDrawings[i] === '#' || restoredDrawings[i].startsWith('blob:null'))) {
            const drawUrl = await getAttachmentObjectUrl(aid);
            if (drawUrl) {
              restoredDrawings[i] = drawUrl;
              hasChanges = true;
            }
          }
        }
      }
      let restoredDrawing = restoredDrawings[0] || editingDiary.drawing;

      if (hasChanges && !isCancelled) {
        const finalImages = restoredImages.length > 0 ? restoredImages : editingDiary.images;
        const finalVideos = restoredVideos.length > 0 ? restoredVideos : editingDiary.videos;

        setEditingDiary(prev => (prev && prev.id === editingDiary.id) ? {
          ...prev,
          files: restoredFiles,
          audioRecordings: restoredAudio,
          images: finalImages,
          videos: finalVideos,
          drawing: restoredDrawing,
          drawings: restoredDrawings
        } : prev);

        // Sync fresh live Object URLs into diaries list in memory so other views/modals access valid media
        setDiaries(prev => prev.map(d => d.id === editingDiary.id ? {
          ...d,
          files: restoredFiles,
          audioRecordings: restoredAudio,
          images: finalImages,
          videos: finalVideos,
          drawing: restoredDrawing || d.drawing,
          drawings: restoredDrawings.length > 0 ? restoredDrawings : d.drawings
        } : d));
      }
    };

    restoreIndexedDBAttachments();
    return () => {
      isCancelled = true;
    };
  }, [editingDiary?.id]);
  const [isNewEntry, setIsNewEntry] = useState(() => {
    return localStorage.getItem('yawmiyati_draft_is_new_entry') === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [newEditAddition, setNewEditAddition] = useState(() => {
    return localStorage.getItem('yawmiyati_draft_new_edit_addition') || '';
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [backupEmail, setBackupEmail] = useState(() => {
    const saved = localStorage.getItem('yawmiyati_backup_email') || '';
    if (saved.includes('wahdlyallh') || saved.includes('youssef')) {
      localStorage.removeItem('yawmiyati_backup_email');
      return '';
    }
    return saved;
  });
  const [isSendingEmailBackup, setIsSendingEmailBackup] = useState(false);
  const [emailBackupStatus, setEmailBackupStatus] = useState<string | null>(null);

  // --- Archive Management States ---
  const [archivedSearchQuery, setArchivedSearchQuery] = useState('');
  const [archivedTypeFilter, setArchivedTypeFilter] = useState<'all' | 'diary' | 'thought'>('all');
  const [viewArchivedDiary, setViewArchivedDiary] = useState<DiaryEntry | null>(null);
  const [archiveToast, setArchiveToast] = useState<{ message: string; diaryId: string; action: 'archived' | 'unarchived' } | null>(null);

  useEffect(() => {
    if (archiveToast) {
      const timer = setTimeout(() => {
        setArchiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [archiveToast]);

  // --- Universal Navigation History & Back Handler ---
  interface NavState {
    activeTab: 'dashboard' | 'diaries' | 'advisor' | 'analytics' | 'settings';
    activeDiariesSubTab: 'journal' | 'gratitude' | 'cbt' | 'tasks';
    analyticsSubTab: 'report' | 'charts' | 'pros_cons';
    editingDiaryId: string | null;
    diaryTypeFilter: 'all' | JournalEntryType | 'favorites';
  }

  const [navHistory, setNavHistory] = useState<NavState[]>([]);
  const [navStackCount, setNavStackCount] = useState(0);

  useEffect(() => {
    return navigationStack.subscribe(() => {
      setNavStackCount(navigationStack.size());
    });
  }, []);
  const isNavigatingBackRef = useRef(false);
  const prevNavStateRef = useRef<NavState>({
    activeTab,
    activeDiariesSubTab,
    analyticsSubTab,
    editingDiaryId: editingDiary?.id || null,
    diaryTypeFilter
  });

  // --- Optimized Navigation Engine ---
  const switchTab = useCallback((newTab: 'dashboard' | 'diaries' | 'advisor' | 'analytics' | 'settings', options?: { subTab?: string; resetEdit?: boolean }) => {
    const currentState: NavState = {
      activeTab,
      activeDiariesSubTab,
      analyticsSubTab,
      editingDiaryId: editingDiary?.id || null,
      diaryTypeFilter
    };

    // Batch nav history update with active tab update for instant single-frame rendering
    setNavHistory(history => [...history.slice(-15), currentState]);
    setActiveTab(newTab);
    if (options?.subTab) {
      if (newTab === 'diaries') setActiveDiariesSubTab(options.subTab as any);
      if (newTab === 'analytics') setAnalyticsSubTab(options.subTab as any);
    }
    if (options?.resetEdit || newTab !== activeTab) {
      setEditingDiary(null);
    }
  }, [activeTab, activeDiariesSubTab, analyticsSubTab, editingDiary?.id, diaryTypeFilter]);

  const handleGoBack = useCallback(() => {
    // If navigationStack has steps (e.g. modals, overlays, sub-views), step it back first
    if (navigationStack.size() > 0) {
      const res = navigationStack.handleStepBack();
      if (res === 'handled') return;
      if (res === 'exit') {
        CapApp.exitApp().catch(() => {});
        return;
      }
      if (res === 'warn_exit') return;
    }

    if (editingDiary) {
      setEditingDiary(null);
      return;
    }

    if (navHistory.length > 0) {
      const lastState = navHistory[navHistory.length - 1];
      setNavHistory(history => history.slice(0, history.length - 1));

      setActiveTab(lastState.activeTab);
      setActiveDiariesSubTab(lastState.activeDiariesSubTab);
      setAnalyticsSubTab(lastState.analyticsSubTab);
      setDiaryTypeFilter(lastState.diaryTypeFilter);
      if (lastState.editingDiaryId) {
        const found = diaries.find(d => d.id === lastState.editingDiaryId);
        setEditingDiary(found || null);
      } else {
        setEditingDiary(null);
      }
    } else if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
      setEditingDiary(null);
    } else {
      // At root dashboard with empty history
      const res = navigationStack.handleStepBack();
      if (res === 'exit') {
        CapApp.exitApp().catch(() => {});
      }
    }
  }, [editingDiary, navHistory, activeTab, diaries]);

  // Wire navigation stack exit toast callback to global toast system
  useEffect(() => {
    navigationStack.setExitToastCallback(() => {
      const exitMsg = t.press_again_to_exit || (settings?.appLanguage === 'ar' ? 'اضغط مرة أخرى للخروج من التطبيق' : 'Press back again to exit');
      showGlobalCopyToast(exitMsg, 'success');
    });
  }, [settings?.appLanguage, showGlobalCopyToast, t]);

  // Expose universal back handler globally for native Android WebView (MainActivity.java)
  useEffect(() => {
    (window as any).__hayatHandleBackPress = () => {
      if (navigationStack.size() > 0) {
        const res = navigationStack.handleStepBack();
        return res;
      }

      if (editingDiary) {
        setEditingDiary(null);
        return 'handled';
      }

      if (navHistory.length > 0) {
        handleGoBack();
        return 'handled';
      }

      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return 'handled';
      }

      // At dashboard root with empty stack
      const res = navigationStack.handleStepBack();
      return res;
    };

    return () => {
      delete (window as any).__hayatHandleBackPress;
    };
  }, [editingDiary, navHistory, activeTab, handleGoBack]);

  // Capacitor hardware back button event listener
  useEffect(() => {
    let removeListener: (() => void) | null = null;
    try {
      CapApp.addListener('backButton', () => {
        if ((window as any).__hayatHandleBackPress) {
          const res = (window as any).__hayatHandleBackPress();
          if (res === 'exit') {
            CapApp.exitApp().catch(() => {});
          }
        } else {
          handleGoBack();
        }
      }).then(handle => {
        removeListener = () => handle.remove();
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener) removeListener();
    };
  }, [handleGoBack]);

  useEffect(() => {
    if (backupEmail) {
      localStorage.setItem('yawmiyati_backup_email', backupEmail);
    }
  }, [backupEmail]);

  // Sync backup email with current logged-in user email
  useEffect(() => {
    if (currentUser?.email) {
      setBackupEmail(currentUser.email);
    } else if (!localStorage.getItem('yawmiyati_backup_email')) {
      setBackupEmail('');
    }
  }, [currentUser]);

  // Debounced Save active editing states to localStorage (400ms debounce to eliminate main-thread lag during typing/navigation)
  // --- True Autosave Effect (LATEST DATA WINS) ---
  const draftSaveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!editingDiary) {
      try {
        localStorage.removeItem('yawmiyati_draft_editing_diary');
      } catch (e) {}
      return;
    }

    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      // 1. Save draft to local storage as safety backup
      try {
        const safeDraft = {
          ...editingDiary,
          audioRecordings: (editingDiary.audioRecordings || []).map(r => ({ ...r, dataUrl: (r.dataUrl && r.dataUrl.length > 5000000) ? '#' : r.dataUrl })),
          images: (editingDiary.images || []).map(img => (img && img.length > 3000000) ? '' : img).filter(Boolean),
          files: (editingDiary.files || []).map(f => ({ ...f, dataUrl: (f.dataUrl && f.dataUrl.length > 5000000) ? '#' : f.dataUrl })),
          videos: (editingDiary.videos || []).map(v => (v && v.length > 5000000) ? '#' : v).filter(Boolean)
        };
        localStorage.setItem('yawmiyati_draft_editing_diary', JSON.stringify(safeDraft));
      } catch (e) {}

      // 2. Commit to main diaries array if not completely empty
      const hasContent = (editingDiary.content && editingDiary.content.trim() !== '') ||
                         (editingDiary.images && editingDiary.images.length > 0) ||
                         (editingDiary.videos && editingDiary.videos.length > 0) ||
                         (editingDiary.files && editingDiary.files.length > 0) ||
                         editingDiary.drawing;

      if (hasContent) {
        setDiaries(prev => {
          const idx = prev.findIndex(d => d.id === editingDiary.id);
          if (idx !== -1) {
            // Check if there is an actual change to avoid unnecessary re-renders
            if (JSON.stringify(prev[idx]) !== JSON.stringify(editingDiary)) {
              const next = [...prev];
              next[idx] = editingDiary;
              // Synchronous persist for safety
              try { localStorage.setItem('yawmiyati_diaries', JSON.stringify(next)); } catch(e) {}
              return next;
            }
            return prev;
          } else {
            // New entry: promote from draft to real entry
            setIsNewEntry(false);
            const next = [editingDiary, ...prev];
            try { localStorage.setItem('yawmiyati_diaries', JSON.stringify(next)); } catch(e) {}
            return next;
          }
        });
      }
    }, 1000);

    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [editingDiary, isNewEntry]);

  useEffect(() => {
    localStorage.setItem('yawmiyati_draft_is_new_entry', String(isNewEntry));
  }, [isNewEntry]);

  const newEditAdditionTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (newEditAdditionTimeoutRef.current) {
      clearTimeout(newEditAdditionTimeoutRef.current);
    }
    newEditAdditionTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('yawmiyati_draft_new_edit_addition', newEditAddition);
      } catch (e) {}
    }, 400);

    return () => {
      if (newEditAdditionTimeoutRef.current) {
        clearTimeout(newEditAdditionTimeoutRef.current);
      }
    };
  }, [newEditAddition]);

  // --- Drawing Sketchboard State ---
  const [showSketchboard, setShowSketchboard] = useState(false);
  const [isDiaryEditorFullscreen, setIsDiaryEditorFullscreen] = useState(false);
  const [isSketchboardFullscreen, setIsSketchboardFullscreen] = useState(false);
  useRegisterBackStep('diary_editor_fullscreen', 'modal', isDiaryEditorFullscreen, () => setIsDiaryEditorFullscreen(false), isAr ? 'محرر اليوميات' : 'Diary editor');
  useRegisterBackStep('drawing_pad_fullscreen', 'modal', isSketchboardFullscreen, () => setIsSketchboardFullscreen(false), isAr ? 'لوحة الرسم' : 'Drawing pad');

  // --- Therapist Report Modal State ---
  const [showTherapistModal, setShowTherapistModal] = useState(false);

  // --- Full Calendar Modal State ---
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Auto-collapse top header & temporarily show bottom nav bar on mobile when user navigates
  useEffect(() => {
    collapseHeaderOnMobile();
    revealBottomNavTemporarily();
  }, [activeTab, activeDiariesSubTab, editingDiary?.id, showCalendarModal, collapseHeaderOnMobile, revealBottomNavTemporarily]);

  // --- Comprehensive Library and Calendar States ---
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('yawmiyati_books');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'book-1',
        title: 'العلاج المعرفي السلوكي للنفس والروح 🧠',
        notes: 'د. جوديث بيك - يشرح آليات تعديل الأفكار التلقائية والتعامل مع المخاوف والقلق اليومي.',
        rating: 5,
        pdfPath: 'كتاب العلاج المعرفي.pdf',
        referenceLink: 'https://cbt-institute.com',
        audioAttachment: 'ملخص صوتي.mp3',
        coverAttachment: '',
        videoAttachment: 'شرح العلاج المعرفي.mp4',
        hasMindMap: true,
        tags: ['علم نفس', 'صحة نفسية'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'book-2',
        title: 'المرونة النفسية والصلابة الذاتية 💪',
        notes: 'د. بندر آل جلالة - يتناول طرق تعزيز الصلابة النفسية ومقاومة الصدمات اليومية وتجاوزها.',
        rating: 4,
        pdfPath: 'المرونة النفسية.pdf',
        referenceLink: '',
        audioAttachment: '',
        coverAttachment: '',
        videoAttachment: '',
        hasMindMap: false,
        tags: ['تنمية ذاتية', 'صحة نفسية'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'book-3',
        title: 'رواية الخيمائي والبحث عن الحقيقة 📖',
        notes: 'باولو كويلو - رواية رمزية ملهمة تدور حول اتباع الشغف والإنصات لصوت القلب والرحلة الذاتية.',
        rating: 5,
        pdfPath: 'رواية_الخيمائي.pdf',
        referenceLink: '',
        audioAttachment: 'ملخص_صوتي.mp3',
        coverAttachment: '',
        videoAttachment: '',
        hasMindMap: true,
        tags: ['روايات', 'أدب', 'تنمية ذاتية'],
        createdAt: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('yawmiyati_books', JSON.stringify(books));
  }, [books]);

  const [calendarSubTab, setCalendarSubTab] = useState<'calendar' | 'library' | 'reports'>('calendar');
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [bookFormTitle, setBookFormTitle] = useState('');
  const [bookFormNotes, setBookFormNotes] = useState('');
  const [bookFormRating, setBookFormRating] = useState(5);
  const [bookFormPdf, setBookFormPdf] = useState('');
  const [bookFormLink, setBookFormLink] = useState('');
  const [bookFormAudio, setBookFormAudio] = useState('');
  const [bookFormCover, setBookFormCover] = useState('');
  const [bookFormVideo, setBookFormVideo] = useState('');
  const [bookFormHasMindMap, setBookFormHasMindMap] = useState(false);
  const [bookFormTags, setBookFormTags] = useState<string[]>([]);
  const [bookFormCustomTag, setBookFormCustomTag] = useState('');
  const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookRatingFilter, setBookRatingFilter] = useState<number>(0);
  const [bookAttachmentFilter, setBookAttachmentFilter] = useState<string>('all');
  const [selectedBookTagFilter, setSelectedBookTagFilter] = useState<string>('all');

  // --- Redesigned Settings Tab Subsections ---
  const [expandedSettingsCard, setExpandedSettingsCard] = useState<'api' | 'backup' | 'pin' | 'favorites' | 'reminders' | 'archive' | 'trash' | 'languages' | null>(null);
  const [showGeminiKeyModal, setShowGeminiKeyModal] = useState(false);
  const [showBackupSyncModal, setShowBackupSyncModal] = useState(false);
  const [showWriteDiaryImporter, setShowWriteDiaryImporter] = useState(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [isFirstTimeLangSelect, setIsFirstTimeLangSelect] = useState(false);

  // New Pro Feature Modals State
  const [showPredictiveHealthModal, setShowPredictiveHealthModal] = useState(false);
  const [showVoiceJournalModal, setShowVoiceJournalModal] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  // Auto-open onboarding tour on first visit
  useEffect(() => {
    const tourDone = localStorage.getItem('hayat_onboarding_completed');
    if (!tourDone) {
      const timer = setTimeout(() => {
        setShowOnboardingTour(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Shareable Gratitude Cards Exporter
  const [showGratitudeShareModal, setShowGratitudeShareModal] = useState(false);
  const [gratitudeShareData, setGratitudeShareData] = useState<CardExportData | undefined>(undefined);

  // Auto-open language selector on first visit
  useEffect(() => {
    const chosen = localStorage.getItem('app_language') || localStorage.getItem('yawmiyati_language_chosen');
    if (!chosen) {
      setShowLanguagesModal(true);
      setIsFirstTimeLangSelect(true);
    }
  }, []);

  // Update HTML direction and language attributes on change
  useEffect(() => {
    const info = getLanguageInfo(settings?.appLanguage || 'ar');
    document.documentElement.setAttribute('dir', info.dir);
    document.documentElement.setAttribute('lang', info.code);
  }, [settings?.appLanguage || 'ar']);
  const [showLockScreenWidgetInfoModal, setShowLockScreenWidgetInfoModal] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [newAlarmTitle, setNewAlarmTitle] = useState('');
  const [newAlarmTime, setNewAlarmTime] = useState('20:00');

  // --- Voice Recorder & Speech-to-Text States ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = React.useRef<number>(0);
  const recordingStartTimeRef = React.useRef<number | null>(null);
  const [recordingIntervalId, setRecordingIntervalId] = useState<number | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const speechTranscriptRef = React.useRef<string>('');
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechInterim, setSpeechInterim] = useState('');
  const [speechDiagnostics, setSpeechDiagnostics] = useState<any>(null);
  const [audioUploadLoading, setAudioUploadLoading] = useState(false);
  const [transcribingAudioId, setTranscribingAudioId] = useState<string | null>(null);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editingTranscriptText, setEditingTranscriptText] = useState<string>('');

  // --- Rich Editor & Features Sheet States ---
  const [showFontToolbar, setShowFontToolbar] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showMoreFeaturesSheet, setShowMoreFeaturesSheet] = useState(false);
  const [showFontDrawer, setShowFontDrawer] = useState(false);
  const [fontDrawerSize, setFontDrawerSize] = useState(16);
  const [fontDrawerFamily, setFontDrawerFamily] = useState('font-sans');
  const [showAiWriterSheet, setShowAiWriterSheet] = useState(false);
  const [aiWriterTopicInput, setAiWriterTopicInput] = useState('');
  const [aiWriterLoading, setAiWriterLoading] = useState(false);
  const [aiWriterResult, setAiWriterResult] = useState<{ title: string; content: string } | null>(null);
  const [copiedAiText, setCopiedAiText] = useState(false);

  // Helper to generate dynamic, topic-specific note content on client if server API is unreachable
  const generateSmartClientNoteFallback = (topic: string): { title: string; content: string } => {
    const cleanTopic = (topic || t.healthMentalNoteType).trim();
    const lower = cleanTopic.toLowerCase();

    if (lower.includes('مذاكرة') || lower.includes('جدول') || lower.includes('دراسة') || lower.includes('امتحان') || lower.includes('دروس') || lower.includes('study') || lower.includes('exam')) {
      return {
        title: `${t.studyScheduleTitle}: ${cleanTopic}`,
        content: `إليك جدول مذاكرة ذكي ومصمم خصيصاً لتنظيم وقتك وتحقيق أقصى درجات التركيز:

📅 **التوزيع الزمني المقترح لليوم الدراسي:**

⏰ **الفترة الأولى (الصباح الباكر: 8:00 ص - 10:30 ص):**
• **المادة الأساسية / الأكثر صعوبة**: التركيز الذهني في أوج نشاطه.
• **تقنية الفترات (Pomodoro)**: 45 دقيقة مذاكرة مركزة + 15 دقيقة استراحة بدون شاشات.

⏰ **الفترة الثانية (الظهيرة: 11:30 ص - 1:30 م):**
• **حل التمارين والتطبيقات**: حل الأسئلة وتلخيص النقاط الرئيسية.
• **استراحة الغداء والقيلولة**: 45 دقيقة لاستعادة النشاط.

⏰ **الفترة الثالثة (المساء: 4:30 م - 6:30 م):**
• **المراجعة والتثبيت**: مراجعة الملخصات وحل البطاقات الاستذكارية (Flashcards).

💡 **نصائح ذهبية لضمان النجاح:**
1. **قاعدة الـ 5 دقائق**: إذا شعرت بالتكاسل، ابدأ المذاكرة لمدة 5 دقائق فقط وسيتولى دماغك الباقي.
2. **الترطيب والتغذية**: ابقَ كوب الماء بجانبك واستغني عن المنبهات المفرطة.
3. **بيئة هادئة**: ابعد الهاتف تماماً عن غرفة المذاكرة.`
      };
    }

    if (lower.includes('صح') || lower.includes('تمارين') || lower.includes('رياضة') || lower.includes('غذاء') || lower.includes('وزن') || lower.includes('لياقة') || lower.includes('health') || lower.includes('fitness')) {
      return {
        title: `${t.healthPlanTitle}: ${cleanTopic}`,
        content: `بناءً على طلبك حول (${cleanTopic})، إليك دليل عملي شامل لتحسين صحتك ونشاطك:

🏋️ **البرنامج البدني والرياضي:**
• **تمارين الإحماء والحركة**: 10 دقائق من التمدد وتنشيط الدورة الدموية.
• **النشاط المباشر**: 30-45 دقيقة مخصصة للرياضة الأساسية (مشي سريع أو تمارين قوة).
• **الاستشفاء**: تمارين إطالة هادئة بعد التمرين لمنع التشنجات.

🥗 **التغذية والهيدرة:**
1. **شرب الماء**: قسم تناول 2.5 لتر ماء على مدار اليوم بالتساوي.
2. **الوجبات المتوازنة**: ركز على البروتينات النظيفة والألياف وقلل من السكريات المعالجة.
3. **النوم الصحي**: احرص على النوم المنتظم بين 7 إلى 8 ساعات ليلاً.`
      };
    }

    if (lower.includes('عمل') || lower.includes('مشروع') || lower.includes('تسويق') || lower.includes('خدمة') || lower.includes('إدارة') || lower.includes('أهداف') || lower.includes('work') || lower.includes('project') || lower.includes('plan')) {
      return {
        title: `${t.actionPlanTitle}: ${cleanTopic}`,
        content: `إليك دليل تنفيذي منظم للتعامل مع موضوع (${cleanTopic}):

📌 **الخطوات الاستراتيجية الأولية:**
1. **تحديد الهدف الذكي (SMART Goal)**: حدد النتائج المرجوة بدقة وقابلية للقياس.
2. **تفكيك المهمة إلى أجزاء صغيرة**: قسم المشروعات الكبيرة إلى مهام يومية لا تتجاوز 30 دقيقة للمهمة.
3. **مصفوفة الأولويات (Eisenhower Matrix)**: ركز أولاً على المهام "الهامة والعاجلة" ثم التخطيط للمهام الاستراتيجية.

📊 **نظام التقييم والمتابعة:**
• قم بمراجعة الإنجازات بنهاية كل يوم لتحديد نقاط التحسين.
• ركز على الجودة والتعاطف وحل مشكلات العملاء/المنظومة بأسلوب ابتكاري.`
      };
    }

    return {
      title: `${t.comprehensiveAnalysisTitle}: ${cleanTopic}`,
      content: `بناءً على طلبك وتفكير الذكاء الاصطناعي حول موضوع (${cleanTopic})، إليك الملاحظة المنظمة الشاملة:

💡 **المفاهيم والأفكار الرئيسية:**
• ينطوي موضوع **${cleanTopic}** على أبعاد هامة تتطلب التخطيط والوعي والعمل المتزن.
• التركيز على البداية البسيطة والمستمرة هو المفتاح الأساسي للوصول للنتائج المرجوة.

📌 **خطط وإجراءات عملية تنفيذية:**
1. **الخطوة الأولى**: ابدأ بتدوين ملاحظاتك اليومية وتحديد العقبات المحتملة وكيفية تجاوزها.
2. **الخطوة الثانية**: ضع جدولاً زمنياً مرناً يراعي طاقتك وتركيزك الذهني.
3. **الخطوة الثالثة**: قيم التقدم بشكل دوري واحتفل بالإنجازات الصغرى.

🌸 **توصية هامة**: احتفظ بهذه الملاحظة في يومياتك لتستعين بها في تقييم تطورك واستقرارك النفسي والفكري.`
    };
  };

  const handleAiGenerateNote = async (selectedTopic?: string) => {
    const topic = selectedTopic || aiWriterTopicInput || 'نصائح صحية ونفسية';
    setAiWriterLoading(true);
    setAiWriterResult(null);
    try {
      const res = await fetch('/api/gemini/generate-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({ promptTopic: topic, appLanguage: settings.appLanguage || 'ar' })
      });
      const data = await res.json();
      if (data.success && data.title && data.content) {
        setAiWriterResult({
          title: data.title,
          content: data.content
        });
      } else {
        setAiWriterResult(generateSmartClientNoteFallback(topic));
      }
    } catch (err) {
      console.error(err);
      setAiWriterResult(generateSmartClientNoteFallback(topic));
    } finally {
      setAiWriterLoading(false);
    }
  };

  const handleApplyAiGeneratedNoteToCurrentEntry = () => {
    if (!aiWriterResult) return;
    if (editingDiary) {
      const newTitle = (editingDiary.title && editingDiary.title !== 'يومية جديدة') ? editingDiary.title : aiWriterResult.title;
      const newContent = editingDiary.content ? `${editingDiary.content}\n\n${aiWriterResult.content}` : aiWriterResult.content;
      const updatedEntry: DiaryEntry = {
        ...editingDiary,
        title: newTitle,
        content: newContent
      };

      setEditingDiary(updatedEntry);
      setDiaries(prev => {
        const exists = prev.some(d => d.id === editingDiary.id);
        if (exists) {
          return prev.map(d => d.id === editingDiary.id ? updatedEntry : d);
        } else {
          return [updatedEntry, ...prev];
        }
      });
    } else {
      const newDiary: DiaryEntry = {
        id: `diary-${Date.now()}`,
        title: aiWriterResult.title || `ملاحظة ذكية - ${selectedDate}`,
        content: aiWriterResult.content,
        createdAt: `${selectedDate}T20:00:00.000Z`,
        updatedAt: `${selectedDate}T20:00:00.000Z`,
        moods: ['مرتاح'],
        importance: 3,
        color: 'bg-white border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: [],
        tags: ['ذكاء_اصطناعي'],
        chatLogs: [],
        isLocked: false,
        sleepHours: 8,
        sportsDuration: 0,
        medications: []
      };
      setDiaries(prev => [newDiary, ...prev]);
      setEditingDiary(newDiary);
    }
    setIsNewEntry(false);
    setActiveTab('diaries');
    setShowAiWriterSheet(false);
    setAiWriterResult(null);
    setAiWriterTopicInput('');
  };

  const handleCreateNewDiaryFromAiResult = () => {
    if (!aiWriterResult) return;
    const newDiary: DiaryEntry = {
      id: `diary-${Date.now()}`,
      title: aiWriterResult.title || `ملاحظة ذكية - ${selectedDate}`,
      content: aiWriterResult.content,
      createdAt: `${selectedDate}T20:00:00.000Z`,
      updatedAt: `${selectedDate}T20:00:00.000Z`,
      moods: ['مرتاح'],
      importance: 3,
      color: 'bg-white border-[#E2DCC8]',
      images: [],
      videos: [],
      audioRecordings: [],
      files: [],
      tasks: [],
      tags: ['ذكاء_اصطناعي'],
      chatLogs: [],
      isLocked: false,
      sleepHours: 8,
      sportsDuration: 0,
      medications: []
    };
    setDiaries(prev => [newDiary, ...prev]);
    setEditingDiary(newDiary);
    setIsNewEntry(false);
    setActiveTab('diaries');
    setShowAiWriterSheet(false);
    setAiWriterResult(null);
    setAiWriterTopicInput('');
  };

  const handleCopyAiNote = async () => {
    if (!aiWriterResult) return;
    const fullNoteText = `${aiWriterResult.title}\n\n${aiWriterResult.content}`;
    const ok = await copyTextSafe(fullNoteText);
    if (ok) {
      setCopiedAiText(true);
      showGlobalCopyToast(t.copiedTextSuccess || (settings?.appLanguage === 'ar' ? 'تم نسخ النص بنجاح 📋' : 'Text copied to clipboard!'), 'success');
      setTimeout(() => setCopiedAiText(false), 2000);
    } else {
      showGlobalCopyToast(t.copyFailedToast || (settings?.appLanguage === 'ar' ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy to clipboard'), 'error');
    }
  };

  // --- Rich Text Editor Ref & Visual Formatting Engine ---
  const diaryTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastRecordedHtmlRef = useRef<string>('');

  // Keep editor content in sync with editingDiary state when needed
  useEffect(() => {
    if (editorRef.current && editingDiary) {
      const currentHtml = editorRef.current.innerHTML;
      const targetContent = editingDiary.content || '';
      if (currentHtml !== targetContent) {
        if (document.activeElement !== editorRef.current || !currentHtml) {
          editorRef.current.innerHTML = targetContent;
        }
      }
      if (!lastRecordedHtmlRef.current) {
        lastRecordedHtmlRef.current = targetContent;
      }
    }
  }, [editingDiary?.id, editingDiary?.content]);

  // Record snapshot for custom undo/redo history stack
  const recordUndoSnapshot = (currentHtml?: string) => {
    const htmlToSave = currentHtml !== undefined ? currentHtml : (editorRef.current?.innerHTML || editingDiary?.content || '');
    setUndoStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === htmlToSave) return prev;
      return [...prev.slice(-40), htmlToSave];
    });
    setRedoStack([]);
    lastRecordedHtmlRef.current = htmlToSave;
  };

  const applyRichFormat = (command: string, value: string | null = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      recordUndoSnapshot();
      document.execCommand(command, false, value || undefined);
      const html = editorRef.current.innerHTML;
      setEditingDiary(prev => prev ? { ...prev, content: html } : null);
    } else if (diaryTextareaRef.current && editingDiary) {
      diaryTextareaRef.current.focus();
      document.execCommand(command, false, value || undefined);
    }
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (undoStack.length > 0) {
      const currentHtml = editorRef.current?.innerHTML || editingDiary?.content || '';
      const prevHtml = undoStack[undoStack.length - 1];

      setRedoStack(r => [...r, currentHtml]);
      setUndoStack(u => u.slice(0, -1));

      if (editorRef.current) editorRef.current.innerHTML = prevHtml;
      setEditingDiary(prev => prev ? { ...prev, content: prevHtml } : null);
      lastRecordedHtmlRef.current = prevHtml;
    } else {
      document.execCommand('undo', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        setEditingDiary(prev => prev ? { ...prev, content: html } : null);
      }
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (redoStack.length > 0) {
      const currentHtml = editorRef.current?.innerHTML || editingDiary?.content || '';
      const nextHtml = redoStack[redoStack.length - 1];

      setUndoStack(u => [...u, currentHtml]);
      setRedoStack(r => r.slice(0, -1));

      if (editorRef.current) editorRef.current.innerHTML = nextHtml;
      setEditingDiary(prev => prev ? { ...prev, content: nextHtml } : null);
      lastRecordedHtmlRef.current = nextHtml;
    } else {
      document.execCommand('redo', false);
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        setEditingDiary(prev => prev ? { ...prev, content: html } : null);
      }
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!editingDiary) return;

    if (prefix === '**') {
      applyRichFormat('bold');
      return;
    }
    if (prefix === '*') {
      applyRichFormat('italic');
      return;
    }
    if (prefix === '<u>' || prefix === 'u') {
      applyRichFormat('underline');
      return;
    }
    if (prefix === '~~' || prefix === 's') {
      applyRichFormat('strikeThrough');
      return;
    }
    if (prefix.includes('# ') || prefix === 'h1') {
      applyRichFormat('formatBlock', '<h1>');
      return;
    }
    if (prefix.includes('## ') || prefix === 'h2') {
      applyRichFormat('formatBlock', '<h2>');
      return;
    }
    if (prefix.includes('> ')) {
      applyRichFormat('formatBlock', '<blockquote>');
      return;
    }
    if (prefix.includes('- ') || prefix === '- ') {
      applyRichFormat('insertUnorderedList');
      return;
    }
    if (prefix.includes('1. ') || prefix === '1. ') {
      applyRichFormat('insertOrderedList');
      return;
    }
    if (prefix.includes('style="color:')) {
      const match = prefix.match(/color:(#[0-9a-fA-F]{3,6})/);
      if (match) {
        applyRichFormat('foreColor', match[1]);
        return;
      }
    }

    // Direct HTML insertion fallback
    applyRichFormat('insertHTML', `${prefix}${suffix}`);
  };

  const handleAddTaskItem = () => {
    if (!editingDiary) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      text: '',
      completed: false
    };
    setEditingDiary(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: [...(prev.tasks || []), newTask]
      };
    });
  };

  // --- Diary AI Assistant Inline State ---
  const [diaryAiLoading, setDiaryAiLoading] = useState(false);
  const [diaryAiAnswer, setDiaryAiAnswer] = useState('');

  // --- Diary Attachments Extra State ---
  const [activeInputSection, setActiveInputSection] = useState<'none' | 'link' | 'video' | 'pdf'>('none');
  const [tempVideoUrl, setTempVideoUrl] = useState('');
  const [tempWebUrl, setTempWebUrl] = useState('');

  // Calculate user writing streak in real-time (Memoized)
  const streakInfo = useMemo(() => calculateStreak(diaries), [diaries]);

  // --- Dynamic Greeting Selector ---
  const getArabicGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greetingMorning;
    if (hour < 17) return t.greetingAfternoon;
    return t.greetingEvening;
  };

  const getArabicGreetingHeader = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greetingMorningHeader;
    if (hour < 17) return t.greetingAfternoonHeader;
    return t.greetingEveningHeader;
  };

  const getArabicGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 17) return '☕';
    return '🌙';
  };

  // --- Week Days Array Generator (Cairo Calendar Style) ---
  const getWeekDays = () => {
    const arr = [];
    const today = new Date();
    // Get last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      arr.push({
        label: d.toLocaleDateString((settings?.appLanguage || 'ar') === 'ar' ? 'ar-EG' : (settings?.appLanguage || 'ar'), { weekday: 'short' }),
        dayNum: d.getDate(),
        isoString: d.toISOString().split('T')[0]
      });
    }
    return arr;
  };

  // --- Action triggers for Simulated Notification Drawer & Floating Ball ---
  const handleQuickAction = (actionType: 'new_note' | 'voice' | 'mood' | 'ai' | 'task' | 'photo' | 'notes') => {
    if (actionType === 'new_note') {
      startNewDiary();
    } else if (actionType === 'voice') {
      setShowVoiceVentModal(true);
    } else if (actionType === 'mood') {
      startNewDiary();
      setTimeout(() => {
        document.getElementById('diary-mood-picker')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else if (actionType === 'ai') {
      setActiveTab('advisor');
    } else if (actionType === 'task') {
      startNewDiary();
    } else if (actionType === 'photo') {
      startNewDiary();
      // Programmatically click hidden image upload
      setTimeout(() => {
        document.getElementById('image-upload-trigger')?.click();
      }, 300);
    } else if (actionType === 'notes') {
      setActiveTab('diaries');
    }
  };

  // Consume native lock-screen actions on launch/resume; PINLock executes them only after unlock.
  useEffect(() => {
    const consumeQuickAction = async () => {
      try {
        const result = await SmartReminder.getPendingQuickAction();
        if (result.action) {
          let mappedAction: 'new_note' | 'voice' | 'mood' | 'ai' | null = null;
          if (result.action === 'write') mappedAction = 'new_note';
          else if (result.action === 'voice') mappedAction = 'voice';
          else if (result.action === 'mood') mappedAction = 'mood';
          else if (result.action === 'advisor') mappedAction = 'ai';

          if (mappedAction) {
            const isLocked = (settings.appLockEnabled ?? false) && settings.isAppLocked;
            if (isLocked) {
              setPendingNativeQuickAction(mappedAction);
            } else {
              handleQuickAction(mappedAction);
            }
          }
        }
      } catch {}
    };
    consumeQuickAction();
    const onResume = () => consumeQuickAction();
    window.addEventListener('resume', onResume);
    return () => window.removeEventListener('resume', onResume);
  }, [settings.isAppLocked, settings.appLockEnabled]);

  // --- Initialize blank or default diary entry ---
  const startNewDiary = (initialType: JournalEntryType = 'diary') => {
    const todayStr = new Date().toISOString();
    const newEntry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      title: '',
      content: '',
      createdAt: todayStr,
      updatedAt: todayStr,
      diaryType: initialType,
      isFavorite: false,
      moods: ['طبيعي'],
      importance: 3,
      color: 'bg-white border-[#E2DCC8]',
      images: [],
      videos: [],
      links: [],
      audioRecordings: [],
      files: [],
      tasks: [],
      tags: [],
      chatLogs: [],
      isLocked: false,
      sleepHours: 8,
      sportsDuration: 0,
      medications: [
        { id: 'm1', name: 'مكمل فيتامين D', time: '10:00 ص', taken: false }
      ]
    };
    setEditingDiary(newEntry);
    setIsNewEntry(true);
    setDiaryAiAnswer('');
    setActiveTab('diaries');
  };

  // --- Toggle Favorite for Any Entry (Instant Save) ---
  const toggleFavoriteDiary = (diaryId: string) => {
    setDiaries(prev => {
      const next = prev.map(d => {
        if (d.id === diaryId) {
          const isCurrentlyFav = d.isFavorite === true || (d.isFavorite === undefined && (d.importance || 0) >= 4);
          return { ...d, isFavorite: !isCurrentlyFav };
        }
        return d;
      });
      try {
        localStorage.setItem('yawmiyati_diaries', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // --- Save / Update the Active Diary ---
  // --- Save / Update the Active Diary ---
  const handleSaveDiary = () => {
    if (!editingDiary || isSavingDiaryRef.current) return;
    isSavingDiaryRef.current = true;
    setIsSavingDiary(true);

    const safeTitle = editingDiary.title.trim() || (isAr ? 'مذكرة يومية بدون عنوان' : 'Untitled Diary');

    let updatedEntry: DiaryEntry = {
      ...editingDiary,
      title: safeTitle,
      updatedAt: new Date().toISOString()
    };

    // Add edit addition if provided
    if (newEditAddition.trim()) {
      const additionDate = new Date();
      const formattedTimestamp = additionDate.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ' الساعة ' + additionDate.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

      const newEdit = {
        id: `edit-${Date.now()}`,
        content: newEditAddition.trim(),
        timestamp: formattedTimestamp
      };
      updatedEntry.edits = [...(updatedEntry.edits || []), newEdit];
      updatedEntry.isEdited = true;
    } else if (!isNewEntry) {
      // If it's an existing entry being saved, mark as edited
      updatedEntry.isEdited = true;
    }

    // Atomic synchronous commit to diaries state
    setDiaries(prev => {
      const exists = prev.some(d => d.id === updatedEntry.id);
      const next = (isNewEntry || !exists)
        ? [updatedEntry, ...prev.filter(d => d.id !== updatedEntry.id)]
        : prev.map(d => d.id === updatedEntry.id ? updatedEntry : d);

      // Instant persist to localStorage without waiting for debounce
      try {
        const safeDiaries = sanitizeDiariesForLocalStorage(next);
        localStorage.setItem('yawmiyati_diaries', JSON.stringify(safeDiaries));
        localStorage.removeItem('yawmiyati_draft_editing_diary');
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      return next;
    });

    // Close editor instantly so UI updates in < 5ms without freezing
    setEditingDiary(null);
    setIsNewEntry(false);
    setDiaryAiAnswer('');
    setNewEditAddition('');
    isSavingDiaryRef.current = false;
    setIsSavingDiary(false);

    // Call server API to perform intelligent AI mood analysis in background (navigation-safe)
    if (updatedEntry.title.trim() || updatedEntry.content.trim()) {
      const taskId = `mood-${updatedEntry.id}-${Date.now()}`;
      backgroundAIManager.startTask({
        id: taskId,
        category: 'mood_analysis',
        title: updatedEntry.title || (settings?.appLanguage === 'ar' ? 'تحليل مشاعر المذكرة' : 'Mood Analysis'),
        targetId: updatedEntry.id
      });

      fetch('/api/gemini/analyze-mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({
          title: updatedEntry.title,
          content: updatedEntry.content
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.analysis) && data.analysis.length > 0) {
            const normalizedAnalysis = normalizeMoodDistribution(data.analysis, isAr ? 'ar' : 'en');
            setDiaries(prev => {
              const updated = prev.map(d => d.id === updatedEntry.id ? { ...d, aiMoodAnalysis: normalizedAnalysis } : d);
              try {
                localStorage.setItem('yawmiyati_diaries', JSON.stringify(sanitizeDiariesForLocalStorage(updated)));
              } catch (_) {}
              return updated;
            });
            backgroundAIManager.completeTask(taskId, normalizedAnalysis);
          } else {
            backgroundAIManager.failTask(taskId, data.error || 'No analysis returned');
          }
        })
        .catch(e => {
          console.warn('Background AI mood analysis skipped:', e);
          backgroundAIManager.failTask(taskId, e?.message);
        });
    }
  };

  // --- Export Active Diary Entry to PDF (Fully Client-side & Secure) ---
  const handleExportPDF = async () => {
    if (!editingDiary) return;
    setIsExportingPdf(true);
    try {
      // Small pause to let React cycle and fonts load completely
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById('diary-to-pdf');
      if (!element) {
        throw new Error('PDF template element not found');
      }

      // Convert HTML element to high-DPI canvas
      const canvas = await captureElementToCanvas(element, {
        scale: 2, // 2x zoom for ultra-sharp print resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        windowHeight: 1600,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.width = '800px';
          clonedElement.style.maxWidth = 'none';
          clonedElement.style.margin = '0 auto';
          clonedElement.style.padding = '24px';

          // Ensure SVGs have width and height
          const svgs = clonedElement.querySelectorAll('svg');
          svgs.forEach((svg) => {
            const rect = svg.getBoundingClientRect();
            const width = svg.getAttribute('width') || rect.width || 24;
            const height = svg.getAttribute('height') || rect.height || 24;
            svg.setAttribute('width', `${width}`);
            svg.setAttribute('height', `${height}`);
          });

          const allElements = clonedElement.querySelectorAll('*');
          allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.boxShadow = 'none';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // A4 dimensions in pt are 595.28 x 841.89
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = 595.28;
      const pdfHeight = 841.89;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pageHeight = (canvas.width / pdfWidth) * pdfHeight;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
      heightLeft -= pageHeight;

      // Loop to add subsequent pages if content overflows the A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
        heightLeft -= pageHeight;
      }

      // Clean filename
      const safeTitle = (editingDiary.title || 'diary').trim().slice(0, 30).replace(/[^a-zA-Z0-9آ-ي\s]/g, '');
      const dateStr = new Date(editingDiary.createdAt).toISOString().split('T')[0];
      const fileName = `${safeTitle || 'diary'}_${dateStr}.pdf`;
      const pdfBlob = pdf.output('blob');
      await exportBlobSafe({
        blob: pdfBlob,
        filename: fileName,
        title: editingDiary.title || 'Hayat AI Diary PDF',
        mimeType: 'application/pdf'
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showGlobalCopyToast(t.exportFailed || (isAr ? 'تعذر إنشاء ملف PDF' : 'Could not create the PDF'), 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // --- Delete Diary (Moves to Trash Can) ---
  const handleDeleteDiary = (id: string) => {
    setDiaries(prev => prev.map(d => d.id === id ? { ...d, isTrash: true, deletedAt: new Date().toISOString() } : d));
    if (editingDiary?.id === id) {
      setEditingDiary(null);
    }
  };

  // --- Restore from Trash ---
  const handleRestoreDiary = (id: string) => {
    setDiaries(prev => prev.map(d => d.id === id ? { ...d, isTrash: false, deletedAt: undefined } : d));
  };

  // --- Permanent Delete ---
  const handlePermanentDeleteDiary = (id: string) => {
    if (window.confirm(t.confirmDeletePermanent)) {
      setDiaries(prev => prev.filter(d => d.id !== id));
    }
  };

  // --- Empty Trash ---
  const handleEmptyTrash = () => {
    if (window.confirm(t.confirmEmptyTrash)) {
      setDiaries(prev => prev.filter(d => !d.isTrash));
    }
  };

  // --- Toggle Archive with Toast & Undo Support ---
  const toggleArchiveDiary = (id: string) => {
    const target = diaries.find(d => d.id === id);
    if (!target) return;
    const willBeArchived = !target.isArchived;

    setDiaries(prev => prev.map(d => d.id === id ? { ...d, isArchived: willBeArchived } : d));

    const noteTitle = target.title ? `"${target.title}"` : (target.diaryType === 'thought' ? 'الخاطرة' : 'المذكرة');

    setArchiveToast({
      message: willBeArchived
        ? `تم أرشفة ${noteTitle} بنجاح 📥 ويمكنك العثور عليها في أرشيف الإعدادات`
        : `تم استرجاع ${noteTitle} من الأرشيف بنجاح 📤`,
      diaryId: id,
      action: willBeArchived ? 'archived' : 'unarchived'
    });
  };

  // --- Image File Uploader (Gallery & Camera Photos via IndexedDB) ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const inputEl = e.target;
    const files = Array.from(inputEl?.files || []);
    if (files.length > 0 && editingDiary) {
      const newImages: string[] = [];
      const newImageAttachmentIds: string[] = [];
      try {
        for (const file of files) {
          try {
            // Compress large images safely on offscreen canvas before storing
            const compressed = await compressImageFile(file, 1600, 0.82);
            const attachmentId = `att-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await saveAttachmentBlob(attachmentId, compressed.blob, compressed.mimeType || 'image/jpeg');
            const imageUrl = URL.createObjectURL(compressed.blob);
            newImages.push(imageUrl);
            newImageAttachmentIds.push(attachmentId);
          } catch (fileErr) {
            console.error('[ImageUpload] Error processing file:', file.name, fileErr);
          }
        }

        if (newImages.length > 0) {
          setEditingDiary(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              images: Array.from(new Set([...(prev.images || []), ...newImages])),
              imageAttachmentIds: Array.from(new Set([...(prev.imageAttachmentIds || []), ...newImageAttachmentIds]))
            };
            saveDraftSynchronously(updated);
            setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, images: updated.images, imageAttachmentIds: updated.imageAttachmentIds } : d));
            return updated;
          });
        } else {
          alert(settings?.appLanguage === 'ar' ? 'تعذر قراءة الصور المحددة، يرجى المحاولة مرة أخرى.' : 'Unable to read selected photos. Please try again.');
        }
      } catch (err) {
        alert(settings?.appLanguage === 'ar' ? 'حدث خطأ أثناء حفظ الصورة. تأكد من وجود مساحة كافية.' : 'Error saving photo. Please check available storage.');
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    if (inputEl) inputEl.value = '';
  };

  // --- Safe File Attachment Helper with Native IndexedDB Binary Persistence ---
  const processSelectedFileAttachment = async (file: File): Promise<FileAttachment> => {
    markFilePickerActive();
    try {
      const fileSizeFormatted = file.size > 1048576
        ? `${(file.size / 1048576).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const mime = file.type || 'application/octet-stream';

      // Save raw binary file into IndexedDB for real persistence across reloads & WebViews
      await saveAttachmentBlob(attachmentId, file, mime);

      // Create session Blob ObjectURL for instant UI preview
      const objectUrl = URL.createObjectURL(file);

      return {
        id: fileId,
        name: file.name,
        size: fileSizeFormatted,
        type: mime,
        dataUrl: objectUrl,
        attachmentId
      };
    } catch (err) {
      alert('حدث خطأ أثناء قراءة الملف، يرجى المحاولة مرة أخرى');
      throw err;
    } finally {
      resetFilePickerGuard();
    }
  };

  // --- Dedicated Safe Open / Preview Handler for any File Attachment ---
  const handleOpenAttachment = async (file: FileAttachment) => {
    let url = (file.dataUrl && file.dataUrl !== '#' && !file.dataUrl.startsWith('blob:null')) ? file.dataUrl : '';

    // If no live url or if it is stale, resolve fresh live Object URL directly from IndexedDB
    if ((!url || url === '#') && file.attachmentId) {
      const freshUrl = await getAttachmentObjectUrl(file.attachmentId);
      if (freshUrl) {
        url = freshUrl;
        setEditingDiary(prev => {
          if (!prev) return null;
          return {
            ...prev,
            files: (prev.files || []).map(f => f.id === file.id ? { ...f, dataUrl: freshUrl } : f)
          };
        });
      }
    }

    if (!url || url === '#') {
      alert(t.noValidAudioTranscription || (settings?.appLanguage === 'ar' ? 'تعذر فتح المرفق، الملف غير متوفر في الذاكرة.' : 'Unable to open attachment. File not found in storage.'));
      return;
    }

    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
      setPreviewMedia({ type: 'image', url, name: file.name });
    } else if (type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(name)) {
      setPreviewMedia({ type: 'video', url, name: file.name });
    } else if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) {
      setPreviewMedia({ type: 'audio', url, name: file.name });
    } else if (type.includes('pdf') || name.endsWith('.pdf')) {
      let pdfBlobUrl = url;
      if (file.attachmentId) {
        const rawBlob = await getAttachmentBlob(file.attachmentId);
        if (rawBlob && rawBlob.size > 0) {
          const validPdfBlob = rawBlob.type === 'application/pdf'
            ? rawBlob
            : new Blob([rawBlob], { type: 'application/pdf' });
          pdfBlobUrl = URL.createObjectURL(validPdfBlob);
        }
      }
      setPreviewMedia({ type: 'pdf', url: pdfBlobUrl, name: file.name || 'document.pdf' });
    } else {
      // General document: create safe trigger to open/download in browser
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Dedicated Safe Delete Handler for File Attachment ---
  const handleDeleteFileAttachment = (fileId: string) => {
    setEditingDiary(prev => {
      if (!prev) return null;
      const target = (prev.files || []).find(f => f.id === fileId);
      if (target?.attachmentId) {
        deleteAttachmentBlob(target.attachmentId);
      }
      const updatedFiles = (prev.files || []).filter(f => f.id !== fileId);
      const updatedImages = target?.dataUrl
        ? (prev.images || []).filter(img => img !== target.dataUrl)
        : prev.images;
      const updatedVideos = target?.dataUrl
        ? (prev.videos || []).filter(vid => vid !== target.dataUrl)
        : prev.videos;

      const updated = {
        ...prev,
        files: updatedFiles,
        images: updatedImages,
        videos: updatedVideos
      };
      saveDraftSynchronously(updated);
      return updated;
    });
  };

  // --- Dedicated Safe Open & Preview Handlers for Images and Videos with IndexedDB durability ---
  const handleOpenDiaryImage = async (imgUrl: string, index: number) => {
    let url = (imgUrl && imgUrl !== '#' && !imgUrl.startsWith('blob:null')) ? imgUrl : '';
    const attId = editingDiary?.imageAttachmentIds?.[index];
    if ((!url || url === '#' || url.startsWith('blob:')) && attId) {
      const freshUrl = await getAttachmentObjectUrl(attId);
      if (freshUrl) url = freshUrl;
    }
    if (url && url !== '#') {
      setPreviewMedia({ type: 'image', url, name: settings?.appLanguage === 'ar' ? 'صورة مرفقة' : 'Image' });
    }
  };

  const handleOpenDiaryVideo = async (vidUrl: string, index: number) => {
    let url = (vidUrl && vidUrl !== '#' && !vidUrl.startsWith('blob:null')) ? vidUrl : '';
    const attId = editingDiary?.videoAttachmentIds?.[index];
    if ((!url || url === '#' || url.startsWith('blob:')) && attId) {
      const freshUrl = await getAttachmentObjectUrl(attId);
      if (freshUrl) url = freshUrl;
    }
    if (url && url !== '#') {
      setPreviewMedia({ type: 'video', url, name: settings?.appLanguage === 'ar' ? 'فيديو مرفق' : 'Video' });
    }
  };

  // --- Dedicated Safe Delete Handler for Image ---
  const handleDeleteDiaryImage = (index: number) => {
    setEditingDiary(prev => {
      if (!prev) return null;
      const targetAttId = (prev.imageAttachmentIds || [])[index];
      if (targetAttId) {
        deleteAttachmentBlob(targetAttId);
      }
      const targetUrl = (prev.images || [])[index];
      const targetFile = (prev.files || []).find(f => f.dataUrl === targetUrl);
      if (targetFile?.attachmentId) {
        deleteAttachmentBlob(targetFile.attachmentId);
      }
      const updatedImages = (prev.images || []).filter((_, i) => i !== index);
      const updatedImageAttIds = (prev.imageAttachmentIds || []).filter((_, i) => i !== index);
      const updatedFiles = targetUrl
        ? (prev.files || []).filter(f => f.dataUrl !== targetUrl)
        : prev.files;

      const updated = {
        ...prev,
        images: updatedImages,
        imageAttachmentIds: updatedImageAttIds,
        files: updatedFiles
      };
      saveDraftSynchronously(updated);
      setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, images: updated.images, imageAttachmentIds: updated.imageAttachmentIds, files: updated.files } : d));
      return updated;
    });
  };

  // --- Dedicated Safe Delete Handler for Video ---
  const handleDeleteDiaryVideo = (index: number) => {
    setEditingDiary(prev => {
      if (!prev) return null;
      const targetAttId = (prev.videoAttachmentIds || [])[index];
      if (targetAttId) {
        deleteAttachmentBlob(targetAttId);
      }
      const targetUrl = (prev.videos || [])[index];
      const targetFile = (prev.files || []).find(f => f.dataUrl === targetUrl);
      if (targetFile?.attachmentId) {
        deleteAttachmentBlob(targetFile.attachmentId);
      }
      const updatedVideos = (prev.videos || []).filter((_, i) => i !== index);
      const updatedVideoAttIds = (prev.videoAttachmentIds || []).filter((_, i) => i !== index);
      const updatedFiles = targetUrl
        ? (prev.files || []).filter(f => f.dataUrl !== targetUrl)
        : prev.files;

      const updated = {
        ...prev,
        videos: updatedVideos,
        videoAttachmentIds: updatedVideoAttIds,
        files: updatedFiles
      };
      saveDraftSynchronously(updated);
      setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, videos: updated.videos, videoAttachmentIds: updated.videoAttachmentIds, files: updated.files } : d));
      return updated;
    });
  };

  // --- Dedicated Safe Delete Handler for Audio Recording ---
  const handleDeleteAudioRecording = (recId: string) => {
    setEditingDiary(prev => {
      if (!prev) return null;
      const targetRec = (prev.audioRecordings || []).find(r => r.id === recId);
      if (targetRec?.attachmentId) {
        deleteAttachmentBlob(targetRec.attachmentId);
      }
      const updatedAudio = (prev.audioRecordings || []).filter(r => r.id !== recId);
      const updated = {
        ...prev,
        audioRecordings: updatedAudio
      };
      saveDraftSynchronously(updated);
      return updated;
    });
  };

  // --- Universal Document / File Uploader ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && editingDiary) {
      const newFiles: FileAttachment[] = [];
      const newImages: string[] = [];
      const newImageAttachmentIds: string[] = [];
      const newVideos: string[] = [];
      const newVideoAttachmentIds: string[] = [];
      const audioFilesToTranscribe: File[] = [];
      try {
        for (const file of files) {
          const name = (file.name || '').toLowerCase();
          const type = (file.type || '').toLowerCase();
          if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(name)) {
            audioFilesToTranscribe.push(file);
          } else if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
            const attachmentId = `att-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await saveAttachmentBlob(attachmentId, file, file.type || 'image/png');
            newImages.push(URL.createObjectURL(file));
            newImageAttachmentIds.push(attachmentId);
          } else if (type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(name)) {
            const attachmentId = `att-vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await saveAttachmentBlob(attachmentId, file, file.type || 'video/mp4');
            newVideos.push(URL.createObjectURL(file));
            newVideoAttachmentIds.push(attachmentId);
          } else {
            const newFile = await processSelectedFileAttachment(file);
            newFiles.push(newFile);
          }
        }
        setEditingDiary(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            files: [...(prev.files || []), ...newFiles],
            images: Array.from(new Set([...(prev.images || []), ...newImages])),
            imageAttachmentIds: Array.from(new Set([...(prev.imageAttachmentIds || []), ...newImageAttachmentIds])),
            videos: Array.from(new Set([...(prev.videos || []), ...newVideos])),
            videoAttachmentIds: Array.from(new Set([...(prev.videoAttachmentIds || []), ...newVideoAttachmentIds]))
          };
          saveDraftSynchronously(updated);
          return updated;
        });
        if (audioFilesToTranscribe.length > 0) {
          await processAudioFilesBatch(audioFilesToTranscribe);
        }
        setActiveInputSection('none');
      } catch (err) {
        console.error(err);
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    e.target.value = '';
  };

  // --- Video File Uploader (Gallery & Camera Videos via IndexedDB) ---
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const inputEl = e.target;
    const files = Array.from(inputEl?.files || []);
    if (files.length > 0 && editingDiary) {
      const newVideos: string[] = [];
      const newVideoAttachmentIds: string[] = [];
      try {
        for (const file of files) {
          if (file.size > 200 * 1024 * 1024) continue;
          const attachmentId = `att-vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await saveAttachmentBlob(attachmentId, file, file.type || 'video/mp4');
          const videoBlobUrl = URL.createObjectURL(file);
          newVideos.push(videoBlobUrl);
          newVideoAttachmentIds.push(attachmentId);
        }

        if (newVideos.length > 0) {
          setEditingDiary(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              videos: Array.from(new Set([...(prev.videos || []), ...newVideos])),
              videoAttachmentIds: Array.from(new Set([...(prev.videoAttachmentIds || []), ...newVideoAttachmentIds]))
            };
            saveDraftSynchronously(updated);
            setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, videos: updated.videos, videoAttachmentIds: updated.videoAttachmentIds } : d));
            return updated;
          });
          setActiveInputSection('none');
        } else {
          alert(settings?.appLanguage === 'ar' ? 'تعذر قراءة ملف الفيديو المحدد.' : 'Unable to read selected video.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    if (inputEl) inputEl.value = '';
  };

  // --- Helper to Find or Create Today's / Selected Date's Diary for Dashboard Uploads ---
  const getOrCreateDiaryForUpload = (): DiaryEntry => {
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    let diary = diaries.find(d => d.createdAt.split('T')[0] === targetDate && !d.isTrash);
    if (!diary) {
      const todayStr = new Date().toISOString();
      diary = {
        id: `diary-${Date.now()}`,
        title: `مذكرة يومية لـ ${targetDate}`,
        content: '',
        createdAt: targetDate + 'T20:00:00.000Z',
        updatedAt: todayStr,
        diaryType: 'diary',
        moods: ['طبيعي'],
        importance: 3,
        color: 'bg-white border-[#E2DCC8]',
        images: [],
        videos: [],
        links: [],
        audioRecordings: [],
        files: [],
        tasks: [],
        tags: [],
        chatLogs: [],
        isLocked: false,
        sleepHours: 8,
        sportsDuration: 0,
        medications: [
          { id: 'm1', name: 'مكمل فيتامين D', time: '10:00 ص', taken: false }
        ]
      };
      setDiaries(prev => [diary!, ...prev]);
    }
    return diary;
  };

  // --- Global File Upload Handlers (for direct Dashboard access) ---
  const handleGlobalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const inputEl = e.target;
    const files = Array.from(inputEl?.files || []);
    if (files.length > 0) {
      const newImages: string[] = [];
      const newImageAttachmentIds: string[] = [];
      try {
        for (const file of files) {
          try {
            const compressed = await compressImageFile(file, 1600, 0.82);
            const attachmentId = `att-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await saveAttachmentBlob(attachmentId, compressed.blob, compressed.mimeType || 'image/jpeg');
            const imageUrl = URL.createObjectURL(compressed.blob);
            newImages.push(imageUrl);
            newImageAttachmentIds.push(attachmentId);
          } catch (fileErr) {
            console.error('[GlobalImageUpload] Error:', fileErr);
          }
        }
        if (newImages.length > 0) {
          const diary = getOrCreateDiaryForUpload();
          const fullEntry = {
            ...diary,
            images: [...(diary.images || []), ...newImages],
            imageAttachmentIds: [...(diary.imageAttachmentIds || []), ...newImageAttachmentIds]
          };
          setDiaries(prev => prev.map(d => d.id === diary.id ? fullEntry : d));
          setEditingDiary(fullEntry);
          setIsNewEntry(false);
          setActiveTab('diaries');
        }
      } catch (err) {
        console.error(err);
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    if (inputEl) inputEl.value = '';
  };

  const handleGlobalVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const inputEl = e.target;
    const files = Array.from(inputEl?.files || []);
    if (files.length > 0) {
      const newVideos = [];
      const newVideoAttachmentIds: string[] = [];
      try {
        for (const file of files) {
          if (file.size > 200 * 1024 * 1024) continue;
          const attachmentId = `att-vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await saveAttachmentBlob(attachmentId, file, file.type || 'video/mp4');
          const videoBlobUrl = URL.createObjectURL(file);
          newVideos.push(videoBlobUrl);
          newVideoAttachmentIds.push(attachmentId);
        }
        if (newVideos.length > 0) {
          const diary = getOrCreateDiaryForUpload();
          const fullEntry = {
            ...diary,
            videos: [...(diary.videos || []), ...newVideos],
            videoAttachmentIds: [...(diary.videoAttachmentIds || []), ...newVideoAttachmentIds]
          };
          setDiaries(prev => prev.map(d => d.id === diary.id ? fullEntry : d));
          setEditingDiary(fullEntry);
          setIsNewEntry(false);
          setActiveTab('diaries');
        }
      } catch (err) {
        console.error(err);
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    if (inputEl) inputEl.value = '';
  };

  const handleGlobalAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const rawFiles = Array.from(e.target.files || []);
    const files = rawFiles.filter(file => {
      const type = (file.type || '').toLowerCase();
      const name = (file.name || '').toLowerCase();
      return type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|flac|webm|opus|amr|3ga|wma|mid)$/i.test(name);
    });
    if (files.length > 0) {
      const newRecordings = [];
      try {
        for (const file of files) {
          const attachmentId = `att-audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await saveAttachmentBlob(attachmentId, file, file.type || 'audio/mp3');
          const audioUrl = URL.createObjectURL(file);
          newRecordings.push({
            id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dataUrl: audioUrl,
            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            duration: 0,
            attachmentId
          });
        }
        const diary = getOrCreateDiaryForUpload();
        const fullEntry = {
          ...diary,
          audioRecordings: [...(diary.audioRecordings || []), ...newRecordings]
        };
        setDiaries(prev => prev.map(d => d.id === diary.id ? fullEntry : d));
        setEditingDiary(fullEntry);
        setIsNewEntry(false);
        setActiveTab('diaries');
      } catch (err) {
        console.error(err);
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    e.target.value = '';
  };

  const handleGlobalDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      try {
        const newFiles = [];
        for (const file of files) {
          newFiles.push(await processSelectedFileAttachment(file));
        }
        const diary = getOrCreateDiaryForUpload();
        const fullEntry = {
          ...diary,
          files: [...(diary.files || []), ...newFiles]
        };
        setDiaries(prev => prev.map(d => d.id === diary.id ? fullEntry : d));
        setEditingDiary(fullEntry);
        setIsNewEntry(false);
        setActiveTab('diaries');
      } catch (err) {
        console.error(err);
      } finally {
        resetFilePickerGuard();
      }
    } else {
      resetFilePickerGuard();
    }
    e.target.value = '';
  };

  // --- Web Link / URL Adder ---
  const handleAddWebLink = (url: string) => {
    if (!url.trim() || !editingDiary) return;
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setEditingDiary(prev => {
      if (!prev) return null;
      return {
        ...prev,
        links: [...(prev.links || []), formattedUrl]
      };
    });
    setTempWebUrl('');
    setActiveInputSection('none');
  };

  // --- Video Link / URL Adder ---
  const handleAddVideoLink = (url: string) => {
    if (!url.trim() || !editingDiary) return;
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    setEditingDiary(prev => {
      if (!prev) return null;
      return {
        ...prev,
        videos: [...(prev.videos || []), formattedUrl]
      };
    });
    setTempVideoUrl('');
    setActiveInputSection('none');
  };

  // --- Speech Emotion Recognition (SER) Helper Styles & Toggles ---
  const getSpeechEmotionStyles = (speechEmotion?: AudioRecording['speechEmotion']) => {
    if (!speechEmotion) {
      return {
        containerBg: 'bg-white/95 border-[#E2DCC8]',
        textColor: 'text-[#2B3E50]',
        badgeBg: 'bg-stone-100/90 text-stone-800 border-stone-200',
        emoji: '🎙️',
        emotionText: 'تحليل نبرة طبيعية',
        headerText: 'التفريغ النصي التلقائي للصوت'
      };
    }

    const emotion = speechEmotion.primaryEmotion || 'طبيعي';
    const colorKey = speechEmotion.recommendedColor || '';

    if (emotion.includes('قلق') || emotion.includes('توتر') || colorKey === 'amber') {
      return {
        containerBg: 'bg-gradient-to-br from-amber-100/90 via-orange-50/90 to-amber-50 border-amber-300 text-amber-950 shadow-xs',
        textColor: 'text-amber-950 font-medium',
        badgeBg: 'bg-amber-200 text-amber-900 border-amber-400 font-black',
        emoji: '😰',
        emotionText: `نبرة قلق وتوتر (${speechEmotion.intensityScore || 75}%)`,
        headerText: 'تفريغ صوتي بصبغة نبرة القلق'
      };
    }

    if (emotion.includes('فرح') || emotion.includes('سعادة') || emotion.includes('حماس') || colorKey === 'emerald') {
      return {
        containerBg: 'bg-gradient-to-br from-emerald-100/90 via-teal-50/90 to-emerald-50 border-emerald-300 text-emerald-950 shadow-xs',
        textColor: 'text-emerald-950 font-medium',
        badgeBg: 'bg-emerald-200 text-emerald-900 border-emerald-400 font-black',
        emoji: '🎉',
        emotionText: `نبرة فرح وسعادة (${speechEmotion.intensityScore || 85}%)`,
        headerText: 'تفريغ صوتي بصبغة نبرة الفرح'
      };
    }

    if (emotion.includes('حزن') || emotion.includes('إحباط') || emotion.includes('ضيق') || colorKey === 'blue') {
      return {
        containerBg: 'bg-gradient-to-br from-blue-100/90 via-sky-50/90 to-blue-50 border-blue-300 text-blue-950 shadow-xs',
        textColor: 'text-blue-950 font-medium',
        badgeBg: 'bg-blue-200 text-blue-900 border-blue-400 font-black',
        emoji: '😔',
        emotionText: `نبرة حزن وهدوء (${speechEmotion.intensityScore || 70}%)`,
        headerText: 'تفريغ صوتي بصبغة نبرة الحزن'
      };
    }

    if (emotion.includes('غضب') || emotion.includes('انفعال') || colorKey === 'red') {
      return {
        containerBg: 'bg-gradient-to-br from-red-100/90 via-rose-50/90 to-red-50 border-red-300 text-red-950 shadow-xs',
        textColor: 'text-red-950 font-medium',
        badgeBg: 'bg-red-200 text-red-900 border-red-400 font-black',
        emoji: '😡',
        emotionText: `نبرة غضب وانفعال (${speechEmotion.intensityScore || 80}%)`,
        headerText: 'تفريغ صوتي بصبغة نبرة الغضب'
      };
    }

    if (emotion.includes('هدوء') || emotion.includes('سكينة') || emotion.includes('اطمئنان') || colorKey === 'teal') {
      return {
        containerBg: 'bg-gradient-to-br from-teal-100/90 via-emerald-50/90 to-teal-50 border-teal-300 text-teal-950 shadow-xs',
        textColor: 'text-teal-950 font-medium',
        badgeBg: 'bg-teal-200 text-teal-900 border-teal-400 font-black',
        emoji: '🧘',
        emotionText: `نبرة هدوء واطمئنان (${speechEmotion.intensityScore || 60}%)`,
        headerText: 'تفريغ صوتي بصبغة نبرة الهدوء'
      };
    }

    return {
      containerBg: 'bg-gradient-to-br from-stone-100/90 to-neutral-50 border-stone-300 text-stone-900 shadow-xs',
      textColor: 'text-stone-900 font-medium',
      badgeBg: 'bg-stone-200 text-stone-800 border-stone-300 font-black',
      emoji: '🎙️',
      emotionText: `نبرة ${emotion} (${speechEmotion.intensityScore || 50}%)`,
      headerText: 'تفريغ صوتي متوازن'
    };
  };

  const handleSetSpeechEmotion = (recId: string, primaryEmotion: string, colorKey: string) => {
    const scores: Record<string, number> = {
      'قلق': 80,
      'فرح': 88,
      'حزن': 72,
      'غضب': 85,
      'هدوء': 65,
      'طبيعي': 50
    };
    const newEmotion = {
      primaryEmotion,
      intensity: 'عالية',
      intensityScore: scores[primaryEmotion] || 70,
      vocalToneDetails: `تم تحديد صبغة خلفية المشاعر (${primaryEmotion}) يدويّاً للتعبير عن حالة النص.`,
      recommendedColor: colorKey
    };
    setEditingDiary(prev => {
      if (!prev) return null;
      return {
        ...prev,
        audioRecordings: (prev.audioRecordings || []).map(r => r.id === recId ? { ...r, speechEmotion: newEmotion } : r)
      };
    });
  };

  // --- Atomic Audio Helpers to Prevent State Race-Conditions and Blank Screens ---
  const addAudioToDiaryAtomic = (newRec: AudioRecording) => {
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    let targetDiaryId = editingDiary ? editingDiary.id : '';

    setEditingDiary(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        audioRecordings: [...(prev.audioRecordings || []), newRec]
      };
      saveDraftSynchronously(updated);
      return updated;
    });

    setDiaries(prev => {
      const existingIdx = prev.findIndex(d => targetDiaryId ? d.id === targetDiaryId : (d.createdAt.split('T')[0] === targetDate && !d.isTrash));

      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          audioRecordings: [...(copy[existingIdx].audioRecordings || []), newRec]
        };
        return copy;
      } else {
        const todayStr = new Date().toISOString();
        const newDiary: DiaryEntry = {
          id: `diary-${Date.now()}`,
          title: `مذكرة يومية لـ ${targetDate}`,
          content: '',
          createdAt: targetDate + 'T20:00:00.000Z',
          updatedAt: todayStr,
          diaryType: 'diary',
          moods: ['طبيعي'],
          importance: 3,
          color: 'bg-white border-[#E2DCC8]',
          images: [],
          videos: [],
          links: [],
          audioRecordings: [newRec],
          files: [],
          tasks: [],
          tags: [],
          chatLogs: [],
          isLocked: false,
          sleepHours: 8,
          sportsDuration: 0,
          medications: []
        };
        setEditingDiary(prev => prev || newDiary);
        return [newDiary, ...prev];
      }
    });
  };

  const updateAudioTranscriptionAtomic = (recId: string, transcription: string, speechEmotion?: any) => {
    setDiaries(prev => prev.map(d => ({
      ...d,
      audioRecordings: (d.audioRecordings || []).map(r => r.id === recId ? {
        ...r,
        transcription: transcription,
        speechEmotion: speechEmotion || r.speechEmotion
      } : r)
    })));

    setEditingDiary(prev => {
      if (!prev) return null;
      return {
        ...prev,
        audioRecordings: (prev.audioRecordings || []).map(r => r.id === recId ? {
          ...r,
          transcription: transcription,
          speechEmotion: speechEmotion || r.speechEmotion
        } : r)
      };
    });
  };

  // --- Core Automatic Audio Processor (AI Speech Transcription & SER) ---
  const processAudioRecordingOrFile = async ({
    dataUrl,
    blobUrl,
    mimeType,
    fileName,
    duration,
    liveSpeechText,
    attachmentId: inputAttachmentId
  }: {
    dataUrl: string;
    blobUrl?: string;
    mimeType: string;
    fileName: string;
    duration: number;
    liveSpeechText?: string;
    attachmentId?: string;
  }) => {
    const newRecId = `rec-${Date.now()}`;
    const attachmentId = inputAttachmentId || `att-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const validDataUrl = (dataUrl && dataUrl !== '#' && dataUrl.length > 5)
      ? dataUrl
      : (blobUrl && blobUrl !== '#' ? blobUrl : '#');

    // Save audio binary blob to IndexedDB for persistent reload
    if (validDataUrl && validDataUrl !== '#') {
      await saveAttachmentBlob(attachmentId, validDataUrl, mimeType || 'audio/webm');
    }

    const cleanLiveSpeech = (liveSpeechText && liveSpeechText.trim() && !liveSpeechText.includes('تم التسجيل بنجاح')) ? liveSpeechText.trim() : '';
    const initialTranscription = cleanLiveSpeech || '⏳ جاري التفريغ النصي بذكاء Gemini...';

    const newRec: AudioRecording = {
      id: newRecId,
      name: fileName || `${t.audioRecording} ${new Date().toLocaleTimeString(langInfo?.bcp47 || (settings?.appLanguage === 'ar' ? 'ar-SA' : 'en-US'), { hour: '2-digit', minute: '2-digit' })}.webm`,
      dataUrl: validDataUrl,
      blobUrl: blobUrl || (validDataUrl.startsWith('blob:') ? validDataUrl : undefined),
      duration: duration || 5,
      transcription: initialTranscription,
      attachmentId
    };

    addAudioToDiaryAtomic(newRec);
    setIsNewEntry(false);
    setActiveTab('diaries');

    setTranscribingAudioId(newRecId);

    try {
      const rawAudio = validDataUrl !== '#' ? validDataUrl : (blobUrl || '#');
      const payloadAudio = await convertAudioTargetToBase64(rawAudio);

      const res = await fetch('/api/gemini/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({
          audioData: payloadAudio,
          mimeType: (mimeType || 'audio/webm').split(';')[0].trim(),
          fileName: fileName
        })
      });

      const data = await res.json();
      let finalTranscript = '';

      if (data.success && data.transcription && !data.transcription.includes('وضع المعالجة الصوتية') && !data.transcription.includes('مفقود')) {
        finalTranscript = data.transcription;
      } else if (cleanLiveSpeech) {
        finalTranscript = cleanLiveSpeech;
      } else if (data.transcription && !data.transcription.includes('وضع المعالجة الصوتية')) {
        finalTranscript = data.transcription;
      } else {
        finalTranscript = cleanLiveSpeech || 'عذراً، تعذر التفريغ النصي تلقائياً. يرجى التحقق من مفتاح API.';
      }

      updateAudioTranscriptionAtomic(newRecId, finalTranscript, data.speechEmotion);
    } catch (err) {
      console.warn("Audio transcription error:", err);
      const fallbackText = cleanLiveSpeech || 'عذراً، تعذر التفريغ النصي تلقائياً. يرجى التحقق من مفتاح API.';
      updateAudioTranscriptionAtomic(newRecId, fallbackText);
    } finally {
      setTranscribingAudioId(null);
    }
  };

  // --- Helper to accurately detect standard audio MIME types ---
  const detectAudioMimeType = (filename?: string, providedType?: string): string => {
    const ext = (filename || '').split('.').pop()?.toLowerCase();
    if (ext === 'mp3') return 'audio/mp3';
    if (ext === 'm4a' || ext === 'aac') return 'audio/mp4';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'webm') return 'audio/webm';
    if (ext === '3gp' || ext === 'amr') return 'audio/3gpp';
    if (providedType && providedType.startsWith('audio/')) {
      const clean = providedType.split(';')[0].trim().toLowerCase();
      if (clean.includes('mpeg') || clean.includes('mp3')) return 'audio/mp3';
      if (clean.includes('mp4') || clean.includes('m4a') || clean.includes('aac')) return 'audio/mp4';
      if (clean.includes('wav')) return 'audio/wav';
      if (clean.includes('ogg')) return 'audio/ogg';
      if (clean.includes('flac')) return 'audio/flac';
      if (clean.includes('webm')) return 'audio/webm';
      return clean;
    }
    return 'audio/mp3';
  };

  // --- Helper to reliably read any Blob/File to Base64 data URL ---
  const readBlobAsDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to convert audio Blob to Data URL'));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- Helper to ensure audio Payload is converted from blob: URL to Base64 ---
  const convertAudioTargetToBase64 = async (audioPayload: string): Promise<string> => {
    if (!audioPayload || audioPayload === '#') return '';
    if (audioPayload.startsWith('data:')) return audioPayload;
    if (audioPayload.startsWith('blob:')) {
      try {
        const res = await fetch(audioPayload);
        const blob = await res.blob();
        return readBlobAsDataUrl(blob);
      } catch (err) {
        console.error('[AudioBase64] Exception fetching blob URL:', err);
        return '';
      }
    }
    return audioPayload;
  };

  // --- Transcribe Audio Item manually using Unified Key-Pooled Pipeline ---
  const handleTranscribeAudioItem = async (rec: AudioRecording) => {
    let rawAudio = (rec.dataUrl && rec.dataUrl !== '#') ? rec.dataUrl : rec.blobUrl;
    let audioBlob: Blob | null = null;

    if (rec.attachmentId) {
      try {
        const storedBlob = await getAttachmentBlob(rec.attachmentId);
        if (storedBlob && storedBlob.size > 0) {
          audioBlob = storedBlob;
          if (!rawAudio || rawAudio === '#' || rawAudio.startsWith('blob:')) {
            rawAudio = URL.createObjectURL(storedBlob);
          }
        }
      } catch (e) {
        console.warn('Could not fetch audio blob from attachmentId:', e);
      }
    }

    if (!rawAudio && !audioBlob) {
      alert(t.noValidAudioTranscription || (settings?.appLanguage === 'ar' ? 'الملف الصوتي غير متوفر في الذاكرة.' : 'Audio file not found in storage.'));
      return;
    }

    setTranscribingAudioId(rec.id);
    updateAudioTranscriptionAtomic(rec.id, '⏳ جاري التفريغ النصي بذكاء Gemini...');
    const taskId = `transcribe-${rec.id}-${Date.now()}`;
    backgroundAIManager.startTask({
      id: taskId,
      category: 'voice_transcription',
      title: rec.name ? `تفريغ: ${rec.name}` : (settings?.appLanguage === 'ar' ? 'تفريغ تسجيل صوتي' : 'Voice Transcription'),
      targetId: rec.id
    });
    try {
      if (!audioBlob && rawAudio) {
        if (rawAudio.startsWith('blob:')) {
          const fetchRes = await fetch(rawAudio);
          audioBlob = await fetchRes.blob();
        } else if (rawAudio.startsWith('data:')) {
          const parts = rawAudio.split(';base64,');
          if (parts.length === 2) {
            const byteChars = atob(parts[1]);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            audioBlob = new Blob([byteArray], { type: rec.mimeType || 'audio/mp3' });
          }
        }
      }

      if (!audioBlob || audioBlob.size === 0) {
        const emptyMsg = settings?.appLanguage === 'ar' ? 'الملف الصوتي فارغ أو تعذر قراءته.' : 'Audio file is empty or could not be read.';
        updateAudioTranscriptionAtomic(rec.id, emptyMsg);
        backgroundAIManager.failTask(taskId, emptyMsg);
        return;
      }

      if (audioBlob.size > 22 * 1024 * 1024) {
        const sizeMsg = t.transcriptionFailedSize || (settings?.appLanguage === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت).' : 'Audio file exceeds the maximum 20MB limit.');
        updateAudioTranscriptionAtomic(rec.id, sizeMsg);
        backgroundAIManager.failTask(taskId, sizeMsg);
        return;
      }

      const mimeType = detectAudioMimeType(rec.name, audioBlob.type || rec.mimeType);
      const audioData = await readBlobAsDataUrl(audioBlob);

      const res = await fetch('/api/gemini/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || '',
          'x-app-language': settings.appLanguage || 'ar'
        },
        body: JSON.stringify({
          audioData,
          mimeType,
          fileName: rec.name,
          appLanguage: settings?.appLanguage || 'ar'
        })
      });

      const data = await res.json();
      if (data.success && data.transcription && !data.transcription.includes('وضع المعالجة الصوتية')) {
        updateAudioTranscriptionAtomic(rec.id, data.transcription, data.speechEmotion);
        backgroundAIManager.completeTask(taskId, data.transcription);
      } else {
        const errorMsg = data.error || data.message || (t.aiTranscriptionUnavailable || (settings?.appLanguage === 'ar' ? 'تعذر تفريغ هذا الملف الصوتي، يرجى المحاولة لاحقاً.' : 'Could not transcribe this audio file.'));
        updateAudioTranscriptionAtomic(rec.id, errorMsg);
        backgroundAIManager.failTask(taskId, errorMsg);
      }
    } catch (err: any) {
      console.warn('Transcribe error:', err);
      const errorMsg = err?.message || (t.aiTranscriptionUnavailable || (settings?.appLanguage === 'ar' ? 'تعذر تفريغ هذا الملف الصوتي، يرجى المحاولة لاحقاً.' : 'Could not transcribe this audio file.'));
      updateAudioTranscriptionAtomic(rec.id, errorMsg);
      backgroundAIManager.failTask(taskId, errorMsg);
    } finally {
      setTranscribingAudioId(null);
    }
  };

  // --- Append AI Transcript directly into Diary Writing Area (Attachment-Scoped Deduplication) ---
  const handleAppendTranscriptToContent = (rec: AudioRecording) => {
    if (!rec || !rec.transcription) return;
    const cleanText = rec.transcription.trim();
    if (!cleanText || cleanText.includes('جاري تفريغ') || cleanText.includes('جاري التفريغ') || cleanText.includes('انقر على زر')) return;

    setEditingDiary(prev => {
      if (!prev) return null;

      // Check if this exact audio attachment was already appended
      const currentRec = prev.audioRecordings?.find(r => r.id === rec.id || (rec.attachmentId && r.attachmentId === rec.attachmentId));
      if (currentRec && currentRec.isAppendedToContent) {
        return prev;
      }

      const separator = prev.content && prev.content.trim() ? '\n\n' : '';
      const addition = `${separator}🎙️ [تفريغ صوتي - ${rec.name}]:\n${cleanText}`;
      const updatedContent = (prev.content || '') + addition;

      const updatedAudioRecordings = (prev.audioRecordings || []).map(r => {
        if (r.id === rec.id || (rec.attachmentId && r.attachmentId === rec.attachmentId)) {
          return { ...r, isAppendedToContent: true };
        }
        return r;
      });

      setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, content: updatedContent, audioRecordings: updatedAudioRecordings } : d));
      return { ...prev, content: updatedContent, audioRecordings: updatedAudioRecordings };
    });
  };

  // --- Batch Audio Processing & Automatic AI Transcription Helper ---
  const processAudioFilesBatch = async (files: File[]) => {
    setAudioUploadLoading(true);
    try {
      for (const file of files) {
        const detectedMime = detectAudioMimeType(file.name, file.type);
        const newRecId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const attachmentId = `att-audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await saveAttachmentBlob(attachmentId, file, detectedMime);
        const audioUrl = URL.createObjectURL(file);

        const newRec: AudioRecording = {
          id: newRecId,
          name: file.name || t.audioLink || 'Audio',
          dataUrl: audioUrl,
          blobUrl: audioUrl,
          duration: Math.round(file.size / 16000) || 15,
          transcription: '⏳ جاري التفريغ بالذكاء الاصطناعي...',
          attachmentId,
          mimeType: detectedMime
        };

        addAudioToDiaryAtomic(newRec);
        setTranscribingAudioId(newRecId);

        if (file.size > 22 * 1024 * 1024) {
          updateAudioTranscriptionAtomic(newRecId, t.transcriptionFailedSize || (settings?.appLanguage === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت).' : 'File is too large.'));
          continue;
        }

        const base64Audio = await readBlobAsDataUrl(file);

        try {
          const res = await fetch('/api/gemini/transcribe-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-gemini-key': settings.userApiKey || '',
              'x-app-language': settings.appLanguage || 'ar'
            },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: detectedMime,
              fileName: file.name,
              appLanguage: settings?.appLanguage || 'ar'
            })
          });

          const data = await res.json();
          if (data.success && data.transcription && !data.transcription.includes('لا يمكن تحديد') && !data.transcription.includes('فارغ')) {
            const finalTrans = data.transcription.trim();
            updateAudioTranscriptionAtomic(newRecId, finalTrans, data.speechEmotion);
          } else {
            const errorMsg = data.error || data.message || (t.aiTranscriptionUnavailable || (settings?.appLanguage === 'ar' ? 'تعذر تفريغ هذا الملف الصوتي، يرجى المحاولة لاحقاً.' : 'Could not transcribe audio.'));
            updateAudioTranscriptionAtomic(newRecId, errorMsg);
          }
        } catch (err: any) {
          const errorMsg = err?.message || (t.aiTranscriptionUnavailable || (settings?.appLanguage === 'ar' ? 'تعذر تفريغ هذا الملف الصوتي، يرجى المحاولة لاحقاً.' : 'Could not transcribe audio.'));
          updateAudioTranscriptionAtomic(newRecId, errorMsg);
        }
      }
    } catch (err) {
      console.error('Audio upload error:', err);
    } finally {
      setAudioUploadLoading(false);
      setTranscribingAudioId(null);
    }
  };

  // --- Audio File Uploader (من جهاز المستخدم) مع تفريغ الذكاء الاصطناعي الفوري المستقل ---
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    markFilePickerActive();
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) {
      resetFilePickerGuard();
      return;
    }

    // Filter strictly for audio files (defense in depth in case system returned non-audio)
    const audioFiles = rawFiles.filter(file => {
      const type = (file.type || '').toLowerCase();
      const name = (file.name || '').toLowerCase();
      return type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|flac|webm|opus|amr|3ga|wma|mid)$/i.test(name);
    });

    if (audioFiles.length === 0) {
      resetFilePickerGuard();
      e.target.value = '';
      return;
    }

    try {
      await processAudioFilesBatch(audioFiles);
    } finally {
      setActiveInputSection('none');
      resetFilePickerGuard();
      e.target.value = '';
    }
  };

  // --- Audio File Picker Click (يستخدم File System Access API عند توفره لإجبار منتقي الصوتيات) ---
  const handleAudioPickerClick = async (e: React.MouseEvent) => {
    markFilePickerActive();
    if ('showOpenFilePicker' in window) {
      e.preventDefault();
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'ملفات صوتية',
              accept: {
                'audio/*': ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.opus', '.flac']
              }
            }
          ],
          multiple: false
        });
        if (fileHandle) {
          const file = await fileHandle.getFile();
          if (file) {
            try {
              await processAudioFilesBatch([file]);
            } finally {
              setActiveInputSection('none');
              resetFilePickerGuard();
            }
            return;
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          resetFilePickerGuard();
          return; // User cancelled
        }
        // Fallback to standard input click below if API is restricted
        const input = document.getElementById('audio-file-input') as HTMLInputElement | null;
        if (input) {
          input.click();
        }
      }
    }
  };

  // --- Universal Generic File Attachment Handler (Multi-file, Auto-categorizing) ---
  const handleGenericFileUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !editingDiary) return;
    markFilePickerActive();
    try {
      const newFiles: FileAttachment[] = [];
      const newImages: string[] = [];
      const newImageAttachmentIds: string[] = [];
      const newVideos: string[] = [];
      const newVideoAttachmentIds: string[] = [];
      const newAudioRecordings: AudioRecording[] = [];
      const audioToTranscribe: { recId: string; file: File; mime: string }[] = [];

      for (const file of files) {
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();

        if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|flac|webm|opus|amr|3ga|wma|mid)$/i.test(name)) {
          const detectedMime = detectAudioMimeType(file.name, file.type);
          const newRecId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const attachmentId = `att-audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await saveAttachmentBlob(attachmentId, file, detectedMime);
          const audioUrl = URL.createObjectURL(file);

          const newRec: AudioRecording = {
            id: newRecId,
            name: file.name || t.audioLink || 'Audio',
            dataUrl: audioUrl,
            blobUrl: audioUrl,
            duration: Math.round(file.size / 16000) || 15,
            transcription: '⏳ جاري التفريغ بالذكاء الاصطناعي...',
            attachmentId,
            mimeType: detectedMime
          };
          newAudioRecordings.push(newRec);
          audioToTranscribe.push({ recId: newRecId, file, mime: detectedMime });
        } else if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|ico|heic|heif|avif)$/i.test(name)) {
          const compressed = await compressImageFile(file, 1600, 0.82);
          const attachmentId = `att-img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await saveAttachmentBlob(attachmentId, compressed.blob, compressed.mimeType || 'image/jpeg');
          const imageUrl = URL.createObjectURL(compressed.blob);
          newImages.push(imageUrl);
          newImageAttachmentIds.push(attachmentId);
        } else if (type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|3gp|m4v)$/i.test(name)) {
          if (file.size <= 200 * 1024 * 1024) {
            const attachmentId = `att-vid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await saveAttachmentBlob(attachmentId, file, file.type || 'video/mp4');
            const videoBlobUrl = URL.createObjectURL(file);
            newVideos.push(videoBlobUrl);
            newVideoAttachmentIds.push(attachmentId);
          }
        } else {
          // Documents / PDF / Generic files
          const newFile = await processSelectedFileAttachment(file);
          newFiles.push(newFile);
        }
      }

      // Single Atomic Update for all categories at once
      if (newFiles.length > 0 || newImages.length > 0 || newVideos.length > 0 || newAudioRecordings.length > 0) {
        setEditingDiary(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            files: [...(prev.files || []), ...newFiles],
            images: Array.from(new Set([...(prev.images || []), ...newImages])),
            imageAttachmentIds: Array.from(new Set([...(prev.imageAttachmentIds || []), ...newImageAttachmentIds])),
            videos: Array.from(new Set([...(prev.videos || []), ...newVideos])),
            videoAttachmentIds: Array.from(new Set([...(prev.videoAttachmentIds || []), ...newVideoAttachmentIds])),
            audioRecordings: [...(prev.audioRecordings || []), ...newAudioRecordings]
          };
          saveDraftSynchronously(updated);
          return updated;
        });

        setDiaries(prev => {
          const targetDiaryId = editingDiary ? editingDiary.id : '';
          const targetDate = selectedDate || new Date().toISOString().split('T')[0];
          return prev.map(d => {
            if (targetDiaryId ? d.id === targetDiaryId : (d.createdAt.split('T')[0] === targetDate && !d.isTrash)) {
              return {
                ...d,
                files: [...(d.files || []), ...newFiles],
                images: Array.from(new Set([...(d.images || []), ...newImages])),
                imageAttachmentIds: Array.from(new Set([...(d.imageAttachmentIds || []), ...newImageAttachmentIds])),
                videos: Array.from(new Set([...(d.videos || []), ...newVideos])),
                videoAttachmentIds: Array.from(new Set([...(d.videoAttachmentIds || []), ...newVideoAttachmentIds])),
                audioRecordings: [...(d.audioRecordings || []), ...newAudioRecordings]
              };
            }
            return d;
          });
        });
      }

      // Trigger background transcription for any added audio files
      if (audioToTranscribe.length > 0) {
        setAudioUploadLoading(true);
        for (const item of audioToTranscribe) {
          setTranscribingAudioId(item.recId);
          if (item.file.size > 22 * 1024 * 1024) {
            updateAudioTranscriptionAtomic(item.recId, t.transcriptionFailedSize || (settings?.appLanguage === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت).' : 'File is too large.'));
            continue;
          }
          try {
            const base64Audio = await readBlobAsDataUrl(item.file);
            const res = await fetch('/api/gemini/transcribe-audio', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-gemini-key': settings.userApiKey || '',
                'x-app-language': settings.appLanguage || 'ar'
              },
              body: JSON.stringify({
                audioData: base64Audio,
                mimeType: item.mime,
                fileName: item.file.name,
                appLanguage: settings?.appLanguage || 'ar'
              })
            });
            const data = await res.json();
            if (data.success && data.transcription && !data.transcription.includes('لا يمكن تحديد') && !data.transcription.includes('فارغ')) {
              const finalTrans = data.transcription.trim();
              updateAudioTranscriptionAtomic(item.recId, finalTrans, data.speechEmotion);
            } else {
              const errorMsg = data.error || data.message || (t.aiTranscriptionUnavailable || (settings?.appLanguage === 'ar' ? 'تعذر تفريغ هذا الملف الصوتي، يرجى المحاولة لاحقاً.' : 'Could not transcribe audio.'));
              updateAudioTranscriptionAtomic(item.recId, errorMsg);
            }
          } catch (err: any) {
            const errorMsg = err?.message || (t.aiTranscriptionUnavailable || (settings?.appLanguage === 'ar' ? 'تعذر تفريغ هذا الملف الصوتي، يرجى المحاولة لاحقاً.' : 'Could not transcribe audio.'));
            updateAudioTranscriptionAtomic(item.recId, errorMsg);
          }
        }
        setAudioUploadLoading(false);
        setTranscribingAudioId(null);
      }
    } catch (err) {
      console.error('Generic file upload error:', err);
    } finally {
      resetFilePickerGuard();
    }
  };

  // --- Helper to create a fallback playable WAV audio Data URL if mic stream produced 0 bytes ---
  const createFallbackAudioWav = (durationSec = 3): string => {
    try {
      const sampleRate = 8000;
      const numSamples = Math.max(sampleRate * durationSec, 8000);
      const buffer = new Uint8Array(44 + numSamples);
      buffer.set([82, 73, 70, 70], 0); // "RIFF"
      const fileSize = 36 + numSamples;
      buffer[4] = fileSize & 0xff;
      buffer[5] = (fileSize >> 8) & 0xff;
      buffer[6] = (fileSize >> 16) & 0xff;
      buffer[7] = (fileSize >> 24) & 0xff;
      buffer.set([87, 65, 86, 69], 8); // "WAVE"
      buffer.set([102, 109, 116, 32], 12); // "fmt "
      buffer.set([16, 0, 0, 0], 16);
      buffer.set([1, 0], 20); // PCM
      buffer.set([1, 0], 22); // Mono
      buffer.set([64, 31, 0, 0], 24); // 8000Hz
      buffer.set([64, 31, 0, 0], 28);
      buffer.set([1, 0], 32);
      buffer.set([8, 0], 34); // 8-bit
      buffer.set([100, 97, 116, 97], 36); // "data"
      buffer[40] = numSamples & 0xff;
      buffer[41] = (numSamples >> 8) & 0xff;
      buffer[42] = (numSamples >> 16) & 0xff;
      buffer[43] = (numSamples >> 24) & 0xff;
      for (let i = 0; i < numSamples; i++) {
        buffer[44 + i] = Math.floor(128 + 25 * Math.sin((i * 440 * 2 * Math.PI) / sampleRate));
      }
      let binary = '';
      for (let i = 0; i < buffer.length; i++) {
        binary += String.fromCharCode(buffer[i]);
      }
      return 'data:audio/wav;base64,' + btoa(binary);
    } catch (e) {
      return '#';
    }
  };

  // --- Voice Recorder Start Handler ---
  const handleStartRecording = async () => {
    const startTime = Date.now();
    recordingStartTimeRef.current = startTime;
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    setSpeechTranscript('');
    setSpeechInterim('');
    speechTranscriptRef.current = '';
    audioChunksRef.current = [];

    // Start interval timer
    if (recordingIntervalId) clearInterval(recordingIntervalId);
    const intId = window.setInterval(() => {
      setRecordingSeconds(prev => {
        const next = prev + 1;
        recordingSecondsRef.current = next;
        return next;
      });
    }, 1000);
    setRecordingIntervalId(intId);

    // Start centralized speech recognition with separate final and interim transcripts
    const manager = SpeechRecognitionManager.getInstance();
    if (manager.isSupported()) {
      manager.startSession({
        lang: langInfo.speechLang || 'ar-EG',
        continuous: true,
        callbacks: {
          onTranscriptChange: (state) => {
            speechTranscriptRef.current = state.displayTranscript;
            setSpeechTranscript(state.displayTranscript);
            setSpeechInterim('');
          },
          onError: (e) => {
            console.error("Speech Recognition setup error:", e);
          }
        }
      });
    }
  };

  // --- Voice Recorder Stop & Insert Handler ---
  const handleStopAndInsertRecording = () => {
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }

    const stopTime = Date.now();
    const startTime = recordingStartTimeRef.current || stopTime;
    const elapsedTime = (stopTime - startTime) / 1000;
    const finalSecs = Math.max(Math.round(elapsedTime), recordingSecondsRef.current || 0, 1);

    setIsRecording(false);

    const manager = SpeechRecognitionManager.getInstance();
    const finalSpeechText = manager.finalize();
    const combinedTranscript = (finalSpeechText || speechTranscriptRef.current || speechTranscript || speechInterim).trim();

    // Insert into diary editor without overwriting existing content
    if (combinedTranscript) {
      setEditingDiary(prev => {
        if (!prev) return null;
        const separator = prev.content && prev.content.trim() ? '\n\n' : '';
        const updatedContent = `${prev.content || ''}${separator}🎙️ [فضفضة صوتية]:\n${combinedTranscript}`;
        setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, content: updatedContent } : d));
        return { ...prev, content: updatedContent };
      });
    }

    // Save audio stream if mediaRecorder is active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const rec = mediaRecorderRef.current;
      rec.onstop = () => {
        const hasChunks = audioChunksRef.current.length > 0;
        const audioBlob = hasChunks ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null;
        const blobUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;
        if (audioBlob) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = (typeof reader.result === 'string' && reader.result.startsWith('data:')) ? reader.result : (blobUrl || createFallbackAudioWav(finalSecs));
            processAudioRecordingOrFile({
              dataUrl,
              blobUrl,
              mimeType: 'audio/webm',
              fileName: `${t.voiceJournalTab} ${new Date().toLocaleTimeString(langInfo?.bcp47 || (settings?.appLanguage === 'ar' ? 'ar-SA' : 'en-US'), { hour: '2-digit', minute: '2-digit' })}.webm`,
              duration: finalSecs,
              liveSpeechText: combinedTranscript
            });
          };
          reader.readAsDataURL(audioBlob);
        }
        try {
          rec.stream?.getTracks().forEach(t => t.stop());
        } catch (_) {}
      };
      try { rec.requestData(); } catch (_) {}
      try { rec.stop(); } catch (_) {}
    }

    setSpeechTranscript('');
    setSpeechInterim('');
    speechTranscriptRef.current = '';
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    recordingStartTimeRef.current = null;
  };

  // --- Voice Recorder Cancel Handler ---
  const handleCancelRecording = () => {
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setIsRecording(false);

    const manager = SpeechRecognitionManager.getInstance();
    manager.abortSession();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      } catch (_) {}
    }

    audioChunksRef.current = [];
    setSpeechTranscript('');
    setSpeechInterim('');
    speechTranscriptRef.current = '';
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    recordingStartTimeRef.current = null;
  };

  // --- Toggle Recording Wrapper ---
  const handleToggleRecording = async () => {
    if (isRecording) {
      handleStopAndInsertRecording();
    } else {
      handleStartRecording();
    }
  };

  // --- Call Gemini API Assistant within a Diary (AI داخل اليومية) ---
  const handleDiaryAssistantAction = async (promptType: 'summarize' | 'mistakes' | 'plan') => {
    if (!editingDiary || !editingDiary.content.trim()) {
      alert('يرجى كتابة بعض الكلمات في محتوى المذكرة أولاً ليقوم المساعد بمراجعتها!');
      return;
    }

    setDiaryAiLoading(true);
    setDiaryAiAnswer('');

    try {
      const response = await fetch('/api/gemini/diary-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({
          title: editingDiary.title,
          content: editingDiary.content,
          promptType
        })
      });
      const data = await response.json();
      if (data.success) {
        setDiaryAiAnswer(data.answer);
      } else {
        setDiaryAiAnswer("عذراً، حدث خطأ أثناء معالجة طلبك.");
      }
    } catch (e) {
      console.error(e);
      setDiaryAiAnswer("حدثت مشكلة في الاتصال بالذكاء الاصطناعي.");
    } finally {
      setDiaryAiLoading(false);
    }
  };

  // --- Real-time Interactive Psychological Chat inside Diary Editor ---
  const handleSendDiaryChatMessage = async (msgText?: string) => {
    const textToSend = msgText || diaryChatMessage;
    if (!textToSend.trim() || !editingDiary) return;

    const timestamp = new Date().toISOString();
    // 1. Append user message locally
    const userMsg: ChatLogEntry = {
      sender: 'user',
      text: textToSend.trim(),
      createdAt: timestamp
    };

    const updatedLogs = [...(editingDiary.chatLogs || []), userMsg];

    // Helper to persist diary and chatLogs to state & localStorage
    const saveDiaryWithLogs = (logs: ChatLogEntry[]) => {
      setEditingDiary(prev => {
        if (!prev) return null;
        const updatedEntry = { ...prev, chatLogs: logs };
        setDiaries(prevDiaries => {
          const nextDiaries = prevDiaries.map(d => d.id === updatedEntry.id ? updatedEntry : d);
          try {
            localStorage.setItem('yawmiyati_diaries', JSON.stringify(nextDiaries));
          } catch (_) {}
          return nextDiaries;
        });
        return updatedEntry;
      });
    };

    saveDiaryWithLogs(updatedLogs);
    if (!msgText) {
      setDiaryChatMessage('');
    }
    setDiaryChatLoading(true);

    const taskId = `diarychat-${editingDiary.id}-${Date.now()}`;
    backgroundAIManager.startTask({
      id: taskId,
      category: 'diary_chat',
      title: editingDiary.title ? `استشارة: ${editingDiary.title}` : (settings?.appLanguage === 'ar' ? 'استشارة الذكاء الاصطناعي' : 'AI Reflection'),
      targetId: editingDiary.id
    });

    try {
      const isAr = (settings?.appLanguage || 'ar') === 'ar';

      // 1. Current entry metadata & tasks
      const attachments: string[] = [];
      if (editingDiary.images && editingDiary.images.length > 0) attachments.push(`${editingDiary.images.length} صور`);
      if (editingDiary.audioRecordings && editingDiary.audioRecordings.length > 0) attachments.push(`${editingDiary.audioRecordings.length} تسجيلات صوتية`);
      if (editingDiary.files && editingDiary.files.length > 0) attachments.push(`${editingDiary.files.length} ملفات`);
      if (editingDiary.drawing) attachments.push(`تخطيط رسومي`);

      const currentTasks = (editingDiary.tasks || []).map(t => `${t.completed ? '✅' : '⏳'} ${t.text}`);
      const currentLinks = editingDiary.links || [];
      const currentFiles = (editingDiary.files || []).map(f => f.name);

      // 2. Audio recordings with SER emotion details
      const audioTranscriptions = (editingDiary.audioRecordings || []).map((a, idx) => {
        const serInfo = a.speechEmotion ? ` (نبرة المشاعر: ${(a.speechEmotion as any).emotion || a.speechEmotion.primaryEmotion || ''} - تفاصيل النبرة: ${a.speechEmotion.vocalToneDetails || ''})` : '';
        return `🎙️ [تسجيل #${idx + 1} "${a.name}"]: "${a.transcription || 'لا يوجد تفريغ'}"${serInfo}`;
      });

      // 3. Compact longitudinal index of user's past journal entries
      const pastDiariesContext = (diaries || [])
        .filter(d => d.id !== editingDiary.id)
        .slice(0, 10)
        .map(d => {
          const dDate = d.createdAt ? new Date(d.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US') : '';
          const dTime = d.createdAt ? new Date(d.createdAt).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
          const excerpt = (d.content || '').replace(/\s+/g, ' ').slice(0, 100);
          const m = (d.moods || []).join(', ');
          return `• [${dDate} ${dTime}] عنوان: "${d.title || (isAr ? 'بدون عنوان' : 'Untitled')}" | المزاج: (${m || (isAr ? 'طبيعي' : 'Normal')}) | مقتطف: "${excerpt}..."`;
        })
        .join('\n');

      // 4. Safe compressed extra inline image parts for multimodal reasoning (strictly governed by diaryChatMediaPermission)
      const rawAttachmentsForPerm: any[] = [];
      if (editingDiary.images && editingDiary.images.length > 0) {
        editingDiary.images.forEach((img, idx) => {
          rawAttachmentsForPerm.push({
            id: editingDiary.imageAttachmentIds && editingDiary.imageAttachmentIds[idx] ? editingDiary.imageAttachmentIds[idx] : `img-${idx}`,
            attachmentId: editingDiary.imageAttachmentIds && editingDiary.imageAttachmentIds[idx],
            type: 'image',
            mimeType: 'image/jpeg',
            dataUrl: img
          });
        });
      }
      if (editingDiary.drawing) {
        rawAttachmentsForPerm.push({
          id: editingDiary.drawingAttachmentId || 'draw-0',
          attachmentId: editingDiary.drawingAttachmentId,
          type: 'image',
          mimeType: 'image/png',
          dataUrl: editingDiary.drawing
        });
      }
      if (editingDiary.audioRecordings && editingDiary.audioRecordings.length > 0) {
        editingDiary.audioRecordings.forEach((rec, idx) => {
          rawAttachmentsForPerm.push({
            id: rec.attachmentId || rec.id || `audio-${idx}`,
            attachmentId: rec.attachmentId || rec.id,
            type: 'audio',
            mimeType: rec.mimeType || 'audio/webm'
          });
        });
      }
      if (editingDiary.files && editingDiary.files.length > 0) {
        editingDiary.files.forEach((f, idx) => {
          rawAttachmentsForPerm.push({
            id: f.attachmentId || f.id || `file-${idx}`,
            attachmentId: f.attachmentId || f.id,
            type: 'file',
            mimeType: f.type || 'application/pdf'
          });
        });
      }

      const { parts: extraParts } = await encodePermittedMediaParts(rawAttachmentsForPerm, diaryChatMediaPermission);

      const filteredMetricsForChat = filterDiaryMetricsForAI(editingDiary, dailyTouchedMetrics, settings.appLanguage || 'ar');

      const res = await fetch('/api/gemini/diary-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': getActiveApiKeyFromSettings(settings) || settings.userApiKey || '',
          'x-app-language': settings.appLanguage || 'ar'
        },
        body: JSON.stringify({
          title: editingDiary.title,
          content: editingDiary.content,
          chatLogs: updatedLogs.slice(0, -1),
          newMessage: textToSend.trim(),
          diaryType: editingDiary.diaryType || 'diary',
          moods: editingDiary.moods || [],
          importance: editingDiary.importance || 3,
          tasks: currentTasks,
          links: currentLinks,
          files: currentFiles,
          createdAt: editingDiary.createdAt,
          updatedAt: editingDiary.updatedAt,
          attachments,
          audioTranscriptions,
          aiMoodAnalysis: editingDiary.aiMoodAnalysis || [],
          tags: editingDiary.tags || [],
          pastDiariesContext,
          metricsSummary: {
            sleep: filteredMetricsForChat.sleepHoursFormatted,
            exercise: filteredMetricsForChat.exerciseFormatted,
            water: filteredMetricsForChat.waterCupsFormatted,
            moodScore: filteredMetricsForChat.moodFormatted,
            symptoms: filteredMetricsForChat.symptomsFormatted
          },
          extraParts,
          mediaAccessPermission: diaryChatMediaPermission,
          appLanguage: settings.appLanguage || 'ar'
        })
      });

      const responseText = await res.text();
      let data: any = null;
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (_) {}
      }

      let answerText = '';
      if (data && data.success && data.answer) {
        answerText = data.answer;
      } else if (data && data.answer) {
        answerText = data.answer;
      } else if (data && (data.error || data.message)) {
        const rawErrStr = data.error || data.message;
        console.warn('API consultation warning:', rawErrStr);
        if (data.errorType === 'quota_exhausted' || String(rawErrStr).includes('quota') || String(rawErrStr).includes('RESOURCE_EXHAUSTED') || String(rawErrStr).includes('الحصة')) {
          answerText = getLocalizedAIError('quota-exhausted', settings.appLanguage);
        } else if (data.errorType === 'invalid_key' || String(rawErrStr).includes('API_KEY') || String(rawErrStr).includes('مفتاح')) {
          answerText = getLocalizedAIError('key-missing', settings.appLanguage);
        } else {
          answerText = String(rawErrStr);
        }
      } else {
        // Fallback directly to client-side Gemini generation with Deep Reasoning Tier
        const promptContext = `الموضوع: ${editingDiary.title || 'مذكرة'}\nالمحتوى: ${editingDiary.content || ''}\nرسالة المستخدم الجديدة: ${textToSend.trim()}`;
        try {
          answerText = await generateGeminiContentDirect(
            promptContext,
            'أنت طبيب نفسي ومعالج إكلينيكي حكيم وداعم في تطبيق حياة AI. استمع لليوميات وأجب بأسلوب دافئ ومهني ومفصل باللغة العربية.',
            getActiveApiKeyFromSettings(settings) || settings.userApiKey, extraParts, settings.appLanguage, 'reasoning');
        } catch (genErr) {
          console.warn('Direct fallback generation warning:', genErr);
        }
      }

      // Absolute ban on raw internal sentinel strings in chat bubble
      if (typeof answerText === 'string') {
        if (answerText.includes('__AI_QUOTA_EXCEEDED__') || answerText.includes('RESOURCE_EXHAUSTED')) {
          answerText = getLocalizedAIError('quota-exhausted', settings.appLanguage);
        } else if (answerText.includes('__AI_CHECK_API_KEY__') || answerText.includes('API_KEY_INVALID')) {
          answerText = getLocalizedAIError('key-missing', settings.appLanguage);
        }
      }

      const defaultErrStr = !settings.userApiKey && (!settings.apiKeys || settings.apiKeys.length === 0)
        ? (isAr ? 'يرجى التحقق من مفاتيح Gemini API في الإعدادات.' : 'Please check your Gemini API keys in settings.')
        : (isAr ? 'عذراً، حدث تأخر مؤقت في استجابة الذكاء الاصطناعي. يرجى إعادة المحاولة.' : 'Temporary delay in AI response. Please try again.');

      const aiMsg: ChatLogEntry = {
        sender: 'ai',
        text: answerText && answerText.trim() ? answerText : defaultErrStr,
        createdAt: new Date().toISOString()
      };
      saveDiaryWithLogs([...updatedLogs, aiMsg]);
      backgroundAIManager.completeTask(taskId, aiMsg.text);
    } catch (error: any) {
      console.error("Diary chat error:", error);
      let fallbackText = '';
      try {
        fallbackText = await generateGeminiContentDirect(
          `رسالة الفضفضة: ${textToSend.trim()}`,
          'أنت مستشار نفسي حكيم وداعم في تطبيق حياة AI. أجب بأسلوب دافئ ومطمئن.',
          getActiveApiKeyFromSettings(settings) || settings.userApiKey, undefined, settings.appLanguage, 'reasoning');
      } catch (_) {}

      if (typeof fallbackText === 'string') {
        if (fallbackText.includes('__AI_QUOTA_EXCEEDED__') || fallbackText.includes('RESOURCE_EXHAUSTED')) {
          fallbackText = getLocalizedAIError('quota-exhausted', settings.appLanguage);
        } else if (fallbackText.includes('__AI_CHECK_API_KEY__') || fallbackText.includes('API_KEY_INVALID')) {
          fallbackText = getLocalizedAIError('key-missing', settings.appLanguage);
        }
      }

      const isAr = (settings?.appLanguage || 'ar') === 'ar';
      const defaultErrStr = !settings.userApiKey && (!settings.apiKeys || settings.apiKeys.length === 0)
        ? (isAr ? 'يرجى التحقق من مفاتيح Gemini API في الإعدادات.' : 'Please check your Gemini API keys in settings.')
        : (isAr ? 'عذراً، حدث تأخر مؤقت في الاتصال بالذكاء الاصطناعي. يرجى إعادة المحاولة.' : 'Temporary delay in AI response. Please try again.');

      const errorMsg: ChatLogEntry = {
        sender: 'ai',
        text: fallbackText && fallbackText.trim() ? fallbackText : defaultErrStr,
        createdAt: new Date().toISOString()
      };
      saveDiaryWithLogs([...updatedLogs, errorMsg]);
      backgroundAIManager.completeTask(taskId, errorMsg.text);
    } finally {
      setDiaryChatLoading(false);
      // Auto-scroll chat box
      setTimeout(() => {
        const chatBox = document.getElementById('diary-chat-log-box');
        if (chatBox) {
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      }, 100);
    }
  };

  // --- Copy Full Diary AI Chat to Clipboard ---
  const handleCopyDiaryChat = async () => {
    if (!editingDiary?.chatLogs || editingDiary.chatLogs.length === 0) return;
    const formatted = editingDiary.chatLogs.map(c => {
      const sender = c.sender === 'user' ? (t.meLabel || 'User') : (t.aiPsychAdvisor || 'AI Advisor');
      const time = formatDateTime(c.createdAt, settings?.appLanguage || 'ar');
      return `[${sender} - ${time}]:\n${c.text}\n`;
    }).join('\n-------------------\n\n');

    const ok = await copyTextSafe(formatted);
    if (ok) {
      showGlobalCopyToast(t.chatCopiedSuccess || (settings?.appLanguage === 'ar' ? 'تم نسخ المحادثة بنجاح 📋' : 'Chat copied to clipboard!'), 'success');
    } else {
      showGlobalCopyToast(t.copyFailedToast || (settings?.appLanguage === 'ar' ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy to clipboard'), 'error');
    }
  };

  // --- Export Diary Chat as PDF ---
  const handleExportDiaryChatPdf = async () => {
    const chatEl = document.getElementById('diary-chat-log-box');
    if (!chatEl || !editingDiary?.chatLogs || editingDiary.chatLogs.length === 0) return;
    try {
      const canvas = await captureElementToCanvas(chatEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        windowWidth: 800
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `HayatAI_Chat_${editingDiary.id.split('-')[1] || 'log'}.pdf`;
      const pdfBlob = pdf.output('blob');
      await exportBlobSafe({
        blob: pdfBlob,
        filename: fileName,
        title: 'Hayat AI Diary Chat',
        mimeType: 'application/pdf'
      });
    } catch (err) {
      console.error('Export Chat PDF error:', err);
    }
  };

  // --- Delete Selected Messages from Chat ---
  const handleDeleteSelectedChatMessages = () => {
    if (!editingDiary?.chatLogs || selectedChatIndices.length === 0) return;
    setEditingDiary(prev => {
      if (!prev) return null;
      const nextLogs = (prev.chatLogs || []).filter((_, idx) => !selectedChatIndices.includes(idx));
      setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, chatLogs: nextLogs } : d));
      return { ...prev, chatLogs: nextLogs };
    });
    setSelectedChatIndices([]);
    setIsChatSelectMode(false);
  };

  // --- Delete All Messages from Chat ---
  const handleDeleteAllChatMessages = () => {
    if (!editingDiary?.chatLogs || editingDiary.chatLogs.length === 0) return;
    if (window.confirm(t.confirmDeleteAllChat || (settings?.appLanguage === 'ar' ? 'هل أنت متأكد من حذف جميع رسائل المحادثة؟ (لن يتأثر نص اليومية)' : 'Are you sure you want to delete all chat messages? (Diary content will not be affected)'))) {
      setEditingDiary(prev => {
        if (!prev) return null;
        setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, chatLogs: [] } : d));
        return { ...prev, chatLogs: [] };
      });
      setSelectedChatIndices([]);
      setIsChatSelectMode(false);
    }
  };

  // --- Dynamic Backup and Restore Manager ---
  const handleExportBackup = () => {
    // Strictly sanitize and exclude all stored API keys from export
    const safeSettings = settings ? { ...settings } : undefined;
    if (safeSettings) {
      delete (safeSettings as any).userApiKey;
      delete (safeSettings as any).apiKeys;
      delete (safeSettings as any).activeKeyId;
    }
    const dataStr = JSON.stringify({ diaries, settings: safeSettings });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `HayatAI_Backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportCsvBackup = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // UTF-8 BOM
    csvContent += 'ID,Date,Title,Content,Moods,Sleep Hours,Sports Minutes\n';

    (diaries || []).forEach(d => {
      const safeTitle = `"${(d.title || '').replace(/"/g, '""')}"`;
      const safeContent = `"${(d.content || '').replace(/"/g, '""')}"`;
      const safeMoods = `"${(d.moods || []).join(', ').replace(/"/g, '""')}"`;
      csvContent += `${d.id},${d.createdAt},${safeTitle},${safeContent},${safeMoods},${d.sleepHours || ''},${d.sportsDuration || ''}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HayatAI_Diaries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (file) {
      fileReader.onload = event => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.diaries) {
            setDiaries(parsed.diaries);
            if (parsed.settings) setSettings(parsed.settings);
            alert(t.backupRestoredSuccess);
          } else {
            alert(t.invalidBackupFormat);
          }
        } catch (error) {
          alert(t.fileReadFailed);
        }
      };
      fileReader.readAsText(file);
    }
  };

  const handleWriteDiaryImportCompleted = (entries: DiaryEntry[]) => {
    setDiaries(prev => {
      // Prepend imported diaries
      const updated = [...entries, ...prev];
      // Sort by date descending so they appear beautifully in the timeline
      updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return updated;
    });
    alert(
      `${t.diariesImportSuccess} (${entries.length})`
    );
  };

  const handleSendEmailBackup = async () => {
    if (!backupEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
      setEmailBackupStatus(t.invalidEmailError);
      return;
    }

    setIsSendingEmailBackup(true);
    setEmailBackupStatus(t.sendingEmailBackup);

    try {
      // Strictly exclude stored API keys from email backup
      const safeSettings = settings ? { ...settings } : undefined;
      if (safeSettings) {
        delete (safeSettings as any).userApiKey;
        delete (safeSettings as any).apiKeys;
        delete (safeSettings as any).activeKeyId;
      }

      const payload = {
        email: backupEmail,
        backupData: {
          diaries,
          habits,
          settings: safeSettings,
          gratitudeCards,
          chatMessages: (() => {
            try {
              const raw = localStorage.getItem('yawmiyati_chat_messages');
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })(),
          syncTime: new Date().toISOString()
        }
      };

      const response = await fetch('/api/backup/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        setEmailBackupStatus(
          `${t.emailBackupSuccess} ${backupEmail}! 🎉`
        );
      } else {
        setEmailBackupStatus(
          `${t.emailBackupFailed} ${data.message || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error("Email backup error:", error);
      setEmailBackupStatus(t.serverError);
    } finally {
      setIsSendingEmailBackup(false);
    }
  };

  // --- Search and Filter Logic (Memoized for high performance & crash-proof) ---
  const filteredDiariesList = useMemo(() => {
    if (!Array.isArray(diaries)) return [];
    const q = (searchQuery || '').toLowerCase().trim();
    return diaries.filter(d => {
      if (!d) return false;
      if (d.isArchived || d.isTrash) return false;

      const titleStr = typeof d.title === 'string' ? d.title : '';
      const contentStr = typeof d.content === 'string' ? d.content : '';
      const tagsArr = Array.isArray(d.tags) ? d.tags : [];

      const matchesSearch = !q ||
                            titleStr.toLowerCase().includes(q) ||
                            contentStr.toLowerCase().includes(q) ||
                            tagsArr.some(tagItem => typeof tagItem === 'string' && tagItem.toLowerCase().includes(q));

      const matchesTag = selectedTagFilter ? tagsArr.includes(selectedTagFilter) : true;
      const isFav = d.isFavorite === true || (d.isFavorite === undefined && (d.importance || 0) >= 4);
      const matchesFavorites = (showFavoritesOnly || diaryTypeFilter === 'favorites') ? isFav : true;

      const effectiveType = d.diaryType || 'diary';
      const matchesType = (diaryTypeFilter === 'all' || diaryTypeFilter === 'favorites')
        ? true
        : effectiveType === diaryTypeFilter;

      return matchesSearch && matchesTag && matchesFavorites && matchesType;
    });
  }, [diaries, searchQuery, selectedTagFilter, showFavoritesOnly, diaryTypeFilter]);

  // Memoized Day-by-Day grouping of filtered entries for instant tab rendering
  const memoizedGroupedDiaries = useMemo(() => {
    const groups: { [dayKey: string]: { dayEntries: DiaryEntry[]; formattedDayLabel: string } } = {};
    if (!Array.isArray(filteredDiariesList)) return { sortedDays: [], groups: {} };

    const validEntries = filteredDiariesList.filter(e => e && e.createdAt);
    const sorted = [...validEntries].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });

    const tempGroups: { [key: string]: DiaryEntry[] } = {};
    sorted.forEach(entry => {
      let dayKey = '2026-08-05';
      if (typeof entry.createdAt === 'string' && entry.createdAt.includes('T')) {
        dayKey = entry.createdAt.split('T')[0];
      } else if (entry.createdAt) {
        try {
          dayKey = new Date(entry.createdAt).toISOString().split('T')[0];
        } catch {
          dayKey = '2026-08-05';
        }
      }
      if (!tempGroups[dayKey]) {
        tempGroups[dayKey] = [];
      }
      tempGroups[dayKey].push(entry);
    });

    const sortedDays = Object.keys(tempGroups).sort((a, b) => {
      const timeA = new Date(a).getTime() || 0;
      const timeB = new Date(b).getTime() || 0;
      return timeB - timeA;
    });

    sortedDays.forEach(dayKey => {
      let formattedDayLabel = dayKey;
      try {
        const d = new Date(dayKey + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          formattedDayLabel = d.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      } catch {}

      groups[dayKey] = {
        dayEntries: tempGroups[dayKey],
        formattedDayLabel
      };
    });

    return { sortedDays, groups };
  }, [filteredDiariesList]);

  // Extract all unique tags for filter pills safely
  const allUniqueTags = useMemo(() => {
    if (!Array.isArray(diaries)) return [];
    return Array.from(new Set(diaries.flatMap(d => (d && Array.isArray(d.tags)) ? d.tags : [])));
  }, [diaries]);

  // Find or create diary entry for selected date safely
  const activeDiaryForSelectedDate = useMemo(() => {
    if (!Array.isArray(diaries)) return undefined;
    return diaries.find(d => {
      if (!d || !d.createdAt) return false;
      return String(d.createdAt).split('T')[0] === selectedDate;
    });
  }, [diaries, selectedDate]);

  // Dynamic tasks/habits/medications count for the top bar red badge safely
  const incompleteTasksCount = useMemo(() => {
    const customTasksIncomplete = Array.isArray(activeDiaryForSelectedDate?.tasks)
      ? activeDiaryForSelectedDate!.tasks.filter(taskItem => taskItem && !taskItem.completed).length
      : 0;
    const medicationsIncomplete = Array.isArray(activeDiaryForSelectedDate?.medications)
      ? activeDiaryForSelectedDate!.medications.filter(m => m && !m.taken).length
      : 1;
    const habitsIncomplete = Array.isArray(habits)
      ? habits.filter(h => h && h.history && !h.history[selectedDate]).length
      : 0;
    return customTasksIncomplete + medicationsIncomplete + habitsIncomplete;
  }, [activeDiaryForSelectedDate, habits, selectedDate]);

  const fetchDailyQuote = async () => {
    setQuoteLoading(true);
    try {
      const response = await fetch('/api/gemini/daily-inspiration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({
          moods: activeDiaryForSelectedDate?.moods || ['calm'],
          appLanguage: settings.appLanguage || 'ar'
        })
      });
      const data = await response.json();
      if (data.success) {
        setDailyQuote({ quote: data.quote, author: data.author, isAiGenerated: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleGenerateCbtAlternative = async () => {
    if (!cbtNegativeThoughts.trim()) return;
    setCbtLoading(true);
    try {
      const response = await fetch('/api/gemini/cbt-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': settings.userApiKey || ''
        },
        body: JSON.stringify({
          triggerEvent: cbtTriggerEvent,
          negativeThoughts: cbtNegativeThoughts,
          cognitiveDistortion: cbtCognitiveDistortion
        })
      });
      const data = await response.json();
      if (data.success) {
        setCbtRationalAlternative(data.rationalAlternative);
        if (data.detectedDistortion && !cbtCognitiveDistortion) {
          setCbtCognitiveDistortion(data.detectedDistortion);
        }
      }
    } catch (e) {
      console.error(e);
      alert(t.aiAdvisorError);
    } finally {
      setCbtLoading(false);
    }
  };

  const handleUpdateHabit = (
    type: 'sleep' | 'sports' | 'sportsType' | 'sportsIntensity' | 'sportsCalories' | 'sportsEnergyBefore' | 'sportsEnergyAfter' | 'sportsNotes' | 'medication' | 'water' | 'fastMood' | 'symptoms' | 'cbt',
    value: any
  ) => {
    // If no diary exists for selected date, auto-create one
    let targetDiary = activeDiaryForSelectedDate;
    if (!targetDiary) {
      const todayStr = new Date().toISOString();
      targetDiary = {
        id: `diary-${Date.now()}`,
        title: `مذكرة يومية لـ ${selectedDate}`,
        content: '',
        createdAt: `${selectedDate}T20:00:00.000Z`,
        updatedAt: `${selectedDate}T20:00:00.000Z`,
        moods: ['طبيعي'],
        importance: 3,
        color: 'bg-white border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: [],
        tags: [],
        chatLogs: [],
        isLocked: false,
        sleepHours: 8,
        sportsDuration: 0,
        sportsType: 'مشي',
        sportsIntensity: 'medium',
        sportsEnergyBefore: 3,
        sportsEnergyAfter: 4,
        sportsNotes: '',
        medications: [
          { id: 'm1', name: 'مكمل فيتامين D', time: '10:00 ص', taken: false }
        ],
        waterCups: 0,
        fastMoodScore: 5,
        symptomsChecklist: [],
        cbtWorksheets: []
      };
    }

    // Update fields & mark metric as explicitly touched for today
    if (type === 'sleep') {
      targetDiary.sleepHours = Number(value);
      markMetricTouched(selectedDate, 'sleep');
    } else if (type === 'sports') {
      targetDiary.sportsDuration = Number(value);
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'sportsType') {
      targetDiary.sportsType = String(value);
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'sportsIntensity') {
      targetDiary.sportsIntensity = value;
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'sportsCalories') {
      targetDiary.sportsCalories = Number(value);
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'sportsEnergyBefore') {
      targetDiary.sportsEnergyBefore = Number(value);
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'sportsEnergyAfter') {
      targetDiary.sportsEnergyAfter = Number(value);
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'sportsNotes') {
      targetDiary.sportsNotes = String(value);
      markMetricTouched(selectedDate, 'exercise');
    } else if (type === 'medication') {
      if (Array.isArray(value)) {
        targetDiary.medications = value;
      } else if (targetDiary.medications && targetDiary.medications.length > 0) {
        targetDiary.medications[0].taken = Boolean(value);
      } else {
        targetDiary.medications = [{ id: 'm1', name: 'مكمل فيتامين D اليومي', time: '10:00 ص', taken: Boolean(value) }];
      }
    } else if (type === 'water') {
      targetDiary.waterCups = Number(value);
      markMetricTouched(selectedDate, 'water');
    } else if (type === 'fastMood') {
      targetDiary.fastMoodScore = Number(value);
      markMetricTouched(selectedDate, 'mood');
    } else if (type === 'symptoms') {
      targetDiary.symptomsChecklist = value as string[];
      markMetricTouched(selectedDate, 'anxietySymptoms');
    } else if (type === 'cbt') {
      targetDiary.cbtWorksheets = value as any[];
    }

    // Save back to list
    setDiaries(prev => {
      const filtered = prev.filter(d => d.createdAt.split('T')[0] !== selectedDate);
      return [targetDiary!, ...filtered];
    });
  };

  const handleUpdateTasks = (updatedTasks: TaskItem[]) => {
    let targetDiary = activeDiaryForSelectedDate;
    if (!targetDiary) {
      targetDiary = {
        id: `diary-${Date.now()}`,
        title: `مذكرة يومية لـ ${selectedDate}`,
        content: '',
        createdAt: `${selectedDate}T20:00:00.000Z`,
        updatedAt: `${selectedDate}T20:00:00.000Z`,
        moods: ['طبيعي'],
        importance: 3,
        color: 'bg-white border-[#E2DCC8]',
        images: [],
        videos: [],
        audioRecordings: [],
        files: [],
        tasks: updatedTasks,
        tags: [],
        chatLogs: [],
        isLocked: false,
        sleepHours: 8,
        sportsDuration: 0,
        medications: [
          { id: 'm1', name: 'مكمل فيتامين D', time: '10:00 ص', taken: false }
        ],
        waterCups: 0,
        fastMoodScore: 5,
        symptomsChecklist: [],
        cbtWorksheets: []
      };
    } else {
      targetDiary = { ...targetDiary, tasks: updatedTasks };
    }

    setDiaries(prev => {
      const filtered = prev.filter(d => d.createdAt.split('T')[0] !== selectedDate);
      return [targetDiary!, ...filtered];
    });
  };

  // --- PIN Unlock Screen Trigger ---
  const isCurrentlyLocked = (settings.appLockEnabled ?? false) && settings.isAppLocked;
  if (isCurrentlyLocked) {
    return (
      <PINLock
        correctPin={settings.appPinCode || '1234'}
        biometricCredentialId={settings.biometricCredentialId}
        appPasswordHash={settings.appPasswordHash}
        appLockMethod={settings.appLockMethod || 'pin'}
        appLanguage={settings?.appLanguage || 'ar'}
        initialQuickAction={pendingNativeQuickAction}
        onUnlocked={() => {
          setSettings(prev => ({ ...prev, isAppLocked: false }));
          if (pendingNativeQuickAction) {
            const action = pendingNativeQuickAction;
            setPendingNativeQuickAction(null);
            setTimeout(() => handleQuickAction(action), 350);
          }
        }}
        onQuickAction={(actionType) => {
          setPendingNativeQuickAction(null);
          setSettings(prev => ({ ...prev, isAppLocked: false }));
          setTimeout(() => {
            handleQuickAction(actionType);
          }, 350);
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-dvh min-h-screen w-full overflow-x-clip ${settings.isDarkMode ? 'bg-[#121110] text-[#E4E2DD]' : 'bg-[#F9F7F2] text-[#3A3A3A]'} pb-nav-safe md:pb-12 font-sans antialiased selection:bg-[#E2DCC8] selection:text-[#5A5A40] app-font-${settings.appFont || 'cairo'} app-lh-${settings.appLineHeight || 'relaxed'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        fontFamily: getFontCss(settings.appFont),
        lineHeight: getLineHeightCss(settings.appLineHeight)
      }}
    >

      {/* 🔔 Floating Habit Reminder Notification */}
      {activeHabitReminder && (
        <div className="fixed top-20 right-4 left-4 md:right-auto md:left-4 md:w-96 bg-white border-2 border-[#D4A373] text-[#3A3A3A] p-4 rounded-3xl shadow-2xl z-50 flex items-start space-x-3 space-x-reverse animate-bounce border-dashed">
          <div className="p-2.5 bg-[#FAEDCD] text-[#D4A373] rounded-xl shrink-0">
            <Flame className="w-6 h-6 fill-[#D4A373] text-[#D4A373]" />
          </div>
          <div className="flex-grow space-y-1">
            <h4 className="text-xs font-bold text-[#D4A373] flex items-center space-x-1 space-x-reverse">
              <span>🔔</span>
              <span>{t.habitReminderAlertHeader}</span>
            </h4>
            <p className="text-[11px] text-[#5A5A40] leading-relaxed">
              {t.habitReminderAlertPrompt} <strong className="text-[#3A3A3A]">"{activeHabitReminder.name}"</strong>.
            </p>
            <div className="flex space-x-2 space-x-reverse pt-2">
              <button
                onClick={() => {
                  toggleHabitCompletion(activeHabitReminder.id, selectedDate);
                  setActiveHabitReminder(null);
                }}
                className="px-3 py-1 bg-[#8B9D83] text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-[#5A5A40] transition-colors"
              >
                {t.habitCompletedButton}
              </button>
              <button
                onClick={() => setActiveHabitReminder(null)}
                className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {t.dismissTemporarilyButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌸 Floating Gratitude Journal Reminder Notification */}
      {activeGratitudeReminderNotification && (
        <div className="fixed top-24 right-4 left-4 md:right-auto md:left-4 md:w-96 bg-[#FFFDF9] border-2 border-amber-400 text-[#3A3A3A] p-5 rounded-3xl shadow-2xl z-50 flex items-start space-x-3 space-x-reverse animate-bounce border-dashed" id="gratitude-reminder-banner">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
            <span className="text-2xl">🌸</span>
          </div>
          <div className="flex-grow space-y-1">
            <h4 className="text-xs font-extrabold text-amber-700 flex items-center space-x-1.5 space-x-reverse">
              <span>🔔</span>
              <span>{t.gratitudeSmartReminderHeader}</span>
            </h4>
            <p className="text-[11px] text-[#5A5A40] leading-relaxed">
              {t.gratitudeSmartReminderPrompt}
            </p>
            <div className="flex space-x-2 space-x-reverse pt-2.5">
              <button
                onClick={() => {
                  setActiveTab('diaries');
                  setActiveDiariesSubTab('gratitude');
                  setActiveGratitudeReminderNotification(false);
                }}
                className="px-3 py-1.5 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-[10px] font-extrabold cursor-pointer transition-colors"
              >
                {t.openGratitudeJournalNow}
              </button>
              <button
                onClick={() => setActiveGratitudeReminderNotification(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl text-[10px] cursor-pointer transition-colors"
              >
                {t.remindMeLaterButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ Modal: إضافة عادة جديدة */}
      {showAddHabitModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#E2DCC8] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4" dir={langInfo.dir}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                <span className="p-1 bg-[#8B9D83]/10 text-[#8B9D83] rounded-lg">🎯</span>
                <span>{t.addNewHabit}</span>
              </h3>
              <button
                onClick={() => setShowAddHabitModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHabit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#5A5A40] tracking-wider block">{t.habitName}</label>
                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#F9F7F2] border border-[#E2DCC8] flex items-center justify-center text-lg shrink-0 shadow-2xs font-bold text-[#3A3A3A]">
                    {newHabitIcon}
                  </div>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={e => setNewHabitName(e.target.value)}
                    placeholder={t.habitNamePlaceholder}
                    className="flex-1 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl px-4 py-2.5 text-xs text-[#3A3A3A] focus:outline-none focus:ring-1 focus:ring-[#8B9D83]"
                    required
                  />
                </div>
              </div>

              {/* 🎨 أيقونة العادة المخصصة */}
              <div className="space-y-1.5 bg-[#F9F7F2]/80 p-3 rounded-2xl border border-[#E2DCC8]/80">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#5A5A40] tracking-wider block">{t.chooseHabitIcon}</label>
                  <span className="text-[10px] font-bold text-[#8B9D83] bg-white px-2 py-0.5 rounded-md border border-[#E2DCC8]/60">
                    المحددة: {newHabitIcon}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-white rounded-xl border border-[#E2DCC8]/60">
                  {['🎯', '🏃', '💧', '📚', '🧘', '🏋️', '🥦', '🧠', '🎨', '✍️', '💰', '💤', '⚡', '🔥', '🏆', '🍏', '🚲', '💊', '☀️', '❤️', '⏰', '🎧', '🪴', '🧩'].map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewHabitIcon(ic)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        newHabitIcon === ic
                          ? 'bg-[#8B9D83] text-white shadow-xs scale-110 ring-2 ring-[#8B9D83]/40'
                          : 'bg-[#F9F7F2] hover:bg-[#F0EDE4] text-gray-700 border border-[#E2DCC8]/40'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#5A5A40] tracking-wider block">{t.habitCategoryLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'health', label: t.healthCategoryFilter },
                    { id: 'mind', label: t.mindCategoryFilter },
                    { id: 'sport', label: t.sportCategoryFilter },
                    { id: 'culture', label: t.cultureCategoryFilter },
                    { id: 'custom', label: t.customGoalsCategoryFilter },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewHabitCategory(cat.id as any)}
                      className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                        newHabitCategory === cat.id
                          ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-xs'
                          : 'bg-[#F9F7F2] border-[#E2DCC8]/60 text-gray-700 hover:bg-[#F0EDE4]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#5A5A40] tracking-wider block">{t.reminderTime}</label>
                  <input
                    type="time"
                    value={newHabitReminderTime}
                    onChange={e => setNewHabitReminderTime(e.target.value)}
                    className="w-full bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl px-3 py-2 text-xs text-[#3A3A3A] focus:outline-none"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={newHabitReminderEnabled}
                      onChange={e => setNewHabitReminderEnabled(e.target.checked)}
                      className="rounded text-[#8B9D83] focus:ring-[#8B9D83]"
                    />
                    <span className="text-xs font-semibold text-gray-600">{t.dailyPushNotification}</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-2 space-x-reverse pt-2">
                <button
                  type="submit"
                  className="flex-grow py-2.5 bg-[#8B9D83] hover:bg-[#5A5A40] text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  حفظ وتفعيل التتبع 🚀
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddHabitModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 Small Floating Draggable Top Pill Icon on Mobile when Header is Collapsed */}
      {isHeaderCollapsedOnMobile && (
        <motion.div
          drag="x"
          dragConstraints={{ left: -140, right: 140 }}
          dragElastic={0.1}
          className="fixed top-2 left-4 z-40 sm:hidden flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <button
            type="button"
            onClick={revealHeaderTemporarily}
            className="flex items-center space-x-2 space-x-reverse px-3.5 py-1.5 bg-[#4E685B] text-white rounded-full shadow-lg border border-white/40 active:scale-95 transition-all cursor-pointer group"
            title={t('nav.reveal_header_pill')}
          >
            <Brain className="w-4 h-4 text-[#FEFAE0] animate-pulse shrink-0" />
            <span className="text-[11px] font-black tracking-tight">{t('nav.hayat_ai')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <ChevronDown className="w-3.5 h-3.5 text-white/80 group-hover:translate-y-0.5 transition-transform shrink-0" />
          </button>
        </motion.div>
      )}

      {/* 🚀 Header bar with branding & Responsive Navigation Toolbar */}
      <header
        className={`sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#E2DCC8] z-30 shadow-xs transition-all duration-300 transform pt-safe ${
          isHeaderCollapsedOnMobile
            ? 'max-sm:-translate-y-full max-sm:max-h-0 max-sm:opacity-0 max-sm:overflow-hidden max-sm:pointer-events-none'
            : 'max-sm:translate-y-0 max-sm:max-h-[500px] max-sm:opacity-100'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
        onTouchStart={() => {
          if (!isHeaderCollapsedOnMobile) {
            revealHeaderTemporarily();
          }
        }}
      >
        {/* 📱 Mobile / Compact Header (< 768px): Expandable + Action Drawer */}
        {!isTopDrawerOpen ? (
          <div className="flex md:hidden items-center justify-between px-3 py-2 w-full gap-2 transition-all duration-300">
            {/* Mobile Branding */}
            <div className="flex items-center space-x-2 space-x-reverse shrink-0 select-none">
              <div className="w-8 h-8 bg-[#8B9D83] rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Brain className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1 space-x-reverse">
                  <h1 className="text-sm font-black tracking-tight text-[#3A3A3A] truncate max-w-[140px]">
                    {t('nav.hayat_ai').replace(/\s*AI\s*/i, '')}
                  </h1>
                  <span className="text-[9px] font-black bg-[#8B9D83] text-white px-1 py-0.5 rounded leading-none">
                    AI
                  </span>
                </div>
                <div className="flex items-center space-x-1 space-x-reverse text-[9px] font-bold text-gray-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${autoSaveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span>{autoSaveStatus === 'saving' ? t('nav.saving') : (lastAutoSaveTime || '💾')}</span>
                </div>
              </div>
            </div>

            {/* Consolidated Top-Bar + Toggle Button (smoothly rotates to × when open) */}
            <button
              type="button"
              onClick={() => setIsTopDrawerOpen(true)}
              className="relative p-2.5 rounded-xl border border-[#D1CCBA] bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] active:scale-95 transition-all cursor-pointer shadow-3xs flex items-center justify-center min-h-[40px] min-w-[40px]"
              title={t.topMenuQuickDrawer || 'القائمة السريعة والأقسام'}
              aria-label={t.topMenuQuickDrawer || 'القائمة السريعة والأقسام'}
            >
              <Plus className="w-5 h-5 transition-transform duration-300 transform" />
              {/* Subtle Red Indicator Dot if Unread Notifications or Incomplete Tasks Exist */}
              {(incompleteTasksCount > 0 || (settings.reminders || []).some(r => r.active)) && (
                <span className="absolute top-1.5 end-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex md:hidden items-center justify-between px-2 py-1.5 w-full gap-2 transition-all duration-300 bg-[#FAF8F5] border-b border-[#E2DCC8]/80 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Close Button that smoothly rotates to × */}
            <button
              type="button"
              onClick={() => setIsTopDrawerOpen(false)}
              className="p-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#474732] active:scale-95 transition-all cursor-pointer shadow-3xs flex items-center justify-center min-h-[38px] min-w-[38px] shrink-0"
              title={t.closeAction || 'إغلاق'}
              aria-label={t.closeAction || 'إغلاق'}
            >
              <X className="w-5 h-5 transition-transform duration-300 transform rotate-90" />
            </button>

            {/* Full-width Horizontal Scrollable Action Drawer */}
            <div className="flex-1 flex items-center space-x-2 space-x-reverse overflow-x-auto scrollbar-none py-1 px-1 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* 1. الأذكار (Athkar) */}
              <button
                type="button"
                onClick={() => {
                  setIsFullAthkarModalOpen(true);
                  setIsTopDrawerOpen(false);
                }}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-[#F3E8FF] hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px]"
                title={t('nav.dhikr_title')}
              >
                <Sparkles className="w-4 h-4 text-[#7C3AED] animate-pulse shrink-0" />
                <span>{t('nav.dhikr')}</span>
              </button>

              {/* 2. قائمة المهام اليومية (Daily Tasks Checklist) */}
              <button
                type="button"
                onClick={() => {
                  switchTab('diaries', { subTab: 'tasks' });
                  setActiveDiariesSubTab('tasks');
                  setEditingDiary(null);
                  setIsTopDrawerOpen(false);
                }}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-[#EEF1EB] hover:bg-[#E2E9DF] text-[#556E4F] border border-[#DCE4D8] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px]"
                title={t.dailyTasksSubtabLabel}
              >
                <span className="flex items-center justify-center bg-[#C5221F] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full border border-white shrink-0">
                  {incompleteTasksCount}
                </span>
                <span>{t.dailyTasksSubtabLabel || 'المهام'}</span>
              </button>

              {/* 3. جدار الامتنان (Gratitude Wall) */}
              <button
                type="button"
                onClick={() => {
                  switchTab('diaries', { subTab: 'gratitude' });
                  setActiveDiariesSubTab('gratitude');
                  setEditingDiary(null);
                  setIsTopDrawerOpen(false);
                }}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-[#FAF0F4] hover:bg-[#FCE8F0] text-[#9D4E6B] border border-[#F3D7E2] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px]"
                title={t.gratitudeSubtab}
              >
                <span className="text-base shrink-0">🌸</span>
                <span>{t.gratitudeSubtab || 'الامتنان'}</span>
              </button>

              {/* 4. تمارين العلاج المعرفي (CBT Exercises) */}
              <button
                type="button"
                onClick={() => {
                  switchTab('diaries', { subTab: 'cbt' });
                  setActiveDiariesSubTab('cbt');
                  setEditingDiary(null);
                  setIsTopDrawerOpen(false);
                }}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-[#F0F4FA] hover:bg-[#E5EEF8] text-[#3E5C76] border border-[#D3E0EA] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px]"
                title={t.cbtSubtabLabel}
              >
                <span className="text-base shrink-0">🧠</span>
                <span>{t.cbtSubtabLabel || 'التمارين'}</span>
              </button>

              {/* 5. التنبيهات / الإشعارات (Smart Reminders with unread/active count badge) */}
              <button
                type="button"
                onClick={() => {
                  setShowSmartRemindersModal(true);
                  setIsTopDrawerOpen(false);
                }}
                className="relative flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px]"
                title={t('nav.smart_reminders')}
              >
                <BellRing className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{t('nav.smart_reminders')}</span>
                {(settings.reminders?.length || 0) > 0 && (
                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-black">
                    {settings.reminders.length}
                  </span>
                )}
              </button>

              {/* 6. تسجيل الدخول / الحساب (Login / Account status) */}
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsTopDrawerOpen(false);
                }}
                className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 border rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] ${
                  currentUser
                    ? 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
                title={t('nav.account_title')}
              >
                {currentUser ? (
                  <>
                    <Cloud className="w-4 h-4 text-teal-200 shrink-0" />
                    <span className="truncate max-w-[90px]">{currentUser.name || currentUser.email.split('@')[0]}</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t('nav.sign_in')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 💻 Desktop Header (>= 768px): Structured Desktop Layout with Central Navigation Tabs */}
        <div className="hidden md:flex max-w-[1440px] mx-auto px-4 lg:px-6 py-2.5 items-center justify-between gap-4">

          {/* 🌟 Zone 1: Protected Branding Card (Zero-Occlusion, full size) */}
          <div className="flex items-center space-x-3 space-x-reverse shrink-0 select-none w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 bg-[#8B9D83] rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Brain className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5 space-x-reverse">
                  <h1 className="text-base font-extrabold tracking-tight text-[#3A3A3A]">
                    {t('nav.hayat_ai').replace(/\s*AI\s*/i, '')}
                  </h1>
                  <span className="text-xs font-black bg-[#8B9D83] text-white px-1.5 py-0.5 rounded-md leading-none">
                    AI
                  </span>
                </div>
                <p className="text-[9px] text-gray-500 font-bold mt-0.5 flex flex-wrap items-center gap-1.5 max-w-full">
                  <span>{t('nav.subtitle')}</span>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <span className={`inline-flex items-center space-x-1 space-x-reverse text-[9px] font-extrabold px-2 py-0.5 rounded-full border transition-all ${
                    autoSaveStatus === 'saving'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${autoSaveStatus === 'saving' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    <span>{autoSaveStatus === 'saving' ? t('nav.saving') : `${t('nav.auto_saved')} ${lastAutoSaveTime ? `(${lastAutoSaveTime})` : '💾'}`}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 🧭 Zone 2: Desktop Center Navigation Bar */}
          <nav className="flex items-center bg-[#F4F1EA] p-1 rounded-2xl border border-[#E2DCC8]/80 shadow-inner shrink-0" aria-label="Desktop Navigation">
            {[
              { id: 'dashboard', label: t('nav.home'), icon: Calendar },
              { id: 'diaries', label: t('nav.diaries'), icon: BookOpen },
              { id: 'advisor', label: t('nav.advisor'), icon: Brain },
              { id: 'analytics', label: t('nav.progress'), icon: Activity },
              { id: 'settings', label: t('nav.settings'), icon: SettingsIcon }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#4E685B] shadow-xs font-black'
                      : 'text-gray-600 hover:text-[#3A3A3A] hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#8B9D83]' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 🎯 Zones 2 & 3: Navigation Action Bar & Utility Controls */}
          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end w-full md:w-auto">

            {/* 1. 📿 Direct Athkar Button (أذكار) */}
            <button
              type="button"
              onClick={() => {
                setIsFullAthkarModalOpen(true);
                collapseHeaderOnMobile();
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#F3E8FF] text-[#7C3AED] border border-[#DDD6FE] rounded-xl text-xs font-black shadow-3xs hover:bg-[#EDE9FE] active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
              title={t('nav.dhikr_title')}
              aria-label={t('nav.dhikr')}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED] animate-pulse shrink-0" />
              <span>{t('nav.dhikr')}</span>
            </button>

            {/* 2. 📋 Habits & Tasks Button (المهام اليومية) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('diaries');
                setActiveDiariesSubTab('tasks');
                setEditingDiary(null);
                collapseHeaderOnMobile();
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#EEF1EB] text-[#556E4F] border border-[#DCE4D8] rounded-xl text-xs font-black shadow-3xs hover:bg-[#E2E9DF] active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
              title={t('nav.daily_tasks')}
              aria-label={t('nav.daily_tasks')}
            >
              <span className="flex items-center justify-center bg-[#C5221F] text-white text-[10px] font-black w-4.5 h-4.5 rounded-full border border-white shrink-0">
                {incompleteTasksCount}
              </span>
              <span>{t('nav.daily_tasks')}</span>
            </button>

            {/* 3. ✍️ My Diary Thoughts Button (خواطري) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('diaries');
                setActiveDiariesSubTab('journal');
                setDiaryTypeFilter('thought');
                setEditingDiary(null);
                collapseHeaderOnMobile();
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#FCF5DE] text-[#A67E2E] border border-[#E9E1C4] rounded-xl text-xs font-black shadow-3xs hover:bg-[#F9ECC4] active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
              title={t('nav.my_thoughts')}
              aria-label={t('nav.my_thoughts')}
            >
              <span>{t('nav.my_thoughts')}</span>
              <span className="flex items-center justify-center w-5 h-5 bg-[#F8ECB8] text-[#8C6418] rounded-full border border-[#E1D39D] shrink-0">
                <PenTool className="w-3 h-3 text-[#8C6418]" />
              </span>
            </button>

            {/* 4. 🎓 Therapist Session Button (جلسة العلاج) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('analytics');
                setAnalyticsSubTab('report');
                setEditingDiary(null);
                collapseHeaderOnMobile();
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-4 py-2 bg-[#446A5E] hover:bg-[#3B5A50] text-white rounded-xl text-xs font-black shadow-3xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
              title={t('nav.therapy_session')}
              aria-label={t('nav.therapy_session')}
            >
              <span>{t('nav.therapy_session')}</span>
              <span className="flex items-center justify-center w-5 h-5 bg-[#FCF5DE] border border-[#E9E1C4] rounded-full shrink-0 shadow-3xs animate-pulse">
                <svg className="w-3 h-3 text-[#A67E2E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </span>
            </button>

            {/* 5. 👤 Personal Account / Cloud Sync Login Button */}
            <button
              type="button"
              onClick={() => {
                setIsAuthModalOpen(true);
                collapseHeaderOnMobile();
              }}
              className={`flex items-center space-x-1.5 space-x-reverse px-3 py-2 border rounded-xl text-xs font-black shadow-3xs hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px] ${
                currentUser
                  ? 'bg-teal-700 text-white border-teal-800 hover:bg-teal-800'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
              title={t('nav.account_title')}
              aria-label={t('nav.account_title')}
            >
              {currentUser ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-teal-200 shrink-0" />
                  <span className="truncate max-w-[90px]">{currentUser.name || currentUser.email.split('@')[0]}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{t('nav.sign_in')}</span>
                </>
              )}
            </button>

            {/* 6. 🌐 Language Switcher Button */}
            <button
              type="button"
              onClick={() => setShowLanguagesModal(true)}
              className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-2 bg-amber-50/90 text-amber-950 border border-amber-300 rounded-xl text-xs font-black shadow-3xs hover:bg-amber-100 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
              title={t('nav.switch_language')}
              aria-label={t('nav.switch_language')}
            >
              <Globe className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-sm leading-none">{langInfo.flag}</span>
              <span className="text-[11px] font-extrabold">{langInfo.nativeName}</span>
            </button>

            {/* 7. 🖥️ Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="flex items-center space-x-1 space-x-reverse px-2.5 py-2 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-black shadow-3xs hover:bg-blue-100 active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
              title={t('nav.fullscreen_title')}
              aria-label={t('nav.fullscreen')}
            >
              <Maximize className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
              <span className="text-[11px]">{t('nav.fullscreen')}</span>
            </button>

            {/* 8. 🔒 Lock Button */}
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('appLockEnabled', 'true');
                setSettings(prev => ({ ...prev, appLockEnabled: true, isAppLocked: true }));
                collapseHeaderOnMobile();
              }}
              className="p-2.5 bg-[#EEECDF] border border-[#D1CCBA] text-[#5A5A40] rounded-xl hover:bg-[#DDD8C3] active:scale-95 transition-all cursor-pointer shadow-3xs shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center"
              title={t('nav.lock_app')}
              aria-label={t('nav.lock_app')}
            >
              <Lock className="w-4 h-4 text-[#4A4A30]" />
            </button>

            {/* --- ⚙️ SMART OVERFLOW "MORE" MENU DROPDOWN --- */}
            <div className="relative shrink-0" ref={navMoreMenuRef}>
              <button
                type="button"
                onClick={() => setShowNavMoreMenu(prev => !prev)}
                className={`p-2 rounded-xl border transition-all cursor-pointer shadow-3xs flex items-center justify-center min-h-[38px] min-w-[38px] ${
                  showNavMoreMenu
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                    : 'bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] border-[#D1CCBA]'
                }`}
                title={t('nav.more_options')}
                aria-label={t('nav.more_options')}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Overflow Menu Popover */}
              {showNavMoreMenu && (
                <div
                  className={`absolute top-full mt-2 ${isRtl ? 'left-0' : 'right-0'} w-60 bg-white border border-[#E2DCC8] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 font-sans text-start`}
                >
                  {/* Language */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNavMoreMenu(false);
                      setShowLanguagesModal(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] text-xs font-bold text-[#3A3A3A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{t('nav.switch_language')}</span>
                    </div>
                    <span className="text-xs font-normal">{langInfo.flag} {langInfo.nativeName}</span>
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNavMoreMenu(false);
                      handleToggleFullscreen();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] text-xs font-bold text-[#3A3A3A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{t('nav.fullscreen')}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">F11</span>
                  </button>

                  {/* Smart Reminders */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNavMoreMenu(false);
                      setShowSmartRemindersModal(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] text-xs font-bold text-[#3A3A3A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-[#8B9D83] shrink-0" />
                      <span>{t('nav.smart_reminders')}</span>
                    </div>
                    <span className="text-[10px] bg-[#8B9D83]/20 text-[#5A5A40] px-1.5 py-0.5 rounded-md font-bold">
                      {settings.reminders?.length || 0}
                    </span>
                  </button>

                  {/* Rating / Feedback */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowNavMoreMenu(false);
                      setShowRatingModal(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] text-xs font-bold text-[#3A3A3A] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{t('nav.rate_feedback')}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">★ ★ ★ ★ ★</span>
                  </button>

                  {/* App Lock */}
                  <div className="border-t border-[#F0EDE4] pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNavMoreMenu(false);
                        localStorage.setItem('appLockEnabled', 'true');
                        setSettings(prev => ({ ...prev, appLockEnabled: true, isAppLocked: true }));
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 text-xs font-extrabold text-[#5A5A40] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#4A4A30] shrink-0" />
                        <span>{t('nav.lock_app')}</span>
                      </div>
                      <span className="text-[10px] bg-[#EEECDF] px-2 py-0.5 rounded-md text-[#5A5A40]">🔒 PIN</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* 🔙 Universal Back Navigation: Desktop Sticky Bar vs Mobile Draggable Floating Pill */}
      {(activeTab !== 'dashboard' || editingDiary !== null || navHistory.length > 0 || navStackCount > 0) && (
        <>
          {/* Mobile Floating Draggable Back Button */}
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            className="fixed top-16 left-4 z-40 sm:hidden cursor-grab active:cursor-grabbing"
          >
            <button
              type="button"
              onClick={handleGoBack}
              className="flex items-center space-x-1.5 space-x-reverse p-2.5 bg-[#4E685B] text-white hover:bg-[#3F5449] border-2 border-[#E5E1D4] rounded-full shadow-2xl transition-all active:scale-95 cursor-pointer group"
              title={t('nav.back_mobile_title')}
            >
              <ArrowRight className={`w-5 h-5 text-[#FEFAE0] group-hover:-translate-x-0.5 transition-transform shrink-0 ${isRtl ? '' : 'rotate-180'}`} />
              {(navHistory.length + navStackCount) > 0 && (
                <span className="text-[11px] bg-white text-[#4E685B] px-2 py-0.5 rounded-full font-black leading-none shadow-xs">
                  {navHistory.length + navStackCount}
                </span>
              )}
            </button>
          </motion.div>

          {/* Desktop Sticky Navigation Bar (Aligned with header without overlapping) */}
          <div className="hidden sm:block bg-[#F9F7F2]/95 backdrop-blur-md border-b border-[#E2DCC8]/80 py-2 px-4 sticky top-[64px] z-20 transition-all duration-300 shadow-3xs" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center space-x-2 space-x-reverse px-3.5 py-1.5 bg-white hover:bg-[#8B9D83] text-[#3A3A3A] hover:text-white border border-[#E2DCC8] hover:border-[#8B9D83] rounded-2xl text-xs font-black shadow-2xs hover:shadow-md transition-all active:scale-95 cursor-pointer group shrink-0"
                title={t('nav.back_title')}
              >
                <ArrowRight className={`w-4 h-4 text-[#8B9D83] group-hover:text-white group-hover:-translate-x-1 transition-transform ${isRtl ? '' : 'rotate-180'}`} />
                <span>{t('nav.back_btn')}</span>
                {(navHistory.length + navStackCount) > 0 && (
                  <span className="text-[10px] bg-[#EEF1EB] group-hover:bg-white/20 text-[#556E4F] group-hover:text-white px-1.5 py-0.5 rounded-full font-black">
                    {navHistory.length + navStackCount}
                  </span>
                )}
              </button>

              {/* Current Breadcrumb Location */}
              <div className="text-[11px] font-bold text-gray-500 hidden sm:flex items-center space-x-1.5 space-x-reverse bg-white/80 px-3 py-1 rounded-xl border border-[#E2DCC8]/50 shadow-3xs">
                <span className="text-gray-400">{t('nav.current_page')}</span>
                <span className="text-[#556E4F] font-black">
                  {editingDiary ? t('nav.edit_diary') :
                   activeTab === 'dashboard' ? t('nav.home') :
                   activeTab === 'diaries' ? `${t('nav.diaries')} (${activeDiariesSubTab === 'journal' ? t('nav.journal_records') : activeDiariesSubTab === 'tasks' ? t('nav.tasks') : activeDiariesSubTab === 'gratitude' ? t('nav.gratitude') : 'CBT'})` :
                   activeTab === 'advisor' ? t('nav.advisor') :
                   activeTab === 'analytics' ? t('nav.progress') :
                   activeTab === 'settings' ? t('nav.settings') : ''}
                </span>
              </div>
            </div>
          </div>
        </>
      )}



      {/* Main Content Area */}
      <main className={`max-w-4xl mx-auto px-0 md:px-6 pb-nav-safe md:pb-12 space-y-6 transition-all w-full max-w-full overflow-x-hidden ${isHeaderCollapsedOnMobile ? 'pt-10 sm:pt-6' : 'pt-6'}`}>

        {/* Offline & Cloud Background Sync Status Banner */}
        <OfflineSyncBanner appLanguage={settings?.appLanguage || 'ar'} />

        {/* Persistent In-Flight Background AI Status Indicator */}
        <BackgroundAIStatus appLanguage={settings?.appLanguage || 'ar'} />

        {/* Capacitor Android Native In-App Update Banner */}
        <AppUpdateBanner appLanguage={settings?.appLanguage || 'ar'} />

        {/* Mock Android Notification Widget at the top of the Home Dashboard for simulation */}

      {/* --- MEDIA PREVIEW MODAL --- */}
      {previewMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 keep-centered" onClick={() => setPreviewMedia(null)}>
          <button
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition-all z-50 cursor-pointer"
            onClick={() => setPreviewMedia(null)}
            title={t.imageViewerCloseBtn}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-6xl max-h-dvh max-h-screen flex items-center justify-center w-full h-full relative" onClick={e => e.stopPropagation()}>
            {previewMedia.type === 'image' && (
              <img src={previewMedia.url} className="max-w-full max-h-[90dvh] max-h-[90vh] object-contain rounded-xl shadow-2xl" alt="Preview" />
            )}
            {previewMedia.type === 'video' && (
              <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[90dvh] max-h-[90vh] rounded-xl shadow-2xl" />
            )}
            {previewMedia.type === 'audio' && (
              <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-4 min-w-[300px]">
                <Music className="w-12 h-12 text-[#8B9D83]" />
                <audio src={previewMedia.url} controls autoPlay className="w-full" />
              </div>
            )}
            {previewMedia.type === 'pdf' && (
              <div className="w-[95vw] sm:w-[90vw] h-[88dvh] max-h-[88vh] max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E2DCC8]" dir={langInfo.dir}>
                {/* PDF Header Toolbar */}
                <div className="p-3 sm:p-4 bg-[#F9F7F2] border-b border-[#E2DCC8] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center space-x-2 space-x-reverse min-w-0 flex-1">
                    <div className="p-2 bg-red-100 text-red-700 rounded-xl shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-xs sm:text-sm text-[#3A3A3A] truncate">
                        {previewMedia.name || (settings?.appLanguage === 'ar' ? 'مستند PDF' : 'PDF Document')}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {settings?.appLanguage === 'ar' ? 'معاينة المستند' : 'Document Preview'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse shrink-0">
                    <button
                      type="button"
                      onClick={() => window.open(previewMedia.url, '_blank')}
                      className="px-3 py-1.5 bg-[#2B3E50] hover:bg-[#1E2B38] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all"
                      title={settings?.appLanguage === 'ar' ? 'فتح في عارض خارجي / المتصفح' : 'Open in System / Browser Viewer'}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{settings?.appLanguage === 'ar' ? 'فتح في عارض خارجي' : 'Open Externally'}</span>
                    </button>

                    <a
                      href={previewMedia.url}
                      download={previewMedia.name || 'document.pdf'}
                      className="p-2 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl cursor-pointer transition-all shadow-3xs"
                      title={settings?.appLanguage === 'ar' ? 'تحميل' : 'Download'}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* PDF Viewer Area with Mobile Friendly Fallback */}
                <div className="flex-1 w-full h-full relative bg-gray-100 flex items-center justify-center overflow-hidden">
                  <object
                    data={previewMedia.url}
                    type="application/pdf"
                    className="w-full h-full border-0"
                  >
                    <iframe
                      src={previewMedia.url}
                      className="w-full h-full border-0"
                      title="PDF Preview"
                    />
                  </object>

                  {/* Mobile Quick Action Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 sm:hidden bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-[#E2DCC8] shadow-lg flex items-center justify-between gap-2 z-20">
                    <span className="text-[11px] font-bold text-[#5A5A40] truncate">
                      {settings?.appLanguage === 'ar' ? 'قراءة المستند بوضوح:' : 'Read document:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => window.open(previewMedia.url, '_blank')}
                      className="px-3 py-1.5 bg-[#D4A373] hover:bg-[#B58554] text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{settings?.appLanguage === 'ar' ? 'عرض المستند 📄' : 'View Document 📄'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB VIEW 1: DASHBOARD (HOME) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* Pro Feature Action Buttons Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setShowPredictiveHealthModal(true)}
                className="bg-gradient-to-r from-[#2B3E50] to-[#3B5266] hover:from-[#1E2D3B] hover:to-[#2B3E50] text-white p-3.5 rounded-2xl flex items-center justify-between text-start cursor-pointer shadow-md transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Brain className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1 break-words">
                    <h4 className="font-extrabold text-xs truncate">{t.predictiveTitle}</h4>
                    <p className="text-[10px] text-blue-100/80 line-clamp-1">{t.predictiveSub}</p>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowVoiceJournalModal(true)}
                className="bg-gradient-to-r from-[#6D5D6E] to-[#4F3B51] hover:from-[#4F3B51] hover:to-[#38283A] text-white p-3.5 rounded-2xl flex items-center justify-between text-start cursor-pointer shadow-md transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Mic className="w-4 h-4 text-purple-200" />
                  </div>
                  <div className="min-w-0 flex-1 break-words">
                    <h4 className="font-extrabold text-xs truncate">{t.voiceJournalTitle}</h4>
                    <p className="text-[10px] text-purple-100/80 line-clamp-1">{t.voiceJournalSub}</p>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-purple-200 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowOnboardingTour(true)}
                className="bg-gradient-to-r from-[#3A506B] to-[#1C2541] hover:from-[#1C2541] hover:to-[#0B132B] text-white p-3.5 rounded-2xl flex items-center justify-between text-start cursor-pointer shadow-md transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 bg-white/10 rounded-xl shrink-0">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div className="min-w-0 flex-1 break-words">
                    <h4 className="font-extrabold text-xs truncate">{t('interactiveTourTitle')}</h4>
                    <p className="text-[10px] text-cyan-100/80 line-clamp-1">{t('interactiveTourSub')}</p>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-cyan-300 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* 📅 التقويم الكامل واستعراض الأيام */}
            <div
              onClick={() => setShowCalendarModal(true)}
              className="bg-[#EBF2EA] border-2 border-dashed border-[#8B9D83]/60 hover:bg-[#E0EBE0] rounded-3xl p-4 mb-6 flex items-center justify-between cursor-pointer transition-all shadow-xs group"
            >
              <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-black text-[#4E685B] flex items-center space-x-1.5 space-x-reverse">
                  <span>📅</span>
                  <span>{t.fullCalendar}</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-[#5A5A40]/80 leading-relaxed">
                  {t.fullCalendarSub}
                </p>
              </div>
              <div className="p-3 bg-white border border-[#E2DCC8] rounded-2xl text-rose-500 shadow-xs shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
                <Calendar className="w-5.5 h-5.5" />
              </div>
            </div>

            {/* Cairo styled greeting panel */}
            <div className="bg-gradient-to-l from-[#5A5A40] to-[#8B9D83] text-white p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 left-0 translate-x-[-20%] translate-y-[-20%] w-60 h-60 bg-[#FEFAE0]/10 rounded-full blur-3xl" />
              <div className="relative z-10 space-y-2">
                <span className="text-xs font-bold text-[#FEFAE0] tracking-wide flex items-center space-x-1.5 space-x-reverse">
                  <Sparkles className="w-3.5 h-3.5 text-[#FEFAE0]" />
                  <span>{t('safeEncryptedSpace')}</span>
                </span>
                <h2 className="text-xl font-extrabold tracking-wide flex items-center space-x-2 space-x-reverse">
                  <span>{getArabicGreetingHeader()}</span>
                  <span className="text-2xl">{getArabicGreetingIcon()}</span>
                </h2>
                <p className="text-xs text-[#F9F7F2]/90 leading-relaxed max-w-xl">
                  {t.greetingDesc}
                </p>
              </div>
            </div>

            {/* 🌱 Psychological Growth Tree (Visual Gamification Component) */}
            <PsychologicalGrowthTree
              appLanguage={settings?.appLanguage || 'ar'}
              diariesCount={diaries.length}
              cbtCount={diaries.filter(d => (d.cbtWorksheets && d.cbtWorksheets.length > 0)).length}
              gratitudeCount={gratitudeCards.length}
              habitsCount={habits.filter(h => h.isCompleted).length}
              activeStreak={streakInfo.currentStreak}
              onQuickAction={(action) => {
                if (action === 'journal') startNewDiary();
                else if (action === 'gratitude') {
                  setActiveTab('diaries');
                  setActiveDiariesSubTab('gratitude');
                } else if (action === 'cbt') {
                  setActiveTab('diaries');
                  setActiveDiariesSubTab('cbt');
                } else if (action === 'habits') {
                  setActiveTab('diaries');
                  setActiveDiariesSubTab('tasks');
                }
              }}
            />

            {/* 🧠 Advanced Behavioral Correlation Engine Card */}
            <BehavioralCorrelationCard entries={diaries} appLanguage={settings?.appLanguage || 'ar'} />

            {/* 📁 شريط التدوين السريع والوصول المباشر للملفات */}
            <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold text-[#5A5A40] flex items-center space-x-2 space-x-reverse">
                <span className="p-1 bg-[#8B9D83]/10 text-[#8B9D83] rounded-lg">⚡</span>
                <span>{t.directUploadTitle}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 items-center align-middle gap-3">
                {/* 1. كتابة يومية */}
                <button
                  onClick={() => startNewDiary()}
                  className="flex flex-col items-center justify-center p-3 bg-[#F9F7F2]/60 hover:bg-[#F0EDE4]/80 border border-[#E2DCC8]/60 hover:border-[#8B9D83] rounded-2xl transition-all cursor-pointer group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-[#8B9D83]/10 text-[#8B9D83] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform mb-1.5">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div className="h-9 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-xs font-bold text-[#3A3A3A]">{t.freeWrite}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{t.freeWriteSub}</span>
                  </div>
                </button>

                {/* 2. صورة */}
                <button
                  onClick={() => {
                    markFilePickerActive();
                    document.getElementById('global-image-uploader')?.click();
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-[#F9F7F2]/60 hover:bg-[#F0EDE4]/80 border border-[#E2DCC8]/60 hover:border-[#8B9D83] rounded-2xl transition-all cursor-pointer group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform mb-1.5">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="h-9 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-xs font-bold text-[#3A3A3A]">{t.attachPhoto}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{t.attachPhotoSub}</span>
                  </div>
                </button>

                {/* 3. فيديو */}
                <button
                  onClick={() => {
                    markFilePickerActive();
                    document.getElementById('global-video-uploader')?.click();
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-[#F9F7F2]/60 hover:bg-[#F0EDE4]/80 border border-[#E2DCC8]/60 hover:border-[#8B9D83] rounded-2xl transition-all cursor-pointer group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform mb-1.5">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="h-9 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-xs font-bold text-[#3A3A3A]">{t.phoneVideo}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{t.phoneVideoSub}</span>
                  </div>
                </button>

                {/* 4. تسجيل ريكورد */}
                <button
                  onClick={() => {
                    markFilePickerActive();
                    document.getElementById('global-audio-uploader')?.click();
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-[#F9F7F2]/60 hover:bg-[#F0EDE4]/80 border border-[#E2DCC8]/60 hover:border-[#8B9D83] rounded-2xl transition-all cursor-pointer group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform mb-1.5">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="h-9 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-xs font-bold text-[#3A3A3A]">{t.audioFile}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{t.audioFileSub}</span>
                  </div>
                </button>

                {/* 5. كتاب / PDF */}
                <button
                  onClick={() => {
                    markFilePickerActive();
                    document.getElementById('global-document-uploader')?.click();
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-[#F9F7F2]/60 hover:bg-[#F0EDE4]/80 border border-[#E2DCC8]/60 hover:border-[#8B9D83] rounded-2xl transition-all cursor-pointer group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform mb-1.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="h-9 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-xs font-bold text-[#3A3A3A]">{t.bookDoc}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{t.bookDocSub}</span>
                  </div>
                </button>

                {/* 6. مستشار الذكاء الاصطناعي */}
                <button
                  onClick={() => setActiveTab('advisor')}
                  className="flex flex-col items-center justify-center p-3 bg-[#F9F7F2]/60 hover:bg-[#F0EDE4]/80 border border-[#E2DCC8]/60 hover:border-[#8B9D83] rounded-2xl transition-all cursor-pointer group h-full"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform mb-1.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="h-9 flex flex-col items-center justify-center text-center leading-tight">
                    <span className="text-xs font-bold text-[#3A3A3A]">{t.aiAdvisor}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">{t.aiAdvisorSub}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* 🎯 Streak Tracker (سلسلة الالتزام) */}
            <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* Left Side: Fire Icon & Main Numbers */}
                <div className="flex items-center space-x-4 space-x-reverse">
                  {/* Animated Flame container */}
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      filter: [
                        "drop-shadow(0px 0px 4px rgba(212,163,115,0.2))",
                        "drop-shadow(0px 0px 12px rgba(212,163,115,0.7))",
                        "drop-shadow(0px 0px 4px rgba(212,163,115,0.2))"
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className={`p-3.5 rounded-2xl flex items-center justify-center shrink-0 ${
                      streakInfo.currentStreak > 0
                        ? 'bg-[#FAEDCD] text-[#D4A373]'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Flame className={`w-8 h-8 ${streakInfo.currentStreak > 0 ? 'fill-[#D4A373]' : ''}`} />
                  </motion.div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 tracking-wider block">{t.streakTitle}</span>
                    <div className="flex items-baseline space-x-1 space-x-reverse">
                      <span className="text-2xl font-extrabold text-[#3A3A3A]">{streakInfo.currentStreak}</span>
                      <span className="text-xs text-[#5A5A40] font-semibold">{t.dayStreak}</span>
                    </div>
                  </div>
                </div>

                {/* Center Side: Live Motivational Message */}
                <div className="flex-grow md:px-4">
                  <p className="text-xs text-[#5A5A40] leading-relaxed font-medium">
                    {streakInfo.hasLoggedToday ? (
                      <span className="text-emerald-700 flex items-center space-x-1 space-x-reverse">
                        <span>✨ {t.streakActiveMsg}</span>
                      </span>
                    ) : (
                      <span>
                        {streakInfo.currentStreak === 0 ? (
                          t.streakInactiveZero
                        ) : (
                          t.streakInactiveOneLeft
                        )}
                      </span>
                    )}
                  </p>
                </div>

                {/* Right Side: Quick Stats Badges */}
                <div className="flex flex-col items-end justify-center shrink-0 border-r md:border-r border-t md:border-t-0 border-[#E2DCC8]/60 pt-3 md:pt-0 pr-4 md:pr-4 pl-4 md:pl-0">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-medium">{t.longestStreak}</span>
                    <span className="text-sm font-bold text-[#8B9D83] flex items-center justify-end space-x-1 space-x-reverse">
                      <span>🏆</span>
                      <span>{streakInfo.maxStreak} {t.daysUnit}</span>
                    </span>
                  </div>
                </div>

              </div>

              {/* 7-Day Visual Calendar Tracker */}
              <div className="border-t border-[#E2DCC8]/50 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] font-bold text-gray-400">{t.recentWeek}</span>
                <div className="flex items-center space-x-1.5 space-x-reverse overflow-x-auto scrollbar-none pb-1">
                  {getWeekDays().map((day, idx) => {
                    // Check if diaries has an entry on this day
                    const isLoggedOnDay = diaries.some(d => d.createdAt.split('T')[0] === day.isoString);
                    return (
                      <div
                        key={idx}
                        className={`px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center min-w-[42px] border ${
                          isLoggedOnDay
                            ? 'bg-[#8B9D83]/10 border-[#8B9D83]/30 text-[#8B9D83]'
                            : 'bg-[#F9F7F2]/50 border-[#E2DCC8]/40 text-gray-400'
                        }`}
                      >
                        <span className="text-[9px] font-semibold">{day.label}</span>
                        {isLoggedOnDay ? (
                          <Flame className="w-3.5 h-3.5 fill-[#D4A373] text-[#D4A373] mt-1" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-dashed border-gray-300 mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Day Selector Calendar Matrix */}
            <div className="bg-white border border-[#E2DCC8] rounded-3xl p-4 shadow-xs space-y-3">
              <span className="text-xs font-bold text-[#5A5A40] block mb-1">{t.selectDateTitle}</span>
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays().map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day.isoString)}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      selectedDate === day.isoString
                        ? 'bg-[#8B9D83] text-white scale-105 font-bold'
                        : 'bg-[#F9F7F2] hover:bg-[#F0EDE4] text-gray-700'
                    }`}
                  >
                    <span className="text-[10px] opacity-75 font-medium">{day.label}</span>
                    <span className="text-sm font-bold mt-1">{day.dayNum}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 💡 Psychological Daily Inspiration Card */}
            <div className="bg-gradient-to-br from-[#FAEDCD]/80 to-[#F9F7F2] border border-[#D4A373]/40 rounded-3xl p-6 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A373]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-[#D4A373]">
                    <Sparkles className="w-4 h-4" />
                    <span>{t.quoteTitle}</span>
                  </div>
                  <p className="text-sm md:text-base font-medium text-[#3A3A3A] leading-relaxed italic">
                    "{dailyQuote?.quote || t.quoteDefaultText}"
                  </p>
                  <span className="text-xs text-gray-400 block font-bold">— {dailyQuote?.author || t.quoteDefaultAuthor}</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse shrink-0">
                  <button
                    onClick={async () => {
                      const qT = dailyQuote?.quote || t.quoteDefaultText;
                      const qA = dailyQuote?.author || t.quoteDefaultAuthor;
                      const ok = await copyTextSafe(`"${qT}" - ${qA}`);
                      if (ok) {
                        showGlobalCopyToast(t.quoteCopiedAlert || (settings?.appLanguage === 'ar' ? 'تم نسخ الحكمة بنجاح 📋' : 'Quote copied!'), 'success');
                      } else {
                        showGlobalCopyToast(t.copyFailedToast || (settings?.appLanguage === 'ar' ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy quote'), 'error');
                      }
                    }}
                    className="p-2.5 bg-white border border-[#E2DCC8] hover:border-[#D4A373] text-[#5A5A40] rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center"
                    title={t.copyQuoteTooltip}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={fetchDailyQuote}
                    disabled={quoteLoading}
                    className="flex items-center space-x-1.5 space-x-reverse px-4 py-2.5 bg-[#8B9D83] hover:bg-[#5A5A40] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {quoteLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{t.aiInspirationBtn}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 🎯 Interactive Rapid Mood, Water & Symptoms Tracker Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Column 1: Fast Mood Slider with visual feedback */}
              <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                      <Smile className="w-4 h-4 text-[#8B9D83]" />
                      <span>{t.moodScaleTitle}</span>
                    </h3>
                    {!isMetricTouched(selectedDate, 'mood', dailyTouchedMetrics) && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                        {t.notRecordedToday || getNotRecordedTodayLabel(settings?.appLanguage || 'ar')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {t.moodScaleDesc}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-4 bg-[#F9F7F2]/50 border border-[#E2DCC8]/40 rounded-2xl space-y-4">
                  {/* Big changing emoji */}
                  <div className="text-5xl md:text-6xl animate-bounce" style={{ animationDuration: '3s' }}>
                    {(() => {
                      const score = activeDiaryForSelectedDate?.fastMoodScore || 5;
                      if (score <= 2) return '😭';
                      if (score <= 4) return '😞';
                      if (score <= 6) return '😐';
                      if (score <= 8) return '😊';
                      return '🤩';
                    })()}
                  </div>

                  {/* Rating indicator */}
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-[#5A5A40] block">
                      {t.moodRating} <span className="font-mono text-base font-extrabold text-[#8B9D83]">{activeDiaryForSelectedDate?.fastMoodScore || 5}</span> / 10
                    </span>
                    <span className="text-xs text-[#D4A373] font-bold block">
                      {(() => {
                        const score = activeDiaryForSelectedDate?.fastMoodScore || 5;
                        if (score <= 2) return t.moodDistress;
                        if (score <= 4) return t.moodAnxious;
                        if (score <= 6) return t.moodStable;
                        if (score <= 8) return t.moodContent;
                        return t.moodJoyful;
                      })()}
                    </span>
                  </div>

                  {/* Slider input */}
                  <div className="w-full px-6">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={activeDiaryForSelectedDate?.fastMoodScore || 5}
                      onChange={(e) => handleUpdateHabit('fastMood', Number(e.target.value))}
                      className="w-full h-2.5 bg-[#E2DCC8] rounded-lg appearance-none cursor-pointer accent-[#8B9D83]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold font-mono mt-1 px-1">
                      <span>1</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Interactive Water Bottle Tracker */}
              <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                      <span className="text-[#89CFF0] text-base">💧</span>
                      <span>{t.waterTrackerTitle}</span>
                    </h3>
                    {!isMetricTouched(selectedDate, 'water', dailyTouchedMetrics) && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full font-bold">
                        {t.notRecordedToday || getNotRecordedTodayLabel(settings?.appLanguage || 'ar')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {t.waterTrackerDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

                  {/* Water bottle visualization */}
                  <div className="sm:col-span-4 flex flex-col items-center justify-center">
                    <div className="w-16 h-32 border-3 border-[#89CFF0]/80 rounded-2xl relative overflow-hidden bg-white shadow-inner flex flex-col justify-end">
                      {/* Caps represent fluid level */}
                      <motion.div
                        className="bg-gradient-to-t from-[#89CFF0] to-[#A0E0FF] w-full"
                        animate={{
                          height: `${((activeDiaryForSelectedDate?.waterCups || 0) / 8) * 100}%`
                        }}
                        transition={{ type: 'spring', damping: 15 }}
                      >
                        {/* Wave animation effect */}
                        <div className="w-full h-2 bg-[#89CFF0] rounded-full opacity-60 animate-pulse" />
                      </motion.div>

                      {/* Percent text overlay */}
                      <span className="absolute inset-0 flex items-center justify-center font-mono font-extrabold text-xs text-[#5A5A40] drop-shadow-xs">
                        {Math.round(((activeDiaryForSelectedDate?.waterCups || 0) / 8) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Cups Grid Selector */}
                  <div className="sm:col-span-8 space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 8 }).map((_, idx) => {
                        const isDrunk = (activeDiaryForSelectedDate?.waterCups || 0) > idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              // If current cup clicked is equal to current level, reduce by 1, else set to this cup
                              const currentLevel = activeDiaryForSelectedDate?.waterCups || 0;
                              if (currentLevel === idx + 1) {
                                handleUpdateHabit('water', idx);
                              } else {
                                handleUpdateHabit('water', idx + 1);
                              }
                            }}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                              isDrunk
                                ? 'bg-[#89CFF0]/20 border-[#89CFF0] text-[#3399FF] scale-105 shadow-2xs'
                                : 'bg-[#F9F7F2]/50 border-[#E2DCC8]/60 hover:border-[#89CFF0] text-gray-300 hover:text-[#89CFF0]/60'
                            }`}
                            title={t('waterCupLabel', { number: idx + 1 }) || `Cup ${idx + 1}`}
                          >
                            <span className="text-xl">🥛</span>
                            <span className="text-[9px] font-bold font-mono mt-0.5">{idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-center sm:text-right">
                      <span className="text-xs font-bold text-[#5A5A40]">
                        {t.waterConsumed} <span className="font-mono text-base text-[#3399FF] font-extrabold">{activeDiaryForSelectedDate?.waterCups || 0}</span> {t('ofEightCups', { total: 8 }) || 'of 8 cups'} ({(activeDiaryForSelectedDate?.waterCups || 0) * 0.25} {t.litersUnit})
                      </span>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                        {(activeDiaryForSelectedDate?.waterCups || 0) >= 8 ? (t.hydrationGoalReached) : (t.waterRemaining)}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* 🩺 Physical Symptoms Tracker Panel */}
            <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                    <Activity className="w-4 h-4 text-red-400" />
                    <span>{t.symptomsTitle}</span>
                  </h3>
                  {!isMetricTouched(selectedDate, 'anxietySymptoms', dailyTouchedMetrics) && (
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded-full font-bold">
                      {t.notRecordedToday || getNotRecordedTodayLabel(settings?.appLanguage || 'ar')}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {t.symptomsDesc}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {[
                  { id: 'headache', label: t.symptomHeadache },
                  { id: 'heart', label: t.symptomRapidHeart },
                  { id: 'breath', label: t.symptomShortnessBreath },
                  { id: 'muscle', label: t.symptomBackTension },
                  { id: 'fatigue', label: t.symptomFatigue },
                  { id: 'insomnia', label: t.symptomPoorSleep },
                  { id: 'stomach', label: t.symptomStomach },
                  { id: 'sweat', label: t.symptomTremors },
                ].map(symptom => {
                  const currentSymptoms = activeDiaryForSelectedDate?.symptomsChecklist || [];
                  const isChecked = currentSymptoms.includes(symptom.id);

                  return (
                    <button
                      key={symptom.id}
                      onClick={() => {
                        let updated: string[];
                        if (isChecked) {
                          updated = currentSymptoms.filter(x => x !== symptom.id);
                        } else {
                          updated = [...currentSymptoms, symptom.id];
                        }
                        handleUpdateHabit('symptoms', updated);
                      }}
                      className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-red-50 border-red-300 text-red-700 shadow-2xs font-extrabold scale-102'
                          : 'bg-[#F9F7F2]/60 hover:bg-[#F0EDE4] border-[#E2DCC8]/60 text-[#5A5A40]'
                      }`}
                    >
                      {symptom.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🧘 Box Breathing interactive psychiatric guide */}
            <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                    <span className="text-base">🧘</span>
                    <span>{t('boxBreathingTitle')}</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {t('boxBreathingDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setIsBreathingActive(!isBreathingActive)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer transition-all ${
                    isBreathingActive
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-[#8B9D83] hover:bg-[#5A5A40] text-white'
                  }`}
                >
                  {isBreathingActive ? t('stopBreathingBtn') : t('startBreathingBtn')}
                </button>
              </div>

              {isBreathingActive && (
                <div className="flex flex-col items-center justify-center py-6 bg-[#F9F7F2]/40 border border-[#E2DCC8]/50 rounded-2xl space-y-6 relative overflow-hidden">

                  {/* Large Pulse animation circle */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <motion.div
                      className={`absolute inset-0 rounded-full ${
                        breathingPhase === 'inhale' ? 'bg-emerald-400/20' :
                        breathingPhase === 'hold1' ? 'bg-amber-400/20' :
                        breathingPhase === 'exhale' ? 'bg-blue-400/20' : 'bg-purple-400/20'
                      }`}
                      animate={{
                        scale:
                          breathingPhase === 'inhale' ? [1, 1.4] :
                          breathingPhase === 'hold1' ? 1.4 :
                          breathingPhase === 'exhale' ? [1.4, 1] : 1
                      }}
                      transition={{ duration: 4, ease: 'easeInOut' }}
                    />

                    <div className={`w-28 h-28 rounded-full shadow-md flex flex-col items-center justify-center text-white font-extrabold ${
                      breathingPhase === 'inhale' ? 'bg-emerald-500' :
                      breathingPhase === 'hold1' ? 'bg-amber-500' :
                      breathingPhase === 'exhale' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}>
                      <span className="text-xl font-black font-mono">{breathingTimer}</span>
                      <span className="text-[10px] tracking-wider mt-0.5">{t('secondsRemaining')}</span>
                    </div>
                  </div>

                  {/* Status Indicator text */}
                  <div className="text-center space-y-1 z-10">
                    <span className="text-sm font-black text-[#3A3A3A] block">
                      {breathingPhase === 'inhale' && (t.breathingInhaleMessage)}
                      {breathingPhase === 'hold1' && (t.breathingHold1Message)}
                      {breathingPhase === 'exhale' && (t.breathingExhaleMessage)}
                      {breathingPhase === 'hold2' && (t.breathingHold2Message)}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-bold">
                      {t('completedCycles')} <span className="font-mono text-xs font-black text-[#8B9D83]">{breathingCycle}</span> {t('cyclesCount')}
                    </span>
                  </div>

                </div>
              )}
            </div>

            {/* Self-Care & Habits Tracker checklist for current selected date */}
            <div id="habits-tracker" className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                  <CheckSquare className="w-4 h-4 text-[#8B9D83]" />
                  <span>{t('selfCareGoalsTitle')}</span>
                </h3>
                <span className="text-[10px] text-gray-400 font-bold">{t('autoSaveLabel')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 💤 Sleep hours track */}
                <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#E2DCC8]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <Moon className="w-4 h-4 text-blue-500" />
                      <span>{t('sleepHoursLabel')}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isMetricTouched(selectedDate, 'sleep', dailyTouchedMetrics) && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold">
                          {t.notRecordedToday || getNotRecordedTodayLabel(settings?.appLanguage || 'ar')}
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-[#5A5A40]">
                        {activeDiaryForSelectedDate?.sleepHours || 8} {t('hoursUnit')}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={activeDiaryForSelectedDate?.sleepHours || 8}
                    onChange={(e) => handleUpdateHabit('sleep', e.target.value)}
                    className="w-full h-1.5 bg-[#E2DCC8] rounded-lg appearance-none cursor-pointer accent-[#8B9D83]"
                  />
                </div>

                {/* 🏃 Sports Workout duration */}
                <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#E2DCC8]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <Activity className="w-4 h-4 text-[#8B9D83]" />
                      <span>{t('sportsDurationLabel')}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isMetricTouched(selectedDate, 'exercise', dailyTouchedMetrics) && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded-md font-bold">
                          {t.notRecordedToday || getNotRecordedTodayLabel(settings?.appLanguage || 'ar')}
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-[#8B9D83]">
                        {activeDiaryForSelectedDate?.sportsDuration || 0} {t('minutesUnit')}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="5"
                    value={activeDiaryForSelectedDate?.sportsDuration || 0}
                    onChange={(e) => handleUpdateHabit('sports', e.target.value)}
                    className="w-full h-1.5 bg-[#E2DCC8] rounded-lg appearance-none cursor-pointer accent-[#8B9D83]"
                  />
                </div>

                {/* 💊 Medication Track */}
                <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#E2DCC8]/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                    <Pill className="w-4 h-4 text-[#D4A373]" />
                    <span>{t('medicationDoseLabel')}</span>
                  </span>
                  <button
                    onClick={() => {
                      const current = activeDiaryForSelectedDate?.medications?.[0]?.taken || false;
                      handleUpdateHabit('medication', !current);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeDiaryForSelectedDate?.medications?.[0]?.taken
                        ? 'bg-[#8B9D83] text-white shadow-xs'
                        : 'bg-[#F0EDE4] text-[#5A5A40]'
                    }`}
                  >
                    {activeDiaryForSelectedDate?.medications?.[0]?.taken ? t('medicationTakenBtn') : t('medicationPendingBtn')}
                  </button>
                </div>
              </div>
            </div>

            {/* 🎯 Daily Habits Tracker (تتبع العادات السلوكية والروتين اليومي) */}
            <div id="custom-habits-tracker" className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                    <span className="text-base">🎯</span>
                    <span>{t('habitsTrackerTitle')}</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 font-medium">
                    {t.habitsTrackerSub}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddHabitModal(true)}
                  className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-1.5 bg-[#8B9D83] hover:bg-[#5A5A40] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span>{t('addHabitBtnLabel')}</span>
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center space-x-1.5 space-x-reverse overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: t.allCategoriesFilter },
                  { id: 'health', label: t.healthCategoryFilter },
                  { id: 'mind', label: t.mindCategoryFilter },
                  { id: 'sport', label: t.sportCategoryFilter },
                  { id: 'culture', label: t.cultureCategoryFilter },
                  { id: 'custom', label: t.customCategoryFilter },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedHabitCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                      selectedHabitCategory === tab.id
                        ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-xs'
                        : 'bg-[#F9F7F2]/80 hover:bg-[#F0EDE4] text-[#5A5A40] border-[#E2DCC8]/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Habits List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {habits
                  .filter(h => selectedHabitCategory === 'all' || h.category === selectedHabitCategory)
                  .map(habit => {
                    const isCompleted = !!habit.history[selectedDate];
                    const catInfo = HABIT_CATEGORIES[habit.category] || HABIT_CATEGORIES.custom;

                    return (
                      <div
                        key={habit.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                          isCompleted
                            ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                            : 'bg-[#F9F7F2]/30 border-[#E2DCC8]/50 hover:border-[#8B9D83]/60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 space-x-reverse">
                          {/* Toggle Button */}
                          <button
                            onClick={() => toggleHabitCompletion(habit.id, selectedDate)}
                            className={`w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isCompleted
                                ? 'bg-[#8B9D83] text-white scale-105 shadow-xs'
                                : 'border border-[#E2DCC8] hover:border-[#8B9D83] text-transparent hover:bg-white'
                            }`}
                          >
                            <span className="text-[10px] font-bold">✓</span>
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 space-x-reverse">
                              {habit.icon && <span className="text-sm shrink-0 font-bold">{habit.icon}</span>}
                              <span className={`text-xs font-bold block transition-all ${isCompleted ? 'line-through text-gray-400' : 'text-[#3A3A3A]'}`}>
                                {getHabitDisplayName(habit, t)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${catInfo.color}`}>
                                {getHabitCategoryLabel(habit.category, t)}
                              </span>
                              {habit.reminderTime && (
                                <span className="text-[9px] text-gray-400 flex items-center space-x-0.5 space-x-reverse">
                                  <span>⏰ {habit.reminderTime}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <button
                            onClick={() => triggerSimulatedHabitNotification(habit)}
                            className="p-1.5 text-[#5A5A40] hover:text-[#D4A373] hover:bg-[#FAEDCD]/50 rounded-lg transition-colors cursor-pointer"
                            title={t.simulateReminderNotifTitle}
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title={t.deleteHabitBtnTitle}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {habits.filter(h => selectedHabitCategory === 'all' || h.category === selectedHabitCategory).length === 0 && (
                  <div className="col-span-full py-8 text-center bg-[#F9F7F2]/50 border border-dashed border-[#E2DCC8]/60 rounded-2xl">
                    <p className="text-xs text-gray-400 font-medium">{t.noHabitsInCategory}</p>
                    <button
                      onClick={() => setShowAddHabitModal(true)}
                      className="text-xs font-bold text-[#8B9D83] underline mt-1.5 block mx-auto cursor-pointer"
                    >
                      {t.addFirstHabitNowBtn}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 📊 Habits Evaluation & Psychiatric Insights Panel */}
            <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                  <span className="text-base">📊</span>
                  <span>{t('aiBehavioralAssessmentTitle')}</span>
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  {t.habitEvaluationPeriodSub}
                </p>
              </div>

              {/* Timeframe selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'daily', label: t.evalDailyLabel },
                  { id: 'weekly', label: t.evalWeeklyLabel },
                  { id: 'monthly', label: t.evalMonthlyLabel },
                  { id: 'quarterly', label: t.evalQuarterlyLabel },
                  { id: 'semi-annually', label: t.evalSemiAnnuallyLabel },
                  { id: 'annually', label: t.evalAnnuallyLabel },
                  { id: 'custom', label: t.evalCustomLabel },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setHabitPeriod(p.id as any)}
                    className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      habitPeriod === p.id
                        ? 'bg-[#8B9D83] text-white border-[#8B9D83]'
                        : 'bg-[#F9F7F2]/60 hover:bg-[#F0EDE4] text-[#5A5A40] border-[#E2DCC8]/60'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom date range inputs (only if custom is selected) */}
              {habitPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#F9F7F2] rounded-2xl border border-[#E2DCC8]/60">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5A5A40]">{t.startDateLabel}</label>
                    <input
                      type="date"
                      value={habitCustomStart}
                      onChange={e => setHabitCustomStart(e.target.value)}
                      className="w-full bg-white border border-[#E2DCC8] rounded-xl px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5A5A40]">{t.endDateLabel}</label>
                    <input
                      type="date"
                      value={habitCustomEnd}
                      onChange={e => setHabitCustomEnd(e.target.value)}
                      className="w-full bg-white border border-[#E2DCC8] rounded-xl px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={generateHabitReport}
                disabled={habitEvaluationLoading || habits.length === 0}
                className="w-full py-2.5 bg-[#8B9D83] hover:bg-[#5A5A40] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 space-x-reverse cursor-pointer shadow-xs"
              >
                {habitEvaluationLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>{t.analyzingBehavioralDataReport}</span>
                  </>
                ) : (
                  <>
                    <span>🧠</span>
                    <span>{t('generateBehavioralReportBtn')}</span>
                  </>
                )}
              </button>

              {/* Evaluation Report Result Display Box */}
              {habitEvaluationReport && (
                <div className="p-5 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2DCC8]/60 pb-2">
                    <span className="text-xs font-extrabold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <span>📊</span>
                      <span>{t.behavioralReportHeader}</span>
                    </span>
                    <span className="text-[9px] bg-[#8B9D83]/10 text-[#8B9D83] px-2 py-0.5 rounded-full font-bold">
                      {t.mentalHealthAiAdvisorRole}
                    </span>
                  </div>

                  <div className="text-xs text-[#3A3A3A] leading-relaxed whitespace-pre-wrap font-sans font-normal space-y-4">
                    {habitEvaluationReport}
                  </div>
                </div>
              )}
            </div>

            {/* Life Map timeline view for selected day */}
            <LifeMap selectedDate={selectedDate} diaries={diaries} appLanguage={settings?.appLanguage || 'ar'} />

            {/* Quick tips display for psychiatric support */}
            <div className="p-4 bg-[#FAEDCD]/40 border border-[#D4A373]/30 text-[#D4A373] rounded-2xl text-xs leading-relaxed flex items-start space-x-3 space-x-reverse">
              <span className="text-lg">💡</span>
              <div>
                <strong className="block font-bold mb-0.5">{t.mentalHealthTipOfDayHeader}</strong>
                <span>{t.boxBreathingMentalHealthTip}</span>
              </div>
            </div>

          </div>
        )}

        {/* --- TAB VIEW 2: DIARIES JOURNAL (DIARY WRITING) --- */}
        {activeTab === 'diaries' && (
          <div className="space-y-6">

            {/* Editor Container if editing or creating a diary */}
            {editingDiary ? (
              <div className={`${isDiaryEditorFullscreen ? 'fixed inset-0 z-[9990] h-[100dvh] w-full rounded-none p-3 sm:p-6 overflow-y-auto' : 'rounded-none sm:rounded-3xl p-3 sm:p-6'} bg-white border-y sm:border border-[#E2DCC8] shadow-xs space-y-5 sm:space-y-6 w-full max-w-full overflow-x-hidden mx-0`}>

                {/* Editor Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#E2DCC8]/55 flex-wrap gap-2">
                  <h3 className="font-bold text-[#3A3A3A] text-base">
                    {isNewEntry ? t.newJournalHeader : t.editJournalHeader}
                  </h3>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button type="button" data-compact-control="true" onClick={() => setIsDiaryEditorFullscreen(v => !v)} className="inline-flex items-center justify-center w-9 h-9 min-h-0 min-w-0 rounded-lg bg-[#EEF1EB] text-[#2D6A4F] border border-[#DCE4D8]" aria-label={isDiaryEditorFullscreen ? (isAr ? 'استعادة المحرر' : 'Restore editor') : (isAr ? 'ملء شاشة المحرر' : 'Fullscreen editor')}>
                      {isDiaryEditorFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    {!isNewEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleArchiveDiary(editingDiary.id);
                          const nextState = !editingDiary.isArchived;
                          setEditingDiary(prev => prev ? { ...prev, isArchived: nextState } : null);
                          if (nextState) {
                            setEditingDiary(null);
                          }
                        }}
                        className="text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 space-x-reverse"
                      >
                        <Archive className="w-3.5 h-3.5 text-amber-700" />
                        <span>{editingDiary.isArchived ? t.restoreAction : t.archiveAction}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingDiary(null);
                        setIsNewEntry(false);
                        setDiaryAiAnswer('');
                      }}
                      className="text-xs font-semibold text-[#5A5A40] hover:text-[#3A3A3A] bg-[#F0EDE4] px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      {t.cancelAndSaveDraft}
                    </button>
                  </div>
                </div>

                {/* Title & Star Rating Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5A5A40] mb-1.5">{t.journalTitleLabel}</label>
                    <input
                      type="text"
                      value={editingDiary.title}
                      onChange={(e) => setEditingDiary(prev => prev ? { ...prev, title: e.target.value } : null)}
                      placeholder={t.journalTitlePlaceholder}
                      className="w-full bg-[#F9F7F2] hover:bg-[#F0EDE4] focus:bg-white border border-[#E2DCC8] focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] focus:outline-none rounded-xl px-4 py-2 text-sm text-[#3A3A3A] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5A5A40] mb-1.5">{t.starRatingLabel}</label>
                    <div className="flex items-center space-x-1.5 space-x-reverse h-9">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setEditingDiary(prev => prev ? { ...prev, importance: stars } : null)}
                          className="focus:outline-none cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 transition-transform hover:scale-110 ${
                              stars <= editingDiary.importance ? 'text-[#D4A373] fill-[#D4A373]' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs text-gray-400 mr-2">({editingDiary.importance} {t.outOfFiveStars})</span>
                    </div>
                  </div>
                </div>

                {/* شريط اختيار نوع التدوينة الموحد (Horizontal Scrollable Type Selector) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#5A5A40]">{t.entryClassificationLabel}</label>
                    <span className="text-[10px] font-bold text-gray-400">
                      {t.scrollHint}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 scrollbar-none w-full max-w-full">
                    {ALL_JOURNAL_TYPES.map((typeKey) => {
                      const cfg = getJournalTypeConfig(typeKey);
                      const isSelected = (editingDiary.diaryType || 'diary') === typeKey;
                      const label = getJournalTypeLabel(typeKey, t);

                      return (
                        <button
                          key={typeKey}
                          type="button"
                          onClick={() => setEditingDiary(prev => prev ? { ...prev, diaryType: typeKey } : null)}
                          className={`shrink-0 py-2.5 px-3.5 rounded-2xl text-xs font-black border transition-all cursor-pointer flex items-center space-x-1.5 space-x-reverse ${
                            isSelected
                              ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-3xs font-extrabold scale-[1.02]'
                              : 'bg-[#F9F7F2] text-[#5A5A40] border-[#E2DCC8] hover:bg-[#F0EDE4] hover:border-[#8B9D83]/50'
                          }`}
                        >
                          <span className="text-sm sm:text-base">{cfg.icon}</span>
                          <span className="whitespace-nowrap">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Subtle guidance of the selected type */}
                  {(() => {
                    const desc = getJournalTypeDescription(editingDiary.diaryType, t);
                    return (
                      <p className="text-[11px] text-[#5A5A40]/80 font-bold bg-[#FBFBFA] border border-[#E2DCC8]/60 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                        <span>✨</span>
                        <span>{desc}</span>
                      </p>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A5A40] mb-1.5">{t.behavioralMoodLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {['سعيد', 'متحمس', 'مرتاح', 'طبيعي', 'حزين', 'مكتئب', 'قلق', 'غاضب', 'مرهق', 'ممتن'].map((m) => {
                      const isSelected = editingDiary.moods.includes(m);
                      const moodTranslationMap: Record<string, string> = {
                        'سعيد': t.moodHappy,
                        'متحمس': t.moodExcited,
                        'مرتاح': t.moodRelaxed,
                        'طبيعي': t.moodNormal,
                        'حزين': t.moodSad,
                        'مكتئب': t.moodDepressed,
                        'قلق': t.moodAnxious,
                        'غاضب': t.moodAngry,
                        'مرهق': t.moodExhausted,
                        'ممتن': t.moodGrateful,
                      };
                      const displayMood = moodTranslationMap[m] || m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setEditingDiary(prev => {
                              if (!prev) return null;
                              const currentMoods = [...prev.moods];
                              if (currentMoods.includes(m)) {
                                return { ...prev, moods: currentMoods.filter(x => x !== m) };
                              } else {
                                return { ...prev, moods: [...currentMoods, m] };
                              }
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#8B9D83] text-white border-[#8B9D83] scale-105 font-semibold'
                              : 'bg-[#F9F7F2] text-[#5A5A40] border-[#E2DCC8] hover:bg-[#F0EDE4]'
                          }`}
                        >
                          {displayMood}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingDiary.aiMoodAnalysis && editingDiary.aiMoodAnalysis.length > 0 && (
                  <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 space-y-2">
                    <span className="block text-xs font-black text-purple-950 flex items-center space-x-1.5 space-x-reverse">
                      <span>🧠</span>
                      <span>{t.autoAiMoodAnalysisTitle}</span>
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {normalizeMoodDistribution(editingDiary.aiMoodAnalysis, isRtl ? 'ar' : 'en').map((analysis, idx) => {
                        const scoreColor = analysis.percentage >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : analysis.percentage >= 30 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-purple-50 text-purple-700 border-purple-100';
                        return (
                          <div
                            key={idx}
                            className={`flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-xl text-xs font-extrabold border shadow-3xs ${scoreColor}`}
                          >
                            <span>{analysis.mood}</span>
                            <span className="opacity-80">|</span>
                            <span>{analysis.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-purple-600/80 font-bold leading-relaxed">
                      {t.aiMoodAnalysisUpdateNotice}
                    </p>
                  </div>
                )}

                {/* Content text area with Rich Editor Toolbar */}
                <div className="overflow-hidden">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-[#5A5A40]">{t.writeFeelingsLabel}</label>
                    {gratitudeCards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowGratitudeImportModal(true)}
                        className="text-[10px] text-[#8B9D83] hover:text-[#5A5A40] font-extrabold flex items-center space-x-1 space-x-reverse cursor-pointer bg-[#8B9D83]/8 px-2.5 py-1 rounded-lg transition-colors border border-[#8B9D83]/20 animate-pulse"
                      >
                        <span>🌸</span>
                        <span>{t.importGratitudeBtn}</span>
                      </button>
                    )}
                  </div>

                  {/* Rich Text Editor Toolbar (Organized & Clutter-Free) */}
                  <div className="bg-[#F4F1EA] border border-[#E2DCC8] border-b-0 rounded-t-2xl p-2 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto scrollbar-none">
                    {/* Undo / Redo */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={t.undoTooltip}
                        onClick={handleUndo}
                        className="p-2 sm:p-2.5 bg-white hover:bg-[#EAE5D9] active:bg-[#D0C8B0] border border-[#E2DCC8] rounded-xl font-bold text-[#3A3A3A] cursor-pointer transition-all flex items-center justify-center text-sm shadow-3xs min-w-[38px] min-h-[38px]"
                      >
                        ↩️
                      </button>
                      <button
                        type="button"
                        title={t.redoTooltip}
                        onClick={handleRedo}
                        className="p-2 sm:p-2.5 bg-white hover:bg-[#EAE5D9] active:bg-[#D0C8B0] border border-[#E2DCC8] rounded-xl font-bold text-[#3A3A3A] cursor-pointer transition-all flex items-center justify-center text-sm shadow-3xs min-w-[38px] min-h-[38px]"
                      >
                        ↪️
                      </button>
                    </div>

                    <div className="h-5 w-px bg-[#E2DCC8] mx-0.5 shrink-0" />

                    {/* Inline Text Styles: B, I, U, S */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={t.boldTooltip}
                        onClick={() => insertFormatting('**', '**')}
                        className="px-3 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] font-black text-[#3A3A3A] cursor-pointer shadow-3xs min-w-[36px] min-h-[36px]"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        title={t.italicTooltip}
                        onClick={() => insertFormatting('*', '*')}
                        className="px-3 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] italic font-serif font-bold text-[#3A3A3A] cursor-pointer shadow-3xs min-w-[36px] min-h-[36px]"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        title={t.underlineTooltip}
                        onClick={() => insertFormatting('<u>', '</u>')}
                        className="px-3 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] underline font-bold text-[#3A3A3A] cursor-pointer shadow-3xs min-w-[36px] min-h-[36px]"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        title={t.strikethroughTooltip}
                        onClick={() => insertFormatting('~~', '~~')}
                        className="px-3 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] line-through font-bold text-[#3A3A3A] cursor-pointer shadow-3xs min-w-[36px] min-h-[36px]"
                      >
                        S
                      </button>
                    </div>

                    <div className="h-5 w-px bg-[#E2DCC8] mx-0.5 shrink-0" />

                    {/* Headings & Blocks */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={t.h1Tooltip}
                        onClick={() => insertFormatting('\n# ')}
                        className="px-2.5 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] font-black text-[#5A5A40] cursor-pointer shadow-3xs min-h-[36px]"
                      >
                        H1
                      </button>
                      <button
                        type="button"
                        title={t.h2Tooltip}
                        onClick={() => insertFormatting('\n## ')}
                        className="px-2.5 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] font-bold text-[#5A5A40] cursor-pointer shadow-3xs min-h-[36px]"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        title={t.quoteTooltip}
                        onClick={() => insertFormatting('\n> ')}
                        className="px-2.5 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] font-bold text-[#5A5A40] cursor-pointer shadow-3xs min-h-[36px]"
                      >
                        💬
                      </button>
                      <button
                        type="button"
                        title={t.bulletListTooltip}
                        onClick={() => insertFormatting('\n- ')}
                        className="px-2.5 py-1.5 sm:py-2 bg-white hover:bg-[#EAE5D9] rounded-xl border border-[#E2DCC8] font-bold text-[#5A5A40] cursor-pointer shadow-3xs min-h-[36px] whitespace-nowrap"
                      >
                        • {t.bulletListLabel}
                      </button>
                    </div>

                    <div className="h-5 w-px bg-[#E2DCC8] mx-0.5 shrink-0" />

                    {/* Font Colors Trigger Button */}
                    <button
                      type="button"
                      title={t.fontColorsTooltip}
                      onClick={() => setShowColorPalette(!showColorPalette)}
                      className={`px-3 py-1.5 sm:py-2 rounded-xl border transition-all font-bold flex items-center space-x-1 space-x-reverse cursor-pointer shadow-3xs shrink-0 whitespace-nowrap min-h-[36px] ${
                        showColorPalette
                          ? 'bg-amber-100 text-amber-950 border-amber-300'
                          : 'bg-white hover:bg-[#EAE5D9] text-amber-800 border-[#E2DCC8]'
                      }`}
                    >
                      <span>🎨</span>
                      <span>{t.fontColorsBtn}</span>
                    </button>
                  </div>

                  {/* Dedicated Inline Font Colors Swatches Row (Natural anchored placement) */}
                  {showColorPalette && (
                    <div className="bg-[#FAF8F5] border-x border-[#E2DCC8] px-3.5 py-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <span className="text-[11px] font-black text-amber-950 shrink-0 flex items-center gap-1">
                        <span>🎨</span>
                        <span>{t.fontColorsBtn}:</span>
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#D97706">', '</span>')} className="w-5 h-5 rounded-full bg-amber-600 border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title={t.colorOrange} />
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#059669">', '</span>')} className="w-5 h-5 rounded-full bg-emerald-600 border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title={t.colorGreen} />
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#2563EB">', '</span>')} className="w-5 h-5 rounded-full bg-blue-600 border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title={t.colorBlue} />
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#DC2626">', '</span>')} className="w-5 h-5 rounded-full bg-red-600 border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title={t.colorRed} />
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#7C3AED">', '</span>')} className="w-5 h-5 rounded-full bg-purple-600 border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title={t.colorPurple} />
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#2B3E50">', '</span>')} className="w-5 h-5 rounded-full bg-[#2B3E50] border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title="كحلي" />
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<span style="color:#3A3A3A">', '</span>')} className="w-5 h-5 rounded-full bg-[#3A3A3A] border border-white shadow-3xs hover:scale-125 transition-transform cursor-pointer" title="افتراضي" />
                      </div>
                    </div>
                  )}

                  {/* Primary Writing Canvas (Generously sized, comfortable >= 16px typography, clearly framed) */}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-placeholder={t.editorTextareaPlaceholder}
                    onInput={(e) => {
                      const html = e.currentTarget.innerHTML;
                      const prevRecorded = lastRecordedHtmlRef.current || '';
                      if (Math.abs(html.length - prevRecorded.length) > 5 || html.endsWith(' ') || html.endsWith('&nbsp;')) {
                        recordUndoSnapshot(prevRecorded);
                      }
                      setEditingDiary(prev => {
                        if (!prev) return null;
                        const updated = { ...prev, content: html };
                        saveDraftSynchronously(updated);
                        return updated;
                      });
                    }}
                    onBlur={(e) => {
                      const html = e.currentTarget.innerHTML;
                      setEditingDiary(prev => {
                        if (!prev) return null;
                        const updated = { ...prev, content: html };
                        saveDraftSynchronously(updated);
                        return updated;
                      });
                    }}
                    style={{
                      backgroundColor: editingDiary.color || '#F9F7F2',
                      fontSize: `${Math.max(16, fontDrawerSize)}px`,
                      minHeight: '280px',
                      lineHeight: '1.85'
                    }}
                    className={`w-full max-w-full border border-[#E2DCC8] focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] focus:outline-none rounded-b-none px-3 py-3 sm:p-5 text-[#3A3A3A] leading-relaxed transition-all outline-none max-h-[600px] overflow-y-auto overflow-x-hidden shadow-inner select-text selectable-text whitespace-pre-wrap ${fontDrawerFamily}`}
                  />

                  {/* Attachment & Features Toolbar directly attached to textarea (Image 4 format) */}
                  <div className="bg-[#EAE5D9] border border-t-0 border-[#E2DCC8] rounded-b-xl sm:rounded-b-2xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs w-full max-w-full overflow-x-hidden">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Font Effect Toggle (Aa) */}
                      <button
                        type="button"
                        onClick={() => setShowFontDrawer(true)}
                        className="p-2 bg-white hover:bg-[#F4F1EA] rounded-xl border border-[#E2DCC8] text-[#5A5A40] cursor-pointer font-bold flex items-center space-x-1 space-x-reverse"
                        title={t.fontEffectTitle}
                      >
                        <span className="font-serif">Aa</span>
                        <span className="hidden sm:inline">{t.fontTitle}</span>
                      </button>

                      {/* Background Color Picker Palette (🎨) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                          className="p-2 bg-white hover:bg-[#F4F1EA] rounded-xl border border-[#E2DCC8] text-[#5A5A40] cursor-pointer font-bold flex items-center space-x-1 space-x-reverse"
                          title={t.backgroundColorTitle}
                        >
                          <span>🎨</span>
                          <span className="hidden sm:inline">{t.colorTitle}</span>
                        </button>
                        {showBgColorPicker && (
                          <div className="absolute right-0 sm:right-auto left-auto sm:left-0 bottom-full mb-2 flex flex-wrap items-center gap-2 p-2.5 bg-white border border-[#E2DCC8] rounded-2xl shadow-2xl z-50 animate-fadeIn max-w-[92vw] sm:max-w-none">
                            <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#F9F7F2' } : null); setShowBgColorPicker(false); }} className="w-7 h-7 rounded-full bg-[#F9F7F2] border-2 border-gray-400 cursor-pointer hover:scale-110 transition-all shadow-xs" title={t.bgDefault} />
                            <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#FFFDF5' } : null); setShowBgColorPicker(false); }} className="w-7 h-7 rounded-full bg-[#FFFDF5] border-2 border-amber-300 cursor-pointer hover:scale-110 transition-all shadow-xs" title={t.bgWarmYellow} />
                            <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#F2F7FB' } : null); setShowBgColorPicker(false); }} className="w-7 h-7 rounded-full bg-[#F2F7FB] border-2 border-blue-300 cursor-pointer hover:scale-110 transition-all shadow-xs" title={t.bgSkyBlue} />
                            <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#F4F7F2' } : null); setShowBgColorPicker(false); }} className="w-7 h-7 rounded-full bg-[#F4F7F2] border-2 border-emerald-300 cursor-pointer hover:scale-110 transition-all shadow-xs" title={t.bgSoftGreen} />
                            <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#FBF7FF' } : null); setShowBgColorPicker(false); }} className="w-7 h-7 rounded-full bg-[#FBF7FF] border-2 border-purple-300 cursor-pointer hover:scale-110 transition-all shadow-xs" title={t.bgLavender} />
                            <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#FCF2F4' } : null); setShowBgColorPicker(false); }} className="w-7 h-7 rounded-full bg-[#FCF2F4] border-2 border-rose-300 cursor-pointer hover:scale-110 transition-all shadow-xs" title={t.bgPink} />
                          </div>
                        )}
                      </div>

                      {/* Draw / Sketch (✏️) */}
                      <button
                        type="button"
                        onClick={() => setShowSketchboard(true)}
                        className="p-2 bg-white hover:bg-[#F4F1EA] rounded-xl border border-[#E2DCC8] text-[#5A5A40] cursor-pointer font-bold flex items-center space-x-1 space-x-reverse"
                        title={t.drawTitle}
                      >
                        <span>✏️</span>
                        <span className="hidden sm:inline">{t.drawTitle}</span>
                      </button>

                      {/* Attach File (📎) */}
                      <label onClick={markFilePickerActive} className="p-2 bg-white hover:bg-[#F4F1EA] rounded-xl border border-[#E2DCC8] text-[#5A5A40] cursor-pointer font-bold flex items-center space-x-1 space-x-reverse" title={t.attachFileTitle}>
                        <span>📎</span>
                        <span className="hidden sm:inline">{t.attachFileTitle}</span>
                        <input type="file" multiple
                          accept="application/pdf,.doc,.docx,.txt,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={async (e) => {
                            markFilePickerActive();
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              await handleGenericFileUpload(files);
                            }
                            resetFilePickerGuard();
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Checklist Task Add Button (Matching Image 3 & 4) */}
                    <button
                      type="button"
                      onClick={handleAddTaskItem}
                      className="px-3 py-1.5 bg-[#8B9D83] text-white hover:bg-[#6E8066] rounded-xl font-bold flex items-center space-x-1 space-x-reverse cursor-pointer shadow-3xs text-xs"
                    >
                      <span>☑️</span>
                      <span>+ {t.addChecklistItemBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Embedded Checklist Tasks inside Note (Image 3 & 4 format) */}
                {(editingDiary.tasks || []).length > 0 && (
                  <div className="p-4 bg-white border border-[#E2DCC8] rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                        <span>☑️</span>
                        <span>{t.checklistSectionTitle}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAddTaskItem}
                        className="text-[11px] text-[#8B9D83] font-black hover:underline cursor-pointer"
                      >
                        + {t.addChecklistItemBtn}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editingDiary.tasks.map((task) => (
                        <div key={task.id} className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditingDiary(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  tasks: prev.tasks.map(taskItem => taskItem.id === task.id ? { ...taskItem, completed: checked } : taskItem)
                                };
                              });
                            }}
                            className="w-4 h-4 rounded text-[#8B9D83] focus:ring-[#8B9D83] cursor-pointer"
                          />
                          <input
                            type="text"
                            value={task.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingDiary(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  tasks: prev.tasks.map(taskItem => taskItem.id === task.id ? { ...taskItem, text: val } : taskItem)
                                };
                              });
                            }}
                            placeholder={t.taskInputPlaceholder}
                            className={`flex-1 text-xs border-b border-transparent focus:border-[#8B9D83] focus:outline-none bg-transparent py-1 ${task.completed ? 'line-through text-gray-400' : 'text-[#3A3A3A] font-medium'}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDiary(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  tasks: prev.tasks.filter(taskItem => taskItem.id !== task.id)
                                };
                              });
                            }}
                            className="text-red-400 hover:text-red-600 font-bold text-xs px-1.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adding modifications / subsequent additions (التعديلات والإضافات اللاحقة) */}
                {!isNewEntry && (
                  <div className="space-y-3 bg-[#FAEDCD]/20 border border-[#D4A373]/30 rounded-2xl p-4">
                    <span className="block text-xs font-extrabold text-[#D4A373] flex items-center space-x-1.5 space-x-reverse">
                      <span>✍️</span>
                      <span>{t.subsequentAdditionsTitle}</span>
                    </span>
                    <textarea
                      rows={3}
                      value={newEditAddition}
                      onChange={(e) => setNewEditAddition(e.target.value)}
                      placeholder={t.subsequentAdditionsPlaceholder}
                      className="w-full bg-white focus:bg-white border border-[#E2DCC8] focus:ring-2 focus:ring-[#D4A373] focus:border-[#D4A373] focus:outline-none rounded-xl p-3 text-xs text-[#3A3A3A] leading-relaxed transition-all"
                    />
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      {t.subsequentAdditionsNotice}
                    </p>
                  </div>
                )}

                {/* Render previous modifications (الإضافات اللاحقة المسجلة) */}
                {editingDiary.edits && editingDiary.edits.length > 0 && (
                  <div className="space-y-3">
                    <span className="block text-xs font-extrabold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <span>📜</span>
                      <span>{t.historicalEditsTitle}</span>
                    </span>
                    <div className="space-y-3">
                      {editingDiary.edits.map((edit) => (
                        <div key={edit.id} className="bg-[#F9F7F2] border-s-4 border-[#8B9D83] p-4 rounded-s-xl rounded-e-sm space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                            <span className="flex items-center space-x-1 space-x-reverse">
                              <span>📆</span>
                              <span>{edit.timestamp}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDiary(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    edits: (prev.edits || []).filter(e => e.id !== edit.id)
                                  };
                                });
                              }}
                              className="text-red-500 hover:text-red-700 cursor-pointer text-[10px] font-bold"
                            >
                              {t.deleteAdditionBtn}
                            </button>
                          </div>
                          <p className="text-xs text-[#3A3A3A] leading-relaxed font-normal">
                            {edit.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags input bar */}
                <div className="w-full max-w-full overflow-x-hidden">
                  <label className="block text-xs font-bold text-[#5A5A40] mb-1.5">{t.tagsLabel}</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#F9F7F2] border border-[#E2DCC8] rounded-xl w-full max-w-full overflow-x-hidden">
                    {editingDiary.tags.map((tag, idx) => (
                      <span key={idx} className="bg-[#F0EDE4] text-[#5A5A40] text-xs py-1 px-2.5 rounded-lg border border-[#E2DCC8] flex items-center space-x-1 space-x-reverse">
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => setEditingDiary(prev => prev ? { ...prev, tags: prev.tags.filter(x => x !== tag) } : null)}
                          className="text-[10px] text-[#5A5A40]/70 hover:text-[#3A3A3A] cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={t.addTagPlaceholder}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === ',') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim().replace('#', '');
                          if (val && !editingDiary.tags.includes(val)) {
                            setEditingDiary(prev => prev ? { ...prev, tags: [...prev.tags, val] } : null);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                      className="bg-transparent border-0 focus:ring-0 text-xs px-2 focus:outline-none py-1 flex-grow"
                    />
                  </div>
                </div>

                {/* Drawing / Image thumbnail Display inside editor */}
                {(editingDiary.images.length > 0 || editingDiary.drawing) && (
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-[#5A5A40]">{t.attachedImagesDrawings}</span>
                    <div className="flex flex-wrap gap-3">
                      {editingDiary.images.map((img, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#E2DCC8] shadow-xs group bg-gray-50 flex flex-col justify-between p-1">
                          <img
                            src={img}
                            className="w-full h-full object-cover rounded-xl cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => handleOpenDiaryImage(img, idx)}
                            onError={async (e) => {
                              const attId = editingDiary?.imageAttachmentIds?.[idx];
                              if (attId) {
                                const fresh = await getAttachmentObjectUrl(attId);
                                if (fresh) (e.target as HTMLImageElement).src = fresh;
                              }
                            }}
                            alt={t.attachedImage || 'Image'}
                            title={settings?.appLanguage === 'ar' ? 'انقر للمعاينة والفتح' : 'Click to preview / open'}
                          />
                          {/* Dedicated Action Buttons Overlay */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDiaryImage(img, idx);
                              }}
                              className="w-6 h-6 bg-[#2B3E50]/90 hover:bg-[#2B3E50] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110"
                              title={settings?.appLanguage === 'ar' ? 'معاينة الصورة' : 'Preview Image'}
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDiaryImage(idx);
                              }}
                              className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110"
                              title={t.deleteMediaBtn || 'Delete'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Drawings Thumbnail Grid (Unlimited Multi-Drawing Support) */}
                      {(() => {
                        const currentDrawings = (Array.isArray(editingDiary.drawings) && editingDiary.drawings.length > 0)
                          ? editingDiary.drawings
                          : (editingDiary.drawing ? [editingDiary.drawing] : []);

                        return currentDrawings.map((drawDataUrl, dIdx) => (
                          <div key={`draw-${dIdx}`} className="relative w-28 h-24 rounded-2xl overflow-hidden border border-[#E2DCC8] shadow-xs group bg-white flex flex-col justify-between p-1">
                            <img
                              src={drawDataUrl}
                              className="w-full h-full object-contain rounded-xl cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => {
                                setEditingDrawingIndex(dIdx);
                                setShowSketchboard(true);
                              }}
                              alt={`${t.drawing || 'رسمة'} ${dIdx + 1}`}
                              title={settings?.appLanguage === 'ar' ? 'انقر لتعديل أو معاينة الرسمة' : 'Click to edit or preview drawing'}
                            />
                            <div className="absolute top-1.5 left-1.5 bg-[#8B9D83] text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow-3xs pointer-events-none">
                              {t.drawing || 'رسمة'} {currentDrawings.length > 1 ? `#${dIdx + 1}` : ''}
                            </div>
                            {/* Dedicated Action Buttons for Drawing: Edit & Delete */}
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDrawingIndex(dIdx);
                                  setShowSketchboard(true);
                                }}
                                className="w-6 h-6 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110"
                                title={t.editDrawing || 'تعديل الرسمة'}
                              >
                                <span className="text-[10px]">✏️</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const attId = editingDiary.drawingAttachmentIds?.[dIdx] || (dIdx === 0 ? editingDiary.drawingAttachmentId : undefined);
                                  if (attId) {
                                    deleteAttachmentBlob(attId);
                                  }
                                  const updatedDrawings = currentDrawings.filter((_, i) => i !== dIdx);
                                  const updatedIds = (editingDiary.drawingAttachmentIds || []).filter((_, i) => i !== dIdx);
                                  setEditingDiary(prev => prev ? {
                                    ...prev,
                                    drawings: updatedDrawings,
                                    drawingAttachmentIds: updatedIds,
                                    drawing: updatedDrawings[0] || undefined,
                                    drawingAttachmentId: updatedIds[0] || undefined
                                  } : null);
                                }}
                                className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110"
                                title={t.deleteDrawing || 'حذف الرسمة'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* 🎥 Attached Videos Display inside editor */}
                {editingDiary.videos && editingDiary.videos.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <span className="block text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <span>🎥</span>
                      <span>{t.attachedVideos}</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editingDiary.videos.map((vid, idx) => (
                        <div key={idx} className="relative bg-[#F9F7F2] p-3 border border-[#E2DCC8] rounded-xl flex flex-col space-y-2">
                          {vid.startsWith('data:video/') || vid.startsWith('blob:') || vid.includes('mp4') || vid.startsWith('data:application/octet-stream') ? (
                            <video
                              src={vid}
                              controls
                              className="w-full h-32 rounded-lg bg-black object-cover cursor-pointer"
                              onClick={() => handleOpenDiaryVideo(vid, idx)}
                              onError={async (e) => {
                                const attId = editingDiary?.videoAttachmentIds?.[idx];
                                if (attId) {
                                  const fresh = await getAttachmentObjectUrl(attId);
                                  if (fresh) (e.target as HTMLVideoElement).src = fresh;
                                }
                              }}
                            />
                          ) : (
                            <div className="bg-white p-2.5 rounded-lg border border-[#E2DCC8]/60 text-xs text-[#5A5A40] truncate flex items-center space-x-2 space-x-reverse">
                              <span className="font-semibold shrink-0">{t.videoLink}</span>
                              <a href={vid} target="_blank" rel="noopener noreferrer" className="text-[#8B9D83] underline truncate flex-grow">
                                {vid}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDiaryVideo(vid, idx)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10.5px] cursor-pointer flex items-center gap-1 shadow-3xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{settings?.appLanguage === 'ar' ? 'معاينة' : 'Preview'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDiaryVideo(idx)}
                              className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                            >
                              {settings?.appLanguage === 'ar' ? 'حذف الفيديو' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 📁 Attached Files Display inside editor */}
                {editingDiary.files && editingDiary.files.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <span className="block text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <span>📁</span>
                      <span>{t.attachedFiles}</span>
                    </span>
                    <div className="space-y-2">
                      {editingDiary.files.map((file) => {
                        const name = (file.name || '').toLowerCase();
                        const type = (file.type || '').toLowerCase();
                        let badgeLabel = '📁 ملف';
                        let badgeStyle = 'bg-gray-100 text-gray-700 border-gray-200';

                        if (type.includes('video') || /\.(mp4|webm|mov|avi|mkv)$/i.test(name)) {
                          badgeLabel = '🎬 فيديو';
                          badgeStyle = 'bg-purple-100 text-purple-700 border-purple-200';
                        } else if (type.includes('audio') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) {
                          badgeLabel = '🎙️ صوت';
                          badgeStyle = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                        } else if (type.includes('pdf') || name.endsWith('.pdf')) {
                          badgeLabel = '📄 PDF';
                          badgeStyle = 'bg-red-100 text-red-700 border-red-200';
                        } else if (type.includes('image') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
                          badgeLabel = '🖼️ صورة';
                          badgeStyle = 'bg-amber-100 text-amber-700 border-amber-200';
                        } else if (type.includes('word') || /\.(doc|docx)$/i.test(name)) {
                          badgeLabel = '📝 DOC';
                          badgeStyle = 'bg-blue-100 text-blue-700 border-blue-200';
                        } else if (/\.(zip|rar|7z|gz|tar)$/i.test(name)) {
                          badgeLabel = '📦 أرشيف';
                          badgeStyle = 'bg-amber-100 text-amber-700 border-amber-200';
                        }

                        return (
                          <div key={file.id} className="p-3 bg-[#F9F7F2] border border-[#E2DCC8] rounded-xl flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center space-x-2 space-x-reverse min-w-0 flex-1">
                              <div className={`px-2 py-1 border rounded-lg font-bold text-[10px] shrink-0 ${badgeStyle}`}>
                                {badgeLabel}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold block text-[#3A3A3A] truncate max-w-[140px] sm:max-w-xs">{file.name}</span>
                                <span className="text-[10px] text-gray-400">{t.fileSize}: {file.size}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 space-x-reverse shrink-0">
                              {/* 👁️ Preview / Open Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenAttachment(file)}
                                className="bg-[#2B3E50] hover:bg-[#1E2B38] text-white text-[10.5px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
                                title={settings?.appLanguage === 'ar' ? 'معاينة / فتح' : 'Preview / Open'}
                              >
                                <Eye className="w-3 h-3" />
                                <span>{settings?.appLanguage === 'ar' ? 'معاينة' : 'Preview'}</span>
                              </button>

                              {/* ⬇️ Download Button */}
                              {file.dataUrl && (
                                <a
                                  href={file.dataUrl}
                                  download={file.name}
                                  className="bg-[#8B9D83] hover:bg-[#72856A] text-white text-[10.5px] px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
                                  title={settings?.appLanguage === 'ar' ? 'تحميل' : 'Download'}
                                >
                                  <Download className="w-3 h-3" />
                                </a>
                              )}

                              {/* 🗑️ Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteFileAttachment(file.id)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-bold cursor-pointer transition-colors"
                                title={settings?.appLanguage === 'ar' ? 'حذف المرفق' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 🔗 Attached Web Links Display inside editor */}
                {editingDiary.links && editingDiary.links.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <span className="block text-xs font-bold text-[#5A5A40] flex items-center space-x-1.5 space-x-reverse">
                      <span>🔗</span>
                      <span>{t.attachedLinksRefs}</span>
                    </span>
                    <div className="space-y-1.5">
                      {editingDiary.links.map((link, idx) => (
                        <div key={idx} className="p-3 bg-blue-50/30 border border-blue-200/50 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 space-x-reverse min-w-0">
                            <span className="text-blue-500 font-bold">🌐</span>
                            <a
                              href={link}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="text-blue-700 hover:underline truncate font-medium"
                            >
                              {link}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDiary(prev => prev ? { ...prev, links: (prev.links || []).filter((_, i) => i !== idx) } : null);
                            }}
                            className="text-red-600 hover:text-red-700 font-bold px-2 cursor-pointer text-xs shrink-0"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media & Attachments Grid (Clean Symmetrical 2-col/4-col Responsive Grid) */}
                <div className="bg-[#F9F7F2] p-4 sm:p-5 rounded-3xl border border-[#E2DCC8]/70 space-y-3">
                  <span className="text-xs font-black text-[#5A5A40] block">{t.addMediaAttachments}</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full">

                    {/* 1. Add Photo / Screenshot */}
                    <label
                      onClick={markFilePickerActive}
                      className="flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-2xl text-xs font-bold text-[#5A5A40] cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12"
                    >
                      <Image className="w-4 h-4 text-[#D4A373] shrink-0" />
                      <span className="truncate">{t.addPhotoScreenshot}</span>
                      <input
                        id="image-upload-trigger"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* 2. Draw Mind Map / Sketch (Multi-drawing support) */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDrawingIndex(null);
                        setShowSketchboard(true);
                      }}
                      className="flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-2xl text-xs font-bold text-[#5A5A40] cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12"
                    >
                      <span className="text-base text-[#8B9D83] shrink-0">🎨</span>
                      <span className="truncate">{t.drawMindmap}</span>
                    </button>

                    {/* 3. Quick Voice Vent Modal (Single Voice Vent Action) */}
                    <button
                      type="button"
                      onClick={() => setShowVoiceVentModal(true)}
                      className="flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-2xl text-xs font-black cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12"
                      title={t.voiceQuickVent || (isAr ? 'فضفضة صوتية سريعة' : 'Quick Voice Vent')}
                    >
                      <span className="text-base shrink-0">🎙️</span>
                      <span className="truncate">{t.voiceQuickVent || (isAr ? 'فضفضة صوتية سريعة' : 'Quick Voice Vent')}</span>
                    </button>

                    {/* 4. Add Audio File */}
                    <label
                      htmlFor="audio-file-input"
                      onClick={handleAudioPickerClick}
                      className="flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-2xl text-xs font-bold text-[#5A5A40] cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12"
                      title={t.chooseAudioFileTooltip}
                    >
                      <span className="text-base shrink-0">🎵</span>
                      <span className="truncate">{t.addAudioFile}</span>
                      <input
                        id="audio-file-input"
                        type="file"
                        accept="audio/*"
                        onClick={(e) => e.stopPropagation()}
                        onChange={handleAudioFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* 5. Attachments Page */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentsPage(true)}
                      className="flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] text-[#5A5A40] rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12"
                      title={t.attachmentsPageTitle}
                    >
                      <span className="text-base shrink-0">📁</span>
                      <span className="truncate">{t.attachmentsPageTitle}</span>
                      <span className="text-[10px] bg-[#8B9D83] text-white px-1.5 py-0.2 rounded-full font-bold shrink-0">
                        {(editingDiary.images || []).length + (editingDiary.videos || []).length + (editingDiary.audioRecordings || []).length + (editingDiary.files || []).length + ((editingDiary.drawings && editingDiary.drawings.length > 0) ? editingDiary.drawings.length : (editingDiary.drawing ? 1 : 0))}
                      </span>
                    </button>

                    {/* 6. Web Link */}
                    <button
                      type="button"
                      onClick={() => setActiveInputSection(activeInputSection === 'link' ? 'none' : 'link')}
                      className={`flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 border rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12 ${
                        activeInputSection === 'link'
                          ? 'bg-[#8B9D83] text-white border-[#8B9D83]'
                          : 'bg-white hover:bg-[#F0EDE4] border-[#E2DCC8] text-[#5A5A40]'
                      }`}
                    >
                      <span className="text-base shrink-0">🌐</span>
                      <span className="truncate">{t.webLink}</span>
                    </button>

                    {/* 7. Video Link / File */}
                    <button
                      type="button"
                      onClick={() => setActiveInputSection(activeInputSection === 'video' ? 'none' : 'video')}
                      className={`flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 border rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12 ${
                        activeInputSection === 'video'
                          ? 'bg-[#8B9D83] text-white border-[#8B9D83]'
                          : 'bg-white hover:bg-[#F0EDE4] border-[#E2DCC8] text-[#5A5A40]'
                      }`}
                    >
                      <span className="text-base shrink-0">🎥</span>
                      <span className="truncate">{t.videoLabel}</span>
                    </button>

                    {/* 8. PDF File */}
                    <button
                      type="button"
                      onClick={() => setActiveInputSection(activeInputSection === 'pdf' ? 'none' : 'pdf')}
                      className={`flex items-center justify-center space-x-1.5 space-x-reverse px-3 py-2.5 border rounded-2xl text-xs font-bold cursor-pointer transition-all shadow-3xs hover:scale-[1.01] active:scale-95 h-12 ${
                        activeInputSection === 'pdf'
                          ? 'bg-[#8B9D83] text-white border-[#8B9D83]'
                          : 'bg-white hover:bg-[#F0EDE4] border-[#E2DCC8] text-[#5A5A40]'
                      }`}
                    >
                      <span className="text-base shrink-0">📄</span>
                      <span className="truncate">{t.pdfLabel}</span>
                    </button>
                  </div>

                  {/* Audio Upload Loading Banner */}
                  {audioUploadLoading && (
                    <div className="w-full p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-bold animate-pulse shadow-sm" dir={langInfo.dir}>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-700 shrink-0" />
                      <span>⏳ {t.aiTranscriptionLoading}</span>
                    </div>
                  )}

                  {/* Interactive Real-Time Live Recording Card */}
                  {isRecording && (
                    <div className="w-full mt-2 p-3.5 sm:p-4 bg-gradient-to-r from-red-50 via-amber-50/50 to-red-50 border-2 border-red-300/80 rounded-2xl flex flex-col space-y-3 shadow-md animate-fadeIn text-xs" dir={langInfo.dir}>
                      <div className="flex items-center justify-between gap-2 border-b border-red-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                          </span>
                          <span className="font-black text-red-800 text-xs flex items-center gap-1">
                            <Mic className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                            <span>{t.listeningTranscribing}</span>
                          </span>
                        </div>
                        <span className="font-mono font-black text-red-700 bg-white/90 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] shadow-3xs">
                          ⏱️ {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Live Transcript Area with Final / Interim Separation */}
                      <div
                        className="bg-white/95 p-3.5 rounded-xl border border-red-100 min-h-[75px] max-h-48 overflow-y-auto space-y-1.5 shadow-inner"
                        style={{ direction: 'rtl', textAlign: 'right', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.9 }}
                      >
                        {speechTranscript ? (
                          <p className="text-xs sm:text-sm text-[#2B3E50] leading-[1.9] font-medium">
                            {speechTranscript}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic text-center py-3 font-semibold">
                            🎙️ جاري الاستماع والكتابة لحظياً... تحدث الآن بوضوح وسيظهر كلامك هنا فوراً
                          </p>
                        )}
                      </div>

                      {/* Control Action Buttons */}
                      <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleCancelRecording}
                          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1"
                        >
                          <span>{t.cancelAction}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleStopAndInsertRecording}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <span>{t.finishInsertText}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expandable Extra Attachment Sections */}
                {activeInputSection !== 'none' && (
                  <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#E2DCC8]/60 space-y-3">
                    {activeInputSection === 'link' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[#5A5A40]">{t.enterWebLinkRef}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tempWebUrl}
                            onChange={(e) => setTempWebUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="flex-grow bg-white border border-[#E2DCC8] focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] focus:outline-none rounded-xl px-3.5 py-2 text-xs text-[#3A3A3A]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddWebLink(tempWebUrl)}
                            className="bg-[#8B9D83] hover:bg-[#72856A] text-white text-xs px-4 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0"
                          >
                            إضافة الرابط
                          </button>
                        </div>
                      </div>
                    )}

                    {activeInputSection === 'video' && (
                      <div className="space-y-3">
                        <span className="block text-xs font-bold text-[#5A5A40]">{t.addVideoToEntry}</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Option 1: File upload */}
                          <div className="p-3 bg-white border border-[#E2DCC8] rounded-xl flex flex-col justify-between space-y-2">
                            <span className="text-[11px] font-bold text-gray-500">{t.option1LocalVideo}</span>
                            <label onClick={markFilePickerActive} className="flex items-center justify-center space-x-1.5 space-x-reverse py-2 bg-[#F9F7F2] hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-lg text-xs font-semibold text-[#5A5A40] cursor-pointer transition-colors shadow-xs">
                              <span>{t.chooseVideoFromDevice}</span>
                              <input type="file" multiple
                                accept="video/*" onChange={handleVideoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Option 2: Enter URL */}
                          <div className="p-3 bg-white border border-[#E2DCC8] rounded-xl flex flex-col justify-between space-y-2">
                            <span className="text-[11px] font-bold text-gray-500">{t.option2VideoLink}</span>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={tempVideoUrl}
                                onChange={(e) => setTempVideoUrl(e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="flex-grow bg-[#F9F7F2] border border-[#E2DCC8] focus:outline-none rounded-lg px-2.5 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddVideoLink(tempVideoUrl)}
                                className="bg-[#8B9D83] hover:bg-[#72856A] text-white text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0"
                              >
                                إضافة
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeInputSection === 'pdf' && (
                      <div className="space-y-3">
                        <span className="block text-xs font-bold text-[#5A5A40]">{t.addPdfToEntry}</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Option 1: PDF File upload */}
                          <div className="p-3 bg-white border border-[#E2DCC8] rounded-xl flex flex-col justify-between space-y-2">
                            <span className="text-[11px] font-bold text-gray-500">{t.option1LocalFile}</span>
                            <label onClick={markFilePickerActive} className="flex items-center justify-center space-x-1.5 space-x-reverse py-2 bg-[#F9F7F2] hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-lg text-xs font-semibold text-[#5A5A40] cursor-pointer transition-colors shadow-xs">
                              <span>{t.chooseFileFromDevice}</span>
                              <input type="file" multiple
                                accept="application/pdf" onChange={handlePdfUpload}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Option 2: Simulated PDF addition */}
                          <div className="p-3 bg-white border border-[#E2DCC8] rounded-xl flex flex-col justify-between space-y-2">
                            <span className="text-[11px] font-bold text-gray-500">{t.option2PdfLink}</span>
                            <div className="flex gap-1.5">
                              <input
                                id="manual-pdf-name"
                                type="text"
                                placeholder={t.pdfFileNamePlaceholder}
                                className="w-1/2 bg-[#F9F7F2] border border-[#E2DCC8] focus:outline-none rounded-lg px-2 py-1 text-xs"
                              />
                              <input
                                id="manual-pdf-url"
                                type="text"
                                placeholder={t.fileLinkPlaceholder}
                                className="w-1/2 bg-[#F9F7F2] border border-[#E2DCC8] focus:outline-none rounded-lg px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nameEl = document.getElementById('manual-pdf-name') as HTMLInputElement;
                                  const urlEl = document.getElementById('manual-pdf-url') as HTMLInputElement;
                                  if (nameEl && urlEl && nameEl.value.trim()) {
                                    const newFile: FileAttachment = {
                                      id: `file-${Date.now()}`,
                                      name: nameEl.value.trim().endsWith('.pdf') ? nameEl.value.trim() : nameEl.value.trim() + '.pdf',
                                      size: 'رابط خارجي',
                                      type: 'application/pdf',
                                      dataUrl: urlEl.value.trim() || '#'
                                    };
                                    setEditingDiary(prev => prev ? { ...prev, files: [...(prev.files || []), newFile] } : null);
                                    nameEl.value = '';
                                    urlEl.value = '';
                                    setActiveInputSection('none');
                                  }
                                }}
                                className="bg-[#8B9D83] hover:bg-[#72856A] text-white text-xs px-3 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0"
                              >
                                إضافة
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 🎙️ Attached Audio Recordings & Speech Emotion Recognition (SER) Panel */}
                {editingDiary.audioRecordings.length > 0 && (
                  <div className="space-y-3">
                    <span className="block text-xs font-bold text-[#5A5A40]">
                      🎙️ التسجيلات الصوتية المرفقة (مع تحليل نبرة المشاعر SER):
                    </span>
                    <div className="space-y-3">
                      {editingDiary.audioRecordings.map((rec) => {
                        const emoStyle = getSpeechEmotionStyles(rec.speechEmotion);
                        return (
                          <div key={rec.id} className="p-3.5 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl space-y-2.5 text-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <div className="p-2 bg-[#8B9D83]/15 text-[#8B9D83] rounded-xl">
                                  <Mic className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold block text-[#3A3A3A]">{rec.name}</span>
                                  <span className="text-[10px] text-gray-500">{t.durationLabel}: {rec.duration}s</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteAudioRecording(rec.id)}
                                className="text-red-600 hover:text-red-700 font-bold px-2.5 py-1 bg-white border border-red-100 rounded-lg cursor-pointer text-xs transition-colors flex items-center gap-1"
                                title={settings?.appLanguage === 'ar' ? 'حذف التسجيل الصوتي' : 'Delete Audio Recording'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{settings?.appLanguage === 'ar' ? 'حذف' : 'Delete'}</span>
                              </button>
                            </div>

                            {/* Prominent Audio Player Component */}
                            <AudioPlayerWithIndexedDBFallback rec={rec} onToggleRecording={handleToggleRecording} />

                            {/* Transcription & Dynamic Colored Background Container for SER */}
                            <div className={`p-3.5 rounded-2xl border transition-all duration-300 space-y-2.5 ${emoStyle.containerBg}`}>
                              <div className="flex items-center justify-between border-b border-black/10 pb-2 flex-wrap gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black flex items-center gap-1 text-[11px]">
                                    <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                                    <span>{emoStyle.headerText}:</span>
                                  </span>

                                  {/* Speech Emotion Badge */}
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] flex items-center gap-1 shadow-3xs ${emoStyle.badgeBg}`}>
                                    <span>{emoStyle.emoji}</span>
                                    <span>{emoStyle.emotionText}</span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    disabled={transcribingAudioId === rec.id}
                                    onClick={() => handleTranscribeAudioItem(rec)}
                                    className="px-2.5 py-1 bg-white/90 hover:bg-white text-[#4E685B] border border-black/10 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-3xs"
                                  >
                                    {transcribingAudioId === rec.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin text-[#4E685B]" />
                                        <span>{t.analyzing}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 text-[#D4A373]" />
                                        <span>{t.transcribeAndToneAnalysis}</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Manual Edit Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTranscriptId(rec.id);
                                      const existing = rec.transcription && !rec.transcription.includes('انقر على زر') ? rec.transcription : '';
                                      setEditingTranscriptText(existing);
                                    }}
                                    className="px-2.5 py-1 bg-white/90 hover:bg-white text-indigo-800 border border-black/10 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-3xs"
                                    title={t.editTranscriptTitle}
                                  >
                                    <Edit3 className="w-3 h-3 text-indigo-600" />
                                    <span>{t.editTranscriptBtn}</span>
                                  </button>

                                  {rec.transcription && rec.transcription.trim() && !rec.transcription.includes('جاري') && !rec.transcription.includes('انقر على زر') && (
                                    <button
                                      type="button"
                                      onClick={() => handleAppendTranscriptToContent(rec)}
                                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 shadow-3xs ${
                                        rec.isAppendedToContent
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-white/90 hover:bg-white text-[#8C661D] border border-black/10'
                                      }`}
                                      title={rec.isAppendedToContent ? (t.transcriptionAppendedTooltip) : (t.appendToDiaryTextTooltip)}
                                    >
                                      <span>{rec.isAppendedToContent ? '✓' : '✍️'}</span>
                                      <span>{rec.isAppendedToContent ? (t.transcriptionAppended) : (t.appendToDiaryText)}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Transcription text body / Inline Editor */}
                              {transcribingAudioId === rec.id ? (
                                <div className="py-2.5 text-center text-xs text-amber-900 font-bold animate-pulse flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
                                  <span>{t.transcribingAnalyzingToneStatus}</span>
                                </div>
                              ) : editingTranscriptId === rec.id ? (
                                <div className="space-y-2 bg-white/90 p-3 rounded-xl border border-indigo-200 shadow-sm animate-fadeIn">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-[#3A3A3A]">
                                    <span className="flex items-center gap-1.5 text-indigo-900">
                                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>{t.editTranscriptManualHeader}</span>
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-medium">{t.editTranscriptManualHint}</span>
                                  </div>
                                  <textarea
                                    value={editingTranscriptText}
                                    onChange={(e) => setEditingTranscriptText(e.target.value)}
                                    rows={3}
                                    placeholder={t.typeVoiceTranscriptPlaceholder}
                                    className="w-full bg-white border border-[#E2DCC8] focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] focus:outline-none rounded-xl p-2.5 text-xs text-[#3A3A3A] leading-relaxed resize-y font-medium shadow-2xs"
                                    dir={langInfo.dir}
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingTranscriptId(null)}
                                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                                    >
                                      {t.cancelBtn}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateAudioTranscriptionAtomic(rec.id, editingTranscriptText.trim());
                                        setEditingTranscriptId(null);
                                      }}
                                      className="px-3.5 py-1 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1"
                                    >
                                      <span>💾</span>
                                      <span>{t.saveEditBtn}</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div
                                    onClick={() => {
                                      setEditingTranscriptId(rec.id);
                                      const existing = rec.transcription && !rec.transcription.includes('انقر على زر') ? rec.transcription : '';
                                      setEditingTranscriptText(existing);
                                    }}
                                    className={`relative group rounded-xl p-2.5 transition-all cursor-pointer hover:bg-black/5 border border-dashed border-black/10 hover:border-indigo-300 ${emoStyle.textColor}`}
                                    title={t.clickToEditTranscriptTooltip}
                                  >
                                    <p className="whitespace-pre-wrap leading-relaxed text-xs">
                                      {rec.transcription || (t.clickToTypeOrTranscribeHint)}
                                    </p>
                                    <span className="opacity-80 group-hover:opacity-100 transition-opacity absolute top-1.5 left-1.5 text-[10px] font-bold bg-white/95 text-[#3A3A3A] px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs flex items-center gap-1">
                                      <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                                      <span>{t.edit}</span>
                                    </span>
                                  </div>

                                  {/* SER Vocal Tone Details */}
                                  {rec.speechEmotion?.vocalToneDetails && (
                                    <div className="text-[10px] pt-1.5 border-t border-black/10 flex items-start gap-1.5 font-bold opacity-90">
                                      <span className="shrink-0">{t.vocalToneSerNotice}</span>
                                      <span className="leading-normal">{rec.speechEmotion.vocalToneDetails}</span>
                                    </div>
                                  )}

                                  {/* Quick Mood Color Palette Override Selector */}
                                  <div className="pt-2 border-t border-black/5 flex items-center justify-between flex-wrap gap-1 text-[10px] font-bold">
                                    <span className="opacity-75">{t.changeTextBgByMoodTone}</span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleSetSpeechEmotion(rec.id, 'قلق', 'amber')}
                                        className="px-1.5 py-0.5 bg-amber-200/90 hover:bg-amber-300 text-amber-950 border border-amber-400 rounded-md transition-all cursor-pointer"
                                        title={t.moodHighlightAmber}
                                      >
                                        😰 قلق
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetSpeechEmotion(rec.id, 'فرح', 'emerald')}
                                        className="px-1.5 py-0.5 bg-emerald-200/90 hover:bg-emerald-300 text-emerald-950 border border-emerald-400 rounded-md transition-all cursor-pointer"
                                        title={t.moodHighlightEmerald}
                                      >
                                        🎉 فرح
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetSpeechEmotion(rec.id, 'حزن', 'blue')}
                                        className="px-1.5 py-0.5 bg-blue-200/90 hover:bg-blue-300 text-blue-950 border border-blue-400 rounded-md transition-all cursor-pointer"
                                        title={t.moodHighlightBlue}
                                      >
                                        😔 حزن
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetSpeechEmotion(rec.id, 'غضب', 'red')}
                                        className="px-1.5 py-0.5 bg-red-200/90 hover:bg-red-300 text-red-950 border border-red-400 rounded-md transition-all cursor-pointer"
                                        title={t.moodHighlightRed}
                                      >
                                        😡 غضب
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSetSpeechEmotion(rec.id, 'هدوء', 'teal')}
                                        className="px-1.5 py-0.5 bg-teal-200/90 hover:bg-teal-300 text-teal-950 border border-teal-400 rounded-md transition-all cursor-pointer"
                                        title={t.moodHighlightTeal}
                                      >
                                        🧘 هدوء
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custom Drawing Board Canvas Modal (Multi-Drawing Support) */}
                {showSketchboard && (
                  <div className={`${isSketchboardFullscreen ? 'fixed inset-0 p-0' : 'fixed inset-0 p-4'} bg-[#5A5A40]/45 backdrop-blur-xs z-50 flex items-center justify-center`}>
                    <div className={`${isSketchboardFullscreen ? 'w-full h-[100dvh]' : 'w-full max-w-2xl h-[450px]'} relative`}>
                      <button type="button" data-compact-control="true" onClick={() => setIsSketchboardFullscreen(v => !v)} className="absolute top-2 end-2 z-20 inline-flex items-center justify-center w-9 h-9 min-h-0 min-w-0 rounded-lg bg-white/90 text-[#2D6A4F] border border-[#DCE4D8]" aria-label={isSketchboardFullscreen ? (isAr ? 'استعادة لوحة الرسم' : 'Restore drawing pad') : (isAr ? 'ملء شاشة لوحة الرسم' : 'Fullscreen drawing pad')}>
                        {isSketchboardFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                      <DrawingCanvas
                        initialDataUrl={editingDrawingIndex !== null ? (editingDiary.drawings?.[editingDrawingIndex] || editingDiary.drawing || '') : ''}
                        appLanguage={settings?.appLanguage || 'ar'}
                        onSave={async (dataUrl) => {
                          const attachmentId = `att-draw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                          await saveAttachmentBlob(attachmentId, dataUrl, 'image/png');
                          setEditingDiary(prev => {
                            if (!prev) return null;
                            const prevDrawings = (Array.isArray(prev.drawings) && prev.drawings.length > 0)
                              ? [...prev.drawings]
                              : (prev.drawing ? [prev.drawing] : []);
                            const prevAttIds = (Array.isArray(prev.drawingAttachmentIds) && prev.drawingAttachmentIds.length > 0)
                              ? [...prev.drawingAttachmentIds]
                              : (prev.drawingAttachmentId ? [prev.drawingAttachmentId] : []);

                            let nextDrawings;
                            let nextAttIds;
                            if (editingDrawingIndex !== null && editingDrawingIndex >= 0 && editingDrawingIndex < prevDrawings.length) {
                              nextDrawings = [...prevDrawings];
                              nextDrawings[editingDrawingIndex] = dataUrl;
                              nextAttIds = [...prevAttIds];
                              nextAttIds[editingDrawingIndex] = attachmentId;
                            } else {
                              nextDrawings = [...prevDrawings, dataUrl];
                              nextAttIds = [...prevAttIds, attachmentId];
                            }
                            return {
                              ...prev,
                              drawings: nextDrawings,
                              drawingAttachmentIds: nextAttIds,
                              drawing: nextDrawings[0],
                              drawingAttachmentId: nextAttIds[0]
                            };
                          });
                          setEditingDrawingIndex(null);
                          setShowSketchboard(false);
                        }}
                        onCancel={() => {
                          setEditingDrawingIndex(null);
                          setShowSketchboard(false);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 'مزيد من الميزات' Bottom Sheet / Modal (Image 3 format) */}
                {showMoreFeaturesSheet && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-2xl border border-[#E2DCC8]">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <h3 className="text-base font-extrabold text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                          <span>✨</span>
                          <span>{t.moreFeaturesBtn || t.moreFeatures}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowMoreFeaturesSheet(false)}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* 6 Circular Feature Grid Items (Image 3) */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* 1. الرسم (Draw) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreFeaturesSheet(false);
                            setShowSketchboard(true);
                          }}
                          className="flex flex-col items-center justify-center space-y-2 p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-2xl border border-[#E2DCC8] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                            🖌️
                          </div>
                          <span className="text-xs font-bold text-[#3A3A3A]">{t.drawing || t.sketchIcon}</span>
                        </button>

                        {/* 2. أضف صورة (Add Image) */}
                        <label
                          onClick={markFilePickerActive}
                          className="flex flex-col items-center justify-center space-y-2 p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-2xl border border-[#E2DCC8] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                            🖼️
                          </div>
                          <span className="text-xs font-bold text-[#3A3A3A]">{t.addImageIcon}</span>
                          <input type="file" multiple
                            accept="image/*" onChange={(e) => {
                              handleImageUpload(e);
                              setShowMoreFeaturesSheet(false);
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* 3. لون الخلفية (Background Color) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreFeaturesSheet(false);
                            setShowColorPalette(!showColorPalette);
                          }}
                          className="flex flex-col items-center justify-center space-y-2 p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-2xl border border-[#E2DCC8] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                            🎨
                          </div>
                          <span className="text-xs font-bold text-[#3A3A3A]">{t.bgColorIcon}</span>
                        </button>

                        {/* 4. إرفاق ملف (Attach File) */}
                        <label
                          onClick={markFilePickerActive}
                          className="flex flex-col items-center justify-center space-y-2 p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-2xl border border-[#E2DCC8] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                            📎
                          </div>
                          <span className="text-xs font-bold text-[#3A3A3A]">{t.attachFileIcon}</span>
                          <input type="file" multiple
                            accept="application/pdf,.doc,.docx,.txt,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={async (e) => {
                              markFilePickerActive();
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                await handleGenericFileUpload(files);
                              }
                              e.target.value = '';
                              resetFilePickerGuard();
                              setShowMoreFeaturesSheet(false);
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* 5. أضف صوت (Add Audio / Voice) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreFeaturesSheet(false);
                            handleToggleRecording();
                          }}
                          className="flex flex-col items-center justify-center space-y-2 p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-2xl border border-[#E2DCC8] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                            🎙️
                          </div>
                          <span className="text-xs font-bold text-[#3A3A3A]">{t.addAudioIcon}</span>
                        </button>

                        {/* 6. تأثير الخط (Font Style) - Video 0:48 */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreFeaturesSheet(false);
                            setShowFontDrawer(true);
                          }}
                          className="flex flex-col items-center justify-center space-y-2 p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-2xl border border-[#E2DCC8] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center text-lg font-serif font-bold shadow-xs group-hover:scale-105 transition-transform">
                            Aa
                          </div>
                          <span className="text-xs font-bold text-[#3A3A3A]">{t.fontStyleIcon}</span>
                        </button>
                      </div>

                      {/* Color Palette Selector Inside Features Sheet */}
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <span className="text-xs font-extrabold text-[#5A5A40]">{t.chooseBgColor}</span>
                        <div className="flex items-center justify-around p-2 bg-[#F9F7F2] rounded-2xl border border-[#E2DCC8]">
                          <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#F9F7F2' } : null); setShowMoreFeaturesSheet(false); }} className="w-7 h-7 rounded-full bg-[#F9F7F2] border-2 border-gray-400 cursor-pointer shadow-xs" title="افتراضي" />
                          <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#FFFDF5' } : null); setShowMoreFeaturesSheet(false); }} className="w-7 h-7 rounded-full bg-[#FFFDF5] border-2 border-amber-300 cursor-pointer shadow-xs" title="أصفر دافئ" />
                          <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#F2F7FB' } : null); setShowMoreFeaturesSheet(false); }} className="w-7 h-7 rounded-full bg-[#F2F7FB] border-2 border-blue-300 cursor-pointer shadow-xs" title="أزرق سماوي" />
                          <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#F4F7F2' } : null); setShowMoreFeaturesSheet(false); }} className="w-7 h-7 rounded-full bg-[#F4F7F2] border-2 border-emerald-300 cursor-pointer shadow-xs" title="أخضر ناعم" />
                          <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#FBF7FF' } : null); setShowMoreFeaturesSheet(false); }} className="w-7 h-7 rounded-full bg-[#FBF7FF] border-2 border-purple-300 cursor-pointer shadow-xs" title="لافندر" />
                          <button data-color-swatch="true" type="button" onClick={() => { setEditingDiary(prev => prev ? { ...prev, color: '#FCF2F4' } : null); setShowMoreFeaturesSheet(false); }} className="w-7 h-7 rounded-full bg-[#FCF2F4] border-2 border-rose-300 cursor-pointer shadow-xs" title="وردي" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Font Styling Drawer (Aa) matching video 0:48 */}
                {showFontDrawer && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl border border-[#E2DCC8]" dir={isRtl ? 'rtl' : 'ltr'}>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <button
                          type="button"
                          onClick={() => setShowFontDrawer(false)}
                          className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-emerald-100"
                        >
                          ✓
                        </button>
                        <h3 className="text-base font-extrabold text-[#3A3A3A]">{t.fontDrawerTitle}</h3>
                        <button
                          type="button"
                          onClick={() => setShowFontDrawer(false)}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Font Formatting Icons Toolbar */}
                      <div className="flex items-center justify-around p-2.5 bg-[#F9F7F2] rounded-2xl border border-[#E2DCC8]">
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('- ')} className="p-2 hover:bg-[#E2DCC8]/50 rounded-xl font-bold text-sm text-[#3A3A3A] cursor-pointer" title={t.toolbarBulletList}>
                          •≡
                        </button>
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('1. ')} className="p-2 hover:bg-[#E2DCC8]/50 rounded-xl font-bold text-sm text-[#3A3A3A] cursor-pointer" title={t.toolbarNumberedList}>
                          1≡
                        </button>
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('<u>', '</u>')} className="p-2 hover:bg-[#E2DCC8]/50 rounded-xl font-bold underline text-sm text-[#3A3A3A] cursor-pointer" title={t.toolbarUnderline}>
                          U
                        </button>
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('~~', '~~')} className="p-2 hover:bg-[#E2DCC8]/50 rounded-xl font-bold line-through text-sm text-[#3A3A3A] cursor-pointer" title={t.toolbarStrikethrough}>
                          S
                        </button>
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('*', '*')} className="p-2 hover:bg-[#E2DCC8]/50 rounded-xl italic font-bold text-sm text-[#3A3A3A] cursor-pointer" title={t.formatItalic}>
                          I
                        </button>
                        <button data-compact-control="true" type="button" onClick={() => insertFormatting('**', '**')} className="p-2 hover:bg-[#E2DCC8]/50 rounded-xl font-black text-sm text-[#3A3A3A] cursor-pointer" title={t.formatBold}>
                          B
                        </button>
                      </div>

                      {/* Font Size Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#5A5A40]">
                          <span className="text-xs">Aa</span>
                          <span>{t.fontSizeLabel} ({fontDrawerSize}px)</span>
                          <span className="text-base font-extrabold">Aa</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="32"
                          value={fontDrawerSize}
                          onChange={(e) => setFontDrawerSize(parseInt(e.target.value))}
                          className="w-full h-2 bg-[#E2DCC8] rounded-lg appearance-none cursor-pointer accent-[#8B9D83]"
                        />
                      </div>

                      {/* Choose Font Style Grid (اختر نمط الخط) */}
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold text-[#5A5A40] block">{t.chooseFontStyle}</span>
                        <div className="grid grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                          {[
                            { id: 'font-sans', name: t.fontPreviewNotes, style: 'font-sans' },
                            { id: 'font-serif', name: t.fontPreviewNotes, style: 'font-serif italic' },
                            { id: 'font-mono', name: t.fontPreviewNotes, style: 'font-mono' },
                            { id: 'font-bold', name: t.fontPreviewNotes, style: 'font-sans font-black' },
                            { id: 'font-cairo', name: t.fontPreviewNotes, style: 'font-serif font-bold' },
                            { id: 'font-uppercase', name: t.fontPreviewNotesUpper, style: 'uppercase font-black' },
                            { id: 'font-normal', name: t.fontPreviewNotes, style: 'font-sans font-medium' },
                            { id: 'font-light', name: t.fontPreviewNotes, style: 'font-sans font-light' },
                            { id: 'font-tracking', name: t.fontPreviewNotesSpaced, style: 'tracking-widest' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setFontDrawerFamily(f.style)}
                              className={`p-3 rounded-2xl border text-center text-sm transition-all cursor-pointer ${
                                fontDrawerFamily === f.style
                                  ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-md scale-102'
                                  : 'bg-[#F9F7F2] hover:bg-[#F0EDE4] border-[#E2DCC8] text-[#3A3A3A]'
                              } ${f.style}`}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Assistant Note Writer Bottom Sheet matching video 0:56 */}
                {showAiWriterSheet && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E2DCC8] max-h-[90vh] flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
                        <h3 className="text-sm font-extrabold text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                          <span className="text-amber-500">✨</span>
                          <span>{t.askAiWriterHeader}</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAiWriterSheet(false);
                            setAiWriterResult(null);
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Input Prompt Box with Search Icon */}
                      <div className="relative shrink-0">
                        <input
                          type="text"
                          value={aiWriterTopicInput}
                          onChange={(e) => setAiWriterTopicInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAiGenerateNote();
                            }
                          }}
                          placeholder={t.aiWriterTopicPlaceholder}
                          className="w-full bg-[#F9F7F2] border border-[#E2DCC8] focus:ring-2 focus:ring-[#8B9D83] focus:outline-none rounded-2xl py-3 pr-10 pl-24 text-xs text-[#3A3A3A]"
                        />
                        <div className="absolute right-3 top-3.5 text-gray-400 text-xs">
                          🔍
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAiGenerateNote()}
                          disabled={aiWriterLoading}
                          className="absolute left-1.5 top-1.5 bottom-1.5 px-3 bg-[#8B9D83] hover:bg-[#72856A] text-white text-xs font-bold rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {aiWriterLoading ? (t.generatingAiText) : (t.sendPromptBtn)}
                        </button>
                      </div>

                      {/* Content Body: Loading OR Result OR Suggestions */}
                      <div className="overflow-y-auto space-y-3 flex-1 pr-0.5">
                        {aiWriterLoading ? (
                          <div className="py-8 px-4 text-center space-y-3 bg-[#FDF8EC] rounded-2xl border border-[#E9E1C4] animate-pulse">
                            <div className="w-10 h-10 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl animate-spin">
                              ✨
                            </div>
                            <div className="space-y-1">
                              <p className="font-extrabold text-xs text-[#4E685B]">{t.aiGeneratingTitle}</p>
                              <p className="text-[10px] text-gray-500">{t.aiModelDraftingDesc}</p>
                            </div>
                          </div>
                        ) : aiWriterResult ? (
                          <div className="space-y-3 animate-fadeIn">
                            <div className="bg-[#F9F7F2] p-3.5 rounded-2xl border border-[#E2DCC8] space-y-2">
                              <div className="flex items-center justify-between border-b border-[#E2DCC8]/60 pb-2">
                                <span className="font-extrabold text-xs text-[#2B3E50] flex items-center gap-1.5">
                                  <span>💡</span>
                                  <span>{aiWriterResult.title}</span>
                                </span>
                                <span className="text-[9px] bg-[#8B9D83]/20 text-[#4E685B] px-2 py-0.5 rounded-md font-bold">{t.readyToInsertBadge}</span>
                              </div>
                              <div className="max-h-48 overflow-y-auto text-xs text-[#3A3A3A] leading-relaxed whitespace-pre-wrap font-medium p-1">
                                {aiWriterResult.content}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleApplyAiGeneratedNoteToCurrentEntry}
                                className="w-full py-2.5 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all flex items-center justify-center gap-2"
                              >
                                <span>✍️</span>
                                <span>{t.insertInCurrentEntry}</span>
                              </button>

                              <button
                                type="button"
                                onClick={handleCreateNewDiaryFromAiResult}
                                className="w-full py-2 bg-[#F9F7F2] hover:bg-[#F0EDE4] text-[#4E685B] border border-[#DCE4D8] rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                              >
                                <span>📝</span>
                                <span>{t.createNewDiaryWithText}</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopyAiNote}
                                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-[11px] cursor-pointer transition-all text-center"
                                >
                                  {copiedAiText ? (t.copiedTextSuccess) : (t.copyTextBtn)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiWriterResult(null)}
                                  className="py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl font-medium text-[11px] cursor-pointer transition-all"
                                >
                                  {t.suggestAnotherTopic}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-[11px] font-extrabold text-gray-400 block">{t.quickPromptSuggestionsTitle}</span>
                            <div className="space-y-2">
                              {[
                                { id: 'health', icon: '💡', title: t.promptHealthTitle, prompt: t.promptHealthText },
                                { id: 'article', icon: '📝', title: t.promptArticleTitle, prompt: t.promptArticleText },
                                { id: 'future', icon: '🚀', title: t.promptFutureTitle, prompt: t.promptFutureText },
                                { id: 'marketing', icon: '🎧', title: t.promptMarketingTitle, prompt: t.promptMarketingText },
                                { id: 'projects', icon: '🎯', title: t.promptProjectsTitle, prompt: t.promptProjectsText },
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleAiGenerateNote(item.prompt)}
                                  disabled={aiWriterLoading}
                                  className="w-full flex items-center justify-between p-3 bg-[#F9F7F2] hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-2xl transition-all cursor-pointer group text-start"
                                >
                                  <div className="flex items-center space-x-3 space-x-reverse">
                                    <span className="text-base p-1.5 bg-amber-50 rounded-xl">{item.icon}</span>
                                    <span className="text-xs font-bold text-[#3A3A3A] group-hover:text-[#8B9D83] transition-colors">{item.title}</span>
                                  </div>
                                  <span className="text-xs text-[#8B9D83] font-bold group-hover:translate-x-1 transition-transform">{t.generateAction}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 🧠 Flagship AI Assistant Panel - Real-time Psychological Chat */}
                <div className="border border-[#E2DCC8] bg-[#F9F7F2] rounded-3xl p-3.5 sm:p-5 space-y-3.5 flex flex-col shadow-xs">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#E2DCC8]/60 pb-3 gap-2">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="p-2 bg-[#8B9D83]/15 text-[#8B9D83] rounded-xl text-base">🧠</span>
                      <div>
                        <span className="text-xs font-black text-[#5A5A40] block">
                          {t.aiChatSessionTitle}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {(editingDiary.chatLogs || []).length} {t.messagesCount || (settings?.appLanguage === 'ar' ? 'رسائل' : 'messages')}
                        </span>
                      </div>
                    </div>

                    {/* Chat Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyDiaryChat}
                        disabled={(editingDiary.chatLogs || []).length === 0}
                        className="px-2.5 py-1 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] text-[#5A5A40] rounded-xl text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40 shadow-3xs"
                        title={t.copyChatBtn || (settings?.appLanguage === 'ar' ? 'نسخ المحادثة' : 'Copy Chat')}
                      >
                        <Copy className="w-3 h-3 text-[#8B9D83]" />
                        <span className="hidden sm:inline">{t.copyChatBtn || (settings?.appLanguage === 'ar' ? 'نسخ المحادثة' : 'Copy Chat')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportDiaryChatPdf}
                        disabled={(editingDiary.chatLogs || []).length === 0}
                        className="px-2.5 py-1 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] text-[#5A5A40] rounded-xl text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40 shadow-3xs"
                        title={t.exportChatPdf || (settings?.appLanguage === 'ar' ? 'تصدير كـ PDF' : 'Export Chat PDF')}
                      >
                        <Download className="w-3 h-3 text-[#D4A373]" />
                        <span className="hidden sm:inline">{t.exportChatPdf || (settings?.appLanguage === 'ar' ? 'تصدير PDF' : 'Export PDF')}</span>
                      </button>

                      {(editingDiary.chatLogs || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsChatSelectMode(!isChatSelectMode);
                            setSelectedChatIndices([]);
                          }}
                          className={`px-2.5 py-1 border rounded-xl text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-3xs ${
                            isChatSelectMode
                              ? 'bg-[#8B9D83] text-white border-[#8B9D83]'
                              : 'bg-white hover:bg-[#F0EDE4] border-[#E2DCC8] text-[#5A5A40]'
                          }`}
                        >
                          <CheckSquare className="w-3 h-3" />
                          <span>{isChatSelectMode ? (t.cancelBtn || 'إلغاء') : (t.selectMessages || (settings?.appLanguage === 'ar' ? 'تحديد' : 'Select'))}</span>
                        </button>
                      )}

                      {isChatSelectMode && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedChatIndices.length === (editingDiary.chatLogs || []).length) {
                                setSelectedChatIndices([]);
                              } else {
                                setSelectedChatIndices((editingDiary.chatLogs || []).map((_, idx) => idx));
                              }
                            }}
                            className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            {selectedChatIndices.length === (editingDiary.chatLogs || []).length ? (settings?.appLanguage === 'ar' ? 'إلغاء الكل' : 'Deselect') : (t.selectAll || (settings?.appLanguage === 'ar' ? 'تحديد الكل' : 'Select All'))}
                          </button>

                          {selectedChatIndices.length > 0 && (
                            <button
                              type="button"
                              onClick={handleDeleteSelectedChatMessages}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{t.deleteSelected || (settings?.appLanguage === 'ar' ? `حذف المحدد (${selectedChatIndices.length})` : `Delete (${selectedChatIndices.length})`)}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleDeleteAllChatMessages}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            {t.deleteAll || (settings?.appLanguage === 'ar' ? 'حذف الكل' : 'Delete All')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chat Messages Log Box */}
                  <div className="flex-1 min-h-[420px] max-h-[60vh] overflow-y-auto space-y-3.5 p-4 bg-white border border-[#E2DCC8]/80 rounded-2xl scroll-smooth shadow-inner" id="diary-chat-log-box">
                    {(editingDiary.chatLogs || []).length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-2.5">
                        <span className="text-4xl block">💬</span>
                        <p className="text-xs font-black text-[#5A5A40]">{t.welcomeSafeSpace}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed max-w-md mx-auto font-medium">
                          {t.safeSpaceDesc}
                        </p>
                      </div>
                    ) : (
                      (editingDiary.chatLogs || []).map((msg, idx) => {
                        const isSelected = selectedChatIndices.includes(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              if (isChatSelectMode) {
                                setSelectedChatIndices(prev =>
                                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                );
                              }
                            }}
                            className={`flex flex-col max-w-[92%] sm:max-w-[85%] transition-all ${
                              msg.sender === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'
                            } ${isChatSelectMode ? 'cursor-pointer p-1 rounded-2xl' : ''} ${
                              isSelected ? 'ring-2 ring-red-400 bg-red-50/40 rounded-2xl' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2 w-full">
                              {isChatSelectMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="mt-2.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                                />
                              )}
                              <div
                                className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium break-words flex-1 shadow-3xs select-text ${
                                  msg.sender === 'user'
                                    ? 'bg-[#FAF6EC] text-[#5A5A40] rounded-tr-none border border-[#E2DCC8]/50 whitespace-pre-wrap'
                                    : 'bg-[#EEF1EB] text-[#4E685B] rounded-tl-none border border-[#DCE4D8]'
                                }`}
                              >
                                {msg.sender === 'user' ? msg.text : (
                                  <MarkdownMessage
                                    content={
                                      msg.text.includes('__AI_QUOTA_EXCEEDED__') || msg.text.includes('RESOURCE_EXHAUSTED')
                                        ? getLocalizedAIError('quota-exhausted', settings?.appLanguage)
                                        : (msg.text.includes('__AI_CHECK_API_KEY__') || msg.text.includes('API_KEY_INVALID') ? getLocalizedAIError('key-missing', settings?.appLanguage) : msg.text)
                                    }
                                    isAi={true}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between w-full mt-1 px-1 gap-2">
                              <span className="text-[9px] text-gray-400 font-medium">
                                {msg.sender === 'user' ? (t.meLabel) : (t.aiPsychAdvisor)} • {formatDateTime(msg.createdAt, settings?.appLanguage || 'ar')}
                              </span>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await copyTextSafe(msg.text);
                                  if (ok) {
                                    showGlobalCopyToast(t.copySuccessToast || (settings?.appLanguage === 'ar' ? 'تم النسخ إلى الحافظة بنجاح 📋' : 'Copied!'), 'success');
                                  } else {
                                    showGlobalCopyToast(t.copyFailedToast || (settings?.appLanguage === 'ar' ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy'), 'error');
                                  }
                                }}
                                className="p-0.5 text-gray-400 hover:text-[#8B9D83] rounded transition-colors cursor-pointer"
                                title={t.copyTextBtn || (settings?.appLanguage === 'ar' ? 'نسخ الرسالة' : 'Copy Message')}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Chat Loading Indicator */}
                    {diaryChatLoading && (
                      <div className="flex items-center space-x-2 space-x-reverse ml-auto bg-[#EEF1EB] border border-[#DCE4D8] p-3 rounded-2xl rounded-tl-none text-xs text-[#4E685B] max-w-[85%] animate-pulse shadow-3xs">
                        <span className="w-2 h-2 bg-[#8B9D83] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-[#8B9D83] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-[#8B9D83] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        <span className="text-[10px] font-bold">{t.writingTherapeuticResponse}</span>
                      </div>
                    )}
                  </div>

                  {/* AIMediaAccessSelector: Per-Chat Quota & Token Saver */}
                  <AIMediaAccessSelector
                    permission={diaryChatMediaPermission}
                    onChange={setDiaryChatMediaPermission}
                    availableAttachments={editingDiary ? extractAvailableAttachments([editingDiary]) : []}
                    appLanguage={settings?.appLanguage || 'ar'}
                    compact={true}
                  />

                  {/* Input Chat Messages */}
                  <div className="flex w-full max-w-full overflow-hidden flex-nowrap gap-2 items-center">
                    <input
                      type="text"
                      value={diaryChatMessage}
                      onChange={(e) => setDiaryChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendDiaryChatMessage();
                        }
                      }}
                      placeholder={t.expressMindPlaceholder}
                      className="flex-1 min-w-0 w-full bg-white border border-[#E2DCC8] focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] focus:outline-none rounded-2xl px-3.5 py-2.5 text-xs text-[#3A3A3A] font-medium placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      disabled={diaryChatLoading || !diaryChatMessage.trim()}
                      onClick={() => handleSendDiaryChatMessage()}
                      className="px-4 py-2.5 bg-[#8B9D83] hover:bg-[#72856A] disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-3xs flex items-center justify-center space-x-1.5 space-x-reverse shrink-0 whitespace-nowrap"
                    >
                      <span>{t.sendBtnLabel}</span>
                      <span>🚀</span>
                    </button>
                  </div>

                  {/* Built-in quick psychologist suggestions */}
                  <div className="space-y-1.5 pt-0.5">
                    <p className="text-[10px] text-gray-400 font-extrabold">{t('quickOneClickActions')}</p>
                    <div className="flex flex-wrap sm:flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                      <button
                        type="button"
                        onClick={() => handleSendDiaryChatMessage(t('promptSummarizeEntry'))}
                        className="px-3 py-1.5 bg-white hover:bg-[#F0EDE4] text-[#5A5A40] border border-[#E2DCC8]/70 rounded-xl text-[10.5px] font-bold cursor-pointer transition-all shadow-3xs whitespace-nowrap shrink-0 flex items-center gap-1"
                      >
                        <span>📝</span>
                        <span>{t('summarizeEntryBtn')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendDiaryChatMessage(t('promptExtractCognitiveErrors'))}
                        className="px-3 py-1.5 bg-white hover:bg-[#F0EDE4] text-[#5A5A40] border border-[#E2DCC8]/70 rounded-xl text-[10.5px] font-bold cursor-pointer transition-all shadow-3xs whitespace-nowrap shrink-0 flex items-center gap-1"
                      >
                        <span>💡</span>
                        <span>{t('extractCognitiveErrorsBtn')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendDiaryChatMessage(t('promptPracticalPlanTomorrow'))}
                        className="px-3 py-1.5 bg-white hover:bg-[#F0EDE4] text-[#5A5A40] border border-[#E2DCC8]/70 rounded-xl text-[10.5px] font-bold cursor-pointer transition-all shadow-3xs whitespace-nowrap shrink-0 flex items-center gap-1"
                      >
                        <span>🎯</span>
                        <span>{t('practicalPlanTomorrowBtn')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Editor Bottom Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 pb-safe border-t border-[#E2DCC8]/55">
                  <button
                    type="button"
                    onClick={() => handleDeleteDiary(editingDiary.id)}
                    className="flex items-center justify-center space-x-1 space-x-reverse px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200 sm:border-transparent"
                  >
                    <Trash className="w-4 h-4" />
                    <span>{t.deleteDiaryPermanently}</span>
                  </button>

                  <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                    {!isNewEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleArchiveDiary(editingDiary.id);
                          const nextState = !editingDiary.isArchived;
                          setEditingDiary(prev => prev ? { ...prev, isArchived: nextState } : null);
                          if (nextState) {
                            setEditingDiary(null);
                          }
                        }}
                        className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 space-x-reverse"
                      >
                        <Archive className="w-4 h-4 text-amber-700" />
                        <span>{editingDiary.isArchived ? (t.restoreAction) : (t.archiveAction)}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingDiary(null);
                        setIsNewEntry(false);
                        setDiaryAiAnswer('');
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-[#5A5A40] hover:bg-[#F0EDE4] border border-[#E2DCC8] rounded-xl transition-colors cursor-pointer text-center"
                    >
                      {t.cancelBtn}
                    </button>

                    {/* Attachments Page trigger button */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentsPage(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-white hover:bg-[#F0EDE4] border border-[#E2DCC8] text-[#5A5A40] rounded-xl text-xs font-bold shadow-3xs transition-all cursor-pointer"
                      title={t.attachmentsPageTitle || (settings?.appLanguage === 'ar' ? 'الملحقات والوسائط' : 'Attachments')}
                    >
                      <Folder className="w-4 h-4 text-[#8B9D83]" />
                      <span>{t.attachmentsPageTitle || (settings?.appLanguage === 'ar' ? 'الملحقات' : 'Attachments')}</span>
                      <span className="text-[10px] bg-[#8B9D83] text-white px-1.5 py-0.2 rounded-full font-bold">
                        {(editingDiary.images || []).length + (editingDiary.videos || []).length + (editingDiary.audioRecordings || []).length + (editingDiary.files || []).length + (editingDiary.drawing ? 1 : 0)}
                      </span>
                    </button>

                    {/* Export as Single Image / PDF Modal trigger */}
                    <button
                      type="button"
                      onClick={() => setShowExportDiaryModal(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 space-x-reverse px-4 py-2 bg-[#D4A373] hover:bg-[#B58554] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                      title={t.exportDiary || (settings?.appLanguage === 'ar' ? 'تصدير التدوينة (صورة / PDF)' : 'Export Diary')}
                    >
                      <Download className="w-4 h-4" />
                      <span>{t.exportDiary || (settings?.appLanguage === 'ar' ? 'تصدير التدوينة' : 'Export')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDiary}
                      disabled={isSavingDiary}
                      className={`w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse px-5 py-2 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                        isSavingDiary ? 'opacity-75 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSavingDiary ? (
                        <span>⏳ {settings?.appLanguage === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                      ) : (
                        <span>{t.saveDiarySuccessBtn}</span>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="space-y-6">





                {activeDiariesSubTab === 'journal' ? (
                  <div className="space-y-4">

                    {/* Horizontal Scrollable Filter Bar (All Types + Favorites) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E2DCC8]/40 scrollbar-none w-full max-w-full">
                      {/* All Button */}
                      <button
                        onClick={() => setDiaryTypeFilter('all')}
                        className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 space-x-reverse ${
                          diaryTypeFilter === 'all'
                            ? 'bg-[#5A5A40] text-white shadow-3xs font-extrabold scale-[1.02]'
                            : 'bg-white text-gray-500 hover:text-[#5A5A40] border border-[#E2DCC8]/80 hover:bg-[#F0EDE4]'
                        }`}
                      >
                        <span>🌐</span>
                        <span>{t.allFilterTab}</span>
                      </button>

                      {/* 7 Journal Types */}
                      {ALL_JOURNAL_TYPES.map((typeKey) => {
                        const cfg = getJournalTypeConfig(typeKey);
                        const isSelected = diaryTypeFilter === typeKey;
                        const label = getJournalTypeLabel(typeKey, t);

                        return (
                          <button
                            key={typeKey}
                            onClick={() => setDiaryTypeFilter(typeKey)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 space-x-reverse ${
                              isSelected
                                ? 'bg-[#8B9D83] text-white shadow-3xs font-extrabold scale-[1.02]'
                                : 'bg-white text-gray-500 hover:text-[#5A5A40] border border-[#E2DCC8]/80 hover:bg-[#F0EDE4]'
                            }`}
                          >
                            <span>{cfg.icon}</span>
                            <span className="whitespace-nowrap">{label}</span>
                          </button>
                        );
                      })}

                      {/* Favorites Button */}
                      <button
                        onClick={() => setDiaryTypeFilter('favorites')}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 space-x-reverse ${
                          diaryTypeFilter === 'favorites'
                            ? 'bg-amber-600 text-white shadow-3xs font-extrabold scale-[1.02]'
                            : 'bg-amber-50/70 text-amber-800 border border-amber-200/80 hover:bg-amber-100'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span className="whitespace-nowrap">{t.favoritesLabel}</span>
                      </button>
                    </div>

                    {/* Search Bar - Enhanced floating input with instant clear button */}
                    <div className="relative w-full">
                      <Search className="absolute right-4 top-3.5 w-4 h-4 text-[#8B9D83]" />
                      <input
                        id="diaries-search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t.searchDiariesPlaceholder}
                        className="w-full bg-[#FBFBFA] hover:bg-[#F3F2F0] focus:bg-white border border-[#E2DCC8]/85 focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] focus:outline-none rounded-2xl pr-11 pl-10 py-3.5 text-xs text-[#3A3A3A] transition-all placeholder-gray-400 font-bold shadow-3xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute left-3 top-3 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 transition-all cursor-pointer"
                          title={t.clearSearchTitle}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Active Search Query Status Banner */}
                    {searchQuery.trim() !== '' && (
                      <div className="flex items-center justify-between bg-[#8B9D83]/10 border border-[#8B9D83]/25 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#4E685B] animate-fadeIn">
                        <div className="flex items-center space-x-2 space-x-reverse truncate">
                          <Search className="w-3.5 h-3.5 shrink-0 text-[#8B9D83]" />
                          <span className="truncate">
                            {t.searchResultsFor} <strong className="text-[#3A3A3A]">"{searchQuery}"</strong> ({filteredDiariesList.length} {t.resultsCountSuffix})
                          </span>
                        </div>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-[10px] font-black text-[#8B9D83] hover:text-[#5A5A40] underline shrink-0 cursor-pointer mr-2"
                        >
                          {t.cancelSearchBtn}
                        </button>
                      </div>
                    )}

                    {/* Write New Note Button - Separate floating button */}
                    <button
                      onClick={() => startNewDiary()}
                      className="w-full flex items-center justify-center space-x-2 space-x-reverse py-3.5 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-3xs hover:scale-[1.01] active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t.writeNewNoteBtn}</span>
                    </button>

                    {/* Filter Pills of tags if they exist */}
                    {allUniqueTags.length > 0 && (
                      <div className="flex items-center space-x-2 space-x-reverse overflow-x-auto pb-1 mt-1 scrollbar-none">
                        <span className="text-[10px] font-black text-gray-400 whitespace-nowrap shrink-0">{t.filterTagsLabel}</span>
                        <button
                          onClick={() => setSelectedTagFilter('')}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 ${
                            selectedTagFilter === ''
                              ? 'bg-[#8B9D83] text-white font-bold shadow-3xs'
                              : 'bg-white hover:bg-[#F0EDE4] text-[#5A5A40] border border-[#E2DCC8]/85'
                          }`}
                        >
                          الكل
                        </button>
                        {allUniqueTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedTagFilter(tag)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 ${
                              selectedTagFilter === tag
                                ? 'bg-[#8B9D83] text-white font-bold shadow-3xs'
                                : 'bg-white hover:bg-[#F0EDE4] text-[#5A5A40] border border-[#E2DCC8]/85'
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                {/* Grouped Day-by-Day representation of entries */}
                {(() => {
                  const { sortedDays, groups } = memoizedGroupedDiaries;

                  if (sortedDays.length === 0) {
                    return (
                      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-10 text-center text-gray-400 text-sm space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[#F0EDE4] flex items-center justify-center text-[#8B9D83]">
                          <Search className="w-7 h-7" />
                        </div>
                        {searchQuery ? (
                          <>
                            <p className="font-extrabold text-[#3A3A3A] text-sm">
                              {t.noMatchFoundFor} "{searchQuery}"
                            </p>
                            <p className="text-xs text-gray-400">
                              {t.checkSpellingOrFilter}
                            </p>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="px-4 py-2 bg-[#8B9D83] text-white rounded-xl text-xs font-extrabold shadow-3xs hover:bg-[#72856A] transition-all cursor-pointer"
                            >
                              {t.clearSearchWordBtn}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-[#3A3A3A]">{t.noMatchingDiariesNow}</p>
                            <p className="text-xs mt-1 text-gray-400">{t.clickWriteNewNotePrompt}</p>
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-8">
                      {sortedDays.map((dayKey) => {
                        const dayData = groups[dayKey] || { dayEntries: [], formattedDayLabel: dayKey };
                        const dayEntries = dayData.dayEntries;
                        const formattedDayLabel = dayData.formattedDayLabel;

                        return (
                          <div key={dayKey} className="bg-white border border-[#E2DCC8] rounded-3xl p-6 shadow-xs space-y-5">
                            {/* Large parent Day header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2DCC8]/50 pb-3 gap-2">
                              <div className="flex items-center space-x-2.5 space-x-reverse flex-wrap gap-2">
                                <div className="p-2 bg-[#8B9D83]/10 text-[#8B9D83] rounded-2xl shrink-0">
                                  <Calendar className="w-5 h-5" />
                                </div>
                                <h3 className="font-extrabold text-[#3A3A3A] text-sm md:text-base">
                                  {formattedDayLabel}
                                </h3>

                                {/* NEW: Pros & Cons Button (الإيجابيات والسلبيات) */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenProsConsForDay(dayKey, formattedDayLabel, dayEntries)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-[#2B3E50] via-[#3B5066] to-[#5A5A40] hover:from-[#3B5066] hover:to-[#8B9D83] text-white rounded-xl text-xs font-black shadow-3xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-103 active:scale-97 border border-white/20 shrink-0"
                                  title={t.reviewProsConsTitle}
                                >
                                  <Scale className="w-3.5 h-3.5 text-[#FEFAE0]" />
                                  <span>⚖️ {t.prosConsBtnLabel}</span>
                                </button>

                                {/* Side-by-Side: Full-Day Mood Percentage Breakdown (Strictly 100% Normalized) */}
                                {(() => {
                                  // Compute day mood distribution across entry moods and AI analysis
                                  const moodInputs: Array<{ mood: string; count?: number; percentage?: number }> = [];
                                  dayEntries.forEach(d => {
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
                                    moodInputs.push({ mood: (settings?.appLanguage || 'ar') === 'ar' ? 'مرتاح' : 'Relaxed', percentage: 100 });
                                  }
                                  const dayBreakdown = normalizeMoodDistribution(moodInputs, (settings?.appLanguage || 'ar') === 'ar' ? 'ar' : 'en');
                                  const pillColors = [
                                    'bg-emerald-50 text-emerald-800 border-emerald-200',
                                    'bg-blue-50 text-blue-800 border-blue-200',
                                    'bg-purple-50 text-purple-800 border-purple-200',
                                    'bg-amber-50 text-amber-800 border-amber-200',
                                    'bg-rose-50 text-rose-800 border-rose-200'
                                  ];
                                  const barColors = [
                                    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'
                                  ];
                                  return (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* Slim proportional color bar */}
                                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden flex shadow-inner border border-gray-200 shrink-0 hidden sm:flex">
                                        {dayBreakdown.map((item, idx) => (
                                          <div
                                            key={item.mood}
                                            style={{ width: `${item.percentage}%` }}
                                            className={`${barColors[idx % barColors.length]} h-full`}
                                            title={`${item.mood}: ${item.percentage}%`}
                                          />
                                        ))}
                                      </div>
                                      {/* Pills */}
                                      {dayBreakdown.slice(0, 3).map((item, idx) => (
                                        <span
                                          key={item.mood}
                                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black border flex items-center gap-1 shadow-3xs ${pillColors[idx % pillColors.length]}`}
                                        >
                                          <span>{item.percentage}%</span>
                                          <span>{item.mood}</span>
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>

                              <span className="text-[10px] md:text-xs font-bold text-[#5A5A40] bg-[#F9F7F2] border border-[#E2DCC8]/60 px-3 py-1 rounded-xl self-start sm:self-auto">
                                <span>{dayEntries.length} {t.subNotesCount}</span>
                              </span>
                            </div>

                            {/* Grid of smaller sub-notes on that day */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {dayEntries.map((diary) => {
                                // Format the precise entry time safely
                                const preciseTime = formatTime(diary.createdAt, settings?.appLanguage || 'ar');

                                return (
                                  <div
                                    key={diary.id}
                                    onClick={() => {
                                      setEditingDiary(diary);
                                      setIsNewEntry(false);
                                      setDiaryAiAnswer('');
                                      setNewEditAddition('');
                                    }}
                                    className={`relative group border border-[#E2DCC8]/65 rounded-2xl p-4 sm:p-5 hover:border-[#8B9D83] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 max-w-full overflow-hidden ${
                                      diary.color || 'bg-[#F9F7F2]/45'
                                    }`}
                                  >
                                    {/* Top Corner: precise entry time, edit flag, and ratings */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-gray-500 w-full max-w-full" dir={langInfo.dir}>
                                      {/* Star Ratings & Actions on the Right in RTL */}
                                      <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                                        {/* Direct Favorite Toggle Button */}
                                        <button
                                          type="button"
                                          title={diary.isFavorite ? (t.removeFromFavorites) : (t.addToFavorites)}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavoriteDiary(diary.id);
                                          }}
                                          className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 hover:scale-110 active:scale-95 shadow-3xs ${
                                            (diary.isFavorite === true || (diary.isFavorite === undefined && (diary.importance || 0) >= 4))
                                              ? 'bg-amber-100/95 text-amber-600 border-amber-300 font-bold'
                                              : 'bg-white/90 text-gray-400 border-gray-200 hover:text-amber-500 hover:border-amber-300'
                                          }`}
                                        >
                                          <Star className={`w-3.5 h-3.5 ${
                                            (diary.isFavorite === true || (diary.isFavorite === undefined && (diary.importance || 0) >= 4))
                                              ? 'fill-amber-500 text-amber-500'
                                              : 'text-gray-400'
                                          }`} />
                                        </button>

                                        {/* Importance Rating Stars */}
                                        <div className="flex items-center space-x-0.5 space-x-reverse shrink-0">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                              key={s}
                                              className={`w-3.5 h-3.5 ${
                                                s <= diary.importance ? 'text-[#D4A373] fill-[#D4A373]' : 'text-gray-200'
                                              }`}
                                            />
                                          ))}
                                        </div>

                                        {/* Archive Button */}
                                        <button
                                          type="button"
                                          title={t.archiveAction}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleArchiveDiary(diary.id);
                                          }}
                                          className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-50/90 hover:bg-amber-100/90 text-amber-800 border border-amber-200/80 rounded-xl text-[10px] font-black shadow-3xs hover:shadow-2xs transition-all cursor-pointer flex items-center space-x-1 space-x-reverse group/arch hover:scale-105 active:scale-95 shrink-0"
                                        >
                                          <Archive className="w-3 h-3 text-amber-700 group-hover/arch:rotate-12 transition-transform" />
                                          <span>{t.archiveBtnLabel}</span>
                                        </button>

                                        {/* Move to Trash Button */}
                                        <button
                                          type="button"
                                          title={t.moveToTrash}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDiary(diary.id);
                                          }}
                                          className="p-1 bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg border border-gray-100/50 hover:shadow-2xs transition-all cursor-pointer shrink-0"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>

                                        {/* Edited Flag */}
                                        {(diary.isEdited || (diary.edits && diary.edits.length > 0)) && (
                                          <span className="bg-[#D4A373] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs shrink-0">
                                            {t.editedBadge}
                                          </span>
                                        )}
                                      </div>

                                      {/* Time Pill on the Left in RTL */}
                                      <span className="font-bold flex items-center space-x-1 space-x-reverse bg-white/85 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl border border-[#E2DCC8]/50 shadow-3xs shrink-0 text-[10px]">
                                        <span>⏰</span>
                                        <span>{preciseTime}</span>
                                      </span>
                                    </div>

                                    <div className="space-y-1.5">
                                      {/* Title with dynamic type badge */}
                                      <div className="flex items-center space-x-1.5 space-x-reverse">
                                        {(() => {
                                          const typeCfg = getJournalTypeConfig(diary.diaryType);
                                          return (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black shrink-0 border ${typeCfg.pillBadgeClass}`}>
                                              {typeCfg.icon} {getJournalTypeLabel(diary.diaryType, t)}
                                            </span>
                                          );
                                        })()}
                                        <h4 className="font-extrabold text-[#3A3A3A] text-xs md:text-sm line-clamp-1">
                                          {diary.title || t.subNoteDefaultTitle}
                                        </h4>
                                      </div>

                                      {/* Content Snippet */}
                                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                        {cleanDiaryText(diary.content) || <em className="text-gray-400 font-light text-[11px]">{t.audioDrawingsOnly}</em>}
                                      </p>

                                      {/* Appended Edits Count / Snippet Preview */}
                                      {diary.edits && diary.edits.length > 0 && (
                                        <div className="text-[10px] text-[#8B9D83] font-bold flex items-center space-x-1 space-x-reverse">
                                          <span>💬</span>
                                          <span>{t.containsEditsPrefix} {diary.edits.length} {t.appendedEditsSuffix}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Footer with Moods and Tags matching the layout of the screenshots */}
                                    <div className="pt-2 border-t border-[#E2DCC8]/40 flex flex-wrap items-center justify-between gap-1.5 w-full max-w-full overflow-hidden">
                                      {/* Tags on the right in RTL */}
                                      <div className="shrink-0">
                                        {diary.tags && diary.tags.length > 0 ? (
                                          <span className="text-[9px] text-[#8B9D83] font-black">
                                            #{getTranslatedTag(diary.tags[0], t)}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] text-gray-300 font-bold">#{t.generalTag}</span>
                                        )}
                                      </div>

                                      {/* Mood badge on the left in RTL - showing both manual and AI analyzed mood percentages */}
                                      <div className="flex flex-wrap items-center gap-1 justify-end max-w-full overflow-hidden">
                                        {/* Manual moods */}
                                        {diary.moods && diary.moods.slice(0, 2).map((m, idx) => (
                                          <span key={idx} className="bg-[#8B9D83]/15 text-[#4E685B] text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg font-black border border-[#8B9D83]/20 shadow-3xs max-w-full truncate">
                                            {m}
                                          </span>
                                        ))}

                                        {/* AI Mood percentages */}
                                        {diary.aiMoodAnalysis && diary.aiMoodAnalysis.length > 0 && (
                                          <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                                            {normalizeMoodDistribution(diary.aiMoodAnalysis, isRtl ? 'ar' : 'en').slice(0, 2).map((analysis, idx) => (
                                              <span
                                                key={idx}
                                                className="bg-purple-50 text-purple-700 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg font-black border border-purple-100 shadow-3xs flex items-center space-x-1 space-x-reverse max-w-full overflow-hidden"
                                                title={t.aiMoodAnalysisTitle}
                                              >
                                                <span>🧠</span>
                                                <span className="truncate">{analysis.mood} ({analysis.percentage}%)</span>
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                  </div>
                ) : activeDiariesSubTab === 'gratitude' ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* 1-Tap Return to Journals Banner */}
                    <div className="flex items-center justify-between bg-white border border-[#E2DCC8] p-3 rounded-2xl shadow-3xs">
                      <button
                        type="button"
                        onClick={() => setActiveDiariesSubTab('journal')}
                        className="flex items-center space-x-2 space-x-reverse text-xs font-black text-[#4E685B] hover:text-[#3B5A50] bg-[#8B9D83]/15 hover:bg-[#8B9D83]/25 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
                      >
                        <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        <span>{t.backToJournals || 'العودة إلى اليوميات والفضفضة'}</span>
                      </button>
                      <span className="text-xs font-black text-gray-500 flex items-center gap-1.5">
                        <span>🌸</span>
                        <span>{t.gratitudeSubtab}</span>
                      </span>
                    </div>
                    <GratitudeJournal
                      gratitudeCards={displayedGratitudeCards}
                      setGratitudeCards={setGratitudeCards}
                      settings={settings}
                      diaries={displayedDiaries}
                      setDiaries={setDiaries}
                      setActiveTab={setActiveTab}
                      setActiveDiariesSubTab={setActiveDiariesSubTab}
                      setDiaryTypeFilter={setDiaryTypeFilter}
                      triggerGratitudeNotificationNow={() => setActiveGratitudeReminderNotification(true)}
                      onOpenShareModal={(data) => {
                        if (data) {
                          setGratitudeShareData({
                            text: data.text || '',
                            category: data.category || 'امتنان'
                          });
                        } else {
                          setGratitudeShareData(undefined);
                        }
                        setShowGratitudeShareModal(true);
                      }}
                    />
                  </div>
                ) : activeDiariesSubTab === 'cbt' ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* 1-Tap Return to Journals Banner */}
                    <div className="flex items-center justify-between bg-white border border-[#E2DCC8] p-3 rounded-2xl shadow-3xs">
                      <button
                        type="button"
                        onClick={() => setActiveDiariesSubTab('journal')}
                        className="flex items-center space-x-2 space-x-reverse text-xs font-black text-[#4E685B] hover:text-[#3B5A50] bg-[#8B9D83]/15 hover:bg-[#8B9D83]/25 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
                      >
                        <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        <span>{t.backToJournals || 'العودة إلى اليوميات والفضفضة'}</span>
                      </button>
                      <span className="text-xs font-black text-gray-500 flex items-center gap-1.5">
                        <span>🧠</span>
                        <span>{t.cbtSubtabLabel}</span>
                      </span>
                    </div>
                    <CBTExercisesSection
                      diaries={displayedDiaries}
                      selectedDate={selectedDate}
                      handleUpdateHabit={handleUpdateHabit}
                      isDarkMode={settings.isDarkMode}
                      appLanguage={settings?.appLanguage || 'ar'}
                    />
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* 1-Tap Return to Journals Banner */}
                    <div className="flex items-center justify-between bg-white border border-[#E2DCC8] p-3 rounded-2xl shadow-3xs">
                      <button
                        type="button"
                        onClick={() => setActiveDiariesSubTab('journal')}
                        className="flex items-center space-x-2 space-x-reverse text-xs font-black text-[#4E685B] hover:text-[#3B5A50] bg-[#8B9D83]/15 hover:bg-[#8B9D83]/25 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-3xs active:scale-95"
                      >
                        <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        <span>{t.backToJournals || 'العودة إلى اليوميات والفضفضة'}</span>
                      </button>
                      <span className="text-xs font-black text-gray-500 flex items-center gap-1.5">
                        <span>📋</span>
                        <span>{t.dailyTasksSubtabLabel}</span>
                      </span>
                    </div>
                    <TasksChecklistSection
                      activeDiaryForSelectedDate={activeDiaryForSelectedDate}
                      selectedDate={selectedDate}
                      handleUpdateHabit={handleUpdateHabit}
                      handleUpdateTasks={handleUpdateTasks}
                      habits={displayedHabits}
                      toggleHabitCompletion={toggleHabitCompletion}
                      setHabits={setHabits}
                      habitSettings={settings.habitSettings}
                      onUpdateHabitSettings={(newSettings) =>
                        setSettings(prev => ({
                          ...prev,
                          habitSettings: { ...(prev.habitSettings || {}), ...newSettings } as any
                        }))
                      }
                      onImportData={(importedHabits, importedDiaries) => {
                        if (importedHabits.length > 0) setHabits(importedHabits);
                        if (importedDiaries && importedDiaries.length > 0) setDiaries(importedDiaries);
                      }}
                      isDarkMode={settings.isDarkMode}
                      diaries={displayedDiaries}
                      appLanguage={settings?.appLanguage || 'ar'}
                    />
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* --- TAB VIEW 3: FLAGSHIP SMART ADVISOR --- */}
        {activeTab === 'advisor' && (
          <div className="space-y-6">
            <SmartAdvisor
              diaries={diaries}
              habits={habits}
              gratitudeCards={gratitudeCards}
              books={books}
              userApiKey={settings.userApiKey}
              appLanguage={settings?.appLanguage || 'ar'}
              initialAdvisorTab="diary"
              onFilePickerOpen={markFilePickerActive}
              onFilePickerClose={resetFilePickerGuard}
            />
          </div>
        )}

        {/* --- TAB VIEW 4: MOOD & PROGRESS ANALYTICS (CHARTS) --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">

            {/* Analytics & Therapy Sub-Tab Swapper */}
            <div className="flex bg-[#F0EDE4] p-1.5 rounded-2xl border border-[#E2DCC8]/60 max-w-xl mx-auto sm:mx-0 shadow-3xs flex-wrap gap-1" id="analytics-subtab-selector">
              <button
                onClick={() => setAnalyticsSubTab('report')}
                className={`flex-grow flex items-center justify-center space-x-1.5 space-x-reverse py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  analyticsSubTab === 'report'
                    ? 'bg-white text-[#5A5A40] shadow-sm font-extrabold animate-fade-in'
                    : 'text-gray-500 hover:text-[#5A5A40]'
                }`}
              >
                <span>🎓</span>
                <span>{t.therapySessionAndReportTab}</span>
              </button>
              <button
                onClick={() => setAnalyticsSubTab('charts')}
                className={`flex-grow flex items-center justify-center space-x-1.5 space-x-reverse py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  analyticsSubTab === 'charts'
                    ? 'bg-white text-[#5A5A40] shadow-sm font-extrabold animate-fade-in'
                    : 'text-gray-500 hover:text-[#5A5A40]'
                }`}
              >
                <span>📊</span>
                <span>{t.chartsAndProgressTrackingTab}</span>
              </button>
              <button
                onClick={() => setAnalyticsSubTab('pros_cons')}
                className={`flex-grow flex items-center justify-center space-x-1.5 space-x-reverse py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  analyticsSubTab === 'pros_cons'
                    ? 'bg-[#2B3E50] text-white shadow-sm font-black animate-fade-in'
                    : 'text-gray-600 hover:text-[#2B3E50]'
                }`}
              >
                <span>⚖️</span>
                <span>{t.prosAndConsSubTab}</span>
              </button>
            </div>

            {analyticsSubTab === 'report' ? (
              <IntegratedTherapyReport diaries={diaries} habits={habits} gratitudeCards={gratitudeCards} books={books} userApiKey={settings.userApiKey} appLanguage={settings?.appLanguage || 'ar'} />
            ) : analyticsSubTab === 'pros_cons' ? (
              <ProsConsHistoryLog diaries={diaries} habits={habits} gratitudeCards={gratitudeCards} books={books} userApiKey={settings.userApiKey} appLanguage={settings?.appLanguage || 'ar'} />
            ) : (
              <div className="space-y-6">
                {/* 🌱 Psychological Growth Tree (Visual Gamification Component) */}
                <PsychologicalGrowthTree
                  appLanguage={settings?.appLanguage || 'ar'}
                  diariesCount={diaries.length}
                  cbtCount={diaries.filter(d => (d.cbtWorksheets && d.cbtWorksheets.length > 0)).length}
                  gratitudeCount={gratitudeCards.length}
                  habitsCount={habits.filter(h => h.isCompleted).length}
                  activeStreak={streakInfo.currentStreak}
                  onQuickAction={(action) => {
                    if (action === 'journal') startNewDiary();
                    else if (action === 'gratitude') {
                      setActiveTab('diaries');
                      setActiveDiariesSubTab('gratitude');
                    } else if (action === 'cbt') {
                      setActiveTab('diaries');
                      setActiveDiariesSubTab('cbt');
                    } else if (action === 'habits') {
                      setActiveTab('diaries');
                      setActiveDiariesSubTab('tasks');
                    }
                  }}
                />

                {/* 🧠 Behavioral Correlation Analysis Card */}
                <BehavioralCorrelationCard entries={diaries} appLanguage={settings?.appLanguage || 'ar'} />

                {/* Visual Intro card */}
                <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-2">
                  <h3 className="font-extrabold text-[#3A3A3A] text-sm flex items-center space-x-2 space-x-reverse">
                    <span className="text-lg">📊</span>
                    <span>{t.progressBoardTitle}</span>
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t.progressBoardDesc}
                  </p>
                </div>

                {/* New Feature: Sleep vs Fast Mood Score Correlation Chart (Past Month) */}
                <SleepMoodCorrelationChart diaries={diaries} appLanguage={settings?.appLanguage || 'ar'} />

                {/* Chart 3: Weekly Habit Completion vs Mood Stability Chart */}
                <WeeklyHabitsMoodChart habits={habits} diaries={diaries} appLanguage={settings?.appLanguage || 'ar'} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Chart 1: Sleep trend vs Sports trend */}
                  <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
                    <span className="block text-xs font-bold text-[#5A5A40]">💤 {t.sleepSportsCorrelation}</span>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={diaries.map(d => ({
                          name: d.createdAt.split('T')[0].substring(5),
                          [t.sleepChartLabel]: d.sleepHours || 0,
                          [t.sportsChartLabel]: d.sportsDuration || 0
                        })).reverse()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2DCC8" />
                          <XAxis dataKey="name" stroke="#5A5A40" style={{ fontSize: '10px' }} />
                          <YAxis stroke="#5A5A40" style={{ fontSize: '10px' }} />
                          <ChartTooltip />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="monotone" dataKey={t.sleepChartLabel} stroke="#8B9D83" strokeWidth={2.5} name={t.sleepHoursLabel} />
                          <Line type="monotone" dataKey={t.sportsChartLabel} stroke="#D4A373" strokeWidth={2.5} name={t.sportsMinutesLabel} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Mood counts distribution bar chart */}
                  <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
                    <span className="block text-xs font-bold text-[#5A5A40]">🧠 {t.recordedMoodsDistribution}</span>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={normalizeMoodDistribution(
                          diaries.flatMap(d => Array.isArray(d.moods) ? d.moods : []),
                          isRtl ? 'ar' : 'en'
                        ).map(item => ({ mood: item.mood, frequency: item.percentage }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2DCC8" />
                          <XAxis dataKey="mood" stroke="#5A5A40" style={{ fontSize: '11px' }} />
                          <YAxis stroke="#5A5A40" style={{ fontSize: '10px' }} />
                          <ChartTooltip />
                          <Bar dataKey="frequency" fill="#8B9D83" radius={[6, 6, 0, 0]} name={t.frequencyChartLabel}>
                            {/* Dynamic cell coloring for beautiful look */}
                            {diaries.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8B9D83' : '#D4A373'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Insight Statement box */}
                <div className="bg-[#F0EDE4] border border-[#E2DCC8] p-5 rounded-3xl space-y-2">
                  <h4 className="font-bold text-[#5A5A40] text-xs">💡 {t.aiBehavioralInsightTitle}</h4>
                  <p className="text-xs text-[#3A3A3A] leading-relaxed font-normal">
                    {t.aiBehavioralInsightDesc}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* --- TAB VIEW 5: SETTINGS & BACKUP --- */}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            appLanguage={settings?.appLanguage || 'ar'}
            currentUser={currentUser}
            onUpdateSettings={(patch: any) => {
              setSettings(prev => {
                const updated = { ...prev, ...patch };
                if (patch.isAppLockEnabled !== undefined) {
                  updated.appLockEnabled = patch.isAppLockEnabled;
                  localStorage.setItem('appLockEnabled', String(patch.isAppLockEnabled));
                  if (!patch.isAppLockEnabled) {
                    updated.isAppLocked = false;
                  }
                }
                if (patch.appLockEnabled !== undefined) {
                  localStorage.setItem('appLockEnabled', String(patch.appLockEnabled));
                  if (!patch.appLockEnabled) {
                    updated.isAppLocked = false;
                  }
                }
                return updated;
              });
            }}
            onOpenApiKeys={() => setShowGeminiKeyModal(true)}
            onOpenBackup={() => setShowBackupSyncModal(true)}
            onOpenWriteDiaryImport={() => setShowWriteDiaryImporter(true)}
            onOpenLanguage={() => setShowLanguagesModal(true)}
            onOpenReminders={() => setShowSmartRemindersModal(true)}
            onOpenAccount={() => setIsAuthModalOpen(true)}
            onOpenOnboarding={() => setShowOnboardingTour(true)}
            onTriggerLockScreenNotification={() => { triggerLockScreenNotification().catch(() => undefined); }}
          />
        )}
      </main>



      {/* Mobile Draggable Floating Button for Bottom Nav (Appears when bottom nav auto-collapses on mobile) */}
      {isBottomNavCollapsedOnMobile && !isKeyboardOpen && (
        <motion.div
          drag="x"
          dragMomentum={false}
          dragElastic={0.1}
          className="fixed bottom-3 end-4 z-40 sm:hidden flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-grab active:cursor-grabbing"
          style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
        >
          <button
            type="button"
            onClick={revealBottomNavTemporarily}
            className="flex items-center space-x-2 space-x-reverse px-3.5 py-1.5 bg-[#4E685B] text-white rounded-full shadow-xl border border-white/40 active:scale-95 transition-all cursor-pointer group"
            title={t.showBottomMenuTooltip}
          >
            <Compass className="w-4 h-4 text-[#FEFAE0] animate-pulse shrink-0" />
            <span className="text-[11px] font-black tracking-tight">
              {activeTab === 'dashboard' ? t('nav.home') :
               activeTab === 'diaries' ? t('nav.diaries') :
               activeTab === 'advisor' ? t('nav.advisor') :
               activeTab === 'analytics' ? t('nav.progress') : t('nav.settings')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping"></span>
            <ChevronUp className="w-3.5 h-3.5 text-white/80 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </button>
        </motion.div>
      )}

      {/* Persistent Bottom Tab Navigation Bar with Lucide icons (Mobile / APK Native Bottom Navigation) */}
      <nav
        className={`fixed bottom-0 inset-x-0 md:hidden bg-[#F9F7F2]/95 backdrop-blur-md border-t border-[#E2DCC8] z-[35] shadow-lg font-sans transition-all duration-300 transform ${
          editingDiary !== null || isFullAthkarModalOpen || isLockScreenAthkarOpen || isKeyboardOpen
            ? 'translate-y-full opacity-0 pointer-events-none'
            : isBottomNavCollapsedOnMobile
            ? 'max-sm:translate-y-full max-sm:opacity-0 max-sm:pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))' }}
        dir={isRtl ? 'rtl' : 'ltr'}
        onTouchStart={() => {
          if (!isBottomNavCollapsedOnMobile) {
            revealBottomNavTemporarily();
          }
        }}
        onClick={() => {
          revealBottomNavTemporarily();
        }}
      >
        <div className="max-w-md mx-auto px-1.5 pt-1.5 grid grid-cols-5 gap-0.5 text-center font-bold">

          {/* Tab 1: Dashboard */}
          <button
            type="button"
            onClick={() => {
              switchTab('dashboard');
              revealBottomNavTemporarily();
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl transition-all cursor-pointer tap-feedback ${
              activeTab === 'dashboard' ? 'text-[#8B9D83] scale-105 font-black' : 'text-gray-400 hover:text-[#5A5A40]'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight font-black truncate max-w-full block">{t('nav.home')}</span>
          </button>

          {/* Tab 2: Journal Diaries (Returns directly to Journaling & Venting) */}
          <button
            type="button"
            onClick={() => {
              switchTab('diaries', { subTab: 'journal' });
              setActiveDiariesSubTab('journal');
              revealBottomNavTemporarily();
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl transition-all cursor-pointer tap-feedback ${
              activeTab === 'diaries' ? 'text-[#8B9D83] scale-105 font-black' : 'text-gray-400 hover:text-[#5A5A40]'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight font-black truncate max-w-full block">{t('nav.diaries')}</span>
          </button>

          {/* Tab 3: Flagship Smart Advisor */}
          <button
            type="button"
            onClick={() => {
              switchTab('advisor');
              revealBottomNavTemporarily();
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl transition-all cursor-pointer tap-feedback ${
              activeTab === 'advisor' ? 'text-[#8B9D83] scale-105 font-black' : 'text-gray-400 hover:text-[#5A5A40]'
            }`}
          >
            <div className="relative">
              <Brain className="w-5 h-5 mb-0.5" />
              <span className="absolute top-[-3px] left-[-3px] w-2 h-2 bg-[#D4A373] rounded-full animate-ping"></span>
            </div>
            <span className="text-[10px] leading-tight font-black truncate max-w-full block">{t('nav.advisor')}</span>
          </button>

          {/* Tab 4: Interactive Charts & Analytics */}
          <button
            type="button"
            onClick={() => {
              switchTab('analytics');
              revealBottomNavTemporarily();
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl transition-all cursor-pointer tap-feedback ${
              activeTab === 'analytics' ? 'text-[#8B9D83] scale-105 font-black' : 'text-gray-400 hover:text-[#5A5A40]'
            }`}
          >
            <Activity className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight font-black truncate max-w-full block">{t('nav.progress')}</span>
          </button>

          {/* Tab 5: Settings and Backup */}
          <button
            type="button"
            onClick={() => {
              switchTab('settings');
              revealBottomNavTemporarily();
            }}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[44px] py-1 rounded-xl transition-all cursor-pointer tap-feedback ${
              activeTab === 'settings' ? 'text-[#8B9D83] scale-105 font-black' : 'text-gray-400 hover:text-[#5A5A40]'
            }`}
          >
            <SettingsIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight font-black truncate max-w-full block">{t('nav.settings')}</span>
          </button>

        </div>
      </nav>

      {/* 🎓 Therapist Report Modal Window */}
      <TherapistReportModal
        isOpen={showTherapistModal}
        onClose={() => setShowTherapistModal(false)}
        diaries={diaries}
        userApiKey={settings.userApiKey}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* ⭐ Rating Modal Window */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* ✉️ Contact Owner Modal Window */}
      <ContactOwnerModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* 🔑 Gemini API Key Modal Window */}
      <GeminiKeyModal
        isOpen={showGeminiKeyModal}
        onClose={() => setShowGeminiKeyModal(false)}
        apiKey={settings.userApiKey || ''}
        apiKeys={settings.apiKeys}
        activeKeyId={settings.activeKeyId}
        onSavePool={(keys, activeId) => {
          const activeKeyObj = keys.find(k => k.id === activeId);
          setSettings(prev => ({
            ...prev,
            apiKeys: keys,
            activeKeyId: activeId,
            userApiKey: activeKeyObj ? activeKeyObj.key : (keys[0]?.key || '')
          }));
        }}
        onSave={(key) => setSettings(prev => ({ ...prev, userApiKey: key }))}
        onClear={() => setSettings(prev => ({ ...prev, userApiKey: '', apiKeys: [], activeKeyId: undefined }))}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* ☁️ Backup & Sync Modal Window */}
      <BackupSyncModal
        isOpen={showBackupSyncModal}
        onClose={() => setShowBackupSyncModal(false)}
        appLanguage={settings?.appLanguage || 'ar'}
        isCloudSyncing={isCloudSyncing}
        cloudSyncMessage={cloudSyncMessage}
        onCloudSync={() => performCloudSync()}
        onCloudRestore={handleCloudRestore}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        backupEmail={backupEmail}
        setBackupEmail={setBackupEmail}
        isSendingEmailBackup={isSendingEmailBackup}
        onSendEmailBackup={handleSendEmailBackup}
        emailBackupStatus={emailBackupStatus}
        onClearEmailBackupStatus={() => setEmailBackupStatus(null)}
        autoBackupInterval={(settings.backupSettings?.autoBackup === 'onWrite' ? 'daily' : settings.backupSettings?.autoBackup) as any || 'off'}
        onChangeAutoBackupInterval={(interval) => setSettings(prev => ({
          ...prev,
          backupSettings: {
            ...prev.backupSettings,
            autoBackup: interval === 'daily' ? 'onWrite' : interval
          }
        }))}
        onOpenWriteDiaryImport={() => setShowWriteDiaryImporter(true)}
        onExportCsv={handleExportCsvBackup}
      />

      {/* 🔮 Predictive Health & Sleep Insights Modal */}
      <PredictiveHealthInsightsModal
        isOpen={showPredictiveHealthModal}
        onClose={() => setShowPredictiveHealthModal(false)}
        diaries={diaries}
        appLanguage={settings?.appLanguage || 'ar'}
        apiKey={settings.userApiKey}
      />

      {/* 🎙️ AI Voice Journaling Assistant Modal */}
      <AIVoiceJournalModal
        isOpen={showVoiceJournalModal}
        onClose={() => setShowVoiceJournalModal(false)}
        onSaveDiary={async (entry) => {
          const fullEntry: DiaryEntry = {
            id: `diary-${Date.now()}`,
            title: entry.title || t.voiceDiaryDefaultTitle,
            content: entry.content || '',
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || new Date().toISOString(),
            diaryType: entry.diaryType || 'diary',
            isFavorite: false,
            moods: entry.moods || ['مرتاح'],
            importance: entry.importance || 4,
            sleepHours: entry.sleepHours,
            sportsDuration: entry.sportsDuration,
            tags: entry.tags || ['مذكرة صوتية'],
            color: 'bg-white border-[#E2DCC8]',
            images: entry.images || [],
            videos: entry.videos || [],
            links: entry.links || [],
            audioRecordings: entry.audioRecordings || [],
            files: entry.files || [],
            tasks: entry.tasks || [],
            chatLogs: [],
            isLocked: false
          };

          // Save entry to memory state & persistence, then open it directly.
          setDiaries(prev => {
            const next = [fullEntry, ...prev.filter(item => item.id !== fullEntry.id)];
            try {
              localStorage.setItem('yawmiyati_diaries', JSON.stringify(sanitizeDiariesForLocalStorage(next)));
            } catch (_) {}
            return next;
          });
          setEditingDiary(fullEntry);
          setIsNewEntry(false);
          setActiveTab('diaries');
          setActiveDiariesSubTab(fullEntry.diaryType === 'gratitude' ? 'gratitude' : 'journal');
          setDiaryTypeFilter(fullEntry.diaryType || 'diary');
          setDiaryAiAnswer('');
          triggerAutoSaveFeedback();
          showGlobalCopyToast(`${t.voiceJournalTitle || 'التسجيل الصوتي'} ✓`);
        }}
        appLanguage={settings?.appLanguage || 'ar'}
        apiKey={settings.userApiKey}
      />

      {/* 📤 Export Diary as Single Image / PDF Modal */}
      <ExportDiaryModal
        isOpen={showExportDiaryModal}
        onClose={() => setShowExportDiaryModal(false)}
        diary={editingDiary}
        appLanguage={settings?.appLanguage || 'ar'}
        userName={currentUser?.name || ''}
      />

      {/* 📁 Dedicated Diary Attachments Page Modal (Multi-Drawings Support) */}
      <AttachmentsPage
        isOpen={showAttachmentsPage}
        onClose={() => setShowAttachmentsPage(false)}
        diary={editingDiary}
        appLanguage={settings?.appLanguage || 'ar'}
        onPreviewMedia={setPreviewMedia}
        onOpenDrawing={(dIdx) => {
          setEditingDrawingIndex(dIdx !== undefined ? dIdx : 0);
          setShowAttachmentsPage(false);
          setShowSketchboard(true);
        }}
        onDeleteImage={handleDeleteDiaryImage}
        onDeleteVideo={handleDeleteDiaryVideo}
        onDeleteAudio={handleDeleteAudioRecording}
        onDeleteFile={handleDeleteFileAttachment}
        onDeleteDrawing={(dIdx) => {
          const idx = dIdx !== undefined ? dIdx : 0;
          setEditingDiary(prev => {
            if (!prev) return null;
            const curDrawings = (Array.isArray(prev.drawings) && prev.drawings.length > 0)
              ? prev.drawings
              : (prev.drawing ? [prev.drawing] : []);
            const curAttIds = prev.drawingAttachmentIds || (prev.drawingAttachmentId ? [prev.drawingAttachmentId] : []);
            const attId = curAttIds[idx];
            if (attId) deleteAttachmentBlob(attId);
            const nextDrawings = curDrawings.filter((_, i) => i !== idx);
            const nextAttIds = curAttIds.filter((_, i) => i !== idx);
            return {
              ...prev,
              drawings: nextDrawings,
              drawingAttachmentIds: nextAttIds,
              drawing: nextDrawings[0] || undefined,
              drawingAttachmentId: nextAttIds[0] || undefined
            };
          });
        }}
      />

      {/* 🎙️ Quick Continuous Voice Vent Modal */}
      <VoiceVentModal
        isOpen={showVoiceVentModal}
        onClose={() => setShowVoiceVentModal(false)}
        appLanguage={settings?.appLanguage || 'ar'}
        onSaveAudioRecording={(rec) => {
          addAudioToDiaryAtomic(rec);
          // Only transcribe if not already successfully transcribed by Gemini in modal
          if (!rec.transcription || rec.transcription === 'تسجيل فضفضة صوتية' || rec.transcription === 'Voice vent recording' || rec.transcription.includes('⏳')) {
            handleTranscribeAudioItem(rec);
          }
        }}
        onAppendTextToContent={(text) => {
          if (editorRef.current) {
            const current = editorRef.current.innerHTML || '';
            const separator = current && current.trim() ? '<br/><br/>' : '';
            editorRef.current.innerHTML = `${current}${separator}🎙️ [فضفضة صوتية]:<br/>${text.replace(/\n/g, '<br/>')}`;
          }
          setEditingDiary(prev => {
            if (!prev) return null;
            const separator = prev.content && prev.content.trim() ? '\n\n' : '';
            const updated = `${prev.content || ''}${separator}🎙️ [فضفضة صوتية]:\n${text}`;
            setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, content: updated } : d));
            return { ...prev, content: updated };
          });
        }}
      />

      {/* 🌸 Selective Gratitude Wall Import Modal */}
      <GratitudeImportModal
        isOpen={showGratitudeImportModal}
        onClose={() => setShowGratitudeImportModal(false)}
        gratitudeCards={displayedGratitudeCards}
        appLanguage={settings?.appLanguage || 'ar'}
        onImportSelected={(formattedText) => {
          if (editorRef.current) {
            const current = editorRef.current.innerHTML || '';
            editorRef.current.innerHTML = current + formattedText.replace(/\n/g, '<br/>');
          }
          setEditingDiary(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              content: (prev.content || '') + formattedText
            };
            saveDraftSynchronously(updated);
            setDiaries(diariesPrev => diariesPrev.map(d => d.id === prev.id ? { ...d, content: updated.content } : d));
            return updated;
          });
        }}
      />

      {/* 📋 Bulletproof Global Clipboard Toast */}
      {globalCopyToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[220] bg-[#2B3E50]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn border border-[#E2DCC8]/30">
          <span className="text-sm">{globalCopyToast.type === 'success' ? '📋' : '⚠️'}</span>
          <span>{globalCopyToast.message}</span>
        </div>
      )}

      {/* 🧭 Interactive Onboarding Tour Modal */}
      <OnboardingTourModal
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenVoiceJournal={() => {
          setShowOnboardingTour(false);
          setShowVoiceJournalModal(true);
        }}
        onOpenVoiceVent={() => {
          setShowOnboardingTour(false);
          setShowVoiceVentModal(true);
        }}
        onOpenSyncModal={() => {
          setShowOnboardingTour(false);
          setIsAuthModalOpen(true);
        }}
        onOpenWriteDiaryImport={() => {
          setShowOnboardingTour(false);
          setShowWriteDiaryImporter(true);
        }}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* 👤 User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onManualSync={() => performCloudSync()}
        onManualRestore={handleCloudRestore}
        isSyncing={isCloudSyncing}
        syncMessage={cloudSyncMessage}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* 📖 WriteDiary (يومياتي) Importer Modal */}
      <WriteDiaryImporter
        isOpen={showWriteDiaryImporter}
        onClose={() => setShowWriteDiaryImporter(false)}
        appLanguage={settings?.appLanguage || 'ar'}
        onImportCompleted={handleWriteDiaryImportCompleted}
      />

      {/* 🌐 Languages Modal Window */}
      <LanguagesModal
        isOpen={showLanguagesModal}
        onClose={() => {
          setShowLanguagesModal(false);
          setIsFirstTimeLangSelect(false);
          localStorage.setItem('yawmiyati_language_chosen', 'true');
          localStorage.setItem('app_language', settings?.appLanguage || 'ar');
        }}
        appLanguage={settings?.appLanguage || 'ar'}
        onChangeLanguage={(lang) => {
          setSettings(prev => ({ ...prev, appLanguage: lang }));
          localStorage.setItem('yawmiyati_language_chosen', 'true');
          localStorage.setItem('app_language', lang);
        }}
        appFont={settings.appFont || 'cairo'}
        appLineHeight={settings.appLineHeight || 'relaxed'}
        onChangeFont={(font) => setSettings(prev => ({ ...prev, appFont: font }))}
        onChangeLineHeight={(lh) => setSettings(prev => ({ ...prev, appLineHeight: lh }))}
        isFirstTime={isFirstTimeLangSelect}
      />

      {/* 🎨 Shareable Gratitude & Quote Cards Exporter Modal */}
      <ShareableGratitudeCardModal
        isOpen={showGratitudeShareModal}
        onClose={() => setShowGratitudeShareModal(false)}
        appLanguage={settings?.appLanguage || 'ar'}
        initialData={gratitudeShareData}
      />

      {/* 🌟 In-App Floating Reminder Overlay */}
      <InAppReminderOverlay
        reminder={activeInAppReminder}
        onAnswer={handleReminderResponse}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* 🔔 Smart Reminders Management Modal */}
      <SmartRemindersModal
        isOpen={showSmartRemindersModal}
        onClose={() => setShowSmartRemindersModal(false)}
        reminders={settings.reminders || []}
        appLanguage={settings?.appLanguage || 'ar'}
        onSaveReminders={(updatedReminders) => {
          setSettings(prev => ({ ...prev, reminders: updatedReminders }));
        }}
      />

      {/* ⚡ Triggered Reminder Notification Popup */}
      {triggeredReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir={langInfo.dir}>
          <div className="bg-[#FAF8F5] border-2 border-[#D4A373] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <span className="text-3xl bg-[#FCF5DE] p-3 rounded-2xl border border-[#E9E1C4] shadow-xs">
                {triggeredReminder.categoryIcon || '🔔'}
              </span>
              <div>
                <span className="text-[10px] font-black bg-[#D4A373] text-white px-2.5 py-0.5 rounded-full">
                  {t("smartReminderNow", { time: triggeredReminder.time }) || `Reminder (${triggeredReminder.time})`}
                </span>
                <h3 className="text-base font-extrabold text-[#2C3E35] mt-1">
                  {triggeredReminder.title}
                </h3>
              </div>
            </div>

            {triggeredReminder.motivationalNote && (
              <div className="bg-[#FCF5DE] border border-[#E9E1C4] p-3.5 rounded-2xl text-xs text-[#8C661D] font-bold space-y-1">
                <div className="flex items-center gap-1 text-[#A67E2E]">
                  <Sparkles className="w-4 h-4" />
                  <span>{t.motivationalNoteForYou}</span>
                </div>
                <p className="leading-relaxed italic text-sm">
                  "{triggeredReminder.motivationalNote}"
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setTriggeredReminder(null);
                  setActiveTab('diaries');
                  setActiveDiariesSubTab('journal');
                }}
                className="flex-1 py-2.5 bg-[#4E685B] text-white font-bold text-xs rounded-xl hover:bg-[#3F5449] transition-all cursor-pointer shadow-xs text-center"
              >
                {t.goToJournal}
              </button>
              <button
                onClick={() => setTriggeredReminder(null)}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-300 transition-all cursor-pointer"
              >
                {t.okThanks}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF template for export - beautifully styled like a real physical A4 page */}
      {editingDiary && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100 }}>
          <div
            id="diary-to-pdf"
            className="w-[794px] bg-white text-[#2C3E50] p-12 font-sans flex flex-col justify-between"
            style={{
              direction: 'rtl',
              minHeight: '1123px', // A4 aspect ratio height at 794px width
              fontFamily: '"Cairo", "Inter", sans-serif'
            }}
          >
            {/* Elegant Header Block */}
            <div className="border-b-2 border-[#8B9D83] pb-6 mb-8 flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-12 h-12 bg-[#8B9D83]/10 border border-[#8B9D83] rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                  📓
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#8B9D83] tracking-wide">{t.hayatAi}</h1>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{t.diaryVentingSafeLog}</p>
                </div>
              </div>
              <div className="text-left">
                <div className="text-[10px] text-gray-400 font-bold">{t.exportDateTitle}</div>
                <div className="text-xs text-gray-600 font-bold mt-1" style={{ direction: 'ltr' }}>
                  {formatDateTime(new Date(), settings?.appLanguage || 'ar')}
                </div>
              </div>
            </div>

            {/* Main Document Body */}
            <div className="flex-1 space-y-6">

              {/* Note Metadata Block */}
              <div className="bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl p-6 grid grid-cols-3 gap-4">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold mb-1">{t.entryDateLabel}</span>
                  <span className="text-xs text-[#3A3A3A] font-extrabold">
                    {formatDate(editingDiary.createdAt, settings?.appLanguage || 'ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold mb-1">{t.emotionalDepthSelfImportance}</span>
                  <span className="text-xs text-[#D4A373] font-black flex items-center">
                    {'★'.repeat(editingDiary.importance)}
                    {'☆'.repeat(5 - editingDiary.importance)}
                    <span className="text-gray-400 font-bold mr-1.5 text-[10px]">({editingDiary.importance}/5)</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold mb-1">{t.loggedMoodStatus}</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {editingDiary.moods.length > 0 ? (
                      editingDiary.moods.map((m, i) => (
                        <span key={i} className="text-[10px] font-bold bg-[#8B9D83]/10 text-[#5A5A40] border border-[#8B9D83]/20 px-2 py-0.5 rounded-full">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">{t.noMoodSpecified}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title Section */}
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#3A3A3A] leading-tight pr-4 border-r-4 border-[#8B9D83]">
                  {editingDiary.title || 'مذكرة يومية بدون عنوان'}
                </h2>
              </div>

              {/* Content Box */}
              <div className="pt-4 pb-8 border-b border-dashed border-gray-200">
                <p className="text-sm text-[#3A3A3A] leading-relaxed whitespace-pre-wrap font-normal" style={{ minHeight: '200px' }}>
                  {editingDiary.content}
                </p>
              </div>

              {/* Tasks Checklist if any */}
              {editingDiary.tasks && editingDiary.tasks.length > 0 && (
                <div className="bg-[#F4F6F4]/50 border border-gray-100 rounded-2xl p-6 space-y-3">
                  <h3 className="text-xs font-black text-[#5A5A40] flex items-center">
                    <span className="ml-1.5">📋</span>
                    <span>{t.linkedTasksForDay}</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {editingDiary.tasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-2 space-x-reverse text-xs text-[#3A3A3A]">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-black ${
                          task.completed
                            ? 'bg-[#8B9D83] border-[#8B9D83] text-white'
                            : 'bg-white border-gray-300 text-transparent'
                        }`}>
                          ✓
                        </span>
                        <span className={`${task.completed ? 'line-through text-gray-400 font-medium' : 'font-semibold text-gray-700'}`}>
                          {task.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Drawings if any (Multi-Drawing Support) */}
              {(() => {
                const viewDrawings = (Array.isArray(editingDiary.drawings) && editingDiary.drawings.length > 0)
                  ? editingDiary.drawings
                  : (editingDiary.drawing ? [editingDiary.drawing] : []);
                if (viewDrawings.length === 0) return null;
                return (
                  <div className="border border-gray-200 rounded-2xl p-6 space-y-3 bg-white shadow-3xs">
                    <h3 className="text-xs font-black text-[#5A5A40] flex items-center">
                      <span className="ml-1.5">🎨</span>
                      <span>{t.attachedSketchDrawing} ({viewDrawings.length})</span>
                    </h3>
                    <div className={`grid gap-3 ${viewDrawings.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {viewDrawings.map((dSrc, dIdx) => (
                        <div key={dIdx} className="w-full h-48 bg-[#F9F7F2] rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 p-2">
                          <img src={dSrc} className="max-w-full max-h-full object-contain" alt={`${t.associatedDrawingAlt} ${dIdx + 1}`} referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Subsequent Additions & Edits Timeline if any */}
              {editingDiary.edits && editingDiary.edits.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-[#5A5A40] flex items-center">
                    <span className="ml-1.5">⏱️</span>
                    <span>{t.subsequentEditsLog}</span>
                  </h3>
                  <div className="space-y-3">
                    {editingDiary.edits.map((edit) => (
                      <div key={edit.id} className="bg-[#FAEDCD]/15 border-r-4 border-[#D4A373] p-4 rounded-l-xl rounded-r-xs space-y-1">
                        <div className="text-[9px] text-[#D4A373] font-black">
                          📆 تم الإدراج في: {edit.timestamp}
                        </div>
                        <p className="text-xs text-[#3A3A3A] leading-relaxed font-normal">
                          {edit.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Aesthetic Calming Footer */}
            <div className="border-t border-gray-100 pt-6 mt-8 flex flex-col items-center text-center space-y-2">
              <p className="text-xs italic text-[#8B9D83] font-bold">
                "إن كتابة اليوميات والوعي بالمشاعر هو أولى خطوات التوازن النفسي والسلام الداخلي."
              </p>
              <div className="text-[9px] text-gray-400 font-bold flex items-center space-x-1.5 space-x-reverse mt-2">
                <span>{t.hayatAiApp}</span>
                <span>•</span>
                <span>{t.safePersonalExportNotice}</span>
                <span>•</span>
                <span>{t.allUserRightsReservedBadge}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🧠 CBT Step-by-Step Restructuring Wizard Modal */}
      {showAddCbtModal && (
        <div className="fixed inset-0 bg-[#5A5A40]/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" dir={langInfo.dir}>
          <div className="bg-white border border-[#E2DCC8] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-fade-in text-start">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DCC8]/60">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-xl">🧠</span>
                <div>
                  <h4 className="font-extrabold text-sm text-[#3A3A3A]">{t.cbtModalMainTitle}</h4>
                  <p className="text-[9px] text-gray-400 font-bold">{(t.cbtStepCounterText).replace("{step}", String(cbtStep))}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddCbtModal(false);
                  setCbtStep(1);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1.5 hover:bg-[#F9F7F2] rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Trigger Event */}
            {cbtStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-[#5A5A40]">{t.cbtStepTriggerLabel}</label>
                  <p className="text-[10px] text-gray-400 font-medium">{t.cbtStepTriggerDesc}</p>
                </div>
                <textarea
                  value={cbtTriggerEvent}
                  onChange={(e) => setCbtTriggerEvent(e.target.value)}
                  placeholder={t.cbtStep1Placeholder}
                  className="w-full h-24 bg-[#F9F7F2]/50 hover:bg-[#F0EDE4]/40 focus:bg-white border border-[#E2DCC8] rounded-2xl p-3 text-xs text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
                />
                <div className="flex justify-end">
                  <button
                    disabled={!cbtTriggerEvent.trim()}
                    onClick={() => setCbtStep(2)}
                    className="px-5 py-2 bg-[#8B9D83] hover:bg-[#72856A] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    التالي ➔
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Negative Thoughts */}
            {cbtStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-[#5A5A40]">{t.cbtStepThoughtLabel}</label>
                  <p className="text-[10px] text-gray-400 font-medium">{t.cbtStepThoughtDesc}</p>
                </div>
                <textarea
                  value={cbtNegativeThoughts}
                  onChange={(e) => setCbtNegativeThoughts(e.target.value)}
                  placeholder={t.cbtStep2Placeholder}
                  className="w-full h-24 bg-red-50/10 hover:bg-red-50/20 focus:bg-white border border-red-200/50 rounded-2xl p-3 text-xs text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <div className="flex justify-between">
                  <button
                    onClick={() => setCbtStep(1)}
                    className="px-4 py-2 bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    🠔 السابق
                  </button>
                  <button
                    disabled={!cbtNegativeThoughts.trim()}
                    onClick={() => setCbtStep(3)}
                    className="px-5 py-2 bg-[#8B9D83] hover:bg-[#72856A] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    التالي ➔
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Cognitive Distortion Selector */}
            {cbtStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-[#5A5A40]">{t.cbtStepDistortionLabel}</label>
                  <p className="text-[10px] text-gray-400 font-medium">{t.cbtStepDistortionDesc}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {[
                    { id: 'التفكير الكارثي (Catastrophizing) 🌪️', label: 'التفكير الكارثي (تهويل الأمور) 🌪️' },
                    { id: 'الكل أو لا شيء (All-or-Nothing) 🔲', label: 'الكل أو لا شيء (المثالية القاتلة) 🔲' },
                    { id: 'قراءة الأفكار (Mind Reading) 🔮', label: 'قراءة الأفكار (توقع السوء) 🔮' },
                    { id: 'شخصنة الأمور (Personalization) 👤', label: 'شخصنة الأمور (جلد الذات واللوم) 👤' },
                    { id: 'الترشيح السلبي (Mental Filter) ❌', label: 'الترشيح السلبي (تجاهل الإيجابيات) ❌' },
                    { id: 'التعميم الزائد (Overgeneralization) ♾️', label: 'التعميم الزائد (حكم مطلق مفرط) ♾️' },
                  ].map(dist => (
                    <button
                      key={dist.id}
                      onClick={() => setCbtCognitiveDistortion(dist.id)}
                      className={`p-2.5 rounded-xl border text-xs text-right font-bold transition-all cursor-pointer ${
                        cbtCognitiveDistortion === dist.id
                          ? 'bg-[#8B9D83]/20 border-[#8B9D83] text-[#5A5A40] scale-102 font-black shadow-2xs'
                          : 'bg-[#F9F7F2] border-[#E2DCC8]/60 hover:bg-[#F0EDE4] text-gray-600'
                      }`}
                    >
                      {dist.label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setCbtStep(2)}
                    className="px-4 py-2 bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    🠔 السابق
                  </button>
                  <button
                    onClick={() => setCbtStep(4)}
                    className="px-5 py-2 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    التالي ➔
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Emotion intensity */}
            {cbtStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-[#5A5A40]">{t.cbtStepAnxietyLabel}</label>
                  <p className="text-[10px] text-gray-400 font-medium">{t.cbtStepAnxietyDesc}</p>
                </div>

                <div className="flex flex-col items-center py-4 bg-[#F9F7F2]/50 border border-[#E2DCC8]/50 rounded-2xl space-y-2">
                  <span className="font-mono text-2xl text-red-600 font-extrabold">{cbtEmotionBefore} / 10</span>
                  <span className="text-xs text-gray-400 font-bold">
                    {cbtEmotionBefore <= 3 ? (t.cbtAnxietyMild) :
                     cbtEmotionBefore <= 7 ? (t.cbtAnxietyModerate) : (t.cbtAnxietySevere)}
                  </span>

                  <div className="w-full px-8 pt-3">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={cbtEmotionBefore}
                      onChange={(e) => setCbtEmotionBefore(Number(e.target.value))}
                      className="w-full h-2 bg-[#E2DCC8] rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCbtStep(3)}
                    className="px-4 py-2 bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    🠔 السابق
                  </button>
                  <button
                    onClick={() => {
                      setCbtStep(5);
                      // Auto trigger Gemini restructuring as soon as they land on Step 5
                      handleGenerateCbtAlternative();
                    }}
                    className="px-5 py-2 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    التالي ➔
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Rational Alternative (with AI help) */}
            {cbtStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-emerald-700">{t.cbtStepAlternativeLabel}</label>
                  <p className="text-[10px] text-gray-400 font-medium">{t.cbtStepAlternativeDesc}</p>
                </div>

                {cbtLoading ? (
                  <div className="flex flex-col items-center justify-center p-6 border border-[#E2DCC8] rounded-2xl bg-[#F9F7F2]/40 space-y-2">
                    <RefreshCw className="w-6 h-6 text-[#8B9D83] animate-spin" />
                    <span className="text-[10px] text-gray-400 font-bold">{t.cbtAiEngineWorkingStatus}</span>
                  </div>
                ) : (
                  <textarea
                    value={cbtRationalAlternative}
                    onChange={(e) => setCbtRationalAlternative(e.target.value)}
                    placeholder={t.cbtStep5Placeholder}
                    className="w-full h-28 bg-emerald-50/10 hover:bg-emerald-50/20 focus:bg-white border border-emerald-200/50 rounded-2xl p-3 text-xs text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium font-sans"
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F9F7F2] p-2.5 rounded-xl border border-[#E2DCC8]/60">
                  <button
                    type="button"
                    onClick={handleGenerateCbtAlternative}
                    disabled={cbtLoading}
                    className="flex items-center space-x-1 space-x-reverse text-[10px] font-black text-[#8B9D83] hover:text-[#5A5A40] disabled:text-gray-300 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.cbtGenerateAgainAiBtn}</span>
                  </button>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-[10px] text-gray-400 font-bold">{t.cbtPostAnxietyLevelLabel}</span>
                    <select
                      value={cbtEmotionAfter}
                      onChange={(e) => setCbtEmotionAfter(Number(e.target.value))}
                      className="bg-white border border-[#E2DCC8] text-xs font-mono font-bold rounded-lg p-1 text-emerald-700"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{n} / 10</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCbtStep(4)}
                    className="px-4 py-2 bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] rounded-xl text-xs font-bold cursor-pointer"
                  >
                    🠔 السابق
                  </button>
                  <button
                    onClick={() => {
                      if (!cbtRationalAlternative.trim()) return;
                      // Generate CBT worksheet item
                      const newWorksheet = {
                        id: `cbt-${Date.now()}`,
                        triggerEvent: cbtTriggerEvent,
                        negativeThoughts: cbtNegativeThoughts,
                        cognitiveDistortion: cbtCognitiveDistortion,
                        rationalAlternative: cbtRationalAlternative,
                        emotionBefore: cbtEmotionBefore,
                        emotionAfter: cbtEmotionAfter,
                        createdAt: new Date().toISOString()
                      };

                      // Append to active selected date diary
                      let targetDiary = activeDiaryForSelectedDate;
                      if (!targetDiary) {
                        targetDiary = {
                          id: `diary-${Date.now()}`,
                          title: `مذكرة يومية لـ ${selectedDate}`,
                          content: '',
                          createdAt: `${selectedDate}T20:00:00.000Z`,
                          updatedAt: `${selectedDate}T20:00:00.000Z`,
                          moods: ['طبيعي'],
                          importance: 3,
                          color: 'bg-white border-[#E2DCC8]',
                          images: [],
                          videos: [],
                          audioRecordings: [],
                          files: [],
                          tasks: [],
                          tags: [],
                          chatLogs: [],
                          isLocked: false,
                          sleepHours: 8,
                          sportsDuration: 0,
                          medications: [
                            { id: 'm1', name: 'مكمل فيتامين D', time: '10:00 ص', taken: false }
                          ],
                          waterCups: 0,
                          fastMoodScore: 5,
                          symptomsChecklist: [],
                          cbtWorksheets: []
                        };
                      }

                      const updatedWorksheets = [...(targetDiary.cbtWorksheets || []), newWorksheet];
                      handleUpdateHabit('cbt', updatedWorksheets);

                      // Reset states & close modal
                      setCbtTriggerEvent('');
                      setCbtNegativeThoughts('');
                      setCbtCognitiveDistortion('');
                      setCbtRationalAlternative('');
                      setCbtEmotionBefore(7);
                      setCbtEmotionAfter(4);
                      setCbtStep(1);
                      setShowAddCbtModal(false);

                      alert('تمت إضافة تمرين إعادة الهيكلة بنجاح وحفظه في مذكراتك لليوم! 🎉🧠');
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  >
                    💾 حفظ الجلسة بنجاح
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 📅 Redesigned Comprehensive Calendar & Library Modal (التقويم والمكتبة الشاملة • اقرأً 📖🗓️) */}
      {showCalendarModal && (() => {
        const year = calendarViewDate.getFullYear();
        const month = calendarViewDate.getMonth(); // 0-indexed

        // First day of the month
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 6 is Saturday

        // Number of days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Localized month names using Intl
        const activeBcp47 = getLanguageInfo(settings?.appLanguage).bcp47 || 'en-US';
        const monthFormatter = new Intl.DateTimeFormat(activeBcp47, { month: 'long' });
        const currentMonthName = monthFormatter.format(firstDayOfMonth);

        // Days list
        const days = [];
        // Pad with empty cells for offset
        for (let i = 0; i < startDayOfWeek; i++) {
          days.push(null);
        }
        // Add day numbers
        for (let d = 1; d <= daysInMonth; d++) {
          days.push(new Date(year, month, d));
        }

        const weekdays = (() => {
          const baseDate = new Date(2026, 7, 2); // Sunday Aug 2, 2026
          const fmt = new Intl.DateTimeFormat(activeBcp47, { weekday: 'narrow' });
          return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            return fmt.format(d);
          });
        })();

        const handlePrevMonth = () => {
          setCalendarViewDate(new Date(year, month - 1, 1));
        };

        const handleNextMonth = () => {
          setCalendarViewDate(new Date(year, month + 1, 1));
        };

        // Get details of active day
        const dayEntry = diaries.find(d => d.createdAt.split('T')[0] === selectedCalendarDate && !d.isTrash);
        const hasDiaryOnSelectedDay = !!dayEntry;

        // Count books registered on selected day
        const dayBooks = books.filter(b => b.createdAt.split('T')[0] === selectedCalendarDate);

        // Helper to get formatted date label
        const formattedDateLabel = formatDate(selectedCalendarDate + 'T12:00:00', settings?.appLanguage || 'ar', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Save book handler
        const handleSaveBook = (e: React.FormEvent) => {
          e.preventDefault();
          if (!bookFormTitle.trim()) {
            alert('يرجى إدخال عنوان الكتاب!');
            return;
          }
          const newBook: Book = {
            id: `book-${Date.now()}`,
            title: bookFormTitle,
            notes: bookFormNotes,
            rating: bookFormRating,
            pdfPath: bookFormPdf || undefined,
            referenceLink: bookFormLink || undefined,
            audioAttachment: bookFormAudio || undefined,
            coverAttachment: bookFormCover || undefined,
            videoAttachment: bookFormVideo || undefined,
            hasMindMap: bookFormHasMindMap,
            tags: bookFormTags.length > 0 ? bookFormTags : ['عام'],
            createdAt: selectedCalendarDate + 'T12:00:00.000Z' // Associate with selected calendar day
          };
          setBooks(prev => [newBook, ...prev]);

          // Reset form states
          setBookFormTitle('');
          setBookFormNotes('');
          setBookFormRating(5);
          setBookFormPdf('');
          setBookFormLink('');
          setBookFormAudio('');
          setBookFormCover('');
          setBookFormVideo('');
          setBookFormHasMindMap(false);
          setBookFormTags(['تنمية ذاتية']);
          setBookFormCustomTag('');
          setShowAddBookForm(false);
          alert('تم {t.saveBookBtn} في مكتبتك الشاملة بنجاح! 📖✨');
        };

        const handleDeleteBook = (id: string) => {
          if (confirm('هل أنت متأكد من حذف هذا الكتاب من مكتبتك الشاملة؟')) {
            setBooks(prev => prev.filter(b => b.id !== id));
            if (selectedBookDetail?.id === id) {
              setSelectedBookDetail(null);
            }
          }
        };

        return (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 transition-all font-sans" dir={langInfo.dir}>
            <div className="bg-white border border-[#E2DCC8] rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] md:h-[680px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="p-3.5 sm:p-5 bg-gradient-to-r from-[#5A5A40] to-[#8B9D83] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3 space-x-reverse">
                  <div className="p-1.5 sm:p-2 bg-white/10 rounded-xl sm:rounded-2xl shrink-0">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#FEFAE0]" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-lg font-extrabold flex items-center">
                      <span>{t('calendarModalTitle')}</span>
                    </h2>
                    <p className="text-[9px] sm:text-[10px] text-[#E2DCC8]">{t.calendarModalSubtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalendarModal(false);
                    setSelectedBookDetail(null);
                    setShowAddBookForm(false);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold cursor-pointer transition-colors text-xs sm:text-sm shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Sub-tab Navigation Switcher */}
              <div className="flex border-b border-[#E2DCC8]/40 bg-[#F9F7F2] p-1 gap-1 shrink-0 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarSubTab('calendar');
                    setSelectedBookDetail(null);
                  }}
                  className={`flex-1 py-2 sm:py-3 px-2 text-[10px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1 sm:space-x-2 space-x-reverse cursor-pointer whitespace-nowrap ${
                    calendarSubTab === 'calendar'
                      ? 'bg-white text-[#5A5A40] shadow-xs border border-[#E2DCC8]/55'
                      : 'text-gray-500 hover:text-[#5A5A40]'
                  }`}
                >
                  <span>{t('myActivitiesTab')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarSubTab('library')}
                  className={`flex-1 py-2 sm:py-3 px-2 text-[10px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1 sm:space-x-2 space-x-reverse cursor-pointer whitespace-nowrap ${
                    calendarSubTab === 'library'
                      ? 'bg-white text-[#5A5A40] shadow-xs border border-[#E2DCC8]/55'
                      : 'text-gray-500 hover:text-[#5A5A40]'
                  }`}
                >
                  <span>{t('myLibraryTab')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarSubTab('reports');
                    setSelectedBookDetail(null);
                  }}
                  className={`flex-1 py-2 sm:py-3 px-2 text-[10px] sm:text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-1 sm:space-x-2 space-x-reverse cursor-pointer whitespace-nowrap ${
                    calendarSubTab === 'reports'
                      ? 'bg-white text-[#5A5A40] shadow-xs border border-[#E2DCC8]/55'
                      : 'text-gray-500 hover:text-[#5A5A40]'
                  }`}
                >
                  <span>{t.wisdomAndReports}</span>
                </button>
              </div>

              {/* Main Workspace split into Left (DatePicker) and Right (Details) */}
              <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-h-0">

                {/* LEFT COLUMN: Clean Calendar Widget */}
                <div className="w-full md:w-[280px] shrink-0 border-b md:border-b-0 md:border-l border-[#E2DCC8]/40 p-3 sm:p-4 bg-[#F9F7F2]/40 flex flex-col justify-start space-y-3 sm:space-y-4 overflow-y-auto max-h-[380px] md:max-h-none">
                  <div className="text-[10px] sm:text-[11px] font-black text-gray-400">{t.fullCalendarAndHistory}</div>

                  <div className="bg-white border border-[#E2DCC8]/60 rounded-2xl p-3.5 space-y-3.5 shadow-3xs">
                    {/* Month Picker Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-[#F0EDE4] border border-[#E2DCC8]/50 rounded-lg text-xs font-extrabold cursor-pointer transition-colors text-gray-600"
                      >
                        ◀
                      </button>
                      <span className="text-xs font-black text-[#5A5A40]">
                        {currentMonthName} {year}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-[#F0EDE4] border border-[#E2DCC8]/50 rounded-lg text-xs font-extrabold cursor-pointer transition-colors text-gray-600"
                      >
                        ▶
                      </button>
                    </div>

                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-1 text-center border-b border-gray-100 pb-1">
                      {weekdays.map((wd, i) => (
                        <span key={i} className="text-[10px] font-extrabold text-gray-400">{wd}</span>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {days.map((dayDate, idx) => {
                        if (!dayDate) {
                          return <div key={`empty-${idx}`} className="aspect-square" />;
                        }

                        const isoString = dayDate.toISOString().split('T')[0];
                        const isSelected = selectedCalendarDate === isoString;
                        const isToday = new Date().toISOString().split('T')[0] === isoString;

                        const hasDiary = diaries.some(d => d.createdAt.split('T')[0] === isoString && !d.isTrash);
                        const hasBook = books.some(b => b.createdAt.split('T')[0] === isoString);

                        return (
                          <button
                            key={isoString}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarDate(isoString);
                              setSelectedBookDetail(null);
                            }}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-[11px] font-extrabold transition-all relative cursor-pointer border ${
                              isSelected
                                ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-xs scale-105'
                                : isToday
                                  ? 'bg-[#FAEDCD] text-[#D4A373] border-[#D4A373]'
                                  : 'bg-[#F9F7F2] hover:bg-[#F0EDE4] text-gray-700 border-transparent'
                            }`}
                            title={`${dayDate.getDate()} ${currentMonthName}`}
                          >
                            <span>{dayDate.getDate()}</span>
                            <div className="absolute bottom-1 flex space-x-0.5 space-x-reverse justify-center w-full">
                              {hasDiary && (
                                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#8B9D83] animate-pulse'}`} />
                              )}
                              {hasBook && (
                                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[#FEFAE0]' : 'bg-[#D4A373]'}`} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-[#E2DCC8]/50 rounded-2xl p-3 space-y-1 shadow-3xs">
                    <span className="block text-[10px] text-gray-400 font-bold">{t.currentlySelectedDate}</span>
                    <span className="text-xs font-black text-[#5A5A40] block leading-tight">
                      {formattedDateLabel}
                    </span>
                  </div>

                  {/* Indicators legend */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-3 space-y-2 text-[10px] font-bold text-gray-500 shadow-3xs">
                    <div className="flex items-center space-x-1.5 space-x-reverse">
                      <span className="w-2 h-2 rounded-full bg-[#8B9D83]" />
                      <span>{t.diaryRecordedLegend}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 space-x-reverse">
                      <span className="w-2 h-2 rounded-full bg-[#D4A373]" />
                      <span>{t.bookReadLegend}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Workspaces */}
                <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto bg-white flex flex-col justify-between min-h-[350px] md:min-h-0">

                  {/* TAB 1: CALENDAR VIEW & DAY ACTIVITIES */}
                  {calendarSubTab === 'calendar' && (
                    <div className="space-y-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E2DCC8]/50 pb-3">
                          <h3 className="text-base font-black text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                            <span className="p-1 bg-[#8B9D83]/10 text-[#8B9D83] rounded-lg">☀️</span>
                            <span>{t.whatHappenedOn} {selectedCalendarDate}</span>
                          </h3>
                          <span className="text-xs font-bold text-[#8B9D83] bg-[#8B9D83]/10 px-3 py-1 rounded-full">
                            {hasDiaryOnSelectedDay ? (t.diaryRecordedLegend) : (t.quietEmptyDay)}
                          </span>
                        </div>

                        {hasDiaryOnSelectedDay ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Content Card */}
                            <div className="bg-[#F9F7F2]/40 border border-[#E2DCC8]/60 rounded-2xl p-4 space-y-3">
                              <div>
                                <span className="text-[10px] font-bold text-gray-400">{t.diaryTitleLabel}</span>
                                <h4 className="text-sm font-black text-[#3A3A3A] mt-0.5">{dayEntry.title || (t.untitledDiary)}</h4>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-gray-400">{t.diaryContentLabel}</span>
                                <p className="text-xs text-gray-600 leading-relaxed max-h-[160px] overflow-y-auto mt-1 whitespace-pre-wrap">
                                  {cleanDiaryText(dayEntry.content) || (t.emptyDiaryText)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1 pt-2 border-t border-[#E2DCC8]/30">
                                {dayEntry.moods.map((m, idx) => (
                                <span key={idx} className="text-[10px] font-bold bg-[#8B9D83]/10 text-[#5A5A40] border border-[#8B9D83]/20 px-2 py-0.5 rounded-full">
                                  {getMoodLabel(m, t)}
                                </span>
                              ))}
                              </div>
                            </div>

                            {/* Right: Health & Behavior KPI Stats */}
                            <div className="bg-[#F9F7F2]/40 border border-[#E2DCC8]/60 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                              <h4 className="text-xs font-black text-[#5A5A40] border-b border-[#E2DCC8]/30 pb-1.5 flex items-center justify-between">
                                <span>{t.healthMetricsAndCommitment}</span>
                                <span className="text-[10px] font-extrabold text-[#D4A373]">{t.todayIndicatorsBadge}</span>
                              </h4>

                              <div className="space-y-2.5 flex-1 justify-center flex flex-col">
                                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                  <span className="flex items-center gap-1">{t.medicationDoseCommitment}</span>
                                  <span className="font-extrabold text-[#3A3A3A]">
                                    {dayEntry.medications && dayEntry.medications.length > 0 ? (
                                      <span className="text-emerald-600">{t.adherenceCompleted} ({dayEntry.medications.filter(m => m.taken).length}/{dayEntry.medications.length})</span>
                                    ) : (
                                      <span className="text-gray-400 italic">{t.noSupplementsRecorded}</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                  <span className="flex items-center gap-1">{t.physicalActivitySport}</span>
                                  <span className="font-extrabold text-[#3A3A3A]">
                                    {dayEntry.sportsDuration && dayEntry.sportsDuration > 0 ? (
                                      <span className="text-[#8B9D83]">
                                        {dayEntry.sportsDuration} {t.practiceMinutes} {dayEntry.sportsType ? `(${dayEntry.sportsType})` : ""}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">{t.noWorkoutsRecorded}</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                  <span className="flex items-center gap-1">{t.sleepQualityAndHours}</span>
                                  <span className="font-extrabold text-[#3A3A3A]">
                                    {dayEntry.sleepHours ? (
                                      <span>{dayEntry.sleepHours} {t.hoursLabel}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">{t.notRecorded}</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                  <span className="flex items-center gap-1">{t.bodyHydrationLevel}</span>
                                  <span className="font-extrabold text-[#3A3A3A]">
                                    {dayEntry.waterCups ? (
                                      <span className="text-blue-600 font-black">{dayEntry.waterCups} {t.cupsLabel}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">{t.zeroCups}</span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {dayBooks.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[#E2DCC8]/30 flex items-center justify-between text-[11px] font-black text-[#D4A373]">
                                  <span>{t.readingsAddedToday}</span>
                                  <span>{dayBooks.length} {t.booksCountSuffix}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#F9F7F2]/20 border border-dashed border-[#E2DCC8] rounded-3xl p-10 text-center space-y-4 my-8">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
                            <div className="space-y-1">
                              <h4 className="text-sm font-black text-[#5A5A40]">{t.noDiariesRecordedForDay}</h4>
                              <p className="text-xs text-gray-400">تاريخ {selectedCalendarDate} يخلو حالياً من التوثيقات والمذكرات النفسية.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(selectedCalendarDate);
                                setShowCalendarModal(false);
                                setActiveTab('diaries');
                              }}
                              className="px-5 py-2 bg-[#8B9D83] hover:bg-[#5A5A40] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                            >
                              <span>{t.recordNewDiaryForDay}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-100 pt-3">
                        <span>{t.calendarBottomTip}</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LIBRARY VIEW & ADD BOOK FORM */}
                  {calendarSubTab === 'library' && (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      {showAddBookForm ? (
                        /* ADD BOOK FORM */
                        <form onSubmit={handleSaveBook} className="space-y-3.5 flex-1">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <h3 className="text-sm font-black text-[#5A5A40] flex items-center space-x-2 space-x-reverse">
                              <span>{t.addNewBookTitle}</span>
                            </h3>
                            <button
                              type="button"
                              onClick={() => setShowAddBookForm(false)}
                              className="text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                              {t.cancelEditing}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Column 1: Info */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11px] font-black text-gray-500 mb-1">{t.bookTitleLabel}</label>
                                <input
                                  type="text"
                                  required
                                  value={bookFormTitle}
                                  onChange={(e) => setBookFormTitle(e.target.value)}
                                  placeholder={t.bookTitlePlaceholder}
                                  className="w-full bg-[#F9F7F2]/50 border border-[#E2DCC8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#8B9D83] text-[#3A3A3A] font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-black text-gray-500 mb-1">{t.bookNotesAndQuotes}</label>
                                <textarea
                                  value={bookFormNotes}
                                  onChange={(e) => setBookFormNotes(e.target.value)}
                                  placeholder={t.bookNotesPlaceholder}
                                  rows={4}
                                  className="w-full bg-[#F9F7F2]/50 border border-[#E2DCC8] rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#8B9D83] text-[#3A3A3A] font-bold leading-relaxed resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-black text-gray-500 mb-1">{t.personalRatingLabel}</label>
                                <div className="flex items-center space-x-1.5 space-x-reverse">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setBookFormRating(star)}
                                      className="text-lg hover:scale-110 transition-transform cursor-pointer"
                                    >
                                      {star <= bookFormRating ? '★' : '☆'}
                                    </button>
                                  ))}
                                  <span className="text-[10px] text-gray-400 font-bold mr-2">({bookFormRating}/5 {t.starsOutOfFive})</span>
                                </div>
                              </div>

                              {/* Book Categorization Tags */}
                              <div>
                                <label className="block text-[11px] font-black text-[#5A5A40] mb-1.5">{t.bookCategoriesAndTags}</label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {[(t.tagSelfHelp), (t.tagNovels), (t.tagPsychology), (t.tagMentalHealth), (t.tagPhilosophy), (t.tagHistory), (t.tagLiterature), (t.tagScience), (t.tagBiographies)].map((presetTag) => {
                                    const isSelected = bookFormTags.includes(presetTag);
                                    return (
                                      <button
                                        key={presetTag}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setBookFormTags(bookFormTags.filter(tagItem => tagItem !== presetTag));
                                          } else {
                                            setBookFormTags([...bookFormTags, presetTag]);
                                          }
                                        }}
                                        className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-3xs'
                                            : 'bg-white border-[#E2DCC8] text-gray-600 hover:border-[#8B9D83]'
                                        }`}
                                      >
                                        {isSelected ? '✓ ' : '+ '}{presetTag}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Custom Tag Input */}
                                <div className="flex items-center gap-1.5 mt-2">
                                  <input
                                    type="text"
                                    value={bookFormCustomTag}
                                    onChange={(e) => setBookFormCustomTag(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (bookFormCustomTag.trim() && !bookFormTags.includes(bookFormCustomTag.trim())) {
                                          setBookFormTags([...bookFormTags, bookFormCustomTag.trim()]);
                                          setBookFormCustomTag('');
                                        }
                                      }
                                    }}
                                    placeholder={t.addCustomCategoryPlaceholder}
                                    className="flex-1 bg-[#F9F7F2]/50 border border-[#E2DCC8] rounded-lg px-2.5 py-1 text-[10px] font-bold text-[#3A3A3A] focus:outline-none focus:ring-1 focus:ring-[#8B9D83]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookFormCustomTag.trim() && !bookFormTags.includes(bookFormCustomTag.trim())) {
                                        setBookFormTags([...bookFormTags, bookFormCustomTag.trim()]);
                                        setBookFormCustomTag('');
                                      }
                                    }}
                                    className="px-3 py-1 bg-[#5A5A40] text-white text-[10px] font-bold rounded-lg hover:bg-[#3D3D2A] transition-colors cursor-pointer"
                                  >
                                    {t.addBtn}
                                  </button>
                                </div>

                                {/* Selected Tags list */}
                                {bookFormTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    <span className="text-[10px] font-bold text-gray-400 self-center">{t.selectedCategoriesLabel}</span>
                                    {bookFormTags.map(tag => (
                                      <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black rounded-md"
                                      >
                                        🏷️ {tag}
                                        <button
                                          type="button"
                                          onClick={() => setBookFormTags(bookFormTags.filter(tagItem => tagItem !== tag))}
                                          className="text-teal-600 hover:text-red-500 font-extrabold mr-0.5 cursor-pointer"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Attachments & Simulation */}
                            <div className="space-y-3 bg-[#F9F7F2]/35 border border-[#E2DCC8]/40 rounded-2xl p-4">
                              <span className="block text-xs font-black text-[#5A5A40] border-b border-[#E2DCC8]/30 pb-1 mb-2">{t.bookAttachmentsHeader}</span>

                              <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-1">{t.pdfFilePathLabel}</label>
                                <input
                                  type="text"
                                  value={bookFormPdf}
                                  onChange={(e) => setBookFormPdf(e.target.value)}
                                  placeholder={t.pdfFilePathPlaceholder}
                                  className="w-full bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#8B9D83] text-[#3A3A3A] font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-gray-500 mb-1">{t.referenceWebLink}</label>
                                <input
                                  type="text"
                                  value={bookFormLink}
                                  onChange={(e) => setBookFormLink(e.target.value)}
                                  placeholder="https://example.com/mybook"
                                  className="w-full bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#8B9D83] text-[#3A3A3A] font-bold"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookFormAudio(bookFormAudio ? '' : 'سجل_ملخص_كتابي_رائع.mp3');
                                  }}
                                  className={`py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                    bookFormAudio
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : 'bg-white border-[#E2DCC8] hover:bg-gray-50 text-[#3A3A3A]'
                                  }`}
                                >
                                  <span>🎙️ {bookFormAudio ? (t.attachedAudioYes) : (t.addAudioBtn)}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookFormVideo(bookFormVideo ? '' : 'فيديو_شرح_مهم.mp4');
                                  }}
                                  className={`py-1.5 text-[10px] font-black rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                    bookFormVideo
                                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                                      : 'bg-white border-[#E2DCC8] hover:bg-gray-50 text-[#3A3A3A]'
                                  }`}
                                >
                                  <span>📹 {bookFormVideo ? (t.attachedVideoYes) : (t.addVideoBtn)}</span>
                                </button>
                              </div>

                              <div className="flex items-center justify-between border-t border-gray-200/50 pt-2.5 mt-2.5">
                                <span className="text-[10px] font-black text-[#5A5A40]">{t.sketchMindMap}</span>
                                <button
                                  type="button"
                                  onClick={() => setBookFormHasMindMap(!bookFormHasMindMap)}
                                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                                    bookFormHasMindMap ? 'bg-[#8B9D83]' : 'bg-gray-300'
                                  }`}
                                >
                                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                                    bookFormHasMindMap ? 'right-5' : 'right-1'
                                  }`} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end space-x-3 space-x-reverse pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setShowAddBookForm(false)}
                              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer text-gray-500"
                            >
                              {t.cancelAndSaveLater}
                            </button>
                            <button
                              type="submit"
                              className="px-5 py-2 bg-[#8B9D83] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              حفظ الكتاب
                            </button>
                          </div>
                        </form>
                      ) : selectedBookDetail ? (
                        /* BOOK DETAIL OVERLAY VIEW */
                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <button
                                type="button"
                                onClick={() => setSelectedBookDetail(null)}
                                className="text-xs font-black text-[#8B9D83] hover:text-[#5A5A40] flex items-center gap-1.5 cursor-pointer"
                              >
                                <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                                <span>{t.backToBooksList}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBook(selectedBookDetail.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title={t.delete}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400">{t.bookNameAndRating}</span>
                                  <h4 className="text-base font-black text-[#3A3A3A] mt-0.5">{selectedBookDetail.title}</h4>
                                  <div className="flex items-center text-amber-500 text-sm mt-1">
                                    {'★'.repeat(selectedBookDetail.rating)}
                                    {'☆'.repeat(5 - selectedBookDetail.rating)}
                                    <span className="text-xs text-gray-400 font-bold mr-2">({selectedBookDetail.rating}/5)</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400">{t.notesSummaryAndQuotes}</span>
                                  <p className="text-xs text-gray-600 leading-relaxed max-h-[160px] overflow-y-auto mt-1 whitespace-pre-wrap bg-[#F9F7F2]/45 border border-[#E2DCC8]/50 p-3.5 rounded-2xl font-medium">
                                    {selectedBookDetail.notes || (t.noDetailedNotesRecorded)}
                                  </p>
                                </div>

                                {selectedBookDetail.tags && selectedBookDetail.tags.length > 0 && (
                                  <div className="bg-teal-50/50 border border-teal-100/80 rounded-xl p-2.5 mt-2">
                                    <span className="text-[10px] font-black text-teal-800 block mb-1">{t.bookCategoriesAndTagsList}</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedBookDetail.tags.map(tag => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => {
                                            setSelectedBookTagFilter(tag);
                                            setSelectedBookDetail(null);
                                          }}
                                          className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-3xs"
                                          title={t.filterLibraryByTag}
                                        >
                                          <span>🏷️</span>
                                          <span>{tag}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="bg-[#F9F7F2]/30 border border-[#E2DCC8]/50 rounded-2xl p-4 space-y-3 flex flex-col justify-start">
                                <span className="block text-xs font-black text-[#5A5A40] border-b border-gray-100 pb-1">{t.interactiveAttachmentsSimulation}</span>

                                {selectedBookDetail.pdfPath && (
                                  <button
                                    type="button"
                                    onClick={() => alert(`📖 محاكاة فتح مستند PDF:\nاسم المستند: ${selectedBookDetail.pdfPath}\nتنبيه: جاري تحميل وقراءة الفصول والملخص الشامل بنجاح وسرية تامة...`)}
                                    className="w-full text-right p-2.5 bg-white border border-[#E2DCC8] hover:border-[#8B9D83] rounded-xl flex items-center justify-between transition-all text-xs font-bold text-gray-700 cursor-pointer shadow-3xs"
                                  >
                                    <span className="flex items-center gap-2"><span>📂</span> <span>{t.openPdfAndBook}</span></span>
                                    <span className="text-[10px] text-[#8B9D83]">{t.readyToRead}</span>
                                  </button>
                                )}

                                {selectedBookDetail.referenceLink && (
                                  <a
                                    href={selectedBookDetail.referenceLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full text-right p-2.5 bg-white border border-[#E2DCC8] hover:border-[#8B9D83] rounded-xl flex items-center justify-between transition-all text-xs font-bold text-gray-700 cursor-pointer shadow-3xs"
                                  >
                                    <span className="flex items-center gap-2"><span>🔗</span> <span>{t.bookReferenceLink}</span></span>
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                                  </a>
                                )}

                                {selectedBookDetail.audioAttachment && (
                                  <button
                                    type="button"
                                    onClick={() => alert(`🎙️ جاري تفعيل مشغل الملخص الصوتي للكتاب...\nالملف: ${selectedBookDetail.audioAttachment}\nاستمع للمراجعة الصوتية القصيرة بنجاح.`)}
                                    className="w-full text-right p-2.5 bg-white border border-[#E2DCC8] hover:border-[#8B9D83] rounded-xl flex items-center justify-between transition-all text-xs font-bold text-gray-700 cursor-pointer shadow-3xs"
                                  >
                                    <span className="flex items-center gap-2"><span>🎙️</span> <span>{t.listenAudioSummary}</span></span>
                                    <Music className="w-3.5 h-3.5 text-[#8B9D83]" />
                                  </button>
                                )}

                                {selectedBookDetail.videoAttachment && (
                                  <button
                                    type="button"
                                    onClick={() => alert(`📹 تشغيل المراجعة المرئية السريعة:\nالملف: ${selectedBookDetail.videoAttachment}\nالعرض ناجح ومحمي وسريع الاستجابة.`)}
                                    className="w-full text-right p-2.5 bg-white border border-[#E2DCC8] hover:border-[#8B9D83] rounded-xl flex items-center justify-between transition-all text-xs font-bold text-gray-700 cursor-pointer shadow-3xs"
                                  >
                                    <span className="flex items-center gap-2"><span>📹</span> <span>{t.playAttachedVideo}</span></span>
                                    <span className="text-[10px] text-[#D4A373]">{t.videoClipBadge}</span>
                                  </button>
                                )}

                                {selectedBookDetail.hasMindMap && (
                                  <div className="border border-dashed border-[#E2DCC8] rounded-xl p-3 bg-white space-y-2">
                                    <span className="block text-[10px] font-black text-gray-400">{t.mindmapTitle}</span>
                                    <div className="flex flex-col items-center justify-center p-2 bg-[#F9F7F2] rounded-lg border border-[#E2DCC8]/40 space-y-1.5">
                                      <div className="text-[11px] font-black text-[#5A5A40] bg-white border border-[#E2DCC8] px-2.5 py-0.5 rounded-full shadow-3xs">
                                        {selectedBookDetail.title.slice(0, 18)}...
                                      </div>
                                      <div className="w-0.5 h-3 bg-[#8B9D83]/60" />
                                      <div className="flex justify-center gap-2 w-full">
                                        <span className="text-[9px] font-bold bg-white border border-gray-100 px-1.5 py-0.5 rounded-lg text-gray-500 shadow-3xs">{t.mindmapPillar1}</span>
                                        <span className="text-[9px] font-bold bg-white border border-gray-100 px-1.5 py-0.5 rounded-lg text-gray-500 shadow-3xs">{t.mindmapPillar2}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-100 pt-3">
                            <span>{t.attachmentsInteractiveTip}</span>
                          </div>
                        </div>
                      ) : (
                        /* LIST BOOKS AND SEARCH */
                        (() => {
                          const getCoverBg = (id: string) => {
                            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const colors = [
                              'from-[#5A5A40] to-[#3D3D2A] border-[#FEFAE0]/30 text-amber-100/90', // Olive Gold
                              'from-[#5C2E2B] to-[#3D1E1C] border-[#E2DCC8]/30 text-[#FEFAE0]', // Crimson Leather
                              'from-[#2E4A62] to-[#1A2D3C] border-blue-200/30 text-blue-100', // Royal Blue
                              'from-[#4A5D4E] to-[#2D3A30] border-[#CCD5AE]/40 text-[#FEFAE0]', // Sage Pine
                              'from-[#78350F] to-[#451A03] border-amber-400/30 text-amber-100', // Rich Mahogany
                            ];
                            return colors[hash % colors.length];
                          };

                          const filteredBooks = books.filter(book => {
                            const matchesSearch = book.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                                                  (book.notes || '').toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
                                                  (book.tags || []).some(tagItem => tagItem.toLowerCase().includes(bookSearchQuery.toLowerCase()));
                            const matchesRating = bookRatingFilter === 0 || book.rating >= bookRatingFilter;
                            const matchesAttachment = bookAttachmentFilter === 'all' ||
                                                      (bookAttachmentFilter === 'pdf' && book.pdfPath) ||
                                                      (bookAttachmentFilter === 'audio' && book.audioAttachment) ||
                                                      (bookAttachmentFilter === 'video' && book.videoAttachment) ||
                                                      (bookAttachmentFilter === 'mindmap' && book.hasMindMap);
                            const matchesTag = selectedBookTagFilter === 'all' ||
                                               (book.tags || []).includes(selectedBookTagFilter);
                            return matchesSearch && matchesRating && matchesAttachment && matchesTag;
                          });

                          return (
                            <div className="space-y-4 flex-1 flex flex-col justify-between overflow-hidden">
                              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">

                                {/* Top bar: Title & Add Book Button */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                                  <div>
                                    <h3 className="text-base font-extrabold text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                                      <span className="p-1.5 bg-[#8B9D83]/10 text-[#8B9D83] rounded-xl">📚</span>
                                      <span>{t.myComprehensiveLibrary}</span>
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t.browseAndFilterBooksDesc}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowAddBookForm(true)}
                                    className="px-4 py-2 bg-gradient-to-l from-[#5A5A40] to-[#8B9D83] hover:opacity-95 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm active:scale-97 shrink-0"
                                  >
                                    {t.addNewBookMaterial}
                                  </button>
                                </div>

                                {/* Advanced Filters Bar */}
                                <div className="bg-[#F9F7F2]/65 border border-[#E2DCC8]/60 p-3.5 rounded-2xl space-y-3">
                                  {/* Row 1: Search Input */}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={bookSearchQuery}
                                      onChange={(e) => setBookSearchQuery(e.target.value)}
                                      placeholder={t.searchLibraryPlaceholder}
                                      className="w-full bg-white border border-[#E2DCC8] rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#8B9D83] text-[#3A3A3A] font-bold"
                                    />
                                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-xs">🔍</span>
                                    {bookSearchQuery && (
                                      <button
                                        type="button"
                                        onClick={() => setBookSearchQuery('')}
                                        className="absolute left-8 top-2 text-gray-400 hover:text-[#5A5A40] text-xs font-bold cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>

                                  {/* Row 2: Attachment and Rating Filters */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5">
                                    {/* Attachment Filter */}
                                    <div className="flex items-center space-x-1.5 space-x-reverse overflow-x-auto py-0.5">
                                      <span className="text-[10px] text-gray-400 font-black shrink-0">{t.attachmentsFilterPrefix}</span>
                                      {[
                                        { id: 'all', label: 'الكل' },
                                        { id: 'pdf', label: 'PDF 📂' },
                                        { id: 'audio', label: 'صوت 🎙️' },
                                        { id: 'video', label: 'مرئي 📹' },
                                        { id: 'mindmap', label: 'خريطة ذهنية 🎨' }
                                      ].map(opt => (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => setBookAttachmentFilter(opt.id)}
                                          className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                                            bookAttachmentFilter === opt.id
                                              ? 'bg-[#8B9D83] text-white border-[#8B9D83] shadow-3xs'
                                              : 'bg-white border-[#E2DCC8] text-gray-500 hover:text-[#5A5A40]'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Rating Filter */}
                                    <div className="flex items-center space-x-1.5 space-x-reverse">
                                      <span className="text-[10px] text-gray-400 font-black">{t.minRatingFilter}</span>
                                      <select
                                        value={bookRatingFilter}
                                        onChange={(e) => setBookRatingFilter(Number(e.target.value))}
                                        className="bg-white border border-[#E2DCC8] rounded-lg px-2 py-1 text-[10px] font-black text-[#5A5A40] focus:outline-none"
                                      >
                                        <option value={0}>{t.showAllOption}</option>
                                        <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                                        <option value={4}>⭐⭐⭐⭐+ (4)</option>
                                        <option value={3}>⭐⭐⭐+ (3)</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Row 3: Quick Tag Filters Bar (التصنيفات والوسوم) */}
                                  <div className="border-t border-[#E2DCC8]/40 pt-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-black text-[#5A5A40] flex items-center gap-1">
                                        <span>🏷️</span>
                                        <span>{t.quickTagFilterBar}</span>
                                      </span>
                                      {selectedBookTagFilter !== 'all' && (
                                        <button
                                          type="button"
                                          onClick={() => setSelectedBookTagFilter('all')}
                                          className="text-[10px] text-teal-700 hover:underline font-extrabold cursor-pointer"
                                        >
                                          {t.clearCategoryFilter}
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                                      {[
                                        t.allCategoryFilter,
                                        t.tagSelfHelp,
                                        t.tagNovels,
                                        t.tagPsychology,
                                        t.tagMentalHealth,
                                        t.tagPhilosophy,
                                        t.tagHistory,
                                        t.tagLiterature,
                                        t.tagScience,
                                        t.tagBiographies,
                                        ...Array.from(new Set(books.flatMap(b => b.tags || [])))
                                      ].filter((v, i, a) => a.indexOf(v) === i).map(tag => {
                                        const isAll = tag === (t.allCategoryFilter);
                                        const count = isAll
                                          ? books.length
                                          : books.filter(b => (b.tags || []).includes(tag)).length;

                                        if (!isAll && count === 0) return null; // Hide empty tag chips

                                        const isSelected = isAll ? selectedBookTagFilter === 'all' : selectedBookTagFilter === tag;

                                        return (
                                          <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setSelectedBookTagFilter(isAll ? 'all' : tag)}
                                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 border ${
                                              isSelected
                                                ? 'bg-gradient-to-r from-[#5A5A40] to-[#8B9D83] text-white border-[#5A5A40] shadow-2xs scale-[1.02]'
                                                : 'bg-white text-[#3A3A3A] border-[#E2DCC8] hover:bg-teal-50/60 hover:border-teal-300'
                                            }`}
                                          >
                                            <span>{isAll ? '📚' : '🏷️'}</span>
                                            <span>{tag}</span>
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                                              isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                              {count}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Books Grid (Custom Redesigned) */}
                                {filteredBooks.length === 0 ? (
                                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F9F7F2]/20 border border-dashed border-[#E2DCC8] rounded-3xl my-2">
                                    <span className="text-3xl animate-bounce">📭</span>
                                    <div className="space-y-1 mt-2">
                                      <h4 className="text-xs font-black text-[#5A5A40]">{t.noBooksMatchingFilter}</h4>
                                      <p className="text-[10px] text-gray-400">{t.noBooksSubHint}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5 p-1">
                                    {filteredBooks.map((book) => (
                                      <div
                                        key={book.id}
                                        onClick={() => setSelectedBookDetail(book)}
                                        className="bg-white hover:bg-[#F9F7F2]/30 border border-[#E2DCC8]/70 hover:border-[#8B9D83] p-3 rounded-2xl flex items-stretch space-x-3.5 space-x-reverse transition-all cursor-pointer shadow-3xs hover:shadow-xs group duration-200"
                                      >
                                        {/* Left Side: Premium Physical Book Cover Simulation */}
                                        <div className={`w-[85px] shrink-0 bg-gradient-to-b ${getCoverBg(book.id)} rounded-xl border p-2 flex flex-col justify-between shadow-2xs relative overflow-hidden transition-transform group-hover:scale-102`}>
                                          {/* Gold Leaf Accent Lines */}
                                          <div className="absolute inset-y-0 right-1 w-0.5 bg-yellow-300/20" />
                                          <div className="absolute inset-x-2 top-2 h-[1px] bg-yellow-300/15" />
                                          <div className="absolute inset-x-2 bottom-2 h-[1px] bg-yellow-300/15" />

                                          {/* Spine simulation */}
                                          <div className="absolute inset-y-0 right-0 w-1.5 bg-black/15 border-l border-white/5" />

                                          <div className="space-y-1 relative z-10">
                                            <span className="block text-[8px] tracking-widest uppercase opacity-75 font-black text-center">{t.iqraArchiveBadge}</span>
                                            <h5 className="text-[10px] font-black text-center leading-tight line-clamp-3 mt-1 text-shadow-sm font-sans">
                                              {book.title}
                                            </h5>
                                          </div>

                                          <div className="text-center relative z-10 pt-2">
                                            <span className="inline-block text-[9px] bg-white/15 px-1.5 py-0.5 rounded-md font-black">
                                              ⭐ {book.rating}.0
                                            </span>
                                          </div>
                                        </div>

                                        {/* Right Side: Detailed metadata and notes preview */}
                                        <div className="flex-grow flex flex-col justify-between py-1 text-right">
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-1">
                                              <h4 className="text-xs font-black text-[#3A3A3A] group-hover:text-[#8B9D83] transition-colors line-clamp-1 leading-snug">
                                                {book.title}
                                              </h4>
                                              <span className="text-[8px] text-gray-400 font-extrabold whitespace-nowrap bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">
                                                {book.createdAt ? book.createdAt.split('T')[0] : (t.previousDateBadge)}
                                              </span>
                                            </div>

                                            <p className="text-[10.5px] text-gray-500 line-clamp-2 leading-relaxed">
                                              {book.notes || (t.noNotesOrQuotesForBook)}
                                            </p>

                                            {/* Tag Chips on Book Card */}
                                            {book.tags && book.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-1 pt-1">
                                                 {book.tags.map(tag => (
                                                  <span
                                                     key={tag}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                       setSelectedBookTagFilter(tag);
                                                    }}
                                                    className="text-[9px] font-black bg-teal-50 text-teal-800 border border-teal-200/80 px-1.5 py-0.2 rounded-md hover:bg-teal-100 transition-colors"
                                                    title={t.filterByThisTag}
                                                  >
                                                     🏷️ {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* Glowing Attachment Badges */}
                                          <div className="flex flex-wrap gap-1 mt-2.5">
                                            {book.pdfPath && (
                                              <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-lg border border-emerald-100">PDF 📂</span>
                                            )}
                                            {book.referenceLink && (
                                              <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-lg border border-blue-100">{t.badgeRefLink}</span>
                                            )}
                                            {book.audioAttachment && (
                                              <span className="text-[9px] font-black bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-lg border border-purple-100">{t.badgeAudio}</span>
                                            )}
                                            {book.videoAttachment && (
                                              <span className="text-[9px] font-black bg-amber-50 text-[#D4A373] px-1.5 py-0.5 rounded-lg border border-amber-100">{t.badgeVideo}</span>
                                            )}
                                            {book.hasMindMap && (
                                              <span className="text-[9px] font-black bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-lg border border-rose-100">{t.badgeMindmap}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Footer guide statement */}
                              <div className="text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-100 pt-3">
                                <span>{t.bookCoverClickTip}</span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* TAB 3: PSYCHOLOGICAL REPORTS & AI WISDOM */}
                  {calendarSubTab === 'reports' && (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E2DCC8]/50 pb-3">
                          <h3 className="text-base font-black text-[#3A3A3A] flex items-center space-x-2 space-x-reverse">
                            <span className="p-1 bg-[#8B9D83]/10 text-[#8B9D83] rounded-lg">🧠</span>
                            <span>{t.analyticalReportsWisdom}</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCalendarModal(false);
                              setShowTherapistModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-l from-[#5A5A40] to-[#8B9D83] text-white text-xs font-black rounded-xl cursor-pointer transition-all hover:opacity-90 shadow-3xs"
                          >
                            {t.generateWeeklyMoodReport}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Compliance KPIs card */}
                          <div className="bg-[#F9F7F2]/40 border border-[#E2DCC8]/60 rounded-2xl p-4 space-y-3">
                            <h4 className="text-xs font-black text-[#5A5A40] border-b border-[#E2DCC8]/30 pb-1 flex items-center justify-between">
                              <span>{t.habitCommitmentRateLabel}</span>
                              <span className="text-[10px] font-extrabold text-[#8B9D83]">{t.thisWeekBadge}</span>
                            </h4>
                            <div className="space-y-2.5">
                              {habits.slice(0, 3).map((habit) => {
                                const totalDays = Object.keys(habit.history).length;
                                const completedDays = Object.values(habit.history).filter(v => v).length;
                                const ratio = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
                                return (
                                  <div key={habit.id} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                      <span>{getHabitDisplayName(habit, t)}</span>
                                      <span>{ratio}% ({completedDays}/{totalDays})</span>
                                    </div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-[#8B9D83] rounded-full transition-all duration-500"
                                        style={{ width: `${ratio}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Dynamic Custom AI Wisdom Card */}
                          <div className="bg-[#F9F7F2]/45 border border-[#E2DCC8]/60 p-4 rounded-2xl flex flex-col justify-between">
                            <div className="space-y-2">
                              <span className="block text-[10px] font-black text-gray-400">{t.aiSmartAdvisorRecommendationTitle}</span>
                              <p className="text-xs text-gray-700 leading-relaxed font-bold">
                                "إن توازن جودة القراءة مع ممارسة تمارين التنفس هو ركيزة أساسية لخفض مستويات الكورتيزول وتصفية العقل. ننصحك بقراءة ٢٠ دقيقة من كتاب العلاج السلوكي المفضل لديك قبل النوم وتجنب الشاشات."
                              </p>
                            </div>
                            <div className="text-[10px] text-gray-400 italic text-left border-t border-gray-100/80 pt-2.5 mt-2.5">
                              {t.aiAdvisorSignature}
                            </div>
                          </div>
                        </div>

                        {/* Additional insights list */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-3xs">
                          <h4 className="text-xs font-black text-[#5A5A40]">{t.readingHabitRecommendations}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-gray-600 font-semibold leading-relaxed">
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-500">✔</span>
                              <span>{t.readingRecommendation1}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-500">✔</span>
                              <span>{t.readingRecommendation2}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-500">✔</span>
                              <span>{t.readingRecommendation3}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-500">✔</span>
                              <span>{t.readingRecommendation4}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400 text-center leading-relaxed border-t border-gray-100 pt-3">
                        <span>{t.exportTherapyReportTip}</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* Global Hidden Input File Elements for Dashboard Quick Actions */}
      <input
        type="file"
        multiple
        id="global-image-uploader"
        accept="image/*"
        className="hidden"
        onChange={handleGlobalImageUpload}
      />
      <input
        type="file"
        multiple
        id="global-video-uploader"
        accept="video/*"
        className="hidden"
        onChange={handleGlobalVideoUpload}
      />
      <input
        type="file"
        multiple
        id="global-audio-uploader"
        accept="audio/*"
        className="hidden"
        onChange={handleGlobalAudioUpload}
      />
      <input
        type="file"
        multiple
        id="global-document-uploader"
        accept="application/pdf,.doc,.docx,.txt,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={handleGlobalDocumentUpload}
      />

      {/* Simulated Hardware Power Button protruding from the right edge */}
      <div
        onClick={() => {
          localStorage.setItem('appLockEnabled', 'true');
          setSettings(prev => ({ ...prev, appLockEnabled: true, isAppLocked: true }));
        }}
        className="fixed end-0 top-[35%] w-3.5 h-16 bg-gradient-to-l from-[#222] to-[#444] rounded-s-lg hover:from-[#333] hover:to-[#555] border border-gray-600 border-e-0 shadow-xl cursor-pointer transition-all hover:w-4 z-[9999] flex items-center justify-center group"
        title={t.hardwarePowerBtnTooltip}
      >
        <span className="opacity-0 group-hover:opacity-100 absolute end-6 bg-black/85 text-white text-[10px] font-extrabold py-1 px-2 rounded-lg whitespace-nowrap transition-opacity pointer-events-none shadow-md">
          {t.lockScreenTooltip}
        </span>
      </div>

      {/* 📥 Archive Action Toast Notification */}
      {archiveToast && (
        <div className="fixed bottom-20 sm:bottom-8 end-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-[#2B3E50] text-white p-4 rounded-2xl shadow-2xl border border-[#8B9D83]/40 flex items-center justify-between space-x-3 space-x-reverse animate-slideUp transition-all" dir={langInfo.dir}>
          <div className="flex items-center space-x-3 space-x-reverse min-w-0">
            <div className="p-2 bg-[#8B9D83] text-white rounded-xl text-lg shrink-0">
              {archiveToast.action === 'archived' ? '📥' : '📤'}
            </div>
            <span className="text-xs font-bold leading-relaxed truncate">
              {archiveToast.message}
            </span>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse shrink-0">
            <button
              type="button"
              onClick={() => {
                toggleArchiveDiary(archiveToast.diaryId);
                setArchiveToast(null);
              }}
              className="px-3 py-1.5 bg-[#8B9D83] hover:bg-[#72856A] text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {t.undoBtn}
            </button>
            <button
              type="button"
              onClick={() => setArchiveToast(null)}
              className="text-gray-400 hover:text-white text-xs p-1 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 👁️ Modal to Preview Archived Diary/Thought */}
      {viewArchivedDiary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn" dir={langInfo.dir}>
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 space-y-5 shadow-2xl border border-[#E2DCC8] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2DCC8]/60 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className={`text-xs px-2.5 py-1 rounded-xl font-black ${
                  viewArchivedDiary.diaryType === 'thought'
                    ? 'bg-[#FCF5DE] text-[#A67E2E] border border-[#E9E1C4]'
                    : 'bg-[#EEF1EB] text-[#556E4F] border border-[#DCE4D8]'
                }`}>
                  {viewArchivedDiary.diaryType === 'thought' ? (t.archivedThoughtBadge) : (t.archivedDiaryBadge)}
                </span>
                <span className="text-xs font-bold text-gray-400">
                  📅 {viewArchivedDiary.createdAt.split('T')[0]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewArchivedDiary(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Title */}
            <h3 className="text-lg font-extrabold text-[#3A3A3A]">
              {viewArchivedDiary.title || (t.untitledEntry)}
            </h3>

            {/* Content */}
            <div className="bg-[#F9F7F2] border border-[#E2DCC8]/60 p-4 rounded-2xl text-xs leading-relaxed text-[#3A3A3A] whitespace-pre-wrap font-medium">
              {cleanDiaryText(viewArchivedDiary.content) || (t.noTextWritten)}
            </div>

            {/* Moods & Tags */}
            {((viewArchivedDiary.moods || []).length > 0 || (viewArchivedDiary.tags || []).length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {viewArchivedDiary.moods.map(m => (
                  <span key={m} className="bg-[#8B9D83]/10 text-[#556E4F] text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    😊 {m}
                  </span>
                ))}
                {viewArchivedDiary.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Attachments if any */}
            {(viewArchivedDiary.images.length > 0 || ((viewArchivedDiary as any).recordings || []).length > 0) && (
              <div className="space-y-3 pt-2 border-t border-[#E2DCC8]/40">
                <span className="text-xs font-bold text-[#5A5A40] block">{t.attachmentsAndAudioLabel}</span>
                {viewArchivedDiary.images.map((img, idx) => (
                  <img key={idx} src={img} alt="مرفق" className="max-h-48 rounded-xl border border-gray-200 object-cover" />
                ))}
                {((viewArchivedDiary as any).recordings || []).map((rec: any) => (
                  <audio key={rec.id} controls src={rec.dataUrl || rec.blobUrl} className="w-full h-8" />
                ))}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E2DCC8]/60">
              <button
                type="button"
                onClick={() => {
                  toggleArchiveDiary(viewArchivedDiary.id);
                  setViewArchivedDiary(null);
                }}
                className="px-4 py-2 bg-[#8B9D83] hover:bg-[#72856A] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 space-x-reverse"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.restoreToMainDiariesBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewArchivedDiary(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {t.closePreviewBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Pros & Cons Modal Instance (الإيجابيات والسلبيات) */}
      <DailyProsConsModal
        isOpen={isProsConsModalOpen}
        onClose={() => setIsProsConsModalOpen(false)}
        dayKey={prosConsDayKey}
        displayDate={prosConsDisplayDate}
        dayDiaries={prosConsDayDiaries}
        allHabits={habits}
        allGratitudeCards={gratitudeCards}
        allBooks={books}
        allDiaries={diaries}
        userApiKey={settings.userApiKey}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* 📱 Lock Screen Widget Instructions Modal */}
      {showLockScreenWidgetInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir={langInfo.dir}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-2 border-[#D4A373] space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#D4A373]" />
                <span>{t.lockScreenNotificationTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLockScreenWidgetInfoModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed font-medium">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl font-bold text-amber-950 flex items-start gap-2.5">
                <span className="text-xl">📱</span>
                <div>
                  <span className="font-extrabold block text-sm">{t.pinShortcutsPowerDesc}</span>
                  <span>{t.lockScreenPermanentDesc}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <h4 className="font-black text-gray-900 text-xs">{t.setupStepsHeading}</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-gray-600 pr-1">
                  <li><strong>{t.setupStep1Title}</strong> {t.setupStep1Desc}</li>
                  <li><strong>{t.setupStep2Title}</strong> {t.setupStep2Desc}</li>
                  <li><strong>{t.setupStep3Title}</strong> {t.setupStep3Desc}</li>
                </ol>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLockScreenWidgetInfoModal(false);
                  triggerLockScreenNotification();
                }}
                className="w-full py-3 bg-[#4E685B] hover:bg-[#3F5449] text-white rounded-2xl font-extrabold text-xs transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-2 active:scale-95"
              >
                <BellRing className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>{t.pinLockScreenNowBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📿 Full Detailed Athkar Modal Instance */}
      <FullAthkarModal
        isOpen={isFullAthkarModalOpen}
        onClose={() => setIsFullAthkarModalOpen(false)}
        appLanguage={settings?.appLanguage || 'ar'}
      />

      {/* 🔒 Simulated Lock Screen Athkar Overlay */}
      <LockScreenAthkarOverlay
        isOpen={isLockScreenAthkarOpen}
        onClose={() => setIsLockScreenAthkarOpen(false)}
        appLanguage={settings?.appLanguage || 'ar'}
        onNavigateToAthkarTab={(tabKey) => {
          setIsLockScreenAthkarOpen(false);
          setIsFullAthkarModalOpen(true);
        }}
      />

    </div>
  );
}
