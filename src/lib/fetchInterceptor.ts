import { getAISystemLanguageContract, getAILanguageInstruction, getLocalizedAIFallback, getLocalizedAIError, normalizeAppLanguage, getCurrentAppLanguage } from '../services/aiLanguageContract';
import { t, getTranslation } from '../lib/languages';
import {
  getActiveApiKeyFromSettings,
  getCandidateApiKeys,
  rotateToNextKey,
  recordKeySuccess,
  classifyGeminiError
} from './apiKeyManager';
import {
  buildUnifiedKnowledgeIndex,
  retrieveRelevantKnowledge,
  getGroundedSystemDirectives
} from '../services/unifiedAIKnowledgeService';

function cleanModelIdentifier(modelName?: string): string {
  if (!modelName || !modelName.trim()) return 'gemini-3.7-flash';
  return modelName.trim().replace(/^models\//, '');
}

// Helper to safely format dates without throwing
function safeFormatDate(d: any): string {
  if (!d) return 'undated';
  if (typeof d === 'string') {
    return d.includes('T') ? d.split('T')[0] : d;
  }
  if (typeof d === 'number') {
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return 'undated';
    }
  }
  if (d instanceof Date) {
    try {
      return d.toISOString().split('T')[0];
    } catch {
      return 'undated';
    }
  }
  return String(d);
}

// Helper to enforce user's selected language output in Gemini REST calls
function getLanguageInstruction(langCode?: string): string {
  const code = (langCode || 'ar').toLowerCase();
  const langNames: Record<string, string> = {
    ar: "Arabic",
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    tr: "Turkish",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    zh: "Chinese",
    hi: "Hindi"
  };
  const targetName = langNames[code] || "English";
  return `\n\nCRITICAL LANGUAGE MANDATE: You must generate all clinical analyses, chat responses, and CBT feedback strictly in ${targetName}. Translate all mood tags, insights, and recommendations completely to ${targetName}.`;
}

// Client-side fetch interceptor to support production deployment on Vercel
// This allows the React SPA to work fully offline and serverless if Express is not running.

const originalFetch = window.fetch;

// Helper to make a direct REST call to Google's official Gemini API
async function generateWithGeminiREST(prompt: string, systemInstruction?: string, isJson?: boolean, userApiKey?: string, extraParts?: any[]) {
  const candidateKeys = getCandidateApiKeys(userApiKey);
  if (candidateKeys.length === 0) {
    throw new Error('API_KEY_MISSING_CHECK_SETTINGS');
  }

  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.7-flash'];
  let lastErrorMsg = '';

  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const currentKey = candidateKeys[keyIdx];

    for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
      const model = modelsToTry[modelIdx];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey.trim()}`;

      const userParts = (extraParts && Array.isArray(extraParts) && extraParts.length > 0)
        ? [...extraParts, { text: prompt }]
        : [{ text: prompt }];

      const requestBody: any = {
        contents: [{ role: 'user', parts: userParts }],
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      };

      if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
      }
      if (isJson) {
        requestBody.generationConfig = { responseMimeType: 'application/json' };
      }

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 18000);
      const reqStart = Date.now();

      try {
        const res = await originalFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutTimer);
        const elapsed = Date.now() - reqStart;

        const responseText = await res.text();

        if (res.ok) {
          if (!responseText || !responseText.trim()) throw new Error('AI_EMPTY_RESPONSE');
          const resJson = JSON.parse(responseText);
          const candidate = resJson.candidates?.[0];
          if (candidate) {
            const candidateText = candidate?.content?.parts?.[0]?.text;
            if (candidateText && typeof candidateText === 'string' && candidateText.trim() !== '') {
              recordKeySuccess(currentKey);
              console.log(`[REST] Success with Model: ${model} | Key #${keyIdx + 1} | Time: ${elapsed}ms`);
              return candidateText;
            }
          }
        }

        let errData: any = {};
        try { errData = JSON.parse(responseText); } catch (_) {}
        const errMessage = errData?.error?.message || `HTTP ${res.status}: ${res.statusText || 'Google API Error'}`;
        lastErrorMsg = errMessage;

        const errType = classifyGeminiError(res.status, errMessage);
        console.warn(`[REST] Model: ${model} | Key #${keyIdx + 1} | Status: ${res.status} | ErrType: ${errType} | Time: ${elapsed}ms`);

        if (errType === 'quota_exhausted' || errType === 'invalid_key') {
          rotateToNextKey(currentKey, errType);
          break; // break model loop to try next candidate key in pool
        }

        if (res.status === 404 || res.status === 503 || res.status === 529 || errMessage.includes('high demand') || errMessage.includes('not found')) {
          continue; // try next model in loop with same key
        }
      } catch (e: any) {
        clearTimeout(timeoutTimer);
        const elapsed = Date.now() - reqStart;
        const isAbort = e?.name === 'AbortError';
        lastErrorMsg = isAbort ? 'انتهت مهلة استجابة النموذج (Timeout)' : (e.message || String(e));
        console.warn(`[REST] Model: ${model} | Key #${keyIdx + 1} | Exception: ${lastErrorMsg} | Time: ${elapsed}ms`);
      }
    }
  }

  if (lastErrorMsg.includes('quota') || lastErrorMsg.includes('RESOURCE_EXHAUSTED')) {
    return '__AI_QUOTA_EXCEEDED__';
  }
  if (lastErrorMsg.includes('API_KEY_INVALID') || lastErrorMsg.includes('API key not valid')) {
    return '__AI_CHECK_API_KEY__';
  }

  throw new Error(lastErrorMsg || 'Could not connect to Gemini models.');
}

// Intercept window.fetch robustly
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as Request).url);

  // If not calling our custom local API endpoints, pass through normally
  if (!url.includes('/api/')) {
    return originalFetch(input, init);
  }

  try {
    // 1. Always attempt the actual server first
    const response = await originalFetch(input, init);
    const contentType = response.headers.get('content-type');
    
    // If we are on Vercel (static SPA hosting), a missing/unsupported backend route might return 404 or 405 with HTML/text contents.
    // Let's redirect all 404/405/non-OK responses to our client-side AI fallback handler.
    if (response.status === 404 || response.status === 405 || !response.ok || (contentType && contentType.includes('text/html'))) {
      throw new Error(`Backend endpoint not reachable (${response.status}), falling back to client-side handler`);
    }
    
    return response;
  } catch (error) {
    console.warn(`[Client Fallback Router] Intercepted missing/failed route: ${url}. Routing to client-side simulation...`, error);
    return await handleClientSideFallback(url, init);
  }
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Could not redefine window.fetch with Object.defineProperty, falling back to direct assignment", e);
  try {
    (window as any).fetch = customFetch;
  } catch (err) {
    console.error("Critical: Failed to intercept fetch", err);
  }
}

