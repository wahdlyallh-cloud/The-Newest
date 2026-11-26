import React, { useState, useEffect } from 'react';
import { Fingerprint, KeyRound, ShieldCheck, AlertCircle, CheckCircle2, Lock, Smartphone } from 'lucide-react';
import { AppLanguage, getTranslation } from '../lib/languages';
import { registerBiometrics, isBiometricsSupported, isIframeOrWebView } from '../lib/biometrics';
import { hashAppPassword } from '../lib/passwordSecurity';

interface PasskeyAuthProps {
  appLanguage?: AppLanguage;
  biometricCredentialId?: string;
  isAppLockEnabled?: boolean;
  appPinCode?: string;
  appPasswordHash?: string;
  appLockMethod?: 'pin' | 'password';
  onUpdateSecuritySettings: (newSettings: {
    biometricCredentialId?: string;
    isBiometricEnabled?: boolean;
    isAppLockEnabled?: boolean;
    appPinCode?: string;
    appPasswordHash?: string;
    appLockMethod?: 'pin' | 'password';
  }) => void;
}

export default function PasskeyAuth({
  appLanguage = 'ar',
  biometricCredentialId,
  isAppLockEnabled = false,
  appPinCode = '1234',
  appPasswordHash,
  appLockMethod = 'pin',
  onUpdateSecuritySettings
}: PasskeyAuthProps) {
  const t = getTranslation(appLanguage);

  const [pinCode, setPinCode] = useState<string>(appPinCode || '1234');
  const [password, setPassword] = useState<string>('');
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
        setFallbackNotice(t.biometricsFallbackPinNotice);
      }
    }
    checkSupport();
  }, [biometricCredentialId]);

  // Handle Linking Biometrics
  const handleLinkBiometrics = async () => {
    setIsLoading(true);
    setFallbackNotice(null);
    setSuccessNotice(null);

    try {
      // Pre-check support first
      const preCheck = await isBiometricsSupported();
      if (!preCheck.supported) {
        setFallbackNotice(
          preCheck.reason ||
            t.biometricsFallbackPinNotice
        );
        // Fallback to PIN Lock automatically
        setIsLockEnabled(true);
        onUpdateSecuritySettings({
          isAppLockEnabled: true,
          appPinCode: pinCode || '1234'
        });
        setIsLoading(false);
        return;
      }

      // Execute WebAuthn / Capacitor biometric registration safely inside Try-Catch
      const res = await registerBiometrics(appLanguage);

      if (res.success && res.credentialId) {
        setSuccessNotice(t.biometricsSuccessNotice);
        onUpdateSecuritySettings({
          biometricCredentialId: res.credentialId,
          isBiometricEnabled: true,
          isAppLockEnabled: true,
          appPinCode: pinCode || '1234'
        });
      } else {
        // Smooth fallback without popup alert
        setFallbackNotice(
          res.infoMessage ||
            t.biometricsFallbackPinNotice
        );
        setIsLockEnabled(true);
        onUpdateSecuritySettings({
          isAppLockEnabled: true,
          appPinCode: pinCode || '1234'
        });
      }
    } catch (err: any) {
      console.warn('Biometric linking error handled gracefully:', err);
      setFallbackNotice(
        t.biometricsFallbackPinNotice
      );
      setIsLockEnabled(true);
      onUpdateSecuritySettings({
        isAppLockEnabled: true,
        appPinCode: pinCode || '1234'
      });
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

  const handlePasswordChange = async (value: string) => {
    setPassword(value);
    if (value.length >= 6) {
      onUpdateSecuritySettings({ appLockMethod: 'password', appPasswordHash: await hashAppPassword(value), isAppLockEnabled: isLockEnabled });
    }
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
              {t.passkeyAndPinSecurity}
            </h3>
            <p className="text-[11px] text-gray-500 font-bold">
              {t.protectAppWithPinBiometrics}
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
            <span>{t.securitySystemAlert}</span>
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
              {t.pinCode4Digits}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-bold">
            {t.defaultPin1234}
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
          <span className="text-xs font-black text-[#2B3E50]">{t.passwordLockMode}</span>
          <select value={appLockMethod} onChange={(e) => onUpdateSecuritySettings({ appLockMethod: e.target.value as 'pin' | 'password', isAppLockEnabled: isLockEnabled })} className="rounded-lg border border-[#E5E1D4] px-2 py-1 text-xs font-bold">
            <option value="pin">{t.pinCode4Digits}</option>
            <option value="password">{t.passwordLockLabel}</option>
          </select>
        </div>
        {appLockMethod === 'password' && <input type="password" value={password} onChange={(e) => handlePasswordChange(e.target.value)} placeholder={t.passwordLockPlaceholder} className="w-full rounded-xl border border-[#E5E1D4] px-3 py-2 text-sm outline-none focus:border-[#8B9D83]" />}
        {appLockMethod === 'password' && !appPasswordHash && <p className="text-[10px] font-bold text-amber-700">{t.passwordLockInvalid}</p>}
      </div>

      {/* Biometric Passkey Hardware Registration Box */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D4] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Fingerprint className="w-5 h-5 text-amber-600" />
            <h4 className="text-xs font-black text-[#2B3E50]">
              {t.deviceBiometricsPasskey}
            </h4>
          </div>

          {biometricCredentialId ? (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center space-x-1 space-x-reverse">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{t.linkedAndActive}</span>
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-lg">
              {t.notLinked}
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
              ? (t.scanningBiometrics)
              : biometricCredentialId
              ? (t.updateBiometricBtn) : (t.linkBiometricBtn)}
          </span>
        </button>
      </div>

      {/* Capacitor Native APK Guidance */}
      <div className="bg-[#F4F1EA] border border-[#E5E1D4] rounded-2xl p-3 text-[11px] text-gray-600 font-bold flex items-start space-x-2 space-x-reverse">
        <Smartphone className="w-4 h-4 text-[#8B9D83] shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-[#2B3E50]">
            {t.androidCapacitorBiometrics}
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
