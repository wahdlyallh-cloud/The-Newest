import React from 'react';
import { X, Check, HelpCircle, BellRing } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

export interface InAppReminderData {
  id: string;
  title: string;
  body: string;
  isQuestion?: boolean;
  yesLabel?: string;
  noLabel?: string;
}

interface InAppReminderOverlayProps {
  reminder: InAppReminderData | null;
  onAnswer: (reminderId: string, answer: 'yes' | 'no' | 'dismissed') => void;
  appLanguage?: AppLanguage;
}

export const InAppReminderOverlay: React.FC<InAppReminderOverlayProps> = ({
  reminder,
  onAnswer,
  appLanguage = 'ar'
}) => {
  if (!reminder) return null;

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  return (
    <div
      className="fixed top-3 inset-x-0 z-[9999] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300"
      dir={langInfo.dir}
    >
      <div className="w-full max-w-md bg-white border-2 border-[#4E685B] rounded-3xl p-4 shadow-2xl pointer-events-auto flex flex-col space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-50 text-[#4E685B] shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <h4 className="text-sm font-black text-gray-900 truncate">{reminder.title}</h4>
          </div>
          <button
            type="button"
            onClick={() => onAnswer(reminder.id, 'dismissed')}
            className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer shrink-0"
            aria-label={t.closeAction || 'إغلاق'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reminder Body */}
        {reminder.body && (
          <p className="text-xs text-gray-600 font-semibold leading-relaxed">
            {reminder.body}
          </p>
        )}

        {/* Actions Row */}
        {reminder.isQuestion ? (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAnswer(reminder.id, 'yes')}
              className="flex-1 py-2 px-3 bg-[#2E7D32] hover:bg-[#256828] text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{reminder.yesLabel || t.confirmAction || 'نعم'}</span>
            </button>
            <button
              type="button"
              onClick={() => onAnswer(reminder.id, 'no')}
              className="flex-1 py-2 px-3 bg-[#FCE8E6] hover:bg-[#F8D7DA] text-[#C5221F] border border-[#F5C2C7] rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>{reminder.noLabel || t.cancel || 'لا'}</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => onAnswer(reminder.id, 'dismissed')}
              className="py-1.5 px-4 bg-[#4E685B] hover:bg-[#3E5449] text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {t.closeAction || 'حسناً، فهمت'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default InAppReminderOverlay;