// Handle client-side simulation of express endpoints
async function handleClientSideFallback(url: string, init?: RequestInit): Promise<Response> {
  // Extract custom API Key with Key Pool resolution
  let keyToUse = '';
  const reqHeaders = init?.headers ? new Headers(init.headers) : new Headers();
  if (init?.headers) {
    keyToUse = reqHeaders.get('x-gemini-key') || '';
  }

  if (!keyToUse || keyToUse.trim() === '') {
    keyToUse = getActiveApiKeyFromSettings();
  }

  let requestBody: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      requestBody = JSON.parse(init.body);
    } catch (e) {
      requestBody = {};
    }
  }

  const reqLang = normalizeAppLanguage(reqHeaders.get('x-app-language') || requestBody.appLanguage || requestBody.langCode || getCurrentAppLanguage());
  const t_resp = getTranslation(reqLang);

  // Endpoint Router
  if (url.includes('/api/gemini/verify-key')) {
    const key = requestBody.key || keyToUse;
    if (!key || key.trim() === '') {
      return createErrorResponse(reqLang === 'ar' ? "مفتاح API فارغ" : "API Key is empty");
    }
    try {
      await generateWithGeminiREST("Say 'ok' in 1 word", undefined, false, key);
      return createSuccessResponse({ success: true, message: reqLang === 'ar' ? "تم التحقق من مفتاح API بنجاح! 🎉" : "API key verified successfully! 🎉" });
    } catch (err: any) {
      if (err.message?.includes("Quota") || err.message?.includes("limit") || err.message?.includes("429") || err.message?.includes("EXHAUSTED")) {
        return createSuccessResponse({
          success: true,
          message: reqLang === 'ar' ? "تم حفظ المفتاح بنجاح! 🎉" : "Key saved successfully! 🎉"
        });
      }
      return createErrorResponse(err.message || t_resp.keyVerificationFailed || "Key verification failed.");
    }
  }

  if (url.includes('/api/gemini/analyze-mood')) {
    const { title, content, appLanguage } = requestBody;
    if (!content || content.trim() === "") {
      return createSuccessResponse({
        success: true,
        analysis: [{ mood: "normal", percentage: 100 }]
      });
    }

    try {
      const prompt = `You are a psychological mood analyst. Analyze the following user entry and determine percentage breakdown of moods.
Title: "${title || 'Untitled'}"
Content: "${content}"

Classify into moods: Very Happy, Happy, Relaxed, Normal, Sad, Depressed, Anxious, Angry, Exhausted, Grateful.
${getLanguageInstruction(appLanguage)}

Return JSON array format:
[{"mood": "Mood Name", "percentage": number}]`;

      const text = await generateWithGeminiREST(prompt, "You are an expert psychological mood analyst.", true, keyToUse);
      const cleanJson = extractJsonArray(text);
      return createSuccessResponse({ success: true, analysis: cleanJson });
    } catch (err: any) {
      return createSuccessResponse({
        success: true,
        analysis: [
          { mood: "Normal", percentage: 70 },
          { mood: "Relaxed", percentage: 30 }
        ],
        source: "local-simulation"
      });
    }
  }

  if (url.includes('/api/gemini/evaluate-habits')) {
    const { habits, period, overallCompliance } = requestBody;
    const formattedHabits = (habits || []).map((h: any) => {
      const totalDone = Object.values(h.history || {}).filter(Boolean).length;
      return `- العادة: "${h.name}" [التصنيف: ${h.category}]
  عدد مرات الإنجاز الكلي: ${totalDone}
  تفاصيل أيام الالتزام: ${JSON.stringify(h.history || {})}`;
    }).join("\n");

    const topHabit = (habits || []).sort((a: any, b: any) => {
      const aCount = Object.values(a.history || {}).filter(Boolean).length;
      const bCount = Object.values(b.history || {}).filter(Boolean).length;
      return bCount - aCount;
    })[0];

    const leastHabit = (habits || []).sort((a: any, b: any) => {
      const aCount = Object.values(a.history || {}).filter(Boolean).length;
      const bCount = Object.values(b.history || {}).filter(Boolean).length;
      return aCount - bCount;
    })[0];

    const topHabitText = topHabit ? (t_resp.topHabitInsight ? t_resp.topHabitInsight.replace('{habit}', topHabit.name) : `أبرز عاداتك التزاماً هي **"${topHabit.name}"**، وهو ما يوضح قدرتك العالية على تثبيت هذا السلوك وتحويله إلى جزء من هويتك اليومية.`) : "";
    const leastHabitText = leastHabit ? (t_resp.leastHabitInsight ? t_resp.leastHabitInsight.replace('{habit}', leastHabit.name) : `تظهر السجلات تراجعاً نسبياً في عادة **"${leastHabit.name}"**.`) : "";

    const fallbackAnswer = `# 📊 تقرير تقييم العادات الشخصية والسلوك (نسخة محاكاة محلية)
  
### 1. 📈 قراءة تحليلية سلوكية للفترة: *${period}*
يظهر من سجلاتك التزام بنسبة **${overallCompliance}%** إجمالاً. هذا مستوى من الانضباط يعكس رغبة صادقة ومحاولة مستمرة لتطوير الذات وبناء هيكل روتيني منظم. 
${topHabitText}

### 2. 🧠 الرابط النفسي والعصبي للعادات المسجلة
* **العادات البدنية والصحية:** شرب الماء وممارسة الرياضة تحفز تدفق الدم والناقلات العصبية مثل *الإندورفين* و*الدوبامين*، مما يقلل بشكل مباشر من مستويات هرمون القلق (الكورتيزول).
* **عادات العقل والتأمل:** التمارين الذهنية والتأمل تعزز مرونة القشرة الجبهية في الدماغ المسؤول عن تنظيم المشاعر والتخطيط، مما يقلل من حدة استجابة الغدة اللوزية (Amygdala) للمواقف الموترة.

### 3. ⚠️ رصد العقبات والتحديات
${leastHabitText}
غالباً ما ينشأ تراجع الالتزام بعادات معينة من:
* **التسويف:** نتيجة ربط العادة بالجهد بدلاً من المكافأة.
* **فقدان المرونة:** محاولة تدوين العادة في أوقات مزدحمة أو غير مريحة.
* **الحل:** استخدم تقنية "ربط العادات" (Habit Stacking)، بوضع العادة الجديدة مباشرة بعد عادة راسخة تفعلها تلقائياً.

### 4. 🚀 خطة عمل مخصصة للمرحلة القادمة
1. **قاعدة الدقيقتين:** ابدأ بأصغر جزء ممكن من العادة لتقليل المقاومة الذهنية الأولية.
2. **تجهيز البيئة:** اجعل أدوات ومحفزات العادات (كوب الماء، كتاب القراءة، لباس الرياضة) مرئية جداً في محيطك اليومي.
3. **نظام المكافأة الفورية:** كافئ نفسك بهدية معنوية أو دقيقة راحة فور الفراغ من إنجاز العادة لإرسال إشارة إيجابية لمسارات الدوبامين في دماغك.`;

    try {
      const userPrompt = `بناءً على قائمة العادات والبيانات التالية لفترة: ${period}، وبنسبة التزام عامة بلغت ${overallCompliance}%:

البيانات المسجلة للعادات:
${formattedHabits}

يرجى تزويدي بتقييم سلوكي شامل باللغة العربية الفصحى يغطي:
1. 📈 قراءة تحليلية سلوكية لمدى الانضباط.
2. 🧠 الرابط النفسي والعصبي والفوائد طويلة المدى للعادات المذكورة.
3. ⚠️ رصد العقبات المحتملة التي قد تؤدي للتراجع.
4. 🚀 خطة عمل وتوصيات سلوكية مخصصة للمرحلة القادمة للتغلب على التحديات وتحسين نسبة الالتزام.

يرجى إظهار التعاطف والتشجيع وتنسيق الرد بشكل منظم وجميل باستخدام Markdown.`;

      const systemInstruction = "أنت خبير ومستشار متميز في تحليل السلوكيات وبناء العادات الإيجابية والتنمية الشخصية المستندة للبيانات العلمية باللغة العربية الفصحى. مهمتك هي قراءة قائمة عادات المستخدم ومدى الالتزام وصياغة تقييم رصين ومحفز.";
      const answer = await generateWithGeminiREST(userPrompt, systemInstruction + '\n\n' + getAILanguageInstruction(reqLang), false, keyToUse);
      return createSuccessResponse({ success: true, answer, source: "gemini" });
    } catch (err: any) {
      return createSuccessResponse({ success: true, answer: fallbackAnswer, source: "local-simulation" });
    }
  }

