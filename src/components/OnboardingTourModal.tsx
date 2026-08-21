import React, { useState, useEffect } from 'react';
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
  Lock,
  FileText,
  Image,
  TreePine,
  Play
} from 'lucide-react';

import { getLanguageInfo, getTranslation, isRtlLanguage, AppLanguage } from '../lib/languages';

export interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'diaries' | 'advisor' | 'analytics' | 'settings') => void;
  onOpenVoiceJournal?: () => void;
  appLanguage?: AppLanguage;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenVoiceJournal,
  appLanguage = 'ar'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isRtl = isRtlLanguage(appLanguage);
  const isEn = appLanguage === 'en';


  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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

  const steps = [
    // 1. مرحباً بك في حياة AI
    {
      id: 'welcome',
      icon: Compass,
      badge: (t.onboardingStepOf || 'Step {step} of {total}').replace('{step}', '1').replace('{total}', '7'),
      accentColor: 'from-[#2B3E50] to-[#3A506B]',
      iconBg: 'bg-[#2B3E50]/10 text-[#2B3E50]',
      title: t.onboardingWelcomeTitle || '🌿 Welcome to Hayat AI',
      subtitle: t.onboardingWelcomeSubtitle || 'Your safe psychological space to write, express, and grow with smart AI guidance.',
      description: t.onboardingWelcomeDesc || 'You do not need to learn everything at once. We will accompany you step-by-step to discover what you can do.',
      interactiveWidget: (
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 py-1">
          <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center space-y-1">
            <span className="text-lg sm:text-xl">✍️</span>
            <span className="text-xs font-black text-[#2B3E50]">{t.onboardingExpressLabel || 'Express'}</span>
            <span className="text-[10px] text-gray-500 leading-tight">{t.onboardingExpressSub || 'Write freely'}</span>
          </div>
          <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center space-y-1">
            <span className="text-lg sm:text-xl">🧠</span>
            <span className="text-xs font-black text-[#2B3E50]">{t.onboardingUnderstandLabel || 'Understand'}</span>
            <span className="text-[10px] text-gray-500 leading-tight">{t.onboardingUnderstandSub || 'Explore feelings'}</span>
          </div>
          <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center space-y-1">
            <span className="text-lg sm:text-xl">🌱</span>
            <span className="text-xs font-black text-[#2B3E50]">{t.onboardingGrowLabel || 'Grow'}</span>
            <span className="text-[10px] text-gray-500 leading-tight">{t.onboardingGrowSub || 'Track progress'}</span>
          </div>
        </div>
      ),
      actionButton: null
    },

    // 2. اليوميات والخواطر
    {
      id: 'diaries',
      icon: BookOpen,
      badge: (t.onboardingStepOf || 'Step {step} of {total}').replace('{step}', '2').replace('{total}', '7'),
      accentColor: 'from-[#4F772D] to-[#31572E]',
      iconBg: 'bg-[#4F772D]/10 text-[#4F772D]',
      title: t.onboardingDiariesTitle || '✍️ Express What Lies Within',
      subtitle: t.onboardingDiariesSubtitle || 'Write your reflections freely, record daily moments, and keep life memories in one safe spot.',
      description: t.onboardingDiariesDesc || 'You can easily attach photos and audio recordings to keep all your experiences together.',
      interactiveWidget: (
        <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-3 sm:p-3.5 space-y-2 text-start">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B3E50]">
              <Smile className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t.calmAndGrateful || 'Calm & Grateful'}</span>
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              {t.moodAnalysis || 'Mood Analysis'}
            </span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-medium bg-white/80 p-2.5 rounded-xl border border-gray-100">
            {t.onboardingDiariesSample || '"Today I took time to breathe and reflect on my day calmly..."'}
          </p>
          <div className="flex items-center gap-3 pt-0.5 text-[11px] text-gray-500 font-semibold">
            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-amber-600" /> {t.richText || 'Rich Text'}</span>
            <span className="flex items-center gap-1"><Image className="w-3.5 h-3.5 text-blue-600" /> {t.photo || 'Photo'}</span>
            <span className="flex items-center gap-1"><Mic className="w-3.5 h-3.5 text-purple-600" /> {t.audio || 'Audio'}</span>
          </div>
        </div>
      ),
      actionButton: {
        text: t.onboardingTryDiariesBtn || 'Try Diaries',
        onClick: () => {
          onClose();
          if (onNavigateTab) onNavigateTab('diaries');
        }
      }
    },

    // 3. التسجيل الصوتي
    {
      id: 'voice',
      icon: Mic,
      badge: 'Step 3 of 7',
      accentColor: 'from-[#6B4E71] to-[#3B1F47]',
      iconBg: 'bg-[#6B4E71]/10 text-[#6B4E71]',
      title: '🎙️ Prefer Speaking? Just Talk',
      subtitle: isEn
        ? 'Speak naturally, pause whenever you wish to think, and continue talking comfortably.'
        : 'تحدّث بطبيعتك، وخذ وقتك في التفكير أو التوقف، ثم واصل حديثك متى شئت.',
      description: isEn
        ? 'Voice journaling allows you to express your thoughts and feelings without typing a single word.'
        : 'يساعدك التسجيل الصوتي على التعبير عن أفكارك ومشاعرك دون الحاجة إلى الكتابة، مع تفريغ فوري دقيق.',
      interactiveWidget: (
        <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-3 sm:p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B4E71]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{t.liveVoiceJournaling || "يوميات صوتية مباشرة"}</span>
            </span>
            <span className="text-[10px] font-extrabold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full">
              {t.continuousRecording || "تسجيل مستمر"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-extrabold text-[#2B3E50]">
            <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100">1. {t.speakAction || "تحدث"}</div>
            <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100">2. {t.pauseAction || "إيقاف مؤقت"}</div>
            <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100">3. {t.continueAction || "متابعة"}</div>
            <div className="bg-white/90 p-1.5 rounded-xl border border-purple-100">4. {t.saveAction || "حفظ"}</div>
          </div>
        </div>
      ),
      actionButton: {
        text: 'Try Voice Journal',
        onClick: () => {
          onClose();
          if (onOpenVoiceJournal) {
            onOpenVoiceJournal();
          } else if (onNavigateTab) {
            onNavigateTab('diaries');
          }
        }
      }
    },

    // 4. المستشار الذكي
    {
      id: 'advisor',
      icon: Brain,
      badge: 'Step 4 of 7',
      accentColor: 'from-[#5C4D7D] to-[#3B2C5C]',
      iconBg: 'bg-[#5C4D7D]/10 text-[#5C4D7D]',
      title: '🧠 Your Smart Companion',
      subtitle: isEn
        ? 'When you need to organize your thoughts or understand your emotions, talk with the AI advisor.'
        : 'عندما تحتاج إلى ترتيب أفكارك أو فهم مشاعرك، يمكنك التحدث مع المستشار الذكي ومناقشة ما يشغلك بطريقة هادئة ومنظمة.',
      description: isEn
        ? 'A supportive space based on cognitive guidance to offer clarity and practical emotional support.'
        : 'مساحة داعمة مستندة إلى مبادئ الإرشاد المعرفي لمساعدتك على رؤية الأمور بوضوح واستعادة هدوئك.',
      interactiveWidget: (
        <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-3 sm:p-3.5 space-y-2 text-start">
          <div className="bg-white/90 p-2 rounded-xl border border-gray-100 text-xs text-gray-800">
            <span className="font-black text-[#2B3E50] block text-[10px] mb-0.5">{'You:'}</span>
            <span className="leading-snug">{'"I feel a bit anxious and do not know why."'}</span>
          </div>
          <div className="bg-purple-50/90 p-2 rounded-xl border border-purple-100 text-xs text-purple-950">
            <span className="font-black text-purple-900 flex items-center gap-1 text-[10px] mb-0.5">
              <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
              <span>{'Hayat AI Advisor:'}</span>
            </span>
            <span className="leading-snug">
              {isEn
                ? '"Let us explore what you feel step by step. What occupies your mind most right now?"'
                : '«لنحاول فهم ما تشعر به خطوة بخطوة. ما أكثر شيء يشغل ذهنك في هذه اللحظة؟»'}
            </span>
          </div>
        </div>
      ),
      actionButton: {
        text: 'Start a Conversation',
        onClick: () => {
          onClose();
          if (onNavigateTab) onNavigateTab('advisor');
        }
      }
    },

    // 5. العادات والمزاج وشجرة النمو
    {
      id: 'analytics',
      icon: TrendingUp,
      badge: (t.onboardingStepOf || 'Step {step} of {total}').replace('{step}', '5').replace('{total}', '7'),
      accentColor: 'from-[#197278] to-[#124E52]',
      iconBg: 'bg-[#197278]/10 text-[#197278]',
      title: t.onboardingGrowthTitle || '🌱 Track Your Growth',
      subtitle: t.onboardingGrowthSubtitle || 'Monitor your daily habits, mood, and progress to discover how your journey evolves over time.',
      description: t.onboardingGrowthDesc || 'Every small step you achieve today can be the beginning of a greater positive change tomorrow.',
      interactiveWidget: (
        <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-3 sm:p-3.5 space-y-2">
          <div className="flex justify-between items-center text-xs font-extrabold text-[#2B3E50]">
            <span className="flex items-center gap-1.5"><TreePine className="w-4 h-4 text-emerald-600" /> {t.psychologicalGrowthTree || 'Psychological Growth Tree'}</span>
            <span className="text-emerald-700 bg-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-black">{t.onboardingFlourishingBadge || 'Flourishing'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full w-[85%] transition-all"></div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 pt-0.5">
            <span>✅ {t.dailyHabits || 'Daily Habits'}</span>
            <span>📊 {t.moodTrends || 'Mood Trends'}</span>
            <span>🎯 {t.achievements || 'Achievements'}</span>
          </div>
        </div>
      ),
      actionButton: {
        text: t.onboardingDiscoverProgressBtn || 'Discover Your Progress',
        onClick: () => {
          onClose();
          if (onNavigateTab) onNavigateTab('analytics');
        }
      }
    },

    // 6. الخصوصية والأمان
    {
      id: 'privacy',
      icon: ShieldCheck,
      badge: (t.onboardingStepOf || 'Step {step} of {total}').replace('{step}', '6').replace('{total}', '7'),
      accentColor: 'from-[#3A506B] to-[#1C2541]',
      iconBg: 'bg-[#3A506B]/10 text-[#3A506B]',
      title: t.onboardingPrivacyTitle || '🔒 Your Privacy First',
      subtitle: t.onboardingPrivacySubtitle || 'This is your private sanctuary. Protection tools are crafted to keep you in total control of your data.',
      description: t.onboardingPrivacyDesc || 'Your entries are saved locally on your device with PIN passcode protection, biometric lock, and private cloud backup.',
      interactiveWidget: (
        <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-3 sm:p-3.5 space-y-2 text-start">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2B3E50]">
            <Lock className="w-4 h-4 text-[#3A506B] shrink-0" />
            <span>{t.localStorageSecurity || 'Local Device Storage & Security'}</span>
          </div>
          <ul className="text-[11px] text-gray-700 space-y-1 font-medium">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> {t.onboardingPrivacyFeature1 || 'Passcode & Biometrics App Lock'}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> {t.onboardingPrivacyFeature2 || 'Offline-first Local Database'}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span> {t.onboardingPrivacyFeature3 || 'Encrypted Cloud Backup options'}
            </li>
          </ul>
        </div>
      ),
      actionButton: {
        text: t.onboardingPrivacySettingsBtn || 'Privacy Settings',
        onClick: () => {
          onClose();
          if (onNavigateTab) onNavigateTab('settings');
        }
      }
    },

    // 7. شاشة النهاية والانطلاق
    {
      id: 'ready',
      icon: Sparkles,
      badge: (t.onboardingStepOf || 'Step {step} of {total}').replace('{step}', '7').replace('{total}', '7'),
      accentColor: 'from-[#4F772D] to-[#1B4332]',
      iconBg: 'bg-[#4F772D]/10 text-[#4F772D]',
      title: t.onboardingReadyTitle || '🚀 You Are All Set',
      subtitle: t.onboardingReadySubtitle || 'You have now discovered the core essence of Hayat AI.',
      description: t.onboardingReadyDesc || 'Write what you feel, speak about what is on your mind, follow your habits, and enjoy your journey step by step.',
      interactiveWidget: (
        <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-4 text-center space-y-2">
          <span className="text-3xl animate-bounce inline-block">✨</span>
          <p className="text-xs font-black text-[#2B3E50] leading-relaxed">
            {t.onboardingReadyQuote || '«There is no single correct way to use Hayat AI. Start in whatever way suits you best.»'}
          </p>
        </div>
      ),
      actionButton: null
    }
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E2DCC8] max-w-md w-full overflow-hidden flex flex-col transition-all duration-300 max-h-[92vh]">

        {/* Top Navigation & Status Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 border-b border-gray-100 bg-[#FAF8F5]/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-full bg-white text-[#2B3E50] border border-[#E2DCC8] shadow-2xs">
              {currentStepData.badge}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isLastStep && (
              <button
                type="button"
                onClick={handleComplete}
                className="text-[11px] sm:text-xs font-bold text-gray-500 hover:text-[#2B3E50] transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                {t.skipBtn || 'Skip'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              aria-label={t.closeGuideAction || "إغلاق الدليل"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4">

          {/* Header Icon and Title */}
          <div className="space-y-1.5 text-start">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 ${currentStepData.iconBg}`}>
                <currentStepData.icon className="w-5 h-5" />
              </div>
              <h2 id="onboarding-modal-title" className="text-base sm:text-lg font-black text-[#2B3E50] leading-snug">
                {currentStepData.title}
              </h2>
            </div>

            <p className="text-xs sm:text-sm font-bold text-gray-800 leading-relaxed pt-1">
              {currentStepData.subtitle}
            </p>
            <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Interactive Step Widget */}
          <div className="pt-1">
            {currentStepData.interactiveWidget}
          </div>

          {/* Action Button to try the actual live feature */}
          {currentStepData.actionButton && (
            <div className="pt-1">
              <button
                type="button"
                onClick={currentStepData.actionButton.onClick}
                className="w-full py-2.5 px-4 rounded-2xl bg-white border-2 border-dashed border-[#2B3E50]/30 hover:border-[#2B3E50] text-[#2B3E50] font-black text-xs flex items-center justify-center gap-2 transition-all hover:bg-[#FAF8F5] cursor-pointer shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 text-[#2B3E50] fill-[#2B3E50]" />
                <span>{currentStepData.actionButton.text}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls & Progress Bar */}
        <div className="p-4 sm:px-6 sm:py-4 border-t border-gray-100 bg-[#FAF8F5]/90 space-y-3">

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5" aria-label={t.tourProgress || 'Tour progress'}>
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`${t.goToSection || 'Go to'} ${s.title}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-[#2B3E50]'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5">
            {!isFirstStep ? (
              <button
                type="button"
                onClick={handlePrev}
                className="py-2.5 px-4 rounded-2xl border border-[#E2DCC8] bg-white text-[#2B3E50] font-bold text-xs hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span>{t.previousBtn}</span>
              </button>
            ) : (
              <div />
            )}

            {isLastStep ? (
              <button
                type="button"
                onClick={handleComplete}
                className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-[#4F772D] to-[#31572E] text-white font-black text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <span>{t.onboardingStartJourneyBtn || 'Start My Journey Now'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="py-2.5 px-5 rounded-2xl bg-[#2B3E50] text-white font-bold text-xs hover:bg-[#1C2541] transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <span>{isFirstStep ? (t.onboardingStartTourBtn || 'Start Tour') : (t.nextBtn)}</span>
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
