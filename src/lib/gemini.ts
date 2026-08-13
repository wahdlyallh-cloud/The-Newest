// Safe, resilient Gemini API helper module with lazy initialization.
// Ensures Gemini API initialization NEVER executes synchronously on app boot up.

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export function cleanModelIdentifier(modelName?: string): string {
  return (modelName || 'gemini-1.5-flash').trim().replace(/^models\//, '');
}

function sanitizeApiKeyString(k?: any): string {
  if (!k || typeof k !== 'string') return '';
  return k.trim().replace(/^['"]+|['"]+$/g, '');
}

export function getGeminiApiKey(customKey?: string): string {
  const cleanCustom = sanitizeApiKeyString(customKey);
  if (cleanCustom) return cleanCustom;

  // Try global window variable
  if (typeof window !== 'undefined' && (window as any).__GEMINI_KEY__) {
    const key = sanitizeApiKeyString((window as any).__GEMINI_KEY__);
    if (key) return key;
  }

  // Try localStorage settings
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('yawmiyati_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const key = sanitizeApiKeyString(parsed?.userApiKey);
        if (key) return key;
      }
    } catch (e) {
      console.warn("Failed to read userApiKey from localStorage settings:", e);
    }
  }

  // Try VITE environment variable
  try {
    const envKey = sanitizeApiKeyString((import.meta as any)?.env?.VITE_GEMINI_API_KEY);
    if (envKey) return envKey;
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

  // Use official ListModels GET endpoint for fail-proof key validation
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const responseText = await res.text();
    let errJson: any = null;
    if (responseText && responseText.trim()) {
      try {
        errJson = JSON.parse(responseText);
      } catch (e) {}
    }

    if (res.status === 200 || res.ok) {
      return {
        success: true,
        message: 'تم التحقق من المفتاح بنجاح'
      };
    }

    const rawMsg = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText || 'خطأ في الطلب'}`;
    console.error('Gemini API Validation Error:', rawMsg);

    if (res.status === 429 || rawMsg.includes('Quota exceeded') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      return {
        success: true,
        message: 'تم تجاوز حصة الاستخدام المجانية للمفتاح، يرجى المحاولة لاحقاً',
        errorDetail: rawMsg
      };
    }

    if (res.status === 400 || res.status === 403 || rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_INVALID')) {
      return {
        success: false,
        message: 'مفتاح API غير صالح، يرجى التأكد من نسخه بشكل صحيح من Google AI Studio',
        errorDetail: rawMsg
      };
    }

    return {
      success: false,
      message: `تعذر التحقق من المفتاح (${rawMsg})`,
      errorDetail: rawMsg
    };
  } catch (networkErr: any) {
    console.error('Gemini API Validation Error:', networkErr);
    const detail = networkErr?.message || String(networkErr);
    return {
      success: false,
      message: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
      errorDetail: detail
    };
  }
}

export async function generateGeminiContentDirect(
  userPromptWithContext: string,
  systemInstruction?: string,
  customKey?: string
): Promise<string> {
  const cleanKey = getGeminiApiKey(customKey);
  if (!cleanKey || cleanKey.trim() === '') {
    return "يرجى الذهاب إلى إعدادات التطبيق وتأكيد حفظ مفتاح Gemini API الخاص بك لتشغيل المستشار.";
  }

  const cleanModel = cleanModelIdentifier('gemini-1.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(cleanKey.trim())}`;

  const requestBody: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPromptWithContext }]
      }
    ],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const responseText = await res.text();
    let data: any = {};
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (e) {}
    }

    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (res.ok && output && typeof output === 'string' && output.trim() !== '') {
      return output;
    }

    const candidate = data?.candidates?.[0];
    if (candidate) {
      const candidateText = candidate?.content?.parts?.[0]?.text;
      if (candidateText && typeof candidateText === 'string' && candidateText.trim() !== '') {
        return candidateText;
      }
      if (candidate.finishReason === 'SAFETY') {
        return "أنا هنا دائماً لدعمك والاستماع إليك بكل محبة وحكمة. يسعدني تقديم التوجيه الإيجابي والتحليل الذي يساعدك في فهم مشاعرك وتطوير ذاتك بشكل رائع.";
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        return "أشكرك على مشاركة أفكارك معي! أنا جاهز لمساعدتك وحوارك في أي موضوع أو استفسار ترغب به بكل سرور ووضوح.";
      }
    }

    const rawError = data?.error?.message || `HTTP ${res.status}: ${res.statusText || 'خطأ في الاستجابة'}`;
    if (rawError.includes('API key not valid') || rawError.includes('API_KEY_INVALID') || res.status === 400 || res.status === 403) {
      return "خطأ من خادم جوجل: مفتاح API غير صالح. يرجى التأكد من نسخ المفتاح بشكل صحيح من Google AI Studio وحفظه في الإعدادات.";
    }

    if (rawError.includes('Quota') || rawError.includes('RESOURCE_EXHAUSTED') || res.status === 429) {
      return "خطأ من خادم جوجل: تم تجاوز حد الاستخدام المجاني المؤقت للمفتاح (Quota Exceeded). يرجى المحاولة بعد فترة قصيرة.";
    }

    return `خطأ من خادم جوجل: ${rawError}`;
  } catch (err: any) {
    console.error("Gemini Direct Generation Error:", err);
    return `⚠️ خطأ في الاتصال بالشبكة (${err?.message || 'تعذر الوصول لخادم الذكاء الاصطناعي'}).`;
  }
}
