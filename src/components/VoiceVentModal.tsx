import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Sparkles, RefreshCw, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { saveAttachmentBlob } from '../lib/attachmentStore';
import { transcribeAudioWithGemini } from '../lib/gemini';
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

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [recordedAudioRec, setRecordedAudioRec] = useState<AudioRecording | null>(null);
  const [isAppended, setIsAppended] = useState(false);

  // Audio Capture Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resolvedMimeTypeRef = useRef<string>('audio/webm');
  const intervalRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef<string>('');
  const fileFallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Only populated if navigator.mediaDevices.getUserMedia itself throws
  const [micErrorDetails, setMicErrorDetails] = useState<{
    friendly: string;
    technicalName?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecordingSeconds(0);
      setLiveTranscript('');
      setFinalTranscript('');
      setRecordedAudioRec(null);
      setIsAppended(false);
      setIsTranscribing(false);
      setMicErrorDetails(null);
      liveTranscriptRef.current = '';
      // Auto-start recording immediately upon opening
      startRecording();
    } else {
      stopRecordingInternal();
    }
    return () => {
      stopRecordingInternal();
    };
  }, [isOpen]);

  const startRecording = async () => {
    setMicErrorDetails(null);
    setIsTranscribing(false);
    audioChunksRef.current = [];
    liveTranscriptRef.current = '';
    setLiveTranscript('');
    setFinalTranscript('');
    setRecordedAudioRec(null);
    setIsAppended(false);

    // 1. First, acquire audio stream via getUserMedia - Decoupled completely from SpeechRecognition
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('navigator.mediaDevices.getUserMedia is not supported');
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      const errorName = err?.name || 'PermissionError';
      console.warn('[VoiceVent] getUserMedia failed:', errorName, err);

      let friendlyMsg = t.micAccessErrorPermission || (isAr
        ? 'يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح أو التطبيق.'
        : 'Please grant microphone permission to record your voice vent.');

      if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        friendlyMsg = isAr ? 'لم يتم العثور على ميكروفون متصل بالجهاز.' : 'No microphone device found on this system.';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        friendlyMsg = isAr ? 'الميكروفون قيد الاستخدام حالياً بواسطة تطبيق آخر.' : 'Microphone is currently in use by another application.';
      }

      setMicErrorDetails({
        friendly: friendlyMsg,
        technicalName: `${errorName}${err.message ? `: ${err.message}` : ''}`
      });
      setIsRecording(false);
      return;
    }

    // 2. Initialize MediaRecorder safely with best supported MIME type
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
      setRecordingSeconds(0);

      // Start Recording Timer
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
      return;
    }

    // 3. Optional Best-Effort Web Speech API: Ignored completely if unsupported or throws inside Android WebView
    try {
      const manager = SpeechRecognitionManager.getInstance();
      if (manager.isSupported()) {
        manager.startSession({
          lang: langInfo.speechLang || (isAr ? 'ar-EG' : 'en-US'),
          continuous: true,
          callbacks: {
            onTranscriptChange: (state) => {
              liveTranscriptRef.current = state.displayTranscript;
              setLiveTranscript(state.displayTranscript);
            },
            onError: (speechErr) => {
              // Silently ignore speech recognition errors inside Android WebView (e.g. not-allowed, service-not-allowed)
              console.warn('[VoiceVent] WebSpeech error ignored gracefully in favor of MediaRecorder:', speechErr);
            }
          }
        });
      }
    } catch (speechInitErr) {
      console.warn('[VoiceVent] WebSpeech init ignored gracefully:', speechInitErr);
    }
  };

  const stopRecordingInternal = (): string => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop WebSpeech silently
    try {
      const manager = SpeechRecognitionManager.getInstance();
      manager.finalize();
    } catch (_) {}

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    // Stop Audio Tracks
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    return (liveTranscriptRef.current || liveTranscript).trim();
  };

  /**
   * Helper to convert an Audio Blob to Base64 data URL
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
   * Pipeline to save audio and process Gemini transcription
   */
  const processAndSaveAudio = async (audioBlob: Blob, initialText: string) => {
    const mimeType = resolvedMimeTypeRef.current || audioBlob.type || 'audio/webm';
    const attachmentId = `att-vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const recId = `rec-vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Save directly into IndexedDB for persistent binary durability
    await saveAttachmentBlob(attachmentId, audioBlob, mimeType);
    const blobUrl = URL.createObjectURL(audioBlob);

    let resolvedTranscript = initialText;

    // 2. Automatically dispatch audio to Gemini Multimodal Audio Transcription pipeline
    setIsTranscribing(true);
    try {
      const base64Audio = await convertBlobToBase64(audioBlob);
      const aiTranscription = await transcribeAudioWithGemini(
        base64Audio,
        mimeType,
        undefined,
        appLanguage
      );

      if (
        aiTranscription &&
        !aiTranscription.includes('__AI_CHECK_API_KEY__') &&
        !aiTranscription.includes('RESOURCE_EXHAUSTED') &&
        !aiTranscription.includes('وضع المعالجة الصوتية')
      ) {
        resolvedTranscript = aiTranscription.trim();
      }
    } catch (aiErr) {
      console.warn('[VoiceVent] Gemini transcription fallback:', aiErr);
    } finally {
      setIsTranscribing(false);
    }

    const finalText = resolvedTranscript || initialText || (isAr ? 'تسجيل فضفضة صوتية' : 'Voice vent recording');
    setFinalTranscript(finalText);

    const newRec: AudioRecording = {
      id: recId,
      name: `${t.voiceQuickVent || (isAr ? 'فضفضة صوتية' : 'Voice Vent')} (${new Date().toLocaleTimeString(langInfo.bcp47 || 'ar-SA', { hour: '2-digit', minute: '2-digit' })})`,
      dataUrl: blobUrl,
      blobUrl,
      duration: Math.max(recordingSeconds, 1),
      mimeType,
      transcription: finalText,
      attachmentId
    };

    setRecordedAudioRec(newRec);
    onSaveAudioRecording(newRec);

    // Auto-insert cleanly into diary content
    if (finalText && finalText.trim() && !isAppended) {
      onAppendTextToContent(finalText.trim());
      setIsAppended(true);
    }
  };

  const handleStopAndSave = async () => {
    const rawSpeechText = stopRecordingInternal();
    setIsRecording(false);

    // Give MediaRecorder ~120ms to flush the last audio chunk
    await new Promise((r) => setTimeout(r, 120));

    const hasChunks = audioChunksRef.current.length > 0;
    if (hasChunks) {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: resolvedMimeTypeRef.current || 'audio/webm'
      });
      await processAndSaveAudio(audioBlob, rawSpeechText);
    } else {
      setFinalTranscript(rawSpeechText);
      if (rawSpeechText) {
        onAppendTextToContent(rawSpeechText);
        setIsAppended(true);
      }
    }
  };

  const handleAppendToContent = () => {
    const textToAppend = finalTranscript || liveTranscript;
    if (!textToAppend.trim()) return;

    onAppendTextToContent(textToAppend.trim());
    setIsAppended(true);
  };

  /**
   * Fallback: pick existing audio file from device when mic permission is unavailable
   */
  const handleAudioFileFallbackChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resolvedMimeTypeRef.current = file.type || 'audio/webm';
    setMicErrorDetails(null);
    setRecordingSeconds(0);
    await processAndSaveAudio(file, '');
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[125] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir={langInfo.dir}
    >
      <div className="bg-white border border-[#E2DCC8] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2DCC8]/70 flex items-center justify-between bg-gradient-to-r from-red-50/50 via-[#F9F7F2] to-amber-50/50">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div
              className={`p-2.5 rounded-2xl ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-[#3A3A3A] flex items-center gap-1.5">
                <span>{t.voiceQuickVent || (isAr ? 'فضفضة صوتية سريعة' : 'Quick Voice Vent')}</span>
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {isAr
                  ? 'سجل صوتك بحرية مع الحفظ والتفريغ الذكي التلقائي'
                  : 'Record freely with automatic audio save and smart transcription'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-500 border border-[#E2DCC8] flex items-center justify-center transition-all cursor-pointer shadow-3xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Status & Timer Card */}
          <div className="p-4 bg-[#F9F7F2] border border-[#E2DCC8] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRecording ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                </span>
              ) : isTranscribing ? (
                <Loader2 className="w-4 h-4 text-[#8B9D83] animate-spin" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              )}
              <span className="font-extrabold text-xs text-[#3A3A3A]">
                {isRecording
                  ? (isAr ? 'جاري التسجيل الصوتي المباشر...' : 'Recording voice vent...')
                  : isTranscribing
                  ? (isAr ? 'جاري التفريغ الذكي بواسطة Gemini...' : 'Transcribing audio with Gemini...')
                  : finalTranscript
                  ? (isAr ? 'اكتمل التسجيل والتفريغ' : 'Recording completed')
                  : (isAr ? 'جاهز للتسجيل' : 'Ready to record')}
              </span>
            </div>

            <div className="font-mono font-black text-xs px-3 py-1 bg-white border border-[#E2DCC8] rounded-full text-red-700 shadow-3xs">
              ⏱️ {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {/* Live / Final Transcript Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-[#5A5A40] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
                <span>{t.liveTranscription || (isAr ? 'التفريغ والنص المستخرج:' : 'Transcription:')}</span>
              </span>
              {isTranscribing && (
                <span className="text-[10px] text-[#8B9D83] font-bold animate-pulse">
                  ✨ Gemini AI
                </span>
              )}
            </div>

            <div className="p-4 bg-white border border-[#E2DCC8] rounded-2xl min-h-[140px] max-h-56 overflow-y-auto shadow-inner text-xs leading-relaxed text-[#3A3A3A] font-medium whitespace-pre-wrap select-text">
              {liveTranscript || finalTranscript ? (
                <p className="leading-loose text-xs sm:text-sm text-[#2B3E50]">
                  {finalTranscript || liveTranscript}
                </p>
              ) : isTranscribing ? (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center text-gray-500 space-y-2">
                  <Loader2 className="w-6 h-6 text-[#8B9D83] animate-spin" />
                  <p className="text-xs font-bold text-[#5A5A40]">
                    {isAr ? 'جاري تحويل الصوت إلى نص بدقة عالية...' : 'Transcribing audio to text...'}
                  </p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center text-gray-400 space-y-1.5">
                  <Mic className="w-6 h-6 text-gray-300 animate-pulse" />
                  <p className="text-xs font-semibold">
                    {isAr
                      ? 'تحدث بحرية... سيتم حفظ التسجيل الصوتي وتفريغه بدقة.'
                      : 'Speak freely... Audio recording and transcription will be automatically saved.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Specific Microphone Permission / Access Error Notification */}
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

          {/* Hidden Fallback Audio File Input */}
          <input
            ref={fileFallbackInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioFileFallbackChange}
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#E2DCC8]/70 flex flex-wrap gap-2.5 items-center justify-between">
            {!isRecording && !finalTranscript && (
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

            {isRecording && (
              <button
                type="button"
                onClick={handleStopAndSave}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 space-x-reverse animate-bounce"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>{t.saveRecording || (isAr ? 'إيقاف وحفظ التسجيل' : 'Stop & Save Recording')}</span>
              </button>
            )}

            {!isRecording && finalTranscript && (
              <div className="w-full flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 py-2.5 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تسجيل جديد' : 'Record Again'}</span>
                </button>

                <button
                  type="button"
                  disabled={isAppended || !finalTranscript.trim()}
                  onClick={handleAppendToContent}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                    isAppended
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-[#8B9D83] hover:bg-[#72856A] text-white'
                  }`}
                >
                  <span>{isAppended ? '✓' : '✍️'}</span>
                  <span>
                    {isAppended
                      ? (isAr ? 'تمت الإضافة للنص' : 'Added to text')
                      : (t.addTranscriptionToText || (isAr ? 'إضافة للنص' : 'Add to text'))}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
