import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Brain, Sparkles, ArrowLeft, ArrowRight, ShieldCheck, ChevronDown, Plus,
  Copy, Trash2, Check, Volume2, Square, MoreVertical, Menu, X, Calendar, Filter
} from 'lucide-react';
import { DiaryEntry, AppLanguage, MultimodalAttachment } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';
import { copyTextSafe } from '../lib/clipboard';
import { formatMessageFullDate } from '../lib/formatters';
import { SpeechRecognitionManager } from '../lib/speechRecognition';
import { startHybridAudioCapture, stopHybridAudioCapture, transcribeHybridAudio } from '../lib/hybridDictation';
import { useRegisterBackStep } from '../lib/navigationStack';
import MarkdownMessage from './MarkdownMessage';
import LiveVoiceChatModal from './LiveVoiceChatModal';
import AdvisorModelPickerModal from './AdvisorModelPickerModal';
import AdvisorScopeModal, { AdvisorScopeConfig, AvailableMediaItem } from './AdvisorScopeModal';
import SmartAdvisorComposer from './SmartAdvisorComposer';
import {
  getSelectedModelMode,
  setSelectedModelMode,
  getDiscoveredModels,
  refreshDiscoveredModels,
  selectModelsForTask,
  type GeminiModelMode,
  type GeminiTask,
  type DiscoveredGeminiModel
} from '../lib/geminiModelRouter';
import { getActiveApiKeyFromSettings, getCandidateApiKeys } from '../lib/apiKeyManager';
import { getLocalizedAIError } from '../services/aiLanguageContract';
import { prepareGeminiMedia, type GeminiUploadResult } from '../lib/geminiFileUpload';
import { sniffMimeType, getAttachmentTypeCategory } from '../services/attachmentService';
import { buildUnifiedKnowledgeIndex, retrieveRelevantKnowledge, getGroundedSystemDirectives } from '../services/unifiedAIKnowledgeService';
import { getAthkarContextForAI } from '../services/aiAthkarSync';
import NativeModalHeader from './NativeModalHeader';

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

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

export interface AdvisorConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  isRenamed?: boolean;
}

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

