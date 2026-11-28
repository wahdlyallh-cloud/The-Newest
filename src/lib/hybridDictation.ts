import { hasValidGeminiKey, transcribeAudioBlobWithGemini } from './gemini';

const PREFERRED_AUDIO_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];

export function preferredAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return PREFERRED_AUDIO_MIMES.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
}

export async function startHybridAudioCapture(): Promise<MediaRecorder> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Audio recording is unavailable');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    const mimeType = preferredAudioMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.start();
    return recorder;
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    throw error;
  }
}

export function stopHybridAudioCapture(recorder: MediaRecorder | null): Promise<Blob | null> {
  if (!recorder) return Promise.resolve(null);
  return new Promise(resolve => {
    const finish = () => {
      const blob = recorder.state === 'inactive' ? null : new Blob([], { type: recorder.mimeType });
      recorder.stream.getTracks().forEach(track => track.stop());
      resolve(blob);
    };
    if (recorder.state === 'inactive') {
      recorder.stream.getTracks().forEach(track => track.stop());
      resolve(null);
      return;
    }
    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', event => { if (event.data?.size) chunks.push(event.data); });
    recorder.addEventListener('stop', () => {
      recorder.stream.getTracks().forEach(track => track.stop());
      resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType || chunks[0].type }) : null);
    }, { once: true });
    try { recorder.stop(); } catch { finish(); }
  });
}

export async function transcribeHybridAudio(blob: Blob | null, key?: string, language = 'ar'): Promise<string> {
  if (!blob?.size || !hasValidGeminiKey(key) || typeof navigator !== 'undefined' && !navigator.onLine) return '';
  try {
    const text = await transcribeAudioBlobWithGemini(blob, key, language);
    return text && !text.includes('__AI_CHECK_API_KEY__') && !text.includes('API key') ? text.trim() : '';
  } catch (error) {
    console.warn('[hybrid-dictation] Gemini transcription unavailable; using Web Speech transcript.', error);
    return '';
  }
}
