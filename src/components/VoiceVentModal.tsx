import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  Square,
  Sparkles,
  RefreshCw,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Volume2,
  BookOpen,
  Music,
  Trash2,
  Edit3,
  Maximize2, Minimize2
} from 'lucide-react';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { saveAttachmentBlob } from '../lib/attachmentStore';
import { transcribeAudioWithGemini } from '../lib/gemini';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';
import { LiveAudioChunker } from '../lib/liveAudioChunker';
import { Capacitor } from '@capacitor/core';
import { AudioRecording, AppLanguage } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';

interface VoiceVentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: AppLanguage;
  onSaveAudioRecording: (rec: AudioRecording) => void;
  onAppendTextToContent: (text: string) => void;
}

/**
 * Detect the best supported MediaRecorder MIME type safely across Android WebView, iOS WebKit, and desktop browsers.
 */
function getBestSupportedAudioMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/aac'
  ];
  for (const candidate of candidateTypes) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Infer exact audio MIME type safely from file/blob metadata or filename extension.
 */
function inferAudioMimeType(file: Blob | File): string {
  if (file.type && file.type.startsWith('audio/')) {
    return file.type;
  }
  if ('name' in file && typeof (file as any).name === 'string') {
    const ext = (file as any).name.split('.').pop()?.toLowerCase();
    if (ext === 'mp3') return 'audio/mp3';
    if (ext === 'wav') return 'audio/wav';
    if (ext === 'm4a') return 'audio/m4a';
    if (ext === 'aac') return 'audio/aac';
    if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
    if (ext === 'webm') return 'audio/webm';
    if (ext === 'flac') return 'audio/flac';
    if (ext === 'opus') return 'audio/opus';
    if (ext === 'amr') return 'audio/amr';
    if (ext === '3gp' || ext === '3gpp') return 'audio/3gpp';
  }
  return file.type || 'audio/webm';
}

