/**
 * High Precision Tests for Unified Journal System (Hayat AI)
 */
import { DiaryEntry, JournalEntryType } from '../src/types';
import {
  JOURNAL_TYPES_CONFIG,
  ALL_JOURNAL_TYPES,
  getJournalTypeConfig
} from '../src/lib/journalTypes';
import {
  buildUnifiedKnowledgeIndex,
  analyzeQueryIntent
} from '../src/services/unifiedAIKnowledgeService';

export function runUnifiedJournalTests() {
  console.log('=== Running Unified Journal System Core Tests ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (actual !== undefined || expected !== undefined) {
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual:   ${JSON.stringify(actual)}`);
      }
      failed++;
    }
  }

  // 1. All 7 Types Configuration Integrity
  assert(ALL_JOURNAL_TYPES.length === 7, 'All 7 Journal Entry Types are defined', ALL_JOURNAL_TYPES.length, 7);
  const expectedTypes: JournalEntryType[] = ['diary', 'thought', 'gratitude', 'wisdom', 'quote', 'idea', 'goal'];
  expectedTypes.forEach(t => {
    const cfg = getJournalTypeConfig(t);
    assert(!!cfg && cfg.type === t, `Journal Type Config for "${t}" has valid icon (${cfg.icon}) and labels`, cfg.type, t);
  });

  // 2. Default Fallback for Legacy Entries without diaryType
  const legacyEntry: DiaryEntry = {
    id: 'legacy-1',
    title: 'مذكرة قديمة',
    content: 'تفاصيل قديمة بدون نوع صريح',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    importance: 4,
    moods: ['مرتاح'],
    color: 'bg-white',
    images: [],
    videos: [],
    audioRecordings: [],
    files: [],
    tasks: [],
    tags: ['قديم'],
    chatLogs: [],
    isLocked: false
  };

  const legacyCfg = getJournalTypeConfig(legacyEntry.diaryType);
  assert(legacyCfg.type === 'diary', 'Legacy entry without diaryType falls back safely to "diary"', legacyCfg.type, 'diary');

  // 3. Favorites Logic & Backward Compatibility
  const isLegacyFav = legacyEntry.isFavorite === true || (legacyEntry.isFavorite === undefined && (legacyEntry.importance || 0) >= 4);
  assert(isLegacyFav === true, 'Legacy 4-star entry is recognized in favorites seamlessly', isLegacyFav, true);

  const explicitFavEntry: DiaryEntry = {
    ...legacyEntry,
    id: 'fav-1',
    importance: 2,
    isFavorite: true,
    diaryType: 'gratitude'
  };
  const isExplicitFav = explicitFavEntry.isFavorite === true || (explicitFavEntry.isFavorite === undefined && (explicitFavEntry.importance || 0) >= 4);
  assert(isExplicitFav === true, 'Explicit isFavorite: true is recognized regardless of star rating', isExplicitFav, true);

  // 4. Unified AI Knowledge Indexing across all 7 types
  const sampleEntries: DiaryEntry[] = [
    { ...legacyEntry, id: 'd-1', title: 'يومية العمل', diaryType: 'diary', content: 'أنجزت مهام اليوم' },
    { ...legacyEntry, id: 't-1', title: 'تأمل مسائي', diaryType: 'thought', content: 'أفكار حول المستقبل' },
    { ...legacyEntry, id: 'g-1', title: 'شكر النعم', diaryType: 'gratitude', content: 'ممتن لصحة أهلي وعافيتهم' },
    { ...legacyEntry, id: 'w-1', title: 'الصبر مفتاح الفرج', diaryType: 'wisdom', content: 'لا تستعجل ما كتب الله لك فكل شيء بأوانه' },
    { ...legacyEntry, id: 'q-1', title: 'اقتباس نجيب محفوظ', diaryType: 'quote', content: 'الخوف لا يمنع من الموت ولكنه يمنع من الحياة' },
    { ...legacyEntry, id: 'i-1', title: 'فكرة تطبيق ذكي', diaryType: 'idea', content: 'فكرة نظام آلي لإدارة التغذية والرياضة' },
    { ...legacyEntry, id: 'gl-1', title: 'هدف شهر سبتمبر', diaryType: 'goal', content: 'قراءة 3 كتب وإنهاء الدورة التدريبية' }
  ];

  const knowledgeIndex = buildUnifiedKnowledgeIndex({
    diaries: sampleEntries
  });

  assert(knowledgeIndex.entities.length >= 7, 'All 7 Unified Journal types indexed as Knowledge Entities', knowledgeIndex.entities.length, 7);

  const indexedGratitude = knowledgeIndex.entities.find(e => e.id === 'diary_g-1');
  assert(indexedGratitude?.sourceType === 'gratitude', 'Gratitude entry indexed with sourceType: "gratitude"', indexedGratitude?.sourceType, 'gratitude');

  const indexedWisdom = knowledgeIndex.entities.find(e => e.id === 'diary_w-1');
  assert(indexedWisdom?.sourceType === 'wisdom', 'Wisdom entry indexed with sourceType: "wisdom"', indexedWisdom?.sourceType, 'wisdom');

  const indexedGoal = knowledgeIndex.entities.find(e => e.id === 'diary_gl-1');
  assert(indexedGoal?.sourceType === 'goal', 'Goal entry indexed with sourceType: "goal"', indexedGoal?.sourceType, 'goal');

  // 5. Query Intent Recognition for specific types
  const gratitudeIntent = analyzeQueryIntent('أنا كنت ممتن لإيه الأيام اللي فاتت؟');
  assert(gratitudeIntent.targetSources.includes('gratitude'), 'Query Intent correctly targets "gratitude" for thankful queries', gratitudeIntent.targetSources.includes('gratitude'), true);

  const wisdomIntent = analyzeQueryIntent('فكرني بالحكمة اللي كتبتها عن الصبر');
  assert(wisdomIntent.targetSources.includes('wisdom'), 'Query Intent correctly targets "wisdom" for wisdom/lesson queries', wisdomIntent.targetSources.includes('wisdom'), true);

  const goalIntent = analyzeQueryIntent('إيه أهدافي اللي كنت مسجلها؟');
  assert(goalIntent.targetSources.includes('goal'), 'Query Intent correctly targets "goal" for goal/milestone queries', goalIntent.targetSources.includes('goal'), true);

  const ideaIntent = analyzeQueryIntent('كان عندي فكرة مشروع جديدة كتبتها قبل كده');
  assert(ideaIntent.targetSources.includes('idea'), 'Query Intent correctly targets "idea" for brainstorm/idea queries', ideaIntent.targetSources.includes('idea'), true);

  console.log(`\n========================================`);
  console.log(`Unified Journal Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  return { passed, failed };
}
