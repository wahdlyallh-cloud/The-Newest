import { getActiveApiKeyFromSettings, getCandidateApiKeys } from '../lib/apiKeyManager';
import { getLocalizedAIError } from '../services/aiLanguageContract';
import MarkdownMessage from './MarkdownMessage';
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Send, ShieldCheck, HelpCircle, Sparkles, Mic, Trash2, Paperclip, X, Plus, Image as ImageIcon, FileText, Music, Video, Upload, ExternalLink, Bookmark, Copy, Download, Check, Maximize2, Minimize2, MessageSquare, Pencil, RefreshCw } from 'lucide-react';
import { copyTextSafe } from '../lib/clipboard';
import jsPDF from 'jspdf';
import { exportBlobSafe, captureElementToCanvas } from '../lib/exportUtils';
import { DiaryEntry, AppLanguage, MultimodalAttachment } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { getAthkarContextForAI, getFormattedAthkarPromptContext } from '../services/aiAthkarSync';
import { sniffMimeType, getAttachmentTypeCategory } from '../services/attachmentService';
import {
  buildUnifiedKnowledgeIndex,
  retrieveRelevantKnowledge,
  analyzeQueryIntent,
  getGroundedSystemDirectives
} from '../services/unifiedAIKnowledgeService';
import AIMediaAccessSelector from './AIMediaAccessSelector';
import {
  AIMediaAccessPermission,
  DEFAULT_AI_MEDIA_ACCESS,
  extractAvailableAttachments
} from '../lib/aiMediaAccess';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';
import LiveVoiceChatModal from './LiveVoiceChatModal';
import { getSelectedModelMode, setSelectedModelMode, getDiscoveredModels, refreshDiscoveredModels, selectModelsForTask, type GeminiModelMode, type GeminiTask, type DiscoveredGeminiModel } from '../lib/geminiModelRouter';
import { prepareGeminiMedia, type GeminiUploadResult } from '../lib/geminiFileUpload';

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
  initialAdvisorTab?: 'diary' | 'general';
  onFilePickerOpen?: () => void;
  onFilePickerClose?: () => void;
  onLiveVoiceStateChange?: (active: boolean) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

interface GeneralConversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
  isRenamed?: boolean;
}

function loadGeneralConversations(): GeneralConversation[] {
  try {
    const value = localStorage.getItem('yawmiyati_general_chat_threads');
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string' && Array.isArray(item.messages)) : [];
  } catch { return []; }
}

function conciseConversationTitle(messages: Message[], fallback: string): string {
  const first = messages.find(message => message.sender === 'user')?.text || '';
  const title = first.replace(/\s+/g, ' ').replace(/^📎\s*المرفقات:\s*/i, '').trim();
  return title ? (title.length > 34 ? `${title.slice(0, 34).trim()}…` : title) : fallback;
}

async function requestGeminiDirect(options: {
  apiKey: string;
  query: string;
  systemPrompt: string;
  task: GeminiTask;
  mode: GeminiModelMode;
  files?: Array<{ geminiMedia?: GeminiUploadResult }>;
  history?: Array<{ sender: 'user' | 'ai'; text: string }>;
}): Promise<string> {
  const media = (options.files || []).map(file => file.geminiMedia).filter((item): item is GeminiUploadResult => Boolean(item));
  const keys = Array.from(new Set([media.find(item => item.uploadedWithKey)?.uploadedWithKey, options.apiKey, ...getCandidateApiKeys()].filter((key): key is string => Boolean(key && key.trim()))));
  let lastError: unknown;
  for (const key of keys) {
    const models = await selectModelsForTask(options.task, key, options.mode);
    for (const model of models.slice(0, 5)) {
      try {
        const prior = (options.history || []).map(item => ({ role: item.sender === 'user' ? 'user' : 'model', parts: [{ text: item.text }] }));
        const parts: any[] = [];
        if (options.query) parts.push({ text: options.query });
        for (const item of media) {
          if (item.fileUri) parts.push({ fileData: { mimeType: item.mimeType, fileUri: item.fileUri } });
          else if (item.inlineData) parts.push({ inlineData: item.inlineData });
        }
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: options.systemPrompt }] },
            contents: [...prior, { role: 'user', parts: parts.length ? parts : [{ text: options.query || 'حلل الملف المرفق.' }] }],
            generationConfig: { maxOutputTokens: 2048 }
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
        const text = (data?.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || '').join('').trim();
        if (text) return text;
        throw new Error('Gemini returned an empty response');
      } catch (error) { lastError = error; }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No Gemini model or API key is available');
}

function sanitizeAdvisorText(text: string, lang: string): string {
  if (!text) return '';
  if (text.includes('__AI_QUOTA_EXCEEDED__') || text.includes('RESOURCE_EXHAUSTED')) {
    return getLocalizedAIError('quota-exhausted', lang);
  }
  if (text.includes('__AI_CHECK_API_KEY__') || text.includes('API_KEY_INVALID')) {
    return getLocalizedAIError('key-missing', lang);
  }
  return text;
}

