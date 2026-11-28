import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterBackStep } from '../lib/navigationStack';

export interface HistoryItem {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: string;
}

export interface LiveVoiceChatLabels {
  status: string;
  listen: string;
  stop: string;
  send: string;
  interrupt: string;
  autoBargeIn: string;
  close: string;
  transcribing: string;
  listening?: string;
  thinking?: string;
  speaking?: string;
  idle?: string;
  error?: string;
  user?: string;
  assistant?: string;
  microphonePermissionDenied?: string;
  microphoneUnavailable?: string;
  microphoneStartFailed?: string;
  transcriptionFailed?: string;
  noSpeechDetected?: string;
  timestamp?: string;
}

export interface LiveVoiceChatModalProps {
  open: boolean;
  onClose: () => void;
  language: string;
  history: HistoryItem[];
  diaryContextEnabled: boolean;
  diaryContext: string;
  onTranscribeAudio: (file: File) => Promise<string>;
  onSubmitTurn: (
    text: string,
    context: {
      history: HistoryItem[];
      diaryContextEnabled: boolean;
      diaryContext: string;
      interruptionNote?: string;
    }
  ) => Promise<string>;
  labels: Partial<LiveVoiceChatLabels>;
}

type RecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionInstance;
  webkitSpeechRecognition?: new () => RecognitionInstance;
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
};

type ChatMode = 'idle' | 'listening' | 'recording' | 'processing' | 'speaking';
type LabelKey = keyof LiveVoiceChatLabels;

function getFallbackLabels(language: string): LiveVoiceChatLabels {
  if (language.toLowerCase().startsWith('ar')) {
    return {
      status: 'الحالة', listen: 'استمع', stop: 'إيقاف', send: 'إرسال',
      interrupt: 'مقاطعة والرد الآن', autoBargeIn: 'مقاطعة تلقائية بالصوت',
      close: 'إغلاق', transcribing: 'جارٍ تحويل الصوت إلى نص…', user: 'أنت', assistant: 'حياة AI',
      microphonePermissionDenied: 'يرجى السماح باستخدام الميكروفون.', microphoneUnavailable: 'الميكروفون غير متاح على هذا الجهاز أو المتصفح.',
      microphoneStartFailed: 'تعذر بدء التسجيل. تحقق من الميكروفون وحاول مرة أخرى.', transcriptionFailed: 'تعذر تحويل التسجيل إلى نص. حاول مرة أخرى.',
      noSpeechDetected: 'لم يتم اكتشاف كلام. حاول مرة أخرى.', timestamp: 'الوقت'
    };
  }
  return {
    status: 'Status', listen: 'Listen', stop: 'Stop', send: 'Send',
    interrupt: 'Interrupt and reply now', autoBargeIn: 'Auto barge-in',
    close: 'Close', transcribing: 'Transcribing…', user: 'You', assistant: 'Hayat AI',
    microphonePermissionDenied: 'Please allow microphone access.', microphoneUnavailable: 'Microphone is unavailable in this browser or device.',
    microphoneStartFailed: 'Could not start recording. Check your microphone and try again.', transcriptionFailed: 'Could not transcribe the recording. Please try again.',
    noSpeechDetected: 'No speech was detected. Please try again.', timestamp: 'Time'
  };
}

function getRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function makeAudioFile(blob: Blob): File {
  const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  return new File([blob], `voice-message-${Date.now()}.${extension}`, { type: blob.type || 'audio/webm' });
}

function languageTag(language: string): string {
  const normalized = language.trim().replace('_', '-');
  if (!normalized) return 'en-US';
  if (normalized.toLowerCase() === 'ar') return 'ar-SA';
  if (normalized.toLowerCase() === 'en') return 'en-US';
  return normalized;
}

