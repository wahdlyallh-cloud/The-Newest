import React from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface NativeModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack: () => void;
  isRtl?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
  theme?: 'light' | 'dark' | 'emerald' | 'amber' | 'rose' | 'slate';
}

export const NativeModalHeader: React.FC<NativeModalHeaderProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  isRtl = true,
  rightAction,
  className = '',
  theme = 'light'
}) => {
  // Back arrow orientation: in RTL, ArrowRight points backwards (rightward toward the edge); in LTR, ArrowLeft points leftward
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  let themeClasses = 'bg-[#F9F7F2] border-b border-[#E2DCC8]/70 text-[#2B3E50]';
  let backBtnClasses = 'bg-white/80 hover:bg-white text-[#2B3E50] border border-[#E2DCC8] shadow-xs active:scale-95';

  if (theme === 'dark') {
    themeClasses = 'bg-slate-900 border-b border-slate-800 text-white';
    backBtnClasses = 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-xs active:scale-95';
  } else if (theme === 'emerald') {
    themeClasses = 'bg-gradient-to-l from-[#5A5A40] to-[#8B9D83] text-white border-b border-[#5A5A40]/40';
    backBtnClasses = 'bg-white/15 hover:bg-white/25 text-white border border-white/20 shadow-xs active:scale-95';
  } else if (theme === 'rose') {
    themeClasses = 'bg-gradient-to-r from-rose-50/90 via-[#FAF8F5] to-amber-50/60 border-b border-rose-200/60 text-[#2B3E50]';
    backBtnClasses = 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-xs active:scale-95';
  } else if (theme === 'slate') {
    themeClasses = 'bg-[#2B3E50] text-white border-b border-[#1E2B37]';
    backBtnClasses = 'bg-white/15 hover:bg-white/25 text-white border border-white/20 shadow-xs active:scale-95';
  }

  return (
    <div
      className={`px-3 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between shrink-0 select-none native-screen-header sticky top-0 z-30 ${themeClasses} ${className}`}
      style={{ paddingTop: 'max(0.6rem, env(safe-area-inset-top, 0.6rem))' }}
    >
      <div className="flex items-center space-x-2.5 space-x-reverse min-w-0 flex-1">
        {/* Touch-Friendly Native Back Button (>= 44x44px target) */}
        <button
          type="button"
          onClick={onBack}
          aria-label={isRtl ? 'الرجوع' : 'Back'}
          className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 tap-feedback ${backBtnClasses}`}
        >
          <BackIcon className="w-5 h-5 shrink-0" />
        </button>

        {/* Optional Leading Icon */}
        {icon && (
          <div className="shrink-0 p-1.5 rounded-xl bg-black/5 flex items-center justify-center">
            {icon}
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-extrabold truncate leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] sm:text-xs opacity-75 truncate leading-tight mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Trailing Right Action (if any, e.g. print, clear, extra button) */}
      {rightAction && (
        <div className="shrink-0 flex items-center gap-1.5 ms-2">
          {rightAction}
        </div>
      )}
    </div>
  );
};

export default NativeModalHeader;
