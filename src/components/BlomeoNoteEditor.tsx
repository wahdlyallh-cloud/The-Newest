import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Star,
  Archive,
  ChevronDown,
  Paperclip,
  Mic,
  Maximize2,
  Minimize2,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Highlighter,
  RemoveFormatting,
  Sparkles,
  RefreshCw,
  Folder,
  Download,
  Check,
  CheckSquare,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Video,
  FileText,
  Volume2,
  Plus,
  ArrowUp,
  Copy,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { DiaryEntry, AppLanguage, JournalEntryType, TaskItem, FileAttachment, AudioRecording } from '../types';
import { ALL_JOURNAL_TYPES, getJournalTypeConfig, getJournalTypeLabel, getJournalTypeDescription } from '../lib/journalTypes';
import { normalizeMoodDistribution } from '../lib/emotionNormalization';
import AIMediaAccessSelector from './AIMediaAccessSelector';
import { AIMediaAccessPermission, extractAvailableAttachments } from '../lib/aiMediaAccess';
import { copyTextSafe } from '../lib/clipboard';

export interface BlomeoNoteEditorProps {
  editingDiary: DiaryEntry;
  setEditingDiary: React.Dispatch<React.SetStateAction<DiaryEntry | null>>;
  isNewEntry: boolean;
  isSavingDiary: boolean;
  autoSavedTime: string | null;
  appLanguage: AppLanguage;
  isRtl: boolean;
  t: any;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onOpenAttachmentsPage: () => void;
  onOpenExportModal: () => void;
  onOpenGratitudeImport: () => void;
  onOpenVoiceVent: () => void;
  onOpenVoiceVentWithFile?: (file: File) => void;
  onOpenAIVoiceJournal?: () => void;
  onOpenDrawingCanvas: (index?: number | null) => void;
  onOpenWriteDiaryImport: () => void;
  onTriggerPhotoUpload: () => void;
  onTriggerVideoUpload: () => void;
  onTriggerPdfUpload: () => void;
  onTriggerGenericFileUpload: () => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onSaveSelection: () => void;
  onRecordUndo: (currentHtml?: string) => void;
  onApplyRichFormat: (command: string, value?: string | null) => void;
  onInsertFormatting: (prefix: string, suffix?: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  fontDrawerSize: number;
  setFontDrawerSize: (size: number) => void;
  fontDrawerFamily: string;
  setFontDrawerFamily: (family: string) => void;
  // CBT Advisor Panel props
  diaryChatMediaPermission: AIMediaAccessPermission;
  setDiaryChatMediaPermission: (p: AIMediaAccessPermission) => void;
  diaryChatLoading: boolean;
  onSendDiaryChatMessage: (promptText?: string) => void;
  onExportDiaryChatPdf: () => void;
  onDeleteAllChatMessages: () => void;
  onDeleteSelectedChatMessages: () => void;
  selectedChatIndices: number[];
  setSelectedChatIndices: React.Dispatch<React.SetStateAction<number[]>>;
  isChatSelectMode: boolean;
  setIsChatSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  diaryChatMessage: string;
  setDiaryChatMessage: (msg: string) => void;
  diaryChatTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showGlobalCopyToast: (msg: string, type?: 'success' | 'error') => void;
  allDiariesVault?: DiaryEntry[];
  onSelectVaultEntry?: (entry: DiaryEntry) => void;
}

export const BlomeoNoteEditor: React.FC<BlomeoNoteEditorProps> = ({
  editingDiary,
  setEditingDiary,
  isNewEntry,
  isSavingDiary,
  autoSavedTime,
  appLanguage,
  isRtl,
  t,
  onSave,
  onCancel,
  onDelete,
  onToggleArchive,
  onOpenAttachmentsPage,
  onOpenExportModal,
  onOpenGratitudeImport,
  onOpenVoiceVent,
  onOpenVoiceVentWithFile,
  onOpenAIVoiceJournal,
  onOpenDrawingCanvas,
  onOpenWriteDiaryImport,
  onTriggerPhotoUpload,
  onTriggerVideoUpload,
  onTriggerPdfUpload,
  onTriggerGenericFileUpload,
  editorRef,
  onSaveSelection,
  onRecordUndo,
  onApplyRichFormat,
  onInsertFormatting,
  onUndo,
  onRedo,
  fontDrawerSize,
  setFontDrawerSize,
  fontDrawerFamily,
  setFontDrawerFamily,
  diaryChatMediaPermission,
  setDiaryChatMediaPermission,
  diaryChatLoading,
  onSendDiaryChatMessage,
  onExportDiaryChatPdf,
  onDeleteAllChatMessages,
  onDeleteSelectedChatMessages,
  selectedChatIndices,
  setSelectedChatIndices,
  isChatSelectMode,
  setIsChatSelectMode,
  diaryChatMessage,
  setDiaryChatMessage,
  diaryChatTextareaRef,
  showGlobalCopyToast,
  allDiariesVault = [],
  onSelectVaultEntry
}) => {
  // Screen width responsive state
  const [isDesktopOrTablet, setIsDesktopOrTablet] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768;
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopOrTablet(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Obsidian Vault & CBT Collapsible Sidebar states
  const [isVaultSidebarOpen, setIsVaultSidebarOpen] = useState(true);
  const [isCbtPanelOpen, setIsCbtPanelOpen] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Samsung Notes Bottom Drawers
  const [showFormatDrawer, setShowFormatDrawer] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPaperclipMenu, setShowPaperclipMenu] = useState(false);

  // Floating selection pill state
  const [selectionPillPos, setSelectionPillPos] = useState<{ x: number; y: number } | null>(null);

  // Multi-Select Pre-Writing Moods list
  const availableMoods = ['سعيد', 'متحمس', 'مرتاح', 'طبيعي', 'حزين', 'مكتئب', 'قلق', 'غاضب', 'مرهق', 'ممتن'];
  const currentPreMoods = (editingDiary.preMoods && editingDiary.preMoods.length > 0)
    ? editingDiary.preMoods
    : (editingDiary.moods && editingDiary.moods.length > 0)
    ? editingDiary.moods
    : editingDiary.mood ? [editingDiary.mood] : [];

  const wordsCount = (editingDiary.content || '')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const handleTogglePreMood = (m: string) => {
    setEditingDiary(prev => {
      if (!prev) return null;
      const existing = (prev.preMoods && prev.preMoods.length > 0)
        ? [...prev.preMoods]
        : (prev.moods && prev.moods.length > 0)
        ? [...prev.moods]
        : prev.mood ? [prev.mood] : [];
      let updated: string[];
      if (existing.includes(m)) {
        updated = existing.filter(x => x !== m);
      } else {
        updated = [...existing, m];
      }
      return {
        ...prev,
        preMoods: updated,
        moods: updated,
        mood: updated[0] || 'طبيعي'
      };
    });
  };

  // Live Markdown Shortcut Watcher (# , ## , [] , > )
  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
    onSaveSelection();
    const html = e.currentTarget.innerHTML;
    onRecordUndo(html);
    setEditingDiary(prev => (prev ? { ...prev, content: html } : null));

    // Markdown shortcut check on typed space
    const sel = window.getSelection();
    if (sel && sel.anchorNode && sel.anchorNode.textContent) {
      const text = sel.anchorNode.textContent;
      if (text.startsWith('# ')) {
        sel.anchorNode.textContent = text.slice(2);
        onApplyRichFormat('formatBlock', '<h1>');
      } else if (text.startsWith('## ')) {
        sel.anchorNode.textContent = text.slice(3);
        onApplyRichFormat('formatBlock', '<h2>');
      } else if (text.startsWith('### ')) {
        sel.anchorNode.textContent = text.slice(4);
        onApplyRichFormat('formatBlock', '<h3>');
      } else if (text.startsWith('> ')) {
        sel.anchorNode.textContent = text.slice(2);
        onApplyRichFormat('formatBlock', '<blockquote>');
      } else if (text.startsWith('- ')) {
        sel.anchorNode.textContent = text.slice(2);
        onApplyRichFormat('insertUnorderedList');
      } else if (text.startsWith('1. ')) {
        sel.anchorNode.textContent = text.slice(3);
        onApplyRichFormat('insertOrderedList');
      } else if (text.startsWith('[] ') || text.startsWith('[ ] ')) {
        sel.anchorNode.textContent = text.replace(/^\[\s?\]\s/, '');
        handleAddTask();
      }
    }
  };

