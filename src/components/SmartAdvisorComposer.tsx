import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Image, Video, FileText, Music, Sparkles, Send, Square, X, Paperclip } from 'lucide-react';
import { MultimodalAttachment, AppLanguage } from '../types';
import { getTranslation } from '../lib/languages';

interface SmartAdvisorComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  loading: boolean;
  onOpenLiveVoice: () => void;
  onDictationToggle: () => void;
  isDictating: boolean;
  onFileUpload: (files: FileList) => void;
  attachments: MultimodalAttachment[];
  onRemoveAttachment: (id: string) => void;
  uploadProgress?: Record<string, number>;
  placeholder: string;
  appLanguage?: AppLanguage;
  accentTheme?: 'emerald' | 'aquatic';
}

export default function SmartAdvisorComposer({
  input,
  setInput,
  onSend,
  loading,
  onOpenLiveVoice,
  onDictationToggle,
  isDictating,
  onFileUpload,
  attachments,
  onRemoveAttachment,
  uploadProgress = {},
  placeholder,
  appLanguage = 'ar',
  accentTheme = 'emerald'
}: SmartAdvisorComposerProps) {
  const t = getTranslation(appLanguage);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hidden native file inputs for EXACTLY 4 types
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  // Click outside to close attachment menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentMenu]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (input.trim() || attachments.length > 0)) {
        onSend(input);
      }
    }
  };

  const handleInputFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAttachmentMenu(false);
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
    }
  };

  return (
    <div className="relative p-2.5 sm:p-3 bg-white dark:bg-[#0E2320] border-t border-[#2D6A4F]/10 dark:border-[#48B89F]/15 shrink-0 transition-colors">
      
      {/* Hidden Native File Pickers */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputFiles}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleInputFiles}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,application/pdf"
        className="hidden"
        onChange={handleInputFiles}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleInputFiles}
      />

      {/* Popover Attachment Menu (4 native device pickers only) */}
      {showAttachmentMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full start-3 mb-2 z-50 bg-white dark:bg-[#14302B] border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 rounded-2xl shadow-xl p-2 w-48 space-y-1 animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={() => {
              if (photoInputRef.current) {
                photoInputRef.current.value = '';
                photoInputRef.current.click();
              }
            }}
            className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#12261D] dark:text-[#EBF5F2] hover:bg-[#F3F8F5] dark:hover:bg-[#0E2320] transition-colors cursor-pointer"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Image className="w-4 h-4" />
            </div>
            <span>{t.attachPhotos || 'صور'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (videoInputRef.current) {
                videoInputRef.current.value = '';
                videoInputRef.current.click();
              }
            }}
            className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#12261D] dark:text-[#EBF5F2] hover:bg-[#F3F8F5] dark:hover:bg-[#0E2320] transition-colors cursor-pointer"
          >
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Video className="w-4 h-4" />
            </div>
            <span>{t.attachVideos || 'فيديو'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (docInputRef.current) {
                docInputRef.current.value = '';
                docInputRef.current.click();
              }
            }}
            className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#12261D] dark:text-[#EBF5F2] hover:bg-[#F3F8F5] dark:hover:bg-[#0E2320] transition-colors cursor-pointer"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <span>{t.attachDocs || 'مستندات'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioInputRef.current) {
                audioInputRef.current.value = '';
                audioInputRef.current.click();
              }
            }}
            className="w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#12261D] dark:text-[#EBF5F2] hover:bg-[#F3F8F5] dark:hover:bg-[#0E2320] transition-colors cursor-pointer"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Music className="w-4 h-4" />
            </div>
            <span>{t.attachAudios || 'صوتيات'}</span>
          </button>
        </div>
      )}

      {/* Attachment Preview Chips */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {attachments.map(att => (
            <div
              key={att.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F3F8F5] dark:bg-[#14302B] border border-[#2D6A4F]/15 dark:border-[#48B89F]/15 text-xs text-[#12261D] dark:text-[#EBF5F2] shadow-3xs"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#2D6A4F] dark:text-[#48B89F] shrink-0" />
              <span className="truncate max-w-[130px] font-bold">{att.name}</span>
              {uploadProgress[att.id] !== undefined && uploadProgress[att.id] < 100 && (
                <span className="text-[10px] text-amber-600 font-mono">
                  {uploadProgress[att.id]}%
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveAttachment(att.id)}
                className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Spacious Pill Composer Bar */}
      <div className="flex items-end gap-1.5 sm:gap-2 bg-[#F3F8F5] dark:bg-[#14302B] border border-[#2D6A4F]/20 dark:border-[#48B89F]/20 rounded-3xl p-1.5 sm:p-2 shadow-xs transition-colors focus-within:ring-2 focus-within:ring-[#2D6A4F]/40 dark:focus-within:ring-[#48B89F]/40">
        
        {/* + Attachment Button */}
        <button
          type="button"
          onClick={() => setShowAttachmentMenu(prev => !prev)}
          className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
            showAttachmentMenu
              ? 'bg-[#2D6A4F] text-white'
              : 'text-[#4A6357] dark:text-[#9EC2B8] hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10'
          }`}
          title={t.smartAdvisorAttachFilesTooltip || 'إرفاق ملف'}
        >
          <Plus className={`w-5 h-5 transition-transform ${showAttachmentMenu ? 'rotate-45' : ''}`} />
        </button>

        {/* Auto-Expanding Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDictating ? (t.listeningVoice || 'أستمع إليك…') : placeholder}
          className="flex-1 bg-transparent py-1.5 px-2 text-sm text-[#12261D] dark:text-[#EBF5F2] placeholder-[#718A7D] dark:placeholder-[#6C9187] focus:outline-none resize-none leading-relaxed min-h-[36px] max-h-[140px]"
        />

        {/* Voice Dictation Mic Button */}
        <button
          type="button"
          onClick={onDictationToggle}
          className={`p-2 rounded-full transition-all cursor-pointer shrink-0 ${
            isDictating
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-[#4A6357] dark:text-[#9EC2B8] hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10'
          }`}
          title={t.dictationTooltip || 'إملاء صوتي وتحويل الكلام لنص'}
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Gemini-Style Live Voice Button (Waveform / Sparkle Audio) */}
        <button
          type="button"
          onClick={onOpenLiveVoice}
          className="p-2 rounded-full text-[#2D6A4F] dark:text-[#48B89F] hover:bg-[#2D6A4F]/10 dark:hover:bg-[#48B89F]/10 transition-colors cursor-pointer shrink-0"
          title={t.liveVoiceChatTooltip || 'محادثة صوتية مباشرة وسريعة'}
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* Circular Send Button (↑) */}
        <button
          type="button"
          onClick={() => {
            if (!loading && (input.trim() || attachments.length > 0)) {
              onSend(input);
            }
          }}
          disabled={loading || (!input.trim() && attachments.length === 0)}
          className={`p-2.5 rounded-full text-white dark:text-[#071614] shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
            accentTheme === 'aquatic'
              ? 'bg-[#3A8E7D] hover:bg-[#2D6A4F] dark:bg-[#48B89F] dark:hover:bg-[#2D8C76]'
              : 'bg-[#2D6A4F] hover:bg-[#214E3A] dark:bg-[#48B89F] dark:hover:bg-[#2D8C76]'
          }`}
          aria-label={t.send || 'إرسال'}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white dark:border-[#071614] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 rotate-180" />
          )}
        </button>

      </div>
    </div>
  );
}
