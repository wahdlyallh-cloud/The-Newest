/**
 * inject_keys_v2.mjs
 * Fixed version: injects keys into each dict separately by checking within dict boundaries
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const filePath = path.join(ROOT, 'src/lib/languages.ts');

const NEW_KEYS = {
  moodSeverelyDistressed: {
    AR_DICT: 'شديد الاضطراب', EN_DICT: 'Severely Distressed', FR_DICT: 'Très perturbé',
    DE_DICT: 'Stark gestört', ES_DICT: 'Muy perturbado', IT_DICT: 'Gravemente disturbato',
    TR_DICT: 'Şiddetli Rahatsızlık', PT_DICT: 'Severamente perturbado',
    RU_DICT: 'Тяжёлый стресс', JA_DICT: '非常に不安定', ZH_DICT: '严重不安', HI_DICT: 'गंभीर व्यथित'
  },
  moodAnxiousStressed: {
    AR_DICT: 'قلق وتوتر', EN_DICT: 'Anxious / Stressed', FR_DICT: 'Anxieux / Stressé',
    DE_DICT: 'Ängstlich / Gestresst', ES_DICT: 'Ansioso / Estresado', IT_DICT: 'Ansioso / Stressato',
    TR_DICT: 'Endişeli / Stresli', PT_DICT: 'Ansioso / Estressado',
    RU_DICT: 'Тревожный / Напряжённый', JA_DICT: '不安 / ストレス', ZH_DICT: '焦虑/紧张', HI_DICT: 'चिंतित / तनावग्रस्त'
  },
  moodNeutralVariable: {
    AR_DICT: 'طبيعي / متقلب', EN_DICT: 'Neutral / Variable', FR_DICT: 'Neutre / Variable',
    DE_DICT: 'Neutral / Variabel', ES_DICT: 'Neutral / Variable', IT_DICT: 'Neutro / Variabile',
    TR_DICT: 'Nötr / Değişken', PT_DICT: 'Neutro / Variável',
    RU_DICT: 'Нейтральный / Переменный', JA_DICT: '普通 / 変動', ZH_DICT: '平稳/多变', HI_DICT: 'तटस्थ / परिवर्तनशील'
  },
  moodCalmRelaxed: {
    AR_DICT: 'مطمئن ومرتاح', EN_DICT: 'Calm & Relaxed', FR_DICT: 'Calme et détendu',
    DE_DICT: 'Ruhig und entspannt', ES_DICT: 'Tranquilo y relajado', IT_DICT: 'Calmo e rilassato',
    TR_DICT: 'Sakin ve Rahat', PT_DICT: 'Calmo e relaxado',
    RU_DICT: 'Спокойный и расслабленный', JA_DICT: '落ち着いてリラックス', ZH_DICT: '平静放松', HI_DICT: 'शांत और आरामदायक'
  },
  moodHappyStable: {
    AR_DICT: 'سعيد ومستقر جداً', EN_DICT: 'Happy & Very Stable', FR_DICT: 'Heureux et très stable',
    DE_DICT: 'Glücklich und sehr stabil', ES_DICT: 'Feliz y muy estable', IT_DICT: 'Felice e molto stabile',
    TR_DICT: 'Mutlu ve Çok Stabil', PT_DICT: 'Feliz e muito estável',
    RU_DICT: 'Счастливый и очень стабильный', JA_DICT: '幸せでとても安定', ZH_DICT: '快乐且非常稳定', HI_DICT: 'खुश और बहुत स्थिर'
  },
  colorBlue: {
    AR_DICT: 'أزرق', EN_DICT: 'Blue', FR_DICT: 'Bleu', DE_DICT: 'Blau', ES_DICT: 'Azul',
    IT_DICT: 'Blu', TR_DICT: 'Mavi', PT_DICT: 'Azul', RU_DICT: 'Синий', JA_DICT: '青', ZH_DICT: '蓝色', HI_DICT: 'नीला'
  },
  colorEmerald: {
    AR_DICT: 'زمردي', EN_DICT: 'Emerald', FR_DICT: 'Émeraude', DE_DICT: 'Smaragd', ES_DICT: 'Esmeralda',
    IT_DICT: 'Smeraldo', TR_DICT: 'Zümrüt', PT_DICT: 'Esmeralda', RU_DICT: 'Изумрудный', JA_DICT: 'エメラルド', ZH_DICT: '翡翠绿', HI_DICT: 'पन्ना'
  },
  colorIndigo: {
    AR_DICT: 'نيلي', EN_DICT: 'Indigo', FR_DICT: 'Indigo', DE_DICT: 'Indigo', ES_DICT: 'Índigo',
    IT_DICT: 'Indaco', TR_DICT: 'Çivit', PT_DICT: 'Índigo', RU_DICT: 'Индиго', JA_DICT: 'インディゴ', ZH_DICT: '靛蓝', HI_DICT: 'नील'
  },
  colorAmber: {
    AR_DICT: 'كهرماني', EN_DICT: 'Amber', FR_DICT: 'Ambre', DE_DICT: 'Bernstein', ES_DICT: 'Ámbar',
    IT_DICT: 'Ambra', TR_DICT: 'Kehribar', PT_DICT: 'Âmbar', RU_DICT: 'Янтарный', JA_DICT: 'アンバー', ZH_DICT: '琥珀色', HI_DICT: 'अंबर'
  },
  colorRose: {
    AR_DICT: 'وردي', EN_DICT: 'Rose', FR_DICT: 'Rose', DE_DICT: 'Rosa', ES_DICT: 'Rosa',
    IT_DICT: 'Rosa', TR_DICT: 'Gül', PT_DICT: 'Rosa', RU_DICT: 'Розовый', JA_DICT: 'ローズ', ZH_DICT: '玫瑰红', HI_DICT: 'गुलाब'
  },
  colorTeal: {
    AR_DICT: 'تركوازي', EN_DICT: 'Teal', FR_DICT: 'Sarcelle', DE_DICT: 'Blaugrün', ES_DICT: 'Verde azulado',
    IT_DICT: 'Verde acqua', TR_DICT: 'Teal', PT_DICT: 'Azul-petróleo', RU_DICT: 'Бирюзовый', JA_DICT: 'ティール', ZH_DICT: '青绿色', HI_DICT: 'टील'
  },
  colorPurple: {
    AR_DICT: 'بنفسجي', EN_DICT: 'Purple', FR_DICT: 'Violet', DE_DICT: 'Lila', ES_DICT: 'Morado',
    IT_DICT: 'Viola', TR_DICT: 'Mor', PT_DICT: 'Roxo', RU_DICT: 'Фиолетовый', JA_DICT: '紫', ZH_DICT: '紫色', HI_DICT: 'बैंगनी'
  },
  colorSlate: {
    AR_DICT: 'رمادي', EN_DICT: 'Slate', FR_DICT: 'Ardoise', DE_DICT: 'Schiefer', ES_DICT: 'Pizarra',
    IT_DICT: 'Ardesia', TR_DICT: 'Arduvaz', PT_DICT: 'Ardósia', RU_DICT: 'Серый', JA_DICT: 'スレート', ZH_DICT: '石板灰', HI_DICT: 'स्लेट'
  },
  aiReportGenerationError: {
    AR_DICT: 'عذراً، حدث خطأ أثناء الاتصال بالمستشار الذكي لتوليد التقرير.',
    EN_DICT: 'Sorry, an error occurred while connecting to the AI advisor to generate the report.',
    FR_DICT: "Désolé, une erreur s'est produite lors de la connexion au conseiller IA.",
    DE_DICT: 'Entschuldigung, beim Verbinden mit dem KI-Berater ist ein Fehler aufgetreten.',
    ES_DICT: 'Lo sentimos, ocurrió un error al conectarse con el asesor de IA.',
    IT_DICT: 'Spiacenti, si è verificato un errore durante la connessione al consulente AI.',
    TR_DICT: 'Üzgünüz, rapor oluşturmak için yapay zeka danışmanına bağlanırken hata oluştu.',
    PT_DICT: 'Desculpe, ocorreu um erro ao conectar ao consultor de IA.',
    RU_DICT: 'Извините, произошла ошибка при подключении к ИИ-советнику.',
    JA_DICT: 'AIアドバイザーへの接続中にエラーが発生しました。',
    ZH_DICT: '连接AI顾问生成报告时出现错误。',
    HI_DICT: 'AI सलाहकार से कनेक्ट करते समय एक त्रुटि हुई।'
  },
  aiAdvisorUnavailable: {
    AR_DICT: 'عذراً، لم نتمكن من الوصول للمستشار الذكي حالياً.',
    EN_DICT: 'Sorry, we could not access the AI advisor at this time.',
    FR_DICT: "Désolé, nous n'avons pas pu accéder au conseiller IA pour le moment.",
    DE_DICT: 'Entschuldigung, wir konnten den KI-Berater derzeit nicht erreichen.',
    ES_DICT: 'Lo sentimos, no pudimos acceder al asesor de IA en este momento.',
    IT_DICT: 'Spiacenti, non è stato possibile accedere al consulente AI al momento.',
    TR_DICT: 'Üzgünüz, şu anda yapay zeka danışmanına erişemedik.',
    PT_DICT: 'Desculpe, não conseguimos acessar o consultor de IA neste momento.',
    RU_DICT: 'Извините, в данный момент нам не удалось подключиться к ИИ-советнику.',
    JA_DICT: '現時点でAIアドバイザーにアクセスできませんでした。',
    ZH_DICT: '目前无法访问AI顾问。',
    HI_DICT: 'इस समय AI सलाहकार तक पहुँचना संभव नहीं हो सका।'
  }
};

let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');
const totalLines = lines.length;

// Find dict boundaries
const DICT_NAMES = ['AR_DICT', 'EN_DICT', 'FR_DICT', 'DE_DICT', 'ES_DICT', 'IT_DICT', 'TR_DICT', 'PT_DICT', 'RU_DICT', 'JA_DICT', 'ZH_DICT', 'HI_DICT'];
const dictBounds = {};

let currentDict = null;
let braceDepth = 0;
let dictStart = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (!currentDict) {
    for (const d of DICT_NAMES) {
      if (line.includes(`const ${d} = {`) || line.includes(`const ${d}={`)) {
        currentDict = d;
        braceDepth = 0;
        dictStart = i;
        break;
      }
    }
  }
  
  if (currentDict) {
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > dictStart) {
      dictBounds[currentDict] = { start: dictStart, end: i }; // 0-indexed
      currentDict = null;
    }
  }
}

console.log('Dict boundaries found:', Object.keys(dictBounds).length);
for (const [d, b] of Object.entries(dictBounds)) {
  console.log(`  ${d}: lines ${b.start+1}–${b.end+1}`);
}

// For each dict, collect new lines to inject
// We inject in REVERSE order (highest end-line first) to preserve indices
const injections = []; // {lineIdx, lines}

for (const [dictName, bounds] of Object.entries(dictBounds)) {
  const dictContent = lines.slice(bounds.start, bounds.end + 1).join('\n');
  const toInject = [];
  
  for (const [keyName, translations] of Object.entries(NEW_KEYS)) {
    const value = translations[dictName];
    if (!value) continue;
    
    // Check if key already in this dict
    const keyPattern = new RegExp(`^  ${keyName}:`);
    const existsInDict = lines.slice(bounds.start, bounds.end + 1).some(l => keyPattern.test(l));
    if (existsInDict) continue;
    
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    toInject.push(`  ${keyName}: '${escaped}',`);
  }
  
  if (toInject.length > 0) {
    injections.push({ lineIdx: bounds.end, newLines: toInject, dictName });
  }
}

// Sort by lineIdx descending to preserve indices during splice
injections.sort((a, b) => b.lineIdx - a.lineIdx);

let totalInjected = 0;
for (const { lineIdx, newLines, dictName } of injections) {
  lines.splice(lineIdx, 0, ...newLines);
  console.log(`✅ ${dictName}: Injected ${newLines.length} keys before closing (line ${lineIdx + 1})`);
  totalInjected += newLines.length;
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\n🎉 Total key entries injected: ${totalInjected} (${totalInjected/12} keys × 12 langs)`);
