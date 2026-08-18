import fs from 'fs';
import path from 'path';

const arabicRegex = /[\u0600-\u06FF]/;

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
      files = files.concat(getAllFiles(full, exts));
    } else if (exts.some(e => item.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

const SKIP_FILES = ['languages.ts'];

function scanFile(filePath) {
  if (SKIP_FILES.some(s => filePath.endsWith(s))) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const hits = [];

  lines.forEach((line, idx) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
    if (!arabicRegex.test(line)) return;

    // Classify the type of hit
    let kind = 'unknown';
    if (t.includes('throw new Error') || t.includes('catch') || t.includes('Error(')) kind = 'error-message';
    else if (t.includes('return {') || t.includes('message:') || t.includes('success:') || t.includes('error:')) kind = 'service-return';
    else if (t.includes('placeholder=') || t.includes('aria-label=') || t.includes('title=') || t.includes('alt=')) kind = 'attribute';
    else if (t.includes('toast') || t.includes('alert') || t.includes('notify') || t.includes('notification')) kind = 'notification';
    else if (t.includes('<span') || t.includes('<p') || t.includes('<h') || t.includes('<button') || t.includes('<div')) kind = 'jsx-text';
    else if (t.includes("'") || t.includes('"')) kind = 'string-literal';
    else if (t.includes('//') || t.includes('/*')) kind = 'comment';

    hits.push({ lineNum: idx + 1, kind, code: t });
  });

  return hits.length > 0 ? { file: filePath.replace('.\\', ''), count: hits.length, hits } : null;
}

const files = getAllFiles('./src');
const results = files.map(scanFile).filter(Boolean);
results.sort((a, b) => b.count - a.count);

const totalLines = results.reduce((sum, r) => sum + r.count, 0);

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         COMPREHENSIVE ARABIC LEAK FORENSIC REPORT               ║
║         Scanning ${files.length} source files                         ║
╚══════════════════════════════════════════════════════════════════╝

TOTAL HARDCODED ARABIC LINES REMAINING: ${totalLines}
AFFECTED FILES: ${results.length}
`);

// Group by kind
const byKind = {};
results.forEach(r => {
  r.hits.forEach(h => {
    if (!byKind[h.kind]) byKind[h.kind] = 0;
    byKind[h.kind]++;
  });
});

console.log('=== BY CATEGORY ===');
Object.entries(byKind).sort((a,b) => b[1]-a[1]).forEach(([k, c]) => {
  console.log(`  ${k}: ${c} lines`);
});

console.log('\n=== BY FILE (Top 20, sorted by count) ===');
results.slice(0, 20).forEach(r => {
  const byKindLocal = {};
  r.hits.forEach(h => {
    if (!byKindLocal[h.kind]) byKindLocal[h.kind] = 0;
    byKindLocal[h.kind]++;
  });
  const kindStr = Object.entries(byKindLocal).map(([k,c]) => `${k}:${c}`).join(', ');
  console.log(`\n  📄 ${r.file} [${r.count} total] (${kindStr})`);
  r.hits.slice(0, 3).forEach(h => {
    console.log(`     L${h.lineNum} [${h.kind}]: ${h.code.slice(0, 100)}`);
  });
});

// Write JSON report
fs.writeFileSync('./forensic_audit_report.json', JSON.stringify(results, null, 2));
console.log('\n📁 Full report written to forensic_audit_report.json');
