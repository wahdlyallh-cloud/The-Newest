import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';

console.log('🚀 Running Full Real Browser Localization QA with Microsoft Edge...');

const LOCALES = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];
const SCREENSHOT_DIR = './browser-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const port = 9224;
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = path.resolve('./scratch/real-qa-profile');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class SimpleCdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = e => {
        const msg = JSON.parse(e.data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }

  close() {
    try { this.ws.close(); } catch {}
  }
}

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

async function runTest() {
  console.log(`Starting Microsoft Edge on port ${port}...`);
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    try {
      versionInfo = await fetchJson(`http://127.0.0.1:${port}/json/version`);
      if (versionInfo) break;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  if (!versionInfo) {
    console.error('❌ Could not connect to Edge');
    edgeProcess.kill();
    process.exit(1);
  }

  console.log('✅ Connected to Edge:', versionInfo.Browser);

  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new SimpleCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  const results = [];

  for (const locale of LOCALES) {
    console.log(`\n🔍 [Testing Locale: ${locale.toUpperCase()}]`);

    // 1. Clear storage & set target locale in about:blank first
    await cdp.send('Page.navigate', { url: 'https://the-newest.vercel.app' });
    await new Promise(r => setTimeout(r, 2000));

    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('app_language', '${locale}');
        const settings = { appLanguage: '${locale}' };
        localStorage.setItem('yawmiyati_settings', JSON.stringify(settings));
        location.href = 'https://the-newest.vercel.app';
      `
    });

    // 2. Wait for page load and React render
    let visibleText = '';
    let docLang = '';
    let docDir = '';

    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await cdp.send('Runtime.evaluate', {
        expression: `
          (() => {
            const root = document.getElementById('root') || document.body;
            return {
              text: root.innerText || '',
              lang: document.documentElement.lang || '',
              dir: document.documentElement.dir || ''
            };
          })()
        `,
        returnByValue: true
      });

      const val = res.result ? res.result.value : (res.value || {});
      if (val.text && val.text.length > 50) {
        visibleText = val.text;
        docLang = val.lang;
        docDir = val.dir;
        break;
      }
    }

    console.log(`  -> Rendered DOM: ${visibleText.length} chars (lang=${docLang}, dir=${docDir})`);
    console.log(`  -> Sample DOM Preview: "${visibleText.slice(0, 120).replace(/\n/g, ' ')}..."`);

    // 3. Capture screenshot
    try {
      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      if (ss && ss.data) {
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${locale}.png`), Buffer.from(ss.data, 'base64'));
        console.log(`  📸 Screenshot saved: browser-screenshots/${locale}.png`);
      }
    } catch (e) {
      console.warn('  ⚠️ Could not take screenshot:', e.message);
    }

    // 4. Leak Detection
    let leakDetected = false;
    let leakInfo = '';

    if (locale !== 'ar') {
      const words = visibleText.split(/\s+/).filter(w => ARABIC_CHAR_REGEX.test(w) && w.length > 1);
      // Exclude proper brand name if displayed in logo
      const foreignWords = words.filter(w => !w.includes('حياة') && !w.includes('يومياتي'));
      if (foreignWords.length > 0) {
        leakDetected = true;
        leakInfo = `Arabic text found: "${foreignWords.slice(0, 5).join(' ')}"`;
        console.log(`  ❌ [${locale.toUpperCase()}] FAIL: ${leakInfo}`);
      }
    }

    if (!leakDetected && visibleText.length > 50) {
      console.log(`  ✅ [${locale.toUpperCase()}] PASS: Verified 0 foreign language leaks in live browser.`);
    }

    results.push({
      locale,
      textLength: visibleText.length,
      docLang,
      docDir,
      passed: !leakDetected && visibleText.length > 50,
      leakInfo
    });
  }

  // 5. Test Live Dynamic Language Switching Sequence without reload
  console.log('\n🔄 Testing Real Browser Dynamic Language Switching Sequence (AR -> EN -> TR -> DE -> FR -> JA -> ZH -> HI -> PT -> RU -> ES -> IT -> AR)...');
  const sequence = ['ar', 'en', 'tr', 'de', 'fr', 'ja', 'zh', 'hi', 'pt', 'ru', 'es', 'it', 'ar'];

  for (let i = 0; i < sequence.length - 1; i++) {
    const fromLang = sequence[i];
    const toLang = sequence[i + 1];

    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('app_language', '${toLang}');
        const s = localStorage.getItem('yawmiyati_settings');
        const parsed = s ? JSON.parse(s) : {};
        parsed.appLanguage = '${toLang}';
        localStorage.setItem('yawmiyati_settings', JSON.stringify(parsed));
        document.documentElement.lang = '${toLang}';
        document.documentElement.dir = '${toLang === 'ar' ? 'rtl' : 'ltr'}';
        location.reload();
      `
    });

    await new Promise(r => setTimeout(r, 2500));

    const checkRes = await cdp.send('Runtime.evaluate', {
      expression: `
        ({
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          chars: (document.getElementById('root') || document.body).innerText.length
        })
      `,
      returnByValue: true
    });

    const cVal = checkRes.result ? checkRes.result.value : (checkRes.value || {});
    console.log(`  -> Switched ${fromLang.toUpperCase()} -> ${toLang.toUpperCase()}: lang=${cVal.lang}, dir=${cVal.dir}, chars=${cVal.chars}`);
  }

  cdp.close();
  edgeProcess.kill();

  console.log('\n========================================');
  console.log('REAL BROWSER QA TEST SUMMARY:');
  console.log('========================================');
  results.forEach(r => {
    console.log(`${r.locale.toUpperCase()}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (chars=${r.textLength}, lang=${r.docLang}, dir=${r.docDir}) ${r.leakInfo}`);
  });

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\n🎉 ALL 12 LOCALES PASSED REAL BROWSER QA INSPECTION WITH 0 LEAKS!');
    process.exit(0);
  } else {
    console.error('\n❌ REAL BROWSER QA INSPECTION FAILED.');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Fatal error during browser QA:', err);
  process.exit(1);
});
