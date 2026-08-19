import { getActiveApiKeyFromSettings } from '../lib/apiKeyManager';
import { MultimodalAttachment } from '../types';
import { getTranslation } from '../lib/languages';

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
export async function uploadToGeminiFilesAPI(
  file: File,
  apiKey?: string,
  onStatusChange?: (status: 'uploading' | 'processing' | 'ready' | 'failed') => void,
  appLanguage: string = 'ar'
): Promise<{ fileUri: string; mimeType: string }> {
  const mimeType = sniffMimeType(file);
  const t = getTranslation(appLanguage as any);
  let keyToUse = apiKey || getActiveApiKeyFromSettings() || '';

  if (!keyToUse) {
    try {
      keyToUse = (import.meta && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '';
    } catch {}
  }
  if (!keyToUse && typeof process !== 'undefined' && process.env) {
    keyToUse = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  }

  onStatusChange?.('uploading');

  const ts = () => new Date().toISOString();
  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | actualSizeBytes: ${file.size} | mimeType: ${mimeType} | stage: 4_UPLOAD_FUNCTION_ENTERED`);
  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | actualSizeBytes: ${file.size} | mimeType: ${mimeType} | stage: 5_STRATEGY_SELECTED -> GEMINI_FILES_API_RESUMABLE`);
  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | actualSizeBytes: ${file.size} | mimeType: ${mimeType} | stage: 6_UPLOAD_STARTED`);

  // Step 1: Initiate Resumable Upload Session (sends tiny JSON metadata)
  const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${keyToUse.trim()}`;
  let initRes: Response;
  try {
    initRes = await fetch(initUrl, {
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
  } catch (netErr: any) {
    onStatusChange?.('failed');
    console.error(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: 6_UPLOAD_STARTED_NETWORK_ERROR -> ${netErr?.message || String(netErr)}`);
    throw new Error(`${(t as any).fileUploadNetworkError || 'Could not connect to Gemini server'}: ${netErr?.message || String(netErr)}`);
  }

  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: 7_UPLOAD_RESPONSE -> HTTP ${initRes.status}`);

  if (!initRes.ok) {
    onStatusChange?.('failed');
    const errText = await initRes.text().catch(() => '');
    throw new Error(`${(t as any).fileUploadFailed || 'Failed to upload file to Gemini Files API'} (HTTP ${initRes.status}): ${errText}`);
  }

  const uploadUrl = initRes.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    onStatusChange?.('failed');
    throw new Error((t as any).fileUploadFailed || 'Failed to get upload URL from Google servers');
  }

  // Step 2: Stream raw file bytes directly from browser to Google's Upload Session URL
  let uploadRes: Response;
  try {
    uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
        'Content-Length': file.size.toString()
      },
      body: file
    });
  } catch (putErr: any) {
    onStatusChange?.('failed');
    console.error(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: BINARY_PUT_FAILED -> ${putErr?.message || String(putErr)}`);
    throw new Error(`${(t as any).fileUploadFailed || 'File upload failed'}: ${putErr?.message || String(putErr)}`);
  }

  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: BINARY_PUT_SUCCESS -> HTTP ${uploadRes.status}`);

  if (!uploadRes.ok) {
    onStatusChange?.('failed');
    const errText = await uploadRes.text().catch(() => '');
    throw new Error(`${(t as any).fileUploadFailed || 'Failed to upload file'} (HTTP ${uploadRes.status}): ${errText}`);
  }

  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri || uploadData?.fileUri;
  const initialState = uploadData?.file?.state || uploadData?.state || 'ACTIVE';

  if (!fileUri) {
    onStatusChange?.('failed');
    throw new Error((t as any).fileUploadFailed || 'Gemini server did not return file URI');
  }

  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: 8_FILE_URI_CREATED`);
  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: 9_PROCESSING_STATE -> ${initialState}`);

  // Video and Audio files require polling when Gemini API returns state: "PROCESSING"
  if (initialState === 'PROCESSING' || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    onStatusChange?.('processing');
    console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: 10_POLL_STARTED`);
    await pollGeminiFileState(fileUri, keyToUse, undefined, appLanguage);
  }

  onStatusChange?.('ready');
  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | stage: 11_FILE_ACTIVE`);
  return { fileUri, mimeType };
}

