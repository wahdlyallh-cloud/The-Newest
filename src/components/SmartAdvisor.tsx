import { generateGeminiContentDirect } from '../lib/gemini';
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Send, ShieldCheck, HelpCircle, Sparkles, Mic, Trash2, Paperclip, X, Plus, Image as ImageIcon, FileText, Music, Video, Upload, ExternalLink, Bookmark } from 'lucide-react';
import { DiaryEntry, AppLanguage, MultimodalAttachment } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { getAthkarContextForAI, getFormattedAthkarPromptContext } from '../services/aiAthkarSync';
import { processAttachmentUnified, sniffMimeType, getAttachmentTypeCategory } from '../services/attachmentService';
import {
  buildUnifiedKnowledgeIndex,
  retrieveRelevantKnowledge,
  analyzeQueryIntent,
  getGroundedSystemDirectives
} from '../services/unifiedAIKnowledgeService';

export interface AdvisorPermissions {
  diaries: boolean;
  moodLogs: boolean;
  habits: boolean;
  tasks: boolean;
  cbtExercises: boolean;
  therapyReports: boolean;
  voiceNotes: boolean;
  books: boolean;
  gratitude: boolean;
  lifeMap: boolean;
  prosCons: boolean;
}

const DEFAULT_ADVISOR_PERMISSIONS: AdvisorPermissions = {
  diaries: true,
  moodLogs: true,
  habits: true,
  tasks: true,
  cbtExercises: true,
  therapyReports: true,
  voiceNotes: true,
  books: true,
  gratitude: true,
  lifeMap: true,
  prosCons: true,
};

const getPermissionsConfig = (lang: AppLanguage) => {
  const t = getTranslation(lang);
  return [
    { key: 'diaries' as const, title: t.smartContextDiariesTitle, desc: t.smartContextDiariesDesc, icon: '📖' },
    { key: 'moodLogs' as const, title: t.smartContextMoodLogsTitle, desc: t.smartContextMoodLogsDesc, icon: '📊' },
    { key: 'habits' as const, title: t.smartContextHabitsTitle, desc: t.smartContextHabitsDesc, icon: '🎯' },
    { key: 'tasks' as const, title: t.smartContextTasksTitle, desc: t.smartContextTasksDesc, icon: '📝' },
    { key: 'cbtExercises' as const, title: t.smartContextCbtTitle, desc: t.smartContextCbtDesc, icon: '🧠' },
    { key: 'therapyReports' as const, title: t.smartContextReportsTitle, desc: t.smartContextReportsDesc, icon: '🩺' },
    { key: 'voiceNotes' as const, title: t.smartContextVoiceTitle, desc: t.smartContextVoiceDesc, icon: '🗣️' },
    { key: 'books' as const, title: t.smartContextBooksTitle, desc: t.smartContextBooksDesc, icon: '📚' },
    { key: 'gratitude' as const, title: t.smartContextGratitudeTitle, desc: t.smartContextGratitudeDesc, icon: '🌟' },
    { key: 'lifeMap' as const, title: t.smartContextLifeMapTitle, desc: t.smartContextLifeMapDesc, icon: '🗺️' },
    { key: 'prosCons' as const, title: t.smartContextProsConsTitle, desc: t.smartContextProsConsDesc, icon: '⚖️' },
  ];
};

