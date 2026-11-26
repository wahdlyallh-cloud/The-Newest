import { getCandidateApiKeys } from './apiKeyManager';

export interface GeminiUploadResult {
  inlineData?: { data: string; mimeType: string };
  fileUri?: string;
  mimeType: string;
  uploadedWithKey?: string;
  originalBlob: Blob;
}

const INLINE_LIMIT = 4 * 1024 * 1024;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('Unable to read media'));
    reader.readAsDataURL(blob);
  });
}

async function uploadLargeBlob(blob: Blob, key: string, fileName: string, onProgress?: (percent: number) => void): Promise<GeminiUploadResult> {
  const mimeType = blob.type || 'application/octet-stream';
  onProgress?.(0);
  const init = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(blob.size),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { display_name: fileName } })
  });
  if (!init.ok) throw new Error(`Gemini upload init failed (${init.status})`);
  const uploadUrl = init.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('Gemini did not return a resumable upload URL');
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize', 'Content-Length': String(blob.size) },
    body: blob
  });
  if (!uploaded.ok) throw new Error(`Gemini upload failed (${uploaded.status})`);
  onProgress?.(75);
  const data = await uploaded.json();
  const file = data?.file || data;
  const fileUri = file?.uri || data?.fileUri;
  const fileNameRef = file?.name || (fileUri ? fileUri.split('/').slice(-2).join('/') : '');
  if (!fileUri) throw new Error('Gemini did not return a file URI');
  let state = file?.state || data?.state || 'ACTIVE';
  for (let attempt = 0; attempt < 90 && state !== 'ACTIVE'; attempt++) {
    if (state === 'FAILED') throw new Error('Gemini failed to process the uploaded file');
    await sleep(2000);
    const poll = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileNameRef}?key=${encodeURIComponent(key)}`);
    if (!poll.ok) throw new Error(`Gemini file polling failed (${poll.status})`);
    const pollData = await poll.json();
    state = pollData?.state || pollData?.file?.state || 'ACTIVE';
    onProgress?.(75 + Math.min(24, Math.round((attempt / 90) * 24)));
  }
  if (state !== 'ACTIVE') throw new Error('Gemini file processing timed out');
  onProgress?.(100);
  return { fileUri, mimeType, uploadedWithKey: key, originalBlob: blob };
}

export async function prepareGeminiMedia(file: Blob | File, onProgress?: (percent: number) => void, apiKey?: string): Promise<GeminiUploadResult> {
  const mimeType = file.type || 'application/octet-stream';
  if (file.size < INLINE_LIMIT) {
    onProgress?.(0);
    const data = await readAsBase64(file);
    onProgress?.(100);
    return { inlineData: { data, mimeType }, mimeType, originalBlob: file };
  }
  const fileName = 'name' in file && file.name ? file.name : `hayat-media-${Date.now()}`;
  const keys = apiKey ? [apiKey] : getCandidateApiKeys();
  let lastError: unknown;
  for (const key of keys) {
    try { return await uploadLargeBlob(file, key.trim(), fileName, onProgress); } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error('No healthy Gemini API key available for upload');
}

export const uploadGeminiFile = prepareGeminiMedia;