  const handleAddTask = () => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      text: '',
      completed: false
    };
    setEditingDiary(prev => prev ? { ...prev, tasks: [...(prev.tasks || []), newTask] } : null);
  };

  // Floating text selection detection
  const handleMouseUpOrSelection = () => {
    onSaveSelection();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPillPos({
        x: Math.max(10, rect.left + rect.width / 2 - 100),
        y: Math.max(10, rect.top - 45)
      });
    } else {
      setSelectionPillPos(null);
    }
  };

  // Paperclip file trigger router
  const handlePaperclipPickAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onOpenVoiceVentWithFile) {
      onOpenVoiceVentWithFile(file);
    }
    e.target.value = '';
    setShowPaperclipMenu(false);
  };

  return (
    <div className="relative w-full max-w-full min-h-[85vh] flex flex-col bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] rounded-3xl border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 shadow-sm overflow-hidden transition-all">
      {/* 1. TOP HEADER ROW (Obsidian / Samsung Notes Unified Clean Header) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[rgba(45,106,79,0.12)] dark:border-[#1E4D3B]/40 bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#071614]/80 flex-wrap gap-2.5 z-20">
        <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
            title={t?.cancelBtn || (isRtl ? 'إلغاء وعودة' : 'Back')}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-extrabold truncate">
              {editingDiary.title || (isNewEntry ? (isRtl ? 'تدوينة جديدة' : 'New Note') : (isRtl ? 'تعديل التدوينة' : 'Edit Note'))}
            </span>
            {autoSavedTime && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3" />
                <span>{isRtl ? 'محفوظ تلقائياً' : 'Auto-saved'} ({autoSavedTime})</span>
              </span>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-1.5">
          {!isDesktopOrTablet && (
            <button
              type="button"
              onClick={() => setIsCbtPanelOpen(true)}
              className="p-1.5 rounded-xl bg-[#2D6A4F]/10 dark:bg-[#74C69D]/20 text-[#2D6A4F] dark:text-[#74C69D] border border-[#2D6A4F]/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title={isRtl ? 'المستشار النفسي CBT' : 'CBT Advisor'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px]">{isRtl ? 'مستشار AI' : 'AI CBT'}</span>
            </button>
          )}
          {isDesktopOrTablet && (
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isFocusMode
                  ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                  : 'bg-white dark:bg-[#14302B] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
              title={isRtl ? 'وضع التركيز التام' : 'Focus Mode'}
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden lg:inline">{isRtl ? 'وضع التركيز' : 'Focus'}</span>
            </button>
          )}

          {/* Export button */}
          <button
            type="button"
            onClick={onOpenExportModal}
            className="p-1.5 rounded-xl bg-white dark:bg-[#14302B] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 cursor-pointer shadow-3xs"
            title={t?.exportDiary || (isRtl ? 'تصدير' : 'Export')}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Archive button */}
          {!isNewEntry && (
            <button
              type="button"
              onClick={() => onToggleArchive(editingDiary.id)}
              className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 cursor-pointer shadow-3xs"
              title={editingDiary.isArchived ? (isRtl ? 'إلغاء الأرشفة' : 'Unarchive') : (isRtl ? 'أرشفة' : 'Archive')}
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          {/* Primary Save Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingDiary}
            className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 ${
              isSavingDiary
                ? 'bg-[#2D6A4F]/60 text-white cursor-not-allowed'
                : 'bg-gradient-to-r from-[#1E4D3B] via-[#2D6A4F] to-[#15382B] hover:brightness-110 text-white active:scale-95'
            }`}
          >
            {isSavingDiary ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{isRtl ? 'جاري الحفظ...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t?.saveDiarySuccessBtn || (isRtl ? 'حفظ التدوينة' : 'Save')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. BODY LAYOUT (Responsive Obsidian Multi-Pane vs. Samsung Mobile) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* DESKTOP/TABLET: Obsidian Collapsible Day-Grouped Vault Sidebar */}
        {isDesktopOrTablet && !isFocusMode && (
          <div
            className={`${
              isVaultSidebarOpen ? 'w-64 xl:w-72' : 'w-10'
            } transition-all duration-300 border-e border-[rgba(45,106,79,0.12)] dark:border-[#1E4D3B]/40 bg-[var(--blomeo-surface-nested,#F3F8F5)]/60 dark:bg-[#071614]/50 flex flex-col shrink-0 overflow-hidden`}
          >
            <div className="p-2.5 flex items-center justify-between border-b border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/30">
              {isVaultSidebarOpen ? (
                <>
                  <span className="text-xs font-extrabold text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] flex items-center gap-1.5">
                    <span>🗂️</span>
                    <span>{isRtl ? 'خزينة التدوينات (Obsidian)' : 'Vault Explorer'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsVaultSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 cursor-pointer"
                  >
                    {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVaultSidebarOpen(true)}
                  className="w-full py-1 text-center text-gray-500 hover:text-emerald-700 cursor-pointer"
                  title={isRtl ? 'فتح الخزينة' : 'Open Vault'}
                >
                  {isRtl ? <ChevronLeft className="w-4 h-4 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                </button>
              )}
            </div>

            {isVaultSidebarOpen && (
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
                {allDiariesVault.slice(0, 30).map((vaultItem) => (
                  <button
                    key={vaultItem.id}
                    type="button"
                    onClick={() => onSelectVaultEntry && onSelectVaultEntry(vaultItem)}
                    className={`w-full text-start p-2 rounded-xl text-xs transition-all cursor-pointer truncate flex items-center gap-1.5 ${
                      vaultItem.id === editingDiary.id
                        ? 'bg-[#2D6A4F]/15 dark:bg-[#74C69D]/20 text-[#214E3A] dark:text-[#74C69D] font-extrabold shadow-3xs'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <span className="text-[11px] shrink-0">{getJournalTypeConfig(vaultItem.diaryType).icon}</span>
                    <span className="truncate">{vaultItem.title || (isRtl ? 'تدوينة بدون عنوان' : 'Untitled')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CENTER PANE: Samsung / Obsidian Writing Canvas */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5">
          {/* Metadata Row: Title + Star Rating + Journal Classification */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Title input */}
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={editingDiary.title}
                  onChange={(e) => setEditingDiary(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder={t?.journalTitlePlaceholder || (isRtl ? 'عنوان التدوينة أو الفكرة...' : 'Note title or thought...')}
                  className="w-full text-base sm:text-lg font-black bg-transparent border-b-2 border-emerald-700/20 dark:border-emerald-500/30 focus:border-[#2D6A4F] dark:focus:border-[#74C69D] focus:outline-none px-1 py-1.5 text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Star Rating */}
              <div className="flex items-center justify-end space-x-1.5 space-x-reverse h-10">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    type="button"
                    onClick={() => setEditingDiary(prev => prev ? { ...prev, importance: stars } : null)}
                    className="focus:outline-none cursor-pointer p-0.5"
                  >
                    <Star
                      className={`w-5 h-5 transition-transform hover:scale-115 ${
                        stars <= (editingDiary.importance || 1)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Classification & Multi-Select Pre-Writing Moods (preMoods) */}
            <div className="space-y-2">
              {/* Journal Type Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {ALL_JOURNAL_TYPES.map((typeKey) => {
                  const cfg = getJournalTypeConfig(typeKey);
                  const isSelected = (editingDiary.diaryType || 'diary') === typeKey;
                  return (
                    <button
                      key={typeKey}
                      type="button"
                      onClick={() => setEditingDiary(prev => prev ? { ...prev, diaryType: typeKey } : null)}
                      className={`shrink-0 px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-3xs scale-102'
                          : 'bg-white dark:bg-[#14302B] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{cfg.icon}</span>
                      <span>{getJournalTypeLabel(typeKey, t)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Multi-Select Pre-Writing Moods Bar */}
              <div className="bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#14302B]/60 p-2.5 rounded-2xl border border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1 text-[#2D6A4F] dark:text-[#74C69D] font-extrabold">
                    <span>✨</span>
                    <span>{isRtl ? 'مزاج البداية (متعدد الخيارات):' : 'Pre-Writing Moods (Multi-Select):'}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {currentPreMoods.length} {isRtl ? 'مشاعر مختارة' : 'selected'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {availableMoods.map((m) => {
                    const isSelected = currentPreMoods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleTogglePreMood(m)}
                        className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#2D6A4F] text-white border-[#2D6A4F] shadow-3xs scale-105'
                            : 'bg-white dark:bg-[#0E2320] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#2D6A4F]'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Single-Row Formatting Toolbar */}
          {isDesktopOrTablet && (
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0E2320]/95 backdrop-blur-md border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-3xs">
              {/* Undo / Redo */}
              <button type="button" onClick={onUndo} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer font-bold" title="Undo">↶</button>
              <button type="button" onClick={onRedo} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer font-bold" title="Redo">↷</button>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

              {/* Block Style Dropdown */}
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'p') onApplyRichFormat('formatBlock', '<p>');
                  else if (val) onApplyRichFormat('formatBlock', `<${val}>`);
                  e.target.value = '';
                }}
                defaultValue=""
                className="bg-transparent border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-1.5 py-1 font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer shrink-0"
              >
                <option value="" disabled>{isRtl ? 'النمط' : 'Style'}</option>
                <option value="p">{isRtl ? 'فقرة عادية' : 'Normal'}</option>
                <option value="h1">H1</option>
                <option value="h2">H2</option>
                <option value="h3">H3</option>
                <option value="blockquote">{isRtl ? 'اقتباس' : 'Quote'}</option>
              </select>

              {/* Font Size Selector (14px–22px) */}
              <select
                value={fontDrawerSize}
                onChange={(e) => setFontDrawerSize(Number(e.target.value))}
                className="bg-transparent border border-gray-200 dark:border-gray-700 text-xs rounded-lg px-1.5 py-1 font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer shrink-0"
                title={isRtl ? 'حجم الخط' : 'Font size'}
              >
                {[14, 16, 18, 20, 22].map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

              {/* B / I / U / S */}
              <button type="button" onClick={() => onInsertFormatting('**', '**')} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 font-black text-xs cursor-pointer">B</button>
              <button type="button" onClick={() => onInsertFormatting('*', '*')} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 italic font-bold text-xs cursor-pointer">I</button>
              <button type="button" onClick={() => onInsertFormatting('<u>', '</u>')} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 underline font-bold text-xs cursor-pointer">U</button>
              <button type="button" onClick={() => onInsertFormatting('~~', '~~')} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 line-through font-bold text-xs cursor-pointer">S</button>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

              {/* Color Swatches & Soft Highlight */}
              <button
                type="button"
                onClick={() => onApplyRichFormat('foreColor', '#1E4D3B')}
                className="w-4 h-4 rounded-full bg-[#1E4D3B] border border-white shadow-3xs cursor-pointer shrink-0"
                title={isRtl ? 'لون أخضر زيتي' : 'Forest Green'}
              />
              <button
                type="button"
                onClick={() => onApplyRichFormat('foreColor', '#B45309')}
                className="w-4 h-4 rounded-full bg-amber-600 border border-white shadow-3xs cursor-pointer shrink-0"
                title={isRtl ? 'لون كهرماني' : 'Amber'}
              />
              <button
                type="button"
                onClick={() => onApplyRichFormat('foreColor', '#1D4ED8')}
                className="w-4 h-4 rounded-full bg-blue-700 border border-white shadow-3xs cursor-pointer shrink-0"
                title={isRtl ? 'لون أزرق' : 'Blue'}
              />
              <button
                type="button"
                onClick={() => onApplyRichFormat('hiliteColor', '#FEF08A')}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-amber-500 cursor-pointer shrink-0"
                title={isRtl ? 'تظليل أصفر' : 'Highlight'}
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onApplyRichFormat('removeFormat')}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 cursor-pointer shrink-0"
                title={isRtl ? 'إعادة ضبط التنسيق' : 'Reset Formatting'}
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

              {/* Alignment */}
              <button type="button" onClick={() => onApplyRichFormat('justifyRight')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer shrink-0"><AlignRight className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onApplyRichFormat('justifyCenter')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer shrink-0"><AlignCenter className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onApplyRichFormat('justifyLeft')} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 cursor-pointer shrink-0"><AlignLeft className="w-3.5 h-3.5" /></button>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

              {/* Lists & Link */}
              <button type="button" onClick={() => onApplyRichFormat('insertUnorderedList')} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs cursor-pointer shrink-0" title="Bullet List">• List</button>
              <button type="button" onClick={() => onApplyRichFormat('insertOrderedList')} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs cursor-pointer shrink-0" title="Numbered List">1. List</button>
              <button type="button" onClick={handleAddTask} className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs cursor-pointer shrink-0" title="Checklist">☑ Task</button>
              <button
                type="button"
                onClick={() => {
                  const url = window.prompt(isRtl ? 'أدخل رابط URL:' : 'Enter URL:');
                  if (url) onApplyRichFormat('createLink', url);
                }}
                className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold text-blue-600 cursor-pointer shrink-0"
                title={isRtl ? 'إدراج رابط' : 'Insert Link'}
              >
                🔗
              </button>
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

              {/* Unified Paperclip Menu button */}
              <button
                type="button"
                onClick={() => setShowPaperclipMenu(!showPaperclipMenu)}
                className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  showPaperclipMenu
                    ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                }`}
                title={isRtl ? 'قائمة المرفقات الشاملة' : 'Unified Attachments'}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إرفاق' : 'Attach'}</span>
              </button>

              {/* Quick Voice Mic */}
              <button
                type="button"
                onClick={onOpenVoiceVent}
                className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 hover:bg-red-100"
                title={isRtl ? 'فضفضة صوتية مباشرة' : 'Voice Vent'}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRtl ? 'فضفضة' : 'Vent'}</span>
              </button>
            </div>
          )}

          {/* Primary Spacious Writing Canvas */}
          <div className="relative flex-1 min-h-[350px]">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder={t?.editorTextareaPlaceholder || (isRtl ? 'اكتب ما يجول في خاطرك بحرية...' : 'Write freely...')}
              onInput={handleEditorInput}
              onKeyUp={handleMouseUpOrSelection}
              onMouseUp={handleMouseUpOrSelection}
              onTouchEnd={handleMouseUpOrSelection}
              style={{
                backgroundColor: editingDiary.color || 'transparent',
                fontSize: `${Math.max(16, fontDrawerSize)}px`,
                lineHeight: '1.9'
              }}
              className={`w-full h-full min-h-[350px] focus:outline-none p-3 sm:p-5 text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] leading-relaxed transition-all select-text selectable-text whitespace-pre-wrap ${fontDrawerFamily}`}
            />

            {/* Floating Selection Pill */}
            {selectionPillPos && (
              <div
                style={{ top: `${selectionPillPos.y}px`, left: `${selectionPillPos.x}px` }}
                className="fixed z-40 bg-[#12261D] text-white p-1 rounded-2xl shadow-xl flex items-center gap-1 border border-white/20 animate-in fade-in zoom-in-95 duration-150"
              >
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onInsertFormatting('**', '**'); }} className="px-2 py-0.5 text-xs font-black hover:text-emerald-400">B</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onInsertFormatting('*', '*'); }} className="px-2 py-0.5 text-xs italic font-bold hover:text-emerald-400">I</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); onApplyRichFormat('hiliteColor', '#FEF08A'); }} className="px-2 py-0.5 text-xs font-bold text-amber-300">Highlight</button>
              </div>
            )}
          </div>

          {/* Embedded Tasks Checklist */}
          {(editingDiary.tasks || []).length > 0 && (
            <div className="p-4 bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#14302B]/60 rounded-2xl border border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/40 space-y-2.5">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
                <span className="text-xs font-bold text-[#2D6A4F] dark:text-[#74C69D] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4" />
                  <span>{isRtl ? 'قائمة المهام بالتدوينة' : 'Checklist Tasks'}</span>
                </span>
                <button type="button" onClick={handleAddTask} className="text-xs font-extrabold text-[#2D6A4F] dark:text-[#74C69D] hover:underline cursor-pointer">
                  + {isRtl ? 'إضافة مهمة' : 'Add task'}
                </button>
              </div>
              <div className="space-y-1.5">
                {editingDiary.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditingDiary(prev => prev ? {
                          ...prev,
                          tasks: prev.tasks.map(item => item.id === task.id ? { ...item, completed: checked } : item)
                        } : null);
                      }}
                      className="w-4 h-4 rounded text-[#2D6A4F] focus:ring-[#2D6A4F] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingDiary(prev => prev ? {
                          ...prev,
                          tasks: prev.tasks.map(item => item.id === task.id ? { ...item, text: val } : item)
                        } : null);
                      }}
                      placeholder={isRtl ? 'مهمة جديدة...' : 'Task text...'}
                      className={`flex-1 bg-transparent text-xs text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] focus:outline-none ${task.completed ? 'line-through text-gray-400' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDiary(prev => prev ? {
                          ...prev,
                          tasks: prev.tasks.filter(item => item.id !== task.id)
                        } : null);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Media Summary Strip */}
          {((editingDiary.audioRecordings || []).length > 0 || (editingDiary.images || []).length > 0 || (editingDiary.files || []).length > 0) && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/30">
              <span className="font-bold">{isRtl ? 'المرفقات الحالية:' : 'Attachments:'}</span>
              {(editingDiary.audioRecordings || []).length > 0 && (
                <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900 flex items-center gap-1 font-bold">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{editingDiary.audioRecordings.length} {isRtl ? 'تسجيلات' : 'audio'}</span>
                </span>
              )}
              {(editingDiary.images || []).length > 0 && (
                <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900 flex items-center gap-1 font-bold">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{editingDiary.images.length} {isRtl ? 'صور' : 'images'}</span>
                </span>
              )}
              {(editingDiary.files || []).length > 0 && (
                <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-900 flex items-center gap-1 font-bold">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{editingDiary.files.length} {isRtl ? 'ملفات' : 'files'}</span>
                </span>
              )}
              <button
                type="button"
                onClick={onOpenAttachmentsPage}
                className="text-emerald-700 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer ms-auto"
              >
                {isRtl ? 'إدارة كل المرفقات ↗' : 'Manage attachments ↗'}
              </button>
            </div>
          )}
        </div>

        {/* DESKTOP/TABLET: Collapsible CBT Entry Advisor Panel */}
        {isDesktopOrTablet && !isFocusMode && (
          <div
            className={`${
              isCbtPanelOpen ? 'w-80 xl:w-96' : 'w-10'
            } transition-all duration-300 border-s border-[rgba(45,106,79,0.12)] dark:border-[#1E4D3B]/40 bg-[var(--blomeo-surface-nested,#F3F8F5)]/60 dark:bg-[#071614]/50 flex flex-col shrink-0 overflow-hidden`}
          >
            <div className="p-2.5 flex items-center justify-between border-b border-[rgba(45,106,79,0.1)] dark:border-[#1E4D3B]/30">
              {isCbtPanelOpen ? (
                <>
                  <span className="text-xs font-extrabold text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] flex items-center gap-1.5">
                    <span>🧠</span>
                    <span>{isRtl ? 'المستشار النفسي CBT' : 'CBT Entry Advisor'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCbtPanelOpen(false)}
                    className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 cursor-pointer"
                  >
                    {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCbtPanelOpen(true)}
                  className="w-full py-1 text-center text-gray-500 hover:text-emerald-700 cursor-pointer"
                  title={isRtl ? 'فتح المستشار' : 'Open Advisor'}
                >
                  {isRtl ? <ChevronRight className="w-4 h-4 mx-auto" /> : <ChevronLeft className="w-4 h-4 mx-auto" />}
                </button>
              )}
            </div>

            {isCbtPanelOpen && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-hidden">
                {/* AIMediaAccessSelector */}
                <AIMediaAccessSelector
                  permission={diaryChatMediaPermission}
                  onChange={setDiaryChatMediaPermission}
                  availableAttachments={extractAvailableAttachments([editingDiary])}
                  appLanguage={appLanguage}
                  compact={true}
                />

                {/* Chat Log Message Box */}
                <div className="flex-1 overflow-y-auto space-y-2.5 p-2.5 bg-white dark:bg-[#0E2320] border border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 rounded-2xl shadow-inner scrollbar-none text-xs">
                  {(editingDiary.chatLogs || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 space-y-2">
                      <span className="text-2xl block">💬</span>
                      <p className="text-xs font-bold text-gray-500">{isRtl ? 'مساحة الحوار النفسي والفكري' : 'Psychological Safe Space'}</p>
                      <p className="text-[10.5px] leading-relaxed max-w-xs mx-auto">
                        {isRtl ? 'ناقش أفكار التدوينة، واستخرج المغالطات المعرفية بخطوة واحدة.' : 'Discuss thoughts and reframe cognitive distortions.'}
                      </p>
                    </div>
                  ) : (
                    editingDiary.chatLogs.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl text-xs space-y-1 ${
                          msg.sender === 'user'
                            ? 'bg-[#2D6A4F]/10 dark:bg-[#74C69D]/20 text-[#12261D] dark:text-[#EBF5F2] ms-6'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#12261D] dark:text-[#EBF5F2] me-6 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* CBT Quick Prompts */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => onSendDiaryChatMessage('لخص لي الأفكار الرئيسية في هذه التدوينة')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-[#14302B] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 shrink-0 cursor-pointer"
                  >
                    📄 تلخيص التدوينة
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendDiaryChatMessage('استخرج لي الأخطاء المعرفية المحتملة في كتابتي')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-[#14302B] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 shrink-0 cursor-pointer"
                  >
                    💡 أخطاء معرفية
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendDiaryChatMessage('ما هي خطة العمل المقترحة لتهدئة التوتر اليوم؟')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-[#14302B] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 shrink-0 cursor-pointer"
                  >
                    🌿 تهدئة التوتر
                  </button>
                </div>

                {/* Auto-expanding Composer */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#0E2320] border border-[rgba(45,106,79,0.2)] dark:border-[#1E4D3B]/40 rounded-2xl p-1.5 shadow-3xs">
                  <textarea
                    ref={diaryChatTextareaRef}
                    rows={1}
                    value={diaryChatMessage}
                    onChange={(e) => setDiaryChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSendDiaryChatMessage();
                      }
                    }}
                    placeholder={isRtl ? 'اسأل المستشار عن مشاعرك...' : 'Ask CBT advisor...'}
                    className="flex-1 bg-transparent border-none text-xs focus:outline-none resize-none px-1.5"
                  />
                  <button
                    type="button"
                    disabled={diaryChatLoading || !diaryChatMessage.trim()}
                    onClick={() => onSendDiaryChatMessage()}
                    className="p-1.5 rounded-xl bg-[#2D6A4F] text-white hover:brightness-110 disabled:opacity-40 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calm Bottom Status Bar */}
      {isDesktopOrTablet && (
        <div className="px-5 py-2.5 bg-[var(--blomeo-surface-nested,#F3F8F5)] dark:bg-[#071614] border-t border-[rgba(45,106,79,0.12)] dark:border-[#1E4D3B]/30 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            {autoSavedTime ? (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
                <Check className="w-3.5 h-3.5" />
                <span>{isRtl ? 'محفوظ تلقائياً' : 'Auto-saved'} ({autoSavedTime})</span>
              </span>
            ) : (
              <span>{isRtl ? 'جاهز للكتابة' : 'Ready'}</span>
            )}
            <span>•</span>
            <span className="font-bold">{wordsCount} {isRtl ? 'كلمة' : 'words'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#14302B] hover:bg-gray-50 text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-200 shadow-3xs"
            >
              {t?.exportDiary || (isRtl ? 'استوديو التصدير' : 'Export Studio')}
            </button>
            <button
              type="button"
              onClick={() => setIsCbtPanelOpen(!isCbtPanelOpen)}
              className="px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#14302B] hover:bg-gray-50 text-xs font-bold cursor-pointer text-[#2D6A4F] dark:text-[#74C69D] shadow-3xs"
            >
              🧠 {isCbtPanelOpen ? (isRtl ? 'إخفاء المستشار' : 'Hide CBT') : (isRtl ? 'مستشار CBT' : 'CBT Advisor')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSavingDiary}
              className="px-4 py-1 rounded-xl bg-gradient-to-r from-[#1E4D3B] via-[#2D6A4F] to-[#15382B] text-white font-black text-xs hover:brightness-110 cursor-pointer shadow-3xs active:scale-95"
            >
              {isSavingDiary ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (t?.saveDiarySuccessBtn || (isRtl ? 'حفظ' : 'Save'))}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE CBT ADVISOR DRAWER (< 768px) */}
      {!isDesktopOrTablet && isCbtPanelOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end animate-in fade-in duration-150">
          <div className="bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] w-full max-h-[85vh] rounded-t-3xl p-4 border-t border-[rgba(45,106,79,0.2)] dark:border-[#1E4D3B]/40 shadow-2xl flex flex-col space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <span className="font-extrabold text-xs text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2] flex items-center gap-1.5">
                <span>🧠</span>
                <span>{isRtl ? 'المستشار النفسي CBT' : 'CBT Entry Advisor'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCbtPanelOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AIMediaAccessSelector
              permission={diaryChatMediaPermission}
              onChange={setDiaryChatMediaPermission}
              availableAttachments={extractAvailableAttachments([editingDiary])}
              appLanguage={appLanguage}
              compact={true}
            />
            <div className="flex-1 min-h-[200px] max-h-[280px] overflow-y-auto space-y-2 p-2.5 bg-gray-50 dark:bg-[#071614] rounded-2xl border border-[rgba(45,106,79,0.12)] text-xs">
              {(editingDiary.chatLogs || []).length === 0 ? (
                <div className="text-center py-6 text-gray-400 space-y-1">
                  <span className="text-xl block">💬</span>
                  <p className="text-xs font-bold text-gray-500">{isRtl ? 'مساحة الحوار النفسي والفكري' : 'Psychological Safe Space'}</p>
                </div>
              ) : (
                editingDiary.chatLogs.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl text-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#2D6A4F]/10 dark:bg-[#74C69D]/20 text-[#12261D] dark:text-[#EBF5F2] ms-4'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-[#12261D] dark:text-[#EBF5F2] me-4 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => onSendDiaryChatMessage('لخص لي الأفكار الرئيسية في هذه التدوينة')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-[#14302B] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 shrink-0 cursor-pointer"
              >
                📄 تلخيص
              </button>
              <button
                type="button"
                onClick={() => onSendDiaryChatMessage('استخرج لي الأخطاء المعرفية المحتملة في كتابتي')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-[#14302B] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 shrink-0 cursor-pointer"
              >
                💡 أخطاء معرفية
              </button>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#0E2320] border border-[rgba(45,106,79,0.2)] dark:border-[#1E4D3B]/40 rounded-2xl p-1.5 shadow-3xs">
              <textarea
                rows={1}
                value={diaryChatMessage}
                onChange={(e) => setDiaryChatMessage(e.target.value)}
                placeholder={isRtl ? 'اسأل المستشار...' : 'Ask CBT advisor...'}
                className="flex-1 bg-transparent border-none text-xs focus:outline-none resize-none px-1.5"
              />
              <button
                type="button"
                disabled={diaryChatLoading || !diaryChatMessage.trim()}
                onClick={() => onSendDiaryChatMessage()}
                className="p-1.5 rounded-xl bg-[#2D6A4F] text-white hover:brightness-110 disabled:opacity-40 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MOBILE: Samsung Notes Distraction-Free Sticky 1-Row Thumb Bar (< 768px) */}
      {!isDesktopOrTablet && (
        <div className="sticky bottom-0 z-30 bg-white/95 dark:bg-[#0E2320]/95 backdrop-blur-md border-t border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 px-3 py-2 flex items-center justify-around gap-1.5 shadow-lg">
          {/* Format Drawer Aa */}
          <button
            type="button"
            onClick={() => setShowFormatDrawer(!showFormatDrawer)}
            className={`p-2 rounded-xl text-xs font-serif font-black border transition-all cursor-pointer ${
              showFormatDrawer
                ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                : 'bg-gray-50 dark:bg-[#14302B] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
            }`}
            title="Aa Font & Format"
          >
            Aa
          </button>

          {/* Checklist Task button */}
          <button
            type="button"
            onClick={handleAddTask}
            className="p-2 rounded-xl bg-gray-50 dark:bg-[#14302B] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-bold cursor-pointer"
            title="Checklist"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* Unified Paperclip (📎) */}
          <button
            type="button"
            onClick={() => setShowPaperclipMenu(!showPaperclipMenu)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              showPaperclipMenu
                ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                : 'bg-gray-50 dark:bg-[#14302B] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
            }`}
            title="Attachments Menu"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Quick Voice Mic */}
          <button
            type="button"
            onClick={onOpenVoiceVent}
            className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-bold cursor-pointer"
            title="Voice Vent"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Undo / Redo */}
          <button type="button" onClick={onUndo} className="p-2 rounded-xl bg-gray-50 dark:bg-[#14302B] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-bold cursor-pointer">↶</button>
          <button type="button" onClick={onRedo} className="p-2 rounded-xl bg-gray-50 dark:bg-[#14302B] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs font-bold cursor-pointer">↷</button>
        </div>
      )}

      {/* 4. EXPANDABLE FORMAT DRAWER (Aa) */}
      {showFormatDrawer && (
        <div className="p-3 bg-white dark:bg-[#0E2320] border-t border-[rgba(45,106,79,0.14)] dark:border-[#1E4D3B]/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none z-30 animate-in slide-in-from-bottom-2 duration-150">
          <button type="button" onClick={() => onInsertFormatting('**', '**')} className="px-2.5 py-1 rounded-lg border text-xs font-black">B</button>
          <button type="button" onClick={() => onInsertFormatting('*', '*')} className="px-2.5 py-1 rounded-lg border text-xs italic font-bold">I</button>
          <button type="button" onClick={() => onInsertFormatting('<u>', '</u>')} className="px-2.5 py-1 rounded-lg border text-xs underline font-bold">U</button>
          <button type="button" onClick={() => onInsertFormatting('~~', '~~')} className="px-2.5 py-1 rounded-lg border text-xs line-through font-bold">S</button>
          <button type="button" onClick={() => onInsertFormatting('\n# ')} className="px-2 py-1 rounded-lg border text-xs font-bold">H1</button>
          <button type="button" onClick={() => onInsertFormatting('\n## ')} className="px-2 py-1 rounded-lg border text-xs font-bold">H2</button>
          <button type="button" onClick={() => onApplyRichFormat('hiliteColor', '#FEF08A')} className="p-1 rounded-lg border text-amber-500"><Highlighter className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} className="px-2 py-1 rounded-lg border text-xs font-bold">🎨 Color</button>
          <button type="button" onClick={() => setFontDrawerSize(Math.max(12, fontDrawerSize - 2))} className="px-2 py-1 rounded-lg border text-xs font-bold">A-</button>
          <button type="button" onClick={() => setFontDrawerSize(Math.min(28, fontDrawerSize + 2))} className="px-2 py-1 rounded-lg border text-xs font-bold">A+</button>
        </div>
      )}

      {/* 5. UNIFIED PAPERCLIP (📎) POPUP MENU */}
      {showPaperclipMenu && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-[var(--blomeo-surface,#FFFFFF)] dark:bg-[#0E2320] w-full max-w-sm rounded-3xl p-5 border border-[rgba(45,106,79,0.2)] dark:border-[#1E4D3B]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2.5">
              <h4 className="font-extrabold text-sm flex items-center gap-1.5 text-[var(--blomeo-text,#12261D)] dark:text-[#EBF5F2]">
                <Paperclip className="w-4 h-4 text-[#2D6A4F]" />
                <span>{isRtl ? 'إرفاق وسائط وملفات' : 'Attach Media & Tools'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPaperclipMenu(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {/* 1. Quick Voice Vent */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onOpenVoiceVent(); }}
                className="p-2.5 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>🎙️</span>
                <span>{isRtl ? 'فضفضة صوتية' : 'Voice Vent'}</span>
              </button>

              {/* 2. Upload Audio File (SER Route) */}
              <label className="p-2.5 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 flex items-center gap-2 cursor-pointer hover:brightness-105">
                <span>🎧</span>
                <span>{isRtl ? 'إضافة ملف صوتي' : 'Audio + SER'}</span>
                <input type="file" accept="audio/*" onChange={handlePaperclipPickAudioFile} className="hidden" />
              </label>

              {/* 3. AI Voice Journal */}
              <button
                type="button"
                onClick={() => {
                  setShowPaperclipMenu(false);
                  if (onOpenAIVoiceJournal) onOpenAIVoiceJournal();
                  else onOpenVoiceVent();
                }}
                className="p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>🤖</span>
                <span>{isRtl ? 'يومية صوتية بالذكاء' : 'AI Voice Journal'}</span>
              </button>

              {/* 4. Photo / Camera */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onTriggerPhotoUpload(); }}
                className="p-2.5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>🖼️</span>
                <span>{isRtl ? 'إضافة صور' : 'Photos'}</span>
              </button>

              {/* 5. Video */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onTriggerVideoUpload(); }}
                className="p-2.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>🎬</span>
                <span>{isRtl ? 'إضافة فيديو' : 'Video'}</span>
              </button>

              {/* 6. PDF Upload */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onTriggerPdfUpload(); }}
                className="p-2.5 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>📄</span>
                <span>{isRtl ? 'إضافة ملف PDF' : 'PDF Document'}</span>
              </button>

              {/* 7. Generic Files Upload */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onTriggerGenericFileUpload(); }}
                className="p-2.5 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>📁</span>
                <span>{isRtl ? 'إضافة ملفات' : 'Files'}</span>
              </button>

              {/* 8. Drawing Canvas */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onOpenDrawingCanvas(); }}
                className="p-2.5 rounded-2xl border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>🎨</span>
                <span>{isRtl ? 'رسم تخطيطي ذهني' : 'Mind Drawing'}</span>
              </button>

              {/* 9. Gratitude Wall Import */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onOpenGratitudeImport(); }}
                className="p-2.5 rounded-2xl border border-pink-200 dark:border-pink-900 bg-pink-50 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>🙏</span>
                <span>{isRtl ? 'استيراد الامتنان' : 'Gratitude'}</span>
              </button>

              {/* 10. WriteDiary Import */}
              <button
                type="button"
                onClick={() => { setShowPaperclipMenu(false); onOpenWriteDiaryImport(); }}
                className="p-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 flex items-center gap-2 cursor-pointer hover:brightness-105"
              >
                <span>📥</span>
                <span>{isRtl ? 'استيراد تدوينة / نص' : 'Import Diary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlomeoNoteEditor;
