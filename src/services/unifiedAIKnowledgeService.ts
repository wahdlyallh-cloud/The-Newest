// ============================================================================
//  unifiedAIKnowledgeService.ts — Unified AI Intelligence & Knowledge Layer
//  Hayat AI (حياة AI) — Comprehensive Multi-Source Memory & Knowledge Engine
// ============================================================================

import { DiaryEntry, Habit, GratitudeCard, Book, MultimodalAttachment } from '../types';
import { getAttachmentBlob } from '../lib/attachmentStore';
import { getTranslation } from '../lib/languages';

/**
 * Universal canonical entity types supported in the Knowledge Layer.
 * Extensible for any future modules (Finance, Fitness, Tasks, Calendar, Goals, Notes).
 */
export type KnowledgeSourceType =
  | 'diary'
  | 'thought'
  | 'gratitude'
  | 'wisdom'
  | 'quote'
  | 'idea'
  | 'goal'
  | 'habit'
  | 'book'
  | 'cbt_worksheet'
  | 'audio_recording'
  | 'image_attachment'
  | 'pdf_document'
  | 'video_attachment'
  | 'drawing'
  | 'pros_cons'
  | 'athkar_dhikr'
  | 'therapy_report'
  | 'custom_plugin';

export type MemoryCategory =
  | 'episodic'      // Personal life events, feelings, stories
  | 'semantic'      // Facts, stable preferences, core beliefs, habits
  | 'conversational'// Recent dialogue turns & follow-up context
  | 'document'      // Books, uploaded PDFs, long-form notes
  | 'media'         // Audio transcripts, canvas drawings, images, videos
  | 'temporal';     // Time-anchored logs & chronological milestones

export interface UnifiedKnowledgeEntity {
  id: string;
  sourceType: KnowledgeSourceType;
  memoryCategory: MemoryCategory;
  dateStr: string;           // "YYYY-MM-DD" or ISO
  timestamp: number;         // Unix ms timestamp for precise temporal math
  title: string;
  content: string;           // Cleaned textual content
  tags: string[];
  moods: string[];
  metrics?: Record<string, any>; // e.g., { sleepHours: 7, sportsMinutes: 30, rating: 5, completionRate: 85 }
  mediaPayload?: {
    mimeType?: string;
    attachmentId?: string;
    dataUrl?: string;
    fileUri?: string;
    audioTranscription?: string;
    previewUrl?: string;
    speechEmotion?: any;
  };
  relationshipKeys: string[]; // e.g. ['date:2026-08-10', 'topic:exam', 'emotion:anxiety', 'habit:sleep']
  sourceLabelAr: string;      // e.g. "يومية (10 أغسطس 2026)"
  sourceLabelEn: string;      // e.g. "Diary (Aug 10, 2026)"
  rawRef?: any;               // Reference to original object without data duplication
}

export interface QueryIntentAnalysis {
  rawQuery: string;
  cleanedQuery: string;
  intentCategory: 'GENERAL_EXTERNAL' | 'PERSONAL_DATA' | 'HYBRID_COMPARISON' | 'TEMPORAL_QUERY' | 'CROSS_SOURCE_RELATION' | 'MEDIA_INQUIRY';
  targetSources: KnowledgeSourceType[];
  temporalScope?: {
    type: 'exact_date' | 'date_range' | 'relative_recent' | 'relative_past' | 'all_time' | 'first_time' | 'last_time';
    startDate?: string;
    endDate?: string;
    targetDate?: string;
    labelAr?: string;
  };
  extractedKeywords: string[];
  detectedEmotions: string[];
  requiresMultimodalVisual: boolean;
  requiresMultimodalAudio: boolean;
  requiresMultimodalPDF: boolean;
  isFollowUpPronounQuery: boolean; // e.g. "هو ده ليه حصل؟" / "what about that?"
}

export interface RetrievedKnowledgeContext {
  matchedEntities: UnifiedKnowledgeEntity[];
  crossSourceCorrelations: Array<{
    title: string;
    date: string;
    evidence: Array<{ source: string; detail: string }>;
  }>;
  formattedContextText: string;
  multimodalParts: Array<{
    mimeType: string;
    data?: string;       // base64
    fileUri?: string;    // Gemini File API URI
    description?: string;
  }>;
  sourceCitations: Array<{
    id: string;
    type: KnowledgeSourceType;
    label: string;
    date: string;
  }>;
  confidenceScore: number;
}

export interface KnowledgeIndexOptions {
  appLanguage?: string;
  diaries?: DiaryEntry[];
  habits?: Habit[];
  gratitudeCards?: GratitudeCard[];
  books?: Book[];
  athkarContext?: any;
  prosConsRecords?: any[];
  customCopingCards?: any[];
  therapyReports?: any[];
  permissions?: {
    diaries?: boolean;
    moodLogs?: boolean;
    habits?: boolean;
    tasks?: boolean;
    cbtExercises?: boolean;
    therapyReports?: boolean;
    voiceNotes?: boolean;
    books?: boolean;
    gratitude?: boolean;
    lifeMap?: boolean;
    prosCons?: boolean;
  };
}

// ----------------------------------------------------------------------------
// 1. Text & Date Normalization Utilities
// ----------------------------------------------------------------------------

export function normalizeDateToYMD(d?: any): string {
  if (!d) return 'unknown';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (d.includes(' ')) return d.split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  return String(d);
}

