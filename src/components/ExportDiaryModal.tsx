import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, FileText, Calendar, Clock, Tag, Smile, User, Sparkles, RefreshCw, CheckSquare, Check, Circle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { exportBlobSafe } from '../lib/exportUtils';
import { DiaryEntry, AppLanguage, TaskItem } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';
import { getAttachmentBlob } from '../lib/attachmentStore';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';

interface ExportDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  diary: DiaryEntry | null;
  appLanguage: AppLanguage;
  userName?: string;
}

/**
 * Converts a Blob to a base64 Data-URI cleanly.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolves any image source (IndexedDB id, blob: URL, data-uri, or http/file) into an inline Base64 data-uri.
 * Returns null if the image cannot be resolved.
 */
async function resolveImageToDataUri(src: string, attachmentId?: string): Promise<string | null> {
  try {
    // 1. Check IndexedDB if attachmentId is provided or if src is '#'
    if (attachmentId && attachmentId !== '#') {
      const blob = await getAttachmentBlob(attachmentId);
      if (blob && blob.size > 0) {
        return await blobToDataUrl(blob);
      }
    }

    if (!src || src === '#') {
      return null;
    }

    // 2. If it's already a Data-URI
    if (src.startsWith('data:image/')) {
      return src;
    }

    // 3. If it's a blob: or local URL, fetch it into a blob
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;
    return await blobToDataUrl(blob);
  } catch (err) {
    console.warn('[ExportDiaryModal] Failed to inline image to Data-URI:', err);
    return null;
  }
}

/**
 * Waits for all <img> tags inside a container to finish decoding and loading.
 */
