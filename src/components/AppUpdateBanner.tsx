import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadCloud, X, ExternalLink } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AppLanguage } from '../types';

interface AppUpdateBannerProps {
  appLanguage?: AppLanguage;
  className?: string;
}

interface UpdateInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
}

const UPDATE_LOCALES: Record<string, { bannerTitle: string; updateNow: string; dismiss: string }> = {
  ar: {
    bannerTitle: 'يوجد تحديث جديد لتطبيق حياة AI',
    updateNow: 'تحديث الآن',
    dismiss: 'تجاهل'
  },
  en: {
    bannerTitle: 'A new update is available for Hayat AI',
    updateNow: 'Update Now',
    dismiss: 'Dismiss'
  },
  fr: {
    bannerTitle: 'Une nouvelle mise à jour est disponible pour Hayat AI',
    updateNow: 'Mettre à jour',
    dismiss: 'Ignorer'
  },
  de: {
    bannerTitle: 'Ein neues Update ist für Hayat AI verfügbar',
    updateNow: 'Jetzt aktualisieren',
    dismiss: 'Schließen'
  },
  es: {
    bannerTitle: 'Hay una nueva actualización disponible para Hayat AI',
    updateNow: 'Actualizar ahora',
    dismiss: 'Descartar'
  },
  it: {
    bannerTitle: 'È disponibile un nuovo aggiornamento per Hayat AI',
    updateNow: 'Aggiorna ora',
    dismiss: 'Chiudi'
  },
  tr: {
    bannerTitle: 'Hayat AI için yeni bir güncelleme mevcut',
    updateNow: 'Şimdi Güncelle',
    dismiss: 'Kapat'
  },
  pt: {
    bannerTitle: 'Uma nova atualização está disponível para Hayat AI',
    updateNow: 'Atualizar agora',
    dismiss: 'Dispensar'
  },
  ru: {
    bannerTitle: 'Доступно новое обновление для Hayat AI',
    updateNow: 'Обновить сейчас',
    dismiss: 'Закрыть'
  },
  ja: {
    bannerTitle: 'Hayat AIの新しいアップデートが利用可能です',
    updateNow: '今すぐ更新',
    dismiss: '閉じる'
  },
  zh: {
    bannerTitle: 'Hayat AI 有新版本可用',
    updateNow: '立即更新',
    dismiss: '稍后'
  },
  hi: {
    bannerTitle: 'Hayat AI के लिए नया अपडेट उपलब्ध है',
    updateNow: 'अभी अपडेट करें',
    dismiss: 'बाद में'
  }
};

export default function AppUpdateBanner({
  appLanguage = 'ar',
  className = ''
}: AppUpdateBannerProps) {
  // Never render on web browsers — only on native Capacitor platforms (Android/iOS)
  const isNative = Capacitor.isNativePlatform();

  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const metaEnv = (import.meta as any)?.env || {};
  const installedVersionCode = Number(metaEnv.VITE_APP_VERSION_CODE) || 100;
  const installedVersionName = (metaEnv.VITE_APP_VERSION_NAME as string) || '1.0.0';

  const checkForUpdate = useCallback(async () => {
    if (!isNative) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    try {
      const response = await fetch(
        'https://api.github.com/repos/wahdlyallh-cloud/The-Newest/releases/latest',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) return;

      const release = await response.json();
      const body = typeof release.body === 'string' ? release.body : '';
      const tag = typeof release.tag_name === 'string' ? release.tag_name : '';

      // Parse remote version code from versionCode marker or fallback to tag v1.0.N -> 100 + N
      let remoteVersionCode: number | null = null;
      const markerMatch = body.match(/versionCode\s*:\s*(\d+)/i);
      if (markerMatch && markerMatch[1]) {
        remoteVersionCode = parseInt(markerMatch[1], 10);
      } else {
        const tagMatch = tag.match(/v?1\.0\.(\d+)/i);
        if (tagMatch && tagMatch[1]) {
          remoteVersionCode = 100 + parseInt(tagMatch[1], 10);
        }
      }

      if (remoteVersionCode === null || remoteVersionCode <= installedVersionCode) {
        return;
      }

      // Find .apk asset download url
      let apkDownloadUrl = '';
      if (Array.isArray(release.assets)) {
        const apkAsset = release.assets.find(
          (asset: any) =>
            typeof asset.name === 'string' &&
            asset.name.toLowerCase().endsWith('.apk') &&
            typeof asset.browser_download_url === 'string'
        );
        if (apkAsset) {
          apkDownloadUrl = apkAsset.browser_download_url;
        }
      }

      if (apkDownloadUrl) {
        const cleanTag = tag.replace(/^v/i, '') || `${remoteVersionCode}`;
        setAvailableUpdate({
          versionCode: remoteVersionCode,
          versionName: cleanTag,
          apkUrl: apkDownloadUrl
        });
      }
    } catch {
      // Fail completely silently if offline or request fails
    }
  }, [isNative, installedVersionCode]);

  useEffect(() => {
    if (!isNative) return;

    checkForUpdate();

    const handleOnline = () => {
      checkForUpdate();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isNative, checkForUpdate]);

  if (!isNative || isDismissed || !availableUpdate) {
    return null;
  }

  const isRtl = appLanguage === 'ar';
  const loc = UPDATE_LOCALES[appLanguage] || UPDATE_LOCALES.en;

  const handleUpdateClick = () => {
    if (availableUpdate.apkUrl) {
      window.open(availableUpdate.apkUrl, '_blank', 'noopener,noreferrer');
    }
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
        <div className="px-4 py-3 rounded-2xl border text-xs font-bold shadow-xl flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-emerald-900/90 border-emerald-500/60 text-emerald-100 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/25 text-emerald-300 rounded-xl shrink-0 shadow-inner">
              <DownloadCloud className="w-4 h-4 animate-bounce" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-white text-xs sm:text-sm">
                  {loc.bannerTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] font-mono border border-emerald-400/40">
                  v{availableUpdate.versionName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUpdateClick}
              className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-emerald-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>{loc.updateNow}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
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