export function parseTimestampSafe(d?: any): number {
  if (!d) return 0;
  if (typeof d === 'number') return d;
  try {
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

export function stripHtmlAndClean(str?: string): string {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\r\n]{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------------------
// 2. Data Discovery & Canonical Index Builder
// ----------------------------------------------------------------------------

export class UnifiedKnowledgeIndex {
  private entities: UnifiedKnowledgeEntity[] = [];
  private tokenIndex: Map<string, Set<string>> = new Map(); // token -> entityId Set
  private timelineIndex: Map<string, string[]> = new Map(); // dateStr -> entityId[]
  private relationshipIndex: Map<string, string[]> = new Map(); // relKey -> entityId[]

  constructor(entities: UnifiedKnowledgeEntity[]) {
    this.entities = entities;
    this.buildIndexes();
  }

  private buildIndexes() {
    for (const ent of this.entities) {
      // 1. Timeline index
      if (ent.dateStr && ent.dateStr !== 'unknown') {
        const existing = this.timelineIndex.get(ent.dateStr) || [];
        existing.push(ent.id);
        this.timelineIndex.set(ent.dateStr, existing);
      }

      // 2. Relationship index
      for (const rKey of ent.relationshipKeys) {
        const existing = this.relationshipIndex.get(rKey) || [];
        existing.push(ent.id);
        this.relationshipIndex.set(rKey, existing);
      }

      // 3. Inverted Token Index for fast sub-millisecond keyword lookup
      const searchableText = `${ent.title} ${ent.content} ${ent.tags.join(' ')} ${ent.moods.join(' ')}`.toLowerCase();
      const tokens = this.tokenizeText(searchableText);
      for (const token of tokens) {
        if (!this.tokenIndex.has(token)) {
          this.tokenIndex.set(token, new Set());
        }
        this.tokenIndex.get(token)!.add(ent.id);
      }
    }
  }

  private tokenizeText(text: string): string[] {
    return text
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length >= 2);
  }

  public getAllEntities(): UnifiedKnowledgeEntity[] {
    return this.entities;
  }

  public getEntitiesByDate(dateStr: string): UnifiedKnowledgeEntity[] {
    const ids = this.timelineIndex.get(dateStr) || [];
    return this.entities.filter(e => ids.includes(e.id));
  }

  public getEntitiesByRelationshipKey(key: string): UnifiedKnowledgeEntity[] {
    const ids = this.relationshipIndex.get(key) || [];
    return this.entities.filter(e => ids.includes(e.id));
  }

  public searchEntitiesByTokens(tokens: string[]): Map<string, number> {
    const matchCounts = new Map<string, number>();
    for (const tok of tokens) {
      const matchedIds = this.tokenIndex.get(tok.toLowerCase());
      if (matchedIds) {
        for (const id of matchedIds) {
          matchCounts.set(id, (matchCounts.get(id) || 0) + 1);
        }
      }
    }
    return matchCounts;
  }
}

/**
 * Normalizes all available app data into a UnifiedKnowledgeIndex instance.
 */
export function buildUnifiedKnowledgeIndex(options: KnowledgeIndexOptions): UnifiedKnowledgeIndex {
  const t = getTranslation(options.appLanguage || 'EN');
  const entities: UnifiedKnowledgeEntity[] = [];
  const p = options.permissions || {
    diaries: true,
    moodLogs: true,
    habits: true,
    tasks: true,
    cbtExercises: true,
    therapyReports: true,
    voiceNotes: true,
    books: true,
    gratitude: true,
    lifeMap: true,
    prosCons: true,
  };

  // 1. Process Diaries & Thoughts
  if (p.diaries !== false && options.diaries && Array.isArray(options.diaries)) {
    for (const d of options.diaries) {
      if (d.isTrash) continue; // Skip trashed entries

      const dateStr = normalizeDateToYMD(d.createdAt);
      const timestamp = parseTimestampSafe(d.createdAt);
      const cleanContent = stripHtmlAndClean(d.content);
      const entryType: KnowledgeSourceType = (d.diaryType as KnowledgeSourceType) || 'diary';
      const title = d.title || `${t.untitledEntry} ${t[entryType] || 'Entry'}`;

      const relKeys: string[] = [`date:${dateStr}`, `type:${entryType}`];
      if (d.isFavorite) {
        relKeys.push('favorite:true');
      }
      if (d.tags && Array.isArray(d.tags)) {
        d.tags.forEach(t => relKeys.push(`tag:${t.toLowerCase().trim()}`));
      }
      if (d.moods && Array.isArray(d.moods)) {
        d.moods.forEach(m => relKeys.push(`mood:${m.toLowerCase().trim()}`));
      }

      const metrics: Record<string, any> = {};
      if (d.sleepHours !== undefined) metrics.sleepHours = d.sleepHours;
      if (d.sportsDuration !== undefined) metrics.sportsDuration = d.sportsDuration;
      if (d.sportsType) metrics.sportsType = d.sportsType;
      if (d.waterCups !== undefined) metrics.waterCups = d.waterCups;
      if (d.fastMoodScore !== undefined) metrics.fastMoodScore = d.fastMoodScore;
      if (d.importance !== undefined) metrics.importance = d.importance;
      if (d.isFavorite !== undefined) metrics.isFavorite = d.isFavorite;

      // Base Unified Journal Entity
      entities.push({
        id: `diary_${d.id}`,
        sourceType: entryType,
        memoryCategory: entryType === 'goal' ? 'semantic' : 'episodic',
        dateStr,
        timestamp,
        title,
        content: cleanContent,
        tags: d.tags || [],
        moods: d.moods || [],
        metrics,
        relationshipKeys: relKeys,
        sourceLabelAr: `${t[entryType] || 'Entry'} (${dateStr}) - "${title}"`,
        sourceLabelEn: `${t[entryType] || 'Entry'} (${dateStr}) - "${title}"`,
        rawRef: d
      });

      // 1.1 Extract Embedded Audio Recordings
      if (p.voiceNotes !== false && d.audioRecordings && Array.isArray(d.audioRecordings)) {
        d.audioRecordings.forEach((rec, idx) => {
          const recTitle = rec.name || `${t.audioRecording} #${idx + 1} - ${dateStr}`;
          const recTranscript = stripHtmlAndClean(rec.transcription || '');
          const recEmotion = rec.speechEmotion?.primaryEmotion || '';

          entities.push({
            id: `audio_${rec.id || `${d.id}_rec_${idx}`}`,
            sourceType: 'audio_recording',
            memoryCategory: 'media',
            dateStr,
            timestamp,
            title: recTitle,
            content: recTranscript ? `${t.audioTranscription}: "${recTranscript}"` : `${t.audioRecording} - ${rec.duration || 0}s`,
            tags: [...(d.tags || []), 'audio', 'recording'],
            moods: recEmotion ? [recEmotion, ...(d.moods || [])] : d.moods || [],
            metrics: { durationSeconds: rec.duration, speechEmotion: rec.speechEmotion },
            mediaPayload: {
              mimeType: 'audio/webm',
              attachmentId: rec.attachmentId,
              dataUrl: rec.dataUrl,
              audioTranscription: recTranscript,
              speechEmotion: rec.speechEmotion
            },
            relationshipKeys: [...relKeys, 'type:audio', `parent:diary_${d.id}`],
            sourceLabelAr: `${t.audioRecording} (${dateStr}) - "${recTitle}"`,
            sourceLabelEn: `${t.audioRecording} (${dateStr}) - "${recTitle}"`,
            rawRef: rec
          });
        });
      }

      // 1.2 Extract Canvas Drawings
      if (d.drawing && typeof d.drawing === 'string' && d.drawing.length > 50) {
        entities.push({
          id: `drawing_${d.id}`,
          sourceType: 'drawing',
          memoryCategory: 'media',
          dateStr,
          timestamp,
          title: `${t.canvasDrawing} - ${dateStr}`,
          content: `${t.canvasDrawingDesc}. "${cleanContent.substring(0, 200)}"`,
          tags: [...(d.tags || []), 'canvas', 'drawing'],
          moods: d.moods || [],
          metrics: {},
          mediaPayload: {
            mimeType: 'image/png',
            dataUrl: d.drawing,
            previewUrl: d.drawing
          },
          relationshipKeys: [...relKeys, 'type:drawing', `parent:diary_${d.id}`],
          sourceLabelAr: `${t.canvasDrawing} (${dateStr})`,
          sourceLabelEn: `${t.canvasDrawing} (${dateStr})`,
          rawRef: d.drawing
        });
      }

      // 1.3 Extract Embedded CBT Worksheets
      if (p.cbtExercises !== false && d.cbtWorksheets && Array.isArray(d.cbtWorksheets)) {
        d.cbtWorksheets.forEach((cbt, idx) => {
          const cbtContent = [
            `${t.cbtTriggerEvent}: ${cbt.triggerEvent}`,
            `${t.cbtNegativeThoughts}: ${cbt.negativeThoughts}`,
            `${t.cbtCognitiveDistortion}: ${cbt.cognitiveDistortion}`,
            `${t.cbtRationalAlternative}: ${cbt.rationalAlternative}`,
            cbt.evidenceFor ? `${t.cbtEvidenceFor}: ${cbt.evidenceFor}` : '',
            cbt.evidenceAgainst ? `${t.cbtEvidenceAgainst}: ${cbt.evidenceAgainst}` : '',
            cbt.coreBelief ? `${t.cbtCoreBelief}: ${cbt.coreBelief}` : '',
            cbt.healthierBelief ? `${t.cbtHealthierBelief}: ${cbt.healthierBelief}` : ''
          ].filter(Boolean).join(' | ');

          entities.push({
            id: `cbt_${cbt.id || `${d.id}_cbt_${idx}`}`,
            sourceType: 'cbt_worksheet',
            memoryCategory: 'semantic',
            dateStr,
            timestamp: parseTimestampSafe(cbt.createdAt) || timestamp,
            title: `${t.cbtExercise} - ${cbt.triggerEvent || dateStr}`,
            content: cbtContent,
            tags: [...(d.tags || []), 'CBT', cbt.cognitiveDistortion].filter(Boolean),
            moods: d.moods || [],
            metrics: {
              emotionBefore: cbt.emotionBefore,
              emotionAfter: cbt.emotionAfter,
              exerciseType: cbt.exerciseType
            },
            relationshipKeys: [...relKeys, 'type:cbt', `parent:diary_${d.id}`],
            sourceLabelAr: `${t.cbtExercise} (${dateStr}) - "${cbt.triggerEvent}"`,
            sourceLabelEn: `${t.cbtExercise} (${dateStr}) - "${cbt.triggerEvent}"`,
            rawRef: cbt
          });
        });
      }

      // 1.4 Extract Attached Files & Images
      if (d.files && Array.isArray(d.files)) {
        d.files.forEach((f, idx) => {
          const isPdf = f.type === 'application/pdf' || f.name.endsWith('.pdf');
          const isImg = f.type.startsWith('image/');
          entities.push({
            id: `file_${f.id || `${d.id}_file_${idx}`}`,
            sourceType: isPdf ? 'pdf_document' : (isImg ? 'image_attachment' : 'custom_plugin'),
            memoryCategory: isPdf ? 'document' : 'media',
            dateStr,
            timestamp,
            title: `${t.attachment}: ${f.name}`,
            content: `${t.attachedFile} "${f.name}" ${t.size}: ${f.size || 'unknown'} - ${dateStr} ("${title}")`,
            tags: [...(d.tags || []), 'attachment', f.type || 'file'],
            moods: d.moods || [],
            metrics: { fileSize: f.size, fileType: f.type },
            mediaPayload: {
              mimeType: f.type,
              attachmentId: f.attachmentId,
              dataUrl: f.dataUrl
            },
            relationshipKeys: [...relKeys, 'type:attachment', `parent:diary_${d.id}`],
            sourceLabelAr: `${t.attachment} (${dateStr}) - "${f.name}"`,
            sourceLabelEn: `${t.attachment} (${dateStr}) - "${f.name}"`,
            rawRef: f
          });
        });
      }

      // 1.5 Extract Attached Image URLs
      if (d.images && Array.isArray(d.images)) {
        d.images.forEach((imgUrl, idx) => {
          entities.push({
            id: `img_${d.id}_${idx}`,
            sourceType: 'image_attachment',
            memoryCategory: 'media',
            dateStr,
            timestamp,
            title: `${t.attachedImage} - ${dateStr} #${idx + 1}`,
            content: `${t.visualImageAdded} ${dateStr} ("${title}"). "${cleanContent.substring(0, 150)}"`,
            tags: [...(d.tags || []), 'image'],
            moods: d.moods || [],
            metrics: {},
            mediaPayload: {
              mimeType: 'image/jpeg',
              dataUrl: imgUrl,
              previewUrl: imgUrl
            },
            relationshipKeys: [...relKeys, 'type:image', `parent:diary_${d.id}`],
            sourceLabelAr: `${t.attachedImage} (${dateStr})`,
            sourceLabelEn: `${t.attachedImage} (${dateStr})`,
            rawRef: imgUrl
          });
        });
      }
    }
  }

  // 2. Process Habits & Habit History
  if (p.habits !== false && options.habits && Array.isArray(options.habits)) {
    for (const h of options.habits) {
      if (h.isArchived) continue;
      const historyEntries = Object.entries(h.history || {});
      const completedDates = historyEntries
        .filter(([_, val]) => {
          if (typeof val === 'boolean') return val;
          if (typeof val === 'number') return val > 0;
          if (val && typeof val === 'object') return (val as any).completed === true;
          return false;
        })
        .map(([date]) => date);

      const recentCompletions = completedDates.slice(-30);
      const completionRate = historyEntries.length > 0
        ? Math.round((completedDates.length / Math.max(historyEntries.length, 1)) * 100)
        : 0;

      const habitText = [
        `${t.habit}: "${h.name}" (${t.category}: ${h.category || t.general})`,
        h.question ? `${t.habitQuestion}: ${h.question}` : '',
        `${t.targetFrequency}: ${h.frequency || t.daily}`,
        h.targetValue ? `${t.targetValue}: ${h.targetValue} ${h.unit || ''}` : '',
        `${t.completionRate}: ${completionRate}% (${completedDates.length} ${t.daysCompleted})`,
        `${t.recentCompletions}: [${recentCompletions.join(', ') || t.noRecentRecord}]`,
        h.notes ? `${t.habitNotes}: ${h.notes}` : ''
      ].filter(Boolean).join(' | ');

      const relKeys: string[] = [`habit:${h.name.toLowerCase().trim()}`, `category:${h.category}`];
      recentCompletions.forEach(d => relKeys.push(`date:${d}`));

      entities.push({
        id: `habit_${h.id}`,
        sourceType: 'habit',
        memoryCategory: 'semantic',
        dateStr: normalizeDateToYMD(h.createdAt),
        timestamp: parseTimestampSafe(h.createdAt),
        title: `${t.habit}: "${h.name}"`,
        content: habitText,
        tags: ['habit', h.category || 'health', h.name],
        moods: [],
        metrics: {
          completionRate,
          totalCompletedDays: completedDates.length,
          targetValue: h.targetValue,
          frequency: h.frequency
        },
        relationshipKeys: relKeys,
        sourceLabelAr: `${t.habit}: "${h.name}" (${h.category || t.behavior})`,
        sourceLabelEn: `${t.habit}: "${h.name}" (${h.category || t.behavior})`,
        rawRef: h
      });
    }
  }

  // 3. Process Gratitude Cards
  if (p.gratitude !== false && options.gratitudeCards && Array.isArray(options.gratitudeCards)) {
    for (const g of options.gratitudeCards) {
      const dateStr = normalizeDateToYMD(g.createdAt);
      const timestamp = parseTimestampSafe(g.createdAt);
      const cleanText = stripHtmlAndClean(g.text);

      const relKeys: string[] = [`date:${dateStr}`, 'type:gratitude'];
      if (g.tags && Array.isArray(g.tags)) {
        g.tags.forEach(t => relKeys.push(`tag:${t.toLowerCase().trim()}`));
      }

      entities.push({
        id: `gratitude_${g.id}`,
        sourceType: 'gratitude',
        memoryCategory: 'episodic',
        dateStr,
        timestamp,
        title: `${t.gratitudeCard} (${dateStr})`,
        content: cleanText,
        tags: g.tags || ['gratitude', 'positive thinking'],
        moods: ['grateful', 'joy', 'calm'],
        metrics: { likes: g.likes || 0 },
        relationshipKeys: relKeys,
        sourceLabelAr: `${t.gratitudeJournal} (${dateStr})`,
        sourceLabelEn: `${t.gratitudeJournal} (${dateStr})`,
        rawRef: g
      });
    }
  }

  // 4. Process Books & Library Notes
  if (p.books !== false && options.books && Array.isArray(options.books)) {
    for (const b of options.books) {
      const dateStr = normalizeDateToYMD(b.createdAt);
      const timestamp = parseTimestampSafe(b.createdAt);
      const cleanNotes = stripHtmlAndClean(b.notes || '');

      const bookText = [
        `${t.bookTitle}: "${b.title}"`,
        b.category ? `${t.category}: ${b.category}` : '',
        b.rating ? `${t.userRating}: ${b.rating}/5` : '',
        cleanNotes ? `${t.summaryNotes}: "${cleanNotes}"` : t.noDetailedNotes,
        b.hasMindMap ? t.hasMindMap : '',
        b.referenceLink ? `${t.referenceLink}: ${b.referenceLink}` : '',
        b.pdfPath ? `PDF: ${b.pdfPath}` : ''
      ].filter(Boolean).join(' | ');

      const relKeys: string[] = [`book:${b.title.toLowerCase().trim()}`, 'type:book'];
      if (b.category) relKeys.push(`category:${b.category.toLowerCase().trim()}`);
      if (b.tags && Array.isArray(b.tags)) {
        b.tags.forEach(t => relKeys.push(`tag:${t.toLowerCase().trim()}`));
      }

      entities.push({
        id: `book_${b.id}`,
        sourceType: 'book',
        memoryCategory: 'document',
        dateStr,
        timestamp,
        title: `${t.bookTitle}: "${b.title}"`,
        content: bookText,
        tags: b.tags || ['book', 'reading', b.category || 'culture'],
        moods: [],
        metrics: { rating: b.rating, hasMindMap: b.hasMindMap },
        relationshipKeys: relKeys,
        sourceLabelAr: `${t.bookTitle}: "${b.title}"`,
        sourceLabelEn: `${t.bookTitle}: "${b.title}"`,
        rawRef: b
      });
    }
  }

  // 5. Process Athkar & Dhikr Context
  if (options.athkarContext) {
    const stats = options.athkarContext.dailyStats || {};
    const active = options.athkarContext.activeDhikrDetail || {};
    const todayStr = new Date().toISOString().split('T')[0];

    const dhikrSummary = [
      `${t.dhikrTodayTotal}: ${stats.todayTotal || 0} ${t.outOfTarget} ${stats.targetGoal || 300} (${stats.completionRatePercentage || 0}%)`,
      `${t.dailyStreak}: ${stats.streakDays || 1} ${t.daysConsecutive}`,
      `${t.completedCategories}: [${(stats.completedCategories || []).join(', ') || t.none}]`,
      `${t.lastDhikrRead}: "${active.lastDhikrRead || ''}" (${active.category || t.general})`,
      options.athkarContext.psychologicalSpiritualStatus ? `${t.spiritualStatus}: ${options.athkarContext.psychologicalSpiritualStatus}` : ''
    ].filter(Boolean).join(' | ');

    entities.push({
      id: `athkar_today`,
      sourceType: 'athkar_dhikr',
      memoryCategory: 'semantic',
      dateStr: todayStr,
      timestamp: Date.now(),
      title: t.dhikrLogTitle,
      content: dhikrSummary,
      tags: ['athkar', 'dhikr', 'spirituality', 'peace'],
      moods: ['calm', 'spiritual', 'peaceful'],
      metrics: {
        todayTotal: stats.todayTotal || 0,
        completionRate: stats.completionRatePercentage || 0,
        streakDays: stats.streakDays || 1
      },
      relationshipKeys: [`date:${todayStr}`, 'type:athkar', 'type:spirituality'],
      sourceLabelAr: t.dailyAthkarLog,
      sourceLabelEn: t.dailyAthkarLog,
      rawRef: options.athkarContext
    });
  }

  // 6. Process Standalone Coping Cards
  if (p.cbtExercises !== false && options.customCopingCards && Array.isArray(options.customCopingCards)) {
    options.customCopingCards.forEach((card, idx) => {
      const dateStr = normalizeDateToYMD(card.createdAt || new Date());
      const cardContent = [
        `${t.triggerSituation}: "${card.situation || card.title || t.general}"`,
        `${t.automaticThought}: "${card.thought || ''}"`,
        `${t.copingStrategy}: "${card.copingStatement || card.text || ''}"`,
        card.category ? `${t.category}: ${card.category}` : ''
      ].filter(Boolean).join(' | ');

      entities.push({
        id: `coping_card_${card.id || idx}`,
        sourceType: 'cbt_worksheet',
        memoryCategory: 'semantic',
        dateStr,
        timestamp: parseTimestampSafe(card.createdAt) || Date.now(),
        title: `${t.copingCard} - "${card.situation || t.guidance}"`,
        content: cardContent,
        tags: ['CBT', 'coping card', card.category || 'general'],
        moods: ['calm', 'coping'],
        metrics: {},
        relationshipKeys: [`date:${dateStr}`, 'type:coping_card', 'type:cbt'],
        sourceLabelAr: `${t.cbtCopingCard} - "${card.situation || t.guidance}"`,
        sourceLabelEn: `${t.cbtCopingCard} - "${card.situation || t.guidance}"`,
        rawRef: card
      });
    });
  }

  // 7. Process Pros & Cons Decision Balances
  if (p.prosCons !== false && options.prosConsRecords && Array.isArray(options.prosConsRecords)) {
    options.prosConsRecords.forEach((record, idx) => {
      const dateStr = normalizeDateToYMD(record.createdAt || new Date());
      const prosList = (record.pros || []).map((p: any) => `+ ${p.text} (${t.weight}: ${p.weight})`).join(' , ');
      const consList = (record.cons || []).map((c: any) => `- ${c.text} (${t.weight}: ${c.weight})`).join(' , ');

      const recordContent = [
        `${t.decisionTopic}: "${record.title || t.personalDecision}"`,
        prosList ? `${t.prosAndAdvantages}: [${prosList}]` : '',
        consList ? `${t.consAndConcerns}: [${consList}]` : '',
        record.conclusion ? `${t.conclusionAndSummary}: "${record.conclusion}"` : '',
        record.decisionTaken ? `${t.decisionTaken}: "${record.decisionTaken}"` : ''
      ].filter(Boolean).join(' | ');

      entities.push({
        id: `pros_cons_${record.id || idx}`,
        sourceType: 'pros_cons',
        memoryCategory: 'episodic',
        dateStr,
        timestamp: parseTimestampSafe(record.createdAt) || Date.now(),
        title: `${t.decisionBalance} - "${record.title || t.decision}"`,
        content: recordContent,
        tags: ['decision', 'pros_cons', record.category || 'general'],
        moods: [],
        metrics: { totalScore: record.totalScore },
        relationshipKeys: [`date:${dateStr}`, 'type:pros_cons', 'type:decision'],
        sourceLabelAr: `${t.decisionBalance} (${dateStr}) - "${record.title || t.decision}"`,
        sourceLabelEn: `${t.decisionBalance} (${dateStr}) - "${record.title || t.decision}"`,
        rawRef: record
      });
    });
  }

  return new UnifiedKnowledgeIndex(entities);
}

// ----------------------------------------------------------------------------
// 3. Intent Detection & Multi-Modal Query Analyzer
// ----------------------------------------------------------------------------

export function analyzeQueryIntent(rawQuery: string, appLanguage = 'ar'): QueryIntentAnalysis {
  const cleaned = rawQuery.trim().toLowerCase();

  // Arabic and English stopwords to eliminate noise in search terms
  const stopWords = new Set([
    'ما', 'ماذا', 'هو', 'هي', 'هم', 'هن', 'في', 'من', 'إلى', 'على', 'عن', 'مع', 'هل',
    'كيف', 'لماذا', 'ليه', 'فين', 'امتى', 'متى', 'كام', 'كم', 'اريد', 'أريد', 'عايز',
    'اعرف', 'أعرف', 'قولي', 'قل', 'لي', 'ابحث', 'عن', 'التي', 'الذي', 'الذين', 'اللاتي',
    'تحدثت', 'كتبت', 'قلت', 'سجلت', 'وضعت', 'تطبيق', 'حياة', 'ai', 'يا', 'صديقي',
    'what', 'why', 'how', 'when', 'where', 'who', 'which', 'is', 'are', 'was', 'were',
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'my', 'me', 'i'
  ]);

  const words = cleaned
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  const extractedKeywords = words.filter(w => !stopWords.has(w));

  // Detect Follow-up pronoun questions (referencing prior context)
  const isFollowUpPronounQuery =
    /^(هو|هي|ده|دي|تلك|ذلك|ليه|لماذا|طيب وبعدين|وبعدين|what about|how about|why did that|is it)/i.test(cleaned) ||
    (words.length <= 4 && (cleaned.includes('ده') || cleaned.includes('دي') || cleaned.includes('هو') || cleaned.includes('هي')));

  // Detect Temporal Scope
  let temporalScope: QueryIntentAnalysis['temporalScope'];
  const now = new Date();
  const todayYMD = now.toISOString().split('T')[0];

  // Specific ISO Date Match (e.g. 2026-08-10 or 2026/08/10)
  const isoMatch = cleaned.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    const matchedDate = `${y}-${m}-${d}`;
    temporalScope = {
      type: 'exact_date',
      targetDate: matchedDate,
      labelAr: `يوم ${matchedDate}`
    };
  } else if (cleaned.includes('اليوم') || cleaned.includes('النهارده') || cleaned.includes('today')) {
    temporalScope = {
      type: 'exact_date',
      targetDate: todayYMD,
      labelAr: 'اليوم'
    };
  } else if (cleaned.includes('أمس') || cleaned.includes('امبارح') || cleaned.includes('yesterday')) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    temporalScope = {
      type: 'exact_date',
      targetDate: yesterday,
      labelAr: 'أمس'
    };
  } else if (cleaned.includes('الأسبوع الماضي') || cleaned.includes('الاسبوع اللي فات') || cleaned.includes('last week')) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    temporalScope = {
      type: 'date_range',
      startDate: start,
      endDate: todayYMD,
      labelAr: 'خلال الأسبوع الماضي'
    };
  } else if (cleaned.includes('الشهر الماضي') || cleaned.includes('الشهر اللي فات') || cleaned.includes('من شهر') || cleaned.includes('last month')) {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    temporalScope = {
      type: 'date_range',
      startDate: start,
      endDate: todayYMD,
      labelAr: 'خلال الشهر الماضي'
    };
  } else if (cleaned.includes('أول مرة') || cleaned.includes('البداية') || cleaned.includes('first time')) {
    temporalScope = {
      type: 'first_time',
      labelAr: 'أول تدوينة / بداية التسجيل'
    };
  } else if (cleaned.includes('آخر مرة') || cleaned.includes('مؤخراً') || cleaned.includes('اخر مرة') || cleaned.includes('last time') || cleaned.includes('recently')) {
    temporalScope = {
      type: 'last_time',
      labelAr: 'آخر مرة / أحدث تدوينة'
    };
  }

  // Detect Targeted Sources
  const targetSources: KnowledgeSourceType[] = [];
  if (cleaned.includes('يومي') || cleaned.includes('مذكر') || cleaned.includes('تدوين') || cleaned.includes('diary') || cleaned.includes('journal')) {
    targetSources.push('diary');
  }
  if (cleaned.includes('خاطر') || cleaned.includes('خواطر') || cleaned.includes('thought') || cleaned.includes('reflection')) {
    targetSources.push('thought');
  }
  if (cleaned.includes('عادات') || cleaned.includes('عادة') || cleaned.includes('روتين') || cleaned.includes('habit')) {
    targetSources.push('habit');
  }
  if (cleaned.includes('امتنان') || cleaned.includes('نعم') || cleaned.includes('شاكر') || cleaned.includes('ممتن') || cleaned.includes('الحمد لله') || cleaned.includes('gratitude') || cleaned.includes('thankful')) {
    targetSources.push('gratitude');
  }
  if (cleaned.includes('حكم') || cleaned.includes('حكمة') || cleaned.includes('عبرة') || cleaned.includes('درس') || cleaned.includes('wisdom') || cleaned.includes('lesson')) {
    targetSources.push('wisdom');
  }
  if (cleaned.includes('اقتباس') || cleaned.includes('مقتبس') || cleaned.includes('مقولة') || cleaned.includes('quote') || cleaned.includes('saying')) {
    targetSources.push('quote');
  }
  if (cleaned.includes('فكر') || cleaned.includes('أفكار') || cleaned.includes('افكار') || cleaned.includes('فكرة') || cleaned.includes('ابتكار') || cleaned.includes('idea') || cleaned.includes('brainstorm')) {
    targetSources.push('idea');
  }
  if (cleaned.includes('هدف') || cleaned.includes('أهداف') || cleaned.includes('اهداف') || cleaned.includes('خطة') || cleaned.includes('إنجاز') || cleaned.includes('goal') || cleaned.includes('target') || cleaned.includes('milestone')) {
    targetSources.push('goal');
  }
  if (cleaned.includes('كتاب') || cleaned.includes('كتب') || cleaned.includes('مكتب') || cleaned.includes('قراء') || cleaned.includes('book') || cleaned.includes('reading')) {
    targetSources.push('book');
  }
  if (cleaned.includes('تسجيل') || cleaned.includes('صوت') || cleaned.includes('قلت ايه') || cleaned.includes('audio') || cleaned.includes('recording') || cleaned.includes('voice')) {
    targetSources.push('audio_recording');
  }
  if (cleaned.includes('صورة') || cleaned.includes('صور') || cleaned.includes('photo') || cleaned.includes('image') || cleaned.includes('picture')) {
    targetSources.push('image_attachment');
  }
  if (cleaned.includes('رسم') || cleaned.includes('رسومات') || cleaned.includes('لوح') || cleaned.includes('drawing') || cleaned.includes('canvas')) {
    targetSources.push('drawing');
  }
  if (cleaned.includes('pdf') || cleaned.includes('ملف') || cleaned.includes('مستند') || cleaned.includes('document')) {
    targetSources.push('pdf_document');
  }
  if (cleaned.includes('cbt') || cleaned.includes('تفكير سلبي') || cleaned.includes('تشوه') || cleaned.includes('معرفي')) {
    targetSources.push('cbt_worksheet');
  }
  if (cleaned.includes('ذكر') || cleaned.includes('أذكار') || cleaned.includes('تسبيح') || cleaned.includes('سبحة') || cleaned.includes('dhikr')) {
    targetSources.push('athkar_dhikr');
  }
  if (cleaned.includes('قرار') || cleaned.includes('ميزان') || cleaned.includes('إيجابيات وسلبيات') || cleaned.includes('pros') || cleaned.includes('cons')) {
    targetSources.push('pros_cons');
  }

  // Modality Requirements
  const requiresMultimodalVisual = targetSources.includes('image_attachment') || targetSources.includes('drawing') || cleaned.includes('الصورة') || cleaned.includes('الرسمة') || cleaned.includes('photo');
  const requiresMultimodalAudio = targetSources.includes('audio_recording') || cleaned.includes('التسجيل') || cleaned.includes('الصوت') || cleaned.includes('voice');
  const requiresMultimodalPDF = targetSources.includes('pdf_document') || cleaned.includes('pdf') || cleaned.includes('الملف');

  // Detect Emotions
  const detectedEmotions: string[] = [];
  const emotionMap: Record<string, string[]> = {
    anxiety: ['قلق', 'توتر', 'خوف', 'ضغط', 'مرعوب', 'anxious', 'stress', 'worried'],
    sadness: ['حزن', 'كآبة', 'إحباط', 'زعل', 'مكتئب', 'sad', 'depressed', 'frustrated'],
    joy: ['سعادة', 'فرح', 'مبسوط', 'إنجاز', 'حماس', 'happy', 'excited', 'joy'],
    anger: ['غضب', 'نرفزة', 'عصبية', 'متضايق', 'angry', 'irritated'],
    calm: ['هدوء', 'سكينة', 'راحة', 'طمأنينة', 'calm', 'peaceful']
  };

  for (const [emotion, wordsList] of Object.entries(emotionMap)) {
    if (wordsList.some(w => cleaned.includes(w))) {
      detectedEmotions.push(emotion);
    }
  }

  // Classify High-Level Intent Category
  const hasAppKeywords =
    targetSources.length > 0 ||
    temporalScope !== undefined ||
    cleaned.includes('يومياتي') ||
    cleaned.includes('مذكراتي') ||
    cleaned.includes('عاداتي') ||
    cleaned.includes('كتبي') ||
    cleaned.includes('تسجيلاتي') ||
    cleaned.includes('صوري') ||
    cleaned.includes('رسمي') ||
    cleaned.includes('أنا') ||
    cleaned.includes('مزاجي') ||
    cleaned.includes('نومي') ||
    cleaned.includes('نفسيتي') ||
    cleaned.includes('هدفي') ||
    cleaned.includes('انطباعك عني') ||
    cleaned.includes('عرفني بنفسي') ||
    cleaned.includes('من أنا') ||
    cleaned.includes('مين أنا');

  const hasComparisonWords =
    cleaned.includes('قارن') ||
    cleaned.includes('مقارنة') ||
    cleaned.includes('الفرق بين') ||
    cleaned.includes('compare') ||
    cleaned.includes('difference between');

  let intentCategory: QueryIntentAnalysis['intentCategory'] = 'GENERAL_EXTERNAL';

  if (hasAppKeywords && hasComparisonWords) {
    intentCategory = 'HYBRID_COMPARISON';
  } else if (hasAppKeywords && (cleaned.includes('ليه') || cleaned.includes('لماذا') || cleaned.includes('علاقة') || cleaned.includes('تأثير') || cleaned.includes('ربط'))) {
    intentCategory = 'CROSS_SOURCE_RELATION';
  } else if (requiresMultimodalVisual || requiresMultimodalAudio || requiresMultimodalPDF) {
    intentCategory = 'MEDIA_INQUIRY';
  } else if (temporalScope !== undefined && hasAppKeywords) {
    intentCategory = 'TEMPORAL_QUERY';
  } else if (hasAppKeywords || isFollowUpPronounQuery) {
    intentCategory = 'PERSONAL_DATA';
  } else {
    intentCategory = 'GENERAL_EXTERNAL';
  }

  return {
    rawQuery,
    cleanedQuery: cleaned,
    intentCategory,
    targetSources,
    temporalScope,
    extractedKeywords,
    detectedEmotions,
    requiresMultimodalVisual,
    requiresMultimodalAudio,
    requiresMultimodalPDF,
    isFollowUpPronounQuery
  };
}

