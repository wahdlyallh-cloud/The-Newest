import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Droplets, Moon, Activity, Brain, TrendingUp, Info, ChevronDown, CheckCircle2 } from 'lucide-react';
import { DiaryEntry } from '../types';
import { AppLanguage, getTranslation } from '../lib/languages';
import { computeBehavioralCorrelations, CorrelationInsight } from '../lib/behavioralCorrelation';

interface BehavioralCorrelationCardProps {
  entries: DiaryEntry[];
  appLanguage: AppLanguage;
  className?: string;
}

export default function BehavioralCorrelationCard({
  entries,
  appLanguage = 'ar',
  className = '',
}: BehavioralCorrelationCardProps) {
  const t = getTranslation(appLanguage);
  const isRtl = appLanguage === 'ar';

  const [expandedId, setExpandedId] = useState<string | null>('sleep_water_anxiety');

  const { insights, stats } = computeBehavioralCorrelations(entries, appLanguage);

  const getIcon = (iconName: CorrelationInsight['iconName']) => {
    switch (iconName) {
      case 'droplets':
        return <Droplets className="w-5 h-5 text-sky-400" />;
      case 'moon':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'activity':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'brain':
        return <Brain className="w-5 h-5 text-purple-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className={`bg-gradient-to-br from-[#1E271D] via-[#283527] to-[#1C241B] text-white rounded-[28px] p-5 sm:p-6 border border-[#435742]/60 shadow-xl space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300 shadow-inner">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                {t.behavioralCorrelationsTitle || 'Smart Analytics'}
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-extrabold rounded-full">
                AI Matrix
              </span>
            </div>
            <h3 className="text-base font-extrabold text-white mt-0.5">
              {t.habitsAnxietyCorrelationTitle || 'Health Habits & Anxiety Correlations'}
            </h3>
          </div>
        </div>

        {/* Total Days Analyzed Badge */}
        <div className="text-right">
          <span className="text-xs font-black text-emerald-300 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full inline-block">
            <span>{stats.totalAnalyzedDays} {t.daysAnalyzedLabel || 'Days Analyzed'}</span>
          </span>
        </div>
      </div>

      {/* Snapshot Habit Metrics Grid */}
      <div className="grid grid-cols-4 gap-2 text-center bg-black/20 rounded-2xl p-3 border border-white/5">
        <div className="p-1">
          <span className="text-[10px] font-bold text-emerald-300/80 block">{t.avgSleepLabel || 'Avg Sleep'}</span>
          <span className="text-sm font-black text-white">{stats.avgSleepHours}h</span>
        </div>
        <div className="p-1 border-x border-white/10">
          <span className="text-[10px] font-bold text-sky-300/80 block">{t.avgWaterLabel || 'Avg Water'}</span>
          <span className="text-sm font-black text-white">{stats.avgWaterCups} {t.cupsUnit || 'cups'}</span>
        </div>
        <div className="p-1 border-r border-white/10">
          <span className="text-[10px] font-bold text-amber-300/80 block">{t.avgExerciseLabel || 'Avg Exercise'}</span>
          <span className="text-sm font-black text-white">{stats.avgExerciseMins} {t.minutesUnit || 'mins'}</span>
        </div>
        <div className="p-1">
          <span className="text-[10px] font-bold text-purple-300/80 block">{t.avgMoodLabel || 'Avg Mood'}</span>
          <span className="text-sm font-black text-white">{stats.avgMoodScore}/10</span>
        </div>
      </div>

      {/* Insights Accordion List */}
      <div className="space-y-3">
        {insights.map((insight) => {
          const isExpanded = expandedId === insight.id;

          return (
            <div
              key={insight.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'bg-white/10 border-emerald-400/40 shadow-lg'
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                className="w-full p-4 flex items-center justify-between gap-3 text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-black/30 rounded-xl shrink-0 border border-white/10">
                    {getIcon(insight.iconName)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span>{insight.title}</span>
                      {insight.percentageChange > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                          -{insight.percentageChange}% {t.anxietyScoreLabel || 'Anxiety'}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-300/90 font-medium line-clamp-1 mt-0.5">
                      {insight.summary}
                    </p>
                  </div>
                </div>

                <div className="p-1.5 bg-white/10 rounded-full text-gray-300 shrink-0">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180 text-emerald-300' : ''
                    }`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3 bg-black/10"
                  >
                    {/* Stat Breakdown Comparison */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-emerald-300 block">
                          {t.optimalHabitDaysLabel || 'Optimal Habit Days'}
                        </span>
                        <div className="flex items-center justify-between text-white font-extrabold">
                          <span>{insight.details.goodDaysAvg}/10 {t.psychologicalBalanceLabel || 'Balance'}</span>
                          <span className="text-[10px] text-emerald-400 font-black">({insight.details.goodDaysCount} d)</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-rose-300 block">
                          {t.suboptimalDaysLabel || 'Suboptimal Days'}
                        </span>
                        <div className="flex items-center justify-between text-white font-extrabold">
                          <span>{insight.details.badDaysAvg}/10 {t.higherAnxietyLabel || 'Higher Anxiety'}</span>
                          <span className="text-[10px] text-rose-400 font-black">({insight.details.badDaysCount} d)</span>
                        </div>
                      </div>
                    </div>

                    {/* Actionable Clinical Recommendation */}
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="font-semibold leading-relaxed">
                        {insight.recommendation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
