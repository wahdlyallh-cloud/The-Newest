import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Mic,
  PenTool,
  Brain,
  Sparkles,
  Smartphone,
  Laptop,
  ArrowLeftRight,
  Download,
  Upload,
  BellRing,
  Moon,
  Layers,
  Zap,
  HeartHandshake,
  CheckSquare,
  HelpCircle,
  FileText,
  Image as ImageIcon,
  Flame,
  Check
} from 'lucide-react';

import { getLanguageInfo, getTranslation, isRtlLanguage, AppLanguage } from '../lib/languages';

export interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'diaries' | 'advisor' | 'analytics' | 'settings') => void;
  onOpenVoiceJournal?: () => void;
  onOpenVoiceVent?: () => void;
  onOpenSyncModal?: () => void;
  onOpenWriteDiaryImport?: () => void;
  appLanguage?: AppLanguage;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenVoiceJournal,
  onOpenVoiceVent,
  onOpenSyncModal,
  onOpenWriteDiaryImport,
  appLanguage = 'ar'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isRtl = isRtlLanguage(appLanguage);

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowRight') {
        if (isRtl) {
          handlePrev();
        } else {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, isRtl]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('hayat_onboarding_completed', 'true');
    } catch (e) {
      console.warn('Could not save onboarding state:', e);
    }
    onClose();
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 45; // min swipe distance in px

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped Left
        if (isRtl) handlePrev();
        else handleNext();
      } else {
        // Swiped Right
        if (isRtl) handleNext();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // 7 High-Energy Slides Covering Real Features
  const slides = [
    // Slide 1: أهلاً بك في حياة AI — مساحتك النفسية الخاصة (100% أوفلاين)
    {
      id: 'welcome',
      stepNum: 1,
      badgeText: (t.onboardingStepOf).replace('{step}', '1').replace('{total}', '7'),
      heroGradient: 'from-emerald-600 via-teal-700 to-[#1b3b36]',
      glowColor: 'bg-emerald-400/20',
      icon: ShieldCheck,
      iconColor: 'text-emerald-300',
      title: t.onboardingWelcomeTitle,
      subtitle: t.onboardingWelcomeSubtitle,
      chips: [
        { icon: Lock, label: t.onboardingExpressLabel, desc: t.onboardingExpressSub, color: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100' },
        { icon: ShieldCheck, label: t.onboardingUnderstandLabel, desc: t.onboardingUnderstandSub, color: 'bg-teal-500/15 border-teal-400/30 text-teal-100' },
        { icon: Zap, label: t.onboardingGrowLabel, desc: t.onboardingGrowSub, color: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100' }
      ],
      interactivePreview: (
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white/90 space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>100% Offline Protected</span>
            </span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40">
              Zero Cloud Leaks
            </span>
          </div>
          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
            {t.onboardingWelcomeDesc}
          </p>
        </div>
      ),
      actionButton: null
    },

    // Slide 2: اكتب وفضفض بحريتك — بالصوت أو القلم
    {
      id: 'diaries_voice',
      stepNum: 2,
      badgeText: (t.onboardingStepOf).replace('{step}', '2').replace('{total}', '7'),
      heroGradient: 'from-violet-700 via-purple-800 to-[#2c124d]',
      glowColor: 'bg-violet-400/20',
      icon: Mic,
      iconColor: 'text-violet-300',
      title: t.onboardingDiariesTitle,
      subtitle: t.onboardingDiariesSubtitle,
      chips: [
        { icon: Mic, label: t.onboardingLiveVoiceBadge, desc: t.onboardingVoiceStep2, color: 'bg-purple-500/15 border-purple-400/30 text-purple-100' },
        { icon: Flame, label: t.onboardingContinuousBadge, desc: t.onboardingVoiceStep3, color: 'bg-fuchsia-500/15 border-fuchsia-400/30 text-fuchsia-100' },
        { icon: PenTool, label: t.onboardingVoiceStep4, desc: t.onboardingExpressSub, color: 'bg-pink-500/15 border-pink-400/30 text-pink-100' }
      ],
      interactivePreview: (
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white/90 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-black text-purple-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>{t.onboardingLiveVoiceBadge}</span>
            </div>
            <span className="text-[10px] font-black bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
              100% Emotion & Vocal Tone
            </span>
          </div>
          <p className="text-[11px] italic bg-white/10 p-2 rounded-xl border border-white/10 text-white/90 leading-relaxed">
            {t.onboardingDiariesSample}
          </p>
          <div className="flex items-center justify-between text-[10px] text-white/70 font-bold px-1">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-cyan-300" /> Rich Notes</span>
            <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3 text-emerald-300" /> Offline Photos</span>
            <span className="flex items-center gap-1"><PenTool className="w-3 h-3 text-amber-300" /> Drawings</span>
            <span className="flex items-center gap-1"><CheckSquare className="w-3 h-3 text-pink-300" /> Tasks</span>
          </div>
        </div>
      ),
      actionButton: {
        text: t.onboardingTryDiariesBtn,
        onClick: () => {
          handleComplete();
          if (onOpenVoiceVent) {
            onOpenVoiceVent();
          } else if (onOpenVoiceJournal) {
            onOpenVoiceJournal();
          } else if (onNavigateTab) {
            onNavigateTab('diaries');
          }
        }
      }
    },

    // Slide 3: المستشار الذكي وتوفير استهلاك الـ AI + تقرير منتصف الليل
    {
      id: 'advisor_saver',
      stepNum: 3,
      badgeText: (t.onboardingStepOf).replace('{step}', '3').replace('{total}', '7'),
      heroGradient: 'from-blue-700 via-indigo-800 to-[#101b4b]',
      glowColor: 'bg-blue-400/20',
      icon: Brain,
      iconColor: 'text-blue-300',
      title: t.onboardingAdvisorTitle,
      subtitle: t.onboardingAdvisorSubtitle,
      chips: [
        { icon: Zap, label: 'توفير استهلاك الـ AI', desc: 'تحكم في إرسال الصور للموديل', color: 'bg-blue-500/15 border-blue-400/30 text-blue-100' },
        { icon: ShieldCheck, label: t.notRecordedToday, desc: 'ضمان عدم افتراض بيانات وهمية', color: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100' },
        { icon: Moon, label: 'تقرير 12:00 منتصف الليل', desc: 'إيجابيات وسلبيات وتوزيع المزاج', color: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-100' }
      ],
      interactivePreview: (
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white/90 space-y-2 text-start">
          <div className="bg-white/10 p-2 rounded-xl border border-white/10 text-xs">
            <span className="font-black text-cyan-300 block text-[10px] mb-0.5">{t.chatYouLabel}</span>
            <span className="text-white/90 leading-snug">{t.onboardingUserSample}</span>
          </div>
          <div className="bg-indigo-900/40 p-2 rounded-xl border border-indigo-400/20 text-xs">
            <span className="font-black text-indigo-300 flex items-center gap-1 text-[10px] mb-0.5">
              <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>{t.chatAdvisorLabel}</span>
            </span>
            <span className="text-indigo-100 leading-snug">{t.onboardingAdvisorSample}</span>
          </div>
        </div>
      ),
      actionButton: {
        text: t.onboardingStartConversationBtn,
        onClick: () => {
          handleComplete();
          if (onNavigateTab) onNavigateTab('advisor');
        }
      }
    },

    // Slide 4: مزامنة فورية بالإيميل بين موبايلك واللابتوب (Chrome / Windows)
    {
      id: 'email_sync',
      stepNum: 4,
      badgeText: (t.onboardingStepOf).replace('{step}', '4').replace('{total}', '7'),
      heroGradient: 'from-amber-600 via-orange-700 to-[#421b06]',
      glowColor: 'bg-amber-400/20',
      icon: ArrowLeftRight,
      iconColor: 'text-amber-300',
      title: t.onboardingPrivacyTitle,
      subtitle: t.onboardingPrivacySubtitle,
      chips: [
        { icon: Smartphone, label: 'هاتفك المحمول', desc: 'تطبيق أندرويد المستقل', color: 'bg-amber-500/15 border-amber-400/30 text-amber-100' },
        { icon: ArrowLeftRight, label: 'ربط الإيميل', desc: 'نفس البريد على الجهازين', color: 'bg-orange-500/15 border-orange-400/30 text-orange-100' },
        { icon: Laptop, label: 'Google Chrome', desc: 'لابتوب وكمبيوتر Windows', color: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-100' }
      ],
      interactivePreview: (
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white/90 space-y-2">
          {/* Visual Phone ↔ Laptop Sync Diagram */}
          <div className="flex items-center justify-around py-1.5 px-2 bg-white/5 rounded-xl border border-white/10">
            <div className="flex flex-col items-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-400/40">
                <Smartphone className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-[10px] font-black text-amber-200">Phone App</span>
            </div>

            <div className="flex flex-col items-center">
              <ArrowLeftRight className="w-5 h-5 text-amber-300 animate-pulse" />
              <span className="text-[9px] font-extrabold text-amber-300/80 mt-0.5">Live Sync</span>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-400/40">
                <Laptop className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-[10px] font-black text-amber-200">Chrome / PC</span>
            </div>
          </div>
          <p className="text-[11px] text-white/80 leading-relaxed font-medium text-center">
            {t.onboardingPrivacyDesc}
          </p>
        </div>
      ),
      actionButton: {
        text: t.onboardingPrivacySettingsBtn,
        onClick: () => {
          handleComplete();
          if (onOpenSyncModal) {
            onOpenSyncModal();
          } else if (onNavigateTab) {
            onNavigateTab('settings');
          }
        }
      }
    },

    // Slide 5: تصدير واستيراد يومياتك بضغطة زر
    {
      id: 'export_import',
      stepNum: 5,
      badgeText: (t.onboardingStepOf).replace('{step}', '5').replace('{total}', '7'),
      heroGradient: 'from-emerald-700 via-teal-800 to-[#0e3b32]',
      glowColor: 'bg-emerald-400/20',
      icon: Download,
      iconColor: 'text-emerald-300',
      title: '📦 تصدير واستيراد يومياتك بضغطة زر',
      subtitle: 'احفظ تدويناتك كصورة مطولة فائقة الدقة أو PDF منسق، وانقل بياناتك من التطبيقات الأخرى بسهولة.',
      chips: [
        { icon: ImageIcon, label: 'صورة مطولة (PNG)', desc: 'دعم كامل لألوان oklch الحديثة', color: 'bg-teal-500/15 border-teal-400/30 text-teal-100' },
        { icon: FileText, label: 'ملف PDF أنيق', desc: 'يشمل الصور وقوائم المهام', color: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100' },
        { icon: Upload, label: 'استيراد WriteDiary', desc: 'نقل فوري لجميع تدويناتك القديمة', color: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100' }
      ],
      interactivePreview: (
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white/90 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-black">
            <div className="bg-white/10 border border-white/15 p-2 rounded-xl flex items-center justify-center gap-1.5 text-emerald-200">
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Export Long PNG / PDF</span>
            </div>
            <div className="bg-white/10 border border-white/15 p-2 rounded-xl flex items-center justify-center gap-1.5 text-teal-200">
              <Upload className="w-3.5 h-3.5 text-teal-300" />
              <span>Import WriteDiary</span>
            </div>
          </div>
          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
            تصدير التدوينات كصورة مطولة (PNG) أو ملف PDF أنيق يشمل الصور والمهام مع دعم oklch، بالإضافة لاستيراد سهل من WriteDiary.
          </p>
        </div>
      ),
      actionButton: {
        text: 'استيراد تدوينات سابقة',
        onClick: () => {
          handleComplete();
          if (onOpenWriteDiaryImport) {
            onOpenWriteDiaryImport();
          } else if (onNavigateTab) {
            onNavigateTab('settings');
          }
        }
      }
    },

    // Slide 6: تنبيهات ذكية عائمة فوق التطبيقات + ركنك الهادئ
    {
      id: 'floating_reminders',
      stepNum: 6,
      badgeText: (t.onboardingStepOf).replace('{step}', '6').replace('{total}', '7'),
      heroGradient: 'from-pink-700 via-rose-800 to-[#4d1020]',
      glowColor: 'bg-pink-400/20',
      icon: BellRing,
      iconColor: 'text-pink-300',
      title: '🔔 تنبيهات ذكية عائمة وركنك الهادئ',
      subtitle: 'تذكيرات عائمة تفاعلية تظهر فوق التطبيقات، وقسم شامل للأذكار وجدار الامتنان وتمارين CBT.',
      chips: [
        { icon: BellRing, label: 'تنبيهات عائمة تفاعلية', desc: 'هل شربت الماء؟ (نعم / لا / ✕)', color: 'bg-pink-500/15 border-pink-400/30 text-pink-100' },
        { icon: Sparkles, label: 'أذكار الصباح والمساء', desc: 'عداد تسبيح ومأثورات كاملة', color: 'bg-rose-500/15 border-rose-400/30 text-rose-100' },
        { icon: HeartHandshake, label: 'جدار الامتنان و CBT', desc: 'تمارين العلاج المعرفي السلوكي', color: 'bg-purple-500/15 border-purple-400/30 text-purple-100' }
      ],
      interactivePreview: (
        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white/90 space-y-2">
          {/* Simulated Floating Pill Card */}
          <div className="bg-white/15 border border-pink-400/40 rounded-xl p-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-base animate-bounce">💧</span>
              <div>
                <p className="text-xs font-black text-pink-200">هل شربت الماء الآن؟</p>
                <p className="text-[9px] text-white/70">تنبيه عائم فوق التطبيقات</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/30 text-emerald-200 text-[10px] font-black border border-emerald-400/30">نعم</span>
              <span className="px-2 py-0.5 rounded-lg bg-rose-500/30 text-rose-200 text-[10px] font-black border border-rose-400/30">لا</span>
              <span className="px-1.5 py-0.5 rounded-lg bg-white/10 text-white/60 text-[10px] font-black">✕</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/70 font-bold px-1">
            <span>📿 الأذكار اليومية</span>
            <span>🌸 جدار الامتنان</span>
            <span>🧠 تمارين CBT</span>
          </div>
        </div>
      ),
      actionButton: {
        text: 'استكشف الركن الهادئ',
        onClick: () => {
          handleComplete();
          if (onNavigateTab) onNavigateTab('diaries');
        }
      }
    },

    // Slide 7: ابدأ رحلتك الآن
    {
      id: 'ready',
      stepNum: 7,
      badgeText: (t.onboardingStepOf).replace('{step}', '7').replace('{total}', '7'),
      heroGradient: 'from-[#1b3b36] via-[#244f46] to-[#0c1f1c]',
      glowColor: 'bg-emerald-400/30',
      icon: Sparkles,
      iconColor: 'text-emerald-300',
      title: t.onboardingReadyTitle,
      subtitle: t.onboardingReadySubtitle,
      chips: [
        { icon: CheckCircle2, label: 'أمان وتشفير محلي', desc: 'كل شيء على جهازك 100%', color: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100' },
        { icon: Laptop, label: 'مزامنة Chrome السريعة', desc: 'بين الموبايل والكمبيوتر', color: 'bg-teal-500/15 border-teal-400/30 text-teal-100' },
        { icon: Zap, label: 'تحديثات مباشرة داخلية', desc: 'تحديث التطبيق بنقرة من الإعدادات', color: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100' }
      ],
      interactivePreview: (
        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center space-y-2">
          <span className="text-3xl animate-bounce inline-block">🌱</span>
          <p className="text-xs font-black text-emerald-200 leading-relaxed">
            {t.onboardingReadyQuote}
          </p>
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-white/70">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>التحديثات الجديدة تُثبت بسلاسة بضغطة زر داخل شاشة الإعدادات</span>
          </div>
        </div>
      ),
      actionButton: {
        text: 'ربط الحساب وإعدادات الذكاء الاصطناعي',
        onClick: () => {
          handleComplete();
          if (onNavigateTab) onNavigateTab('settings');
        }
      }
    }
  ];

  const currentSlide = slides[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === slides.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg animate-fadeIn select-none touch-pan-y"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-height Native Mobile Container */}
      <div className="relative w-full h-[100dvh] max-w-md mx-auto flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300">

        {/* Dynamic Animated Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-b ${currentSlide.heroGradient} transition-colors duration-500`} />
        <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full ${currentSlide.glowColor} blur-3xl pointer-events-none transition-all duration-500`} />
        <div className={`absolute -bottom-24 -right-24 w-72 h-72 rounded-full ${currentSlide.glowColor} blur-3xl pointer-events-none transition-all duration-500`} />

        {/* Top Header Bar: Badge + Skip Button */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-xs">
              {currentSlide.badgeText}
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-black text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/15 transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-xs"
          >
            <span>{t.skipTourBtn || t.skipBtn || 'تخطي'}</span>
            {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Progress Bar Top Indicator */}
        <div className="relative z-10 px-5 pt-1">
          <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden backdrop-blur-xs">
            <div
              className="bg-white h-full rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${((currentStep + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 px-5 py-3 flex flex-col justify-center space-y-3 overflow-y-auto scrollbar-none">

          {/* Hero Icon with Subtle Floating Pulse */}
          <div className="flex items-center justify-start gap-3">
            <div className="w-13 h-13 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-lg shrink-0">
              <currentSlide.icon className={`w-7 h-7 ${currentSlide.iconColor} transition-transform duration-300 hover:scale-110`} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="onboarding-modal-title" className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
                {currentSlide.title}
              </h2>
              <p className="text-xs text-white/85 font-medium leading-relaxed pt-0.5 line-clamp-2">
                {currentSlide.subtitle}
              </p>
            </div>
          </div>

          {/* Interactive Feature Chips (No Text Walls) */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {currentSlide.chips.map((chip, idx) => {
              const ChipIcon = chip.icon;
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-2xl border backdrop-blur-md flex items-center gap-2.5 transition-all ${chip.color}`}
                >
                  <div className="p-1.5 rounded-xl bg-white/15 shrink-0">
                    <ChipIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-black truncate">{chip.label}</span>
                    <span className="block text-[10px] opacity-80 leading-tight truncate">{chip.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Live Preview Component */}
          <div className="pt-0.5">
            {currentSlide.interactivePreview}
          </div>

          {/* Optional Action Button to launch the feature */}
          {currentSlide.actionButton && (
            <button
              type="button"
              onClick={currentSlide.actionButton.onClick}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-98 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentSlide.actionButton.text}</span>
            </button>
          )}

        </div>

        {/* Bottom Controls Bar: Dots + Back + Next/Done */}
        <div className="relative z-10 px-5 pt-2 pb-6 flex flex-col space-y-3 bg-gradient-to-t from-black/50 via-black/25 to-transparent">

          {/* Animated Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5" aria-label="Progress">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-7 bg-white shadow-sm'
                    : 'w-2 bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handlePrev}
                className="py-3 px-5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all active:scale-95 shadow-xs"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{t.previousBtn || 'السابق'}</span>
              </button>
            ) : (
              <div />
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={handleComplete}
                className="py-3 px-7 rounded-2xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 hover:scale-[1.02]"
              >
                <span>{t.onboardingStartJourneyBtn || 'ابدأ رحلتك الآن'}</span>
                <Check className="w-4 h-4 text-emerald-800" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="py-3 px-6 rounded-2xl bg-white text-slate-900 font-black text-xs hover:bg-slate-100 transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 hover:scale-[1.02]"
              >
                <span>{isFirstStep ? (t.onboardingStartTourBtn || 'ابدأ الجولة التفاعلية') : (t.nextBtn || 'التالي')}</span>
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default OnboardingTourModal;
