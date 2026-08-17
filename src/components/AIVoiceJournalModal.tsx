import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Sparkles, Square, Save, RefreshCw, Activity, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { DiaryEntry, JournalEntryType, AudioRecording } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import { ALL_JOURNAL_TYPES, JOURNAL_TYPES_CONFIG, getJournalTypeConfig } from '../lib/journalTypes';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { generateGeminiContentDirect } from '../lib/gemini';
import { saveAttachmentBlob } from '../lib/attachmentStore';

interface AIVoiceJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDiary: (entry: Partial<DiaryEntry>) => Promise<void> | void;
  appLanguage?: AppLanguage;
  apiKey?: string;
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

  const [processedResult, setProcessedResult] = useState<{
    title: string;
    content: string;
    rawTranscript: string;
    moods: string[];
    sleepHours?: number;
    sportsDuration?: number;
  } | null>(null);

  const timerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingEndTimeRef = useRef<number | null>(null);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isEn = appLanguage === 'en';

  useEffect(() => {
    if (!isOpen) {
      stopRecordingSession();
      SpeechRecognitionManager.getInstance().abortSession();
      setTranscript('');
      transcriptRef.current = '';
      setRecordingSeconds(0);
      setProcessedResult(null);
      setShowCategoryPicker(false);
      setIsSaving(false);
      setMicPermissionError(null);
      audioChunksRef.current = [];
      audioBlobRef.current = null;
      recordingStartTimeRef.current = null;
      recordingEndTimeRef.current = null;
    }
  }, [isOpen]);

  const stopRecordingSession = () => {
    setIsRecording(false);
    recordingEndTimeRef.current = Date.now();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    const manager = SpeechRecognitionManager.getInstance();
    const finalTxt = manager.finalize();
    if (finalTxt) {
      setTranscript(finalTxt);
      transcriptRef.current = finalTxt;
    }
  };

  const startRecording = () => {
    // Reset state
    setTranscript('');
    transcriptRef.current = '';
    setProcessedResult(null);
    setShowCategoryPicker(false);
    setMicPermissionError(null);
    setIsRecording(true);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
    audioBlobRef.current = null;
    recordingStartTimeRef.current = Date.now();
    recordingEndTimeRef.current = null;

    // Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    // Concurrently capture MediaRecorder audio stream for persistent playback
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        try {
          const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : 'audio/mp4';
          const mr = new MediaRecorder(stream, { mimeType: mime });
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          mr.onstop = () => {
            if (audioChunksRef.current.length > 0) {
              const blob = new Blob(audioChunksRef.current, { type: mime });
              audioBlobRef.current = blob;
            }
            try {
              stream.getTracks().forEach((t) => t.stop());
            } catch (_) {}
          };
          mediaRecorderRef.current = mr;
          mr.start(250);
        } catch (e) {
          console.warn('MediaRecorder init note:', e);
        }
      }).catch((err) => {
        console.warn('getUserMedia note for audio recording:', err);
      });
    }

    // Shared Speech Engine (Protected)
    const manager = SpeechRecognitionManager.getInstance();
    if (manager.isSupported()) {
      manager.startSession({
        lang: langInfo.speechLang || 'ar-SA',
        continuous: true,
        callbacks: {
          onTranscriptChange: (state) => {
            setTranscript(state.displayTranscript);
            transcriptRef.current = state.displayTranscript;
          },
          onError: (e) => {
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
              setMicPermissionError(t.micPermissionDenied || 'Microphone permission denied. Please allow microphone access.');
            }
          }
        }
      });
    } else {
      setMicPermissionError(t.speechNotSupported || 'Live Speech Recognition is not supported in this browser.');
    }
  };

  const handleAnalyzeAudio = async () => {
    stopRecordingSession();
    setIsAnalyzing(true);

    const rawSpeechText = (SpeechRecognitionManager.getInstance().getFinalTranscript() || transcriptRef.current || transcript).trim();

    if (!rawSpeechText) {
      alert(t.noSpeechDetected || 'No speech detected to analyze. Please speak clearly.');
      setIsAnalyzing(false);
      return;
    }

    try {
      const now = new Date();
      const isAr = (appLanguage || 'ar') === 'ar';
      const dayName = now.toLocaleDateString(langInfo.code === 'ar' ? 'ar-EG' : langInfo.bcp47, { weekday: 'long' });
      const timeStr = now.toLocaleTimeString(langInfo.code === 'ar' ? 'ar-EG' : langInfo.bcp47, { hour: '2-digit', minute: '2-digit' });

      const analysisPrompt = `نسّق هذه المذكرة الصوتية باللغة العربية مع الحفاظ الكامل على معناها وكلماتها، ثم استخرج المشاعر والحالة المزاجية والوسوم المناسبة دون اختلاق أي معلومات:

"""
${rawSpeechText}
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
        aiResultText = await generateGeminiContentDirect(analysisPrompt, undefined, apiKey);
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

      const finalTitle = parsed?.title || `${t.voiceJournalTitle || 'Voice Journal'} - ${dayName} ${timeStr}`;
      const finalCleanContent = parsed?.content || rawSpeechText;
      const finalMoods = Array.isArray(parsed?.moods) && parsed.moods.length > 0
        ? parsed.moods
        : (isAr ? ['مرتاح', 'منجز'] : ['Calm', 'Productive']);

      setProcessedResult({
        title: finalTitle,
        content: finalCleanContent,
        rawTranscript: rawSpeechText,
        moods: finalMoods,
        sleepHours: typeof parsed?.sleepHours === 'number' ? parsed.sleepHours : undefined,
        sportsDuration: typeof parsed?.sportsDuration === 'number' ? parsed.sportsDuration : undefined
      });
    } catch (err) {
      console.error('Error during voice analysis:', err);
      setProcessedResult({
        title: `${t.voiceJournalTitle || 'Voice Journal'} - ${new Date().toLocaleTimeString(langInfo.bcp47, { hour: '2-digit', minute: '2-digit' })}`,
        content: rawSpeechText,
        rawTranscript: rawSpeechText,
        moods: (appLanguage || 'ar') === 'ar' ? ['تأملي'] : ['Reflective'],
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
      const isAr = (appLanguage || 'ar') === 'ar';
      const dayName = now.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long' });
      const timeStr = now.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      const typeConfig = getJournalTypeConfig(chosenType);

      const voiceBadge = isAr
        ? '🎙️ تفريغ المساعد الصوتي التفاعلي للتدوين'
        : '🎙️ Interactive Voice Journaling Assistant Transcript';

      const formattedContent = `${voiceBadge}\n\n${processedResult.content}`;

      // Calculate exact real recording duration
      const startTime = recordingStartTimeRef.current || Date.now();
      const endTime = recordingEndTimeRef.current || Date.now();
      const exactDuration = Math.max(1, Math.round((endTime - startTime) / 1000), recordingSeconds || 0);

      // Save raw audio blob to IndexedDB for persistent audio playback across reloads
      const attachmentId = `att-vj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      let audioRecordingsList: AudioRecording[] = [];

      if (audioBlobRef.current) {
        await saveAttachmentBlob(attachmentId, audioBlobRef.current, audioBlobRef.current.type || 'audio/webm');
        const blobUrl = URL.createObjectURL(audioBlobRef.current);
        const newAudioRec: AudioRecording = {
          id: `rec-${Date.now()}`,
          name: `تسجيل صوتي ${timeStr}.webm`,
          dataUrl: blobUrl,
          blobUrl: blobUrl,
          duration: exactDuration,
          transcription: processedResult.content,
          attachmentId: attachmentId
        };
        audioRecordingsList = [newAudioRec];
      }

      const newEntryData: Partial<DiaryEntry> = {
        title: processedResult.title || `${typeConfig.labelAr} - ${dayName} ${timeStr}`,
        content: formattedContent,
        diaryType: chosenType,
        moods: processedResult.moods || ['مرتاح'],
        sleepHours: processedResult.sleepHours,
        sportsDuration: processedResult.sportsDuration,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        tags: [isAr ? 'مذكرة صوتية' : 'Voice Journal', isAr ? 'مساعد ذكي' : 'AI Assistant', typeConfig.labelAr],
        importance: 4,
        audioRecordings: audioRecordingsList,
        isLocked: false
      };

      await onSaveDiary(newEntryData);
      setShowCategoryPicker(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving voice journal entry:', err);
      alert(t.voiceSaveFailed || 'Failed to save voice entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[65] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300 max-h-[92vh] flex flex-col relative">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#6D5D6E] to-[#4F3B51] p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Mic className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>{t.voiceJournalTitle || 'AI Voice Journaling Assistant'}</span>
              </h3>
              <p className="text-xs text-purple-100/80 font-medium">
                {t.voiceJournalSub || 'Speak freely & AI formats your voice into structured entries'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">

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
                  {t.requestMicPermission || '🎙️ Request Microphone Permission'}
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
                    {t.chooseCategoryTitle || 'Choose Journal Category 📂'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(false)}
                  className="text-xs text-[#6D5D6E] font-bold hover:underline cursor-pointer"
                >
                  {t.back_btn || 'Back ↩️'}
                </button>
              </div>

              <p className="text-xs text-[#5A5A40] leading-relaxed">
                {t.chooseCategorySub || 'Select the Unified Journal type for this voice note to open it directly in the editor:'}
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
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between group cursor-pointer ${cfg.colorBg} ${cfg.colorBorder} hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl shrink-0">{cfg.icon}</span>
                        <div className="flex flex-col">
                          <span className={`text-xs font-black ${cfg.colorText}`}>
                            {(appLanguage || 'ar') === 'ar' ? cfg.labelAr : cfg.labelEn}
                          </span>
                          <span className="text-[10px] text-gray-500 line-clamp-1">
                            {(appLanguage || 'ar') === 'ar' ? cfg.descriptionAr : cfg.descriptionEn}
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
                  <span>{t.savingEntry || 'Saving entry and opening editor...'}</span>
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
                    onClick={isRecording ? stopRecordingSession : startRecording}
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
                      ? (t.voiceListening || 'Listening attentively...')
                      : (t.voiceRecordBtn || 'Start Voice Recording 🎙️')}
                  </p>
                  {isRecording && (
                    <p className="text-xs font-mono font-black text-rose-600 mt-1">
                      ⏱️ 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </p>
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
                          ? (t.listeningLivePrompt || 'Listening and typing live... Speak clearly now')
                          : (t.voiceLivePlaceholder || 'Spoken words will appear here in real-time while speaking...')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Analysis Loading Indicator */}
              {isAnalyzing && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-center gap-2.5 text-xs text-purple-900 font-bold animate-pulse shadow-xs" dir={langInfo.dir}>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-700 shrink-0" />
                  <span>{t.analyzingVoicePrompt || '⏳ Analyzing and formatting voice recording with AI...'}</span>
                </div>
              )}

              {/* Processed AI Result Preview */}
              {processedResult && !isAnalyzing && (
                <div className="bg-emerald-50/80 border border-emerald-200 p-4.5 rounded-3xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <h4 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>{t.aiFormattedResultTitle || 'AI Formatted Entry Result'}</span>
                    </h4>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                      {t.readyToSaveBadge || 'Ready to save'}
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
                          {processedResult.sleepHours} {t.hoursUnit || 'hrs sleep'}
                        </span>
                      )}
                      {processedResult.sportsDuration && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {processedResult.sportsDuration} {t.minutesUnit || 'mins sports'}
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
                  onClick={handleAnalyzeAudio}
                  disabled={isAnalyzing || (!isRecording && !transcript)}
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Sparkles className={`w-4 h-4 text-purple-200 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? (t.analyzingVoice || 'Analyzing Voice...') : (t.voiceStopBtn || 'Analyze Voice ⏹️')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCategoryPicker}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4 text-emerald-100" />
                  <span>{t.voiceSaveBtn || 'Save as Diary Entry 💾'}</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer mr-auto transition-colors"
          >
            {t.closeBtn || 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
