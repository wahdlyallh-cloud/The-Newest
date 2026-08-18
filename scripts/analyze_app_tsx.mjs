/**
 * SCAN App.tsx for RENDERABLE Arabic strings only
 * Distinguishes between AI prompts (non-visible to user) and UI strings (visible)
 */
import fs from 'fs';

const content = fs.readFileSync('./src/App.tsx', 'utf-8');
const lines = content.split('\n');
const arabicRegex = /[\u0600-\u06FF]/;

const uiStrings = [];
const aiPrompts = [];
const comments = [];
const unknown = [];

lines.forEach((line, idx) => {
  if (!arabicRegex.test(line)) return;
  const t = line.trim();
  
  // Skip pure comments
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*')) {
    comments.push({ n: idx+1, l: t });
    return;
  }
  
  // AI prompt patterns - these are sent TO Gemini, not shown in UI directly
  const isAiPrompt = line.includes('prompt') || line.includes('Prompt') ||
    line.includes('instruction') || line.includes('Instruction') ||
    line.includes('SYSTEM_INSTRUCTION') || line.includes('systemInstruction') ||
    line.includes('context') || line.includes('message: `') ||
    line.includes("content: '") || line.includes('generateContent') ||
    line.includes('يرجى') || line.includes('بناءً على') ||
    (line.includes('const ') && line.includes('Template'));
  
  if (isAiPrompt) {
    aiPrompts.push({ n: idx+1, l: t.slice(0, 120) });
    return;
  }
  
  // Clearly UI strings
  const isUI = 
    line.includes('JSX') || line.includes('className') ||
    t.startsWith('<') || t.startsWith('>') ||
    line.includes('</') || line.includes('/>') ||
    line.includes('title=') || line.includes('placeholder=') ||
    line.includes('aria-label=') || line.includes('alt=') ||
    line.includes('toast') || line.includes('Toast') ||
    line.includes('alert(') || line.includes('confirm(') ||
    // Template literals with JSX return
    (line.includes('>') && line.includes('<'));
  
  if (isUI) {
    uiStrings.push({ n: idx+1, l: t.slice(0, 140) });
    return;
  }
  
  unknown.push({ n: idx+1, l: t.slice(0, 140) });
});

console.log(`\n=== App.tsx Arabic String Analysis ===`);
console.log(`Total UI strings (direct renders): ${uiStrings.length}`);
console.log(`AI prompts (sent to Gemini, not direct UI): ${aiPrompts.length}`);
console.log(`Comments: ${comments.length}`);
console.log(`Unknown: ${unknown.length}`);

console.log(`\n=== TOP 50 UI STRINGS (Need Translation) ===`);
uiStrings.slice(0, 50).forEach(s => console.log(`  L${s.n}: ${s.l}`));

console.log(`\n=== TOP 30 UNKNOWN ===`);
unknown.slice(0, 30).forEach(s => console.log(`  L${s.n}: ${s.l}`));
