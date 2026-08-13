// ============================================================
//  aiService.ts — Centralized AI Service Architecture
//  Unified layer for all AI features across Hayat AI.
// ============================================================

import {
  AI_MODEL,
  cleanModelIdentifier,
  getGeminiApiKey,
  hasValidGeminiKey,
  validateGeminiApiKey,
  callGeminiApiSafely,
  generateGeminiContentDirect,
  HYBRID_SYSTEM_INSTRUCTION,
  transcribeAudioWithGemini
} from '../lib/gemini';

export { AI_MODEL, cleanModelIdentifier, getGeminiApiKey, hasValidGeminiKey, validateGeminiApiKey, HYBRID_SYSTEM_INSTRUCTION, transcribeAudioWithGemini };

export interface AIResponse<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  source?: string;
}

/**
 * Centralized AI Service
 * Standardizes API calls, parameters, and fallback handling for all 12 AI features.
 */
export const aiService = {
  /**
   * 1. Validate User API Key
   */
  async validateKey(key: string) {
    return validateGeminiApiKey(key);
  },

  /**
   * 2. Analyze Entry Mood (Automatic Sentiment Analysis)
   */
  async analyzeMood(title: string, content: string, customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/analyze-mood', {
      title,
      content,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 3. Evaluate Habits Performance & Adherence Report
   */
  async evaluateHabits(habits: any[], period: string, overallCompliance: number, customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/evaluate-habits', {
      habits,
      period,
      overallCompliance,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 4. Smart Advisor & Comprehensive Psychological Q&A
   */
  async askSmartAdvisor(payload: {
    query: string;
    diaries?: any[];
    habits?: any[];
    books?: any[];
    gratitudeCards?: any[];
    reportType?: string;
    appLanguage?: string;
    athkarContext?: any;
    athkarPromptText?: string;
  }, customKey?: string) {
    return callGeminiApiSafely('/api/gemini/smart-advisor', payload, {
      customKey,
      activeLanguage: payload.appLanguage || 'ar'
    });
  },

  /**
   * 5. Single-Shot Diary Assistant (Summarize, Cognitive Mistakes, Action Steps)
   */
  async assistDiary(title: string, content: string, promptType: 'summarize' | 'mistakes' | 'plan' | string, customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/diary-assistant', {
      title,
      content,
      promptType,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 6. Interactive Diary Chat Space (Venting & Counseling)
   */
  async chatInDiary(payload: {
    title?: string;
    content?: string;
    chatLogs?: any[];
    newMessage: string;
    diaryType?: string;
    moods?: string[];
    tags?: string[];
    audioTranscriptions?: string[];
    attachments?: string[];
    appLanguage?: string;
  }, customKey?: string) {
    return callGeminiApiSafely('/api/gemini/diary-chat', payload, {
      customKey,
      activeLanguage: payload.appLanguage || 'ar'
    });
  },

  /**
   * 7. Gratitude Advisor & Card Generation
   */
  async consultGratitude(payload: {
    gratitudeCards?: any[];
    diaries?: any[];
    action?: string;
    cardText?: string;
    customPrompt?: string;
    appLanguage?: string;
  }, customKey?: string) {
    return callGeminiApiSafely('/api/gemini/gratitude-advisor', payload, {
      customKey,
      activeLanguage: payload.appLanguage || 'ar'
    });
  },

  /**
   * 8. CBT Cognitive Restructuring
   */
  async analyzeCBT(triggerEvent: string, negativeThought: string, cognitiveDistortion?: string, customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/cbt-analyze', {
      triggerEvent,
      negativeThought,
      cognitiveDistortion,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 9. Daily Inspiration Generator
   */
  async generateDailyInspiration(moods: string[], customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/daily-inspiration', {
      moods,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 10. AI Article & Note Generator
   */
  async generateNote(topic: string, customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/generate-note', {
      topic,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 11. Multimodal Audio Transcription & Emotion Analysis
   */
  async transcribeAudio(audioBase64: string, mimeType = 'audio/webm', customKey?: string, appLanguage = 'ar') {
    return callGeminiApiSafely('/api/gemini/transcribe-audio', {
      audioBase64,
      mimeType,
      appLanguage
    }, { customKey, activeLanguage: appLanguage });
  },

  /**
   * 12. Direct Fail-Safe Generation (Client-Side REST Fallback)
   */
  async generateDirect(prompt: string, systemInstruction?: string, customKey?: string) {
    return generateGeminiContentDirect(prompt, systemInstruction, customKey);
  }
};

export default aiService;
