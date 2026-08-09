import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RotateCcw, Heart, Volume2, VolumeX, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface DhikrItem {
  id: string;
  text: string;
  targetCount: number;
  currentCount: number;
  completedToday: boolean;
}

interface DhikrData {
  date: string;
  counts: Record<string, number>;
  completed: Record<string, boolean>;
  totalToday: number;
  history: Array<{date: string; total: number; mostUsed: string}>;
}

interface CustomDhikr {
  id: string;
  text: string;
  targetCount: number;
}

interface DhikrCounterProps {
  compact?: boolean;
  className?: string;
  appLanguage?: AppLanguage;
  isExternalWidget?: boolean;
}

const DEFAULT_DHIKR_LIST = [
  { id: 'tasbih', text: 'سبحان الله', targetCount: 33 },
  { id: 'istighfar', text: 'أستغفر الله', targetCount: 100 },
  { id: 'hawqala', text: 'لا حول ولا قوة إلا بالله', targetCount: 100 },
  { id: 'baqiyat', text: 'سبحان الله والحمد لله ولا إله إلا الله والله أكبر', targetCount: 100 },
  { id: 'yunes', text: 'لا إله إلا أنت سبحانك إني كنت من الظالمين', targetCount: 100 },
  { id: 'salah', text: 'اللهم صلِّ على محمد وعلى آل محمد', targetCount: 100 },
  { id: 'morning', text: 'أذكار الصباح', targetCount: 1 },
  { id: 'evening', text: 'أذكار المساء', targetCount: 1 },
];

const STORAGE_KEY = 'yawmiyati_dhikr_data_v2';
const CUSTOM_DHIKR_KEY = 'yawmiyati_custom_dhikr';
const AI_CONTEXT_KEY = 'yawmiyati_ai_dhikr_context';

