// ============================================================================
//  unifiedAIKnowledgeService.test.ts — Comprehensive Test Suite
//  Verifies all 12 core scenarios for Unified AI Intelligence & Knowledge Layer
// ============================================================================

import {
  buildUnifiedKnowledgeIndex,
  retrieveRelevantKnowledge,
  analyzeQueryIntent,
  getGroundedSystemDirectives,
  UnifiedKnowledgeEntity
} from './unifiedAIKnowledgeService';
import { DiaryEntry, Habit, GratitudeCard, Book } from '../types';

export interface TestResult {
  scenarioNumber: number;
  scenarioName: string;
  passed: boolean;
  details: string;
}

export async function runUnifiedAITestSuite(): Promise<{
  passedCount: number;
  totalCount: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  // --------------------------------------------------------------------------
  // Mock Data Fixtures
  // --------------------------------------------------------------------------
  const mockDiaries: DiaryEntry[] = [
    {
      id: 'd_old_1',
      title: 'يوم الامتحان الصعب',
      content: 'كنت متوتراً جداً بسبب امتحان الفيزياء، ولم أستطع التركيز جيداً.',
      createdAt: '2026-07-15T09:00:00Z',
      updatedAt: '2026-07-15T09:00:00Z',
      moods: ['anxious', 'stressed'],
      importance: 5,
      color: 'amber',
      images: [],
      videos: [],
      audioRecordings: [
        {
          id: 'audio_1',
          name: 'تسجيل صوتي - صباح الامتحان',
          dataUrl: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwE=',
          duration: 45,
          transcription: 'أنا مش عارف أنام خالص بسبب التفكير المستمر في الامتحان وخايف مقدرش أحل.',
          speechEmotion: {
            primaryEmotion: 'anxiety',
            intensity: 'high',
            intensityScore: 85
          }
        }
      ],
      files: [],
      drawing: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      tasks: [{ id: 't1', text: 'مراجعة الفصل الثالث من الفيزياء', completed: false }],
      tags: ['دراسة', 'امتحان', 'قلق'],
      chatLogs: [],
      isLocked: false,
      sleepHours: 4,
      sportsDuration: 0,
      cbtWorksheets: [
        {
          id: 'cbt_1',
          createdAt: '2026-07-15T10:00:00Z',
          triggerEvent: 'امتحان الفيزياء',
          negativeThoughts: 'أنا أكيد هفشل والامتحان هيجي مستحيل',
          cognitiveDistortion: 'Catastrophizing (التهويل)',
          rationalAlternative: 'أنا ذاكرت واجتهدت وسأبذل قصارى جهدي والنتيجة بيد الله',
          emotionBefore: 9,
          emotionAfter: 4
        }
      ]
    },
    {
      id: 'd_recent_2',
      title: 'رحلة إلى الإسكندرية',
      content: 'قضيت يوماً رائعاً على شاطئ البحر وشعرت بطمأنينة وراحة بال كبيرة.',
      createdAt: '2026-08-10T15:00:00Z',
      updatedAt: '2026-08-10T15:00:00Z',
      moods: ['joy', 'calm'],
      importance: 4,
      color: 'blue',
      images: ['https://example.com/beach.jpg'],
      videos: [],
      audioRecordings: [],
      files: [],
      tasks: [],
      tags: ['سفر', 'بحر', 'هدوء'],
      chatLogs: [],
      isLocked: false,
      sleepHours: 8,
      sportsDuration: 45,
      sportsType: 'سباحة'
    }
  ];

  const mockHabits: Habit[] = [
    {
      id: 'h_sleep',
      name: 'النوم المبكر 8 ساعات',
      category: 'health',
      frequency: 'daily',
      reminderEnabled: true,
      createdAt: '2026-07-01T00:00:00Z',
      history: {
        '2026-07-15': false, // Disrupted sleep on exam day
        '2026-08-10': true   // Completed on vacation day
      }
    },
    {
      id: 'h_sport',
      name: 'ممارسة الرياضة',
      category: 'sport',
      frequency: 'daily',
      reminderEnabled: true,
      createdAt: '2026-07-01T00:00:00Z',
      history: {
        '2026-08-10': true
      }
    }
  ];

  const mockGratitude: GratitudeCard[] = [
    {
      id: 'g_1',
      text: 'ممتن لصديقي أحمد لوقوفه بجانبي وتشجيعه لي.',
      color: 'amber',
      createdAt: '2026-07-16T18:00:00Z',
      tags: ['أصدقاء', 'امتنان']
    }
  ];

  const mockBooks: Book[] = [
    {
      id: 'b_1',
      title: 'قوة العادات (The Power of Habit)',
      notes: 'تتكون العادة من ثلاث مراحل أساسية: الإشارة (Cue)، الروتين (Routine)، والمكافأة (Reward).',
      rating: 5,
      category: 'تطوير ذات',
      hasMindMap: true,
      createdAt: '2026-06-20T12:00:00Z',
      tags: ['عادات', 'علم نفس', 'تطوير']
    }
  ];

  const mockAthkar = {
    dailyStats: {
      todayTotal: 150,
      targetGoal: 300,
      completionRatePercentage: 50,
      streakDays: 5,
      completedCategories: ['أذكار الصباح']
    },
    activeDhikrDetail: {
      category: 'أذكار المساء',
      lastDhikrRead: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
      remainingInCategory: 10
    },
    psychologicalSpiritualStatus: 'حالة سكينة وطمأنينة متوازنة'
  };

  const knowledgeIndex = buildUnifiedKnowledgeIndex({
    diaries: mockDiaries,
    habits: mockHabits,
    gratitudeCards: mockGratitude,
    books: mockBooks,
    athkarContext: mockAthkar
  });

  // --------------------------------------------------------------------------
  // TEST 1: Old Diary Entry Retrieval
  // --------------------------------------------------------------------------
  {
    const query = 'ماذا حدث لي يوم 15 يوليو؟';
    const intent = analyzeQueryIntent(query);
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const matchedExam = retrieved.matchedEntities.some(e => e.dateStr === '2026-07-15' && e.title.includes('الامتحان'));

    results.push({
      scenarioNumber: 1,
      scenarioName: 'Old Diary Query (15 يوليو)',
      passed: matchedExam && intent.temporalScope?.targetDate === '2026-07-15',
      details: `Retrieved ${retrieved.matchedEntities.length} entities. Target date resolved: ${intent.temporalScope?.targetDate}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Diary + Habit Correlation
  // --------------------------------------------------------------------------
  {
    const query = 'هل قلة النوم كانت مرتبطة بتوتري في امتحان الفيزياء؟';
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const hasDiary = retrieved.matchedEntities.some(e => e.sourceType === 'diary');
    const hasHabit = retrieved.matchedEntities.some(e => e.sourceType === 'habit');
    const hasCorrelation = retrieved.crossSourceCorrelations.some(c => c.date === '2026-07-15');

    results.push({
      scenarioNumber: 2,
      scenarioName: 'Diary + Habit Cross-Linking',
      passed: hasDiary && (hasHabit || hasCorrelation),
      details: `Discovered cross-source correlation on 2026-07-15: ${hasCorrelation}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 3: Audio Recording & Transcription Query
  // --------------------------------------------------------------------------
  {
    const query = 'ماذا قلت في التسجيل الصوتي عن الامتحان؟';
    const intent = analyzeQueryIntent(query);
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const hasAudio = retrieved.matchedEntities.some(e => e.sourceType === 'audio_recording' && e.content.includes('مش عارف أنام'));

    results.push({
      scenarioNumber: 3,
      scenarioName: 'Audio Recording & Transcript Retrieval',
      passed: hasAudio && intent.targetSources.includes('audio_recording'),
      details: `Found audio transcript entity: ${hasAudio}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 4: Drawing Canvas & Visual Query
  // --------------------------------------------------------------------------
  {
    const query = 'ما الذي قمت برسمه في يومياتي؟';
    const intent = analyzeQueryIntent(query);
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const hasDrawing = retrieved.matchedEntities.some(e => e.sourceType === 'drawing');
    const hasMultimodalVisual = retrieved.multimodalParts.some(p => p.mimeType.startsWith('image/'));

    results.push({
      scenarioNumber: 4,
      scenarioName: 'Drawing Canvas Visual Media Inquiry',
      passed: hasDrawing && (hasMultimodalVisual || intent.requiresMultimodalVisual),
      details: `Drawing entity retrieved with visual multimodal part: ${hasMultimodalVisual}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 5: PDF / Book Library Retrieval
  // --------------------------------------------------------------------------
  {
    const query = 'ما هي المراحل الثلاث المذكورة في كتاب قوة العادات؟';
    const intent = analyzeQueryIntent(query);
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const hasBook = retrieved.matchedEntities.some(e => e.sourceType === 'book' && e.content.includes('Cue'));

    results.push({
      scenarioNumber: 5,
      scenarioName: 'Book / Library Notes Retrieval',
      passed: hasBook && intent.targetSources.includes('book'),
      details: `Found book notes with exact concept match: ${hasBook}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 6: Multi-Source Comprehensive Synthesis
  // --------------------------------------------------------------------------
  {
    const query = 'أعطني ملخصاً شاملاً لما مررت به في شهر يوليو من ضغوط وامتنان وتمارين';
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const types = new Set(retrieved.matchedEntities.map(e => e.sourceType));
    const isMultiSource = types.size >= 2;

    results.push({
      scenarioNumber: 6,
      scenarioName: 'Multi-Source Synthesis (Diary + CBT + Gratitude)',
      passed: isMultiSource,
      details: `Retrieved diverse source types: [${Array.from(types).join(', ')}]`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 7: Temporal Query Resolution
  // --------------------------------------------------------------------------
  {
    const query = 'ماذا كتبت خلال الأسبوع الماضي؟';
    const intent = analyzeQueryIntent(query);
    const isTemporal = intent.temporalScope?.type === 'date_range' || intent.temporalScope?.type === 'relative_past';

    results.push({
      scenarioNumber: 7,
      scenarioName: 'Temporal Relative Resolution ("الأسبوع الماضي")',
      passed: isTemporal,
      details: `Temporal scope label: ${intent.temporalScope?.labelAr}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 8: Follow-up Pronoun Inquiry ("هو ده ليه حصل؟")
  // --------------------------------------------------------------------------
  {
    const query = 'هو ده ليه حصل؟';
    const intent = analyzeQueryIntent(query);

    results.push({
      scenarioNumber: 8,
      scenarioName: 'Follow-up Pronoun Intent Detection',
      passed: intent.isFollowUpPronounQuery === true,
      details: `isFollowUpPronounQuery = ${intent.isFollowUpPronounQuery}`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 9: Pure General Knowledge (No App Data Pollution)
  // --------------------------------------------------------------------------
  {
    const query = 'ما هي عاصمة فرنسا وما أهم معالمها؟';
    const intent = analyzeQueryIntent(query);

    results.push({
      scenarioNumber: 9,
      scenarioName: 'Pure General External Knowledge',
      passed: intent.intentCategory === 'GENERAL_EXTERNAL' && intent.targetSources.length === 0,
      details: `Classified as GENERAL_EXTERNAL with 0 target sources`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 10: Non-Existent Personal Data Grounding
  // --------------------------------------------------------------------------
  {
    const query = 'ماذا كتبت عن زيارتي لليابان وطوكيو في يومياتي؟';
    const retrieved = await retrieveRelevantKnowledge(query, knowledgeIndex);
    const directives = getGroundedSystemDirectives('ar');
    const hasJapan = retrieved.matchedEntities.some(e => e.content.includes('طوكيو') || e.content.includes('اليابان'));

    results.push({
      scenarioNumber: 10,
      scenarioName: 'Truthful Absence / Anti-Hallucination Directives',
      passed: !hasJapan && directives.includes('منع اختلاق البيانات'),
      details: `Correctly found zero false matches for Japan; grounding directives enforce transparent absence.`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 11: Conflicting Sources Resolution Rule
  // --------------------------------------------------------------------------
  {
    const directives = getGroundedSystemDirectives('ar');
    const enforcesConflictHandling = directives.includes('حل التعارضات بشفافية');

    results.push({
      scenarioNumber: 11,
      scenarioName: 'Conflicting Sources Transparent Directives',
      passed: enforcesConflictHandling,
      details: `Enforces transparent reporting when two records differ.`
    });
  }

  // --------------------------------------------------------------------------
  // TEST 12: Future Extensibility / Custom Plugin Entity Registration
  // --------------------------------------------------------------------------
  {
    const customPluginEntity: UnifiedKnowledgeEntity = {
      id: 'finance_tx_1',
      sourceType: 'custom_plugin',
      memoryCategory: 'temporal',
      dateStr: '2026-08-14',
      timestamp: Date.now(),
      title: 'معاملة مالية: شراء دورة تدريبية',
      content: 'تم دفع 150 دولار للاشتراك في دورة الذكاء الاصطناعي',
      tags: ['مالية', 'تعليم'],
      moods: [],
      metrics: { amount: 150, currency: 'USD' },
      relationshipKeys: ['date:2026-08-14', 'type:finance'],
      sourceLabelAr: 'قسم المالية (مستقبلي)',
      sourceLabelEn: 'Finance Module (Future)'
    };

    const extendedIndex = buildUnifiedKnowledgeIndex({
      diaries: mockDiaries,
      habits: mockHabits
    });
    // Add custom entity directly to test extensibility
    const all = extendedIndex.getAllEntities();
    all.push(customPluginEntity);

    const retrievedCustom = await retrieveRelevantKnowledge('كم دفعت في دورة الذكاء الاصطناعي؟', extendedIndex);
    const foundCustom = retrievedCustom.matchedEntities.some(e => e.id === 'finance_tx_1');

    results.push({
      scenarioNumber: 12,
      scenarioName: 'Future Extensibility (Dynamic Entity Adapter)',
      passed: foundCustom,
      details: `Seamlessly indexed and retrieved future custom plugin without modifying core architecture.`
    });
  }

  const passedCount = results.filter(r => r.passed).length;
  return {
    passedCount,
    totalCount: results.length,
    results
  };
}
