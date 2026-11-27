import React, { useState, useEffect } from 'react';
import { 
  Bell, Plus, Trash2, Edit3, Check, X, Clock, Calendar, Sparkles, 
  Volume2, Heart, ShieldCheck, Zap, Smartphone, ExternalLink, HelpCircle
} from 'lucide-react';
import { AppReminder, AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';
import SmartReminder, { isNativeAndroid, syncReminderNative } from '../lib/smartReminderBridge';

interface SmartRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: AppReminder[];
  onSaveReminders: (updatedReminders: AppReminder[]) => void;
  appLanguage?: string;
}

const CATEGORY_ICONS = [
  { id: '🔔', key: 'catGeneral' },
  { id: '✍️', key: 'catJournal' },
  { id: '🧘‍♀️', key: 'catMeditation' },
  { id: '🏃‍♂️', key: 'catFitness' },
  { id: '💧', key: 'catWater' },
  { id: '💊', key: 'catCare' },
  { id: '📚', key: 'catReading' },
  { id: '✨', key: 'catMotivation' },
];

export const SmartRemindersModal: React.FC<SmartRemindersModalProps> = ({
  isOpen,
  onClose,
  reminders = [],
  onSaveReminders,
  appLanguage = 'ar'
}) => {
  const langInfo = getLanguageInfo(appLanguage as AppLanguage);
  const t = getTranslation(appLanguage as AppLanguage);

  useRegisterBackStep('modal_smart_reminders', 'modal', isOpen, onClose, t.smartRemindersCardTitle);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('20:00');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom_days'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [motivationalNote, setMotivationalNote] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('🔔');
  const [isQuestion, setIsQuestion] = useState(false);
  const [yesLabel, setYesLabel] = useState('نعم');
  const [noLabel, setNoLabel] = useState('لا');
  const [showOverlay, setShowOverlay] = useState(true);

  // Sound & Alarm mode states
  const [alertMode, setAlertMode] = useState<'notification' | 'alarm'>('notification');
  const [soundSource, setSoundSource] = useState<'default' | 'preset' | 'device'>('default');
  const [soundUri, setSoundUri] = useState<string>('');
  const [soundTitle, setSoundTitle] = useState<string>('');
  const [repeatCount, setRepeatCount] = useState<number>(3);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(5);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Permissions state for Android
  const [permissions, setPermissions] = useState<{ notificationsGranted: boolean; overlayGranted: boolean }>({
    notificationsGranted: true,
    overlayGranted: false
  });
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen && isNativeAndroid) {
      SmartReminder.checkPermissions()
        .then(res => setPermissions(res))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestNotificationPerm = async () => {
    try {
      const res = await SmartReminder.requestNotificationPermission();
      setPermissions(prev => ({ ...prev, notificationsGranted: res.notificationsGranted }));
    } catch {}
  };

  const handleOpenOverlaySettings = async () => {
    try {
      await SmartReminder.openOverlayPermissionSettings();
    } catch {}
  };

  const handleTriggerTest = async () => {
    try {
      await SmartReminder.triggerTestReminder({
        title: t('waterReminderSampleTitle') || 'هل شربت الماء الآن؟ 💧',
        body: t('waterReminderSampleBody') || 'تذكير صحي عائم من حياة AI (اضغط نعم أو لا)',
        isQuestion: true,
        yesLabel: t('yesActionLabel') || 'نعم، شربت',
        noLabel: t('noActionLabel') || 'ليس بعد',
        showOverlay: true
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  const getDayName = (dayId: number, format: 'short' | 'long' = 'short') => {
    try {
      const date = new Date(2026, 7, 2 + dayId); // Aug 2, 2026 is Sunday (0)
      return date.toLocaleDateString(appLanguage, { weekday: format });
    } catch {
      return String(dayId);
    }
  };

  const presetNotes = [
    t.presetNote1,
    t.presetNote2,
    t.presetNote3,
    t.presetNote4,
    t.presetNote5,
    "💧 " + (t('presetNote6'))
  ];

  const resetForm = () => {
    setTitle('');
    setTime('20:00');
    setFrequency('daily');
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setMotivationalNote('');
    setCategoryIcon('🔔');
    setIsQuestion(false);
    setYesLabel(t('yesActionLabel') || 'نعم');
    setNoLabel(t('noActionLabel') || 'لا');
    setShowOverlay(true);
    setAlertMode('notification');
    setSoundSource('default');
    setSoundUri('');
    setSoundTitle('');
    setRepeatCount(3);
    setSnoozeMinutes(5);
    setIsPreviewPlaying(false);
    SmartReminder.stopPreviewSound().catch(() => {});
    setEditingId(null);
    setShowForm(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleStartEdit = (reminder: AppReminder) => {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setTime(reminder.time || '20:00');
    setFrequency(reminder.frequency || 'daily');
    setSelectedDays(reminder.selectedDays || [0, 1, 2, 3, 4, 5, 6]);
    setMotivationalNote(reminder.motivationalNote || '');
    setCategoryIcon(reminder.categoryIcon || '🔔');
    setIsQuestion(!!reminder.isQuestion);
    setYesLabel(reminder.yesLabel || t('yesActionLabel') || 'نعم');
    setNoLabel(reminder.noLabel || t('noActionLabel') || 'لا');
    setShowOverlay(reminder.showOverlay ?? true);
    setAlertMode(reminder.alertMode || 'notification');
    setSoundSource(reminder.soundSource || 'default');
    setSoundUri(reminder.soundUri || '');
    setSoundTitle(reminder.soundTitle || '');
    setRepeatCount(reminder.repeatCount !== undefined ? reminder.repeatCount : 3);
    setSnoozeMinutes(reminder.snoozeMinutes !== undefined ? reminder.snoozeMinutes : 5);
    setIsPreviewPlaying(false);
    setShowForm(true);
  };

  const handlePickRingtone = async () => {
    try {
      const res = await SmartReminder.pickAlarmSound();
      if (!res.cancelled && res.title) {
        setSoundUri(res.uri || '');
        setSoundTitle(res.title);
        setSoundSource('device');
      }
    } catch (e) {
      console.warn('Failed to pick ringtone:', e);
    }
  };

  const handlePickAudioFile = async () => {
    try {
      const res = await SmartReminder.pickAudioFile();
      if (!res.cancelled && res.title) {
        setSoundUri(res.uri || '');
        setSoundTitle(res.title);
        setSoundSource('device');
      }
    } catch (e) {
      console.warn('Failed to pick audio file:', e);
    }
  };

  const handleTogglePreviewSound = async (uriToPlay?: string) => {
    const targetUri = uriToPlay !== undefined ? uriToPlay : soundUri;
    if (isPreviewPlaying) {
      await SmartReminder.stopPreviewSound().catch(() => {});
      setIsPreviewPlaying(false);
    } else {
      await SmartReminder.previewAlarmSound({ uri: targetUri, repeatCount: 1 }).catch(() => {});
      setIsPreviewPlaying(true);
    }
  };

  const handleToggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return; // keep at least 1 day
      setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isPreviewPlaying) {
      SmartReminder.stopPreviewSound().catch(() => {});
      setIsPreviewPlaying(false);
    }

    const newReminder: AppReminder = {
      id: editingId || `rem_${Date.now()}`,
      title: title.trim(),
      time,
      active: true,
      frequency,
      selectedDays: frequency === 'custom_days' ? selectedDays : (frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [new Date().getDay()]),
      motivationalNote: motivationalNote.trim(),
      categoryIcon,
      isQuestion,
      yesLabel: isQuestion ? yesLabel.trim() : undefined,
      noLabel: isQuestion ? noLabel.trim() : undefined,
      showOverlay,
      alertMode,
      soundSource,
      soundUri,
      soundTitle,
      repeatCount,
      snoozeMinutes,
      createdAt: new Date().toISOString()
    };

    let updated: AppReminder[];
    if (editingId) {
      updated = reminders.map(r => r.id === editingId ? { ...r, ...newReminder } : r);
    } else {
      updated = [newReminder, ...reminders];
    }

    onSaveReminders(updated);
    syncReminderNative(newReminder);
    resetForm();
  };

  const handleToggleActive = (id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        const toggled = { ...r, active: !r.active };
        syncReminderNative(toggled);
        return toggled;
      }
      return r;
    });
    onSaveReminders(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDeleteReminder)) {
      const target = reminders.find(r => r.id === id);
      if (target) {
        syncReminderNative({ ...target, active: false });
      }
      const updated = reminders.filter(r => r.id !== id);
      onSaveReminders(updated);
    }
  };

  // Test notification chime using Web Audio API
  const playTestChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.3); // G5

      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.6);
    } catch {
      // Audio not supported
    }
  };

  const getFrequencyLabel = (reminder: AppReminder) => {
    if (reminder.frequency === 'daily') return t.freqDaily;
    if (reminder.frequency === 'weekly') return t.freqWeekly;
    if (reminder.frequency === 'custom_days') {
      if (!reminder.selectedDays || reminder.selectedDays.length === 7) return t.freqDaily;
      return reminder.selectedDays.map(d => getDayName(d, 'short')).join(', ');
    }
    return t.freqDaily;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border-0 sm:border sm:border-[#E2DCC8] rounded-none sm:rounded-3xl w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.smartRemindersCardTitle}
          subtitle={t.smartRemindersModalSub}
          icon={
            <div className="p-1.5 bg-[#4E685B] text-white rounded-xl shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
          }
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="light"
          rightAction={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-[#D4A373] text-white px-2 py-0.5 rounded-full font-bold hidden sm:inline">
                {t.behavioralAiBadge}
              </span>
              <button
                type="button"
                onClick={playTestChime}
                title={t.testSoundTitle}
                className="p-2 bg-white text-[#4E685B] border border-[#DCE4D8] rounded-xl hover:bg-[#F2F5F0] transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-[#D4A373]" />
                <span className="hidden sm:inline">{t.testSoundBtn}</span>
              </button>
            </div>
          }
        />

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-6 grow scrollbar-thin">

          {/* Android Native Permissions & Live Overlay Test Card */}
          {isNativeAndroid && (
            <div className="bg-gradient-to-r from-[#2B3E50] to-[#3B5266] text-white p-4 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-300" />
                  <h4 className="font-extrabold text-xs sm:text-sm">{t('nativeRemindersCardTitle') || 'إشعارات النظام والبطاقة العائمة'}</h4>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Android</span>
              </div>

              <p className="text-[11px] text-blue-100/90 leading-relaxed font-semibold">
                {t('nativeRemindersCardDesc') || 'تظهر التذكيرات كإشعارات في النظام وبطاقات عائمة تفاعلية حتى أثناء استخدامك لتطبيقات أخرى.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* 1. Notification Permission */}
                <button
                  type="button"
                  onClick={handleRequestNotificationPerm}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                    permissions.notificationsGranted
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100'
                      : 'bg-amber-500/20 border-amber-300 text-amber-100 hover:bg-amber-500/30'
                  }`}
                >
                  <span className="truncate">{t('systemNotifsBtn') || 'إشعارات النظام الخارجية'}</span>
                  <span>{permissions.notificationsGranted ? '✅' : '⚠️ ' + (t('enableBtn') || 'تفعيل')}</span>
                </button>

                {/* 2. Overlay Permission */}
                <button
                  type="button"
                  onClick={handleOpenOverlaySettings}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border cursor-pointer transition-all ${
                    permissions.overlayGranted
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100'
                      : 'bg-cyan-500/20 border-cyan-300 text-cyan-100 hover:bg-cyan-500/30'
                  }`}
                >
                  <span className="truncate">{t('floatingOverlayBtn') || 'البطاقة العائمة فوق التطبيقات'}</span>
                  <span>{permissions.overlayGranted ? '✅' : '⚡ ' + (t('permissionBtn') || 'إذن')}</span>
                </button>
              </div>

              {/* 3. Live 5-Second Test */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTriggerTest}
                  disabled={testSent}
                  className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-[#1E2D3B] font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {testSent
                      ? (t('testOverlaySentToast') || 'تم جدولة التنبيه بعد 5 ثوانٍ! اخرج من التطبيق للتجربة 🚀')
                      : (t('testOverlayPromptBtn') || 'اختبار تنبيه عائم تفاعلي بعد 5 ثوانٍ')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Add / Edit Form Modal inside */}
          {showForm ? (
            <form onSubmit={handleSaveReminder} className="bg-white border border-[#E2DCC8] p-5 rounded-2xl space-y-4 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-sm text-[#3A3A3A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4A373]" />
                  <span>{editingId ? t.editSmartReminderTitle : t.addNewSmartReminderTitle}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  {t.cancelBtn}
                </button>
              </div>

              {/* Title & Icon Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-xs font-bold text-[#5A5A40] block">{t.reminderTitleLabel}</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={t.reminderTitlePlaceholder}
                    className="w-full px-3.5 py-2.5 border border-[#DCE4D8] rounded-xl text-xs font-bold focus:outline-none focus:border-[#4E685B] bg-[#F9F8F5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5A5A40] block">{t.reminderIconLabel}</label>
                  <select
                    value={categoryIcon}
                    onChange={e => setCategoryIcon(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[#DCE4D8] rounded-xl text-xs font-bold focus:outline-none focus:border-[#4E685B] bg-[#F9F8F5]"
                  >
                    {CATEGORY_ICONS.map(ic => (
                      <option key={ic.id} value={ic.id}>
                        {ic.id} {t[ic.key] || ic.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminder Type Selection (Plain Alert vs Interactive Yes/No Question) */}
              <div className="p-3 bg-[#EEF1EB]/40 border border-[#DCE4D8] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#2C3E35] flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#4E685B]" />
                    <span>{t('reminderTypeLabel') || 'نوع التنبيه والتفاعل'}</span>
                  </label>
                  <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-[#DCE4D8]">
                    <button
                      type="button"
                      onClick={() => setIsQuestion(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !isQuestion ? 'bg-[#4E685B] text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t('plainReminderOption') || 'تنبيه عادي'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQuestion(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isQuestion ? 'bg-[#4E685B] text-white' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t('questionReminderOption') || 'سؤال تفاعلي (نعم / لا)'}
                    </button>
                  </div>
                </div>

                {isQuestion && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 block">{t('yesBtnLabelPrompt') || 'نص زر الموافقة'}</label>
                      <input
                        type="text"
                        value={yesLabel}
                        onChange={e => setYesLabel(e.target.value)}
                        placeholder="نعم"
                        className="w-full px-3 py-1.5 border border-[#DCE4D8] rounded-lg text-xs font-bold bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 block">{t('noBtnLabelPrompt') || 'نص زر الرفض'}</label>
                      <input
                        type="text"
                        value={noLabel}
                        onChange={e => setNoLabel(e.target.value)}
                        placeholder="لا"
                        className="w-full px-3 py-1.5 border border-[#DCE4D8] rounded-lg text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sound & Alert Mode Section: Notification Ping vs Continuous Alarm */}
              <div className="p-3.5 bg-[#F4F1EA] border border-[#DCE4D8] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#2C3E35] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#4E685B]" />
                    <span>الصوت ونوع التنبيه</span>
                  </label>
                  <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-[#DCE4D8]">
                    <button
                      type="button"
                      onClick={() => setAlertMode('notification')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        alertMode === 'notification' ? 'bg-[#4E685B] text-white shadow-2xs' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      إشعار عادي
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertMode('alarm')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        alertMode === 'alarm' ? 'bg-[#C5221F] text-white shadow-2xs' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      منبه كامل ⏰
                    </button>
                  </div>
                </div>

                {alertMode === 'alarm' ? (
                  <div className="space-y-3 pt-1 border-t border-[#DCE4D8]/60 mt-2">
                    {/* Tone details & Native Picker */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-700">نغمة المنبه:</span>
                        <span className="text-[11px] font-black text-[#4E685B] truncate max-w-[180px]">
                          {soundTitle || 'نغمة المنبه الافتراضية'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handlePickRingtone}
                          className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#DCE4D8] rounded-xl text-xs font-extrabold text-[#2C3E35] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-[#4E685B]" />
                          <span>نغمات الهاتف</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePickAudioFile}
                          className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#DCE4D8] rounded-xl text-xs font-extrabold text-[#2C3E35] flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#C5221F]" />
                          <span>ملف صوتي من الجهاز</span>
                        </button>
                      </div>

                      {/* Preview Sound Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePreviewSound()}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                          isPreviewPlaying 
                            ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isPreviewPlaying ? 'إيقاف معاينة النغمة' : 'معاينة النغمة المحددة 🔊'}</span>
                      </button>
                    </div>

                    {/* Repeat Count & Snooze */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 block">تكرار الرنين:</label>
                        <select
                          value={repeatCount}
                          onChange={e => setRepeatCount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-[#DCE4D8] rounded-xl text-xs font-bold bg-white"
                        >
                          <option value={1}>مرة واحدة (1)</option>
                          <option value={3}>3 مرات</option>
                          <option value={5}>5 مرات</option>
                          <option value={-1}>مستمر حتى الإيقاف</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 block">مدة الغفوة (Snooze):</label>
                        <select
                          value={snoozeMinutes}
                          onChange={e => setSnoozeMinutes(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 border border-[#DCE4D8] rounded-xl text-xs font-bold bg-white"
                        >
                          <option value={0}>إيقاف الغفوة</option>
                          <option value={5}>5 دقائق</option>
                          <option value={10}>10 دقائق</option>
                          <option value={15}>15 دقيقة</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                    إشعار سريع وموجز في شريط الحالة مع نغمة التنبيهات الافتراضية.
                  </p>
                )}
              </div>

              {/* Time & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5A5A40] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#4E685B]" />
                    <span>{t.alertTimeLabel}</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#DCE4D8] rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#4E685B] bg-[#F9F8F5]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5A5A40] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4E685B]" />
                    <span>{t.alertFrequencyLabel}</span>
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as 'daily' | 'weekly' | 'custom_days')}
                    className="w-full px-3.5 py-2 border border-[#DCE4D8] rounded-xl text-xs font-bold focus:outline-none focus:border-[#4E685B] bg-[#F9F8F5]"
                  >
                    <option value="daily">{t.freqDaily}</option>
                    <option value="weekly">{t.freqWeekly}</option>
                    <option value="custom_days">{t.freqCustomDays}</option>
                  </select>
                </div>
              </div>

              {/* Custom Days Picker if frequency is custom_days */}
              {frequency === 'custom_days' && (
                <div className="p-3 bg-[#EEF1EB]/50 border border-[#DCE4D8] rounded-xl space-y-2 animate-fadeIn">
                  <span className="text-[11px] font-bold text-[#556E4F] block">{t.selectDaysPrompt}</span>
                  <div className="flex flex-wrap gap-1.5 justify-between">
                    {[0, 1, 2, 3, 4, 5, 6].map(dayId => {
                      const isSelected = selectedDays.includes(dayId);
                      return (
                        <button
                          key={dayId}
                          type="button"
                          onClick={() => handleToggleDay(dayId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#4E685B] text-white shadow-3xs' 
                              : 'bg-white border border-[#DCE4D8] text-gray-500 hover:bg-[#F2F5F0]'
                          }`}
                        >
                          {getDayName(dayId, 'short')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Motivational Note */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#5A5A40] flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-[#D4A373]" />
                    <span>{t.motivationalNoteLabel}</span>
                  </label>
                  <span className="text-[10px] text-[#A67E2E] font-bold">{t.optionalLabel}</span>
                </div>
                <textarea
                  rows={2}
                  value={motivationalNote}
                  onChange={e => setMotivationalNote(e.target.value)}
                  placeholder={t.motivationalNotePlaceholder}
                  className="w-full px-3.5 py-2 border border-[#DCE4D8] rounded-xl text-xs font-bold focus:outline-none focus:border-[#4E685B] bg-[#F9F8F5] resize-none"
                />

                {/* Preset Suggestions Pills */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold block">{t.presetSamplesPrompt}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetNotes.map((note, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMotivationalNote(note)}
                        className="text-[10px] bg-[#FCF5DE] text-[#A67E2E] hover:bg-[#F8EBBF] px-2.5 py-1 rounded-lg border border-[#E9E1C4] transition-all font-semibold text-right truncate max-w-xs cursor-pointer"
                      >
                        {note}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end space-x-2 space-x-reverse border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4E685B] hover:bg-[#3F5449] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? t.saveChangesBtn : t.addReminderBtn}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={handleStartAdd}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#4E685B] hover:bg-[#3F5449] text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addNewSmartReminderBtn}</span>
              </button>

              <span className="text-xs text-gray-500 font-bold hidden sm:inline">
                {t.totalRemindersLabel} <strong className="text-[#4E685B]">{reminders.length}</strong>
              </span>
            </div>
          )}

          {/* List of Scheduled Reminders */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-[#5A5A40] flex items-center gap-1.5 border-b border-[#E2DCC8]/60 pb-2">
              <Bell className="w-3.5 h-3.5 text-[#4E685B]" />
              <span>{t.activeRemindersListTitle}</span>
            </h3>

            {reminders.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DCE4D8] p-8 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 bg-[#EEF1EB] text-[#556E4F] rounded-full flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-sm text-[#3A3A3A]">{t.noRemindersYetTitle}</h4>
                <p className="text-xs text-gray-400 font-bold max-w-sm mx-auto">
                  {t.noRemindersYetDesc}
                </p>
                <button
                  onClick={handleStartAdd}
                  className="mt-2 px-4 py-2 bg-[#EEF1EB] text-[#556E4F] border border-[#DCE4D8] rounded-xl text-xs font-bold hover:bg-[#E2E9DF] transition-all cursor-pointer"
                >
                  {t.createFirstReminderBtn}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {reminders.map(reminder => (
                  <div
                    key={reminder.id}
                    className={`bg-white border rounded-2xl p-4 transition-all shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      reminder.active 
                        ? 'border-[#E2DCC8] hover:border-[#8B9D83]' 
                        : 'border-gray-200 bg-gray-50/70 opacity-60'
                    }`}
                  >
                    {/* Left Details */}
                    <div className="space-y-1.5 grow">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="text-lg bg-[#FAF8F5] p-1.5 rounded-xl border border-[#E2DCC8] shrink-0">
                          {reminder.categoryIcon || '🔔'}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#2C3E35] flex items-center gap-2">
                            <span>{reminder.title}</span>
                            {reminder.isQuestion && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold">
                                {t('questionReminderBadge') || 'سؤال'}
                              </span>
                            )}
                            {!reminder.active && (
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-bold">
                                {t.disabledBadge}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-3 space-x-reverse text-[11px] text-gray-500 font-bold">
                            <span className="flex items-center gap-1 text-[#4E685B] font-mono font-black">
                              <Clock className="w-3 h-3" />
                              <span>{reminder.time}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#D4A373]" />
                              <span>{getFrequencyLabel(reminder)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Motivational Note Quote Box */}
                      {reminder.motivationalNote && (
                        <div className="bg-[#FCF5DE]/70 border border-[#E9E1C4] p-2.5 rounded-xl text-[11px] text-[#8C661D] font-bold flex items-start gap-2 mt-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4A373] shrink-0 mt-0.5" />
                          <p className="leading-normal italic">
                            "{reminder.motivationalNote}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Controls Right */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(reminder.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          reminder.active 
                            ? 'bg-[#EEF1EB] text-[#556E4F] border border-[#DCE4D8]' 
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${reminder.active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span>{reminder.active ? t.activeBadge : t.disabledBadge}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(reminder)}
                          className="p-2 text-gray-500 hover:text-[#4E685B] bg-gray-100 hover:bg-[#EEF1EB] rounded-xl transition-all cursor-pointer"
                          title={t('edit')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="p-2 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preset Recommendation Box */}
          <div className="bg-[#EEF1EB] border border-[#DCE4D8] p-4 rounded-2xl space-y-2">
            <h4 className="text-xs font-extrabold text-[#2C3E35] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#D4A373]" />
              <span>{t.cbtTipTitle}</span>
            </h4>
            <p className="text-[11px] text-[#4E685B] leading-relaxed font-semibold">
              {t.cbtTipDesc}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F2E9] border-t border-[#E2DCC8] flex items-center justify-between shrink-0 text-xs">
          <span className="text-gray-500 font-bold text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.alertsMonitoredFooter}</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#4E685B] text-white font-bold rounded-xl hover:bg-[#3F5449] transition-all cursor-pointer shadow-xs"
          >
            {t.closeBtn}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SmartRemindersModal;
