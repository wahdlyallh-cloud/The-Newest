import { getTranslation } from "../lib/languages";
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Moon, BookOpen, Lock, ChevronDown, CheckCircle2, Award, Zap, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AthkarHeaderIconProps {
  onOpenFullAthkar: () => void;
  onOpenLockScreen: () => void;
  className?: string;
}

export default function AthkarHeaderIcon({
  appLanguage = "ar", onOpenFullAthkar, onOpenLockScreen, className = '' }: AthkarHeaderIconProps) {
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(1);

  // Compute today's progress percentage from localStorage
  useEffect(() => {
    const calculateTodayProgress = () => {
      try {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const statsStr = localStorage.getItem('yawmiyaty_athkar_stats');
        
        let totalTaps = 0;
        if (statsStr) {
          const stats = JSON.parse(statsStr);
          if (stats.date === todayDateStr) {
            totalTaps = stats.totalTapsToday || 0;
          }
        }

        // Check active tab progress or overall context
        const contextStr = localStorage.getItem('yawmiyaty_ai_athkar_context');
        if (contextStr) {
          const ctx = JSON.parse(contextStr);
          if (ctx.date === todayDateStr && typeof ctx.progressPercent === 'number') {
            setProgressPercent(ctx.progressPercent);
            return;
          }
        }

        // Fallback calculation based on taps (target ~ 100 taps)
        const calcPercent = Math.min(100, Math.round((totalTaps / 100) * 100));
        setProgressPercent(calcPercent);

        // Load streak
        const savedStreak = localStorage.getItem('yawmiyaty_athkar_streak');
        if (savedStreak) setStreakDays(parseInt(savedStreak, 10) || 1);
      } catch {
        setProgressPercent(0);
      }
    };

    calculateTodayProgress();
    const interval = setInterval(calculateTodayProgress, 3000);
    const t = getTranslation(appLanguage);
  return () => clearInterval(interval);
  }, []);

  // SVG Circular progress math
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Dynamic Golden Crescent & Progress Ring Icon Button */}
      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenFullAthkar}
          className="relative group flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-zinc-900/90 via-emerald-950/80 to-zinc-950 border border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/10 cursor-pointer transition-all duration-300"
          title="أذكار المسلم - فتح الشاشة الكاملة المباشرة"
        >
          {/* Pulsing Golden Beam */}
          <div className="absolute inset-0 rounded-2xl bg-amber-400/10 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 pointer-events-none" />

          {/* Circular Progress SVG Ring */}
          <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={radius}
              className="stroke-zinc-800"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              className="stroke-amber-400 transition-all duration-700 ease-out"
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Inner Moon & Tasbeeh Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex items-center justify-center text-amber-300">
              <Moon className="w-4 h-4 fill-amber-400/20 text-amber-300 transform -rotate-12" />
              <Sparkles className="w-2.5 h-2.5 text-amber-200 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          {/* Completion Indicator Dot */}
          {progressPercent >= 100 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </motion.button>

        {/* Dropdown Toggle for Lockscreen Mode & Options */}
        <button
          onClick={() => setIsOpenMenu(!isOpenMenu)}
          className="p-1 rounded-lg text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
          title={t.athkarModalTitle || "Remembrance & Tranquility"}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpenMenu ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Quick Access Dropdown Menu */}
      <AnimatePresence>
        {isOpenMenu && (
          <>
            {/* Backdrop click dismiss */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpenMenu(false)} 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 mt-2 z-50 w-72 p-4 rounded-2xl bg-gradient-to-b from-zinc-900 via-emerald-950 to-zinc-950 border border-amber-500/30 shadow-2xl shadow-black/80 text-right dir-rtl font-sans space-y-3"
            >
              {/* Header Title & Progress */}
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-200">{t.athkarModalTitle || "Daily Remembrance"}</h4>
                    <p className="text-[10px] text-zinc-400">{t.dailyDhikrProgress || "Daily Progress"}</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-300">
                  <span>{t.dailyCompletionRatio || "Daily Completion"}</span>
                  <span className="font-mono text-amber-300">{progressPercent}/100%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-amber-500/20">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions List */}
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => {
                    setIsOpenMenu(false);
                    onOpenFullAthkar();
                  }}
                  className="w-full p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center justify-between transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>عرض الشاشة الكاملة (Full Screen)</span>
                  </span>
                  <span className="text-amber-400 font-mono text-[10px]">←</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpenMenu(false);
                    onOpenLockScreen();
                  }}
                  className="w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center justify-between transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>وضع شاشة القفل المدمجة</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">تفاعلي</span>
                </button>
              </div>

              {/* Streak Stat Badge */}
              <div className="p-2 rounded-xl bg-black/40 border border-amber-500/10 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  سلسلة المواظبة المستمرة
                </span>
                <span className="font-bold text-amber-300 font-mono">{streakDays} أيام 🔥</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
