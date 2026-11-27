import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Sparkles, CheckSquare, Heart, Brain, BellRing, Cloud } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface FloatingFabMenuProps {
  appLanguage?: AppLanguage;
  incompleteTasksCount: number;
  remindersCount: number;
  hasActiveReminders: boolean;
  currentUser: any;
  onOpenAthkar: () => void;
  onOpenTasks: () => void;
  onOpenGratitude: () => void;
  onOpenCBT: () => void;
  onOpenReminders: () => void;
  onOpenAuth: () => void;
}

export default function FloatingFabMenu({
  appLanguage = 'ar',
  incompleteTasksCount,
  remindersCount,
  hasActiveReminders,
  currentUser,
  onOpenAthkar,
  onOpenTasks,
  onOpenGratitude,
  onOpenCBT,
  onOpenReminders,
  onOpenAuth,
}: FloatingFabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  // Position management with persistence
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (_) {}
    // Default initial position: bottom-start of viewport
    const isRtl = langInfo.dir === 'rtl';
    const initialX = isRtl ? (typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 76) : 300) : 20;
    const initialY = typeof window !== 'undefined' ? Math.max(100, window.innerHeight - 140) : 550;
    return { x: initialX, y: initialY };
  });

  const isDraggingRef = useRef(false);
  const startPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startElementPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedSignificantlyRef = useRef(false);

  // Clamping helper
  const clampPosition = (x: number, y: number) => {
    const fabSize = 56;
    const padding = 12;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 360;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 640;
    const clampedX = Math.min(Math.max(padding, x), winW - fabSize - padding);
    const clampedY = Math.min(Math.max(padding + 40, y), winH - fabSize - 70); // protect status/bottom bar
    return { x: clampedX, y: clampedY };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on primary pointer
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedSignificantlyRef.current = false;
    startPointerPos.current = { x: e.clientX, y: e.clientY };
    startElementPos.current = { ...position };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startPointerPos.current.x;
    const dy = e.clientY - startPointerPos.current.y;
    if (Math.hypot(dx, dy) > 6) {
      hasMovedSignificantlyRef.current = true;
    }
    const newPos = clampPosition(startElementPos.current.x + dx, startElementPos.current.y + dy);
    setPosition(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Persist position
    try {
      localStorage.setItem('yawmiyati_fab_pos', JSON.stringify(position));
    } catch (_) {}

    // Click trigger if no significant drag
    if (!hasMovedSignificantlyRef.current) {
      setIsOpen(prev => !prev);
    }
  };

  // Adjust on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Floating FAB Trigger Button */}
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9998,
          touchAction: 'none',
        }}
        dir={langInfo.dir}
        className="select-none"
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95 cursor-grab active:cursor-grabbing border-2 border-white/90 ${
            isOpen
              ? 'bg-[#5A5A40] text-white rotate-90 ring-4 ring-[#8B9D83]/50'
              : 'bg-gradient-to-tr from-[#2D6A4F] to-[#52B788] text-white ring-4 ring-[#2D6A4F]/20'
          }`}
          title={t.topMenuQuickDrawer || 'القائمة السريعة والأقسام'}
          aria-label={t.topMenuQuickDrawer || 'القائمة السريعة والأقسام'}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <>
              <Plus className="w-6 h-6 transition-transform duration-200" />
              {(incompleteTasksCount > 0 || hasActiveReminders) && (
                <span className="absolute top-1 end-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </>
          )}
        </button>
      </div>

      {/* Horizontally scrollable quick-tools tray when open */}
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-[4.5rem] z-[9997] px-3 py-2 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
          dir={langInfo.dir}
        >
          <div className="max-w-xl mx-auto bg-white/95 backdrop-blur-md border border-[#E2DCC8] shadow-2xl rounded-2xl p-2 flex items-center gap-2 overflow-x-auto flex-nowrap scrollbar-none touch-pan-x">
            {/* Close button inside tray for convenience */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#474732] active:scale-95 transition-all cursor-pointer shadow-3xs flex items-center justify-center min-h-[40px] min-w-[40px] shrink-0"
              title={t.closeAction || 'إغلاق القائمة'}
              aria-label={t.closeAction || 'إغلاق القائمة'}
            >
              <X className="w-5 h-5" />
            </button>

            {/* 1. الأذكار (Athkar) */}
            <button
              type="button"
              onClick={() => {
                onOpenAthkar();
                // Close ONLY the menu tray
                setIsOpen(false);
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#F3E8FF] hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] cursor-pointer"
              title={t('nav.dhikr_title')}
            >
              <Sparkles className="w-4 h-4 text-[#7C3AED] animate-pulse shrink-0" />
              <span>{t('nav.dhikr')}</span>
            </button>

            {/* 2. قائمة المهام اليومية (Daily Tasks Checklist) */}
            <button
              type="button"
              onClick={() => {
                onOpenTasks();
                setIsOpen(false);
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#EEF1EB] hover:bg-[#E2E9DF] text-[#556E4F] border border-[#DCE4D8] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] cursor-pointer"
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
                onOpenGratitude();
                setIsOpen(false);
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#FAF0F4] hover:bg-[#FCE8F0] text-[#9D4E6B] border border-[#F3D7E2] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] cursor-pointer"
              title={t.gratitudeSubtab}
            >
              <span className="text-base shrink-0">🌸</span>
              <span>{t.gratitudeSubtab || 'الامتنان'}</span>
            </button>

            {/* 4. تمارين العلاج المعرفي (CBT Exercises) */}
            <button
              type="button"
              onClick={() => {
                onOpenCBT();
                setIsOpen(false);
              }}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#F0F4FA] hover:bg-[#E5EEF8] text-[#3E5C76] border border-[#D3E0EA] rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] cursor-pointer"
              title={t.cbtSubtabLabel}
            >
              <span className="text-base shrink-0">🧠</span>
              <span>{t.cbtSubtabLabel || 'التمارين'}</span>
            </button>

            {/* 5. التنبيهات / الإشعارات (Smart Reminders) */}
            <button
              type="button"
              onClick={() => {
                onOpenReminders();
                setIsOpen(false);
              }}
              className="relative flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] cursor-pointer"
              title={t('nav.smart_reminders')}
            >
              <BellRing className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{t('nav.smart_reminders')}</span>
              {remindersCount > 0 && (
                <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-black">
                  {remindersCount}
                </span>
              )}
            </button>

            {/* 6. تسجيل الدخول / الحساب (Login / Account status) */}
            <button
              type="button"
              onClick={() => {
                onOpenAuth();
                setIsOpen(false);
              }}
              className={`flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 border rounded-xl text-xs font-black shadow-3xs active:scale-95 transition-all shrink-0 whitespace-nowrap h-10 min-h-[40px] cursor-pointer ${
                currentUser
                  ? 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
              title={t('nav.account_title')}
            >
              {currentUser ? (
                <>
                  <Cloud className="w-4 h-4 text-teal-200 shrink-0" />
                  <span>{currentUser.displayName || currentUser.email || t('nav.my_account')}</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('nav.login')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
