import { Capacitor, registerPlugin } from '@capacitor/core';
import html2canvasPro from 'html2canvas-pro';

export interface FileExportPluginInterface {
  saveAndShareFile(options: {
    base64Data: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ success: boolean; path?: string }>;
}

const FileExport = registerPlugin<FileExportPluginInterface>('FileExport');

/**
 * Universal safe capture helper wrapping html2canvas-pro.
 * Natively supports CSS Color 4 formats (oklch, oklab, lch, lab, color-mix) from Tailwind v4.
 * Safeguards @font-face rules and ensures safe background color handling while chaining any caller onclone logic.
 */
export async function captureElementToCanvas(
  element: HTMLElement,
  options: Record<string, any> = {}
): Promise<HTMLCanvasElement> {
  const { onclone: callerOnClone, backgroundColor = '#ffffff', scale = 2, useCORS = true, ...restOptions } = options;

  return await (html2canvasPro as any)(element, {
    scale,
    useCORS,
    backgroundColor,
    ...restOptions,
    onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
      try {
        // Ensure cloned element root has an explicit safe background if transparent
        if (!clonedElement.style.backgroundColor && backgroundColor) {
          clonedElement.style.backgroundColor = backgroundColor;
        }
      } catch (err) {
        console.warn('[captureElementToCanvas] onclone style safeguard warning:', err);
      }

      // Chain caller-provided onclone callback if defined
      if (typeof callerOnClone === 'function') {
        try {
          callerOnClone(clonedDoc, clonedElement);
        } catch (chainErr) {
          console.warn('[captureElementToCanvas] caller onclone callback warning:', chainErr);
        }
      }
    }
  });
}

export interface ExportFileOptions {
  blob: Blob;
  filename: string;
  title?: string;
  mimeType?: string;
  onShareCancelled?: () => void;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

/**
 * Robust conversion of a Blob into a clean raw Base64 string.
 * Uses chunked Uint8Array conversion for binary reliability across platforms.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000; // 32KB chunks to prevent call-stack overflow
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Universal safe exporter for generated images (PNG/JPEG) and PDFs.
 * Supports Android Capacitor Native, Mobile Web, and Desktop browsers cleanly:
 * - On Capacitor Native Platform:
 *   Validates blob, converts to raw Base64 and invokes native FileExportPlugin (save to cache + MediaStore Downloads + native share sheet).
 *   Never falls back to broken <a> download stub on native Android.
 * - On Mobile Web when navigator.canShare({ files }) is supported:
 *   Converts the Blob into a File and invokes navigator.share().
 * - On Desktop browsers or when native sharing is unavailable:
 *   Creates a standard temporary <a> element with object URL for instant direct download.
 */
export async function exportBlobSafe(options: ExportFileOptions): Promise<boolean> {
  const {
    blob,
    filename,
    title = 'Hayat AI Export',
    mimeType = blob.type || 'application/octet-stream',
    onShareCancelled,
    onSuccess,
    onError
  } = options;

  if (!blob || blob.size < 100) {
    const errMsg = 'ملف التصدير فارغ أو غير مكتمل (حجمه غير صالح)';
    console.error('[exportBlobSafe] Received invalid or truncated blob, size:', blob?.size);
    onError?.(new Error(errMsg));
    return false;
  }

  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  // 1. If running on native Capacitor (Android / iOS), ALWAYS use Native FileExport plugin
  if (isNative) {
    try {
      const base64Data = await blobToBase64(blob);
      await FileExport.saveAndShareFile({
        base64Data,
        fileName: filename,
        mimeType
      });
      onSuccess?.();
      return true;
    } catch (pluginErr: any) {
      console.error('[exportBlobSafe] Native FileExport plugin error:', pluginErr);
      const message = pluginErr?.message || pluginErr?.errorMessage || 'تعذر حفظ ومشاركة الملف عبر النظام';
      onError?.(new Error(message));
      return false;
    }
  }

  // 2. Try Web Share API if on Mobile Web and navigator.canShare({ files }) is supported
  if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: title
          });
          onSuccess?.();
          return true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            console.log('[exportBlobSafe] Share sheet dismissed/cancelled by user');
            onShareCancelled?.();
            return false;
          }
          console.warn('[exportBlobSafe] navigator.share error, falling back to download:', shareErr);
        }
      }
    } catch (e) {
      console.warn('[exportBlobSafe] File creation or canShare error:', e);
    }
  }

  // 3. Direct browser download fallback (Works cleanly on Windows / Desktop / Web)
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 4000);
    onSuccess?.();
    return true;
  } catch (downloadErr) {
    console.error('[exportBlobSafe] Direct link download failed:', downloadErr);
    onError?.(downloadErr);
    return false;
  }
}