// Storage helpers
function loadPersonalConversations(): AdvisorConversation[] {
  try {
    const raw = localStorage.getItem('yawmiyati_personal_advisor_threads');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function loadGeneralConversations(): AdvisorConversation[] {
  try {
    const raw = localStorage.getItem('yawmiyati_general_chat_threads');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function conciseTitle(messages: Message[], fallback: string): string {
  const first = messages.find(m => m.sender === 'user')?.text || '';
  const clean = first.replace(/\s+/g, ' ').replace(/^📎\s*المرفقات:\s*/i, '').trim();
  return clean ? (clean.length > 34 ? `${clean.slice(0, 34).trim()}…` : clean) : fallback;
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
  const keys = Array.from(new Set([
    media.find(item => item.uploadedWithKey)?.uploadedWithKey,
    options.apiKey,
    ...getCandidateApiKeys()
  ].filter((key): key is string => Boolean(key && key.trim()))));

  let lastError: unknown;
  for (const key of keys) {
    const models = await selectModelsForTask(options.task, key, options.mode);
    for (const model of models.slice(0, 5)) {
      try {
        const prior = (options.history || []).map(item => ({
          role: item.sender === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        }));
        const parts: any[] = [];
        if (options.query) parts.push({ text: options.query });
        for (const item of media) {
          if (item.fileUri) parts.push({ fileData: { mimeType: item.mimeType, fileUri: item.fileUri } });
          else if (item.inlineData) parts.push({ inlineData: item.inlineData });
        }
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: options.systemPrompt }] },
            contents: [...prior, { role: 'user', parts: parts.length ? parts : [{ text: options.query || 'حلل المرفقات بدقة.' }] }],
            generationConfig: { maxOutputTokens: 2048 }
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
        const text = (data?.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || '').join('').trim();
        if (text) return text;
        throw new Error('Gemini returned an empty response');
      } catch (error) {
        lastError = error;
      }
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

export default function SmartAdvisor({
  diaries,
  habits = [],
  gratitudeCards = [],
  books = [],
  userApiKey,
  appLanguage = 'ar',
  initialAdvisorTab = 'diary',
  onFilePickerOpen,
  onFilePickerClose,
  onLiveVoiceStateChange
}: SmartAdvisorProps) {
  const effectiveKey = userApiKey || getActiveApiKeyFromSettings();
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isAr = appLanguage === 'ar';

  // --- Strict Top-Level React Hooks ---

  // Hub vs Active Workspace Selection
  const [activeWorkspace, setActiveWorkspace] = useState<'hub' | 'personal' | 'general'>('hub');

  // Model Picker State
  const [modelMode, setModelMode] = useState<GeminiModelMode>(() => getSelectedModelMode());
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredGeminiModel[]>(() => getDiscoveredModels());
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [showModelPickerModal, setShowModelPickerModal] = useState(false);

  // Live Voice Modal State
  const [showLiveVoiceModal, setShowLiveVoiceModal] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const advisorDictationRecorderRef = useRef<MediaRecorder | null>(null);

  // Copied Feedback State
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Actions Dropdown Menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Drawer State
  const [showDrawer, setShowDrawer] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  // Personal Scope Modal State
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeConfig, setScopeConfig] = useState<AdvisorScopeConfig>(() => {
    try {
      const saved = localStorage.getItem('blomeo_advisor_scope_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      timeRange: '7d',
      customType: 'single',
      customDate: new Date().toISOString().split('T')[0],
      customStartDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      customEndDate: new Date().toISOString().split('T')[0],
      mediaMode: 'text-only',
      categoryPhotos: true,
      categoryVideos: false,
      categoryAudios: false,
      categoryDocs: false,
      selectedManualFileIds: []
    };
  });

  // Permissions Modal State
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [advisorPermissions, setAdvisorPermissions] = useState<AdvisorPermissions>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_advisor_permissions');
      if (saved) return { ...DEFAULT_ADVISOR_PERMISSIONS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_ADVISOR_PERMISSIONS;
  });

  // Conversations Storage
  const [personalThreads, setPersonalThreads] = useState<AdvisorConversation[]>(() => loadPersonalConversations());
  const [activePersonalThreadId, setActivePersonalThreadId] = useState<string>(() => {
    const saved = localStorage.getItem('blomeo_active_personal_thread');
    const threads = loadPersonalConversations();
    return threads.some(t => t.id === saved) ? saved! : (threads[0]?.id || `personal-${Date.now()}`);
  });

  const [generalThreads, setGeneralThreads] = useState<AdvisorConversation[]>(() => loadGeneralConversations());
  const [activeGeneralThreadId, setActiveGeneralThreadId] = useState<string>(() => {
    const saved = localStorage.getItem('yawmiyati_active_general_thread');
    const threads = loadGeneralConversations();
    return threads.some(t => t.id === saved) ? saved! : (threads[0]?.id || `general-${Date.now()}`);
  });

  // Current Thread Messages
  const [personalMessages, setPersonalMessages] = useState<Message[]>(() => {
    const threads = loadPersonalConversations();
    const current = threads.find(t => t.id === activePersonalThreadId);
    if (current?.messages?.length) return current.messages;
    return [
      {
        id: 'welcome_personal',
        sender: 'ai',
        text: isAr
          ? 'مرحباً بك! أنا **بلوميو (Blomeo)** — مستشارك الشخصي الخاص. أحلل تدويناتك وأمزجتك وتطورك بدقة وسرية وفق النطاق الزمني والصلاحيات التي تحددها.'
          : 'Welcome! I am **Blomeo** — your personal journal advisor. I analyze your reflections, moods, and habits with complete privacy within your chosen time scope.',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [generalMessages, setGeneralMessages] = useState<Message[]>(() => {
    const threads = loadGeneralConversations();
    const current = threads.find(t => t.id === activeGeneralThreadId);
    if (current?.messages?.length) return current.messages;
    return [
      {
        id: 'welcome_general',
        sender: 'ai',
        text: isAr
          ? 'أهلاً بك في **المستشار الذكي العام (Blomeo General AI)** 🌐.\n\nأنا مساعدك الشامل على طريقة Gemini للمعرفة العامة، الدراسة، البرمجة، والملفات دون ربط بيومياتك الشخصية.'
          : 'Welcome to **Blomeo General AI** 🌐.\n\nI am your general-purpose Gemini-style assistant for knowledge, coding, study, and direct file analysis with zero diary context.',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Composer Input & Attachments
  const [personalInput, setPersonalInput] = useState('');
  const [generalInput, setGeneralInput] = useState('');
  const [personalAttachments, setPersonalAttachments] = useState<MultimodalAttachment[]>([]);
  const [generalAttachments, setGeneralAttachments] = useState<MultimodalAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Navigation Stack Back Handler ---
  useRegisterBackStep(
    'advisor_fullscreen_workspace',
    'modal',
    activeWorkspace !== 'hub',
    () => {
      setActiveWorkspace('hub');
      setShowDrawer(false);
      setShowScopeModal(false);
      setShowModelPickerModal(false);
      setShowPermissionsModal(false);
    },
    isAr ? 'مستشار بلوميو' : 'Blomeo Advisor'
  );

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [personalMessages, generalMessages, loading]);

  // Sync Live Voice state
  useEffect(() => {
    onLiveVoiceStateChange?.(showLiveVoiceModal);
  }, [showLiveVoiceModal, onLiveVoiceStateChange]);

  // Save Scope Config
  useEffect(() => {
    try {
      localStorage.setItem('blomeo_advisor_scope_config', JSON.stringify(scopeConfig));
    } catch {}
  }, [scopeConfig]);

  // Persist Personal Threads
  useEffect(() => {
    if (!activePersonalThreadId) return;
    const existing = loadPersonalConversations();
    const current = existing.find(t => t.id === activePersonalThreadId);
    const title = conciseTitle(personalMessages, t.newChatTitle || 'محادثة جديدة');
    const updated: AdvisorConversation = {
      id: activePersonalThreadId,
      title: current?.isRenamed ? current.title : (current?.title || title),
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: personalMessages[personalMessages.length - 1]?.createdAt || new Date().toISOString(),
      messages: personalMessages,
      isRenamed: current?.isRenamed
    };
    const next = [updated, ...existing.filter(t => t.id !== activePersonalThreadId)];
    try {
      localStorage.setItem('yawmiyati_personal_advisor_threads', JSON.stringify(next));
      localStorage.setItem('blomeo_active_personal_thread', activePersonalThreadId);
    } catch {}
    setPersonalThreads(next);
  }, [personalMessages, activePersonalThreadId]);

  // Persist General Threads
  useEffect(() => {
    if (!activeGeneralThreadId) return;
    const existing = loadGeneralConversations();
    const current = existing.find(t => t.id === activeGeneralThreadId);
    const title = conciseTitle(generalMessages, t.newChatTitle || 'محادثة جديدة');
    const updated: AdvisorConversation = {
      id: activeGeneralThreadId,
      title: current?.isRenamed ? current.title : (current?.title || title),
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: generalMessages[generalMessages.length - 1]?.createdAt || new Date().toISOString(),
      messages: generalMessages,
      isRenamed: current?.isRenamed
    };
    const next = [updated, ...existing.filter(t => t.id !== activeGeneralThreadId)];
    try {
      localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(next));
      localStorage.setItem('yawmiyati_active_general_thread', activeGeneralThreadId);
    } catch {}
    setGeneralThreads(next);
  }, [generalMessages, activeGeneralThreadId]);

  // Auto-refresh models if key exists
  useEffect(() => {
    if (!effectiveKey) return;
    setDiscoveredModels(getDiscoveredModels());
    setIsRefreshingModels(true);
    refreshDiscoveredModels().then(setDiscoveredModels).catch(() => undefined).finally(() => setIsRefreshingModels(false));
  }, [effectiveKey]);

  // --- Filtering Diaries & Media According to Scope Config ---
  const isDateInSelectedRange = useCallback((dateStr: string): boolean => {
    const d = new Date(dateStr).getTime();
    if (isNaN(d)) return true;
    const now = Date.now();

    switch (scopeConfig.timeRange) {
      case '1d':
        return now - d <= 86400000;
      case '7d':
        return now - d <= 7 * 86400000;
      case '1m':
        return now - d <= 30 * 86400000;
      case '3m':
        return now - d <= 90 * 86400000;
      case '6m':
        return now - d <= 180 * 86400000;
      case '1y':
        return now - d <= 365 * 86400000;
      case 'custom': {
        if (scopeConfig.customType === 'single') {
          const target = new Date(scopeConfig.customDate).toDateString();
          return new Date(dateStr).toDateString() === target;
        } else {
          const start = new Date(scopeConfig.customStartDate).getTime();
          const end = new Date(scopeConfig.customEndDate).getTime() + 86400000;
          return d >= start && d <= end;
        }
      }
      default:
        return true;
    }
  }, [scopeConfig]);

  const scopedDiaries = useMemo(() => {
    return diaries.filter(d => isDateInSelectedRange(d.createdAt));
  }, [diaries, isDateInSelectedRange]);

  // Extract available media from scoped diaries
  const scopedMediaList = useMemo<AvailableMediaItem[]>(() => {
    const items: AvailableMediaItem[] = [];
    scopedDiaries.forEach(d => {
      if (Array.isArray(d.files)) {
        d.files.forEach(att => {
          items.push({
            id: att.id || `${d.id}_${att.name}`,
            name: att.name || 'ملف مرفق',
            type: att.type as any || 'document',
            date: d.createdAt
          });
        });
      }
      if (Array.isArray(d.images)) {
        d.images.forEach((img, idx) => {
          items.push({
            id: `img_${d.id}_${idx}`,
            name: `صورة ${new Date(d.createdAt).toLocaleDateString()}`,
            type: 'image',
            date: d.createdAt
          });
        });
      }
      if (Array.isArray(d.audioRecordings)) {
        d.audioRecordings.forEach((rec, idx) => {
          items.push({
            id: `rec_${d.id}_${idx}`,
            name: `تسجيل صوتي ${new Date(d.createdAt).toLocaleDateString()}`,
            type: 'audio',
            date: d.createdAt
          });
        });
      }
    });
    return items;
  }, [scopedDiaries]);

  // --- Handlers ---
  const handleSelectModelMode = (mode: GeminiModelMode) => {
    setModelMode(mode);
    setSelectedModelMode(mode);
  };

  const handleManualRefreshModels = async () => {
    setIsRefreshingModels(true);
    try {
      const list = await refreshDiscoveredModels(effectiveKey);
      setDiscoveredModels(list);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const handleToggleSpeech = (msgId: string, text: string) => {
    if (currentlySpeakingId === msgId) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
    } else {
      setCurrentlySpeakingId(msgId);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*#_`~•]/g, '').replace(/🔗|🎥|📄/g, '');
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = langInfo.speechLang;
        utterance.onend = () => setCurrentlySpeakingId(null);
        utterance.onerror = () => setCurrentlySpeakingId(null);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleCopyEntireChat = async () => {
    setShowMoreMenu(false);
    const msgs = activeWorkspace === 'general' ? generalMessages : personalMessages;
    if (msgs.length === 0) return;
    const formatted = msgs.map(m => {
      const sender = m.sender === 'user' ? (t.meLabel || 'User') : 'Blomeo';
      const date = formatMessageFullDate(m.createdAt, appLanguage);
      return `[${sender} - ${date}]:\n${m.text}\n`;
    }).join('\n-------------------\n\n');
    await copyTextSafe(formatted);
  };

  const handleDeleteConversation = () => {
    setShowMoreMenu(false);
    if (!window.confirm(t.deleteConversationConfirm || 'هل أنت متأكد من حذف هذه المحادثة؟')) return;
    if (activeWorkspace === 'general') {
      const remaining = generalThreads.filter(t => t.id !== activeGeneralThreadId);
      setGeneralThreads(remaining);
      try {
        localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(remaining));
      } catch {}
      const nextId = remaining[0]?.id || `general-${Date.now()}`;
      setActiveGeneralThreadId(nextId);
      setGeneralMessages(remaining[0]?.messages || []);
    } else {
      const remaining = personalThreads.filter(t => t.id !== activePersonalThreadId);
      setPersonalThreads(remaining);
      try {
        localStorage.setItem('yawmiyati_personal_advisor_threads', JSON.stringify(remaining));
      } catch {}
      const nextId = remaining[0]?.id || `personal-${Date.now()}`;
      setActivePersonalThreadId(nextId);
      setPersonalMessages(remaining[0]?.messages || []);
    }
  };

  const handleNewConversation = () => {
    setShowDrawer(false);
    if (activeWorkspace === 'general') {
      const newId = `general-${Date.now()}`;
      setActiveGeneralThreadId(newId);
      setGeneralMessages([
        {
          id: 'welcome_general',
          sender: 'ai',
          text: isAr
            ? 'أهلاً بك في **المستشار الذكي العام (Blomeo General AI)** 🌐.\n\nكيف يمكنني مساعدتك اليوم؟'
            : 'Welcome to **Blomeo General AI** 🌐.\n\nHow can I help you today?',
          createdAt: new Date().toISOString()
        }
      ]);
    } else {
      const newId = `personal-${Date.now()}`;
      setActivePersonalThreadId(newId);
      setPersonalMessages([
        {
          id: 'welcome_personal',
          sender: 'ai',
          text: isAr
            ? 'أهلاً بك في محادثة استشارية جديدة. أنا مستشارك الشخصي **بلوميو**، مستعد لتحليل يومياتك ونشاطاتك ضمن النطاق المحدد.'
            : 'Welcome to a new consultation. I am your personal advisor **Blomeo**, ready to analyze your entries within the selected scope.',
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  // Composer File Upload Handler
  const handleComposerFileUpload = async (files: FileList) => {
    onFilePickerOpen?.();
    const isGeneral = activeWorkspace === 'general';
    const selected = Array.from(files);

    const pending: MultimodalAttachment[] = selected.map(file => {
      const mimeType = sniffMimeType(file);
      const category = getAttachmentTypeCategory(mimeType);
      return {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type: category,
        mimeType,
        sizeBytes: file.size,
        status: 'uploading'
      };
    });

    if (isGeneral) {
      setGeneralAttachments(prev => [...prev, ...pending]);
    } else {
      setPersonalAttachments(prev => [...prev, ...pending]);
    }

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const pendingId = pending[i].id;
      try {
        const geminiMedia = await prepareGeminiMedia(file, percent => {
          setUploadProgress(prev => ({ ...prev, [pendingId]: percent }));
        }, effectiveKey);

        const updateFn = (prev: MultimodalAttachment[]) =>
          prev.map(item => item.id === pendingId ? { ...item, status: 'ready', geminiMedia } as any : item);

        if (isGeneral) setGeneralAttachments(updateFn);
        else setPersonalAttachments(updateFn);
      } catch (err: any) {
        const updateFn = (prev: MultimodalAttachment[]) =>
          prev.map(item => item.id === pendingId ? { ...item, status: 'failed', errorMessage: err?.message } : item);
        if (isGeneral) setGeneralAttachments(updateFn);
        else setPersonalAttachments(updateFn);
      } finally {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[pendingId];
          return next;
        });
      }
    }
    onFilePickerClose?.();
  };

  // Dictation Toggle
  const handleDictationToggle = () => {
    const manager = SpeechRecognitionManager.getInstance();
    if (isDictating) {
      const finalRecorded = manager.finalize();
      setIsDictating(false);
      void stopHybridAudioCapture(advisorDictationRecorderRef.current).then(async blob => {
        advisorDictationRecorderRef.current = null;
        const geminiText = await transcribeHybridAudio(blob, userApiKey, appLanguage || 'ar');
        const finalText = geminiText || finalRecorded;
        if (finalText) {
          const setter = activeWorkspace === 'general' ? setGeneralInput : setPersonalInput;
          setter(prev => `${prev ? prev.trim() + ' ' : ''}${finalText}`);
        }
      });
    } else {
      setIsDictating(true);
      void startHybridAudioCapture().then(recorder => { advisorDictationRecorderRef.current = recorder; }).catch(error => {
        console.warn('[SmartAdvisor] Audio capture unavailable; continuing with Web Speech.', error);
      });
      manager.startSession({
        lang: langInfo.speechLang,
        continuous: false,
        callbacks: {
          onTranscriptChange: (state) => {
            const text = state.displayTranscript || '';
            if (activeWorkspace === 'general') {
              setGeneralInput(text);
            } else {
              setPersonalInput(text);
            }
          },
          onError: () => setIsDictating(false),
          onSpeechEnd: () => setIsDictating(false)
        }
      });
    }
  };

  // Send Message Logic
  const handleSendMessage = async (textToSend: string) => {
    const isGeneral = activeWorkspace === 'general';
    const activeAtts = isGeneral ? generalAttachments : personalAttachments;
    const readyFiles = activeAtts.filter(f => !f.status || f.status === 'ready');

    if (!textToSend.trim() && readyFiles.length === 0) return;
    if (loading) return;

    const query = [
      textToSend.trim(),
      readyFiles.length ? `المرفقات: ${readyFiles.map(f => f.name).join('، ')}` : ''
    ].filter(Boolean).join('\n');

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      createdAt: new Date().toISOString()
    };

    if (isGeneral) {
      setGeneralMessages(prev => [...prev, userMsg]);
      setGeneralInput('');
      setGeneralAttachments([]);
    } else {
      setPersonalMessages(prev => [...prev, userMsg]);
      setPersonalInput('');
      setPersonalAttachments([]);
    }

    setLoading(true);

    try {
      let systemPrompt = '';
      if (isGeneral) {
        systemPrompt = `أنت بلوميو (Blomeo) — المستشار الذكي العام، مساعد ذكي شامل على طريقة Gemini. أنت مهذب ودقيق وواضح وتجيب في مختلف المجالات (برمجة، علوم، دراسة، كتابة، تحليل ملفات) بلغة المستخدم وبحيادية مطلقة وبدون أي معرفة أو ذكر ليوميات المستخدم أو بياناته الشخصية.`;
      } else {
        // Build Scoped Context for Personal Advisor
        let contextText = '';
        if (advisorPermissions.diaries) {
          const index = buildUnifiedKnowledgeIndex({
            diaries: scopedDiaries,
            habits: advisorPermissions.habits ? habits : [],
            gratitudeCards: advisorPermissions.gratitude ? gratitudeCards : [],
            books: advisorPermissions.books ? books : [],
            athkarContext: getAthkarContextForAI(),
            permissions: advisorPermissions
          });
          const retrieved = await retrieveRelevantKnowledge(query, index, {
            maxEntities: 12,
            requireMediaBlobs: false
          });
          contextText = retrieved.formattedContextText;
        }

        systemPrompt = `أنت بلوميو (Blomeo) — المستشار الشخصي لليوميات والحياة. أجب بلغة المستخدم بنبرة هادئة، متعاطفة، داعمة، وغير تشخيصية، ملتزماً تماماً بالبيانات والوسائط المتاحة حصراً ضمن النطاق الزمني المحدد والصلاحيات الممنوحة من المستخدم:\n${contextText}\n${getGroundedSystemDirectives(appLanguage)}`;
      }

      const fileKinds = readyFiles.map(file => String(file.type || file.mimeType || '').toLowerCase());
      const task: GeminiTask = fileKinds.some(kind => kind.includes('audio')) ? 'audio'
        : fileKinds.some(kind => kind.includes('video')) ? 'video'
        : fileKinds.some(kind => kind.includes('image')) ? 'image'
        : fileKinds.some(kind => kind.includes('pdf') || kind.includes('document')) ? 'pdf' : 'chat';

      const mode = readyFiles.length ? 'precision' : (modelMode === 'auto' ? 'fast' : modelMode);
      const answer = await requestGeminiDirect({
        apiKey: effectiveKey || '',
        query,
        systemPrompt,
        task,
        mode,
        files: readyFiles as any,
        history: (isGeneral ? generalMessages : personalMessages).map(m => ({ sender: m.sender, text: m.text }))
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: sanitizeAdvisorText(answer, appLanguage),
        createdAt: new Date().toISOString()
      };

      if (isGeneral) setGeneralMessages(prev => [...prev, aiMsg]);
      else setPersonalMessages(prev => [...prev, aiMsg]);

    } catch (error: any) {
      const errText = sanitizeAdvisorText(error?.message || 'تعذر الاتصال بـ Gemini API', appLanguage);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'ai',
        text: errText.startsWith('⚠️') ? errText : `⚠️ ${errText}`,
        createdAt: new Date().toISOString()
      };
      if (isGeneral) setGeneralMessages(prev => [...prev, errorMsg]);
      else setPersonalMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Live Voice Handlers
  const transcribeLiveVoice = async (file: File) => {
    const geminiMedia = await prepareGeminiMedia(file, undefined, effectiveKey);
    return await requestGeminiDirect({
      apiKey: effectiveKey || '',
      query: 'فرّغ هذا التسجيل الصوتي حرفياً.',
      systemPrompt: 'أنت خدمة تفريغ صوتي دقيقة. اكتب النص المنطوق حرفياً.',
      task: 'audio',
      mode: 'precision',
      files: [{ geminiMedia }]
    });
  };

  const submitLiveVoiceTurn = async (text: string, context: { history: Array<{ sender: 'user' | 'ai'; text: string }> }) => {
    const isGeneral = activeWorkspace === 'general';
    const systemPrompt = isGeneral
      ? 'أنت بلوميو (Blomeo) — مساعد صوتي عام ذكي وسريع على طريقة Gemini.'
      : 'أنت بلوميو (Blomeo) — مستشار صوتي شخصي لليوميات، متعاطف وداعم.';
    const answer = await requestGeminiDirect({
      apiKey: effectiveKey || '',
      query: text,
      systemPrompt,
      task: 'voice',
      mode: 'fast',
      history: context.history
    });
    return answer;
  };

  // Personal Quick Prompts
  const personalPrompts = [
    isAr ? 'ما هي الأنماط المتكررة في مزاجي هذا الأسبوع؟' : 'What recurring patterns appeared in my mood this week?',
    isAr ? 'هل ساعدتني الرياضة في تقليل التوتر؟' : 'Did exercise help reduce my stress?',
    isAr ? 'لخص أهم إنجازاتي وعاداتي المسجلة' : 'Summarize my key achievements and recorded habits',
    isAr ? 'قدم لي نصيحة هادئة بناءً على تدويناتي الأخيرة' : 'Give me mindful advice based on my recent notes'
  ];

  // Helper label for current model mode
  const currentModelLabel = useMemo(() => {
    if (modelMode === 'auto') return t.geminiModeAuto || 'متكيف تلقائي';
    if (modelMode === 'fast') return t.geminiModeFast || 'سريع';
    if (modelMode === 'precision') return t.geminiModePrecision || 'دقة عالية Pro';
    const found = discoveredModels.find(m => m.id === modelMode);
    return found?.displayName || modelMode;
  }, [modelMode, discoveredModels, t]);

  // Helper summary for Personal Scope bar
  const scopeSummaryText = useMemo(() => {
    let rangeText = '';
    switch (scopeConfig.timeRange) {
      case '1d': rangeText = t.timeRangeToday || 'آخر يوم'; break;
      case '7d': rangeText = t.timeRange7d || 'آخر 7 أيام'; break;
      case '1m': rangeText = t.timeRange1m || 'آخر شهر'; break;
      case '3m': rangeText = t.timeRange3m || 'آخر 3 شهور'; break;
      case '6m': rangeText = t.timeRange6m || 'آخر 6 شهور'; break;
      case '1y': rangeText = t.timeRange1y || 'آخر سنة'; break;
      case 'custom': rangeText = t.timeRangeCustom || 'مخصص'; break;
    }
    const mediaText = scopeConfig.mediaMode === 'text-only'
      ? (t.mediaScopeTextOnly || 'نص فقط (توفير)')
      : scopeConfig.mediaMode === 'by-category'
      ? (t.mediaScopeByCategory || 'حسب الفئة')
      : (t.mediaScopeManual || 'اختيار يدوي');
    return `${rangeText} • ${mediaText}`;
  }, [scopeConfig, t]);

  return (
    <div className="w-full font-sans antialiased text-[#12261D] dark:text-[#EBF5F2]" dir={langInfo.dir}>
      
      {/* =========================================================================
          VIEW 1: CLEAN DUAL-CARD SELECTION HUB (Landing Mode)
         ========================================================================= */}
      {activeWorkspace === 'hub' && (
        <div className="space-y-6 max-w-4xl mx-auto py-2 px-1">
          {/* Header Greeting */}
          <div className="text-center space-y-2 py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 text-[#2D6A4F] dark:text-[#48B89F] text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>{t.advisorSelectHubTitle || 'مستشار بلوميو الذكي'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#12261D] dark:text-[#EBF5F2]">
              {t.advisorSelectHubTitle || 'مستشار بلوميو الذكي'}
            </h1>
            <p className="text-sm text-[#4A6357] dark:text-[#9EC2B8] max-w-md mx-auto">
              {t.advisorSelectHubSubtitle || 'اختر مساحة العمل الملائمة لاحتياجاتك اليوم'}
            </p>
          </div>

          {/* Dual Interactive Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Card 1: مستشاري الشخصي (Personal Journal Advisor) */}
            <button
              type="button"
              onClick={() => setActiveWorkspace('personal')}
              className="group text-start p-6 rounded-3xl bg-white dark:bg-[#0E2320] border-2 border-[#2D6A4F]/20 dark:border-[#48B89F]/20 hover:border-[#2D6A4F] dark:hover:border-[#48B89F] shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 text-[#2D6A4F] dark:text-[#48B89F] flex items-center justify-center transition-transform group-hover:scale-105">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#12261D] dark:text-[#EBF5F2] group-hover:text-[#2D6A4F] dark:group-hover:text-[#48B89F] transition-colors">
                    {t.personalJournalAdvisorTitle || 'مستشاري الشخصي'}
                  </h2>
                  <p className="text-xs text-[#4A6357] dark:text-[#9EC2B8] mt-1.5 leading-relaxed">
                    {t.personalJournalAdvisorSubtitle || 'يحلل تدويناتك، أمزجتك، عاداتك، مهامك، تقييماتك ووسائطك المختارة بدقة وفق نطاقك الزمني وصلاحياتك.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15">
                <span className="text-xs font-bold text-[#2D6A4F] dark:text-[#48B89F]">
                  {isAr ? 'دخول مساحة العمل' : 'Enter Workspace'}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 text-[#2D6A4F] dark:text-[#48B89F] flex items-center justify-center group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  {langInfo.dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Card 2: المستشار الذكي العام (General AI) */}
            <button
              type="button"
              onClick={() => setActiveWorkspace('general')}
              className="group text-start p-6 rounded-3xl bg-white dark:bg-[#0E2320] border-2 border-[#3A8E7D]/20 dark:border-[#2D8C76]/20 hover:border-[#3A8E7D] dark:hover:border-[#2D8C76] shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#3A8E7D]/10 dark:bg-[#2D8C76]/15 text-[#3A8E7D] dark:text-[#2D8C76] flex items-center justify-center transition-transform group-hover:scale-105">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#12261D] dark:text-[#EBF5F2] group-hover:text-[#3A8E7D] dark:group-hover:text-[#2D8C76] transition-colors">
                    {t.generalAiAdvisorTitle || 'المستشار الذكي العام'}
                  </h2>
                  <p className="text-xs text-[#4A6357] dark:text-[#9EC2B8] mt-1.5 leading-relaxed">
                    {t.generalAiAdvisorSubtitle || 'مساعد ذكي شامل على طريقة Gemini للمعرفة، الدراسة، البرمجة، العصف الذهني وتحليل الملفات والوسائط المباشرة دون تداخل مع يومياتك.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#3A8E7D]/10 dark:border-[#2D8C76]/15">
                <span className="text-xs font-bold text-[#3A8E7D] dark:text-[#2D8C76]">
                  {isAr ? 'دخول مساحة العمل' : 'Enter Workspace'}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#3A8E7D]/10 dark:bg-[#2D8C76]/15 text-[#3A8E7D] dark:text-[#2D8C76] flex items-center justify-center group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  {langInfo.dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </div>
              </div>
            </button>

          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: TRUE FULL-SCREEN CHAT WORKSPACE (Personal OR General)
         ========================================================================= */}
      {activeWorkspace !== 'hub' && (
        <div className="fixed inset-0 z-[9990] flex flex-col bg-[#EFF4F1] dark:bg-[#071614] overflow-hidden w-full h-[100dvh]">
          
          {/* Top Bar */}
          <header className="px-3 sm:px-5 py-2.5 sm:py-3 bg-white dark:bg-[#0E2320] border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 flex items-center justify-between gap-2 shrink-0 z-20">
            
            {/* Start Side: Back Arrow + Drawer Button + Title */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setActiveWorkspace('hub')}
                className="p-2 rounded-xl hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10 text-[#2D6A4F] dark:text-[#48B89F] transition-colors cursor-pointer shrink-0"
                title={t.backToAdvisorHub || 'العودة لمستشار بلوميو'}
              >
                {langInfo.dir === 'rtl' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10 text-[#4A6357] dark:text-[#9EC2B8] transition-colors cursor-pointer shrink-0"
                title={t.advisorConversations || 'سجل المحادثات'}
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setHistoryCollapsed(prev => !prev)}
                className="hidden lg:inline-flex p-2 rounded-xl hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10 text-[#4A6357] dark:text-[#9EC2B8] transition-colors cursor-pointer shrink-0"
                title={historyCollapsed ? (t.advisorConversations || 'سجل المحادثات') : (t.close || 'طي سجل المحادثات')}
                aria-label={historyCollapsed ? (t.advisorConversations || 'سجل المحادثات') : (t.close || 'طي سجل المحادثات')}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-black text-[#12261D] dark:text-[#EBF5F2] truncate">
                  {activeWorkspace === 'personal'
                    ? (t.personalJournalAdvisorTitle || 'مستشاري الشخصي')
                    : (t.generalAiAdvisorTitle || 'المستشار الذكي العام')}
                </h2>
                <span className="text-[10px] text-[#718A7D] dark:text-[#6C9187] block truncate">
                  Blomeo AI
                </span>
              </div>
            </div>

            {/* End Side: Model Selector Pill + (Permissions in Personal) + Actions Menu */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              
              {/* Dynamic Model Selector Pill (No standalone spinning refresh button!) */}
              <button
                type="button"
                onClick={() => setShowModelPickerModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#F3F8F5] dark:bg-[#14302B] border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 text-[#2D6A4F] dark:text-[#48B89F] text-xs font-bold hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/15 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[130px]">{currentModelLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
              </button>

              {/* Permissions Shield Button (Personal Advisor Only) */}
              {activeWorkspace === 'personal' && (
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(true)}
                  className="p-2 rounded-full hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer shrink-0"
                  title={t.smartAdvisorAccessPermissions || 'صلاحيات وصول المستشار الذكي'}
                >
                  <ShieldCheck className="w-5 h-5" />
                </button>
              )}

              {/* Actions Menu Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(prev => !prev)}
                  className="p-2 rounded-full hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10 text-[#4A6357] dark:text-[#9EC2B8] transition-colors cursor-pointer shrink-0"
                  aria-label={t.moreOptions || 'خيارات إضافية'}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMoreMenu && (
                  <div className="absolute end-0 top-full mt-1.5 z-50 w-48 rounded-2xl bg-white dark:bg-[#14302B] border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={handleCopyEntireChat}
                      className="w-full text-start flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#12261D] dark:text-[#EBF5F2] hover:bg-[#F3F8F5] dark:hover:bg-[#0E2320] transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.copyAllConversation || 'نسخ المحادثة بالكامل'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConversation}
                      className="w-full text-start flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t.deleteAllConversation || 'حذف المحادثة'}</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </header>

          {/* Subheader: Data & Media Scope Bar (Personal Advisor ONLY) */}
          {activeWorkspace === 'personal' && (
            <div className="px-4 py-2 bg-[#F3F8F5] dark:bg-[#14302B] border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 flex items-center justify-between gap-2 shrink-0 z-10">
              <button
                type="button"
                onClick={() => setShowScopeModal(true)}
                className="flex items-center gap-2 text-xs font-bold text-[#2D6A4F] dark:text-[#48B89F] hover:underline cursor-pointer min-w-0"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {t.timeRangeScope || 'نطاق التحليل'}: {scopeSummaryText}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowScopeModal(true)}
                className="px-2.5 py-1 rounded-full bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 text-[11px] font-bold text-[#2D6A4F] dark:text-[#48B89F] shrink-0 hover:bg-[#2D6A4F]/20 cursor-pointer"
              >
                {scopedDiaries.length} {t.diaryEntries || 'تدوينة'} • {scopedMediaList.length} {t.multimediaLabel || 'ملفات'}
              </button>
            </div>
          )}

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Persistent desktop conversation history */}
            <aside className={`${historyCollapsed ? 'lg:hidden' : 'hidden lg:flex'} w-72 xl:w-80 shrink-0 flex-col border-e border-[#2D6A4F]/15 dark:border-[#48B89F]/15 bg-white dark:bg-[#0E2320]`}>
              <div className="p-4 border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 flex items-center justify-between bg-[#F3F8F5] dark:bg-[#14302B]">
                <h3 className="font-black text-sm text-[#12261D] dark:text-[#EBF5F2]">{t.advisorConversations || 'سجل المحادثات'}</h3>
                <button type="button" onClick={() => setHistoryCollapsed(true)} className="p-1.5 rounded-lg text-[#4A6357] dark:text-[#9EC2B8] hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10" aria-label={t.close || 'طي سجل المحادثات'}>
                  {langInfo.dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-3">
                <button type="button" onClick={handleNewConversation} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] text-xs font-black shadow-xs hover:bg-[#214E3A] transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" /><span>{t.newConversation || 'محادثة جديدة'}</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(activeWorkspace === 'general' ? generalThreads : personalThreads).map(thread => {
                  const isActive = thread.id === (activeWorkspace === 'general' ? activeGeneralThreadId : activePersonalThreadId);
                  return (
                    <div key={thread.id} className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${isActive ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F]' : 'bg-[#F3F8F5] dark:bg-[#14302B] border-transparent hover:border-[#2D6A4F]/20'}`}>
                      <button type="button" onClick={() => {
                        if (activeWorkspace === 'general') { setActiveGeneralThreadId(thread.id); setGeneralMessages(thread.messages); }
                        else { setActivePersonalThreadId(thread.id); setPersonalMessages(thread.messages); }
                      }} className="flex-1 text-start min-w-0">
                        <div className="font-bold text-xs text-[#12261D] dark:text-[#EBF5F2] truncate">{thread.title}</div>
                        <div className="text-[10px] text-[#718A7D] dark:text-[#6C9187] mt-0.5">{formatMessageFullDate(thread.createdAt, appLanguage)}</div>
                      </button>
                      <button type="button" onClick={() => {
                        if (!window.confirm(t.deleteConversationConfirm || 'حذف هذه المحادثة؟')) return;
                        if (activeWorkspace === 'general') {
                          const next = generalThreads.filter(item => item.id !== thread.id);
                          setGeneralThreads(next);
                          try { localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(next)); } catch {}
                          if (isActive && next[0]) { setActiveGeneralThreadId(next[0].id); setGeneralMessages(next[0].messages); }
                          else if (isActive) { setActiveGeneralThreadId(`general-${Date.now()}`); setGeneralMessages([]); }
                        } else {
                          const next = personalThreads.filter(item => item.id !== thread.id);
                          setPersonalThreads(next);
                          try { localStorage.setItem('yawmiyati_personal_advisor_threads', JSON.stringify(next)); } catch {}
                          if (isActive && next[0]) { setActivePersonalThreadId(next[0].id); setPersonalMessages(next[0].messages); }
                          else if (isActive) { setActivePersonalThreadId(`personal-${Date.now()}`); setPersonalMessages([]); }
                        }
                      }} className="p-1 rounded-lg text-gray-400 hover:text-red-500 cursor-pointer shrink-0" title={t.deleteConversation || 'حذف'}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </aside>
            <main className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
          {/* Chat Messages Box */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-[#EFF4F1]/60 dark:bg-[#071614]/60">
            {(activeWorkspace === 'general' ? generalMessages : personalMessages).map(msg => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 text-sm leading-relaxed shadow-xs transition-colors select-text ${
                      isUser
                        ? 'bg-[#2D6A4F] text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#0E2320] text-[#12261D] dark:text-[#EBF5F2] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 rounded-tl-none font-normal'
                    }`}
                  >
                    <div>
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      ) : (
                        <MarkdownMessage content={sanitizeAdvisorText(msg.text, appLanguage)} isAi={true} />
                      )}
                    </div>

                    {/* Footer: Full Date + Day Timestamp & Actions */}
                    <div className={`flex items-center justify-between gap-3 mt-3 pt-2 border-t border-dashed ${
                      isUser ? 'border-white/20' : 'border-[#2D6A4F]/10 dark:border-[#48B89F]/15'
                    }`}>
                      <span className={`text-[10px] font-bold ${
                        isUser ? 'text-white/80' : 'text-[#718A7D] dark:text-[#6C9187]'
                      }`}>
                        {formatMessageFullDate(msg.createdAt, appLanguage)}
                      </span>

                      <div className="flex items-center gap-1">
                        {/* Copy Message Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className={`p-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                            copiedMessageId === msg.id
                              ? 'text-emerald-300 font-black'
                              : isUser
                              ? 'text-white/80 hover:text-white hover:bg-white/10'
                              : 'text-[#4A6357] dark:text-[#9EC2B8] hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                          title={t.copyTextBtn || 'نسخ'}
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px]">{t.messageCopied || 'تم النسخ ✓'}</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Read Aloud / TTS on AI replies */}
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleToggleSpeech(msg.id, msg.text)}
                            className={`p-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                              currentlySpeakingId === msg.id
                                ? 'text-red-500 bg-red-500/10'
                                : 'text-[#4A6357] dark:text-[#9EC2B8] hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                            title={currentlySpeakingId === msg.id ? (t.stopAudio || 'إيقاف') : (t.listenAudio || 'استماع')}
                          >
                            {currentlySpeakingId === msg.id ? (
                              <>
                                <Square className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-[10px]">{t.stopAudio || 'إيقاف'}</span>
                              </>
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-end">
                <div className="bg-white dark:bg-[#0E2320] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 rounded-3xl rounded-tl-none p-4 shadow-xs flex items-center gap-2 text-xs font-bold text-[#4A6357] dark:text-[#9EC2B8]">
                  <span>{t.smartAdvisorAnalyzingLifeLog || 'بلوميو يحلل ويفكر…'}</span>
                  <div className="flex space-x-1 space-x-reverse">
                    <span className="w-1.5 h-1.5 bg-[#2D6A4F] dark:bg-[#48B89F] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[#2D6A4F] dark:bg-[#48B89F] rounded-full animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 bg-[#2D6A4F] dark:bg-[#48B89F] rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Horizontal Suggested Prompts Strip (Personal Advisor ONLY) */}
          {activeWorkspace === 'personal' && (
            <div className="px-3 py-2 bg-white dark:bg-[#0E2320] border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15 flex flex-nowrap overflow-x-auto no-scrollbar gap-2 shrink-0">
              {personalPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#F3F8F5] dark:bg-[#14302B] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 text-xs font-bold text-[#12261D] dark:text-[#EBF5F2] hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/15 transition-colors cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Gemini-Style Bottom Composer Bar */}
          <SmartAdvisorComposer
            input={activeWorkspace === 'general' ? generalInput : personalInput}
            setInput={activeWorkspace === 'general' ? setGeneralInput : setPersonalInput}
            onSend={handleSendMessage}
            loading={loading}
            onOpenLiveVoice={() => setShowLiveVoiceModal(true)}
            onDictationToggle={handleDictationToggle}
            isDictating={isDictating}
            onFileUpload={handleComposerFileUpload}
            attachments={activeWorkspace === 'general' ? generalAttachments : personalAttachments}
            onRemoveAttachment={id => {
              if (activeWorkspace === 'general') setGeneralAttachments(prev => prev.filter(f => f.id !== id));
              else setPersonalAttachments(prev => prev.filter(f => f.id !== id));
            }}
            uploadProgress={uploadProgress}
            placeholder={
              activeWorkspace === 'general'
                ? (t.askGeneralAiPlaceholder || 'اسأل بلوميو عن أي شيء (معرفة، برمجة، دراسة، ملفات)...')
                : (t.askAdvisorPlaceholder || 'اسأل بلوميو عن تدويناتك وأمزجتك وتطورك...')
            }
            appLanguage={appLanguage}
            accentTheme={activeWorkspace === 'general' ? 'aquatic' : 'emerald'}
          />
            </main>
          </div>

          {/* =========================================================================
              MODALS & DRAWERS
             ========================================================================= */}

          {/* Side Drawer: Dated Multi-Conversation History */}
          {showDrawer && (
            <div
              className="lg:hidden fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex animate-in fade-in duration-200"
              onClick={() => setShowDrawer(false)}
            >
              <aside
                className={`w-[min(88%,360px)] h-full bg-white dark:bg-[#0E2320] border-e border-[#2D6A4F]/15 dark:border-[#48B89F]/15 shadow-2xl flex flex-col ${
                  langInfo.dir === 'rtl' ? 'ms-auto' : 'me-auto'
                }`}
                onClick={e => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="p-4 border-b border-[#2D6A4F]/10 dark:border-[#48B89F]/15 flex items-center justify-between bg-[#F3F8F5] dark:bg-[#14302B]">
                  <h3 className="font-black text-sm text-[#12261D] dark:text-[#EBF5F2]">
                    {t.advisorConversations || 'سجل المحادثات'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* + New Conversation Button */}
                <div className="p-3">
                  <button
                    type="button"
                    onClick={handleNewConversation}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] text-xs font-black shadow-xs hover:bg-[#214E3A] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.newConversation || 'محادثة جديدة'}</span>
                  </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {(activeWorkspace === 'general' ? generalThreads : personalThreads).map(thread => {
                    const isActive = thread.id === (activeWorkspace === 'general' ? activeGeneralThreadId : activePersonalThreadId);
                    return (
                      <div
                        key={thread.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-[#2D6A4F]/10 dark:bg-[#48B89F]/15 border-[#2D6A4F] dark:border-[#48B89F]'
                            : 'bg-[#F3F8F5] dark:bg-[#14302B] border-transparent hover:border-[#2D6A4F]/20'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowDrawer(false);
                            if (activeWorkspace === 'general') {
                              setActiveGeneralThreadId(thread.id);
                              setGeneralMessages(thread.messages);
                            } else {
                              setActivePersonalThreadId(thread.id);
                              setPersonalMessages(thread.messages);
                            }
                          }}
                          className="flex-1 text-start min-w-0"
                        >
                          <div className="font-bold text-xs text-[#12261D] dark:text-[#EBF5F2] truncate">
                            {thread.title}
                          </div>
                          <div className="text-[10px] text-[#718A7D] dark:text-[#6C9187] mt-0.5">
                            {formatMessageFullDate(thread.createdAt, appLanguage)}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(t.deleteConversationConfirm || 'حذف هذه المحادثة؟')) return;
                            if (activeWorkspace === 'general') {
                              const next = generalThreads.filter(t => t.id !== thread.id);
                              setGeneralThreads(next);
                              try { localStorage.setItem('yawmiyati_general_chat_threads', JSON.stringify(next)); } catch {}
                              if (isActive && next[0]) {
                                setActiveGeneralThreadId(next[0].id);
                                setGeneralMessages(next[0].messages);
                              }
                            } else {
                              const next = personalThreads.filter(t => t.id !== thread.id);
                              setPersonalThreads(next);
                              try { localStorage.setItem('yawmiyati_personal_advisor_threads', JSON.stringify(next)); } catch {}
                              if (isActive && next[0]) {
                                setActivePersonalThreadId(next[0].id);
                                setPersonalMessages(next[0].messages);
                              }
                            }
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 cursor-pointer shrink-0"
                          title={t.deleteConversation || 'حذف'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          )}

          {/* Model Discovery Modal */}
          <AdvisorModelPickerModal
            open={showModelPickerModal}
            onClose={() => setShowModelPickerModal(false)}
            currentMode={modelMode}
            onSelectMode={handleSelectModelMode}
            discoveredModels={discoveredModels}
            onRefreshModels={handleManualRefreshModels}
            isRefreshing={isRefreshingModels}
            appLanguage={appLanguage}
          />

          {/* Personal Scope Modal */}
          <AdvisorScopeModal
            open={showScopeModal}
            onClose={() => setShowScopeModal(false)}
            config={scopeConfig}
            onChangeConfig={setScopeConfig}
            availableMedia={scopedMediaList}
            entriesCountInRange={scopedDiaries.length}
            mediaCountInRange={scopedMediaList.length}
            appLanguage={appLanguage}
          />

          {/* Permissions Modal */}
          {showPermissionsModal && (
            <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" dir={langInfo.dir}>
              <div className="bg-white dark:bg-[#0E2320] border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 rounded-3xl p-5 max-w-lg w-full text-start shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                <NativeModalHeader
                  title={t.smartAdvisorPermissionsTitle || 'صلاحيات وصول المستشار الذكي'}
                  subtitle={t.smartAdvisorPermissionsSubtitle || 'تحكم في ما يمكن للمستشار تحليله من يومياتك'}
                  icon={<ShieldCheck className="w-5 h-5 text-amber-500" />}
                  onBack={() => setShowPermissionsModal(false)}
                  isRtl={langInfo.dir === 'rtl'}
                  theme="light"
                />
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {Object.keys(DEFAULT_ADVISOR_PERMISSIONS).map(key => {
                    const isChecked = (advisorPermissions as any)[key];
                    return (
                      <label key={key} className="flex items-center justify-between p-3 rounded-2xl bg-[#F3F8F5] dark:bg-[#14302B] cursor-pointer text-xs font-bold">
                        <span>{(t as any)[`smartContext${key.charAt(0).toUpperCase() + key.slice(1)}Title`] || key}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setAdvisorPermissions(prev => {
                              const updated = { ...prev, [key]: !(prev as any)[key] };
                              try { localStorage.setItem('yawmiyati_advisor_permissions', JSON.stringify(updated)); } catch {}
                              return updated;
                            });
                          }}
                          className="w-4 h-4 accent-[#2D6A4F] dark:accent-[#48B89F] rounded"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPermissionsModal(false)}
                    className="px-5 py-2 rounded-xl bg-[#2D6A4F] dark:bg-[#48B89F] text-white dark:text-[#071614] text-xs font-bold"
                  >
                    {t.done || 'تم'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Voice Chat Modal */}
          <LiveVoiceChatModal
            open={showLiveVoiceModal}
            onClose={() => setShowLiveVoiceModal(false)}
            language={langInfo.speechLang}
            history={(activeWorkspace === 'general' ? generalMessages : personalMessages).map(m => ({ sender: m.sender, text: m.text }))}
            diaryContextEnabled={activeWorkspace === 'personal'}
            diaryContext=""
            onTranscribeAudio={transcribeLiveVoice}
            onSubmitTurn={submitLiveVoiceTurn}
            labels={{
              status: t.voiceCompanionTitle || 'المحادثة الصوتية المباشرة',
              listen: t.voiceStartSpeaking || 'ابدأ التحدث',
              stop: t.stopVoiceRecording || 'إيقاف',
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

        </div>
      )}

    </div>
  );
}
