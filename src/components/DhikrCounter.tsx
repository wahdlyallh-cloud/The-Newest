import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, RotateCcw, Heart, Volume2, VolumeX, BookOpen, Maximize2,
  Plus, Trash2, Edit3, Check, X, Layers, Sun, Moon, ShieldCheck
} from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import FullAthkarModal, { ATHKAR_CATEGORIES, ALL_CATEGORY_OPTIONS, AthkarItem } from './FullAthkarModal';
import { updateAthkarContextOnTap } from '../services/aiAthkarSync';

interface DhikrCounterProps {
  compact?: boolean;
  className?: string;
  appLanguage?: AppLanguage;
}

export default function DhikrCounter({ compact = false, className = '', appLanguage = 'ar' }: DhikrCounterProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  // Modal open state for Full Athkar View
  const [isFullAthkarOpen, setIsFullAthkarOpen] = useState(false);

  // Active Category Tab: 'general' | 'morning' | 'evening' | 'post_prayer' | 'custom'
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('yawmiyaty_dhikr_active_tab') || 'general';
  });

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yawmiyaty_dhikr_sound');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Custom Athkar list
  const [customAthkar, setCustomAthkar] = useState<AthkarItem[]>(() => {
    try {
      const saved = localStorage.getItem('yawmiyaty_custom_dhikr');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Main Counts Data V2 stored in `yawmiyaty_dhikr_data_v2`
  // Structure: { general: number, [item_id]: number }
  const [dhikrData, setDhikrData] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('yawmiyaty_dhikr_data_v2');
      if (saved) return JSON.parse(saved);

      // Migration fallback from old key if exists
      const oldVal = localStorage.getItem('yawmiyati_dhikr_total_count');
      return { general: oldVal ? parseInt(oldVal, 10) || 0 : 0 };
    } catch {
      return { general: 0 };
    }
  });

  // Custom Dhikr Modal & Form State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AthkarItem | null>(null);
  const [newDhikrText, setNewDhikrText] = useState('');
  const [newDhikrCount, setNewDhikrCount] = useState(33);
  const [newDhikrCategory, setNewDhikrCategory] = useState(activeTab);
  const [newDhikrVirtue, setNewDhikrVirtue] = useState('');

  // Reload custom athkar when window event is fired
  useEffect(() => {
    const handleReload = () => {
      try {
        const saved = localStorage.getItem('yawmiyaty_custom_dhikr');
        if (saved) setCustomAthkar(JSON.parse(saved));
      } catch { /* ignore */ }
    };
    window.addEventListener('storage_custom_dhikr_updated', handleReload);
    return () => window.removeEventListener('storage_custom_dhikr_updated', handleReload);
  }, []);

  // Tapped visual animation state
  const [isTapped, setIsTapped] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Save activeTab
  useEffect(() => {
    localStorage.setItem('yawmiyaty_dhikr_active_tab', activeTab);
  }, [activeTab]);

  // Save dhikrData V2 & AI context
  useEffect(() => {
    try {
      localStorage.setItem('yawmiyaty_dhikr_data_v2', JSON.stringify(dhikrData));

      // AI Context Sync
      const aiContext = {
        activeTab,
        currentGeneralCount: dhikrData.general || 0,
        customAthkarCount: customAthkar.length,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('yawmiyaty_ai_dhikr_context', JSON.stringify(aiContext));
    } catch (e) {
      console.warn('Failed to save dhikr data to localStorage', e);
    }
  }, [dhikrData, activeTab, customAthkar]);

  // Save custom athkar
  useEffect(() => {
    try {
      localStorage.setItem('yawmiyaty_custom_dhikr', JSON.stringify(customAthkar));
    } catch (e) {
      console.warn('Failed to save custom dhikr', e);
    }
  }, [customAthkar]);

  // Play audio sound using Web Audio API
  const playSoftClickSound = (isDone = false) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isDone ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isDone ? 880 : 520, audioCtx.currentTime);
      if (isDone) {
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.exponentialRampToValueAtTime(380, audioCtx.currentTime + 0.05);
      }

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isDone ? 0.25 : 0.08));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + (isDone ? 0.25 : 0.08));
    } catch {
      // ignore audio restriction
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('yawmiyaty_dhikr_sound', JSON.stringify(next));
  };

  const handleIncrementGeneral = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = dhikrData.general || 0;
    const next = current + 1;
    setDhikrData(prev => ({ ...prev, general: next }));

    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 150);

    if (navigator.vibrate) navigator.vibrate(30);
    playSoftClickSound(next % 33 === 0);

    updateAthkarContextOnTap({
      category: 'التسبيح العام',
      lastDhikrRead: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
      remainingInCategory: 0,
      incrementTaps: 1
    });
  };

  const handleIncrementItem = (itemId: string, maxTarget: number, text?: string) => {
    const current = dhikrData[itemId] !== undefined ? dhikrData[itemId] : maxTarget;
    if (current <= 0) return;

    const next = current - 1;
    setDhikrData(prev => ({ ...prev, [itemId]: next }));

    if (navigator.vibrate) navigator.vibrate(next === 0 ? [50, 50, 50] : 30);
    playSoftClickSound(next === 0);

    const catName = ATHKAR_CATEGORIES[activeTab]?.title || activeTab;
    updateAthkarContextOnTap({
      category: catName,
      lastDhikrRead: text || 'ذكر مخصص',
      remainingInCategory: next,
      incrementTaps: 1
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTab === 'general') {
      setDhikrData(prev => ({ ...prev, general: 0 }));
    } else {
      // Reset active category
      const newDhikr = { ...dhikrData };
      if (activeTab === 'custom') {
        customAthkar.forEach(item => { newDhikr[item.id] = item.count; });
      } else if (ATHKAR_CATEGORIES[activeTab]) {
        ATHKAR_CATEGORIES[activeTab].items.forEach(item => { newDhikr[item.id] = item.count; });
      }
      setDhikrData(newDhikr);
    }
    setShowResetConfirm(false);
  };

  // Custom Athkar Handlers
  const handleSaveCustomDhikr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDhikrText.trim()) return;

    const countNum = Math.max(1, Number(newDhikrCount) || 33);

    let updated: AthkarItem[];
    if (editingItem) {
      updated = customAthkar.map(item => item.id === editingItem.id ? {
        ...item,
        text: newDhikrText.trim(),
        count: countNum,
        categoryKey: newDhikrCategory,
        virtue: newDhikrVirtue.trim() || undefined,
        isCustom: true
      } : item);
    } else {
      const newItem: AthkarItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: newDhikrText.trim(),
        count: countNum,
        categoryKey: newDhikrCategory,
        virtue: newDhikrVirtue.trim() || undefined,
        isCustom: true
      };
      updated = [...customAthkar, newItem];
      setDhikrData(prev => ({ ...prev, [newItem.id]: newItem.count }));
    }

    setCustomAthkar(updated);
    localStorage.setItem('yawmiyaty_custom_dhikr', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage_custom_dhikr_updated'));

    // Sync AI context
    try {
      updateAthkarContextOnTap({
        category: newDhikrCategory || 'أذكاري الخاصة',
        lastDhikrRead: newDhikrText.trim(),
        remainingInCategory: countNum,
        incrementTaps: 0
      });
    } catch { /* ignore */ }

    setNewDhikrText('');
    setNewDhikrCount(33);
    setNewDhikrVirtue('');
    setEditingItem(null);
    setShowAddCustomModal(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customAthkar.filter(item => item.id !== id);
    setCustomAthkar(updated);
    localStorage.setItem('yawmiyaty_custom_dhikr', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage_custom_dhikr_updated'));
    setDhikrData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Pre-configured category items + custom items for this category
  const currentCategoryItems = useMemo(() => {
    const customForTab = customAthkar.filter(item => {
      if (activeTab === 'custom') {
        return !item.categoryKey || item.categoryKey === 'custom';
      }
      return item.categoryKey === activeTab;
    });

    const staticItems = ATHKAR_CATEGORIES[activeTab]?.items || [];
    return [...staticItems, ...customForTab];
  }, [activeTab, customAthkar]);

  return (
    <div 
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#162d21]/95 via-[#1e3e2d]/90 to-[#0f2218]/95 backdrop-blur-md border border-amber-500/30 text-white p-4 sm:p-5 shadow-2xl dir-rtl ${className}`}
      dir={langInfo.dir}
    >
      {/* Decorative Golden Spiritual Glow background */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header Control Bar */}
      <div className="flex items-center justify-between mb-3 border-b border-amber-500/15 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-amber-200">
              {t.dhikrTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Open Full Athkar View Button */}
          <button
            onClick={() => setIsFullAthkarOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/30 to-emerald-500/30 hover:from-amber-500/40 hover:to-emerald-500/40 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            title="عرض الشاشة الكاملة لقراءة حصن المسلم والأذكار"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="whitespace-nowrap">عرض الشاشة الكاملة</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 transition-colors"
            title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
          </button>

          {/* Reset Confirm */}
          {!showResetConfirm ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowResetConfirm(true); }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-emerald-200 hover:text-rose-200 transition-colors"
              title="إعادة ضبط הعداد"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-xl border border-rose-400/40 text-xs">
              <span className="text-rose-200 font-bold">تصفير؟</span>
              <button
                onClick={handleReset}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold"
              >
                نعم
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowResetConfirm(false); }}
                className="px-2 py-0.5 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar border-b border-amber-500/10">
        {[
          { id: 'general', label: 'السبحة العامة' },
          { id: 'morning', label: 'أذكار الصباح' },
          { id: 'evening', label: 'أذكار المساء' },
          { id: 'salawat', label: 'الصلاة على النبي' },
          { id: 'istighfar', label: 'الاستغفار' },
          { id: 'hawqala', label: 'الحوقلة' },
          { id: 'baqiyat', label: 'الباقيات الصالحات' },
          { id: 'younus', label: 'دعاء يونس' },
          { id: 'tawheed', label: 'ذكر التوحيد' },
          { id: 'post_prayer', label: 'بعد الصلاة' },
          { id: 'sleep', label: 'أذكار النوم' },
          { id: 'custom', label: 'أذكاري الخاصة' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-amber-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      {activeTab === 'general' ? (
        /* General Tasbeeh Counter Button */
        <div className="my-2 space-y-3 text-center">
          <div className="space-y-1">
            <h4 className="text-lg sm:text-xl font-bold text-amber-300 font-serif">
              سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ
            </h4>
            <p className="text-xs text-emerald-200/80 font-sans">
              كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleIncrementGeneral}
              className={`relative w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.97] text-slate-950 font-black text-sm shadow-[0_4px_20px_rgba(245,158,11,0.3)] border border-amber-200/50 cursor-pointer transition-all duration-150 flex items-center justify-between group overflow-hidden ${
                isTapped ? 'scale-95 shadow-inner' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span className="text-sm font-black">اضغط للتسبيح</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 text-amber-300 py-1.5 px-4 rounded-xl border border-amber-400/40 font-mono text-lg font-black shadow-md">
                <span className="text-xs text-amber-200 font-sans">العدد:</span>
                <span>{(dhikrData.general || 0).toLocaleString('ar-EG')}</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Pre-configured or Custom Athkar List */
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
          <button
            onClick={() => {
              setEditingItem(null);
              setNewDhikrText('');
              setNewDhikrCount(33);
              setNewDhikrCategory(activeTab);
              setNewDhikrVirtue('');
              setShowAddCustomModal(true);
            }}
            className="w-full py-2 px-3 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors mb-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>إضافة ذكر جديد (+)</span>
          </button>

          {currentCategoryItems.length === 0 ? (
            <div className="text-center py-6 text-zinc-400 text-xs font-sans">
              لا يوجد أذكار مضافة بعد في هذا التبويب.
            </div>
          ) : (
            currentCategoryItems.map(item => {
              const rem = dhikrData[item.id] !== undefined ? dhikrData[item.id] : item.count;
              const isCompleted = rem <= 0;
              const isUserCustom = item.isCustom || customAthkar.some(c => c.id === item.id);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-70'
                      : 'bg-zinc-900/60 border-amber-500/20'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm font-semibold truncate ${isCompleted ? 'line-through text-emerald-200/60' : 'text-amber-100'}`}>
                      {item.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isUserCustom && (
                      <>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setNewDhikrText(item.text);
                            setNewDhikrCount(item.count);
                            setNewDhikrCategory(item.categoryKey || activeTab);
                            setNewDhikrVirtue(item.virtue || '');
                            setShowAddCustomModal(true);
                          }}
                          className="p-1 text-zinc-400 hover:text-amber-300 transition-colors"
                          title="تعديل الذكر"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustom(item.id)}
                          className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                          title="حذف الذكر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleIncrementItem(item.id, item.count)}
                      disabled={isCompleted}
                      className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs flex items-center gap-1.5 transition-all ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-md'
                      }`}
                    >
                      <span>{isCompleted ? 'تم' : rem}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer Info & Modal Link */}
      <div className="mt-3 pt-2.5 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-amber-200/70 font-sans">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          مزامنة محلية لحفظ أذكارك
        </span>
        <button
          onClick={() => setIsFullAthkarOpen(true)}
          className="text-amber-400 hover:underline font-bold flex items-center gap-1"
        >
          <span>عرض الشاشة الكاملة</span>
          <span>←</span>
        </button>
      </div>

      {/* Add / Edit Custom Dhikr Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-2xl p-5 text-right font-sans space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {editingItem ? 'تعديل الذكر المخصص' : 'إضافة ذكر جديد (+)'}
              </h4>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomDhikr} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-amber-200/80 mb-1">
                  نص الذكر / الدعاء:
                </label>
                <textarea
                  rows={3}
                  value={newDhikrText}
                  onChange={(e) => setNewDhikrText(e.target.value)}
                  placeholder="أدخل نص الذكر أو الدعاء..."
                  required
                  className="w-full bg-zinc-800 border border-amber-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200/80 mb-1">
                  تحديد القسم:
                </label>
                <select
                  value={newDhikrCategory}
                  onChange={(e) => setNewDhikrCategory(e.target.value)}
                  className="w-full bg-zinc-800 border border-amber-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                >
                  {ALL_CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.key} value={opt.key} className="bg-zinc-900 text-amber-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200/80 mb-1">
                  العدد المطلوب (تكرار العداد):
                </label>
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={1}
                      max={999999}
                      placeholder="أدخل أي عدد مخصص..."
                      value={newDhikrCount || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        setNewDhikrCount(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      onBlur={() => {
                        if (!newDhikrCount || newDhikrCount <= 0) {
                          setNewDhikrCount(33);
                        }
                      }}
                      className="w-full bg-zinc-800 border-2 border-amber-500/40 rounded-xl p-2.5 text-sm text-amber-100 font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-zinc-500 placeholder:font-sans placeholder:text-xs shadow-inner"
                    />
                    <span className="absolute left-3 text-xs font-sans font-bold text-amber-400/80 pointer-events-none">
                      مرة
                    </span>
                  </div>

                  {/* Quick count presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-zinc-400 font-sans">أعداد سريعة:</span>
                    {[3, 10, 33, 100, 500, 1000].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setNewDhikrCount(cnt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                          newDhikrCount === cnt
                            ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-sm scale-105'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-amber-200 hover:border-amber-500/40'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-200/80 mb-1">
                  فضل الذكر / ملاحظة (اختياري):
                </label>
                <input
                  type="text"
                  value={newDhikrVirtue}
                  onChange={(e) => setNewDhikrVirtue(e.target.value)}
                  placeholder="مثال: من قالها غفرت ذنوبه..."
                  className="w-full bg-zinc-800 border border-amber-500/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-600 text-slate-950 text-xs font-black hover:opacity-90"
                >
                  حفظ الذكر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Render Full Detailed Athkar Modal */}
      <FullAthkarModal
        isOpen={isFullAthkarOpen}
        onClose={() => setIsFullAthkarOpen(false)}
        initialTab={activeTab === 'general' ? 'morning' : activeTab}
      />
    </div>
  );
}
