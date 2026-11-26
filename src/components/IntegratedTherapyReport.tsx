import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Brain, FileText, AlertTriangle, Sparkles, Printer, Download, FileCheck2, Copy, Check, FileCode,
  History, Search, Plus, Trash2, Edit3, ArrowRightLeft, Clock, CheckCircle2, Stethoscope, UserCheck,
  BookOpen, Filter, Zap, RefreshCw, X, MessageSquare, ListTodo, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import { DiaryEntry, AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';
import { copyTextSafe } from '../lib/clipboard';
import { exportBlobSafe } from '../lib/exportUtils';
import MonthlyMentalHealthPDFReportModal, { SavedPDFReport, INITIAL_SAVED_REPORTS } from './MonthlyMentalHealthPDFReportModal';
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

interface IntegratedTherapyReportProps {
  diaries: DiaryEntry[];
  habits?: any[];
  gratitudeCards?: any[];
  books?: any[];
  userApiKey?: string;
  appLanguage?: AppLanguage;
}

export default function IntegratedTherapyReport({ diaries, habits = [], gratitudeCards = [], books = [], userApiKey, appLanguage = 'ar' }: IntegratedTherapyReportProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedReportForModal, setSelectedReportForModal] = useState<SavedPDFReport | null>(null);
  
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

  // Saved Reports History State
  const [savedReports, setSavedReports] = useState<SavedPDFReport[]>(() => {
    try {
      const stored = localStorage.getItem('yawmiyati_mental_health_reports_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SAVED_REPORTS;
    } catch {
      return INITIAL_SAVED_REPORTS;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'weekly' | 'monthly' | 'edited'>('all');
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editNotesText, setEditNotesText] = useState('');
  const [editFeedbackText, setEditFeedbackText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with localStorage when component mounts or updates
  const reloadReportsFromStorage = () => {
    try {
      const stored = localStorage.getItem('yawmiyati_mental_health_reports_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedReports(parsed);
          return;
        }
      }
      setSavedReports(INITIAL_SAVED_REPORTS);
    } catch {
      setSavedReports(INITIAL_SAVED_REPORTS);
    }
  };

  useEffect(() => {
    reloadReportsFromStorage();
  }, [isPdfModalOpen]);

  const saveReportsToStorage = (updated: SavedPDFReport[]) => {
    setSavedReports(updated);
    try {
      localStorage.setItem('yawmiyati_mental_health_reports_history', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReport = (id: string) => {
    const updated = savedReports.filter(r => r.id !== id);
    saveReportsToStorage(updated);
    showToast(t.reportDeletedSuccess);
  };

  const handleStartInlineEdit = (report: SavedPDFReport) => {
    setEditingReportId(report.id);
    setEditNotesText(report.patientNotes);
    setEditFeedbackText(report.therapistFeedback);
  };

  const handleSaveInlineEdit = (reportId: string) => {
    const now = new Date();
    const updatedDisplayDate = now.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const updated = savedReports.map(rep => {
      if (rep.id === reportId) {
        return {
          ...rep,
          patientNotes: editNotesText,
          therapistFeedback: editFeedbackText,
          isEdited: true,
          updatedAt: now.toISOString(),
          updatedDisplayDate
        };
      }
      return rep;
    });

    saveReportsToStorage(updated);
    setEditingReportId(null);
    showToast(t.reportSavedSuccess);
  };

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return savedReports.filter(report => {
      // Type filter
      if (filterType === 'edited' && !report.isEdited) return false;
      if (filterType === 'weekly' && report.periodType !== 'weekly') return false;
      if (filterType === 'monthly' && report.periodType !== 'monthly') return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        report.periodTitle.toLowerCase().includes(q) ||
        report.displayDate.toLowerCase().includes(q) ||
        (report.patientNotes && report.patientNotes.toLowerCase().includes(q)) ||
        (report.therapistFeedback && report.therapistFeedback.toLowerCase().includes(q)) ||
        (report.updatedDisplayDate && report.updatedDisplayDate.toLowerCase().includes(q))
      );
    });
  }, [savedReports, searchQuery, filterType]);

  // Filter diaries in date range
  const filteredDiaries = diaries.filter(d => {
    const entryDate = d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt.split('T')[0] : new Date(d.createdAt).toISOString().split('T')[0]) : '';
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Calculate statistics filtering untouched metrics
  const totalEntries = filteredDiaries.length;
  const touchedStore = loadAllTouchedMetrics();

  const touchedSleepDiaries = filteredDiaries.filter(d =>
    isMetricTouched(getLocalTodayYMD(d.createdAt), 'sleep', touchedStore) && (d.sleepHours || 0) > 0
  );
  const averageSleep = touchedSleepDiaries.length > 0 
    ? (touchedSleepDiaries.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / touchedSleepDiaries.length).toFixed(1)
    : (t.notRecorded || "غير مسجل");
  
  const totalSports = filteredDiaries
    .filter(d => isMetricTouched(getLocalTodayYMD(d.createdAt), 'exercise', touchedStore))
    .reduce((sum, d) => sum + (d.sportsDuration || 0), 0);

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
          'x-gemini-key': userApiKey || ''
        },
        body: JSON.stringify({
          diaries: sanitizedDiariesForAI,
          habits,
          gratitudeCards,
          books,
          startDate,
          endDate,
          reportType: 'therapist',
          appLanguage,
          mediaAccessPermission
        })
      });
      const data = await response.json();
      if (data.success) {
        setReportText(data.answer);
        setReportSource(data.source);
      } else {
        setReportText(t.aiReportGenerationError);
      }
    } catch (e) {
      console.error(e);
      setReportText(t.aiAdvisorUnavailable);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    const htmlContent = `<!DOCTYPE html><html dir="${langInfo.dir}" lang="${langInfo.code}"><head><meta charset="UTF-8"><title>${t.therapyReportTitle}</title><style>body{font-family:Arial,sans-serif;padding:32px;line-height:1.7;color:#1e293b;direction:${langInfo.dir};text-align:${langInfo.dir === 'rtl' ? 'right' : 'left'};}h1{color:#5A5A40;border-bottom:2px solid #E2DCC8;padding-bottom:10px;} .meta{background:#F9F7F2;padding:14px;border:1px solid #E2DCC8;border-radius:8px;} .report-body{white-space:pre-wrap;margin-top:20px;} </style></head><body><h1>${t.therapyReportTitle}</h1><div class="meta">${t.reportPeriodLabel}: ${startDate} - ${endDate}<br>${t.totalEntriesCount}: ${totalEntries}</div><div class="report-body">${reportText.replace(/\n/g, '<br>')}</div></body></html>`;
    await exportBlobSafe({ blob: new Blob([htmlContent], { type: 'text/html;charset=utf-8' }), filename: `Therapy_Report_${startDate}_${endDate}.html`, title: t.therapyReportTitle, mimeType: 'text/html' });
  };
  const handleCopyText = async () => {
    try {
      const textToCopy = `${t.therapyReportTitle} - Hayat AI\n${startDate} - ${endDate}\n\n- ${totalEntries}\n- ${averageSleep}\n- ${totalSports}\n\n${reportText}`;
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
    const textContent = `\uFEFF${t.therapyReportTitle} - Hayat AI\n${startDate} - ${endDate}\n\n${reportText}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    void exportBlobSafe({ blob, filename: `Therapy_Report_${startDate}_${endDate}.txt`, title: t.therapyReportTitle, mimeType: 'text/plain' });
  };

  const handleDownloadDoc = () => {
    const htmlDocContent = `\uFEFF<!DOCTYPE html>
<html dir="${langInfo.dir}" lang="${langInfo.code}">
<head>
  <meta charset="UTF-8">
  <title>${t.therapyReportTitle}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; line-height: 1.8; color: #2B3E50; direction: ${langInfo.dir}; text-align: ${langInfo.dir === 'rtl' ? 'right' : 'left'}; }
    h1 { color: #5A5A40; border-bottom: 2px solid #E2DCC8; padding-bottom: 8px; font-size: 20px; }
    .meta { background-color: #F9F7F2; padding: 12px; border-radius: 8px; border: 1px solid #E2DCC8; margin-bottom: 16px; font-size: 13px; }
    .report-body { font-size: 14px; white-space: pre-wrap; line-height: 1.8; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>🎓 ${t.therapyReportTitle}</h1>
  <div class="meta">
    <p><strong>${startDate} - ${endDate}</strong></p>
    <p>${totalEntries} | ${averageSleep} | ${totalSports}</p>
  </div>
  <div class="report-body">
    ${reportText.replace(/\n/g, '<br/>')}
  </div>
  <div class="footer">Hayat AI</div>
</body>
</html>`;
    const blob = new Blob([htmlDocContent], { type: 'application/msword;charset=utf-8' });
    void exportBlobSafe({ blob, filename: `Therapy_Report_${startDate}_${endDate}.doc`, title: t.therapyReportTitle, mimeType: 'application/msword' });
  };

  return (
    <div className="space-y-6 font-sans text-start" dir={langInfo.dir} id="therapy-report-panel">
      {/* 🎓 Therapist Session Banner & Master AI Clinical Report Button */}
      <div className="bg-gradient-to-l from-[#2B3E50] via-[#3B5066] to-[#5A5A40] text-white p-5 sm:p-6 rounded-3xl shadow-md border border-[#E2DCC8]/30 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        
        {/* Subtle Background Accent Glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#8B9D83]/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-white/10 rounded-2xl border border-white/15 shrink-0 shadow-inner">
            <Brain className="w-7 h-7 text-[#FEFAE0] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-black text-white">
                {t('therapyReportTitle')}
              </h3>
              <span className="bg-[#8B9D83] text-white px-2.5 py-0.5 rounded-full text-[10px] font-black border border-white/20">
                {t.poweredByAIBadge}
              </span>
            </div>
            <p className="text-xs text-[#E2DCC8]/90 font-medium mt-1 leading-relaxed max-w-xl">
              نظام تحليلي متكامل يرصد المشاعر والسلوكيات، ويولد تقريراً سريرياً فورياً بـ PDF جاهز للتسليم للمعالج النفسي وللحفظ التلقائي في سجل التقييمات.
            </p>
          </div>
        </div>

        {/* Master Single Unified Button */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="w-full sm:w-auto">
            <AIMediaAccessSelector
              permission={mediaAccessPermission}
              onChange={setMediaAccessPermission}
              availableAttachments={extractAvailableAttachments(filteredDiaries)}
              appLanguage={appLanguage}
              compact={true}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-5 py-3.5 bg-gradient-to-r from-[#FEFAE0] to-[#E2DCC8] hover:from-white hover:to-[#FEFAE0] text-[#2B3E50] rounded-2xl font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 space-x-reverse cursor-pointer shrink-0 hover:scale-102 active:scale-98 border border-white/40 group"
          >
            <Sparkles className="w-4 h-4 text-[#8B9D83] group-hover:rotate-12 transition-transform" />
            <span>{t.generateAndPreviewClinicalReport}</span>
          </button>
        </div>
      </div>

      {/* Date Range Selection & Local Stats */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] mb-1.5 flex items-center space-x-1 space-x-reverse">
              <Calendar className="w-3.5 h-3.5 text-[#8B9D83]" />
              <span>{t.startDateLabel}</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-[#E2DCC8] rounded-xl px-3 py-2 text-sm text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#5A5A40] mb-1.5 flex items-center space-x-1 space-x-reverse">
              <Calendar className="w-3.5 h-3.5 text-[#8B9D83]" />
              <span>{t.endDateLabel}</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-[#E2DCC8] rounded-xl px-3 py-2 text-sm text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
            />
          </div>
        </div>

        {/* Clinical Statistics Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-[#F0EDE4]/60 rounded-2xl border border-[#E2DCC8] text-center">
            <span className="block text-[10px] font-bold text-gray-500">{t.totalEntriesLogged}</span>
            <span className="text-base font-black text-[#5A5A40]">{totalEntries}</span>
          </div>
          <div className="p-3 bg-[#CCD5AE]/20 rounded-2xl border border-[#CCD5AE]/60 text-center">
            <span className="block text-[10px] font-bold text-gray-500">{t.avgSleepHours}</span>
            <span className="text-base font-black text-[#8B9D83]">{averageSleep} ساعة</span>
          </div>
          <div className="p-3 bg-[#FAEDCD]/30 rounded-2xl border border-[#E2DCC8]/60 text-center">
            <span className="block text-[10px] font-bold text-gray-500">{t.activitiesPractice}</span>
            <span className="text-base font-black text-[#D4A373]">{totalSports} دقيقة</span>
          </div>
        </div>

        {/* No Diaries Alert */}
        {filteredDiaries.length === 0 && (
          <div className="bg-[#FAEDCD]/40 border border-[#D4A373]/30 rounded-2xl p-4 text-center text-[#D4A373] text-xs flex items-center justify-center space-x-2 space-x-reverse font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t.noDiariesInPeriodAlert}</span>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="p-8 border border-[#E2DCC8] rounded-3xl bg-[#F9F7F2] flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-[#E2DCC8]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#8B9D83] border-t-transparent animate-spin"></div>
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-[#5A5A40] text-sm">{t.readingAndAnalyzingDiaries}</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-md">{t.readingAnalyzingDesc}</p>
            </div>
          </div>
        )}

        {/* Generated Clinical Report */}
        {reportText && (
          <div className="border border-[#E2DCC8] rounded-2xl overflow-hidden shadow-2xs bg-[#F9F7F2]/50 animate-fade-in">
            <div className="bg-[#F0EDE4] p-3 px-4 border-b border-[#E2DCC8] flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-[#5A5A40]">
                <Sparkles className="w-4 h-4 text-[#D4A373] animate-pulse" />
                <span>{t.clinicalReportGeneratedBy} {reportSource === 'gemini' ? 'Gemini 3.5-Flash 🚀' : (t.localAdvisor)}</span>
              </div>
              <button
                onClick={generateReport}
                className="text-[10px] text-[#8B9D83] hover:text-[#5A5A40] font-black cursor-pointer bg-white px-2 py-1 rounded-lg border border-[#E2DCC8] shadow-3xs"
              >
                إعادة توليد 🔄
              </button>
            </div>
            <div className="p-5 max-h-[350px] overflow-y-auto text-xs text-[#3A3A3A] leading-relaxed font-normal whitespace-pre-wrap text-right prose prose-slate">
              {reportText}
            </div>
            
            {/* Actions for Report */}
            <div className="p-3 bg-[#F0EDE4]/60 border-t border-[#E2DCC8] flex flex-wrap items-center justify-end gap-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5A5A40]" />}
                <span>{copySuccess ? (t.copiedSuccess) : (t.copyReportText)}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDoc}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-[#2B3E50] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>{t.downloadWordDoc}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-white border border-[#E2DCC8] hover:bg-[#F9F7F2] text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs"
              >
                <Download className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>{t.downloadTxtUtf8}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#8B9D83] hover:bg-[#5A5A40] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-[#FEFAE0]" />
                <span>{t.exportStructuredPdf}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 bg-[#5A5A40] hover:bg-[#5A5A40]/90 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>{t.printReportBtn}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📜 Generated Reports History Log Section (سجل تقارير الصحة النفسية وجلسات العلاج المولدة) */}
      <div className="space-y-4 pt-4 border-t border-[#E2DCC8]">
        
        {/* Section Title & Header */}
        <div className="bg-gradient-to-r from-[#2B3E50] via-[#3B5066] to-[#5A5A40] text-white p-5 rounded-3xl shadow-sm border border-[#2B3E50]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shrink-0">
              <History className="w-6 h-6 text-[#FEFAE0]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>{t.therapyHistoryLogTitle}</span>
                <span className="text-xs bg-[#8B9D83] text-white px-2.5 py-0.5 rounded-full font-extrabold shadow-3xs">
                  {savedReports.length} {t.savedReportsCountBadge}
                </span>
              </h3>
              <p className="text-xs text-[#E2DCC8] mt-1 font-medium">
                {t.therapyHistoryLogDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-[#E2DCC8] rounded-2xl p-3 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTherapyReportsPlaceholder}
              className="w-full bg-[#FAF8F5] border border-[#E2DCC8] rounded-xl ps-9 pe-9 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 shrink-0">
            {[
              { id: 'all', label: `${t.allReportsFilter} (${savedReports.length})` },
              { id: 'weekly', label: t.weeklyReportsFilter },
              { id: 'monthly', label: t.monthlyReportsFilter },
              { id: 'edited', label: `${t.editedReportsFilter} (${savedReports.filter(r => r.isEdited).length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-[#5A5A40] text-white shadow-3xs'
                    : 'bg-[#F0EDE4] text-gray-700 hover:bg-[#E2DCC8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Reports List / Cards */}
        {filteredReports.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E2DCC8] rounded-3xl p-8 text-center space-y-3">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-sm font-extrabold text-[#5A5A40]">{t.noMatchingTherapyReports}</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              {t.noMatchingTherapyReportsDesc}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setFilterType('all'); }}
              className="px-4 py-2 bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {t.resetFiltersBtn}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const moodDiff = (report.postSessionMood ?? 80) - (report.preSessionMood ?? 40);
              const isEditingThis = editingReportId === report.id;

              return (
                <div 
                  key={report.id}
                  className="bg-white border-2 border-[#E2DCC8] hover:border-[#8B9D83] rounded-3xl p-5 shadow-xs transition-all space-y-4 relative group"
                >
                  
                  {/* Card Header Row: Title + Exact Date & Time + Modification Status */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#F0EDE4] pb-3 gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-[#2B3E50] flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#8B9D83]" />
                          <span>{report.periodTitle}</span>
                        </h4>

                        {/* Modification Badge */}
                        {report.isEdited ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                            <Edit3 className="w-3 h-3 text-amber-600" />
                            <span>{t.recentlyEditedBadge}</span>
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>{t.originalVersionBadge}</span>
                          </span>
                        )}
                      </div>

                      {/* Period Label & Date Range */}
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-2 flex-wrap">
                        <span className="bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E2DCC8] text-[11px] font-bold text-[#5A5A40]">
                          {report.periodLabel}
                        </span>
                        <span>{t.rangeFromTo} {report.startDateStr} ⬅️ {report.endDateStr}</span>
                      </p>
                    </div>

                    {/* Exact Date, Day of Week & Time Badge */}
                    <div className="flex flex-col items-end shrink-0 text-left md:text-right">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#5A5A40] bg-[#F7F5EE] px-3 py-1.5 rounded-xl border border-[#E2DCC8]">
                        <Clock className="w-3.5 h-3.5 text-[#8B9D83]" />
                        <span>{report.displayDate}</span>
                      </div>
                      {report.isEdited && report.updatedDisplayDate && (
                        <span className="text-[10px] text-amber-700 font-bold mt-1">
                          {t.lastEditDate} {report.updatedDisplayDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mood Transition Progress Bar & Gains */}
                  <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-around sm:justify-start">
                      <div className="text-center sm:text-right">
                        <span className="text-[10px] text-gray-500 block font-bold">{t.beforeSessionLabel}</span>
                        <span className="text-xs font-black text-[#5A5A40] bg-white px-2.5 py-1 rounded-lg border border-[#E2DCC8] inline-block mt-0.5">
                          {report.preSessionMood}% {report.preSessionMoodLabel}
                        </span>
                      </div>

                      <ArrowRightLeft className="w-4 h-4 text-[#8B9D83] shrink-0" />

                      <div className="text-center sm:text-right">
                        <span className="text-[10px] text-gray-500 block font-bold">{t.afterSessionLabel}</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                          {report.postSessionMood}% {report.postSessionMoodLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E2DCC8] shadow-3xs text-xs font-bold shrink-0">
                      <span className="text-gray-500">{t.moodRecoveryRate}</span>
                      <span className={`font-black ${moodDiff >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {moodDiff >= 0 ? `+${moodDiff}% 📈` : `${moodDiff}% 📉`}
                      </span>
                    </div>
                  </div>

                  {/* Stats Snapshot Bar */}
                  {report.statsSnapshot && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-white border border-[#E2DCC8] p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">{t.diariesCountLabel}</span>
                        <span className="font-extrabold text-[#5A5A40]">{report.statsSnapshot.totalDiaries} مذكرات</span>
                      </div>
                      <div className="bg-white border border-[#E2DCC8] p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">{t.avgSleepLabel}</span>
                        <span className="font-extrabold text-[#8B9D83]">{report.statsSnapshot.avgSleep} ساعة</span>
                      </div>
                      <div className="bg-white border border-[#E2DCC8] p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">{t.sportsTimeLabel}</span>
                        <span className="font-extrabold text-[#D4A373]">{report.statsSnapshot.totalSportsMinutes} دقيقة</span>
                      </div>
                      <div className="bg-white border border-[#E2DCC8] p-2 rounded-xl">
                        <span className="text-[10px] text-gray-400 block">{t.habitsCommitmentLabel}</span>
                        <span className="font-extrabold text-emerald-600">{report.statsSnapshot.habitRate}%</span>
                      </div>
                    </div>
                  )}

                  {/* Inline Editing Mode OR Display Details */}
                  {isEditingThis ? (
                    <div className="bg-[#F7F5EE] border-2 border-[#8B9D83] p-4 rounded-2xl space-y-3">
                      <h5 className="text-xs font-extrabold text-[#5A5A40] flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-[#8B9D83]" />
                        <span>{t.editPatientAndTherapistNotes}</span>
                      </h5>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-600">{t.patientPreSessionQuestions}</label>
                        <textarea
                          value={editNotesText}
                          onChange={(e) => setEditNotesText(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-[#E2DCC8] rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-600">{t.therapistFeedbackAndGuidance}</label>
                        <textarea
                          value={editFeedbackText}
                          onChange={(e) => setEditFeedbackText(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-[#E2DCC8] rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8B9D83]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingReportId(null)}
                          className="px-3 py-1.5 bg-white border border-[#E2DCC8] text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(report.id)}
                          className="px-4 py-1.5 bg-[#8B9D83] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl cursor-pointer shadow-3xs"
                        >
                          {t.saveChangesBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Patient Pre-Session Notes */}
                      {report.patientNotes && (
                        <div className="bg-[#FAF8F5] border border-[#E2DCC8] p-3 rounded-2xl space-y-1">
                          <span className="font-extrabold text-[#5A5A40] block flex items-center gap-1 text-[11px]">
                            <MessageSquare className="w-3.5 h-3.5 text-[#8B9D83]" />
                            <span>{t.patientNotesTitle}</span>
                          </span>
                          <p className="text-gray-700 text-xs leading-relaxed line-clamp-3 font-normal">
                            {report.patientNotes}
                          </p>
                        </div>
                      )}

                      {/* Therapist Feedback & Instructions */}
                      {report.therapistFeedback && (
                        <div className="bg-[#F4F8F3] border border-[#C2DCBE] p-3 rounded-2xl space-y-1">
                          <span className="font-extrabold text-[#2D5A27] block flex items-center gap-1 text-[11px]">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t.therapistRecommendationsTitle}</span>
                          </span>
                          <p className="text-gray-800 text-xs leading-relaxed line-clamp-3 font-normal">
                            {report.therapistFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Homework Items Checklist Preview */}
                  {report.therapistHomework && report.therapistHomework.length > 0 && (
                    <div className="space-y-1.5 bg-[#F9FBF8] border border-[#C2DCBE] p-3 rounded-2xl">
                      <span className="text-[11px] font-extrabold text-[#2D5A27] flex items-center gap-1">
                        <ListTodo className="w-3.5 h-3.5 text-[#5A5A40]" />
                        <span>{t.therapistHomeworkTitle}</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {report.therapistHomework.map((hw, idx) => (
                          <span key={idx} className="bg-white border border-[#C2DCBE] px-2.5 py-1 rounded-xl text-[11px] text-gray-800 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{hw}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EDE4] pt-3">
                    <span className="text-[11px] text-gray-400 font-medium">
                      {t.reportIdCode} #{report.id.slice(-6)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartInlineEdit(report)}
                        className="px-3 py-1.5 bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t.editNotesBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer border border-red-200 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.delete}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPdfModalOpen(true)}
                        className="px-4 py-1.5 bg-[#8B9D83] hover:bg-[#5A5A40] text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs transition-all"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#FEFAE0]" />
                        <span>{t.viewExportPdfBtn}</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 end-4 z-70 bg-[#2B3E50] text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Monthly Mental Health PDF Report Modal */}
      <MonthlyMentalHealthPDFReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        diaries={diaries}
        habits={habits}
        gratitudeCards={gratitudeCards}
        books={books}
        userApiKey={userApiKey}
        appLanguage={appLanguage}
      />
    </div>
  );
}
