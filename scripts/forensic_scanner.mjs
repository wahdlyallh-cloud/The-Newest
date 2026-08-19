/**
 * forensic_scanner.mjs
 * Deep forensic scan for hardcoded strings (Arabic, English) in all source files
 * NOT coming from the translation system
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd(), 'src');
const REPORT_PATH = 'forensic_full_report.json';

function getFiles(dir, exts) {
  const results = [];
  function walk(d) {
    let items;
    try { items = fs.readdirSync(d); } catch { return; }
    for (const item of items) {
      if (['node_modules', 'dist', '.git', '.vite'].includes(item)) continue;
      const p = path.join(d, item);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else if (exts.some(e => item.endsWith(e))) results.push(p);
    }
  }
  walk(dir);
  return results;
}

const files = getFiles(ROOT, ['.tsx', '.ts', '.js']);
console.log(`Scanning ${files.length} files...\n`);

const ARABIC_RANGE = /[\u0600-\u06FF]/;
const findings = [];

function addFinding(file, lineNum, type, lang, str, context) {
  findings.push({
    file: file.replace(ROOT, '').replace(/\\/g, '/'),
    line: lineNum,
    type,
    lang,
    string: str.substring(0, 100).trim(),
    context
  });
}

for (const file of files) {
  // Skip the translation database itself
  if (file.includes('languages.ts')) continue;
  
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();
    
    // Skip pure comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
    
    // ==========================================
    // 1. ARABIC STRING DETECTION
    // ==========================================
    if (ARABIC_RANGE.test(line)) {
      
      // 1a. JSX visible text content: >text<
      const jsxTextMatches = line.matchAll(/>\s*([^<>{}]{1,120})\s*</g);
      for (const m of jsxTextMatches) {
        const txt = m[1].trim();
        if (txt.length > 1 && ARABIC_RANGE.test(txt) && !txt.includes('${')) {
          addFinding(file, lineNum, 'ARABIC_JSX_TEXT', 'AR', txt, 'JSX visible text');
        }
      }
      
      // 1b. Arabic in JSX string attributes
      const attrMatches = line.matchAll(/(?:placeholder|title|aria-label|alt|label|content|message)=["']([^"']*[\u0600-\u06FF][^"']*)["']/g);
      for (const m of attrMatches) {
        addFinding(file, lineNum, 'ARABIC_ATTR', 'AR', m[1], `Attribute: ${m[0].split('=')[0].trim()}`);
      }
      
      // 1c. Arabic fallback in || or ?? 
      const fallbackMatches = line.matchAll(/(?:\|\||\?\?)\s*["'`]([^"'`]*[\u0600-\u06FF][^"'`]*)["'`]/g);
      for (const m of fallbackMatches) {
        addFinding(file, lineNum, 'ARABIC_FALLBACK', 'AR', m[1], 'Fallback operator');
      }
      
      // 1d. Arabic in showToast / alert / console.error that shows to user
      if (/show[Tt]oast|toast\(|alert\(|setError\(|setToast/.test(line)) {
        const strMatches = line.matchAll(/["'`]([^"'`]*[\u0600-\u06FF][^"'`]*)["'`]/g);
        for (const m of strMatches) {
          if (m[1].length > 2) addFinding(file, lineNum, 'ARABIC_TOAST_ERROR', 'AR', m[1], 'Toast/Error message');
        }
      }
      
      // 1e. Arabic in useState initial values
      if (/useState\s*\(["'`]/.test(line)) {
        const strMatches = line.matchAll(/useState\s*\(["'`]([^"'`]*[\u0600-\u06FF][^"'`]*)["'`]/g);
        for (const m of strMatches) {
          addFinding(file, lineNum, 'ARABIC_USE_STATE', 'AR', m[1], 'useState initial value');
        }
      }
      
      // 1f. Arabic in template literals (not in AI prompts - those are intentional)
      // Detect Arabic in template literals that are shown in UI (toasts, labels, etc.)
      // Skip lines that are clearly AI prompt construction (long lines with contextLines, systemPrompt, etc.)
      if (!line.includes('contextLines') && !line.includes('systemPrompt') && !line.includes('userMessage')) {
        const tmplMatches = line.matchAll(/`[^`]*[\u0600-\u06FF][^`]*`/g);
        for (const m of tmplMatches) {
          const str = m[0];
          if (str.length < 200 && !str.includes('${t.')) { // short templates that don't use t. 
            addFinding(file, lineNum, 'ARABIC_TEMPLATE', 'AR', str.substring(0, 80), 'Template literal');
          }
        }
      }
    }
    
    // ==========================================
    // 2. ENGLISH HARDCODED UI STRING DETECTION
    // ==========================================
    
    // 2a. English fallback in || or ??
    const enFallbackRegex = /(?:\|\||\?\?)\s*"([A-Z][a-zA-Z\s&\-\/\.\!\?\(\)]{10,80})"/g;
    let enMatch;
    while ((enMatch = enFallbackRegex.exec(line)) !== null) {
      const str = enMatch[1];
      // Must look like a UI string (not a URL, class name, etc.)
      if (!/^https?:|^www\.|class|style|error:|Error:/.test(str)) {
        addFinding(file, lineNum, 'ENGLISH_FALLBACK', 'EN', str, 'English fallback operator');
      }
    }
    
    // 2b. English in placeholder/aria-label/title attributes
    const enAttrRegex = /(?:placeholder|aria-label|title)=["']([A-Z][a-zA-Z\s&\-\/\.\!\?]{10,80})["']/g;
    while ((enMatch = enAttrRegex.exec(line)) !== null) {
      addFinding(file, lineNum, 'ENGLISH_ATTR', 'EN', enMatch[1], 'English attribute');
    }
    
    // 2c. English hardcoded toast/error messages
    if (/show[Tt]oast|setError\(|setToastMessage/.test(line)) {
      const enToastRegex = /["'`]([A-Z][a-zA-Z\s&\-\/\.\!\?]{15,100})["'`]/g;
      while ((enMatch = enToastRegex.exec(line)) !== null) {
        const str = enMatch[1];
        if (!/class|style|Error:|https?:/.test(str)) {
          addFinding(file, lineNum, 'ENGLISH_TOAST', 'EN', str, 'English toast/error message');
        }
      }
    }
    
    // ==========================================
    // 3. BINARY TERNARY LANGUAGE CONDITIONS
    // ==========================================
    
    // isAr ? 'Arabic' : 'English' or appLanguage === 'ar' ? ... : ...
    if (/isAr\s*\?|appLanguage\s*===\s*['"]ar['"]\s*\?|langInfo\.dir\s*===\s*['"]rtl['"]\s*\?/.test(line)) {
      // Check if it's rendering language-specific text (not just RTL class)
      if (ARABIC_RANGE.test(line) || /\?\s*['"][A-Z]/.test(line)) {
        addFinding(file, lineNum, 'BINARY_TERNARY', 'BOTH', trimmed.substring(0, 100), 'Binary language ternary');
      }
    }
  }
}

// Sort by file, then line number
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

// Summary by file
const byFile = {};
for (const f of findings) {
  const key = f.file;
  if (!byFile[key]) byFile[key] = { ar: 0, en: 0, both: 0, items: [] };
  if (f.lang === 'AR') byFile[key].ar++;
  else if (f.lang === 'EN') byFile[key].en++;
  else byFile[key].both++;
  byFile[key].items.push(f);
}

// Output summary
console.log('=== FORENSIC SCAN RESULTS ===\n');
console.log(`Total findings: ${findings.length}`);
console.log(`Files with issues: ${Object.keys(byFile).length}\n`);

console.log('--- SUMMARY BY FILE ---');
const sorted = Object.entries(byFile).sort((a, b) => (b[1].ar + b[1].en) - (a[1].ar + a[1].en));
for (const [file, data] of sorted) {
  const total = data.ar + data.en + data.both;
  console.log(`\n${file} [AR:${data.ar} EN:${data.en} BINARY:${data.both} TOTAL:${total}]`);
  // Show first 8 findings per file
  data.items.slice(0, 8).forEach(f => {
    console.log(`  L${f.line} [${f.type}] ${f.string}`);
  });
  if (data.items.length > 8) console.log(`  ... (${data.items.length - 8} more)`);
}

// Save full report
fs.writeFileSync(REPORT_PATH, JSON.stringify({ total: findings.length, byFile, findings }, null, 2));
console.log(`\n\nFull report saved to: ${REPORT_PATH}`);
