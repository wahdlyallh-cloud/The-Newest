import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  ArrowLeft,
  Bold,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Redo2,
  Save,
  Send,
  Sparkles,
  Star,
  Trash2,
  Underline,
  Undo2,
  X
} from 'lucide-react';
import { DiaryEntry, AppLanguage, JournalEntryType, TaskItem } from '../types';
import { ALL_JOURNAL_TYPES, extractEntryPreMoods, getJournalTypeLabel } from '../lib/journalTypes';
import { extractAvailableAttachments } from '../lib/aiMediaAccess';
import AIMediaAccessSelector from './AIMediaAccessSelector';
import BlomeoPaperclipMenu from './BlomeoPaperclipMenu';

/** Exact published editor contract — App.tsx relies on every field. */
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
  // CBT Advisor panel props
  diaryChatMediaPermission: import('../lib/aiMediaAccess').AIMediaAccessPermission;
  setDiaryChatMediaPermission: (p: import('../lib/aiMediaAccess').AIMediaAccessPermission) => void;
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

const PRE_MOODS = ['سعيد', 'متحمس', 'مرتاح', 'طبيعي', 'حزين', 'قلق', 'غاضب', 'مرهق', 'ممتن', 'متوتر'];
const TEXT_COLORS = [
  { label: 'أخضر غابي', value: '#1E4635' },
  { label: 'كهرماني', value: '#B45309' },
  { label: 'أزرق', value: '#1D4ED8' },
  { label: 'ذهبي', value: '#8A6D1F' }
];
const HIGHLIGHT_COLORS = [
  { label: 'تظليل أصفر', value: '#FEF08A' },
  { label: 'تظليل أخضر', value: '#BCE7C7' },
  { label: 'تظليل وردي', value: '#F9C8D3' },
  { label: 'بدون تظليل', value: 'transparent' }
];

const iconButton =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--blomeo-text-secondary)] transition hover:bg-[var(--blomeo-card-nested)] hover:text-[var(--blomeo-accent)]';

interface ColorPopoverProps {
  isRtl: boolean;
  onPickText: (color: string) => void;
  onPickHighlight: (color: string) => void;
  onClose: () => void;
  floating?: boolean;
}