interface SmartAdvisorProps {
  diaries: DiaryEntry[];
  habits?: any[];
  gratitudeCards?: any[];
  books?: any[];
  userApiKey?: string;
  appLanguage?: AppLanguage;
  onFilePickerOpen?: () => void;
  onFilePickerClose?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

export default function SmartAdvisor({ diaries, habits = [], gratitudeCards = [], books = [], userApiKey, appLanguage = 'ar', onFilePickerOpen, onFilePickerClose }: SmartAdvisorProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const permissionsConfig = getPermissionsConfig(appLanguage);
  const isAr = appLanguage === 'ar';

  // Dual Tab State
  const [activeAdvisorTab, setActiveAdvisorTab] = useState<'diary' | 'general'>('diary');

  // Diary Pro Advisor Chat History
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('yawmiyati_chat_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing chat messages:', e);
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: isAr
          ? 'أهلاً بك في **المستشار الذكي (حياة AI / Hayat AI)**. أنا صديقك ومستشارك الخاص، ولدي الصلاحية لمساعدتك في ربط الخيوط واكتشاف الأنماط وتحليل مزاجك على مدار الأيام والأسابيع.\n\nيمكنك أن تسألني عما تشاء، مثل:\n• *"ما الذي سبب لي القلق خلال الأسبوع الماضي؟"*\n• *"ماذا حدث لي يوم 15 يوليو؟"*\n• *"متى كانت آخر مرة شعرت فيها بالسعادة؟"*\n• *"قارن بين حالتي النفسية مؤخراً ومقارنتها بالشهر الماضي."*'
          : 'Welcome to **Smart Advisor (Hayat AI)**. I am your personal assistant and advisor, here to help you connect thoughts, discover patterns, and analyze your mood over time.\n\nYou can ask me anything, such as:\n• *"What caused my anxiety over the past week?"*\n• *"What happened to me on July 15th?"*\n• *"When was the last time I felt happy?"*\n• *"Compare my recent mental state with last month."*',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // General AI Advisor Chat History (Independent Storage)
  const [generalMessages, setGeneralMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('yawmiyati_general_chat_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing general chat messages:', e);
      }
    }
    return [
      {
        id: 'welcome_general',
        sender: 'ai',
        text: isAr
          ? 'أهلاً بك في **المستشار الذكي العام (Hayat AI General AI)** 🌐.\n\nأنا مساعدك الشامل غير المرتبط بيومياتك الشخصية. يمكنك سؤالي عن المعرفة العامة، البرمجة، الدراسة، العلوم، الترجمة، أو إرفاق ملفات وصور ومستندات PDF وتسجيلات صوتية ومقاطع فيديو لتحليلها بكل دقة.'
          : 'Welcome to **General AI Advisor (Hayat AI)** 🌐.\n\nI am your general assistant independent of your private diary notes. Ask me about general knowledge, programming, science, translation, or attach images, PDF files, audio, and videos for instant analysis.',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Multimodal File Attachments for General Mode & Pro Mode
  const [generalMultimodalFiles, setGeneralMultimodalFiles] = useState<MultimodalAttachment[]>([]);
  const [diaryMultimodalFiles, setDiaryMultimodalFiles] = useState<MultimodalAttachment[]>([]);
  const [fileErrorToast, setFileErrorToast] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => {
    return localStorage.getItem('yawmiyati_chat_input') || '';
  });
  const [hasConsent, setHasConsent] = useState(() => {
    const saved = localStorage.getItem('yawmiyati_chat_has_consent');
    return saved !== null ? saved === 'true' : true;
  });

  // Granular Advisor Access Permissions State
  const [advisorPermissions, setAdvisorPermissions] = useState<AdvisorPermissions>(() => {
    const saved = localStorage.getItem('yawmiyati_advisor_permissions');
    if (saved) {
      try {
        return { ...DEFAULT_ADVISOR_PERMISSIONS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error parsing advisor permissions:', e);
      }
    }
    return DEFAULT_ADVISOR_PERMISSIONS;
  });
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const isAllEnabled = Object.values(advisorPermissions).every(val => val === true);

  // Sync hasConsent with advisorPermissions.diaries
  const toggleDiariesConsent = () => {
    const nextVal = !advisorPermissions.diaries;
    setHasConsent(nextVal);
    setAdvisorPermissions(prev => {
      const updated = { ...prev, diaries: nextVal };
      try {
        localStorage.setItem('yawmiyati_advisor_permissions', JSON.stringify(updated));
        localStorage.setItem('yawmiyati_chat_has_consent', String(nextVal));
      } catch (e) { console.warn(e); }
      return updated;
    });
  };

  const toggleAllPermissions = () => {
    const nextVal = !isAllEnabled;
    const updated: AdvisorPermissions = {
      diaries: nextVal,
      moodLogs: nextVal,
      habits: nextVal,
      tasks: nextVal,
      cbtExercises: nextVal,
      therapyReports: nextVal,
      voiceNotes: nextVal,
      books: nextVal,
      gratitude: nextVal,
      lifeMap: nextVal,
      prosCons: nextVal,
    };
    setAdvisorPermissions(updated);
    setHasConsent(nextVal);
    try {
      localStorage.setItem('yawmiyati_advisor_permissions', JSON.stringify(updated));
      localStorage.setItem('yawmiyati_chat_has_consent', String(nextVal));
    } catch (e) { console.warn(e); }
  };

  const toggleSinglePermission = (key: keyof AdvisorPermissions) => {
    setAdvisorPermissions(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (key === 'diaries') {
        setHasConsent(updated.diaries);
      }
      try {
        localStorage.setItem('yawmiyati_advisor_permissions', JSON.stringify(updated));
      } catch (e) { console.warn(e); }
      return updated;
    });
  };

  const [activeAnalysisTopic, setActiveAnalysisTopic] = useState<'all' | 'mood' | 'habits' | 'cbt' | 'gratitude'>('all');
  const [selectedVoice, setSelectedVoice] = useState<'female_calm' | 'male_wise' | 'female_energetic'>('female_calm');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<MultimodalAttachment[]>([]);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [activeAttachmentType, setActiveAttachmentType] = useState<'none' | 'link' | 'video' | 'pdf'>('none');
  const [tempLink, setTempLink] = useState<string>('');
  const [tempVideo, setTempVideo] = useState<string>('');
  const [tempPdfName, setTempPdfName] = useState<string>('');
  const [tempPdfUrl, setTempPdfUrl] = useState<string>('');
  const [chatAttachments, setChatAttachments] = useState<{
    links: string[];
    videos: string[];
    pdfs: { name: string; url: string }[];
  }>({
    links: [],
    videos: [],
    pdfs: []
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const generalMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem('yawmiyati_advisor_voice');
      if (savedVoice) setSelectedVoice(savedVoice as any);
      const savedConsent = localStorage.getItem('yawmiyati_advisor_consent');
      if (savedConsent !== null) setHasConsent(savedConsent === 'true');
      const savedPerms = localStorage.getItem('yawmiyati_advisor_permissions');
      if (savedPerms) setAdvisorPermissions(JSON.parse(savedPerms));
      const savedTherapist = localStorage.getItem('yawmiyati_therapist_chat_history');
      if (savedTherapist) setMessages(JSON.parse(savedTherapist));
      const savedGeneral = localStorage.getItem('yawmiyati_general_chat_history');
      if (savedGeneral) setGeneralMessages(JSON.parse(savedGeneral));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // --- 🎙️ Real-time Audio / Speech Interface states & controls ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const voiceStatusRef = useRef<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');

  // Keep ref synchronized to prevent closure stale states in callbacks
  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  const stopVoiceChatSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const endVoiceChatSession = () => {
    stopVoiceChatSpeech();
    SpeechRecognitionManager.getInstance().abortSession();
    setShowVoiceModal(false);
    setVoiceStatus('idle');
    setVoiceTranscript('');
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopVoiceChatSpeech();
      SpeechRecognitionManager.getInstance().abortSession();
    };
  }, []);

  const startListeningVoiceChat = () => {
    stopVoiceChatSpeech();

    // Prevent starting listening while AI is speaking
    if (voiceStatusRef.current === 'speaking' || voiceStatusRef.current === 'analyzing') {
      return;
    }

    const manager = SpeechRecognitionManager.getInstance();
    if (!manager.isSupported()) {
      setVoiceStatus('idle');
      setVoiceTranscript(appLanguage === 'ar'
        ? (t?.speechNotSupported || 'Speech recognition not supported in this browser.')
        : 'Browser does not support Speech Recognition.');
      return;
    }

    setVoiceStatus('listening');
    setVoiceTranscript(t.voiceListeningPrompt);

    manager.startSession({
      lang: langInfo.speechLang,
      continuous: false,
      callbacks: {
        onTranscriptChange: (state) => {
          if (voiceStatusRef.current === 'analyzing' || voiceStatusRef.current === 'speaking') return;
          if (state.displayTranscript) {
            setVoiceTranscript(state.displayTranscript);
          }
        },
        onError: (err) => {
          console.error('Voice chat speech recognition error:', err);
          if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
            setVoiceStatus('idle');
            setVoiceTranscript(appLanguage === 'ar'
              ? '⚠️ تم رفض إذن الميكروفون.'
              : '⚠️ Microphone permission denied.');
            return;
          }
          if (err.error !== 'no-speech' && voiceStatusRef.current === 'listening') {
            setVoiceStatus('idle');
          }
        },
        onSpeechEnd: () => {
          setTimeout(() => {
            if (voiceStatusRef.current === 'listening') {
              const finalQuery = manager.finalize();
              if (finalQuery && finalQuery.trim().length > 0) {
                setVoiceTranscript(finalQuery);
                handleVoiceChatSubmit(finalQuery);
              }
            }
          }, 350);
        }
      }
    });
  };

  const handleVoiceChatSubmit = async (queryText: string) => {
    if (voiceStatusRef.current === 'analyzing') return;
    setVoiceStatus('analyzing');
    stopVoiceChatSpeech();

    // Stop speech recognition while analyzing to prevent echo
    SpeechRecognitionManager.getInstance().destroyActiveRecognition();

    const isGeneralMode = activeAdvisorTab === 'general';

    // Format recent conversation context (last 6 messages) to preserve voice conversation memory for follow-up questions
    const activeHistory = (isGeneralMode ? generalMessages : messages).slice(-6);
    let contextualQuery = queryText;
    if (activeHistory.length > 0) {
      const historySummary = activeHistory.map(m => `${m.sender === 'user' ? 'المستخدم' : 'المستشار'}: ${m.text}`).join('\n');
      contextualQuery = `سياق المحادثة السابقة بينك وبين المستخدم:\n${historySummary}\n\nسؤال المستخدم الحالي:\n${queryText}`;
    }

    try {
      let localCopingCards: any[] = [];
      let localProsCons: any[] = [];
      try {
        const cRaw = localStorage.getItem('app_custom_coping_cards');
        if (cRaw) localCopingCards = JSON.parse(cRaw);
        const pRaw = localStorage.getItem('yawmiyati_pros_cons_records');
        if (pRaw) localProsCons = JSON.parse(pRaw);
      } catch {}

      const diariesToPass = (hasConsent && advisorPermissions.diaries) ? diaries : [];
      const habitsToPass = (hasConsent && advisorPermissions.habits) ? habits : [];
      const gratitudeCardsToPass = (hasConsent && advisorPermissions.gratitude) ? gratitudeCards : [];
      const booksToPass = (hasConsent && advisorPermissions.books) ? books : [];
      const readyAttachments = (isGeneralMode ? generalMultimodalFiles : diaryMultimodalFiles).filter(f => !f.status || f.status === 'ready');

      const bodyData = {
        mode: isGeneralMode ? 'general' : 'diary',
        diaries: diariesToPass,
        habits: habitsToPass,
        gratitudeCards: gratitudeCardsToPass,
        books: booksToPass,
        query: contextualQuery,
        attachments: readyAttachments,
        appLanguage,
        athkarContext: getAthkarContextForAI(),
        athkarPromptText: getFormattedAthkarPromptContext(),
        customCopingCards: (hasConsent && advisorPermissions.cbtExercises) ? localCopingCards : [],
        prosConsRecords: (hasConsent && advisorPermissions.prosCons) ? localProsCons : [],
        permissions: advisorPermissions
      };

      const response = await fetch('/api/gemini/smart-advisor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-key': userApiKey || '',
          'x-app-language': appLanguage
        },
        body: JSON.stringify(bodyData)
      });

      const responseText = await response.text();
      let data: any = null;
      if (responseText && responseText.trim()) {
        try { data = JSON.parse(responseText); } catch (e) {}
      }

      let answerText = data?.answer || data?.text;

