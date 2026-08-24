import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, FileText, Calendar, Clock, Tag, Smile, User, Sparkles, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DiaryEntry, AppLanguage } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';

interface ExportDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  diary: DiaryEntry | null;
  appLanguage: AppLanguage;
  userName?: string;
}

export default function ExportDiaryModal({
  isOpen,
  onClose,
  diary,
  appLanguage = 'ar',
  userName = ''
}: ExportDiaryModalProps) {
  const t = getTranslation(appLanguage);
  const langInfo = getLanguageInfo(appLanguage);
  const isAr = appLanguage === 'ar';

  const [showDate, setShowDate] = useState(true);
  const [showDay, setShowDay] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showDominantMood, setShowDominantMood] = useState(true);
  const [showAutoMood, setShowAutoMood] = useState(true);
  const [showUsername, setShowUsername] = useState(true);

  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const exportContainerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !diary) return null;

  const createdDate = new Date(diary.createdAt);
  const locale = langInfo.bcp47 || (isAr ? 'ar-SA' : 'en-US');

  const dateStr = createdDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const dayStr = createdDate.toLocaleDateString(locale, {
    weekday: 'long'
  });

  const timeStr = createdDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });

  const manualMoods = diary.moods && diary.moods.length > 0 ? diary.moods.join(' ، ') : (isAr ? 'طبيعي' : 'Normal');
  const autoMoodText = diary.aiMoodAnalysis && diary.aiMoodAnalysis.length > 0
    ? diary.aiMoodAnalysis.map(m => `${m.mood} (${m.percentage}%)`).join(' ، ')
    : (isAr ? 'تحليل تلقائي متوازن' : 'Balanced Analysis');

  const categoryLabel = diary.diaryType
    ? (t[diary.diaryType as keyof typeof t] || diary.diaryType)
    : (t.diary || (isAr ? 'يوميات' : 'Diary'));

  const cleanContent = diary.content
    ? diary.content.replace(/<[^>]*>?/gm, '').trim()
    : (isAr ? 'لا يوجد محتوى مكتوب...' : 'No content written...');

  const handleExportAsImage = async () => {
    if (!exportContainerRef.current) return;
    setIsExportingImage(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const element = exportContainerRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: diary.color || '#FFFDF5',
        logging: false,
        windowWidth: 800,
        onclone: (_clonedDoc, clonedEl) => {
          clonedEl.style.display = 'block';
          clonedEl.style.width = '750px';
          clonedEl.style.maxWidth = '750px';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.padding = '36px';
        }
      });

      const imageBlob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png', 1.0);
      });

      if (imageBlob) {
        const url = URL.createObjectURL(imageBlob);
        const link = document.createElement('a');
        const fileName = `HayatAI_Diary_${diary.createdAt.split('T')[0]}.png`;
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export Image error:', err);
      alert(isAr ? 'حدث خطأ أثناء تصدير الصورة.' : 'Error exporting image.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportAsPdf = async () => {
    if (!exportContainerRef.current) return;
    setIsExportingPdf(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const element = exportContainerRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: 800,
        onclone: (_clonedDoc, clonedEl) => {
          clonedEl.style.display = 'block';
          clonedEl.style.width = '750px';
          clonedEl.style.maxWidth = '750px';
          clonedEl.style.margin = '0 auto';
          clonedEl.style.padding = '36px';
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`HayatAI_Diary_${diary.createdAt.split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert(isAr ? 'حدث خطأ أثناء تصدير PDF.' : 'Error exporting PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" dir={langInfo.dir}>
      <div className="bg-white border border-[#E2DCC8] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        <div className="p-4 sm:p-5 border-b border-[#E2DCC8]/70 flex items-center justify-between bg-[#F9F7F2]">
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="p-2 bg-[#8B9D83]/15 text-[#8B9D83] rounded-xl text-base">📤</span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#3A3A3A]">{t.exportDiary || (isAr ? 'تصدير التدوينة' : 'Export Diary')}</h3>
              <p className="text-[11px] text-gray-500">{t.exportOptions || (isAr ? 'اختر العناصر التي تريد إظهارها في الصورة أو PDF' : 'Select elements to include')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 border border-[#E2DCC8] flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="space-y-2">
            <span className="font-extrabold text-xs text-[#5A5A40] block">
              {t.exportOptions || (isAr ? 'خيارات الترويسة والمعلومات' : 'Header & Metadata Options')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <Calendar className="w-3.5 h-3.5 text-[#8B9D83]" />
                <span className="font-bold text-[#3A3A3A]">{t.showDate || (isAr ? 'إظهار التاريخ' : 'Show Date')}</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={showDay}
                  onChange={(e) => setShowDay(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <Calendar className="w-3.5 h-3.5 text-[#D4A373]" />
                <span className="font-bold text-[#3A3A3A]">{isAr ? 'إظهار اليوم' : 'Show Day'}</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={showTime}
                  onChange={(e) => setShowTime(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <Clock className="w-3.5 h-3.5 text-[#8B9D83]" />
                <span className="font-bold text-[#3A3A3A]">{t.showTime || (isAr ? 'إظهار الوقت' : 'Show Time')}</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={showCategory}
                  onChange={(e) => setShowCategory(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <Tag className="w-3.5 h-3.5 text-[#D4A373]" />
                <span className="font-bold text-[#3A3A3A]">{t.showDiaryCategory || (isAr ? 'إظهار التصنيف' : 'Show Category')}</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={showDominantMood}
                  onChange={(e) => setShowDominantMood(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <Smile className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-[#3A3A3A]">{t.showDominantMood || (isAr ? 'المزاج الغالب' : 'Dominant Mood')}</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={showAutoMood}
                  onChange={(e) => setShowAutoMood(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-bold text-[#3A3A3A]">{t.showAutoMood || (isAr ? 'المزاج التلقائي' : 'Auto Mood')}</span>
              </label>

              <label className="flex items-center space-x-2 space-x-reverse p-2.5 bg-[#F9F7F2] hover:bg-[#F0EDE4] rounded-xl border border-[#E2DCC8]/60 cursor-pointer transition-all col-span-1 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={showUsername}
                  onChange={(e) => setShowUsername(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <User className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span className="font-bold text-[#3A3A3A]">{t.showUsername || (isAr ? 'إظهار اسم المستخدم' : 'Show Username')}</span>
                {userName && <span className="text-[10px] text-gray-500 font-normal">({userName})</span>}
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E2DCC8]/70 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={isExportingImage || isExportingPdf}
              onClick={handleExportAsImage}
              className="flex-1 py-3 px-4 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              {isExportingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري تجهيز الصورة...' : 'Generating Image...'}</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>{t.downloadAsImage || (isAr ? 'تحميل كصورة واحدة' : 'Download as Single Image')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isExportingImage || isExportingPdf}
              onClick={handleExportAsPdf}
              className="flex-1 py-3 px-4 bg-[#D4A373] hover:bg-[#B58554] text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري تصدير PDF...' : 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>{t.downloadAsPdf || (isAr ? 'تحميل كـ PDF' : 'Download as PDF')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', zIndex: -100 }}>
        <div
          ref={exportContainerRef}
          className="p-8 space-y-6 text-[#2B3E50]"
          style={{
            width: '750px',
            backgroundColor: diary.color || '#FFFDF5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            direction: isAr ? 'rtl' : 'ltr',
            textAlign: isAr ? 'right' : 'left'
          }}
        >
          <div className="bg-white/90 p-5 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2DCC8]/60 pb-3 flex-wrap gap-2">
              <div className="space-y-1">
                {diary.title && (
                  <h1 className="text-xl font-extrabold text-[#3A3A3A]">{diary.title}</h1>
                )}
                {showCategory && (
                  <span className="inline-block px-2.5 py-1 bg-[#8B9D83]/15 text-[#4E685B] rounded-lg text-xs font-bold">
                    🏷️ {categoryLabel}
                  </span>
                )}
              </div>

              {showUsername && userName && (
                <div className="text-xs font-bold text-[#5A5A40] bg-[#F9F7F2] px-3 py-1.5 rounded-xl border border-[#E2DCC8]/60">
                  👤 {userName}
                </div>
              )}
            </div>

            {(showDate || showDay || showTime) && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold pt-1">
                {showDay && <span>📅 {dayStr}</span>}
                {showDate && <span>• {dateStr}</span>}
                {showTime && <span>• ⏰ {timeStr}</span>}
              </div>
            )}

            {(showDominantMood || showAutoMood) && (
              <div className="space-y-1 pt-2 border-t border-[#E2DCC8]/40 text-xs">
                {showDominantMood && (
                  <div className="text-[#3A3A3A]">
                    <strong className="text-amber-800">✨ {isAr ? 'المزاج الغالب:' : 'Dominant Mood:'}</strong> {manualMoods}
                  </div>
                )}
                {showAutoMood && (
                  <div className="text-[#3A3A3A]">
                    <strong className="text-purple-800">🧠 {isAr ? 'المزاج التلقائي (AI):' : 'Auto Mood (AI):'}</strong> {autoMoodText}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-4">
            <div
              className="text-sm leading-relaxed text-[#3A3A3A] whitespace-pre-wrap font-medium"
              style={{ lineHeight: '2.0' }}
            >
              {cleanContent}
            </div>

            {diary.drawing && (
              <div className="pt-4 border-t border-[#E2DCC8]/50">
                <span className="text-xs font-bold text-[#5A5A40] block mb-2">🎨 {t.canvasDrawing || 'الرسم الذهني'}:</span>
                <img src={diary.drawing} className="max-h-64 rounded-xl border border-[#E2DCC8] object-contain mx-auto" alt="Drawing" />
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#5A5A40] font-bold border-t border-[#E2DCC8]/60">
            <div className="flex items-center gap-1.5">
              <span>🌱</span>
              <span className="font-extrabold">Hayat AI (حياة AI)</span>
              <span>• {isAr ? 'مساحتك اليومية الآمنة' : 'Your Safe Daily Space'}</span>
            </div>
            <span>{dateStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
