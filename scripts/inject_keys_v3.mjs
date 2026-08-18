/**
 * inject_keys_v3.mjs - Final version
 * Correctly finds "export const XY_DICT: Record<string, any> = {" declarations
 */
import fs from 'fs';

const filePath = 'src/lib/languages.ts';

const NEW_KEYS = {
  moodSeverelyDistressed: {
    AR: 'شديد الاضطراب', EN: 'Severely Distressed', FR: 'Très perturbé',
    DE: 'Stark gestört', ES: 'Muy perturbado', IT: 'Gravemente disturbato',
    TR: 'Şiddetli Rahatsızlık', PT: 'Severamente perturbado',
    RU: 'Тяжёлый стресс', JA: '非常に不安定', ZH: '严重不安', HI: 'गंभीर व्यथित'
  },
  moodAnxiousStressed: {
    AR: 'قلق وتوتر', EN: 'Anxious / Stressed', FR: 'Anxieux / Stressé',
    DE: 'Ängstlich / Gestresst', ES: 'Ansioso / Estresado', IT: 'Ansioso / Stressato',
    TR: 'Endişeli / Stresli', PT: 'Ansioso / Estressado',
    RU: 'Тревожный / Напряжённый', JA: '不安 / ストレス', ZH: '焦虑/紧张', HI: 'चिंतित / तनावग्रस्त'
  },
  moodNeutralVariable: {
    AR: 'طبيعي / متقلب', EN: 'Neutral / Variable', FR: 'Neutre / Variable',
    DE: 'Neutral / Variabel', ES: 'Neutral / Variable', IT: 'Neutro / Variabile',
    TR: 'Nötr / Değişken', PT: 'Neutro / Variável',
    RU: 'Нейтральный / Переменный', JA: '普通 / 変動', ZH: '平稳/多变', HI: 'तटस्थ / परिवर्तनशील'
  },
  moodCalmRelaxed: {
    AR: 'مطمئن ومرتاح', EN: 'Calm & Relaxed', FR: 'Calme et détendu',
    DE: 'Ruhig und entspannt', ES: 'Tranquilo y relajado', IT: 'Calmo e rilassato',
    TR: 'Sakin ve Rahat', PT: 'Calmo e relaxado',
    RU: 'Спокойный и расслабленный', JA: '落ち着いてリラックス', ZH: '平静放松', HI: 'शांत और आरामदायक'
  },
  moodHappyStable: {
    AR: 'سعيد ومستقر جداً', EN: 'Happy & Very Stable', FR: 'Heureux et très stable',
    DE: 'Glücklich und sehr stabil', ES: 'Feliz y muy estable', IT: 'Felice e molto stabile',
    TR: 'Mutlu ve Çok Stabil', PT: 'Feliz e muito estável',
    RU: 'Счастливый и очень стабильный', JA: '幸せでとても安定', ZH: '快乐且非常稳定', HI: 'खुश और बहुत स्थिर'
  },
  colorBlue: {
    AR: 'أزرق', EN: 'Blue', FR: 'Bleu', DE: 'Blau', ES: 'Azul',
    IT: 'Blu', TR: 'Mavi', PT: 'Azul', RU: 'Синий', JA: '青', ZH: '蓝色', HI: 'नीला'
  },
  colorEmerald: {
    AR: 'زمردي', EN: 'Emerald', FR: 'Émeraude', DE: 'Smaragd', ES: 'Esmeralda',
    IT: 'Smeraldo', TR: 'Zümrüt', PT: 'Esmeralda', RU: 'Изумрудный', JA: 'エメラルド', ZH: '翡翠绿', HI: 'पन्ना'
  },
  colorIndigo: {
    AR: 'نيلي', EN: 'Indigo', FR: 'Indigo', DE: 'Indigo', ES: 'Índigo',
    IT: 'Indaco', TR: 'Çivit', PT: 'Índigo', RU: 'Индيго', JA: 'インディゴ', ZH: '靛蓝', HI: 'नील'
  },
  colorAmber: {
    AR: 'كهرماني', EN: 'Amber', FR: 'Ambre', DE: 'Bernstein', ES: 'Ámbar',
    IT: 'Ambra', TR: 'Kehribar', PT: 'Âmbar', RU: 'Янтарный', JA: 'アンバー', ZH: '琥珀色', HI: 'अंबर'
  },
  colorRose: {
    AR: 'وردي', EN: 'Rose', FR: 'Rose', DE: 'Rosa', ES: 'Rosa',
    IT: 'Rosa', TR: 'Gül', PT: 'Rosa', RU: 'Розовый', JA: 'ローズ', ZH: '玫瑰红', HI: 'गुलाब'
  },
  colorTeal: {
    AR: 'تركوازي', EN: 'Teal', FR: 'Sarcelle', DE: 'Blaugrün', ES: 'Verde azulado',
    IT: 'Verde acqua', TR: 'Teal', PT: 'Azul-petróleo', RU: 'Бирюзовый', JA: 'ティール', ZH: '青绿色', HI: 'टील'
  },
  colorPurple: {
    AR: 'بنفسجي', EN: 'Purple', FR: 'Violet', DE: 'Lila', ES: 'Morado',
    IT: 'Viola', TR: 'Mor', PT: 'Roxo', RU: 'Фиолетовый', JA: '紫', ZH: '紫色', HI: 'बैंगनी'
  },
  colorSlate: {
    AR: 'رمادي', EN: 'Slate', FR: 'Ardoise', DE: 'Schiefer', ES: 'Pizarra',
    IT: 'Ardesia', TR: 'Arduvaz', PT: 'Ardósia', RU: 'Серый', JA: 'スレート', ZH: '石板灰', HI: 'स्लेट'
  },
  aiReportGenerationError: {
    AR: 'عذراً، حدث خطأ أثناء الاتصال بالمستشار الذكي لتوليد التقرير.',
    EN: 'Sorry, an error occurred while connecting to the AI advisor to generate the report.',
    FR: "Désolé, une erreur s'est produite lors de la connexion au conseiller IA.",
    DE: 'Entschuldigung, beim Verbinden mit dem KI-Berater ist ein Fehler aufgetreten.',
    ES: 'Lo sentimos, ocurrió un error al conectarse con el asesor de IA.',
    IT: 'Spiacenti, si è verificato un errore durante la connessione al consulente AI.',
    TR: 'Üzgünüz, yapay zeka danışmanına bağlanırken hata oluştu.',
    PT: 'Desculpe, ocorreu um erro ao conectar ao consultor de IA.',
    RU: 'Извините, произошла ошибка при подключении к ИИ-советнику.',
    JA: 'AIアドバイザーへの接続中にエラーが発生しました。',
    ZH: '连接AI顾问生成报告时出现错误。',
    HI: 'AI सलाहकार से कनेक्ट करते समय एक त्रुटि हुई।'
  },
  aiAdvisorUnavailable: {
    AR: 'عذراً، لم نتمكن من الوصول للمستشار الذكي حالياً.',
    EN: 'Sorry, we could not access the AI advisor at this time.',
    FR: "Désolé, nous n'avons pas pu accéder au conseiller IA pour le moment.",
    DE: 'Entschuldigung, wir konnten den KI-Berater derzeit nicht erreichen.',
    ES: 'Lo sentimos, no pudimos acceder al asesor de IA en este momento.',
    IT: 'Spiacenti, non è stato possibile accedere al consulente AI al momento.',
    TR: 'Üzgünüz, şu anda yapay zeka danışmanına erişemedik.',
    PT: 'Desculpe, não conseguimos acessar o consultor de IA neste momento.',
    RU: 'Извините, в данный момент нам не удалось подключиться к ИИ-советнику.',
    JA: '現時点でAIアドバイザーにアクセスできませんでした。',
    ZH: '目前无法访问AI顾问。',
    HI: 'इस समय AI सलाहकार तक पहुँचना संभव नहीं हो सका।'
  }
};

