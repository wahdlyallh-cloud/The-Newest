// Helper utility for WebAuthn & Capacitor Native Biometric registration & verification (Fingerprint / Face ID)

import { AppLanguage, getTranslation } from './languages';

/**
 * Check if app is running inside an iframe or constrained WebView
 */
export function isIframeOrWebView(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const inIframe = window.self !== window.top;
    const ua = navigator.userAgent || '';
    const isWebView =
      /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua) ||
      /wv/i.test(ua) ||
      /Android.*Version\/[0-9]\.[0-9]/i.test(ua);
    return inIframe || isWebView;
  } catch {
    return true;
  }
}

/**
 * Pre-check if biometrics are supported on this device/browser environment
 */
export async function isBiometricsSupported(): Promise<{
  supported: boolean;
  reason?: string;
  isNative?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'البيئة غير متاحة' };
  }

  // 1. Native Capacitor Biometrics check
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    if (BiometricAuth) {
      const check = await BiometricAuth.checkBiometry();
      if (check.isAvailable) {
        return { supported: true, isNative: true };
      }
    }
  } catch {
    // Not running under Capacitor or plugin not active
  }

  // 2. Check if running inside iframe / restricted WebView
  if (isIframeOrWebView()) {
    return {
      supported: false,
      reason: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة (نافذة المعاينة)، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي'
    };
  }

  // 3. WebAuthn platform authenticator pre-check
  if (!window.PublicKeyCredential) {
    return {
      supported: false,
      reason: 'المتصفح الحالية لا يدعم تقنية WebAuthn / Passkey'
    };
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        return {
          supported: false,
          reason: 'الجهاز الحالي لا يحوي مستشعر بصمة مفعّل أو غير متاح'
        };
      }
    }
    return { supported: true, isNative: false };
  } catch {
    return {
      supported: false,
      reason: 'تعذر الاتصال بمستشعر البصمة في هذا المتصفح'
    };
  }
}

// Helper: Convert ArrayBuffer to Base64url
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: Convert Base64url to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  let padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4 !== 0) {
    padded += '=';
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Register device biometrics (Fingerprint / Face ID) with full Try-Catch and PIN fallback
 */
export async function registerBiometrics(appLanguage: AppLanguage = 'ar'): Promise<{
  success: boolean;
  credentialId?: string;
  fallbackToPin?: boolean;
  error?: string;
  infoMessage?: string;
}> {
  const t = getTranslation(appLanguage);

  try {
    // Step 1: Pre-Check Support
    const check = await isBiometricsSupported();

    // Native Capacitor path
    if (check.isNative) {
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
        await BiometricAuth.authenticate({
          reason: t.biometricScanInstruction || 'تأكيد الهوية البيومترية لتأمين التطبيق',
          cancelTitle: 'إلغاء',
          allowDeviceCredential: true
        });
        return {
          success: true,
          credentialId: 'native_capacitor_biometrics_' + Date.now()
        };
      } catch (nativeErr: any) {
        console.warn('Native Capacitor biometric registration failed:', nativeErr);
        return {
          success: false,
          fallbackToPin: true,
          infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
          error: nativeErr?.message || 'فشلت قراءة البصمة من النظام المحمول'
        };
      }
    }

    if (!check.supported) {
      return {
        success: false,
        fallbackToPin: true,
        infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
        error: check.reason || 'البيئة الحالية لا تدعم البصمة'
      };
    }

    // WebAuthn Passkey Registration
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: t.appName || 'Hayat AI Pro',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: 'user@hayatai.app',
          displayName: t.guestUser || 'Hayat AI User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000
      }
    })) as PublicKeyCredential | null;

    if (!credential) {
      return {
        success: false,
        fallbackToPin: true,
        infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
        error: t.biometricCanceled || 'تم إلغاء قراءة البصمة'
      };
    }

    const credIdBase64 = bufferToBase64(credential.rawId);
    return { success: true, credentialId: credIdBase64 };
  } catch (err: any) {
    console.warn('WebAuthn / Biometrics registration error caught safely:', err);
    // Smooth silent fallback - do not trigger intrusive system alerts
    return {
      success: false,
      fallbackToPin: true,
      infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
      error: err?.name === 'NotAllowedError' ? 'تم رفض إذن البصمة أو البيئة المضمنة غير مسموحة' : err?.message
    };
  }
}

/**
 * Verify registered device biometrics (Fingerprint / Face ID)
 */
export async function verifyBiometrics(
  credentialId?: string,
  appLanguage: AppLanguage = 'ar'
): Promise<{ success: boolean; fallbackToPin?: boolean; error?: string; infoMessage?: string }> {
  const t = getTranslation(appLanguage);

  try {
    // Native Capacitor verification
    if (credentialId && credentialId.startsWith('native_capacitor_biometrics_')) {
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
        await BiometricAuth.authenticate({
          reason: t.biometricScanInstruction || 'تحقق البصمة',
          cancelTitle: 'إلغاء',
          allowDeviceCredential: true
        });
        return { success: true };
      } catch (e: any) {
        return {
          success: false,
          fallbackToPin: true,
          infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
          error: e?.message
        };
      }
    }

    const check = await isBiometricsSupported();
    if (!check.supported) {
      return {
        success: false,
        fallbackToPin: true,
        infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
        error: check.reason
      };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      timeout: 60000,
      userVerification: 'required'
    };

    if (credentialId) {
      publicKeyOptions.allowCredentials = [
        {
          id: base64ToBuffer(credentialId),
          type: 'public-key'
        }
      ];
    }

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyOptions
    });

    if (assertion) {
      return { success: true };
    } else {
      return {
        success: false,
        fallbackToPin: true,
        infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
        error: t.biometricCanceled
      };
    }
  } catch (err: any) {
    console.warn('Biometrics verification caught safely:', err);
    return {
      success: false,
      fallbackToPin: true,
      infoMessage: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي',
      error: err?.message || 'خطأ في التحقق البيومتري'
    };
  }
}