function getDynamicSmartAdvisorFallback(query: string, reportType: string, diaries: any[], books: any[], gratitudeCards: any[], habits: any[], lang: string = 'ar'): string {
  if (reportType === "therapist") {
    return `# 🎓 تقرير جلسة العلاج النفسي الذكي (تحليل مخصص)
*تم التوليد بناءً على سجل بياناتك اليومية المحفوظة*

### 1. 📝 ملخص التدوين
لديك **${diaries?.length || 0} مذكرات مسجلة**، و**${gratitudeCards?.length || 0} بطاقات امتنان**، و**${habits?.length || 0} عادات سلوكية**.

### 2. 📊 الحالة المزاجية العامة
تظهر البيانات مسيرة متوازنة مع السعي الدائم لتنظيم الأفكار ومواجهة الضغوط بوعي ذاتي ومرونة.

### 3. 🗣️ محاور الجلسة القادمة المقترحة
- كيفية الحفاظ على استمرارية تدوين اليوميات والعادات.
- إدارة توتر المهام والتفكير الزائد في المساء قبل النوم.`;
  }

  const rawQuery = (query || "").trim();
  const cleanedQuery = rawQuery.toLowerCase();

  // Handle identity questions ("من أنا", "أنا مين", etc.)
  if (cleanedQuery.includes("من أنا") || cleanedQuery.includes("أنا مين") || cleanedQuery.includes("من اكون") || cleanedQuery.includes("مين أنا") || cleanedQuery.includes("عرفني بنفسي")) {
    const topHabitNames = (habits || []).slice(0, 3).map((h: any) => `"${h.name}"`).join("، ");
    return `أهلاً بك يا صديقي! بناءً على قراءة ملفك وتدويناتك في تطبيق "يومياتي الذكية":

• **المذكرات واليوميات:** لديك **${(diaries || []).length} مذكرات وخواطر** مسجلة وثقت فيها مشاعرك وأفكارك.
• **العادات السلوكية:** تتابع **${(habits || []).length} عادات**${topHabitNames ? ` (أبرزها: ${topHabitNames})` : ''}.
• **المكتبة والكتب:** تحتوي مكتبتك على **${(books || []).length} كتب ومراجع** مقروءة.
• **بطاقات الامتنان:** سجلت **${(gratitudeCards || []).length} بطاقة امتنان** تعبر عن تقديرك للنعم واللحظات الإيجابية.

أنا "مستشارك الذكي"، متواجد دائماً لتحليل يومياتك وإجابتك عن أي جانب من حياتك، أفكارك، أو عاداتك!`;
  }

  // Search across all data for query keywords
  const stopWords = ["اعرض", "عرض", "الملاحظات", "التي", "تتحدث", "عن", "الخاصة", "بـ", "ما", "ماذا", "هو", "هي", "في", "على", "من", "إلى", "كيف", "هل", "أين", "متى", "اريد", "أريد", "معرفة", "ابحث"];
  const searchTerms = cleanedQuery
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.includes(w));

  const matchingDiaries = (diaries || []).filter((d: any) => {
    const fullText = [
      d.title || "",
      d.content || "",
      (d.moods || []).join(" "),
      (d.tags || []).join(" "),
      (d.symptomsChecklist || []).join(" "),
      (d.cbtWorksheets || []).map((c: any) => `${c.triggerEvent} ${c.negativeThoughts} ${c.rationalAlternative}`).join(" ")
    ].join(" ").toLowerCase();
    return searchTerms.some(term => fullText.includes(term));
  });

  const matchingBooks = (books || []).filter((b: any) => {
    const fullText = `${b.title || ""} ${b.notes || ""}`.toLowerCase();
    return searchTerms.some(term => fullText.includes(term));
  });

  const matchingGratitude = (gratitudeCards || []).filter((g: any) => {
    const fullText = (g.text || "").toLowerCase();
    return searchTerms.some(term => fullText.includes(term));
  });

  const matchingHabits = (habits || []).filter((h: any) => {
    const fullText = `${h.name || ""} ${h.category || ""}`.toLowerCase();
    return searchTerms.some(term => fullText.includes(term));
  });

  if (matchingDiaries.length > 0 || matchingBooks.length > 0 || matchingGratitude.length > 0 || matchingHabits.length > 0) {
    let answer = `### 🔍 نتائج البحث والتحليل المباشر في سجلاتك لسؤالك: "${rawQuery}"\n\n`;
    if (matchingDiaries.length > 0) {
      answer += `#### 📓 التدوينات واليوميات المطابقة (${matchingDiaries.length}):\n`;
      matchingDiaries.slice(0, 5).forEach((d: any) => {
        const dateStr = d.createdAt ? d.createdAt.split('T')[0] : '';
        answer += `* **[📅 ${dateStr}] - ${d.title || 'بدون عنوان'}**\n  > ${d.content ? d.content.substring(0, 250) : ''}...\n`;
      });
      answer += `\n`;
    }
    if (matchingBooks.length > 0) {
      answer += `#### 📚 الكتب والملاحظات المطابقة (${matchingBooks.length}):\n`;
      matchingBooks.forEach((b: any) => {
        answer += `* **"${b.title}"** - ملاحظاتك: ${b.notes || 'لا توجد ملاحظات إضافية'}\n`;
      });
      answer += `\n`;
    }
    if (matchingGratitude.length > 0) {
      answer += `#### 🌸 بطاقات الامتنان المطابقة:\n`;
      matchingGratitude.forEach((g: any) => {
        answer += `* ${g.text}\n`;
      });
      answer += `\n`;
    }
    if (matchingHabits.length > 0) {
      answer += `#### 🎯 العادات ذات الصلة:\n`;
      matchingHabits.forEach((h: any) => {
        answer += `* العادة: **${h.name}**\n`;
      });
    }
    return answer;
  }

  if ((diaries || []).length > 0) {
    const latestDiaries = diaries.slice(0, 3);
    return `بحثت في سجلاتك عن موضوع "${rawQuery}". لم أجد كلمة مطابقة تماماً في الملاحظات الحالية، لكن بناءً على أحدث يومياتك المسجلة (${latestDiaries.map((d: any) => `"${d.title || 'تدوينة'}"`).join('، ')}):\n\n` +
           `• **الرؤية التحليلية:** يظهر أنك تحافظ على تدوين مشاعرك وأفكارك بانتظام.\n` +
           `• **نصيحة المستشار:** يمكنك إضافة تدوينة جديدة تخص موضوع "${rawQuery}" وسأقوم بتحليلها فوراً وربطها بعاداتك وصحتك النفسية!`;
  }

  return `أهلاً بك في **المستشار الذكي لليوميات**! سؤالك حول "${rawQuery}" هو بداية رائعة. لا توجد تدوينات كافية مسجلة بعد في التطبيق. ابدأ بتدوين أفكارك وعاداتك ليتمكن المستشار من إعطائك تحليلات شخصية دقيقة ومليئة بالرؤى والتعاطف!`;
}

  if (url.includes('/api/gemini/upload-file')) {
    try {
      const activeKey = getActiveApiKeyFromSettings();
      if (!activeKey) {
        return createErrorResponse(reqLang === 'ar' ? 'لا يوجد مفتاح Gemini API صالح لاستخدامه في الرفع.' : 'No valid Gemini API key found for uploading.');
      }

      const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${activeKey.trim()}`;
      const reqHeaders = new Headers(init?.headers);
      reqHeaders.set('X-Goog-Upload-Protocol', 'multipart');

      const uploadRes = await originalFetch(uploadUrl, {
        method: 'POST',
        headers: reqHeaders,
        body: init?.body
      });

      if (!uploadRes.ok) {
        if (uploadRes.status === 429 || uploadRes.status === 403) {
          rotateToNextKey(activeKey, 'quota_exhausted');
        }
        const errTxt = await uploadRes.text().catch(() => '');
        return createErrorResponse(reqLang === 'ar' ? `فشل رفع الملف لـ Gemini Files API (HTTP ${uploadRes.status}): ${errTxt}` : `Failed to upload file to Gemini Files API (HTTP ${uploadRes.status}): ${errTxt}`);
      }

      const uploadData = await uploadRes.json();
      return createSuccessResponse({ success: true, file: uploadData.file });
    } catch (err: any) {
      return createErrorResponse(reqLang === 'ar' ? `خطأ شبكة أثناء رفع الملف: ${err?.message || String(err)}` : `Network error during file upload: ${err?.message || String(err)}`);
    }
  }

  if (url.includes('/api/gemini/smart-advisor')) {
    const reqLang = reqHeaders.get('x-app-language') || requestBody.appLanguage || requestBody.langCode || 'ar';
    const {
      diaries,
      query,
      reportType,
      gratitudeCards,
      habits,
      books,
      mode,
      attachments,
      athkarContext,
      athkarPromptText,
      prosConsRecords,
      customCopingCards,
      permissions
    } = requestBody;

    // Build Unified Knowledge Index from all provided app data sources
    const knowledgeIndex = buildUnifiedKnowledgeIndex({
      diaries,
      habits,
      gratitudeCards,
      books,
      athkarContext,
      prosConsRecords,
      customCopingCards,
      permissions
    });

    const userQuery = (query || '').trim();
    let retrievedContext: any = null;
    try {
      retrievedContext = await retrieveRelevantKnowledge(userQuery, knowledgeIndex, {
        maxEntities: 12,
        requireMediaBlobs: true
      });
    } catch (retrievalErr) {
      console.warn('[fetchInterceptor] Knowledge retrieval warning:', retrievalErr);
    }

    const groundedDirectives = getGroundedSystemDirectives(reqLang);

    // Handle General AI Advisor mode
    if (mode === 'general') {
      const isGeneralOnly = !userQuery.includes('يومياتي') && !userQuery.includes('بياناتي') && !userQuery.includes('عاداتي') && !userQuery.includes('كتبي');
      let generalSystemInstruction = `أنت المستشار الذكي العام في تطبيق 'حياة AI'.
تتميز بذكاء موسوعي شامل للإجابة عن أي سؤال في العلوم، البرمجة، الدراسة، التاريخ، الثقافة، والترجمة.
عندما يسأل المستخدم سؤالاً عاماً، أجب بعبقرية ومباشرة كأفضل ذكاء اصطناعي في العالم.
إذا أرفق المستخدم ملفات أو وسائط، قم بتحليلها بدقة واحترافية عالية.` + getLanguageInstruction(reqLang);

      if (!isGeneralOnly && retrievedContext && retrievedContext.matchedEntities.length > 0) {
        generalSystemInstruction += `\n\n${groundedDirectives}\n\n${retrievedContext.formattedContextText}`;
      }

      let extraParts: any[] = [];
      if (attachments && Array.isArray(attachments)) {
        extraParts = attachments
          .filter((att: any) => att && (att.base64Data || att.fileUri) && att.mimeType)
          .map((att: any) => {
            if (att.fileUri) {
              return {
                fileData: {
                  mimeType: att.mimeType,
                  fileUri: att.fileUri
                }
              };
            }
            return {
              inlineData: {
                mimeType: att.mimeType,
                data: att.base64Data
              }
            };
          });
      }

      if (retrievedContext && retrievedContext.multimodalParts && retrievedContext.multimodalParts.length > 0) {
        retrievedContext.multimodalParts.forEach((part: any) => {
          if (part.data) {
            extraParts.push({
              inlineData: {
                mimeType: part.mimeType,
                data: part.data
              }
            });
          } else if (part.fileUri) {
            extraParts.push({
              fileData: {
                mimeType: part.mimeType,
                fileUri: part.fileUri
              }
            });
          }
        });
      }

      try {
        const answer = await generateWithGeminiREST(userQuery || 'Hello', generalSystemInstruction + '\n\n' + getAILanguageInstruction(reqLang), false, keyToUse, extraParts);
        return createSuccessResponse({ success: true, answer, source: 'gemini-general', citations: retrievedContext?.sourceCitations });
      } catch (err: any) {
        return createSuccessResponse({
          success: true,
          answer: `أهلاً بك في المستشار الذكي العام! يسعدني الإجابة على استفسارك حول "${userQuery || 'موضوعك'}" وتقديم التحليلات والمساعدة والمعرفة الشاملة.`,
          source: 'general-fallback'
        });
      }
    }

    const fallbackAnswer = getDynamicSmartAdvisorFallback(userQuery, reportType, diaries, books, gratitudeCards, habits, reqLang);

    try {
      let systemInstruction = `أنت المستشار الذكي الموحد في تطبيق 'حياة AI' (Unified Hayat AI Intelligence).
تجمع ببراعة بين دورين متكاملين:
1) استشاري نفسي وحياتي عميق، واعٍ ومطلع بدقة متناهية على سجلات المستخدم ويومياته وعاداته وتجاربه عبر الزمن (Episodic, Semantic, Temporal, & Media Memory).
2) ذكاء اصطناعي عام موسوعي يجيب عن أي موضوع في الحياة، العلوم، والتطوير الذاتي.

