// ============================================================
//  aiLanguageContract.ts — Centralized AI Language Contract
//  Unified language enforcement, prompt construction, and
//  localized fallback provider for all 12 Gemini features in Hayat AI.
// ============================================================

import { getTranslation } from '../lib/languages';

export interface AILanguageMeta {
  code: string;
  name: string;
  native: string;
  dir: 'rtl' | 'ltr';
}

export const SUPPORTED_AI_LANGUAGES: Record<string, AILanguageMeta> = {
  ar: { code: 'ar', name: 'Arabic',             native: 'العربية',  dir: 'rtl' },
  en: { code: 'en', name: 'English',            native: 'English',  dir: 'ltr' },
  fr: { code: 'fr', name: 'French',             native: 'Français', dir: 'ltr' },
  de: { code: 'de', name: 'German',             native: 'Deutsch',  dir: 'ltr' },
  es: { code: 'es', name: 'Spanish',            native: 'Español',  dir: 'ltr' },
  it: { code: 'it', name: 'Italian',            native: 'Italiano', dir: 'ltr' },
  tr: { code: 'tr', name: 'Turkish',            native: 'Türkçe',   dir: 'ltr' },
  pt: { code: 'pt', name: 'Portuguese',         native: 'Português',dir: 'ltr' },
  ru: { code: 'ru', name: 'Russian',            native: 'Русский',  dir: 'ltr' },
  ja: { code: 'ja', name: 'Japanese',           native: '日本語',   dir: 'ltr' },
  zh: { code: 'zh', name: 'Chinese Simplified', native: '中文',     dir: 'ltr' },
  hi: { code: 'hi', name: 'Hindi',              native: 'हिन्दी',   dir: 'ltr' },
};

/**
 * Normalizes any language string into one of the 12 supported language codes.
 * Default fallback is 'ar'.
 */
export function normalizeAppLanguage(lang?: string): string {
  if (!lang || typeof lang !== 'string') return 'ar';
  const clean = lang.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_AI_LANGUAGES[clean] ? clean : 'ar';
}

/**
 * Resolves the currently active app language from settings/localStorage safely.
 */
export function getCurrentAppLanguage(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'ar';
  try {
    const savedSettings = localStorage.getItem('yawmiyati_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed?.appLanguage) return normalizeAppLanguage(parsed.appLanguage);
    }
    const legacy = localStorage.getItem('yawmiyati_app_language') || localStorage.getItem('app_language');
    if (legacy) return normalizeAppLanguage(legacy);
  } catch (_) {}
  return 'ar';
}

/**
 * Returns metadata for the given language.
 */
export function getAILanguageMeta(lang?: string): AILanguageMeta {
  const code = normalizeAppLanguage(lang);
  return SUPPORTED_AI_LANGUAGES[code];
}

/**
 * Generates the central strict language enforcement mandate string.
 */
export function getAILanguageInstruction(lang?: string): string {
  const target = getAILanguageMeta(lang);
  return (
    `\n\n[CRITICAL AI LANGUAGE CONTRACT]\n` +
    `1. TARGET RESPONSE LANGUAGE: You MUST generate all text, clinical insights, summaries, recommendations, and thoughts EXCLUSIVELY in ${target.name} (${target.native}) [Language code: ${target.code}].\n` +
    `2. STRICT ADHERENCE: Never switch to Arabic, English, or any other language unless ${target.name} is the explicitly selected application language or the user explicitly asks for another language in their query.\n` +
    `3. MULTILINGUAL INPUT COMPREHENSION: Even if the user prompt, retrieved diary, or context is written in Arabic, English, or any other language, you must understand it fully and generate your final response in ${target.name} (${target.native}).\n` +
    `4. STRUCTURE PRESERVATION: If a structured JSON schema is requested, preserve all JSON property keys exactly in English as specified, while translating all user-facing string values fully into ${target.name} (${target.native}).`
  );
}

/**
 * Generates the complete System Persona with strict language contract.
 */
