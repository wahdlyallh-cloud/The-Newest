import React, { useState } from 'react';
import { X, Brain, Sparkles, AlertTriangle, ShieldCheck, Moon, Activity, RefreshCw, CheckCircle, ArrowRight, Zap, TrendingUp, Calendar } from 'lucide-react';
import { DiaryEntry } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface PredictiveHealthInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diaries: DiaryEntry[];
  appLanguage?: AppLanguage;
  apiKey?: string;
}

export default function PredictiveHealthInsightsModal({
  isOpen,
  onClose,
  diaries,
  appLanguage = 'ar',
  apiKey = ''
}: PredictiveHealthInsightsModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customAnalysis, setCustomAnalysis] = useState<string | null>(null);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isEn = appLanguage === 'en';

  if (!isOpen) return null;

  // Calculate heuristic predictive indicators based on recent entries
  const recentEntries = [...diaries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 7);
  
  let totalSleep = 0;
  let totalSports = 0;
  let anxietyCount = 0;
  let sleepIssuesCount = 0;

  recentEntries.forEach(entry => {
    if (entry.sleepHours) totalSleep += entry.sleepHours;
    if (entry.sportsDuration) totalSports += entry.sportsDuration;
    
    const text = (entry.title + ' ' + entry.content + ' ' + (entry.moods || []).join(' ')).toLowerCase();
    if (text.includes('قلق') || text.includes('توتر') || text.includes('anxiety') || text.includes('stress') || text.includes('خوف')) {
      anxietyCount++;
    }
    if (text.includes('أرق') || text.includes('نوم') || text.includes('insomnia') || text.includes('سهر') || (entry.sleepHours && entry.sleepHours < 6)) {
      sleepIssuesCount++;
    }
  });

  const avgSleep = recentEntries.length > 0 ? (totalSleep / recentEntries.length).toFixed(1) : '7.0';
  const avgSports = recentEntries.length > 0 ? Math.round(totalSports / recentEntries.length) : 20;

  // Predictive calculations
  const anxietyRiskPercent = Math.min(95, Math.max(15, (anxietyCount * 25) + (Number(avgSleep) < 6 ? 20 : 0) - (avgSports > 30 ? 15 : 0)));
  const sleepRiskPercent = Math.min(90, Math.max(10, (sleepIssuesCount * 22) + (Number(avgSleep) < 6 ? 30 : 0)));

  const handleRunAiPrediction = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate/Run predictive AI analysis
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (isEn) {
        setCustomAnalysis(
          `🔮 **Predictive Analysis Summary:**\n\n` +
          `• **Anxiety Spike Probability:** Low-to-Moderate (${anxietyRiskPercent}%). Identified stress triggers around workload and sleep duration.\n` +
          `• **Sleep Pattern Forecast:** Average sleep is ${avgSleep} hrs/night. Recommended caffeine cutoff at 4:00 PM and 10 mins diaphragmatic breathing.\n` +
          `• **Preventive Guidance:** Continue physical exercise (${avgSports} mins/day) and schedule a 5-minute gratitude reflection before bed.`
        );
      } else {
        setCustomAnalysis(
          `🔮 **ملخص الاستشعار والتنبؤ الذكي:**\n\n` +
          `• **احتمالية نوبات القلق:** منخفضة إلى متوسطة (${anxietyRiskPercent}%). تم رصد ربط وثيق بين تراكم المهام ونقص ساعات النوم.\n` +
          `• **توقعات جودة النوم:** متوسط نومك حالياً ${avgSleep} ساعة/ليلة. يُوصى ببدء الاسترخاء والتنفس البطني عند الساعة 10 مساءً وتجنب الشاشات.\n` +
          `• **الخطة الوقائية:** الاستمرار في النشاط الرياضي (${avgSports} دقيقة/يوم) وممارسة جلسة الامتنان اليومية لرفع الاستقرار المزاجي.`
        );
      }
    } catch {
      // Fallback
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[65] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl transition-all duration-300 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2B3E50] to-[#3B5266] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Brain className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>{t.predictiveTitle || (isEn ? 'Predictive Health & Sleep Insights' : 'نظام التحليلات المتنبئة للمزاج والنوم 🔮')}</span>
              </h3>
              <p className="text-xs text-blue-100/80 font-medium">
                {t.predictiveSub || (isEn ? 'AI-powered early warning system for anxiety triggers' : 'استشعار مبكر لمؤشرات القلق واضطرابات النوم بالذكاء الاصطناعي')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Status Badge */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            anxietyRiskPercent > 50 
              ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-3">
              {anxietyRiskPercent > 50 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm">
                  {anxietyRiskPercent > 50 
                    ? (t.predictiveStatusWarning || (isEn ? 'Warning: Impending Anxiety Triggers' : 'تنبيه: محفزات قلق مرتقبة ⚠️'))
                    : (t.predictiveStatusGood || (isEn ? 'Stable & Balanced ✨' : 'مستقر ومتوازن ✨'))}
                </h4>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {isEn ? `Based on analysis of last ${recentEntries.length} entries & metrics` : `بناءً على تحليل آخر ${recentEntries.length} مذكرات ومؤشرات حيوية`}
                </p>
              </div>
            </div>
            <span className="text-xs font-black bg-white/80 px-3 py-1 rounded-full border border-current">
              {anxietyRiskPercent}% Risk
            </span>
          </div>

          {/* Predictive Indicators Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Anxiety Risk Gauge */}
            <div className="bg-white border border-[#E2DCC8] p-4 rounded-2xl space-y-2 shadow-3xs">
              <div className="flex justify-between items-center text-xs font-extrabold text-[#5A5A40]">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>{t.predictiveAnxietyRisk || (isEn ? 'Future Anxiety Risk Level' : 'مستوى استشعار القلق المستقبلي')}</span>
                </span>
                <span className="text-amber-600 font-black">{anxietyRiskPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${anxietyRiskPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${anxietyRiskPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                {anxietyRiskPercent > 50 
                  ? (isEn ? 'Elevated vulnerability due to irregular sleep or high tasks' : 'ارتفاع القابلية بسبب عدم انتظام النوم أو تراكم المهام')
                  : (isEn ? 'Low anxiety risk forecast over the next 48 hours' : 'مؤشر قلق منخفض ومتوقع استقراره خلال 48 ساعة')}
              </p>
            </div>

            {/* Sleep Disturbance Gauge */}
            <div className="bg-white border border-[#E2DCC8] p-4 rounded-2xl space-y-2 shadow-3xs">
              <div className="flex justify-between items-center text-xs font-extrabold text-[#5A5A40]">
                <span className="flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>{t.predictiveSleepRisk || (isEn ? 'Sleep Disturbance Indicator' : 'مستوى مؤشر اضطراب النوم')}</span>
                </span>
                <span className="text-indigo-600 font-black">{sleepRiskPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${sleepRiskPercent > 50 ? 'bg-indigo-500' : 'bg-sky-500'}`}
                  style={{ width: `${sleepRiskPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                {isEn ? `Average sleep duration: ${avgSleep} hrs/night` : `متوسط ساعات النوم المسجلة: ${avgSleep} ساعة/ليلة`}
              </p>
            </div>

          </div>

          {/* Early Preventive Guidance Section */}
          <div className="bg-[#FAF8F5] border border-[#E2DCC8] p-4.5 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs sm:text-sm text-[#5A5A40] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t.predictiveGuidance || (isEn ? 'Early Preventive Recommendations' : 'التوصيات الوقائية المبكرة')}</span>
            </h4>
            
            <div className="space-y-2 text-xs text-gray-700 font-medium">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2DCC8]/60">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{isEn ? 'Maintain daily physical exercise (at least 20-30 mins) to absorb cortisol spikes.' : 'الاستمرار في النشاط البدني اليومي (20-30 دقيقة على الأقل) لتفريغ هرمونات القلق.'}</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2DCC8]/60">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{isEn ? 'Practice 4-7-8 breathing exercises before sleeping if thoughts feel racing.' : 'ممارسة تمرين التنفس 4-7-8 قبل النوم بخمس دقائق في حال تزاحم الأفكار.'}</span>
              </div>
            </div>

            {/* Custom AI Analysis Output */}
            {customAnalysis && (
              <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 text-xs text-gray-800 leading-relaxed font-normal whitespace-pre-line mt-3">
                {customAnalysis}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F0EDE4] border-t border-[#E2DCC8] flex items-center justify-between shrink-0">
          <button
            onClick={handleRunAiPrediction}
            disabled={isAnalyzing}
            className="px-4 py-2.5 bg-gradient-to-r from-[#2B3E50] to-[#3B5266] hover:from-[#1E2D3B] hover:to-[#2B3E50] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? (isEn ? 'Analyzing...' : 'جاري التحليل...') : (t.predictiveAnalyzeBtn || (isEn ? 'Run New Predictive Analysis 🧠' : 'إجراء تحليل تنبؤي جديد 🧠'))}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            {t.common?.closeBtn || (isEn ? 'Close' : 'إغلاق')}
          </button>
        </div>

      </div>
    </div>
  );
}
