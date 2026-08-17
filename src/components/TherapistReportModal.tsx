import React, { useState } from 'react';
import { Calendar, Brain, FileText, CheckCircle, AlertTriangle, Sparkles, Printer, ArrowRight, Download, Copy, Check, FileCode } from 'lucide-react';
import { DiaryEntry } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

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

  if (!isOpen) return null;

  // Filter diaries in date range
  const filteredDiaries = diaries.filter(d => {
    const entryDate = d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt.split('T')[0] : new Date(d.createdAt).toISOString().split('T')[0]) : '';
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Calculate local statistics for selected range
  const totalEntries = filteredDiaries.length;
  const averageSleep = filteredDiaries.length > 0 
    ? (filteredDiaries.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / filteredDiaries.filter(d => d.sleepHours).length || 8).toFixed(1)
    : (t.notRecorded || "N/A");
  
  const totalSports = filteredDiaries.reduce((sum, d) => sum + (d.sportsDuration || 0), 0);
  
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
      const response = await fetch('/api/gemini/smart-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': userApiKey || '',
          'x-app-language': appLanguage
        },
        body: JSON.stringify({
          diaries: filteredDiaries,
          startDate,
          endDate,
          reportType: 'therapist',
          appLanguage: appLanguage,
          langCode: appLanguage
        })
      });
      const data = await response.json();
      if (data.success) {
        setReportText(data.answer);
        setReportSource(data.source);
      } else {
        setReportText(t.aiConnectionError || "Sorry, an error occurred while connecting to the Smart Advisor.");
      }
    } catch (e) {
      console.error(e);
      setReportText(t.aiConnectionError || "Sorry, unable to connect to the Smart Advisor currently.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="${langInfo.dir}" lang="${langInfo.code}">
        <head>
          <title>${t.therapistReportTitle || 'Therapy Session Report - Hayat AI'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { color: #4f46e5; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            h2 { color: #0f172a; margin-top: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
            h3 { color: #475569; }
            .meta { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .stat-box { border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
            pre { white-space: pre-wrap; font-family: inherit; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>🎓 ${t.therapistReportTitle || 'Prepared Therapy Session Report'}</h1>
          <div class="meta">
            <strong>${t.timePeriod || 'Period:'}</strong> ${t.from || 'From'} ${startDate} ${t.to || 'to'} ${endDate}<br/>
            <strong>${t.diariesCount || 'Logged Entries:'}</strong> ${totalEntries} ${t.personalEntriesCount || 'personal entries'}<br/>
            <strong>${t.issuedDate || 'Issued Date:'}</strong> ${new Date().toLocaleString(langInfo.code === 'ar' ? 'ar-EG' : langInfo.bcp47)}
          </div>

          <div class="grid">
            <div class="stat-box">
              <strong>💤 ${t.avgSleep || 'Avg Sleep Hours:'}</strong> ${averageSleep} ${t.hoursPerNight || 'hours / night'}
            </div>
            <div class="stat-box">
              <strong>🏃 ${t.sportsTime || 'Total Exercise Time:'}</strong> ${totalSports} ${t.minutesUnit || 'minutes'}
            </div>
          </div>

          <h2>📋 ${t.aiClinicalAnalysisTitle || 'AI Mental Health Advisor Clinical Report'}</h2>
          <div style="font-size: 15px;">
            ${reportText.replace(/\n/g, '<br/>')}
          </div>

          <div class="footer">
            ${t.reportGeneratedSecurely || 'Generated automatically and confidentially by Hayat AI.'}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyText = async () => {
    try {
      const textToCopy = `${t.therapistReportTitle || 'Therapy Session Report - Hayat AI'}\n${t.timePeriod || 'Period:'} ${startDate} - ${endDate}\n\n${t.statistics || 'Statistics:'}\n- ${t.diariesCount || 'Logged Entries:'} ${totalEntries}\n- ${t.avgSleep || 'Avg Sleep:'} ${averageSleep} ${t.hoursUnit || 'hours'}\n- ${t.sportsTime || 'Exercise Time:'} ${totalSports} ${t.minutesUnit || 'minutes'}\n\n${t.aiClinicalAnalysisTitle || 'Analytical Report:'}\n${reportText}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadTxt = () => {
    const textContent = `\uFEFF${t.therapistReportTitle || 'Therapy Session Report - Hayat AI'}\n${t.timePeriod || 'Period:'} ${startDate} - ${endDate}\n\n${t.statistics || 'Statistics:'}\n- ${t.diariesCount || 'Logged Entries:'} ${totalEntries}\n- ${t.avgSleep || 'Avg Sleep:'} ${averageSleep} ${t.hoursUnit || 'hours'}\n- ${t.sportsTime || 'Exercise Time:'} ${totalSports} ${t.minutesUnit || 'minutes'}\n\n${t.aiClinicalAnalysisTitle || 'Analytical Report:'}\n${reportText}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Therapy_Report_${startDate}_to_${endDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDoc = () => {
    const htmlDocContent = `\uFEFF<!DOCTYPE html>
<html dir="${langInfo.dir}" lang="${langInfo.code}">
<head>
  <meta charset="UTF-8">
  <title>${t.therapistReportTitle || 'Therapy Report'}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; line-height: 1.8; color: #2B3E50; direction: ${langInfo.dir}; text-align: ${langInfo.dir === 'rtl' ? 'right' : 'left'}; }
    h1 { color: #5A5A40; border-bottom: 2px solid #E2DCC8; padding-bottom: 8px; font-size: 20px; }
    .meta { background-color: #F9F7F2; padding: 12px; border-radius: 8px; border: 1px solid #E2DCC8; margin-bottom: 16px; font-size: 13px; }
    .report-body { font-size: 14px; white-space: pre-wrap; line-height: 1.8; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>🎓 ${t.therapistReportTitle || 'Therapy Session Report - Hayat AI'}</h1>
  <div class="meta">
    <p><strong>${t.timePeriod || 'Period:'}</strong> ${t.from || 'From'} ${startDate} ${t.to || 'to'} ${endDate}</p>
    <p><strong>${t.diariesCount || 'Logged Entries:'}</strong> ${totalEntries} | <strong>${t.avgSleep || 'Avg Sleep:'}</strong> ${averageSleep} ${t.hoursUnit || 'hrs'} | <strong>${t.sportsTime || 'Exercise:'}</strong> ${totalSports} ${t.minutesUnit || 'mins'}</p>
  </div>
  <div class="report-body">
    ${reportText.replace(/\n/g, '<br/>')}
  </div>
  <div class="footer">${t.reportGeneratedSecurely || 'Generated automatically and confidentially via Hayat AI'}</div>
</body>
</html>`;
    const blob = new Blob([htmlDocContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Therapy_Report_${startDate}_to_${endDate}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#5A5A40]/40 backdrop-blur-sm font-sans" dir={langInfo.dir}>
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[94vh] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-[#E2DCC8] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#5A5A40] to-[#8B9D83] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 space-x-reverse min-w-0">
            <div className="p-2 sm:p-2.5 bg-white/10 rounded-2xl shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#FEFAE0]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">{t.prepareTherapyReportTitle || '🎓 Prepare Therapy Session Report'}</h2>
              <p className="text-[11px] sm:text-xs text-[#E2DCC8] truncate">{t.prepareTherapyReportSub || 'Generate a comprehensive report for your therapist in seconds'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer shrink-0"
          >
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </div>

        {/* Single Scroll Container for Form & Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          
          {/* Step 1: Select Date Range */}
          <div className="bg-[#F9F7F2] p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E2DCC8] grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5A5A40] mb-1.5 flex items-center space-x-1 space-x-reverse">
                <Calendar className="w-3.5 h-3.5 text-[#8B9D83] shrink-0" />
                <span>{t.startDateLabel || 'Start Date:'}</span>
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
                <span>{t.endDateLabel || 'End Date:'}</span>
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
              <span className="block text-[10px] font-bold text-gray-500">{t.totalEntriesCount || 'Total Entries'}</span>
              <span className="text-base sm:text-lg font-extrabold text-[#5A5A40]">{totalEntries}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#CCD5AE]/30 rounded-xl border border-[#CCD5AE]/60 text-center">
              <span className="block text-[10px] font-bold text-gray-500">{t.avgSleep || 'Avg Sleep'}</span>
              <span className="text-base sm:text-lg font-extrabold text-[#8B9D83]">{averageSleep} {t.hoursUnit || 'h'}</span>
            </div>
            <div className="p-2.5 sm:p-3 bg-[#FAEDCD]/40 rounded-xl border border-[#E2DCC8] text-center">
              <span className="block text-[10px] font-bold text-gray-500">{t.sportsTime || 'Sports Time'}</span>
              <span className="text-base sm:text-lg font-extrabold text-[#D4A373]">{totalSports} {t.minutesUnit || 'm'}</span>
            </div>
          </div>

          {/* Generate Action Button */}
          {filteredDiaries.length === 0 ? (
            <div className="bg-[#FAEDCD]/50 border border-[#D4A373]/30 rounded-xl p-3 sm:p-4 text-center text-[#D4A373] text-xs sm:text-sm flex items-center justify-center space-x-2 space-x-reverse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.noEntriesInPeriodWarning || 'No entries found in selected period. Please log diaries or adjust date range!'}</span>
            </div>
          ) : (
            !reportText && !loading && (
              <button
                onClick={generateReport}
                className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-tr from-[#5A5A40] to-[#8B9D83] hover:from-[#5A5A40]/90 hover:to-[#8B9D83]/90 text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center space-x-2 space-x-reverse cursor-pointer group"
              >
                <Brain className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform text-[#FEFAE0]" />
                <span>{t.analyzeAndGenerateReportBtn || 'Analyze Data & Generate AI Medical Report 🧠'}</span>
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
                <h4 className="font-bold text-xs sm:text-sm text-[#5A5A40]">{t.analyzingEntriesHeader || 'Reading and analyzing your entries...'}</h4>
                <p className="text-[11px] sm:text-xs text-gray-500">{t.analyzingEntriesSub || 'AI is evaluating mood, activities, and psychological patterns to compose a clinical report.'}</p>
              </div>
            </div>
          )}

          {/* Generated Report View (Natural Flow without Nested Scroll) */}
          {reportText && (
            <div className="border border-[#E2DCC8] rounded-xl sm:rounded-2xl overflow-hidden shadow-xs bg-[#F9F7F2]">
              <div className="bg-[#F0EDE4] p-2.5 sm:p-3 px-3 sm:px-4 border-b border-[#E2DCC8] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-[#5A5A40]">
                  <Sparkles className="w-4 h-4 text-[#D4A373] shrink-0" />
                  <span>{t.reportGeneratedBy || 'Report generated by '} {reportSource === 'gemini' ? 'Gemini 🚀' : (t.localAdvisor || 'Local Advisor 🖥️')}</span>
                </div>
                {reportSource !== 'gemini' && (
                  <span className="text-[10px] bg-[#D4A373]/10 text-[#D4A373] border border-[#D4A373]/20 px-2 py-0.5 rounded-full font-semibold">
                    {t.demoVersionLabel || 'Demo Version'}
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
              {t.regenerateBtn || 'Regenerate 🔄'}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-gray-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5A5A40]" />}
                <span>{copySuccess ? (t.copied || 'Copied!') : (t.copyBtn || 'Copy')}</span>
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
                <span>{t.printReportBtn || 'Print'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