export default function LiveVoiceChatModal({
  open,
  onClose,
  language,
  history,
  diaryContextEnabled,
  diaryContext,
  onTranscribeAudio,
  onSubmitTurn,
  labels
}: LiveVoiceChatModalProps) {
  const [mode, setMode] = useState<ChatMode>('idle');
  const [transcript, setTranscript] = useState('');
  const [liveResponse, setLiveResponse] = useState('');
  const [autoBargeIn, setAutoBargeIn] = useState(false);
  const [error, setError] = useState('');
  const autoBargeInRef = useRef(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const recognitionFinalRef = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const monitorStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechGenerationRef = useRef(0);
  const responseRef = useRef('');
  const spokenPointRef = useRef('');
  const interruptionNoteRef = useRef<string | undefined>(undefined);
  const sessionHistoryRef = useRef<HistoryItem[]>([]);
  const captureGenerationRef = useRef(0);
  const sendingRef = useRef(false);
  const allowWebRecognitionRef = useRef(true);
  const sendTurnRef = useRef<(value: string) => Promise<void>>(async () => undefined);
  const startCaptureRef = useRef<() => Promise<void>>(async () => undefined);
  const discardRecordingRef = useRef(false);
  const bargeFramesRef = useRef(0);
  const propsRef = useRef({ onTranscribeAudio, onSubmitTurn, history, diaryContextEnabled, diaryContext });
  propsRef.current = { onTranscribeAudio, onSubmitTurn, history, diaryContextEnabled, diaryContext };
  autoBargeInRef.current = autoBargeIn;

  const fallbackLabels = getFallbackLabels(language);
  const label = (key: LabelKey) => labels[key]?.trim() || fallbackLabels[key];
  const isArabic = language.toLowerCase().startsWith('ar');
  const isNativeCapacitorAndroid = (() => {
    if (typeof window === 'undefined') return false;
    const win = window as SpeechWindow;
    try {
      const capacitor = win.Capacitor;
      return Boolean(capacitor?.isNativePlatform?.() && capacitor.getPlatform?.() === 'android');
    } catch {
      return false;
    }
  })();
  const SpeechRecognitionClass = typeof window === 'undefined'
    ? undefined
    : ((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);
  const useWebRecognition = Boolean(SpeechRecognitionClass && !isNativeCapacitorAndroid);

  const stopMonitor = useCallback(() => {
    if (animationFrameRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    try { audioContextRef.current?.close(); } catch { /* already closed */ }
    audioContextRef.current = null;
    monitorStreamRef.current?.getTracks().forEach((track) => track.stop());
    monitorStreamRef.current = null;
    bargeFramesRef.current = 0;
  }, []);

  const cancelSpeech = useCallback(() => {
    speechGenerationRef.current += 1;
    stopMonitor();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch { /* speech synthesis may be unavailable */ }
    }
  }, [stopMonitor]);

  const cleanupResources = useCallback(() => {
    captureGenerationRef.current += 1;
    discardRecordingRef.current = true;
    cancelSpeech();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch { /* already stopped */ }
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* already stopped */ }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioChunksRef.current = [];
  }, [cancelSpeech]);

  const closeModal = useCallback(() => {
    cleanupResources();
    onClose();
  }, [cleanupResources, onClose]);

  useRegisterBackStep('modal_live_voice_chat', 'modal', open, closeModal, label('status'));

  useEffect(() => {
    if (!open) {
      cleanupResources();
      return;
    }
    discardRecordingRef.current = false;
    sessionHistoryRef.current = (history || []).map((item) => ({ sender: item.sender, text: item.text }));
    setMode('idle');
    setTranscript('');
    setLiveResponse('');
    setError('');
    responseRef.current = '';
    interruptionNoteRef.current = undefined;
    return () => cleanupResources();
    // Session initialization intentionally occurs only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cleanupResources]);

  useEffect(() => () => cleanupResources(), [cleanupResources]);

  const startCapture = useCallback(async () => {
    if (!open || mode === 'processing') return;
    const captureGeneration = ++captureGenerationRef.current;
    setError('');
    setTranscript('');
    recognitionFinalRef.current = '';
    discardRecordingRef.current = false;

    if (useWebRecognition && SpeechRecognitionClass && allowWebRecognitionRef.current) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = languageTag(language);
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
            const result = event.results[index];
            const text = String(result?.[0]?.transcript || '').trim();
            if (!text) continue;
            if (result.isFinal) recognitionFinalRef.current = `${recognitionFinalRef.current} ${text}`.trim();
            else interim = `${interim} ${text}`.trim();
          }
          setTranscript(`${recognitionFinalRef.current} ${interim}`.trim());
        };
        recognition.onerror = (event: any) => {
          if (recognitionRef.current !== recognition) return;
          recognitionRef.current = null;
          try { recognition.abort(); } catch { /* already stopped */ }
          if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') setError('microphonePermissionDenied');
          else { allowWebRecognitionRef.current = false; setError(''); void startCaptureRef.current(); }
        };
        recognition.onend = () => {
          if (recognitionRef.current === recognition) recognitionRef.current = null;
          setMode((current) => current === 'listening' ? 'idle' : current);
          const completedSpeech = recognitionFinalRef.current.trim();
          if (completedSpeech && !discardRecordingRef.current) {
            window.setTimeout(() => { void sendTurnRef.current(completedSpeech); }, 250);
          }
        };
        recognitionRef.current = recognition;
        recognition.start();
        setMode('listening');
      } catch {
        setError('transcriptionFailed');
        setMode('idle');
      }
      return;
    }

    allowWebRecognitionRef.current = true;
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('microphoneUnavailable');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!open || captureGenerationRef.current !== captureGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = getRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (discardRecordingRef.current || chunks.length === 0) return;
        setMode('processing');
        try {
          const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const text = await propsRef.current.onTranscribeAudio(makeAudioFile(audioBlob));
          setTranscript(text.trim());
          setError('');
        } catch {
          setError('transcriptionFailed');
        } finally {
          setMode('idle');
        }
      };
      recorder.start();
      setMode('recording');
    } catch (captureError: any) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setError(captureError?.name === 'NotAllowedError' || captureError?.name === 'PermissionDeniedError' ? 'microphonePermissionDenied' : 'microphoneStartFailed');
      setMode('idle');
    }
  }, [open, mode, useWebRecognition, SpeechRecognitionClass, language]);

  startCaptureRef.current = startCapture;
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => { void startCaptureRef.current(); }, 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const stopCapture = useCallback(() => {
    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      try { recognition.stop(); } catch { /* already stopped */ }
      setMode('idle');
      return;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { setMode('idle'); }
    } else {
      setMode('idle');
    }
  }, []);

  const beginAutoBargeMonitor = useCallback(async (generation: number) => {
    if (!autoBargeInRef.current || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== speechGenerationRef.current || !autoBargeInRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const context: AudioContext = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      monitorStreamRef.current = stream;
      audioContextRef.current = context;
      const monitor = () => {
        if (generation !== speechGenerationRef.current || !audioContextRef.current) return;
        analyser.getByteTimeDomainData(samples);
        let sumSquares = 0;
        for (let index = 0; index < samples.length; index += 1) {
          const amplitude = (samples[index] - 128) / 128;
          sumSquares += amplitude * amplitude;
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        bargeFramesRef.current = rms > 0.045 ? bargeFramesRef.current + 1 : 0;
        if (bargeFramesRef.current >= 3) {
          const excerpt = (spokenPointRef.current || responseRef.current).trim().slice(-260);
          interruptionNoteRef.current = excerpt || undefined;
          cancelSpeech();
          setMode('idle');
          void startCapture();
          return;
        }
        animationFrameRef.current = requestAnimationFrame(monitor);
      };
      animationFrameRef.current = requestAnimationFrame(monitor);
    } catch {
      // Automatic interruption is optional; keep the speech response playing if mic access is denied.
    }
  }, [cancelSpeech, startCapture]);

  const speakResponse = useCallback((text: string) => {
    responseRef.current = text;
    setLiveResponse(text);
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setMode('idle');
      void startCapture();
      return;
    }
    const generation = ++speechGenerationRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    spokenPointRef.current = '';
    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      if (typeof event.charIndex === 'number') spokenPointRef.current = text.slice(0, Math.min(text.length, event.charIndex + (event.charLength || 1)));
    };
    utterance.lang = languageTag(language);
    if (isArabic) {
      const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('ar'));
      voices.sort((a, b) => Number(b.localService) - Number(a.localService));
      if (voices[0]) utterance.voice = voices[0];
    }
    const finish = () => {
      if (generation !== speechGenerationRef.current) return;
      speechGenerationRef.current += 1;
      stopMonitor();
      setMode('idle');
      void startCapture();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    setMode('speaking');
    try {
      window.speechSynthesis.speak(utterance);
      void beginAutoBargeMonitor(generation);
    } catch {
      finish();
    }
  }, [language, isArabic, startCapture, stopMonitor, beginAutoBargeMonitor]);

  const sendTurn = useCallback(async (value: string) => {
    const text = value.trim();
    if (!text || mode === 'processing' || sendingRef.current) return;
    sendingRef.current = true;
    discardRecordingRef.current = true;
    if (recognitionRef.current) {
      const activeRecognition = recognitionRef.current;
      recognitionRef.current = null;
      activeRecognition.onend = null;
      try { activeRecognition.abort(); } catch { /* already stopped */ }
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      discardRecordingRef.current = true;
      try { recorder.stop(); } catch { /* already stopped */ }
    }
    const interruptionNote = interruptionNoteRef.current;
    interruptionNoteRef.current = undefined;
    setTranscript('');
    setError('');
    setMode('processing');
    const currentProps = propsRef.current;
    const userItem: HistoryItem = { sender: 'user', text, timestamp: new Date().toISOString() };
    const contextHistory = [...sessionHistoryRef.current, userItem].map((item) => ({ ...item }));
    sessionHistoryRef.current = [...sessionHistoryRef.current, userItem];
    try {
      const answer = await currentProps.onSubmitTurn(text, {
        history: contextHistory,
        diaryContextEnabled: currentProps.diaryContextEnabled,
        diaryContext: currentProps.diaryContext,
        ...(interruptionNote ? { interruptionNote } : {})
      });
      const response = String(answer || '').trim();
      sessionHistoryRef.current = [...sessionHistoryRef.current, { sender: 'ai', text: response, timestamp: new Date().toISOString() }];
      speakResponse(response);
    } catch {
      setError('transcriptionFailed');
      setMode('idle');
    } finally {
      sendingRef.current = false;
    }
  }, [mode, speakResponse]);

  sendTurnRef.current = sendTurn;

  const interruptAndListen = useCallback(() => {
    const excerpt = (spokenPointRef.current || responseRef.current).trim().slice(-260);
    interruptionNoteRef.current = excerpt || undefined;
    cancelSpeech();
    setMode('idle');
    setTranscript('');
    void startCapture();
  }, [cancelSpeech, startCapture]);

  if (!open) return null;

  const busy = mode === 'processing';
  const canStop = mode === 'listening' || mode === 'recording';
  const statusText = mode === 'processing'
    ? label('transcribing')
    : mode === 'speaking'
      ? (labels.speaking || label('status'))
      : mode === 'listening' || mode === 'recording'
        ? (labels.listening || label('listen'))
        : error
          ? (labels.error || label('status'))
          : (labels.idle || label('status'));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5" dir={isArabic ? 'rtl' : 'ltr'}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label('status')}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 bg-white dark:bg-[#0E2320] text-[#12261D] dark:text-[#EBF5F2] shadow-2xl transition-colors"
      >
        <header className="flex items-center justify-between border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 px-5 py-4 bg-[#F3F8F5] dark:bg-[#14302B]">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#12261D] dark:text-[#EBF5F2]">{label('status')}</h2>
            <p className="mt-1 text-sm text-[#4A6357] dark:text-[#9EC2B8]" aria-live="polite">{statusText}</p>
          </div>
          <button type="button" onClick={closeModal} aria-label={label('close')} className="rounded-full px-3 py-1.5 text-sm font-bold text-[#4A6357] dark:text-[#9EC2B8] hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            {label('close')}
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 bg-[#EFF4F1]/60 dark:bg-[#071614]/60">
          <div className={`flex h-20 items-end justify-center gap-2 rounded-2xl border border-[#2D6A4F]/15 dark:border-[#48B89F]/20 bg-gradient-to-b from-[#2D6A4F]/10 to-white dark:from-[#48B89F]/15 dark:to-[#0E2320] p-4 ${mode === 'speaking' || mode === 'listening' || mode === 'recording' ? 'animate-pulse' : ''}`} aria-hidden="true">
            {[24, 42, 30, 52, 34, 46, 22].map((height, index) => <span key={index} className="w-2 rounded-full bg-[#2D6A4F] dark:bg-[#48B89F] transition-all duration-300" style={{ height: `${mode === 'speaking' ? height + (index % 2 ? 10 : 0) : height}px`, animationDelay: `${index * 70}ms` }} />)}
          </div>
          {liveResponse && (
            <article className="rounded-2xl border border-[#2D6A4F]/20 dark:border-[#48B89F]/25 bg-white dark:bg-[#14302B] p-4 text-[#12261D] dark:text-[#EBF5F2] shadow-xs" aria-live="polite">
              <p className="whitespace-pre-wrap leading-7">{liveResponse}</p>
            </article>
          )}
          <div className="min-h-24 rounded-2xl border border-[#2D6A4F]/15 dark:border-[#48B89F]/20 bg-white dark:bg-[#0E2320] p-4 shadow-3xs">
            <p className="min-h-12 whitespace-pre-wrap text-sm leading-6 text-[#12261D] dark:text-[#EBF5F2]">{transcript}</p>
          </div>
          {sessionHistoryRef.current.map((item, index) => (
            <article key={`${item.timestamp || 'turn'}-${index}`} className="rounded-2xl border border-[#2D6A4F]/15 dark:border-[#48B89F]/20 bg-white dark:bg-[#14302B] p-4">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold text-[#4A6357] dark:text-[#9EC2B8]">
                <span>{item.sender === 'user' ? label('user') : label('assistant')}</span>
                {item.timestamp && <time dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleTimeString(languageTag(language), { hour: '2-digit', minute: '2-digit' })}</time>}
              </div>
              <p className="whitespace-pre-wrap leading-6">{item.text}</p>
            </article>
          ))}
          {error && <p role="status" className="text-sm font-bold text-amber-700 dark:text-amber-400">{labels[error as LabelKey] || fallbackLabels[error as LabelKey] || labels.error || label('status')}</p>}
        </div>

        <footer className="space-y-4 border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15 bg-white dark:bg-[#0E2320] p-5">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] px-4 py-3 text-sm font-bold text-[#12261D] dark:text-[#EBF5F2]">
            <span>{label('autoBargeIn')}</span>
            <input
              type="checkbox"
              checked={autoBargeIn}
              onChange={(event) => {
                setAutoBargeIn(event.target.checked);
                if (!event.target.checked) stopMonitor();
              }}
              className="h-4 w-4 accent-[#2D6A4F] dark:accent-[#48B89F]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {canStop ? (
              <button type="button" onClick={stopCapture} className="rounded-xl bg-slate-700 dark:bg-slate-600 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors">
                {label('stop')}
              </button>
            ) : (
              <button type="button" onClick={() => void startCapture()} disabled={busy || mode === 'speaking'} className="rounded-xl bg-[#2D6A4F] dark:bg-[#2D8C76] px-4 py-3 text-sm font-bold text-white hover:bg-[#214E3A] disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                {label('listen')}
              </button>
            )}
            <button type="button" onClick={() => void sendTurn(transcript)} disabled={!transcript.trim() || busy} className="rounded-xl bg-[#2D6A4F] dark:bg-[#48B89F] px-4 py-3 text-sm font-bold text-white dark:text-[#071614] hover:bg-[#214E3A] disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
              {label('send')}
            </button>
            {mode === 'speaking' && (
              <button type="button" onClick={interruptAndListen} className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 transition-colors">
                {label('interrupt')}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
