// ============================================================
//  gemini.ts — Hard-Rooted Stable Gemini API Helper
//  Safe, resilient Gemini API module with lazy initialization.
//  NEVER executes synchronously on app boot.
// ============================================================

import { 
  getCandidateApiKeys, 
  rotateToNextKey, 
  recordKeySuccess, 
  classifyGeminiError, 
  AITaskType, 
  getModelTierCandidates,
  getModelCandidatesForTask,
  markModelUnavailableForKey,
  markModelFailedForKey,
  markModelVerifiedForKey,
  testGeminiApiKey
} from './apiKeyManager';

export const AI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_MODEL = AI_MODEL;

/**
 * Returns the exact model identifier without any alias translation or mapping.
 */
export function cleanModelIdentifier(modelName?: string): string {
  if (!modelName || !modelName.trim()) return AI_MODEL;
  return modelName.trim().replace(/^models\//, '');
}

/**
 * Sanitizes raw HTML tags, breaks, and entities from diary entry text before display.
 * Uses browser-native DOM parsing (DOMParser / div element) for bulletproof entity & tag extraction,
 * completely preventing leakage of string artifacts like `nbsp;&div;`.
 */
export function cleanDiaryText(rawText?: string): string {
  if (!rawText) return '';
  let text = String(rawText);

  // 1. Replace structural/block HTML tags with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(div|p|h[1-6]|li|tr|article|section)>/gi, '\n');
  text = text.replace(/<(div|p|h[1-6]|li|tr|article|section)[^>]*>/gi, '\n');

  // 2. Browser-native DOM parsing for entity decoding & tag stripping
  if (typeof window !== 'undefined') {
    try {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        text = doc.body?.textContent || doc.documentElement?.textContent || text;
      } else if (typeof document !== 'undefined' && document.createElement) {
        const div = document.createElement('div');
        div.innerHTML = text;
        text = div.textContent || div.innerText || text;
      }
    } catch (_) {}
  }

  // 3. Fallback regex multi-pass entity decoding & tag stripping (SSR/Node safety)
  for (let pass = 0; pass < 3; pass++) {
    const prev = text;
    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/gi, "'");
    if (text === prev) break;
  }

  // 4. Strip any residual HTML tags and malformed entity remnants
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/nbsp;/gi, ' ');
  text = text.replace(/&[a-z0-9#]+;/gi, ' ');

  // 5. Collapse multiple spaces & nbsp remnants into a single space
  text = text.replace(/[ \t\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, ' ');

  // 6. Collapse excessive newlines (max 2 consecutive newlines)
  text = text.replace(/[\r\n]{3,}/g, '\n\n');

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

// ─── Hybrid System Instructions ───────────────────────────────

export const HYBRID_SYSTEM_INSTRUCTION = `You are 'Hayat AI' — a Hybrid Dual-Capability AI combining Context-Aware Personal Counseling (diaries, habits, CBT, gratitude, wellness) AND Comprehensive General Knowledge (science, studies, programming, general Q&A, advice, drafting). Never refuse general external questions. Answer all questions with high intelligence, empathy, and depth.`;

export function getLanguageSystemInstruction(activeLanguage?: string): string {
  const lang = (activeLanguage || 'ar').toLowerCase();
  const langNames: Record<string, { name: string; native: string }> = {
    ar: { name: 'Arabic',             native: 'العربية' },
    en: { name: 'English',            native: 'English' },
    fr: { name: 'French',             native: 'Français' },
    de: { name: 'German',             native: 'Deutsch' },
    es: { name: 'Spanish',            native: 'Español' },
    it: { name: 'Italian',            native: 'Italiano' },
    tr: { name: 'Turkish',            native: 'Türkçe' },
    pt: { name: 'Portuguese',         native: 'Português' },
    ru: { name: 'Russian',            native: 'Русский' },
    ja: { name: 'Japanese',           native: '日本語' },
    zh: { name: 'Chinese Simplified', native: '中文' },
    hi: { name: 'Hindi',              native: 'हिन्दी' },
  };
  const target = langNames[lang] || { name: 'Arabic', native: 'العربية' };

  return (
    `SYSTEM PERSONA: You are Hayat AI — a Hybrid Dual-Capability AI combining Context-Aware Personal Counseling (diaries, habits, CBT, gratitude, wellness) AND Comprehensive General Knowledge (science, studies, programming, general Q&A, advice, drafting). ` +
    `Never refuse general external questions with "I only handle diaries". Answer all questions with high intelligence, empathy, and depth. ` +
    `CRITICAL REQUIREMENT: You MUST process input and generate your response EXCLUSIVELY in ` +
    `${target.name} (${target.native}) [Language code: ${lang}]. ` +
    `Do NOT output Arabic or any other language unless explicitly requested by the user.`
  );
}

// ─── Localized error message helper ──────────────────────────
import { getTranslation } from './languages';
import { getAISystemLanguageContract, getLocalizedAIError, getCurrentAppLanguage } from '../services/aiLanguageContract';

function getLocalizedError(key: string, lang: string, rawMsg?: string): string {
  return getLocalizedAIError(key, lang, rawMsg);
  const t = getTranslation(lang as any);
  switch (key) {
    case 'key-missing': return (t as any).apiKeyCheckSettings || 'Please check your API key in settings';
    case 'rate-limit': return (t as any).dailyLimitReached || 'Daily usage limit reached';
    case 'connection': return rawMsg ? `${(t as any).connectionError || 'Connection error'}: ${rawMsg}` : ((t as any).connectionError || 'Connection error');
    default: return (t as any).apiKeyCheckSettings || 'Please check your API key in settings';
  }
}

// ─── Bulletproof Request Wrapper ──────────────────────────────

/**
 * Safe lazy caller for Gemini endpoints or direct REST fallback.
 *
 * Guarantees:
 *  - API key is checked BEFORE the fetch call.
 *  - HTTP 429 → localized rate-limit message.
 *  - Any other error → localized connection error.
 *  - Missing/invalid key → localized API key message.
 */
export async function callGeminiApiSafely(
  endpoint: string,
  payload: any,
  options?: { customKey?: string; activeLanguage?: string }
): Promise<{ success: boolean; answer?: string; error?: string; source?: string; requiresApiKey?: boolean }> {
  const key = getGeminiApiKey(options?.customKey);
  const lang = options?.activeLanguage || payload?.appLanguage || payload?.langCode || getCurrentAppLanguage();

  // ── Key guard (checked before any network activity) ───────────
  if (isKeyObviouslyInvalid(key)) {
    return {
      success: false,
      requiresApiKey: true,
      error: getLocalizedError('key-missing', lang),
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
        error: getLocalizedError('rate-limit', lang),
        source: 'rate-limit',
      };
    }

    const responseText = await response.text();
    let data: any = null;
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (_) {}
    }

    if (data && typeof data === 'object') {
      return data;
    }

    // Fallback gracefully if server response is empty or non-JSON
    const prompt = payload?.prompt || payload?.newMessage || payload?.userPromptWithContext || payload?.content || payload?.query || '';
    const system = payload?.systemInstruction || payload?.systemPrompt;
    if (prompt) {
      const fallbackAnswer = await generateGeminiContentDirect(prompt, system, options?.customKey, undefined, lang);
      return {
        success: true,
        answer: fallbackAnswer,
        source: 'client-fallback'
      };
    }

    return {
      success: false,
      error: getLocalizedError('key-missing', lang),
      source: 'invalid-json'
    };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    console.error(`[gemini] callGeminiApiSafely → ${endpoint} failed:`, rawMsg);
    return {
      success: false,
      error: getLocalizedError('connection', lang, rawMsg),
      source: 'network-fallback',
    };
  }
}


// ─── API Key Validation ────────────────────────────────────────

export async function validateGeminiApiKey(
  rawKey: string,
  lang: string = 'ar'
): Promise<{ success: boolean; message: string; errorDetail?: string }> {
  const cleanKey = (rawKey || '').trim();
  const t = getTranslation(lang as any);

  if (!cleanKey) {
    return {
      success: false,
      message: (t as any).apiKeyEmpty || 'API key is empty. Please enter the key correctly.',
    };
  }

  const res = await testGeminiApiKey(cleanKey);

  if (res.success) {
    return {
      success: true,
      message: `${(t as any).apiKeyVerified || 'Key verified successfully 🎉'}${res.verifiedModel ? ` (${res.verifiedModel})` : ''}`,
    };
  }

  if (res.errorType === 'quota_exhausted') {
    return {
      success: true,
      message: `${(t as any).apiKeyVerified || 'Key saved'} 🎉 (${(t as any).dailyLimitReached || 'Daily limit temporarily reached'})`,
      errorDetail: res.message,
    };
  }

  if (res.errorType === 'invalid_key') {
    return {
      success: false,
      message: (t as any).apiKeyInvalidError || 'Invalid API key. Please ensure it is copied correctly from Google AI Studio.',
      errorDetail: res.message,
    };
  }

  return {
    success: false,
    message: (t as any).apiKeyCheckSettings || 'Please check your API key in settings',
    errorDetail: res.message,
  };
}

// ─── Direct Content Generation (with model fallback chain) ────

/**
 * Calls the Gemini generateContent REST endpoint directly from the client.
 *
 * Model resolution strategy:
 *   Smart Task-Based Model Tiers (Light, Multimodal, Reasoning)
 *
 * Every request includes BLOCK_NONE safety settings.
 * All error messages returned to callers are in Arabic.
 */
export async function generateGeminiContentDirect(
  userPromptWithContext: string,
  systemInstruction?: string,
  customKey?: string,
  extraParts?: any[],
  appLanguage?: string,
  taskType: AITaskType = 'multimodal',
  isJson?: boolean
): Promise<string> {
  let finalSystemInstruction = systemInstruction || '';
  if (appLanguage) {
    const langRule = getLanguageSystemInstruction(appLanguage);
    if (!finalSystemInstruction.includes("CRITICAL REQUIREMENT: You MUST process input and generate your response EXCLUSIVELY in")) {
      finalSystemInstruction = finalSystemInstruction 
        ? finalSystemInstruction + '\n\n' + langRule
        : langRule;
    }
  }

  const candidateKeys = getCandidateApiKeys(customKey);
  if (candidateKeys.length === 0) {
    return getLocalizedAIError('key-missing', appLanguage);
  }

  let lastError = '';
  let allKeysExhausted = true;

  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const currentKey = candidateKeys[keyIdx];
    const modelsToTry = await getModelCandidatesForTask(currentKey, taskType);
    let allModels429OnThisKey = true;

    for (const model of modelsToTry) {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
        `:generateContent?key=${encodeURIComponent(currentKey.trim())}`;

      const partsArray = (extraParts && Array.isArray(extraParts) && extraParts.length > 0)
        ? [...extraParts, { text: userPromptWithContext }]
        : [{ text: userPromptWithContext }];

      const requestBody: any = {
        contents: [
          {
            role: 'user',
            parts: partsArray,
          },
        ],
        safetySettings: SAFETY_SETTINGS_BLOCK_NONE,
      };

      if (finalSystemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: finalSystemInstruction }],
        };
      }

      if (isJson) {
        requestBody.generationConfig = { responseMimeType: 'application/json' };
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
            markModelVerifiedForKey(currentKey, model);
            recordKeySuccess(currentKey, model);
            return output.trim();
          }
        }

        // ── Error path & Step-down ────────────────────────────────────
        const rawError = data?.error?.message || `HTTP ${res.status}`;
        lastError = rawError;
        const errType = classifyGeminiError(res.status, rawError);

        // True key invalidity -> rotate key away
        if (errType === 'invalid_key') {
          rotateToNextKey(currentKey, 'invalid_key');
          allModels429OnThisKey = false;
          break; // break model loop to try next key in pool
        }

        // 429 / Quota / Rate limit on (currentKey, model):
        // Record per-model failure (24h if limit: 0 / free tier, else short cooldown)
        // DO NOT mark entire key exhausted! Immediately step down to next model on SAME key!
        if (errType === 'quota_exhausted' || errType === 'rate_limited' || res.status === 429) {
          markModelFailedForKey(currentKey, model, res.status, rawError);
          continue; // step down to next candidate model on SAME key
        }

        allModels429OnThisKey = false;

        // Model-specific failure: 404 NOT_FOUND, deprecated, or restricted
        markModelFailedForKey(currentKey, model, res.status, rawError);
        continue; // try next candidate model on SAME key
      } catch (err: any) {
        allModels429OnThisKey = false;
        lastError = err?.message || String(err);
      }
    }

    // Only mark the entire key as quota_exhausted if ALL candidate models failed with 429
    if (allModels429OnThisKey) {
      rotateToNextKey(currentKey, 'quota_exhausted');
    } else {
      allKeysExhausted = false;
    }
  }

  if (allKeysExhausted || lastError.includes('quota') || lastError.includes('RESOURCE_EXHAUSTED')) {
    return getLocalizedAIError('quota-exhausted', appLanguage);
  }

  return getLocalizedAIError('connection', appLanguage, lastError);
}