export function getAISystemLanguageContract(lang?: string, taskDescription?: string): string {
  const target = getAILanguageMeta(lang);
  const basePersona =
    `SYSTEM PERSONA: You are 'Blomeo' — an advanced Dual-Capability Psychological & Personal Growth AI Assistant. ` +
    `You seamlessly integrate context-aware mental wellness counseling (diaries, habit tracking, CBT cognitive restructuring, gratitude, mood dynamics) ` +
    `with comprehensive general knowledge (science, humanities, coding, life advice, self-actualization). ` +
    `Always respond with high intelligence, clinical empathy, and constructive clarity.`;

  const customTask = taskDescription ? `\nTASK GOAL: ${taskDescription}` : '';
  const mandate = getAILanguageInstruction(lang);

  return `${basePersona}${customTask}${mandate}`;
}

/**
 * Returns a localized user-facing error message.
 */
export function getLocalizedAIError(errorType: 'key-missing' | 'rate-limit' | 'quota-exhausted' | 'quota_exhausted' | 'connection' | 'unauthorized' | string, lang?: string, rawDetails?: string): string {
  const normalized = normalizeAppLanguage(lang);
  const t = getTranslation(normalized as any) as any;

  if (rawDetails && (rawDetails.includes('__AI_QUOTA_EXCEEDED__') || rawDetails.includes('RESOURCE_EXHAUSTED') || rawDetails.includes('quota') || rawDetails.includes('الحصة') || rawDetails.includes('429'))) {
    return t.allKeysQuotaExhausted || t.dailyLimitReached;
  }
  if (rawDetails && (rawDetails.includes('__AI_CHECK_API_KEY__') || rawDetails.includes('API_KEY_INVALID') || rawDetails.includes('api key not valid') || rawDetails.includes('API_KEY_MISSING'))) {
    return t.apiKeyCheckSettings;
  }

  switch (errorType) {
    case 'key-missing':
      return t.apiKeyCheckSettings;
    case 'rate-limit':
    case 'quota-exhausted':
    case 'quota_exhausted':
      return t.allKeysQuotaExhausted || t.dailyLimitReached;
    case 'connection':
      return rawDetails ? `${t.connectionError}: ${rawDetails}` : (t.connectionError);
    case 'unauthorized':
      return t.keyVerificationFailed;
    default:
      if (typeof errorType === 'string' && (errorType.includes('quota') || errorType.includes('__AI_QUOTA_EXCEEDED__') || errorType.includes('RESOURCE_EXHAUSTED') || errorType.includes('429'))) {
        return t.allKeysQuotaExhausted || t.dailyLimitReached;
      }
      if (typeof errorType === 'string' && (errorType.includes('__AI_CHECK_API_KEY__') || errorType.includes('API_KEY_INVALID'))) {
        return t.apiKeyCheckSettings;
      }
      return rawDetails || t.connectionError;
  }
}

/**
 * Centralized, multi-language simulated fallback provider for all 12 endpoints.
 * Guarantees zero silent leakage of Arabic text to foreign language users upon network failure.
 */