/** Compact floating swatch popover — never stretched pill buttons in the toolbar. */
function ColorPopover({ isRtl, onPickText, onPickHighlight, onClose, floating = true }: ColorPopoverProps) {
  return (
    <div
      className={`${
        floating
          ? 'absolute start-0 top-full z-30 mt-2 w-60 rounded-2xl border border-black/10 blomeo-surface p-3 shadow-2xl dark:border-white/10'
          : 'w-full rounded-2xl border border-black/10 blomeo-surface p-3 shadow-xl dark:border-white/10'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
      role="dialog"
      aria-label={isRtl ? 'الألوان والتظليل' : 'Colors & highlight'}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-black text-[var(--blomeo-text)]">
          {isRtl ? 'لون النص والتظليل' : 'Text color & highlight'}
        </span>
        <button type="button" data-compact-control="true" onClick={onClose} className="rounded-full p-1 text-[var(--blomeo-text-muted)]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mb-1.5 text-[9px] font-bold text-[var(--blomeo-text-muted)]">{isRtl ? 'لون النص' : 'Text color'}</p>
      <div className="flex flex-wrap gap-2">
        {TEXT_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            data-color-swatch="true"
            onClick={() => onPickText(color.value)}
            title={color.label}
            aria-label={color.label}
            className="h-5 w-5 rounded-full border border-black/10 shadow-sm transition hover:scale-110 dark:border-white/20"
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>
      <p className="mb-1.5 mt-3 text-[9px] font-bold text-[var(--blomeo-text-muted)]">{isRtl ? 'تظليل ناعم' : 'Soft highlight'}</p>
      <div className="flex flex-wrap gap-2">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.label}
            type="button"
            data-color-swatch="true"
            onClick={() => onPickHighlight(color.value)}
            title={color.label}
            aria-label={color.label}
            className="h-5 w-5 rounded-full border border-black/10 shadow-sm transition hover:scale-110 dark:border-white/20"
            style={{ backgroundColor: color.value === 'transparent' ? 'var(--blomeo-surface)' : color.value }}
          />
        ))}
      </div>
    </div>
  );
}

interface CbtPanelProps {
  editorProps: BlomeoNoteEditorProps;
  editingDiary: DiaryEntry;
  embedded?: boolean;
}

/** CBT / AI advisor rail used on desktop and as a bottom sheet on mobile. */
function CbtPanel({ editorProps, editingDiary, embedded = false }: CbtPanelProps) {
  const { isRtl, t } = editorProps;
  const messages = editingDiary.chatLogs || [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="shrink-0">
        <h2 className="flex items-center gap-1.5 text-xs font-black text-[var(--blomeo-text)]">
          <Sparkles className="h-4 w-4 text-[var(--blomeo-gold)]" />
          {isRtl ? 'المستشار المعرفي' : 'CBT advisor'}
        </h2>
        <p className="mt-1 text-[10px] leading-4 text-[var(--blomeo-text-muted)]">
          {isRtl ? 'تأمل تدوينتك بلطف، خطوة واحدة في كل مرة.' : 'Reflect on your entry gently, one step at a time.'}
        </p>
      </div>

      <AIMediaAccessSelector
        permission={editorProps.diaryChatMediaPermission}
        onChange={editorProps.setDiaryChatMediaPermission}
        availableAttachments={extractAvailableAttachments([editingDiary])}
        appLanguage={editorProps.appLanguage}
        compact
      />

      <div className="min-h-24 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-black/10 blomeo-surface-nested p-2.5 scrollbar-none dark:border-white/10">
        {messages.length === 0 ? (
          <p className="text-[10px] leading-5 text-[var(--blomeo-text-muted)]">
            {isRtl ? 'اسأل المستشار عن مزاجك، أفكارك، أو أنماط كتابتك.' : 'Ask the advisor about your mood, thoughts, or writing patterns.'}
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.createdAt}-${index}`}
              className={`max-w-[92%] rounded-2xl px-2.5 py-2 text-[10px] leading-5 ${
                message.sender === 'user'
                  ? 'ms-auto bg-[var(--blomeo-accent)]/12 text-[var(--blomeo-text)]'
                  : 'me-auto border border-black/5 blomeo-surface text-[var(--blomeo-text-secondary)] dark:border-white/10'
              }`}
            >
              {message.text}
            </div>
          ))
        )}
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {[
          isRtl ? 'لخص تدوينتي' : 'Summarize',
          isRtl ? 'استخرج الأخطاء المعرفية' : 'Find distortions',
          isRtl ? 'اقترح خطوة هادئة' : 'Suggest a calm step'
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => editorProps.onSendDiaryChatMessage(prompt)}
            className="shrink-0 whitespace-nowrap rounded-full border border-black/10 blomeo-surface px-2.5 py-1 text-[9px] font-bold text-[var(--blomeo-text-secondary)] transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-end gap-1.5 rounded-2xl border border-black/10 blomeo-surface p-1.5 dark:border-white/10">
        <textarea
          ref={editorProps.diaryChatTextareaRef}
          value={editorProps.diaryChatMessage}
          onChange={(event) => editorProps.setDiaryChatMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              editorProps.onSendDiaryChatMessage(editorProps.diaryChatMessage);
            }
          }}
          rows={2}
          placeholder={isRtl ? 'اكتب سؤالاً عن تدوينتك…' : 'Ask about your entry…'}
          className="min-h-10 max-h-28 flex-1 resize-none bg-transparent p-1.5 text-[11px] text-[var(--blomeo-text)] outline-none placeholder:text-[var(--blomeo-text-muted)]"
        />
        <button
          type="button"
          data-compact-control="true"
          disabled={editorProps.diaryChatLoading}
          onClick={() => editorProps.onSendDiaryChatMessage(editorProps.diaryChatMessage)}
          className="shrink-0 rounded-xl bg-[var(--blomeo-accent)] p-2 text-white transition hover:brightness-110 disabled:opacity-50"
          aria-label={isRtl ? 'إرسال' : 'Send'}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {!embedded && (
        <div className="flex shrink-0 items-center gap-2 border-t border-black/10 pt-2 dark:border-white/10">
          <button
            type="button"
            onClick={editorProps.onExportDiaryChatPdf}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-[var(--blomeo-text-secondary)] hover:text-[var(--blomeo-accent)]"
          >
            <Download className="h-3 w-3" /> {isRtl ? 'تصدير' : 'Export'}
          </button>
          <button
            type="button"
            onClick={() => editorProps.setIsChatSelectMode(!editorProps.isChatSelectMode)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-[var(--blomeo-text-secondary)] hover:text-[var(--blomeo-accent)]"
          >
            <CheckSquare className="h-3 w-3" /> {isRtl ? 'تحديد' : 'Select'}
          </button>
          {editorProps.isChatSelectMode && editorProps.selectedChatIndices.length > 0 && (
            <button
              type="button"
              onClick={editorProps.onDeleteSelectedChatMessages}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-rose-500"
            >
              <Trash2 className="h-3 w-3" /> {editorProps.selectedChatIndices.length}
            </button>
          )}
          <button
            type="button"
            onClick={editorProps.onDeleteAllChatMessages}
            className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold text-rose-500"
          >
            <Trash2 className="h-3 w-3" /> {isRtl ? 'مسح الكل' : 'Clear'}
          </button>
        </div>
      )}
      {t?.aiAdvisorTitle ? null : null}
    </div>
  );
}