export default function DhikrCounter({ compact = false, className = '', appLanguage = 'ar', isExternalWidget = false }: DhikrCounterProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const isEn = appLanguage === 'en';
  
  const [activeTab, setActiveTab] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('yawmiyati_dhikr_active_tab');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const [dhikrData, setDhikrData] = useState<DhikrData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load dhikr data', e);
    }
    return {
      date: new Date().toISOString().split('T')[0],
      counts: {},
      completed: {},
      totalToday: 0,
      history: []
    };
  });
  
  const [customDhikrs, setCustomDhikrs] = useState<CustomDhikr[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_DHIKR_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load custom dhikr', e);
    }
    return [];
  });
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yawmiyati_dhikr_sound') !== 'false';
    } catch {
      return true;
    }
  });
  
  const [isTapped, setIsTapped] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDhikr, setEditingDhikr] = useState<CustomDhikr | null>(null);
  const [newDhikrText, setNewDhikrText] = useState('');
  const [newDhikrCount, setNewDhikrCount] = useState(33);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Check for day change and auto-reset
  useEffect(() => {
    if (dhikrData.date !== today) {
      // Save yesterday's data to history
      const yesterdayEntry = {
        date: dhikrData.date,
        total: dhikrData.totalToday,
        mostUsed: Object.entries(dhikrData.counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      };
      
      const newData: DhikrData = {
        date: today,
        counts: {},
        completed: {},
        totalToday: 0,
        history: [...dhikrData.history.slice(-29), yesterdayEntry] // Keep last 30 days
      };
      
      setDhikrData(newData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      
      // Export to AI context
      exportToAIContext(newData);
    }
  }, [today, dhikrData.date, dhikrData.totalToday, dhikrData.counts]);
  
  // Sync tabs across instances
  useEffect(() => {
    try {
      localStorage.setItem('yawmiyati_dhikr_active_tab', activeTab.toString());
    } catch (e) {
      console.warn('Failed to save active tab', e);
    }
  }, [activeTab]);
  
  // Listen for tab changes from other instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'yawmiyati_dhikr_active_tab' && e.newValue) {
        setActiveTab(parseInt(e.newValue, 10));
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setDhikrData(JSON.parse(e.newValue));
        } catch (err) {
          console.warn('Failed to parse dhikr data from storage', err);
        }
      }
      if (e.key === CUSTOM_DHIKR_KEY && e.newValue) {
        try {
          setCustomDhikrs(JSON.parse(e.newValue));
        } catch (err) {
          console.warn('Failed to parse custom dhikr from storage', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Export data to AI context
  const exportToAIContext = useCallback((data: DhikrData) => {
    try {
      const aiContext = {
        lastUpdated: new Date().toISOString(),
        dailyTotals: data.history.map(h => ({ date: h.date, total: h.total })),
        todayTotal: data.totalToday,
        mostUsedDhikr: data.history.length > 0 ? data.history[data.history.length - 1].mostUsed : '',
        commitmentScore: calculateCommitmentScore(data.history),
        averageDaily: calculateAverageDaily(data.history)
      };
      localStorage.setItem(AI_CONTEXT_KEY, JSON.stringify(aiContext));
      
      // Dispatch event for AI system to listen to
      window.dispatchEvent(new CustomEvent('dhikr-data-updated', { detail: aiContext }));
    } catch (e) {
      console.warn('Failed to export to AI context', e);
    }
  }, []);
  
  const calculateCommitmentScore = (history: Array<{date: string; total: number}>) => {
    if (history.length === 0) return 0;
    const daysWithActivity = history.filter(h => h.total > 0).length;
    return Math.round((daysWithActivity / history.length) * 100);
  };
  
  const calculateAverageDaily = (history: Array<{date: string; total: number}>) => {
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, h) => acc + h.total, 0);
    return Math.round(sum / history.length);
  };
  
  const getCurrentDhikrList = (): DhikrItem[] => {
    const list = [...DEFAULT_DHIKR_LIST, ...customDhikrs.map(c => ({ id: `custom_${c.id}`, text: c.text, targetCount: c.targetCount }))];
    
    return list.map(item => ({
      id: item.id,
      text: item.text,
      targetCount: item.targetCount,
      currentCount: dhikrData.counts[item.id] || 0,
      completedToday: dhikrData.completed[item.id] || false
    }));
  };
  
  const currentList = getCurrentDhikrList();
  const currentItem = currentList[activeTab] || currentList[0];
  
  const handleIncrement = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const newCount = (dhikrData.counts[currentItem.id] || 0) + 1;
    const isCompleted = newCount >= currentItem.targetCount;
    
    const newData: DhikrData = {
      ...dhikrData,
      counts: { ...dhikrData.counts, [currentItem.id]: newCount },
      completed: { ...dhikrData.completed, [currentItem.id]: isCompleted },
      totalToday: dhikrData.totalToday + 1
    };
    
    setDhikrData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    exportToAIContext(newData);
    
    // Visual feedback
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 150);
    
    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch (err) {
        // ignore
      }
    }
    
    // Sound
    if (soundEnabled) {
      playSoftClickSound();
    }
  }, [dhikrData, currentItem, soundEnabled, exportToAIContext]);
  
  const playSoftClickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {
      // AudioContext might be restricted
    }
  };
  
  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('yawmiyati_dhikr_sound', next ? 'true' : 'false');
  };
  
  const handleReset = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const newData: DhikrData = {
      ...dhikrData,
      counts: { ...dhikrData.counts, [currentItem.id]: 0 },
      completed: { ...dhikrData.completed, [currentItem.id]: false },
      totalToday: dhikrData.totalToday - (dhikrData.counts[currentItem.id] || 0)
    };
    
    setDhikrData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    exportToAIContext(newData);
    setShowResetConfirm(false);
  }, [dhikrData, currentItem, exportToAIContext]);
  
  const handleResetAll = () => {
    const newData: DhikrData = {
      ...dhikrData,
      counts: {},
      completed: {},
      totalToday: 0
    };
    
    setDhikrData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    exportToAIContext(newData);
    setShowResetConfirm(false);
  };
  
  const handleAddCustomDhikr = () => {
    if (!newDhikrText.trim()) return;
    
    const newCustom: CustomDhikr = {
      id: Date.now().toString(),
      text: newDhikrText.trim(),
      targetCount: newDhikrCount
    };
    
    const updated = [...customDhikrs, newCustom];
    setCustomDhikrs(updated);
    localStorage.setItem(CUSTOM_DHIKR_KEY, JSON.stringify(updated));
    setNewDhikrText('');
    setNewDhikrCount(33);
    setShowAddModal(false);
  };
  
  const handleEditCustomDhikr = (dhikr: CustomDhikr) => {
    setEditingDhikr(dhikr);
    setNewDhikrText(dhikr.text);
    setNewDhikrCount(dhikr.targetCount);
    setShowAddModal(true);
  };
  
  const handleUpdateCustomDhikr = () => {
    if (!editingDhikr || !newDhikrText.trim()) return;
    
    const updated = customDhikrs.map(d => 
      d.id === editingDhikr.id 
        ? { ...d, text: newDhikrText.trim(), targetCount: newDhikrCount }
        : d
    );
    
    setCustomDhikrs(updated);
    localStorage.setItem(CUSTOM_DHIKR_KEY, JSON.stringify(updated));
    setNewDhikrText('');
    setNewDhikrCount(33);
    setShowAddModal(false);
    setEditingDhikr(null);
  };
  
  const handleDeleteCustomDhikr = (id: string) => {
    const updated = customDhikrs.filter(d => d.id !== id);
    setCustomDhikrs(updated);
    localStorage.setItem(CUSTOM_DHIKR_KEY, JSON.stringify(updated));
    
    // Also remove from counts
    const dhikrKey = `custom_${id}`;
    const newData: DhikrData = {
      ...dhikrData,
      counts: { ...dhikrData.counts },
      completed: { ...dhikrData.completed }
    };
    delete newData.counts[dhikrKey];
    delete newData.completed[dhikrKey];
    setDhikrData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };
  
  const formattedCount = currentItem.currentCount.toLocaleString(langInfo.code === 'ar' ? 'ar-EG' : 'en-US');
  const progressPercent = Math.min(100, Math.round((currentItem.currentCount / currentItem.targetCount) * 100));
  
  const TABS = [
    { id: 'tasbih', label: isEn ? 'Tasbih' : 'التسبيح' },
    { id: 'istighfar', label: isEn ? 'Istighfar' : 'الاستغفار' },
    { id: 'hawqala', label: isEn ? 'Hawqala' : 'الحوقلة' },
    { id: 'baqiyat', label: isEn ? 'Baqiyat' : 'الباقية الصالحات' },
    { id: 'yunes', label: isEn ? "Yunus's Dua" : 'دعاء يونس' },
    { id: 'salah', label: isEn ? 'Salah on Prophet' : 'الصلاة على النبي' },
    { id: 'morning', label: isEn ? 'Morning Dhikr' : 'أذكار الصباح' },
    { id: 'evening', label: isEn ? 'Evening Dhikr' : 'أذكار المساء' },
    { id: 'custom', label: isEn ? 'My Dhikr' : 'أذكاري الخاصة' },
  ];

  return (
    <div 
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1c3829]/90 via-[#274e3a]/85 to-[#162d21]/90 backdrop-blur-md border border-emerald-400/30 text-white p-4 sm:p-5 shadow-2xl ${className}`}
      dir={langInfo.dir}
    >
      {/* Decorative Golden Spiritual Glow background */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

      {/* Top Bar with Sound and Reset controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-amber-300/90 text-xs font-black">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>{t.dhikrTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 transition-colors cursor-pointer"
            title={soundEnabled ? (t.muteClickSound || 'Mute click sound') : (t.enableClickSound || 'Enable click sound')}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-300" />}
          </button>

          {!showResetConfirm ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowResetConfirm(true); }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-emerald-200 hover:text-rose-200 transition-colors cursor-pointer"
              title={t.resetCounter || 'Reset counter'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-rose-400/30 text-[10px]">
              <span className="text-rose-200 font-bold">{t.resetConfirm || 'Reset?'}</span>
              <button
                onClick={handleReset}
                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-black cursor-pointer"
              >
                {isEn ? 'This' : 'هذا'}
              </button>
              <button
                onClick={handleResetAll}
                className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-black cursor-pointer"
              >
                {isEn ? 'All' : 'الكل'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowResetConfirm(false); }}
                className="px-1.5 py-0.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-bold cursor-pointer"
              >
                {t.no || 'No'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Horizontal Tab Bar */}
      <div className="mb-4 overflow-x-auto scrollbar-thin scrollbar-thumb-amber-500/50 scrollbar-track-transparent">
        <div className="flex gap-1.5 min-w-max pb-1">
          {TABS.map((tab, index) => {
            const isActive = activeTab === index;
            const dhikrItem = currentList[index];
            const isCompleted = dhikrItem?.completedToday;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-emerald-200 hover:bg-white/20'
                } ${isCompleted ? 'border-2 border-emerald-400' : ''}`}
              >
                {tab.label}
                {isCompleted && <Check className="w-3 h-3 inline-block ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Dhikr Card */}
      <div className="text-center space-y-3 my-3">
        <div className="bg-white/10 py-3 px-4 rounded-2xl border border-emerald-300/20 shadow-inner">
          <h3 className="text-lg sm:text-xl font-black text-amber-300 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-serif">
            {currentItem.text}
          </h3>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400 animate-pulse" />
          <span className="text-amber-200/90 font-black">
            {isEn ? 'Target:' : 'الهدف:'} {currentItem.targetCount}
          </span>
          {currentItem.completedToday && (
            <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1">
              <Check className="w-3 h-3" />
              {isEn ? 'Completed!' : 'مكتمل!'}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Interactive Counter Button */}
      <div className="mt-4 flex flex-col items-center">
        <button
          onClick={handleIncrement}
          className={`relative w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.97] text-slate-950 font-black text-base shadow-[0_4px_20px_rgba(245,158,11,0.35)] border border-amber-200/50 cursor-pointer transition-all duration-150 flex items-center justify-between group overflow-hidden ${
            isTapped ? 'scale-95 shadow-inner' : ''
          }`}
        >
          {/* Animated Glow overlay on click */}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-active:opacity-100 transition-opacity" />

          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900/20 rounded-xl text-slate-950">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-sm sm:text-base font-black tracking-tight">
              {isEn ? 'Tap to Count' : 'اضغط للعد'} 📿
            </span>
          </div>

          {/* Persistent Counter Badge */}
          <div className="flex items-center gap-2 bg-slate-900 text-amber-300 py-1.5 px-4 rounded-xl border border-amber-400/40 font-mono text-lg font-black shadow-md">
            <span className="text-xs text-amber-200 font-sans font-extrabold">{isEn ? 'Count:' : 'العدد:'}</span>
            <span className="text-amber-300 font-extrabold">{formattedCount}</span>
          </div>
        </button>

        <p className="text-[10px] text-emerald-200/70 font-semibold mt-2 text-center">
          ✨ {t.dhikrFooter}
        </p>
      </div>

      {/* Custom Dhikr Section for "My Dhikr" Tab */}
      {activeTab === 8 && (
        <div className="mt-4 pt-4 border-t border-emerald-400/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-amber-300">
              {isEn ? 'Your Custom Dhikr List' : 'قائمة أذكاري المخصصة'}
            </h4>
            <button
              onClick={() => {
                setEditingDhikr(null);
                setNewDhikrText('');
                setNewDhikrCount(33);
                setShowAddModal(true);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-black cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? 'Add New' : 'إضافة جديد'}
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/50">
            {customDhikrs.length === 0 ? (
              <p className="text-xs text-emerald-200/60 text-center py-4">
                {isEn ? 'No custom dhikr yet. Add your first one!' : 'لا توجد أذكار مخصصة بعد. أضف أول ذكر لك!'}
              </p>
            ) : (
              customDhikrs.map((dhikr) => {
                const dhikrKey = `custom_${dhikr.id}`;
                const count = dhikrData.counts[dhikrKey] || 0;
                const completed = dhikrData.completed[dhikrKey] || false;
                
                return (
                  <div
                    key={dhikr.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl bg-white/5 border ${
                      completed ? 'border-emerald-400/50' : 'border-emerald-400/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-100 truncate">{dhikr.text}</p>
                      <p className="text-[10px] text-amber-300/80 mt-0.5">
                        {count} / {dhikr.targetCount}
                        {completed && <span className="text-emerald-400 ml-1">✓</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditCustomDhikr(dhikr)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomDhikr(dhikr.id)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-gradient-to-b from-[#1c3829] to-[#162d21] rounded-2xl border border-emerald-400/30 p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-amber-300 mb-4">
              {editingDhikr ? (isEn ? 'Edit Custom Dhikr' : 'تعديل الذكر المخصص') : (isEn ? 'Add New Custom Dhikr' : 'إضافة ذكر مخصص جديد')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  {isEn ? 'Dhikr Text' : 'نص الذكر'}
                </label>
                <textarea
                  value={newDhikrText}
                  onChange={(e) => setNewDhikrText(e.target.value)}
                  placeholder={isEn ? 'Enter the dhikr text...' : 'أدخل نص الذكر...'}
                  className="w-full p-3 rounded-xl bg-white/10 border border-emerald-400/30 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  {isEn ? 'Target Count' : 'العدد المطلوب'}
                </label>
                <input
                  type="number"
                  value={newDhikrCount}
                  onChange={(e) => setNewDhikrCount(parseInt(e.target.value) || 33)}
                  className="w-full p-3 rounded-xl bg-white/10 border border-emerald-400/30 text-white text-sm focus:outline-none focus:border-amber-500"
                  min="1"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  {t.cancelBtn || 'إلغاء'}
                </button>
                <button
                  onClick={editingDhikr ? handleUpdateCustomDhikr : handleAddCustomDhikr}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  {editingDhikr ? (isEn ? 'Update' : 'تحديث') : (isEn ? 'Add' : 'إضافة')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Stats Summary */}
      <div className="mt-4 pt-3 border-t border-emerald-400/20">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-[10px] text-emerald-200/70">{isEn ? 'Today' : 'اليوم'}</p>
            <p className="text-lg font-black text-amber-300">{dhikrData.totalToday.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-[10px] text-emerald-200/70">{isEn ? 'Avg Daily' : 'متوسط يومي'}</p>
            <p className="text-lg font-black text-emerald-300">{calculateAverageDaily(dhikrData.history)}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-[10px] text-emerald-200/70">{isEn ? 'Commitment' : 'الالتزام'}</p>
            <p className="text-lg font-black text-rose-300">{calculateCommitmentScore(dhikrData.history)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

