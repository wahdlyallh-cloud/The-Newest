import React, { useState } from 'react';
import { X, Check, ArrowRight, HelpCircle, Calendar, Clock, Bell, FileText, ChevronDown } from 'lucide-react';
import { Habit } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHabit: (habitData: Partial<Habit>) => void;
  initialHabit?: Habit | null;
  appLanguage?: AppLanguage;
}

const COLOR_PALETTE = [
  { id: 'blue', hex: '#3B82F6', label: 'colorBlue' },
  { id: 'emerald', hex: '#10B981', label: 'colorEmerald' },
  { id: 'indigo', hex: '#6366F1', label: 'colorIndigo' },
  { id: 'amber', hex: '#F59E0B', label: 'colorAmber' },
  { id: 'rose', hex: '#F43F5E', label: 'colorRose' },
  { id: 'teal', hex: '#14B8A6', label: 'colorTeal' },
  { id: 'purple', hex: '#A855F7', label: 'colorPurple' },
  { id: 'slate', hex: '#64748B', label: 'colorSlate' }
];

const HABIT_ICONS = [
  '🎯', '🏃', '💧', '📚', '🧘', '🏋️', '🥦', '🧠', 
  '🎨', '✍️', '💰', '💤', '⚡', '🔥', '🏆', '🍏', 
  '🚲', '💊', '☀️', '❤️', '⏰', '🎧', '🪴', '🧩'
];

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  isOpen,
  onClose,
  onSaveHabit,
  initialHabit,
  appLanguage = 'ar'
}) => {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  // Step 1: 'type_selection' (Image 3) or 'form' (Image 4 & 5)
  const [step, setStep] = useState<'type_selection' | 'form'>(initialHabit ? 'form' : 'type_selection');
  
  // Form fields
  const [habitType, setHabitType] = useState<'boolean' | 'measurable'>(
    initialHabit?.habitType || 'boolean'
  );
  const [name, setName] = useState(initialHabit?.name || '');
  const [icon, setIcon] = useState(initialHabit?.icon || '🎯');
  const [question, setQuestion] = useState(initialHabit?.question || '');
  const [color, setColor] = useState(initialHabit?.color || '#3B82F6');
  const [unit, setUnit] = useState(initialHabit?.unit || '');
  const [targetValue, setTargetValue] = useState<number | string>(initialHabit?.targetValue || 10);
  const [targetType, setTargetType] = useState<'at_least' | 'at_most' | 'exactly'>(
    initialHabit?.targetType || 'at_least'
  );
  const [frequency, setFrequency] = useState<
    'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom'
  >(initialHabit?.frequency || 'daily');
  const [customStartDate, setCustomStartDate] = useState(
    initialHabit?.customStartDate || new Date().toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    initialHabit?.customEndDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [reminderEnabled, setReminderEnabled] = useState(initialHabit?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(initialHabit?.reminderTime || '08:00');
  const [notes, setNotes] = useState(initialHabit?.notes || '');
  const [category, setCategory] = useState<'health' | 'mind' | 'sport' | 'culture' | 'custom'>(
    initialHabit?.category || 'custom'
  );

  if (!isOpen) return null;

  const handleSelectType = (selectedType: 'boolean' | 'measurable') => {
    setHabitType(selectedType);
    if (selectedType === 'boolean') {
      if (!question) setQuestion('هل مارست هذه العادة اليوم؟');
    } else {
      if (!question) setQuestion('كم الكمية/العدد المستهدف اليوم؟');
      if (!unit) setUnit('كيلومترات');
    }
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const habitData: Partial<Habit> = {
      name: name.trim(),
      icon,
      habitType,
      question: question.trim() || undefined,
      color,
      category,
      unit: habitType === 'measurable' ? (unit.trim() || 'وحدة') : undefined,
      targetValue: habitType === 'measurable' ? Number(targetValue) || 1 : undefined,
      targetType: habitType === 'measurable' ? targetType : undefined,
      frequency,
      customStartDate: frequency === 'custom' ? customStartDate : undefined,
      customEndDate: frequency === 'custom' ? customEndDate : undefined,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      notes: notes.trim() || undefined
    };

    onSaveHabit(habitData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[55] font-sans" dir={langInfo.dir}>
      <div className="bg-white border border-gray-200 rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl transition-all max-h-[88dvh] sm:max-h-[90vh] flex flex-col my-auto">
        
        {/* Header Bar */}
        <div className="bg-[#2B529A] text-white p-4 px-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2 space-x-reverse">
            {step === 'form' && !initialHabit && (
              <button
                type="button"
                onClick={() => setStep('type_selection')}
                className="p-1 hover:bg-white/10 rounded-full transition-all cursor-pointer ms-1"
                title={t.back_btn}
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            )}
            <h3 className="font-bold text-base md:text-lg">
              {step === 'type_selection' ? (t['habit.choose_type'] || 'اختر نوع العادة') : initialHabit ? (t.editHabitModalTitle || t['habit.edit'] || 'Edit Habit') : (t['habit.create'] || 'إنشاء العادة')}
            </h3>
          </div>

          {step === 'form' ? (
            <button
              onClick={handleSubmit}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-all cursor-pointer border border-white/30"
            >
              {t.save_btn}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-6 pb-12 sm:pb-6">
          
          {/* STEP 1: TYPE SELECTION MODAL */}
          {step === 'type_selection' && (
            <div className="space-y-4 py-4">
              <p className="text-center text-xs text-gray-500 font-bold mb-6">
                {t['habit.choose_type_desc'] || 'اختر شكل تتبع العادة المناسب لأسلوب حياتك وأهدافك:'}
              </p>

              {/* Option 1: Yes / No */}
              <button
                type="button"
                onClick={() => handleSelectType('boolean')}
                className={`w-full p-5 bg-gray-50 hover:bg-blue-50/60 border-2 border-gray-200 hover:border-blue-500 rounded-2xl transition-all cursor-pointer group shadow-2xs space-y-2 ${langInfo.dir === 'rtl' ? 'text-right' : 'text-left'}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-base text-gray-800 group-hover:text-blue-700">
                    {t['habit.yes_no'] || 'نعم أو لا'}
                  </h4>
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">✓</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  {t['habit.yes_no_desc'] || 'مثلا: هل استيقظت باكراً اليوم؟ هل مارست الرياضة؟ هل لعبت الشطرنج؟'}
                </p>
              </button>

              {/* Option 2: Measurable */}
              <button
                type="button"
                onClick={() => handleSelectType('measurable')}
                className={`w-full p-5 bg-gray-50 hover:bg-emerald-50/60 border-2 border-gray-200 hover:border-emerald-500 rounded-2xl transition-all cursor-pointer group shadow-2xs space-y-2 ${langInfo.dir === 'rtl' ? 'text-right' : 'text-left'}`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-base text-gray-800 group-hover:text-emerald-700">
                    {t['habit.measurable'] || 'قابل للقياس'}
                  </h4>
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">📊</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  {t['habit.measurable_desc'] || 'مثال: كم ميلاً قطعت اليوم؟ كم عدد الصفحات التي قرأتها؟ كم لتراً من الماء شربت؟'}
                </p>
              </button>
            </div>
          )}

          {/* STEP 2: HABIT CREATE / EDIT FORM */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Row 1: Name & Color Selection */}
              <div className="flex gap-3 items-start">
                {/* Color Selector Box */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-500 block">{t['habit.color'] || 'اللون'}</label>
                  <div className="flex items-center gap-1.5 p-2 border border-gray-200 rounded-2xl bg-gray-50">
                    <div
                      className="w-7 h-7 rounded-xl shadow-xs border border-black/10 shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: color }}
                    >
                      {icon}
                    </div>
                    <div className="grid grid-cols-4 gap-1 w-20">
                      {COLOR_PALETTE.slice(0, 8).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColor(c.hex)}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                            color === c.hex ? 'scale-125 ring-2 ring-blue-500' : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={t[c.label] || c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Habit Name Input */}
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">{t['habit.name'] || 'الاسم'}</label>
                  <input
                    type="text"
                    required
                    placeholder={habitType === 'measurable' ? (t['habit.name_placeholder_measurable'] || 'مثلا: الجري') : (t['habit.name_placeholder_boolean'] || 'مثال: التمرين')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-2.5 px-3.5 bg-white border border-gray-300 rounded-2xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Icon Selector Box */}
              <div className="space-y-1.5 bg-blue-50/20 p-3 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <span>{t['habit.icon'] || 'أيقونة العادة'}</span>
                    <span className="text-base bg-white px-2 py-0.5 rounded-lg border border-gray-200 shadow-2xs">{icon}</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-medium">{t['habit.choose_icon'] || 'اختر الأيقونة المعبرة'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto p-1.5 bg-white rounded-xl border border-gray-200">
                  {HABIT_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        icon === ic
                          ? 'bg-blue-600 text-white shadow-xs scale-110 ring-2 ring-blue-300'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">{t['habit.question'] || 'السؤال'}</label>
                <input
                  type="text"
                  placeholder={
                    habitType === 'measurable'
                      ? (t['habit.question_placeholder_measurable'] || 'مثلا: كم ميلاً ركضت اليوم؟')
                      : (t['habit.question_placeholder_boolean'] || 'على سبيل المثال: هل تمرنت اليوم؟')
                  }
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-white border border-gray-300 rounded-2xl text-xs font-semibold text-gray-800 outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* MEASURABLE SPECIFIC FIELDS */}
              {habitType === 'measurable' && (
                <div className="space-y-3 bg-blue-50/30 p-3.5 rounded-2xl border border-blue-100">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Target Value */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 block">{t['habit.target'] || 'الهدف'}</label>
                      <input
                        type="number"
                        min="1"
                        placeholder={t.habitTargetExample || "مثال: 15"}
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Unit */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-600 block">{t['habit.unit'] || 'الوحدة'}</label>
                      <input
                        type="text"
                        placeholder={t.habitUnitExample || "مثلا: كيلومترات"}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Target Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600 block">{t['habit.target_type'] || 'نوع الهدف'}</label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="at_least">{t['habit.at_least'] || 'على الأقل (At least)'}</option>
                      <option value="at_most">{t['habit.at_most'] || 'على الأكثر (At most)'}</option>
                      <option value="exactly">{t['habit.exactly'] || 'بالضبط (Exactly)'}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Frequency / Periodicity Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">{t['habit.periodicity'] || 'التردد والظهور (Periodicity)'}</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full py-2.5 px-3.5 bg-white border border-gray-300 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="daily">{t['habit.daily'] || 'كل يوم (Daily)'}</option>
                  <option value="weekly">{t['habit.weekly'] || 'أسبوعياً (Weekly)'}</option>
                  <option value="monthly">{t['habit.monthly'] || 'شهرياً (Monthly)'}</option>
                  <option value="quarterly">{t['habit.quarterly'] || 'ربع سنوي (Quarterly)'}</option>
                  <option value="semi_annually">{t['habit.semi_annually'] || 'نصف سنوي (Semi-annually)'}</option>
                  <option value="annually">{t['habit.annually'] || 'سنوي (Annually)'}</option>
                  <option value="custom">{t['habit.custom_range'] || 'مخصص (تحديد تاريخ البدء والنهاية)'}</option>
                </select>
              </div>

              {/* Custom Date Range inputs when frequency === 'custom' */}
              {frequency === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/40 border border-amber-200 rounded-2xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 block">{t['habit.start_date'] || 'من تاريخ (Start):'}</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full py-1.5 px-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 block">{t['habit.end_date'] || 'إلى تاريخ (End):'}</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full py-1.5 px-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800"
                    />
                  </div>
                </div>
              )}

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">{t['habit.category'] || 'الفئة والنوع'}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="health">{t['habit.cat_health'] || 'صحة بدنية 🥦'}</option>
                  <option value="mind">{t['habit.cat_mind'] || 'تأمل وذهن 🧠'}</option>
                  <option value="sport">{t['habit.cat_sport'] || 'رياضة ونشاط 🏃'}</option>
                  <option value="culture">{t['habit.cat_culture'] || 'ثقافة وقراءة 📚'}</option>
                  <option value="custom">{t['habit.cat_other'] || 'أهداف أخرى 🎯'}</option>
                </select>
              </div>

              {/* Reminder Selector */}
              <div className="space-y-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t['habit.reminder'] || 'تذكير إشعارات'}</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                {reminderEnabled && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">{t['habit.time'] || 'الوقت:'}</span>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="py-1 px-3 bg-white border border-gray-300 rounded-xl text-xs font-bold font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Notes Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block">{t['habit.notes'] || 'ملاحظات (اختياري)'}</label>
                <textarea
                  rows={2}
                  placeholder={t['habit.notes_placeholder'] || '(اختياري) سجل أي ملاحظات إضافية بخصوص هذه العادة...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-2xl text-xs font-normal text-gray-800 outline-none"
                />
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
