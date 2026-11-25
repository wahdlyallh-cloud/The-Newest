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

  // 1. Invalid Key Identification (requires explicit key invalidity confirmation)
  if (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('key not valid') ||
    msg.includes('api_key_service_blocked') ||
    msg.includes('api_key_not_found') ||
    msg.includes('permission_denied') ||
    msg.includes('unregistered')
  ) {
    return 'invalid_key';
  }

  // 2. Quota / Rate Limit Identification
  if (
    status === 429 ||
    status === 403 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('quota')
  ) {
    if (msg.includes('quota') || msg.includes('limit exceeded') || status === 403 || msg.includes('resource_exhausted')) {
      return 'quota_exhausted';
    }
    return 'rate_limited';
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
export type AITaskType = 'light' | 'multimodal' | 'reasoning';

export function getModelTierCandidates(taskType: AITaskType): string[] {
  switch (taskType) {
    case 'light':
      return ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    case 'multimodal':
      return ['gemini-2.5-flash', 'gemini-2.0-flash'];
    case 'reasoning':
      return ['gemini-2.5-pro', 'gemini-2.5-flash'];
    default:
      return ['gemini-2.5-flash', 'gemini-2.0-flash'];
  }
}

/**
 * Perform test query to verify key validity
 */
export async function testGeminiApiKey(key: string): Promise<{ success: boolean; message: string }> {
  if (!key || key.trim() === '') {
    return { success: false, message: 'API_KEY_EMPTY' };
  }

  const cleanKey = key.trim();
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastErr = '';

  for (const model of models) {
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
        return { success: true, message: 'API_KEY_VALID' };
      }

      const data = await res.json().catch(() => ({}));
      const rawMsg = data?.error?.message || `HTTP ${res.status}`;
      lastErr = rawMsg;

      if (res.status === 400 || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
        return { success: false, message: 'API_KEY_INVALID' };
      }
      if (res.status === 429 || res.status === 403 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        return { success: false, message: 'API_KEY_QUOTA_EXHAUSTED' };
      }
      if (res.status === 404) {
        continue; // Try next model
      }
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }

  return { success: false, message: `CONNECTION_FAILED: ${lastErr}` };
}