${groundedDirectives}` + getLanguageInstruction(reqLang);

      let userPrompt = "";

      if (reportType === "therapist") {
        userPrompt = `بناءً على سجلات المستخدم الموثقة في التطبيق المرفقة أدناه:
${retrievedContext ? retrievedContext.formattedContextText : ''}

يرجى صياغة "تقرير جلسة العلاج النفسي والتقييم السلوكي الشامل" بدقة علمية وموضوعية موجه للأخصائي النفسي أو للمستخدم ذاتياً، يغطي:
1. 📝 ملخص الفترة الحالية وسياقها العام.
2. 📊 تحليل المشاعر والاتجاهات المزاجية عبر التواريخ المسجلة.
3. 🏆 أهم الإنجازات واللحظات الإيجابية (مع ربطها بالامتنان والكتب والعادات).
4. ⚡ مصادر التوتر والمثيرات (Triggers) الموثقة بالتواريخ.
5. 🔗 تقاطعات السلوك: ربط جودة النوم ومعدل الرياضة بالأعراض النفسية والإنتاجية.
6. 🗣️ محاور مقترحة للنقاش مع المعالج في الجلسة القادمة.
7. 💡 توصيات معرفية وسلوكية واضحة وقابلة للتطبيق.`;
      } else {
        userPrompt = `سؤال المستخدم: "${userQuery}"

${retrievedContext ? retrievedContext.formattedContextText : 'لا توجد بيانات مسجلة مطابقة.'}

