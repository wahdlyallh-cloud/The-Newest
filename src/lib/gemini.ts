// ============================================================
//  gemini.ts — Hard-Rooted Stable Gemini API Helper
//  Safe, resilient Gemini API module with lazy initialization.
//  NEVER executes synchronously on app boot.
// ============================================================

// ─── Strict Model Mapping ─────────────────────────────────────
//
// "gemini-3.5-flash-lite" is the UI/settings-facing label shown
// to the user and stored in app config.  It is NOT a real Google
// model ID.  cleanModelIdentifier() maps it to a live endpoint
// before every network request.

/** The display-only model name shown in the UI and stored in settings. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

/**
 * Maps a user-facing model string → a real Google API model ID.
 *
 * "gemini-3.5-flash-lite" (and any "3.x" variant) is strictly
 * translated to "gemini-2.0-flash" before hitting the API.
 * The UI string "gemini-3.5-flash-lite" is preserved for display.
 */
export function cleanModelIdentifier(modelName?: string): string {
  const clean = (modelName || DEFAULT_GEMINI_MODEL).trim().replace(/^models\//, '');

  // Strict mapping: any 3.x alias → gemini-2.0-flash (real endpoint)
  if (
    clean === 'gemini-3.5-flash-lite' ||
    clean === 'gemini-3.5-flash' ||
    clean.startsWith('gemini-3.')
  ) {
    return 'gemini-2.0-flash';
  }

  return clean;
}

// ─── Safety Settings (BLOCK_NONE for all categories) ──────────
/** Attached to every generateContent request — prevents blocked responses. */
const SAFETY_SETTINGS_BLOCK_NONE = [
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT',         threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_NONE' },
] as const;

// ─── API Key Utilities ─────────────────────────────────────────

function sanitizeApiKeyString(k?: any): string {
  if (!k || typeof k !== 'string') return '';
  return k.trim().replace(/^['\"]+|['\"]+$/g, '');
}

/**
 * Resolves the Gemini API key from (in priority order):
 *   1. Explicit customKey argument
 *   2. window.__GEMINI_KEY__ global
 *   3. localStorage → yawmiyati_settings.userApiKey
 *   4. VITE_GEMINI_API_KEY env variable
 */
export function getGeminiApiKey(customKey?: string): string {
  const cleanCustom = sanitizeApiKeyString(customKey);
  if (cleanCustom) return cleanCustom;

  if (typeof window !== 'undefined' && (window as any).__GEMINI_KEY__) {
    const key = sanitizeApiKeyString((window as any).__GEMINI_KEY__);
    if (key) return key;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('yawmiyati_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const key = sanitizeApiKeyString(parsed?.userApiKey);
        if (key) return key;
      }
    } catch (e) {
      console.warn('[gemini] Failed to read userApiKey from localStorage:', e);
    }
  }

  try {
    const envKey = sanitizeApiKeyString((import.meta as any)?.env?.VITE_GEMINI_API_KEY);
    if (envKey) return envKey;
  } catch (_) {}

  return '';
}

export function hasValidGeminiKey(customKey?: string): boolean {
  const key = getGeminiApiKey(customKey);
  return Boolean(key && key.trim().length > 5);
}

/** Returns true when a key is missing or structurally too short to be valid. */
function isKeyObviouslyInvalid(key: string): boolean {
  return !key || key.trim().length < 6;
}

// ─── Language System Instruction ──────────────────────────────

export function getLanguageSystemInstruction(activeLanguage?: string): string {
  const lang = (activeLanguage || 'ar').toLowerCase();
  const langNames: Record<string, { name: string; native: string }> = {
    ar: { name: 'Arabic',             native: 'العربية' },
    en: { name: 'English',            native: 'English' },
    fr: { name: 'French',             native: 'Français' },
    de: { name: 'German',             native: 'Deutsch' },
    es: { name: 'Spanish',            native: 'Español' },
    ru: { name: 'Russian',            native: 'Русский' },
    zh: { name: 'Chinese Simplified', native: '中文' },
    tr: { name: 'Turkish',            native: 'Türkçe' },
    hi: { name: 'Hindi',              native: 'हिन्दी' },
    it: { name: 'Italian',            native: 'Italiano' },
  };
  const target = langNames[lang] || { name: 'Arabic', native: 'العربية' };

  return (
    `CRITICAL REQUIREMENT: You MUST process input and generate your response EXCLUSIVELY in ` +
    `${target.name} (${target.native}) [Language code: ${lang}]. ` +
    `Do NOT output Arabic or any other language unless explicitly requested by the user. ` +
    `Translate all mood tags, psychological insights, CBT exercises, and clinical recommendations ` +
    `completely into ${target.name}.`
  );
}

// ─── Bulletproof Request Wrapper ──────────────────────────────

/**
 * Safe lazy caller for Gemini endpoints or direct REST fallback.
 *
 * Guarantees:
 *  - API key is checked BEFORE the fetch call.
 *  - HTTP 429 → Arabic rate-limit message.
 *  - Any other error → "خطأ في الاتصال: <raw message>".
 *  - Missing/invalid key → "يرجى التحقق من مفتاح API في الإعدادات".
 */
export async function callGeminiApiSafely(
  endpoint: string,
  payload: any,
  options?: { customKey?: string; activeLanguage?: string }
): Promise<{ success: boolean; answer?: string; error?: string; source?: string; requiresApiKey?: boolean }> {
  const key = getGeminiApiKey(options?.customKey);
  const lang = options?.activeLanguage || payload?.appLanguage || payload?.langCode || 'ar';

  // ── Key guard (checked before any network activity) ───────────
  if (isKeyObviouslyInvalid(key)) {
    return {
      success: false,
      requiresApiKey: true,
      error: 'يرجى التحقق من مفتاح API في الإعدادات',
      source: 'key-missing',
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': key,
        'x-app-language': lang,
      },
      body: JSON.stringify({
        ...payload,
        appLanguage: lang,
        systemLanguageInstruction: getLanguageSystemInstruction(lang),
      }),
    });

    // ── 429 Rate-limit guard ──────────────────────────────────────
    if (response.status === 429) {
      return {
        success: false,
        error: 'لقد تجاوزت حد الاستخدام اليومي المجاني',
        source: 'rate-limit',
      };
    }

    const data = await response.json().catch(() => ({
      success: false,
      error: 'Invalid server response format',
    }));

    return data;
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    console.error(`[gemini] callGeminiApiSafely → ${endpoint} failed:`, rawMsg);
    return {
      success: false,
      error: `خطأ في الاتصال: ${rawMsg}`,
      source: 'network-fallback',
    };
  }
}