export default function VoiceVentModal({
  isOpen,
  onClose,
  appLanguage = 'ar',
  onSaveAudioRecording,
  onAppendTextToContent
}: VoiceVentModalProps) {
  const t = getTranslation(appLanguage);
  const langInfo = getLanguageInfo(appLanguage);
  const isAr = appLanguage === 'ar';

  useRegisterBackStep('modal_voice_vent', 'modal', isOpen, onClose, t.voiceQuickVent);

  // Step 1: Recording, Step 2: Review (Editable & Tone Analysis), Step 3: Saved Choices
  const [isFullscreen, setIsFullscreen] = useState(false);
  useRegisterBackStep('voice_vent_fullscreen', 'modal', isFullscreen, () => setIsFullscreen(false), isAr ? 'ملء الشاشة' : 'Fullscreen');
  const [modalStep, setModalStep] = useState<'recording' | 'review' | 'saved'>('recording');

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Live and Editable Transcripts
  const [liveTranscript, setLiveTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');

  // Audio blob and player
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string>('');

  // Vocal tone analysis state
  const [vocalTone, setVocalTone] = useState<AudioRecording['speechEmotion'] | null>(null);

  // Saved audio recording metadata
  const [savedRecording, setSavedRecording] = useState<AudioRecording | null>(null);
  const [isAppendedToDiary, setIsAppendedToDiary] = useState(false);

  // Capture Refs
  const isRecordingRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resolvedMimeTypeRef = useRef<string>('audio/webm');
  const intervalRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef<string>('');
  const fileFallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Live Audio Chunker for Android Capacitor & SpeechRecognition fallback
  const audioChunkerRef = useRef<LiveAudioChunker | null>(null);
  const chunkQueueRef = useRef<Blob[]>([]);
  const isProcessingChunkRef = useRef<boolean>(false);
  const hasReceivedSpeechRecognitionOutputRef = useRef<boolean>(false);
  const [isChunkTranscribing, setIsChunkTranscribing] = useState(false);

  // Native SpeechRecognition instance tracking for pause-safe auto-restarts
  const nativeSpeechRecRef = useRef<any>(null);
  const speechAccumulatedPrefixRef = useRef<string>('');

  // Error Details
  const [micErrorDetails, setMicErrorDetails] = useState<{
    friendly: string;
    technicalName?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      resetModalState();
      startRecording();
    } else {
      stopRecordingInternal();
      cleanupBlobUrl();
    }
    return () => {
      stopRecordingInternal();
      cleanupBlobUrl();
    };
  }, [isOpen]);

  const cleanupBlobUrl = () => {
    if (audioBlobUrl) {
      try {
        URL.revokeObjectURL(audioBlobUrl);
      } catch (_) {}
    }
  };

  const resetModalState = () => {
    setModalStep('recording');
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsTranscribing(false);
    setIsChunkTranscribing(false);
    setRecordingSeconds(0);
    setLiveTranscript('');
    setEditableTranscript('');
    setCurrentAudioBlob(null);
    cleanupBlobUrl();
    setAudioBlobUrl('');
    setVocalTone(null);
    setSavedRecording(null);
    setIsAppendedToDiary(false);
    setMicErrorDetails(null);
    audioChunksRef.current = [];
    liveTranscriptRef.current = '';
    speechAccumulatedPrefixRef.current = '';
    chunkQueueRef.current = [];
    isProcessingChunkRef.current = false;
    hasReceivedSpeechRecognitionOutputRef.current = false;
  };

  /**
   * Helper to convert an Audio Blob to Base64 data URL safely
   */
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to read audio blob as Base64'));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Sequential queue worker for audio chunk transcription
   */
  const processNextChunkInQueue = async () => {
    if (isProcessingChunkRef.current || chunkQueueRef.current.length === 0) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Offline: do not waste network calls
      return;
    }

    isProcessingChunkRef.current = true;
    setIsChunkTranscribing(true);

    const chunkBlob = chunkQueueRef.current.shift();
    if (!chunkBlob) {
      isProcessingChunkRef.current = false;
      setIsChunkTranscribing(false);
      return;
    }

    try {
      const base64Wav = await convertBlobToBase64(chunkBlob);
      const text = await transcribeAudioWithGemini(
        base64Wav,
        'audio/wav',
        undefined,
        appLanguage
      );

      if (
        text &&
        !text.includes('__AI_CHECK_API_KEY__') &&
        !text.includes('RESOURCE_EXHAUSTED') &&
        !text.includes('وضع المعالجة الصوتية')
      ) {
        const cleaned = text.trim();
        if (cleaned) {
          const currentText = liveTranscriptRef.current;
          const nextText = currentText ? `${currentText} ${cleaned}` : cleaned;
          liveTranscriptRef.current = nextText;
          setLiveTranscript(nextText);
        }
      }
    } catch (err) {
      console.warn('[VoiceVent] Chunk transcription error (non-fatal):', err);
    } finally {
      isProcessingChunkRef.current = false;
      setIsChunkTranscribing(chunkQueueRef.current.length > 0);
      if (chunkQueueRef.current.length > 0) {
        processNextChunkInQueue();
      }
    }
  };

  /**
   * Starts the 16kHz audio chunker on the exact active stream
   */
  const startAudioChunker = (stream: MediaStream) => {
    try {
      if (audioChunkerRef.current) {
        audioChunkerRef.current.stop();
        audioChunkerRef.current = null;
      }

      const chunker = new LiveAudioChunker({
        chunkDurationMs: 4000,
        energyThreshold: 0.010,
        onChunkReady: (wavBlob) => {
          // If native speech recognition is producing output, skip sending chunks to save API quota
          if (hasReceivedSpeechRecognitionOutputRef.current) {
            return;
          }
          chunkQueueRef.current.push(wavBlob);
          processNextChunkInQueue();
        }
      });

      const started = chunker.start(stream);
      if (started) {
        audioChunkerRef.current = chunker;
      }
    } catch (err) {
      console.warn('[VoiceVent] startAudioChunker error:', err);
    }
  };

  /**
   * Native SpeechRecognition parallel runner with pause-safe auto-restart
   */
  const startParallelSpeechRecognition = () => {
    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechClass) {
        // Fallback silently if unsupported in Android WebView
        return;
      }

      // Cleanup any existing instance
      if (nativeSpeechRecRef.current) {
        try {
          nativeSpeechRecRef.current.onend = null;
          nativeSpeechRecRef.current.onerror = null;
          nativeSpeechRecRef.current.abort();
        } catch (_) {}
        nativeSpeechRecRef.current = null;
      }

      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = langInfo.speechLang || (isAr ? 'ar-EG' : 'en-US');

      let currentSessionFinal = '';

      recognition.onresult = (event: any) => {
        let interim = '';
        let newlyFinalized = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            newlyFinalized += text + ' ';
          } else {
            interim += text;
          }
        }

        if (newlyFinalized) {
          currentSessionFinal += newlyFinalized;
        }

        const fullSpoken = (speechAccumulatedPrefixRef.current + ' ' + currentSessionFinal + ' ' + interim).trim();
        if (fullSpoken) {
          hasReceivedSpeechRecognitionOutputRef.current = true;
          liveTranscriptRef.current = fullSpoken;
          setLiveTranscript(fullSpoken);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceVent] SpeechRecognition notice (non-fatal):', event?.error);
      };

      // Pause-safe auto-restart: keeps recognition alive across natural pauses as long as user is recording
      recognition.onend = () => {
        // Commit current session finals to accumulated prefix
        if (currentSessionFinal.trim()) {
          speechAccumulatedPrefixRef.current = (speechAccumulatedPrefixRef.current + ' ' + currentSessionFinal).trim();
          currentSessionFinal = '';
        }

        if (isRecordingRef.current) {
          // User is still speaking; restart recognition automatically
          try {
            recognition.start();
          } catch (_) {
            // If already restarting or hardware busy, retry after short backoff
            setTimeout(() => {
              if (isRecordingRef.current) {
                try {
                  recognition.start();
                } catch (_) {}
              }
            }, 150);
          }
        }
      };

      nativeSpeechRecRef.current = recognition;
      recognition.start();
    } catch (speechErr) {
      console.warn('[VoiceVent] WebSpeech parallel runner unavailable or bypassed:', speechErr);
    }
  };

  const startRecording = async () => {
    resetModalState();

    // Release any previous tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

    // 1. Acquire audio stream with Android WebView resilient fallbacks
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('navigator.mediaDevices.getUserMedia is not supported');
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (firstErr: any) {
        const firstErrName = firstErr?.name || '';
        if (firstErrName === 'NotReadableError' || firstErrName === 'TrackStartError' || firstErrName === 'AbortError') {
          await new Promise((r) => setTimeout(r, 250));
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false
            }
          });
        } else {
          throw firstErr;
        }
      }
      mediaStreamRef.current = stream;
    } catch (err: any) {
      const errorName = err?.name || 'PermissionError';
      console.warn('[VoiceVent] getUserMedia error:', errorName, err);

      let friendlyMsg = t.micAccessErrorPermission || (isAr
        ? 'يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح أو التطبيق.'
        : 'Please grant microphone permission to record your voice vent.');

      if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        friendlyMsg = isAr ? 'لم يتم العثور على ميكروفون متصل بالجهاز.' : 'No microphone device found on this system.';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        friendlyMsg = isAr
          ? 'الميكروفون قيد الاستخدام حالياً بواسطة تطبيق آخر أو تعذر فتح مسار الصوت. يمكنك استخدام خيار اختيار ملف صوتي أدناه.'
          : 'Microphone is currently in use by another app. You can pick an audio file below.';
      }

      setMicErrorDetails({
        friendly: friendlyMsg,
        technicalName: `${errorName}${err.message ? `: ${err.message}` : ''}`
      });
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

    // 2. Initialize MediaRecorder: continuous, UNLIMITED recording until explicit Stop
    try {
      const bestMime = getBestSupportedAudioMimeType();
      const options: MediaRecorderOptions = bestMime ? { mimeType: bestMime } : {};
      const mediaRecorder = options.mimeType ? new MediaRecorder(stream, options) : new MediaRecorder(stream);

      resolvedMimeTypeRef.current = mediaRecorder.mimeType || bestMime || 'audio/webm';
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingSeconds(0);

      // Start elapsed timer
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (mrErr: any) {
      console.warn('[VoiceVent] MediaRecorder start issue:', mrErr);
      setMicErrorDetails({
        friendly: isAr ? 'تعذر تشغيل مسجل الصوت على هذا المتصفح.' : 'Failed to start audio recorder.',
        technicalName: String(mrErr?.name || mrErr?.message || mrErr)
      });
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

    // 3. Start parallel live transcription:
    // On native Capacitor, WebSpeech is unreliable/unavailable, so audioChunker provides direct live Gemini streaming.
    // On desktop web, WebSpeech runs first; if no output within 3 seconds, audioChunker acts as transparent fallback.
    const isCapacitorNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    if (!isCapacitorNative) {
      startParallelSpeechRecognition();
    }

    startAudioChunker(stream);
  };

  const stopRecordingInternal = (): string => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Teardown live audio chunker and flush remaining tail audio
    if (audioChunkerRef.current) {
      try {
        audioChunkerRef.current.stop();
      } catch (_) {}
      audioChunkerRef.current = null;
    }
    setIsChunkTranscribing(false);

    // Teardown native speech recognition
    if (nativeSpeechRecRef.current) {
      try {
        nativeSpeechRecRef.current.onend = null;
        nativeSpeechRecRef.current.onerror = null;
        nativeSpeechRecRef.current.stop();
      } catch (_) {}
      nativeSpeechRecRef.current = null;
    }

    // Also stop SpeechRecognitionManager singleton if running
    try {
      SpeechRecognitionManager.getInstance().finalize();
    } catch (_) {}

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    // Stop all audio tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

    return (liveTranscriptRef.current || liveTranscript).trim();
  };

  /**
   * Action: User taps Stop (إيقاف) -> stop recording, build blob, run Gemini transcription & tone analysis, transition to Review Step
   */
  const handleStopAndReview = async () => {
    const rawSpoken = stopRecordingInternal();

    // Small delay to allow MediaRecorder to emit final audio slice
    await new Promise((r) => setTimeout(r, 140));

    let audioBlob: Blob;
    if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, {
        type: resolvedMimeTypeRef.current || 'audio/webm'
      });
    } else {
      audioBlob = new Blob([], { type: resolvedMimeTypeRef.current || 'audio/webm' });
    }

    setCurrentAudioBlob(audioBlob);
    const newBlobUrl = URL.createObjectURL(audioBlob);
    setAudioBlobUrl(newBlobUrl);

    // Initial editable transcript
    let currentBestText = rawSpoken;
    setEditableTranscript(currentBestText);
    setModalStep('review');

    // Run Gemini Multimodal Audio Transcription & Vocal Tone / Emotion Analysis
    if (audioBlob.size > 0) {
      setIsTranscribing(true);
      try {
        const base64Audio = await convertBlobToBase64(audioBlob);
        const mime = inferAudioMimeType(audioBlob) || resolvedMimeTypeRef.current || 'audio/webm';

        // 1. Direct audio-to-text transcription via Gemini: verbatim Egyptian Arabic/MSA/English/mixed speech.
        const aiTranscription = await transcribeAudioWithGemini(
          base64Audio,
          mime,
          undefined,
          appLanguage
        );

        if (
          aiTranscription &&
          !aiTranscription.includes('__AI_CHECK_API_KEY__') &&
          !aiTranscription.includes('RESOURCE_EXHAUSTED') &&
          !aiTranscription.includes('وضع المعالجة الصوتية')
        ) {
          currentBestText = aiTranscription.trim();
          setEditableTranscript(currentBestText);
        }

        // 2. Multimodal vocal tone and speech emotion analysis
        try {
          const res = await fetch('/api/gemini/transcribe-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-app-language': appLanguage
            },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: mime,
              fileName: 'voice-vent.webm',
              appLanguage: appLanguage
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.speechEmotion) {
              setVocalTone(data.speechEmotion);
            }
          }
        } catch (toneErr) {
          console.warn('[VoiceVent] Tone analysis endpoint fallback:', toneErr);
        }
      } catch (aiErr) {
        console.warn('[VoiceVent] AI transcription error:', aiErr);
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  /**
   * Action: User taps Save (حفظ) in Review step -> Persists blob into IndexedDB and attachments
   */
  const handleSaveToAttachments = async () => {
    if (!currentAudioBlob) return;

    const mime = inferAudioMimeType(currentAudioBlob) || resolvedMimeTypeRef.current || 'audio/webm';
    const attachmentId = `att-vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const recId = `rec-vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Durably save blob into IndexedDB
    await saveAttachmentBlob(attachmentId, currentAudioBlob, mime);

    const displayName = ('name' in currentAudioBlob && typeof (currentAudioBlob as any).name === 'string' && (currentAudioBlob as any).name)
      ? (currentAudioBlob as any).name
      : `${t.voiceQuickVent || (isAr ? 'فضفضة صوتية' : 'Voice Vent')} (${new Date().toLocaleTimeString(langInfo.bcp47 || 'ar-SA', { hour: '2-digit', minute: '2-digit' })})`;

    const finalText = editableTranscript.trim() || (isAr ? 'تسجيل فضفضة صوتية' : 'Voice vent recording');

    const newRec: AudioRecording = {
      id: recId,
      name: displayName,
      dataUrl: audioBlobUrl,
      blobUrl: audioBlobUrl,
      duration: Math.max(recordingSeconds, 1),
      mimeType: mime,
      transcription: finalText,
      attachmentId,
      speechEmotion: vocalTone || {
        primaryEmotion: isAr ? 'طبيعي' : 'normal',
        intensity: isAr ? 'متوسطة' : 'medium',
        intensityScore: 70,
        vocalToneDetails: isAr ? 'نبرة صوت هادئة ومستقرة' : 'Calm and steady vocal tone',
        recommendedColor: 'teal'
      }
    };

    setSavedRecording(newRec);
    onSaveAudioRecording(newRec);
    setModalStep('saved');
  };

  /**
   * Action: Choice 1 -> Insert transcript into Diary editor
   */
  const handleInsertIntoDiary = () => {
    const textToInsert = editableTranscript.trim();
    if (textToInsert && !isAppendedToDiary) {
      onAppendTextToContent(textToInsert);
      setIsAppendedToDiary(true);
    }
    // Close modal cleanly after user choice
    setTimeout(() => {
      onClose();
    }, 400);
  };

  /**
   * Action: Choice 2 -> Keep as audio attachment only and close
   */
  const handleKeepAsAudioOnly = () => {
    onClose();
  };

  /**
   * Fallback file picker for restricted environments
   */
  const handleAudioFileFallbackChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      stopRecordingInternal();
      const detectedMime = inferAudioMimeType(file);
      resolvedMimeTypeRef.current = detectedMime;
      setCurrentAudioBlob(file);
      cleanupBlobUrl();
      const newBlobUrl = URL.createObjectURL(file);
      setAudioBlobUrl(newBlobUrl);
      setRecordingSeconds(0);
      setMicErrorDetails(null);
      setModalStep('review');
      setIsTranscribing(true);

      const base64Audio = await convertBlobToBase64(file);
      const aiTranscription = await transcribeAudioWithGemini(
        base64Audio,
        detectedMime,
        undefined,
        appLanguage
      );
      if (aiTranscription && !aiTranscription.includes('__AI_CHECK_API_KEY__')) {
        setEditableTranscript(aiTranscription.trim());
      }
    } catch (fallbackErr) {
      console.error('[VoiceVent] File fallback failed:', fallbackErr);
    } finally {
      setIsTranscribing(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  const ventTitle = modalStep === 'recording'
    ? (t.voiceQuickVent || (isAr ? 'فضفضة صوتية غير محدودة' : 'Continuous Voice Vent'))
    : modalStep === 'review'
    ? (t.voiceVentReviewTitle || (isAr ? 'مراجعة وتأكيد الفضفضة الصوتية' : 'Review & Confirm Voice Vent'))
    : (t.voiceVentSavedSuccess || (isAr ? 'تم حفظ المرفق الصوتي' : 'Saved Audio Attachment'));

  const ventSubtitle = modalStep === 'recording'
    ? (isAr ? 'سجل بحرية دون توقف تلقائي... يتوقف فقط عند نقر إيقاف' : 'Speak continuously without timeouts; stops only on tapping stop')
    : modalStep === 'review'
    ? (isAr ? 'استمع للتسجيل، عدل النص، واحفظ المرفق بأمان' : 'Listen, edit transcript, and save attachment securely')
    : (isAr ? 'اختر إضافة النص إلى اليوميات أو الإبقاء عليه كمرفق صوتي' : 'Choose to add to diary or keep as audio attachment only');

  return (
    <div
      className={`${isFullscreen ? 'fixed inset-0 z-[125] p-0' : 'fixed inset-0 z-[125] p-0 sm:p-4'} bg-black/60 backdrop-blur-sm flex items-center justify-center overflow-y-auto animate-fadeIn`}
      dir={langInfo.dir}
    >
      <div className={`${isFullscreen ? 'rounded-none max-w-none h-[100dvh]' : 'rounded-none sm:rounded-3xl max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh]'} bg-white border-0 sm:border sm:border-[#E2DCC8] w-full shadow-2xl overflow-hidden flex flex-col`}>
        <button type="button" data-compact-control="true" onClick={() => setIsFullscreen(v => !v)} className="absolute top-3 end-3 z-30 p-1.5 rounded-lg bg-white/90 border border-[#E2DCC8] text-[#2D6A4F]" aria-label={isFullscreen ? (isAr ? 'استعادة' : 'Restore') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={ventTitle}
          subtitle={ventSubtitle}
          icon={
            <div
              className={`p-1.5 rounded-xl ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : modalStep === 'saved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {modalStep === 'saved' ? <CheckCircle2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </div>
          }
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="rose"
        />

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* STEP 1: RECORDING VIEW */}
          {modalStep === 'recording' && (
            <>
              {/* Status & Timer Banner */}
              <div className="p-4 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                    </span>
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  )}
                  <span className="font-extrabold text-xs text-[#3A3A3A]">
                    {isRecording
                      ? (isAr ? 'جاري التسجيل الصوتي المباشر دون قيود...' : 'Continuous recording in progress...')
                      : (isAr ? 'جاهز للتسجيل' : 'Ready to record')}
                  </span>
                </div>

                <div className="font-mono font-black text-xs px-3 py-1 bg-white border border-[#E2DCC8] rounded-full text-red-700 shadow-3xs">
                  ⏱️ {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>

              {/* Live Speech Recognition Transcript Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                    <span>{t.liveTranscription || (isAr ? 'التفريغ والنص الحي المباشر:' : 'Live Transcript:')}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isChunkTranscribing && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span>{isAr ? 'يتم التفريغ المباشر...' : 'Transcribing live...'}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-bold">
                      {isAr ? 'تحديث تلقائي مستمر' : 'Continuous live updates'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white border border-[#E2DCC8] rounded-2xl min-h-[140px] max-h-56 overflow-y-auto shadow-inner text-xs leading-relaxed text-[#3A3A3A] font-medium whitespace-pre-wrap select-text">
                  {liveTranscript ? (
                    <p className="leading-loose text-xs sm:text-sm text-[#2B3E50]">
                      {liveTranscript}
                    </p>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-6 text-center text-gray-400 space-y-1.5">
                      <Mic className="w-6 h-6 text-red-300 animate-pulse" />
                      <p className="text-xs font-semibold">
                        {isAr
                          ? 'تحدث بحرية... خذ وقتك وتنفس براحة، فالتسجيل مستمر دون انقطاع.'
                          : 'Speak freely... Take pauses and breathe comfortably; recording continues uninterrupted.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* STEP 2: REVIEW & SAVE STEP */}
          {modalStep === 'review' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Audio Playback Player */}
              {audioBlobUrl && (
                <div className="p-3.5 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#3A3A3A]">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-600" />
                      <span>{isAr ? 'معاينة التسجيل الصوتي' : 'Audio Playback'}</span>
                    </span>
                    <span className="font-mono text-[11px] text-gray-500">
                      {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <audio controls className="w-full h-10 rounded-lg outline-none" src={audioBlobUrl} />
                </div>
              )}

              {/* Editable Transcript Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#8B9D83]" />
                    <span>{isAr ? 'النص المفرغ (يمكنك تعديله قبل الحفظ):' : 'Transcript (editable):'}</span>
                  </span>
                  {isTranscribing && (
                    <span className="text-[10px] text-[#8B9D83] font-bold flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{isAr ? 'جاري تحسين النص عبر Gemini...' : 'Refining via Gemini...'}</span>
                    </span>
                  )}
                </div>

                <textarea
                  value={editableTranscript}
                  onChange={(e) => setEditableTranscript(e.target.value)}
                  placeholder={isAr ? 'اكتب أو عدل التفريغ النصي هنا...' : 'Edit transcript here...'}
                  rows={4}
                  className="w-full p-3.5 bg-white border border-[#E2DCC8] rounded-2xl text-xs sm:text-sm leading-relaxed text-[#2B3E50] focus:ring-2 focus:ring-[#8B9D83] focus:border-transparent outline-none resize-none shadow-inner"
                />
              </div>

              {/* Vocal Tone & Emotion Analysis Card */}
              {vocalTone && (
                <div className="p-3.5 bg-gradient-to-r from-teal-50/80 to-emerald-50/80 border border-teal-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-teal-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>{t.voiceVentToneAnalysisTitle || (isAr ? 'تحليل نبرة الصوت والمشاعر (Gemini AI):' : 'Vocal Tone Analysis (Gemini AI):')}</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      {vocalTone.primaryEmotion || (isAr ? 'طبيعي' : 'Normal')} ({vocalTone.intensityScore || 70}%)
                    </span>
                  </div>
                  {vocalTone.vocalToneDetails && (
                    <p className="text-[11px] text-teal-800 font-medium leading-relaxed">
                      {vocalTone.vocalToneDetails}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: POST-SAVE CHOICE CONTROLS */}
          {modalStep === 'saved' && (
            <div className="py-4 space-y-4 animate-fadeIn text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-sm text-[#3A3A3A]">
                  {t.voiceVentSavedSuccess || (isAr ? 'تم حفظ التسجيل والمرفق الصوتي بنجاح 🎉' : 'Audio recording saved successfully 🎉')}
                </h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                  {t.voiceVentPostSaveNotice || (isAr
                    ? 'تم حفظ التسجيل في المرفقات الصوتية بأمان. اختر كيف تود المتابعة:'
                    : 'The recording has been safely saved in audio attachments. Choose how to proceed:')}
                </p>
              </div>

              {editableTranscript && (
                <div className="p-3 bg-[#F9F7F2] border border-[#E2DCC8] rounded-xl text-start max-h-28 overflow-y-auto text-xs text-gray-700">
                  <span className="font-bold block text-[10px] text-gray-500 mb-0.5">
                    {isAr ? 'معاينة النص المحفوظ:' : 'Saved transcript preview:'}
                  </span>
                  <p className="line-clamp-3">{editableTranscript}</p>
                </div>
              )}
            </div>
          )}

          {/* Microphone Access Error Notification */}
          {micErrorDetails && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-black text-xs text-red-900">
                    {t.micAccessErrorTitle || (isAr ? 'تعذر الوصول إلى الميكروفون' : 'Microphone Access Denied')}
                  </h4>
                  <p className="text-[11px] font-medium text-red-700 mt-0.5 leading-relaxed">
                    {micErrorDetails.friendly}
                  </p>
                  {micErrorDetails.technicalName && (
                    <span className="inline-block mt-1 text-[10px] font-mono text-red-500 bg-red-100/60 px-1.5 py-0.5 rounded">
                      {micErrorDetails.technicalName}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-red-200/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => startRecording()}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[11px] font-black hover:bg-red-700 cursor-pointer shadow-3xs"
                >
                  {t.retry || (isAr ? 'إعادة المحاولة' : 'Retry')}
                </button>

                <button
                  type="button"
                  onClick={() => fileFallbackInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white text-gray-800 border border-red-300 hover:bg-red-50 rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-3xs"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-600" />
                  <span>{t.micPickAudioFallback || (isAr ? 'اختيار ملف صوتي من الجهاز' : 'Choose Audio File')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Picker */}
          <input
            ref={fileFallbackInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioFileFallbackChange}
            className="hidden"
          />

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[#E2DCC8]/70">
            {/* Step 1: Recording Controls */}
            {modalStep === 'recording' && isRecording && (
              <button
                type="button"
                onClick={handleStopAndReview}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 space-x-reverse"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>{isAr ? 'إيقاف ومراجعة التسجيل' : 'Stop & Review Recording'}</span>
              </button>
            )}

            {modalStep === 'recording' && !isRecording && (
              <div className="w-full flex gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 space-x-reverse"
                >
                  <Mic className="w-4 h-4" />
                  <span>{t.startRecording || (isAr ? 'بدء التسجيل الآن' : 'Start Recording Now')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileFallbackInputRef.current?.click()}
                  className="py-3 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  title={t.micPickAudioFallback || (isAr ? 'اختيار ملف صوتي من الجهاز' : 'Choose Audio File')}
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Review Controls -> Save or Re-record */}
            {modalStep === 'review' && (
              <div className="w-full flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 py-3 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.voiceVentDiscardBtn || (isAr ? 'تجاهل وإعادة التسجيل' : 'Discard & Re-record')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToAttachments}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.voiceVentSaveAndAnalyzeBtn || (isAr ? 'حفظ المرفق الصوتي' : 'Save Audio Attachment')}</span>
                </button>
              </div>
            )}

            {/* Step 3: Explicit Post-Save Choice Buttons */}
            {modalStep === 'saved' && (
              <div className="w-full flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleInsertIntoDiary}
                  className="w-full py-3.5 px-4 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t.voiceVentAddToDiaryBtn || (isAr ? 'إضافة إلى اليوميات' : 'Add to Diary')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleKeepAsAudioOnly}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Music className="w-4 h-4" />
                  <span>{t.voiceVentKeepAudioOnlyBtn || (isAr ? 'حفظ كمرفق صوتي فقط / إغلاق' : 'Keep as Audio Only / Close')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
