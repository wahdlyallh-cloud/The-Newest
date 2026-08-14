/**
 * Tests for Hayat AI Speech Recognition Layer
 */
import { SpeechSessionTracker, normalizeSpeechWhitespace } from '../lib/speechRecognition';

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

function runTests() {
  console.log('Running Speech Recognition Tests...\n');
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

  const tracker = new SpeechSessionTracker();

  // Test 1: Short Arabic sentence
  tracker.startNewSession();
  let res = tracker.processEvent(createMockEvent([
    { transcript: 'السلام عليكم', isFinal: true }
  ]));
  assert(res.finalTranscript === 'السلام عليكم', 'Test 1: Short Arabic sentence final', res.finalTranscript, 'السلام عليكم');
  assert(res.interimTranscript === '', 'Test 1: Short Arabic interim is empty', res.interimTranscript, '');

  // Test 2: Full Arabic sentence "السلام عليكم ورحمة الله وبركاته"
  tracker.startNewSession();
  res = tracker.processEvent(createMockEvent([
    { transcript: 'السلام عليكم ورحمة الله وبركاته', isFinal: true }
  ]));
  assert(res.finalTranscript === 'السلام عليكم ورحمة الله وبركاته', 'Test 2: Full Arabic sentence', res.finalTranscript, 'السلام عليكم ورحمة الله وبركاته');

  // Test 3: English sentence
  tracker.startNewSession();
  res = tracker.processEvent(createMockEvent([
    { transcript: 'Hello, this is a test of voice recognition.', isFinal: true }
  ]));
  assert(res.finalTranscript === 'Hello, this is a test of voice recognition.', 'Test 3: English sentence', res.finalTranscript, 'Hello, this is a test of voice recognition.');

  // Test 4: Arabic sentence with multiple interim events
  tracker.startNewSession();
  // Step 1 interim
  res = tracker.processEvent(createMockEvent([
    { transcript: 'السلام', isFinal: false }
  ]));
  assert(res.interimTranscript === 'السلام' && res.finalTranscript === '', 'Test 4.1: Interim step 1');
  assert(res.displayTranscript === 'السلام', 'Test 4.1: Display step 1');

  // Step 2 interim
  res = tracker.processEvent(createMockEvent([
    { transcript: 'السلام عليكم', isFinal: false }
  ]));
  assert(res.interimTranscript === 'السلام عليكم' && res.finalTranscript === '', 'Test 4.2: Interim step 2');
  assert(res.displayTranscript === 'السلام عليكم', 'Test 4.2: Display step 2');

  // Step 3 final arrives
  res = tracker.processEvent(createMockEvent([
    { transcript: 'السلام عليكم', isFinal: true }
  ]));
  assert(res.finalTranscript === 'السلام عليكم' && res.interimTranscript === '', 'Test 4.3: Final step 3');
  assert(res.displayTranscript === 'السلام عليكم', 'Test 4.3: Display step 3');

  // Test 5: Same final result arrives more than once (idempotent result index)
  tracker.startNewSession();
  tracker.processEvent(createMockEvent([
    { transcript: 'مرحبا بك', isFinal: true }
  ]));
  res = tracker.processEvent(createMockEvent([
    { transcript: 'مرحبا بك', isFinal: true }
  ]));
  assert(res.finalTranscript === 'مرحبا بك', 'Test 5: Idempotent duplicate final result', res.finalTranscript, 'مرحبا بك');

  // Test 6: Event containing both interim and final
  tracker.startNewSession();
  res = tracker.processEvent(createMockEvent([
    { transcript: 'الجزء الأول المؤكد', isFinal: true },
    { transcript: 'والجزء الثاني المؤقت', isFinal: false }
  ]));
  assert(res.finalTranscript === 'الجزء الأول المؤكد', 'Test 6: Separate final chunk', res.finalTranscript, 'الجزء الأول المؤكد');
  assert(res.interimTranscript === 'والجزء الثاني المؤقت', 'Test 6: Separate interim chunk', res.interimTranscript, 'والجزء الثاني المؤقت');
  assert(res.displayTranscript === 'الجزء الأول المؤكد والجزء الثاني المؤقت', 'Test 6: Display combined with space', res.displayTranscript, 'الجزء الأول المؤكد والجزء الثاني المؤقت');

  // Test 7: Multiple consecutive sentences across separate final chunks
  tracker.startNewSession();
  res = tracker.processEvent(createMockEvent([
    { transcript: 'الجملة الأولى.', isFinal: true },
    { transcript: 'الجملة الثانية.', isFinal: true }
  ]));
  assert(res.finalTranscript === 'الجملة الأولى. الجملة الثانية.', 'Test 7: Consecutive final sentences with clean space', res.finalTranscript, 'الجملة الأولى. الجملة الثانية.');

  // Test 8: Naturally repeated words preserved (e.g. "نعم نعم أريد ذلك")
  tracker.startNewSession();
  res = tracker.processEvent(createMockEvent([
    { transcript: 'نعم نعم أريد ذلك بالتأكيد', isFinal: true }
  ]));
  assert(res.finalTranscript === 'نعم نعم أريد ذلك بالتأكيد', 'Test 8: Natural repetition preserved', res.finalTranscript, 'نعم نعم أريد ذلك بالتأكيد');

  // Test 9: Session reset & finalize on voice chat close
  tracker.startNewSession();
  tracker.processEvent(createMockEvent([
    { transcript: 'نص مؤقت فقط', isFinal: false }
  ]));
  tracker.reset();
  assert(tracker.getFinalTranscript() === '' && tracker.getInterimTranscript() === '', 'Test 9: Session reset clears buffers');

  // Test 10: Reopen session token protection
  const session1 = tracker.startNewSession();
  tracker.processEvent(createMockEvent([
    { transcript: 'جلسة أولى', isFinal: true }
  ]), session1);
  const session2 = tracker.startNewSession();
  // Simulate late callback from session 1
  tracker.processEvent(createMockEvent([
    { transcript: 'استجابة متأخرة من جلسة 1', isFinal: true }
  ]), session1);
  assert(tracker.getFinalTranscript() === '', 'Test 10: Stale callback from session 1 dropped in session 2');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  return failed === 0;
}

runTests();
