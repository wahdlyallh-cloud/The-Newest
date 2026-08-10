import React, { useState, useEffect } from 'react';
import { Fingerprint, KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Lock, Smartphone } from 'lucide-react';
import { AppLanguage, getTranslation } from '../lib/languages';
import { registerBiometrics, isBiometricsSupported, isIframeOrWebView } from '../lib/biometrics';

interface PasskeyAuthProps {
  appLanguage?: AppLanguage;
  biometricCredentialId?: string;
  isAppLockEnabled?: boolean;
  appPinCode?: string;
  onUpdateSecuritySettings: (newSettings: {
    biometricCredentialId?: string;
    isBiometricEnabled?: boolean;
    isAppLockEnabled?: boolean;
    appPinCode?: string;
  }) => void;
}

export default function PasskeyAuth({
  appLanguage = 'ar',
  biometricCredentialId,
  isAppLockEnabled = false,
  appPinCode = '1234',
  onUpdateSecuritySettings
}: PasskeyAuthProps) {
  const t = getTranslation(appLanguage);

  const [pinCode, setPinCode] = useState<string>(appPinCode || '1234');
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(isAppLockEnabled);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<{
    checked: boolean;
    supported: boolean;
    reason?: string;
  }>({ checked: false, supported: false });

  // Pre-check biometric support on mount
  useEffect(() => {
    async function checkSupport() {
      const res = await isBiometricsSupported();
      setBiometricStatus({
        checked: true,
        supported: res.supported,
        reason: res.reason
      });

      // If running inside iframe / restricted environment, show default fallback notice directly
      if (isIframeOrWebView() && !biometricCredentialId) {
        setFallbackNotice('البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي');
      }
    }
    checkSupport();
  }, [biometricCredentialId]);

  // Handle Linking Biometrics — fully wrapped in try/catch with automatic PIN fallback
  const handleLinkBiometrics = async () => {
    setIsLoading(true);
    setFallbackNotice(null);
    setSuccessNotice(null);

    // Defensive wrapper: catches any environment where navigator.credentials is unavailable
    const _fallbackToPinLock = (reason?: string) => {
      setFallbackNotice(
        reason ||
          '\u0627\u0644\u0628\u0635\u0645\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u0627\u064b \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u062a\u0635\u0641\u062d/\u0627\u0644\u0628\u064a\u0626\u0629\u060c \u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0642\u0641\u0644 \u0628\u0631\u0645\u0632 \u0627\u0644\u0640 PIN \u0643\u062e\u064a\u0627\u0631 \u0623\u0645\u0627\u0646 \u0631\u0626\u064a\u0633\u064a'
      );
      setIsLockEnabled(true);
      onUpdateSecuritySettings({
        isAppLockEnabled: true,
        appPinCode: pinCode || '1234'
      });
      setIsLoading(false);
    };

    try {
      // Guard: check if navigator.credentials is even available
      if (typeof navigator === 'undefined' || !navigator.credentials) {
        _fallbackToPinLock();
        return;
      }

      // Pre-check biometric support
      let preCheck: { supported: boolean; reason?: string; isNative?: boolean };
      try {
        preCheck = await isBiometricsSupported();
      } catch {
        _fallbackToPinLock();
        return;
      }

      if (!preCheck.supported) {
        _fallbackToPinLock(preCheck.reason);
        return;
      }

      // Execute WebAuthn / Capacitor biometric registration — all navigator.credentials
      // calls are inside registerBiometrics which has its own try/catch.
      let res: { success: boolean; credentialId?: string; infoMessage?: string; error?: string };
      try {
        res = await registerBiometrics(appLanguage);
      } catch {
        _fallbackToPinLock();
        return;
      }

      if (res.success && res.credentialId) {
        setSuccessNotice('\u062a\u0645 \u0631\u0628\u0637 \u0628\u0635\u0645\u0629 \u0627\u0644\u062c\u0647\u0627\u0632 \u0628\u0646\u062c\u0627\u062d! \u064a\u0645\u0643\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647\u0627 \u0644\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0633\u0631\u064a\u0639.');
        onUpdateSecuritySettings({
          biometricCredentialId: res.credentialId,
          isBiometricEnabled: true,
          isAppLockEnabled: true,
          appPinCode: pinCode || '1234'
        });
      } else {
        _fallbackToPinLock(res.infoMessage);
      }
    } catch (err: any) {
      // Final safety net — catches anything that slipped through
      console.warn('Biometric linking error handled gracefully:', err);
      _fallbackToPinLock();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPinCode(clean);
    onUpdateSecuritySettings({
      appPinCode: clean,
      isAppLockEnabled: isLockEnabled
    });
  };

  const handleToggleLock = (enabled: boolean) => {
    setIsLockEnabled(enabled);
    onUpdateSecuritySettings({
      isAppLockEnabled: enabled,
      appPinCode: pinCode || '1234'
    });
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E1D4] rounded-3xl p-5 space-y-5 shadow-xs" dir={appLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E1D4] pb-3">
        <div className="flex items-center space-x-2.5 space-x-reverse">
          <div className="p-2.5 bg-[#8B9D83] text-white rounded-2xl shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2B3E50]">
              {appLanguage === 'ar' ? 'إعدادات القفل والبصمة (Passkey & PIN)' : 'Passkey & PIN Security'}
            </h3>
            <p className="text-[11px] text-gray-500 font-bold">
              {appLanguage === 'ar' ? 'حماية الخصوصية عبر الـ PIN وبصمة الإصبع/الوجه' : 'Protect your app with PIN & Biometric Authentication'}
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isLockEnabled}
            onChange={(e) => handleToggleLock(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B9D83]"></div>
        </label>
      </div>

      {/* Fallback Inline Alert Banner */}
      {fallbackNotice && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-900 text-xs font-bold space-y-1.5 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2 space-x-reverse text-amber-800 font-black">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تنبيه نظام الأمان (Fallback Security Notice)</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-amber-900/90 font-bold">
            {fallbackNotice}
          </p>
        </div>
      )}

      {/* Success Notice */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-emerald-900 text-xs font-bold flex items-center space-x-2 space-x-reverse animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* PIN Code Section */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D4] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <KeyRound className="w-4 h-4 text-[#8B9D83]" />
            <span className="text-xs font-black text-[#2B3E50]">
              {appLanguage === 'ar' ? 'رمز الـ PIN المكون من 4 أرقام' : '4-Digit Secret PIN Code'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-bold">
            {appLanguage === 'ar' ? 'الافتراضي: 1234' : 'Default: 1234'}
          </span>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          <input
            type="password"
            maxLength={4}
            value={pinCode}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="1234"
            className="w-28 text-center text-lg font-mono font-black tracking-widest bg-[#FAF8F5] border border-[#E5E1D4] focus:border-[#8B9D83] focus:bg-white rounded-xl py-2 px-3 outline-none text-[#2B3E50]"
          />
          <span className="text-[11px] text-gray-500 font-bold leading-tight">
            {appLanguage === 'ar'
              ? 'رمز PIN يحمي مذكراتك بخصوصية تامة عند قفل الشاشة'
              : 'PIN code secures your entries upon app exit'}
          </span>
        </div>
      </div>

      {/* Biometric Passkey Hardware Registration Box */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D4] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Fingerprint className="w-5 h-5 text-amber-600" />
            <h4 className="text-xs font-black text-[#2B3E50]">
              {appLanguage === 'ar' ? 'بصمة الإصبع / الوجه (Biometrics & Passkey)' : 'Device Biometrics & Passkey'}
            </h4>
          </div>

          {biometricCredentialId ? (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center space-x-1 space-x-reverse">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{appLanguage === 'ar' ? 'مربوط ومفعّل ✅' : 'Linked & Active ✅'}</span>
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-lg">
              {appLanguage === 'ar' ? 'غير مربوط ⚠️' : 'Not Linked ⚠️'}
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
          {appLanguage === 'ar'
            ? 'اربط بصمة جهازك الرسمية (بصمة الإصبع أو الوجه) لفتح التطبيق بلمسة واحدة سهلة وسريعة.'
            : 'Link your official device biometrics to unlock the app with a single touch.'}
        </p>

        <button
          type="button"
          onClick={handleLinkBiometrics}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center space-x-2 space-x-reverse cursor-pointer disabled:opacity-50"
        >
          <Fingerprint className="w-4 h-4 text-white" />
          <span>
            {isLoading
              ? (appLanguage === 'ar' ? 'جاري الفحص وربط البصمة...' : 'Scanning Biometrics...')
              : biometricCredentialId
              ? (appLanguage === 'ar' ? 'تحديث أو إعادة ربط البصمة 👆👤' : 'Update Device Biometric 👆👤')
              : (appLanguage === 'ar' ? 'ربط وتفعيل بصمة الجهاز الآن 👆👤' : 'Link Device Biometric Now 👆👤')}
          </span>
        </button>
      </div>

      {/* Capacitor Native APK Guidance */}
      <div className="bg-[#F4F1EA] border border-[#E5E1D4] rounded-2xl p-3 text-[11px] text-gray-600 font-bold flex items-start space-x-2 space-x-reverse">
        <Smartphone className="w-4 h-4 text-[#8B9D83] shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-[#2B3E50]">
            {appLanguage === 'ar' ? 'تطبيقات الأندرويد المحولة (Capacitor APK):' : 'Android APK Native Biometrics:'}
          </span>
          <p className="text-gray-500 font-medium leading-relaxed mt-0.5">
            {appLanguage === 'ar'
              ? 'عند تحويل التطبيق لملف APK عبر Capacitor، يتم استخدام مستشعر أندرويد الحيوي المباشر تلقائياً لتأمين الشاشة بمرونة.'
              : 'When built as a native APK, direct Android OS biometric sensors are automatically utilized.'}
          </p>
        </div>
      </div>
    </div>
  );
}
