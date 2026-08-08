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
  const langNames: Record<string, string> = {
    ar: "Arabic",
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    tr: "Turkish",
    ur: "Urdu",
    hi: "Hindi",
    id: "Indonesian"
  };
  const targetLanguage = langNames[lang] || "Arabic";

  return `You must generate all clinical analyses, chat responses, and CBT feedback strictly in ${targetLanguage}. Translate all mood tags, insights, and recommendations completely to ${targetLanguage}.`;
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
