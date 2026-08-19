/**
 * scripts/i18nAudit.cjs — Strict Multi-Layer i18n & Architecture Health Audit
 * Hayat AI (حياة AI)
 */

const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🔍 Running Hayat AI Strict Multi-Layer i18n & Architecture Audit');
console.log('========================================================================\n');

const langFilePath = path.join(process.cwd(), 'src', 'lib', 'languages.ts');
if (!fs.existsSync(langFilePath)) {
  console.error('❌ Could not find src/lib/languages.ts');
  process.exit(1);
}

const langContent = fs.readFileSync(langFilePath, 'utf8');

const dictNames = [
  'AR_DICT', 'EN_DICT', 'FR_DICT', 'DE_DICT',
  'ES_DICT', 'IT_DICT', 'TR_DICT', 'PT_DICT',
  'RU_DICT', 'JA_DICT', 'ZH_DICT', 'HI_DICT'
];

function extractDict(dictName) {
  const regex = new RegExp(`export const ${dictName}: Record<string, any> = \\{([\\s\\S]*?)\\n\\};`);
  const match = langContent.match(regex);
  if (!match) return {};
  const body = match[1];
  const dict = {};
  const lineRegex = /^\s*([a-zA-Z0-9_$]+)\s*:\s*(['"`])([\s\S]*?)\2/gm;
  let m;
  while ((m = lineRegex.exec(body)) !== null) {
    dict[m[1]] = m[3];
  }
  return dict;
}

const dictionaries = {};
dictNames.forEach(d => {
  dictionaries[d] = extractDict(d);
});

const arDict = dictionaries['AR_DICT'] || {};
const allBaseKeys = new Set(Object.keys(arDict));
const totalRequired = allBaseKeys.size; // 2400

const langLabels = {
  AR_DICT: 'Arabic (ar)',
  EN_DICT: 'English (en)',
  FR_DICT: 'French (fr)',
  DE_DICT: 'German (de)',
  ES_DICT: 'Spanish (es)',
  IT_DICT: 'Italian (it)',
  TR_DICT: 'Turkish (tr)',
  PT_DICT: 'Portuguese (pt)',
  RU_DICT: 'Russian (ru)',
  JA_DICT: 'Japanese (ja)',
  ZH_DICT: 'Chinese (zh)',
  HI_DICT: 'Hindi (hi)'
};

const validCognates = new Set(['no', 'text', 'section', 'mode', 'radio', 'canal', 'album', 'status']);
const auditReportTable = [];
let totalFailures = 0;

dictNames.forEach(dName => {
  const dict = dictionaries[dName];
  let directNative = 0;
  let enFallback = 0;
  let arFallback = 0;
  let missing = 0;
  let placeholderLeaks = 0;

  allBaseKeys.forEach(key => {
    if (dict[key] !== undefined && dict[key].trim() !== '') {
      const val = dict[key];
      const titleFromKey = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
      // Detect TitleCase placeholder leaks
      if (titleFromKey === val.trim().toLowerCase() && /[A-Z]/.test(val) && dName !== 'EN_DICT' && !validCognates.has(key)) {
        placeholderLeaks++;
      } else {
        directNative++;
      }
    } else {
      if (dName !== 'EN_DICT' && dictionaries['EN_DICT'][key]) {
        enFallback++;
      } else if (arDict[key]) {
        arFallback++;
      } else {
        missing++;
      }
    }
  });

  const isFullPass = directNative === totalRequired && enFallback === 0 && arFallback === 0 && missing === 0 && placeholderLeaks === 0;
  if (!isFullPass) totalFailures++;

  auditReportTable.push({
    Language: langLabels[dName],
    Required: totalRequired,
    DirectNative: `${directNative}/${totalRequired}`,
    EnFallback: enFallback,
    ArFallback: arFallback,
    Missing: missing,
    PlaceholderLeaks: placeholderLeaks,
    Status: isFullPass ? 'PASS ✅' : 'FAIL ❌'
  });
});

console.table(auditReportTable);

const bannedPatterns = [
  { name: 'arabicMonths undefined reference in App.tsx', pattern: /arabicMonths\[month\]/, filePattern: /App\.tsx$/ },
  { name: 'Unsafe raw getHabitDisplayName module call without t', pattern: /getHabitDisplayName\(habit\)(?!\s*,\s*t)/, filePattern: /App\.tsx$/ }
];

let violationsFound = 0;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(walk(full));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  });
  return results;
}

const allSourceFiles = walk(path.join(process.cwd(), 'src'));

allSourceFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  bannedPatterns.forEach(({ name, pattern, filePattern }) => {
    if (filePattern && !filePattern.test(filePath)) return;
    if (pattern.test(content)) {
      console.error(`❌ VIOLATION [${name}] in: ${filePath}`);
      violationsFound++;
    }
  });
});

console.log('\n========================================================================');
if (violationsFound === 0 && totalFailures === 0) {
  console.log('🎉 100% STRICT MULTI-LAYER i18n & ARCHITECTURE AUDIT PASSED!');
  console.log('   All 12 languages achieved 2400/2400 Direct Native Keys with 0 Fallbacks!');
} else {
  console.error(`❌ Audit failed with ${totalFailures} language discrepancies and ${violationsFound} violations.`);
  process.exit(1);
}
console.log('========================================================================\n');