المطلوب:
- أجب عن سؤال المستخدم بدقة استناداً إلى البيانات الموثقة المسترجعة أعلاه.
- اذكر المصادر بوضوح عند استخدام معلومات شخصية.
- إذا كان السؤال عاماً بالكامل، أجب بحكمة وذكاء وموسوعية دون التقيد بالتطبيق.
- صغ إجابتك بتنسيق Markdown جميل ومتدفق.`;
      }

      let extraParts: any[] = [];
      if (attachments && Array.isArray(attachments)) {
        extraParts = attachments
          .filter((att: any) => att && (att.base64Data || att.fileUri) && att.mimeType)
          .map((att: any) => {
            if (att.fileUri) {
              return {
                fileData: {
                  mimeType: att.mimeType,
                  fileUri: att.fileUri
                }
              };
            }
            return {
              inlineData: {
                mimeType: att.mimeType,
                data: att.base64Data
              }
            };
          });
      }

      // Add multimodal parts extracted from the knowledge index (drawings, audio, images)
      if (retrievedContext && retrievedContext.multimodalParts && retrievedContext.multimodalParts.length > 0) {
        retrievedContext.multimodalParts.forEach((part: any) => {
          if (part.data) {
            extraParts.push({
              inlineData: {
                mimeType: part.mimeType,
                data: part.data
              }
            });
          } else if (part.fileUri) {
            extraParts.push({
              fileData: {
                mimeType: part.mimeType,
                fileUri: part.fileUri
              }
            });
          }
        });
      }

      const answer = await generateWithGeminiREST(userPrompt, systemInstruction + '\n\n' + getAILanguageInstruction(reqLang), false, keyToUse, extraParts);
      return createSuccessResponse({
        success: true,
        answer,
        source: 'gemini-unified',
        citations: retrievedContext?.sourceCitations,
        correlations: retrievedContext?.crossSourceCorrelations
      });
    } catch (err: any) {
      return createSuccessResponse({ success: true, answer: fallbackAnswer, source: 'smart-fallback' });
    }
  }

  if (url.includes('/api/gemini/diary-assistant')) {
    const { title, content, promptType } = requestBody;
    if (!content || content.trim() === "") {
      return createSuccessResponse({ success: true, answer: getLocalizedAIError('key-missing', reqLang, 'Please write some thoughts first so I can assist you.') });
    }

    let prompt = "";
    if (promptType === "summarize") {
      prompt = `Analyze and summarize the following diary entry concisely in clear, elegant bullet points:\nTitle: "${title || 'Untitled'}"\nEntry: "${content}"${getAILanguageInstruction(reqLang)}`;
    } else if (promptType === "mistakes") {
      prompt = `Read the following diary entry and gently identify any cognitive distortions, behavioral mistakes, or negative thinking patterns, explaining a healthy, rational alternative:\nTitle: "${title || 'Untitled'}"\nEntry: "${content}"${getAILanguageInstruction(reqLang)}`;
    } else if (promptType === "plan") {
      prompt = `Based on this diary entry and the recorded emotions, design an actionable 3-step growth plan for tomorrow:\nTitle: "${title || 'Untitled'}"\nEntry: "${content}"${getAILanguageInstruction(reqLang)}`;
    } else {
      prompt = `Analyze the following diary entry and extract the primary insights:\nTitle: "${title || 'Untitled'}"\nEntry: "${content}"${getAILanguageInstruction(reqLang)}`;
    }

    try {
      const answer = await generateWithGeminiREST(prompt, getAISystemLanguageContract(reqLang, "Diary assistant providing structured psychological summaries and growth steps."), false, keyToUse);
      return createSuccessResponse({ success: true, answer, source: "gemini" });
    } catch (err) {
      const fallback = getLocalizedAIFallback('diary-assistant', { promptType }, reqLang);
      return createSuccessResponse(fallback);
    }
  }

  if (url.includes('/api/gemini/gratitude-advisor')) {
    const { gratitudeCards, diaries, action, cardText, customPrompt } = requestBody;
    const formattedGratitude = (gratitudeCards || []).map((g: any) => `- [${g.createdAt ? g.createdAt.split('T')[0] : ''}] ${g.text}`).join("\n");
    const formattedDiaries = (diaries || []).slice(0, 5).map((d: any) => `العنوان: ${d.title}\nالمحتوى: ${d.content}`).join("\n\n");

    try {
      const systemInstruction = getAISystemLanguageContract(reqLang, "Positive psychology and gratitude advisor specializing in mindfulness and resilience.");
      let userPrompt = "";
      const isJson = action === "ai_generator";

      if (action === "reflect" || action === "reflection") {
        userPrompt = `بناءً على بطاقات الامتنان والأشياء الإيجابية التي سجلتها أدناه، قم بتحليل مصادر السعادة والاستقرار النفسي لدي. اعطني تأملاً جميلاً، معبراً، ومليئاً بالطاقة الإيجابية، بالإضافة إلى نصائح عملية من علم النفس الإيجابي لتعزيز مشاعر الرضا والامتنان في حياتي اليومية.

الأشياء الإيجابية التي أنا ممتن لها:
${formattedGratitude || "لا توجد بطاقات مسجلة حالياً."}

اليوميات الأخيرة للسياق العام:
${formattedDiaries || "لا توجد يوميات مسجلة."}

اكتب ردك باللغة العربية بأسلوب راقٍ، دافئ، ومحفز، باستخدام تنسيق Markdown مريح ومنظم.`;
      } else if (action === "card_analysis") {
        userPrompt = `أنت طبيب وأخصائي نفسي خبير في علم النفس الإيجابي وتطبيقات الامتنان. قم بتحليل هذه اللحظة السعيدة أو النعمة التي دونها المستخدم في بطاقة امتنانه اليوم:
"${cardText || ""}"

قدم له بأسلوب دافئ، لطيف، وعلمي مبسط للغاية (في حدود سطرين أو ثلاثة فقط) كيف يؤثر هذا الحدث إيجابياً على مرونته النفسية وصحته العصبية ومسارات الدوبامين/السيروتونين لديه، وعزز شعوره بالامتنان بكلمة طيبة ومشجعة كطبيب صديق.`;
      } else if (action === "custom_question") {
        userPrompt = `استشارة من المستخدم لمستشار الامتنان والوعي الإيجابي:
"${customPrompt || ""}"

سياق بطاقات امتنان المستخدم:
${formattedGratitude || "لا توجد بطاقات مسجلة."}

اليوميات الأخيرة:
${formattedDiaries || "لا توجد يوميات مسجلة."}

أجب على تساؤل المستخدم أو استشارته بأسلوب دافئ، مشجع، وملهم من منظور علم النفس الإيجابي، واستخدم تنسيق Markdown منظم.`;
      } else if (action === "ai_generator") {
        userPrompt = `أنت معالج وأخصائي نفسي خبير في علم النفس الإيجابي. مهمتك هي قراءة مذكرات اليوميات الأخيرة للمستخدم التالية، والبحث بعناية مفرطة وبصيرة وحساسية إيجابية عن "نعمة بسيطة مخفية" أو "حدث إيجابي لطيف" أو "لحظة رضا" قد يكون المستخدم مر بها ولم يدرك عظمتها بالكامل في غمرة القلق.
صغ هذه النعمة في بطاقة امتنان واضحة ورشيقة باللغة العربية تبدأ بضمير المتكلم (مثال: "أنا ممتن لـ...") بحيث يمكن إضافتها لمفكرة الامتنان لتعزز مرونته النفسية.

اليوميات الأخيرة للمستخدم:
${formattedDiaries || "لا توجد يوميات مسجلة."}

يجب أن تقوم بإرجاع النتيجة ككائن JSON صرف فقط بدون أي ماركداون أو تعليقات خارجية، بالتنسيق التالي:
{
  "text": "نص بطاقة الامتنان المقترح بالكامل وبأسلوب ملهم دافئ",
  "suggestedColor": "اسم صنف اللون المقترح من القائمة التالية فقط: yellow أو green أو peach أو lavender أو blue أو pink"
}

إذا لم تكن هناك يوميات كافية أو لم تجد أي لحظة مناسبة، فاقترح بطاقة امتنان عامة دافئة وجميلة تناسب السعي نحو راحة البال والسلام الداخلي.`;
      } else {
        userPrompt = `أريد أن أكتب في مفكرة الامتنان اليوم ولكنني أشعر ببعض الحيرة أو الروتين. بناءً على يومياتي الأخيرة وسياق حياتي أدناه، اقترح عليّ 3 أسئلة تفكرية أو تلميحات امتنان دقيقة ومخصصة (Gratitude Prompts) تحفزني على ملاحظة الأشياء الجميلة والصغيرة المحيطة بي اليوم لأسجلها في مفكرتي.

الأشياء الإيجابية التي سجلتها سابقاً للامتنان:
${formattedGratitude || "لا توجد بطاقات سابقة."}

اليوميات الأخيرة للسياق العام:
${formattedDiaries || "لا توجد يوميات مسجلة."}