/**
 * Transcribes audio data using Gemini multimodal REST API (`inlineData`) with Key Rotation & Multimodal Tier.
 */
export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType = 'audio/webm',
  customKey?: string,
  appLanguage = 'ar'
): Promise<string> {
  const candidateKeys = getCandidateApiKeys(customKey);
  if (candidateKeys.length === 0) {
    return getLocalizedAIError('key-missing', appLanguage);
  }

  let pureBase64 = audioBase64;
  let resolvedMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (audioBase64.startsWith('data:')) {
    const parts = audioBase64.split(';base64,');
    if (parts.length === 2) {
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) resolvedMime = mimeMatch[1].split(';')[0].trim().toLowerCase();
      pureBase64 = parts[1];
    }
  }

  // Clean MIME normalization for Gemini
  let cleanMime = resolvedMime;
  if (cleanMime.includes("webm")) cleanMime = "audio/webm";
  else if (cleanMime.includes("opus") || cleanMime.includes("ogg")) cleanMime = "audio/ogg";
  else if (cleanMime.includes("mp3") || cleanMime.includes("mpeg")) cleanMime = "audio/mp3";
  else if (cleanMime.includes("wav") || cleanMime.includes("x-wav")) cleanMime = "audio/wav";
  else if (cleanMime.includes("mp4") || cleanMime.includes("m4a") || cleanMime.includes("aac")) cleanMime = "audio/mp4";
  else if (cleanMime.includes("flac")) cleanMime = "audio/flac";
  else if (cleanMime.includes("3gp") || cleanMime.includes("amr")) cleanMime = "audio/3gpp";
  else cleanMime = "audio/webm";

  let lastAudioError = '';
  let allKeysExhaustedAudio = true;

  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const currentKey = candidateKeys[keyIdx];
    const modelsToTry = await getModelCandidatesForTask(currentKey, 'multimodal');
    let allModels429OnKey = true;

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(currentKey.trim())}`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: pureBase64
                }
              },
              {
                text: 'قم بتفريغ هذا التسجيل الصوتي بدقة عالية إلى نص عربي منظم، حافظ على جميع الكلمات والتفاصيل دون حذف أو اختصار، وأضف علامات الترقيم المناسبة دون أي مقدمات أو خاتمة.'
              }
            ]
          }
        ],
        safetySettings: SAFETY_SETTINGS_BLOCK_NONE
      };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const responseText = await res.text();
        let data: any = {};
        if (responseText && responseText.trim()) {
          try { data = JSON.parse(responseText); } catch (_) {}
        }

        if (res.ok) {
          const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (output && typeof output === 'string' && output.trim() !== '') {
            markModelVerifiedForKey(currentKey, model);
            recordKeySuccess(currentKey, model);
            return output.trim();
          }
        }

        const rawError = data?.error?.message || `HTTP ${res.status}`;
        lastAudioError = rawError;
        const errType = classifyGeminiError(res.status, rawError);

        if (errType === 'invalid_key') {
          rotateToNextKey(currentKey, 'invalid_key');
          allModels429OnKey = false;
          break; // try next key
        }

        if (errType === 'quota_exhausted' || errType === 'rate_limited' || res.status === 429) {
          markModelFailedForKey(currentKey, model, res.status, rawError);
          continue; // step down to next candidate model on SAME key
        }

        allModels429OnKey = false;
        markModelFailedForKey(currentKey, model, res.status, rawError);
        continue;
      } catch (err: any) {
        allModels429OnKey = false;
        lastAudioError = err?.message || String(err);
        console.warn(`[gemini-transcribe] Model ${model} failed with key #${keyIdx + 1}:`, err);
      }
    }

    if (allModels429OnKey) {
      rotateToNextKey(currentKey, 'quota_exhausted');
    } else {
      allKeysExhaustedAudio = false;
    }
  }

  if (allKeysExhaustedAudio || lastAudioError.includes('quota') || lastAudioError.includes('RESOURCE_EXHAUSTED')) {
    return getLocalizedAIError('quota-exhausted', appLanguage);
  }

  return getLocalizedAIError('connection', appLanguage, lastAudioError);
}