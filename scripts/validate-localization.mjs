import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Bundle and load src/lib/languages.ts
const result = esbuild.buildSync({
  entryPoints: [path.join(rootDir, 'src/lib/languages.ts')],
  bundle: true,
  write: false,
  format: 'cjs',
  target: 'node20',
  external: ['react', 'react-dom']
});

const code = result.outputFiles[0].text;
const mod = { exports: {} };
const fn = new Function('module', 'exports', 'require', code);
fn(mod, mod.exports, () => ({ createContext: () => ({}), useContext: () => ({}), useState: () => [] }));

const BASELINE = mod.exports.BASELINE_DICTIONARIES;
const languages = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];

let hasError = false;
console.log('🔍 [1/3] Validating 12-Locale Translation Dictionaries...');

const masterDict = BASELINE.en || BASELINE.ar;
const masterKeys = Object.keys(masterDict);
console.log(`Found ${masterKeys.length} master keys in primary schema.`);

languages.forEach((lang) => {
  const dict = BASELINE[lang];
  if (!dict) {
    console.error(`❌ [ERROR] Missing dictionary for locale: ${lang}`);
    hasError = true;
    return;
  }

  const missingKeys = [];
  const emptyKeys = [];
  const arabicLeaks = [];
  const rawKeyLike = [];

  masterKeys.forEach((key) => {
    const val = dict[key];
    if (val === undefined || val === null) {
      missingKeys.push(key);
    } else if (typeof val === 'string' && val.trim() === '') {
      emptyKeys.push(key);
    } else if (typeof val === 'string') {
      // Check for Arabic leakage in non-Arabic locales
      if (lang !== 'ar' && /[\u0600-\u06FF]/.test(val)) {
        arabicLeaks.push(`${key}: "${val}"`);
      }
      // Check for raw camelCase or SCREAMING_SNAKE_CASE unlocalized keys
      if (/^[A-Z0-9_]{5,}$/.test(val) || (val === key && /^[a-z]+[A-Z0-9]/.test(key))) {
        rawKeyLike.push(`${key}: "${val}"`);
      }
    }
  });

  if (missingKeys.length > 0) {
    console.error(`❌ [${lang.toUpperCase()}] ${missingKeys.length} Missing Keys: ${missingKeys.slice(0, 5).join(', ')}...`);
    hasError = true;
  }
  if (emptyKeys.length > 0) {
    console.error(`❌ [${lang.toUpperCase()}] ${emptyKeys.length} Empty Keys: ${emptyKeys.slice(0, 5).join(', ')}...`);
    hasError = true;
  }
  if (arabicLeaks.length > 0) {
    console.error(`❌ [${lang.toUpperCase()}] ${arabicLeaks.length} Arabic Leakages: ${arabicLeaks.slice(0, 3).join(', ')}...`);
    hasError = true;
  }
  if (rawKeyLike.length > 0) {
    console.error(`❌ [${lang.toUpperCase()}] ${rawKeyLike.length} Raw Key Values: ${rawKeyLike.slice(0, 3).join(', ')}...`);
    hasError = true;
  }

  if (missingKeys.length === 0 && emptyKeys.length === 0 && arabicLeaks.length === 0 && rawKeyLike.length === 0) {
    console.log(`✅ [${lang.toUpperCase()}] 100% Valid (${Object.keys(dict).length} keys, 0 leaks)`);
  }
});

// 2. Scan source TSX files for unlocalized ternaries & suspicious raw keys
console.log('\n🔍 [2/3] Scanning Source Code for Fallback Ternaries and Unlocalized UI Strings...');

function getAllSrcFiles(dir, exts = ['.tsx', '.ts']) {
  let list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist') {
      list = list.concat(getAllSrcFiles(full, exts));
    } else if (exts.some(ext => e.name.endsWith(ext))) {
      list.push(full);
    }
  }
  return list;
}

const srcFiles = getAllSrcFiles(path.join(rootDir, 'src'));
let suspiciousTernariesCount = 0;

srcFiles.forEach(file => {
  const relPath = path.relative(rootDir, file);
  if (relPath.includes('languages.ts') || relPath.includes('.test.') || relPath.includes('testUtils')) return;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check for binary fallback ternaries like (isRtl ? '...' : '...') or (isEn ? '...' : '...')
    if (/\((?:isRtl|isAr|isArabic|isEn|isEnglish|appLanguage === 'ar'|appLanguage === 'en')\s*\?\s*['"`][\s\S]+?['"`]\s*:\s*['"`][\s\S]+?['"`]\)/.test(line)) {
      console.warn(`⚠️ [TERNARY] ${relPath}:${idx + 1}: ${line.trim()}`);
      suspiciousTernariesCount++;
    }
  });
});

console.log(`\nFound ${suspiciousTernariesCount} remaining binary fallback ternaries in UI code.`);

if (hasError) {
  console.error('\n❌ Localization validation FAILED with errors.');
  process.exit(1);
} else {
  console.log('\n🎉 [3/3] All 12 localization schemas passed validation successfully!');
}
