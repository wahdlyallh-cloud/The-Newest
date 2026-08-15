import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AppLanguage, getLanguageInfo } from '../lib/languages';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught app error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleClearCacheAndReload = async () => {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (e) {
      console.error("Failed to clear caches/SW in ErrorBoundary:", e);
    }
    if (typeof window !== 'undefined') {
      window.location.href = window.location.pathname + '?cacheBust=' + Date.now();
    }
  };

  public override render() {
    if (this.state.hasError) {
      let isRtl = false;
      let title = "Interface Recovery 🛡️";
      let desc = "An unexpected runtime notice occurred. Your data is stored safely. You can reload or clear cache to resume.";
      let reloadBtn = "Reload Page 🔄";
      let clearCacheBtn = "Clear Cache & Reload 🧹";

      try {
        const savedLang = (typeof window !== 'undefined' ? localStorage.getItem('app_language') : null) || 'ar';
        const langCode = (['ar', 'en', 'fr', 'de', 'es', 'ru', 'zh', 'tr', 'hi', 'it'].includes(savedLang) ? savedLang : 'ar') as AppLanguage;
        const langInfo = getLanguageInfo(langCode);
        isRtl = langInfo?.dir === 'rtl';

        const isAr = langCode === 'ar';
        if (isAr) {
          title = "استعادة الواجهة والأمان 🛡️";
          desc = "حدث تنبيه غير متوقع أثناء التشغيل. تم الحفاظ على بياناتك، يمكنك إعادة التحميل أو مسح التخزين المؤقت لاستعادة التطبيق فوراً.";
          reloadBtn = "إعادة تحميل الصفحة 🔄";
          clearCacheBtn = "تحديث عميق وتفريغ الكاش 🧹";
        }
      } catch (err) {
        console.error("Error reading language in ErrorBoundary render:", err);
      }

      return (
        <div className={`min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center text-[#3A3A3A] font-sans ${isRtl ? 'dir-rtl' : 'dir-ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#E2DCC8] shadow-lg space-y-4">
            <div className="text-4xl">🎙️</div>
            <h1 className="text-xl font-bold text-[#2B3E50]">{title}</h1>
            <p className="text-xs text-gray-600 leading-relaxed">
              {desc}
            </p>
            {this.state.error?.message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-mono text-left overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={async () => {
                  this.setState({ hasError: false, error: null });
                  if (typeof window !== 'undefined' && 'caches' in window) {
                    try {
                      const keys = await caches.keys();
                      await Promise.all(keys.map(k => caches.delete(k)));
                    } catch (_) {}
                  }
                  window.location.href = window.location.pathname + '?reload=' + Date.now();
                }}
                className="px-5 py-2.5 bg-[#8B9D83] text-white rounded-xl font-bold text-xs hover:bg-[#7A8C72] transition-colors shadow-sm cursor-pointer"
              >
                {reloadBtn}
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
              >
                {clearCacheBtn}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


