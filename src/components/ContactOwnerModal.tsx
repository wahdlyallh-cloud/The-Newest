import React, { useState } from 'react';
import { X, Copy, Mail, Check, Heart } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface ContactOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage?: AppLanguage;
  isEn?: boolean;
}

export default function ContactOwnerModal({ isOpen, onClose, appLanguage = 'ar' }: ContactOwnerModalProps) {
  const [copied, setCopied] = useState(false);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  if (!isOpen) return null;

  const emailAddress = "wahdlyallh@gmail.com";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailClick = () => {
    const subject = t.emailSubjectFeedback || 'Feedback - Hayat AI App';
    window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[55] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300 transform scale-100">
        
        {/* Header */}
        <div className="p-5 pb-3 border-b border-[#E2DCC8]/60 flex items-center justify-between bg-[#F0EDE4]/40">
          <h4 className="font-black text-[#2B3E50] text-base sm:text-lg flex items-center gap-2">
            <span className="p-2 bg-[#4E685B] text-white rounded-xl shadow-3xs">
              <Mail className="w-5 h-5" />
            </span>
            <span>{t.contactDeveloperTitle || 'Contact Developer 📬'}</span>
          </h4>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4E685B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">

          {/* Developer Personal Note Card */}
          <div className="bg-[#FEFBF3] border-2 border-[#D4A373]/40 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-[#4E685B] font-black text-xs sm:text-sm">
              <Heart className="w-4 h-4 text-[#D4A373] fill-[#D4A373]" />
              <span>{t.developerMessageLabel || 'Message from Hayat AI developer:'}</span>
            </div>
            <p className="text-xs sm:text-[13px] text-gray-800 font-bold leading-relaxed text-justify">
              أنا مجرد شخص يستخدم الذكاء الاصطناعي لمساعدتي في تحسين جودة حياتي لذلك صنعت هذا التطبيق المتواضع ونشرته ليساعد أي شخص لديه رغبة في تطوير وفهم ذاته وتحسين حياته للأفضل. لو لديك أي تعديل أو استفسار أو نقد بناء أو أي شيء يمكن يساعدنا في الوصول لوجهتنا وهي السلام النفسي وعيش حياة ذات جودة عالية وتحقيق ما نرغب فيه يمكنك مراسلتي من هنا. وشكرًا
            </p>
          </div>

          {/* Email Display & Direct Mailto Click Box */}
          <div 
            onClick={handleEmailClick}
            className="flex items-center justify-between bg-white border-2 border-[#E2DCC8] hover:border-[#4E685B] rounded-2xl px-4 py-3 shadow-3xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-[#4E685B] rounded-xl group-hover:bg-[#4E685B] group-hover:text-white transition-all">
                <Mail className="w-4 h-4" />
              </div>
              <span className="font-mono text-xs sm:text-sm font-black text-[#2B3E50] tracking-wide select-all">
                {emailAddress}
              </span>
            </div>
            <button 
              type="button"
              onClick={handleCopy}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-[#8B9D83]/20 hover:text-[#4E685B]'
              }`}
              title={copied ? t.copied : t.copyEmail}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white hover:bg-gray-100 border-2 border-[#E2DCC8] text-gray-600 font-black text-xs rounded-2xl transition-all cursor-pointer shadow-3xs"
            >
              {t.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleEmailClick}
              className="flex-2 py-3 bg-[#4E685B] hover:bg-[#3F5449] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-md"
            >
              <Mail className="w-4 h-4" />
              <span>{t.sendDirectEmailBtn || 'Send Email ✉️'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
