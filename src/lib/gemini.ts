// Safe, resilient Gemini API helper module with lazy initialization.
// Ensures Gemini API initialization NEVER executes synchronously on app boot up.

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
