// src/lib/aiMediaAccess.ts
// Granular Per-Chat & Per-Report AI Media Access Control (Quota & Token Saver)
// Strict default to 'text-only' (zero binary images, audio, video, files sent to AI without user permission)
// Safe mobile memory cap: max 20MB combined per request on mobile WebView to prevent OOM crashes

import { DiaryEntry } from '../types';
import { getAttachmentBlob } from './attachmentStore';

export type AIMediaAccessMode = 'text-only' | 'selected' | 'by-type';

export interface AIMediaAccessPermission {
  mode: AIMediaAccessMode;
  allowImages: boolean;
  allowVideos: boolean;
  allowAudio: boolean;
  allowFiles: boolean;
  selectedAttachmentIds: string[];
}

export const DEFAULT_AI_MEDIA_ACCESS: AIMediaAccessPermission = {
  mode: 'text-only',
  allowImages: false,
  allowVideos: false,
  allowAudio: false,
  allowFiles: false,
  selectedAttachmentIds: []
};

export const MAX_SAFE_PAYLOAD_BYTES = 20 * 1024 * 1024; // 20 MB memory cap for mobile webview

export interface AttachmentItemSummary {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'file';
  mimeType: string;
  sizeBytes?: number;
  sizeFormatted?: string;
  dateStr?: string;
  thumbnailUrl?: string;
  attachmentId?: string;
}

/**
 * Checks if a specific attachment is allowed based on active permission object.
 */
export function isAttachmentAllowed(
  att: { id?: string; attachmentId?: string; type?: string; mimeType?: string },
  permission: AIMediaAccessPermission = DEFAULT_AI_MEDIA_ACCESS
): boolean {
  if (permission.mode === 'text-only') {
    return false;
  }

  const idToCheck = att.attachmentId || att.id || '';

  if (permission.mode === 'selected') {
    return Boolean(idToCheck && permission.selectedAttachmentIds.includes(idToCheck));
  }

  if (permission.mode === 'by-type') {
    const rawType = (att.type || '').toLowerCase();
    const mime = (att.mimeType || '').toLowerCase();

    if (rawType === 'image' || mime.startsWith('image/')) {
      return permission.allowImages;
    }
    if (rawType === 'video' || mime.startsWith('video/')) {
      return permission.allowVideos;
    }
    if (rawType === 'audio' || mime.startsWith('audio/')) {
      return permission.allowAudio;
    }
    if (rawType === 'file' || rawType === 'pdf' || mime.includes('pdf') || mime.includes('document')) {
      return permission.allowFiles;
    }
    return false;
  }

  return false;
}

/**
 * Extracts a flat list of available attachments from diaries for UI selection.
 */
