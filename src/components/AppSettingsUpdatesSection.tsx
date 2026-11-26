import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, RefreshCw, CheckCircle2, DownloadCloud, AlertCircle, ShieldAlert,
  Smartphone, Globe, Info, Loader2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AppLanguage } from '../types';
import { 
  getInstalledAppVersion, 
  checkForAppUpdate, 
  installLatestUpdate, 
  AppUpdateCheckResult, 
  AppVersionInfo 
} from '../lib/appUpdater';

interface AppSettingsUpdatesSectionProps {
  appLanguage?: AppLanguage;
  id?: string;
}

const LOCALES: Record<string, {
  title: string;
  subtitle: string;
  webVersionNote: string;
  installedVersion: string;
  buildNumber: string;
  upToDate: string;
  updateAvailable: string;
  checkUpdatesBtn: string;
  checking: string;
  downloadAndInstallBtn: string;
  downloading: string;
  offlineNotice: string;
  permissionNotice: string;
  installingNotice: string;
  downloadError: string;
  releaseNotesTitle: string;
}> = {
  ar: {
    title: 'تحديثات التطبيق 📲',
    subtitle: 'التحقق من الإصدارات الجديدة وتنزيل التحديثات المباشرة دون وسيط',
    webVersionNote: 'أنت تستخدم إصدار الويب (محدّث تلقائياً بأحدث المزايا السحابية)',
    installedVersion: 'الإصدار المثبت:',
    buildNumber: 'رقم البناء:',
    upToDate: 'التطبيق على أحدث إصدار ✓',
    updateAvailable: 'يوجد تحديث جديد متاح 🚀',
    checkUpdatesBtn: 'التحقق من التحديثات',
    checking: 'جارٍ التحقق...',
    downloadAndInstallBtn: 'تنزيل وتثبيت التحديث الآن',
    downloading: 'جارٍ تنزيل حزمة التحديث...',
    offlineNotice: 'لا يوجد اتصال بالإنترنت حالياً للتحقق من التحديثات.',
    permissionNotice: 'يرجى منح إذن تثبيت التطبيقات من مصادر غير معروفة للتطبيق من الإعدادات لإتمام التثبيت تلقائياً.',
    installingNotice: 'تم التنزيل بنجاح! جارٍ فتح مثبت حزم أندرويد...',
    downloadError: 'فشل تنزيل ملف التحديث، يرجى المحاولة لاحقاً.',
    releaseNotesTitle: 'ما الجديد في هذا التحديث:'
  },
  en: {
    title: 'App Updates 📲',
    subtitle: 'Check for new releases and download seamless in-app APK updates',
    webVersionNote: 'You are on the web version (always running the latest release)',
    installedVersion: 'Installed Version:',
    buildNumber: 'Build Code:',
    upToDate: 'App is up to date ✓',
    updateAvailable: 'A new update is available 🚀',
    checkUpdatesBtn: 'Check for Updates',
    checking: 'Checking...',
    downloadAndInstallBtn: 'Download & Install Update Now',
    downloading: 'Downloading update package...',
    offlineNotice: 'Currently offline. Please reconnect to check for updates.',
    permissionNotice: 'Please allow "Install unknown apps" permission in Android settings to complete installation.',
    installingNotice: 'Download completed! Opening Android package installer...',
    downloadError: 'Failed to download update package. Please try again.',
    releaseNotesTitle: "What's new in this release:"
  }
};

