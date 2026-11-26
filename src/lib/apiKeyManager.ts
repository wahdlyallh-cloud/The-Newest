import { AppSettings, ApiKeyPoolEntry, ApiKeyStatus } from '../types';

const STORAGE_KEY = 'yawmiyati_settings';

/**
 * Mask API Key for safe display: e.g. "AIza...WXYZ"
 */
export function maskApiKey(key: string): string {
  if (!key || key.trim() === '') return '';
  const clean = key.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.substring(0, 4)}••••••••${clean.substring(clean.length - 4)}`;
}

/**
 * Migration helper: Automatically converts legacy single userApiKey to apiKeys pool
 */
export function migrateSettingsApiKeys(settings: AppSettings): AppSettings {
  if (!settings) return settings;

  let pool = settings.apiKeys ? [...settings.apiKeys] : [];
  let activeId = settings.activeKeyId;

  // If legacy userApiKey exists but pool is empty, migrate it into pool as Key 1
  if (settings.userApiKey && settings.userApiKey.trim() !== '' && pool.length === 0) {
    const mainEntry: ApiKeyPoolEntry = {
      id: 'key_main_' + Date.now(),
      name: 'Primary Key',
      key: settings.userApiKey.trim(),
      status: 'ready',
      isEnabled: true,
      priority: 1,
      requestsToday: 0,
      successfulRequests: 0,
      failedRequests: 0,
      createdAt: new Date().toISOString()
    };
    pool = [mainEntry];
    activeId = mainEntry.id;
  }

  // Check and auto-reset cooled down keys
  const now = Date.now();
  let poolChanged = false;
  pool = pool.map(k => {
    if ((k.status === 'rate_limited' || k.status === 'quota_exhausted') && k.rateLimitResetAt && now >= k.rateLimitResetAt) {
      poolChanged = true;
      return {
        ...k,
        status: 'ready' as ApiKeyStatus,
        lastErrorMsg: undefined,
        rateLimitResetAt: undefined
      };
    }
    return k;
  });

  // Ensure priorities are normalized (1 to 5)
  pool = pool.slice(0, 5).map((entry, idx) => ({
    ...entry,
    priority: idx + 1
  }));

  const updatedSettings: AppSettings = {
    ...settings,
    apiKeys: pool,
    activeKeyId: activeId || (pool[0] ? pool[0].id : undefined)
  };

  if (poolChanged && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (_) {}
  }

  return updatedSettings;
}

/**
 * Get active API Key from pool or legacy fallback
 */
export function getActiveApiKeyFromSettings(settings?: AppSettings): string {
  if (!settings) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) settings = JSON.parse(saved);
    } catch (e) {}
  }

  if (!settings) return '';

  const migrated = migrateSettingsApiKeys(settings);
  const pool = migrated.apiKeys || [];
  const activeId = migrated.activeKeyId;

  if (pool.length > 0) {
    // 1. Try selected active key if enabled & not quota_exhausted
    if (activeId) {
      const activeEntry = pool.find(k => k.id === activeId && k.isEnabled && k.status !== 'quota_exhausted' && k.status !== 'invalid');
      if (activeEntry && activeEntry.key.trim() !== '') {
        return activeEntry.key.trim();
      }
    }

    // 2. Fallback to highest priority ready/standby enabled key
    const available = pool.filter(k => k.isEnabled && k.status !== 'quota_exhausted' && k.status !== 'invalid' && k.key.trim() !== '');
    if (available.length > 0) {
      available.sort((a, b) => a.priority - b.priority);
      return available[0].key.trim();
    }

    // 3. If all keys in pool are temporarily cooling down, fallback to active or first enabled valid key
    const enabledFallback = (activeId ? pool.find(k => k.id === activeId && k.isEnabled && k.status !== 'invalid') : undefined) || pool.find(k => k.isEnabled && k.status !== 'invalid');
    if (enabledFallback && enabledFallback.key.trim() !== '') {
      return enabledFallback.key.trim();
    }
  }

  // 4. Legacy single key fallback
  return settings.userApiKey ? settings.userApiKey.trim() : '';
}

/**
 * Get all available enabled candidate keys ordered by active priority
 */
export function getCandidateApiKeys(initialKey?: string, settings?: AppSettings): string[] {
  const keysSet = new Set<string>();
  if (initialKey && initialKey.trim() !== '') {
    keysSet.add(initialKey.trim());
  }

  if (!settings) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) settings = JSON.parse(saved);
    } catch (e) {}
  }

  if (settings) {
    const migrated = migrateSettingsApiKeys(settings);
    const pool = migrated.apiKeys || [];

    if (migrated.activeKeyId) {
      const activeEntry = pool.find(k => k.id === migrated.activeKeyId && k.isEnabled && k.status !== 'quota_exhausted' && k.status !== 'invalid');
      if (activeEntry && activeEntry.key.trim() !== '') {
        keysSet.add(activeEntry.key.trim());
      }
    }

    const available = pool.filter(k => k.isEnabled && k.status !== 'quota_exhausted' && k.status !== 'invalid' && k.key.trim() !== '');
    available.sort((a, b) => a.priority - b.priority);
    for (const item of available) {
      keysSet.add(item.key.trim());
    }

    // If all enabled keys were temporarily cooling down, still provide enabled valid keys
    // so our task-adaptive model step-down and verifiedModel can be attempted before giving up
    if (keysSet.size === 0) {
      const allEnabled = pool.filter(k => k.isEnabled && k.status !== 'invalid' && k.key.trim() !== '');
      allEnabled.sort((a, b) => a.priority - b.priority);
      for (const item of allEnabled) {
        keysSet.add(item.key.trim());
      }
    }

    if (settings.userApiKey && settings.userApiKey.trim() !== '') {
      keysSet.add(settings.userApiKey.trim());
    }
  }

  return Array.from(keysSet);
}

/**
 * Classify API Error to determine if Failover or Backoff is required
 */
export type ClassifiedErrorType = 'quota_exhausted' | 'rate_limited' | 'invalid_key' | 'transient' | 'unknown';

export function classifyGeminiError(status: number, message: string): ClassifiedErrorType {
  const msg = (message || '').toLowerCase();

  // 1. True Key-Level Authentication Failures (requires explicit key invalidity confirmation)
  // Fix false-positive "Invalid Key" detection: NEVER classify 404, model restrictions, or general errors as invalid_key!
  if (
    status === 401 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('key not valid') ||
    msg.includes('api_key_service_blocked') ||
    msg.includes('api_key_not_found') ||
    msg.includes('api key expired') ||
    (msg.includes('unregistered') && msg.includes('project'))
  ) {
    return 'invalid_key';
  }

  // 2. Quota / Rate Limit Identification
  if (
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit')
  ) {
    if (msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('resource_exhausted')) {
      return 'quota_exhausted';
    }
    return 'rate_limited';
  }

  if (status === 403 && (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('exhausted') || msg.includes('limit'))) {
    return 'quota_exhausted';
  }

  // 3. Transient / High Demand Server-side Overload (does NOT blame or exhaust the key)
  if (
    status === 503 ||
    status === 529 ||
    status >= 500 ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('unavailable') ||
    msg.includes('503')
  ) {
    return 'transient';
  }

  return 'unknown';
}

/**
 * Rotate to next available key in pool upon quota/invalid failure
 */
export function rotateToNextKey(failedKeyStr: string, errorType: ClassifiedErrorType): { newKey: string; hasNextKey: boolean; allExhausted?: boolean } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { newKey: '', hasNextKey: false, allExhausted: true };

    const settings: AppSettings = JSON.parse(saved);
    const migrated = migrateSettingsApiKeys(settings);
    let pool = migrated.apiKeys ? [...migrated.apiKeys] : [];

    if (pool.length === 0) return { newKey: '', hasNextKey: false, allExhausted: true };

    // Find failed entry index
    const failedIdx = pool.findIndex(k => k.key.trim() === failedKeyStr.trim());
    if (failedIdx !== -1) {
      const entry = pool[failedIdx];
      entry.failedRequests = (entry.failedRequests || 0) + 1;
      entry.lastErrorMsg = errorType;

      if (errorType === 'quota_exhausted') {
        entry.status = 'quota_exhausted';
        entry.rateLimitResetAt = Date.now() + 180000; // 3m cooldown window for quota
      } else if (errorType === 'invalid_key') {
        entry.status = 'invalid';
      } else if (errorType === 'rate_limited') {
        entry.status = 'rate_limited';
        entry.rateLimitResetAt = Date.now() + 60000; // 60s cooldown window for rate limit
      }
    }

    // Find next candidate key
    const candidates = pool.filter(k => k.isEnabled && k.key.trim() !== failedKeyStr.trim() && k.status !== 'quota_exhausted' && k.status !== 'invalid');

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.priority - b.priority);
      const nextKey = candidates[0];
      migrated.activeKeyId = nextKey.id;
      migrated.apiKeys = pool;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('yawmiyati_settings_updated', { detail: migrated }));
      }
      return { newKey: nextKey.key.trim(), hasNextKey: true, allExhausted: false };
    }

    // No next key available
    migrated.apiKeys = pool;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('yawmiyati_settings_updated', { detail: migrated }));
    }
    return { newKey: '', hasNextKey: false, allExhausted: true };
  } catch (e) {
    console.warn('[apiKeyManager] Error during key rotation:', e);
    return { newKey: '', hasNextKey: false, allExhausted: false };
  }
}

/**
 * Record a successful API response for a key to update status and reset error state
 */
export function recordKeySuccess(keyStr: string, verifiedModel?: string): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const settings: AppSettings = JSON.parse(saved);
    const migrated = migrateSettingsApiKeys(settings);
    const pool = migrated.apiKeys ? [...migrated.apiKeys] : [];
    const cleanKey = keyStr.trim();
    const entry = pool.find(k => k.key.trim() === cleanKey || k.id === cleanKey);
    if (entry) {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = entry.lastUsedAt ? entry.lastUsedAt.split('T')[0] : '';
      if (lastDate !== today) {
        entry.requestsToday = 1;
      } else {
        entry.requestsToday = (entry.requestsToday || 0) + 1;
      }
      entry.lastUsedAt = new Date().toISOString();
      entry.status = 'ready';
      entry.lastErrorMsg = undefined;
      entry.rateLimitResetAt = undefined;
      entry.successfulRequests = (entry.successfulRequests || 0) + 1;

      if (verifiedModel && verifiedModel.trim()) {
        const cleanModel = verifiedModel.replace(/^models\//, '').trim();
        entry.verifiedModel = cleanModel;
        keyVerifiedModels.set(cleanKey, cleanModel);
      }

      migrated.apiKeys = pool;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('yawmiyati_settings_updated', { detail: migrated }));
      }
    }
  } catch (_) {}
}

/**
 * Task tiers for Smart Task-Based Model Selection
 */
export type AITaskType = 'light' | 'multimodal' | 'deep' | 'reasoning';

/**
 * Ranked priority lists per task tier using active Google models.
 */
export const STATIC_TASK_MODELS: Record<'light' | 'multimodal' | 'deep', string[]> = {
  light: [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
    'gemini-3.8-flash'
  ],
  multimodal: [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
    'gemini-3.8-flash'
  ],
  deep: [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
    'gemini-3.8-flash'
  ]
};

// Retired, shut-down, or restricted legacy preview models to ignore
export const RETIRED_LEGACY_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-3.8-pro',
  'gemini-3-pro-preview',
  'gemini-1.0-pro'
];

// Specialized non-general endpoints to strictly exclude from model discovery
export const EXCLUDED_SPECIALIZED_KEYWORDS = [
  'tts',
  'image',
  'live',
  'embedding',
  'transcribe',
  'omni',
  'genie',
  'robotics',
  'decision',
  'aqa',
  'imagen',
  'veo',
  'nano-banana'
];

// In-memory & localStorage cache for live discovered models per API key (24 hours TTL)
interface DiscoveredCacheEntry {
  models: string[];
  timestamp: number;
}
const discoveryCache = new Map<string, DiscoveredCacheEntry>();
export const DISCOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MODEL_CACHE_KEY = 'yawmiyati_gemini_models_cache';

function loadDiscoveryCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(MODEL_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const now = Date.now();
    for (const [k, val] of Object.entries(parsed)) {
      if ((val as any)?.timestamp && (now - (val as any).timestamp < DISCOVERY_TTL_MS) && Array.isArray((val as any).models)) {
        discoveryCache.set(k, val as DiscoveredCacheEntry);
      }
    }
  } catch (_) {}
}

function saveDiscoveryCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const obj: Record<string, DiscoveredCacheEntry> = {};
    const now = Date.now();
    for (const [k, val] of discoveryCache.entries()) {
      if (now - val.timestamp < DISCOVERY_TTL_MS) {
        obj[k] = val;
      }
    }
    localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(obj));
  } catch (_) {}
}

loadDiscoveryCache();

// Model availability and cooldown entry per (key, model)
export interface ModelAvailabilityEntry {
  until: number;           // expiration timestamp (ms)
  unsupported: boolean;    // true if tier unsupported / limit: 0 (24h TTL)
  reason?: string;
}

// Map from cleanKey -> Map<cleanModel, ModelAvailabilityEntry>
const keyModelAvailability = new Map<string, Map<string, ModelAvailabilityEntry>>();

// Cooldown durations
export const COOLDOWN_UNSUPPORTED_MS = 24 * 60 * 60 * 1000; // 24 hours for limit: 0 / free tier restrictions
export const COOLDOWN_TEMPORARY_MS = 60 * 1000;              // 60 seconds short cooldown for temporary rate limits
const COOLDOWN_STORAGE_KEY = 'yawmiyati_model_cooldowns';

function loadModelCooldowns(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const now = Date.now();
    for (const [k, models] of Object.entries(parsed)) {
      if (!keyModelAvailability.has(k)) keyModelAvailability.set(k, new Map());
      const map = keyModelAvailability.get(k)!;
      for (const [m, entry] of Object.entries(models as any)) {
        if ((entry as any)?.until && (entry as any).until > now) {
          map.set(m, entry as ModelAvailabilityEntry);
        }
      }
    }
  } catch (_) {}
}

function saveModelCooldowns(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const now = Date.now();
    const serialized: Record<string, Record<string, ModelAvailabilityEntry>> = {};
    for (const [k, map] of keyModelAvailability.entries()) {
      const activeEntries: Record<string, ModelAvailabilityEntry> = {};
      for (const [m, entry] of map.entries()) {
        if (entry.until > now) {
          activeEntries[m] = entry;
        }
      }
      if (Object.keys(activeEntries).length > 0) {
        serialized[k] = activeEntries;
      }
    }
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(serialized));
  } catch (_) {}
}

// Initial load of model cooldowns
loadModelCooldowns();

// Per-key unavailable/failed models cache for runtime self-healing backwards compatibility
const keyUnavailableModels = new Map<string, Set<string>>();

// Per-key verified working model cache
const keyVerifiedModels = new Map<string, string>();

/**
 * Check if error text or status indicates a zero-limit or paid-tier restriction
 */
export function isZeroLimitOrTierRestrictedError(status: number, message: string): boolean {
  const msg = (message || '').toLowerCase();
  if (
    msg.includes('limit: 0') ||
    msg.includes('limit:0') ||
    msg.includes('limit of 0') ||
    msg.includes('free_tier') ||
    msg.includes('free tier') ||
    msg.includes('freetier') ||
    msg.includes('not enabled') ||
    msg.includes('paid tier') ||
    msg.includes('pay-as-you-go') ||
    msg.includes('billing') ||
    msg.includes('tiered') ||
    msg.includes('tier') ||
    status === 404 ||
    status === 403
  ) {
    return true;
  }
  return false;
}

/**
 * Mark a model as failed for a specific key with adaptive cooldown:
 * - If limit: 0 or tier restricted -> cache as unsupported for 24 hours.
 * - Otherwise put (key, model) on a short 60s cooldown.
 */
export function markModelFailedForKey(key: string, model: string, status: number, message: string): void {
  if (!key || !model) return;
  const cleanKey = key.trim();
  const cleanModel = model.replace(/^models\//, '').trim();

  if (!keyModelAvailability.has(cleanKey)) {
    keyModelAvailability.set(cleanKey, new Map());
  }

  const isUnsupported = isZeroLimitOrTierRestrictedError(status, message);
  const duration = isUnsupported ? COOLDOWN_UNSUPPORTED_MS : COOLDOWN_TEMPORARY_MS;
  const until = Date.now() + duration;

  keyModelAvailability.get(cleanKey)!.set(cleanModel, {
    until,
    unsupported: isUnsupported,
    reason: message
  });

  if (!keyUnavailableModels.has(cleanKey)) {
    keyUnavailableModels.set(cleanKey, new Set<string>());
  }
  keyUnavailableModels.get(cleanKey)!.add(cleanModel);

  saveModelCooldowns();
}

/**
 * Check if a model is available (not cooling down and not unsupported) for a specific key
 */
export function isModelAvailableForKey(key: string, model: string): boolean {
  if (!key || !model) return true;
  const cleanKey = key.trim();
  const cleanModel = model.replace(/^models\//, '').trim();

  const map = keyModelAvailability.get(cleanKey);
  if (!map) return true;

  const entry = map.get(cleanModel);
  if (!entry) return true;

  if (Date.now() < entry.until) {
    return false; // still in cooldown or unsupported
  }

  // Cooldown expired
  map.delete(cleanModel);
  keyUnavailableModels.get(cleanKey)?.delete(cleanModel);
  saveModelCooldowns();
  return true;
}

/**
 * Mark a model as unavailable for a specific key (e.g. on 404 / deprecated)
 */
export function markModelUnavailableForKey(key: string, model: string): void {
  markModelFailedForKey(key, model, 404, 'model_unavailable');
}

/**
 * Check if a model has been cached as unavailable for a specific key
 */
export function isModelUnavailableForKey(key: string, model: string): boolean {
  return !isModelAvailableForKey(key, model);
}

/**
 * Mark a model as verified working for a specific key and update settings pool
 */
export function markModelVerifiedForKey(key: string, model: string): void {
  if (!key || !model) return;
  const cleanKey = key.trim();
  const cleanModel = model.replace(/^models\//, '').trim();
  keyVerifiedModels.set(cleanKey, cleanModel);

  // If this model was previously in cooldown, clear it since it is verified working
  if (keyModelAvailability.has(cleanKey)) {
    keyModelAvailability.get(cleanKey)!.delete(cleanModel);
    saveModelCooldowns();
  }
  keyUnavailableModels.get(cleanKey)?.delete(cleanModel);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings: AppSettings = JSON.parse(saved);
        if (settings.apiKeys && Array.isArray(settings.apiKeys)) {
          let changed = false;
          settings.apiKeys = settings.apiKeys.map(k => {
            if (k.key?.trim() === cleanKey || k.id === cleanKey) {
              changed = true;
              return {
                ...k,
                verifiedModel: cleanModel,
                status: 'ready' as ApiKeyStatus,
                lastErrorMsg: undefined,
                rateLimitResetAt: undefined
              };
            }
            return k;
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            window.dispatchEvent(new CustomEvent('yawmiyati_settings_updated', { detail: settings }));
          }
        }
      }
    }
  } catch (_) {}
}

/**
 * Get verified active working model for key
 */
export function getVerifiedModelForKey(key: string): string | undefined {
  if (!key) return undefined;
  const clean = key.trim();
  if (keyVerifiedModels.has(clean)) {
    return keyVerifiedModels.get(clean);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings: AppSettings = JSON.parse(saved);
        const pool = settings.apiKeys || [];
        const found = pool.find(k => k.key?.trim() === clean || k.id === clean);
        if (found?.verifiedModel) {
          keyVerifiedModels.set(clean, found.verifiedModel);
          return found.verifiedModel;
        }
      }
    }
  } catch (_) {}
  return undefined;
}

/**
 * Fetch live available models for an API key directly from Google GET /v1beta/models.
 * Supports any valid key format (including AIza..., AQ.A..., etc. without prefix restriction).
 */
export async function discoverGoogleModels(key: string, forceRefresh = false): Promise<string[]> {
  if (!key || key.trim().length < 6) return [];
  const cleanKey = key.trim();
  const now = Date.now();

  const cached = discoveryCache.get(cleanKey);
  if (!forceRefresh && cached && (now - cached.timestamp < DISCOVERY_TTL_MS)) {
    return cached.models;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      if (cached) return cached.models;
      return [];
    }

    const data = await res.json().catch(() => ({}));
    const rawList: any[] = Array.isArray(data?.models) ? data.models : [];

    const candidateModels = rawList
      .filter(m => {
        const rawName = String(m?.name || '').replace(/^models\//, '').trim();
        const lower = rawName.toLowerCase();

        // Must be a Gemini family model
        if (!lower.includes('gemini')) return false;

        // Must support generateContent
        const methods: string[] = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
        if (methods.length > 0 && !methods.includes('generateContent')) return false;

        // Exclude non-general specialized endpoints (embedding, imagen, veo, tts, audio, robotics, etc.)
        if (EXCLUDED_SPECIALIZED_KEYWORDS.some(k => lower.includes(k))) return false;

        return true;
      })
      .map(m => String(m.name).replace(/^models\//, '').trim());

    // Exclude retired 1.x / 2.0 / 2.5 models unless no newer models exist
    const isLegacy = (name: string) => {
      const lower = name.toLowerCase();
      return /gemini-(1\.|2\.0|2\.5)/i.test(lower) || RETIRED_LEGACY_MODELS.some(r => lower.includes(r));
    };

    const modernModels = candidateModels.filter(m => !isLegacy(m));
    const discovered = modernModels.length > 0 ? modernModels : candidateModels;

    if (discovered.length > 0) {
      discoveryCache.set(cleanKey, {
        models: discovered,
        timestamp: now
      });
      saveDiscoveryCache();
    }

    return discovered;
  } catch (err) {
    if (cached) return cached.models;
    return [];
  }
}

/**
 * Triggers an immediate cache invalidation and background model re-discovery for key.
 */
export async function invalidateModelCacheAndRefresh(key: string): Promise<string[]> {
  if (!key) return [];
  const cleanKey = key.trim();
  discoveryCache.delete(cleanKey);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(MODEL_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        delete parsed[cleanKey];
        localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(parsed));
      }
    }
  } catch (_) {}
  return discoverGoogleModels(cleanKey, true).catch(() => []);
}

/**
 * Future-proof dynamic scorer for models beyond the static preference list.
 * Automatically ranks newest lightweight models first:
 * newest flash-lite -> newest flash -> newest active general model.
 */
export function scoreModelForTask(model: string, taskType: 'light' | 'multimodal' | 'deep'): number {
  const clean = model.replace(/^models\//, '').toLowerCase();
  let score = 0;

  // 1. Version extraction (e.g. gemini-3.5 => 3500, gemini-3.8 => 3800, gemini-4 => 4000, gemini-5 => 5000)
  const match = clean.match(/gemini-(\d+(?:\.\d+)?)/);
  const version = match ? parseFloat(match[1]) : 3.0;
  score += version * 1000;

  // 2. Rank newest lightweight models first:
  // newest flash-lite (+5000) -> newest flash (+3000) -> general model (+1000)
  if (clean.includes('flash-lite') || clean.includes('lite')) {
    score += 5000;
  } else if (clean.includes('flash') || clean.includes('hydrogen')) {
    score += 3000;
  } else {
    score += 1000;
  }

  // 3. Fallback tier alignment bonus
  const staticList = STATIC_TASK_MODELS[taskType] || STATIC_TASK_MODELS.light;
  const staticIdx = staticList.indexOf(clean);
  if (staticIdx !== -1) {
    score += (staticList.length - staticIdx) * 50;
  }

  return score;
}

/**
 * Task-Adaptive candidate selector: intersects task tier ranked list with key's live discovered models,
 * applies the future-proof dynamic scorer, always appends key's verifiedModel, and filters out failed / cooling down models.
 */
export async function getModelCandidatesForTask(key: string, taskType: AITaskType = 'multimodal'): Promise<string[]> {
  const normalizedTask: 'light' | 'multimodal' | 'deep' =
    taskType === 'reasoning' || taskType === 'deep' ? 'deep' : (taskType === 'light' ? 'light' : 'multimodal');

  const staticRanked = STATIC_TASK_MODELS[normalizedTask];
  const cleanKey = (key || '').trim();

  let discovered: string[] = [];
  if (cleanKey.length >= 6) {
    discovered = await discoverGoogleModels(cleanKey).catch(() => []);
  }

  let candidates: string[] = [];

  if (discovered && discovered.length > 0) {
    // Intersect static ranked list with discovered models
    const intersectedStatic = staticRanked.filter(m => discovered.includes(m));

    // Dynamic scorer for any newly released Gemini models
    const newerDiscovered = discovered.filter(m => !staticRanked.includes(m));
    newerDiscovered.sort((a, b) => scoreModelForTask(b, normalizedTask) - scoreModelForTask(a, normalizedTask));

    const merged = new Set<string>();

    // If newer models outscore top static model, place them at the head
    for (const m of newerDiscovered) {
      if (scoreModelForTask(m, normalizedTask) > scoreModelForTask(staticRanked[0], normalizedTask)) {
        merged.add(m);
      }
    }
    for (const m of intersectedStatic) {
      merged.add(m);
    }
    for (const m of newerDiscovered) {
      merged.add(m);
    }
    for (const m of staticRanked) {
      merged.add(m);
    }

    candidates = Array.from(merged);
  } else {
    // Fallback directly to the static ranked preference list if ListModels is blocked on key
    candidates = [...staticRanked];
  }

  // Always append verifiedModel (or proven light model) to every tier's fallback list if not already present
  const verified = getVerifiedModelForKey(cleanKey) || 'gemini-3.5-flash-lite';
  if (verified && !candidates.includes(verified)) {
    candidates.push(verified);
  }
  if (!candidates.includes('gemini-3.5-flash-lite')) {
    candidates.push('gemini-3.5-flash-lite');
  }
  if (!candidates.includes('gemini-3.1-flash-lite')) {
    candidates.push('gemini-3.1-flash-lite');
  }

  // Skip models already cached as unsupported / limit: 0 or in active cooldown on this key,
  // but GUARANTEE verifiedModel and gemini-3.5-flash-lite / gemini-3.1-flash-lite are NEVER excluded.
  const available = candidates.filter(m => isModelAvailableForKey(cleanKey, m) || m === verified || m === 'gemini-3.5-flash-lite' || m === 'gemini-3.1-flash-lite');
  if (verified && !available.includes(verified)) {
    available.push(verified);
  }
  if (!available.includes('gemini-3.5-flash-lite')) {
    available.push('gemini-3.5-flash-lite');
  }
  if (!available.includes('gemini-3.1-flash-lite')) {
    available.push('gemini-3.1-flash-lite');
  }

  return available;
}

/**
 * Synchronous static fallback tier candidates with verifiedModel fallback
 */
export function getModelTierCandidates(taskType: AITaskType, key?: string): string[] {
  const normalizedTask: 'light' | 'multimodal' | 'deep' =
    taskType === 'reasoning' || taskType === 'deep' ? 'deep' : (taskType === 'light' ? 'light' : 'multimodal');
  const list = [...(STATIC_TASK_MODELS[normalizedTask] || STATIC_TASK_MODELS.multimodal)];
  if (key) {
    const verified = getVerifiedModelForKey(key);
    if (verified && !list.includes(verified)) {
      list.push(verified);
    }
    const filtered = list.filter(m => isModelAvailableForKey(key, m));
    if (filtered.length > 0) return filtered;
  }
  return list;
}

/**
 * Perform test query to verify key validity:
 * 1. Discovers live models for the key and verifies generateContent execution against the first working candidate.
 * 2. Never marks a key as invalid or quota-exhausted when a paid/zero-limit model fails — steps down to next candidate (e.g. gemini-3.5-flash-lite).
 * 3. Only marks key as quota_exhausted if ALL candidate models fail with 429.
 * 4. Returns the verified working model name.
 */
export async function testGeminiApiKey(key: string): Promise<{
  success: boolean;
  message: string;
  verifiedModel?: string;
  errorType?: ClassifiedErrorType;
}> {
  if (!key || key.trim() === '') {
    return { success: false, message: 'API_KEY_EMPTY' };
  }

  const cleanKey = key.trim();

  // 1. Discover live models
  const discovered = await discoverGoogleModels(cleanKey, true).catch(() => []);
  const priorityTestList = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen', 'gemini-3.8-flash'];

  const candidatesSet = new Set<string>();

  // If a verified model is already known, test it first
  const existingVerified = getVerifiedModelForKey(cleanKey);
  if (existingVerified) {
    candidatesSet.add(existingVerified);
  }

  // Prefer discovered models intersecting priority list
  for (const m of priorityTestList) {
    if (discovered.length === 0 || discovered.includes(m)) {
      candidatesSet.add(m);
    }
  }
  // Add any newly discovered general Gemini models
  for (const m of discovered) {
    candidatesSet.add(m);
  }
  // Ensure priority fallback models are included
  for (const m of priorityTestList) {
    candidatesSet.add(m);
  }
  // Always guarantee gemini-3.5-flash-lite and gemini-3.1-flash-lite are in the candidate test set
  candidatesSet.add('gemini-3.5-flash-lite');
  candidatesSet.add('gemini-3.1-flash-lite');

  const modelsToTest = Array.from(candidatesSet);
  let lastErr = '';
  let all429 = true;

  for (const model of modelsToTest) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 }
        })
      });

      if (res.ok) {
        markModelVerifiedForKey(cleanKey, model);
        recordKeySuccess(cleanKey, model);
        return {
          success: true,
          message: 'API_KEY_VALID',
          verifiedModel: model
        };
      }

      const data = await res.json().catch(() => ({}));
      const rawMsg = data?.error?.message || `HTTP ${res.status}`;
      lastErr = rawMsg;
      const status = res.status;

      const errType = classifyGeminiError(status, rawMsg);
      if (errType === 'invalid_key') {
        return { success: false, message: 'API_KEY_INVALID', errorType: 'invalid_key' };
      }

      // Step down immediately on 429 / RESOURCE_EXHAUSTED / limit: 0 without marking whole key exhausted!
      if (errType === 'quota_exhausted' || errType === 'rate_limited' || status === 429) {
        markModelFailedForKey(cleanKey, model, status, rawMsg);
        continue; // Try next candidate model (e.g. gemini-2.0-flash) on the SAME key!
      }

      all429 = false;

      // Model-specific failure: 404 NOT_FOUND, deprecated, or restricted
      // Step down to next candidate model on the SAME key without marking key invalid!
      markModelFailedForKey(cleanKey, model, status, rawMsg);
    } catch (e: any) {
      all429 = false;
      lastErr = e?.message || String(e);
    }
  }

  // Only if ALL candidate models failed with 429
  if (all429 && lastErr) {
    return { success: false, message: 'API_KEY_QUOTA_EXHAUSTED', errorType: 'quota_exhausted' };
  }

  return { success: false, message: `CONNECTION_FAILED: ${lastErr}` };
}
