import React, { useRef } from 'react';
import { FilePlus2, Image, Music2, Paperclip, PenTool, Sparkles, Video, X } from 'lucide-react';

interface Props { editorProps: Record<string, any>; isRtl: boolean; onClose: () => void; }

export default function BlomeoPaperclipMenu({ editorProps, isRtl, onClose }: Props) {
  const audioInput = useRef<HTMLInputElement | null>(null);
  const tools = [
    { icon: '🎙️', label: isRtl ? 'فضفضة صوتية مباشرة' : 'Live voice vent', action: editorProps.onOpenVoiceVent },
    { icon: '🎧', label: isRtl ? 'إضافة ملف صوتي (تفريغ تلقائي + SER)' : 'Add audio (transcription + SER)', action: () => audioInput.current?.click() },
    { icon: '🤖', label: isRtl ? 'يومية صوتية بالذكاء الاصطناعي' : 'AI voice journal', action: editorProps.onOpenAIVoiceJournal },
    { icon: '🖼️', label: isRtl ? 'إضافة صور' : 'Add photos', action: editorProps.onTriggerPhotoUpload },
    { icon: '🎬', label: isRtl ? 'إضافة فيديو' : 'Add video', action: editorProps.onTriggerVideoUpload },
    { icon: '📄', label: isRtl ? 'إضافة ملف PDF' : 'Add PDF', action: editorProps.onTriggerPdfUpload },
    { icon: '📁', label: isRtl ? 'إضافة ملفات' : 'Add files', action: editorProps.onTriggerGenericFileUpload },
    { icon: '🎨', label: isRtl ? 'رسم تخطيطي ذهني' : 'Mind map sketch', action: editorProps.onOpenDrawingCanvas },
    { icon: '🙏', label: isRtl ? 'استيراد من جدار الامتنان' : 'Import from gratitude wall', action: editorProps.onOpenGratitudeImport },
    { icon: '📥', label: isRtl ? 'استيراد تدوينة / نص' : 'Import diary / text', action: editorProps.onOpenWriteDiaryImport }
  ];
  const run = (action?: () => void) => { action?.(); onClose(); };
  return <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/20 p-2 backdrop-blur-sm md:absolute md:inset-auto md:bottom-14 md:end-0 md:block md:bg-transparent md:p-0" onClick={onClose}>
    <div className="w-full max-w-lg rounded-[28px] border border-black/10 bg-[var(--blomeo-surface)] p-4 shadow-2xl dark:border-white/10 md:w-80" onClick={(event) => event.stopPropagation()} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-[var(--blomeo-text)]"><Paperclip className="h-4 w-4 text-[var(--blomeo-accent)]" />{isRtl ? 'إضافة إلى التدوينة' : 'Add to diary'}</div><button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--blomeo-text-muted)]"><X className="h-4 w-4" /></button></div>
      <div className="grid grid-cols-2 gap-2">{tools.map((tool) => <button type="button" key={tool.label} onClick={() => run(tool.action)} className="flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--blomeo-surface-nested)] px-2.5 py-2 text-start text-[10px] font-bold text-[var(--blomeo-text)] hover:bg-[var(--blomeo-accent)]/10"><span className="text-lg">{tool.icon}</span><span>{tool.label}</span></button>)}</div>
      <input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) editorProps.onOpenVoiceVentWithFile?.(file); onClose(); }} />
    </div>
  </div>;
}
