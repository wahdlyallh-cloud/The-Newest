import React from 'react';
import { PenTool, Mic, Brain, Heart, CheckSquare, Camera, Bell } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface StaticNotificationProps {
  onAction: (actionType: 'new_note' | 'voice' | 'mood' | 'ai' | 'task' | 'photo') => void;
  onBodyClick?: () => void;
  appLanguage?: AppLanguage;
}

export default function StaticNotification({ onAction, onBodyClick, appLanguage = 'ar' }: StaticNotificationProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  return (
    <div 
      onClick={() => {
        if (onBodyClick) onBodyClick();
      }}
      className={`bg-[#F5F1E6] border-2 border-[#E5E1D4] text-[#3A3A3A] rounded-[2rem] p-5 shadow-md max-w-lg mx-auto font-sans transition-all duration-200 select-none ${onBodyClick ? 'cursor-pointer hover:shadow-lg hover:border-[#D4A373]' : ''}`} 
      dir={langInfo.dir}
    >
      {/* Title / Status */}
      <div className="flex flex-row items-center justify-between mb-4 pb-3 border-b border-[#E5E1D4]/80 w-full relative">
        <div className={`flex flex-row items-center space-x-2.5 ${langInfo.dir === 'rtl' ? 'space-x-reverse' : ''}`}>
          <div className="bg-[#D4A373] p-1.5 rounded-xl text-white shadow-xs shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <span className="text-sm font-black text-gray-700 whitespace-nowrap">{t.notificationActiveNow}</span>
        </div>
      </div>

      {/* Main Body */}
      <div className={`space-y-1 mb-4 ${langInfo.dir === 'rtl' ? 'text-right' : 'text-left'}`}>
        <h4 className="text-base sm:text-lg font-black text-[#5A5A40]">{t.notificationHowAreYou}</h4>
        <p className="text-xs sm:text-sm text-[#5A5A40]/80 leading-relaxed font-semibold">
          {t.notificationTapShortcut}
        </p>
      </div>

      {/* Interactive Quick Actions Row */}
      <div className="p-4 flex flex-row items-center justify-around gap-2 bg-white rounded-[1.5rem] border border-[#E5E1D4] overflow-x-auto w-full">
        {/* 1. Write */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('new_note');
          }}
          className="flex flex-col items-center justify-center p-2 hover:bg-[#F5F1E6]/50 active:scale-95 rounded-2xl transition-all cursor-pointer group flex-shrink-0"
          title={t.write}
        >
          <div className="w-12 h-12 rounded-full bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs">
            <PenTool className="w-5 h-5" />
          </div>
          <div className="h-9 flex items-center justify-center text-center text-[11px] leading-tight font-extrabold text-gray-500">
            <span>{t.write}</span>
          </div>
        </button>

        {/* 2. Voice Record */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('voice');
          }}
          className="flex flex-col items-center justify-center p-2 hover:bg-[#F5F1E6]/50 active:scale-95 rounded-2xl transition-all cursor-pointer group flex-shrink-0"
          title={t.voiceRecord}
        >
          <div className="w-12 h-12 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs">
            <Mic className="w-5 h-5" />
          </div>
          <div className="h-9 flex items-center justify-center text-center text-[11px] leading-tight font-extrabold text-gray-500">
            <span>{t.voiceRecord}</span>
          </div>
        </button>

        {/* 3. Mood */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('mood');
          }}
          className="flex flex-col items-center justify-center p-2 hover:bg-[#F5F1E6]/50 active:scale-95 rounded-2xl transition-all cursor-pointer group flex-shrink-0"
          title={t.mood}
        >
          <div className="w-12 h-12 rounded-full bg-[#FCE8E6] text-[#C5221F] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs">
            <Heart className="w-5 h-5" />
          </div>
          <div className="h-9 flex items-center justify-center text-center text-[11px] leading-tight font-extrabold text-gray-500">
            <span>{t.mood}</span>
          </div>
        </button>

        {/* 4. Advisor */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('ai');
          }}
          className="flex flex-col items-center justify-center p-2 hover:bg-[#F5F1E6]/50 active:scale-95 rounded-2xl transition-all cursor-pointer group flex-shrink-0"
          title={t.advisor}
        >
          <div className="w-12 h-12 rounded-full bg-[#FEF7E0] text-[#B06000] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs">
            <Brain className="w-5 h-5" />
          </div>
          <div className="h-9 flex items-center justify-center text-center text-[11px] leading-tight font-extrabold text-gray-500">
            <span>{t.advisor}</span>
          </div>
        </button>

        {/* 5. Task */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('task');
          }}
          className="flex flex-col items-center justify-center p-2 hover:bg-[#F5F1E6]/50 active:scale-95 rounded-2xl transition-all cursor-pointer group flex-shrink-0"
          title={t.task}
        >
          <div className="w-12 h-12 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div className="h-9 flex items-center justify-center text-center text-[11px] leading-tight font-extrabold text-gray-500">
            <span>{t.task}</span>
          </div>
        </button>

        {/* 6. Photo */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction('photo');
          }}
          className="flex flex-col items-center justify-center p-2 hover:bg-[#F5F1E6]/50 active:scale-95 rounded-2xl transition-all cursor-pointer group flex-shrink-0"
          title={t.photo}
        >
          <div className="w-12 h-12 rounded-full bg-[#E8F8FF] text-[#0369A1] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs">
            <Camera className="w-5 h-5" />
          </div>
          <div className="h-9 flex items-center justify-center text-center text-[11px] leading-tight font-extrabold text-gray-500">
            <span>{t.photo}</span>
          </div>
        </button>
      </div>

      {/* Bottom info row */}
      <div className={`flex justify-between items-center text-[10px] sm:text-xs text-gray-400 font-bold px-1 mt-3`}>
        <span>{t.notificationTapShortcut}</span>
        <span className={`flex items-center space-x-1 ${langInfo.dir === 'rtl' ? 'space-x-reverse' : ''} text-amber-600`}>
          <span>🔒</span>
          <span>{t.appLockTitle}</span>
        </span>
      </div>
    </div>
  );
}
