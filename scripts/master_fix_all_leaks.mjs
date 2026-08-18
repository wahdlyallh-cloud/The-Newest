/**
 * MASTER FIX: Comprehensive Arabic Leak Elimination
 * Fixes all remaining hardcoded Arabic UI strings across components
 */
import fs from 'fs';
import path from 'path';

const SRC = './src';
let totalFixes = 0;
const log = (msg) => console.log(msg);

// ================================================
// STEP 1: Fix HabitSettingsScreen.tsx
// ================================================
{
  const file = `${SRC}/components/HabitSettingsScreen.tsx`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  c = c.replace(
    'showToast(newValue ? `تم تفعيل: ${label}` : `تم تعطيل: ${label}`);',
    'showToast(`${newValue ? (t.settingEnabled || "Enabled") : (t.settingDisabled || "Disabled")}: ${label}`);'
  );
  c = c.replace("showToast('تم تصدير النسخة الاحتياطية JSON بنجاح! 📥');", "showToast(t.exportJsonSuccess || 'JSON backup exported! 📥');");
  c = c.replace("showToast('تم تصدير بيانات CSV بنجاح! 📊');", "showToast(t.exportCsvSuccess || 'CSV exported! 📊');");
  c = c.replace("showToast('تم استيراد النسخة الاحتياطية بنجاح! 🎉');", "showToast(t.importBackupSuccess || 'Backup imported! 🎉');");
  c = c.replace("showToast('تم قراءة ملف CSV بنجاح! 📄');", "showToast(t.importCsvSuccess || 'CSV read! 📄');");
  
  // Fix remaining Arabic in the file
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
    totalFixes += n;
    log(`✅ HabitSettingsScreen.tsx: fixed ${n} Arabic chars`);
  }
}

// ================================================
// STEP 2: Fix GeminiKeyModal.tsx
// ================================================
{
  const file = `${SRC}/components/GeminiKeyModal.tsx`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  
  // Add getTranslation import if not there
  if (!c.includes('getTranslation')) {
    c = c.replace("import { getLanguageInfo", "import { getLanguageInfo, getTranslation");
  }
  
  // Add t = getTranslation(appLanguage) if not present
  if (!c.includes('const t = getTranslation')) {
    c = c.replace(
      'const langInfo = getLanguageInfo(appLanguage',
      'const t = getTranslation(appLanguage);\n  const langInfo = getLanguageInfo(appLanguage'
    );
  }
  
  c = c.replace("alert('الحد الأقصى لمفتايح API هو 5 مفاتيح فقط.');", "alert(t.apiKeyMaxLimitAlert || 'Maximum 5 API keys allowed.');");
  c = c.replace("name: 'المفتاح الرئيسي',", "name: t.mainApiKeyLabel || 'Primary Key',");
  c = c.replace(
    /name: newKeyName\.trim\(\) \|\| `المفتاح \${keysList\.length \+ 1}`/,
    "name: newKeyName.trim() || `${t.apiKeyLabel || 'Key'} ${keysList.length + 1}`"
  );
  
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
    totalFixes += n;
    log(`✅ GeminiKeyModal.tsx: fixed ${n} Arabic chars`);
  }
}

// ================================================
// STEP 3: Fix LockScreenAthkarOverlay.tsx
// ================================================
{
  const file = `${SRC}/components/LockScreenAthkarOverlay.tsx`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  
  // Check if it imports appLanguage prop and getTranslation
  if (!c.includes('getTranslation')) {
    c = c.replace(
      /^import React/m,
      "import { getTranslation } from '../lib/languages';\nimport React"
    );
  }
  
  // Find where it destructures props and add t
  if (!c.includes('const t = getTranslation') && c.includes('appLanguage')) {
    c = c.replace(
      /const\s+(langInfo\s*=|isDarkMode\s*=|isStar)/,
      'const t = getTranslation(appLanguage);\n  const $1'
    );
  }
  
  // Replace category labels
  c = c.replace("{ key: 'morning', label: 'أذكار الصباح', icon: Sun }", "{ key: 'morning', label: t.morningAthkarLabel || 'Morning Dhikr', icon: Sun }");
  c = c.replace("{ key: 'evening', label: 'أذكار المساء', icon: Moon }", "{ key: 'evening', label: t.eveningAthkarLabel || 'Evening Dhikr', icon: Moon }");
  c = c.replace("{ key: 'general', label: 'السبحة العامة', icon: Sparkles }", "{ key: 'general', label: t.generalDhikrLabel || 'General Dhikr', icon: Sparkles }");
  
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
    totalFixes += n;
    log(`✅ LockScreenAthkarOverlay.tsx: fixed ${n} Arabic chars`);
  }
}

// ================================================
// STEP 4: Fix SmartAdvisor.tsx
// ================================================
{
  const file = `${SRC}/components/SmartAdvisor.tsx`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  
  c = c.replace(
    "? 'المتصفح لا يدعم ميزة التعرف التلقائي على الصوت.'",
    "? (t?.speechNotSupported || 'Speech recognition not supported in this browser.')"
  );
  
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
    totalFixes += n;
    log(`✅ SmartAdvisor.tsx: fixed ${n} Arabic chars`);
  }
}