/**
 * Poll Google Gemini Files API until file state changes from PROCESSING to ACTIVE
 * Required for Video & Audio files uploaded via Files API before sending to generateContent!
 */
export async function pollGeminiFileState(fileNameOrUri: string, apiKey?: string, maxAttempts = 150, appLanguage: string = 'ar'): Promise<boolean> {
  const fileName = fileNameOrUri.includes('/files/')
    ? 'files/' + fileNameOrUri.split('/files/').pop()
    : fileNameOrUri;
  const t = getTranslation(appLanguage as any);

  let keyToUse = apiKey || getActiveApiKeyFromSettings() || '';
  if (!keyToUse) {
    try {
      keyToUse = (import.meta && (import.meta as any).env?.VITE_GEMINI_API_KEY) || '';
    } catch {}
  }
  if (!keyToUse && typeof process !== 'undefined' && process.env) {
    keyToUse = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  }

  const ts = () => new Date().toISOString();
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | file: ${fileName} | pollAttempt: ${attempt}/${maxAttempts}`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${keyToUse.trim()}`, {
        method: 'GET'
      });
      console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | file: ${fileName} | pollHTTPStatus: ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        const state = data?.state || data?.file?.state || 'ACTIVE';
        console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | file: ${fileName} | fileState: ${state}`);
        if (state === 'ACTIVE') {
          console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | file: ${fileName} | stage: 11_FILE_ACTIVE -> ACTIVE`);
          return true;
        }
        if (state === 'FAILED') {
          throw new Error((t as any).fileUploadFailed || 'Gemini servers failed to process the file');
        }
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('poll attempt')) throw e;
      console.warn(`[ATTACHMENT TRACE] poll attempt ${attempt} warning:`, e);
    }
    // Wait 2 seconds between poll attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | file: ${fileName} | max polling attempts reached, proceeding...`);
  return true;
}

/**
 * Production-Grade Universal Attachment Processor:
 * - Validates file size <= 2GB (Gemini official max file limit)
 * - Safe Inline Threshold: 3MB (to strictly prevent Vercel Serverless Function 4.5MB HTTP 413 errors)
 * - Files <= 3MB: Base64 inlineData
 * - Files > 3MB: Direct Browser → Gemini Files API Resumable Upload returning fileUri (supports 3MB to 2GB!)
 */
export async function processAttachmentUnified(
  file: File,
  apiKey?: string,
  onStatusChange?: (status: 'uploading' | 'processing' | 'ready' | 'failed') => void,
  appLanguage: string = 'ar'
): Promise<MultimodalAttachment> {
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (Gemini Files API official max limit)
  const t = getTranslation(appLanguage as any);
  if (file.size > MAX_FILE_SIZE) {
    onStatusChange?.('failed');
    throw new Error(`${(t as any).fileSizeExceeded || 'File size exceeds the maximum allowed limit'}: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
  }

  const mimeType = sniffMimeType(file);
  const category = getAttachmentTypeCategory(mimeType);
  const INLINE_SIZE_THRESHOLD = 3 * 1024 * 1024; // Safe 3MB threshold for Vercel 4.5MB limit

  if (file.size <= INLINE_SIZE_THRESHOLD) {
    onStatusChange?.('uploading');
    console.log(`[ATTACHMENT DEBUG]
filename: ${file.name}
actualSizeBytes: ${file.size}
mimeType: ${mimeType}
selectedStrategy: INLINE BASE64`);

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

    onStatusChange?.('ready');

    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: file.name,
      type: category,
      mimeType,
      sizeBytes: file.size,
      base64Data,
      status: 'ready',
      previewUrl: category === 'image' ? `data:${mimeType};base64,${base64Data}` : undefined
    };
  }

  // Large files (> 3MB up to 2GB) use Direct Browser → Gemini Files API Resumable Upload
  const { fileUri } = await uploadToGeminiFilesAPI(file, apiKey, onStatusChange);

  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    name: file.name,
    type: category,
    mimeType,
    sizeBytes: file.size,
    fileUri,
    status: 'ready'
  };
}
