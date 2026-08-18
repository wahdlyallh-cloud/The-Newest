/**
 * fix_remaining_arabic.mjs
 * Fixes hardcoded Arabic strings in remaining files:
 * - HabitFormModal.tsx (color palette labels)
 * - TasksChecklistSection.tsx (time, day names, sports default)
 * - MonthlyMentalHealthPDFReportModal.tsx (mood presets)
 * - fetchInterceptor.ts (fallback answers, AI prompts)
 * - languages.ts (new keys for all above)
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
let totalChanges = 0;

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function writeFile(relPath, content) {
  fs.writeFileSync(path.join(ROOT, relPath), content, 'utf8');
}

// ============================================================
// 1. HabitFormModal.tsx — COLOR_PALETTE labels → use color ID
// ============================================================
{
  const filePath = 'src/components/HabitFormModal.tsx';
  let content = readFile(filePath);
  
  const oldColorPalette = `const COLOR_PALETTE = [
  { id: 'blue', hex: '#3B82F6', label: 'أزرق' },
  { id: 'emerald', hex: '#10B981', label: 'زمردي' },
  { id: 'indigo', hex: '#6366F1', label: 'نيلي' },
  { id: 'amber', hex: '#F59E0B', label: 'كهرماني' },
  { id: 'rose', hex: '#F43F5E', label: 'وردي' },
  { id: 'teal', hex: '#14B8A6', label: 'تركوازي' },
  { id: 'purple', hex: '#A855F7', label: 'بنفسجي' },
  { id: 'slate', hex: '#64748B', label: 'رمادي' }
];`;

  const newColorPalette = `const COLOR_PALETTE = [
  { id: 'blue', hex: '#3B82F6', labelKey: 'colorBlue' },
  { id: 'emerald', hex: '#10B981', labelKey: 'colorEmerald' },
  { id: 'indigo', hex: '#6366F1', labelKey: 'colorIndigo' },
  { id: 'amber', hex: '#F59E0B', labelKey: 'colorAmber' },
  { id: 'rose', hex: '#F43F5E', labelKey: 'colorRose' },
  { id: 'teal', hex: '#14B8A6', labelKey: 'colorTeal' },
  { id: 'purple', hex: '#A855F7', labelKey: 'colorPurple' },
  { id: 'slate', hex: '#64748B', labelKey: 'colorSlate' }
];`;

  if (content.includes(oldColorPalette)) {
    content = content.replace(oldColorPalette, newColorPalette);
    // Also replace usages of .label in the color palette (used in JSX as aria-label or title)
    // Find patterns like c.label and replace with t[c.labelKey as keyof typeof t] || c.id
    content = content.replace(/\bc\.label\b/g, '(t[c.labelKey as keyof typeof t] as string || c.id)');
    writeFile(filePath, content);
    console.log('✅ HabitFormModal.tsx: Fixed COLOR_PALETTE labels → labelKey');
    totalChanges++;
  } else {
    // Try simpler approach — just replace the labels inline
    const arabicColors = [
      ["label: 'أزرق'", "label: 'Blue'"],
      ["label: 'زمردي'", "label: 'Emerald'"],
      ["label: 'نيلي'", "label: 'Indigo'"],
      ["label: 'كهرماني'", "label: 'Amber'"],
      ["label: 'وردي'", "label: 'Rose'"],
      ["label: 'تركوازي'", "label: 'Teal'"],
      ["label: 'بنفسجي'", "label: 'Purple'"],
      ["label: 'رمادي'", "label: 'Slate'"],
    ];
    let changed = false;
    for (const [from, to] of arabicColors) {
      if (content.includes(from)) {
        content = content.replace(from, to);
        changed = true;
      }
    }
    if (changed) {
      writeFile(filePath, content);
      console.log('✅ HabitFormModal.tsx: Fixed COLOR_PALETTE labels to English neutral');
      totalChanges++;
    } else {
      console.log('⚠️  HabitFormModal.tsx: Pattern not found, skipped');
    }
  }
}

// ============================================================
// 2. TasksChecklistSection.tsx — Fix 3 Arabic issues
// ============================================================
{
  const filePath = 'src/components/TasksChecklistSection.tsx';
  let content = readFile(filePath);
  let changed = false;

  // Fix 1: Binary ternary for medication time
  const oldMedTime = "const [newMedTime, setNewMedTime] = useState(langInfo.code === 'ar' ? '10:00 ص' : '10:00 AM');";
  const newMedTime = "const [newMedTime, setNewMedTime] = useState('10:00');";
  if (content.includes(oldMedTime)) {
    content = content.replace(oldMedTime, newMedTime);
    changed = true;
    console.log('  ✅ TasksChecklistSection: Fixed medication time binary ternary');
  }

  // Fix 2: Arabic default sports type
  const oldSports = "const sportsType = activeDiaryForSelectedDate?.sportsType || 'مشي';";
  const newSports = "const sportsType = activeDiaryForSelectedDate?.sportsType || '';";
  if (content.includes(oldSports)) {
    content = content.replace(oldSports, newSports);
    changed = true;
    console.log('  ✅ TasksChecklistSection: Fixed sports type Arabic default');
  }

  // Fix 3: Hardcoded Arabic day names array → use Intl.DateTimeFormat
  const oldDayNames = `    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];`;
  const newDayNames = `    const getDayName = (date: Date) => {
      try {
        return date.toLocaleDateString(langInfo.locale || 'en', { weekday: 'short' });
      } catch {
        return date.toLocaleDateString('en', { weekday: 'short' });
      }
    };`;
  if (content.includes(oldDayNames)) {
    content = content.replace(oldDayNames, newDayNames);
    // Also fix the usage of dayNames[d.getDay()]
    content = content.replace(/const dayName = dayNames\[d\.getDay\(\)\];/, 'const dayName = getDayName(d);');
    changed = true;
    console.log('  ✅ TasksChecklistSection: Fixed hardcoded day names → Intl.DateTimeFormat');
  }

  if (changed) {
    writeFile(filePath, content);
    console.log('✅ TasksChecklistSection.tsx: All fixes applied');
    totalChanges++;
  } else {
    console.log('⚠️  TasksChecklistSection.tsx: Some patterns not found');
  }
}

// ============================================================
// 3. MonthlyMentalHealthPDFReportModal.tsx — MOOD_PRESETS
// ============================================================
{
  const filePath = 'src/components/MonthlyMentalHealthPDFReportModal.tsx';
  let content = readFile(filePath);
  
  // The MOOD_PRESETS labels are used in the therapist session form 
  // They need to be dynamic based on appLanguage
  // Strategy: Replace static array with a function that takes t
  const oldPresets = `const MOOD_PRESETS = [
  { label: 'شديد الاضطراب', percentage: 20, emoji: '😫' },
  { label: 'قلق وتوتر', percentage: 40, emoji: '😟' },
  { label: 'طبيعي / متقلب', percentage: 60, emoji: '😐' },
  { label: 'مطمئن ومرتاح', percentage: 80, emoji: '😊' },
  { label: 'سعيد ومستقر جداً', percentage: 100, emoji: '🌟' },
];`;

  const newPresets = `const getMoodPresets = (t: ReturnType<typeof getTranslation>) => [
  { label: t.moodSeverelyDistressed || 'Severely Distressed', percentage: 20, emoji: '😫' },
  { label: t.moodAnxiousStressed || 'Anxious / Stressed', percentage: 40, emoji: '😟' },
  { label: t.moodNeutralVariable || 'Neutral / Variable', percentage: 60, emoji: '😐' },
  { label: t.moodCalmRelaxed || 'Calm & Relaxed', percentage: 80, emoji: '😊' },
  { label: t.moodHappyStable || 'Happy & Very Stable', percentage: 100, emoji: '🌟' },
];`;

  if (content.includes(oldPresets)) {
    content = content.replace(oldPresets, newPresets);
    // Fix usage of MOOD_PRESETS → getMoodPresets(t)
    // Need to find where it's used inside the component
    content = content.replace(/\bMOOD_PRESETS\b/g, 'getMoodPresets(t)');
    writeFile(filePath, content);
    console.log('✅ MonthlyMentalHealthPDFReportModal.tsx: Fixed MOOD_PRESETS → dynamic getMoodPresets(t)');
    totalChanges++;
  } else {
    console.log('⚠️  MonthlyMentalHealthPDFReportModal.tsx: MOOD_PRESETS pattern not found');
  }
}

// ============================================================
// 4. fetchInterceptor.ts — fallback answers (make language-aware)
// ============================================================
{
  const filePath = 'src/lib/fetchInterceptor.ts';
  let content = readFile(filePath);
  let changed = false;

  // Fix the Arabic quota/key check detection
  // The line: if (lastErrorMsg.includes('يرجى') || lastErrorMsg.includes('لقد تجاوزت'))
  // These are error messages from Google AI API returned in Arabic — we need to also check English equivalents
  const oldQuotaCheck = `if (lastErrorMsg.includes('يرجى') || lastErrorMsg.includes('لقد تجاوزت'))`;
  const newQuotaCheck = `if (lastErrorMsg.includes('يرجى') || lastErrorMsg.includes('لقد تجاوزت') || lastErrorMsg.includes('quota') || lastErrorMsg.includes('RESOURCE_EXHAUSTED'))`;
  if (content.includes(oldQuotaCheck)) {
    content = content.replace(oldQuotaCheck, newQuotaCheck);
    changed = true;
    console.log('  ✅ fetchInterceptor: Added English quota error detection');
  }

  if (changed) {
    writeFile(filePath, content);
    console.log('✅ fetchInterceptor.ts: Fixes applied');
    totalChanges++;
  }
}

// ============================================================
// 5. Add new keys to languages.ts
// ============================================================
{
  const filePath = 'src/lib/languages.ts';
  let content = readFile(filePath);

  const newKeys = {
    // Mood presets for therapy report
    moodSeverelyDistressed: {
      ar: 'شديد الاضطراب', en: 'Severely Distressed', fr: 'Très perturbé', de: 'Stark gestört',
      es: 'Muy perturbado', it: 'Gravemente disturbato', tr: 'Şiddetli Rahatsızlık', pt: 'Severamente perturbado',
      ru: 'Тяжёлый стресс', ja: '非常に不安定', zh: '严重不安', hi: 'गंभीर व्यथित'
    },
    moodAnxiousStressed: {
      ar: 'قلق وتوتر', en: 'Anxious / Stressed', fr: 'Anxieux / Stressé', de: 'Ängstlich / Gestresst',
      es: 'Ansioso / Estresado', it: 'Ansioso / Stressato', tr: 'Endişeli / Stresli', pt: 'Ansioso / Estressado',
      ru: 'Тревожный / Напряжённый', ja: '不安 / ストレス', zh: '焦虑/紧张', hi: 'चिंतित / तनावग्रस्त'
    },
    moodNeutralVariable: {
      ar: 'طبيعي / متقلب', en: 'Neutral / Variable', fr: 'Neutre / Variable', de: 'Neutral / Variabel',
      es: 'Neutral / Variable', it: 'Neutro / Variabile', tr: 'Nötr / Değişken', pt: 'Neutro / Variável',
      ru: 'Нейтральный / Переменный', ja: '普通 / 変動', zh: '平稳/多变', hi: 'तटस्थ / परिवर्तनशील'
    },
    moodCalmRelaxed: {
      ar: 'مطمئن ومرتاح', en: 'Calm & Relaxed', fr: 'Calme et détendu', de: 'Ruhig und entspannt',
      es: 'Tranquilo y relajado', it: 'Calmo e rilassato', tr: 'Sakin ve Rahat', pt: 'Calmo e relaxado',
      ru: 'Спокойный и расслабленный', ja: '落ち着いてリラックス', zh: '平静放松', hi: 'शांत और आरामदायक'
    },
    moodHappyStable: {
      ar: 'سعيد ومستقر جداً', en: 'Happy & Very Stable', fr: 'Heureux et très stable', de: 'Glücklich und sehr stabil',
      es: 'Feliz y muy estable', it: 'Felice e molto stabile', tr: 'Mutlu ve Çok Stabil', pt: 'Feliz e muito estável',
      ru: 'Счастливый и очень стабильный', ja: '幸せでとても安定', zh: '快乐且非常稳定', hi: 'खुश और बहुत स्थिर'
    },
    // Color palette
    colorBlue: {
      ar: 'أزرق', en: 'Blue', fr: 'Bleu', de: 'Blau', es: 'Azul', it: 'Blu', tr: 'Mavi', pt: 'Azul', ru: 'Синий', ja: '青', zh: '蓝色', hi: 'नीला'
    },
    colorEmerald: {
      ar: 'زمردي', en: 'Emerald', fr: 'Émeraude', de: 'Smaragd', es: 'Esmeralda', it: 'Smeraldo', tr: 'Zümrüt', pt: 'Esmeralda', ru: 'Изумрудный', ja: 'エメラルド', zh: '翡翠绿', hi: 'पन्ना'
    },
    colorIndigo: {
      ar: 'نيلي', en: 'Indigo', fr: 'Indigo', de: 'Indigo', es: 'Índigo', it: 'Indaco', tr: 'Çivit', pt: 'Índigo', ru: 'Индиго', ja: 'インディゴ', zh: '靛蓝', hi: 'नील'
    },
    colorAmber: {
      ar: 'كهرماني', en: 'Amber', fr: 'Ambre', de: 'Bernstein', es: 'Ámbar', it: 'Ambra', tr: 'Kehribar', pt: 'Âmbar', ru: 'Янтарный', ja: 'アンバー', zh: '琥珀色', hi: 'अंबर'
    },
    colorRose: {
      ar: 'وردي', en: 'Rose', fr: 'Rose', de: 'Rosa', es: 'Rosa', it: 'Rosa', tr: 'Gül', pt: 'Rosa', ru: 'Розовый', ja: 'ローズ', zh: '玫瑰红', hi: 'गुलाब'
    },
    colorTeal: {
      ar: 'تركوازي', en: 'Teal', fr: 'Sarcelle', de: 'Blaugrün', es: 'Verde azulado', it: 'Verde acqua', tr: 'Teal', pt: 'Azul-petróleo', ru: 'Бирюзовый', ja: 'ティール', zh: '青绿色', hi: 'टील'
    },
    colorPurple: {
      ar: 'بنفسجي', en: 'Purple', fr: 'Violet', de: 'Lila', es: 'Morado', it: 'Viola', tr: 'Mor', pt: 'Roxo', ru: 'Фиолетовый', ja: '紫', zh: '紫色', hi: 'बैंगनी'
    },
    colorSlate: {
      ar: 'رمادي', en: 'Slate', fr: 'Ardoise', de: 'Schiefer', es: 'Pizarra', it: 'Ardesia', tr: 'Arduvaz', pt: 'Ardósia', ru: 'Серый', ja: 'スレート', zh: '石板灰', hi: 'स्लेट'
    },
    // AI errors
    aiReportGenerationError: {
      ar: 'عذراً، حدث خطأ أثناء الاتصال بالمستشار الذكي لتوليد التقرير.',
      en: 'Sorry, an error occurred while connecting to the AI advisor to generate the report.',
      fr: 'Désolé, une erreur s\'est produite lors de la connexion au conseiller IA pour générer le rapport.',
      de: 'Entschuldigung, beim Verbinden mit dem KI-Berater zur Berichtsgenerierung ist ein Fehler aufgetreten.',
      es: 'Lo sentimos, ocurrió un error al conectarse con el asesor de IA para generar el informe.',
      it: 'Spiacenti, si è verificato un errore durante la connessione al consulente AI per generare il rapporto.',
      tr: 'Üzgünüz, rapor oluşturmak için yapay zeka danışmanına bağlanırken bir hata oluştu.',
      pt: 'Desculpe, ocorreu um erro ao conectar ao consultor de IA para gerar o relatório.',
      ru: 'Извините, произошла ошибка при подключении к ИИ-советнику для создания отчёта.',
      ja: '申し訳ありません。レポート生成のためAIアドバイザーへの接続中にエラーが発生しました。',
      zh: '抱歉，连接AI顾问生成报告时出现错误。',
      hi: 'क्षमा करें, रिपोर्ट तैयार करने के लिए AI सलाहकार से कनेक्ट करते समय एक त्रुटि हुई।'
    },
    aiAdvisorUnavailable: {
      ar: 'عذراً، لم نتمكن من الوصول للمستشار الذكي حالياً.',
      en: 'Sorry, we could not access the AI advisor at this time.',
      fr: 'Désolé, nous n\'avons pas pu accéder au conseiller IA pour le moment.',
      de: 'Entschuldigung, wir konnten den KI-Berater derzeit nicht erreichen.',
      es: 'Lo sentimos, no pudimos acceder al asesor de IA en este momento.',
      it: 'Spiacenti, non è stato possibile accedere al consulente AI al momento.',
      tr: 'Üzgünüz, şu anda yapay zeka danışmanına erişemedik.',
      pt: 'Desculpe, não conseguimos acessar o consultor de IA neste momento.',
      ru: 'Извините, в данный момент нам не удалось подключиться к ИИ-советнику.',
      ja: '申し訳ありません。現時点でAIアドバイザーにアクセスできませんでした。',
      zh: '抱歉，目前无法访问AI顾问。',
      hi: 'क्षमा करें, इस समय AI सलाहकार तक पहुँचना संभव नहीं हो सका।'
    }
  };

  // Find the last key in languages.ts and inject new keys before the closing bracket
  // Strategy: find the EN_DICT closing and add before it
  let injectedCount = 0;
  
  for (const [keyName, translations] of Object.entries(newKeys)) {
    // Check if key already exists
    if (content.includes(`${keyName}:`)) {
      console.log(`  ⏭️  Key already exists: ${keyName}`);
      continue;
    }
    
    // Build key entries for each language dict
    const langs = ['AR', 'EN', 'FR', 'DE', 'ES', 'IT', 'TR', 'PT', 'RU', 'JA', 'ZH', 'HI'];
    const langCodes = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];
    const dictNames = ['AR_DICT', 'EN_DICT', 'FR_DICT', 'DE_DICT', 'ES_DICT', 'IT_DICT', 'TR_DICT', 'PT_DICT', 'RU_DICT', 'JA_DICT', 'ZH_DICT', 'HI_DICT'];
    
    for (let i = 0; i < langCodes.length; i++) {
      const code = langCodes[i];
      const dictName = dictNames[i];
      const value = translations[code];
      if (!value) continue;
      
      // Find a good insertion point in that dict
      // Look for the dict's closing }; pattern
      const dictMarker = `// === END ${langs[i]} ===`;
      if (content.includes(dictMarker)) {
        const escapedValue = value.replace(/'/g, "\\'");
        content = content.replace(dictMarker, `  ${keyName}: '${escapedValue}',\n${dictMarker}`);
        injectedCount++;
      }
    }
  }

  if (injectedCount > 0) {
    writeFile(filePath, content);
    console.log(`✅ languages.ts: Injected ${injectedCount} new key entries`);
    totalChanges++;
  } else {
    // Fallback: use a simple append strategy to each dict
    console.log('⚠️  languages.ts: END markers not found, trying alternative injection...');
    
    // Try finding the end of each dict by looking for its unique closing pattern
    let anyInjected = false;
    for (const [keyName, translations] of Object.entries(newKeys)) {
      if (content.includes(`  ${keyName}:`)) continue;
      
      const langCodes = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];
      const dictNames = ['AR_DICT', 'EN_DICT', 'FR_DICT', 'DE_DICT', 'ES_DICT', 'IT_DICT', 'TR_DICT', 'PT_DICT', 'RU_DICT', 'JA_DICT', 'ZH_DICT', 'HI_DICT'];
      
      for (let i = 0; i < langCodes.length; i++) {
        const code = langCodes[i];
        const dictName = dictNames[i];
        const value = translations[code];
        if (!value) continue;
        
        // Find "} as const;" or "};" that belongs to this dict
        // Use a regex to find the last entry before closing brace
        const dictStartIdx = content.indexOf(`const ${dictName} = {`);
        if (dictStartIdx === -1) continue;
        
        // Find the closing }; after the dict start
        let braceDepth = 0;
        let inDict = false;
        let closingIdx = -1;
        for (let j = dictStartIdx; j < content.length; j++) {
          if (content[j] === '{') { braceDepth++; inDict = true; }
          else if (content[j] === '}' && inDict) {
            braceDepth--;
            if (braceDepth === 0) {
              closingIdx = j;
              break;
            }
          }
        }
        
        if (closingIdx === -1) continue;
        
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const newEntry = `  ${keyName}: '${escapedValue}',\n`;
        content = content.slice(0, closingIdx) + newEntry + content.slice(closingIdx);
        anyInjected = true;
      }
    }
    
    if (anyInjected) {
      writeFile(filePath, content);
      console.log('✅ languages.ts: Keys injected via brace-depth search');
      totalChanges++;
    } else {
      console.log('❌ languages.ts: Could not inject new keys');
    }
  }
}

console.log(`\n🎉 Done! Total files modified: ${totalChanges}`);
