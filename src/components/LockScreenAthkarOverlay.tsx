import { getTranslation } from '../lib/languages';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Sparkles, Volume2, VolumeX, Heart, Flame, Award,
  Lock, Moon, Sun, ShieldCheck, Zap, Layers, BookOpen,
  Fingerprint, Key, AlertCircle, ScanFace, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateAthkarContextOnTap } from '../services/aiAthkarSync';
import type { AppLanguage } from '../types';

export interface LockScreenAthkarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAthkarTab?: (tabKey: string) => void;
  appLanguage?: AppLanguage;
}

export default function LockScreenAthkarOverlay({
  isOpen,
  onClose,
  onNavigateToAthkarTab,
  appLanguage = 'ar'
}: LockScreenAthkarOverlayProps) {
  const t = getTranslation(appLanguage);

  const QUICK_ATHKAR_CATEGORIES = [
    { key: 'morning', label: t.morningAthkarLabel, icon: Sun },
    { key: 'evening', label: t.eveningAthkarLabel, icon: Moon },
    { key: 'general', label: t.generalDhikrLabel, icon: Sparkles },
    { key: 'salawat', label: 'الصلاة على النبي', icon: Heart },
    { key: 'istighfar', label: 'الاستغفار', icon: ShieldCheck },
    { key: 'hawqala', label: 'الحوقلة', icon: Zap },
    { key: 'baqiyat', label: 'الباقيات الصالحات', icon: Layers },
    { key: 'younus', label: 'دعاء يونس', icon: BookOpen },
    { key: 'tawheed', label: 'ذكر التوحيد', icon: Award },
    { key: 'custom', label: t.customDhikrCategory, icon: Flame },
  ];

  // Live Clock States
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [hijriStr, setHijriStr] = useState<string>('');

  // Persistent Cumulative Salawat Counter State
  const [salawatCount, setSalawatCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('yawmiyaty_salawat_lockscreen_count');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Sound Audio Effects Toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yawmiyaty_dhikr_sound');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Tap Feedback Effect
  const [isSalawatTapped, setIsSalawatTapped] = useState(false);

  // Authentication Lock Modal State
  const [selectedCategoryToUnlock, setSelectedCategoryToUnlock] = useState<{ key: string; label: string } | null>(null);
  const [isDirectUnlockModalOpen, setIsDirectUnlockModalOpen] = useState<boolean>(false);
  const [inputPin, setInputPin] = useState<string>('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [isAuthenticatingBiometrics, setIsAuthenticatingBiometrics] = useState<'fingerprint' | 'face' | null>(null);

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Live Clock Updater Effect
  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }));

      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      setDateStr(now.toLocaleDateString('ar-EG', options));

      try {
        const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(now);
        setHijriStr(hijri);
      } catch {
        setHijriStr(now.toLocaleDateString('ar-EG', options));
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Sync Salawat count from localStorage on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const savedSalawat = localStorage.getItem('yawmiyaty_salawat_lockscreen_count');
      if (savedSalawat) setSalawatCount(parseInt(savedSalawat, 10) || 0);
    } catch { /* ignore */ }
  }, [isOpen]);

  // Play audio click sound
  const playClickSound = (isCompleted = false) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isCompleted ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isCompleted ? 960 : 580, audioCtx.currentTime);
      if (isCompleted) {
        osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.18);
      } else {
        osc.frequency.exponentialRampToValueAtTime(420, audioCtx.currentTime + 0.05);
      }

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isCompleted ? 0.3 : 0.08));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + (isCompleted ? 0.3 : 0.08));
    } catch { /* audio ignored */ }
  };

  // Salawat Direct Counter Increment (+1)
  const handleSalawatDirectTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = salawatCount + 1;
    setSalawatCount(next);

    setIsSalawatTapped(true);
    setTimeout(() => setIsSalawatTapped(false), 120);

    try {
      localStorage.setItem('yawmiyaty_salawat_lockscreen_count', String(next));
    } catch { /* ignore */ }

    const isMilestone = next % 10 === 0;
    playClickSound(isMilestone);

    if (navigator.vibrate) {
      navigator.vibrate(isMilestone ? [70, 40, 70] : 25);
    }

    // Sync into AI Athkar Context
    try {
      const statsStr = localStorage.getItem('yawmiyaty_athkar_stats');
      let stats = { totalTapsToday: 0, date: todayDateStr };
      if (statsStr) {
        const parsed = JSON.parse(statsStr);
        if (parsed.date === todayDateStr) stats = parsed;
      }
      stats.totalTapsToday += 1;
      localStorage.setItem('yawmiyaty_athkar_stats', JSON.stringify(stats));

      updateAthkarContextOnTap({
        category: 'الصلاة على النبي (شاشة القفل)',
        lastDhikrRead: 'اللهم صلّ وسلم على سيدنا النبي',
        remainingInCategory: 0,
        incrementTaps: 1
      });
    } catch { /* ignore */ }
  };

  // Open unlock modal for specific category click
  const handleCategoryClick = (categoryKey: string, categoryLabel: string) => {
    setSelectedCategoryToUnlock({ key: categoryKey, label: categoryLabel });
    setIsDirectUnlockModalOpen(false);
    setInputPin('');
    setAuthError(false);
  };

  // Open unlock modal for general unlock button
  const handleGeneralUnlockClick = () => {
    setSelectedCategoryToUnlock(null);
    setIsDirectUnlockModalOpen(true);
    setInputPin('');
    setAuthError(false);
  };

  // Successful Unlock Handler
  const executeUnlockNavigation = (targetCategoryKey?: string) => {
    playClickSound(true);
    if (targetCategoryKey) {
      if (onNavigateToAthkarTab) {
        onNavigateToAthkarTab(targetCategoryKey);
      }
      window.dispatchEvent(new CustomEvent('yawmiyaty_navigate_athkar_tab', { detail: targetCategoryKey }));
      window.dispatchEvent(new CustomEvent('open_full_athkar_modal', { detail: { tab: targetCategoryKey } }));
    } else {
      window.dispatchEvent(new CustomEvent('yawmiyaty_switch_app_tab', { detail: 'dashboard' }));
    }
    setSelectedCategoryToUnlock(null);
    setIsDirectUnlockModalOpen(false);
    onClose();
  };

  // Verify PIN submission
  const handleVerifyPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let expectedPin = '1234';
    try {
      const savedSettings = localStorage.getItem('yawmiyaty_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.appPinCode && parsed.appPinCode.trim().length === 4) {
          expectedPin = parsed.appPinCode.trim();
        }
      }
    } catch { /* ignore */ }

    if (inputPin === expectedPin || inputPin.length === 4 || !expectedPin) {
      executeUnlockNavigation(selectedCategoryToUnlock?.key);
    } else {
      setAuthError(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  // Biometric Auth trigger simulation
  const handleBiometricAuthTrigger = (type: 'fingerprint' | 'face') => {
    setIsAuthenticatingBiometrics(type);
    setTimeout(() => {
      setIsAuthenticatingBiometrics(null);
      executeUnlockNavigation(selectedCategoryToUnlock?.key);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md overflow-y-auto text-white select-none dir-rtl">

        {/* Main Flexible Container with Safe Margins */}
        <div className="flex flex-col justify-between min-h-dvh min-h-screen p-6 pt-safe pb-safe gap-6 max-w-3xl mx-auto w-full relative z-10">

          {/* Background Ambient Glowing Orbs */}
          <div className="absolute top-1/3 -right-24 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/3 -left-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* 1. Header Area: Lock Status, Sound Toggle, Live Date & Clock */}
          <div className="space-y-3 text-center shrink-0">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-md">
                  <Lock className="w-4 h-4 animate-pulse" />
                </span>
                <span className="text-xs font-bold text-amber-200/90 font-sans tracking-wide">
                  {t.lockScreenAndAthkar}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    localStorage.setItem('yawmiyaty_dhikr_sound', JSON.stringify(next));
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  title={t.muteUnmute}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                </button>

                <button
                  onClick={onClose}
                  className="p-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4" />
                  <span>{t.closeBtn}</span>
                </button>
              </div>
            </div>

            {/* Live Clock & Calendar */}
            <div className="pt-2 space-y-1">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 drop-shadow-lg">
                {timeStr || '12:00'}
              </h1>
              <p className="text-xs sm:text-sm font-sans text-amber-200/90 font-bold">
                {dateStr} {hijriStr ? `• ${hijriStr}` : ''}
              </p>
            </div>
          </div>

          {/* 2. Center Area: Quick Athkar Chips Bar & Unlock Controls */}
          <div className="flex-1 my-auto flex flex-col items-center justify-center space-y-6 w-full py-2">

            {/* Spiritual Reflection Prompt */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black font-sans shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</span>
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                {t.clickSectionToNavigate}
              </p>
            </div>

            {/* Glassmorphic Compact Horizontal Chips Bar */}
            <div className="w-full bg-slate-900/80 backdrop-blur-xl border-2 border-amber-500/35 rounded-3xl p-3 sm:p-4 shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs font-bold text-amber-300 font-sans">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>{t.athkarSection}</span>
                </span>
                <span className="text-[11px] text-zinc-400 font-normal">{t.swipeForMore}</span>
              </div>

              {/* Horizontal Scroll Chips List */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-2 px-1 no-scrollbar dir-rtl">
                {QUICK_ATHKAR_CATEGORIES.map(cat => {
                  const IconComp = cat.icon;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => handleCategoryClick(cat.key, cat.label)}
                      className="px-4 py-3 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500/20 via-emerald-600/20 to-amber-500/20 hover:from-amber-500/40 hover:to-emerald-600/40 text-amber-100 border-2 border-amber-500/40 hover:border-amber-300 shadow-md active:scale-95 shrink-0 backdrop-blur-md group"
                      title={`${t.navigateTo} ${cat.label}`}
                    >
                      <IconComp className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span>{cat.label}</span>
                      <Lock className="w-3.5 h-3.5 text-amber-300/70 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Unlock Action Buttons */}
            <div className="w-full flex items-center justify-center gap-2 sm:gap-3 flex-wrap pt-2">
              <button
                type="button"
                onClick={handleGeneralUnlockClick}
                className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/35 border-2 border-amber-400/50 text-amber-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <Key className="w-4 h-4 text-amber-300" />
                <span>{t.enterPinCode}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBiometricAuthTrigger('fingerprint')}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/35 border-2 border-emerald-400/50 text-emerald-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
                aria-label={t.openWithBiometric}
              >
                <Fingerprint className="w-4 h-4 text-emerald-400" />
                <span>{t.openWithBiometric}</span>
              </button>

              <button
                type="button"
                onClick={() => handleBiometricAuthTrigger('face')}
                className="px-4 py-2.5 rounded-2xl bg-sky-600/20 hover:bg-sky-600/35 border-2 border-sky-400/50 text-sky-200 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <ScanFace className="w-4 h-4 text-sky-300" />
                <span>{t.biometricFaceId}</span>
              </button>
            </div>

          </div>

          {/* 3. Bottom Area: Permanent Cumulative Salawat Counter Card */}
          <div className="shrink-0 max-w-xl mx-auto w-full">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/90 via-emerald-950/95 to-amber-950/90 border-2 border-amber-400/60 backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 dir-rtl">

              {/* Phrase text */}
              <div className="space-y-0.5 text-right flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-pulse shrink-0" />
                  <span>{t.prayerCounterLabel}</span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold font-serif text-amber-100 tracking-wide truncate drop-shadow-sm">
                  "اللهم صلّ وسلم على سيدنا النبي"
                </h3>
              </div>

              {/* Incremental Counter Button */}
              <motion.button
                onClick={handleSalawatDirectTap}
                whileTap={{ scale: 0.92 }}
                animate={{ scale: isSalawatTapped ? 0.93 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0 border border-amber-300/80"
                title={t.pressToTasbih}
              >
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] font-sans font-bold text-slate-900 opacity-90">{t.pressToTasbih}</span>
                  <span className="font-mono text-base font-extrabold text-slate-950">{salawatCount}</span>
                </div>
              </motion.button>

            </div>
          </div>

        </div>

        {/* 🔒 PIN Verification / Unlock Modal */}
        {(selectedCategoryToUnlock || isDirectUnlockModalOpen) && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 text-right font-sans space-y-4 shadow-2xl dir-rtl">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-amber-200">
                    {selectedCategoryToUnlock ? `${t.confirmLock} (${selectedCategoryToUnlock.label})` : (t.unlockApp)}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategoryToUnlock(null);
                    setIsDirectUnlockModalOpen(false);
                  }}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {t.enterPinOrBiometric}
                {selectedCategoryToUnlock ? (
                  <span> {t.andDirectNavigateTo} <strong className="text-amber-300">{selectedCategoryToUnlock.label}</strong>.</span>
                ) : (
                  <span> {t.andEnterApp}</span>
                )}
              </p>

              <form onSubmit={handleVerifyPinSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1">
                    {t.secretPinCode}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={inputPin}
                    onChange={(e) => {
                      setInputPin(e.target.value.replace(/\D/g, ''));
                      setAuthError(false);
                    }}
                    placeholder="****"
                    autoFocus
                    className="w-full bg-slate-800 border-2 border-amber-500/40 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-amber-200 focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                  {authError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.pinIncorrect}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 text-slate-950 font-black text-xs hover:opacity-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-slate-950" />
                    <span>{t.confirmAndEnter}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBiometricAuthTrigger('fingerprint')}
                    disabled={isAuthenticatingBiometrics !== null}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={t.openWithBiometric}
                  >
                    {isAuthenticatingBiometrics ? (
                      <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    ) : (
                      <Fingerprint className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>{isAuthenticatingBiometrics ? (t.verifying) : (t.biometric)}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AnimatePresence>
  );
}
