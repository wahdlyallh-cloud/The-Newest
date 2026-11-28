import React, { useRef } from 'react';
import { FileText, Folder, Image as ImageIcon, Mic, Paperclip, PenTool, Sparkles, Video, X } from 'lucide-react';
import type { BlomeoNoteEditorProps } from './BlomeoNoteEditor';

interface BlomeoPaperclipMenuProps {
  editorProps: BlomeoNoteEditorProps;
  isRtl: boolean;
  onClose: () => void;
}

/** Clean attachment picker: bottom sheet on mobile, floating popover on desktop. */
export default function BlomeoPaperclipMenu({ editorProps, isRtl, onClose }: BlomeoPaperclipMenuProps) {
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const tools = [
    { icon: Mic, label: isRtl ? 'فضفضة صوتية مباشرة' : 'Live voice vent', action: editorProps.onOpenVoiceVent },
    { icon: Mic, label: isRtl ? 'ملف صوتي (تفريغ تلقائي)' : 'Audio file (auto-transcribe)', action: () => audioInputRef.current?.click() },
    { icon: Sparkles, label: isRtl ? 'يومية صوتية بالـ AI' : 'AI voice journal', action: editorProps.onOpenAIVoiceJournal },
    { icon: ImageIcon, label: isRtl ? 'إضافة صور' : 'Add photos', action: editorProps.onTriggerPhotoUpload },
    { icon: Video, label: isRtl ? 'إضافة فيديو' : 'Add video', action: editorProps.onTriggerVideoUpload },
    { icon: FileText, label: isRtl ? 'إضافة ملف PDF' : 'Add PDF', action: editorProps.onTriggerPdfUpload },
    { icon: Folder, label: isRtl ? 'إضافة ملفات' : 'Add files', action: editorProps.onTriggerGenericFileUpload },
    { icon: PenTool, label: isRtl ? 'رسم تخطيطي' : 'Sketch', action: () => editorProps.onOpenDrawingCanvas(null) },
    { icon: Paperclip, label: isRtl ? 'استيراد امتنان' : 'Import gratitude', action: editorProps.onOpenGratitudeImport },
    { icon: FileText, label: isRtl ? 'استيراد نص / تدوينة' : 'Import text / diary', action: editorProps.onOpenWriteDiaryImport }
  ].filter((tool) => typeof tool.action === 'function');

  const run = (action?: () => void) => {
    action?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-black/10 bg-[var(--blomeo-surface)] p-4 shadow-2xl scrollbar-none sm:max-w-md sm:rounded-[28px] dark:border-white/10"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isRtl ? 'إضافة إلى التدوينة' : 'Add to diary'}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-xs font-black text-[var(--blomeo-text)]">
            <Paperclip className="h-4 w-4 text-[var(--blomeo-accent)]" />
            {isRtl ? 'إضافة إلى التدوينة' : 'Add to diary'}
          </h3>
          <button
            type="button"
            data-compact-control="true"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--blomeo-text-muted)] transition hover:bg-[var(--blomeo-surface-nested)]"
            aria-label={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                onClick={() => run(tool.action)}
                className="flex min-h-12 items-center gap-2 rounded-2xl border border-black/10 bg-[var(--blomeo-surface-nested)] px-2.5 py-2 text-start text-[10px] font-bold text-[var(--blomeo-text)] transition hover:border-[var(--blomeo-accent)] hover:bg-[var(--blomeo-accent)]/10 dark:border-white/10"
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--blomeo-accent)]" />
                <span className="min-w-0">{tool.label}</span>
              </button>
            );
          })}
        </div>

        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) editorProps.onOpenVoiceVentWithFile?.(file);
            event.target.value = '';
            onClose();
          }}
        />
      </div>
    </div>
  );
}
