// src/components/AIMediaAccessSelector.tsx
// Compact per-chat & per-report AI Media Access Selector component
// Quota & Token Saver: Defaults to 'text-only' (zero binary media)

import React, { useState } from 'react';
import { 
  ShieldCheck, Image, Video, Mic, FileText, ChevronDown, ChevronUp, Check, 
  Sparkles, Layers, CheckSquare, Square, AlertCircle
} from 'lucide-react';
import { AIMediaAccessPermission, AttachmentItemSummary } from '../lib/aiMediaAccess';
import { AppLanguage } from '../types';

interface AIMediaAccessSelectorProps {
  permission: AIMediaAccessPermission;
  onChange: (newPermission: AIMediaAccessPermission) => void;
  availableAttachments?: AttachmentItemSummary[];
  appLanguage?: AppLanguage;
  compact?: boolean;
}

export const AIMediaAccessSelector: React.FC<AIMediaAccessSelectorProps> = ({
  permission,
  onChange,
  availableAttachments = [],
  appLanguage = 'ar',
  compact = false
}) => {
  const isAr = appLanguage === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusChipText = () => {
    if (permission.mode === 'text-only') {
      return isAr ? 'وضع التوفير (نص فقط)' : 'Token Saver (Text Only)';
    }
    if (permission.mode === 'selected') {
      const count = permission.selectedAttachmentIds.length;
      return isAr ? `${count} ملفات مسموح بها للـ AI` : `${count} files allowed for AI`;
    }
    // by-type
    const activeTypes: string[] = [];
    if (permission.allowImages) activeTypes.push(isAr ? 'الصور' : 'Images');
    if (permission.allowVideos) activeTypes.push(isAr ? 'الفيديو' : 'Videos');
    if (permission.allowAudio) activeTypes.push(isAr ? 'الصوت' : 'Audio');
    if (permission.allowFiles) activeTypes.push(isAr ? 'الملفات' : 'Files');

    if (activeTypes.length === 0) {
      return isAr ? 'وضع التوفير (نص فقط)' : 'Token Saver (Text Only)';
    }
    return activeTypes.join(' • ');
  };

  const handleToggleMode = (mode: 'text-only' | 'selected' | 'by-type') => {
    onChange({
      ...permission,
      mode
    });
  };

  const handleToggleType = (type: 'allowImages' | 'allowVideos' | 'allowAudio' | 'allowFiles') => {
    onChange({
      ...permission,
      mode: 'by-type',
      [type]: !permission[type]
    });
  };

  const handleToggleAttachmentItem = (id: string) => {
    const exists = permission.selectedAttachmentIds.includes(id);
    const updated = exists
      ? permission.selectedAttachmentIds.filter(item => item !== id)
      : [...permission.selectedAttachmentIds, id];
    onChange({
      ...permission,
      mode: 'selected',
      selectedAttachmentIds: updated
    });
  };

  return (
    <div className="w-full bg-[#FAF8F5] border border-[#E2DCC8] rounded-2xl p-2.5 transition-all text-xs">
      {/* Top Bar Header with Toggle Chip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#8B9D83]" />
          <span className="font-extrabold text-[#3A3A3A]">
            {isAr ? 'وسائط الذكاء الاصطناعي:' : 'AI Media Access:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer truncate ${
              permission.mode === 'text-only'
                ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100/90 text-amber-800 border border-amber-300'
            }`}
            title={isAr ? 'تعديل أذونات الوسائط لحفظ الحصة' : 'Adjust AI media access permissions'}
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="truncate">{getStatusChipText()}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls Panel */}
      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-[#E2DCC8]/70 space-y-2.5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-[#EFECE6] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleToggleMode('text-only')}
              className={`py-1 px-1.5 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer text-center ${
                permission.mode === 'text-only'
                  ? 'bg-white text-[#3A3A3A] shadow-3xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {isAr ? 'نص فقط (توفير)' : 'Text Only (Saver)'}
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('by-type')}
              className={`py-1 px-1.5 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer text-center ${
                permission.mode === 'by-type'
                  ? 'bg-white text-[#3A3A3A] shadow-3xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {isAr ? 'حسب الفئة' : 'By Type'}
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('selected')}
              className={`py-1 px-1.5 rounded-lg text-[10.5px] font-extrabold transition-all cursor-pointer text-center ${
                permission.mode === 'selected'
                  ? 'bg-white text-[#3A3A3A] shadow-3xs'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              {isAr ? 'اختيار يدوي' : 'Pick Items'}
            </button>
          </div>

          {/* By Type Quick Switches */}
          {permission.mode === 'by-type' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleToggleType('allowImages')}
                className={`flex items-center justify-between p-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                  permission.allowImages
                    ? 'bg-[#8B9D83]/20 border-[#8B9D83] text-[#3A3A3A]'
                    : 'bg-white border-[#E2DCC8] text-gray-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Image className="w-3.5 h-3.5 text-blue-600" />
                  {isAr ? 'الصور' : 'Images'}
                </span>
                {permission.allowImages && <Check className="w-3.5 h-3.5 text-[#8B9D83]" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggleType('allowVideos')}
                className={`flex items-center justify-between p-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                  permission.allowVideos
                    ? 'bg-[#8B9D83]/20 border-[#8B9D83] text-[#3A3A3A]'
                    : 'bg-white border-[#E2DCC8] text-gray-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  {isAr ? 'الفيديوهات' : 'Videos'}
                </span>
                {permission.allowVideos && <Check className="w-3.5 h-3.5 text-[#8B9D83]" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggleType('allowAudio')}
                className={`flex items-center justify-between p-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                  permission.allowAudio
                    ? 'bg-[#8B9D83]/20 border-[#8B9D83] text-[#3A3A3A]'
                    : 'bg-white border-[#E2DCC8] text-gray-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  {isAr ? 'الصوتيات' : 'Audio'}
                </span>
                {permission.allowAudio && <Check className="w-3.5 h-3.5 text-[#8B9D83]" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggleType('allowFiles')}
                className={`flex items-center justify-between p-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                  permission.allowFiles
                    ? 'bg-[#8B9D83]/20 border-[#8B9D83] text-[#3A3A3A]'
                    : 'bg-white border-[#E2DCC8] text-gray-500'
                }`}
              >
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  {isAr ? 'المستندات' : 'Files'}
                </span>
                {permission.allowFiles && <Check className="w-3.5 h-3.5 text-[#8B9D83]" />}
              </button>
            </div>
          )}

          {/* Per-File Checklist Picker */}
          {permission.mode === 'selected' && (
            <div className="space-y-1.5">
              {availableAttachments.length === 0 ? (
                <p className="text-[11px] text-gray-500 text-center py-2 bg-white rounded-xl border border-dashed border-[#E2DCC8]">
                  {isAr ? 'لا توجد مرفقات في نطاق المحادثة أو التقرير الحالي.' : 'No attachments available in current scope.'}
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {availableAttachments.map((att) => {
                    const isChecked = permission.selectedAttachmentIds.includes(att.id);
                    return (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => handleToggleAttachmentItem(att.id)}
                        className={`w-full flex items-center justify-between p-1.5 rounded-xl border text-[11px] cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-white border-[#8B9D83] text-[#3A3A3A] font-bold shadow-3xs'
                            : 'bg-[#F9F7F2]/60 border-[#E2DCC8] text-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#8B9D83] shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                          {att.type === 'image' && <Image className="w-3 h-3 text-blue-500 shrink-0" />}
                          {att.type === 'video' && <Video className="w-3 h-3 text-purple-500 shrink-0" />}
                          {att.type === 'audio' && <Mic className="w-3 h-3 text-emerald-500 shrink-0" />}
                          {att.type === 'file' && <FileText className="w-3 h-3 text-red-500 shrink-0" />}
                          <span className="truncate">{att.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                          {att.dateStr || ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Informational memory & quota advisory */}
          <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-white/70 p-1.5 rounded-lg border border-[#E2DCC8]/50">
            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>
              {isAr
                ? 'الوضع الافتراضي (نص فقط) يرسل النصوص والتفريغات الصوتية بدون ملفات ثنائية لحفظ الحصة والذاكرة.'
                : 'Text-only default sends transcripts & text without heavy binary data to protect quota and RAM.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIMediaAccessSelector;