// ================================================
// STEP 5: Fix apiKeyManager.ts - make error messages language-neutral codes
// ================================================
{
  const file = `${SRC}/lib/apiKeyManager.ts`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  
  c = c.replace(/name:\s*'المفتاح الرئيسي'/g, "name: 'Primary Key'");
  c = c.replace(
    /return \{ success: false, message: 'مفتاح API فارغ\.?' \};/g,
    "return { success: false, message: 'API_KEY_EMPTY' };"
  );
  c = c.replace(
    /message: 'المفتاح يعمل بنجاح[^']*'/g,
    "message: 'API_KEY_VALID'"
  );
  c = c.replace(
    /message: 'مفتاح API غير صالح[^']*'/g,
    "message: 'API_KEY_INVALID'"
  );
  c = c.replace(
    /message: 'تم تجاوز حد الحصة[^']*'/g,
    "message: 'API_KEY_QUOTA_EXHAUSTED'"
  );
  c = c.replace(
    /message: `فشل الاتصال: \${[^}]+}`/g,
    "message: `CONNECTION_FAILED: ${rawMsg}`"
  );
  c = c.replace(
    /message: `فشل الاتصال بالشبكة: \${[^}]+}`/g,
    "message: `NETWORK_ERROR: ${e?.message || String(e)}`"
  );
  
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
    totalFixes += n;
    log(`✅ apiKeyManager.ts: fixed ${n} Arabic chars`);
  }
}

// ================================================
// STEP 6: Fix biometrics.ts
// ================================================
{
  const file = `${SRC}/lib/biometrics.ts`;
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf-8');
    const before = c;
    c = c.replace(/error:\s*nativeErr\?\.message \|\| 'فشلت قراءة البصمة[^']*'/g, "error: nativeErr?.message || 'BIOMETRIC_READ_FAILED'");
    c = c.replace(/error:\s*check\.reason \|\| 'البيئة الحالية لا تدعم البصمة'/g, "error: check.reason || 'BIOMETRIC_NOT_SUPPORTED'");
    c = c.replace(/'تم رفض إذن البصمة[^']*'/g, "'BIOMETRIC_PERMISSION_DENIED'");
    c = c.replace(/'البصمة غير متاحة حالياً[^']*'/g, "'BIOMETRIC_UNAVAILABLE'");
    if (c !== before) {
      fs.writeFileSync(file, c, 'utf-8');
      const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
      totalFixes += n;
      log(`✅ biometrics.ts: fixed ${n} Arabic chars`);
    }
  }
}

// ================================================
// STEP 7: Fix fetchInterceptor.ts - critical error strings  
// ================================================
{
  const file = `${SRC}/lib/fetchInterceptor.ts`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  
  c = c.replace("throw new Error('يرجى التحقق من مفتاح API في الإعدادات');", "throw new Error('API_KEY_MISSING_CHECK_SETTINGS');");
  c = c.replace("if (!responseText || !responseText.trim()) throw new Error('استجابة فارغة من خادم الذكاء الاصطناعي');", "if (!responseText || !responseText.trim()) throw new Error('AI_EMPTY_RESPONSE');");
  c = c.replace("return 'لقد تجاوزت حد الاستخدام اليومي المجاني';", "return '__AI_QUOTA_EXCEEDED__';");
  c = c.replace("return 'يرجى التحقق من مفتاح API في الإعدادات';", "return '__AI_CHECK_API_KEY__';");
  
  // Fix the Arabic habit format string in the prompt
  c = c.replace(
    /return `- العادة: "\$\{h\.name\}" \[التصنيف: \$\{h\.category\}\]\\n  عدد مرات الإنجاز الكلي: \$\{totalDone\}\\n  تفاصيل أيام الالتزام: \$\{JSON\.stringify\(h\.history \|\| \{\}\)\}`;/g,
    "return `- Habit: \"${h.name}\" [Category: ${h.category}]\\n  Total completions: ${totalDone}\\n  History: ${JSON.stringify(h.history || {})}`;");
  
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const n = (before.match(/[\u0600-\u06FF]/g)||[]).length - (c.match(/[\u0600-\u06FF]/g)||[]).length;
    totalFixes += n;
    log(`✅ fetchInterceptor.ts: fixed ${n} Arabic chars`);
  }
}

