import React, { useState } from 'react';
import { 
  Bell, Plus, Trash2, Edit3, Check, X, Clock, Calendar, Sparkles, 
  Volume2, Heart, ShieldCheck, Zap
} from 'lucide-react';
import { AppReminder, AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('20:00');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom_days'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [motivationalNote, setMotivationalNote] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('🔔');

  if (!isOpen) return null;

  const getDayName = (dayId: number, format: 'short' | 'long' = 'short') => {
    try {
      const date = new Date(2026, 7, 2 + dayId); // Aug 2, 2026 is Sunday (0)
      return date.toLocaleDateString(appLanguage, { weekday: format });
    } catch {
      return String(dayId);
    }
  };

  const presetNotes = [
    t.presetNote1 || 'You are doing great! Take a short mindful pause today.',
    t.presetNote2 || 'Small consistent habits lead to profound peace of mind.',
    t.presetNote3 || 'Self-care and mental wellness are an absolute priority.',
    t.presetNote4 || 'Take 3 deep breaths right now and relax deeply.',
    t.presetNote5 || 'Journaling clears stress and brings calm clarity.',
    "💧 " + (t('presetNote6') || "شرب الماء والعناية ببدنك يرفع طاقتك وإيجابيتك طوال اليوم.")
  ];

  const resetForm = () => {
    setTitle('');
    setTime('20:00');
    setFrequency('daily');
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setMotivationalNote('');
    setCategoryIcon('🔔');
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
    setShowForm(true);
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

    const newReminder: AppReminder = {
      id: editingId || `rem_${Date.now()}`,
      title: title.trim(),
      time,
      active: true,
      frequency,
      selectedDays: frequency === 'custom_days' ? selectedDays : (frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [new Date().getDay()]),
      motivationalNote: motivationalNote.trim(),
      categoryIcon,
      createdAt: new Date().toISOString()
    };

    let updated: AppReminder[];
    if (editingId) {
      updated = reminders.map(r => r.id === editingId ? { ...r, ...newReminder } : r);
    } else {
      updated = [newReminder, ...reminders];
    }

    onSaveReminders(updated);
    resetForm();
  };

  const handleToggleActive = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    onSaveReminders(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDeleteReminder)) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-[#EEF1EB] border-b border-[#DCE4D8] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-2.5 bg-[#4E685B] text-white rounded-2xl shadow-xs">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2C3E35] flex items-center gap-2">
                <span>{t.smartRemindersCardTitle}</span>
                <span className="text-xs bg-[#D4A373] text-white px-2 py-0.5 rounded-full font-bold">{t.behavioralAiBadge}</span>
              </h2>
              <p className="text-[11px] text-[#556E4F] font-bold">
                {t.smartRemindersModalSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playTestChime}
              title={t.testSoundTitle}
              className="p-2 bg-white text-[#4E685B] border border-[#DCE4D8] rounded-xl hover:bg-[#F2F5F0] transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-[#D4A373]" />
              <span className="hidden sm:inline">{t.testSoundBtn}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 bg-white/80 hover:bg-white rounded-xl transition-all cursor-pointer border border-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-6 grow scrollbar-thin">

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

              {/* Time & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                          title={t('edit') || "Edit"}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          className="p-2 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                          title={t('delete') || "Delete"}
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

