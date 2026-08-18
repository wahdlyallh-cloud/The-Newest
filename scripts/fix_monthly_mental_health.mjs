/**
 * fix_monthly_mental_health.mjs
 * Fixes MonthlyMentalHealthPDFReportModal.tsx:
 * 1. MOOD_PRESETS → dynamic function using t keys
 * 2. Hardcoded Arabic initial states → empty strings or t keys
 * 3. Other Arabic hardcoded UI strings
 */
import fs from 'fs';

const filePath = 'src/components/MonthlyMentalHealthPDFReportModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// Helper to do replacement and count
function replace(from, to, label) {
  if (content.includes(from)) {
    content = content.replace(from, to);
    changes++;
    console.log('  ✅ ' + label);
    return true;
  } else {
    console.log('  ⚠️  Not found: ' + label);
    return false;
  }
}

// 1. Fix MOOD_PRESETS static array → dynamic function
replace(
  `const MOOD_PRESETS = [
  { label: 'شديد الاضطراب', percentage: 20, emoji: '😫' },
  { label: 'قلق وتوتر', percentage: 40, emoji: '😟' },
  { label: 'طبيعي / متقلب', percentage: 60, emoji: '😐' },
  { label: 'مطمئن ومرتاح', percentage: 80, emoji: '😊' },
  { label: 'سعيد ومستقر جداً', percentage: 100, emoji: '🌟' },
];`,
  `const getMoodPresets = (t: ReturnType<typeof getTranslation>) => [
  { label: t.moodSeverelyDistressed || 'Severely Distressed', percentage: 20, emoji: '😫' },
  { label: t.moodAnxiousStressed || 'Anxious / Stressed', percentage: 40, emoji: '😟' },
  { label: t.moodNeutralVariable || 'Neutral / Variable', percentage: 60, emoji: '😐' },
  { label: t.moodCalmRelaxed || 'Calm & Relaxed', percentage: 80, emoji: '😊' },
  { label: t.moodHappyStable || 'Happy & Very Stable', percentage: 100, emoji: '🌟' },
];`,
  'MOOD_PRESETS → getMoodPresets(t)'
);

// 2. Replace all usages of MOOD_PRESETS with getMoodPresets(t)
const moodUsages = (content.match(/MOOD_PRESETS/g) || []).length;
if (moodUsages > 0) {
  content = content.replaceAll('MOOD_PRESETS', 'getMoodPresets(t)');
  console.log(`  ✅ Replaced ${moodUsages} MOOD_PRESETS usages with getMoodPresets(t)`);
  changes++;
}

// 3. Fix hardcoded Arabic initial preSessionMoodLabel state
replace(
  `const [preSessionMoodLabel, setPreSessionMoodLabel] = useState<string>('قلق وتوتر');`,
  `const [preSessionMoodLabel, setPreSessionMoodLabel] = useState<string>('');`,
  'preSessionMoodLabel initial state'
);

// 4. Fix hardcoded Arabic initial postSessionMoodLabel state
replace(
  `const [postSessionMoodLabel, setPostSessionMoodLabel] = useState<string>('تحسن واستقرار نفسي');`,
  `const [postSessionMoodLabel, setPostSessionMoodLabel] = useState<string>('');`,
  'postSessionMoodLabel initial state'
);

// 5. Fix hardcoded Arabic therapistHomework initial state (sample homework tasks)
replace(
  `  const [therapistHomework, setTherapistHomework] = useState<string[]>([
    'التدرب على تمارين التنفس البطني العميق (4-7-8) لمدة 5 دقائق يومياً',
    'تدوين سجل الأفكار التلقائية والبدائل العقلانية عند الشعور بالضغط النفسي'
  ]);`,
  `  const [therapistHomework, setTherapistHomework] = useState<string[]>([]);`,
  'therapistHomework initial state (removed hardcoded Arabic samples)'
);

// 6. Fix hardcoded Arabic sessionSummaryBullets initial state
replace(
  `  const [sessionSummaryBullets, setSessionSummaryBullets] = useState<string[]>([
    'مناقشة مسببات القلق والمواقف المثيرة وتفنيد المخاوف مع المعالج النفسي',
    'التركيز على تدريبات اليقظة الذهنية وتحديد الحدود النفسية الإيجابية'
  ]);`,
  `  const [sessionSummaryBullets, setSessionSummaryBullets] = useState<string[]>([]);`,
  'sessionSummaryBullets initial state (removed hardcoded Arabic samples)'
);

// 7. Fix the fallback label in progress bar detection
replace(
  `const label = progressBarMatch[1] || progressBarMatch[3] || 'مؤشر نفسي';`,
  `const label = progressBarMatch[1] || progressBarMatch[3] || '';`,
  'progress bar fallback label'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ MonthlyMentalHealthPDFReportModal.tsx: ${changes} changes applied`);