اعطني الاقتراحات بأسلوب ودي ولطيف باللغة العربية، مع تقديم فكرة بسيطة خلف كل اقتراع وكيف تساهم في تحسين مزاجي وسلوكي اليومي.`;
      }

      const text = await generateWithGeminiREST(userPrompt, systemInstruction + '\n\n' + getAILanguageInstruction(reqLang), isJson, keyToUse);
      
      if (isJson) {
        const parsed = JSON.parse(text.trim());
        return createSuccessResponse({ success: true, answer: JSON.stringify(parsed), source: "gemini" });
      }
      return createSuccessResponse({ success: true, answer: text, source: "gemini" });
    } catch (err: any) {
      if (action === "ai_generator") {
        return createSuccessResponse({
          success: true,
          answer: JSON.stringify({
            text: reqLang === 'ar' ? "أنا ممتن للغاية لراحة بال اليوم والفرصة الجديدة لتدوين خواطري وأفكاري." : "I am deeply grateful for the peace of mind today and the new opportunity to record my thoughts and ideas.",
            suggestedColor: "green"
          }),
          source: "local-simulation"
        });
      }
      return createSuccessResponse({
        success: true,
        answer: reqLang === 'ar' ? "الامتنان للأشياء الصغيرة في حياتنا يفتح آفاق السكينة ويعزز المرونة النفسية بشكل مستمر." : "Gratitude for the little things in our lives opens up horizons of tranquility and continuously enhances psychological resilience.",
        source: "local-simulation"
      });
    }
  }

  if (url.includes('/api/gemini/cbt-analyze')) {
    const { triggerEvent, negativeThoughts } = requestBody;
    try {
      const prompt = `You are a clinical CBT cognitive restructuring expert.
Analyze the following negative automatic thought triggered by an activating event:
Trigger Event: "${triggerEvent || 'Unspecified'}"
Negative Automatic Thought: "${negativeThoughts}"

Goal:
1. Identify the most matching Cognitive Distortion (e.g. All-or-Nothing Thinking, Catastrophizing, Personalization, Mind Reading, Emotional Reasoning, Overgeneralization) and provide a concise, convincing explanation in 2 lines.
2. Formulate the most rational and balanced alternative thought that deconstructs the negative belief and restores mental clarity and composure in 2-3 lines.

Return strictly as a raw JSON object with format:
{
  "cognitiveDistortion": "Name and brief explanation of distortion",
  "rationalAlternative": "Proposed rational alternative thought"
}
${getAILanguageInstruction(reqLang)}`;

      const text = await generateWithGeminiREST(prompt, getAISystemLanguageContract(reqLang, "Clinical CBT restructuring and distortion analysis."), true, keyToUse);
      const parsed = JSON.parse(text.trim());
      return createSuccessResponse({ success: true, ...parsed, source: "gemini" });
    } catch (err: any) {
      const fallback = getLocalizedAIFallback('cbt-analyze', undefined, reqLang);
      return createSuccessResponse(fallback);
    }
  }

  if (url.includes('/api/gemini/daily-inspiration')) {
    const { moods } = requestBody;
    const moodsStr = moods ? moods.join(", ") : "Normal";
    try {
      const prompt = `You are an expert in positive psychology, self-actualization, and emotional resilience.
Based on the user's current moods today: (${moodsStr}), generate a profound, inspirational wisdom quote or practical mindful reflection for peace of mind and inner strength.

Return strictly as a raw JSON object with format:
{
  "quote": "Inspirational mindful quote or reflection",
  "author": "Attribution or source name"
}
${getAILanguageInstruction(reqLang)}`;

      const text = await generateWithGeminiREST(prompt, getAISystemLanguageContract(reqLang, "Inspiring psychological wisdom generation."), true, keyToUse);
      const parsed = JSON.parse(text.trim());
      return createSuccessResponse({ success: true, ...parsed, source: "gemini" });
    } catch (err: any) {
      const fallback = getLocalizedAIFallback('daily-inspiration', undefined, reqLang);
      return createSuccessResponse(fallback);
    }
  }

  if (url.includes('/api/gemini/diary-chat')) {
    const { title, content, chatLogs, newMessage, diaryType, moods, attachments, audioTranscriptions, tags } = requestBody;
    const formattedLogs = (chatLogs || []).map((msg: any) => `${msg.sender === 'user' ? 'المستخدم' : 'المعالج النفسي الذكي'}: ${msg.text}`).join("\n");

    const prompt = `أنت طبيب نفسي ومعالج إكلينيكي متعاطف وخبير باللغة العربية.
أنت الآن في جلسة علاجية تفاعلية سرية تسمى "مساحة الفضفضة والتحليل 🧠✨" مع المستخدم بناءً على ما دونه في مذكرته الحالية:
العنوان: "${title || 'بدون عنوان'}"
نوع التدوين: "${diaryType === 'thought' ? 'خاطرة وأفكار سريعة' : 'يومية تفصيلية'}"
الحالة المزاجية المحددة: "${moods ? moods.join(', ') : 'طبيعي'}"
الوسوم: "${tags ? tags.join(', ') : 'بدون وسوم'}"
المحتوى الأساسي المكتوب:
"${content || 'لم يكتب المستخدم نصاً بعد'}"

تفريغ التسجيلات الصوتية المرفقة:
${audioTranscriptions ? audioTranscriptions.join('\n') : 'لا يوجد'}

المرفقات والوسائط المتاحة للتحليل: ${attachments ? attachments.join(', ') : 'لا يوجد مرفقات'}
سجل الحوار السابق:
${formattedLogs || 'لا يوجد حوار سابق، هذه بداية الجلسة.'}

رسالة المستخدم الجديدة الحالية: "${newMessage}"

