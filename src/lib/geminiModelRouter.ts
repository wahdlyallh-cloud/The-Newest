import { AITaskType, getCandidateApiKeys } from './apiKeyManager';

export type GeminiModelMode = 'auto' | 'fast' | 'precision' | string;
export type GeminiTask = AITaskType | 'chat' | 'summary' | 'audio' | 'voice' | 'video' | 'image' | 'pdf' | 'report' | 'deep';

const STORAGE_MODE = 'hayat_gemini_model_mode';
const STORAGE_CACHE = 'hayat_gemini_discovered_models';
const DISCOVERY_TTL_MS = 12 * 60 * 60 * 1000;
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const EXCLUDED = ['embedding', 'imagen', 'aqa', 'deprecated', 'tts', 'veo', 'live', 'robotics'];

export interface DiscoveredGeminiModel {
  id: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
  version?: string;
}

interface CacheEntry { timestamp: number; models: DiscoveredGeminiModel[]; }

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}
function clean(id: string): string { return String(id || '').replace(/^models\//, '').trim(); }
function versionScore(id: string): number {
  const match = id.match(/gemini-(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
}
function accuracyScore(id: string): number {
  const lower = id.toLowerCase();
  return versionScore(lower) * 1000 + (lower.includes('pro') ? 500 : lower.includes('flash') && !lower.includes('lite') ? 300 : lower.includes('flash-lite') || lower.includes('lite') ? 100 : 200);
}
function latencyScore(id: string): number {
  const lower = id.toLowerCase();
  return (lower.includes('flash-lite') || lower.includes('lite') ? 500 : lower.includes('flash') ? 300 : 100) + versionScore(lower) * 10;
}
function normalizeModels(raw: any): DiscoveredGeminiModel[] {
  const list = Array.isArray(raw?.models) ? raw.models : [];
  return list.map((m: any) => ({
    id: clean(m?.name), displayName: m?.displayName,
    supportedGenerationMethods: m?.supportedGenerationMethods,
    version: m?.version
  })).filter((m: DiscoveredGeminiModel) => {
    const id = m.id.toLowerCase();
    const methods = m.supportedGenerationMethods || [];
    return id.startsWith('gemini-') && (methods.length === 0 || methods.includes('generateContent')) && !EXCLUDED.some(x => id.includes(x));
  }).sort((a, b) => versionScore(b.id) - versionScore(a.id) || accuracyScore(b.id) - accuracyScore(a.id));
}

function loadCache(key: string): CacheEntry | null {
  try {
    const raw = storage()?.getItem(STORAGE_CACHE);
    const parsed = raw ? JSON.parse(raw) : {};
    const entry = parsed?.[key];
    return entry && Array.isArray(entry.models) ? entry : null;
  } catch { return null; }
}
function saveCache(key: string, models: DiscoveredGeminiModel[]) {
  try {
    const st = storage(); if (!st) return;
    const raw = st.getItem(STORAGE_CACHE); const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = { timestamp: Date.now(), models };
    st.setItem(STORAGE_CACHE, JSON.stringify(parsed));
  } catch { /* localStorage can be unavailable in WebView private mode */ }
}

export function getSelectedModelMode(): GeminiModelMode {
  try { return storage()?.getItem(STORAGE_MODE) || 'auto'; } catch { return 'auto'; }
}
export function setSelectedModelMode(mode: GeminiModelMode): void {
  try { storage()?.setItem(STORAGE_MODE, mode || 'auto'); } catch { /* ignore */ }
}
export function getDiscoveredModels(key?: string): DiscoveredGeminiModel[] {
  const keys = key ? [key] : getCandidateApiKeys();
  for (const item of keys) { const hit = loadCache(item.trim()); if (hit) return hit.models; }
  return [];
}

export async function refreshDiscoveredModels(key?: string): Promise<DiscoveredGeminiModel[]> {
  const keys = key ? [key] : getCandidateApiKeys();
  const all: DiscoveredGeminiModel[] = [];
  for (const item of keys) {
    const cleanKey = item.trim(); if (!cleanKey) continue;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const models = normalizeModels(data);
      if (models.length) {
        saveCache(cleanKey, models);
        // Also save to generic key for instant retrieval
        saveCache('default', models);
        all.push(...models);
      }
    } catch { /* try the next configured key */ }
  }
  const unique = new Map(all.map(model => [model.id, model]));
  const result = Array.from(unique.values()).sort((a, b) => versionScore(b.id) - versionScore(a.id) || accuracyScore(b.id) - accuracyScore(a.id));
  if (result.length > 0 && typeof window !== 'undefined') {
    try {
      localStorage.setItem('yawmiyati_gemini_active_models_list', JSON.stringify(result));
    } catch {}
  }
  return result;
}

export async function selectModelsForTask(task: GeminiTask = 'chat', key?: string, modeOverride?: GeminiModelMode): Promise<string[]> {
  const mode = modeOverride || getSelectedModelMode();
  const models = getDiscoveredModels(key);
  const discovered = models.length ? models.map(m => m.id) : FALLBACK_MODELS;
  const heavy = ['multimodal', 'deep', 'reasoning', 'audio', 'voice', 'video', 'image', 'pdf', 'report'].includes(task);
  if (mode !== 'auto' && mode !== 'fast' && mode !== 'precision') return [clean(mode), ...discovered.filter(m => m !== clean(mode))];
  const sorted = [...discovered].sort((a, b) => mode === 'fast' ? latencyScore(b) - latencyScore(a) : accuracyScore(b) - accuracyScore(a));
  if (mode === 'auto' && !heavy) sorted.sort((a, b) => latencyScore(b) - latencyScore(a));
  return Array.from(new Set(sorted));
}

export async function getModelsForKeyAndTask(key: string, task: GeminiTask = 'chat', modeOverride?: GeminiModelMode): Promise<string[]> {
  const cached = loadCache(key.trim());
  if (!cached || Date.now() - cached.timestamp >= DISCOVERY_TTL_MS) await refreshDiscoveredModels(key);
  return selectModelsForTask(task, key, modeOverride);
}
