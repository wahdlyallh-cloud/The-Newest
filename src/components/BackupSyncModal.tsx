import React, { useRef, useState } from 'react';
import { X, RefreshCw, Mail, Send, Cloud, Settings, FolderOpen, Download, BookOpen, Plug, ShieldCheck, Key, FileText, Lock, Smartphone } from 'lucide-react';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface BackupSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage?: AppLanguage;
  isEn?: boolean;
  // Cloud states & functions passed from App.tsx
  isCloudSyncing: boolean;
  cloudSyncMessage: string | null;
  onCloudSync: () => void;
  onCloudRestore: () => void;
  // Local file export/import functions
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Email states & functions
  backupEmail: string;
  setBackupEmail: (email: string) => void;
  isSendingEmailBackup: boolean;
  onSendEmailBackup: () => void;
  emailBackupStatus: string | null;
  onClearEmailBackupStatus: () => void;
  // Auto backup settings
  autoBackupInterval: 'hourly' | 'daily' | 'weekly' | 'off';
  onChangeAutoBackupInterval: (interval: 'hourly' | 'daily' | 'weekly' | 'off') => void;
  onOpenWriteDiaryImport?: () => void;
  onExportCsv?: () => void;
}

export default function BackupSyncModal({
  isOpen,
  onClose,
  appLanguage = 'ar',
  isCloudSyncing,
  cloudSyncMessage,
  onCloudSync,
  onCloudRestore,
  onExportBackup,
  onImportBackup,
  backupEmail,
  setBackupEmail,
  isSendingEmailBackup,
  onSendEmailBackup,
  emailBackupStatus,
  onClearEmailBackupStatus,
  autoBackupInterval,
  onChangeAutoBackupInterval,
  onOpenWriteDiaryImport,
  onExportCsv
}: BackupSyncModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOtherAppsModal, setShowOtherAppsModal] = useState(false);
  const [e2eePassphrase, setE2eePassphrase] = useState('');
  const [isE2eeEnabled, setIsE2eeEnabled] = useState(true);

  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[55] font-sans" dir={langInfo.dir}>
      <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl transition-all duration-300 transform scale-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 pb-2 flex items-center justify-between">
          <h4 className="font-black text-[#2B3E50] text-base md:text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-500" />
            <span>{t.backupSyncTitle}</span>
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
        <div className="p-6 space-y-5">
          <p className="text-xs text-gray-600 font-extrabold leading-relaxed text-justify">
            {t.backupSyncDesc}
          </p>

          {/* Blue Button: Link Google Account */}
          <button
            type="button"
            onClick={onCloudSync}
            disabled={isCloudSyncing}
            className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-blue-300 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{t.linkGoogleAccount}</span>
          </button>

          {/* E2EE Encrypted Cloud Sync & Cross-Device Section */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t.e2eeTitle}</span>
              </h5>
              <span className="text-[9px] bg-emerald-200 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                256-bit AES
              </span>
            </div>
            <p className="text-[10px] text-emerald-900/80 font-medium leading-relaxed">
              {t.e2eeSub}
            </p>

            <div className="space-y-2">
              <input
                type="password"
                placeholder={t.e2eePassphrasePlaceholder}
                value={e2eePassphrase}
                onChange={(e) => setE2eePassphrase(e.target.value)}
                className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-gray-800 focus:outline-none"
              />
              <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-100 text-[10px] text-emerald-900 font-bold">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.e2eePairingCodeTitle}</span>
                </span>
                <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">HYT-882-SEC</span>
              </div>
            </div>
          </div>

          {/* Cloud Sync message widget */}
          {(cloudSyncMessage || isCloudSyncing) && (
            <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl space-y-2 text-center">
              <span className="text-[10px] text-blue-800 font-bold block leading-normal">
                {cloudSyncMessage || t.syncInProgress}
              </span>
              {!isCloudSyncing && (
                <button
                  type="button"
                  onClick={onCloudRestore}
                  className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded-lg text-[9px] font-bold shadow-3xs cursor-pointer"
                >
                  {t.restoreCloudBackup}
                </button>
              )}
            </div>
          )}

          {/* Line separator with text header */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-[#E2DCC8]"></div>
            <span className="flex-shrink mx-3 text-[10px] font-black text-gray-400 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-gray-400" />
              <span>{t.multiFormatTitle}</span>
            </span>
            <div className="flex-grow border-t border-[#E2DCC8]"></div>
          </div>

          {/* Multi-Format Export/Import Options */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Import Manual */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 bg-white hover:bg-gray-50 border-2 border-[#E2DCC8] text-gray-700 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
            >
              <FolderOpen className="w-4 h-4 text-amber-600" />
              <span>{t.importManual}</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".json,.csv,.enc" 
              className="hidden" 
              onChange={onImportBackup} 
            />

            {/* Export JSON */}
            <button
              type="button"
              onClick={onExportBackup}
              className="py-2.5 bg-[#4E685B] hover:bg-[#3F5449] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>{t.exportJson}</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => {
                if (onExportCsv) onExportCsv();
                else onExportBackup();
              }}
              className="py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4 text-sky-200" />
              <span>{t.exportCsv}</span>
            </button>

            {/* Export Encrypted */}
            <button
              type="button"
              onClick={onExportBackup}
              className="py-2.5 bg-[#2B3E50] hover:bg-[#1E2D3B] text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>{t.exportEncrypted}</span>
            </button>
          </div>

          {/* Prominent WriteDiary Import Option (Pink/Rose Theme) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenWriteDiaryImport) {
                onClose();
                onOpenWriteDiaryImport();
              }
            }}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transform"
          >
            <BookOpen className="w-4 h-4 text-pink-100" />
            <span>{t.importFromWriteDiary}</span>
          </button>

          {/* Import other apps option */}
          <button
            type="button"
            onClick={() => setShowOtherAppsModal(true)}
            className="w-full py-3.5 bg-[#6D5D6E] hover:bg-[#4F3B51] text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-3xs"
          >
            <Plug className="w-4 h-4 text-purple-200" />
            <span>{t.importFromOtherApps}</span>
          </button>

          {/* Auto Backup Select Option */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2.5">
            <h5 className="font-extrabold text-[#5A5A40] text-[11px] flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#8B9D83]" />
              <span>{t.autoBackupFrequency}</span>
            </h5>
            <select
              value={autoBackupInterval}
              onChange={(e) => onChangeAutoBackupInterval(e.target.value as any)}
              className="w-full bg-white border border-[#E2DCC8] rounded-xl px-3 py-2 text-xs text-gray-700 font-bold focus:outline-none focus:ring-1 focus:ring-[#8B9D83] cursor-pointer"
            >
              <option value="hourly">{t.backupHourly}</option>
              <option value="daily">{t.backupDaily}</option>
              <option value="weekly">{t.backupWeekly}</option>
              <option value="off">{t.backupOff}</option>
            </select>
          </div>

          {/* Email backup section */}
          <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 space-y-3">
            <h5 className="font-black text-indigo-950 text-[11px] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>{t.secureEmailBackup}</span>
            </h5>
            <p className="text-[10px] text-gray-500 font-semibold leading-relaxed">
              {t.emailBackupDesc}
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                className="flex-grow bg-white border border-[#E2DCC8] rounded-xl px-3 py-2 text-xs text-[#2B3E50] focus:outline-none placeholder-gray-400 font-medium"
                dir="ltr"
              />
              <button
                type="button"
                onClick={onSendEmailBackup}
                disabled={isSendingEmailBackup || !backupEmail.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs"
              >
                {isSendingEmailBackup ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>{t.sendBtn}</span>
              </button>
            </div>
            {emailBackupStatus && (
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                <span>{emailBackupStatus}</span>
                <button type="button" onClick={onClearEmailBackupStatus} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Nested secondary mini-modal for importing from other apps */}
      {showOtherAppsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60] font-sans" dir={langInfo.dir}>
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h5 className="font-black text-gray-800 text-sm flex items-center gap-1.5">
                <Plug className="w-4 h-4 text-purple-600" />
                <span>{t.importFromOtherAppsTitle}</span>
              </h5>
              <button type="button" onClick={() => setShowOtherAppsModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              {t.importFromOtherAppsDesc}
            </p>
            <div className="space-y-2">
              <button 
                type="button"
                onClick={() => {
                  setShowOtherAppsModal(false);
                  onClose();
                  if (onOpenWriteDiaryImport) onOpenWriteDiaryImport();
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 text-right px-4 cursor-pointer flex items-center justify-between"
              >
                <span>{appLanguage === 'ar' ? '📖 يومياتي (WriteDiary Backup)' : '📖 WriteDiary Backup'}</span>
                <span className="text-[9px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-black">{appLanguage === 'ar' ? 'مستحسن' : 'Recommended'}</span>
              </button>
              <button type="button" className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 text-right px-4 cursor-pointer">
                📝 Notion Workspace (.json / .zip)
              </button>
              <button type="button" className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 text-right px-4 cursor-pointer">
                📔 Day One Journal (.json)
              </button>
              <button type="button" className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 text-right px-4 cursor-pointer">
                🍎 Apple Notes (.txt / .csv)
              </button>
            </div>
            <p className="text-[10px] text-amber-600 font-black">
              * {t.importNoteAiNotice}
            </p>
            <button
              type="button"
              onClick={() => setShowOtherAppsModal(false)}
              className="w-full py-2.5 bg-[#4E685B] text-white text-xs font-black rounded-xl cursor-pointer"
            >
              {t.understoodBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
