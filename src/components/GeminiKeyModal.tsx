import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Globe, Plus, CheckCircle, AlertTriangle, ShieldCheck, ArrowUp, ArrowDown, Trash2, Key } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';
import { ApiKeyPoolEntry, ApiKeyStatus } from '../types';
import { maskApiKey, testGeminiApiKey, discoverGoogleModels } from '../lib/apiKeyManager';
import { refreshDiscoveredModels } from '../lib/geminiModelRouter';
import NativeModalHeader from './NativeModalHeader';
import { useRegisterBackStep } from '../lib/navigationStack';

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
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; verifiedModel?: string } | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanSummary, setScanSummary] = useState<string>('');

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  useRegisterBackStep('modal_gemini_key', 'modal', isOpen, onClose, t.geminiPoolTitle);

  // Sync settings when external event fires
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail?.apiKeys) {
        setKeysList(e.detail.apiKeys);
      }
    };
    window.addEventListener('yawmiyati_settings_updated', handleSync);
    return () => window.removeEventListener('yawmiyati_settings_updated', handleSync);
  }, []);

  // Initialize pool on open
  useEffect(() => {
    if (!isOpen) return;

    if (apiKeys && apiKeys.length > 0) {
      setKeysList(apiKeys);
      setSelectedActiveId(activeKeyId || apiKeys[0]?.id || '');
    } else if (apiKey && apiKey.trim() !== '') {
      const initialMain: ApiKeyPoolEntry = {
        id: 'key_main_init',
        name: t.mainApiKeyLabel,
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
      alert(t.apiKeyMaxLimitAlert);
      return;
    }

    const newEntry: ApiKeyPoolEntry = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newKeyName.trim() || `${t.keyNumberPrefix || 'Key'} ${keysList.length + 1}`,
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

    const updatedList = keysList.map(k => {
      if (k.id === entry.id) {
        let newStatus: ApiKeyStatus = k.status;
        if (res.success) {
          newStatus = 'ready';
        } else if (res.errorType === 'invalid_key') {
          newStatus = 'invalid';
        } else if (res.errorType === 'quota_exhausted' || res.errorType === 'rate_limited') {
          newStatus = 'quota_exhausted';
        } else {
          newStatus = 'standby';
        }

        return {
          ...k,
          status: newStatus,
          verifiedModel: res.verifiedModel || k.verifiedModel,
          lastErrorMsg: res.success ? undefined : res.message,
          rateLimitResetAt: res.success ? undefined : k.rateLimitResetAt,
          requestsToday: res.success ? (k.requestsToday || 0) + 1 : k.requestsToday
        };
      }
      return k;
    });

    setKeysList(updatedList);

    // Auto-persist healthy state immediately so verified state is never lost even if modal closed without Save
    if (res.success) {
      try {
        const saved = localStorage.getItem('yawmiyati_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.apiKeys = updatedList;
          if (!parsed.userApiKey || parsed.userApiKey.trim() === '') {
            parsed.userApiKey = entry.key;
          }
          localStorage.setItem('yawmiyati_settings', JSON.stringify(parsed));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('yawmiyati_settings_updated', { detail: parsed }));
          }
        }
      } catch (_) {}

      if (onSavePool) {
        onSavePool(updatedList, selectedActiveId);
      }
    }

    const resultMessage = res.success
      ? (t.apiKeyVerified || 'Key verified successfully 🎉')
      : (res.errorType === 'invalid_key' ? (t.apiKeyInvalidError || 'API key invalid') : (res.errorType === 'quota_exhausted' ? (t.apiKeyStatusQuotaExhausted || 'Quota exhausted') : res.message));

    setTestResult({
      id: entry.id,
      success: res.success,
      message: resultMessage,
      verifiedModel: res.verifiedModel
    });
    setTestingKeyId(null);
  };

  const handleScanAllKeys = async () => {
    if (isScanningAll) return;
    setIsScanningAll(true);
    setScanSummary('');
    let healthy = 0;
    const updated = [...keysList];
    for (let index = 0; index < updated.length; index++) {
      const entry = updated[index];
      if (!entry.key.trim()) continue;
      const result = await testGeminiApiKey(entry.key);
      if (result.success) healthy++;
      updated[index] = {
        ...entry,
        status: result.success ? 'ready' : result.errorType === 'invalid_key' ? 'invalid' : result.errorType === 'quota_exhausted' || result.errorType === 'rate_limited' ? 'rate_limited' : 'standby',
        verifiedModel: result.verifiedModel || entry.verifiedModel,
        lastErrorMsg: result.success ? undefined : result.message,
        requestsToday: result.success ? (entry.requestsToday || 0) + 1 : entry.requestsToday
      };
    }
    await refreshDiscoveredModels().catch(() => []);
    setKeysList(updated);
    setScanSummary((t.geminiHealthyKeysSummary || 'Healthy ready keys: {count} of {total}').replace('{count}', String(healthy)).replace('{total}', String(updated.filter(k => k.key.trim()).length)));
    setIsScanningAll(false);
  };

  // Move key up or down in ordered priority list
  const handleMoveKey = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= keysList.length) return;
    const copy = [...keysList];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    const reordered = copy.map((k, idx) => ({ ...k, priority: idx + 1 }));
    setKeysList(reordered);
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

  const getStatusBadge = (entry: ApiKeyPoolEntry) => {
    if (!entry.key.trim()) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t.geminiKeyEmptyPill || 'فارغ'}</span>;
    }
    if (entry.id === selectedActiveId && entry.status !== 'invalid') {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{t.geminiKeyActivePill || 'نشط الآن'}</span>;
    }
    if (!entry.isEnabled) {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t.geminiKeyStandbyPill || 'احتياطي جاهز'}</span>;
    }
    const isCoolingDown = (entry.status === 'rate_limited' || entry.status === 'quota_exhausted') && entry.rateLimitResetAt && Date.now() < entry.rateLimitResetAt;
    const remainingSec = isCoolingDown ? Math.ceil((entry.rateLimitResetAt! - Date.now()) / 1000) : 0;

    switch (entry.status) {
      case 'ready':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{t.geminiKeyStandbyPill || 'احتياطي جاهز'}</span>;
      case 'rate_limited':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <span>{t.geminiKeyCooldownPill || 'في فترة تهدئة - ينتقل تلقائيًا'}</span>
            {isCoolingDown && <span className="text-[9px] opacity-80">({remainingSec}s)</span>}
          </span>
        );
      case 'quota_exhausted':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <span>{t.geminiKeyCooldownPill || 'في فترة تهدئة - ينتقل تلقائيًا'}</span>
            {isCoolingDown && <span className="text-[9px] opacity-80">({remainingSec}s)</span>}
          </span>
        );
      case 'invalid':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">{t.apiKeyStatusInvalid}</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.apiKeyStatusStandby}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 z-[55] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border-0 sm:border sm:border-[#E2DCC8] rounded-none sm:rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        
        {/* Native App Bar Header */}
        <NativeModalHeader
          title={t.geminiPoolTitle}
          subtitle={`${keysList.length}/5`}
          icon={<span className="text-base">🔑</span>}
          onBack={onClose}
          isRtl={langInfo.dir === 'rtl'}
          theme="light"
          rightAction={
            <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded-full">
              {keysList.length}/5
            </span>
          }
        />

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-4 pb-12 sm:pb-6">
          <p className="text-xs text-gray-600 font-extrabold leading-relaxed text-justify">
            {t.geminiPoolDesc}
          </p>

          <div className="bg-amber-50/20 border border-amber-200/60 rounded-2xl p-3 text-[11px] text-amber-900 font-bold leading-relaxed">
            ℹ️ {t.geminiPoolNote}
          </div>

          <button
            type="button"
            onClick={handleScanAllKeys}
            disabled={isScanningAll || keysList.length === 0}
            className="w-full py-3 rounded-2xl bg-[#2B3E50] text-white text-xs font-black disabled:opacity-50 transition-all"
          >
            {isScanningAll ? (t.apiKeyTesting || 'جاري الفحص...') : (t.geminiScanKeys || 'فحص الـ 5 مفاتيح وتحديث النماذج')}
          </button>
          {scanSummary && <div className="text-center text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2">{scanSummary}</div>}

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
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#2B3E50] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-black text-gray-400 shrink-0">
                        {t.keyNumberPrefix || 'Key'} #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={entry.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setKeysList(prev => prev.map(k => k.id === entry.id ? { ...k, name: val } : k));
                        }}
                        className="font-black text-xs text-[#2B3E50] bg-transparent focus:outline-none focus:border-b border-[#8B9D83] flex-1 truncate"
                        placeholder={`${t.keyNumberPrefix || 'Key'} #${index + 1}`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Prevent contradictory badges: never render active badge if key is invalid */}
                      {isActive && entry.status !== 'invalid' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#3F5449] text-white flex items-center gap-1 shadow-3xs shrink-0">
                          <span>⚡</span>
                          <span>{t.apiKeyActiveNow || 'النشط حالياً'}</span>
                        </span>
                      )}
                      {/* Subtle active verified model badge when healthy */}
                      {entry.verifiedModel && entry.status === 'ready' && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 shrink-0" title={entry.verifiedModel}>
                          <span>🤖</span>
                          <span dir="ltr" className="inline-block font-mono">{entry.verifiedModel}</span>
                        </span>
                      )}
                      {getStatusBadge(entry)}
                    </div>
                  </div>

                  {/* Masked Key Display */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 mb-2 font-mono text-xs font-bold text-gray-700">
                    <span>{maskApiKey(entry.key)}</span>
                    <button
                      type="button"
                      onClick={() => alert(`${t.fullApiKey}:\n${entry.key}`)}
                      className="text-gray-400 hover:text-gray-600 p-1 text-[11px] font-sans font-bold"
                    >
                      {t.showBtn}
                    </button>
                  </div>

                  {/* Test Result Message */}
                  {testResult && testResult.id === entry.id && (
                    <div className={`text-[11px] font-bold p-2.5 rounded-xl mb-2 flex items-center justify-between gap-1.5 flex-wrap ${
                      testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{testResult.message}</span>
                        {testResult.verifiedModel && (
                          <span>(<span dir="ltr" className="inline-block font-mono font-bold">{testResult.verifiedModel}</span>)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Usage Stats & Action Bar */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold pt-1 border-t border-gray-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span>{t.requestsTodayLabel || 'الطلبات اليوم:'} {entry.requestsToday || 0}</span>
                      <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveKey(index, 'up')}
                          className="p-1 text-gray-600 hover:text-black hover:bg-white disabled:opacity-20 rounded-md cursor-pointer transition-colors"
                          title={t.moveUpTitle || 'تحريك للأعلى'}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === keysList.length - 1}
                          onClick={() => handleMoveKey(index, 'down')}
                          className="p-1 text-gray-600 hover:text-black hover:bg-white disabled:opacity-20 rounded-md cursor-pointer transition-colors"
                          title={t.moveDownTitle || 'تحريك للأسفل'}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedActiveId(entry.id)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                          isActive ? 'bg-[#3F5449] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isActive ? (t.apiKeyActive || 'نشط') : (t.apiKeyActivate || 'تفعيل')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTestKey(entry)}
                        disabled={isTesting}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                      >
                        {isTesting ? (t.apiKeyTesting || t.analyzing || 'جاري الفحص...') : (t.apiKeyTest || 'فحص')}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteKey(entry.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                        title={t.deleteDhikr || t.deleteKey}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, 5 - keysList.length) }).map((_, index) => (
              <div key={`empty-key-slot-${index}`} className="border border-dashed border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between bg-gray-50/60">
                <span className="text-[11px] font-bold text-gray-400">{t.keyNumberPrefix || 'Key'} #{keysList.length + index + 1}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t.geminiKeyEmptyPill || 'فارغ'}</span>
              </div>
            ))}
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
                  <span>{t.addKeyToPool}</span>
                </button>
              ) : (
                <div className="bg-white border-2 border-[#8B9D83] rounded-2xl p-4 space-y-3">
                  <h5 className="font-black text-xs text-[#2B3E50]">{t.addKeyToPool}</h5>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t.keyNamePlaceholder}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#2B3E50] focus:outline-none focus:border-[#8B9D83]"
                  />
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <input
                      type={showNewKeyText ? "text" : "password"}
                      value={newKeyInput}
                      onChange={(e) => setNewKeyInput(e.target.value)}
                      placeholder={t.enterNewApiKey}
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
                      {t.cancel || 'إلغاء'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewKey}
                      disabled={!newKeyInput.trim()}
                      className="flex-1 py-2 bg-[#3F5449] hover:bg-[#2C3E50] text-white font-black text-xs rounded-xl disabled:opacity-50"
                    >
                      {t.addKeySubmit || 'إضافة المفتاح'}
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
              <span>{t.clearAllKeys}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="flex-1 py-3 bg-[#3F5449] hover:bg-[#2C3E50] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md"
            >
              <span>💾</span>
              <span>{t.saveKeyPool}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
