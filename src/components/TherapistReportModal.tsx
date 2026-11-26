import React, { useState } from 'react';
import { Calendar, Brain, FileText, CheckCircle, AlertTriangle, Sparkles, Printer, ArrowRight, Download, Copy, Check, FileCode } from 'lucide-react';
import { DiaryEntry } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import { copyTextSafe } from '../lib/clipboard';
import { exportBlobSafe } from '../lib/exportUtils';
import AIMediaAccessSelector from './AIMediaAccessSelector';
import {
  AIMediaAccessPermission,
  DEFAULT_AI_MEDIA_ACCESS,
  extractAvailableAttachments
} from '../lib/aiMediaAccess';
import {
  loadAllTouchedMetrics,
  isMetricTouched,
  getLocalTodayYMD,
  filterDiaryMetricsForAI
} from '../lib/dailyMetricsFilter';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';

interface TherapistReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  diaries: DiaryEntry[];
  userApiKey?: string;
  appLanguage?: AppLanguage;
}

export default function TherapistReportModal({ isOpen, onClose, diaries, userApiKey, appLanguage = 'ar' }: TherapistReportModalProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  useRegisterBackStep('modal_therapist_report', 'modal', isOpen, onClose, t.prepareTherapyReportTitle);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // default 2 weeks ago
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState<string>('');
  const [reportSource, setReportSource] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [mediaAccessPermission, setMediaAccessPermission] = useState<AIMediaAccessPermission>(DEFAULT_AI_MEDIA_ACCESS);

  if (!isOpen) return null;

  // Filter diaries in date range
  const filteredDiaries = diaries.filter(d => {
    const entryDate = d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt.split('T')[0] : new Date(d.createdAt).toISOString().split('T')[0]) : '';
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Calculate local statistics for selected range strictly filtering untouched metrics
  const totalEntries = filteredDiaries.length;
  const touchedStore = loadAllTouchedMetrics();

  const touchedSleepDiaries = filteredDiaries.filter(d => 
    isMetricTouched(getLocalTodayYMD(d.createdAt), 'sleep', touchedStore) && (d.sleepHours || 0) > 0
  );
  const averageSleep = touchedSleepDiaries.length > 0 
    ? (touchedSleepDiaries.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / touchedSleepDiaries.length).toFixed(1)
    : (t.notRecorded);
  
  const totalSports = filteredDiaries
    .filter(d => isMetricTouched(getLocalTodayYMD(d.createdAt), 'exercise', touchedStore))
    .reduce((sum, d) => sum + (d.sportsDuration || 0), 0);
  
  // Mood summaries in date range
  const moodCounts: Record<string, number> = {};
  filteredDiaries.forEach(d => {
    d.moods.forEach(m => {
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    });
  });

  const generateReport = async () => {
    setLoading(true);
    try {
      const sanitizedDiariesForAI = filteredDiaries.map(d => {
        const fm = filterDiaryMetricsForAI(d, touchedStore, appLanguage);
        return {
          ...d,
          sleepHours: fm.sleepHours,
          sportsDuration: fm.sportsDuration,
          waterCups: fm.waterCups,
          fastMoodScore: fm.fastMoodScore,
          symptomsChecklist: fm.symptomsChecklist
        };
      });

      const response = await fetch('/api/gemini/smart-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': userApiKey || '',
          'x-app-language': appLanguage
        },
        body: JSON.stringify({
          diaries: sanitizedDiariesForAI,
          startDate,
          endDate,
          reportType: 'therapist',
          appLanguage: appLanguage,
          langCode: appLanguage,
          mediaAccessPermission
        })
      });
      const data = await response.json();
      if (data.success) {
        setReportText(data.answer);
        setReportSource(data.source);
      } else {
        setReportText(t.aiConnectionError);
      }
    } catch (e) {
      console.error(e);
      setReportText(t.aiConnectionError);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    const htmlContent = `<!DOCTYPE html><html dir="${langInfo.dir}" lang="${langInfo.code}"><head><meta charset="UTF-8"><title>${t.therapistReportTitle}</title><style>body{font-family:Arial,sans-serif;padding:32px;line-height:1.7;color:#1e293b;direction:${langInfo.dir};text-align:${langInfo.dir === 'rtl' ? 'right' : 'left'};}h1{color:#5A5A40;border-bottom:2px solid #E2DCC8;padding-bottom:10px;} .meta{background:#F9F7F2;padding:14px;border:1px solid #E2DCC8;border-radius:8px;} .report-body{white-space:pre-wrap;margin-top:20px;} </style></head><body><h1>${t.therapistReportTitle}</h1><div class="meta">${t.timePeriod}: ${startDate} - ${endDate}<br>${t.diariesCount}: ${totalEntries}</div><div class="report-body">${reportText.replace(/\n/g, '<br>')}</div></body></html>`;
    await exportBlobSafe({ blob: new Blob([htmlContent], { type: 'text/html;charset=utf-8' }), filename: `Therapy_Report_${startDate}_to_${endDate}.html`, title: t.therapistReportTitle, mimeType: 'text/html' });
  };
  const handleCopyText = async () => {
    try {
      const textToCopy = `${t.therapistReportTitle}\n${t.timePeriod} ${startDate} - ${endDate}\n\n${t.statistics}\n- ${t.diariesCount} ${totalEntries}\n- ${t.avgSleep} ${averageSleep} ${t.hoursUnit}\n- ${t.sportsTime} ${totalSports} ${t.minutesUnit}\n\n${t.aiClinicalAnalysisTitle}\n${reportText}`;
      const ok = await copyTextSafe(textToCopy);
      if (ok) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadTxt = () => {
    const textContent = `\uFEFF${t.therapistReportTitle}\n${t.timePeriod} ${startDate} - ${endDate}\n\n${t.statistics}\n- ${t.diariesCount} ${totalEntries}\n- ${t.avgSleep} ${averageSleep} ${t.hoursUnit}\n- ${t.sportsTime} ${totalSports} ${t.minutesUnit}\n\n${t.aiClinicalAnalysisTitle}\n${reportText}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    void exportBlobSafe({ blob, filename: `Therapy_Report_${startDate}_to_${endDate}.txt`, title: t.therapistReportTitle, mimeType: 'text/plain' });
  };

  const handleDownloadDoc = () => {
    const htmlDocContent = `\uFEFF<!DOCTYPE html>
<html dir="${langInfo.dir}" lang="${langInfo.code}">
<head>
  <meta charset="UTF-8">
  <title>${t.therapistReportTitle}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; line-height: 1.8; color: #2B3E50; direction: ${langInfo.dir}; text-align: ${langInfo.dir === 'rtl' ? 'right' : 'left'}; }
    h1 { color: #5A5A40; border-bottom: 2px solid #E2DCC8; padding-bottom: 8px; font-size: 20px; }
    .meta { background-color: #F9F7F2; padding: 12px; border-radius: 8px; border: 1px solid #E2DCC8; margin-bottom: 16px; font-size: 13px; }
    .report-body { font-size: 14px; white-space: pre-wrap; line-height: 1.8; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>🎓 ${t.therapistReportTitle}</h1>
  <div class="meta">
    <p><strong>${t.timePeriod}</strong> ${t.from} ${startDate} ${t.to} ${endDate}</p>
    <p><strong>${t.diariesCount}</strong> ${totalEntries} | <strong>${t.avgSleep}</strong> ${averageSleep} ${t.hoursUnit} | <strong>${t.sportsTime}</strong> ${totalSports} ${t.minutesUnit}</p>
  </div>
  <div class="report-body">
    ${reportText.replace(/\n/g, '<br/>')}
  </div>
  <div class="footer">${t.reportGeneratedSecurely}</div>
</body>
</html>`;
    const blob = new Blob([htmlDocContent], { type: 'application/msword;charset=utf-8' });
    void exportBlobSafe({ blob, filename: `Therapy_Report_${startDate}_to_${endDate}.doc`, title: t.therapistReportTitle, mimeType: 'application/msword' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-[#5A5A40]/40 backdrop-blur-sm font-sans" dir={langInfo.dir}>
      <div className="bg-white rounded-none sm:rounded-2xl md:rounded-3xl w-full max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[94vh] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border-0 sm:border border-[#E2DCC8] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.prepareTherapyReportTitle}
          subtitle={t.prepareTherapyReportSub}
          icon={
            <div className="p-1.5 bg-white/10 rounded-xl">
              <FileText className="w-4 h-4 text-[#FEFAE0]" />
            </div>
          }
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="emerald"
        />

        {/* Single Scroll Container for Form & Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 sm:space-y-6">
          
          {/* Step 1: Select Date Range */}
          <div className="bg-[#F9F7F2] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E2DCC8] grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5A5A40] mb-1.5 flex items-center space-x-1 space-x-reverse">
                <Calendar className="w-3.5 h-3.5 text-[#8B9D83] shrink-0" />
                <span>{t.startDateLabel}</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-[#E2DCC8] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5A5A40] mb-1.5 flex items-center space-x-1 space-x-reverse">
                <Calendar className="w-3.5 h-3.5 text-[#8B9D83] shrink-0" />
                <span>{t.endDateLabel}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-[#E2DCC8] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83]"
              />
            </div>
          </div>

          {/* Local Range Statistics Info */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-[#F0EDE4] rounded-xl border border-[#E2DCC8] text-center">
              <span className="block text-[10px] font-bold text-gray-500">{t.totalEntriesCount}</span>
              <span className="text-base sm:text-lg font-extrabold text-[#5A5A40]">{totalEntries}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#CCD5AE]/30 rounded-xl border border-[#CCD5AE]/60 text-center">
              <span className="block text-[10px] font-bold text-gray-500">{t.avgSleep}</span>
              <span className="text-base sm:text-lg font-extrabold text-[#8B9D83]">{averageSleep} {t.hoursUnit}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#FAEDCD]/40 rounded-xl border border-[#E2DCC8] text-center">
              <span className="block text-[10px] font-bold text-gray-500">{t.sportsTime}</span>
              <span className="text-base sm:text-lg font-extrabold text-[#D4A373]">{totalSports} {t.minutesUnit}</span>
            </div>
          </div>

          {/* Granular Per-Report AI Media Access Control */}
          <AIMediaAccessSelector
            permission={mediaAccessPermission}
            onChange={setMediaAccessPermission}
            availableAttachments={extractAvailableAttachments(filteredDiaries)}
            appLanguage={appLanguage}
            compact={true}
          />

          {/* Generate Action Button */}
          {filteredDiaries.length === 0 ? (
            <div className="bg-[#FAEDCD]/50 border border-[#D4A373]/30 rounded-xl p-3 sm:p-4 text-center text-[#D4A373] text-xs sm:text-sm flex items-center justify-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.noEntriesInPeriodWarning}</span>
            </div>
          ) : (
            !reportText && !loading && (
              <button
                onClick={generateReport}
                className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-tr from-[#5A5A40] to-[#8B9D83] hover:from-[#5A5A40]/90 hover:to-[#8B9D83]/90 text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center space-x-2 space-x-reverse cursor-pointer group"
              >
                <Brain className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform text-[#FEFAE0]" />
                <span>{t.analyzeAndGenerateReportBtn}</span>
              </button>
            )
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-6 sm:p-8 border border-[#E2DCC8] rounded-2xl bg-[#F9F7F2] flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <div className="absolute inset-0 rounded-full border-4 border-[#E2DCC8]"></div>
                <div className="absolute inset-0 rounded-full border-4 border-[#8B9D83] border-t-transparent animate-spin"></div>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-[#5A5A40]">{t.analyzingEntriesHeader}</h4>
                <p className="text-[11px] sm:text-xs text-gray-500">{t.analyzingEntriesSub}</p>
              </div>
            </div>
          )}

          {/* Generated Report View (Natural Flow without Nested Scroll) */}
          {reportText && (
            <div className="border border-[#E2DCC8] rounded-xl sm:rounded-2xl overflow-hidden shadow-xs bg-[#F9F7F2]">
              <div className="bg-[#F0EDE4] p-2.5 sm:p-3 px-3 sm:px-4 border-b border-[#E2DCC8] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-[#5A5A40]">
                  <Sparkles className="w-4 h-4 text-[#D4A373] shrink-0" />
                  <span>{t.reportGeneratedBy} {reportSource === 'gemini' ? 'Gemini 🚀' : (t.localAdvisor)}</span>
                </div>
                {reportSource !== 'gemini' && (
                  <span className="text-[10px] bg-[#D4A373]/10 text-[#D4A373] border border-[#D4A373]/20 px-2 py-0.5 rounded-full font-semibold">
                    {t.demoVersionLabel}
                  </span>
                )}
              </div>
              <div className="p-3.5 sm:p-5 text-xs sm:text-sm text-[#3A3A3A] leading-relaxed font-normal whitespace-pre-wrap text-right break-words [overflow-wrap:anywhere]">
                {reportText}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {reportText && (
          <div className="p-3 sm:p-4 bg-[#F0EDE4] border-t border-[#E2DCC8] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <button
              onClick={generateReport}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-[#5A5A40] hover:bg-white/50 rounded-lg transition-colors cursor-pointer text-center"
              disabled={loading}
            >
              {t.regenerateBtn}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5A5A40]" />}
                <span>{copySuccess ? (t.copied) : (t.copyBtn)}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDoc}
                className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-[#2B3E50] rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>Word</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>TXT</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 sm:px-4 sm:py-2 bg-[#5A5A40] hover:bg-[#5A5A40]/90 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>{t.printReportBtn}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
