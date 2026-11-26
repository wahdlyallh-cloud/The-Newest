import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Square,
  Save,
  RefreshCw,
  Activity,
  Clock,
  ChevronRight,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { DiaryEntry, JournalEntryType, AudioRecording } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import {
  ALL_JOURNAL_TYPES,
  JOURNAL_TYPES_CONFIG,
  getJournalTypeConfig,
  getJournalTypeLabel,
  getJournalTypeDescription
} from '../lib/journalTypes';
import { generateGeminiContentDirect, transcribeAudioWithGemini } from '../lib/gemini';
import { saveAttachmentBlob } from '../lib/attachmentStore';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';
import { LiveAudioChunker } from '../lib/liveAudioChunker';
import { Capacitor } from '@capacitor/core';

interface AIVoiceJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDiary: (entry: Partial<DiaryEntry>) => Promise<void> | void;
  appLanguage?: AppLanguage;
  apiKey?: string;
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

export default function AIVoiceJournalModal({
  isOpen,
  onClose,
  onSaveDiary,
  appLanguage = 'ar',
  apiKey = ''
}: AIVoiceJournalModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChunkTranscribing, setIsChunkTranscribing] = useState(false);

  const [processedResult, setProcessedResult] = useState<{
    title: string;
    content: string;
    rawTranscript: string;
    moods: string[];
    sleepHours?: number;
    sportsDuration?: number;
  } | null>(null);

  const isRecordingRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resolvedMimeTypeRef = useRef<string>('audio/webm');
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingEndTimeRef = useRef<number | null>(null);

  // Live Audio Chunker for Android WebView zero-mic-conflict sequential speech streaming
  const audioChunkerRef = useRef<LiveAudioChunker | null>(null);
  const chunkQueueRef = useRef<Blob[]>([]);
  const isProcessingChunkRef = useRef<boolean>(false);
  const hasReceivedSpeechRecognitionOutputRef = useRef<boolean>(false);

  // Desktop SpeechRecognition instance tracking for auto-restarting
  const nativeSpeechRecRef = useRef<any>(null);
  const speechAccumulatedPrefixRef = useRef<string>('');

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isAr = (appLanguage || 'ar') === 'ar';

  useRegisterBackStep('modal_ai_voice_journal', 'modal', isOpen, onClose, t.voiceJournalTitle);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingInternal();
      setTranscript('');
      transcriptRef.current = '';
      setRecordingSeconds(0);
      setProcessedResult(null);
      setShowCategoryPicker(false);
      setIsSaving(false);
      setMicPermissionError(null);
      audioChunksRef.current = [];
      recordingStartTimeRef.current = null;
      recordingEndTimeRef.current = null;
      chunkQueueRef.current = [];
      isProcessingChunkRef.current = false;
      hasReceivedSpeechRecognitionOutputRef.current = false;
      speechAccumulatedPrefixRef.current = '';
    }
  }, [isOpen]);

  /**
   * Helper to convert an Audio Blob to Base64 safely
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
   * Sequential worker for processing live audio WAV chunks via Gemini
   */
  const processNextChunkInQueue = async () => {
    if (isProcessingChunkRef.current || chunkQueueRef.current.length === 0) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
        apiKey,
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
          const currentText = transcriptRef.current;
          const nextText = currentText ? `${currentText} ${cleaned}` : cleaned;
          transcriptRef.current = nextText;
          setTranscript(nextText);
        }
      }
    } catch (err) {
      console.warn('[AIVoiceJournal] Live chunk transcription note (non-fatal):', err);
    } finally {
      isProcessingChunkRef.current = false;
      setIsChunkTranscribing(chunkQueueRef.current.length > 0);
      if (chunkQueueRef.current.length > 0) {
        processNextChunkInQueue();
      }
    }
  };

  /**
   * Starts the 16kHz audio chunker on the exact active stream without mic collisions
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
      console.warn('[AIVoiceJournal] startAudioChunker error:', err);
    }
  };

  /**
   * Desktop browser SpeechRecognition runner with auto-restart across pauses
   */
  const startParallelSpeechRecognition = () => {
    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechClass) return;

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
          transcriptRef.current = fullSpoken;
          setTranscript(fullSpoken);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[AIVoiceJournal] SpeechRecognition non-fatal event:', event?.error);
      };

      recognition.onend = () => {
        if (currentSessionFinal.trim()) {
          speechAccumulatedPrefixRef.current = (speechAccumulatedPrefixRef.current + ' ' + currentSessionFinal).trim();
          currentSessionFinal = '';
        }

        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch (_) {
            setTimeout(() => {
              if (isRecordingRef.current) {
                try { recognition.start(); } catch (_) {}
              }
            }, 150);
          }
        }
      };

      nativeSpeechRecRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('[AIVoiceJournal] SpeechRecognition unavailable:', e);
    }
  };

  const stopRecordingInternal = (): string => {
    isRecordingRef.current = false;
    setIsRecording(false);
    recordingEndTimeRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioChunkerRef.current) {
      try {
        audioChunkerRef.current.stop();
      } catch (_) {}
      audioChunkerRef.current = null;
    }
    setIsChunkTranscribing(false);

    if (nativeSpeechRecRef.current) {
      try {
        nativeSpeechRecRef.current.onend = null;
        nativeSpeechRecRef.current.onerror = null;
        nativeSpeechRecRef.current.stop();
      } catch (_) {}
      nativeSpeechRecRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

    return (transcriptRef.current || transcript).trim();
  };

  const startRecording = async () => {
    // Reset state
    setTranscript('');
    transcriptRef.current = '';
    setProcessedResult(null);
    setShowCategoryPicker(false);
    setMicPermissionError(null);
    audioChunksRef.current = [];
    recordingStartTimeRef.current = Date.now();
    recordingEndTimeRef.current = null;
    chunkQueueRef.current = [];
    isProcessingChunkRef.current = false;
    hasReceivedSpeechRecognitionOutputRef.current = false;
    speechAccumulatedPrefixRef.current = '';

    // Release any previous tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

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
      console.warn('[AIVoiceJournal] getUserMedia error:', err);
      setMicPermissionError(t.micPermissionDenied);
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

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

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (mrErr: any) {
      console.warn('[AIVoiceJournal] MediaRecorder start issue:', mrErr);
      setMicPermissionError(t.speechNotSupported);
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

    // Parallel Speech Engine: Capacitor native uses AudioChunker streaming; Desktop web runs WebSpeech first
    const isCapacitorNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    if (!isCapacitorNative) {
      startParallelSpeechRecognition();
    }

    startAudioChunker(stream);
  };

  const handleAnalyzeAudio = async () => {
    const rawSpeechText = stopRecordingInternal();
    setIsAnalyzing(true);

    // Wait slightly for MediaRecorder stop flush
    await new Promise(r => setTimeout(r, 140));

    let audioBlob: Blob;
    if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, {
        type: resolvedMimeTypeRef.current || 'audio/webm'
      });
    } else {
      audioBlob = new Blob([], { type: resolvedMimeTypeRef.current || 'audio/webm' });
    }

    let finalSpokenText = rawSpeechText;

    // If live text was sparse but we have full recorded audio, run full Gemini multimodal transcription
    if ((!finalSpokenText || finalSpokenText.length < 5) && audioBlob.size > 0) {
      try {
        const base64Audio = await convertBlobToBase64(audioBlob);
        const fullTranscription = await transcribeAudioWithGemini(
          base64Audio,
          resolvedMimeTypeRef.current || 'audio/webm',
          apiKey,
          appLanguage
        );
        if (
          fullTranscription &&
          !fullTranscription.includes('__AI_CHECK_API_KEY__') &&
          !fullTranscription.includes('RESOURCE_EXHAUSTED') &&
          !fullTranscription.includes('وضع المعالجة الصوتية')
        ) {
          finalSpokenText = fullTranscription.trim();
          transcriptRef.current = finalSpokenText;
          setTranscript(finalSpokenText);
        }
      } catch (gemErr) {
        console.warn('[AIVoiceJournal] Post-stop full audio transcription error:', gemErr);
      }
    }

    if (!finalSpokenText) {
      setMicPermissionError(t.noSpeechDetected);
      setIsAnalyzing(false);
      return;
    }

    try {
      const now = new Date();
      const dayName = now.toLocaleDateString(langInfo.code === 'ar' ? 'ar-EG' : langInfo.bcp47, { weekday: 'long' });
      const timeStr = now.toLocaleTimeString(langInfo.code === 'ar' ? 'ar-EG' : langInfo.bcp47, { hour: '2-digit', minute: '2-digit' });

      const analysisPrompt = `أولاً، اعتبر النص المرفق تفريغاً حرفياً عالي الدقة: لا تحذف أو تلخص أو تعيد صياغة أي كلمة، وادعم العربية المصرية والعربية الفصحى والإنجليزية والكلام المختلط مع علامات ترقيم طبيعية. نسّق هذه المذكرة بلغة المتحدث مع الحفاظ الكامل على معناها وكلماتها الحقيقية، ثم استخرج المشاعر والحالة المزاجية دون اختلاق أي معلومات:

"""
${finalSpokenText}
"""

Return pure JSON only in the following schema:
{
  "title": "عنوان معبر للمذكرة",
  "content": "النص المنسق بدقة...",
  "moods": ["مرتاح", "منجز"],
  "sleepHours": null,
  "sportsDuration": null
}`;

      let aiResultText = '';
      try {
        aiResultText = await generateGeminiContentDirect(analysisPrompt, undefined, apiKey, undefined, appLanguage);
      } catch (aiErr) {
        console.warn('Gemini post-processing note (preserving raw transcript):', aiErr);
      }

      let parsed: any = null;
      if (aiResultText && aiResultText.trim()) {
        try {
          const jsonMatch = aiResultText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch (_) {}
      }

      const finalTitle = parsed?.title || `${t.voiceJournalTitle} - ${dayName} ${timeStr}`;
      const finalCleanContent = parsed?.content || finalSpokenText;
      const finalMoods = Array.isArray(parsed?.moods) && parsed.moods.length > 0
        ? parsed.moods
        : [t.mood_calm, t.mood_productive];

      setProcessedResult({
        title: finalTitle,
        content: finalCleanContent,
        rawTranscript: finalSpokenText,
        moods: finalMoods,
        sleepHours: typeof parsed?.sleepHours === 'number' ? parsed.sleepHours : undefined,
        sportsDuration: typeof parsed?.sportsDuration === 'number' ? parsed.sportsDuration : undefined
      });
    } catch (err) {
      console.error('Error during voice analysis:', err);
      setProcessedResult({
        title: `${t.voiceJournalTitle} - ${new Date().toLocaleTimeString(langInfo.bcp47, { hour: '2-digit', minute: '2-digit' })}`,
        content: finalSpokenText,
        rawTranscript: finalSpokenText,
        moods: [t.mood_reflective],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenCategoryPicker = () => {
    if (!processedResult) return;
    setShowCategoryPicker(true);
  };

  const handleConfirmSaveWithType = async (chosenType: JournalEntryType) => {
    if (isSaving || !processedResult) return;
    setIsSaving(true);

    try {
      const now = new Date();
      const dayName = now.toLocaleDateString(t.voiceJournalTitle, { weekday: 'long' });
      const timeStr = now.toLocaleTimeString(t.voiceJournalTitle, { hour: '2-digit', minute: '2-digit' });
      const typeConfig = getJournalTypeConfig(chosenType);

      const voiceBadge = t.voiceJournalTitle;
      const formattedContent = `${voiceBadge}\n\n${processedResult.content}`;

      const startTime = recordingStartTimeRef.current || Date.now();
      const endTime = recordingEndTimeRef.current || Date.now();
      const exactDuration = Math.max(1, Math.round((endTime - startTime) / 1000), recordingSeconds || 0);

      // Persist full recorded audio blob permanently in IndexedDB
      const attachmentId = `att-vj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let audioRecordingsList: AudioRecording[] = [];

      let finalAudioBlob: Blob | null = null;
      if (audioChunksRef.current.length > 0) {
        finalAudioBlob = new Blob(audioChunksRef.current, {
          type: resolvedMimeTypeRef.current || 'audio/webm'
        });
      }

      if (finalAudioBlob && finalAudioBlob.size > 0) {
        await saveAttachmentBlob(attachmentId, finalAudioBlob, finalAudioBlob.type);
        const blobUrl = URL.createObjectURL(finalAudioBlob);
        const newAudioRec: AudioRecording = {
          id: `rec-${Date.now()}`,
          name: `${t.voiceRecordingPrefix || 'تسجيل صوتي'} ${timeStr}.webm`,
          dataUrl: blobUrl,
          blobUrl: blobUrl,
          duration: exactDuration,
          transcription: processedResult.content,
          attachmentId: attachmentId
        };
        audioRecordingsList = [newAudioRec];
      }

      const newEntryData: Partial<DiaryEntry> = {
        title: processedResult.title || `${getJournalTypeLabel(typeConfig.type, t)} - ${dayName} ${timeStr}`,
        content: formattedContent,
        diaryType: chosenType,
        moods: processedResult.moods || ['مرتاح'],
        sleepHours: processedResult.sleepHours,
        sportsDuration: processedResult.sportsDuration,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        tags: [t.voice_journal, t.ai_assistant, getJournalTypeLabel(typeConfig.type, t)],
        importance: 4,
        audioRecordings: audioRecordingsList,
        isLocked: false
      };

      await onSaveDiary(newEntryData);
      setShowCategoryPicker(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving voice journal entry:', err);
      setMicPermissionError(t.voiceSaveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-[65] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border-0 sm:border sm:border-[#E2DCC8] rounded-none sm:rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300 h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col relative">

        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.voiceJournalTitle}
          subtitle={t.voiceJournalSub}
          icon={
            <div className="p-1.5 bg-white/10 rounded-xl">
              <Mic className="w-4 h-4 text-purple-200" />
            </div>
          }
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="dark"
        />

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 flex-1">

          {/* Permission Error State */}
          {micPermissionError && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 font-bold animate-shake" dir={langInfo.dir}>
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="flex-1">
                <p>{micPermissionError}</p>
                <button
                  type="button"
                  onClick={startRecording}
                  className="mt-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-extrabold cursor-pointer"
                >
                  {t.requestMicPermission}
                </button>
              </div>
            </div>
          )}

          {/* Category Picker View */}
          {showCategoryPicker ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200" dir={langInfo.dir}>
              <div className="flex items-center justify-between border-b border-[#E2DCC8]/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#6D5D6E]/15 text-[#6D5D6E] rounded-xl text-base">📂</span>
                  <h4 className="font-black text-sm text-[#2B3E50]">
                    {t.chooseCategoryTitle}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(false)}
                  className="text-xs text-[#6D5D6E] font-bold hover:underline cursor-pointer"
                >
                  {t.back_btn}
                </button>
              </div>

              <p className="text-xs text-[#5A5A40] leading-relaxed">
                {t.chooseCategorySub}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {ALL_JOURNAL_TYPES.map((typeKey) => {
                  const cfg = JOURNAL_TYPES_CONFIG[typeKey];
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleConfirmSaveWithType(typeKey)}
                      className={`p-3 rounded-2xl border text-start transition-all flex items-center justify-between group cursor-pointer ${cfg.colorBg} ${cfg.colorBorder} hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl shrink-0">{cfg.icon}</span>
                        <div className="flex flex-col">
                          <span className={`text-xs font-black ${cfg.colorText}`}>
                            {getJournalTypeLabel(cfg.type, t)}
                          </span>
                          <span className="text-[10px] text-gray-500 line-clamp-1">
                            {getJournalTypeDescription(cfg.type, t)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 group-hover:${cfg.colorText} transition-colors shrink-0 ${langInfo.dir === 'rtl' ? 'rotate-180' : ''}`} />
                    </button>
                  );
                })}
              </div>

              {isSaving && (
                <div className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E2DCC8] rounded-2xl text-xs text-[#6D5D6E] font-bold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#6D5D6E]" />
                  <span>{t.savingEntry}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Recording Status & Pulse Visualizer */}
              <div className="bg-white border-2 border-[#E2DCC8] p-5 sm:p-6 rounded-3xl text-center space-y-3.5 shadow-3xs">
                <div className="relative inline-flex items-center justify-center">
                  {isRecording && (
                    <span className="absolute w-24 h-24 bg-purple-500/20 rounded-full animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={isRecording ? handleAnalyzeAudio : startRecording}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all transform shadow-md cursor-pointer ${
                      isRecording
                        ? 'bg-rose-600 hover:bg-rose-700 scale-105'
                        : 'bg-[#6D5D6E] hover:bg-[#4F3B51] hover:scale-105'
                    }`}
                  >
                    {isRecording ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-8 h-8" />}
                  </button>
                </div>

                <div>
                  <p className="font-extrabold text-sm text-[#2B3E50]">
                    {isRecording
                      ? (t.voiceListening)
                      : (t.voiceRecordBtn)}
                  </p>
                  {isRecording && (
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <p className="text-xs font-mono font-black text-rose-600">
                        ⏱️ {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                      </p>
                      {isChunkTranscribing && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          {isAr ? 'جاري التحليل الحي...' : 'Streaming...'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Live Transcript Box */}
                <div
                  className="bg-[#FAF8F5] border border-[#E2DCC8] p-4 rounded-2xl min-h-[120px] max-h-60 overflow-y-auto font-medium shadow-inner"
                  style={{ direction: langInfo.dir, textAlign: langInfo.dir === 'rtl' ? 'right' : 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.9 }}
                >
                  {transcript ? (
                    <p className="text-[#2B3E50] text-sm leading-[1.9] font-medium">
                      {transcript}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400 text-xs gap-2">
                      <span className="text-2xl animate-bounce">🎙️</span>
                      <span className="font-semibold text-xs text-gray-500">
                        {isRecording
                          ? (t.listeningLivePrompt)
                          : (t.voiceLivePlaceholder)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Loading Indicator */}
              {isAnalyzing && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-center gap-2.5 text-xs text-purple-900 font-bold animate-pulse shadow-xs" dir={langInfo.dir}>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-700 shrink-0" />
                  <span>{t.analyzingVoicePrompt}</span>
                </div>
              )}

              {/* Processed AI Result Preview */}
              {processedResult && !isAnalyzing && (
                <div className="bg-emerald-50/80 border border-emerald-200 p-4.5 rounded-3xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <h4 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>{t.aiFormattedResultTitle}</span>
                    </h4>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                      {t.readyToSaveBadge}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-emerald-950">
                    <p className="font-black text-sm text-emerald-900">{processedResult.title}</p>
                    <p className="leading-relaxed bg-white/90 p-3 rounded-xl border border-emerald-100 font-medium">{processedResult.content}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {processedResult.moods.map((m, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {m}
                        </span>
                      ))}
                      {processedResult.sleepHours && (
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {processedResult.sleepHours} {t.hoursUnit}
                        </span>
                      )}
                      {processedResult.sportsDuration && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {processedResult.sportsDuration} {t.minutesUnit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F0EDE4] border-t border-[#E2DCC8] flex items-center justify-between shrink-0">
          {!showCategoryPicker && (
            <>
              {!processedResult ? (
                <button
                  type="button"
                  onClick={isRecording ? handleAnalyzeAudio : startRecording}
                  disabled={isAnalyzing}
                  className={`px-4 py-2.5 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all ${
                    isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#6D5D6E] hover:bg-[#4F3B51]'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>{isAnalyzing ? t.analyzingVoice : (t.voiceStopBtn || 'إيقاف وتحليل')}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>{t.startRecording || 'بدء التسجيل'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCategoryPicker}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4 text-emerald-100" />
                  <span>{t.voiceSaveBtn}</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer mr-auto transition-colors"
          >
            {t.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
}
