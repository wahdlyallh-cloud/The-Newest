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
  }

  // 3. Legacy single key fallback
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
    msg.includes('unavailable')
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
      return { newKey: nextKey.key.trim(), hasNextKey: true, allExhausted: false };
    }

    // No next key available
    migrated.apiKeys = pool;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return { newKey: '', hasNextKey: false, allExhausted: true };
  } catch (e) {
    console.warn('[apiKeyManager] Error during key rotation:', e);
    return { newKey: '', hasNextKey: false, allExhausted: false };
  }
}

/**
 * Record a successful API response for a key to update status and reset error state
 */
export function recordKeySuccess(keyStr: string): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const settings: AppSettings = JSON.parse(saved);
    const migrated = migrateSettingsApiKeys(settings);
    const pool = migrated.apiKeys ? [...migrated.apiKeys] : [];
    const entry = pool.find(k => k.key.trim() === keyStr.trim());
    if (entry) {
      entry.lastUsedAt = new Date().toISOString();
      entry.status = 'ready';
      entry.lastErrorMsg = undefined;
      entry.successfulRequests = (entry.successfulRequests || 0) + 1;
      migrated.apiKeys = pool;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
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
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-4-hydrogen'
  ],
  multimodal: [
    'gemini-3.8-flash',
    'gemini-4-hydrogen',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite'
  ],
  deep: [
    'gemini-4-carbon',
    'gemini-4-argon',
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite'
  ]
};

// Retired or restricted legacy models to permanently ignore everywhere
export const RETIRED_LEGACY_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-lite',
  'gemini-3.8-pro',
  'gemini-3-pro-preview'
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

// In-memory cache for live discovered models per API key (6 hours TTL)
interface DiscoveredCacheEntry {
  models: string[];
  timestamp: number;
}
const discoveryCache = new Map<string, DiscoveredCacheEntry>();
const DISCOVERY_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Per-key unavailable/failed models cache for runtime self-healing
const keyUnavailableModels = new Map<string, Set<string>>();

// Per-key verified working model cache
const keyVerifiedModels = new Map<string, string>();

/**
 * Mark a model as unavailable for a specific key (e.g. on 404 / deprecated)
 */
