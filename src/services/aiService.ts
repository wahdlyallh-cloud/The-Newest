import { getCurrentAppLanguage, getAILanguageInstruction, getAISystemLanguageContract } from './aiLanguageContract';
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
import {
  buildUnifiedKnowledgeIndex,
  retrieveRelevantKnowledge,
  analyzeQueryIntent,
  getGroundedSystemDirectives,
  UnifiedKnowledgeIndex,
  KnowledgeIndexOptions,
  RetrievedKnowledgeContext
} from './unifiedAIKnowledgeService';

export {
  AI_MODEL,
  cleanModelIdentifier,
  getGeminiApiKey,
  hasValidGeminiKey,
  validateGeminiApiKey,
  HYBRID_SYSTEM_INSTRUCTION,
  transcribeAudioWithGemini,
  buildUnifiedKnowledgeIndex,
  retrieveRelevantKnowledge,
  analyzeQueryIntent,
  getGroundedSystemDirectives,
  UnifiedKnowledgeIndex
};
export type { KnowledgeIndexOptions, RetrievedKnowledgeContext };

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
  async analyzeMood(title: string, content: string, customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/analyze-mood', {
      title,
      content,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'light' });
  },

  /**
   * 3. Evaluate Habits Performance & Adherence Report
   */
  async evaluateHabits(habits: any[], period: string, overallCompliance: number, customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/evaluate-habits', {
      habits,
      period,
      overallCompliance,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'reasoning' });
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
    mediaAccessPermission?: any;
  }, customKey?: string) {
    return callGeminiApiSafely('/api/gemini/smart-advisor', payload, {
      customKey,
      activeLanguage: payload.appLanguage || getCurrentAppLanguage(),
      task: 'reasoning'
    });
  },

  /**
   * 5. Single-Shot Diary Assistant (Summarize, Cognitive Mistakes, Action Steps)
   */
  async assistDiary(title: string, content: string, promptType: 'summarize' | 'mistakes' | 'plan' | string, customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/diary-assistant', {
      title,
      content,
      promptType,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'reasoning' });
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
      activeLanguage: payload.appLanguage || getCurrentAppLanguage(),
      task: 'reasoning'
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
      activeLanguage: payload.appLanguage || getCurrentAppLanguage(),
      task: 'light'
    });
  },

  /**
   * 8. CBT Cognitive Restructuring
   */
  async analyzeCBT(triggerEvent: string, negativeThought: string, cognitiveDistortion?: string, customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/cbt-analyze', {
      triggerEvent,
      negativeThought,
      cognitiveDistortion,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'reasoning' });
  },

  /**
   * 9. Daily Inspiration Generator
   */
  async generateDailyInspiration(moods: string[], customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/daily-inspiration', {
      moods,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'light' });
  },

  /**
   * 10. AI Article & Note Generator
   */
  async generateNote(topic: string, customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/generate-note', {
      topic,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'light' });
  },

  /**
   * 11. Multimodal Audio Transcription & Emotion Analysis
   */
  async transcribeAudio(audioBase64: string, mimeType = 'audio/webm', customKey?: string, appLanguage = getCurrentAppLanguage()) {
    return callGeminiApiSafely('/api/gemini/transcribe-audio', {
      audioBase64,
      mimeType,
      appLanguage
    }, { customKey, activeLanguage: appLanguage, task: 'multimodal' });
  },

  /**
   * 12. Direct Fail-Safe Generation (Client-Side REST Fallback)
   */
  async generateDirect(prompt: string, systemInstruction?: string, customKey?: string, task: 'light' | 'multimodal' | 'deep' | 'reasoning' = 'multimodal') {
    return generateGeminiContentDirect(prompt, systemInstruction, customKey, undefined, undefined, task);
  }
};

export default aiService;