export default function SmartAdvisor({ diaries, habits = [], gratitudeCards = [], books = [], userApiKey, appLanguage = 'ar', initialAdvisorTab = 'diary', onFilePickerOpen, onFilePickerClose, onLiveVoiceStateChange }: SmartAdvisorProps) {
  const effectiveKey = userApiKey || getActiveApiKeyFromSettings();
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const permissionsConfig = getPermissionsConfig(appLanguage);
  const isAr = appLanguage === 'ar';

  // Dual Tab State
  const [activeAdvisorTab, setActiveAdvisorTab] = useState<'diary' | 'general'>(initialAdvisorTab);

  const [generalThreads, setGeneralThreads] = useState<GeneralConversation[]>(() => loadGeneralConversations());
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const saved = localStorage.getItem('yawmiyati_active_general_thread');
    const threads = loadGeneralConversations();
    return threads.some(thread => thread.id === saved) ? saved! : (threads[0]?.id || '');
  });
  const [showConversationDrawer, setShowConversationDrawer] = useState(false);
  const [includeDiaryContext, setIncludeDiaryContext] = useState(() => localStorage.getItem('yawmiyati_general_diary_context') === 'true');
  const [modelMode, setModelMode] = useState<GeminiModelMode>(() => getSelectedModelMode());
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredGeminiModel[]>(() => getDiscoveredModels());
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isRecordingVoiceMessage, setIsRecordingVoiceMessage] = useState(false);
  const [voiceMessageProgress, setVoiceMessageProgress] = useState<number | null>(null);
  const [voiceMessageError, setVoiceMessageError] = useState<string | null>(null);
  const voiceMessageRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceMessageChunksRef = useRef<BlobPart[]>([]);
  const voiceMessageStreamRef = useRef<MediaStream | null>(null);

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
    const savedThreadId = localStorage.getItem('yawmiyati_active_general_thread');
    const selected = loadGeneralConversations().find(thread => thread.id === savedThreadId) || loadGeneralConversations()[0];
    if (selected?.messages?.length) return selected.messages;
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
  const [mediaAccessPermission, setMediaAccessPermission] = useState<AIMediaAccessPermission>(DEFAULT_AI_MEDIA_ACCESS);
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  useRegisterBackStep('advisor_fullscreen', 'modal', isFullscreen, () => setIsFullscreen(false), isAr ? 'المستشار الذكي' : 'Smart Advisor');
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
      if (!loadGeneralConversations().length) {
        const savedGeneral = localStorage.getItem('yawmiyati_general_chat_history') || localStorage.getItem('yawmiyati_general_chat_messages');
        if (savedGeneral) setGeneralMessages(JSON.parse(savedGeneral));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      const id = `general-${Date.now()}`;
      setActiveThreadId(id);
      return;
    }
    const firstUserMessage = generalMessages.find(message => message.sender === 'user');
    const title = conciseConversationTitle(generalMessages, t.newChatTitle || 'محادثة جديدة');
    const existing = loadGeneralConversations();
    const current = existing.find(thread => thread.id === activeThreadId);
    const updated: GeneralConversation = {
      id: activeThreadId,
      title: current?.isRenamed ? current.title : (firstUserMessage ? title : (current?.title || title)),
      updatedAt: generalMessages[generalMessages.length - 1]?.createdAt || new Date().toISOString(),
      messages: generalMessages,
      isRenamed: current?.isRenamed
    };
    const next = [updated, ...existing.filter(thread => thread.id !== activeThreadId)];
    try {
      localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(next));
      localStorage.setItem('yawmiyati_active_general_thread', activeThreadId);
      localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(generalMessages));
    } catch (error) { console.warn('Unable to persist advisor conversations', error); }
    setGeneralThreads(next);
  }, [generalMessages, activeThreadId]);

  useEffect(() => {
    if (!effectiveKey) return;
    setDiscoveredModels(getDiscoveredModels());
    setIsRefreshingModels(true);
    refreshDiscoveredModels().then(setDiscoveredModels).catch(() => undefined).finally(() => setIsRefreshingModels(false));
  }, [effectiveKey]);

  useEffect(() => {
    return () => {
      try {
        if (voiceMessageRecorderRef.current && voiceMessageRecorderRef.current.state !== 'inactive') voiceMessageRecorderRef.current.stop();
      } catch {}
      voiceMessageStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // --- 🎙️ Real-time Audio / Speech Interface states & controls ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  useEffect(() => {
    onLiveVoiceStateChange?.(showVoiceModal);
  }, [showVoiceModal, onLiveVoiceStateChange]);

  useRegisterBackStep('advisor_permissions_modal', 'modal', showPermissionsModal, () => {
    setShowPermissionsModal(false);
  }, t.smartAdvisorPermissionsTitle);

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
          const geminiMedia = await prepareGeminiMedia(file, (percent) => {
            setUploadProgress(prev => ({ ...prev, [pendingId]: percent }));
            const status = percent >= 100 ? 'processing' : 'uploading';
            const updateFn = (prev: MultimodalAttachment[]) => prev.map(item => item.id === pendingId ? { ...item, status } : item);
            if (currentTab === 'general') setGeneralMultimodalFiles(updateFn); else setDiaryMultimodalFiles(updateFn);
          }, effectiveKey);
          const att = { ...pendingAtts[i], geminiMedia } as any;

          // Mark as ready after Gemini has accepted the inline or File API media.
          console.log(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | id: ${pendingId} | stage: 12_ATTACHMENT_STATE_UPDATED -> ready`);
          const updateFn = (prev: MultimodalAttachment[]) =>
            prev.map(item => item.id === pendingId ? { ...att, id: pendingId, status: 'ready' } : item);
          if (currentTab === 'general') setGeneralMultimodalFiles(updateFn);
          else setDiaryMultimodalFiles(updateFn);
          setUploadProgress(prev => { const next = { ...prev }; delete next[pendingId]; return next; });

        } catch (err: any) {
          console.error(`[ATTACHMENT TRACE] timestamp: ${ts()} | filename: ${file.name} | id: ${pendingId} | stage: UPLOAD_ERROR ->`, err);
          const errMsg = err?.message || String(err);
          setFileErrorToast(`فشل رفع/تجهيز الملف "${file.name}": ${errMsg}`);

          setUploadProgress(prev => { const next = { ...prev }; delete next[pendingId]; return next; });
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

  const handleSend = async (textToSend: string, extraFiles: MultimodalAttachment[] = []) => {
    const isGeneral = activeAdvisorTab === 'general';
    const activeFiles = isGeneral ? generalMultimodalFiles : diaryMultimodalFiles;
    if (activeFiles.some(file => file.status === 'uploading' || file.status === 'processing')) {
      setFileErrorToast(t.advisorWaitForUpload || 'جاري رفع الملف للتحليل الدقيق...');
      return;
    }
    const readyFiles = [...activeFiles.filter(file => !file.status || file.status === 'ready'), ...extraFiles];
    if (!textToSend.trim() && readyFiles.length === 0 && (isGeneral || (chatAttachments.links.length === 0 && chatAttachments.videos.length === 0 && chatAttachments.pdfs.length === 0))) return;
    if (loading) return;

    const fileNames = readyFiles.map(file => file.name).filter(Boolean);
    const query = [textToSend.trim(), fileNames.length ? `المرفقات: ${fileNames.join('، ')}` : '', ...(!isGeneral ? chatAttachments.links.map(link => `رابط مرجعي: ${link}`) : []), ...(!isGeneral ? chatAttachments.videos.map(video => `فيديو مرجعي: ${video}`) : []), ...(!isGeneral ? chatAttachments.pdfs.map(file => `مستند ${file.name}: ${file.url}`) : [])].filter(Boolean).join('\n');
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: query || (t.voiceAttachmentLabel || 'رسالة صوتية'), createdAt: new Date().toISOString() };
    if (isGeneral) {
      setGeneralMessages(prev => { const next = [...prev, userMsg]; localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(next)); return next; });
      if (activeFiles === generalMultimodalFiles) setGeneralMultimodalFiles([]);
    } else {
      setMessages(prev => [...prev, userMsg]);
      setDiaryMultimodalFiles([]);
      setChatAttachments({ links: [], videos: [], pdfs: [] });
      setActiveAttachmentType('none');
    }
    setInput('');
    setLoading(true);
    try {
      const canUseDiaryContext = isGeneral
        ? includeDiaryContext && hasConsent && advisorPermissions.diaries
        : hasConsent && advisorPermissions.diaries;
      let diaryContextText = '';
      if (canUseDiaryContext) {
        let localCopingCards: any[] = [];
        let localProsCons: any[] = [];
        try {
          const copingRaw = localStorage.getItem('app_custom_coping_cards');
          const prosRaw = localStorage.getItem('yawmiyati_pros_cons_records');
          if (copingRaw) localCopingCards = JSON.parse(copingRaw);
          if (prosRaw) localProsCons = JSON.parse(prosRaw);
        } catch {}
        const index = buildUnifiedKnowledgeIndex({
          diaries: advisorPermissions.diaries ? diaries : [],
          habits: advisorPermissions.habits ? habits : [],
          gratitudeCards: advisorPermissions.gratitude ? gratitudeCards : [],
          books: advisorPermissions.books ? books : [],
          athkarContext: getAthkarContextForAI(),
          customCopingCards: advisorPermissions.cbtExercises ? localCopingCards : [],
          prosConsRecords: advisorPermissions.prosCons ? localProsCons : [],
          permissions: advisorPermissions
        });
        const retrieved = await retrieveRelevantKnowledge(query, index, {
          maxEntities: isGeneral ? 8 : 10,
          requireMediaBlobs: false,
          mediaAccessPermission
        });
        diaryContextText = retrieved.formattedContextText;
      }
      const systemPrompt = isGeneral
        ? `أنت مساعد حياة AI عام، ودود وواضح. لا تفترض أن لديك أي معرفة خاصة عن المستخدم. لا تستخدم يومياته أو بياناته الشخصية إلا إذا أضيفت صراحة في السياق التالي. أجب بلغة المستخدم وبشكل طبيعي.\n${diaryContextText ? `\nسياق شخصي أذن المستخدم بإضافته:\n${diaryContextText}` : ''}`
        : `أنت مستشار حياة AI لليوميات، متعاطف ودقيق ولا تشخّص. أجب بلغة المستخدم، واستند إلى السياق المسموح فقط.\n${diaryContextText}\n${getGroundedSystemDirectives(appLanguage)}`;
      const fileKinds = readyFiles.map(file => String(file.type || file.mimeType || '').toLowerCase());
      const task: GeminiTask = fileKinds.some(kind => kind.includes('audio')) ? 'audio'
        : fileKinds.some(kind => kind.includes('video')) ? 'video'
        : fileKinds.some(kind => kind.includes('image')) ? 'image'
        : fileKinds.some(kind => kind.includes('pdf') || kind.includes('document') || kind.includes('file')) ? 'pdf' : 'chat';
      const mode = readyFiles.length ? 'precision' : (modelMode === 'auto' ? 'fast' : modelMode);
      const answer = await requestGeminiDirect({
        apiKey: effectiveKey || '', query: query || (isGeneral ? 'يرجى تحليل المرفق والإجابة عن محتواه.' : 'يرجى تحليل يومياتي وتقديم نصيحة داعمة.'),
        systemPrompt, task, mode, files: readyFiles as any,
        history: (isGeneral ? generalMessages : messages).map(message => ({ sender: message.sender, text: message.text }))
      });
      const aiMsg: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: sanitizeAdvisorText(answer, appLanguage), createdAt: new Date().toISOString() };
      if (isGeneral) setGeneralMessages(prev => { const next = [...prev, aiMsg]; localStorage.setItem('yawmiyati_general_chat_messages', JSON.stringify(next)); return next; });
      else setMessages(prev => { const next = [...prev, aiMsg]; localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(next)); return next; });
    } catch (error: any) {
      const text = sanitizeAdvisorText(error?.message || 'تعذر الاتصال بـ Gemini API', appLanguage);
      const errorMsg: Message = { id: (Date.now() + 2).toString(), sender: 'ai', text: text.startsWith('⚠️') ? text : `⚠️ ${text}`, createdAt: new Date().toISOString() };
      if (isGeneral) setGeneralMessages(prev => [...prev, errorMsg]); else setMessages(prev => [...prev, errorMsg]);
    } finally { setLoading(false); }
  };

  const toggleVoiceMessageRecording = async () => {
    setVoiceMessageError(null);
    if (voiceMessageRecorderRef.current && voiceMessageRecorderRef.current.state !== 'inactive') {
      voiceMessageRecorderRef.current.stop();
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error(t.voiceRecordingUnavailable || 'التسجيل الصوتي غير متاح في هذا الجهاز.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceMessageStreamRef.current = stream;
      voiceMessageChunksRef.current = [];
      const supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported?.(type));
      const recorder = supported ? new MediaRecorder(stream, { mimeType: supported }) : new MediaRecorder(stream);
      voiceMessageRecorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data?.size) voiceMessageChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(voiceMessageChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        voiceMessageChunksRef.current = [];
        voiceMessageStreamRef.current?.getTracks().forEach(track => track.stop());
        voiceMessageStreamRef.current = null;
        voiceMessageRecorderRef.current = null;
        setIsRecordingVoiceMessage(false);
        if (!blob.size) return;
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-message-${Date.now()}.${extension}`, { type: blob.type || 'audio/webm' });
        const id = `voice-${Date.now()}`;
        try {
          setVoiceMessageProgress(0);
          const geminiMedia = await prepareGeminiMedia(file, setVoiceMessageProgress, effectiveKey);
          const attachment = { id, name: file.name, type: 'audio', mimeType: geminiMedia.mimeType, sizeBytes: file.size, status: 'ready', geminiMedia } as any as MultimodalAttachment;
          setVoiceMessageProgress(null);
          await handleSend('', [attachment]);
        } catch (error: any) {
          setVoiceMessageProgress(null);
          setVoiceMessageError(error?.message || (t.voiceRecordingFailed || 'تعذر إرسال التسجيل الصوتي.'));
        }
      };
      recorder.onerror = () => { setVoiceMessageError(t.voiceRecordingFailed || 'تعذر إرسال التسجيل الصوتي.'); setIsRecordingVoiceMessage(false); };
      recorder.start();
      setIsRecordingVoiceMessage(true);
    } catch (error: any) {
      voiceMessageStreamRef.current?.getTracks().forEach(track => track.stop());
      voiceMessageStreamRef.current = null;
      setIsRecordingVoiceMessage(false);
      setVoiceMessageError(error?.message || (t.voiceRecordingFailed || 'تعذر بدء التسجيل الصوتي.'));
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
          text: t.smartAdvisorChatClearedPrompt,
          createdAt: new Date().toISOString()
        }];
        setMessages(welcomeDiary);
        localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(welcomeDiary));
      }
    }
  };

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const activeMessages = activeAdvisorTab === 'diary' ? messages : generalMessages;

  const handleNewConversation = () => {
    const id = `general-${Date.now()}`;
    const welcome: Message = { id: `welcome-${id}`, sender: 'ai', text: t.smartAdvisorGenWelcome || 'مرحباً، كيف أستطيع مساعدتك اليوم؟', createdAt: new Date().toISOString() };
    const thread: GeneralConversation = { id, title: t.newChatTitle || 'محادثة جديدة', updatedAt: new Date().toISOString(), messages: [welcome] };
    setGeneralThreads(previous => [thread, ...previous]);
    setActiveThreadId(id);
    setGeneralMessages(thread.messages);
    setGeneralMultimodalFiles([]);
    setShowConversationDrawer(false);
  };

  const selectConversation = (thread: GeneralConversation) => {
    setActiveThreadId(thread.id);
    setGeneralMessages(thread.messages);
    setShowConversationDrawer(false);
    try { localStorage.setItem('yawmiyati_active_general_thread', thread.id); } catch {}
  };

  const renameConversation = (thread: GeneralConversation) => {
    const title = window.prompt(t.renameConversation || 'إعادة تسمية المحادثة', thread.title);
    if (!title?.trim()) return;
    const next = generalThreads.map(item => item.id === thread.id ? { ...item, title: title.trim().slice(0, 60), isRenamed: true } : item);
    setGeneralThreads(next);
    try { localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(next)); } catch {}
  };

  const deleteConversation = (thread: GeneralConversation) => {
    if (!window.confirm(t.deleteConversationConfirm || 'هل تريد حذف هذه المحادثة؟')) return;
    const remaining = generalThreads.filter(item => item.id !== thread.id);
    if (!remaining.length) {
      const id = `general-${Date.now()}`;
      const welcome: Message = { id: `welcome-${id}`, sender: 'ai', text: t.smartAdvisorGenWelcome || 'مرحباً، كيف أستطيع مساعدتك اليوم؟', createdAt: new Date().toISOString() };
      remaining.push({ id, title: t.newChatTitle || 'محادثة جديدة', updatedAt: new Date().toISOString(), messages: [welcome] });
    }
    setGeneralThreads(remaining);
    try { localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(remaining)); } catch {}
    if (thread.id === activeThreadId) {
      setActiveThreadId(remaining[0].id);
      setGeneralMessages(remaining[0].messages);
    }
  };

  const refreshGeminiModels = async () => {
    if (!effectiveKey) return;
    setIsRefreshingModels(true);
    try { setDiscoveredModels(await refreshDiscoveredModels()); }
    catch { setFileErrorToast(t.modelRefreshFailed || 'تعذر تحديث قائمة النماذج.'); }
    finally { setIsRefreshingModels(false); }
  };

  const createDiaryPromptContext = async (query: string) => {
    let customCopingCards: any[] = [];
    let prosConsRecords: any[] = [];
    try {
      const cards = localStorage.getItem('app_custom_coping_cards');
      const records = localStorage.getItem('yawmiyati_pros_cons_records');
      if (cards) customCopingCards = JSON.parse(cards);
      if (records) prosConsRecords = JSON.parse(records);
    } catch {}
    const index = buildUnifiedKnowledgeIndex({
      diaries: hasConsent && advisorPermissions.diaries ? diaries : [],
      habits: hasConsent && advisorPermissions.habits ? habits : [],
      gratitudeCards: hasConsent && advisorPermissions.gratitude ? gratitudeCards : [],
      books: hasConsent && advisorPermissions.books ? books : [],
      athkarContext: getAthkarContextForAI(),
      customCopingCards: advisorPermissions.cbtExercises ? customCopingCards : [],
      prosConsRecords: advisorPermissions.prosCons ? prosConsRecords : [],
      permissions: advisorPermissions
    });
    const retrieved = await retrieveRelevantKnowledge(query, index, { maxEntities: 10, requireMediaBlobs: false, mediaAccessPermission });
    return `${retrieved.formattedContextText}
${getGroundedSystemDirectives(appLanguage)}`;
  };

  const transcribeLiveVoice = async (file: File) => {
    try {
      const geminiMedia = await prepareGeminiMedia(file, setVoiceMessageProgress, effectiveKey);
      return await requestGeminiDirect({
        apiKey: effectiveKey || '', query: 'فرّغ التسجيل الصوتي حرفيًا كما قيل، باللغة الأصلية دون تلخيص أو حذف أو إضافة، وأعد النص فقط.',
        systemPrompt: 'أنت خدمة تفريغ صوتي دقيقة. اكتب الكلمات المنطوقة حرفيًا فقط ولا تستنتج محتوى غير مسموع.',
        task: 'audio', mode: 'precision', files: [{ geminiMedia }]
      });
    } finally { setVoiceMessageProgress(null); }
  };

  const submitLiveVoiceTurn = async (text: string, context: { history: Array<{ sender: 'user' | 'ai'; text: string }>; diaryContextEnabled: boolean; diaryContext: string; interruptionNote?: string }) => {
    const useDiary = context.diaryContextEnabled && hasConsent && advisorPermissions.diaries;
    const diaryContextText = useDiary ? await createDiaryPromptContext(text) : '';
    const interruptText = context.interruptionNote ? `\nملاحظة سياقية: قوطع ردك السابق أثناء قول: «${context.interruptionNote}». تابع من هذه النقطة دون إعادة الرد كاملًا.` : '';
    const systemPrompt = `${activeAdvisorTab === 'general' ? 'أنت مساعد عام ودود ومختصر في حياة AI. لا تستخدم بيانات اليوميات إلا إذا أُرفقت في السياق أدناه.' : 'أنت مستشار يوميات متعاطف في حياة AI. قدم ردًا طبيعيًا داعمًا بلا تشخيص.'}\n${diaryContextText}${interruptText}`;
    const answer = await requestGeminiDirect({
      apiKey: effectiveKey || '', query: text, systemPrompt, task: 'voice', mode: 'fast',
      history: context.history.slice(0, -1)
    });
    const timestamp = new Date().toISOString();
    const userMessage: Message = { id: `voice-user-${Date.now()}`, sender: 'user', text, createdAt: timestamp };
    const aiMessage: Message = { id: `voice-ai-${Date.now() + 1}`, sender: 'ai', text: sanitizeAdvisorText(answer, appLanguage), createdAt: timestamp };
    if (activeAdvisorTab === 'general') setGeneralMessages(previous => [...previous, userMessage, aiMessage]);
    else setMessages(previous => { const next = [...previous, userMessage, aiMessage]; localStorage.setItem('yawmiyati_chat_messages', JSON.stringify(next)); return next; });
    return aiMessage.text;
  };

  const todayThreads = generalThreads.filter(thread => new Date(thread.updatedAt).toDateString() === new Date().toDateString());
  const previousThreads = generalThreads.filter(thread => new Date(thread.updatedAt).toDateString() !== new Date().toDateString());

  // --- Copy and Export Handlers for Smart Advisor Chat ---
  const handleCopyAdvisorChat = async () => {
    if (activeMessages.length === 0) return;
    const formatted = activeMessages.map(m => {
      const sender = m.sender === 'user' ? (t.meLabel || 'User') : (activeAdvisorTab === 'general' ? 'Hayat AI' : (t.aiPsychAdvisor || 'Smart Advisor'));
      const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `[${sender}${time ? ` - ${time}` : ''}]:\n${m.text}\n`;
    }).join('\n-------------------\n\n');

    const ok = await copyTextSafe(formatted);
    if (ok) {
      alert(t.chatCopiedSuccess || (appLanguage === 'ar' ? 'تم نسخ المحادثة بنجاح 📋' : 'Chat copied to clipboard!'));
    } else {
      alert(t.copyFailedToast || (appLanguage === 'ar' ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy to clipboard'));
    }
  };

  const handleExportAdvisorChatPdf = async () => {
    const chatEl = document.getElementById('smart-advisor-chat-box');
    if (!chatEl || activeMessages.length === 0) return;
    try {
      const canvas = await captureElementToCanvas(chatEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        windowWidth: 800
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `HayatAI_AdvisorChat_${Date.now()}.pdf`;
      const pdfBlob = pdf.output('blob');
      await exportBlobSafe({
        blob: pdfBlob,
        filename: fileName,
        title: 'Hayat AI Advisor Chat',
        mimeType: 'application/pdf'
      });
    } catch (err) {
      console.error('Export Chat PDF error:', err);
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-[9990] h-[100dvh] w-full rounded-none' : 'h-[580px] sm:h-[620px]'} bg-white border border-[#E2DCC8] overflow-hidden shadow-sm flex flex-col font-sans relative`} dir={langInfo.dir}>
      
      {/* Top Dual-Tab Switcher */}
      <div className="bg-[#FAF8F5] border-b border-[#E2DCC8] p-1.5 sm:p-2 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-10">
        <button type="button" data-compact-control="true" onClick={() => setIsFullscreen(v => !v)} className="absolute top-2 end-2 z-20 p-1.5 rounded-lg bg-white/80 border border-[#E2DCC8] text-[#2D6A4F]" aria-label={isFullscreen ? (isAr ? 'استعادة' : 'Restore') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
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
          <span className="truncate">{t.smartAdvisorDiaryProTab}</span>
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
          <span className="truncate">{t.smartAdvisorGeneralTab}</span>
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
                {t.smartAdvisorDiaryProTitle}
              </h3>
              <p className="text-[9.5px] sm:text-[10px] text-gray-500 truncate hidden sm:block">
                {t.smartAdvisorDiaryProDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowVoiceModal(true);
              }}
              className="flex items-center space-x-1 space-x-reverse px-2 py-1 bg-[#8B9D83] hover:bg-[#5A5A40] text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              title={t.smartAdvisorStartVoiceChat}
            >
              <span className="animate-pulse">🎙️</span>
              <span className="truncate">{t.smartAdvisorVoiceChatBtn}</span>
            </button>

            <button
              onClick={() => setShowPermissionsModal(true)}
              className="flex items-center space-x-1 space-x-reverse px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] sm:text-xs font-black rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
              title={t.smartAdvisorAccessPermissions}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate hidden xs:inline">{t.smartAdvisorPermissionsBtn}</span>
            </button>

            <div className="flex items-center bg-white p-1 rounded-lg border border-[#E2DCC8] shadow-xs gap-1" title={t.smartAdvisorDiariesAccess}>
              <button
                onClick={toggleDiariesConsent}
                role="switch" aria-checked={hasConsent && advisorPermissions.diaries} data-compact-control="true" dir="ltr" className={`inline-flex items-center shrink-0 w-11 h-6 min-h-0 min-w-0 p-0.5 rounded-full transition-colors cursor-pointer ${
                  hasConsent && advisorPermissions.diaries ? 'bg-[#2D6A4F]' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    hasConsent && advisorPermissions.diaries ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <select aria-label={t.geminiModelModeLabel || 'وضع نموذج Gemini'} value={String(modelMode)} onChange={event => { const next = event.target.value; setModelMode(next); setSelectedModelMode(next); }} className="max-w-[112px] rounded-lg border border-[#E2DCC8] bg-white px-1.5 py-1.5 text-[9px] text-[#2B3E50]">
              <option value="auto">{t.geminiModeAuto || 'متكيف تلقائي'}</option><option value="fast">{t.geminiModeFast || 'سريع'}</option><option value="precision">{t.geminiModePrecision || 'دقة عالية Pro'}</option>
              {discoveredModels.length > 0 && <optgroup label={t.discoveredGeminiModels || 'نماذج Gemini المتاحة'}>{discoveredModels.map(model => <option key={model.id} value={model.id}>{model.displayName || model.id}</option>)}</optgroup>}
            </select>
            <button type="button" onClick={refreshGeminiModels} disabled={isRefreshingModels} aria-label={t.refreshGeminiModels || 'تحديث النماذج'} className="rounded-lg border border-[#E2DCC8] bg-white p-1.5 text-[#2D6A4F] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshingModels ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      )}

      {showConversationDrawer && activeAdvisorTab === 'general' && (
        <div className="absolute inset-0 z-[60] bg-black/35" role="presentation" onClick={() => setShowConversationDrawer(false)}>
          <aside className={`absolute ${langInfo.dir === 'rtl' ? 'right-0' : 'left-0'} top-0 flex h-full w-[min(88%,360px)] flex-col border-x border-[#E2DCC8] bg-[#FAF8F5] shadow-2xl animate-fade-in`} dir={langInfo.dir} onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E2DCC8] p-4">
              <h3 className="font-black text-[#2B3E50]">{t.advisorConversations || 'محادثاتك'}</h3>
              <button type="button" onClick={() => setShowConversationDrawer(false)} className="rounded-lg p-2 text-gray-500 hover:bg-white" aria-label={t.close || 'إغلاق'}><X className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={handleNewConversation} className="m-3 flex items-center justify-center gap-2 rounded-xl bg-[#2B3E50] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#1E2B38]"><Plus className="h-4 w-4" />{t.newChatTitle || 'محادثة جديدة'}</button>
            <div className="flex-1 space-y-4 overflow-y-auto p-3">
              {todayThreads.length > 0 && <section><h4 className="mb-2 px-1 text-[11px] font-black uppercase tracking-wide text-gray-400">{t.todayLabel || 'اليوم'}</h4><div className="space-y-2">{todayThreads.map(thread => (
                <div key={thread.id} className={`rounded-xl border p-2.5 ${thread.id === activeThreadId ? 'border-[#2B3E50] bg-[#2B3E50]/5' : 'border-[#E2DCC8] bg-white'}`}>
                  <button type="button" className="w-full min-w-0 text-start" onClick={() => selectConversation(thread)}><span className="block truncate text-sm font-bold text-[#2B3E50]">{thread.title}</span><span className="mt-1 block truncate text-[10px] text-gray-500">{thread.messages[thread.messages.length - 1]?.text || t.noMessagesYet || 'لا توجد رسائل بعد'}</span><span className="mt-1 block text-[9px] text-gray-400">{new Date(thread.updatedAt).toLocaleTimeString(langInfo.bcp47, { hour: '2-digit', minute: '2-digit' })}</span></button>
                  <div className="mt-1 flex justify-end gap-1"><button type="button" onClick={() => renameConversation(thread)} title={t.renameConversation || 'إعادة تسمية'} className="rounded p-1 text-gray-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteConversation(thread)} title={t.deleteConversation || 'حذف المحادثة'} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                </div>
              ))}</div></section>}
              {previousThreads.length > 0 && <section><h4 className="mb-2 px-1 text-[11px] font-black uppercase tracking-wide text-gray-400">{t.previousLabel || 'السابق'}</h4><div className="space-y-2">{previousThreads.map(thread => (
                <div key={thread.id} className={`rounded-xl border p-2.5 ${thread.id === activeThreadId ? 'border-[#2B3E50] bg-[#2B3E50]/5' : 'border-[#E2DCC8] bg-white'}`}>
                  <button type="button" className="w-full min-w-0 text-start" onClick={() => selectConversation(thread)}><span className="block truncate text-sm font-bold text-[#2B3E50]">{thread.title}</span><span className="mt-1 block truncate text-[10px] text-gray-500">{thread.messages[thread.messages.length - 1]?.text || t.noMessagesYet || 'لا توجد رسائل بعد'}</span><span className="mt-1 block text-[9px] text-gray-400">{new Date(thread.updatedAt).toLocaleDateString(langInfo.bcp47)}</span></button>
                  <div className="mt-1 flex justify-end gap-1"><button type="button" onClick={() => renameConversation(thread)} title={t.renameConversation || 'إعادة تسمية'} className="rounded p-1 text-gray-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => deleteConversation(thread)} title={t.deleteConversation || 'حذف المحادثة'} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
                </div>
              ))}</div></section>}
            </div>
          </aside>
        </div>
      )}

      {/* Top Bar Info (General AI Mode Banner) */}
      {activeAdvisorTab === 'general' && (
        <div className="bg-[#2B3E50] text-white border-b border-[#E2DCC8] flex flex-col gap-2 p-2.5 sm:p-3 shrink-0 z-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="bg-amber-400/20 p-1.5 rounded-xl text-amber-300 shrink-0"><Sparkles className="w-4 h-4" /></div>
              <div className="min-w-0"><h3 className="font-bold text-white text-xs sm:text-sm truncate">{t.smartAdvisorGeneralTitle}</h3><p className="text-[9px] text-gray-200 truncate">{t.smartAdvisorGeneralDesc}</p></div>
            </div>
            <button onClick={() => setShowVoiceModal(true)} className="flex items-center gap-1 px-2 py-1 bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-bold rounded-lg shrink-0" title={t.smartAdvisorStartVoiceChat}><span>🎙️</span><span>{t.smartAdvisorVoiceChatBtn}</span></button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex rounded-full border border-white/20 bg-white/10 p-0.5 text-[9px] font-bold" role="group" aria-label={t.advisorContextMode || 'سياق المحادثة'}>
              <button type="button" onClick={() => { setIncludeDiaryContext(false); localStorage.setItem('yawmiyati_general_diary_context', 'false'); }} className={`rounded-full px-2 py-1 ${!includeDiaryContext ? 'bg-white text-[#2B3E50]' : 'text-white/80'}`}>{t.advisorGeneralMode || 'دردشة عامة'}</button>
              <button type="button" onClick={() => { setIncludeDiaryContext(true); localStorage.setItem('yawmiyati_general_diary_context', 'true'); }} className={`rounded-full px-2 py-1 ${includeDiaryContext ? 'bg-white text-[#2B3E50]' : 'text-white/80'}`}>{t.advisorDiaryContextMode || 'مع سياق يومياتي'}</button>
            </div>
            <div className="flex items-center gap-1">
              <select aria-label={t.geminiModelModeLabel || 'وضع نموذج Gemini'} value={String(modelMode)} onChange={event => { const next = event.target.value; setModelMode(next); setSelectedModelMode(next); }} className="max-w-[145px] rounded-lg border border-white/20 bg-[#233344] px-2 py-1.5 text-[10px] text-white">
                <option value="auto">{t.geminiModeAuto || 'متكيف تلقائي'}</option><option value="fast">{t.geminiModeFast || 'سريع'}</option><option value="precision">{t.geminiModePrecision || 'دقة عالية Pro'}</option>
                {discoveredModels.length > 0 && <optgroup label={t.discoveredGeminiModels || 'نماذج Gemini المتاحة'}>{discoveredModels.map(model => <option key={model.id} value={model.id}>{model.displayName || model.id}</option>)}</optgroup>}
              </select>
              <button type="button" onClick={refreshGeminiModels} disabled={isRefreshingModels} aria-label={t.refreshGeminiModels || 'تحديث النماذج'} className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isRefreshingModels ? 'animate-spin' : ''}`} /></button>
              <button type="button" onClick={() => setShowConversationDrawer(true)} aria-label={t.advisorConversations || 'المحادثات'} className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-[10px] font-bold text-white"><MessageSquare className="h-3.5 w-3.5" /><span>{t.advisorConversations || 'المحادثات'}</span></button>
            </div>
          </div>
          {includeDiaryContext && <div className="text-[9px] text-amber-100">{t.advisorDiaryContextEnabled || 'سياق اليوميات مفعّل وفق صلاحياتك.'}</div>}
        </div>
      )}

      {/* Chat Messages */}
      <div id="smart-advisor-chat-box" className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#F9F7F2]/50">
        {activeMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-xs leading-relaxed select-text ${
                msg.sender === 'user'
                  ? 'bg-[#8B9D83] text-white rounded-tr-none'
                  : 'bg-white text-[#3A3A3A] border border-[#E2DCC8] rounded-tl-none font-normal'
              }`}
            >
              <div>{msg.sender === 'user' ? <div className="whitespace-pre-wrap">{msg.text}</div> : <MarkdownMessage content={sanitizeAdvisorText(msg.text, appLanguage)} isAi={true} />}</div>
              <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-dashed border-gray-100">
                <span className={`block text-[9px] ${msg.sender === 'user' ? 'text-[#F9F7F2]/85' : 'text-gray-400'} text-left`}>
                  {new Date(msg.createdAt).toLocaleTimeString(langInfo.bcp47 || 'ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyTextSafe(msg.text);
                      if (ok) {
                        setCopiedMessageId(msg.id);
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }
                    }}
                    className={`p-1 rounded-lg hover:bg-[#F0EDE4]/60 transition-colors flex items-center gap-0.5 text-[10px] font-bold cursor-pointer ${
                      copiedMessageId === msg.id ? 'text-emerald-700 font-black' : (msg.sender === 'user' ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-[#8B9D83]')
                    }`}
                    title={t.copyTextBtn || (appLanguage === 'ar' ? 'نسخ النص' : 'Copy Text')}
                  >
                    {copiedMessageId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedMessageId === msg.id && <span className="text-[9px]">{t.copied || 'تم النسخ'}</span>}
                  </button>

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
                          <span>⏹️ {t.smartAdvisorStopAudio}</span>
                        </>
                      ) : (
                        <>
                          <span>🔊</span>
                          <span>{t.smartAdvisorListenAudio}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-end">
            <div className="bg-white border border-[#E2DCC8] rounded-2xl rounded-tl-none p-4 shadow-xs flex items-center space-x-2 space-x-reverse">
              <span className="text-xs text-gray-500">{t.smartAdvisorAnalyzingLifeLog}</span>
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

              {(att.status === 'uploading' || att.status === 'processing') && <span className="text-[9px] text-amber-600 animate-pulse shrink-0">{(t.geminiUploadProgress || 'جاري رفع الملف للتحليل الدقيق... {percent}%').replace('{percent}', String(uploadProgress[att.id] ?? 0))}</span>}
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
              <span>{t.smartAdvisorWebLinkOption}</span>
              <span className="truncate max-w-[120px]" dir="ltr">{link}</span>
              <button onClick={() => setChatAttachments(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }))} className="text-red-500 font-bold hover:text-red-700 cursor-pointer text-xs">×</button>
            </div>
          ))}
          {chatAttachments.videos.map((vid, idx) => (
            <div key={idx} className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-purple-200 flex items-center space-x-1.5 space-x-reverse">
              <span>{t.smartAdvisorVideoOption}</span>
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
              <label className="block text-[10px] font-bold text-[#5A5A40]">{t.smartAdvisorEnterWebLink}</label>
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
                  {t.smartAdvisorAddLinkBtn}
                </button>
              </div>
            </div>
          )}
          {activeAttachmentType === 'video' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#5A5A40]">{t.smartAdvisorEnterVideoUrl}</label>
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
                  {t.smartAdvisorAddVideoBtn}
                </button>
              </div>
            </div>
          )}
          {activeAttachmentType === 'pdf' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-[#5A5A40]">{t.smartAdvisorEnterPdfInfo}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempPdfName}
                  onChange={(e) => setTempPdfName(e.target.value)}
                  placeholder={t.smartAdvisorPdfNamePlaceholder}
                  className="w-1/3 bg-white border border-[#E2DCC8] rounded-lg px-2.5 py-1.5 text-xs text-[#3A3A3A] focus:outline-none"
                />
                <input
                  type="text"
                  value={tempPdfUrl}
                  onChange={(e) => setTempPdfUrl(e.target.value)}
                  placeholder={t.smartAdvisorPdfUrlPlaceholder }
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
                  {t.smartAdvisorAddPdfBtn}
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
        {voiceMessageError && <div role="alert" className="rounded-lg bg-red-50 px-3 py-1.5 text-[10px] text-red-700">{voiceMessageError}<button type="button" onClick={() => setVoiceMessageError(null)} className="ms-2 font-bold">×</button></div>}
        {voiceMessageProgress !== null && <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800">{(t.geminiUploadProgress || 'جاري رفع الملف للتحليل الدقيق... {percent}%').replace('{percent}', String(voiceMessageProgress))}</div>}
        {isRecordingVoiceMessage && <div className="rounded-lg bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 animate-pulse">{t.recordingVoiceMessage || 'جارٍ تسجيل الرسالة الصوتية…'}</div>}
        {/* Granular Per-Chat AI Media Access Control */}
        <AIMediaAccessSelector
          permission={mediaAccessPermission}
          onChange={setMediaAccessPermission}
          availableAttachments={extractAvailableAttachments(diaries || [])}
          appLanguage={appLanguage}
          compact={true}
        />
        {/* Attachment Options Popover Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-full start-3 mb-2 z-50 bg-white border border-[#E2DCC8] rounded-2xl shadow-2xl p-2 w-56 space-y-1 animate-fade-in text-xs font-sans">
            <div className="text-[10px] font-bold text-gray-400 px-2 py-1 border-b border-gray-100 mb-1 flex items-center justify-between">
              <span>{t.smartAdvisorAddAttachmentHeader}</span>
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
              className="w-full text-start flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F9F7F2] text-[#3A3A3A] transition-colors cursor-pointer"
            >
              <span className="text-base">📁</span>
              <span className="font-bold">{t.smartAdvisorMediaUploadOption}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] Web Link option tapped');
                setActiveAttachmentType('link');
                setShowAttachmentMenu(false);
              }}
              className="w-full text-start flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 text-blue-700 transition-colors cursor-pointer"
            >
              <span className="text-base">🌐</span>
              <span className="font-bold">{t.smartAdvisorWebLinkCategory}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] Video Link option tapped');
                setActiveAttachmentType('video');
                setShowAttachmentMenu(false);
              }}
              className="w-full text-start flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-purple-50 text-purple-700 transition-colors cursor-pointer"
            >
              <span className="text-base">🎥</span>
              <span className="font-bold">{t.smartAdvisorVideoLinkCategory}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('[SmartAdvisor Mobile] PDF Info option tapped');
                setActiveAttachmentType('pdf');
                setShowAttachmentMenu(false);
              }}
              className="w-full text-start flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-red-700 transition-colors cursor-pointer"
            >
              <span className="text-base">📄</span>
              <span className="font-bold">{t.smartAdvisorPdfDocCategory}</span>
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
            title={t.smartAdvisorAttachFilesTooltip}
          >
            <Plus className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform ${showAttachmentMenu ? 'rotate-45 text-amber-300' : 'text-amber-300'}`} />
          </button>

          <button
            onClick={handleCopyAdvisorChat}
            disabled={activeMessages.length === 0}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-[#8B9D83] hover:bg-[#F0EDE4] rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            title={t.copyChatBtn || (appLanguage === 'ar' ? 'نسخ المحادثة' : 'Copy Chat')}
          >
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={handleExportAdvisorChatPdf}
            disabled={activeMessages.length === 0}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-[#D4A373] hover:bg-[#FAEDCD] rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            title={t.exportChatPdf || (appLanguage === 'ar' ? 'تصدير كـ PDF' : 'Export Chat PDF')}
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            onClick={handleClearHistory}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
            title={t.smartAdvisorClearChatTooltip}
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={toggleVoiceMessageRecording}
            className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${isRecordingVoiceMessage ? 'bg-red-600 text-white animate-pulse' : 'bg-[#E8F1EC] text-[#2D6A4F] hover:bg-[#D4E5DB]'}`}
            title={isRecordingVoiceMessage ? (t.stopVoiceRecording || 'إيقاف التسجيل وإرساله') : (t.recordVoiceMessage || 'تسجيل رسالة صوتية')}
            aria-label={isRecordingVoiceMessage ? (t.stopVoiceRecording || 'إيقاف التسجيل وإرساله') : (t.recordVoiceMessage || 'تسجيل رسالة صوتية')}
          >
            <Mic className="w-4 h-4" />
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

      <LiveVoiceChatModal
        open={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        language={langInfo.speechLang}
        history={activeMessages.map(message => ({ sender: message.sender, text: message.text }))}
        diaryContextEnabled={activeAdvisorTab === 'diary' || includeDiaryContext}
        diaryContext=""
        onTranscribeAudio={transcribeLiveVoice}
        onSubmitTurn={submitLiveVoiceTurn}
        labels={{
          status: t.liveVoiceStatus || t.voiceCompanionTitle || 'المحادثة الصوتية المباشرة',
          listen: t.voiceStartSpeaking || 'ابدأ التحدث',
          stop: t.stopVoiceRecording || 'إيقاف التسجيل',
          send: t.sendVoiceMessage || 'إرسال',
          interrupt: t.voiceInterruptAndSpeak || 'مقاطعة والرد الآن',
          autoBargeIn: t.autoBargeIn || 'المقاطعة التلقائية بالصوت',
          close: t.voiceEndSession || 'إنهاء المحادثة',
          transcribing: t.voiceStatusAnalyzing || 'جارٍ التحليل…',
          listening: t.voiceStatusListening || 'أستمع إليك…',
          thinking: t.voiceStatusAnalyzing || 'أفكر…',
          speaking: t.voiceStatusSpeaking || 'أتحدث الآن…',
          idle: t.voiceStatusIdle || 'جاهز للاستماع',
          error: t.voiceRecordingFailed || 'حدث خطأ في الصوت.'
        }}
      />

      {/* 🛡️ Advisor Access Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200" dir={langInfo.dir}>
          <div className="bg-[#FAF8F5] border-0 sm:border-2 sm:border-[#E2DCC8] rounded-none sm:rounded-3xl p-0 sm:p-6 max-w-xl w-full text-right shadow-2xl space-y-0 sm:space-y-4 h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col animate-in zoom-in-95">
            
            {/* Native App Bar Header */}
            <NativeModalHeader
              title={t.smartAdvisorPermissionsTitle}
              subtitle={t.smartAdvisorPermissionsSubtitle}
              icon={
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                </div>
              }
              onBack={() => setShowPermissionsModal(false)}
              isRtl={langInfo.dir === 'rtl'}
              theme="light"
            />

            <div className="p-4 sm:p-0 flex-1 overflow-y-auto overscroll-contain space-y-4">
            {/* Master Toggle (Enable All) */}
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-amber-950 block">{t.smartAdvisorEnableAllAccess}</span>
                  <span className="text-[11px] text-amber-800 font-bold">{t.smartAdvisorEnableAllAccessDesc}</span>
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
                {t.smartAdvisorPreferencesNote}
              </span>
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2.5 bg-[#8B9D83] hover:bg-[#7A8C72] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                {t.smartAdvisorSaveApplyBtn}
              </button>
            </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
