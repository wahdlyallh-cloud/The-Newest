import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Save, Plus, Sparkles, RefreshCw, Volume2 } from 'lucide-react';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { saveAttachmentBlob } from '../lib/attachmentStore';
import { AudioRecording, AppLanguage } from '../types';
import { getTranslation, getLanguageInfo } from '../lib/languages';

interface VoiceVentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: AppLanguage;
  onSaveAudioRecording: (rec: AudioRecording) => void;
  onAppendTextToContent: (text: string) => void;
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
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [recordedAudioRec, setRecordedAudioRec] = useState<AudioRecording | null>(null);
  const [isAppended, setIsAppended] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  const liveTranscriptRef = useRef<string>('');

  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecordingSeconds(0);
      setLiveTranscript('');
      setFinalTranscript('');
      setRecordedAudioRec(null);
      setIsAppended(false);
      setMicPermissionError(null);
      liveTranscriptRef.current = '';
      // Auto-start recording immediately upon opening
      startRecording();
    } else {
      stopRecordingInternal();
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setMicPermissionError(null);
      setIsRecording(true);
      setRecordingSeconds(0);
      setLiveTranscript('');
      setFinalTranscript('');
      setRecordedAudioRec(null);
      setIsAppended(false);
      audioChunksRef.current = [];
      liveTranscriptRef.current = '';

      // Timer
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // Start Web Speech Recognition
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
            onError: (err) => {
              console.warn('Voice Vent speech recognition warning:', err);
            }
          }
        });
      }

      // Start MediaRecorder if microphone is accessible
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(250);
      }
    } catch (err: any) {
      console.warn('Voice Vent auto-start or mic permission issue:', err);
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setMicPermissionError(
        isAr
          ? 'يرجى السماح بالوصول إلى الميكروفون لبدء الفضفضة الصوتية.'
          : 'Please grant microphone permission to record your voice vent.'
      );
    }
  };

  const stopRecordingInternal = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const manager = SpeechRecognitionManager.getInstance();
    const finalSpeechText = manager.finalize();
    const resolvedText = (finalSpeechText || liveTranscriptRef.current || liveTranscript).trim();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
    return resolvedText;
  };

  const handleStopAndSave = async () => {
    const text = stopRecordingInternal();
    setFinalTranscript(text);

    // Save audio recording if audio chunks exist
    const hasChunks = audioChunksRef.current.length > 0;
    const mimeType = 'audio/webm';
    const audioBlob = hasChunks ? new Blob(audioChunksRef.current, { type: mimeType }) : null;
    const attachmentId = `att-vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const recId = `rec-vent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let blobUrl = '';
    if (audioBlob) {
      await saveAttachmentBlob(attachmentId, audioBlob, mimeType);
      blobUrl = URL.createObjectURL(audioBlob);
    }

    const newRec: AudioRecording = {
      id: recId,
      name: `${t.voiceQuickVent || (isAr ? 'فضفضة صوتية' : 'Voice Vent')} (${new Date().toLocaleTimeString(langInfo.bcp47 || (isAr ? 'ar-SA' : 'en-US'), { hour: '2-digit', minute: '2-digit' })})`,
      dataUrl: blobUrl,
      blobUrl,
      duration: Math.max(recordingSeconds, 1),
      mimeType,
      transcription: text || (isAr ? 'تسجيل فضفضة صوتية' : 'Voice vent recording'),
      attachmentId
    };

    setRecordedAudioRec(newRec);
    onSaveAudioRecording(newRec);
  };

  const handleAppendToContent = () => {
    const textToAppend = finalTranscript || liveTranscript;
    if (!textToAppend.trim()) return;

    onAppendTextToContent(textToAppend.trim());
    setIsAppended(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[125] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" dir={langInfo.dir}>
      <div className="bg-white border border-[#E2DCC8] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2DCC8]/70 flex items-center justify-between bg-gradient-to-r from-red-50/50 via-[#F9F7F2] to-amber-50/50">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className={`p-2.5 rounded-2xl ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-red-100 text-red-700'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-[#3A3A3A] flex items-center gap-1.5">
                <span>{t.voiceQuickVent || (isAr ? 'فضفضة صوتية سريعة' : 'Quick Voice Vent')}</span>
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {isAr ? 'سجل صوتك واستمع للتفريغ اللحظي مع الحفظ التلقائي' : 'Record your voice and see live transcription'}
              </p>
            </div>
          </div>

          <button
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
              ) : (
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              )}
              <span className="font-extrabold text-xs text-[#3A3A3A]">
                {isRecording ? (isAr ? 'جاري الاستماع والتسجيل المستمر...' : 'Listening continuously...') : (finalTranscript ? (isAr ? 'اكتمل التسجيل' : 'Recording completed') : (isAr ? 'جاهز للتسجيل' : 'Ready to record'))}
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
                <span>{t.liveTranscription || (isAr ? 'التفريغ النصي المباشر:' : 'Live Transcription:')}</span>
              </span>
            </div>

            <div className="p-4 bg-white border border-[#E2DCC8] rounded-2xl min-h-[140px] max-h-56 overflow-y-auto shadow-inner text-xs leading-relaxed text-[#3A3A3A] font-medium whitespace-pre-wrap">
              {liveTranscript || finalTranscript ? (
                <p className="leading-loose text-xs sm:text-sm text-[#2B3E50]">
                  {liveTranscript || finalTranscript}
                </p>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center text-gray-400 space-y-1.5">
                  <Mic className="w-6 h-6 text-gray-300 animate-pulse" />
                  <p className="text-xs font-semibold">
                    {isAr ? 'اضغط "بدء التسجيل" وتحدث بحرية... لن يتوقف التسجيل عند الصمت القصير.' : 'Click "Start Recording" and speak freely... It will not stop on short silence.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Permission Error Notification */}
          {micPermissionError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>⚠️ {micPermissionError}</span>
              <button
                type="button"
                onClick={() => startRecording()}
                className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-black hover:bg-red-700 cursor-pointer"
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#E2DCC8]/70 flex flex-wrap gap-2.5 items-center justify-between">
            {!isRecording && !finalTranscript && (
              <button
                type="button"
                onClick={startRecording}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 space-x-reverse"
              >
                <Mic className="w-4 h-4" />
                <span>{t.startRecording || (isAr ? 'بدء التسجيل الآن' : 'Start Recording Now')}</span>
              </button>
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
                  <span>{isAppended ? (isAr ? 'تمت الإضافة للنص' : 'Added to text') : (t.addTranscriptionToText || (isAr ? 'إضافة للنص' : 'Add to text'))}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
