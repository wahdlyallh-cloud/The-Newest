import React, { useEffect, useMemo, useState } from 'react';
import AIMediaAccessSelector from './AIMediaAccessSelector';
import { AIMediaAccessPermission, DEFAULT_AI_MEDIA_ACCESS, extractAvailableAttachments } from '../lib/aiMediaAccess';
import { DiaryEntry, AppLanguage } from '../types';

export const PROS_CONS_MEDIA_PREF_KEY = 'prosConsMediaPrefByDate';
export type DailyProsConsMediaPrefs = Record<string, AIMediaAccessPermission>;

export function loadProsConsMediaPreference(dateKey: string): AIMediaAccessPermission {
  try {
    const raw = localStorage.getItem(PROS_CONS_MEDIA_PREF_KEY);
    const all: DailyProsConsMediaPrefs = raw ? JSON.parse(raw) : {};
    const saved = all[dateKey];
    if (!saved || !['text-only', 'by-type', 'selected'].includes(saved.mode)) return { ...DEFAULT_AI_MEDIA_ACCESS };
    return { ...DEFAULT_AI_MEDIA_ACCESS, ...saved, selectedAttachmentIds: Array.isArray(saved.selectedAttachmentIds) ? saved.selectedAttachmentIds : [] };
  } catch {
    return { ...DEFAULT_AI_MEDIA_ACCESS };
  }
}

export function saveProsConsMediaPreference(dateKey: string, permission: AIMediaAccessPermission): void {
  try {
    const raw = localStorage.getItem(PROS_CONS_MEDIA_PREF_KEY);
    const all: DailyProsConsMediaPrefs = raw ? JSON.parse(raw) : {};
    all[dateKey] = permission;
    localStorage.setItem(PROS_CONS_MEDIA_PREF_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('pros-cons-media-pref-changed', { detail: { dateKey, permission } }));
  } catch (error) {
    console.warn('[DailyProsConsMediaSelector] Could not save preference:', error);
  }
}

interface Props {
  dateKey: string;
  diaries: DiaryEntry[];
  appLanguage?: AppLanguage;
  compact?: boolean;
  onPreferenceChange?: (permission: AIMediaAccessPermission) => void;
}

export default function DailyProsConsMediaSelector({ dateKey, diaries, appLanguage = 'ar', compact = true, onPreferenceChange }: Props) {
  const [permission, setPermission] = useState<AIMediaAccessPermission>(() => loadProsConsMediaPreference(dateKey));
  const attachments = useMemo(() => extractAvailableAttachments(diaries), [diaries]);
  useEffect(() => {
    setPermission(loadProsConsMediaPreference(dateKey));
  }, [dateKey]);
  useEffect(() => {
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.dateKey === dateKey) setPermission(detail.permission);
    };
    window.addEventListener('pros-cons-media-pref-changed', handleChange);
    return () => window.removeEventListener('pros-cons-media-pref-changed', handleChange);
  }, [dateKey]);
  const handleChange = (next: AIMediaAccessPermission) => {
    setPermission(next);
    saveProsConsMediaPreference(dateKey, next);
    onPreferenceChange?.(next);
  };
  return <div className={compact ? 'w-full max-w-sm' : 'w-full'}>
    <AIMediaAccessSelector permission={permission} onChange={handleChange} availableAttachments={attachments} appLanguage={appLanguage} compact={compact} />
  </div>;
}
