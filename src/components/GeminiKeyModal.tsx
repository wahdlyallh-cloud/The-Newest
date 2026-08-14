import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Globe, Plus, CheckCircle, AlertTriangle, ShieldCheck, ArrowUp, ArrowDown, Trash2, Key } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import { ApiKeyPoolEntry, ApiKeyStatus } from '../types';
import { maskApiKey, testGeminiApiKey } from '../lib/apiKeyManager';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
  apiKeys?: ApiKeyPoolEntry[];
  activeKeyId?: string;
  onSave?: (key: string) => void;
  onSavePool?: (keys: ApiKeyPoolEntry[], activeId: string) => void;
  onClear?: () => void;
  appLanguage?: AppLanguage;
}

export default function GeminiKeyModal({
  isOpen,
  onClose,
  apiKey = '',
  apiKeys = [],
  activeKeyId,
  onSave,
  onSavePool,
  onClear,
  appLanguage = 'ar'
}: GeminiKeyModalProps) {
  const [keysList, setKeysList] = useState<ApiKeyPoolEntry[]>([]);
  const [selectedActiveId, setSelectedActiveId] = useState<string>('');

  // New Key input form state
  const [newKeyInput, setNewKeyInput] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyText, setShowNewKeyText] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Testing & Error State
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  // Initialize pool on open
  useEffect(() => {
    if (!isOpen) return;

    if (apiKeys && apiKeys.length > 0) {
      setKeysList(apiKeys);
      setSelectedActiveId(activeKeyId || apiKeys[0]?.id || '');
    } else if (apiKey && apiKey.trim() !== '') {
      const initialMain: ApiKeyPoolEntry = {
        id: 'key_main_init',
        name: 'المفتاح الرئيسي',
        key: apiKey.trim(),
        status: 'ready',
        isEnabled: true,
        priority: 1,
        requestsToday: 0,
        successfulRequests: 0,
        failedRequests: 0,
        createdAt: new Date().toISOString()
      };
      setKeysList([initialMain]);
      setSelectedActiveId(initialMain.id);
    } else {
      setKeysList([]);
      setSelectedActiveId('');
    }
  }, [isOpen, apiKey, apiKeys, activeKeyId]);

  if (!isOpen) return null;

  // Add new key to pool (Max 5)
  const handleAddNewKey = async () => {
    const cleanKey = newKeyInput.trim();
    if (!cleanKey) return;
    if (keysList.length >= 5) {
      alert('الحد الأقصى لمفتايح API هو 5 مفاتيح فقط.');
      return;
    }

    const newEntry: ApiKeyPoolEntry = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newKeyName.trim() || `المفتاح ${keysList.length + 1}`,
      key: cleanKey,
      status: 'ready',
      isEnabled: true,
      priority: keysList.length + 1,
      requestsToday: 0,
      successfulRequests: 0,
      failedRequests: 0,
      createdAt: new Date().toISOString()
    };

    const updated = [...keysList, newEntry];
    setKeysList(updated);
    if (!selectedActiveId || updated.length === 1) {
      setSelectedActiveId(newEntry.id);
    }

    setNewKeyInput('');
    setNewKeyName('');
    setShowAddForm(false);
  };

  // Test an individual key
  const handleTestKey = async (entry: ApiKeyPoolEntry) => {
    setTestingKeyId(entry.id);
    setTestResult(null);

    const res = await testGeminiApiKey(entry.key);

    // Update local status in state
    setKeysList(prev => prev.map(k => {
      if (k.id === entry.id) {
        return {
          ...k,
          status: res.success ? 'ready' : (res.message.includes('Quota') ? 'quota_exhausted' : 'invalid'),
          lastErrorMsg: res.success ? undefined : res.message
        };
      }
      return k;
    }));

    setTestResult({ id: entry.id, success: res.success, message: res.message });
    setTestingKeyId(null);
  };

  // Delete a key from pool
  const handleDeleteKey = (id: string) => {
    const filtered = keysList.filter(k => k.id !== id);
    const reordered = filtered.map((k, idx) => ({ ...k, priority: idx + 1 }));
    setKeysList(reordered);
    if (selectedActiveId === id) {
      setSelectedActiveId(reordered[0]?.id || '');
    }
  };

  // Toggle key enabled/disabled
  const handleToggleKey = (id: string) => {
    setKeysList(prev => prev.map(k => {
      if (k.id === id) {
        return { ...k, isEnabled: !k.isEnabled };
      }
      return k;
    }));
  };

  // Save changes to settings
  const handleSaveAll = () => {
    if (onSavePool) {
      onSavePool(keysList, selectedActiveId);
    }
    if (onSave) {
      const activeObj = keysList.find(k => k.id === selectedActiveId);
      onSave(activeObj ? activeObj.key : (keysList[0]?.key || ''));
    }
    onClose();
  };

  const handleClearAll = () => {
    if (onClear) onClear();
    setKeysList([]);
    setSelectedActiveId('');
    if (onSave) onSave('');
    onClose();
  };

  const getStatusBadge = (status: ApiKeyStatus, isEnabled: boolean) => {
    if (!isEnabled) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">⚪ معطل Standby</span>;
    }
    switch (status) {
      case 'ready':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 جاهز Ready</span>;
      case 'rate_limited':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">🟡 انتظار مؤقت Rate Limited</span>;
      case 'quota_exhausted':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">🔴 حد الحصة مكتمل Quota Exhausted</span>;
      case 'invalid':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">❌ غير صالح Invalid</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">⚪ احتياطي Standby</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[55] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 max-h-[88dvh] sm:max-h-[90vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between border-b border-[#E2DCC8]/40">
          <h4 className="font-black text-[#2B3E50] text-base md:text-lg flex items-center gap-2">
            <span>🔑</span>
            <span>مجمع مفاتيح Gemini API Pool</span>
            <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
              {keysList.length}/5
            </span>
          </h4>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 pb-12 sm:pb-6">
          <p className="text-xs text-gray-600 font-extrabold leading-relaxed text-justify">
            إدارة مفاتيح Gemini API المتعددة مع التبديل التلقائي عند اكتمال حد المفتاح الرئيسي (Automatic Failover & Key Rotation).
          </p>

          <div className="bg-amber-50/20 border border-amber-200/60 rounded-2xl p-3 text-[11px] text-amber-900 font-bold leading-relaxed">
            ℹ️ ملاحظة: المفاتيح المحفوظة تُستخدم فقط محلياً داخل جهازك للاتصال المستقر بخدمات الذكاء الاصطناعي.
          </div>

          {/* Keys Pool List */}
          <div className="space-y-3">
            {keysList.map((entry, index) => {
              const isActive = entry.id === selectedActiveId;
              const isTesting = testingKeyId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`border-2 rounded-2xl p-4 transition-all ${
                    isActive ? 'border-[#3F5449] bg-white shadow-md' : 'border-[#E2DCC8] bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#2B3E50] text-white text-[10px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setKeysList(prev => prev.map(k => k.id === entry.id ? { ...k, name: val } : k));
                        }}
                        className="font-black text-xs text-[#2B3E50] bg-transparent focus:outline-none focus:border-b border-[#8B9D83]"
                        placeholder="اسم المفتاح"
                      />
                    </div>
                    {getStatusBadge(entry.status, entry.isEnabled)}
                  </div>

                  {/* Masked Key Display */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 mb-2 font-mono text-xs font-bold text-gray-700">
                    <span>{maskApiKey(entry.key)}</span>
                    <button
                      type="button"
                      onClick={() => alert(`مفتاح API الكامل:\n${entry.key}`)}
                      className="text-gray-400 hover:text-gray-600 p-1 text-[11px] font-sans font-bold"
                    >
                      إظهار
                    </button>
                  </div>

                  {/* Test Result Message */}
                  {testResult && testResult.id === entry.id && (
                    <div className={`text-[11px] font-bold p-2 rounded-xl mb-2 ${
                      testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {testResult.message}
                    </div>
                  )}

                  {/* Usage Stats & Action Bar */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold pt-1 border-t border-gray-100">
                    <span>الطلبات اليوم: {entry.requestsToday || 0}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedActiveId(entry.id)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                          isActive ? 'bg-[#3F5449] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isActive ? 'نشط Active' : 'تفعيل'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestKey(entry)}
                        disabled={isTesting}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                      >
                        {isTesting ? 'جاري الفحص...' : 'فحص Test'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteKey(entry.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        title="حذف المفتاح"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Key Form / Button */}
          {keysList.length < 5 && (
            <div>
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-3 bg-[#F5EFE6] border-2 border-dashed border-[#8B9D83]/60 hover:border-[#8B9D83] text-[#2B3E50] font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#3F5449]" />
                  <span>إضافة مفتاح Gemini API جديد (حتى 5 مفاتيح)</span>
                </button>
              ) : (
                <div className="bg-white border-2 border-[#8B9D83] rounded-2xl p-4 space-y-3">
                  <h5 className="font-black text-xs text-[#2B3E50]">إضافة مفتاح جديد للـ Pool</h5>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="اسم اختياري (مثال: المفتاح الاحتياطي 1)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#2B3E50] focus:outline-none focus:border-[#8B9D83]"
                  />
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <input
                      type={showNewKeyText ? "text" : "password"}
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      placeholder="أدخل مفتاح Gemini API الجديد"
                      className="w-full bg-transparent text-xs font-mono text-[#2B3E50] focus:outline-none font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewKeyText(!showNewKeyText)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showNewKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewKey}
                      disabled={!newKeyInput.trim()}
                      className="flex-1 py-2 bg-[#3F5449] hover:bg-[#2C3E50] text-white font-black text-xs rounded-xl disabled:opacity-50"
                    >
                      إضافة للـ Pool
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Get Free Key Link Card */}
          <a
            href="https://aistudio.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#F5EFE6] border border-[#E2DCC8] hover:bg-[#EADFC9] text-[#5A4F41] font-extrabold text-xs py-3 rounded-2xl transition-all cursor-pointer shadow-3xs"
          >
            <Globe className="w-4 h-4 text-sky-600" />
            <span>{t.getFreeKeyLink}</span>
          </a>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="flex-1 py-3 bg-white hover:bg-red-50 border-2 border-red-100 hover:border-red-200 text-red-600 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <span>🗑️</span>
              <span>مسح جميع المفاتيح</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="flex-1 py-3 bg-[#3F5449] hover:bg-[#2C3E50] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md"
            >
              <span>💾</span>
              <span>حفظ مجمع المفاتيح</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
