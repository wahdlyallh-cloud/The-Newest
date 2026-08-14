/**
 * High Precision Tests for Hayat AI Centralized Speech Recognition Engine
 */
import {
  SpeechRecognitionManager,
  reconcileWordOverlap,
  stitchFinalSegment
} from '../lib/speechRecognition';

function createMockEvent(results: Array<{ transcript: string; isFinal: boolean }>) {
  const resultList = results.map(r => {
    const alt = { transcript: r.transcript };
    const res: any = [alt];
    res.isFinal = r.isFinal;
    return res;
  });
  return {
    results: resultList,
    resultIndex: 0
  };
}

function runComprehensiveTests() {
  console.log('=== Running Speech Recognition Core Tests ===\n');
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

  // --- UNIT 1: Word Overlap & Suffix Reconciliation Tests ---
  console.log('--- Sub-suite 1: Word Overlap Reconciliation ---');

  // Test 1.1: Single word overlap
  let delta = reconcileWordOverlap('السلام', 'السلام عليكم');
  assert(delta === 'عليكم', 'Overlap: "السلام" vs "السلام عليكم" -> "عليكم"', delta, 'عليكم');

  // Test 1.2: Multi-word overlap
  delta = reconcileWordOverlap('السلام عليكم', 'السلام عليكم ورحمة الله وبركاته');
  assert(delta === 'ورحمة الله وبركاته', 'Overlap: "السلام عليكم" vs "السلام عليكم ورحمة الله وبركاته"', delta, 'ورحمة الله وبركاته');

  // Test 1.3: Identical / Complete subset
  delta = reconcileWordOverlap('السلام عليكم', 'السلام عليكم');
  assert(delta === '', 'Overlap: Identical text produces empty delta', delta, '');

  // Test 1.4: Disjoint sentences (No overlap)
  delta = reconcileWordOverlap('الجملة الأولى.', 'الجملة الثانية.');
  assert(delta === 'الجملة الثانية.', 'Overlap: Disjoint sentences preserved fully', delta, 'الجملة الثانية.');

  // Test 1.5: Natural repetition preserved inside incoming
  delta = reconcileWordOverlap('', 'نعم نعم أريد ذلك');
  assert(delta === 'نعم نعم أريد ذلك', 'Overlap: Natural repetition preserved', delta, 'نعم نعم أريد ذلك');

  // Test 1.6: English overlap
  delta = reconcileWordOverlap('Hello there', 'Hello there my friend');
  assert(delta === 'my friend', 'Overlap: English words overlap', delta, 'my friend');

  // --- UNIT 2: Stitching Final Segments Tests ---
  console.log('\n--- Sub-suite 2: Stitching Final Segments ---');

  let current = '';
  current = stitchFinalSegment(current, 'السلام');
  assert(current === 'السلام', 'Stitch step 1: "السلام"');

  // Mobile re-emitted whole phrase as final
  current = stitchFinalSegment(current, 'السلام عليكم');
  assert(current === 'السلام عليكم', 'Stitch step 2: "السلام" + "السلام عليكم" -> "السلام عليكم"', current, 'السلام عليكم');

  // Mobile emitted disjoint final
  current = stitchFinalSegment(current, 'ورحمة الله وبركاته');
  assert(current === 'السلام عليكم ورحمة الله وبركاته', 'Stitch step 3: + "ورحمة الله وبركاته"', current, 'السلام عليكم ورحمة الله وبركاته');

  // --- UNIT 3: Mobile Event Stream Simulation ---
  console.log('\n--- Sub-suite 3: Mobile Event Stream Simulation ---');

  const manager = SpeechRecognitionManager.getInstance();

  // Scenario: Mobile stream exactly as described by user
  const s1 = manager.startSession();

  // Event 1: "السلام" (interim)
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'السلام', isFinal: false }
  ]), s1);
  assert(manager.getDisplayTranscript() === 'السلام', 'Stream Event 1: Display is "السلام"');
  assert(manager.getFinalTranscript() === '', 'Stream Event 1: Final is empty');

  // Event 2: "السلام عليكم" (interim)
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'السلام عليكم', isFinal: false }
  ]), s1);
  assert(manager.getDisplayTranscript() === 'السلام عليكم', 'Stream Event 2: Display is "السلام عليكم"');
  assert(manager.getFinalTranscript() === '', 'Stream Event 2: Final is empty');

  // Event 3: "السلام" (final) + "السلام عليكم ورحمة" (interim)
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'السلام', isFinal: true },
    { transcript: 'السلام عليكم ورحمة', isFinal: false }
  ]), s1);
  assert(manager.getFinalTranscript() === 'السلام', 'Stream Event 3: Final has "السلام"');
  assert(manager.getDisplayTranscript() === 'السلام عليكم ورحمة', 'Stream Event 3: Display is "السلام عليكم ورحمة" (NO DUPLICATION)', manager.getDisplayTranscript(), 'السلام عليكم ورحمة');

  // Event 4: "السلام" (final) + "عليكم ورحمة الله وبركاته" (final)
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'السلام', isFinal: true },
    { transcript: 'عليكم ورحمة الله وبركاته', isFinal: true }
  ]), s1);
  assert(manager.getFinalTranscript() === 'السلام عليكم ورحمة الله وبركاته', 'Stream Event 4: Final is "السلام عليكم ورحمة الله وبركاته"', manager.getFinalTranscript(), 'السلام عليكم ورحمة الله وبركاته');

  // Finalize
  const finalized = manager.finalize();
  assert(finalized === 'السلام عليكم ورحمة الله وبركاته', 'Finalize: Result matches perfectly', finalized, 'السلام عليكم ورحمة الله وبركاته');

  // --- UNIT 4: Natural Repetition Test ---
  console.log('\n--- Sub-suite 4: Natural Repetition Test ---');
  const s2 = manager.startSession();
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'نعم نعم أريد ذلك بالتأكيد', isFinal: true }
  ]), s2);
  const repFinal = manager.finalize();
  assert(repFinal === 'نعم نعم أريد ذلك بالتأكيد', 'Natural repetition "نعم نعم أريد ذلك بالتأكيد" preserved', repFinal, 'نعم نعم أريد ذلك بالتأكيد');

  // --- UNIT 5: Session Token & Stale Callbacks ---
  console.log('\n--- Sub-suite 5: Session Tokens & Stale Callbacks ---');
  const oldSession = manager.startSession();
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'جلسة سابقة', isFinal: true }
  ]), oldSession);

  // Start new session immediately
  const newSession = manager.startSession();
  assert(manager.getFinalTranscript() === '', 'New session starts clean');

  // Late callback from old session arrives
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'استجابة متأخرة من جلسة قديمة', isFinal: true }
  ]), oldSession);
  assert(manager.getFinalTranscript() === '', 'Stale callback from old session discarded');

  // New session valid callback
  manager.processRecognitionEvent(createMockEvent([
    { transcript: 'الجلسة الجديدة الفعلية', isFinal: true }
  ]), newSession);
  assert(manager.getFinalTranscript() === 'الجلسة الجديدة الفعلية', 'New session callback processed successfully');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  return failed === 0;
}

runComprehensiveTests();