const LANG_CODES = ['AR', 'EN', 'FR', 'DE', 'ES', 'IT', 'TR', 'PT', 'RU', 'JA', 'ZH', 'HI'];

let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Find dict boundaries using the actual declaration pattern
const DICT_DECL_RE = /^export const ([A-Z]+)_DICT: Record<string, any> = \{/;
const dictBounds = {};

let currentDict = null;
let braceDepth = 0;
let dictStartLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (!currentDict) {
    const m = line.match(DICT_DECL_RE);
    if (m) {
      currentDict = m[1]; // e.g., 'AR', 'EN', etc.
      braceDepth = 0;
      dictStartLine = i;
    }
  }
  
  if (currentDict) {
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > dictStartLine) {
      dictBounds[currentDict] = { start: dictStartLine, end: i };
      currentDict = null;
    }
  }
}

console.log('Dicts found:', Object.keys(dictBounds).join(', '));
if (Object.keys(dictBounds).length === 0) {
  console.error('❌ No dicts found! Check the regex pattern.');
  process.exit(1);
}

// Collect injections sorted in reverse line order
const injections = [];

for (const langCode of LANG_CODES) {
  const bounds = dictBounds[langCode];
  if (!bounds) {
    console.warn(`⚠️  No bounds for ${langCode}_DICT`);
    continue;
  }
  
  const dictLines = lines.slice(bounds.start, bounds.end + 1);
  const toInject = [];
  
  for (const [keyName, translations] of Object.entries(NEW_KEYS)) {
    const value = translations[langCode];
    if (!value) continue;
    
    // Check if key already in this dict's lines
    const alreadyExists = dictLines.some(l => l.trimStart().startsWith(`${keyName}:`));
    if (alreadyExists) continue;
    
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    toInject.push(`  ${keyName}: '${escaped}',`);
  }
  
  if (toInject.length > 0) {
    injections.push({ lineIdx: bounds.end, newLines: toInject, langCode });
  }
}

// Sort descending by lineIdx
injections.sort((a, b) => b.lineIdx - a.lineIdx);

let totalInjected = 0;
for (const { lineIdx, newLines, langCode } of injections) {
  lines.splice(lineIdx, 0, ...newLines);
  console.log(`✅ ${langCode}_DICT: +${newLines.length} keys before line ${lineIdx + 1}`);
  totalInjected += newLines.length;
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\n🎉 Done! Total key entries injected: ${totalInjected}`);
