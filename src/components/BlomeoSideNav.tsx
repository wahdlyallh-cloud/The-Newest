import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  CheckSquare,
  Calendar as CalendarIcon,
  Heart,
  Brain,
  User,
  X,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Bell,
  MessageSquare
} from 'lucide-react';
import { DiaryEntry, TaskItem, Habit, GratitudeCard, AppReminder, AuthUser } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import { useRegisterBackStep } from '../lib/navigationStack';

export interface SearchResultItem {
  id: string;
  type: 'diary' | 'task' | 'habit' | 'gratitude' | 'cbt' | 'reminder' | 'consultation';
  title: string;
  snippet?: string;
  date?: string;
  action: () => void;
}

export interface BlomeoSideNavProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: AppLanguage;
  isDarkMode: boolean;
  currentUser: AuthUser | null;
  onOpenAccount: () => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenGratitude: () => void;
  onOpenCBT: () => void;
  onNavigateToDiary?: (diaryId: string) => void;
  diaries: DiaryEntry[];
  tasks?: TaskItem[];
  habits?: Habit[];
  gratitudeCards?: GratitudeCard[];
  reminders?: AppReminder[];
  consultations?: any[];
  activeItem?: 'tasks' | 'calendar' | 'gratitude' | 'cbt' | null;
}

