import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadCloud, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AppLanguage } from '../types';
import { checkForAppUpdate, AppUpdateCheckResult } from '../lib/appUpdater';

interface AppUpdateBannerProps {
  appLanguage?: AppLanguage;
  className?: string;
  onNavigateToSettingsUpdates?: () => void;
}

const UPDATE_LOCALES: Record<string, { bannerTitle: string; updateNow: string; dismiss: string }> = {
  ar: {
    bannerTitle: 'يوجد تحديث جديد لتطبيق حياة AI',
    updateNow: 'عرض التحديث وتثبيته',
    dismiss: 'تجاهل'
  },
  en: {
    bannerTitle: 'A new update is available for Hayat AI',
    updateNow: 'View & Install',
    dismiss: 'Dismiss'
  },
  fr: {
    bannerTitle: 'Une nouvelle mise à jour est disponible pour Hayat AI',
    updateNow: 'Voir et installer',
    dismiss: 'Ignorer'
  },
  de: {
    bannerTitle: 'Ein neues Update ist für Hayat AI verfügbar',
    updateNow: 'Anzeigen & Installieren',
    dismiss: 'Schließen'
  },
  es: {
    bannerTitle: 'Hay una nueva actualización disponible para Hayat AI',
    updateNow: 'Ver e instalar',
    dismiss: 'Descartar'
  },
  it: {
    bannerTitle: 'È disponibile un nuovo aggiornamento per Hayat AI',
    updateNow: 'Vedi e installa',
    dismiss: 'Chiudi'
  },
  tr: {
    bannerTitle: 'Hayat AI için yeni bir güncelleme mevcut',
    updateNow: 'Görüntüle ve Yükle',
    dismiss: 'Kapat'
  },
  pt: {
    bannerTitle: 'Uma nova atualização está disponível para Hayat AI',
    updateNow: 'Ver e instalar',
    dismiss: 'Dispensar'
  },
  ru: {
    bannerTitle: 'Доступно новое обновление для Hayat AI',
    updateNow: 'Посмотреть и установить',
    dismiss: 'Закрыть'
  },
  ja: {
    bannerTitle: 'Hayat AIの新しいアップデートが利用可能です',
    updateNow: '表示してインストール',
    dismiss: '閉じる'
  },
  zh: {
    bannerTitle: 'Hayat AI 有新版本可用',
    updateNow: '查看并安装',
    dismiss: '稍后'
  },
  hi: {
    bannerTitle: 'Hayat AI के लिए नया अपडेट उपलब्ध है',
    updateNow: 'देखें और इंस्टॉल करें',
    dismiss: 'बाद में'
  }
};

export default function AppUpdateBanner({
  appLanguage = 'ar',
  className = '',
  onNavigateToSettingsUpdates
}: AppUpdateBannerProps) {
  const isNative = Capacitor.isNativePlatform();

  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_dismissed_update_code');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const checkUpdates = useCallback(async () => {
    if (!isNative) return;
    try {
      const res = await checkForAppUpdate();
      if (res.hasUpdate) {
        setUpdateInfo(res);
      } else {
        setUpdateInfo(null);
      }
    } catch (e) {
      console.warn('[AppUpdateBanner] Update check failed:', e);
    }
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    checkUpdates();

    const handleOnline = () => {
      checkUpdates();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isNative, checkUpdates]);

  // Hide if not native, no update, or already dismissed for this specific version code
  if (
    !isNative ||
    !updateInfo ||
    !updateInfo.hasUpdate ||
    (dismissedVersion !== null && updateInfo.remoteVersionCode === dismissedVersion)
  ) {
    return null;
  }

  const isRtl = appLanguage === 'ar';
  const loc = UPDATE_LOCALES[appLanguage] || UPDATE_LOCALES.en;

  const handleDismiss = () => {
    if (updateInfo.remoteVersionCode) {
      try {
        localStorage.setItem('yawmiyati_dismissed_update_code', String(updateInfo.remoteVersionCode));
      } catch (_) {}
      setDismissedVersion(updateInfo.remoteVersionCode);
    }
  };

  const handleBannerClick = () => {
    if (onNavigateToSettingsUpdates) {
      onNavigateToSettingsUpdates();
    } else {
      // Trigger navigation event to settings tab and scroll to updates section
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'settings' }));
    }

    setTimeout(() => {
      const section = document.getElementById('settings-updates-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.classList.add('ring-2', 'ring-emerald-500', 'transition-all');
        setTimeout(() => {
          section.classList.remove('ring-2', 'ring-emerald-500');
        }, 2500);
      }
    }, 250);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className={`w-full z-40 ${className}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div 
          onClick={handleBannerClick}
          className="px-4 py-3 rounded-2xl border text-xs font-bold shadow-xl flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-emerald-900/90 border-emerald-500/60 text-emerald-100 backdrop-blur-md cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/25 text-emerald-300 rounded-xl shrink-0 shadow-inner">
              <DownloadCloud className="w-4 h-4 animate-bounce" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-white text-xs sm:text-sm">
                  {loc.bannerTitle}
                </span>
                {updateInfo.remoteVersionName && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] font-mono border border-emerald-400/40">
                    {updateInfo.remoteVersionName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleBannerClick}
              className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-emerald-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>{loc.updateNow}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={loc.dismiss}
              className="p-1.5 text-emerald-300/80 hover:text-white hover:bg-emerald-800/40 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