export function extractAvailableAttachments(diaries: DiaryEntry[]): AttachmentItemSummary[] {
  const items: AttachmentItemSummary[] = [];
  const seenIds = new Set<string>();

  for (const d of diaries) {
    const dDate = d.createdAt ? d.createdAt.split('T')[0] : '';

    // Images
    if (d.images && Array.isArray(d.images)) {
      d.images.forEach((img, idx) => {
        const attId = d.imageAttachmentIds && d.imageAttachmentIds[idx] ? d.imageAttachmentIds[idx] : `img-${d.id}-${idx}`;
        if (!seenIds.has(attId)) {
          seenIds.add(attId);
          items.push({
            id: attId,
            name: `${d.title || 'صورة'} #${idx + 1}`,
            type: 'image',
            mimeType: 'image/jpeg',
            dateStr: dDate,
            thumbnailUrl: img.startsWith('data:') ? img : undefined,
            attachmentId: d.imageAttachmentIds && d.imageAttachmentIds[idx] ? d.imageAttachmentIds[idx] : undefined
          });
        }
      });
    }

    // Drawing
    if (d.drawing) {
      const drawId = d.drawingAttachmentId || `draw-${d.id}`;
      if (!seenIds.has(drawId)) {
        seenIds.add(drawId);
        items.push({
          id: drawId,
          name: `${d.title || 'رسم ذهني'} (تخطيط)`,
          type: 'image',
          mimeType: 'image/png',
          dateStr: dDate,
          thumbnailUrl: d.drawing.startsWith('data:') ? d.drawing : undefined,
          attachmentId: d.drawingAttachmentId
        });
      }
    }

    // Audio
    if (d.audioRecordings && Array.isArray(d.audioRecordings)) {
      d.audioRecordings.forEach((rec, idx) => {
        const aId = rec.attachmentId || rec.id || `audio-${d.id}-${idx}`;
        if (!seenIds.has(aId)) {
          seenIds.add(aId);
          items.push({
            id: aId,
            name: rec.name || `تسجيل صوتي #${idx + 1}`,
            type: 'audio',
            mimeType: rec.mimeType || 'audio/webm',
            dateStr: dDate,
            attachmentId: rec.attachmentId || rec.id
          });
        }
      });
    }

    // Files
    if (d.files && Array.isArray(d.files)) {
      d.files.forEach((file, idx) => {
        const fId = file.attachmentId || file.id || `file-${d.id}-${idx}`;
        if (!seenIds.has(fId)) {
          seenIds.add(fId);
          items.push({
            id: fId,
            name: file.name || `ملف #${idx + 1}`,
            type: 'file',
            mimeType: file.type || 'application/pdf',
            sizeFormatted: file.size,
            dateStr: dDate,
            attachmentId: file.attachmentId || file.id
          });
        }
      });
    }

    // Videos
    if (d.videos && Array.isArray(d.videos)) {
      d.videos.forEach((vid, idx) => {
        const vId = d.videoAttachmentIds && d.videoAttachmentIds[idx] ? d.videoAttachmentIds[idx] : `vid-${d.id}-${idx}`;
        if (!seenIds.has(vId)) {
          seenIds.add(vId);
          items.push({
            id: vId,
            name: `فيديو #${idx + 1}`,
            type: 'video',
            mimeType: 'video/mp4',
            dateStr: dDate,
            attachmentId: d.videoAttachmentIds && d.videoAttachmentIds[idx] ? d.videoAttachmentIds[idx] : undefined
          });
        }
      });
    }
  }

  return items;
}

/**
 * Encodes allowed binary attachments to inlineData parts, enforcing the 20MB payload limit.
 */
export async function encodePermittedMediaParts(
  attachments: Array<{ id?: string; attachmentId?: string; mimeType?: string; base64Data?: string; dataUrl?: string; fileUri?: string }>,
  permission: AIMediaAccessPermission = DEFAULT_AI_MEDIA_ACCESS,
  maxBytes: number = MAX_SAFE_PAYLOAD_BYTES
): Promise<{ parts: any[]; totalBytes: number; skippedOversized: boolean }> {
  if (permission.mode === 'text-only' || !attachments || attachments.length === 0) {
    return { parts: [], totalBytes: 0, skippedOversized: false };
  }

  const parts: any[] = [];
  let totalBytes = 0;
  let skippedOversized = false;

  for (const att of attachments) {
    if (!isAttachmentAllowed(att, permission)) {
      continue;
    }

    if (att.fileUri) {
      parts.push({
        fileData: {
          mimeType: att.mimeType || 'application/octet-stream',
          fileUri: att.fileUri
        }
      });
      continue;
    }

    let base64 = att.base64Data || '';
    let mime = att.mimeType || 'image/jpeg';

    if (!base64 && att.dataUrl && att.dataUrl.startsWith('data:')) {
      const segs = att.dataUrl.split(';base64,');
      if (segs.length === 2) {
        mime = segs[0].replace('data:', '') || mime;
        base64 = segs[1];
      }
    }

    if (!base64 && att.attachmentId) {
      try {
        const blob = await getAttachmentBlob(att.attachmentId);
        if (blob) {
          if (totalBytes + blob.size > maxBytes) {
            skippedOversized = true;
            continue;
          }
          mime = blob.type || mime;
          base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = (reader.result as string) || '';
              resolve(res.split(';base64,')[1] || '');
            };
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('[aiMediaAccess] Failed to read blob for', att.attachmentId, e);
      }
    }

    if (base64) {
      const estimatedBytes = Math.round((base64.length * 3) / 4);
      if (totalBytes + estimatedBytes > maxBytes) {
        skippedOversized = true;
        continue;
      }
      totalBytes += estimatedBytes;
      parts.push({
        inlineData: {
          mimeType: mime,
          data: base64
        }
      });
    }
  }

  return { parts, totalBytes, skippedOversized };
}