export const BlomeoNoteEditor: React.FC<BlomeoNoteEditorProps> = (props) => {
  // Every hook is unconditional and above any early return.
  const {
    editingDiary,
    setEditingDiary,
    isNewEntry,
    isSavingDiary,
    autoSavedTime,
    isRtl,
    onSave,
    onCancel,
    editorRef
  } = props;

  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [vaultOpen, setVaultOpen] = useState(true);
  const [cbtOpen, setCbtOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPaperclip, setShowPaperclip] = useState(false);
  const [showFormatDrawer, setShowFormatDrawer] = useState(false);
  const [showCbtSheet, setShowCbtSheet] = useState(false);
  const [selectionPill, setSelectionPill] = useState<{ x: number; y: number } | null>(null);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const vault = props.allDiariesVault || [];

  const currentPreMoods = useMemo(
    () => extractEntryPreMoods(editingDiary),
    [editingDiary]
  );

  const wordsCount = useMemo(
    () =>
      (editingDiary.content || '')
        .replace(/<[^>]+>/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    [editingDiary.content]
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (editingDiary.content || '')) {
      editorRef.current.innerHTML = editingDiary.content || '';
    }
    // Re-sync only when switching entries; live typing is owned by onInput.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDiary.id, editorRef]);

  const updateEntry = (patch: Partial<DiaryEntry>) => {
    setEditingDiary((previous) => (previous ? { ...previous, ...patch } : previous));
  };

  const togglePreMood = (mood: string) => {
    const next = currentPreMoods.includes(mood)
      ? currentPreMoods.filter((item) => item !== mood)
      : [...currentPreMoods, mood];
    updateEntry({ preMoods: next, moods: next, mood: next[0] || 'طبيعي' });
  };

  const addTask = () => {
    const task: TaskItem = { id: `task-${Date.now()}`, text: '', completed: false };
    updateEntry({ tasks: [...(editingDiary.tasks || []), task] });
  };

  const handleEditorInput = (event: React.FormEvent<HTMLDivElement>) => {
    props.onSaveSelection();
    const html = event.currentTarget.innerHTML;
    props.onRecordUndo(html);
    updateEntry({ content: html });

    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const text = node?.textContent || '';
    if (!selection || !node) return;
    if (text.startsWith('# ')) {
      node.textContent = text.slice(2);
      props.onApplyRichFormat('formatBlock', '<h1>');
    } else if (text.startsWith('## ')) {
      node.textContent = text.slice(3);
      props.onApplyRichFormat('formatBlock', '<h2>');
    } else if (text.startsWith('> ')) {
      node.textContent = text.slice(2);
      props.onApplyRichFormat('formatBlock', '<blockquote>');
    } else if (text.startsWith('- ')) {
      node.textContent = text.slice(2);
      props.onApplyRichFormat('insertUnorderedList');
    }
  };

  const handleSelectionChange = () => {
    props.onSaveSelection();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim() && editorRef.current) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setSelectionPill({
        x: Math.max(12, rect.left + rect.width / 2 - 90),
        y: Math.max(12, rect.top - 46)
      });
    } else {
      setSelectionPill(null);
    }
  };

  const runFormat = (command: string, value?: string | null) => {
    props.onSaveSelection();
    props.onApplyRichFormat(command, value);
    editorRef.current?.focus();
    setSelectionPill(null);
  };

  const colorPopover = (floating: boolean) => (
    <ColorPopover
      isRtl={isRtl}
      floating={floating}
      onClose={() => setShowColorPicker(false)}
      onPickText={(color) => runFormat('foreColor', color)}
      onPickHighlight={(color) => runFormat('hiliteColor', color)}
    />
  );

  return (
    <div
      className="relative flex min-h-[calc(100dvh-6rem)] w-full flex-col overflow-hidden rounded-[24px] border border-black/10 blomeo-surface text-[var(--blomeo-text)] shadow-sm dark:border-white/10"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header — exactly ONE Save button in the whole editor ---------- */}
      <header className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/10 blomeo-surface-nested px-3 py-2 sm:px-5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--blomeo-text-secondary)] transition hover:bg-[var(--blomeo-card)]"
            aria-label={isRtl ? 'رجوع' : 'Back'}
            title={isRtl ? 'رجوع' : 'Back'}
          >
            <ArrowLeft className={`h-5 w-5 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-[var(--blomeo-text)]">
              {editingDiary.title || (isNewEntry ? (isRtl ? 'تدوينة جديدة' : 'New entry') : isRtl ? 'تعديل التدوينة' : 'Edit entry')}
            </p>
            <p className="truncate text-[9px] font-semibold text-[var(--blomeo-text-muted)]">
              {isSavingDiary
                ? isRtl ? 'جارٍ الحفظ…' : 'Saving…'
                : autoSavedTime
                  ? `${isRtl ? 'محفوظ تلقائياً' : 'Auto-saved'} (${autoSavedTime})`
                  : isRtl ? 'جاهز للكتابة' : 'Ready to write'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isDesktop && (
            <button
              type="button"
              data-compact-control="true"
              onClick={() => setFocusMode((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-black transition ${
                focusMode
                  ? 'border-[var(--blomeo-accent)] bg-[var(--blomeo-accent)] text-white'
                  : 'border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] dark:border-white/10'
              }`}
              title={isRtl ? 'وضع التركيز' : 'Focus / Zen mode'}
            >
              {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              <span className="hidden lg:inline">{isRtl ? 'التركيز' : 'Focus'}</span>
            </button>
          )}
          <button
            type="button"
            data-compact-control="true"
            onClick={props.onOpenExportModal}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] transition hover:border-[var(--blomeo-accent)] dark:border-white/10"
            title={isRtl ? 'تصدير' : 'Export'}
            aria-label={isRtl ? 'تصدير' : 'Export'}
          >
            <Download className="h-4 w-4" />
          </button>
          {!isNewEntry && (
            <button
              type="button"
              data-compact-control="true"
              onClick={() => props.onToggleArchive(editingDiary.id)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--blomeo-gold)]/25 bg-[var(--blomeo-gold)]/10 text-[var(--blomeo-gold)] transition hover:bg-[var(--blomeo-gold)]/20"
              title={editingDiary.isArchived ? (isRtl ? 'إلغاء الأرشفة' : 'Unarchive') : isRtl ? 'أرشفة' : 'Archive'}
              aria-label={isRtl ? 'أرشفة' : 'Archive'}
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={isSavingDiary}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--blomeo-accent)] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {isSavingDiary ? <Sparkles className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{isSavingDiary ? (isRtl ? 'جارٍ الحفظ...' : 'Saving...') : tSaveLabel(props)}</span>
          </button>
        </div>
      </header>

      {/* Body: Obsidian three-pane on desktop, Samsung Notes single pane on mobile */}
      <div className="flex min-h-0 flex-1">
        {/* Left vault */}
        {isDesktop && !focusMode && (
          <aside
            className={`${vaultOpen ? 'w-64 xl:w-72' : 'w-12'} flex shrink-0 flex-col border-e border-black/10 blomeo-surface-nested transition-all duration-300 dark:border-white/10`}
            aria-label={isRtl ? 'خزينة التدوينات' : 'Vault explorer'}
          >
            <div className="flex items-center justify-between border-b border-black/10 p-2 dark:border-white/10">
              {vaultOpen ? (
                <>
                  <span className="truncate text-[10px] font-black text-[var(--blomeo-text)]">
                    🗂️ {isRtl ? 'خزينة التدوينات' : 'Vault explorer'}
                  </span>
                  <button
                    type="button"
                    data-compact-control="true"
                    onClick={() => setVaultOpen(false)}
                    className="rounded-lg p-1 text-[var(--blomeo-text-muted)] hover:bg-[var(--blomeo-card)]"
                    aria-label={isRtl ? 'إغلاق الخزينة' : 'Close vault'}
                  >
                    {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-compact-control="true"
                  onClick={() => setVaultOpen(true)}
                  className="w-full py-1 text-center text-[var(--blomeo-text-muted)]"
                  aria-label={isRtl ? 'فتح الخزينة' : 'Open vault'}
                >
                  {isRtl ? <ChevronLeft className="mx-auto h-4 w-4" /> : <ChevronRight className="mx-auto h-4 w-4" />}
                </button>
              )}
            </div>
            {vaultOpen && (
              <div className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-none">
                {vault.slice(0, 30).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => props.onSelectVaultEntry?.(item)}
                    className={`flex w-full items-center gap-1.5 rounded-xl p-2 text-start text-[11px] transition ${
                      item.id === editingDiary.id
                        ? 'bg-[var(--blomeo-accent)]/12 font-black text-[var(--blomeo-accent)]'
                        : 'font-semibold text-[var(--blomeo-text-secondary)] hover:bg-[var(--blomeo-card)]'
                    }`}
                  >
                    <span className="shrink-0">{getJournalTypeLabel(item.diaryType, props.t).split(' ')[0]}</span>
                    <span className="truncate">{item.title || (isRtl ? 'بدون عنوان' : 'Untitled')}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* Center writing canvas */}
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-none sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4 pb-16">
            {/* Title + importance */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={editingDiary.title}
                onChange={(event) => updateEntry({ title: event.target.value })}
                placeholder={props.t?.journalTitlePlaceholder || (isRtl ? 'عنوان التدوينة أو الفكرة...' : 'Note title or thought...')}
                className="min-w-0 flex-1 border-b-2 border-[var(--blomeo-accent)]/20 bg-transparent px-1 py-1.5 text-base font-black text-[var(--blomeo-text)] outline-none transition focus:border-[var(--blomeo-accent)] sm:text-lg"
              />
              <div className="flex shrink-0 items-center gap-0.5" aria-label={isRtl ? 'أهمية التدوينة' : 'Importance'}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    data-compact-control="true"
                    onClick={() => updateEntry({ importance: star })}
                    className="p-0.5"
                    aria-label={`${star} ${isRtl ? 'نجوم' : 'stars'}`}
                  >
                    <Star
                      className={`h-5 w-5 transition ${
                        star <= (editingDiary.importance || 0)
                          ? 'fill-[var(--blomeo-gold)] text-[var(--blomeo-gold)]'
                          : 'text-[var(--blomeo-text-muted)]/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Journal type chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {ALL_JOURNAL_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateEntry({ diaryType: type as JournalEntryType })}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black transition ${
                    (editingDiary.diaryType || 'diary') === type
                      ? 'border-[var(--blomeo-accent)] bg-[var(--blomeo-accent)] text-white'
                      : 'border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] dark:border-white/10'
                  }`}
                >
                  {getJournalTypeLabel(type, props.t)}
                </button>
              ))}
            </div>

            {/* Multi-select pre-writing moods */}
            <div className="space-y-2 rounded-2xl border border-black/10 blomeo-surface-nested p-3 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[10px] font-black text-[var(--blomeo-accent)]">
                  ✨ {isRtl ? 'مزاج البداية (متعدد الخيارات)' : 'Pre-writing moods (multi-select)'}
                </span>
                <span className="shrink-0 text-[9px] text-[var(--blomeo-text-muted)]">
                  {currentPreMoods.length} {isRtl ? 'مختارة' : 'selected'}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {PRE_MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => togglePreMood(mood)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black transition ${
                      currentPreMoods.includes(mood)
                        ? 'border-[var(--blomeo-accent)] bg-[var(--blomeo-accent)] text-white'
                        : 'border-black/10 blomeo-surface text-[var(--blomeo-text-secondary)] dark:border-white/10'
                    }`}
                  >
                    {currentPreMoods.includes(mood) ? `✓ ${mood}` : mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop formatting toolbar */}
            {isDesktop && (
              <div className="sticky top-0 z-10">
                <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-black/10 blomeo-surface p-2 shadow-sm backdrop-blur dark:border-white/10 scrollbar-none">
                <button type="button" onClick={props.onUndo} className={iconButton} title={isRtl ? 'تراجع' : 'Undo'} aria-label={isRtl ? 'تراجع' : 'Undo'}>
                  <Undo2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={props.onRedo} className={iconButton} title={isRtl ? 'إعادة' : 'Redo'} aria-label={isRtl ? 'إعادة' : 'Redo'}>
                  <Redo2 className="h-4 w-4" />
                </button>
                <span className="mx-0.5 h-4 w-px shrink-0 bg-black/10 dark:bg-white/10" />
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value) runFormat('formatBlock', `<${value}>`);
                    event.target.value = '';
                  }}
                  className="shrink-0 rounded-lg border border-black/10 bg-transparent px-1.5 py-1 text-[10px] font-bold text-[var(--blomeo-text-secondary)] dark:border-white/10"
                  aria-label={isRtl ? 'نمط الفقرة' : 'Block style'}
                >
                  <option value="" disabled>{isRtl ? 'النمط' : 'Style'}</option>
                  <option value="p">{isRtl ? 'فقرة' : 'Paragraph'}</option>
                  <option value="h1">H1</option>
                  <option value="h2">H2</option>
                  <option value="h3">H3</option>
                  <option value="blockquote">{isRtl ? 'اقتباس' : 'Quote'}</option>
                </select>
                <select
                  value={props.fontDrawerSize}
                  onChange={(event) => props.setFontDrawerSize(Number(event.target.value))}
                  className="shrink-0 rounded-lg border border-black/10 bg-transparent px-1.5 py-1 text-[10px] font-bold text-[var(--blomeo-text-secondary)] dark:border-white/10"
                  aria-label={isRtl ? 'حجم الخط' : 'Font size'}
                >
                  {[14, 16, 18, 20, 22].map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
                <span className="mx-0.5 h-4 w-px shrink-0 bg-black/10 dark:bg-white/10" />
                <button type="button" onClick={() => props.onInsertFormatting('**', '**')} className={iconButton} title="Bold" aria-label="Bold"><Bold className="h-4 w-4" /></button>
                <button type="button" onClick={() => props.onInsertFormatting('*', '*')} className={iconButton} title="Italic" aria-label="Italic"><Italic className="h-4 w-4" /></button>
                <button type="button" onClick={() => props.onInsertFormatting('<u>', '</u>')} className={iconButton} title="Underline" aria-label="Underline"><Underline className="h-4 w-4" /></button>
                <button type="button" onClick={() => runFormat('justifyRight')} className={iconButton} title="Align right" aria-label="Align right"><AlignRight className="h-4 w-4" /></button>
                <button type="button" onClick={() => runFormat('justifyCenter')} className={iconButton} title="Align center" aria-label="Align center"><AlignCenter className="h-4 w-4" /></button>
                <button type="button" onClick={() => runFormat('justifyLeft')} className={iconButton} title="Align left" aria-label="Align left"><AlignLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => runFormat('insertUnorderedList')} className={iconButton} title="Bullet list" aria-label="Bullet list"><List className="h-4 w-4" /></button>
                <button type="button" onClick={() => runFormat('insertOrderedList')} className={iconButton} title="Numbered list" aria-label="Numbered list"><ListOrdered className="h-4 w-4" /></button>
                <button type="button" onClick={addTask} className={iconButton} title={isRtl ? 'قائمة مهام' : 'Checklist'} aria-label={isRtl ? 'قائمة مهام' : 'Checklist'}><CheckSquare className="h-4 w-4" /></button>
                <button
                  type="button"
                  onClick={() => runFormat('createLink', window.prompt(isRtl ? 'أدخل الرابط' : 'Enter URL') || '')}
                  className={iconButton}
                  title={isRtl ? 'رابط' : 'Link'}
                  aria-label={isRtl ? 'رابط' : 'Link'}
                >
                  <LinkIcon className="h-4 w-4" />
                </button>
                <span className="mx-0.5 h-4 w-px shrink-0 bg-black/10 dark:bg-white/10" />
                <button
                  type="button"
                  data-compact-control="true"
                  onClick={() => setShowColorPicker((value) => !value)}
                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2 text-[10px] font-black transition ${
                    showColorPicker
                      ? 'border-[var(--blomeo-accent)] bg-[var(--blomeo-accent)]/10 text-[var(--blomeo-accent)]'
                      : 'border-black/10 text-[var(--blomeo-text-secondary)] dark:border-white/10'
                  }`}
                  title={isRtl ? 'الألوان والتظليل' : 'Colors & highlight'}
                >
                  <Highlighter className="h-3.5 w-3.5" />
                  <span>{isRtl ? 'ألوان' : 'Colors'}</span>
                </button>
                <button
                  type="button"
                  data-compact-control="true"
                  onClick={() => setShowPaperclip((value) => !value)}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                    showPaperclip
                      ? 'border-[var(--blomeo-accent)] bg-[var(--blomeo-accent)]/10 text-[var(--blomeo-accent)]'
                      : 'border-black/10 text-[var(--blomeo-text-secondary)] dark:border-white/10'
                  }`}
                  title={isRtl ? 'إضافة مرفق' : 'Add attachment'}
                  aria-label={isRtl ? 'إضافة مرفق' : 'Add attachment'}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                </div>
                {showColorPicker ? colorPopover(true) : null}
              </div>
            )}

            {/* Rich text canvas */}
            <div className="relative">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                data-placeholder={isRtl ? 'اكتب ما يدور بداخلك… استخدم # للعناوين و - للقوائم' : 'Write what is on your mind… use # for headings and - for lists'}
                className={`min-h-[320px] w-full select-text whitespace-pre-wrap px-1 py-3 text-[15px] leading-8 text-[var(--blomeo-text)] outline-none ${props.fontDrawerFamily}`}
                style={{ fontSize: `${props.fontDrawerSize}px` }}
                role="textbox"
                aria-multiline="true"
              />
              {selectionPill && (
                <div
                  className="fixed z-40 flex items-center gap-0.5 rounded-full border border-black/10 blomeo-surface p-1 shadow-xl dark:border-white/10"
                  style={{ left: selectionPill.x, top: selectionPill.y }}
                >
                  <button type="button" data-compact-control="true" onClick={() => runFormat('bold')} className={iconButton} aria-label="Bold"><Bold className="h-3.5 w-3.5" /></button>
                  <button type="button" data-compact-control="true" onClick={() => runFormat('italic')} className={iconButton} aria-label="Italic"><Italic className="h-3.5 w-3.5" /></button>
                  <button type="button" data-compact-control="true" onClick={() => runFormat('underline')} className={iconButton} aria-label="Underline"><Underline className="h-3.5 w-3.5" /></button>
                  <button type="button" data-compact-control="true" onClick={() => runFormat('hiliteColor', '#FEF08A')} className={iconButton} aria-label="Highlight"><Highlighter className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>

            {/* Tasks */}
            {(editingDiary.tasks || []).length > 0 && (
              <section className="space-y-2 rounded-2xl border border-black/10 blomeo-surface-nested p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-[var(--blomeo-text)]">{isRtl ? 'مهام اليوم' : 'Today’s tasks'}</h3>
                  <button type="button" onClick={addTask} className="inline-flex items-center gap-1 text-[10px] font-black text-[var(--blomeo-accent)]">
                    <Plus className="h-3 w-3" /> {isRtl ? 'مهمة' : 'Task'}
                  </button>
                </div>
                {(editingDiary.tasks || []).map((task) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() =>
                        updateEntry({
                          tasks: (editingDiary.tasks || []).map((item) =>
                            item.id === task.id ? { ...item, completed: !item.completed } : item
                          )
                        })
                      }
                      className="h-4 w-4 shrink-0 accent-[var(--blomeo-accent)]"
                      aria-label={task.text || (isRtl ? 'مهمة' : 'Task')}
                    />
                    <input
                      value={task.text}
                      onChange={(event) =>
                        updateEntry({
                          tasks: (editingDiary.tasks || []).map((item) =>
                            item.id === task.id ? { ...item, text: event.target.value } : item
                          )
                        })
                      }
                      className={`min-w-0 flex-1 bg-transparent text-[11px] text-[var(--blomeo-text)] outline-none ${task.completed ? 'line-through text-[var(--blomeo-text-muted)]' : ''}`}
                      placeholder={isRtl ? 'نص المهمة...' : 'Task text…'}
                    />
                  </div>
                ))}
              </section>
            )}

            {/* Media summary */}
            {((editingDiary.audioRecordings || []).length > 0 ||
              (editingDiary.images || []).length > 0 ||
              (editingDiary.files || []).length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {editingDiary.images?.map((src, index) => (
                  <img key={`${src}-${index}`} src={src} alt="" className="h-16 w-16 rounded-xl border border-black/10 object-cover dark:border-white/10" />
                ))}
                {(editingDiary.audioRecordings || []).map((audio) => (
                  <span key={audio.id} className="inline-flex max-w-40 items-center gap-1.5 rounded-full blomeo-surface-nested px-2.5 py-1 text-[10px] font-bold text-[var(--blomeo-text-secondary)]">
                    🎙️ <span className="truncate">{audio.name}</span>
                  </span>
                ))}
                {(editingDiary.files || []).map((file) => (
                  <span key={file.id} className="inline-flex max-w-40 items-center gap-1.5 rounded-full blomeo-surface-nested px-2.5 py-1 text-[10px] font-bold text-[var(--blomeo-text-secondary)]">
                    📎 <span className="truncate">{file.name}</span>
                  </span>
                ))}
              </div>
            )}

            <p className="text-[10px] text-[var(--blomeo-text-muted)]">
              {wordsCount} {isRtl ? 'كلمة' : 'words'} · {new Date(editingDiary.createdAt).toLocaleDateString(isRtl ? 'ar' : 'en')}
            </p>
          </div>
        </main>

        {/* Right CBT rail */}
        {isDesktop && !focusMode && (
          <aside
            className={`${
              cbtOpen ? 'w-72 xl:w-80' : 'w-12'
            } flex shrink-0 flex-col border-s border-black/10 blomeo-surface-nested transition-all duration-300 dark:border-white/10`}
            aria-label={isRtl ? 'المستشار المعرفي' : 'CBT advisor'}
          >
            <div className="flex items-center justify-between border-b border-black/10 p-2 dark:border-white/10">
              {cbtOpen ? (
                <>
                  <span className="text-[10px] font-black text-[var(--blomeo-text)]">✨ {isRtl ? 'المستشار' : 'Advisor'}</span>
                  <button
                    type="button"
                    data-compact-control="true"
                    onClick={() => setCbtOpen(false)}
                    className="rounded-lg p-1 text-[var(--blomeo-text-muted)] hover:bg-[var(--blomeo-card)]"
                    aria-label={isRtl ? 'إغلاق المستشار' : 'Close advisor'}
                  >
                    {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-compact-control="true"
                  onClick={() => setCbtOpen(true)}
                  className="w-full py-1 text-[var(--blomeo-text-muted)]"
                  aria-label={isRtl ? 'فتح المستشار' : 'Open advisor'}
                >
                  {isRtl ? <ChevronLeft className="mx-auto h-4 w-4" /> : <ChevronRight className="mx-auto h-4 w-4" />}
                </button>
              )}
            </div>
            {cbtOpen && (
              <div className="min-h-0 flex-1 overflow-hidden">
                <CbtPanel editorProps={props} editingDiary={editingDiary} />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Mobile action bar — no second Save button; the header owns it. */}
      {!isDesktop && (
        <div className="sticky bottom-0 z-20 flex shrink-0 items-center justify-around gap-1 border-t border-black/10 blomeo-surface px-2 py-2 backdrop-blur dark:border-white/10">
          <button type="button" onClick={() => setShowFormatDrawer((value) => !value)} className={iconButton} title={isRtl ? 'تنسيق' : 'Format'} aria-label={isRtl ? 'تنسيق' : 'Format'}><span className="text-xs font-black">Aa</span></button>
          <button type="button" onClick={() => setShowColorPicker((value) => !value)} className={iconButton} title={isRtl ? 'الألوان' : 'Colors'} aria-label={isRtl ? 'الألوان' : 'Colors'}><Highlighter className="h-4 w-4" /></button>
          <button type="button" onClick={() => setShowPaperclip((value) => !value)} className={iconButton} title={isRtl ? 'مرفقات' : 'Attachments'} aria-label={isRtl ? 'مرفقات' : 'Attachments'}><Paperclip className="h-4 w-4" /></button>
          <button type="button" onClick={props.onOpenVoiceVent} className={iconButton} title={isRtl ? 'فضفضة صوتية' : 'Voice vent'} aria-label={isRtl ? 'فضفضة صوتية' : 'Voice vent'}>🎙️</button>
          <button type="button" onClick={props.onUndo} className={iconButton} title={isRtl ? 'تراجع' : 'Undo'} aria-label={isRtl ? 'تراجع' : 'Undo'}><Undo2 className="h-4 w-4" /></button>
          <button type="button" onClick={props.onRedo} className={iconButton} title={isRtl ? 'إعادة' : 'Redo'} aria-label={isRtl ? 'إعادة' : 'Redo'}><Redo2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setShowCbtSheet(true)} className={iconButton} title={isRtl ? 'المستشار' : 'Advisor'} aria-label={isRtl ? 'المستشار' : 'Advisor'}><Sparkles className="h-4 w-4" /></button>
        </div>
      )}

      {/* Mobile format drawer */}
      {!isDesktop && showFormatDrawer && (
        <div className="sticky bottom-14 z-30 flex items-center gap-1 overflow-x-auto rounded-2xl border border-black/10 blomeo-surface p-2 shadow-xl dark:border-white/10 scrollbar-none">
          <button type="button" onClick={() => runFormat('bold')} className={iconButton} aria-label="Bold"><Bold className="h-4 w-4" /></button>
          <button type="button" onClick={() => runFormat('italic')} className={iconButton} aria-label="Italic"><Italic className="h-4 w-4" /></button>
          <button type="button" onClick={() => runFormat('underline')} className={iconButton} aria-label="Underline"><Underline className="h-4 w-4" /></button>
          <button type="button" onClick={() => runFormat('justifyRight')} className={iconButton} aria-label="Align right"><AlignRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => runFormat('justifyCenter')} className={iconButton} aria-label="Align center"><AlignCenter className="h-4 w-4" /></button>
          <button type="button" onClick={() => runFormat('justifyLeft')} className={iconButton} aria-label="Align left"><AlignLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => runFormat('insertUnorderedList')} className={iconButton} aria-label="Bullet list"><List className="h-4 w-4" /></button>
          <button type="button" onClick={addTask} className={iconButton} aria-label="Checklist"><CheckSquare className="h-4 w-4" /></button>
        </div>
      )}

      {/* Mobile color sheet */}
      {!isDesktop && showColorPicker && (
        <div className="fixed inset-x-3 bottom-20 z-40">
          {colorPopover(false)}
        </div>
      )}

      {/* Paperclip menu */}
      {showPaperclip && (
        <BlomeoPaperclipMenu
          editorProps={props}
          isRtl={isRtl}
          onClose={() => setShowPaperclip(false)}
        />
      )}

      {/* Mobile CBT bottom sheet */}
      {!isDesktop && showCbtSheet && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/30 backdrop-blur-sm" onClick={() => setShowCbtSheet(false)}>
          <div
            className="flex h-[82dvh] w-full flex-col rounded-t-[28px] border border-black/10 blomeo-surface shadow-2xl dark:border-white/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-2 dark:border-white/10">
              <span className="text-xs font-black text-[var(--blomeo-text)]">✨ {isRtl ? 'المستشار المعرفي' : 'CBT advisor'}</span>
              <button type="button" onClick={() => setShowCbtSheet(false)} className="rounded-full p-2 text-[var(--blomeo-text-muted)]" aria-label={isRtl ? 'إغلاق' : 'Close'}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <CbtPanel editorProps={props} editingDiary={editingDiary} embedded />
            </div>
          </div>
        </div>
      )}

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) props.onOpenVoiceVentWithFile?.(file);
          event.target.value = '';
        }}
      />
      {autoSavedTime ? <span className="sr-only">{isRtl ? 'محفوظ تلقائياً' : 'Auto saved'}</span> : null}
      {tSaveLabel(props) ? null : null}
    </div>
  );
};

function tSaveLabel(props: BlomeoNoteEditorProps): string {
  return props.t?.saveDiarySuccessBtn || (props.isRtl ? 'حفظ التدوينة' : 'Save entry');
}

export default BlomeoNoteEditor;
