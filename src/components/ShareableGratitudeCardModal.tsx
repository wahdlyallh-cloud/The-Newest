import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Sparkles, Copy, Check, Heart, Quote, Image as ImageIcon, Layout, Palette } from 'lucide-react';
import html2canvas from 'html2canvas';
import { AppLanguage, getTranslation } from '../lib/languages';

export interface CardExportData {
  text: string;
  category?: string;
  date?: string;
  author?: string;
}

interface ShareableGratitudeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: AppLanguage;
  initialData?: CardExportData;
}

export type CardThemeId = 'emerald' | 'golden' | 'midnight' | 'parchment' | 'lavender';
export type CardFormat = '1:1' | '9:16';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

// Fallback Canvas Text Wrapping Helper
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trim());

  const totalHeight = lines.length * lineHeight;
  let startY = centerY - totalHeight / 2 + lineHeight;

  for (let k = 0; k < lines.length; k++) {
    ctx.fillText(lines[k], x, startY + k * lineHeight);
  }
}

export default function ShareableGratitudeCardModal({
  isOpen,
  onClose,
  appLanguage = 'ar',
  initialData,
}: ShareableGratitudeCardModalProps) {
  const t = getTranslation(appLanguage);
  const isRtl = appLanguage === 'ar';

  const cardRef = useRef<HTMLDivElement>(null);

  const [cardText, setCardText] = useState(
    initialData?.text || 
    t.defaultGratitudeCardQuote
  );
  const [authorName, setAuthorName] = useState(initialData?.author || (t.defaultAuthorName));
  const [cardCategory, setCardCategory] = useState(initialData?.category || (t.defaultCardCategory));
  const [selectedTheme, setSelectedTheme] = useState<CardThemeId>('emerald');
  const [selectedFormat, setSelectedFormat] = useState<CardFormat>('1:1');
  const [showWatermark, setShowWatermark] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [exportAction, setExportAction] = useState<'download' | 'share' | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimerRef = useRef<any>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  if (!isOpen) return null;

  // Theme styling definitions with exact fallback hex colors
  const THEMES: Record<CardThemeId, {
    nameAr: string;
    nameEn: string;
    bgClass: string;
    textClass: string;
    accentClass: string;
    borderClass: string;
    colors: { bg1: string; bg2: string; text: string; accent: string; border: string };
  }> = {
    emerald: {
      nameAr: 'زمردي هادئ 🌱',
      nameEn: 'Emerald Calm 🌱',
      bgClass: 'bg-gradient-to-br from-[#1B2E23] via-[#2A4234] to-[#16241C]',
      textClass: 'text-emerald-50',
      accentClass: 'text-amber-300',
      borderClass: 'border-emerald-500/30',
      colors: { bg1: '#1B2E23', bg2: '#16241C', text: '#ECFDF5', accent: '#FCD34D', border: '#10B981' }
    },
    golden: {
      nameAr: 'غروب ذهبي 🌅',
      nameEn: 'Golden Sunset 🌅',
      bgClass: 'bg-gradient-to-br from-[#7C2D12] via-[#9A3412] to-[#451A03]',
      textClass: 'text-amber-50',
      accentClass: 'text-amber-300',
      borderClass: 'border-amber-500/30',
      colors: { bg1: '#7C2D12', bg2: '#451A03', text: '#FFFBEB', accent: '#FCD34D', border: '#F59E0B' }
    },
    midnight: {
      nameAr: 'سماء ساطعة 🌌',
      nameEn: 'Midnight Twilight 🌌',
      bgClass: 'bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#020617]',
      textClass: 'text-slate-100',
      accentClass: 'text-sky-300',
      borderClass: 'border-indigo-500/30',
      colors: { bg1: '#0F172A', bg2: '#020617', text: '#F8FAFC', accent: '#7DD3FC', border: '#6366F1' }
    },
    parchment: {
      nameAr: 'ورق كلاسيكي 📜',
      nameEn: 'Classic Parchment 📜',
      bgClass: 'bg-[#F5EFE6] bg-radial from-amber-50/80 to-[#E8DEC9]',
      textClass: 'text-[#3A3228]',
      accentClass: 'text-[#8B5E34]',
      borderClass: 'border-[#D4C5A9]',
      colors: { bg1: '#FBF8F3', bg2: '#E8DEC9', text: '#3A3228', accent: '#8B5E34', border: '#D4C5A9' }
    },
    lavender: {
      nameAr: 'سكينة اللافندر 💜',
      nameEn: 'Lavender Serenity 💜',
      bgClass: 'bg-gradient-to-br from-[#3B0764] via-[#581C87] to-[#1E1B4B]',
      textClass: 'text-purple-50',
      accentClass: 'text-pink-300',
      borderClass: 'border-purple-500/30',
      colors: { bg1: '#3B0764', bg2: '#1E1B4B', text: '#FAF5FF', accent: '#F472B6', border: '#A855F7' }
    },
  };

  const currentTheme = THEMES[selectedTheme];

  // Helper for cross-platform clipboard copy
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}

    try {
      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      }
    } catch (err) {
      console.error('[GratitudeExport] Fallback clipboard error:', err);
    }
    return false;
  };

  // Pure Canvas 2D Fallback Generator (guaranteed 100% crash-proof image generation)
  const renderFallbackCanvas2D = async (): Promise<{ blob: Blob; dataUrl: string }> => {
    const width = 1080;
    const height = selectedFormat === '1:1' ? 1080 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas 2d context.');

    // 1. Draw Background Gradient
    const themeColors = currentTheme.colors;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, themeColors.bg1);
    grad.addColorStop(1, themeColors.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Subtle Border Frame
    ctx.strokeStyle = themeColors.border;
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 3. Background Decorative Watermark Quote
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.font = 'bold 360px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('”', width - 80, 360);

    // 4. Tag Category at Top
    ctx.fillStyle = themeColors.accent;
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = isRtl ? 'right' : 'left';
    const tagX = isRtl ? width - 100 : 100;
    ctx.fillText(`✨ ${cardCategory}`, tagX, 140);

    // 5. Center Quote Text
    ctx.fillStyle = themeColors.text;
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    const quoteContent = `«${cardText}»`;
    const centerY = height / 2;
    const maxTextWidth = width - 220;
    drawWrappedText(ctx, quoteContent, width / 2, centerY, maxTextWidth, 75);

    // 6. Footer Signature & App Watermark
    ctx.fillStyle = themeColors.accent;
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = isRtl ? 'right' : 'left';
    const authorX = isRtl ? width - 100 : 100;
    ctx.fillText(`❤️ ${authorName}`, authorX, height - 120);

    if (showWatermark) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '30px sans-serif';
      ctx.textAlign = isRtl ? 'left' : 'right';
      const wmX = isRtl ? 100 : width - 100;
      ctx.fillText('حياة AI App 🌿', wmX, height - 120);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b && b.size > 0) resolve(b);
        else reject(new Error('Canvas 2D blob generation failed.'));
      }, 'image/png');
    });

    return { blob, dataUrl };
  };

  // High quality canvas & blob generation (Primary html2canvas with Canvas 2D fallback)
  const generateCardBlob = async (): Promise<{ blob: Blob; dataUrl: string }> => {
    console.log('[GratitudeExport] render:start');
    if (cardRef.current) {
      try {
        if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
          try { await document.fonts.ready; } catch (_) {}
        }

        const canvas = await html2canvas(cardRef.current, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        });

        const dataUrl = canvas.toDataURL('image/png');
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob && blob.size > 0) {
          console.log('[GratitudeExport] blob:created via html2canvas, size:', blob.size);
          return { blob, dataUrl };
        }
      } catch (domErr) {
        console.warn('[GratitudeExport] primary render failed, switching to Canvas 2D fallback:', domErr);
      }
    }

    console.log('[GratitudeExport] executing fallback renderFallbackCanvas2D');
    const fallbackRes = await renderFallbackCanvas2D();
    console.log('[GratitudeExport] fallback blob:created, size:', fallbackRes.blob.size);
    return fallbackRes;
  };

  // Download card as image (Mobile-safe Blob URL download)
  const handleDownloadImage = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      setExportAction('download');
      console.log('[GratitudeExport] download:start');

      const { blob } = await generateCardBlob();
      if (!blob || !(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Failed to generate valid PNG blob');
      }

      console.log('[GratitudeExport] blob:size', blob.size);
      const filename = `gratitude-card-${Date.now()}.png`;
      const blobUrl = URL.createObjectURL(blob);

      // Mobile-safe trigger using Blob URL
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL after download cycle
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }, 30000);

      setDownloadSuccess(true);
      showToast(t.gratitudeDownloaded, 'success');
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('[GratitudeExport] error during download:', err?.message, err?.stack);
      showToast(t.gratitudeDownloadFailed, 'error');
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  // Native Web Share API with instant user-gesture execution
  const handleShareCard = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      setExportAction('share');
      console.log('[GratitudeExport] share:start');

      const { blob } = await generateCardBlob();
      if (!blob || !(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Failed to generate valid PNG blob for sharing');
      }

      console.log('[GratitudeExport] blob:size for share:', blob.size);
      const filename = `gratitude-card-${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const shareTitle = t.gratitudeCardShareTitle || 'Gratitude Card 🌸';
      const shareText = `«${cardText}» - ${authorName}\n${t.viaHayatAiBadge || "via Hayat AI 🌿"}`;

      let shareHandled = false;

      // 1. Try Native Web Share with Image File
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            console.log('[GratitudeExport] invoking navigator.share with files');
            await navigator.share({
              title: shareTitle,
              text: shareText,
              files: [file],
            });
            shareHandled = true;
          }
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError' || String(shareErr).includes('AbortError') || shareErr?.message?.toLowerCase().includes('cancel')) {
            console.log('[GratitudeExport] user closed share sheet');
            return;
          }
          console.warn('[GratitudeExport] file share threw error:', shareErr);
        }
      }

      // 2. Fallback: Native Text Share
      if (!shareHandled && typeof navigator !== 'undefined' && navigator.share) {
        try {
          console.log('[GratitudeExport] invoking navigator.share text fallback');
          await navigator.share({
            title: shareTitle,
            text: shareText,
          });
          shareHandled = true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError' || String(shareErr).includes('AbortError') || shareErr?.message?.toLowerCase().includes('cancel')) {
            console.log('[GratitudeExport] user closed share sheet');
            return;
          }
          console.warn('[GratitudeExport] text share threw error:', shareErr);
        }
      }

      // 3. Fallback: Copy to clipboard
      if (!shareHandled) {
        console.log('[GratitudeExport] share:unsupported, falling back to clipboard copy');
        const copiedOk = await copyToClipboard(`«${cardText}» - ${authorName}`);
        if (copiedOk) {
          setCopied(true);
          showToast(t.gratitudeCardCopied, 'info');
          setTimeout(() => setCopied(false), 2500);
        } else {
          showToast(t.gratitudeShareUnsupported, 'error');
        }
      }
    } catch (err: any) {
      console.error('[GratitudeExport] error during share:', err?.message, err?.stack);
      showToast(t.gratitudeShareFailed, 'error');
    } finally {
      setIsExporting(false);
      setExportAction(null);
    }
  };

  // Copy text handler
  const handleCopyText = async () => {
    if (isExporting) return;
    const fullText = `«${cardText}» - ${authorName}\n${t.hayatAiAppBrand || 'Hayat AI App 🌿'}`;
    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopied(true);
      showToast(t.gratitudeTextCopied, 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      showToast(t.gratitudeCopyFailed, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/40'
                : toast.type === 'error'
                ? 'bg-rose-900/90 text-rose-100 border-rose-500/40'
                : 'bg-slate-900/90 text-slate-100 border-slate-500/40'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#FAF8F5] border-2 border-[#D4A373]/40 rounded-[32px] w-full max-w-2xl my-auto flex flex-col overflow-hidden shadow-2xl transition-all relative"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E2DCC8] flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-[#FAF8F5] to-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#4E685B] text-white rounded-2xl shadow-xs">
              <ImageIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#2B3E50] text-base sm:text-lg flex items-center gap-2">
                <span>{t.shareableGratitudeTitle}</span>
              </h3>
              <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                {t.shareableGratitudeSub}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Controls, Right Live Card Preview */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[75vh]">
          
          {/* CONTROL PANEL (5 Cols) */}
          <div className="md:col-span-5 space-y-4">
            
            {/* Input Card Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-[#8B9D83]" />
                <span>{t.cardTextOrQuoteLabel || 'Card Text or Quote:'}</span>
              </label>
              <textarea
                value={cardText}
                onChange={(e) => setCardText(e.target.value)}
                rows={3}
                className="w-full p-3 bg-white border border-[#E2DCC8] rounded-2xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#4E685B] shadow-2xs resize-none"
                placeholder={t.cardTextOrQuotePlaceholder || 'Write your uplifting gratitude thought...'}
              />
            </div>

            {/* Author Signature & Category */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-600">
                  {t.cardAuthorSignatureLabel || 'Author:'}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E2DCC8] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#4E685B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-gray-600">
                  {t.cardTagHeaderLabel || 'Tag Header:'}
                </label>
                <input
                  type="text"
                  value={cardCategory}
                  onChange={(e) => setCardCategory(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E2DCC8] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#4E685B]"
                />
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.cardThemeLabel || 'Card Theme:'}</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(THEMES) as CardThemeId[]).map((themeKey) => {
                  const item = THEMES[themeKey];
                  const isSelected = selectedTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => setSelectedTheme(themeKey)}
                      className={`p-2 rounded-xl text-xs font-extrabold border-2 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#4E685B] bg-[#4E685B] text-white shadow-xs'
                          : 'border-[#E2DCC8] bg-white text-gray-700 hover:border-[#8B9D83]'
                      }`}
                    >
                      <span>{item[appLanguage] || item.nameEn || item.nameAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Selector (1:1 Square vs 9:16 Story) */}
            <div className="space-y-1.5 pt-2 border-t border-[#E2DCC8]">
              <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-sky-600" />
                <span>{t.cardAspectRatioLabel || 'Card Aspect Ratio:'}</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('1:1')}
                  className={`p-2.5 rounded-xl text-xs font-extrabold border-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedFormat === '1:1'
                      ? 'bg-[#4E685B] text-white border-[#4E685B] shadow-xs'
                      : 'bg-white text-gray-700 border-[#E2DCC8] hover:border-[#8B9D83]'
                  }`}
                >
                  <span>1:1 Square (مربع)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('9:16')}
                  className={`p-2.5 rounded-xl text-xs font-extrabold border-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedFormat === '9:16'
                      ? 'bg-[#4E685B] text-white border-[#4E685B] shadow-xs'
                      : 'bg-white text-gray-700 border-[#E2DCC8] hover:border-[#8B9D83]'
                  }`}
                >
                  <span>9:16 Story (ستوري)</span>
                </button>
              </div>
            </div>

            {/* Watermark Toggle */}
            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="w-4 h-4 rounded text-[#4E685B] accent-[#4E685B]"
              />
              <span>{t.showWatermarkAndDate || "Show app watermark & date"}</span>
            </label>

          </div>

          {/* LIVE EXPORT CANVAS PREVIEW (7 Cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-gray-200/50 p-4 rounded-3xl border border-[#E2DCC8]/80">
            <span className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-wider">
              {t.liveCardPreview || "Live Render Preview:"}
            </span>

            {/* EXPORTABLE CARD CONTAINER NODE */}
            <div
              ref={cardRef}
              className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 border ${currentTheme.bgClass} ${currentTheme.textClass} ${currentTheme.borderClass}`}
              style={{
                width: '100%',
                maxWidth: selectedFormat === '1:1' ? '340px' : '280px',
                aspectRatio: selectedFormat === '1:1' ? '1 / 1' : '9 / 16',
              }}
            >
              {/* Decorative Watermark Background Leaf / Quote */}
              <div className="absolute top-0 right-0 translate-x-1/3 translate-y-[-20%] text-white/5 text-[140px] font-serif pointer-events-none select-none">
                ”
              </div>

              {/* Card Tag Top */}
              <div className="relative z-10 flex items-center justify-between">
                <span className={`text-[11px] font-black px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 ${currentTheme.accentClass}`}>
                  {cardCategory}
                </span>
                <Sparkles className={`w-4 h-4 ${currentTheme.accentClass}`} />
              </div>

              {/* Card Quote Body */}
              <div className="relative z-10 my-auto py-4 text-center">
                <p className="text-sm sm:text-base font-extrabold leading-relaxed px-2 drop-shadow-sm font-sans">
                  «{cardText}»
                </p>
              </div>

              {/* Card Footer Signature */}
              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] opacity-90">
                <span className="font-extrabold flex items-center gap-1">
                  <Heart className={`w-3.5 h-3.5 ${currentTheme.accentClass} fill-current`} />
                  <span>{authorName}</span>
                </span>

                {showWatermark && (
                  <span className="text-[9px] font-mono opacity-70 tracking-tight">
                    حياة AI App 🌿
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full mt-5 flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="flex-1 py-3 bg-[#4E685B] hover:bg-[#3F5449] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>
                    {isExporting && exportAction === 'download'
                      ? (t.preparingImage)
                      : downloadSuccess
                      ? (t.downloadedBtn)
                      : (t.downloadPngBtn)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShareCard}
                  disabled={isExporting}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {isExporting && exportAction === 'share'
                      ? (t.preparingShare)
                      : (t.directShareBtn)}
                  </span>
                </button>
              </div>

              {/* Bottom White Copy Button */}
              <button
                type="button"
                onClick={handleCopyText}
                disabled={isExporting}
                className="w-full py-2.5 bg-white hover:bg-[#F5EFE6] border border-[#E2DCC8] text-[#4E685B] font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#4E685B]" />}
                <span>
                  {copied
                    ? (t.copiedSuccessBtn)
                    : (t.copyTextBtn)}
                </span>
              </button>
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