// ----------------------------------------------------------------------------
// 4. Multi-Vector Relevance, Temporal & Relationship Retrieval Engine
// ----------------------------------------------------------------------------

export interface RetrievalOptions {
  maxEntities?: number;
  minScoreThreshold?: number;
  requireMediaBlobs?: boolean;
  appLanguage?: string;
}

export async function retrieveRelevantKnowledge(
  query: string,
  index: UnifiedKnowledgeIndex,
  options: RetrievalOptions = {}
): Promise<RetrievedKnowledgeContext> {
  const maxEntities = options.maxEntities || 12;
  const intent = analyzeQueryIntent(query);
  const allEntities = index.getAllEntities();
  const t = getTranslation(options.appLanguage || 'ar');

  if (allEntities.length === 0) {
    return {
      matchedEntities: [],
      crossSourceCorrelations: [],
      formattedContextText: t.noDataLoggedInAppYet,
      multimodalParts: [],
      sourceCitations: [],
      confidenceScore: 0
    };
  }

  // Token matching counts
  const tokenMatchMap = index.searchEntitiesByTokens(intent.extractedKeywords);

  // Score every entity
  const scoredList: Array<{ entity: UnifiedKnowledgeEntity; score: number }> = [];

  for (const ent of allEntities) {
    let score = 0;

    // 1. Keyword & Token Match Score (0 - 50 pts)
    const tokenHits = tokenMatchMap.get(ent.id) || 0;
    if (intent.extractedKeywords.length > 0) {
      const matchRatio = tokenHits / intent.extractedKeywords.length;
      score += matchRatio * 40;
    }

    // Direct Substring Match Boost
    const fullText = `${ent.title} ${ent.content}`.toLowerCase();
    for (const kw of intent.extractedKeywords) {
      if (fullText.includes(kw)) {
        score += 8;
      }
    }

    // 2. Targeted Source Type Boost (0 - 25 pts)
    if (intent.targetSources.length > 0) {
      if (intent.targetSources.includes(ent.sourceType)) {
        score += 25;
      }
    } else {
      score += 5; // General baseline
    }

    // 3. Temporal Scope Match & Recency Scoring (0 - 35 pts)
    if (intent.temporalScope) {
      if (intent.temporalScope.type === 'exact_date' && intent.temporalScope.targetDate) {
        if (ent.dateStr === intent.temporalScope.targetDate) {
          score += 40; // Exact date match
        }
      } else if (intent.temporalScope.type === 'date_range' && intent.temporalScope.startDate && intent.temporalScope.endDate) {
        if (ent.dateStr >= intent.temporalScope.startDate && ent.dateStr <= intent.temporalScope.endDate) {
          score += 30; // Within target date range
        }
      } else if (intent.temporalScope.type === 'first_time') {
        // Boost earliest entities
        const minTs = Math.min(...allEntities.map(e => e.timestamp).filter(t => t > 0));
        if (Math.abs(ent.timestamp - minTs) < 3 * 24 * 60 * 60 * 1000) {
          score += 35;
        }
      } else if (intent.temporalScope.type === 'last_time') {
        // Boost latest entities
        const maxTs = Math.max(...allEntities.map(e => e.timestamp));
        if (Math.abs(ent.timestamp - maxTs) < 3 * 24 * 60 * 60 * 1000) {
          score += 35;
        }
      }
    } else {
      // Natural gentle recency boost (max 10 pts for recent items within 30 days)
      if (ent.timestamp > 0) {
        const daysAgo = (Date.now() - ent.timestamp) / (24 * 60 * 60 * 1000);
        if (daysAgo <= 7) score += 10;
        else if (daysAgo <= 30) score += 5;
      }
    }

    // 4. Emotional Affinity Match (0 - 15 pts)
    if (intent.detectedEmotions.length > 0) {
      const hasMood = ent.moods.some(m => intent.detectedEmotions.includes(m.toLowerCase()));
      if (hasMood) score += 15;
    }

    // 5. Richness & Metric Bonus
    if (ent.metrics && Object.keys(ent.metrics).length > 0) {
      score += 3;
    }
    if (ent.mediaPayload) {
      score += 4;
    }

    scoredList.push({ entity: ent, score });
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  // Take top K matches
  let topMatches = scoredList
    .filter(item => item.score > (options.minScoreThreshold || 5))
    .slice(0, maxEntities)
    .map(item => item.entity);

  // If no high score matches found but user asked for personal data, provide the most recent representative records
  if (topMatches.length === 0 && (intent.intentCategory === 'PERSONAL_DATA' || intent.intentCategory === 'TEMPORAL_QUERY' || intent.isFollowUpPronounQuery)) {
    topMatches = scoredList.slice(0, 6).map(item => item.entity);
  }

  // --------------------------------------------------------------------------
  // Cross-Source Relationship Discovery & Evidence Correlation
  // --------------------------------------------------------------------------
  const correlations: Array<{ title: string; date: string; evidence: Array<{ source: string; detail: string }> }> = [];

  // Group top matching entities by date to discover cross-source synchronicity
  const dateGroups = new Map<string, UnifiedKnowledgeEntity[]>();
  for (const ent of topMatches) {
    if (ent.dateStr && ent.dateStr !== 'unknown') {
      const arr = dateGroups.get(ent.dateStr) || [];
      arr.push(ent);
      dateGroups.set(ent.dateStr, arr);
    }
  }

  for (const [date, ents] of dateGroups.entries()) {
    if (ents.length >= 2) {
      // Find multi-source correlations on the same date (e.g. Diary + Habit + Audio)
      const evidence = ents.map(e => ({
        source: options.appLanguage === 'ar' ? e.sourceLabelAr : e.sourceLabelEn,
        detail: e.content.substring(0, 150)
      }));

      correlations.push({
        title: `${t.dataCorrelation} ${date}`,
        date,
        evidence
      });
    }
  }

  // --------------------------------------------------------------------------
  // Multimodal Media Loader (Loads drawings, images, audio from IndexedDB)
  // --------------------------------------------------------------------------
  const multimodalParts: Array<{ mimeType: string; data?: string; fileUri?: string; description?: string }> = [];

  if (options.requireMediaBlobs !== false) {
    for (const ent of topMatches) {
      if (ent.mediaPayload) {
        // 1. Direct Base64 dataUrl (Drawings, small images)
        if (ent.mediaPayload.dataUrl && ent.mediaPayload.dataUrl.startsWith('data:')) {
          const parts = ent.mediaPayload.dataUrl.split(';base64,');
          if (parts.length === 2) {
            const mime = ent.mediaPayload.mimeType || parts[0].replace('data:', '') || 'image/png';
            multimodalParts.push({
              mimeType: mime,
              data: parts[1],
              description: `[${t.visualAttachment} - ${options.appLanguage === 'ar' ? ent.sourceLabelAr : ent.sourceLabelEn}]`
            });
          }
        }
        // 2. Gemini File URI
        else if (ent.mediaPayload.fileUri) {
          multimodalParts.push({
            mimeType: ent.mediaPayload.mimeType || 'application/octet-stream',
            fileUri: ent.mediaPayload.fileUri,
            description: `[${t.fileApiAttachment} - ${options.appLanguage === 'ar' ? ent.sourceLabelAr : ent.sourceLabelEn}]`
          });
        }
        // 3. Blob in IndexedDB
        else if (ent.mediaPayload.attachmentId) {
            try {
              const blob = await getAttachmentBlob(ent.mediaPayload.attachmentId);
              // Increased inline payload limit to 19MB for Gemini limits
              if (blob && blob.size <= 19 * 1024 * 1024) {
 // Safe inline threshold
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const res = (reader.result as string) || '';
                  resolve(res.split(';base64,')[1] || '');
                };
                reader.readAsDataURL(blob);
              });

              if (base64) {
                multimodalParts.push({
                  mimeType: blob.type || ent.mediaPayload.mimeType || 'image/jpeg',
                  data: base64,
                  description: `[${t.localMemoryFile}: ${ent.title}]`
                });
              }
            }
          } catch (blobErr) {
            console.warn('[unifiedKnowledge] Failed to load media blob:', blobErr);
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Formatted Grounded Context String Assembly
  // --------------------------------------------------------------------------
  let formattedText = '';

  if (topMatches.length > 0) {
    const isAr = (options.appLanguage || 'ar') === 'ar';
    formattedText += `### 📂 ${t.verifiedRecordsRetrieved} (${topMatches.length} ${t.sources}):\n\n`;

    topMatches.forEach((ent, index) => {
      const srcLbl = isAr ? ent.sourceLabelAr : ent.sourceLabelEn;
      formattedText += `#### [${t.source} ${index + 1}] — ${srcLbl}\n`;
      formattedText += `- **${t.typeAndCategory}:** ${ent.sourceType} | ${t.group}: ${ent.memoryCategory}\n`;
      formattedText += `- **${t.date}:** ${ent.dateStr}\n`;
      if (ent.moods.length > 0) formattedText += `- **${t.moods}:** [${ent.moods.join(' , ')}]\n`;
      if (ent.tags.length > 0) formattedText += `- **${t.tags}:** [${ent.tags.join(' , ')}]\n`;
      if (ent.metrics && Object.keys(ent.metrics).length > 0) {
        const metricStr = Object.entries(ent.metrics).map(([k, v]) => `${k}: ${v}`).join(' | ');
        formattedText += `- **${t.metrics}:** ${metricStr}\n`;
      }
      formattedText += `- **${t.content}:**\n> ${ent.content.replace(/\n/g, '\n> ')}\n\n`;
    });

    if (correlations.length > 0) {
      formattedText += `### 🔗 ${t.discoveredCorrelations}:\n`;
      correlations.forEach((corr, idx) => {
        formattedText += `**${idx + 1}. ${corr.title}**\n`;
        corr.evidence.forEach(ev => {
          formattedText += `  * *(${ev.source}):* ${ev.detail}\n`;
        });
        formattedText += `\n`;
      });
    }
  } else {
    formattedText = t.noPersonalRecordsMatched;
  }

  const citations = topMatches.map(e => ({
    id: e.id,
    type: e.sourceType,
    label: (options.appLanguage === 'ar') ? e.sourceLabelAr : e.sourceLabelEn,
    date: e.dateStr
  }));

  const maxScore = scoredList[0]?.score || 0;
  const confidenceScore = Math.min(Math.round((maxScore / 50) * 100), 100);

  return {
    matchedEntities: topMatches,
    crossSourceCorrelations: correlations,
    formattedContextText: formattedText,
    multimodalParts,
    sourceCitations: citations,
    confidenceScore
  };
}

// ----------------------------------------------------------------------------
// 5. Anti-Hallucination Grounding Prompt Directives
// ----------------------------------------------------------------------------

export function getGroundedSystemDirectives(appLanguage = 'ar'): string {
  const isAr = appLanguage === 'ar';
  if (isAr) {
    return `
تعليمات صارمة للدقة والمصداقية ومنع الهلوسة (Strict Grounding & Anti-Hallucination):
1. الذاكرة الفولاذية والمصداقية المطلقة: عند الإجابة عن أي سؤال يخص بيانات المستخدم وتدويناته وعاداته وصحته النفسية، استند حصراً وبدقة تامة على البيانات المسترجعة أعلاه.
2. منع اختلاق البيانات: إياك أن تخترع تواريخ، أو أحداثاً، أو أرقاماً، أو مشاعر، أو نصوص تسجيلات لم تُذكر في البيانات المتاحة.
3. الإقرار الصريح بعدم الوجود: إذا سأل المستخدم عن أمر شخصي داخل التطبيق ولم تجده في البيانات المسترجعة، قل بوضوح ولطف: "بحثت في سجلاتك المتاحة ولم أجد إشارة إلى ذلك"، ثم قدم إجابة عامة أو مساعدة مفيدة إن كان السؤال يحتمل ذلك.
4. ذكر المصادر بدقة (Source Attribution): عند استخلاص معلومة، وضح مصدرها وتاريخها (مثلاً: "وفقاً ليومياتك في 12 أغسطس" أو "بناءً على عادة النوم المسجلة" أو "كما ذكرت في التسجيل الصوتي").
5. حل التعارضات بشفافية: إذا وجد تعارض بين مصدرين (مثل يومية تقول أن النوم كان سيئاً بينما عادة النوم سجلت اكتمالها)، اعرض التعارض للمستخدم بذكاء دون افتراض غير مؤكد.
6. التكامل الموسوعي العام: إذا كان السؤال عاماً بالكامل (تاريخ، علوم، برمجة، استشارة عامة) ولا يطلب بيانات المستخدم الشخصية، أجب بعبقرية وموسوعية دون تقييد نفسك بالتطبيق ودون أن تقول "لم أجد في سجلاتك".
7. دقة التحليل والربط: اربط بحكمة بين الأسباب والنتائج (مثل ربط التوتر بقلة النوم أو ضغط العمل) عندما تدعم الأدلة ذلك.
`.trim();
  }

  return `
Strict Grounding & Anti-Hallucination Directives:
1. Grounded Accuracy: When answering questions about user's personal records, diaries, habits, and wellness, rely strictly on the provided verified records.
2. Zero Fabrication: Never invent dates, emotions, habit counts, or audio contents that are not explicitly in the retrieved data.
3. Transparent Absence: If personal data is requested but not found in records, explicitly state that it was not found, then provide helpful general insights if appropriate.
4. Clear Source Attribution: Cite specific records and dates (e.g. "[Source: Diary of Aug 10]" or "[Source: Sleep Habit Log]").
5. Dual Personality: If the user asks a general knowledge/science/coding question, answer comprehensively with full AI intelligence without complaining about missing personal data.
`.trim();
}