export default function BlomeoSideNav({
  isOpen,
  onClose,
  appLanguage,
  isDarkMode,
  currentUser,
  onOpenAccount,
  onOpenTasks,
  onOpenCalendar,
  onOpenGratitude,
  onOpenCBT,
  onNavigateToDiary,
  diaries = [],
  tasks = [],
  habits = [],
  gratitudeCards = [],
  reminders = [],
  consultations = [],
  activeItem = null
}: BlomeoSideNavProps) {
  // --- 1. React Hooks (unconditionally at top before any early return) ---
  const [isHighLoad, setIsHighLoad] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const langInfo = useMemo(() => getLanguageInfo(appLanguage), [appLanguage]);
  const isRtl = useMemo(() => (langInfo?.dir || 'rtl') === 'rtl', [langInfo]);
  const t = useMemo(() => getTranslation(appLanguage), [appLanguage]);

  useRegisterBackStep(
    'blomeo_side_nav',
    'modal',
    isOpen,
    onClose,
    t.sideNavDailyTasks || (isRtl ? 'القائمة الجانبية' : 'Side Navigation')
  );

  // Focus search input when expanding via search icon in Low-Load mode
  const handleFocusSearch = useCallback(() => {
    setIsHighLoad(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);
  }, []);

  // Live global search across the entire app
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. Diaries (titles & content)
    diaries.forEach((d) => {
      const titleMatch = d.title && d.title.toLowerCase().includes(q);
      const contentMatch = d.content && d.content.toLowerCase().includes(q);
      if (titleMatch || contentMatch) {
        results.push({
          id: `diary-${d.id}`,
          type: 'diary',
          title: d.title || (t.untitledEntry || (isRtl ? 'يومية بدون عنوان' : 'Untitled entry')),
          snippet: d.content ? d.content.slice(0, 70) : undefined,
          date: d.createdAt ? d.createdAt.split('T')[0] : undefined,
          action: () => {
            onClose();
            if (onNavigateToDiary) {
              onNavigateToDiary(d.id);
            }
          }
        });
      }
    });

    // 2. Daily Tasks
    tasks.forEach((task) => {
      if (task.text && task.text.toLowerCase().includes(q)) {
        results.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.text,
          snippet: task.completed ? (isRtl ? '✓ مكتملة' : '✓ Completed') : (isRtl ? 'قيد الانتظار' : 'Pending'),
          action: () => {
            onClose();
            onOpenTasks();
          }
        });
      }
    });

    // 3. Habits
    habits.forEach((h) => {
      if (h.name && h.name.toLowerCase().includes(q)) {
        results.push({
          id: `habit-${h.id}`,
          type: 'habit',
          title: h.name,
          snippet: h.category,
          action: () => {
            onClose();
            onOpenTasks();
          }
        });
      }
    });

    // 4. Gratitude entries
    gratitudeCards.forEach((g) => {
      const textMatch = g.text && g.text.toLowerCase().includes(q);
      const tagMatch = g.tags && g.tags.some(tag => tag.toLowerCase().includes(q));
      if (textMatch || tagMatch) {
        results.push({
          id: `gratitude-${g.id}`,
          type: 'gratitude',
          title: g.text ? g.text.slice(0, 45) : (isRtl ? 'بطاقة امتنان' : 'Gratitude card'),
          snippet: g.tags ? g.tags.join(' • ') : undefined,
          action: () => {
            onClose();
            onOpenGratitude();
          }
        });
      }
    });

    // 5. CBT Worksheets in Diaries
    diaries.forEach((d) => {
      if (d.cbtWorksheets && d.cbtWorksheets.length > 0) {
        d.cbtWorksheets.forEach((cbt, idx) => {
          const matched =
            (cbt.negativeThoughts && cbt.negativeThoughts.toLowerCase().includes(q)) ||
            (cbt.cognitiveDistortion && cbt.cognitiveDistortion.toLowerCase().includes(q)) ||
            (cbt.rationalAlternative && cbt.rationalAlternative.toLowerCase().includes(q));
          if (matched) {
            results.push({
              id: `cbt-${d.id}-${idx}`,
              type: 'cbt',
              title: cbt.negativeThoughts ? cbt.negativeThoughts.slice(0, 45) : (isRtl ? 'تمرين معرفي' : 'CBT Exercise'),
              snippet: cbt.cognitiveDistortion || undefined,
              action: () => {
                onClose();
                onOpenCBT();
              }
            });
          }
        });
      }
    });

    // 6. Reminders
    reminders.forEach((r) => {
      const match =
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.motivationalNote && r.motivationalNote.toLowerCase().includes(q));
      if (match) {
        results.push({
          id: `reminder-${r.id}`,
          type: 'reminder',
          title: r.title,
          snippet: r.time,
          action: () => {
            onClose();
            onOpenCalendar();
          }
        });
      }
    });

    // 7. Consultations
    consultations.forEach((c, idx) => {
      const text = typeof c === 'string' ? c : (c.question || c.answer || c.text || '');
      if (text && text.toLowerCase().includes(q)) {
        results.push({
          id: `consultation-${idx}`,
          type: 'consultation',
          title: text.slice(0, 45),
          action: () => {
            onClose();
            onOpenCBT();
          }
        });
      }
    });

    return results.slice(0, 15);
  }, [
    searchQuery,
    diaries,
    tasks,
    habits,
    gratitudeCards,
    reminders,
    consultations,
    t,
    isRtl,
    onClose,
    onNavigateToDiary,
    onOpenTasks,
    onOpenGratitude,
    onOpenCBT,
    onOpenCalendar
  ]);

  const userName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : null) || t.defaultUserName || (isRtl ? 'مستخدم بلوميو' : 'Blomeo User');

  // Navigation Items list
  const navItems = [
    {
      id: 'tasks' as const,
      label: t.sideNavDailyTasks || (isRtl ? 'قائمة المهام اليومية' : 'Daily Tasks'),
      icon: CheckSquare,
      onClick: () => {
        onClose();
        onOpenTasks();
      }
    },
    {
      id: 'calendar' as const,
      label: t.sideNavCalendar || (isRtl ? 'التقويم' : 'Calendar'),
      icon: CalendarIcon,
      onClick: () => {
        onClose();
        onOpenCalendar();
      }
    },
    {
      id: 'gratitude' as const,
      label: t.sideNavGratitude || (isRtl ? 'جدار الامتنان' : 'Gratitude Wall'),
      icon: Heart,
      onClick: () => {
        onClose();
        onOpenGratitude();
      }
    },
    {
      id: 'cbt' as const,
      label: t.sideNavCBT || (isRtl ? 'تمرين العلاج المعرفي' : 'CBT Exercise'),
      icon: Brain,
      onClick: () => {
        onClose();
        onOpenCBT();
      }
    }
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Dim backdrop to dismiss on outside click */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[3px] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Glassmorphic Emerald Side Rail */}
      <aside
        className={`relative z-10 my-3 sm:my-4 mx-3 sm:mx-4 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 border border-white/20 backdrop-blur-2xl ${
          isHighLoad
            ? 'w-[290px] sm:w-[320px] rounded-[32px] p-4 sm:p-5'
            : 'w-[74px] sm:w-[82px] rounded-[36px] p-2.5 sm:p-3 items-center'
        }`}
        style={{
          background: 'linear-gradient(180deg, #1E5F48 0%, #113B2D 55%, #0A221A 100%)',
          boxShadow: '0 25px 50px -12px rgba(10, 34, 26, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.25)'
        }}
        aria-label={t.sideNavDailyTasks || 'Side Navigation'}
      >
        {/* Top Segment: Brand Header, User Row & Search */}
        <div className="w-full flex flex-col space-y-4">

          {/* 1. Brand Header & User Name */}
          <div
            onClick={() => {
              onClose();
              onOpenAccount();
            }}
            className={`flex items-center gap-3 cursor-pointer group transition-all rounded-2xl ${
              isHighLoad ? 'p-2 hover:bg-white/10' : 'justify-center p-1 hover:bg-white/10'
            }`}
            title={userName}
          >
            <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-950/60 border border-white/20 p-1.5 shadow-inner">
              <img
                src="/blomeo-icon.png"
                alt="blomeo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#113B2D] rounded-full" />
            </div>

            {isHighLoad && (
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white tracking-wide truncate">
                    {userName}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-emerald-200/70 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
                </div>
                <span className="text-[10px] text-emerald-200/80 font-medium">
                  blomeo • {isDarkMode ? 'Dark' : 'Light'}
                </span>
              </div>
            )}
          </div>

          {/* 2. Global App Search Field */}
          {isHighLoad ? (
            <div className="relative w-full">
              <div className="relative flex items-center bg-emerald-950/50 border border-white/15 focus-within:border-emerald-300/60 rounded-2xl px-3 py-2 transition-all shadow-inner">
                <Search className="w-4 h-4 text-emerald-200/70 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.sideNavGlobalSearch || (isRtl ? 'بحث شامل في التطبيق...' : 'Search entire app...')}
                  className="w-full bg-transparent text-white placeholder-emerald-200/50 text-xs px-2 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-emerald-200/70 hover:text-white p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Live Search Jump Results Panel */}
              {searchQuery.trim() && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl bg-[#0D261D]/95 border border-emerald-500/30 p-1.5 space-y-1 shadow-2xl scrollbar-thin">
                  {searchResults.length > 0 ? (
                    searchResults.map((res) => {
                      const TypeIcon =
                        res.type === 'diary' ? BookOpen :
                        res.type === 'task' ? CheckSquare :
                        res.type === 'habit' ? Heart :
                        res.type === 'gratitude' ? Heart :
                        res.type === 'cbt' ? Brain :
                        res.type === 'reminder' ? Bell : MessageSquare;

                      const typeLabel =
                        res.type === 'diary' ? (t.searchResultDiary || (isRtl ? 'يوميات' : 'Diary')) :
                        res.type === 'task' ? (t.searchResultTask || (isRtl ? 'مهمة' : 'Task')) :
                        res.type === 'habit' ? (t.searchResultHabit || (isRtl ? 'عادة' : 'Habit')) :
                        res.type === 'gratitude' ? (t.searchResultGratitude || (isRtl ? 'امتنان' : 'Gratitude')) :
                        res.type === 'cbt' ? (t.searchResultCBT || (isRtl ? 'تمرين CBT' : 'CBT')) :
                        res.type === 'reminder' ? (t.searchResultReminder || (isRtl ? 'تنبيه' : 'Reminder')) :
                        (t.searchResultConsultation || (isRtl ? 'استشارة' : 'Consultation'));

                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={res.action}
                          className="w-full text-start p-2 rounded-xl hover:bg-white/10 transition-colors flex items-start gap-2.5 group cursor-pointer"
                        >
                          <div className="p-1 rounded-lg bg-emerald-700/40 text-emerald-200 shrink-0 mt-0.5">
                            <TypeIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white truncate block">
                                {res.title}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 shrink-0 font-medium">
                                {typeLabel}
                              </span>
                            </div>
                            {res.snippet && (
                              <p className="text-[10px] text-emerald-200/70 truncate mt-0.5">
                                {res.snippet}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-emerald-200/60">
                      {t.sideNavSearchNoResults || (isRtl ? 'لا توجد نتائج مطابقة' : 'No matching results found')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFocusSearch}
              className="w-12 h-12 mx-auto rounded-2xl bg-emerald-950/50 hover:bg-white/15 border border-white/15 text-emerald-100 flex items-center justify-center transition-all cursor-pointer shadow-inner"
              title={t.sideNavGlobalSearch || (isRtl ? 'بحث شامل' : 'Global search')}
              aria-label={t.sideNavGlobalSearch || 'Search'}
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {/* Nav Items List (Strict Order: Tasks, Calendar, Gratitude, CBT) */}
          <nav className="w-full flex flex-col space-y-2 pt-2" aria-label="Side Rail Menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return isHighLoad ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer relative group ${
                    isActive
                      ? isDarkMode
                        ? 'bg-[#0D1914] text-[#74C69D] shadow-lg border border-emerald-400/30'
                        : 'bg-[#F4F7F5] text-[#113B2D] shadow-lg border border-white'
                      : 'text-emerald-50/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {/* Active Curved Cutout Accent Bar */}
                  {isActive && (
                    <span className="absolute start-0 inset-y-2 w-1.5 rounded-e-full bg-emerald-400" />
                  )}
                  <Icon className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive
                      ? isDarkMode ? 'text-[#74C69D]' : 'text-[#113B2D]'
                      : 'text-emerald-200'
                  }`} />
                  <span className="truncate tracking-wide">{item.label}</span>
                </button>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                    isActive
                      ? isDarkMode
                        ? 'bg-[#0D1914] text-[#74C69D] shadow-lg border border-emerald-400/30'
                        : 'bg-[#F4F7F5] text-[#113B2D] shadow-lg border border-white'
                      : 'text-emerald-100 hover:bg-white/10 hover:text-white'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Mode Switcher Button (− / +) */}
        <div className="w-full pt-4 border-t border-white/10 flex items-center justify-between">
          {isHighLoad ? (
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[10px] text-emerald-200/70 font-semibold">
                {t.sideNavHighLoad || (isRtl ? 'الوضع المفصل' : 'Detailed mode')}
              </span>
              <button
                type="button"
                onClick={() => setIsHighLoad(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white/20"
                title={t.sideNavCollapse || (isRtl ? 'طي القائمة إلى الوضع المصغر' : 'Collapse to compact mode')}
                aria-label={t.sideNavCollapse || 'Collapse'}
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsHighLoad(true)}
              className="w-9 h-9 mx-auto rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white/20"
              title={t.sideNavExpand || (isRtl ? 'توسيع القائمة إلى الوضع المفصل' : 'Expand to detailed mode')}
              aria-label={t.sideNavExpand || 'Expand'}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