// ─── API Key Validation ────────────────────────────────────────

export async function validateGeminiApiKey(
  rawKey: string
): Promise<{ success: boolean; message: string; errorDetail?: string }> {
  const cleanKey = (rawKey || '').trim();

  if (!cleanKey) {
    return {
      success: false,
      message: 'مفتاح API فارغ. يرجى إدخال المفتاح بشكل صحيح.',
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const responseText = await res.text();
    let errJson: any = null;
    if (responseText && responseText.trim()) {
      try { errJson = JSON.parse(responseText); } catch (_) {}
    }

    if (res.status === 200 || res.ok) {
      return { success: true, message: 'تم التحقق من المفتاح بنجاح' };
    }

    const rawMsg =
      errJson?.error?.message ||
      `HTTP ${res.status}: ${res.statusText || 'خطأ في الطلب'}`;
    console.error('[gemini] validateGeminiApiKey error:', rawMsg);

    if (
      res.status === 429 ||
      rawMsg.includes('Quota exceeded') ||
      rawMsg.includes('RESOURCE_EXHAUSTED')
    ) {
      return {
        success: true,
        message: 'تم تجاوز حصة الاستخدام المجانية للمفتاح، يرجى المحاولة لاحقاً',
        errorDetail: rawMsg,
      };
    }

    if (
      res.status === 400 ||
      res.status === 403 ||
      rawMsg.includes('API key not valid') ||
      rawMsg.includes('API_KEY_INVALID')
    ) {
      return {
        success: false,
        message: 'مفتاح API غير صالح، يرجى التأكد من نسخه بشكل صحيح من Google AI Studio',
        errorDetail: rawMsg,
      };
    }

    return {
      success: false,
      message: `تعذر التحقق من المفتاح (${rawMsg})`,
      errorDetail: rawMsg,
    };
  } catch (networkErr: any) {
    const detail = networkErr?.message || String(networkErr);
    console.error('[gemini] validateGeminiApiKey network error:', detail);
    return {
      success: false,
      message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
      errorDetail: detail,
    };
  }
}

// ─── Direct Content Generation (with model fallback chain) ────

/**
 * Calls the Gemini generateContent REST endpoint directly from the client.
 *
 * Model resolution strategy:
 *   gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
 *   → gemini-1.5-flash-latest → gemini-1.5-flash-8b → gemini-1.5-flash
 *
 * "gemini-3.5-flash-lite" is the UI display label — it is mapped by
 * cleanModelIdentifier() upstream and never reaches this function raw.
 *
 * Every request includes BLOCK_NONE safety settings.
 * All error messages returned to callers are in Arabic.
 */
export async function generateGeminiContentDirect(
  userPromptWithContext: string,
  systemInstruction?: string,
  customKey?: string
): Promise<string> {
  // ── Key guard ─────────────────────────────────────────────────
  const cleanKey = getGeminiApiKey(customKey);
  if (isKeyObviouslyInvalid(cleanKey)) {
    return 'يرجى التحقق من مفتاح API في الإعدادات';
  }

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
  ];

  let lastError = '';

  for (const model of modelsToTry) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
      `:generateContent?key=${encodeURIComponent(cleanKey.trim())}`;

    // ── Build request body with mandatory BLOCK_NONE safety settings ─
    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPromptWithContext }],
        },
      ],
      safetySettings: SAFETY_SETTINGS_BLOCK_NONE,
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await res.text();
      let data: any = {};
      if (responseText && responseText.trim()) {
        try { data = JSON.parse(responseText); } catch (_) {}
      }

      // ── Success path ──────────────────────────────────────────────
      if (res.ok) {
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (output && typeof output === 'string' && output.trim() !== '') {
          return output;
        }

        const candidate = data?.candidates?.[0];
        if (candidate) {
          const candidateText = candidate?.content?.parts?.[0]?.text;
          if (candidateText && typeof candidateText === 'string' && candidateText.trim() !== '') {
            return candidateText;
          }
          if (candidate.finishReason === 'SAFETY') {
            return 'أنا هنا دائماً لدعمك والاستماع إليك بكل محبة وحكمة. يسعدني تقديم التوجيه الإيجابي والتحليل الذي يساعدك في فهم مشاعرك وتطوير ذاتك بشكل رائع.';
          }
          if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            return 'أشكرك على مشاركة أفكارك معي! أنا جاهز لمساعدتك وحوارك في أي موضوع أو استفسار ترغب به بكل سرور ووضوح.';
          }
        }
      }

      // ── Error path ────────────────────────────────────────────────
      const rawError =
        data?.error?.message ||
        `HTTP ${res.status}: ${res.statusText || 'خطأ في الاستجابة'}`;
      lastError = rawError;

      // ── 429 Rate-limit ─────────────────────────────────────────────
      if (res.status === 429 || rawError.includes('Quota') || rawError.includes('RESOURCE_EXHAUSTED')) {
        return 'لقد تجاوزت حد الاستخدام اليومي المجاني';
      }

      // ── Invalid / forbidden key ────────────────────────────────────
      if (
        rawError.includes('API key not valid') ||
        rawError.includes('API_KEY_INVALID') ||
        res.status === 400 ||
        res.status === 403
      ) {
        return 'يرجى التحقق من مفتاح API في الإعدادات';
      }

      // ── Model not found → try next in chain ───────────────────────
      if (
        rawError.includes('not found') ||
        rawError.includes('is not supported') ||
        rawError.includes('v1beta') ||
        res.status === 404
      ) {
        console.warn(`[gemini] Model "${model}" not available, trying next…`);
        continue;
      }

      console.warn(`[gemini] Model "${model}" returned error: ${rawError}`);
    } catch (err: any) {
      const rawMsg = err?.message || String(err);
      console.error(`[gemini] Model "${model}" fetch exception:`, rawMsg);
      lastError = rawMsg;
      // Network-level errors are fatal — stop chain and report
      return `خطأ في الاتصال: ${rawMsg}`;
    }
  }

  // All models in the chain were exhausted
  return lastError
    ? `خطأ في الاتصال: ${lastError}`
    : 'خطأ في الاتصال: تعذر الحصول على الرد من خادم Gemini';
}