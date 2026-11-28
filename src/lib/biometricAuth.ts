import { Capacitor, registerPlugin } from '@capacitor/core';

export interface BiometricAuthPlugin {
  checkAvailability(): Promise<{ available: boolean; hasFingerprint: boolean; hasFace: boolean; status: number }>;
  authenticate(options: { title: string; subtitle: string; negativeButtonText: string }): Promise<{ authenticated: boolean; error?: string }>;
}

export const NativeBiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth');

export async function checkNativeBiometricAvailability() {
  if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')) {
    return { available: false, hasFingerprint: false, hasFace: false, status: -1 };
  }
  return NativeBiometricAuth.checkAvailability();
}

export async function authenticateNativeBiometric(language = 'ar') {
  if (!(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')) {
    return { authenticated: false, error: 'NATIVE_ANDROID_ONLY' };
  }
  return NativeBiometricAuth.authenticate({
    title: language === 'ar' ? 'فتح بلوميو' : 'Unlock Blomeo',
    subtitle: language === 'ar' ? 'استخدم بصمة الإصبع أو الوجه' : 'Use fingerprint or face unlock',
    negativeButtonText: language === 'ar' ? 'استخدام رمز الدخول' : 'Use passcode'
  });
}