      // Fail-proof direct REST call fallback for voice session
      if (!answerText) {
        const index = buildUnifiedKnowledgeIndex({
          diaries: diariesToPass,
          habits: habitsToPass,
          gratitudeCards: gratitudeCardsToPass,
          books: booksToPass,
          athkarContext: getAthkarContextForAI(),
          customCopingCards: (hasConsent && advisorPermissions.cbtExercises) ? localCopingCards : [],
          prosConsRecords: (hasConsent && advisorPermissions.prosCons) ? localProsCons : [],
          permissions: advisorPermissions
        });

        const retrieved = await retrieveRelevantKnowledge(contextualQuery, index, { maxEntities: 8, requireMediaBlobs: true });
        const groundedPrompt = `سؤال المستخدم: "${contextualQuery}"\n\n${retrieved.formattedContextText}\n\n${getGroundedSystemDirectives(appLanguage)}`;

        answerText = await generateGeminiContentDirect(
          groundedPrompt,
          isGeneralMode
            ? `أنت المستشار الذكي العام في تطبيق 'حياة AI'. أجب صوتياً بإيجاز وبراعة ومباشرة.`
            : `أنت المستشار الذكي الموحد في تطبيق 'حياة AI'. أجب صوتياً بلغة دافئة وموجزة ومبنية على البيانات.`,
          userApiKey
        );
      }

      if (!answerText) {
        answerText = isGeneralMode
          ? 'أهلاً بك! أنا المستشار العام في حياة AI. يسعدني الإجابة والمساعدة في أي موضوع عام أو معرفي.'
          : 'أهلاً بك! أنا المستشار الذكي لليوميات.';
      }

      setVoiceStatus('speaking');
      setVoiceTranscript(answerText);

      // Save user & AI messages into the active tab chat history
      const userMsgId = Date.now().toString();
      const aiMsgId = (Date.now() + 1).toString();
      const userMsg = { id: userMsgId, sender: 'user' as const, text: queryText, createdAt: new Date().toISOString() };
      const aiMsg = { id: aiMsgId, sender: 'ai' as const, text: answerText, createdAt: new Date().toISOString() };

