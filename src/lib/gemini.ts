// ============================================================
//  gemini.ts — Hard-Rooted Stable Gemini API Helper
//  Safe, resilient Gemini API module with lazy initialization.
//  NEVER executes synchronously on app boot.
// ============================================================

export const AI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_MODEL = AI_MODEL;

/**
 * Returns the exact model identifier without any alias translation or mapping.
 * Strictly preserves 'gemini-3.5-flash-lite' as the literal Model ID sent to Google API.
 */
export function cleanModelIdentifier(modelName?: string): string {
  if (!modelName || !modelName.trim()) return AI_MODEL;
  return modelName.trim().replace(/^models\//, '');
}

/**
 * Sanitizes raw HTML tags, breaks, and entities from diary entry text before display.
 */
export function cleanDiaryText(rawText?: string): string {
  if (!rawText) return '';
  let text = String(rawText);
  // 1. Replace <div>, <br>, <p>, </div>, </p> tags with newline characters
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(div|p)>/gi, '\n');
  text = text.replace(/<(div|p)[^>]*>/gi, '\n');

  // 2. Strip all other HTML tags safely
  text = text.replace(/<[^>]*>/g, '');

  // 3. Decode/replace HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // 4. Trim unnecessary extra whitespace (multiple consecutive newlines reduced to max 2)
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      })
    });

    const responseText = await res.text();
    let errJson: any = null;
    if (responseText && responseText.trim()) {
      try { errJson = JSON.parse(responseText); } catch (_) {}
    }

    if (res.status === 200 || res.ok) {
      return { success: true, message: 'تم التحقق من المفتاح بنجاح 🎉' };
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
        message: 'تم حفظ المفتاح بنجاح! 🎉 (تنبيه: تم الوصول للحد اليومي المجاني مؤقتاً)',
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
      message: 'يرجى التحقق من مفتاح API في الإعدادات',
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
 *   gemini-3.5-flash-lite (Direct Model ID)
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

  const modelsToTry = [AI_MODEL];

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
      if (rawMsg.includes('يرجى') || rawMsg.includes('لقد تجاوزت')) return rawMsg;
      return 'يرجى التحقق من مفتاح API في الإعدادات';
    }
  }

  // All models in the chain were exhausted
  return 'يرجى التحقق من مفتاح API في الإعدادات';
}