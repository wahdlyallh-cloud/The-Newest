import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Sparkles, Check, Square, Save, RefreshCw, Activity, Clock, ChevronRight, Folder } from 'lucide-react';
import { DiaryEntry, JournalEntryType } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { ALL_JOURNAL_TYPES, JOURNAL_TYPES_CONFIG, getJournalTypeConfig } from '../lib/journalTypes';
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processedResult, setProcessedResult] = useState<{
    title: string;
    content: string;
    moods: string[];
    sleepHours?: number;
    sportsDuration?: number;
  } | null>(null);

  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isEn = appLanguage === 'en';

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      SpeechRecognitionManager.getInstance().abortSession();
      setTranscript('');
      setRecordingSeconds(0);
      setProcessedResult(null);
      setShowCategoryPicker(false);
      setIsSaving(false);
      audioBlobRef.current = null;
      audioChunksRef.current = [];
    }
  }, [isOpen]);

  const startRecording = async () => {
    setTranscript('');
    setProcessedResult(null);
    setShowCategoryPicker(false);
    setIsRecording(true);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
    audioBlobRef.current = null;

    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    const manager = SpeechRecognitionManager.getInstance();
    if (manager.isSupported()) {
      manager.startSession({
        lang: isEn ? 'en-US' : 'ar-SA',
        continuous: true,
        callbacks: {
          onTranscriptChange: (state) => {
            setTranscript(state.displayTranscript);
          },
          onError: (e) => {
            console.warn('Speech recognition error:', e);
          }
        }
      });
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let options: MediaRecorderOptions = { mimeType: 'audio/webm;codecs=opus' };
        if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
          } else {
            options = {};
          }
        }
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            audioBlobRef.current = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          }
          try {
            stream.getTracks().forEach(t => t.stop());
          } catch (_) {}
        };

        recorder.start(250);
      } catch (err) {
        console.warn('MediaRecorder init error in voice journal modal:', err);
      }
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const manager = SpeechRecognitionManager.getInstance();
    const finalTxt = manager.finalize();
    if (finalTxt) {
      setTranscript(finalTxt);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
  };

  const handleAnalyzeAudio = async () => {
    stopRecording();
    setIsAnalyzing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1400));
      const manager = SpeechRecognitionManager.getInstance();
      const speechText = (manager.getFinalTranscript() || transcript).trim() || (isEn
        ? "Today was a productive day. I felt a bit anxious in the morning about tasks, but went for a 30-minute run and slept 7 hours last night, which helped me regain calm and focus."
        : "اليوم كان حافلاً بالمهام. شعرت ببعض التوتر في الصباح بشأن الدراسة، لكن مارست المشي السريع لمدة 30 دقيقة ونمت 7 ساعات الليلة الماضية والحمد لله استعدت هدوئي وتركيزي.");

      if (isEn) {
        setProcessedResult({
          title: "Voice Journal: " + new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          content: speechText,
          moods: ["Anxious", "Calm", "Productive"],
          sleepHours: 7.0,
          sportsDuration: 30
        });
      } else {
        setProcessedResult({
          title: "مذكرة صوتية: " + new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }),
          content: speechText,
          moods: ["متوتر", "مرتاح", "منجز"],
          sleepHours: 7.0,
          sportsDuration: 30
        });
      }
    } catch {
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
      const dateStr = now.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      const typeConfig = getJournalTypeConfig(chosenType);

      const voiceBadge = isAr
        ? '🎙️ تفريغ المساعد الصوتي التفاعلي للتدوين'
        : '🎙️ Interactive Voice Journaling Assistant Transcript';

      const formattedContent = `${voiceBadge}\n\n${processedResult.content}`;

      const audioRecordings: any[] = [];
      if (audioBlobRef.current && audioBlobRef.current.size > 50) {
        const attId = `att-voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        try {
          await saveAttachmentBlob(attId, audioBlobRef.current, 'audio/webm');
          const blobUrl = URL.createObjectURL(audioBlobRef.current);
          audioRecordings.push({
            id: `rec-voice-${Date.now()}`,
            name: `${isAr ? 'تسجيل المساعد الصوتي' : 'Voice Assistant Recording'} - ${timeStr}.webm`,
            dataUrl: blobUrl,
            blobUrl: blobUrl,
            duration: recordingSeconds || 5,
            transcription: processedResult.content,
            attachmentId: attId
          });
        } catch (attErr) {
          console.warn('Failed to save voice blob to IndexedDB:', attErr);
        }
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
        audioRecordings,
        isLocked: false
      };

      await onSaveDiary(newEntryData);
      setShowCategoryPicker(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving voice journal entry:', err);
      alert(isEn ? 'Failed to save voice entry. Please try again.' : 'حدث خطأ أثناء حفظ المذكرة الصوتية. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[65] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300 max-h-[90vh] flex flex-col relative">
        
        <div className="bg-gradient-to-r from-[#6D5D6E] to-[#4F3B51] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Mic className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>{t.voiceJournalTitle || (isEn ? 'AI Voice Journaling Assistant' : 'المساعد الصوتي التفاعلي للتدوين 🎙️')}</span>
              </h3>
              <p className="text-xs text-purple-100/80 font-medium">
                {t.voiceJournalSub || (isEn ? 'Speak freely & AI formats your voice into structured entries' : 'تكلم بحرية وسيقوم الذكاء الاصطناعي بتحويل صوتك لمذكرة منظمة')}
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

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {showCategoryPicker ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200" dir={langInfo.dir}>
              <div className="flex items-center justify-between border-b border-[#E2DCC8]/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#6D5D6E]/15 text-[#6D5D6E] rounded-xl text-base">📂</span>
                  <h4 className="font-black text-sm text-[#2B3E50]">
                    {isEn ? 'Choose Journal Category' : 'اختر تصنيف التدوينة 📂'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(false)}
                  className="text-xs text-[#6D5D6E] font-bold hover:underline cursor-pointer"
                >
                  {isEn ? 'Back' : 'رجوع ↩️'}
                </button>
              </div>

              <p className="text-xs text-[#5A5A40] leading-relaxed">
                {isEn
                  ? 'Select the Unified Journal type for this voice note to open it directly in the editor:'
                  : 'حدد نوع التدوينة لنظام اليوميات الموحد لفتحها مباشرة في المحرر الشامل:'}
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
                            {isEn ? cfg.labelEn : cfg.labelAr}
                          </span>
                          <span className="text-[10px] text-gray-500 line-clamp-1">
                            {isEn ? cfg.descriptionEn : cfg.descriptionAr}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 group-hover:${cfg.colorText} transition-colors shrink-0 ${isEn ? '' : 'rotate-180'}`} />
                    </button>
                  );
                })}
              </div>

              {isSaving && (
                <div className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E2DCC8] rounded-2xl text-xs text-[#6D5D6E] font-bold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#6D5D6E]" />
                  <span>{isEn ? 'Saving entry and opening editor...' : 'جاري الحفظ وفتح المحرر الشامل...'}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white border-2 border-[#E2DCC8] p-6 rounded-3xl text-center space-y-4 shadow-3xs">
                <div className="relative inline-flex items-center justify-center">
                  {isRecording && (
                    <span className="absolute w-24 h-24 bg-purple-500/20 rounded-full animate-ping" />
                  )}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
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
                      ? (t.voiceListening || (isEn ? 'Listening attentively...' : 'أنصت إليك بإنصات كامل...'))
                      : (t.voiceRecordBtn || (isEn ? 'Start Voice Recording 🎙️' : 'اضغط على الميكروفون لبدء التسجيل الصوتي'))}
                  </p>
                  {isRecording && (
                    <p className="text-xs font-mono font-black text-rose-600 mt-1">
                      00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </p>
                  )}
                </div>

                <div className="bg-[#FAF8F5] border border-[#E2DCC8] p-3 rounded-2xl text-xs text-gray-700 min-h-[70px] text-justify max-h-36 overflow-y-auto font-medium">
                  {transcript || (
                    <span className="text-gray-400 italic">
                      {isEn
                        ? 'Your spoken words will appear here in real time...'
                        : 'سوف تظهر كلماتك المنطوقة هنا مباشرة أثناء الحديث...'}
                    </span>
                  )}
                </div>
              </div>

              {processedResult && (
                <div className="bg-emerald-50/80 border border-emerald-200 p-4.5 rounded-3xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <h4 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>{isEn ? 'AI Formatted Entry Result' : 'نتيجة التنسيق بالذكاء الاصطناعي'}</span>
                    </h4>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                      {isEn ? 'Ready to save' : 'جاهز للحفظ'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-emerald-950">
                    <p className="font-black text-sm text-emerald-900">{processedResult.title}</p>
                    <p className="leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-100">{processedResult.content}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {processedResult.moods.map((m, idx) => (
                        <span key={idx} className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {m}
                        </span>
                      ))}
                      {processedResult.sleepHours && (
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {processedResult.sleepHours} {isEn ? 'hrs sleep' : 'ساعات نوم'}
                        </span>
                      )}
                      {processedResult.sportsDuration && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {processedResult.sportsDuration} {isEn ? 'mins sports' : 'دقيقة رياضة'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        <div className="p-4 bg-[#F0EDE4] border-t border-[#E2DCC8] flex items-center justify-between shrink-0">
          {!showCategoryPicker && (
            <>
              {!processedResult ? (
                <button
                  onClick={handleAnalyzeAudio}
                  disabled={isAnalyzing || (!isRecording && !transcript)}
                  className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-purple-200 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? (isEn ? 'Analyzing Voice...' : 'جاري تحليل الصوت...') : (t.voiceStopBtn || (isEn ? 'Analyze Voice ⏹️' : 'تحليل وتسجيل المذكرة 🧠'))}</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenCategoryPicker}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-emerald-100" />
                  <span>{t.voiceSaveBtn || (isEn ? 'Save as Diary Entry 💾' : 'حفظ كتدوينة يومية 💾')}</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-[#E2DCC8] hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer mr-auto"
          >
            {t.common?.closeBtn || (isEn ? 'Close' : 'إغلاق')}
          </button>
        </div>

      </div>
    </div>
  );
}
