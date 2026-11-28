import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Brain,
  Cloud,
  FileDown,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Droplets,
  Calendar,
  RotateCcw,
  MessageSquare,
  Mic,
  Clock,
  Layers,
  Smartphone,
  CheckCircle2,
  Lock,
  Bell,
  Share2,
  FileText,
  Fingerprint
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
  isDarkMode?: boolean;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenVoiceJournal,
  onOpenVoiceVent,
  onOpenSyncModal,
  onOpenWriteDiaryImport,
  appLanguage = 'ar',
  isDarkMode = true
}) => {
  // --- 1. React Hooks (Unconditionally at top) ---
  const [currentStep, setCurrentStep] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isRtl = isRtlLanguage(appLanguage);

  const handleComplete = () => {
    try {
      localStorage.setItem('blomeo_discover_opened', 'true');
      localStorage.setItem('hayat_onboarding_completed', 'true');
      localStorage.setItem('blomeo_discover_nudge_dismissed', 'true');
    } catch (e) {
      console.warn('Could not save onboarding state:', e);
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < 4) {
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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete();
      } else if (e.key === 'ArrowRight') {
        if (isRtl) handlePrev();
        else handleNext();
      } else if (e.key === 'ArrowLeft') {
        if (isRtl) handleNext();
        else handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, isRtl]);

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
    const threshold = 45;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        if (isRtl) handlePrev();
        else handleNext();
      } else {
        if (isRtl) handleNext();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!isOpen) return null;

  // 5 Calm, Authentic Blomeo Slides
  const slides = [
    // Slide 1: أهلاً بك في بلوميو (Welcome & Home Mind-Map)
    {
      id: 'welcome_mindmap',
      stepNum: 1,
      icon: Compass,
      title: t.discoverSlide1Title || (isRtl ? 'أهلاً بك في بلوميو 🌿' : 'Welcome to Blomeo 🌿'),
      subtitle: t.discoverSlide1Subtitle || (isRtl ? 'مساحتك الطبوغرافية الهادئة وخريطة التوازن والمؤشرات اليومية.' : 'Your calm topographic sanctuary, life balance map, and daily metrics.'),
      chips: [
        {
          icon: Brain,
          label: t.discoverSlide1Chip1 || (isRtl ? 'خريطة تفاعلية للمخ والتركيز' : 'Interactive Focus Mind-Map'),
          desc: t.discoverSlide1Chip1Desc || (isRtl ? 'التبديل بين العرض الشبكي وخريطة التوازن بنقرة واحدة' : 'Toggle between grid layout and balance mind-map in one tap')
        },
        {
          icon: Droplets,
          label: t.discoverSlide1Chip2 || (isRtl ? 'كوب ماء ذكي غير محدود' : 'Smart Unlimited Water Cup'),
          desc: t.discoverSlide1Chip2Desc || (isRtl ? 'زيادة ونقصان سلس مع زر إعادة ضبط فوري' : 'Fluid hydration counter with instant one-tap reset')
        },
        {
          icon: Calendar,
          label: t.discoverSlide1Chip3 || (isRtl ? 'جدولة الأدوية والعادات' : 'Meds & Habits Scheduler'),
          desc: t.discoverSlide1Chip3Desc || (isRtl ? 'تتبع دقيق للجرعات اليومية والالتزام بدون انقطاع' : 'Strict tracking for daily doses and unbroken routines')
        }
      ],
      interactivePreview: (
        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0E2017]/70 border-emerald-500/20' : 'bg-[#EAF0EC] border-[#2D6A4F]/20'} space-y-2.5`}>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-black text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isRtl ? 'مساحة العمل الطبوغرافية' : 'Topographic Workspace'}</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
              {isRtl ? 'خريطة التوازن الذهنية' : 'Mind-Map & Habits'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
            <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-200' : 'bg-white border-emerald-200 text-emerald-900'}`}>
              <RotateCcw className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
              <span>{isRtl ? 'تصفير فوري' : 'One-Tap Reset'}</span>
            </div>
            <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-200' : 'bg-white border-emerald-200 text-emerald-900'}`}>
              <Droplets className="w-3.5 h-3.5 mx-auto mb-1 text-teal-400" />
              <span>{isRtl ? 'ماء غير محدود' : 'Fluid Water'}</span>
            </div>
            <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-200' : 'bg-white border-emerald-200 text-emerald-900'}`}>
              <Calendar className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
              <span>{isRtl ? 'جدولة الجرعات' : 'Meds & Habits'}</span>
            </div>
          </div>
        </div>
      ),
      actionButton: {
        text: isRtl ? 'استكشف واجهة بلوميو' : 'Explore Home Dashboard',
        onClick: () => {
          handleComplete();
          if (onNavigateTab) onNavigateTab('dashboard');
        }
      }
    },

    // Slide 2: المستشار المزدوج والذكاء الاصطناعي (Dual AI Advisor & Live Voice)
    {
      id: 'dual_advisor',
      stepNum: 2,
      icon: Brain,
      title: t.discoverSlide2Title || (isRtl ? 'المستشار المزدوج والذكاء الاصطناعي 🧠' : 'Dual AI Advisor & Live Voice 🧠'),
      subtitle: t.discoverSlide2Subtitle || (isRtl ? 'مستشارك الشخصي المخصص + المستشار العام المفتوح ومحادثات صوتية حية.' : 'Your scoped Personal Journal Advisor + Unbounded General Assistant with Live Voice.'),
      chips: [
        {
          icon: MessageSquare,
          label: t.discoverSlide2Chip1 || (isRtl ? 'مستشاري الشخصي' : 'Personal Journal Advisor'),
          desc: t.discoverSlide2Chip1Desc || (isRtl ? 'نطاق زمني مخصص (من يوم إلى سنة) مع تحكم كامل بالوسائط' : 'Scoped to custom time range (1d to 1y) with media controls')
        },
        {
          icon: Sparkles,
          label: t.discoverSlide2Chip2 || (isRtl ? 'المستشار الذكي العام' : 'General Smart Assistant'),
          desc: t.discoverSlide2Chip2Desc || (isRtl ? 'مساعد نقي على طراز Gemini بدون تقييد باليوميات' : 'Pure Gemini-style assistant without journal limits')
        },
        {
          icon: Mic,
          label: t.discoverSlide2Chip3 || (isRtl ? 'محادثات صوتية حية' : 'Live Two-Way Voice'),
          desc: t.discoverSlide2Chip3Desc || (isRtl ? 'تحدث واستمع بنبرة طبيعية سلسة في الوقت الفعلي' : 'Speak and listen with natural real-time responses')
        }
      ],
      interactivePreview: (
        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0E2017]/70 border-emerald-500/20' : 'bg-[#EAF0EC] border-[#2D6A4F]/20'} space-y-2`}>
          <div className="grid grid-cols-2 gap-2 text-start">
            <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-white border-emerald-300 text-emerald-950'}`}>
              <div className="flex items-center gap-1.5 font-black text-[11px] mb-1 text-emerald-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isRtl ? 'مستشاري الشخصي' : 'Personal Journal'}</span>
              </div>
              <p className="text-[10px] opacity-80 leading-relaxed">
                {isRtl ? 'مقيد بمذكراتك ونطاقك الزمني المحدد 1d-1y' : 'Strictly scoped to your diaries and time filter'}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-teal-950/40 border-teal-500/30 text-teal-200' : 'bg-white border-teal-300 text-teal-950'}`}>
              <div className="flex items-center gap-1.5 font-black text-[11px] mb-1 text-teal-300">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>{isRtl ? 'المستشار العام' : 'General Assistant'}</span>
              </div>
              <p className="text-[10px] opacity-80 leading-relaxed">
                {isRtl ? 'استشارات مفتوحة بأسلوب Gemini الحر' : 'Unbounded conversational AI and live voice'}
              </p>
            </div>
          </div>
        </div>
      ),
      actionButton: {
        text: isRtl ? 'فتح مركز المستشار' : 'Open Advisor Hub',
        onClick: () => {
          handleComplete();
          if (onNavigateTab) onNavigateTab('advisor');
        }
      }
    },

    // Slide 3: السحابة والمزامنة بالإيميل (Cloud Sync via Email)
    {
      id: 'cloud_sync',
      stepNum: 3,
      icon: Cloud,
      title: t.discoverSlide3Title || (isRtl ? 'السحابة والمزامنة بالإيميل ☁️' : 'Cloud Sync via Email ☁️'),
      subtitle: t.discoverSlide3Subtitle || (isRtl ? 'بياناتك مشفرة ومحفوظة بأمان؛ سجّل دخولك على أي هاتف لتعود فوراً.' : 'Your records are encrypted and protected; sign in on any device to restore instantly.'),
      chips: [
        {
          icon: Cloud,
          label: t.discoverSlide3Chip1 || (isRtl ? 'مزامنة سحابية آمنة' : 'Encrypted Cloud Sync'),
          desc: t.discoverSlide3Chip1Desc || (isRtl ? 'ربط بريدك الإلكتروني يزامن يومياتك وسجلاتك بشكل مشفر' : 'Link your email to backup your journals seamlessly')
        },
        {
          icon: CheckCircle2,
          label: t.discoverSlide3Chip2 || (isRtl ? 'استرجاع تلقائي بالكامل' : 'Automatic Device Restore'),
          desc: t.discoverSlide3Chip2Desc || (isRtl ? 'ثبّت بلوميو على هاتف آخر وسجّل بنفس الإيميل لتعود كل بياناتك' : 'Install Blomeo on a new phone, sign in with your email, and everything returns')
        },
        {
          icon: ShieldCheck,
          label: t.discoverSlide3Chip3 || (isRtl ? 'خصوصية محلية 100%' : '100% Privacy by Design'),
          desc: t.discoverSlide3Chip3Desc || (isRtl ? 'بياناتك الشخصية ملكك وحدك دون أي تسريب خارجي' : 'Zero third-party tracking; your reflections stay strictly yours')
        }
      ],
      interactivePreview: (
        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0E2017]/70 border-emerald-500/20' : 'bg-[#EAF0EC] border-[#2D6A4F]/20'} space-y-2`}>
          <div className="flex items-center justify-around py-2 px-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40 text-emerald-300">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-200">{isRtl ? 'هاتفك الأول' : 'Device A'}</span>
            </div>
            <div className="flex flex-col items-center">
              <Cloud className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono text-emerald-300/80 mt-0.5">E2EE Sync</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40 text-emerald-300">
                <Smartphone className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-200">{isRtl ? 'هاتفك الجديد' : 'Device B'}</span>
            </div>
          </div>
          <p className="text-[11px] text-center font-medium opacity-85">
            {isRtl ? 'تسجيل نفس البريد يعيد كل سجلاتك تلقائياً دون أي مجهود' : 'Signing into the same email restores all journals and records seamlessly'}
          </p>
        </div>
      ),
      actionButton: {
        text: isRtl ? 'ربط الحساب والمزامنة' : 'Link Account & Sync',
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

    // Slide 4: الاستيراد والتصدير والنسخ الاحتياطي (Import, Export & Device Transfer)
    {
      id: 'import_export',
      stepNum: 4,
      icon: FileDown,
      title: t.discoverSlide4Title || (isRtl ? 'الاستيراد والتصدير والنسخ الاحتياطي 📦' : 'Import, Export & Local Backup 📦'),
      subtitle: t.discoverSlide4Subtitle || (isRtl ? 'حفظ نسخة احتياطية على جهازك ونقل البيانات بسهولة بين الأجهزة.' : 'Save a local file on device and transfer data between devices anytime.'),
      chips: [
        {
          icon: FileDown,
          label: t.discoverSlide4Chip1 || (isRtl ? 'نسخة احتياطية محلية مشفرة' : 'Local Encrypted Backup'),
          desc: t.discoverSlide4Chip1Desc || (isRtl ? 'تصدير واستيراد ملف JSON شامل بضغطة زر واحدة' : 'One-click export and import of complete JSON backup files')
        },
        {
          icon: Share2,
          label: t.discoverSlide4Chip2 || (isRtl ? 'تصدير PDF وصور عريضة' : 'Export PDF & Long PNG'),
          desc: t.discoverSlide4Chip2Desc || (isRtl ? 'حفظ ومشاركة تدويناتك بصيغة PDF أنيقة أو صورة PNG مطولة' : 'High-resolution export with rich colors and print-ready formats')
        },
        {
          icon: Layers,
          label: t.discoverSlide4Chip3 || (isRtl ? 'استيراد تدوينات خارجية' : 'External Diary Import'),
          desc: t.discoverSlide4Chip3Desc || (isRtl ? 'استيراد فوري ومباشر لتدويناتك من التطبيقات السابقة' : 'Effortlessly bring entries over from previous journal apps')
        }
      ],
      interactivePreview: (
        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0E2017]/70 border-emerald-500/20' : 'bg-[#EAF0EC] border-[#2D6A4F]/20'} space-y-2`}>
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
            <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-200' : 'bg-white border-emerald-200 text-emerald-900'} flex items-center justify-center gap-1.5`}>
              <FileDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isRtl ? 'نسخة احتياطية JSON' : 'JSON Backup'}</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10 text-emerald-200' : 'bg-white border-emerald-200 text-emerald-900'} flex items-center justify-center gap-1.5`}>
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>{isRtl ? 'تصدير PDF / PNG' : 'PDF / Long PNG'}</span>
            </div>
          </div>
        </div>
      ),
      actionButton: {
        text: isRtl ? 'النسخ الاحتياطي في الإعدادات' : 'Open Backup in Settings',
        onClick: () => {
          handleComplete();
          if (onNavigateTab) onNavigateTab('settings');
        }
      }
    },

    // Slide 5: الأمان، البصمة، التذكيرات والإعدادات (Security, Biometrics & Smart Controls)
    {
      id: 'security_controls',
      stepNum: 5,
      icon: ShieldCheck,
      title: t.discoverSlide5Title || (isRtl ? 'الأمان، البصمة، التذكيرات والإعدادات 🛡️' : 'Security, Biometrics & Smart Controls 🛡️'),
      subtitle: t.discoverSlide5Subtitle || (isRtl ? 'قفل بيومتري، ويدجت شاشة القفل، وتنبيهات ذكية وتحكم كامل.' : 'Biometric lock, lockscreen shortcuts, smart reminders, and tailored settings.'),
      chips: [
        {
          icon: Fingerprint,
          label: t.discoverSlide5Chip1 || (isRtl ? 'قفل البصمة ورمز PIN' : 'PIN & Biometric Lock'),
          desc: t.discoverSlide5Chip1Desc || (isRtl ? 'حماية مطلقة بفتح فوري عبر مستشعر البصمة البيومترية' : 'Instant, impenetrable access via fingerprint and face sensor')
        },
        {
          icon: Lock,
          label: t.discoverSlide5Chip2 || (isRtl ? 'اختصارات شاشة القفل' : 'Lockscreen Quick Shortcuts'),
          desc: t.discoverSlide5Chip2Desc || (isRtl ? 'وصول فوري لأدوات التدوين والمزاج بنقرة واحدة' : 'Capture thoughts and track hydration without unlocking fully')
        },
        {
          icon: Bell,
          label: t.discoverSlide5Chip3 || (isRtl ? 'منبهات وتذكيرات ذكية' : 'Smart Habit Alarms'),
          desc: t.discoverSlide5Chip3Desc || (isRtl ? 'تنبيهات صحية لشرب الماء ومواعيد الأدوية وتمارين CBT' : 'Gentle reminders for hydration, scheduled meds, and reflections')
        }
      ],
      interactivePreview: (
        <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#0E2017]/70 border-emerald-500/20' : 'bg-[#EAF0EC] border-[#2D6A4F]/20'} space-y-2 text-center`}>
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-xs">
            <Fingerprint className="w-4.5 h-4.5 animate-pulse" />
            <span>{isRtl ? 'حماية بيومترية مشفرة محلياً 100%' : '100% Encrypted Biometric Protection'}</span>
          </div>
          <p className="text-[10px] opacity-80 leading-relaxed">
            {isRtl ? 'أنت المتحكم الكامل في لغة التطبيق، الخطوط، النطاق الزمني للمستشار، وسرية مذكراتك.' : 'Complete control over language, fonts, advisor scope, and private records.'}
          </p>
        </div>
      ),
      actionButton: {
        text: isRtl ? 'ابدأ استخدام بلوميو الآن' : 'Start Using Blomeo Now',
        onClick: handleComplete
      }
    }
  ];

  const currentSlide = slides[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === slides.length - 1;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn select-none touch-pan-y p-0 sm:p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discover-blomeo-title"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Centered Modal Container Styled Strictly with Blomeo Design Tokens */}
      <div
        className={`relative w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] max-w-lg mx-auto flex flex-col overflow-hidden shadow-2xl rounded-none sm:rounded-3xl border ${
          isDarkMode
            ? 'bg-[#0C1C14] text-[#ECF3EE] border-emerald-500/25'
            : 'bg-[#F3F7F4] text-[#113B2D] border-[#2D6A4F]/20'
        } transition-all duration-300`}
      >
        {/* Topographic Background Glow */}
        <div className="absolute inset-0 bg-radial from-emerald-800/15 via-transparent to-transparent pointer-events-none" />

        {/* Top Bar: Progress Badge + Skip ("تخطي") Button */}
        <div className="relative z-10 shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${
              isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100/80 text-emerald-900 border-emerald-300/60'
            }`}>
              {isRtl ? `الخطوة ${currentStep + 1} من 5` : `Step ${currentStep + 1} of 5`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className={`text-xs font-black px-3.5 py-1.5 rounded-full border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/15 text-white/90 border-white/15'
                : 'bg-white hover:bg-emerald-50 text-emerald-950 border-[#2D6A4F]/20 shadow-xs'
            }`}
          >
            <span>{isRtl ? 'تخطي' : 'Skip'}</span>
            {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Progress Bar Line */}
        <div className="relative z-10 shrink-0 px-5 pt-1 pb-2">
          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-emerald-950/10'}`}>
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${((currentStep + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Slide Content Area */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 py-2 flex flex-col space-y-3.5 scrollbar-thin">
          {/* Header Icon & Title */}
          <div className="flex items-start gap-3.5 pt-1">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
              isDarkMode
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-white border-emerald-300 text-emerald-800'
            }`}>
              <currentSlide.icon className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="discover-blomeo-title" className="text-base sm:text-lg font-black leading-snug tracking-tight">
                {currentSlide.title}
              </h2>
              <p className="text-xs opacity-80 font-medium leading-relaxed pt-0.5">
                {currentSlide.subtitle}
              </p>
            </div>
          </div>

          {/* 3 Key Feature Chips */}
          <div className="grid grid-cols-1 gap-2">
            {currentSlide.chips.map((chip, idx) => {
              const ChipIcon = chip.icon;
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
                    isDarkMode
                      ? 'bg-white/[0.04] border-white/10 text-white/90 hover:bg-white/[0.07]'
                      : 'bg-white/90 border-[#2D6A4F]/15 text-[#113B2D] shadow-xs hover:bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-900'}`}>
                    <ChipIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-black truncate">{chip.label}</span>
                    <span className="block text-[10px] opacity-75 leading-tight truncate">{chip.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Live Preview */}
          <div className="pt-0.5">
            {currentSlide.interactivePreview}
          </div>

          {/* Action Shortcut Button */}
          {currentSlide.actionButton && (
            <button
              type="button"
              onClick={currentSlide.actionButton.onClick}
              className={`w-full py-2.5 px-4 rounded-2xl border font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 ${
                isDarkMode
                  ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-200 border-emerald-500/30 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentSlide.actionButton.text}</span>
            </button>
          )}
        </div>

        {/* Bottom Controls Bar: Dots + Prev + Next */}
        <div className={`relative z-10 shrink-0 pt-3 pb-5 px-5 flex flex-col space-y-3 border-t ${
          isDarkMode ? 'border-white/10 bg-[#0A1610]' : 'border-[#2D6A4F]/10 bg-[#EDF3EE]'
        }`}>
          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5" aria-label="Slide Indicator">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-7 bg-emerald-500 shadow-xs'
                    : isDarkMode
                      ? 'w-2 bg-white/20 hover:bg-white/40'
                      : 'w-2 bg-emerald-950/20 hover:bg-emerald-950/40'
                }`}
              />
            ))}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handlePrev}
                className={`py-2.5 px-4 rounded-2xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                  isDarkMode
                    ? 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                    : 'bg-white hover:bg-emerald-50 text-emerald-950 border-emerald-200 shadow-xs'
                }`}
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{isRtl ? 'السابق' : 'Previous'}</span>
              </button>
            ) : (
              <div />
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={handleComplete}
                className="py-2.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>{isRtl ? 'ابدأ رحلتك مع بلوميو 🌿' : 'Start Exploring Blomeo 🌿'}</span>
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className={`py-2.5 px-5 rounded-2xl font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 ${
                  isDarkMode
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                <span>{isRtl ? 'التالي' : 'Next'}</span>
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
