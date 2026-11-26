/**
 * Media Storage & Image Compression Pipeline for Hayat AI
 * Native IndexedDB persistence with safe canvas image resizing & Object URL lifecycle management.
 */

import { saveAttachmentBlob, getAttachmentBlob } from './attachmentStore';

// In-memory cache for live Object URLs to prevent redundant creation
const objectUrlCache = new Map<string, string>();

/**
 * Checks if a file or MIME is an image type that can be resized safely on canvas.
 */
export function isResizableImage(mimeType: string, filename?: string): boolean {
  const cleanMime = (mimeType || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  // Exclude animated GIFs and SVG vectors from raster compression
  if (cleanMime.includes('gif') || cleanMime.includes('svg') || name.endsWith('.gif') || name.endsWith('.svg')) {
    return false;
  }

  return cleanMime.startsWith('image/') || /\.(jpe?g|png|webp|bmp|heic|heif|avif)$/i.test(name);
}

/**
 * Compresses and scales an image using an offscreen canvas.
 * Target: max dimension ~1600px, quality ~0.82 (JPEG/WebP).
 */
export async function compressImageFile(
  file: File | Blob,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<{ blob: Blob; mimeType: string }> {
  const mime = file.type || 'image/jpeg';

  if (!isResizableImage(mime, (file as File).name)) {
    return { blob: file, mimeType: mime };
  }

  return new Promise((resolve) => {
    // If browser supports createImageBitmap, use it for faster background decoding
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then((bitmap) => {
          let { width, height } = bitmap;
          if (width <= maxDimension && height <= maxDimension && file.size < 350 * 1024) {
            bitmap.close();
            return resolve({ blob: file, mimeType: mime });
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            bitmap.close();
            return resolve({ blob: file, mimeType: mime });
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();

          const outputMime = mime.includes('png') ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                resolve({ blob, mimeType: outputMime });
              } else {
                resolve({ blob: file, mimeType: mime });
              }
            },
            outputMime,
            quality
          );
        })
        .catch(() => {
          // Fallback to Image element
          compressWithHtmlImage(file, maxDimension, quality, mime, resolve);
        });
    } else {
      compressWithHtmlImage(file, maxDimension, quality, mime, resolve);
    }
  });
}

function compressWithHtmlImage(
  file: File | Blob,
  maxDimension: number,
  quality: number,
  mime: string,
  resolve: (res: { blob: Blob; mimeType: string }) => void
) {
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    let { width, height } = img;

    if (width <= maxDimension && height <= maxDimension && file.size < 350 * 1024) {
      return resolve({ blob: file, mimeType: mime });
    }

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(width, 1);
    canvas.height = Math.max(height, 1);

    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve({ blob: file, mimeType: mime });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const outputMime = mime.includes('png') ? 'image/png' : 'image/jpeg';
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size < file.size) {
          resolve({ blob, mimeType: outputMime });
        } else {
          resolve({ blob: file, mimeType: mime });
        }
      },
      outputMime,
      quality
    );
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve({ blob: file, mimeType: mime });
  };

  img.src = objectUrl;
}

/**
 * Stores media safely in IndexedDB and returns a live preview Object URL.
 */
export async function storeMediaAttachment(
  file: File | Blob,
  type: 'image' | 'video' | 'audio' | 'document' = 'image',
  customIdPrefix?: string
): Promise<{ attachmentId: string; objectUrl: string; mimeType: string; size: number }> {
  if (!file || file.size === 0) {
    throw new Error('Cannot store empty file or attachment');
  }
  const prefix = customIdPrefix || (type === 'image' ? 'att-img' : type === 'video' ? 'att-vid' : type === 'audio' ? 'att-audio' : 'att-file');
  const attachmentId = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  let finalBlob: Blob = file;
  let finalMime = file.type || (type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/webm' : 'application/octet-stream');

  if (type === 'image') {
    const compressed = await compressImageFile(file, 1600, 0.82);
    finalBlob = compressed.blob;
    finalMime = compressed.mimeType;
  }

  await saveAttachmentBlob(attachmentId, finalBlob, finalMime);
  const objectUrl = URL.createObjectURL(finalBlob);
  objectUrlCache.set(attachmentId, objectUrl);

  return {
    attachmentId,
    objectUrl,
    mimeType: finalMime,
    size: finalBlob.size
  };
}

/**
 * Retrieves or hydrates an Object URL for an IndexedDB attachmentId.
 */
export async function getOrHydrateMediaUrl(attachmentId: string): Promise<string | null> {
  if (!attachmentId) return null;

  if (objectUrlCache.has(attachmentId)) {
    return objectUrlCache.get(attachmentId)!;
  }

  const blob = await getAttachmentBlob(attachmentId);
  if (blob) {
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(attachmentId, url);
    return url;
  }

  return null;
}

/**
 * Safely revokes an Object URL and removes it from the cache.
 */
export function revokeMediaUrl(urlOrAttachmentId: string): void {
  if (!urlOrAttachmentId) return;

  if (urlOrAttachmentId.startsWith('blob:')) {
    URL.revokeObjectURL(urlOrAttachmentId);
    for (const [key, val] of objectUrlCache.entries()) {
      if (val === urlOrAttachmentId) {
        objectUrlCache.delete(key);
        break;
      }
    }
  } else if (objectUrlCache.has(urlOrAttachmentId)) {
    const url = objectUrlCache.get(urlOrAttachmentId)!;
    URL.revokeObjectURL(url);
    objectUrlCache.delete(urlOrAttachmentId);
  }
}

/**
 * Clears and revokes all active in-memory media Object URLs.
 */
export function clearAllMediaUrls(): void {
  for (const url of objectUrlCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  }
  objectUrlCache.clear();
}