export function markModelUnavailableForKey(key: string, model: string): void {
  if (!key || !model) return;
  const cleanKey = key.trim();
  const cleanModel = model.replace(/^models\//, '').trim();
  if (!keyUnavailableModels.has(cleanKey)) {
    keyUnavailableModels.set(cleanKey, new Set<string>());
  }
  keyUnavailableModels.get(cleanKey)!.add(cleanModel);
}

/**
 * Check if a model has been cached as unavailable for a specific key
 */
export function isModelUnavailableForKey(key: string, model: string): boolean {
  if (!key || !model) return false;
  const cleanKey = key.trim();
  const cleanModel = model.replace(/^models\//, '').trim();
  return Boolean(keyUnavailableModels.get(cleanKey)?.has(cleanModel));
}

/**
 * Mark a model as verified working for a specific key and update settings pool
 */
export function markModelVerifiedForKey(key: string, model: string): void {
  if (!key || !model) return;
  const cleanKey = key.trim();
  const cleanModel = model.replace(/^models\//, '').trim();
  keyVerifiedModels.set(cleanKey, cleanModel);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings: AppSettings = JSON.parse(saved);
        if (settings.apiKeys && Array.isArray(settings.apiKeys)) {
          let changed = false;
          settings.apiKeys = settings.apiKeys.map(k => {
            if (k.key?.trim() === cleanKey) {
              changed = true;
              return {
                ...k,
                verifiedModel: cleanModel,
                status: 'ready' as ApiKeyStatus,
                lastErrorMsg: undefined
              };
            }
            return k;
          });
          if (changed) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
  return keyVerifiedModels.get(key.trim());
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

    const discovered = rawList
      .filter(m => {
        const rawName = String(m?.name || '').replace(/^models\//, '').trim();
        const lower = rawName.toLowerCase();

        // Must be a Gemini family model
        if (!lower.includes('gemini')) return false;

        // Must support generateContent
        const methods: string[] = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
        if (methods.length > 0 && !methods.includes('generateContent')) return false;

        // Exclude retired/restricted models
        if (RETIRED_LEGACY_MODELS.some(r => lower.includes(r))) return false;

        // Exclude non-general specialized endpoints
        if (EXCLUDED_SPECIALIZED_KEYWORDS.some(k => lower.includes(k))) return false;

        return true;
      })
      .map(m => String(m.name).replace(/^models\//, '').trim());

    if (discovered.length > 0) {
      discoveryCache.set(cleanKey, {
        models: discovered,
        timestamp: now
      });
    }

    return discovered;
  } catch (err) {
    if (cached) return cached.models;
    return [];
  }
}

/**
 * Future-proof dynamic scorer for models beyond the static preference list.
 * Ranks higher version numbers appropriately by tier (lite for light, flash/hydrogen for multimodal, carbon/argon/pro for deep).
 */
export function scoreModelForTask(model: string, taskType: 'light' | 'multimodal' | 'deep'): number {
  const clean = model.replace(/^models\//, '').toLowerCase();
  let score = 0;

  // 1. Version extraction (e.g. gemini-3.5 => 350, gemini-3.8 => 380, gemini-4 => 400, gemini-5 => 500)
  const match = clean.match(/gemini-(\d+(?:\.\d+)?)/);
  const version = match ? parseFloat(match[1]) : 3.0;
  score += version * 100;

  // 2. Tier affinity bonuses
  if (taskType === 'light') {
    if (clean.includes('lite') || clean.includes('flash-lite')) score += 500;
    else if (clean.includes('flash') || clean.includes('hydrogen')) score += 250;
    else score += 50;
  } else if (taskType === 'multimodal') {
    if (clean.includes('flash') || clean.includes('hydrogen')) score += 400;
    else if (clean.includes('lite')) score += 150;
    else if (clean.includes('carbon') || clean.includes('argon') || clean.includes('pro')) score += 100;
    else score += 50;
  } else {
    // deep
    if (clean.includes('carbon') || clean.includes('argon') || clean.includes('pro') || clean.includes('ultra')) score += 600;
    else if (clean.includes('hydrogen')) score += 400;
    else if (clean.includes('flash')) score += 200;
    else if (clean.includes('lite')) score += 100;
    else score += 50;
  }

  // 3. Static preference bonus to preserve proven ranked hierarchy
  const staticList = STATIC_TASK_MODELS[taskType];
  const staticIdx = staticList.indexOf(clean);
  if (staticIdx !== -1) {
    score += (staticList.length - staticIdx) * 30;
  }

  return score;
}

/**
 * Task-Adaptive candidate selector: intersects task tier ranked list with key's live discovered models,
 * applies the future-proof dynamic scorer, and filters out failed models from the runtime self-healing cache.
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

  // Runtime self-healing: filter out models that failed inference on this specific key
  const healthy = candidates.filter(m => !isModelUnavailableForKey(cleanKey, m));
  return healthy.length > 0 ? healthy : [...staticRanked];
}

/**
 * Synchronous static fallback tier candidates
 */
export function getModelTierCandidates(taskType: AITaskType): string[] {
  const normalizedTask: 'light' | 'multimodal' | 'deep' =
    taskType === 'reasoning' || taskType === 'deep' ? 'deep' : (taskType === 'light' ? 'light' : 'multimodal');
  return STATIC_TASK_MODELS[normalizedTask] || STATIC_TASK_MODELS.multimodal;
}

/**
 * Perform test query to verify key validity:
 * 1. Discovers live models for the key and verifies generateContent execution against the first working candidate.
 * 2. Never marks a key as invalid when a single model returns 404 or deprecated — steps down to next candidate.
 * 3. Returns the verified working model name.
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
  const priorityTestList = ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];

  const candidatesSet = new Set<string>();

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

  const modelsToTest = Array.from(candidatesSet).filter(m => !isModelUnavailableForKey(cleanKey, m));
  let lastErr = '';

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
      if (errType === 'quota_exhausted' || errType === 'rate_limited') {
        return { success: false, message: 'API_KEY_QUOTA_EXHAUSTED', errorType: errType };
      }

      // Model-specific failure: 404 NOT_FOUND, deprecated, or no longer available
      // Step down to next candidate model on the SAME key without marking key invalid!
      if (status === 404 || rawMsg.includes('not found') || rawMsg.includes('no longer available') || rawMsg.includes('deprecated')) {
        markModelUnavailableForKey(cleanKey, model);
        continue;
      }

      // Other model-specific error: cache model as unavailable and try next model
      markModelUnavailableForKey(cleanKey, model);
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }

  return { success: false, message: `CONNECTION_FAILED: ${lastErr}` };
}