async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return;

  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const onFinish = () => {
          img.removeEventListener('load', onFinish);
          img.removeEventListener('error', onFinish);
          resolve();
        };
        img.addEventListener('load', onFinish);
        img.addEventListener('error', onFinish);
        // Timeout safeguard
        setTimeout(onFinish, 3000);
      });
    })
  );
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

  // Toggleable images and tasks
  const hasImages = Boolean(
    (diary?.images && diary.images.length > 0) ||
    (diary?.imageAttachmentIds && diary.imageAttachmentIds.length > 0) ||
    (diary?.drawings && diary.drawings.length > 0) ||
    diary?.drawing
  );
  const hasTasks = Boolean(diary?.tasks && diary.tasks.length > 0);

  const [includeImages, setIncludeImages] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);

  // Inlined base64 images ready for offline-safe canvas capture
  const [inlinedImages, setInlinedImages] = useState<string[]>([]);
  const [inlinedDrawings, setInlinedDrawings] = useState<string[]>([]);
  const [isPreloadingMedia, setIsPreloadingMedia] = useState(false);

  useRegisterBackStep('modal_export_diary', 'modal', isOpen, onClose, t.exportDiary);

  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const exportContainerRef = useRef<HTMLDivElement | null>(null);

  // Pre-inline attached images and drawings into base64 whenever diary changes
  useEffect(() => {
    if (!isOpen || !diary) return;

    let isCancelled = false;
    setIsPreloadingMedia(true);

    const preloadMedia = async () => {
      try {
        // Resolve images
        const rawImages = diary.images || [];
        const rawImgIds = diary.imageAttachmentIds || [];
        const maxLen = Math.max(rawImages.length, rawImgIds.length);
        const resolvedImgs: string[] = [];

        for (let i = 0; i < maxLen; i++) {
          const src = rawImages[i] || '';
          const attId = rawImgIds[i];
          const dataUri = await resolveImageToDataUri(src, attId);
          if (dataUri) {
            resolvedImgs.push(dataUri);
          }
        }

        // Resolve drawings
        const rawDrawings: string[] = (Array.isArray(diary.drawings) && diary.drawings.length > 0)
          ? diary.drawings
          : (diary.drawing ? [diary.drawing] : []);
        const rawDrawIds = diary.drawingAttachmentIds || (diary.drawingAttachmentId ? [diary.drawingAttachmentId] : []);
        const drawLen = Math.max(rawDrawings.length, rawDrawIds.length);
        const resolvedDraws: string[] = [];

        for (let i = 0; i < drawLen; i++) {
          const src = rawDrawings[i] || '';
          const attId = rawDrawIds[i];
          const dataUri = await resolveImageToDataUri(src, attId);
          if (dataUri) {
            resolvedDraws.push(dataUri);
          }
        }

        if (!isCancelled) {
          setInlinedImages(resolvedImgs);
          setInlinedDrawings(resolvedDraws);
          setIsPreloadingMedia(false);
        }
      } catch (err) {
        console.error('[ExportDiaryModal] Error pre-inlining media:', err);
        if (!isCancelled) setIsPreloadingMedia(false);
      }
    };

    preloadMedia();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, diary]);

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

  const diaryTasks: TaskItem[] = Array.isArray(diary.tasks) ? diary.tasks : [];
  const completedTasksCount = diaryTasks.filter(item => item.completed).length;

  // Background color normalization strictly hex
  const containerBgColor = (diary.color && /^#([0-9A-Fa-f]{3}){1,2}$/.test(diary.color)) ? diary.color : '#FFFDF5';

  /**
   * Captures the off-screen template safely with dynamic scaling and font/image synchronization
   */
  const captureOffscreenTemplate = async (): Promise<HTMLCanvasElement | null> => {
    if (!exportContainerRef.current) return null;
    const element = exportContainerRef.current;

    // 1. Wait for fonts
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // 2. Wait for all inlined <img> elements to finish loading
    await waitForImagesToLoad(element);

    // 3. Two requestAnimationFrame cycles to ensure layout settles
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Dynamic scale to protect against WebView canvas memory limit (max dimension 10000px)
    const targetHeight = element.scrollHeight || element.offsetHeight || 1000;
    const safeScale = Math.min(2, Math.max(1, Math.floor(10000 / Math.max(1, targetHeight))));

    const canvas = await html2canvas(element, {
      scale: safeScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: containerBgColor,
      logging: false,
      windowWidth: 794
    });

    return canvas;
  };

  const handleExportAsImage = async () => {
    if (!exportContainerRef.current) return;
    setIsExportingImage(true);

    try {
      const canvas = await captureOffscreenTemplate();
      if (!canvas) throw new Error('Canvas rendering returned null');

      const imageBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });

      let finalBlob = imageBlob;
      // Fallback if toBlob failed or yielded empty
      if (!finalBlob || finalBlob.size === 0) {
        const dataUrl = canvas.toDataURL('image/png');
        const parts = dataUrl.split(',');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        finalBlob = new Blob([u8arr], { type: 'image/png' });
      }

      if (finalBlob && finalBlob.size > 100) {
        const fileName = `HayatAI_Diary_${diary.createdAt.split('T')[0]}.png`;
        const success = await exportBlobSafe({
          blob: finalBlob,
          filename: fileName,
          title: diary.title || 'Hayat AI Diary',
          mimeType: 'image/png',
          onError: (err) => {
            alert(err?.message || (isAr ? 'حدث خطأ أثناء تصدير الصورة.' : 'Error exporting image.'));
          }
        });
        if (success) {
          onClose();
        }
      } else {
        throw new Error('Generated PNG file is invalid or truncated');
      }
    } catch (err: any) {
      console.error('Export Image error:', err);
      alert(err?.message || (isAr ? 'حدث خطأ أثناء تصدير الصورة.' : 'Error exporting image.'));
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportAsPdf = async () => {
    if (!exportContainerRef.current) return;
    setIsExportingPdf(true);

    try {
      const canvas = await captureOffscreenTemplate();
      if (!canvas) throw new Error('Canvas rendering returned null');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Top and bottom margins in mm for neat multi-page slicing
      const marginX = 8;
      const marginY = 8;
      const printableWidth = pageWidth - (marginX * 2);
      const printableHeight = pageHeight - (marginY * 2);

      // Height of image when scaled to printable width
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pageCanvasHeight = (canvas.width * printableHeight) / imgWidth;
      let renderedHeight = 0;
      let pageNumber = 0;

      while (renderedHeight < canvas.height) {
        if (pageNumber > 0) {
          pdf.addPage();
        }

        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);

        // Create temporary page slice canvas
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext('2d');

        if (pageCtx) {
          pageCtx.fillStyle = '#FFFFFF';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pageCtx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.96);
          const sliceMmHeight = (sliceHeight * imgWidth) / canvas.width;
          pdf.addImage(pageImgData, 'JPEG', marginX, marginY, imgWidth, sliceMmHeight);
        }

        renderedHeight += sliceHeight;
        pageNumber++;
      }

      const fileName = `HayatAI_Diary_${diary.createdAt.split('T')[0]}.pdf`;
      const pdfBlob = pdf.output('blob');

      if (pdfBlob && pdfBlob.size > 100) {
        const success = await exportBlobSafe({
          blob: pdfBlob,
          filename: fileName,
          title: diary.title || 'Hayat AI Diary PDF',
          mimeType: 'application/pdf',
          onError: (err) => {
            alert(err?.message || (isAr ? 'حدث خطأ أثناء تصدير PDF.' : 'Error exporting PDF.'));
          }
        });
        if (success) {
          onClose();
        }
      } else {
        throw new Error('Generated PDF file is invalid or truncated');
      }
    } catch (err: any) {
      console.error('Export PDF error:', err);
      alert(err?.message || (isAr ? 'حدث خطأ أثناء تصدير PDF.' : 'Error exporting PDF.'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const dateMetaParts: string[] = [
    showDay ? `📅 ${dayStr}` : '',
    showDate ? `🗓️ ${dateStr}` : '',
    showTime ? `⏰ ${timeStr}` : ''
  ].filter(Boolean);

  const imagesToRender = inlinedImages.length > 0 ? inlinedImages : (diary.images || []).filter(img => img && img !== '#');
  const drawingsToRender = inlinedDrawings.length > 0 ? inlinedDrawings : (Array.isArray(diary.drawings) ? diary.drawings : diary.drawing ? [diary.drawing] : []).filter(d => d && d !== '#');

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn" dir={langInfo.dir}>
      <div className="bg-white border-0 sm:border sm:border-[#E2DCC8] rounded-none sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh]">
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.exportDiary || (isAr ? 'تصدير التدوينة' : 'Export Diary')}
          subtitle={t.exportOptions || (isAr ? 'اختر العناصر التي تريد إظهارها في الصورة أو PDF' : 'Select elements to include')}
          icon={<span className="text-base">📤</span>}
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="light"
        />

        {/* Modal Body: Options & Live Preview */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 text-xs">
          {/* Metadata Toggles */}
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

          {/* Section 2: Media & Tasks Toggles */}
          <div className="space-y-2 pt-2 border-t border-[#E2DCC8]/70">
            <span className="font-extrabold text-xs text-[#5A5A40] block">
              {isAr ? 'المحتوى الإضافي والمرفقات' : 'Additional Content & Attachments'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Images Toggle */}
              <label className={`flex items-center space-x-2 space-x-reverse p-2.5 rounded-xl border transition-all cursor-pointer ${
                includeImages ? 'bg-[#F9F7F2] border-[#8B9D83]/60' : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  checked={includeImages}
                  disabled={!hasImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="rounded text-[#8B9D83] focus:ring-[#8B9D83] w-4 h-4"
                />
                <ImageIcon className="w-3.5 h-3.5 text-[#8B9D83]" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-[#3A3A3A] block truncate">{t.includeAttachedImages || (isAr ? 'تضمين الصور المرفقة' : 'Include Attached Images')}</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {hasImages ? `(${imagesToRender.length + drawingsToRender.length})` : (isAr ? '(لا توجد صور)' : '(None)')}
                  </span>
                </div>
              </label>

              {/* Tasks Toggle */}
              <label className={`flex items-center space-x-2 space-x-reverse p-2.5 rounded-xl border transition-all cursor-pointer ${
                includeTasks ? 'bg-[#F9F7F2] border-[#D4A373]/60' : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <input
                  type="checkbox"
                  checked={includeTasks}
                  disabled={!hasTasks}
                  onChange={(e) => setIncludeTasks(e.target.checked)}
                  className="rounded text-[#D4A373] focus:ring-[#D4A373] w-4 h-4"
                />
                <CheckSquare className="w-3.5 h-3.5 text-[#D4A373]" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-[#3A3A3A] block truncate">{t.includeTasks || (isAr ? 'تضمين قائمة المهام' : 'Include Tasks / To-Do List')}</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {hasTasks ? `(${diaryTasks.length})` : (isAr ? '(لا توجد مهام)' : '(None)')}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5 pt-2 border-t border-[#E2DCC8]/70">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-[#5A5A40]">
                {isAr ? 'معاينة حية للمحتوى المصدر:' : 'Live Export Preview:'}
              </span>
              {isPreloadingMedia && (
                <span className="text-[10px] text-[#8B9D83] font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {isAr ? 'جاري تجهيز المرفقات...' : 'Loading media...'}
                </span>
              )}
            </div>

            <div
              className="p-3.5 rounded-2xl border border-[#E2DCC8] max-h-52 overflow-y-auto space-y-3 shadow-inner"
              style={{ backgroundColor: containerBgColor }}
            >
              {/* Preview Header */}
              <div className="bg-white/90 p-2.5 rounded-xl border border-[#E2DCC8]/60 space-y-1">
                {diary.title && <div className="font-black text-xs text-[#3A3A3A]">{diary.title}</div>}
                {showCategory && <span className="inline-block px-1.5 py-0.5 bg-[#8B9D83]/15 text-[#4E685B] rounded text-[10px] font-bold">🏷️ {categoryLabel}</span>}
                {dateMetaParts.length > 0 && (
                  <div className="text-[10px] text-gray-500 pt-0.5">{dateMetaParts.join(' • ')}</div>
                )}
              </div>

              {/* Preview Content */}
              <div className="bg-white/90 p-2.5 rounded-xl border border-[#E2DCC8]/60 text-[11px] text-[#3A3A3A] leading-relaxed line-clamp-3">
                {cleanContent}
              </div>

              {/* Preview Tasks */}
              {includeTasks && diaryTasks.length > 0 && (
                <div className="bg-white/90 p-2.5 rounded-xl border border-[#E2DCC8]/60 space-y-1.5">
                  <div className="text-[10px] font-bold text-[#5A5A40] flex items-center justify-between">
                    <span>📋 {t.exportTasksTitle || (isAr ? 'قائمة المهام والواجبات' : 'Tasks & To-Do List')}</span>
                    <span className="text-gray-400 font-normal">({completedTasksCount}/{diaryTasks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {diaryTasks.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-1.5 text-[10px]">
                        <span className={item.completed ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                          {item.completed ? '✓' : '○'}
                        </span>
                        <span className={item.completed ? 'line-through text-gray-400' : 'text-[#3A3A3A]'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                    {diaryTasks.length > 3 && (
                      <div className="text-[9px] text-gray-400">+{diaryTasks.length - 3} {isAr ? 'مهام أخرى...' : 'more tasks...'}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Preview Images */}
              {includeImages && (imagesToRender.length > 0 || drawingsToRender.length > 0) && (
                <div className="bg-white/90 p-2.5 rounded-xl border border-[#E2DCC8]/60 space-y-1">
                  <div className="text-[10px] font-bold text-[#5A5A40]">
                    🖼️ {t.includeAttachedImages || (isAr ? 'الصور المرفقة' : 'Attached Images')} ({imagesToRender.length + drawingsToRender.length})
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {imagesToRender.slice(0, 4).map((src, idx) => (
                      <img key={idx} src={src} alt="Thumb" className="w-10 h-10 object-cover rounded-lg border border-[#E2DCC8]" />
                    ))}
                    {drawingsToRender.slice(0, 2).map((src, idx) => (
                      <img key={`d-${idx}`} src={src} alt="Drawing Thumb" className="w-10 h-10 object-contain rounded-lg border border-[#E2DCC8] bg-white" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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

      {/* Dedicated Visible Off-Screen Capture Container for html2canvas */}
      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '794px',
          opacity: 1,
          pointerEvents: 'none',
          zIndex: -9999
        }}
      >
        <div
          ref={exportContainerRef}
          className="p-8 space-y-6 text-[#2B3E50]"
          style={{
            width: '794px',
            backgroundColor: containerBgColor,
            fontFamily: 'Cairo, "Noto Naskh Arabic", system-ui, -apple-system, sans-serif',
            direction: isAr ? 'rtl' : 'ltr',
            textAlign: isAr ? 'right' : 'left'
          }}
        >
          {/* Header Card */}
          <div
            className="p-5 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-3"
            style={{ backgroundColor: '#ffffff' }}
          >
            <div className="flex items-center justify-between border-b border-[#E2DCC8]/60 pb-3 flex-wrap gap-2">
              <div className="space-y-1">
                {diary.title && (
                  <h1 className="text-xl font-extrabold text-[#3A3A3A]">{diary.title}</h1>
                )}
                {showCategory && (
                  <span
                    className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: 'rgba(139, 157, 131, 0.15)', color: '#4E685B' }}
                  >
                    🏷️ {categoryLabel}
                  </span>
                )}
              </div>

              {showUsername && userName && (
                <div
                  className="text-xs font-bold text-[#5A5A40] px-3 py-1.5 rounded-xl border border-[#E2DCC8]"
                  style={{ backgroundColor: '#F9F7F2' }}
                >
                  👤 {userName}
                </div>
              )}
            </div>

            {/* Date / Day / Time strictly bound to toggles */}
            {dateMetaParts.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-semibold pt-1">
                {dateMetaParts.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1">
                    {idx > 0 && <span className="text-gray-300 mx-1">•</span>}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Dominant and Auto Moods strictly bound to toggles */}
            {(showDominantMood || showAutoMood) && (
              <div className="space-y-1.5 pt-2 border-t border-[#E2DCC8]/40 text-xs">
                {showDominantMood && (
                  <div className="text-[#3A3A3A] flex items-center gap-1.5">
                    <strong className="text-amber-800">✨ {isAr ? 'المزاج الغالب:' : 'Dominant Mood:'}</strong>
                    <span>{manualMoods}</span>
                  </div>
                )}
                {showAutoMood && (
                  <div className="text-[#3A3A3A] flex items-center gap-1.5">
                    <strong className="text-purple-800">🧠 {isAr ? 'المزاج التلقائي (AI):' : 'Auto Mood (AI):'}</strong>
                    <span>{autoMoodText}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diary Content Card */}
          <div
            className="p-6 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-4"
            style={{ backgroundColor: '#ffffff' }}
          >
            <div
              className="text-sm leading-relaxed text-[#3A3A3A] whitespace-pre-wrap font-medium"
              style={{ lineHeight: '2.0' }}
            >
              {cleanContent}
            </div>
          </div>

          {/* Optional Tasks Section (To-Do List) */}
          {includeTasks && diaryTasks.length > 0 && (
            <div
              className="p-6 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-3"
              style={{ backgroundColor: '#ffffff' }}
            >
              <div className="flex items-center justify-between border-b border-[#E2DCC8]/60 pb-2">
                <span className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#D4A373]" />
                  <span>{t.exportTasksTitle || (isAr ? 'قائمة المهام والواجبات' : 'Tasks & To-Do List')}</span>
                </span>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-lg border border-[#E2DCC8]"
                  style={{ backgroundColor: '#F9F7F2', color: '#5A5A40' }}
                >
                  {(t.tasksCompletedCount || (isAr ? 'تم إنجاز {completed} من {total}' : '{completed} of {total} completed'))
                    .replace('{completed}', String(completedTasksCount))
                    .replace('{total}', String(diaryTasks.length))}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {diaryTasks.map((task, taskIdx) => (
                  <div
                    key={task.id || taskIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#E2DCC8]/60"
                    style={{ backgroundColor: task.completed ? '#F4F7F4' : '#FAFAFA' }}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: task.completed ? '#8B9D83' : '#ffffff',
                          borderColor: task.completed ? '#8B9D83' : '#D1D5DB'
                        }}
                      >
                        {task.completed ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 text-gray-300" />
                        )}
                      </div>
                      <span
                        className="text-xs font-medium truncate"
                        style={{
                          color: task.completed ? '#9CA3AF' : '#3A3A3A',
                          textDecoration: task.completed ? 'line-through' : 'none'
                        }}
                      >
                        {task.text}
                      </span>
                    </div>

                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ml-2 mr-2"
                      style={{
                        backgroundColor: task.completed ? 'rgba(139, 157, 131, 0.15)' : '#F3F4F6',
                        color: task.completed ? '#4E685B' : '#6B7280'
                      }}
                    >
                      {task.completed
                        ? (t.taskStatusDone || (isAr ? 'مكتملة' : 'Completed'))
                        : (t.taskStatusPending || (isAr ? 'قيد الانتظار' : 'Pending'))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Attached Images Section (Rendered At Bottom of Diary) */}
          {includeImages && imagesToRender.length > 0 && (
            <div
              className="p-6 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-3"
              style={{ backgroundColor: '#ffffff' }}
            >
              <span className="text-xs font-bold text-[#5A5A40] block border-b border-[#E2DCC8]/60 pb-2">
                🖼️ {t.includeAttachedImages || (isAr ? 'الصور المرفقة' : 'Attached Images')} ({imagesToRender.length})
              </span>
              <div
                className={`grid gap-4 ${
                  imagesToRender.length === 1
                    ? 'grid-cols-1'
                    : imagesToRender.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-2'
                }`}
              >
                {imagesToRender.map((imgSrc, imgIdx) => (
                  <div key={imgIdx} className="rounded-xl overflow-hidden border border-[#E2DCC8] bg-gray-50 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      crossOrigin="anonymous"
                      className="max-h-80 w-full object-contain rounded-xl"
                      alt={`Attached Photo ${imgIdx + 1}`}
                      style={{ display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Attached Drawings Section */}
          {includeImages && drawingsToRender.length > 0 && (
            <div
              className="p-6 rounded-2xl border border-[#E2DCC8] shadow-xs space-y-3"
              style={{ backgroundColor: '#ffffff' }}
            >
              <span className="text-xs font-bold text-[#5A5A40] block border-b border-[#E2DCC8]/60 pb-2">
                🎨 {t.canvasDrawing || (isAr ? 'الرسم والتخطيط الذهني' : 'Mind Map & Drawings')} ({drawingsToRender.length})
              </span>
              <div
                className={`grid gap-4 ${
                  drawingsToRender.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {drawingsToRender.map((drawSrc, drawIdx) => (
                  <div key={drawIdx} className="rounded-xl overflow-hidden border border-[#E2DCC8] bg-white p-2 flex items-center justify-center">
                    <img
                      src={drawSrc}
                      crossOrigin="anonymous"
                      className="max-h-80 w-full object-contain rounded-xl"
                      alt={`Drawing ${drawIdx + 1}`}
                      style={{ display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Branding */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[#5A5A40] font-bold border-t border-[#E2DCC8]/60">
            <div className="flex items-center gap-1.5">
              <span>🌱</span>
              <span className="font-extrabold">Hayat AI (حياة AI)</span>
              <span>• {isAr ? 'مساحتك اليومية الآمنة' : 'Your Safe Daily Space'}</span>
            </div>
            {showDate && <span>{dateStr}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
