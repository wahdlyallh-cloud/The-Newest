import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { backgroundAIManager, BackgroundAITask } from '../lib/backgroundAIManager';
import { AppLanguage, getTranslation } from '../lib/languages';

interface BackgroundAIStatusProps {
  appLanguage?: AppLanguage;
}

export const BackgroundAIStatus: React.FC<BackgroundAIStatusProps> = ({ appLanguage = 'ar' }) => {
  const [tasks, setTasks] = useState<BackgroundAITask[]>([]);
  const isAr = appLanguage === 'ar';
  const t = getTranslation(appLanguage);

  useEffect(() => {
    return backgroundAIManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
    });
  }, []);

  const runningTasks = tasks.filter(t => t.status === 'running');
  const recentlyCompleted = tasks.filter(t => t.status === 'completed' && t.completedAt && (Date.now() - t.completedAt < 4000));
  const recentlyFailed = tasks.filter(t => t.status === 'failed' && t.completedAt && (Date.now() - t.completedAt < 6000));

  if (runningTasks.length === 0 && recentlyCompleted.length === 0 && recentlyFailed.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 start-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none transition-all duration-300"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Running Tasks indicator */}
      {runningTasks.map(task => (
        <div
          key={task.id}
          className="pointer-events-auto bg-[#2B3E50]/95 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/15 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" />
            <div className="flex flex-col truncate">
              <span className="truncate">{task.title}</span>
              <span className="text-[10px] text-[#E2DCC8] font-normal">
                {isAr ? 'يعمل في الخلفية بأمان...' : 'Processing in background safely...'}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Completed indicator */}
      {recentlyCompleted.map(task => (
        <div
          key={task.id}
          className="pointer-events-auto bg-emerald-900/95 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border border-emerald-500/30 flex items-center justify-between gap-2 animate-in fade-in"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{task.title}: {isAr ? 'اكتملت المعالجة ✅' : 'Completed ✅'}</span>
          </div>
          <button
            onClick={() => backgroundAIManager.dismissTask(task.id)}
            className="text-white/60 hover:text-white p-0.5 rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Failed indicator */}
      {recentlyFailed.map(task => (
        <div
          key={task.id}
          className="pointer-events-auto bg-rose-950/95 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border border-rose-500/30 flex items-center justify-between gap-2 animate-in fade-in"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{task.title}: {task.error || (isAr ? 'فشل الطلب' : 'Task failed')}</span>
          </div>
          <button
            onClick={() => backgroundAIManager.dismissTask(task.id)}
            className="text-white/60 hover:text-white p-0.5 rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