المطلوب منك بالتفصيل والاحترافية:
1. اقرأ رسالة المستخدم الجديدة بتمعن ودقة ("${newMessage}"). أجب مباشرة وبشكل وافٍ ومفصل عليها دون إجابات مكررة أو قالب جاهز.
2. إذا ألقى التحية أو سأل "كيف حالك": أرحب به بأسلوب دافئ ومهني كاستشاري نفسي جاهز لمساعدته والإنصات لما دونه.
3. إذا طلب استخراج الأخطاء المعرفية والتشوهات الفكرية (CBT): حلل النص واستخرج التشوهات مثل التهويل، الشخصنة، القراءة الذهنية، والتفكير القاطعي مع إعطاء البديل العقلاني والتمرين المناسب.
4. إذا طلب تلخيص المذكرة: اعطه ملخصاً إنسانياً ونفسياً وتوصية عمل.
5. حافظ على لغة عربية فصحى راقية، مشجعة، وواضحة، واجعل إجابتك كاملة ومفصلة ووافية.`;

    try {
      const answer = await generateWithGeminiREST(prompt + '\n\n' + getAILanguageInstruction(reqLang), undefined, false, keyToUse);
      if (answer && answer.trim() !== '') {
        return createSuccessResponse({ success: true, answer, source: "gemini" });
      }
      throw new Error("Empty response from Gemini");
    } catch (err: any) {
      const answer = generateSmartDynamicDiaryChatReply(newMessage, title, content, moods, tags, audioTranscriptions, chatLogs);
      return createSuccessResponse({
        success: true,
        answer,
        source: "dynamic-smart-ai"
      });
    }
  }

  // Backup & Sync endpoints client-side simulation
  if (url.includes('/api/gemini/transcribe-audio')) {
    const { audioData, mimeType: providedMime, fileUri } = requestBody;
    let mimeType = providedMime || "audio/mp3";
    let base64Data = audioData || "";

    if (audioData && typeof audioData === 'string' && audioData.startsWith("data:")) {
      const parts = audioData.split(";base64,");
      if (parts.length === 2) {
        const mimeMatch = parts[0].match(/data:(.*?)$/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
        base64Data = parts[1];
      }
    }

    try {
      const candidateKeys = getCandidateApiKeys(keyToUse);
      if (candidateKeys.length === 0) {
        return createErrorResponse("يلزم إضافة مفتاح Gemini API الخاص بك أولاً في إعدادات التطبيق لتفريغ التسجيلات الصوتية بالذكاء الاصطناعي.");
      }

      if (base64Data || fileUri) {
        const modelsToTry = ['gemini-2.5-flash', 'gemini-3.7-flash'];
        let lastError = "";
        const globalDeadline = Date.now() + 120000; // 120s Global Timeout

        keyLoop: for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
          const currentKey = candidateKeys[keyIdx];

          for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
            if (Date.now() >= globalDeadline) {
              console.warn('[AudioTranscription] Global timeout (120s) reached, halting attempts.');
              lastError = "GLOBAL_TIMEOUT";
              break keyLoop;
            }

            const modName = modelsToTry[modelIdx];
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modName}:generateContent?key=${currentKey.trim()}`;
            const promptText = `You are an expert audio transcription specialist and speech emotion recognition analyst.
Listen to the attached audio recording and do the following:
1. قم بتفريغ هذا التسجيل الصوتي بدقة عالية إلى نص عربي منظم، حافظ على جميع الكلمات والتفاصيل دون حذف أو اختصار، صحح الأخطاء الواضحة الناتجة عن التعرف الصوتي، وأضف علامات الترقيم المناسبة مع الحفاظ على المعنى الأصلي وعدم اختلاق أي كلام غير موجود في التسجيل.
2. Analyze speech emotion and vocal tone accurately based on pitch, cadence, and expression.
3. Determine primary emotion.
4. Rate emotion intensity score from 0 to 100%.
5. Write a concise note explaining vocal tone details.

${getLanguageInstruction(requestBody.appLanguage)}

Return pure JSON only in the following format:
{
  "transcription": "Full accurate transcribed text...",
  "emotion": "Normal",
  "intensityScore": 75,
  "intensityLabel": "Medium",
  "vocalToneDetails": "Vocal tone observation...",
  "recommendedColor": "teal"
}`;

            // Normalize and strip parameters (like ;codecs=opus) from MIME type
            let reqMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
            if (reqMime.includes("webm") || reqMime.includes("opus")) reqMime = "audio/webm";
            else if (reqMime.includes("mp3") || reqMime.includes("mpeg")) reqMime = "audio/mp3";
            else if (reqMime.includes("wav") || reqMime.includes("x-wav")) reqMime = "audio/wav";
            else if (reqMime.includes("ogg")) reqMime = "audio/ogg";
            else if (reqMime.includes("mp4") || reqMime.includes("m4a") || reqMime.includes("aac")) reqMime = "audio/mp4";
            else if (reqMime.includes("flac")) reqMime = "audio/flac";
            else if (reqMime.includes("3gp") || reqMime.includes("amr")) reqMime = "audio/3gpp";
            else reqMime = "audio/webm";

            const audioPart = fileUri
              ? { fileData: { mimeType: reqMime, fileUri: fileUri } }
              : { inlineData: { mimeType: reqMime, data: base64Data } };

            const reqBody = {
              contents: [{
                parts: [
                  audioPart,
                  { text: promptText }
                ]
              }],
              generationConfig: { responseMimeType: "application/json" }
            };

            const controller = new AbortController();
            const timeoutTimer = setTimeout(() => controller.abort(), 45000);
            const reqStart = Date.now();

            try {
              const res = await originalFetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody),
                signal: controller.signal
              });
              clearTimeout(timeoutTimer);
              const elapsed = Date.now() - reqStart;

              if (res.ok) {
                const responseText = await res.text();
                if (!responseText || !responseText.trim()) {
                  throw new Error("استجابة فارغة من خادم الذكاء الاصطناعي");
                }
                recordKeySuccess(currentKey);
                console.log(`[AudioTranscription] Success with Model: ${modName} | Key #${keyIdx + 1} | Time: ${elapsed}ms`);
                const resJson = JSON.parse(responseText);
                const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
                const parsed = JSON.parse(rawText.trim());
                return createSuccessResponse({
                  success: true,
                  transcription: parsed.transcription || (reqLang === 'ar' ? "تم تفريغ الصوت بنجاح." : "Audio transcribed successfully."),
                  speechEmotion: {
                    emotion: parsed.emotion || (reqLang === 'ar' ? "طبيعي" : "Normal"),
                    intensityScore: parsed.intensityScore || 70,
                    intensityLabel: parsed.intensityLabel || (reqLang === 'ar' ? "متوسطة" : "Medium"),
                    vocalToneDetails: parsed.vocalToneDetails || (reqLang === 'ar' ? "نبرة صوت هادئة ومستقرة" : "Calm and stable vocal tone"),
                    recommendedColor: parsed.recommendedColor || "teal"
                  },
                  source: "gemini"
                });
              } else {
                const errJson = await res.json().catch(() => ({}));
                lastError = errJson?.error?.message || res.statusText || `HTTP ${res.status}`;
                const errType = classifyGeminiError(res.status, lastError);
                console.warn(`[AudioTranscription] Model: ${modName} | Key #${keyIdx + 1} | Status: ${res.status} | ErrType: ${errType} | Time: ${elapsed}ms`);

                if (errType === 'quota_exhausted' || errType === 'invalid_key') {
                  rotateToNextKey(currentKey, errType);
                  break; // break model loop to try next candidate key
                }

                if (res.status === 404 || res.status === 503 || res.status === 529 || lastError.includes('high demand') || lastError.includes('not found')) {
                  continue; // try next model with same key
                }
              }
            } catch (modelErr: any) {
              clearTimeout(timeoutTimer);
              const elapsed = Date.now() - reqStart;
              const isAbort = modelErr?.name === 'AbortError';
              lastError = isAbort ? 'انتهت مهلة استجابة النموذج (Timeout)' : (modelErr?.message || `خطأ في الاتصال بالنموذج ${modName}`);
              console.warn(`[AudioTranscription] Model: ${modName} | Key #${keyIdx + 1} | Exception: ${lastError} | Time: ${elapsed}ms`);
            }
          }
        }

        if (lastError === "GLOBAL_TIMEOUT") {
          return createErrorResponse(
            reqLang === 'ar'
              ? "استغرقت معالجة التسجيل الصوتي وقتاً أطول من المتوقع، يرجى المحاولة مرة أخرى أو اختيار تسجيل أصغر."
              : "Audio processing took longer than expected. Please try again shortly."
          );
        }

        if (lastError.toLowerCase().includes('high demand') || lastError.toLowerCase().includes('overloaded') || lastError.includes('503') || lastError.includes('529')) {
          lastError = reqLang === 'ar'
            ? "يشهد خادم الذكاء الاصطناعي ضغطاً مؤقتاً حالياً، يرجى إعادة المحاولة بعد قليل."
            : "The AI service is experiencing temporary high demand. Please try again shortly.";
        }

        return createErrorResponse(lastError || "فشل تفريغ الصوت عبر طرازات Gemini.");
      }
    } catch (err: any) {
      return createErrorResponse(err.message || "تعذر معالجة التسجيل الصوتي.");
    }

    return createErrorResponse(reqLang === 'ar' ? "يرجى إرفاق ملف صوتي صالح لتفريغه بالذكاء الاصطناعي." : "Please attach a valid audio file for AI transcription.");
  }

  if (url.includes('/api/gemini/generate-note')) {
    const { promptTopic } = requestBody;
    const topic = promptTopic || "Mental wellness, balance and daily productivity";
    try {
      const prompt = `You are an expert AI knowledge synthesizer and personal growth writer. Write a rich, insightful, well-structured article or reflective note about the following topic:
Requested Topic: "${topic}"

Return strictly as a raw JSON object with format:
{
  "title": "Compelling and relevant title",
  "content": "Detailed, structured article content with clear bullet points, actionable insights, and fitting formatting"
}
${getAILanguageInstruction(reqLang)}`;

      const text = await generateWithGeminiREST(prompt, getAISystemLanguageContract(reqLang, "Synthesizing structured notes and wellness articles."), true, keyToUse);
      const parsed = JSON.parse(text.trim());
      return createSuccessResponse({ success: true, ...parsed, source: "gemini" });
    } catch (err: any) {
      const fallback = getLocalizedAIFallback('generate-note', { topic }, reqLang);
      return createSuccessResponse(fallback);
    }
  }

  if (url.includes('/api/cloud-sync/save')) {
    try {
      localStorage.setItem('yawmiyaty_cloud_sync_state', JSON.stringify(requestBody));
      return createSuccessResponse({ success: true, message: "تمت المزامنة السحابية بنجاح وحفظ نسختك الاحتياطية بأمان (محلياً لعدم توفر خادم)" });
    } catch (e) {
      return createErrorResponse("فشل حفظ وتزامن البيانات سحابياً");
    }
  }

  if (url.includes('/api/cloud-sync/fetch')) {
    try {
      const stored = localStorage.getItem('yawmiyaty_cloud_sync_state');
      const data = stored ? JSON.parse(stored) : null;
      return createSuccessResponse({ success: true, data });
    } catch (e) {
      return createErrorResponse("فشل استرجاع البيانات المزامنة سحابياً");
    }
  }

  if (url.includes('/api/backup/email')) {
    return createSuccessResponse({ 
      success: true, 
      message: `تمت محاكاة إرسال النسخة الاحتياطية بنجاح وتأمينها! تم حفظ ملف النسخة الاحتياطية في السجل السحابي المحلي بنجاح لصاحب البريد: ${requestBody.email}`
    });
  }

  return originalFetch(url, init);
}