export function getLocalizedAIFallback(
  endpointType: 'diary-assistant' | 'cbt-analyze' | 'gratitude-advisor' | 'daily-inspiration' | 'generate-note' | 'evaluate-habits' | 'analyze-mood',
  params?: { promptType?: string; action?: string; topic?: string; topHabitName?: string; leastHabitName?: string },
  lang?: string
): any {
  const normalized = normalizeAppLanguage(lang);

  switch (endpointType) {
    case 'diary-assistant': {
      const type = params?.promptType || 'summarize';
      if (type === 'summarize') {
        const fallbacks: Record<string, string> = {
          ar: '📝 **ملخص اليومية (نسخة محاكاة):**\n• تسجل التدوينة الحالة الشعورية والذهنية الراهنة بدقة.\n• هناك رغبة واضحة في التوازن والتعافي الذاتي وتنظيم الأفكار.',
          en: '📝 **Diary Summary (Simulated):**\n• The entry accurately reflects current emotional and cognitive state.\n• There is a clear desire for balance, self-recovery, and clarity.',
          fr: '📝 **Résumé du journal (Simulation) :**\n• L\'entrée reflète fidèlement votre état émotionnel et mental actuel.\n• Une volonté claire d\'équilibre, de rétablissement et de clarté est exprimée.',
          de: '📝 **Tagebuch-Zusammenfassung (Simulation):**\n• Der Eintrag spiegelt den aktuellen emotionalen Zustand präzise wider.\n• Es besteht ein klarer Wunsch nach innerer Balance und Struktur.',
          es: '📝 **Resumen del diario (Simulado):**\n• La entrada refleja fielmente tu estado emocional y mental actual.\n• Hay un claro deseo de equilibrio, autocuidado y claridad.',
          it: '📝 **Riepilogo del diario (Simulato):**\n• La nota riflette accuratamente il tuo stato emotivo e mentale.\n• Emerge un chiaro desiderio di equilibrio e crescita personale.',
          tr: '📝 **Günlük Özeti (Simülasyon):**\n• Giriş mevcut duygusal ve zihinsel durumunuzu yansıtmaktadır.\n• Denge ve kişisel gelişim yönünde net bir istek mevcuttur.',
          pt: '📝 **Resumo do diário (Simulado):**\n• O registro reflete com precisão o estado emocional e mental atual.\n• Há um claro desejo de equilíbrio, autocuidado e clareza.',
          ru: '📝 **Краткий итог дневника (Симуляция):**\n• Запись точно отражает текущее эмоциональное и мыслительное состояние.\n• Видно стремление к гармонии, восстановлению и ясности.',
          ja: '📝 **日記の要約（シミュレーション）：**\n• 現在の感情および精神状態が的確に記録されています。\n• バランスの回復と心の整理への前向きな意図が見受けられます。',
          zh: '📝 **日记核心提炼（离线生成）：**\n• 本篇日记准确记录了当前的心境与思维状态。\n• 展现了对生活平衡、自我疗愈与思绪整理的清晰追求。',
          hi: '📝 **डायरी सारांश (सिमुलेशन):**\n• यह प्रविष्टि वर्तमान भावनात्मक और मानसिक स्थिति को दर्शाती है।\n• संतुलन और स्पष्टता की दिशा में सकारात्मक प्रयास स्पष्ट है।'
        };
        return { success: true, answer: fallbacks[normalized] || fallbacks.en, source: 'local-simulation' };
      } else if (type === 'mistakes') {
        const fallbacks: Record<string, string> = {
          ar: '💡 **تحليل الأنماط الفكرية (نسخة محاكاة):**\n• يلاحظ وجود ميل خفيف لـ **"التفكير بكل شيء أو لا شيء"**.\n• **البديل الفكري الصحي:** تذكر أن الخطوة البسيطة نحو الأمام تظل مكسباً حقيقياً!',
          en: '💡 **Cognitive Pattern Analysis (Simulated):**\n• A mild tendency towards **"All-or-Nothing Thinking"** is noticed.\n• **Healthy Alternative:** Remember that even a small step forward is a real victory!',
          fr: '💡 **Analyse des schémas de pensée (Simulation) :**\n• Une légère tendance au **« Tout ou rien »** a été observée.\n• **Alternative saine :** Chaque petit pas en avant est une vraie victoire !',
          de: '💡 **Denkmuster-Analyse (Simulation):**\n• Eine leichte Neigung zum **Schwarz-Weiß-Denken** ist erkennbar.\n• **Gesunde Alternative:** Auch ein kleiner Schritt nach vorn ist ein echter Gewinn!',
          es: '💡 **Análisis de patrones de pensamiento (Simulado):**\n• Se observa una leve tendencia al **pensamiento de "todo o nada"**.\n• **Alternativa saludable:** ¡Recuerda que cada pequeño paso cuenta como un logro!',
          it: '💡 **Analisi degli schemi cognitivi (Simulato):**\n• Si nota una lieve tendenza al **pensiero "tutto o niente"**.\n• **Alternativa sana:** Ricorda che ogni piccolo progresso è una vittoria reale!',
          tr: '💡 **Düşünce Kalıbı Analizi (Simülasyon):**\n• **"Ya hep ya hiç"** düşünce biçimine hafif bir eğilim fark edildi.\n• **Sağlıklı Alternatif:** İleriye doğru atılan küçük bir adımın bile gerçek bir kazanım olduğunu unutmayın!',
          pt: '💡 **Análise de padrões cognitivos (Simulado):**\n• Nota-se uma leve tendência ao pensamento de **"tudo ou nada"**.\n• **Alternativa saudável:** Lembre-se de que cada pequeno avanço é uma grande conquista!',
          ru: '💡 **Анализ паттернов мышления (Симуляция):**\n• Заметна легкая склонность к **мышлению «все или ничего»**.\n• **Здоровая альтернатива:** Помните, что даже маленький шаг вперед — это настоящая победа!',
          ja: '💡 **思考パターンの分析（シミュレーション）：**\n• **「白黒思考（全か無か）」**の傾向がわずかに見られます。\n• **健全な代替案：** 小さな一歩の前進であっても、確かな成果であることを思い出しましょう！',
          zh: '💡 **思维模式分析（离线生成）：**\n• 观察到轻微的**“非黑即白”**或完美主义思维倾向。\n• **理性替代视角：** 请坚信，前进过程中的每一步微小累积都是货真价实的成长！',
          hi: '💡 **विचार पैटर्न विश्लेषण (सिमुलेशन):**\n• **"सब कुछ या कुछ नहीं"** वाली सोच की हल्की प्रवृत्ति देखी गई है।\n• **स्वस्थ विकल्प:** याद रखें कि आगे का एक छोटा सा कदम भी एक वास्तविक जीत है!'
        };
        return { success: true, answer: fallbacks[normalized] || fallbacks.en, source: 'local-simulation' };
      } else {
        const fallbacks: Record<string, string> = {
          ar: '🎯 **خطة مقترحة للغد (نسخة محاكاة):**\n1. خصص أول 15 دقيقة في الصباح لنفسك.\n2. اختر أهم مهمتين فقط وركز عليهما.\n3. حدد موعداً للتوقف وممارسة تمرين تنفس مهدئ.',
          en: '🎯 **Action Plan for Tomorrow (Simulated):**\n1. Dedicate the first 15 minutes of your morning to yourself.\n2. Focus on your top 2 priorities only.\n3. Schedule a calming breathing break.',
          fr: '🎯 **Plan d\'action pour demain (Simulation) :**\n1. Consacrez les 15 premières minutes du matin à vous-même.\n2. Concentrez-vous sur 2 priorités clés uniquement.\n3. Planifiez une pause de respiration apaisante.',
          de: '🎯 **Aktionsplan für morgen (Simulation):**\n1. Widmen Sie die ersten 15 Minuten am Morgen sich selbst.\n2. Konzentrieren Sie sich auf Ihre zwei wichtigsten Aufgaben.\n3. Planen Sie eine kurze Atemübung zur Entspannung ein.',
          es: '🎯 **Plan de acción para mañana (Simulado):**\n1. Dedica los primeros 15 minutos de la mañana a ti mismo.\n2. Concéntrate en tus 2 prioridades principales.\n3. Programa una pausa de respiración relajante.',
          it: '🎯 **Piano d\'azione per domani (Simulato):**\n1. Dedica i primi 15 minuti del mattino a te stesso.\n2. Concentrati solo sulle 2 priorità principali.\n3. Programma una pausa di respirazione rilassante.',
          tr: '🎯 **Yarın için Eylem Planı (Simülasyon):**\n1. Sabahın ilk 15 dakikasını kendinize ayırın.\n2. Sadece en önemli 2 önceliğinize odaklanın.\n3. Rahatlatıcı bir nefes molası planlayın.',
          pt: '🎯 **Plano de ação para amanhã (Simulado):**\n1. Dedique os primeiros 15 minutos da manhã a si mesmo.\n2. Concentre-se apenas em suas 2 principais prioridades.\n3. Agende uma pausa para respiração relaxante.',
          ru: '🎯 **План действий на завтра (Симуляция):**\n1. Посвятите первые 15 минут утра самому себе.\n2. Сосредоточьтесь только на 2 главных приоритетах.\n3. Запланируйте короткую дыхательную практику для снятия стресса.',
          ja: '🎯 **明日のアクションプラン（シミュレーション）：**\n1. 朝の最初の15分間を自分自身のために確保する。\n2. 最重要の2つのタスクに集中する。\n3. 心を落ち着かせる呼吸法の時間を設ける。',
          zh: '🎯 **明日行动规划建议（离线生成）：**\n1. 清晨留出前15分钟专属自我调节时间。\n2. 聚焦于今日最重要的前2项核心事项。\n3. 安排一次舒缓深呼吸微休息，保持能量充沛。',
          hi: '🎯 **कल के लिए कार्य योजना (सिमुलेशन):**\n1. सुबह के पहले 15 मिनट खुद को समर्पित करें।\n2. केवल अपनी शीर्ष 2 प्राथमिकताओं पर ध्यान दें।\n3. एक शांत श्वास विश्राम का समय निर्धारित करें।'
        };
        return { success: true, answer: fallbacks[normalized] || fallbacks.en, source: 'local-simulation' };
      }
    }

    case 'cbt-analyze': {
      const distortions: Record<string, string> = {
        ar: 'التفكير الإما كل شيء أو لا شيء (All-or-Nothing Thinking)',
        en: 'All-or-Nothing Thinking',
        fr: 'Pensée tout ou rien (Pensée dichotomique)',
        de: 'Alles-oder-Nichts-Denken (Schwarz-Weiß-Denken)',
        es: 'Pensamiento de todo o nada (Dicotómico)',
        it: 'Pensiero tutto o niente (Dicotomico)',
        tr: 'Ya Hep Ya Hiç Düşüncesi',
        pt: 'Pensamento de tudo ou nada (Dicotômico)',
        ru: 'Мышление «всё или ничего» (Черно-белое мышление)',
        ja: '全か無かの思考（白黒思考）',
        zh: '非黑即白思维（绝对化认知偏差）',
        hi: 'सब कुछ या कुछ नहीं वाली सोच'
      };
      const alternatives: Record<string, string> = {
        ar: 'حاول النظر للأمور بمرونة وتدرج بدلاً من التقييم الحاد، فكل خطوة بسيطة تعتبر إنجازاً مستحقاً.',
        en: 'Try to look at things with flexibility and nuance; every small step is a valid accomplishment.',
        fr: 'Abordez la situation avec souplesse et nuance ; chaque petit pas est un accomplissement légitime.',
        de: 'Betrachten Sie die Dinge mit Flexibilität; jeder kleine Schritt ist ein wertvoller Erfolg.',
        es: 'Observa la situación con flexibilidad y matices; cada pequeño paso es un logro válido.',
        it: 'Guarda le cose con flessibilità e sfumature; ogni piccolo passo è un traguardo valido.',
        tr: 'Duruma esneklik ve dengeyle yaklaşın; atılan her küçük adım değerli bir başarıdır.',
        pt: 'Enxergue a situação com flexibilidade; cada pequeno passo é uma vitória válida.',
        ru: 'Взгляните на ситуацию гибко; каждый небольшой шаг — это заслуженное достижение.',
        ja: '柔軟性と段階的な視点を持ちましょう。小さな一歩であっても確かな達成です。',
        zh: '请尝试以更包容和弹性的视角看待事物；前进过程中的每一步微小进展都值得肯定。',
        hi: 'लचीलेपन के साथ चीजों को देखें; हर छोटा कदम एक वैध उपलब्धि है।'
      };
      return {
        success: true,
        cognitiveDistortion: distortions[normalized] || distortions.en,
        rationalAlternative: alternatives[normalized] || alternatives.en,
        source: 'local-simulation'
      };
    }

    case 'daily-inspiration': {
      const quotes: Record<string, { quote: string; author: string }> = {
        ar: { quote: 'الاستمرار في الخطوات البسيطة اليومية يصنع نتائج عظيمة ومستدامة مع مرور الوقت.', author: 'حكمة اليوم' },
        en: { quote: 'Consistent small daily actions create profound and sustainable transformation over time.', author: 'Daily Wisdom' },
        fr: { quote: 'La régularité des petits gestes quotidiens façonne de grandes transformations durables.', author: 'Sagesse du jour' },
        de: { quote: 'Beständige kleine tägliche Schritte führen im Laufe der Zeit zu tiefgreifenden Erfolgen.', author: 'Weisheit des Tages' },
        es: { quote: 'La constancia en los pequeños pasos diarios genera transformaciones profundas y duraderas.', author: 'Sabiduría del día' },
        it: { quote: 'La costanza nelle piccole azioni quotidiane crea trasformazioni profonde e durature nel tempo.', author: 'Saggezza del giorno' },
        tr: { quote: 'Günlük küçük adımlardaki süreklilik, zamanla derin ve kalıcı değişimler yaratır.', author: 'Günün Sözü' },
        pt: { quote: 'A constância em pequenos passos diários gera transformações profundas e duradouras.', author: 'Sabedoria do dia' },
        ru: { quote: 'Постоянство в маленьких ежедневных шагах создает глубокие и долговечные результаты со временем.', author: 'Мудрость дня' },
        ja: { quote: '毎日の小さな積み重ねが、やがて大きくて持続的な変化を生み出します。', author: '今日の名言' },
        zh: { quote: '每日微小的坚持与积累，终将在时光中铸就深远而持久的改变。', author: '每日心语' },
        hi: { quote: 'दैनिक छोटे कदमों में निरंतरता समय के साथ गहरा और स्थायी परिवर्तन लाती है।', author: 'आज का सुविचार' }
      };
      const res = quotes[normalized] || quotes.en;
      return { success: true, quote: res.quote, author: res.author, source: 'local-simulation' };
    }

    case 'generate-note': {
      const notes: Record<string, { title: string; content: string }> = {
        ar: { title: 'خطوات عملية نحو التوازن النفسي والإنتاجية', content: 'المحافظة على التوازن اليومي تبدأ من ترتيب الأولويات وتخصيص مساحة للراحة الذهنية والتأمل.' },
        en: { title: 'Practical Steps Towards Mental Balance and Focus', content: 'Maintaining daily balance begins by organizing key priorities and creating mindful space for rest.' },
        fr: { title: 'Étapes pratiques vers l\'équilibre mental et la clarté', content: 'Maintenir un équilibre quotidien commence par organiser ses priorités et s\'accorder des moments de répit.' },
        de: { title: 'Praktische Schritte zu innerer Balance und Fokus', content: 'Das tägliche Gleichgewicht beginnt mit klaren Prioritäten und bewussten Erholungspausen.' },
        es: { title: 'Pasos prácticos hacia el equilibrio mental y la claridad', content: 'Mantener el equilibrio diario comienza organizando prioridades y reservando tiempo para el descanso consciente.' },
        it: { title: 'Passi pratici verso l\'equilibrio mentale e la concentrazione', content: 'Mantenere l\'equilibrio quotidiano inizia dall\'organizzare le priorità e dedicare spazio al riposo consapevole.' },
        tr: { title: 'Zihinsel Denge ve Odaklanma İçin Pratik Adımlar', content: 'Günlük dengeyi korumak, öncelikleri belirlemek ve dinlenmeye bilinçli alan açmakla başlar.' },
        pt: { title: 'Passos práticos para o equilíbrio mental e clareza', content: 'Manter o equilíbrio diário começa organizando prioridades e reservando tempo para o descanso consciente.' },
        ru: { title: 'Практические шаги к душевному равновесию и фокусу', content: 'Поддержание ежедневного баланса начинается с расстановки приоритетов и осознанного отдыха.' },
        ja: { title: '心のバランスと集中力を保つための実践ステップ', content: '日々のバランスを保つには、優先順位を整理し、意識的な休息の時間を確保することから始まります。' },
        zh: { title: '迈向内心平衡与专注的高效实践指南', content: '保持每日生活平衡的基石，在于清晰梳理核心优先级并为正念休息留出专属空间。' },
        hi: { title: 'मानसिक संतुलन और ध्यान की दिशा में व्यावहारिक कदम', content: 'दैनिक संतुलन बनाए रखना प्राथमिकताओं को व्यवस्थित करने और विश्राम के लिए समय निकालने से शुरू होता है।' }
      };
      const res = notes[normalized] || notes.en;
      return { success: true, title: res.title, content: res.content, source: 'local-simulation' };
    }

    default:
      return { success: true, source: 'local-simulation' };
  }
}
