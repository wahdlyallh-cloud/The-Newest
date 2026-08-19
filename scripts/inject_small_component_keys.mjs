import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translations = {
  cbtThoughtReframe: { AR: 'الفكرة "{thought}" هي مجرد فرضية ذهنية مؤقتة. دعنا ننظر للواقع بإنصاف.', EN: 'The thought "{thought}" is just a temporary mental hypothesis. Let us look at reality fairly.', FR: 'La pensee "{thought}" est juste une hypothese temporaire. Regardons la realite equitablement.', DE: 'Der Gedanke "{thought}" ist nur eine vorubergehende Hypothese. Betrachten wir die Realitat fair.', ES: 'El pensamiento "{thought}" es solo una hipotesis temporal. Miremos la realidad con justicia.', IT: 'Il pensiero "{thought}" e solo un ipotesi temporanea. Guardiamo la realta equamente.', TR: '"{thought}" dusuncesi gecici bir hipotezdir. Gercege adil bakalim.', PT: 'O pensamento "{thought}" e apenas uma hipotese temporaria. Vamos olhar a realidade equitativamente.', RU: 'Мысль "{thought}" — это временная гипотеза. Взглянем на реальность справедливо.', JA: '「{thought}」という考えは一時的な仮説に過ぎません。現実を公平に見てみましょう。', ZH: '「{thought}」这个想法只是临时假设。让我们公平地看待现实。', HI: '"{thought}" विचार सिर्फ अस्थायी परिकल्पना है। वास्तविकता को निष्पक्षता से देखें।' },
  worryHourEnded: { AR: 'انتهت 15 دقيقة المخصصة لساعة القلق اليومية! حان الوقت للتفرغ لحياتك الحالية. 🧘✨', EN: 'The 15-minute daily worry hour has ended! Time to live in the present. 🧘✨', FR: "L'heure d'inquietude de 15 min est terminee! Vivez le present. 🧘✨", DE: 'Die 15-minutige Sorgestunde ist beendet! Lebe im Moment. 🧘✨', ES: 'La hora de preocupacion de 15 min termino! Vive el presente. 🧘✨', IT: "L'ora di preoccupazione di 15 min e finita! Vivi il presente. 🧘✨", TR: '15 dakikalik endise saati bitti! Simdi yasayin. 🧘✨', PT: 'A hora de preocupacao de 15 min terminou! Viva o presente. 🧘✨', RU: '15-минутный час беспокойства завершён! Живи настоящим. 🧘✨', JA: '15分間の心配タイムが終わりました！現在を生きましょう。🧘✨', ZH: '15分钟担忧时间结束！活在当下。🧘✨', HI: '15 मिनट का चिंता समय समाप्त! वर्तमान में जीएं। 🧘✨' },
  remembranceTitle: { AR: 'الذكر والسكينة', EN: 'Remembrance & Tranquility', FR: 'Rappel & Tranquillite', DE: 'Gedenken & Ruhe', ES: 'Recuerdo & Tranquilidad', IT: 'Rimembranza & Tranquillita', TR: 'Zikir & Huzur', PT: 'Lembranca & Tranquilidade', RU: 'Поминание & Спокойствие', JA: '念仏と安らぎ', ZH: '念诵与平静', HI: 'स्मरण और शांति' },
  lockScreenMode: { AR: 'وضع شاشة القفل', EN: 'Lock Screen Mode', FR: 'Mode ecran verrouille', DE: 'Sperrbilschirmmodus', ES: 'Modo pantalla de bloqueo', IT: 'Modalita schermata blocco', TR: 'Kilit Ekrani Modu', PT: 'Modo tela bloqueio', RU: 'Режим экрана блокировки', JA: 'ロック画面モード', ZH: '锁屏模式', HI: 'लॉक स्क्रीन मोड' },
  interactive: { AR: 'تفاعلي', EN: 'Interactive', FR: 'Interactif', DE: 'Interaktiv', ES: 'Interactivo', IT: 'Interattivo', TR: 'Etkilesimli', PT: 'Interativo', RU: 'Интерактивный', JA: 'インタラクティブ', ZH: '互动式', HI: 'इंटरएक्टिव' },
  securityNoticeTitle: { AR: 'تنبيه أمان', EN: 'Security Notice', FR: 'Avis de securite', DE: 'Sicherheitshinweis', ES: 'Aviso de seguridad', IT: 'Avviso di sicurezza', TR: 'Guvenlik bildirimi', PT: 'Aviso de seguranca', RU: 'Уведомление безопасности', JA: 'セキュリティ通知', ZH: '安全提示', HI: 'सुरक्षा सूचना' },
  navigateTo: { AR: 'انتقال إلى', EN: 'Navigate to', FR: 'Aller a', DE: 'Navigieren zu', ES: 'Ir a', IT: 'Vai a', TR: 'Git', PT: 'Navegar para', RU: 'Перейти к', JA: '移動先', ZH: '导航到', HI: 'यहाँ जाएं' },
  high: { AR: 'ارتفاع', EN: 'High', FR: 'Eleve', DE: 'Hoch', ES: 'Alto', IT: 'Alto', TR: 'Yuksek', PT: 'Alto', RU: 'Высокий', JA: '高い', ZH: '高', HI: 'उच्च' },
  sleepHoursLabel: { AR: 'ساعات النوم', EN: 'Sleep Hours', FR: 'Heures de sommeil', DE: 'Schlafstunden', ES: 'Horas de sueno', IT: 'Ore di sonno', TR: 'Uyku saatleri', PT: 'Horas de sono', RU: 'Часы сна', JA: '睡眠時間', ZH: '睡眠时间', HI: 'नींद के घंटे' },
  moodQualityScore: { AR: 'نقاط جودة المزاج', EN: 'Mood Quality Score', FR: 'Score qualite humeur', DE: 'Stimmungsqualitaetspunkte', ES: "Puntuacion calidad animo", IT: 'Punteggio qualita umore', TR: 'Ruh hali kalite puani', PT: 'Pontuacao qualidade humor', RU: 'Оценка качества настроения', JA: '気分の質スコア', ZH: '情绪质量评分', HI: 'मूड गुणवत्ता स्कोर' },
  sleepMoodImprovement: { AR: 'تحسن المزاج بالنوم الكافي', EN: 'Mood Improves with Adequate Sleep', FR: 'Humeur amelioree par sommeil adequat', DE: 'Stimmung verbessert sich mit ausreichend Schlaf', ES: 'Estado de animo mejora con sueno adecuado', IT: 'Umore migliora con sonno adeguato', TR: 'Yeterli uykuyla ruh hali iyilesir', PT: 'Humor melhora com sono adequado', RU: 'Настроение улучшается при достаточном сне', JA: '十分な睡眠で気分が改善', ZH: '充足睡眠改善情绪', HI: 'पर्याप्त नींद से मूड में सुधार' },
  dailySleepHours: { AR: 'ساعات النوم اليومية', EN: 'Daily Sleep Hours', FR: 'Heures de sommeil quotidiennes', DE: 'Tagliche Schlafstunden', ES: 'Horas de sueno diarias', IT: 'Ore di sonno giornaliere', TR: 'Gunluk uyku saatleri', PT: 'Horas de sono diarias', RU: 'Ежедневные часы сна', JA: '日々の睡眠時間', ZH: '每日睡眠时间', HI: 'दैनिक नींद के घंटे' },
  significantMoodImprovement: { AR: 'رافقها تحسن ملحوظ في جودة المزاج', EN: 'Accompanied by notable mood improvement', FR: 'Accompagne d amelioration notable de l humeur', DE: 'Begleitet von merklicher Stimmungsverbesserung', ES: 'Acompanado de mejora notable del animo', IT: 'Accompagnato da notevole miglioramento dell umore', TR: 'Dikkat cekici ruh hali iyilesmesiyle birlikte', PT: 'Acompanhado de notavel melhora de humor', RU: 'Сопровождается заметным улучшением настроения', JA: '顕著な気分改善を伴う', ZH: '伴随显著情绪改善', HI: 'उल्लेखनीय मूड सुधार के साथ' }
};

const languagesFile = path.join(__dirname, '../src/lib/languages.ts');
let content = fs.readFileSync(languagesFile, 'utf8');

const locales = ['AR', 'EN', 'FR', 'DE', 'ES', 'IT', 'TR', 'PT', 'RU', 'JA', 'ZH', 'HI'];

locales.forEach(loc => {
  const dictStartRegex = new RegExp(`export const ${loc}_DICT: Record<string, any> = \\{`);
  
  let injection = '';
  for (const [key, transObj] of Object.entries(translations)) {
    injection += `  ${key}: ${JSON.stringify(transObj[loc])},\n`;
  }
  
  content = content.replace(dictStartRegex, match => `${match}\n${injection}`);
});

fs.writeFileSync(languagesFile, content, 'utf8');
console.log('Successfully injected keys into ' + languagesFile);
