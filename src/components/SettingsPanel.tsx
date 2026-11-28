import React, { useState } from 'react';
import {
  Bell, ChevronDown, ChevronRight, Cloud, Fingerprint, Globe, KeyRound, Lock,
  Moon, RefreshCw, ShieldCheck, Sparkles, Sun, Upload, UserRound, ArrowRight
} from 'lucide-react';
import { AppLanguage, AppSettings } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';
import PasskeyAuth from './PasskeyAuth';
import AppSettingsUpdatesSection from './AppSettingsUpdatesSection';

interface SettingsPanelProps {
  settings: AppSettings;
  appLanguage: AppLanguage;
  currentUser?: { name?: string; email?: string } | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenApiKeys: () => void;
  onOpenBackup: () => void;
  onOpenWriteDiaryImport: () => void;
  onOpenLanguage: () => void;
  onOpenReminders: () => void;
  onOpenAccount: () => void;
  onOpenOnboarding: () => void;
  onTriggerLockScreenNotification: () => void;
}

type GroupId = 'security' | 'ai' | 'notifications' | 'sync' | 'appearance' | 'updates';

export default function SettingsPanel({
  settings,
  appLanguage,
  currentUser,
  onUpdateSettings,
  onOpenApiKeys,
  onOpenBackup,
  onOpenWriteDiaryImport,
  onOpenLanguage,
  onOpenReminders,
  onOpenAccount,
  onOpenOnboarding,
  onTriggerLockScreenNotification,
}: SettingsPanelProps) {
  const [openGroup, setOpenGroup] = useState<GroupId | null>('security');
  const t = getTranslation(appLanguage);
  const langInfo = getLanguageInfo(appLanguage);
  const isRtl = langInfo.dir === 'rtl';
  const toggleGroup = (id: GroupId) => setOpenGroup(current => current === id ? null : id);
  const toggle = (key: keyof AppSettings) => {
    onUpdateSettings({ [key]: !settings[key] } as Partial<AppSettings>);
  };
  const groups: Array<{ id: GroupId; title: string; subtitle: string; icon: React.ReactNode }> = [
    { id: 'security', title: t.settingsGroupSecurity || 'الأمان والخصوصية', subtitle: t.settingsGroupSecuritySub || 'قفل التطبيق وحماية بياناتك', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'ai', title: t.settingsGroupAi || 'الذكاء الاصطناعي والمفاتيح', subtitle: t.settingsGroupAiSub || 'مفاتيح Gemini ووضع توفير الاستهلاك', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'notifications', title: t.settingsGroupNotifications || 'الإشعارات وشاشة القفل', subtitle: t.settingsGroupNotificationsSub || 'التنبيهات والتذكيرات السريعة', icon: <Bell className="w-5 h-5" /> },
    { id: 'sync', title: t.settingsGroupSync || 'المزامنة والنسخ الاحتياطي', subtitle: t.settingsGroupSyncSub || 'احفظ بياناتك واستوردها بأمان', icon: <Cloud className="w-5 h-5" /> },
    { id: 'appearance', title: t.settingsGroupAppearance || 'المظهر واللغة', subtitle: t.settingsGroupAppearanceSub || 'الوضع الليلي ولغة التطبيق', icon: <Sun className="w-5 h-5" /> },
    { id: 'updates', title: t.settingsGroupUpdates || 'التطبيق والتحديثات', subtitle: t.settingsGroupUpdatesSub || 'الإصدار والجولة التعريفية', icon: <RefreshCw className="w-5 h-5" /> },
  ];
  const Switch = ({ checked, label }: { checked: boolean; label: string }) => (
    <span role="switch" aria-label={label} aria-checked={checked} className={`inline-flex items-center shrink-0 w-11 h-6 min-h-0 min-w-0 p-0.5 rounded-full transition-colors ${checked ? 'bg-[#2D6A4F] justify-end' : 'bg-slate-300 justify-start'}`}>
      <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
    </span>
  );
  const Row = ({ title, subtitle, icon, onClick, trailing }: { title: string; subtitle?: string; icon?: React.ReactNode; onClick?: () => void; trailing?: React.ReactNode }) => (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 py-3 px-4 text-start hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
      {icon && <span className="w-9 h-9 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F] inline-flex items-center justify-center shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">{title}</span>{subtitle && <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">{subtitle}</span>}</span>
      {trailing || <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 ${isRtl ? 'rotate-180' : ''}`} />}
    </button>
  );
  return (
    <section className="max-w-2xl mx-auto px-1 sm:px-0 pb-6" dir={langInfo.dir}>
      <header className="text-center py-4">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#2D6A4F]/10 text-[#2D6A4F] mb-2"><ShieldCheck className="w-6 h-6" /></div>
        <h3 className="font-black text-xl text-slate-800 dark:text-slate-100">{t.settingsTitle || 'الإعدادات'}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">{t.settingsSubtitle || 'تحكم سريع ومرتب في بلوميو'}</p>
      </header>
      <div className="space-y-3">
        {groups.map(group => {
          const isOpen = openGroup === group.id;
          return <div key={group.id} className="rounded-2xl bg-white dark:bg-slate-800/90 divide-y divide-slate-100 dark:divide-slate-700/60 shadow-sm overflow-hidden">
            <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 py-3 px-4 text-start hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
              <span className="w-10 h-10 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F] inline-flex items-center justify-center shrink-0">{group.icon}</span>
              <span className="flex-1 min-w-0"><span className="block text-sm font-black text-slate-800 dark:text-slate-100">{group.title}</span><span className="block text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">{group.subtitle}</span></span>
              {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className={`w-4 h-4 text-slate-400 ${isRtl ? 'rotate-180' : ''}`} />}
            </button>
            {isOpen && <div>
              {group.id === 'security' && <>
                <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/20"><PasskeyAuth appLanguage={appLanguage} biometricCredentialId={settings.biometricCredentialId} isAppLockEnabled={settings.appLockEnabled ?? settings.isAppLocked} appPinCode={settings.appPinCode} appPasswordHash={settings.appPasswordHash} appLockMethod={settings.appLockMethod} isBiometricEnabled={settings.isBiometricEnabled} onUpdateSecuritySettings={onUpdateSettings} /></div>
              </>}
              {group.id === 'ai' && <>
                <Row title={t.apiKeyTitle || 'مفاتيح Gemini API'} subtitle={`${settings.apiKeys?.length || (settings.userApiKey ? 1 : 0)}/5 • ${t.apiKeySub || 'إدارة المفاتيح والحالة الحية'}`} icon={<KeyRound className="w-4 h-4" />} onClick={onOpenApiKeys} />
                <Row title={t.aiMediaAccessTitle || 'الوصول إلى الوسائط وتوفير الاستهلاك'} subtitle={t.aiMediaAccessSub || 'يُضبط لكل محادثة أو تقرير عند الحاجة'} icon={<Sparkles className="w-4 h-4" />} />
              </>}
              {group.id === 'notifications' && <>
                <Row title={t.notificationsTitle || 'الإشعارات'} subtitle={t.notificationsSub || 'التنبيهات اليومية والتذكيرات'} icon={<Bell className="w-4 h-4" />} onClick={() => toggle('notificationsEnabled')} trailing={<Switch checked={settings.notificationsEnabled} label={t.notificationsTitle || 'الإشعارات'} />} />
                <Row title={t.lockscreenShortcutsTitle || 'شريط اختصارات شاشة القفل'} subtitle={t.lockscreenShortcutsDescription || 'أربع طرق وصول سريعة إلى ميزات بلوميو.'} icon={<Fingerprint className="w-4 h-4" />} onClick={() => { const enabled = settings.lockScreenWidgetEnabled === false; onUpdateSettings({ lockScreenWidgetEnabled: enabled }); if (enabled) onTriggerLockScreenNotification(); }} trailing={<Switch checked={settings.lockScreenWidgetEnabled !== false} label={t.lockscreenShortcutsTitle || 'شريط اختصارات شاشة القفل'} />} />
                <Row title={t.smartRemindersCardTitle || 'التذكيرات الذكية'} subtitle={t.smartRemindersCardDesc || 'إدارة التذكيرات والصلاحيات'} icon={<Bell className="w-4 h-4" />} onClick={onOpenReminders} />
              </>}
              {group.id === 'sync' && <>
                <Row title={t.backupTitle || 'المزامنة والنسخ الاحتياطي'} subtitle={t.backupSub || 'نسخة سحابية ومحلية وتصدير'} icon={<Cloud className="w-4 h-4" />} onClick={onOpenBackup} />
                <Row title={t.emailCloudSyncTitle || 'مزامنة السحابة بالإيميل'} subtitle={currentUser?.email || t.emailCloudSyncSub || 'اربط حسابك لمزامنة آمنة'} icon={<UserRound className="w-4 h-4" />} onClick={onOpenAccount} />
                <Row title={t.writeDiaryImportTitle || 'استيراد من WriteDiary'} subtitle={t.writeDiaryImportSub || 'استيراد يومياتك الحالية'} icon={<Upload className="w-4 h-4" />} onClick={onOpenWriteDiaryImport} />
              </>}
              {group.id === 'appearance' && <>
                <Row title={t.darkModeTitle || 'الوضع الداكن'} subtitle={t.darkModeSub || 'راحة للعين في الإضاءة المنخفضة'} icon={settings.isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} onClick={() => toggle('isDarkMode')} trailing={<Switch checked={settings.isDarkMode} label={t.darkModeTitle || 'الوضع الداكن'} />} />
                <Row title={t.languagesTitle || 'لغة التطبيق'} subtitle={langInfo.nativeName} icon={<Globe className="w-4 h-4" />} onClick={onOpenLanguage} />
                <Row title={t.floatingBackButtonTitle || 'زر الرجوع العائم'} subtitle={t.floatingBackButtonSub || 'زر عائم مرن للرجوع خطوة للوراء في أي مكان'} icon={<ArrowRight className="w-4 h-4" />} onClick={() => { const next = !settings.floatingBackButtonEnabled; onUpdateSettings({ floatingBackButtonEnabled: next }); try { localStorage.setItem('yawmiyati_floating_back_enabled', String(next)); } catch(_) {} }} trailing={<Switch checked={Boolean(settings.floatingBackButtonEnabled)} label={t.floatingBackButtonTitle || 'زر الرجوع العائم'} />} />
              </>}
              {group.id === 'updates' && <>
                <div className="px-4 py-3"><AppSettingsUpdatesSection appLanguage={appLanguage} /></div>
                <Row title={t.interactiveTourTitle || 'اكتشف بلوميو'} subtitle={t.onboardingDiscoverSub || 'جولة تعريفية بالمزايا'} icon={<RefreshCw className="w-4 h-4" />} onClick={onOpenOnboarding} />
              </>}
            </div>}
          </div>;
        })}
      </div>
      <p className="text-center text-[10px] text-slate-400 font-semibold mt-5">{t.privacyCredits || 'خصوصيتك أولاً، وبياناتك تبقى تحت سيطرتك.'}</p>
    </section>
  );
}
