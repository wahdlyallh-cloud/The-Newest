// Safe, resilient Gemini API helper module with lazy initialization.
// Ensures Gemini API initialization NEVER executes synchronously on app boot up.

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export function getGeminiApiKey(customKey?: string): string {
  if (customKey && customKey.trim() !== '') return customKey.trim();

  // Try global window variable
  if (typeof window !== 'undefined' && (window as any).__GEMINI_KEY__) {
    const key = (window as any).__GEMINI_KEY__;
    if (typeof key === 'string' && key.trim() !== '') return key.trim();
  }

  // Try localStorage settings
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('yawmiyati_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.userApiKey && typeof parsed.userApiKey === 'string' && parsed.userApiKey.trim() !== '') {
          return parsed.userApiKey.trim();
        }
      }
    } catch (e) {
      console.warn("Failed to read userApiKey from localStorage settings:", e);
    }
  }

  // Try VITE environment variable
  try {
    const envKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim() !== '') {
      return envKey.trim();
    }
  } catch (e) {}

  return '';
}

export function hasValidGeminiKey(customKey?: string): boolean {
  const key = getGeminiApiKey(customKey);
  return Boolean(key && key.trim().length > 5);
}

export function getLanguageSystemInstruction(activeLanguage?: string): string {
  const lang = (activeLanguage || 'ar').toLowerCase();
  const langNames: Record<string, { name: string; native: string }> = {
    ar: { name: "Arabic", native: "العربية" },
    en: { name: "English", native: "English" },
    fr: { name: "French", native: "Français" },
    de: { name: "German", native: "Deutsch" },
    es: { name: "Spanish", native: "Español" },
    ru: { name: "Russian", native: "Русский" },
    zh: { name: "Chinese Simplified", native: "中文" },
    tr: { name: "Turkish", native: "Türkçe" },
    hi: { name: "Hindi", native: "हिन्दी" },
    it: { name: "Italian", native: "Italiano" }
  };
  const target = langNames[lang] || { name: "Arabic", native: "العربية" };

  return `CRITICAL REQUIREMENT: You MUST process input and generate your response EXCLUSIVELY in ${target.name} (${target.native}) [Language code: ${lang}]. Do NOT output Arabic or any other language unless explicitly requested by the user. Translate all mood tags, psychological insights, CBT exercises, and clinical recommendations completely into ${target.name}.`;
}

/**
 * Safe lazy caller for Gemini endpoints or direct REST fallback.
 * Catches missing key errors gracefully and returns fallback answers or error status.
 */
export async function callGeminiApiSafely(
  endpoint: string,
  payload: any,
  options?: { customKey?: string; activeLanguage?: string }
): Promise<{ success: boolean; answer?: string; error?: string; source?: string; requiresApiKey?: boolean }> {
  const key = getGeminiApiKey(options?.customKey);
  const lang = options?.activeLanguage || payload?.appLanguage || payload?.langCode || 'ar';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-key': key,
        'x-app-language': lang
      },
      body: JSON.stringify({
        ...payload,
        appLanguage: lang,
        systemLanguageInstruction: getLanguageSystemInstruction(lang)
      })
    });

    const data = await response.json().catch(() => ({
      success: false,
      error: "Invalid server response format"
    }));

    return data;
  } catch (err: any) {
    console.error(`Gemini call to ${endpoint} failed safely:`, err);
    return {
      success: false,
      error: err?.message || "Failed to reach Gemini service",
      source: "network-fallback"
    };
  }
}


export async function validateGeminiApiKey(rawKey: string): Promise<{ success: boolean; message: string; errorDetail?: string }> {
  const cleanKey = (rawKey || '').trim();
  if (!cleanKey) {
    return {
      success: false,
      message: 'مفتاح API فارغ. يرجى إدخال المفتاح بشكل صحيح.'
    };
  }

  const modelsToTest = ['gemini-1.5-flash'];
  let lastErrorDetail = '';

  for (const model of modelsToTest) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });

      const responseText = await res.text();
      let errJson: any = null;
      if (responseText && responseText.trim()) {
        try {
          errJson = JSON.parse(responseText);
        } catch (e) {}
      }

      if (res.ok) {
        return {
          success: true,
          message: 'تم التحقق من مفتاح الـ API بنجاح وهو يعمل بشكل ممتاز! 🎉'
        };
      }

      const rawMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText || 'خطأ في الطلب'}`;
      lastErrorDetail = rawMsg;
      console.error('Gemini API Validation Error:', rawMsg);

      if (rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('invalid key')) {
        return {
          success: false,
          message: 'مفتاح الـ API غير صالح. يرجى التأكد من نسخه بشكل صحيح من Google AI Studio.',
          errorDetail: rawMsg
        };
      }

      if (rawMsg.includes('Quota exceeded') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('limit') || res.status === 429) {
        return {
          success: true,
          message: 'المفتاح صحيح ومُفعل، ولكنه تجاوز حد الاستخدام المؤقت (Quota Exceeded).'
        };
      }
    } catch (networkErr: any) {
      console.error('Gemini API Validation Error:', networkErr);
      lastErrorDetail = networkErr?.message || String(networkErr);
    }
  }

  let userFriendlyMsg = 'تعذر التحقق من مفتاح الـ API.';
  if (lastErrorDetail.includes('API key not valid') || lastErrorDetail.includes('API_KEY_INVALID')) {
    userFriendlyMsg = 'مفتاح الـ API غير صالح. يرجى التأكد من نسخه من Google AI Studio.';
  } else if (lastErrorDetail.includes('Quota') || lastErrorDetail.includes('429')) {
    userFriendlyMsg = 'المفتاح صحيح ولكنه يتجاوز حد الاستخدام المؤقت.';
  } else if (lastErrorDetail.includes('Failed to fetch') || lastErrorDetail.includes('NetworkError')) {
    userFriendlyMsg = 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
  } else if (lastErrorDetail) {
    userFriendlyMsg = `فشل التحقق: ${lastErrorDetail}`;
  }

  return {
    success: false,
    message: userFriendlyMsg,
    errorDetail: lastErrorDetail
  };
}
