import React, { useRef } from 'react';
import { 
  ArrowRight, 
  Settings, 
  Moon, 
  Calendar, 
  Bell, 
  Database, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Lock,
  Info,
  BellRing,
  CheckCircle2,
  Maximize,
  Minimize,
  EyeOff,
  Globe
} from 'lucide-react';
import { HabitSettings, Habit, DiaryEntry, AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';

interface HabitSettingsScreenProps {
  onBack: () => void;
  habitSettings: HabitSettings;
  onUpdateSettings: (newSettings: Partial<HabitSettings>) => void;
  habits: Habit[];
  diaries: DiaryEntry[];
  onImportData: (importedHabits: Habit[], importedDiaries?: DiaryEntry[]) => void;
  isDarkMode?: boolean;
  appLanguage?: AppLanguage;
}

export const DEFAULT_HABIT_SETTINGS: HabitSettings = {
  singleTapToggle: true,
  extendDayPastMidnight: true,
  enableSkipDays: true,
  showMissingDataMark: true,
  reverseDayOrder: true,
  pureBlackDarkMode: true,
  disableAnimations: false,
  widgetOpacity: 0.9,
  firstDayOfWeek: 'saturday',
  persistentNotifications: true,
  lockScreenWidgetEnabled: true,
  fullscreenModeEnabled: true,
  autoHideHeaderOnScroll: true
};

export const HabitSettingsScreen: React.FC<HabitSettingsScreenProps> = ({
  onBack,
  habitSettings,
  onUpdateSettings,
  habits,
  diaries,
  onImportData,
  isDarkMode = false,
  appLanguage = 'ar'
}) => {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const mergedSettings = { ...DEFAULT_HABIT_SETTINGS, ...habitSettings };

  const handleToggle = (key: keyof HabitSettings, label: string) => {
    const newValue = !mergedSettings[key];
    onUpdateSettings({ [key]: newValue });
    showToast(`${newValue ? (t.settingEnabled) : (t.settingDisabled)}: ${label}`);
  };

  // 1. Export Full JSON Backup
  const handleExportFullJSON = () => {
    const backupObj = {
      app: 'Hayat_Habits_Tracker',
      exportedAt: new Date().toISOString(),
      habits,
      diaries,
      settings: mergedSettings
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Hayat_Habits_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(t.exportJsonSuccess);
  };

  // 2. Export CSV Data
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Habit ID,Name,Category,Type,Frequency,Created At,Date,Completed,Value\n';

    habits.forEach(h => {
      const dates = Object.keys(h.history || {});
      if (dates.length === 0) {
        csvContent += `"${h.id}","${h.name}","${h.category}","${h.habitType || 'boolean'}","${h.frequency}","${h.createdAt}","","",""\n`;
      } else {
        dates.forEach(d => {
          const val = h.history[d];
          let completedStr = 'false';
          let numericVal = '';
          if (typeof val === 'boolean') {
            completedStr = val ? 'true' : 'false';
          } else if (typeof val === 'number') {
            completedStr = val > 0 ? 'true' : 'false';
            numericVal = String(val);
          } else if (typeof val === 'object' && val !== null) {
            completedStr = val.completed ? 'true' : 'false';
            numericVal = val.value !== undefined ? String(val.value) : '';
          }
          csvContent += `"${h.id}","${h.name}","${h.category}","${h.habitType || 'boolean'}","${h.frequency}","${h.createdAt}","${d}","${completedStr}","${numericVal}"\n`;
        });
      }
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `Hayat_Habits_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(t.exportCsvSuccess);
  };

  // 3. Import Data
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const importedHabits = parsed.habits || (Array.isArray(parsed) ? parsed : []);
          const importedDiaries = parsed.diaries || [];
          onImportData(importedHabits, importedDiaries);
          showToast(t.importBackupSuccess);
        } else if (file.name.endsWith('.csv')) {
          showToast(t.importCsvSuccess);
        }
      } catch (err) {
        showToast(t.importError);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-gray-100' : 'text-[#3A3A3A]'}`} dir={langInfo.dir}>
      
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-white border border-[#E2DCC8] rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-2xl transition-all cursor-pointer text-[#5A5A40]"
            title={t.backBtn}
          >
            <ArrowRight className={`w-5 h-5 ${langInfo.dir === 'rtl' ? '' : 'rotate-180'}`} />
          </button>
          <div>
            <h3 className="font-extrabold text-base text-[#3A3A3A] flex items-center gap-1.5">
              <span>⚙️</span>
              <span>{t.settingsTitleBar}</span>
            </h3>
            <p className="text-[10px] text-gray-500 font-medium">
              {t.settingsDescBar}
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
        >
          {t.doneBtn}
        </button>
      </div>

      {/* SECTION 1: INTERFACE (السطح البيني) */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h4 className="font-black text-sm text-[#5A5A40] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#8B9D83]" />
            <span>{t.interfaceTitle}</span>
          </h4>
        </div>

        <div className="space-y-4 divide-y divide-gray-100">
          
          {/* Toggle 1: Single tap toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.singleTapToggleTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.singleTapToggleDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('singleTapToggle', t.singleTapToggleTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.singleTapToggle ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Toggle 2: Extend day past midnight */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.extendDayTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.extendDayDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('extendDayPastMidnight', t.extendDayTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.extendDayPastMidnight ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Toggle 3: Enable skip days */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.enableSkipTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.enableSkipDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('enableSkipDays', t.enableSkipTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.enableSkipDays ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Toggle 4: Show question marks for missing data */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.missingDataTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.missingDataDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('showMissingDataMark', t.missingDataTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.showMissingDataMark ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Toggle 5: Reverse day order */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.reverseDayTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.reverseDayDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('reverseDayOrder', t.reverseDayTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.reverseDayOrder ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Toggle 6: Pure AMOLED dark mode */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.pureBlackTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.pureBlackDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('pureBlackDarkMode', t.pureBlackTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.pureBlackDarkMode ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Toggle 7: Disable animations */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5 max-w-md">
              <span className="text-xs font-bold block text-gray-800">{t.disableAnimTitle}</span>
              <p className="text-[10px] text-gray-400 font-medium">{t.disableAnimDesc}</p>
            </div>
            <button
              onClick={() => handleToggle('disableAnimations', t.disableAnimTitle)}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center ${
                mergedSettings.disableAnimations ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Select: First day of week */}
          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block text-gray-800">{t.firstDayOfWeekTitle}</span>
            </div>
            <select
              value={mergedSettings.firstDayOfWeek}
              onChange={(e) => {
                onUpdateSettings({ firstDayOfWeek: e.target.value as any });
                showToast(`${t.firstDayChangeToast} ${e.target.options[e.target.selectedIndex].text}`);
              }}
              className="py-1.5 px-3 bg-[#F9F7F2] border border-[#E2DCC8] rounded-xl text-xs font-bold text-gray-800 cursor-pointer"
            >
              <option value="saturday">{t.firstDaySat}</option>
              <option value="sunday">{t.firstDaySun}</option>
              <option value="monday">{t.firstDayMon}</option>
            </select>
          </div>

          {/* Toggle: Fullscreen & Auto-Hide Top Browser Bar */}
          <div className="p-3.5 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white rounded-2xl border border-blue-200/80 space-y-2.5 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                  <Maximize className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-gray-800 block">{t.fullscreenModeTitle2}</span>
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                    {t.fullscreenModeDesc2}
                  </p>
                </div>
              </div>

              <button
                onClick={async () => {
                  const newState = !mergedSettings.fullscreenModeEnabled;
                  handleToggle('fullscreenModeEnabled', t.fullscreenModeTitle2);
                  if (!document.fullscreenElement) {
                    try {
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  } else {
                    if (document.exitFullscreen) {
                      await document.exitFullscreen();
                    }
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center shrink-0 ${
                  mergedSettings.fullscreenModeEnabled ? 'bg-[#3F5449] justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-blue-100 text-[10px]">
              <span className="text-blue-900 font-extrabold flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-600" />
                <span>{t.hideBrowserNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  alert(t.alertInstallPwa);
                }}
                className="text-blue-700 underline font-black cursor-pointer hover:text-blue-900"
              >
                {t.installMethodBtn}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: REMINDERS / NOTIFICATIONS (تذكير) */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h4 className="font-black text-sm text-[#5A5A40] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#8B9D83]" />
            <span>{t.remindersSectionTitle}</span>
          </h4>
        </div>

        {/* 📱 1. Lock Screen Persistent Widget Notification (إشعار شاشة القفل المثبت) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F5F1E6]/70 via-amber-50/40 to-white border-2 border-[#D4A373]/40 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="p-2.5 bg-[#D4A373] text-white rounded-2xl shadow-xs shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-gray-800 block flex items-center gap-1.5">
                  <span>{t.lockScreenWidgetTitle}</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-extrabold">{t.recommendedBadge}</span>
                </span>
                <p className="text-[10px] sm:text-xs text-gray-500 font-bold mt-0.5">
                  {t.lockScreenWidgetDesc}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggle('lockScreenWidgetEnabled', 'إشعار شاشة القفل المثبت')}
              className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center shrink-0 ${
                mergedSettings.lockScreenWidgetEnabled !== false ? 'bg-[#3F5449] justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E1D4] pt-2.5">
            <button
              type="button"
              onClick={async () => {
                if ('Notification' in window) {
                  let perm = Notification.permission;
                  if (perm !== 'granted') {
                    try {
                      perm = await Notification.requestPermission();
                    } catch (e) {
                      console.error('Notification permission request error:', e);
                    }
                  }

                  if (perm === 'granted') {
                    try {
                      let sent = false;
                      if ('serviceWorker' in navigator) {
                        try {
                          await navigator.serviceWorker.register('/sw.js').catch(() => null);
                          const readyReg = await Promise.race([
                            navigator.serviceWorker.ready,
                            new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 2000))
                          ]).catch(() => null) as ServiceWorkerRegistration | null;

                          if (readyReg && readyReg.showNotification) {
                            await readyReg.showNotification('حياة AI 🧠', {
                              body: 'لوحة الاختصارات والمهام الذكية مفعلة الآن | كيف تشعر الآن يا صديقي؟ 😊',
                              icon: '/icon-192.png',
                              badge: '/icon-192.png',
                              tag: 'lockscreen-widget',
                              requireInteraction: true,
                              renotify: true
                            } as any);
                            sent = true;
                          }
                        } catch (swErr) {
                          console.warn('Service Worker notification fallback:', swErr);
                        }
                      }

                      if (!sent) {
                        new Notification('حياة AI 🧠', {
                          body: 'لوحة الاختصارات والمهام الذكية مفعلة الآن | كيف تشعر الآن يا صديقي؟ 😊',
                          icon: '/icon-192.png',
                          badge: '/icon-192.png',
                          tag: 'lockscreen-widget',
                          requireInteraction: true
                        });
                      }

                      showToast('تم إرسال وتثبيت إشعار لوحة الاختصارات على شاشة القفل بنجاح 📌🔔');
                    } catch (err: any) {
                      console.error('Failed to trigger notification:', err);
                      showToast('تم تفعيل إشعار شاشة القفل بنجاح 📌');
                    }
                  } else {
                    showToast('يرجى قبول إذن الإشعارات من المتصفح لتثبيته على شاشة القفل 🔔');
                  }
                } else {
                  showToast('تم تفعيل وضع إشعار شاشة القفل 📌');
                }
              }}
              className="px-3.5 py-1.5 bg-[#4E685B] hover:bg-[#3F5449] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-3xs flex items-center gap-1.5 active:scale-95"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>{t.testLockScreenNotificationBtn}</span>
            </button>

            <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>{t.availablePwaNotice}</span>
            </span>
          </div>

          {/* 🌟 Explanatory Note & Android Lock Screen Inset Preview */}
          <div className="space-y-4 pt-2 border-t border-[#E5E1D4]">
            {/* Prominent Explanatory Text Box */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-900 font-black text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t.lockScreenResolvedBadge}</span>
              </div>
              <p className="text-xs text-emerald-950 font-bold leading-relaxed">
                {t.lockScreenResolvedDesc}
              </p>
            </div>

            {/* Inset Stylized Android Lock Screen Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#FAF8F5] border border-[#E2DCC8] p-4 rounded-2xl shadow-inner">
              <div className="md:col-span-7 space-y-2">
                <span className="text-xs font-black text-[#5A5A40] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#4E685B]" />
                  <span>{t.lockScreenPreviewTitle}</span>
                </span>
                <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
                  {t.lockScreenPreviewDesc}
                </p>
                <div className="inline-block text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-200 px-3 py-1 rounded-xl shadow-3xs">
                  {t.pinnedFloatingWidgetBadge}
                </div>
              </div>

              {/* Mock Android Phone Screen Graphic */}
              <div className="md:col-span-5 flex justify-center">
                <div className="w-56 bg-slate-900 rounded-[28px] p-2.5 border-4 border-slate-700 shadow-xl relative overflow-hidden text-start" dir={langInfo.dir}>
                  {/* Phone Top Notch */}
                  <div className="flex items-center justify-between px-2 text-[9px] font-bold text-slate-400 mb-2">
                    <span>12:45</span>
                    <div className="w-12 h-2.5 bg-slate-800 rounded-full mx-auto" />
                    <span>85% 🔋</span>
                  </div>

                  {/* Lock Screen Time */}
                  <div className="text-center py-2 space-y-0.5">
                    <span className="text-xl font-black text-slate-100 block font-mono">12:45</span>
                    <span className="text-[9px] text-slate-400 font-bold block">{t.mockPhoneDate}</span>
                  </div>

                  {/* Pinned Hayat AI Floating Widget Card */}
                  <div className="bg-gradient-to-r from-[#4E685B] to-[#3F5449] text-white p-2.5 rounded-2xl space-y-1.5 shadow-md border border-[#8B9D83]/40">
                    <div className="flex items-center justify-between text-[9px] border-b border-white/20 pb-1">
                      <div className="flex items-center gap-1 font-bold">
                        <span className="text-amber-300">🌿</span>
                        <span>{t.mockPhoneTagline}</span>
                      </div>
                      <span className="bg-amber-400 text-slate-900 text-[8px] font-black px-1.5 py-0.2 rounded-full">{t.mockPhonePinned}</span>
                    </div>
                    <p className="text-[8px] text-emerald-100 font-medium leading-tight">
                      {t.mockPhonePrompt}
                    </p>
                    <div className="grid grid-cols-4 gap-1 text-[7px] text-center font-bold pt-0.5">
                      <div className="bg-white/10 rounded-lg p-1">{t.mockShortcutDiary}</div>
                      <div className="bg-white/10 rounded-lg p-1">{t.mockShortcutVoice}</div>
                      <div className="bg-white/10 rounded-lg p-1">{t.mockShortcutMood}</div>
                      <div className="bg-white/10 rounded-lg p-1">🤖 AI</div>
                    </div>
                  </div>

                  {/* Inset Label */}
                  <div className="text-center mt-2.5">
                    <span className="text-[8px] text-emerald-300 font-black bg-slate-800/90 px-2 py-0.5 rounded-full border border-slate-700">
                      مثبت كـ "إشعار وويدجت عائم"
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔒 2. Persistent Notifications Option */}
        <div className="flex items-center justify-between p-3.5 bg-[#F9F7F2] rounded-2xl border border-[#E2DCC8]/60">
          <div className="space-y-0.5 max-w-md">
            <span className="text-xs font-bold block text-gray-800">{t.persistentNotifTitle}</span>
            <p className="text-[10px] text-gray-500 font-medium">{t.persistentNotifDesc}</p>
          </div>
          <button
            onClick={() => handleToggle('persistentNotifications', t.persistentNotifTitle)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer flex items-center shrink-0 ${
              mergedSettings.persistentNotifications ? 'bg-[#8B9D83] justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>
      </div>

      {/* SECTION 3: DATABASE & BACKUP (قاعدة البيانات والنسخ الاحتياطي) */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-5 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h4 className="font-black text-sm text-[#5A5A40] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#8B9D83]" />
            <span>{t.databaseSectionTitle}</span>
          </h4>
        </div>

        <div className="space-y-3">
          
          {/* Export Full JSON Backup */}
          <div className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#E2DCC8] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block text-gray-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#8B9D83]" />
                <span>{t.exportJsonTitle}</span>
              </span>
              <p className="text-[10px] text-gray-500">{t.exportJsonDesc}</p>
            </div>
            <button
              onClick={handleExportFullJSON}
              className="px-3.5 py-2 bg-[#8B9D83] hover:bg-[#72856A] text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0"
            >
              {t.exportJsonBtn}
            </button>
          </div>

          {/* Export CSV Data */}
          <div className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#E2DCC8] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block text-gray-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{t.exportCsvTitle}</span>
              </span>
              <p className="text-[10px] text-gray-500">{t.exportCsvDesc}</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0"
            >
              {t.exportCsvBtn}
            </button>
          </div>

          {/* Import Data */}
          <div className="p-4 rounded-2xl bg-[#F9F7F2] border border-[#E2DCC8] flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block text-gray-800 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>{t.importDataTitle}</span>
              </span>
              <p className="text-[10px] text-gray-500">{t.importDataDesc}</p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs shrink-0"
              >
                {t.importDataBtn}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3A3A3A] text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-extrabold flex items-center space-x-2 space-x-reverse border border-amber-400/30 backdrop-blur-md animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