      if (isGeneralMode) {
        setGeneralMessages(prev => {
          const nextArr = [...prev, userMsg, aiMsg];
          localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(nextArr));
          return nextArr;
        });
      } else {
        setMessages(prev => {
          const nextArr = [...prev, userMsg, aiMsg];
          localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(nextArr));
          return nextArr;
        });
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = answerText.replace(/[*#_`~•]/g, '').replace(/🔗|🎥|📄/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Intelligent Bilingual Voice Detection: Use native English voice for English text and Arabic voice for Arabic text
        const isArabicText = /[\u0600-\u06FF]/.test(cleanText);
        utterance.lang = isArabicText ? langInfo.speechLang : 'en-US';
        
        const voices = window.speechSynthesis.getVoices();
        const langVoice = voices.find(v => v.lang.toLowerCase().startsWith(utterance.lang.toLowerCase().substring(0, 2)));
        if (langVoice) utterance.voice = langVoice;

        utterance.onend = () => {
          // Continuous Voice Conversation Loop: Automatically resume listening ONLY if modal is still active & speaking
          if (voiceStatusRef.current === 'speaking') {
            setVoiceStatus('listening');
            startListeningVoiceChat();
          }
        };
        utterance.onerror = () => {
          setVoiceStatus('idle');
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setVoiceStatus('idle');
      }
    } catch (e: any) {
      setVoiceStatus('idle');
      setVoiceTranscript(`⚠️ ${e?.message || 'يلزم إضافة مفتاح Gemini API الخاص بك أولاً في إعدادات التطبيق.'}`);
    }
  };

  const handleToggleSpeech = (msgId: string, text: string) => {
    if (currentlySpeakingId === msgId) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentlySpeakingId(null);
    } else {
      setCurrentlySpeakingId(msgId);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*#_`~•]/g, '').replace(/🔗|🎥|📄/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langInfo.speechLang;
        
        const voices = window.speechSynthesis.getVoices();
        const langVoice = voices.find(v => v.lang.toLowerCase().startsWith(langInfo.code.toLowerCase()));
        if (langVoice) utterance.voice = langVoice;
        
        utterance.onend = () => {
          setCurrentlySpeakingId(null);
        };
        utterance.onerror = () => {
          setCurrentlySpeakingId(null);
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const quickQuestions = [
    t('advisorQuickQ1'),
    t('advisorQuickQ2'),
    t('advisorQuickQ3'),
    t('advisorQuickQ4'),
    t('advisorQuickQ5')
  ];

  const triggerFilePicker = () => {
    const ts = new Date().toISOString();
    console.log(`[ATTACHMENT TRACE] timestamp: ${ts} | stage: TRIGGER_FILE_PICKER_CALLED`);
    onFilePickerOpen?.();

    if (fileInputRef.current) {
      // Reset input value BEFORE opening picker so re-selecting same file fires onChange cleanly,
      // without detaching native file handle during upload!
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else {
      console.error('[ATTACHMENT TRACE] fileInputRef.current is null!');
    }

    setTimeout(() => {
      const handleWindowFocus = () => {
        window.removeEventListener('focus', handleWindowFocus);
        setTimeout(() => {
          onFilePickerClose?.();
        }, 500);
      };
      window.addEventListener('focus', handleWindowFocus, { once: true });
    }, 1000);
  };

  // File Upload Handler for Multimodal AI Modes using Unified Attachment Service
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAttachmentMenu(false);
    const files = e.target.files;
    const currentTab = activeAdvisorTab; // Snapshot active tab to ensure state stability across async ticks
    const ts = () => new Date().toISOString();

    try {
      console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | stage: 1_FILE_SELECTED | activeTab: ${currentTab} | count: ${files ? files.length : 0}`);

      if (!files || files.length === 0) {
        console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | stage: FILE_SELECTION_CANCELLED`);
        onFilePickerClose?.();
        return;
      }

      setFileErrorToast(null);

      // Read files safely without resetting input.value here to prevent mobile browsers from detaching file handles!
      const selectedFiles = Array.from(files);

      selectedFiles.forEach((file) => {
        const mimeType = sniffMimeType(file);
        const lastMod = file.lastModified || Date.now();
        console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | actualSizeBytes: ${file.size} | mimeType: ${mimeType} | lastModified: ${lastMod} | stage: 2_FILE_METADATA`);
      });

      // Step 1: Create placeholder attachments with status 'uploading' so they appear in the UI IMMEDIATELY
      const pendingAtts: MultimodalAttachment[] = selectedFiles.map(file => {
        const mimeType = sniffMimeType(file);
        const category = getAttachmentTypeCategory(mimeType);
        const attId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | actualSizeBytes: ${file.size} | mimeType: ${mimeType} | id: ${attId} | stage: 3_ATTACHMENT_STATE_CREATED`);
        return {
          id: attId,
          name: file.name,
          type: category,
          mimeType,
          sizeBytes: file.size,
          status: 'uploading'
        };
      });

      if (currentTab === 'general') {
        setGeneralMultimodalFiles(prev => [...prev, ...pendingAtts]);
      } else {
        setDiaryMultimodalFiles(prev => [...prev, ...pendingAtts]);
      }
      console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | stage: 13_ATTACHMENT_RENDERED -> ${pendingAtts.length} items rendered in UI with status 'uploading'`);

      // Step 2: Upload files progressively and update their status in real-time
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const pendingId = pendingAtts[i].id;

        try {
          const att = await processAttachmentUnified(file, userApiKey, (status) => {
            console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | id: ${pendingId} | stage: 12_ATTACHMENT_STATE_UPDATED -> ${status}`);
            const updateFn = (prev: MultimodalAttachment[]) =>
              prev.map(item => item.id === pendingId ? { ...item, status } : item);
            if (currentTab === 'general') setGeneralMultimodalFiles(updateFn);
            else setDiaryMultimodalFiles(updateFn);
          });

          // Mark as ready
          console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | id: ${pendingId} | stage: 12_ATTACHMENT_STATE_UPDATED -> ready`);
          const updateFn = (prev: MultimodalAttachment[]) =>
            prev.map(item => item.id === pendingId ? { ...att, id: pendingId, status: 'ready' } : item);
          if (currentTab === 'general') setGeneralMultimodalFiles(updateFn);
          else setDiaryMultimodalFiles(updateFn);

        } catch (err: any) {
          console.error(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | id: ${pendingId} | stage: UPLOAD_ERROR ->`, err);
          const errMsg = err?.message || String(err);
          setFileErrorToast(`فشل رفع/تجهيز الملف "${file.name}": ${errMsg}`);

          const updateFn = (prev: MultimodalAttachment[]) =>
            prev.map(item => item.id === pendingId ? { ...item, status: 'failed', errorMessage: errMsg } : item);
          if (currentTab === 'general') setGeneralMultimodalFiles(updateFn);
          else setDiaryMultimodalFiles(updateFn);
        }
      }
    } catch (outerErr: any) {
      console.error(`[ATTACHMENT TRACE] timestamp: ${ts()} | stage: TOP_LEVEL_HANDLE_FILE_UPLOAD_ERROR ->`, outerErr);
      setFileErrorToast(`حدث خطأ أثناء قراءة الملف: ${outerErr?.message || String(outerErr)}`);
    } finally {
      onFilePickerClose?.();
    }
  };

  const removeMultimodalFile = (id: string) => {
    if (activeAdvisorTab === 'general') {
      setGeneralMultimodalFiles(prev => prev.filter(f => f.id !== id));
    } else {
      setDiaryMultimodalFiles(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleSend = async (textToSend: string) => {
    // Mode Switcher Branching
    if (activeAdvisorTab === 'general') {
      const isUploadingOrProcessing = generalMultimodalFiles.some(f => f.status === 'uploading' || f.status === 'processing');
      if (isUploadingOrProcessing) {
        setFileErrorToast('جاري رفع وتجهيز المرفقات، يرجى الانتظار لحين اكتمال الرفع قبل {t.sendConsultationBtn || "Send"} الرسالة.');
        return;
      }

      const readyFiles = generalMultimodalFiles.filter(f => !f.status || f.status === 'ready');
      if (!textToSend.trim() && readyFiles.length === 0) {
        if (generalMultimodalFiles.some(f => f.status === 'failed')) {
          setFileErrorToast('تعذر {t.sendConsultationBtn || "Send"} الرسالة نظراً لفشل رفع المرفق. يرجى حذف المرفق المربك وإعادة رفعه.');
        }
        return;
      }
      if (loading) return;

      let sendText = textToSend;
      if (readyFiles.length > 0) {
        sendText += `\n📎 المرفقات: ${readyFiles.map(f => f.name).join(' ، ')}`;
      }

      const userMsg: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: sendText,
        createdAt: new Date().toISOString()
      };

      const updatedMsgs = [...generalMessages, userMsg];
      setGeneralMessages(updatedMsgs);
      localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(updatedMsgs));

      const filesToSend = [...readyFiles];
      setInput('');
      setGeneralMultimodalFiles([]);
      setLoading(true);

      try {
        // Retrieve local app data if general query references internal items (Hybrid Support)
        let localCopingCards: any[] = [];
        let localProsCons: any[] = [];
        try {
          const cRaw = localStorage.getItem('app_custom_coping_cards');
          if (cRaw) localCopingCards = JSON.parse(cRaw);
          const pRaw = localStorage.getItem('yawmiyati_pros_cons_records');
          if (pRaw) localProsCons = JSON.parse(pRaw);
        } catch {}

        const response = await fetch('/api/gemini/smart-advisor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-key': userApiKey || '',
            'x-app-language': appLanguage
          },
          body: JSON.stringify({
            mode: 'general',
            query: textToSend,
            attachments: filesToSend,
            diaries: (hasConsent && advisorPermissions.diaries) ? diaries : [],
            habits: (hasConsent && advisorPermissions.habits) ? habits : [],
            gratitudeCards: (hasConsent && advisorPermissions.gratitude) ? gratitudeCards : [],
            books: (hasConsent && advisorPermissions.books) ? books : [],
            athkarContext: getAthkarContextForAI(),
            athkarPromptText: getFormattedAthkarPromptContext(),
            customCopingCards: (hasConsent && advisorPermissions.cbtExercises) ? localCopingCards : [],
            prosConsRecords: (hasConsent && advisorPermissions.prosCons) ? localProsCons : [],
            permissions: advisorPermissions,
            appLanguage
          })
        });

        const responseText = await response.text();
        let data: any = null;
        if (responseText && responseText.trim()) {
          try { data = JSON.parse(responseText); } catch (e) {}
        }

        let answerText = data?.answer || data?.text;
        if (!answerText) {
          answerText = await generateGeminiContentDirect(
            textToSend || 'يرجى تقديم إجابة شاملة',
            `أنت المستشار الذكي العام في تطبيق 'حياة AI'. أجب على جميع استفسارات المستخدم بوضوح، حكمة، وذكاء، سواء كانت في المعرفة العامة، البرمجة، الدراسة، العلوم، الترجمة، أو تحليل المرفقات.`,
            userApiKey
          );
        }

        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: answerText || 'أهلاً بك! أنا المستشار العام في حياة AI. يسعدني الإجابة والمساعدة في أي موضوع تعبيري أو معرفي.',
          createdAt: new Date().toISOString()
        };

        setGeneralMessages(prev => {
          const finalArr = [...prev, aiMsg];
          localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(finalArr));
          return finalArr;
        });
      } catch (e: any) {
        console.error('General Advisor Error:', e);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Diary Pro Advisor Mode Logic
    const isUploadingOrProcessing = diaryMultimodalFiles.some(f => f.status === 'uploading' || f.status === 'processing');
    if (isUploadingOrProcessing) {
      setFileErrorToast('جاري رفع وتجهيز المرفقات، يرجى الانتظار لحين اكتمال الرفع قبل {t.sendConsultationBtn || "Send"} الرسالة.');
      return;
    }

    const readyFiles = diaryMultimodalFiles.filter(f => !f.status || f.status === 'ready');
    if (!textToSend.trim() && chatAttachments.links.length === 0 && chatAttachments.videos.length === 0 && chatAttachments.pdfs.length === 0 && readyFiles.length === 0) {
      if (diaryMultimodalFiles.some(f => f.status === 'failed')) {
        setFileErrorToast('تعذر {t.sendConsultationBtn || "Send"} الرسالة نظراً لفشل رفع المرفق. يرجى حذف المرفق المربك وإعادة رفعه.');
      }
      return;
    }
    if (loading) return;

    // Format prompt text with active chat attachments to pass transparently to AI model
    let textWithAttachments = textToSend;
    const attachmentsText: string[] = [];
    if (readyFiles.length > 0) {
      attachmentsText.push(`\n📎 الملفات المرفقة: ${readyFiles.map(f => f.name).join(' ، ')}`);
    }
    if (chatAttachments.links.length > 0) {
      attachmentsText.push(`\n🔗 الروابط المرفقة بالشات: ${chatAttachments.links.join(' ، ')}`);
    }
    if (chatAttachments.videos.length > 0) {
      attachmentsText.push(`\n🎥 الفيديوهات المرفقة بالشات: ${chatAttachments.videos.join(' ، ')}`);
    }
    if (chatAttachments.pdfs.length > 0) {
      attachmentsText.push(`\n📄 ملفات PDF المرفقة بالشات: ${chatAttachments.pdfs.map(p => `${p.name} (${p.url})`).join(' ، ')}`);
    }
    if (attachmentsText.length > 0) {
      textWithAttachments += '\n' + attachmentsText.join('\n');
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textWithAttachments,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    const filesToSend = [...readyFiles];
    setInput('');
    setDiaryMultimodalFiles([]);
    setChatAttachments({ links: [], videos: [], pdfs: [] });
    setActiveAttachmentType('none');
    setLoading(true);

    try {
      // Filter context based on consent and granular advisor permissions
      const diariesToPass = (hasConsent && advisorPermissions.diaries) ? diaries : [];
      const habitsToPass = (hasConsent && advisorPermissions.habits) ? habits : [];
      const gratitudeCardsToPass = (hasConsent && advisorPermissions.gratitude) ? gratitudeCards : [];
      const booksToPass = (hasConsent && advisorPermissions.books) ? books : [];

      let localCopingCards: any[] = [];
      let localProsCons: any[] = [];
      try {
        const cRaw = localStorage.getItem('app_custom_coping_cards');
        if (cRaw) localCopingCards = JSON.parse(cRaw);
        const pRaw = localStorage.getItem('yawmiyati_pros_cons_records');
        if (pRaw) localProsCons = JSON.parse(pRaw);
      } catch {}

      const response = await fetch('/api/gemini/smart-advisor', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-key': userApiKey || '',
          'x-app-language': appLanguage
        },
        body: JSON.stringify({
          diaries: diariesToPass,
          habits: habitsToPass,
          gratitudeCards: gratitudeCardsToPass,
          books: booksToPass,
          query: textWithAttachments,
          attachments: filesToSend,
          appLanguage: appLanguage,
          athkarContext: getAthkarContextForAI(),
          athkarPromptText: getFormattedAthkarPromptContext(),
          customCopingCards: (hasConsent && advisorPermissions.cbtExercises) ? localCopingCards : [],
          prosConsRecords: (hasConsent && advisorPermissions.prosCons) ? localProsCons : [],
          permissions: advisorPermissions
        })
      });

      const responseText = await response.text();
      let data: any = null;
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {}
      }

      let finalAnswer = data?.answer || data?.text;

      // Fail-proof direct REST call fallback if serverless function or response is empty/invalid
      if (!data?.success || !finalAnswer || typeof finalAnswer !== 'string' || !finalAnswer.trim() || (data?.error && String(data.error).includes('not found'))) {
        const index = buildUnifiedKnowledgeIndex({
          diaries: diariesToPass,
          habits: habitsToPass,
          gratitudeCards: gratitudeCardsToPass,
          books: booksToPass,
          athkarContext: getAthkarContextForAI(),
          customCopingCards: (hasConsent && advisorPermissions.cbtExercises) ? localCopingCards : [],
          prosConsRecords: (hasConsent && advisorPermissions.prosCons) ? localProsCons : [],
          permissions: advisorPermissions
        });

        const retrieved = await retrieveRelevantKnowledge(textWithAttachments, index, { maxEntities: 10, requireMediaBlobs: true });
        const groundedPrompt = `سؤال المستخدم: "${textWithAttachments}"\n\n${retrieved.formattedContextText}\n\n${getGroundedSystemDirectives(appLanguage)}`;

        finalAnswer = await generateGeminiContentDirect(
          groundedPrompt,
          `أنت المستشار الذكي الموحد في تطبيق 'حياة AI'. التزم بالدقة والشفافية التامة، واذكر المصادر بوضوح.`,
          userApiKey
        );
      }

      setMessages(prev => {
        const updated = [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'ai' as const,
          text: finalAnswer || 'أهلاً بك في المستشار الذكي! أنا رفيقك للتحليل والاستشارة والتطوير الذاتي في أي وقت.',
          createdAt: new Date().toISOString()
        }];
        localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(updated));
        return updated;
      });
    } catch (e: any) {
      console.error("SmartAdvisor Execution Error:", e);
      const errorMsg = e?.message || 'تعذر الاتصال بـ Gemini API';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `⚠️ خطأ في الاتصال: ${errorMsg}`,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Real Web Speech API Dictation (Speech To Text) with secure simulated fallback
  const handleDictation = () => {
    const manager = SpeechRecognitionManager.getInstance();
    if (isRecording) {
      const finalRecorded = manager.finalize();
      setIsRecording(false);
      if (finalRecorded) {
        setInput(prev => {
          const base = prev ? prev.trim() : '';
          return base ? `${base} ${finalRecorded}` : finalRecorded;
        });
      }
    } else {
      if (!manager.isSupported()) {
        setIsRecording(true);
        setTimeout(() => {
          setIsRecording(false);
          const mockDictations = [
            "ما هي مسببات التوتر التي قمت بكتابتها مؤخراً في يومياتي؟",
            "هل الرياضة اليومية ساعدتني في تخفيف وطأة القلق والتوتر؟",
            "لخص مذكرات الأسبوع الماضي وقدم لي نصيحة وقائية وعيادية.",
            "ما هو تقييمي النفسي العام بناءً على تدوينات النوم والرياضة؟"
          ];
          const randomQuery = mockDictations[Math.floor(Math.random() * mockDictations.length)];
          setInput(randomQuery);
        }, 1200);
        return;
      }

      setIsRecording(true);
      manager.startSession({
        lang: langInfo.speechLang,
        continuous: false,
        callbacks: {
          onError: (err) => {
            console.error("Speech recognition error:", err);
            setIsRecording(false);
          },
          onSpeechEnd: () => {
            const finalRecorded = manager.finalize();
            setIsRecording(false);
            if (finalRecorded) {
              setInput(prev => {
                const base = prev ? prev.trim() : '';
                return base ? `${base} ${finalRecorded}` : finalRecorded;
              });
            }
          }
        }
      });
    }
  };

  const handleClearHistory = () => {
    const isGeneral = activeAdvisorTab === 'general';
    const confirmMsg = isGeneral
      ? (t.confirmClearGeneralChat)
      : (t.confirmClearAdvisorChat);

    if (window.confirm(confirmMsg)) {
      if (isGeneral) {
        const welcomeGen: Message[] = [{
          id: 'welcome_general',
          sender: 'ai',
          text: isAr
            ? 'تم مسح سجل المستشار العام. كيف يمكنني مساعدتك اليوم في الأسئلة والمعرفة؟ 🌐'
            : 'General AI history cleared. How can I help you today? 🌐',
          createdAt: new Date().toISOString()
        }];
        setGeneralMessages(welcomeGen);
        localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(welcomeGen));
      } else {
        const welcomeDiary: Message[] = [{
          id: 'welcome',
          sender: 'ai',
          text: t.smartAdvisorChatClearedPrompt || 'Chat history cleared. How can I help you today in reviewing and analyzing your diary? 🧠',
          createdAt: new Date().toISOString()
        }];
        setMessages(welcomeDiary);
        localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(welcomeDiary));
      }
    }
  };

  const activeMessages = activeAdvisorTab === 'diary' ? messages : generalMessages;

  return (
    <div className="bg-white border border-[#E2DCC8] rounded-3xl overflow-hidden shadow-sm h-[580px] sm:h-[620px] flex flex-col font-sans relative" dir={langInfo.dir}>
      
      {/* Top Dual-Tab Switcher */}
      <div className="bg-[#FAF8F5] border-b border-[#E2DCC8] p-1.5 sm:p-2 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-10">
        <button
          type="button"
          onClick={() => setActiveAdvisorTab('diary')}
          className={`flex-1 min-w-0 py-2 px-2 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeAdvisorTab === 'diary'
              ? 'bg-[#3F5449] text-white shadow-xs'
              : 'bg-white text-[#5A4F41] border border-[#E2DCC8] hover:bg-[#F0EDE4]'
          }`}
        >
          <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">{t.smartAdvisorDiaryProTab || 'Diary Pro Advisor'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveAdvisorTab('general')}
          className={`flex-1 min-w-0 py-2 px-2 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeAdvisorTab === 'general'
              ? 'bg-[#2B3E50] text-white shadow-xs'
              : 'bg-white text-[#5A4F41] border border-[#E2DCC8] hover:bg-[#F0EDE4]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
          <span className="truncate">{t.smartAdvisorGeneralTab || 'General AI Advisor 🌐'}</span>
        </button>
      </div>

      {/* Top Bar Info & Consent Switch (Diary Pro Mode Only) */}
      {activeAdvisorTab === 'diary' && (
        <div className="p-2 sm:p-2.5 bg-[#F0EDE4] border-b border-[#E2DCC8] flex items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center space-x-2 space-x-reverse min-w-0 flex-1">
            <div className="bg-[#8B9D83]/15 p-1.5 rounded-lg text-[#8B9D83] shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[#5A5A40] text-xs sm:text-sm truncate">
                {t.smartAdvisorDiaryProTitle || 'AI Smart Advisor Pro'}
              </h3>
              <p className="text-[9.5px] sm:text-[10px] text-gray-500 truncate hidden sm:block">
                {t.smartAdvisorDiaryProDesc || 'Analyze behavioral patterns, mood trends & timeline correlations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowVoiceModal(true);
                startListeningVoiceChat();
              }}
              className="flex items-center space-x-1 space-x-reverse px-2 py-1 bg-[#8B9D83] hover:bg-[#5A5A40] text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              title={t.smartAdvisorStartVoiceChat || 'Start Voice Chat'}
            >
              <span className="animate-pulse">🎙️</span>
              <span className="truncate">{t.smartAdvisorVoiceChatBtn || 'Voice Chat'}</span>
            </button>

            <button
              onClick={() => setShowPermissionsModal(true)}
              className="flex items-center space-x-1 space-x-reverse px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] sm:text-xs font-black rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              title={t.smartAdvisorAccessPermissions || 'Access Permissions'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate hidden xs:inline">{t.smartAdvisorPermissionsBtn || 'Permissions'}</span>
            </button>

            <div className="flex items-center bg-white p-1 rounded-lg border border-[#E2DCC8] shadow-xs gap-1" title={t.smartAdvisorDiariesAccess || 'Diaries Access'}>
              <button
                onClick={toggleDiariesConsent}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer flex items-center ${
                  hasConsent && advisorPermissions.diaries ? 'bg-[#8B9D83]' : 'bg-[#E2DCC8]'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transform transition-transform ${
                    hasConsent && advisorPermissions.diaries ? 'translate-x-0' : '-translate-x-3.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar Info (General AI Mode Banner) */}
      {activeAdvisorTab === 'general' && (
        <div className="p-2.5 sm:p-3 bg-[#2B3E50] text-white border-b border-[#E2DCC8] flex items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center space-x-2 space-x-reverse min-w-0 flex-1">
            <div className="bg-amber-400/20 p-1.5 sm:p-2 rounded-xl text-amber-300 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white text-xs sm:text-sm truncate">{t.smartAdvisorGeneralTitle || 'General AI Advisor'}</h3>
              <p className="text-[9.5px] sm:text-[10px] text-gray-200 truncate">{t.smartAdvisorGeneralDesc || 'General answers, science & multimodal attachments'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowVoiceModal(true);
                startListeningVoiceChat();
              }}
              className="flex items-center space-x-1 space-x-reverse px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-300/30 text-[10px] sm:text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              title={t.smartAdvisorStartVoiceChat || 'Start Voice Chat'}
            >
              <span className="animate-pulse">🎙️</span>
              <span className="truncate">{t.smartAdvisorVoiceChatBtn || 'Voice Chat'}</span>
            </button>

            <span className="text-[9px] sm:text-[10px] bg-white/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-white/20 font-bold shrink-0 whitespace-nowrap hidden xs:inline-block">
              {t.smartAdvisorIndependentContext || 'Independent Context'}
            </span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#F9F7F2]/50">
        {activeMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#8B9D83] text-white rounded-tr-none'
                  : 'bg-white text-[#3A3A3A] border border-[#E2DCC8] rounded-tl-none font-normal'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className="flex items-center justify-between gap-4 mt-2 pt-1 border-t border-dashed border-gray-100">
                <span className={`block text-[9px] ${msg.sender === 'user' ? 'text-[#F9F7F2]/85' : 'text-gray-400'} text-left`}>
                  {new Date(msg.createdAt).toLocaleTimeString(langInfo.bcp47 || 'ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {msg.sender === 'ai' && (
                  <button
                    onClick={() => handleToggleSpeech(msg.id, msg.text)}
                    className={`p-1 rounded-lg hover:bg-[#F0EDE4]/60 transition-colors flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                      currentlySpeakingId === msg.id ? 'text-red-600 bg-red-50' : 'text-[#8B9D83]'
                    }`}
                  >
                    {currentlySpeakingId === msg.id ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                        <span>⏹️ {t.smartAdvisorStopAudio || 'Stop Audio'}</span>
                      </>
                    ) : (
                      <>
                        <span>🔊</span>
                        <span>{t.smartAdvisorListenAudio || 'Listen Audio'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-white border border-[#E2DCC8] rounded-2xl rounded-tl-none p-4 shadow-xs flex items-center space-x-2 space-x-reverse">
              <span className="text-xs text-gray-500">{t.smartAdvisorAnalyzingLifeLog || 'Advisor is analyzing your life log...'}</span>
              <div className="flex space-x-1 space-x-reverse">
                <span className="w-1.5 h-1.5 bg-[#8B9D83] rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-[#8B9D83] rounded-full animate-bounce delay-200"></span>
                <span className="w-1.5 h-1.5 bg-[#8B9D83] rounded-full animate-bounce delay-300"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Size Error Toast */}
      {fileErrorToast && (
        <div className="px-4 py-2 bg-red-50 text-red-700 border-t border-red-200 text-xs font-bold flex items-center justify-between shrink-0">
          <span>⚠️ {fileErrorToast}</span>
          <button onClick={() => setFileErrorToast(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Multimodal Attached Files Preview Bar (Scoped to Active Advisor Tab) */}
      {((activeAdvisorTab === 'general' ? generalMultimodalFiles : diaryMultimodalFiles).length > 0) && (
        <div className="px-4 py-2 bg-[#F9F7F2] border-t border-[#E2DCC8] flex flex-wrap gap-2 shrink-0">
          {(activeAdvisorTab === 'general' ? generalMultimodalFiles : diaryMultimodalFiles).map(att => (
            <div key={att.id} className={`border text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-2 shadow-3xs transition-all ${
              att.status === 'failed' ? 'bg-red-50 border-red-200 text-red-700' :
              att.status === 'uploading' || att.status === 'processing' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-white border-[#E2DCC8] text-[#2B3E50]'
            }`}>
              {att.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              {att.type === 'pdf' && <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              {att.type === 'audio' && <Music className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
              {att.type === 'video' && <Video className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
              {att.type === 'file' && <Paperclip className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
              <span className="truncate max-w-[110px]">{att.name}</span>

              {att.status === 'uploading' && <span className="text-[9px] text-amber-600 animate-pulse shrink-0">جاري الرفع...</span>}
              {att.status === 'processing' && <span className="text-[9px] text-amber-600 animate-pulse shrink-0">جاري التجهيز...</span>}
              {att.status === 'failed' && <span className="text-[9px] text-red-600 font-bold shrink-0">فشل الرفع</span>}
              {(!att.status || att.status === 'ready') && <span className="text-[9px] text-emerald-600 font-bold shrink-0">✓</span>}

              <button
                type="button"
                onClick={() => removeMultimodalFile(att.id)}
                className="text-red-500 hover:text-red-700 text-xs font-black p-0.5 rounded-full hover:bg-red-50 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Chat Attachments Preview Area (Diary Pro Mode) */}
      {activeAdvisorTab === 'diary' && (chatAttachments.links.length > 0 || chatAttachments.videos.length > 0 || chatAttachments.pdfs.length > 0) && (
        <div className="px-4 py-2 bg-[#F9F7F2] border-t border-[#E2DCC8] flex flex-wrap gap-2 shrink-0">
          {chatAttachments.links.map((link, idx) => (
            <div key={idx} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-blue-200 flex items-center space-x-1.5 space-x-reverse">
              <span>{t.smartAdvisorWebLinkOption || '🌐 Link'}</span>
              <span className="truncate max-w-[120px]" dir="ltr">{link}</span>
              <button onClick={() => setChatAttachments(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold hover:text-red-700 cursor-pointer text-xs">×</button>
            </div>
          ))}
          {chatAttachments.videos.map((vid, idx) => (
            <div key={idx} className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-purple-200 flex items-center space-x-1.5 space-x-reverse">
              <span>{t.smartAdvisorVideoOption || '🎥 Video'}</span>
              <span className="truncate max-w-[120px]" dir="ltr">{vid}</span>
              <button onClick={() => setChatAttachments(prev => ({ ...prev, videos: prev.videos.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold hover:text-red-700 cursor-pointer text-xs">×</button>
            </div>
          ))}
          {chatAttachments.pdfs.map((pdf, idx) => (
            <div key={idx} className="bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-red-200 flex items-center space-x-1.5 space-x-reverse">
              <span>📄 {pdf.name}</span>
              <button onClick={() => setChatAttachments(prev => ({ ...prev, pdfs: prev.pdfs.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold hover:text-red-700 cursor-pointer text-xs">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Attachment Inputs Drawer (Both Modes) */}
      {activeAttachmentType !== 'none' && (
        <div className="p-3 bg-[#F0EDE4] border-t border-[#E2DCC8] space-y-2 shrink-0">
          {activeAttachmentType === 'link' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#5A5A40]">{t.smartAdvisorEnterWebLink || 'Enter Reference Web Link:'}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempLink}
                  onChange={(e) => setTempLink(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-grow bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (tempLink.trim()) {
                      setChatAttachments(prev => ({ ...prev, links: [...prev.links, tempLink.trim()] }));
                      setTempLink('');
                      setActiveAttachmentType('none');
                    }
                  }}
                  className="bg-[#8B9D83] text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#5A5A40]"
                >
                  {t.smartAdvisorAddLinkBtn || 'Add Link'}
                </button>
              </div>
            </div>
          )}
          {activeAttachmentType === 'video' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#5A5A40]">{t.smartAdvisorEnterVideoUrl || 'Enter Video URL:'}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempVideo}
                  onChange={(e) => setTempVideo(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-grow bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (tempVideo.trim()) {
                      setChatAttachments(prev => ({ ...prev, videos: [...prev.videos, tempVideo.trim()] }));
                      setTempVideo('');
                      setActiveAttachmentType('none');
                    }
                  }}
                  className="bg-[#8B9D83] text-[#FAF8F5] font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#5A5A40]"
                >
                  {t.smartAdvisorAddVideoBtn || 'Add Video'}
                </button>
              </div>
            </div>
          )}
          {activeAttachmentType === 'pdf' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#5A5A40]">{t.smartAdvisorEnterPdfInfo || 'Enter Attached PDF Info:'}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempPdfName}
                  onChange={(e) => setTempPdfName(e.target.value)}
                  placeholder={t.smartAdvisorPdfNamePlaceholder || 'File name (e.g. report.pdf)'}
                  className="w-1/3 bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                />
                <input
                  type="text"
                  value={tempPdfUrl}
                  onChange={(e) => setTempPdfUrl(e.target.value)}
                  placeholder={t.smartAdvisorPdfUrlPlaceholder || 'URL or View Link...' }
                  className="w-2/3 bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (tempPdfName.trim()) {
                      setChatAttachments(prev => ({ ...prev, pdfs: [...prev.pdfs, { name: tempPdfName.trim(), url: tempPdfUrl.trim() || '#' }] }));
                      setTempPdfName('');
                      setTempPdfUrl('');
                      setActiveAttachmentType('none');
                    }
                  }}
                  className="bg-[#8B9D83] text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#5A5A40]"
                >
                  {t.smartAdvisorAddPdfBtn || 'Add PDF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggested Prompt Capsules (Diary Pro Mode Only) */}
      {activeAdvisorTab === 'diary' && (
        <div className="p-2 bg-[#F0EDE4] border-t border-[#E2DCC8] overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 flex gap-2">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="inline-block bg-white hover:bg-[#F9F7F2] active:bg-[#E2DCC8] text-[#3A3A3A] hover:text-[#5A5A40] text-xs py-1.5 px-3 rounded-full border border-[#E2DCC8] shadow-xs transition-colors cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-3 bg-white border-t border-[#E2DCC8] flex flex-col gap-2 shrink-0 relative z-20">
        {/* Attachment Options Popover Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-full start-3 mb-2 z-50 bg-white border border-[#E2DCC8] rounded-2xl shadow-2xl p-2 w-56 space-y-1 animate-fade-in text-xs font-sans">
            <div className="text-[10px] font-bold text-gray-400 px-2 py-1 border-b border-gray-100 mb-1 flex items-center justify-between">
              <span>{t.smartAdvisorAddAttachmentHeader || 'Add Attachment:'}</span>
              <button onClick={() => setShowAttachmentMenu(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xs">✕</button>
            </div>

            {/* Native Mobile-First File Upload Button Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] Image/Video/Doc option clicked - invoking triggerFilePicker synchronously');
                triggerFilePicker();
                setShowAttachmentMenu(false);
              }}
              className="w-full text-right flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F9F7F2] text-[#3A3A3A] transition-colors cursor-pointer"
            >
              <span className="text-base">📁</span>
              <span className="font-bold">{t.smartAdvisorMediaUploadOption || 'Image / Video / Document / Audio'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] Web Link option tapped');
                setActiveAttachmentType('link');
                setShowAttachmentMenu(false);
              }}
              className="w-full text-right flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 text-blue-700 transition-colors cursor-pointer"
            >
              <span className="text-base">🌐</span>
              <span className="font-bold">{t.smartAdvisorWebLinkCategory || 'Web Link'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] Video Link option tapped');
                setActiveAttachmentType('video');
                setShowAttachmentMenu(false);
              }}
              className="w-full text-right flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-purple-50 text-purple-700 transition-colors cursor-pointer"
            >
              <span className="text-base">🎥</span>
              <span className="font-bold">{t.smartAdvisorVideoLinkCategory || 'Video Link'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] PDF Info option tapped');
                setActiveAttachmentType('pdf');
                setShowAttachmentMenu(false);
              }}
              className="w-full text-right flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-red-700 transition-colors cursor-pointer"
            >
              <span className="text-base">📄</span>
              <span className="font-bold">{t.smartAdvisorPdfDocCategory || 'PDF Document Info'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          {/* Universal Hidden File Input with explicit ID for Native Label trigger */}
          <input
            id="smart-advisor-file-input"
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              console.log('[SmartAdvisor Mobile] File input onChange fired:', e.target.files?.length);
              handleFileUpload(e);
            }}
            accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.m4a,.aac,.flac,.ogg,.pdf,.doc,.docx,.txt,.csv,.json"
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(prev => !prev)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center ${
              activeAdvisorTab === 'general' ? 'bg-[#2B3E50] hover:bg-[#1E2B38] text-white' : 'bg-[#8B9D83] hover:bg-[#5A5A40] text-white'
            }`}
            title={t.smartAdvisorAttachFilesTooltip || 'Attach Image, PDF, Audio, Link, or Video'}
          >
            <Plus className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${showAttachmentMenu ? 'rotate-45 text-amber-300' : 'text-amber-300'}`} />
          </button>

          <button
            onClick={handleClearHistory}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-[#D4A373] hover:bg-[#FAEDCD] rounded-xl transition-colors cursor-pointer shrink-0"
            title={t.smartAdvisorClearChatTooltip || 'Clear Chat History'}
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={handleDictation}
            className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-[#D4A373] text-white animate-pulse ring-4 ring-[#D4A373]/20'
                : 'bg-[#F0EDE4] text-[#3A3A3A] hover:bg-[#E2DCC8]'
            }`}
            title={isRecording ? (t.stopDictationTitle) : (t.smartDictationTitle)}
          >
            <Mic className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder={
              isRecording
                ? (t.listeningVoice)
                : activeAdvisorTab === 'general'
                ? (t.askGeneralAiPlaceholder)
                : (t.askAdvisorPlaceholder)
            }
            disabled={isRecording}
            className="min-w-0 flex-1 bg-[#F9F7F2] hover:bg-[#F0EDE4] focus:bg-white border border-[#E2DCC8]/60 focus:ring-2 focus:ring-[#8B9D83] focus:border-[#8B9D83] rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs text-[#3A3A3A] placeholder-gray-400 focus:outline-none transition-colors truncate"
          />

          <button
            id="smart-advisor-send-button"
            onClick={() => handleSend(input)}
            className={`p-2 sm:p-2.5 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0 ${
              activeAdvisorTab === 'general' ? 'bg-[#2B3E50] hover:bg-[#1E2B38]' : 'bg-[#8B9D83] hover:bg-[#5A5A40]'
            }`}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* 🎙️ Interactive Hands-free Voice Chat Overlay Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-[#5A5A40]/45 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2DCC8] rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 text-center relative animate-fade-in font-sans" dir={appLanguage === 'ar' ? 'rtl' : 'ltr'}>
            
            {/* Close Button */}
            <button
              onClick={endVoiceChatSession}
              className={`absolute top-4 ${appLanguage === 'ar' ? 'left-4' : 'right-4'} p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-xl transition-all cursor-pointer text-sm font-bold`}
            >
              ×
            </button>

            {/* Header Status */}
            <div className="space-y-1.5 pt-4">
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                activeAdvisorTab === 'general' ? 'bg-[#2B3E50]/15 text-[#2B3E50]' : 'bg-[#8B9D83]/15 text-[#8B9D83]'
              }`}>
                {activeAdvisorTab === 'general' 
                  ? (t.generalVoiceCompanionTitle)
                  : (t.voiceCompanionTitle)
                }
              </span>
              <h3 className="font-extrabold text-[#3A3A3A] text-lg">
                {voiceStatus === 'listening' && `🎤 ${t.voiceStatusListening}`}
                {voiceStatus === 'analyzing' && `🧠 ${t.voiceStatusAnalyzing}`}
                {voiceStatus === 'speaking' && `🔊 ${t.voiceStatusSpeaking}`}
                {voiceStatus === 'idle' && `💤 ${t.voiceStatusIdle}`}
              </h3>
            </div>

            {/* Animated Soundwave Ripple Area */}
            <div className="flex items-center justify-center bg-[#F9F7F2] rounded-2xl h-44 border border-[#E2DCC8]/65 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial-gradient from-[#8B9D83]/5 to-transparent animate-pulse pointer-events-none"></div>
              
              {/* Animated Audio Wave bars */}
              <div className="flex items-end justify-center space-x-2 space-x-reverse h-24">
                <div className={`w-2 ${activeAdvisorTab === 'general' ? 'bg-[#2B3E50]' : 'bg-[#8B9D83]'} rounded-full transition-all duration-300 ${
                  voiceStatus === 'listening' ? 'h-16 animate-bounce' : 
                  voiceStatus === 'speaking' ? 'h-20 animate-pulse' : 'h-4'
                }`}></div>
                <div className={`w-2 ${activeAdvisorTab === 'general' ? 'bg-[#2B3E50]' : 'bg-[#8B9D83]'} rounded-full transition-all duration-300 ${
                  voiceStatus === 'listening' ? 'h-24 animate-bounce delay-75' : 
                  voiceStatus === 'speaking' ? 'h-14 animate-pulse delay-75' : 'h-4'
                }`}></div>
                <div className="w-2 bg-[#D4A373] rounded-full transition-all duration-300 ${
                  voiceStatus === 'listening' ? 'h-28 animate-bounce delay-150' : 
                  voiceStatus === 'speaking' ? 'h-24 animate-pulse delay-150' : 'h-4'
                }"></div>
                <div className={`w-2 ${activeAdvisorTab === 'general' ? 'bg-[#2B3E50]' : 'bg-[#8B9D83]'} rounded-full transition-all duration-300 ${
                  voiceStatus === 'listening' ? 'h-18 animate-bounce delay-100' : 
                  voiceStatus === 'speaking' ? 'h-12 animate-pulse delay-100' : 'h-4'
                }`}></div>
                <div className={`w-2 ${activeAdvisorTab === 'general' ? 'bg-[#2B3E50]' : 'bg-[#8B9D83]'} rounded-full transition-all duration-300 ${
                  voiceStatus === 'listening' ? 'h-10 animate-bounce delay-200' : 
                  voiceStatus === 'speaking' ? 'h-8 animate-pulse delay-200' : 'h-4'
                }`}></div>
              </div>
            </div>

            {/* Live Transcript / Response display area */}
            <div className="bg-[#F0EDE4]/45 p-4 rounded-2xl border border-[#E2DCC8]/50 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 font-medium mb-1">{t.voiceLiveTranscript}</p>
              <p className="text-sm text-[#3A3A3A] font-medium leading-relaxed">
                {voiceTranscript || (activeAdvisorTab === 'general'
                  ? (t.generalVoiceModalDesc)
                  : (t.advisorVoiceModalDesc)
                )}
              </p>
            </div>

            {/* Action controls */}
            <div className="flex justify-center gap-3">
              {voiceStatus === 'speaking' && (
                <button
                  onClick={() => {
                    stopVoiceChatSpeech();
                    setVoiceStatus('listening');
                    startListeningVoiceChat();
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {t.voiceInterruptAndSpeak}
                </button>
              )}

              {voiceStatus === 'idle' && (
                <button
                  onClick={startListeningVoiceChat}
                  className="px-6 py-2.5 bg-[#8B9D83] hover:bg-[#5A5A40] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {t.voiceStartSpeaking}
                </button>
              )}

              <button
                onClick={endVoiceChatSession}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.voiceEndSession}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛡️ Advisor Access Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" dir={langInfo.dir}>
          <div className="bg-[#FAF8F5] border-2 border-[#E2DCC8] rounded-3xl p-6 max-w-xl w-full text-right shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2DCC8] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl border border-amber-200">
                  <ShieldCheck className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#2B3E50]">{t.smartAdvisorPermissionsTitle || 'Smart Advisor Access Permissions 🛡️'}</h3>
                  <p className="text-xs text-gray-500 font-bold">{t.smartAdvisorPermissionsSubtitle || 'Select data areas the advisor is allowed to analyze and read'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Master Toggle (Enable All) */}
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-amber-950 block">{t.smartAdvisorEnableAllAccess || 'Enable All Access'}</span>
                  <span className="text-[11px] text-amber-800 font-bold">{t.smartAdvisorEnableAllAccessDesc || 'When enabled, advisor can provide comprehensive insights across all activities'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleAllPermissions}
                className={`w-12 h-7 rounded-full p-1 transition-colors focus:outline-none cursor-pointer shrink-0 ${
                  isAllEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                    isAllEnabled ? 'translate-x-0' : '-translate-x-5'
                  }`}
                />
              </button>
            </div>

            {/* Permissions List */}
            <div className="flex-grow overflow-y-auto space-y-2 pr-1 pl-1">
              {permissionsConfig.map((item) => {
                const isEnabled = advisorPermissions[item.key];
                return (
                  <div 
                    key={item.key}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isEnabled ? 'bg-white border-[#8B9D83]/50 shadow-2xs' : 'bg-gray-50 border-gray-200 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl text-lg ${isEnabled ? 'bg-[#8B9D83]/15' : 'bg-gray-200'}`}>
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#2B3E50]">{item.title}</h4>
                        <p className="text-[11px] text-gray-500 font-bold">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSinglePermission(item.key)}
                      className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer shrink-0 ${
                        isEnabled ? 'bg-[#8B9D83]' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                          isEnabled ? 'translate-x-0' : '-translate-x-4'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#E2DCC8] flex items-center justify-between shrink-0">
              <span className="text-[10px] text-gray-500 font-bold">
                {t.smartAdvisorPreferencesNote || '🔒 Preferences saved locally & applied instantly to AI responses.'}
              </span>
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2.5 bg-[#8B9D83] hover:bg-[#7A8C72] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                {t.smartAdvisorSaveApplyBtn || 'Save & Apply 💾'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