// ================================================
// STEP 8: Fix FullAthkarModal.tsx - UI strings only (NOT the Athkar texts)
// ================================================
{
  const file = `${SRC}/components/FullAthkarModal.tsx`;
  let c = fs.readFileSync(file, 'utf-8');
  const before = c;
  
  // Add appLanguage prop and import
  if (!c.includes('getTranslation')) {
    c = c.replace(
      "import { updateAthkarContextOnTap } from '../services/aiAthkarSync';",
      "import { updateAthkarContextOnTap } from '../services/aiAthkarSync';\nimport { getTranslation } from '../lib/languages';\nimport type { AppLanguage } from '../types';"
    );
  }
  
  // Add appLanguage to props interface
  if (!c.includes('appLanguage?:')) {
    c = c.replace(
      "interface FullAthkarModalProps {\n  isOpen: boolean;\n  onClose: () => void;\n  initialTab?: string;\n}",
      "interface FullAthkarModalProps {\n  isOpen: boolean;\n  onClose: () => void;\n  initialTab?: string;\n  appLanguage?: AppLanguage;\n}"
    );
    c = c.replace(
      "export default function FullAthkarModal({ isOpen, onClose, initialTab = 'morning' }: FullAthkarModalProps)",
      "export default function FullAthkarModal({ isOpen, onClose, initialTab = 'morning', appLanguage = 'ar' }: FullAthkarModalProps)"
    );
    // Add t = getTranslation after the function start
    c = c.replace(
      "const [activeTab, setActiveTab] = useState<string>(() => {",
      "const t = getTranslation(appLanguage);\n  const [activeTab, setActiveTab] = useState<string>(() => {"
    );
  }
  
  // UI strings to translate (NOT the religious Dhikr texts)
  c = c.replace(/<span className="font-sans">رجوع<\/span>/g, '<span className="font-sans">{t.back || "Back"}</span>');
  c = c.replace(/>مزامنة حية للذكاء الاصطناعي وحفظ تلقائي</g, '>{t.aiLiveSyncAutoSave || "Live AI sync & auto-save"}<');
  c = c.replace(/>تصفير القسم الحالي</g, '>{t.resetCurrentSection || "Reset current section"}<');
  c = c.replace(
    /<span>{isCompleted \? 'اكتمل الذكر ✨' : 'اضغط للعد'}<\/span>/g,
    '<span>{isCompleted ? (t.dhikrCompleted || "Completed ✨") : (t.tapToCount || "Tap to count")}</span>'
  );
  c = c.replace(/>إعادة</g, '>{t.reset || "Reset"}<');
  c = c.replace(/title="إعادة ضبط هذا الذكر"/g, 'title={t.resetThisDhikr || "Reset this dhikr"}');
  c = c.replace(/title="الرجوع للخلف"/g, 'title={t.back || "Back"}');
  c = c.replace(/>حصن المسلم</g, '>{t.hisnAlMuslimTitle || "Hisn Al-Muslim"}<');
  
  // Fix the edit/add custom dhikr modal labels (UI strings)
  c = c.replace(
    /{editingItem \? 'تعديل الذكر المخصص' : 'إضافة ذكر جديد \(\+\)'}/g,
    '{editingItem ? (t.editCustomDhikr || "Edit Custom Dhikr") : (t.addNewDhikr || "Add New Dhikr (+)")}'
  );
  c = c.replace(/>نص الذكر \/ الدعاء:<\/label>/g, '>{t.dhikrTextLabel || "Dhikr / Supplication text:"}</label>');
  c = c.replace(/>تحديد القسم المعني:<\/label>/g, '>{t.selectCategory || "Select category:"}</label>');
  c = c.replace(/>العدد المطلوب \(تكرار العداد\):<\/label>/g, '>{t.targetCount || "Target count (repetitions):"}</label>');
  c = c.replace(/>فضل الذكر \/ ملاحظة \(اختياري\):<\/label>/g, '>{t.dhikrVirtueOptional || "Virtue / note (optional):"}</label>');
  c = c.replace(/>إلغاء</g, '>{t.cancel || "Cancel"}<');
  c = c.replace(/>حفظ الذكر</g, '>{t.saveDhikr || "Save Dhikr"}<');
  c = c.replace(/>أعداد سريعة:<\/span>/g, '>{t.quickCounts || "Quick counts:"}</span>');
  c = c.replace(/><strong>الفضل:<\/strong>/g, '><strong>{t.virtue || "Virtue"}:</strong>');
  c = c.replace(/المصدر: {item\.source}/g, '{t.source || "Source"}: {item.source}');
  c = c.replace(
    /placeholder="أدخل نص الذكر أو الدعاء هنا\.\.\."/g,
    'placeholder={t.enterDhikrText || "Enter dhikr or supplication text..."}'
  );
  c = c.replace(
    /placeholder="مثال: من قالها غفرت ذنوبه\.\.\."/g,
    'placeholder={t.dhikrVirtuePlaceholder || "e.g., Whoever says this..."}'
  );
  c = c.replace(
    /placeholder="أدخل أي عدد مخصص\.\.\."/g,
    'placeholder={t.enterCustomCount || "Enter any custom count..."}'
  );
  c = c.replace(/<span className="absolute left-3[^>]+>مرة/g, (m) => m.replace('>مرة', '>{t.times || "×"}'));
  
  // Fix ALL_CATEGORY_OPTIONS labels
  c = c.replace(
    "export const ALL_CATEGORY_OPTIONS = [\n  { key: 'general', label: 'السبحة العامة' },\n  { key: 'morning', label: 'أذكار الصباح' },\n  { key: 'evening', label: 'أذكار المساء' },\n  { key: 'salawat', label: 'الصلاة على النبي' },\n  { key: 'istighfar', label: 'الاستغفار' },\n  { key: 'hawqala', label: 'الحوقلة' },\n  { key: 'baqiyat', label: 'الباقيات الصالحات' },\n  { key: 'younus', label: 'دعاء يونس' },\n  { key: 'tawheed', label: 'ذكر التوحيد' },\n  { key: 'post_prayer', label: 'أذكار بعد الصلاة' },\n  { key: 'sleep', label: 'أذكار النوم' },\n  { key: 'custom', label: 'أذكاري الخاصة' },\n];",
    `export const ALL_CATEGORY_KEYS = ['general','morning','evening','salawat','istighfar','hawqala','baqiyat','younus','tawheed','post_prayer','sleep','custom'] as const;

export const ATHKAR_CATEGORY_LABELS: Record<string, Record<string, string>> = {
  general:     { ar: 'السبحة العامة',       en: 'General Counter',     fr: 'Compteur général',      de: 'Allgemeiner Zähler',       es: 'Contador general',         it: 'Contatore generale',    tr: 'Genel Sayaç',          pt: 'Contador geral',         ru: 'Общий счётчик',       ja: '一般カウンター',   zh: '通用计数器',   hi: 'सामान्य काउंटर' },
  morning:     { ar: 'أذكار الصباح',        en: 'Morning Remembrance', fr: 'Invocations du matin',  de: 'Morgengedenken',            es: 'Recuerdos matutinos',      it: 'Mattino',               tr: 'Sabah Zikirleri',      pt: 'Invocações matinais',    ru: 'Утренние',            ja: '朝の祈り',       zh: '晨间祈念',     hi: 'सुबह की दुआ' },
  evening:     { ar: 'أذكار المساء',        en: 'Evening Remembrance', fr: 'Invocations du soir',   de: 'Abendgedenken',             es: 'Recuerdos vespertinos',    it: 'Sera',                  tr: 'Akşam Zikirleri',      pt: 'Invocações vespertinas', ru: 'Вечерние',            ja: '夕べの祈り',     zh: '晚间祈念',     hi: 'शाम की दुआ' },
  salawat:     { ar: 'الصلاة على النبي',   en: 'Prayers on the Prophet', fr: 'Bénédictions sur le Prophète', de: 'Segenswünsche für den Propheten', es: 'Bendiciones al Profeta', it: 'Benedizioni al Profeta', tr: 'Peygambere Salat', pt: 'Bênçãos ao Profeta', ru: 'Молитвы о Пророке', ja: '預言者への祈り', zh: '对先知的祝福', hi: 'नबी पर दुरूद' },
  istighfar:   { ar: 'الاستغفار',           en: 'Seeking Forgiveness',  fr: 'Demande de pardon',     de: 'Vergebung suchen',          es: 'Buscar perdón',            it: 'Chiedere perdono',      tr: 'İstiğfar',             pt: 'Buscar perdão',          ru: 'Прошение прощения',   ja: '許しを求める',   zh: '祈求饶恕',     hi: 'क्षमा माँगना' },
  hawqala:     { ar: 'الحوقلة',             en: 'Hawqala',              fr: 'Hawqala',               de: 'Hawqala',                   es: 'Hawqala',                  it: 'Hawqala',               tr: 'Havkale',              pt: 'Hawqala',                ru: 'Хаукала',             ja: 'ハウカラ',       zh: '赞主词',       hi: 'हौकला' },
  baqiyat:     { ar: 'الباقيات الصالحات', en: 'Lasting Good Deeds',   fr: 'Bonnes œuvres durables', de: 'Bleibende gute Taten',      es: 'Buenas obras duraderas',   it: 'Opere buone durature',  tr: 'Baki Salihler',        pt: 'Boas obras duradouras',  ru: 'Вечные добрые дела', ja: '永続する善行',   zh: '长存善行',     hi: 'स्थायी नेक अमल' },
  younus:      { ar: 'دعاء يونس',           en: 'Du\'a of Yunus',       fr: 'Supplication de Yunus', de: 'Du\'a von Yunus',           es: 'Du\'a de Yunus',           it: 'Du\'a di Yunus',        tr: 'Yunus Duası',          pt: 'Du\'a de Yunus',         ru: 'Ду\'а Юнуса',         ja: 'ユーヌスの祈り', zh: '尤努斯的祈祷', hi: 'युनुस की दुआ' },
  tawheed:     { ar: 'ذكر التوحيد',        en: 'Tawheed Remembrance',  fr: 'Rappel de la Unicité',  de: 'Tawheed-Gedenken',          es: 'Recuerdo del Tawheed',     it: 'Tawheed',               tr: 'Tevhid Zikri',         pt: 'Tawheed',                ru: 'Таухид',              ja: 'タウヒード',     zh: '认主独一',     hi: 'तौहीद का जिक्र' },
  post_prayer: { ar: 'أذكار بعد الصلاة',  en: 'Post-Prayer Dhikr',    fr: 'Dhikr après la prière', de: 'Dhikr nach dem Gebet',      es: 'Dhikr después de la oración', it: 'Dhikr dopo la preghiera', tr: 'Namaz Sonrası Zikir', pt: 'Dhikr após a oração', ru: 'Зикр после молитвы', ja: '礼拝後のズィクル', zh: '礼拜后祈念', hi: 'नमाज़ के बाद जिक्र' },
  sleep:       { ar: 'أذكار النوم',         en: 'Sleep Remembrance',    fr: 'Invocations du sommeil', de: 'Schlafgedenken',            es: 'Recuerdos para dormir',    it: 'Dhikr del sonno',       tr: 'Uyku Zikirleri',       pt: 'Invocações do sono',     ru: 'Утренние сна',        ja: '就寝の祈り',     zh: '睡前祈念',     hi: 'सोने की दुआ' },
  custom:      { ar: 'أذكاري الخاصة',      en: 'My Custom Dhikr',      fr: 'Mes dhikrs personnels', de: 'Mein eigener Dhikr',        es: 'Mi dhikr personalizado',   it: 'Il mio dhikr',          tr: 'Özel Zikirlerim',      pt: 'Meus dhikrs personalizados', ru: 'Мой зикр',          ja: 'カスタムズィクル', zh: '我的自定义祈念', hi: 'मेरा जिक्र' }
};

export function getAthkarCategoryLabel(key: string, lang: string): string {
  return ATHKAR_CATEGORY_LABELS[key]?.[lang] || ATHKAR_CATEGORY_LABELS[key]?.en || key;
}

// Backward-compat: keep ALL_CATEGORY_OPTIONS but NOTE: labels are now Arabic only; use getAthkarCategoryLabel() for UI
export const ALL_CATEGORY_OPTIONS = ALL_CATEGORY_KEYS.map(key => ({
  key,
  label: ATHKAR_CATEGORY_LABELS[key]?.ar || key
}));`
  );
  
  // Now update the category options rendering in the form to use appLanguage
  c = c.replace(
    '{ALL_CATEGORY_OPTIONS.map(opt => (\n                      <option key={opt.key} value={opt.key} className="bg-zinc-900 text-amber-100">\n                        {opt.label}\n                      </option>\n                    ))}',
    '{ALL_CATEGORY_KEYS.map(key => (\n                      <option key={key} value={key} className="bg-zinc-900 text-amber-100">\n                        {getAthkarCategoryLabel(key, appLanguage)}\n                      </option>\n                    ))}'
  );
  
  if (c !== before) {
    fs.writeFileSync(file, c, 'utf-8');
    const arabicBefore = (before.match(/[\u0600-\u06FF]/g)||[]).length;
    const arabicAfter = (c.match(/[\u0600-\u06FF]/g)||[]).length;
    const n = arabicBefore - arabicAfter;
    totalFixes += n;
    log(`✅ FullAthkarModal.tsx: fixed ${n} Arabic chars (${arabicAfter} remain - these are the Dhikr texts themselves)`);
  }
}

// ================================================
// STEP 9: Add new keys to languages.ts
// ================================================
{
  const file = `${SRC}/lib/languages.ts`;
  let c = fs.readFileSync(file, 'utf-8');
  
  const NEW_KEYS = {
    settingEnabled:      { ar: 'تم التفعيل', en: 'Enabled', fr: 'Activé', de: 'Aktiviert', es: 'Activado', it: 'Attivato', tr: 'Etkinleştirildi', pt: 'Ativado', ru: 'Включено', ja: '有効化', zh: '已启用', hi: 'सक्षम' },
    settingDisabled:     { ar: 'تم التعطيل', en: 'Disabled', fr: 'Désactivé', de: 'Deaktiviert', es: 'Desactivado', it: 'Disattivato', tr: 'Devre Dışı', pt: 'Desativado', ru: 'Отключено', ja: '無効化', zh: '已禁用', hi: 'अक्षम' },
    exportJsonSuccess:   { ar: 'تم تصدير النسخة الاحتياطية JSON بنجاح! 📥', en: 'JSON backup exported! 📥', fr: 'Sauvegarde JSON exportée ! 📥', de: 'JSON-Sicherung exportiert! 📥', es: '¡JSON exportado con éxito! 📥', it: 'JSON esportato! 📥', tr: 'JSON yedeği dışa aktarıldı! 📥', pt: 'JSON exportado! 📥', ru: 'JSON-резервная копия экспортирована! 📥', ja: 'JSONがエクスポートされました！📥', zh: 'JSON导出成功！📥', hi: 'JSON निर्यात! 📥' },
    exportCsvSuccess:    { ar: 'تم تصدير بيانات CSV بنجاح! 📊', en: 'CSV exported! 📊', fr: 'CSV exporté ! 📊', de: 'CSV exportiert! 📊', es: '¡CSV exportado! 📊', it: 'CSV esportato! 📊', tr: 'CSV dışa aktarıldı! 📊', pt: 'CSV exportado! 📊', ru: 'CSV экспортирован! 📊', ja: 'CSVがエクスポートされました！📊', zh: 'CSV导出成功！📊', hi: 'CSV निर्यात! 📊' },
    importBackupSuccess: { ar: 'تم استيراد النسخة الاحتياطية بنجاح! 🎉', en: 'Backup imported! 🎉', fr: 'Sauvegarde importée ! 🎉', de: 'Sicherung importiert! 🎉', es: '¡Copia de seguridad importada! 🎉', it: 'Backup importato! 🎉', tr: 'Yedek içe aktarıldı! 🎉', pt: 'Backup importado! 🎉', ru: 'Резервная копия импортирована! 🎉', ja: 'バックアップがインポートされました！🎉', zh: '备份导入成功！🎉', hi: 'बैकअप आयात! 🎉' },
    importCsvSuccess:    { ar: 'تم قراءة ملف CSV بنجاح! 📄', en: 'CSV read! 📄', fr: 'CSV lu ! 📄', de: 'CSV gelesen! 📄', es: '¡CSV leído! 📄', it: 'CSV letto! 📄', tr: 'CSV okundu! 📄', pt: 'CSV lido! 📄', ru: 'CSV прочитан! 📄', ja: 'CSVが読み込まれました！📄', zh: 'CSV读取成功！📄', hi: 'CSV पढ़ा! 📄' },
    apiKeyMaxLimitAlert: { ar: 'الحد الأقصى لمفاتيح API هو 5 مفاتيح فقط.', en: 'Maximum 5 API keys allowed.', fr: '5 clés API maximum.', de: 'Maximal 5 API-Schlüssel.', es: 'Máximo 5 claves API.', it: 'Massimo 5 chiavi API.', tr: 'Maksimum 5 API anahtarı.', pt: 'Máximo 5 chaves API.', ru: 'Максимум 5 API-ключей.', ja: 'APIキーは最大5個。', zh: '最多5个API密钥。', hi: 'अधिकतम 5 API कुंजियाँ।' },
    mainApiKeyLabel:     { ar: 'المفتاح الرئيسي', en: 'Primary Key', fr: 'Clé principale', de: 'Hauptschlüssel', es: 'Clave principal', it: 'Chiave principale', tr: 'Birincil Anahtar', pt: 'Chave principal', ru: 'Основной ключ', ja: 'プライマリキー', zh: '主密钥', hi: 'प्राथमिक कुंजी' },
    apiKeyLabel:         { ar: 'المفتاح', en: 'Key', fr: 'Clé', de: 'Schlüssel', es: 'Clave', it: 'Chiave', tr: 'Anahtar', pt: 'Chave', ru: 'Ключ', ja: 'キー', zh: '密钥', hi: 'कुंजी' },
    speechNotSupported:  { ar: 'المتصفح لا يدعم ميزة التعرف على الصوت.', en: 'Speech recognition not supported.', fr: 'Reconnaissance vocale non prise en charge.', de: 'Spracherkennung nicht unterstützt.', es: 'Reconocimiento de voz no admitido.', it: 'Riconoscimento vocale non supportato.', tr: 'Konuşma tanıma desteklenmiyor.', pt: 'Reconhecimento de voz não suportado.', ru: 'Распознавание речи не поддерживается.', ja: '音声認識非対応。', zh: '不支持语音识别。', hi: 'वाक् पहचान समर्थित नहीं।' },
    morningAthkarLabel:  { ar: 'أذكار الصباح', en: 'Morning Remembrance', fr: 'Invocations du matin', de: 'Morgengedenken', es: 'Recuerdos matutinos', it: 'Invocazioni del mattino', tr: 'Sabah Zikirleri', pt: 'Invocações matinais', ru: 'Утренние поминания', ja: '朝の祈り', zh: '晨间祈念', hi: 'सुबह की दुआ' },
    eveningAthkarLabel:  { ar: 'أذكار المساء', en: 'Evening Remembrance', fr: 'Invocations du soir', de: 'Abendgedenken', es: 'Recuerdos vespertinos', it: 'Invocazioni della sera', tr: 'Akşam Zikirleri', pt: 'Invocações vespertinas', ru: 'Вечерние поминания', ja: '夕べの祈り', zh: '晚间祈念', hi: 'शाम की दुआ' },
    generalDhikrLabel:   { ar: 'السبحة العامة', en: 'General Dhikr', fr: 'Dhikr général', de: 'Allgemeiner Dhikr', es: 'Dhikr general', it: 'Dhikr generale', tr: 'Genel Zikir', pt: 'Dhikr geral', ru: 'Общий зикр', ja: '一般ズィクル', zh: '通用念珠', hi: 'सामान्य जिक्र' },
    aiLiveSyncAutoSave:  { ar: 'مزامنة حية للذكاء الاصطناعي وحفظ تلقائي', en: 'Live AI sync & auto-save', fr: 'Sync IA en direct & sauvegarde auto', de: 'Live-KI-Sync & Auto-Speicherung', es: 'Sincronización IA en vivo y guardado automático', it: 'Sincronizzazione IA live e salvataggio automatico', tr: 'Canlı AI senkronizasyonu ve otomatik kayıt', pt: 'Sincronização IA ao vivo e salvamento automático', ru: 'Живая синхронизация ИИ и автосохранение', ja: 'ライブAI同期と自動保存', zh: '实时AI同步和自动保存', hi: 'लाइव AI सिंक और ऑटो-सेव' },
    resetCurrentSection: { ar: 'تصفير القسم الحالي', en: 'Reset current section', fr: 'Réinitialiser la section', de: 'Aktuellen Abschnitt zurücksetzen', es: 'Restablecer sección actual', it: 'Reimposta sezione corrente', tr: 'Mevcut bölümü sıfırla', pt: 'Redefinir seção atual', ru: 'Сбросить текущий раздел', ja: '現在のセクションをリセット', zh: '重置当前部分', hi: 'वर्तमान अनुभाग रीसेट करें' },
    dhikrCompleted:      { ar: 'اكتمل الذكر ✨', en: 'Completed ✨', fr: 'Complété ✨', de: 'Abgeschlossen ✨', es: 'Completado ✨', it: 'Completato ✨', tr: 'Tamamlandı ✨', pt: 'Concluído ✨', ru: 'Завершено ✨', ja: '完了 ✨', zh: '已完成 ✨', hi: 'पूर्ण ✨' },
    tapToCount:          { ar: 'اضغط للعد', en: 'Tap to count', fr: 'Appuyez pour compter', de: 'Zum Zählen tippen', es: 'Toca para contar', it: 'Tocca per contare', tr: 'Saymak için dokun', pt: 'Toque para contar', ru: 'Нажмите для счёта', ja: 'タップして数える', zh: '点击计数', hi: 'गिनने के लिए टैप करें' },
    resetThisDhikr:      { ar: 'إعادة ضبط هذا الذكر', en: 'Reset this dhikr', fr: 'Réinitialiser ce dhikr', de: 'Diesen Dhikr zurücksetzen', es: 'Restablecer este dhikr', it: 'Reimposta questo dhikr', tr: 'Bu zikri sıfırla', pt: 'Redefinir este dhikr', ru: 'Сбросить этот зикр', ja: 'このズィクルをリセット', zh: '重置此念珠', hi: 'इस जिक्र को रीसेट करें' },
    hisnAlMuslimTitle:   { ar: 'حصن المسلم', en: 'Hisn Al-Muslim', fr: 'Hisn Al-Muslim', de: 'Hisn Al-Muslim', es: 'Hisn Al-Muslim', it: 'Hisn Al-Muslim', tr: 'Hısn\'ül Müslim', pt: 'Hisn Al-Muslim', ru: 'Хисн аль-Муслим', ja: 'ヒスン・アル・ムスリム', zh: '穆斯林堡垒', hi: 'हिस्न अल-मुस्लिम' },
    editCustomDhikr:     { ar: 'تعديل الذكر المخصص', en: 'Edit Custom Dhikr', fr: 'Modifier le dhikr', de: 'Dhikr bearbeiten', es: 'Editar dhikr', it: 'Modifica dhikr', tr: 'Özel zikri düzenle', pt: 'Editar dhikr', ru: 'Редактировать зикр', ja: 'ズィクルを編集', zh: '编辑念珠', hi: 'जिक्र संपादित करें' },
    addNewDhikr:         { ar: 'إضافة ذكر جديد (+)', en: 'Add New Dhikr (+)', fr: 'Ajouter un dhikr (+)', de: 'Neuen Dhikr hinzufügen (+)', es: 'Añadir nuevo dhikr (+)', it: 'Aggiungi nuovo dhikr (+)', tr: 'Yeni zikir ekle (+)', pt: 'Adicionar novo dhikr (+)', ru: 'Добавить новый зикр (+)', ja: '新しいズィクルを追加 (+)', zh: '添加新念珠 (+)', hi: 'नया जिक्र जोड़ें (+)' },
    dhikrTextLabel:      { ar: 'نص الذكر / الدعاء:', en: 'Dhikr / Supplication text:', fr: 'Texte du dhikr :', de: 'Dhikr-Text:', es: 'Texto del dhikr:', it: 'Testo dhikr:', tr: 'Zikir metni:', pt: 'Texto do dhikr:', ru: 'Текст зикра:', ja: 'ズィクルのテキスト:', zh: '念珠文本：', hi: 'जिक्र पाठ:' },
    selectCategory:      { ar: 'تحديد القسم المعني:', en: 'Select category:', fr: 'Sélectionner la catégorie :', de: 'Kategorie auswählen:', es: 'Seleccionar categoría:', it: 'Seleziona categoria:', tr: 'Kategori seç:', pt: 'Selecionar categoria:', ru: 'Выберите категорию:', ja: 'カテゴリを選択:', zh: '选择分类：', hi: 'श्रेणी चुनें:' },
    targetCount:         { ar: 'العدد المطلوب (تكرار العداد):', en: 'Target count (repetitions):', fr: 'Nombre cible (répétitions) :', de: 'Zielanzahl (Wiederholungen):', es: 'Número objetivo (repeticiones):', it: 'Numero target (ripetizioni):', tr: 'Hedef sayı (tekrarlar):', pt: 'Contagem alvo (repetições):', ru: 'Целевое число (повторений):', ja: '目標回数（繰り返し）:', zh: '目标次数（重复）：', hi: 'लक्ष्य गिनती (पुनरावृत्ति):' },
    dhikrVirtueOptional: { ar: 'فضل الذكر / ملاحظة (اختياري):', en: 'Virtue / note (optional):', fr: 'Vertu / note (optionnel) :', de: 'Tugend / Notiz (optional):', es: 'Virtud / nota (opcional):', it: 'Virtù / nota (opzionale):', tr: 'Fazilet / not (isteğe bağlı):', pt: 'Virtude / nota (opcional):', ru: 'Достоинство / примечание (необязательно):', ja: '美徳 / メモ (任意):', zh: '功德/备注（可选）：', hi: 'फज़ीलत / नोट (वैकल्पिक):' },
    saveDhikr:           { ar: 'حفظ الذكر', en: 'Save Dhikr', fr: 'Enregistrer le dhikr', de: 'Dhikr speichern', es: 'Guardar dhikr', it: 'Salva dhikr', tr: 'Zikri kaydet', pt: 'Salvar dhikr', ru: 'Сохранить зикр', ja: 'ズィクルを保存', zh: '保存念珠', hi: 'जिक्र सेव करें' },
    quickCounts:         { ar: 'أعداد سريعة:', en: 'Quick counts:', fr: 'Comptes rapides :', de: 'Schnellzählung:', es: 'Conteos rápidos:', it: 'Conteggi rapidi:', tr: 'Hızlı sayılar:', pt: 'Contagens rápidas:', ru: 'Быстрые значения:', ja: 'クイックカウント:', zh: '快速计数：', hi: 'त्वरित गिनती:' },
    virtue:              { ar: 'الفضل', en: 'Virtue', fr: 'Vertu', de: 'Tugend', es: 'Virtud', it: 'Virtù', tr: 'Fazilet', pt: 'Virtude', ru: 'Достоинство', ja: '美徳', zh: '功德', hi: 'फज़ीलत' },
    source:              { ar: 'المصدر', en: 'Source', fr: 'Source', de: 'Quelle', es: 'Fuente', it: 'Fonte', tr: 'Kaynak', pt: 'Fonte', ru: 'Источник', ja: '出典', zh: '来源', hi: 'स्रोत' },
    enterDhikrText:      { ar: 'أدخل نص الذكر أو الدعاء هنا...', en: 'Enter dhikr or supplication text...', fr: 'Saisissez le texte du dhikr...', de: 'Dhikr-Text eingeben...', es: 'Ingrese el texto del dhikr...', it: 'Inserire il testo dhikr...', tr: 'Zikir metnini girin...', pt: 'Digite o texto do dhikr...', ru: 'Введите текст зикра...', ja: 'ズィクルのテキストを入力...', zh: '输入念珠文本...', hi: 'जिक्र पाठ दर्ज करें...' },
    dhikrVirtuePlaceholder: { ar: 'مثال: من قالها غفرت ذنوبه...', en: 'e.g., Whoever says this...', fr: 'ex. : Celui qui le dit...', de: 'z.B.: Wer dies sagt...', es: 'ej.: Quien lo dice...', it: 'es.: Chi lo dice...', tr: 'örn.: Bunu söyleyen...', pt: 'ex.: Quem diz isso...', ru: 'напр.: Кто скажет это...', ja: '例: これを唱えた人は...', zh: '例如: 谁说这话...', hi: 'उदा.: जो यह कहे...' },
    enterCustomCount:    { ar: 'أدخل أي عدد مخصص...', en: 'Enter any custom count...', fr: 'Entrez un nombre personnalisé...', de: 'Beliebige Anzahl eingeben...', es: 'Ingrese cualquier número...', it: 'Inserire un numero...', tr: 'Herhangi bir sayı girin...', pt: 'Digite qualquer número...', ru: 'Введите любое число...', ja: 'カスタム数を入力...', zh: '输入自定义数量...', hi: 'कोई भी गिनती दर्ज करें...' },
    times:               { ar: 'مرة', en: '×', fr: '×', de: '×', es: '×', it: '×', tr: '×', pt: '×', ru: '×', ja: '回', zh: '次', hi: 'बार' }
  };
  
  let addedCount = 0;
  for (const [key, trans] of Object.entries(NEW_KEYS)) {
    if (!c.includes(`  ${key}:`)) {
      addedCount++;
    }
  }
  
  if (addedCount > 0) {
    // Add to all 12 dicts
    const langs = ['ar','en','fr','de','es','it','tr','pt','ru','ja','zh','hi'];
    for (const lang of langs) {
      const dictName = lang.toUpperCase() + '_DICT';
      const keysBlock = Object.entries(NEW_KEYS)
        .filter(([key]) => !c.includes(`  ${key}:`))
        .map(([key, trans]) => `  ${key}: ${JSON.stringify(trans[lang] || trans.en)},`)
        .join('\n');
      
      if (keysBlock.trim()) {
        // Find closing }; of the dict and inject before it
        const dictEndPattern = new RegExp(`(export const ${dictName}: Record<string, any> = \\{)([\\s\\S]*?)(^\\};)`, 'm');
        c = c.replace(dictEndPattern, (match, open, body, close) => {
          // Only add if not already there
          return `${open}${body}${keysBlock}\n${close}`;
        });
      }
    }
    
    fs.writeFileSync(file, c, 'utf-8');
    log(`✅ languages.ts: Added ${addedCount} new translation keys to all 12 locales`);
  }
}

log(`\n🎯 TOTAL: ${totalFixes} Arabic characters converted from hardcoded to localized`);
log('Now running verification scan...');

// ================================================
// Verification scan
// ================================================
{
  const arabicRegex = /[\u0600-\u06FF]/;
  const SKIP_FILES = ['languages.ts', 'FullAthkarModal.tsx']; // FullAthkarModal keeps religious texts
  
  function getAllFiles(dir) {
    let files = [];
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && item !== 'node_modules') {
        files = files.concat(getAllFiles(full));
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(full);
      }
    }
    return files;
  }
  
  const files = getAllFiles('./src').filter(f => !SKIP_FILES.some(s => f.endsWith(s)));
  let remaining = 0;
  const leakers = [];
  
  files.forEach(f => {
    const c = fs.readFileSync(f, 'utf-8');
    const lines = c.split('\n').filter((l, i) => {
      const t = l.trim();
      if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return false;
      return arabicRegex.test(l);
    });
    if (lines.length > 0) {
      remaining += lines.length;
      leakers.push({ file: f.replace('.\\src\\', 'src/'), count: lines.length });
    }
  });
  
  leakers.sort((a,b) => b.count - a.count);
  log(`\n📊 Remaining Arabic lines after fix: ${remaining} in ${leakers.length} files`);
  leakers.slice(0, 10).forEach(l => log(`  ${l.file}: ${l.count} lines`));
}
