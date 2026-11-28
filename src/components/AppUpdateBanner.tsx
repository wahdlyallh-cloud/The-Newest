import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadCloud, X, ArrowLeft, ArrowRight, Sparkles, ChevronDown, ChevronUp, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AppLanguage } from '../types';
import { checkForAppUpdate, installLatestUpdate, AppUpdateCheckResult } from '../lib/appUpdater';
import { getTranslation, isRtlLanguage } from '../lib/languages';

interface AppUpdateBannerProps {
  appLanguage?: AppLanguage;
  isDarkMode?: boolean;
  className?: string;
  onNavigateToSettingsUpdates?: () => void;
}

export default function AppUpdateBanner({
  appLanguage = 'ar',
  isDarkMode = true,
  className = '',
  onNavigateToSettingsUpdates
}: AppUpdateBannerProps) {
  const isNative = Capacitor.isNativePlatform();
  const isRtl = isRtlLanguage(appLanguage);
  const t = useMemo(() => getTranslation(appLanguage), [appLanguage]);

  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [isDismissedForSession, setIsDismissedForSession] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const checkUpdates = useCallback(async () => {
    try {
      const res = await checkForAppUpdate();
      if (res.hasUpdate) {
        // Check if dismissed for current session
        const sessionDismissed = sessionStorage.getItem(`blomeo_dismissed_update_${res.remoteVersionCode}`);
        if (sessionDismissed === 'true') {
          setIsDismissedForSession(true);
        }
        setUpdateInfo(res);
      } else {
        setUpdateInfo(null);
      }
    } catch (e) {
      console.warn('[AppUpdateBanner] Update check failed:', e);
    }
  }, []);

  useEffect(() => {
    checkUpdates();

    const handleOnline = () => {
      checkUpdates();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [checkUpdates]);

  // Clean parsed release notes / changelog bullets
  const changelogBullets = useMemo(() => {
    if (!updateInfo?.releaseNotes) return [];
    const lines = updateInfo.releaseNotes.split(/\r?\n/);
    const bullets: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      // Skip meta keys like versionCode:105
      if (/^versioncode\s*:\s*\d+/i.test(line)) continue;
      if (line.startsWith('#')) {
        const heading = line.replace(/^#+\s*/, '').trim();
        if (heading) bullets.push(heading);
      } else if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
        const bullet = line.replace(/^[-*•]\s*/, '').trim();
        if (bullet) bullets.push(bullet);
      } else if (bullets.length < 5 && line.length > 5) {
        bullets.push(line);
      }
    }
    return bullets.slice(0, 6);
  }, [updateInfo?.releaseNotes]);

  // Dismiss for current session
  const handleDismissSession = () => {
    if (updateInfo?.remoteVersionCode) {
      try {
        sessionStorage.setItem(`blomeo_dismissed_update_${updateInfo.remoteVersionCode}`, 'true');
      } catch (_) {}
    }
    setIsDismissedForSession(true);
  };

  // Perform Update Flow
  const handleTriggerUpdate = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. Navigate to Settings -> Updates section
    if (onNavigateToSettingsUpdates) {
      onNavigateToSettingsUpdates();
    } else {
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'settings' }));
    }

    setTimeout(() => {
      const section = document.getElementById('settings-updates-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        section.classList.add('ring-2', 'ring-emerald-400', 'transition-all');
        setTimeout(() => section.classList.remove('ring-2', 'ring-emerald-400'), 2500);
      }
    }, 300);

    // 2. Direct download / installation
    if (isNative) {
      if (updateInfo?.apkUrl) {
        setDownloadProgress(0);
        setDownloadError(null);
        try {
          const res = await installLatestUpdate(updateInfo.apkUrl, (prog) => {
            setDownloadProgress(Math.round(prog));
          });
          if (res.status === 'error') {
            setDownloadError(res.message || 'Download error');
            setDownloadProgress(null);
          }
        } catch (err: any) {
          setDownloadError(err?.message || 'Download failed');
          setDownloadProgress(null);
        }
      }
    } else {
      // On Web: initiate APK file download or open release URL
      if (updateInfo?.apkUrl) {
        const a = document.createElement('a');
        a.href = updateInfo.apkUrl;
        a.download = `Blomeo_${updateInfo.remoteVersionName || 'update'}.apk`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  if (!updateInfo || !updateInfo.hasUpdate || isDismissedForSession) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-4xl mx-auto px-3 sm:px-6 my-2 z-50 ${className}`}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div
          className={`rounded-3xl border shadow-2xl p-4 sm:p-5 backdrop-blur-xl transition-all ${
            isDarkMode
              ? 'bg-[#0A1A12]/95 border-emerald-500/40 text-[#ECF3EE]'
              : 'bg-[#F2F7F4]/98 border-[#2D6A4F]/30 text-[#113B2D]'
          }`}
        >
          {/* Main Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`p-2.5 rounded-2xl shrink-0 border ${
                isDarkMode ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-white border-emerald-200 text-emerald-800'
              }`}>
                <DownloadCloud className="w-5 h-5 animate-bounce" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    {t.updateBannerTitle || (isRtl ? 'يوجد تحديث جديد لتطبيق بلوميو 🚀' : 'A new update is available for Blomeo 🚀')}
                  </h3>
                  {updateInfo.remoteVersionName && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-mono font-bold">
                      {updateInfo.remoteVersionName}
                    </span>
                  )}
                </div>

                <p className="text-xs opacity-80 pt-1 leading-relaxed">
                  {isRtl
                    ? 'يتضمن هذا الإصدار أحدث التحسينات ومزايا بلوميو الجديدة.'
                    : 'This release contains the latest refinements and features for Blomeo.'}
                </p>
              </div>
            </div>

            {/* Quick Close Button */}
            <button
              type="button"
              onClick={handleDismissSession}
              aria-label="Dismiss update"
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isDarkMode ? 'border-white/10 text-white/70 hover:bg-white/10 hover:text-white' : 'border-emerald-200 text-emerald-900/70 hover:bg-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Release Notes Changelog Accordion */}
          {changelogBullets.length > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-500/20">
              <button
                type="button"
                onClick={() => setShowChangelog(v => !v)}
                className="flex items-center justify-between w-full text-xs font-bold opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.updateChangelogTitle || (isRtl ? 'ما الجديد في هذا التحديث:' : "What's new in this release:")}</span>
                </span>
                {showChangelog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showChangelog && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 space-y-1.5 overflow-hidden text-xs opacity-85 ps-2"
                  >
                    {changelogBullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Download Progress Bar if downloading on Android */}
          {downloadProgress !== null && (
            <div className="mt-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono font-bold mb-1 text-emerald-400">
                <span>{t.updateDownloadingProgress || (isRtl ? 'جارٍ التنزيل والتثبيت...' : 'Downloading and installing...')}</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden border border-emerald-500/30">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          {downloadError && (
            <p className="text-xs text-rose-400 mt-2 font-medium">
              ⚠️ {downloadError}
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="mt-4 pt-2 flex items-center justify-end gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleDismissSession}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                isDarkMode
                  ? 'border-white/10 hover:bg-white/10 text-white/80'
                  : 'border-emerald-200 hover:bg-white text-emerald-900'
              }`}
            >
              {t.updateDismissSessionBtn || (isRtl ? 'تجاهل هذا الإصدار مؤقتًا' : 'Dismiss for this session')}
            </button>

            <button
              type="button"
              onClick={handleTriggerUpdate}
              className="px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg active:scale-95"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>{t.updateNowBtn || (isRtl ? 'تحديث الآن' : 'Update Now')}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
