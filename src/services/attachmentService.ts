import { getActiveApiKeyFromSettings } from '../lib/apiKeyManager';
import { MultimodalAttachment } from '../types';

/**
 * Sniff correct MIME type from file extension if Android / browser returns empty or generic octet-stream
 */
export function sniffMimeType(file: File): string {
  let detectedType = file.type;

  // Normalize non-standard browser MIME types
  if (detectedType === 'audio/mp3') {
    detectedType = 'audio/mpeg';
  }

  if (detectedType && detectedType !== '' && detectedType !== 'application/octet-stream') {
    return detectedType;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',

    // Documents
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    // Audio
    mp3: 'audio/mpeg',
    mpga: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    flac: 'audio/flac',

    // Video
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    '3gp': 'video/3gpp',
    webm: 'video/webm'
  };

  return mimeMap[ext] || 'application/octet-stream';
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
    throw new Error(`فشل رفع الملف (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const fileUri = data?.file?.uri || data?.fileUri;
  if (!fileUri) {
    throw new Error('لم يرجع خادم Gemini رابط الملف (fileUri).');
  }

  return { fileUri, mimeType };
}

/**
 * Unified Attachment Processor:
 * - If file <= 2MB: converts to clean Base64 inlineData
 * - If file > 2MB: uploads to Gemini Files API and returns fileUri
 */
export async function processAttachmentUnified(file: File, apiKey?: string): Promise<MultimodalAttachment> {
  const mimeType = sniffMimeType(file);
  const category = getAttachmentTypeCategory(mimeType);
  const INLINE_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

  if (file.size <= INLINE_SIZE_THRESHOLD) {
    // Convert to inline Base64
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

  // Upload to Gemini Files API for large files or videos
  const { fileUri } = await uploadToGeminiFilesAPI(file, apiKey);

  return {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    name: file.name,
    type: category,
    mimeType,
    sizeBytes: file.size,
    fileUri
  };
}
