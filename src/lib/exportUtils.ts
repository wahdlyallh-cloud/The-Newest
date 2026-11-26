import { Capacitor, registerPlugin } from '@capacitor/core';

export interface FileExportPluginInterface {
  saveAndShareFile(options: {
    base64Data: string;
    fileName: string;
    mimeType: string;
  }): Promise<{ success: boolean; path?: string }>;
}

const FileExport = registerPlugin<FileExportPluginInterface>('FileExport');

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
 * Helper to convert a Blob into a base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Universal safe exporter for generated images (PNG/JPEG) and PDFs.
 * Supports Android Capacitor Native, Mobile Web, and Desktop browsers cleanly:
 * - On Capacitor Native Platform:
 *   Validates blob, converts to Base64 and invokes native FileExportPlugin (save to cache + MediaStore Downloads + native share sheet).
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

  if (!blob || blob.size === 0) {
    console.error('[exportBlobSafe] Received empty or invalid blob');
    onError?.(new Error('Empty export blob'));
    return false;
  }

  const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  // 1. If running on native Capacitor (Android / iOS), use Native FileExport plugin
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
      console.warn('[exportBlobSafe] Native FileExport plugin error, falling back to navigator/download:', pluginErr);
      // If plugin fails, continue to mobile/desktop fallbacks
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