// Helper to construct success response
function createSuccessResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper to construct error response
function createErrorResponse(message: string, requiresKey: boolean = true): Response {
  return new Response(JSON.stringify({ success: false, error: message, requiresKey }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Utility to clean up and parse JSON Array output from Gemini
function extractJsonArray(text: string): any[] {
  try {
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Failed to parse JSON Array from Gemini text:", text, e);
    return [];
  }
}

export function generateSmartDynamicDiaryChatReply(
  newMessage: string,
  title?: string,
  content?: string,
  moods?: string[],
  tags?: string[],
  audioTranscriptions?: string[],
  chatLogs?: any[]
): string {
  const msg = (newMessage || '').trim();
  const msgLower = msg.toLowerCase();
  const diaryText = (content || '').trim();
  const moodList = moods && moods.length > 0 ? moods.join(', ') : 'Balanced';

  // 1. Cognitive Distortions / CBT Analysis
  if (
    msgLower.includes('distortion') ||
    msgLower.includes('cbt') ||
    msgLower.includes('cognitive') ||
    msgLower.includes('negative') ||
    msgLower.includes('reframe') ||
    msgLower.includes('analyze')
  ) {
    return `💡 **Cognitive Distortions & CBT Analysis:**

Hello! Based on your journal entry ("${title || 'Today'}"), here is a psychological reframing analysis:

1️⃣ **All-or-Nothing Thinking / Catastrophizing**:
• 📌 **Observation**: Tendency to use absolute statements or fear worst-case scenarios.
• ⚖️ **Rational Alternative**: Focus on flexible outcomes. Human experiences exist on a continuum rather than black-or-white extremes.

🌱 **Mindful Practice for Today:**
Write down the bothersome thought, then write down 2 objective facts that challenge it. *Remember: Thoughts are perspectives, not absolute facts!* ✨`;
  }

  // 2. Summarization Request
  if (
    msgLower.includes('summarize') ||
    msgLower.includes('summary') ||
    msgLower.includes('overview')
  ) {
    const summaryCore = diaryText
      ? `Your entry discusses: "${diaryText.length > 200 ? diaryText.slice(0, 200) + '...' : diaryText}"`
      : `Entry titled "${title || 'Today\'s Notes'}" with recorded moods: (${moodList}).`;

    return `📝 **Journal Summary & Emotional Analysis:**

📌 **Content Overview:**
${summaryCore}

🧠 **Emotional Insight:**
• **Recorded Moods**: ${moodList}.
• **Psychological Perspective**: Demonstrates self-awareness and a proactive desire for clarity and balance. ✨`;
  }

  // 3. Greetings & How are you
  if (
    msgLower.includes('hello') ||
    msgLower.includes('hi') ||
    msgLower.includes('hey') ||
    msgLower.includes('who are you') ||
    msgLower.includes('how are you')
  ) {
    return `Hello! 🌿

I am your Smart AI Psychological Counselor in your **Reflection & Analysis Space 🧠✨**. I am ready to listen and assist you with your journal entries!

I can help you:
1. 💡 **Identify Cognitive Distortions** and reframe negative thoughts using CBT.
2. 📝 **Summarize your entries** and analyze emotional tone.
3. 🧘‍♂️ **Provide tailored relaxation and coping techniques**.

How are you feeling today? Feel free to ask anything about your entry ("${title || 'Today'}")! ✨`;
  }

  // 4. Emotional support / Advice / Coping questions
  if (
    msgLower.includes('advice') ||
    msgLower.includes('help') ||
    msgLower.includes('solution') ||
    msgLower.includes('afraid') ||
    msgLower.includes('anxious') ||
    msgLower.includes('sad') ||
    msgLower.includes('tired') ||
    msgLower.includes('insomnia') ||
    msgLower.includes('stress')
  ) {
    return `🤝 **Tailored Psychological Guidance:**

Regarding your query: *"${msg}"*:

1️⃣ **Mindful Acceptance:** Allow yourself to experience current emotions without judgment.
2️⃣ **Journal Dump:** Use your journal ("${title || 'My Notes'}") to dump thoughts and ease cognitive load.
3️⃣ **4-7-8 Calming Breathing:**
• Inhale through nose for 4s.
• Hold breath for 7s.
• Exhale slowly through mouth for 8s.

Feel free to share any details you would like to discuss further! 🌸`;
  }

  // 5. Topic-Specific & General Custom Queries
  if (msgLower.includes('work') || msgLower.includes('job') || msgLower.includes('manager') || msgLower.includes('company') || msgLower.includes('project')) {
    return `💼 **Work & Productivity Guidance:**

Regarding your workplace query: *"${msg}"*:

1️⃣ **Set Psychological Boundaries**: Distinguish between factors you control and external variables.
2️⃣ **Incremental Progress**: Break large tasks into small manageable micro-goals.
3️⃣ **Reflect**: Your entry reflects a genuine drive to regain balance and clarity. ✨`;
  }

  if (msgLower.includes('sleep') || msgLower.includes('insomnia') || msgLower.includes('rest') || msgLower.includes('fatigue')) {
    return `🌙 **Sleep Hygiene & Recovery Guidance:**

Regarding your sleep query: *"${msg}"*:

1️⃣ **Nervous System Wind-Down**: Avoid screens 45 minutes before sleep to support melatonin production.
2️⃣ **Pre-Bed Brain Dump**: Write down pending worries under "Postponed for Tomorrow".
3️⃣ **Rhythmic Breathing**: Practice deep diaphragmatic breathing in bed. 💤`;
  }

  if (msgLower.includes('relationship') || msgLower.includes('friend') || msgLower.includes('family') || msgLower.includes('love')) {
    return `🌱 **Interpersonal Relationship Support:**

Regarding your query: *"${msg}"*:

1️⃣ **Clear Expressive Communication**: Use "I" statements to share feelings objectively.
2️⃣ **Healthy Emotional Boundaries**: Protecting your energy promotes long-term balance and mutual respect.
3️⃣ **Reflection**: Journaling helps you observe relationships with clarity and perspective. ✨`;
  }

  if (msgLower.includes('procrastination') || msgLower.includes('focus') || msgLower.includes('distraction') || msgLower.includes('time')) {
    return `🎯 **Overcoming Procrastination & Enhancing Focus:**

Regarding your productivity query: *"${msg}"*:

1️⃣ **The 5-Minute Rule**: Commit to working on a task for just 5 minutes to overcome initial friction.
2️⃣ **Task Chunking**: Break large objectives into frictionless micro-steps.
3️⃣ **Environment Setup**: Eliminate notifications to foster flow state. 💡`;
  }

  // General Detailed Response
  return `💬 **Psychological Counselor Guidance:**

Thank you for your question: *"${msg}"*.

Based on your entry ("${title || 'Today'}") and mood context (${moodList}):

1️⃣ **Awareness & Reflection**: Exploring these questions demonstrates valuable self-awareness.
2️⃣ **Action Steps**: Focus on tangible, immediate steps you can control today while giving yourself grace.

I am always here to support your self-reflection journey! ✨`;
}
