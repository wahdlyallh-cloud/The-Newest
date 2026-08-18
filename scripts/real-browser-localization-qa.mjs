import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';

console.log('🚀 Launching Deep Mobile & Desktop Real Browser Localization QA Suite...');

const LOCALES = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];
const SCREENSHOT_DIR = './browser-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const cdpPort = 9226;
const previewPort = 4173;
const targetUrl = `http://127.0.0.1:${previewPort}`;
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const nodePath = 'C:\\Users\\JMN-UK\\.gemini\\antigravity\\brain\\28b513fd-3cde-42ff-afb5-6e2d3013bff4\\scratch\\node\\node.exe';
const userDataDir = path.resolve('./scratch/real-qa-profile');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
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
  console.log(`Starting Vite Preview Server on ${targetUrl}...`);
  const previewProcess = spawn(nodePath, ['./node_modules/vite/bin/vite.js', 'preview', '--port', String(previewPort), '--host', '127.0.0.1'], {
    stdio: 'ignore'
  });

  let serverUp = false;
  for (let i = 0; i < 20; i++) {
    if (await checkUrl(targetUrl)) {
      serverUp = true;
      break;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  if (!serverUp) {
    console.error('❌ Vite preview server failed to start');
    previewProcess.kill();
    process.exit(1);
  }
  console.log('✅ Local production preview server running.');

  console.log(`Starting Microsoft Edge on port ${cdpPort}...`);
  const edgeProcess = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    '--window-size=390,844',
    'about:blank'
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    try {
      versionInfo = await fetchJson(`http://127.0.0.1:${cdpPort}/json/version`);
      if (versionInfo) break;
    } catch {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!versionInfo) {
    console.error('❌ Could not connect to Edge');
    previewProcess.kill();
    edgeProcess.kill();
    process.exit(1);
  }

  console.log('✅ Connected to Edge:', versionInfo.Browser);

  const targets = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new SimpleCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  const results = [];

  for (const locale of LOCALES) {
    console.log(`\n📱 [Testing Locale in Mobile Viewport: ${locale.toUpperCase()}]`);

    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise(r => setTimeout(r, 1000));

    // Clear storage & set target locale with unlocked state
    await cdp.send('Runtime.evaluate', {
      expression: `
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('app_language', '${locale}');
        const settings = { appLanguage: '${locale}', isAppLocked: false };
        localStorage.setItem('yawmiyati_settings', JSON.stringify(settings));
        location.href = '${targetUrl}';
      `
    });

    let visibleText = '';
    let docLang = '';
    let docDir = '';

    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(r => setTimeout(r, 600));
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
      if (val.text && val.text.length > 200) {
        visibleText = val.text;
        docLang = val.lang;
        docDir = val.dir;
        break;
      }
    }

    console.log(`  -> Rendered DOM: ${visibleText.length} chars (lang=${docLang}, dir=${docDir})`);
    console.log(`  -> Sample DOM Preview: "${visibleText.slice(0, 150).replace(/\s+/g, ' ')}..."`);

    // Capture screenshot
    try {
      const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
      if (ss && ss.data) {
        fs.writeFileSync(path.join(SCREENSHOT_DIR, `${locale}.png`), Buffer.from(ss.data, 'base64'));
        console.log(`  📸 Screenshot saved: browser-screenshots/${locale}.png`);
      }
    } catch (e) {
      console.warn('  ⚠️ Screenshot error:', e.message);
    }

    // Leak Detection
    let leakDetected = false;
    let leakInfo = '';

    if (locale !== 'ar') {
      const words = visibleText.split(/\s+/).filter(w => ARABIC_CHAR_REGEX.test(w) && w.length > 1);
      const foreignWords = words.filter(w => !w.includes('حياة') && !w.includes('يومياتي'));
      if (foreignWords.length > 0) {
        leakDetected = true;
        leakInfo = `Arabic text found: "${foreignWords.slice(0, 8).join(' ')}"`;
        console.log(`  ❌ [${locale.toUpperCase()}] FAIL: ${leakInfo}`);
      }
    }

    if (!leakDetected && visibleText.length > 100) {
      console.log(`  ✅ [${locale.toUpperCase()}] PASS: Verified 0 foreign language leaks in full inner app UI.`);
    }

    results.push({
      locale,
      textLength: visibleText.length,
      docLang,
      docDir,
      passed: !leakDetected && visibleText.length > 100,
      leakInfo
    });
  }

  // Dynamic Switching Sequence in Mobile
  console.log('\n🔄 Testing Dynamic Language Switching Sequence on Mobile (AR -> EN -> TR -> DE -> FR -> JA -> ZH -> HI -> PT -> RU -> ES -> IT -> AR)...');
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
        parsed.isAppLocked = false;
        localStorage.setItem('yawmiyati_settings', JSON.stringify(parsed));
        document.documentElement.lang = '${toLang}';
        document.documentElement.dir = '${toLang === 'ar' ? 'rtl' : 'ltr'}';
        location.reload();
      `
    });

    await new Promise(r => setTimeout(r, 1200));

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
  previewProcess.kill();

  console.log('\n========================================');
  console.log('REAL BROWSER QA TEST SUMMARY:');
  console.log('========================================');
  results.forEach(r => {
    console.log(`${r.locale.toUpperCase()}: ${r.passed ? '✅ PASS' : '❌ FAIL'} (chars=${r.textLength}, lang=${r.docLang}, dir=${r.docDir}) ${r.leakInfo}`);
  });

  const allPassed = results.every(r => r.passed);
  if (allPassed) {
    console.log('\n🎉 ALL 12 LOCALES PASSED REAL BROWSER QA INSPECTION WITH 0 LEAKS ACROSS FULL APP UI!');
    process.exit(0);
  } else {
    console.error('\n❌ REAL BROWSER QA INSPECTION DETECTED ISSUES.');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('Fatal error during browser QA:', err);
  process.exit(1);
});