export default function AppSettingsUpdatesSection({
  appLanguage = 'ar',
  id = 'settings-updates-section'
}: AppSettingsUpdatesSectionProps) {
  const isNative = Capacitor.isNativePlatform();
  const isRtl = appLanguage === 'ar';
  const t = LOCALES[appLanguage] || LOCALES.en;

  const [versionInfo, setVersionInfo] = useState<AppVersionInfo>({ versionCode: 100, versionName: '1.0.0' });
  const [updateResult, setUpdateResult] = useState<AppUpdateCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadBytes, setDownloadBytes] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [needsPermission, setNeedsPermission] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isErrorMessage, setIsErrorMessage] = useState(false);

  // Load initial version info
  useEffect(() => {
    getInstalledAppVersion().then((info) => {
      setVersionInfo(info);
    });
  }, []);

  const handleCheckUpdates = useCallback(async (manual = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (manual) {
        setStatusMessage(t.offlineNotice);
        setIsErrorMessage(true);
      }
      return;
    }

    setIsChecking(true);
    setStatusMessage(null);
    setIsErrorMessage(false);
    setNeedsPermission(false);

    try {
      const res = await checkForAppUpdate(true);
      setUpdateResult(res);
      setVersionInfo({
        versionCode: res.installedVersionCode,
        versionName: res.installedVersionName
      });

      if (manual) {
        if (res.hasUpdate) {
          setStatusMessage(`${t.updateAvailable} (${res.remoteVersionName || `v${res.remoteVersionCode}`})`);
          setIsErrorMessage(false);
        } else if (res.isOffline) {
          setStatusMessage(t.offlineNotice);
          setIsErrorMessage(true);
        } else {
          setStatusMessage(t.upToDate);
          setIsErrorMessage(false);
        }
      }
    } catch {
      if (manual) {
        setStatusMessage(t.offlineNotice);
        setIsErrorMessage(true);
      }
    } finally {
      setIsChecking(false);
    }
  }, [t]);

  // Initial check on mount if native
  useEffect(() => {
    if (isNative) {
      handleCheckUpdates(false);
    }
  }, [isNative, handleCheckUpdates]);

  const handleDownloadAndInstall = async () => {
    if (!updateResult?.apkUrl || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setNeedsPermission(false);
    setStatusMessage(null);
    setIsErrorMessage(false);

    const res = await installLatestUpdate(updateResult.apkUrl, (progress, currentBytes, totalBytes) => {
      setDownloadProgress(progress);
      setDownloadBytes({ current: currentBytes, total: totalBytes });
    });

    setIsDownloading(false);

    if (res.status === 'needs_permission') {
      setNeedsPermission(true);
      setStatusMessage(t.permissionNotice);
      setIsErrorMessage(true);
    } else if (res.status === 'installing') {
      setStatusMessage(t.installingNotice);
      setIsErrorMessage(false);
    } else {
      setStatusMessage(res.message || t.downloadError);
      setIsErrorMessage(true);
    }
  };

  const formatMB = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      id={id}
      className="bg-white border border-[#E2DCC8] rounded-[24px] p-5 shadow-3xs transition-all hover:border-[#8B9D83]/40 space-y-4"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/60 shadow-3xs">
            {isNative ? <Smartphone className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-[#2B3E50] text-sm">{t.title}</h4>
              {isNative ? (
                updateResult?.hasUpdate ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-3xs">
                    {t.updateAvailable}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-3xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{t.upToDate}</span>
                  </span>
                )
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-3xs">
                  Web App 🌐
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-bold leading-normal">
              {isNative ? t.subtitle : t.webVersionNote}
            </p>
          </div>
        </div>

        {isNative && (
          <button
            type="button"
            onClick={() => handleCheckUpdates(true)}
            disabled={isChecking || isDownloading}
            className="p-2.5 rounded-xl border border-[#E2DCC8] hover:bg-gray-50 active:scale-95 text-gray-600 hover:text-[#2B3E50] transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title={t.checkUpdatesBtn}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        )}
      </div>

      {/* Version Details Badge */}
      <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#E2DCC8]/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-sans font-bold">{t.installedVersion}</span>
          <span className="font-black text-[#2B3E50] bg-white px-2 py-0.5 rounded-md border border-[#E2DCC8]">
            v{versionInfo.versionName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-sans font-bold">{t.buildNumber}</span>
          <span className="font-black text-[#2B3E50] bg-white px-2 py-0.5 rounded-md border border-[#E2DCC8]">
            #{versionInfo.versionCode}
          </span>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            isErrorMessage
              ? 'bg-rose-50 border border-rose-200 text-rose-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {isErrorMessage ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Special Helper for Android Permission */}
      {needsPermission && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold space-y-1.5">
          <div className="flex items-center gap-1.5 font-black text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>تنبيه أمان أندرويد (تثبيت التطبيقات):</span>
          </div>
          <p className="leading-relaxed text-[11px]">{t.permissionNotice}</p>
        </div>
      )}

      {/* Live Download Progress Bar */}
      {isDownloading && (
        <div className="space-y-2 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-black text-emerald-950">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>{t.downloading}</span>
            </span>
            <span className="font-mono text-emerald-800">{downloadProgress}%</span>
          </div>
          <div className="w-full bg-emerald-200/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-200"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          {downloadBytes.total > 0 && (
            <div className="text-[10px] text-emerald-700 font-mono text-right dir-ltr">
              {formatMB(downloadBytes.current)} / {formatMB(downloadBytes.total)}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {isNative && updateResult?.hasUpdate && !isDownloading && (
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleDownloadAndInstall}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{t.downloadAndInstallBtn}</span>
            {updateResult.remoteVersionName && (
              <span className="bg-emerald-800/60 px-2 py-0.5 rounded-md text-[10px] font-mono">
                {updateResult.remoteVersionName}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
