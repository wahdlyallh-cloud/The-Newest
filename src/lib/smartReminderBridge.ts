import { registerPlugin, Capacitor } from '@capacitor/core';
import { AppReminder } from '../types';

export interface SmartReminderPluginInterface {
  checkPermissions(): Promise<{ notificationsGranted: boolean; overlayGranted: boolean }>;
  requestNotificationPermission(): Promise<{ notificationsGranted: boolean }>;
  openOverlayPermissionSettings(): Promise<void>;
  pickAlarmSound(): Promise<{ uri: string; title: string; cancelled?: boolean }>;
  pickAudioFile(): Promise<{ uri: string; title: string; cancelled?: boolean }>;
  previewAlarmSound(options: { uri?: string; repeatCount?: number }): Promise<{ playing: boolean }>;
  stopPreviewSound(): Promise<{ stopped: boolean }>;
  scheduleReminder(options: {
    id: string;
    title: string;
    body: string;
    triggerAtMillis: number;
    repeatDaily: boolean;
    isQuestion: boolean;
    yesLabel?: string;
    noLabel?: string;
    showOverlay?: boolean;
    alertMode?: 'notification' | 'alarm';
    soundUri?: string;
    repeatCount?: number;
    snoozeMinutes?: number;
  }): Promise<{ success: boolean; id: string; scheduledAt: number }>;
  cancelReminder(options: { id: string }): Promise<{ success: boolean; id: string }>;
  triggerTestReminder(options: {
    title?: string;
    body?: string;
    isQuestion?: boolean;
    yesLabel?: string;
    noLabel?: string;
    showOverlay?: boolean;
    alertMode?: 'notification' | 'alarm';
    soundUri?: string;
    repeatCount?: number;
    snoozeMinutes?: number;
  }): Promise<{ success: boolean; id: string; delaySeconds: number }>;
  consumePendingResponses(): Promise<{
    responses: Array<{ reminderId: string; answer: string; answeredAt: number }>;
  }>;
  setLockScreenNotification(options: {
    enabled: boolean;
    title?: string;
    body?: string;
    writeLabel?: string;
    voiceLabel?: string;
    moodLabel?: string;
    advisorLabel?: string;
  }): Promise<{ enabled: boolean }>;
  getPendingQuickAction(): Promise<{ action: '' | 'write' | 'voice' | 'mood' | 'advisor' }>;
}

let previewAudioEl: HTMLAudioElement | null = null;

const SmartReminder = registerPlugin<SmartReminderPluginInterface>('SmartReminder', {
  web: {
    async checkPermissions() {
      const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      return { notificationsGranted: granted, overlayGranted: false };
    },
    async requestNotificationPermission() {
      if (typeof Notification !== 'undefined') {
        const res = await Notification.requestPermission();
        return { notificationsGranted: res === 'granted' };
      }
      return { notificationsGranted: false };
    },
    async openOverlayPermissionSettings() {
      // No-op on web
    },
    async pickAlarmSound() {
      return { uri: '', title: 'النغمة الافتراضية' };
    },
    async pickAudioFile() {
      return { uri: '', title: 'ملف صوتي من الجهاز' };
    },
    async previewAlarmSound(options) {
      if (previewAudioEl) {
        previewAudioEl.pause();
        previewAudioEl = null;
      }
      if (options.uri) {
        try {
          previewAudioEl = new Audio(options.uri);
          previewAudioEl.play().catch(() => {});
        } catch {}
      }
      return { playing: true };
    },
    async stopPreviewSound() {
      if (previewAudioEl) {
        previewAudioEl.pause();
        previewAudioEl = null;
      }
      return { stopped: true };
    },
    async scheduleReminder(options) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const delay = Math.max(0, options.triggerAtMillis - Date.now());
        setTimeout(() => {
          try {
            new Notification(options.title, { body: options.body });
          } catch {}
        }, delay);
      }
      return { success: true, id: options.id, scheduledAt: options.triggerAtMillis };
    },
    async cancelReminder(options) {
      return { success: true, id: options.id };
    },
    async triggerTestReminder(options) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setTimeout(() => {
          try {
            new Notification(options.title || 'هل شربت الماء الآن؟ 💧', {
              body: options.body || 'تذكير صحي عائم من حياة AI'
            });
          } catch {}
        }, 5000);
      }
      return { success: true, id: 'test_web', delaySeconds: 5 };
    },
    async consumePendingResponses() {
      return { responses: [] };
    },
    async setLockScreenNotification() {
      return { enabled: false };
    },
    async getPendingQuickAction() {
      return { action: '' as const };
    }
  }
});

export const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Calculates next trigger timestamp for a reminder with "HH:MM"
 */
export function calculateNextTriggerMillis(timeStr: string): number {
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime();
}

/**
 * Synchronizes a reminder with native Android AlarmManager
 */
export async function syncReminderNative(reminder: AppReminder): Promise<void> {
  if (!isNativeAndroid) return;

  if (!reminder.active) {
    try {
      await SmartReminder.cancelReminder({ id: reminder.id });
    } catch (e) {
      console.warn('Failed to cancel reminder on native:', e);
    }
    return;
  }

  try {
    const triggerAt = calculateNextTriggerMillis(reminder.time);
    await SmartReminder.scheduleReminder({
      id: reminder.id,
      title: `${reminder.categoryIcon || '🔔'} ${reminder.title}`,
      body: reminder.motivationalNote || '',
      triggerAtMillis: triggerAt,
      repeatDaily: reminder.frequency === 'daily',
      isQuestion: !!reminder.isQuestion,
      yesLabel: reminder.yesLabel || 'نعم',
      noLabel: reminder.noLabel || 'لا',
      showOverlay: reminder.showOverlay ?? true,
      alertMode: reminder.alertMode || 'notification',
      soundUri: reminder.soundUri || '',
      repeatCount: reminder.repeatCount || 1,
      snoozeMinutes: reminder.snoozeMinutes !== undefined ? reminder.snoozeMinutes : 5
    });
  } catch (e) {
    console.warn('Failed to schedule reminder on native:', e);
  }
}

/**
 * Synchronizes all active reminders
 */
export async function syncAllRemindersNative(reminders: AppReminder[]): Promise<void> {
  if (!isNativeAndroid) return;
  for (const r of reminders) {
    await syncReminderNative(r);
  }
}

export default SmartReminder;