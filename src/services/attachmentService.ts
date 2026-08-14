import { getActiveApiKeyFromSettings } from '../lib/apiKeyManager';
import { MultimodalAttachment } from '../types';

/**
 * Sniff correct MIME type using extension-first lookup for maximum Gemini API compatibility
 */
export function sniffMimeType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  const extMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    heic: 'image/heic',
    heif: 'image/heif',

    // Documents
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    json: 'application/json',
    html: 'text/html',

    // Audio
    mp3: 'audio/mpeg',
    mpga: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    flac: 'audio/flac',

    // Video
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    qt: 'video/quicktime',
    '3gp': 'video/3gpp',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo'
  };

  if (ext && extMap[ext]) {
    return extMap[ext];
  }

  let detectedType = file.type;
  if (detectedType === 'audio/mp3' || detectedType === 'audio/x-mp3') return 'audio/mpeg';
  if (detectedType === 'audio/x-m4a') return 'audio/mp4';
  if (detectedType === 'video/x-m4v') return 'video/mp4';

  if (detectedType && detectedType !== '' && detectedType !== 'application/octet-stream') {
    return detectedType;
  }

  return 'application/octet-stream';
}

/**
 * Categorize attachment type based on MIME type
 */
export function getAttachmentTypeCategory(mimeType: string): MultimodalAttachment['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

/**
 * Upload file to Google Gemini Files API via key-pooled upload endpoint
 */
export async function uploadToGeminiFilesAPI(file: File, apiKey?: string): Promise<{ fileUri: string; mimeType: string }> {
  const mimeType = sniffMimeType(file);
  const metadata = { file: { displayName: file.name } };
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const res = await fetch('/api/gemini/upload-file', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`فشل رفع الملف لـ Gemini (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const fileUri = data?.file?.uri || data?.fileUri;
  if (!fileUri) {
    throw new Error('لم يرجع خادم Gemini رابط الملف (fileUri).');
  }

  return { fileUri, mimeType };
}

/**
 * Production-Grade Unified Attachment Processor:
 * - Validates file size <= 2GB (Gemini official max file limit)
 * - If file <= 8MB: converts to clean Base64 inlineData (fastest, no extra storage roundtrip)
 * - If file > 8MB: uploads to Gemini Files API and returns fileUri (supports up to 2GB)
 */
export async function processAttachmentUnified(file: File, apiKey?: string): Promise<MultimodalAttachment> {
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (Gemini Files API limit)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`حجم الملف "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) يتجاوز الحد الأقصى المسموح به في Gemini وهو 2 جيجابايت.`);
  }

  const mimeType = sniffMimeType(file);
  const category = getAttachmentTypeCategory(mimeType);
  const INLINE_SIZE_THRESHOLD = 8 * 1024 * 1024; // 8MB

  console.log(`[ATTACHMENT FORENSIC] selected file -> name: ${file.name}, size: ${file.size} bytes, ext MIME: ${mimeType}, category: ${category}`);

  if (file.size <= INLINE_SIZE_THRESHOLD) {
    console.log(`[ATTACHMENT FORENSIC] strategy -> INLINE BASE64 (size <= 8MB)`);
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const b64 = res.split(',')[1] || '';
        resolve(b64);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    console.log(`[ATTACHMENT FORENSIC] inline Base64 processing complete for ${file.name} (${base64Data.length} base64 chars)`);

    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: file.name,
      type: category,
      mimeType,
      sizeBytes: file.size,
      base64Data,
      previewUrl: category === 'image' ? `data:${mimeType};base64,${base64Data}` : undefined
    };
  }

  // Large files (> 8MB) are uploaded to Gemini Files API
  console.log(`[ATTACHMENT FORENSIC] strategy -> GEMINI FILES API (size > 8MB)`);
  const { fileUri } = await uploadToGeminiFilesAPI(file, apiKey);
  console.log(`[ATTACHMENT FORENSIC] Gemini Files API upload success for ${file.name} -> fileUri: ${fileUri}`);

  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    name: file.name,
    type: category,
    mimeType,
    sizeBytes: file.size,
    fileUri
  };
}
