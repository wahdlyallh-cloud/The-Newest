import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Settings, 
  ChevronUp, 
  ChevronDown, 
  Calendar, 
  Edit3, 
  Trash2, 
  Sliders
} from 'lucide-react';
import { Habit, HabitSettings, AppLanguage } from '../types';
import { getLanguageInfo, getTranslation } from '../lib/languages';

interface HabitsMatrixGridProps {
  habits: Habit[];
  onToggleHabit: (habitId: string, dateStr: string, customValue?: number | boolean | 'skip') => void;
  onOpenAddHabit: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onArchiveHabit: (habitId: string) => void;
  onReorderHabits: (reordered: Habit[]) => void;
  onOpenSettings: () => void;
  habitSettings?: HabitSettings;
  selectedDate: string;
  isDarkMode?: boolean;
  appLanguage?: AppLanguage;
}

export const HabitsMatrixGrid: React.FC<HabitsMatrixGridProps> = ({
  habits,
  onToggleHabit,
  onOpenAddHabit,
  onEditHabit,
  onDeleteHabit,
  onArchiveHabit,
  onReorderHabits,
  onOpenSettings,
  habitSettings,
  selectedDate,
  isDarkMode = false,
  appLanguage = 'ar'
}) => {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  // Periodicity / Date Range Filter State
  const [rangeMode, setRangeMode] = useState<
    'day' | 'week' | 'month' | 'quarter' | 'semi_annual' | 'year' | 'custom'
  >('week');
  const [customRangeStart, setCustomRangeStart] = useState<string>(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [customRangeEnd, setCustomRangeEnd] = useState<string>(
    selectedDate || new Date().toISOString().split('T')[0]
  );

  // Filter & Sort state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [hideArchived, setHideArchived] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [sortMethod, setSortMethod] = useState<'manual' | 'name' | 'color' | 'score' | 'status'>('manual');

  // Value edit modal state for measurable habits
  const [editingValueHabit, setEditingValueHabit] = useState<{ habit: Habit; dateStr: string } | null>(null);
  const [numericInputValue, setNumericInputValue] = useState<number | string>('');

  // Generate Date Columns based on Range Mode
  const getDateColumns = (): { dateStr: string; dayName: string; dayNumber: number }[] => {
    const baseDate = new Date(selectedDate || Date.now());
    let daysCount = 7;

    if (rangeMode === 'day') daysCount = 1;
    else if (rangeMode === 'week') daysCount = 7;
    else if (rangeMode === 'month') daysCount = 30;
    else if (rangeMode === 'quarter') daysCount = 90;
    else if (rangeMode === 'semi_annual') daysCount = 180;
    else if (rangeMode === 'year') daysCount = 365;
    else if (rangeMode === 'custom') {
      const start = new Date(customRangeStart);
      const end = new Date(customRangeEnd);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      daysCount = Math.max(1, Math.min(365, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1));
    }

    const columns: { dateStr: string; dayName: string; dayNumber: number }[] = [];
    const bcp47Locale = langInfo.bcp47 || langInfo.speechLang || 'ar-EG';

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      let dayName = '';
      try {
        dayName = d.toLocaleDateString(bcp47Locale, { weekday: 'short' });
      } catch {
        dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      }
      columns.push({
        dateStr,
        dayName,
        dayNumber: d.getDate()
      });
    }

    if (habitSettings?.reverseDayOrder) {
      return columns.reverse();
    }
    return columns;
  };

  const dateColumns = getDateColumns();

  const filteredHabits = useMemo(() => {
    let result = [...habits];

    if (hideArchived) {
      result = result.filter(h => !h.isArchived);
    }

    if (hideCompleted) {
      result = result.filter(h => {
        const val = h.history[selectedDate];
        if (h.habitType === 'boolean') return !val;
        if (h.habitType === 'measurable') return (Number(val) || 0) < (h.targetValue || 1);
        return true;
      });
    }

    if (sortMethod === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMethod === 'color') {
      result.sort((a, b) => (a.color || '').localeCompare(b.color || ''));
    } else if (sortMethod === 'score') {
      result.sort((a, b) => (Object.keys(b.history || {}).length) - (Object.keys(a.history || {}).length));
    }

    return result;
  }, [habits, hideArchived, hideCompleted, sortMethod, selectedDate]);

  const processedHabits = filteredHabits;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const reordered = [...processedHabits];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    onReorderHabits(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index >= processedHabits.length - 1) return;
    const reordered = [...processedHabits];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    onReorderHabits(reordered);
  };

  const handleCellClick = (habit: Habit, dateStr: string) => {
    if (habit.habitType === 'measurable') {
      const currentVal = habit.history[dateStr];
      let existingVal = 0;
      if (typeof currentVal === 'number') existingVal = currentVal;
      else if (typeof currentVal === 'object' && currentVal?.value !== undefined) existingVal = currentVal.value;

      setEditingValueHabit({ habit, dateStr });
      setNumericInputValue(existingVal || habit.targetValue || 1);
    } else {
      const currentVal = habit.history[dateStr];
      if (habitSettings?.enableSkipDays && currentVal === true) {
        onToggleHabit(habit.id, dateStr, 'skip');
      } else {
        onToggleHabit(habit.id, dateStr);
      }
    }
  };

  const saveMeasurableValue = () => {
    if (!editingValueHabit) return;
    const num = Number(numericInputValue) || 0;
    onToggleHabit(editingValueHabit.habit.id, editingValueHabit.dateStr, num);
    setEditingValueHabit(null);
  };

  return (
    <div className={`space-y-5 ${isDarkMode ? 'text-gray-100' : 'text-[#3A3A3A]'}`} dir={langInfo.dir}>
      
      {/* 1. Header Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white border border-[#E2DCC8] rounded-3xl shadow-xs">
        <h3 className="font-black text-lg text-[#2B3E50] flex items-center gap-2">
          <span>📊</span>
          <span>{t.habits}</span>
        </h3>

        <div className="flex items-center gap-2">
          {/* Add Habit Button (+) */}
          <button
            onClick={onOpenAddHabit}
            className="w-9 h-9 rounded-2xl bg-[#2B529A] hover:bg-[#1f3f7a] text-white flex items-center justify-center font-bold text-lg cursor-pointer transition-all shadow-xs"
            title={t.addNewHabit}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Filter & Sort Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="p-2.5 rounded-2xl bg-[#F0EDE4] hover:bg-[#E2DCC8] text-gray-700 flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all shadow-2xs active:scale-95"
              title={t.habitsFilterAndSort}
            >
              <Sliders className="w-4 h-4 text-[#5A5A40]" />
              <span className="inline text-xs font-bold">{t.filterAndSortBtn}</span>
            </button>

            {/* Filter & Sort Dropdown Popup */}
            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className={`absolute ${langInfo.dir === 'rtl' ? 'left-0 sm:left-auto sm:right-0' : 'right-0 sm:right-auto sm:left-0'} mt-2 w-60 bg-white border border-[#E2DCC8] rounded-2xl shadow-xl p-3.5 z-50 text-xs space-y-3 font-sans animate-fade-in`}>
                  <div className="font-bold text-[#5A5A40] border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Sliders className="w-3.5 h-3.5 text-[#8B9D83]" />
                      <span>{t.filterAndSortHeader}</span>
                    </span>
                    <button
                      onClick={() => setShowFilterMenu(false)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Filter Checkboxes */}
                  <div className="space-y-2 bg-[#F9F7F2]/60 p-2.5 rounded-xl border border-[#E2DCC8]/40">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold select-none">
                      <input
                        type="checkbox"
                        checked={hideArchived}
                        onChange={(e) => setHideArchived(e.target.checked)}
                        className="w-4 h-4 rounded text-[#8B9D83] focus:ring-[#8B9D83] cursor-pointer"
                      />
                      <span>{t.hideArchived}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold select-none">
                      <input
                        type="checkbox"
                        checked={hideCompleted}
                        onChange={(e) => setHideCompleted(e.target.checked)}
                        className="w-4 h-4 rounded text-[#8B9D83] focus:ring-[#8B9D83] cursor-pointer"
                      />
                      <span>{t.hideCompleted}</span>
                    </label>
                  </div>

                  {/* Sort Options Submenu */}
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    <span className="font-bold text-gray-500 block mb-1.5 text-[11px]">{t.sortMethod}</span>
                    {[
                      { id: 'manual', label: t.sortManual },
                      { id: 'name', label: t.sortByName },
                      { id: 'color', label: t.sortByColor },
                      { id: 'score', label: t.sortByScore },
                      { id: 'status', label: t.sortByStatus }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSortMethod(s.id as any);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full ${langInfo.dir === 'rtl' ? 'text-right' : 'text-left'} py-2 px-3 rounded-xl transition-all font-bold flex items-center justify-between cursor-pointer ${
                          sortMethod === s.id
                            ? 'bg-[#8B9D83] text-white shadow-2xs'
                            : 'text-gray-700 hover:bg-[#F9F7F2]'
                        }`}
                      >
                        <span>{s.label}</span>
                        {sortMethod === s.id && <span className="text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Button (⚙️) */}
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl bg-[#F0EDE4] hover:bg-[#E2DCC8] text-[#5A5A40] flex items-center justify-center cursor-pointer transition-all"
            title={t.habitsSettingsTitle}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Periodicity & Date Range Filter Bar */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-3 shadow-xs space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[#5A5A40] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#8B9D83]" />
            <span>{t.periodicityFilter}</span>
          </span>
          <span className="text-[10px] text-gray-400 font-mono font-bold">
            {t('daysDisplayed', { count: dateColumns.length }) || `${dateColumns.length} days`}
          </span>
        </div>

        {/* Filter Quick Buttons */}
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'day', label: t.dayRangeDay },
            { id: 'week', label: t.dayRangeWeek },
            { id: 'month', label: t.dayRangeMonth },
            { id: 'quarter', label: t.dayRangeQuarter },
            { id: 'semi_annual', label: t.dayRangeSemiAnnual },
            { id: 'year', label: t.dayRangeYear },
            { id: 'custom', label: t.dayRangeCustom }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setRangeMode(p.id as any)}
              className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                rangeMode === p.id
                  ? 'bg-[#8B9D83] text-white shadow-2xs font-black'
                  : 'bg-[#F9F7F2] text-gray-600 hover:bg-[#E2DCC8]/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker inputs if rangeMode === 'custom' */}
        {rangeMode === 'custom' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-2xl pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-amber-800 whitespace-nowrap">{t.fromDate}</span>
              <input
                type="date"
                value={customRangeStart}
                onChange={(e) => setCustomRangeStart(e.target.value)}
                className="py-1 px-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-amber-800 whitespace-nowrap">{t.toDate}</span>
              <input
                type="date"
                value={customRangeEnd}
                onChange={(e) => setCustomRangeEnd(e.target.value)}
                className="py-1 px-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. High Precision Habits Matrix Table */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${langInfo.dir === 'rtl' ? 'text-right' : 'text-left'} border-collapse`}>
            {/* Matrix Header Row */}
            <thead>
              <tr className="bg-[#F9F7F2] border-b border-[#E2DCC8] text-xs font-bold text-[#5A5A40]">
                <th className={`p-3 ${langInfo.dir === 'rtl' ? 'pr-4 sticky right-0 border-l' : 'pl-4 sticky left-0 border-r'} bg-[#F9F7F2] z-10 w-48 shadow-xs border-[#E2DCC8]/50`}>
                  {t.habitsAndRoutinesTitle}
                </th>

                {/* Date Columns */}
                {dateColumns.map(col => {
                  const isSelected = col.dateStr === selectedDate;
                  return (
                    <th
                      key={col.dateStr}
                      className={`p-2 text-center min-w-[50px] ${langInfo.dir === 'rtl' ? 'border-l' : 'border-r'} border-[#E2DCC8]/30 transition-all ${
                        isSelected ? 'bg-[#8B9D83]/15 text-[#8B9D83] font-black' : ''
                      }`}
                    >
                      <span className="block text-[10px] text-gray-400 font-bold">{col.dayName}</span>
                      <span className="block text-xs font-mono font-extrabold">{col.dayNumber}</span>
                    </th>
                  );
                })}

                <th className="p-3 text-center w-24">{t.actionsHeader}</th>
              </tr>
            </thead>

            {/* Matrix Rows */}
            <tbody className="divide-y divide-gray-100 text-xs">
              {processedHabits.length === 0 ? (
                <tr>
                  <td colSpan={dateColumns.length + 2} className="p-8 text-center text-gray-400 font-bold">
                    {t.noHabitsFiltered}
                  </td>
                </tr>
              ) : (
                processedHabits.map((habit, idx) => (
                  <tr key={habit.id} className="hover:bg-[#F9F7F2]/40 transition-colors">
                    
                    {/* Habit Name Column */}
                    <td className={`p-3 ${langInfo.dir === 'rtl' ? 'pr-4 sticky right-0 border-l' : 'pl-4 sticky left-0 border-r'} bg-white border-[#E2DCC8]/50 z-10 shadow-xs`}>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-3xs"
                          style={{ backgroundColor: habit.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-gray-800 block truncate">
                            {habit.name}
                          </span>
                          <span className="text-[9px] text-gray-400 block font-bold">
                            {habit.habitType === 'measurable'
                              ? `📊 ${habit.targetValue || 10} ${habit.unit || t.measurableUnitDefault}`
                              : (t.habitBooleanLabel)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Date Column Cells */}
                    {dateColumns.map(col => {
                      const rawVal = habit.history[col.dateStr];
                      let isCompleted = false;
                      let isSkipped = false;
                      let displayVal = '';

                      if (typeof rawVal === 'boolean') {
                        isCompleted = rawVal;
                      } else if (typeof rawVal === 'number') {
                        isCompleted = rawVal >= (habit.targetValue || 1);
                        displayVal = String(rawVal);
                      } else if (typeof rawVal === 'object' && rawVal !== null) {
                        isCompleted = rawVal.completed;
                        isSkipped = !!rawVal.skipped;
                        if (rawVal.value !== undefined) displayVal = String(rawVal.value);
                      }

                      return (
                        <td
                          key={col.dateStr}
                          onClick={() => handleCellClick(habit, col.dateStr)}
                          className={`p-2 text-center ${langInfo.dir === 'rtl' ? 'border-l' : 'border-r'} border-[#E2DCC8]/30 cursor-pointer transition-all select-none hover:bg-[#8B9D83]/10 ${
                            col.dateStr === selectedDate ? 'bg-[#8B9D83]/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {habit.habitType === 'measurable' ? (
                              <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md border ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : displayVal && displayVal !== '0'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-gray-50 text-gray-400 border-gray-200'
                              }`}>
                                {displayVal || '0'}
                              </span>
                            ) : isSkipped ? (
                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                                -
                              </span>
                            ) : isCompleted ? (
                              <span className="w-5 h-5 rounded-full bg-[#8B9D83] text-white font-bold text-xs flex items-center justify-center shadow-3xs">
                                ✓
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-gray-200 hover:border-[#8B9D83] text-transparent inline-block" />
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Actions Column */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center space-x-1 space-x-reverse">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                          title={t.moveUpTitle}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === processedHabits.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                          title={t.moveDownTitle}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditHabit(habit)}
                          className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                          title={t.editHabitTitle}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteHabit(habit.id)}
                          className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for editing measurable numeric value */}
      {editingValueHabit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-3xs flex items-center justify-center p-4 z-55" dir={langInfo.dir}>
          <div className="bg-white border border-gray-200 rounded-3xl p-5 w-full max-w-xs shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-sm text-gray-800">
                {t('recordValue', { name: editingValueHabit.habit.name }) || `Record: ${editingValueHabit.habit.name}`}
              </h4>
              <button onClick={() => setEditingValueHabit(null)} className="text-gray-400 cursor-pointer">✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-600 font-bold block">
                {t('quantity', { unit: editingValueHabit.habit.unit || t.measurableUnitDefault, date: editingValueHabit.dateStr }) || `Quantity (${editingValueHabit.habit.unit}) for ${editingValueHabit.dateStr}:`}
              </label>
              <input
                type="number"
                autoFocus
                value={numericInputValue}
                onChange={(e) => setNumericInputValue(e.target.value)}
                className="w-full py-2 px-3 border rounded-xl text-sm font-bold font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingValueHabit(null)}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={saveMeasurableValue}
                className="px-4 py-1.5 bg-[#8B9D83] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.saveValue}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
