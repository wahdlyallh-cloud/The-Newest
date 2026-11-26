import { Capacitor } from '@capacitor/core';

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
 * Universal safe exporter for generated images (PNG/JPEG) and PDFs.
 * Supports Android Capacitor WebView, Mobile browsers, and Desktop browsers cleanly:
 * - On Capacitor Native Platform or Mobile when navigator.canShare({ files }) is supported:
 *   Converts the Blob into a native File and invokes navigator.share().
 *   Gracefully handles AbortError (user cancelled share sheet) with onShareCancelled callback.
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

  if (!blob || blob.size === 0) {
    console.error('[exportBlobSafe] Received empty or invalid blob');
    onError?.(new Error('Empty export blob'));
    return false;
  }

  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  const isMobile = isNative || (typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()));

  // 1. Try Native Share if on Native Capacitor or Mobile and navigator.canShare files is supported
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

  // 2. Direct browser download fallback (Works cleanly on Windows / Desktop / Web)
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
