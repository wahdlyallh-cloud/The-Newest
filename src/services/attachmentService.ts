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
 * Upload file directly from browser to Google Gemini Files API using Resumable Upload Protocol
 * Bypasses Vercel Serverless Function body limits (4.5MB) completely for files up to 2GB!
 */
export async function uploadToGeminiFilesAPI(file: File, apiKey?: string): Promise<{ fileUri: string; mimeType: string }> {
  const mimeType = sniffMimeType(file);
  const keyToUse = apiKey || getActiveApiKeyFromSettings() || '';

  if (!keyToUse) {
    throw new Error('لا يوجد مفتاح Gemini API صالح لاستخدامه في رفع الملفات الكبيرة.');
  }

  console.log(`[ATTACHMENT TEST] initiating resumable upload -> filename: ${file.name}, actual size: ${file.size} bytes (${(file.size / (1024 * 1024)).toFixed(2)}MB), mimeType: ${mimeType}`);

  // Step 1: Initiate Resumable Upload Session (sends tiny JSON metadata)
  const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${keyToUse.trim()}`;
  const initRes = await fetch(initUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': file.size.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { display_name: file.name } })
  });

  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => '');
    throw new Error(`فشل بدء جلسة الرفع لـ Gemini Files API (HTTP ${initRes.status}): ${errText}`);
  }

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('لم ترجع خوادم Google رابط جلسة الرفع X-Goog-Upload-URL.');
  }

  console.log(`[ATTACHMENT TEST] resumable session created -> upload URL received, streaming binary bytes directly from browser to Google...`);

  // Step 2: Stream raw file bytes directly from browser to Google's Upload Session URL
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Length': file.size.toString()
    },
    body: file
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    throw new Error(`فشل نقل بيانات الملف لـ Gemini Files API (HTTP ${uploadRes.status}): ${errText}`);
  }

  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri;
  if (!fileUri) {
    throw new Error('لم يرجع خادم Gemini رابط الملف النهائي (fileUri).');
  }

  console.log(`[ATTACHMENT TEST] resumable upload completed successfully -> filename: ${file.name}, returned fileUri: ${fileUri}`);

  return { fileUri, mimeType };
}

/**
 * Production-Grade Universal Attachment Processor:
 * - Validates file size <= 2GB (Gemini official max file limit)
 * - Safe Inline Threshold: 3MB (to strictly prevent Vercel Serverless Function 4.5MB HTTP 413 errors)
 * - Files <= 3MB: Base64 inlineData
 * - Files > 3MB: Direct Browser → Gemini Files API Resumable Upload returning fileUri (supports 3MB to 2GB!)
 */
export async function processAttachmentUnified(file: File, apiKey?: string): Promise<MultimodalAttachment> {
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (Gemini Files API official max limit)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`حجم الملف "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) يتجاوز الحد الأقصى المسموح به في Gemini وهو 2 جيجابايت.`);
  }

  const mimeType = sniffMimeType(file);
  const category = getAttachmentTypeCategory(mimeType);
  const INLINE_SIZE_THRESHOLD = 3 * 1024 * 1024; // Safe 3MB threshold for Vercel 4.5MB limit

  console.log(`[ATTACHMENT TEST] selected file -> name: ${file.name}, actual size: ${file.size} bytes (${(file.size / (1024 * 1024)).toFixed(2)}MB), ext MIME: ${mimeType}, category: ${category}`);

  if (file.size <= INLINE_SIZE_THRESHOLD) {
    console.log(`[ATTACHMENT TEST] selected strategy -> INLINE BASE64 (size <= 3MB)`);
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

    console.log(`[ATTACHMENT TEST] inline Base64 encoding complete for ${file.name} (${base64Data.length} chars)`);

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

  // Large files (> 3MB up to 2GB) use Direct Browser → Gemini Files API Resumable Upload
  console.log(`[ATTACHMENT TEST] selected strategy -> GEMINI FILES API RESUMABLE UPLOAD (size > 3MB)`);
  const { fileUri } = await uploadToGeminiFilesAPI(file, apiKey);
  console.log(`[ATTACHMENT TEST] Gemini Files API resumable upload complete for ${file.name} -> fileUri: ${fileUri}`);

  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    name: file.name,
    type: category,
    mimeType,
    sizeBytes: file.size,
    fileUri
  };
}
