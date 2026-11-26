import React, { useState } from 'react';
import { X, Brain, Sparkles, AlertTriangle, ShieldCheck, Moon, Activity, RefreshCw, CheckCircle, ArrowRight, Zap, TrendingUp, Calendar } from 'lucide-react';
import { DiaryEntry } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';

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

  useRegisterBackStep('modal_predictive_health', 'modal', isOpen, onClose, t.predictiveTitle);

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
      const summaryTitle = t.predictiveSummaryTitle;
      const anxietyLabel = t.predictiveAnxietyLabel;
      const sleepForecastLabel = t.predictiveSleepLabel;
      const preventiveLabel = t.predictivePreventiveLabel;
      const anxietyDetail = t.predictiveAnxietyDetail
        ? t.predictiveAnxietyDetail.replace('{percent}', String(anxietyRiskPercent))
        : `Low-to-Moderate (${anxietyRiskPercent}%). Stress triggers identified.`;
      const sleepDetail = t.predictiveSleepDetail
        ? t.predictiveSleepDetail.replace('{hours}', String(avgSleep))
        : `Average sleep: ${avgSleep} hrs/night. Recommended cutoff at 4 PM.`;
      const preventiveDetail = t.predictivePreventiveDetail
        ? t.predictivePreventiveDetail.replace('{mins}', String(avgSports))
        : `Continue exercise (${avgSports} mins/day) and gratitude sessions.`;

      setCustomAnalysis(
        `${summaryTitle}\n\n${anxietyLabel} ${anxietyDetail}\n${sleepForecastLabel} ${sleepDetail}\n${preventiveLabel} ${preventiveDetail}`
      );
    } catch {
      // Fallback
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-[65] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border-0 sm:border sm:border-[#E2DCC8] rounded-none sm:rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl transition-all duration-300 h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.predictiveTitle}
          subtitle={t.predictiveSub}
          icon={
            <div className="p-1.5 bg-white/10 rounded-xl">
              <Brain className="w-4 h-4 text-amber-300" />
            </div>
          }
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="slate"
        />

        {/* Modal Content Scroll Area */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1">
          
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
                    ? (t.predictiveStatusWarning)
                    : (t.predictiveStatusGood)}
                </h4>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {t.predictiveBasedOn} ({recentEntries.length})
                </p>
              </div>
            </div>
            <span className="text-xs font-black bg-white/80 px-3 py-1 rounded-full border border-current">
              {anxietyRiskPercent}% {t.riskLabel}
            </span>
          </div>

          {/* Predictive Indicators Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Anxiety Risk Gauge */}
            <div className="bg-white border border-[#E2DCC8] p-4 rounded-2xl space-y-2 shadow-3xs">
              <div className="flex justify-between items-center text-xs font-extrabold text-[#5A5A40]">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>{t.predictiveAnxietyRisk}</span>
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
                  ? (t.elevatedAnxietyDesc)
                  : (t.lowAnxietyDesc)}
              </p>
            </div>

            {/* Sleep Disturbance Gauge */}
            <div className="bg-white border border-[#E2DCC8] p-4 rounded-2xl space-y-2 shadow-3xs">
              <div className="flex justify-between items-center text-xs font-extrabold text-[#5A5A40]">
                <span className="flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>{t.predictiveSleepRisk}</span>
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
                {t.avgSleepLabel} {avgSleep} {t.hoursUnit}
              </p>
            </div>

          </div>

          {/* Early Preventive Guidance Section */}
          <div className="bg-[#FAF8F5] border border-[#E2DCC8] p-4.5 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs sm:text-sm text-[#5A5A40] flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t.predictiveGuidance}</span>
            </h4>
            
            <div className="space-y-2 text-xs text-gray-700 font-medium">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2DCC8]/60">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.predictiveTipExercise}</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-[#E2DCC8]/60">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{t.predictiveTipBreathing}</span>
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
            <span>{isAnalyzing ? (t.analyzingPrompt) : (t.predictiveAnalyzeBtn)}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
}
