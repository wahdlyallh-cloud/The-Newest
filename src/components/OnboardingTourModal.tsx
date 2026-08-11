import React, { useState } from 'react';
import { 
  BookOpen, 
  Brain, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Compass,
  Smile,
  Mic,
  Lock
} from 'lucide-react';
import { useLanguage, getLanguageInfo } from '../lib/languages';

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'diaries' | 'advisor' | 'analytics' | 'settings') => void;
  appLanguage?: string;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  appLanguage
}) => {
  const { t, currentLanguage } = useLanguage();
  const activeLang = appLanguage || currentLanguage;
  const langInfo = getLanguageInfo(activeLang);
  const isEn = activeLang === 'en';
  const isRtl = langInfo.dir === 'rtl';

  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'welcome',
      icon: Compass,
      color: 'from-amber-500 to-amber-700',
      bgColor: 'bg-amber-500/10 text-amber-600',
      tabTarget: 'dashboard',
      title: isEn ? 'Welcome to Hayat AI 👋' : 'مرحباً بك في حياة AI 👋',
      subtitle: isEn ? 'Your Smart Psychological Companion & Journal' : 'رفيقك النفسي الذكي ومساحتك الآمنة للتدوين',
      description: isEn 
        ? 'Discover how Hayat AI empowers your mental wellness, diary reflections, and habit tracking with privacy-first AI features.' 
        : 'اكتشف كيف يساعدك تطبيق حياة AI في تعزيز صحتك النفسية، وتدوين يومياتك، وتتبع عاداتك مع خصائص الذكاء الاصطناعي المشفرة.',
      highlights: [
        isEn ? '100% Private & Locally Encrypted' : 'خاص ومُشفر 100% على جهازك',
        isEn ? 'CBT-powered AI Psychological Advisor' : 'مستشار نفسي ذكي مدعوم بالعلاج المعرفي',
        isEn ? 'Voice Journaling & Mood Analytics' : 'تدوين صوتي وتحليل متقدم للمزاج'
      ]
    },
    {
      id: 'diaries',
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-700',
      bgColor: 'bg-emerald-500/10 text-emerald-600',
      tabTarget: 'diaries',
      title: t.onboardingStep1Title || (isEn ? 'Diaries & Reflections 📝' : 'قسم اليوميات والخواطر 📝'),
      subtitle: isEn ? 'Express your thoughts freely every day' : 'سجّل تفاصيل يومك ومواقفك بحرية تامة',
      description: t.onboardingStep1Desc || (isEn 
        ? 'Journal freely with real-time AI mood analysis, voice recordings, attachments, and passcode lock.' 
        : 'سجّل تفاصيل يومك ومواقفك بحرية تامة مع تحليل فوري للمزاج وإرفاق التسجيلات والصور والتشفير.'),
      demoWidget: (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2 text-start">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
            <span className="flex items-center gap-1.5"><Smile className="w-4 h-4 text-emerald-600" /> {isEn ? 'Happy & Rested' : 'مرتاح وسعيد'}</span>
            <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">{isEn ? 'AI Mood Analysis' : 'تحليل المزاج الذكي'}</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {isEn ? '"Today I completed my goals and enjoyed a peaceful walk."' : '"اليوم أنجزت مهامي وشعرت بطمأنينة عالية أثناء المشي المسائي..."'}
          </p>
        </div>
      )
    },
    {
      id: 'advisor',
      icon: Brain,
      color: 'from-purple-600 to-indigo-800',
      bgColor: 'bg-purple-500/10 text-purple-600',
      tabTarget: 'advisor',
      title: t.onboardingStep2Title || (isEn ? 'Smart AI Advisor 🧠' : 'المستشار النفسي الذكي 🧠'),
      subtitle: isEn ? 'Instant CBT Guidance & Emotional Support' : 'دعم نفسي وإرشاد معارفي سلوكي على مدار الساعة',
      description: t.onboardingStep2Desc || (isEn 
        ? 'Chat with your AI psychological advisor based on CBT principles for personalized support and clarity.' 
        : 'تحدث مع المستشار الذكي الداعم القائم على العلاج المعرفي السلوكي (CBT) للحصول على نصائح وتفريغ نفسي.'),
      demoWidget: (
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-2 text-start">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>{isEn ? 'Hayat AI Advisor:' : 'المستشار الذكي (حياة AI):'}</span>
          </div>
          <p className="text-xs text-purple-900/90 leading-relaxed">
            {isEn ? '"Let us reframe this anxious thought together using CBT grounding exercises."' : '"دعنا نفكك هذا الشعور بالقلق معاً باستخدام تمرين التفكيك المعرفي والاطمئنان..."'}
          </p>
        </div>
      )
    },
    {
      id: 'analytics',
      icon: TrendingUp,
      color: 'from-blue-600 to-cyan-700',
      bgColor: 'bg-blue-500/10 text-blue-600',
      tabTarget: 'analytics',
      title: t.onboardingStep3Title || (isEn ? 'Habit & Growth Tracking 📊' : 'تتبع العادات وشجرة النمو 📊'),
      subtitle: isEn ? 'Visualize your mental progress' : 'شاهد تطورك النفسي ونمو شجرتك الذهنية',
      description: t.onboardingStep3Desc || (isEn 
        ? 'Track daily habits, sleep, and sports while watching your mental growth tree flourish as you journal.' 
        : 'تابع عاداتك اليومية وجودة نومك ورياضتك، واشهد نمو شجرتك النفسية كلما واظبت على التدوين.'),
      demoWidget: (
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-blue-900">
            <span>{isEn ? 'Mental Growth Tree 🌳' : 'شجرة النمو النفسي 🌳'}</span>
            <span className="text-blue-600">Level 4</span>
          </div>
          <div className="w-full bg-blue-200/50 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full w-[78%]"></div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      icon: ShieldCheck,
      color: 'from-slate-700 to-gray-900',
      bgColor: 'bg-slate-500/10 text-slate-700',
      tabTarget: 'settings',
      title: t.onboardingStep4Title || (isEn ? 'Privacy & Security 🔒' : 'الخصوصية والأمان التام 🔒'),
      subtitle: isEn ? 'Your data stays on your device' : 'بياناتك ملكك وحده وتظل مشفرة على جهازك',
      description: t.onboardingStep4Desc || (isEn 
        ? 'Your entries are encrypted and stored safely on your device with biometric lock and cloud backup options.' 
        : 'بياناتك مشفرة ومحفوظة على جهازك بأمان مع دعم القفل بالبصمة والنسخ الاحتياطي.'),
      demoWidget: (
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 text-slate-800">
          <Lock className="w-5 h-5 text-slate-700 shrink-0" />
          <p className="text-xs leading-relaxed">
            {isEn ? 'AES-256 Bit Encryption + PIN & Biometrics Protection' : 'تشفير AES-256 مع حماية البصمة ورمز PIN الشخصي'}
          </p>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      if (onNavigateTab && steps[nextIdx].tabTarget) {
        onNavigateTab(steps[nextIdx].tabTarget as any);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      if (onNavigateTab && steps[prevIdx].tabTarget) {
        onNavigateTab(steps[prevIdx].tabTarget as any);
      }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              {t.onboardingStepIndicator
                ? t.onboardingStepIndicator.replace('{step}', String(currentStep + 1)).replace('{total}', String(steps.length))
                : (isEn ? `Step ${currentStep + 1} of ${steps.length}` : `الخطوة ${currentStep + 1} من ${steps.length}`)}
            </span>
          </div>

          <button
            onClick={handleComplete}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
          >
            <span>{t.onboardingSkip || (isEn ? 'Skip' : 'تخطي')}</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1">
          <div 
            className="bg-gradient-to-r from-[#2B3E50] to-[#6D5D6E] h-1 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Main Content Body */}
        <div className="p-6 space-y-5 text-start flex-1">
          {/* Step Icon Badge */}
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${currentStepData.bgColor}`}>
              <currentStepData.icon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">{currentStepData.title}</h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{currentStepData.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 leading-relaxed font-normal">
            {currentStepData.description}
          </p>

          {/* Highlights or Interactive Demo Widget */}
          {currentStepData.highlights && (
            <div className="space-y-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              {currentStepData.highlights.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}

          {currentStepData.demoWidget && currentStepData.demoWidget}

          {/* Quick Navigation Action Button to test live tab switch */}
          {currentStepData.tabTarget && currentStep > 0 && (
            <button
              type="button"
              onClick={() => {
                if (onNavigateTab) onNavigateTab(currentStepData.tabTarget as any);
              }}
              className="text-xs font-bold text-[#2B3E50] hover:text-[#1E2D3B] underline flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{isEn ? `Try exploring ${currentStepData.tabTarget} section now` : `تجربة الانتقال إلى قسم ${currentStepData.title.split(' ')[0]} الآن`}</span>
            </button>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentStep === 0
                ? 'opacity-0 pointer-events-none'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer'
            }`}
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span>{t.onboardingPrev || (isEn ? 'Previous' : 'السابق')}</span>
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStep(idx);
                  if (onNavigateTab && steps[idx].tabTarget) {
                    onNavigateTab(steps[idx].tabTarget as any);
                  }
                }}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx 
                    ? 'w-6 bg-[#2B3E50]' 
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#2B3E50] hover:bg-[#1E2D3B] shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
          >
            <span>
              {currentStep === steps.length - 1 
                ? (t.onboardingFinish || (isEn ? 'Start Journey 🚀' : 'ابدأ رحلتك الآن 🚀'))
                : (t.onboardingNext || (isEn ? 'Next ➔' : 'التالي ➔'))}
            </span>
            {currentStep < steps.length - 1 && (
              isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingTourModal;
