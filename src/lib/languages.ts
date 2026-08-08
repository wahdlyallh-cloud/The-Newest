import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppLanguage = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'ru' | 'zh' | 'ja';

export interface LanguageInfo {
  code: AppLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'rtl' | 'ltr';
  speechLang: string;
  aiPromptLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', speechLang: 'ar-SA', aiPromptLang: 'Arabic (العربية)' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', speechLang: 'en-US', aiPromptLang: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr', speechLang: 'fr-FR', aiPromptLang: 'French (Français)' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr', speechLang: 'de-DE', aiPromptLang: 'German (Deutsch)' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr', speechLang: 'es-ES', aiPromptLang: 'Spanish (Español)' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', dir: 'ltr', speechLang: 'tr-TR', aiPromptLang: 'Turkish (Türkçe)' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', dir: 'rtl', speechLang: 'ur-PK', aiPromptLang: 'Urdu (اردو)' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr', speechLang: 'ru-RU', aiPromptLang: 'Russian (Русский)' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr', speechLang: 'zh-CN', aiPromptLang: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr', speechLang: 'ja-JP', aiPromptLang: 'Japanese (日本語)' },
];

export function getLanguageInfo(code?: AppLanguage | string | null): LanguageInfo {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return found || SUPPORTED_LANGUAGES[0];
}

// Complete Arabic translation dictionary - Single Source of Truth
const AR_DICT: Record<string, any> = {
  // Navigation & Tabs
  'nav.home': 'الرئيسية',
  'nav.diaries': 'اليوميات',
  'nav.advisor': 'المستشار الذكي',
  'nav.progress': 'التقدم والبيانات',
  'nav.settings': 'الإعدادات',
  'nav.hayat_ai': 'حياة AI',
  'nav.active_now': 'نشط الآن',
  'nav.fullscreen': 'ملء الشاشة',
  'nav.account_title': 'حسابك الشخصي',
  'nav.lock_app': 'قفل التطبيق',
  'nav.switch_language': 'تغيير اللغة',
  'nav.dhikr': 'الأذكار والراحة',
  'nav.dhikr_title': 'عداد الأذكار والراحة النفسية',
  'nav.daily_tasks': 'المهام اليومية',
  'nav.gratitude': 'جدار الامتنان',
  'nav.my_thoughts': 'خواطري وتأملاتي',
  'nav.journal_records': 'سجل اليوميات',
  'nav.therapy_session': 'جلسة دعم نفسي',
  'nav.back_btn': 'رجوع',
  'nav.back_title': 'رجوع',
  'nav.back_mobile_title': 'رجوع',
  'nav.auto_saved': 'تم الحفظ تلقائياً',
  'nav.saving': 'جاري الحفظ...',
  'nav.current_page': 'الصفحة الحالية',
  'nav.subtitle': 'مساحتك النفسية الخاصة',
  'nav.tasks': 'المهام اليومية',
  'nav.edit_diary': 'تعديل التدوينة',
  'nav.sign_in': 'تسجيل الدخول',
  'nav.reveal_header_pill': 'إظهار الشريط العلوي',

  // Common UI & Buttons
  appName: 'حياة AI',
  homeTab: 'الرئيسية',
  diariesTab: 'اليوميات',
  advisorTab: 'المستشار',
  analyticsTab: 'التقدم والبيانات',
  settingsTab: 'الإعدادات',
  yes: 'نعم',
  no: 'لا',
  closeBtn: 'إغلاق',
  retryBtn: 'إعادة المحاولة',
  cancelBtn: 'إلغاء',
  save_btn: 'حفظ المذكرة',
  saveAndCloseBtn: 'حفظ وإغلاق',
  sendBtn: 'إرسال',
  clearBtn: 'مسح',
  back_btn: 'رجوع',
  understoodBtn: 'فهمت ذلك',
  confirmImportBtn: 'تأكيد الاستيراد',
  deleteKeyBtn: 'حذف المفتاح',
  saveKeyBtn: 'حفظ المفتاح',

  // Media & Key Action Labels
  photo: 'صورة 📸',
  video: 'فيديو 🎥',
  audio: 'صوت 🎙️',
  document: 'وثيقة 📄',
  task: 'مهمة 📋',
  advisor: 'مستشار 🤖',
  mood: 'مزاج 🌿',
  voiceRecord: 'تسجيل صوتي 🎙️',
  write: 'كتابة ✍️',
  attachPhoto: 'صورة وتعليق 📸',
  attachPhotoSub: 'توثيق اللحظة بذاكرة مصورة',
  phoneVideo: 'فيديو الهاتف 🎥',
  phoneVideoSub: 'تحليل المشاعر في مقطع فيديو',
  audioFile: 'تسجيل صوتي 🎙️',
  audioFileSub: 'تفريغ صوتك وتحليله ذكائياً',
  bookDoc: 'وثيقة أو كتاب 📖',
  bookDocSub: 'استخلاص الفوائد والحكم',
  freeWrite: 'فضفضة وحرية كتابة ✍️',
  freeWriteSub: 'تفريغ ذهني كامل بدون قيود',
  aiAdvisor: 'المستشار الذكي 🤖',
  aiAdvisorSub: 'تحليل وتوجيه نفسي فوري',
  aiPsychAdvisor: 'المستشار النفسي الذكي 🧠',

  // Dhikr & Mindfulness
  dhikrTitle: 'عداد الأذكار والراحة النفسية 📿',
  dhikrSub: 'ألا بذكر الله تطمئن القلوب - استرخِ واذكر الله',
  dhikrMainQuote: 'أَلا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ 🌿',
  dhikrBlessing: 'اللهم اجعلنا من الذاكرين الله كثيراً والذاكرات ✨',
  dhikrCounterBtn: 'اضغط للتسبيح 📿',
  dhikrCountLabel: 'عدد التسبيحات',
  dhikrFooter: 'سبحان الله وبحمده، سبحان الله العظيم',

  // Notifications & Reminders
  notificationActiveNow: 'التنبيهات نشطة الآن 🔔',
  notificationHowAreYou: 'كيف حالك الذهني اليوم؟ 🌿',
  notificationTapShortcut: 'اضغط لفتح التطبيق والفضفضة بحرية',
  notificationsTitle: 'الإشعارات والتنبيهات 🔔',
  notificationsSub: 'تفعيل تنبيهات الاطمئنان وشرب الماء والرياضة',
  remindersTitle: 'التذكيرات الذكية ⏰',
  remindersSub: 'ضبط أوقات التذكير بالتدوين اليومي',
  reminderTime: 'وقت التذكير',

  // Biometric Auth & Security
  faceIdBtn: 'فتح ببصمة الوجه Face ID 👤',
  fingerprintBtn: 'فتح ببصمة الاصبع Fingerprint 👆',
  biometricScanTitle: 'التحقق من بصمة الجهاز 🔐',
  biometricScanInstruction: 'ضع أصل إصبعك أو وجهك للتحقق من هويتك',
  biometricSuccessTitle: 'تم التحقق بنجاح! 🎉',
  biometricFailedTitle: 'فشل التحقق ❌',
  biometricNotLinkedTitle: 'البصمة غير مسجلة',
  biometricNotLinkedDesc: 'سجل بصمتك أولاً من إعدادات الأمان',
  biometricAlreadyRegistered: 'البصمة مسجلة بالفعل 🔐',
  biometricNotSupported: 'جهازك لا يدعم البصمة أو الإذن غير ممنوح',
  biometricUserCanceled: 'تم إلغاء العملية بواسطة المستخدم',
  pinCodeBtn: 'رمز PIN الخاص 🔑',
  usePinInsteadBtn: 'استخدام رمز PIN بدلاً من البصمة',
  lockscreenBtn: 'إشعار شاشة القفل 📌',
  lockscreenHint: 'تثبيت شريط الوصول السريع في الإشعارات على شاشة القفل',
  lockscreenSecured: 'شاشة القفل محمية 🔐',
  appLockTitle: 'قفل التطبيق برمز PIN 🔐',
  appLockSub: 'حماية مذكراتك بكلمة مرور خاصة',

  // Home Screen
  welcomeSafeSpace: 'مساحتك النفسية الآمنة والخاصة بالكامل 🌿',
  safeSpaceDesc: 'سجل أفكارك بحرية تامّة، محمي بتشفير تام ومساعد ذكي يرافق يومك.',
  greetingDesc: 'أتمنى لك يوماً يملؤه الاطمئنان والسلام الداخلي.',
  streakTitle: 'سلسلة الالتزام',
  dayStreak: 'أيام متتالية',
  longestStreak: 'أطول سلسلة',
  streakEncouragement: 'واصل التدوين اليومي للحفاظ على اتزانك الذهني!',
  aiInspirationBtn: 'إلهام وفكرة كتابة 💡',
  quickPromptSuggestionsTitle: 'مقترحات سريعة للبدء:',
  askAiWriterHeader: 'اسأل مستشارك النفسي أو اطلب كتابة نص تحفيزي:',
  expressMindPlaceholder: 'عَبّر عما يدور في ذهنك بحرية وسيقدم لك المساعد توجيهاً عقلانياً دافئاً...',

  // Journal & Subtabs
  'journal.subtab_journal': 'يومياتي والفضفضة',
  'journal.subtab_tasks': 'المهام اليومية',
  'journal.subtab_gratitude': 'جدار الامتنان',
  'journal.subtab_cbt': 'تمارين العلاج المعرفي CBT',
  'journal.subtab_proscons': 'سجل الإيجابيات والسلبيات',
  'journal.write_new': 'كتابة مذكرة جديدة',
  'journal.import_btn': 'استيراد يوميات',
  'journal.search_placeholder': 'ابحث في اليوميات والخواطر...',
  'journal.filter_all': 'جميع التدوينات',
  'journal.filter_diaries': 'اليوميات والفضفضة',
  'journal.filter_thoughts': 'الخواطر والتأملات',
  'journal.filter_archived': 'الأرشيف',
  'journal.filter_trash': 'سلة المهملات',
  'journal.editor_title_new': 'مذكرة جديدة',
  'journal.editor_title_edit': 'تعديل المذكرة',
  'journal.title_placeholder': 'عنوان المذكرة...',
  'journal.content_placeholder': 'اكتب أفكارك بحرية هنا...',
  'journal.mood_label': 'كيف تشعر الآن؟',
  'journal.save_btn': 'حفظ المذكرة',
  'journal.save_success': 'تم حفظ المذكرة بنجاح! 🎉',
  dailyJournalSubtab: 'اليوميات والفضفضة',
  dailyTasksSubtabLabel: 'قائمة المهام اليومية',
  gratitudeSubtab: 'جدار الامتنان',
  cbtSubtabLabel: 'تمارين العلاج المعرفي',
  allFilterTab: 'جميع التدوينات',
  diariesFilterTab: 'اليوميات',
  thoughtsFilterTab: 'الخواطر',
  writeNewNoteBtn: 'كتابة تدوينة جديدة ✍️',
  searchDiariesPlaceholder: 'ابحث في المذكرات والأفكار...',
  noMatchingDiariesNow: 'لا توجد مذكرات مطابقة للبحث أو الفلتر حالياً.',
  deleteDiaryPermanently: 'حذف المذكرة نهائياً',
  subNoteDefaultTitle: 'ملاحظة فرعية',
  subNoteSingular: 'ملاحظة فرعية',
  subNotePlural: 'ملاحظات فرعية',
  clickWriteNewNotePrompt: 'اضغط لكتابة تدوينة أو خيرة جديدة',
  createNewDiaryWithText: 'إنشاء مذكرة جديدة من هذا النص',

  // Gratitude
  'gratitude.title': 'جدار ممتناتي',
  shareableGratitudeTitle: 'بطاقة امتنان قابلة للمشاركة 🌸',
  shareableGratitudeSub: 'شارك مشاعر الامتنان والتفاؤل مع من تحب',

  // CBT & Analysis
  cbtExercisesTab: 'تمارين العلاج المعرفي السلوكي',
  cbtWorksheets: 'استمارات تفكيك الأفكار',
  thoughtRecord: 'سجل الأفكار التلقائية',
  extractCognitiveErrorsBtn: 'استخراج الأخطاء المعرفية بالذكاء الاصطناعي 🧠',
  rationalAlternative: 'البديل العقلاني المنطقي',
  postSessionMood: 'شديد التحسن',
  reviewProsConsTitle: 'مراجعة الإيجابيات والسلبيات',
  prosConsBtnLabel: 'الإيجابيات والسلبيات ⚖️',

  // Behavioral Correlations & Health
  behavioralCorrelationsTitle: 'محرك التحليلات السلوكية',
  behavioralCorrelationsSub: 'اكتشاف العلاقات بين عاداتك والمزاج',
  sleepWaterAnxietyTitle: 'تأثير النوم والماء على القلق',
  sleepWaterAnxietyDesc: 'في الأيام التي تشرب فيها 8 أكواب ماء وتنام أكثر من 7 ساعات، ينخفض مستوى القلق لديك بنسبة {percent}%.',
  exerciseMoodBoostTitle: 'تأثير النشاط البدني والرياضة',
  exerciseMoodBoostDesc: 'ممارسة الرياضة لأكثر من 20 دقيقة ترتبط بتحسن المزاج الإيجابي بنسبة {percent}%.',
  cbtEffectivenessTitle: 'فاعلية تمارين العلاج المعرفي CBT',
  cbtEffectivenessDesc: 'تفكيك الأفكار التلقائية السلبية يقلل من الضائقة النفسية والعاطفية بنسبة {percent}%.',
  balanceIndex: 'مؤشر الاتزان النفسي',
  sleepQuality: 'جودة النوم',
  exerciseActivity: 'النشاط البدني',
  waterTrackerTitle: 'متابع استهلاك المياه 💧',
  waterTrackerDesc: 'المحافظة على الهيدرات يقلل الصداع والتوتر النفسي.',
  symptomsTitle: 'الأعراض والنشاط الجسدي 🩺',
  symptomsDesc: 'سجل أي أعراض بدنية لمتابعة تأثيرها على حالتك المزاجية.',

  // Advisor & Voice Companion
  voiceCompanionTitle: 'المساعد الصوتي العيادي المستمر 🎙️',
  voiceStatusListening: 'جاري الاستماع بإنصات...',
  voiceStatusAnalyzing: 'جاري التفكير وصياغة الدعم...',
  voiceStatusSpeaking: 'يتحدث الآن...',
  voiceStatusIdle: 'مستعد للبدء',
  voiceLiveTranscript: 'النسخ التلقائي للمحادثة:',
  voiceInterruptAndSpeak: 'مقاطعة والحديث الآن ⏹️',
  voiceStartSpeaking: 'بدء الاستماع والتحدث 🎙️',
  voiceEndSession: 'إنهاء المكالمة 📞',

  // Settings & Options
  settingsTitle: 'الإعدادات العامة',
  settingsSubtitle: 'تخصيص المساعد الذكي والأمان واللغة',
  apiKeyTitle: 'مفتاح API الخاص بك 🔑',
  apiKeySub: 'إدخال مفتاح Gemini API للوصول لكافة قدرات AI المستمرة',
  languagesTitle: 'لغات التطبيق 🌐',
  languagesSub: 'تغيير لغة واجهة مستخدم التطبيق',
  selectLanguageTitle: 'اختر لغة التطبيق 🌐',
  selectLanguageSubtitle: 'يدعم حياة AI عدة لغات عالمية لراحة تجربتك',
  typographyTabTitle: 'تخصيص الخطوط والتباعد',
  typographyTabSub: 'تحديد نوع الخط والتباعد لراحة العين أثناء القراءة',
  fontStyleIcon: 'الخطوط',
  fontSizeLabel: 'حجم الخط',
  darkModeTitle: 'الوضع الداكن ☀️/🌙',
  darkModeSub: 'تغيير المظهر بين النهاري والليلي المريح للعين',
  backupTitle: 'النسخ الاحتياطي والمزامنة ☁️',
  backupSub: 'تصدير واستعادة بياناتك بأمان تام',
  contactTitle: 'تواصل مع المطوّر 📬',
  contactSub: 'استفسارات وملاحظات لتحسين التطبيق',
  rateTitle: 'تقييم التطبيق ⭐',
  rateSub: 'رأيك يساهم في تطوير حياة AI',
  favoritesTitle: 'المفضلة ❤️',
  favoritesSub: 'المذكرات والخواطر المُميزة',
  archiveTitle: 'الأرشيف 📦',
  archiveSub: 'التدوينات المؤرشفة',
  trashTitle: 'سلة المهملات 🗑️',
  trashSub: 'المذكرات المحذوفة مؤقتاً',

  // Modals & Auth
  personalAccountTitle: 'الحساب الشخصي 👤',
  guestUser: 'مستخدم زائر 👤',
  registeredUser: 'مستخدم موثق 👤',
  accountSubGuest: 'حساب محلي آمن على هذا الجهاز',
  accountSubUser: 'مفعل ومزامن سحابياً',
  geminiKeyTitle: 'إعداد مفتاح Gemini API 🔑',
  geminiKeyDesc: 'أدخل مفتاح Gemini API الخاص بك لتشغيل قدرات المساعد الذكي والتحليل السلوكي والاستشارات النفسية المتقدمة.',
  geminiKeyNotice: 'ملاحظة أمان: يتم حفظ مفتاحك محلياً بشكل مشفر على جهازك فقط ولا يتم مشاركته مع أي طرف ثالث.',
  geminiKeyPlaceholder: 'أدخل مفتاح API هنا (AIzaSy...)',
  welcomeModalTitle: 'مرحباً بك في حياة AI 👋',
  rateModalTitle: '⭐ تقييم التطبيق',
  rateModalThanks: 'شكراً لتقييمك! ❤️',
  contactOwnerTitle: 'تواصل مع المطوّر 📬',

  // Actions & Importer
  quickOneClickActions: 'إجراءات لمسة واحدة سريعة ⚡',
  suggestAnotherTopic: 'اقتراح موضوع آخر 💡',
  summarizeEntryBtn: 'تلخيص المذكرة بالذكاء الاصطناعي 🧠',
  practicalPlanTomorrowBtn: 'خطوات عمل غداً 📋',
  writeDiaryImporterTitle: 'استيراد اليوميات 📥',
  writeDiaryImporterSub: 'استيراد مذكراتك من تطبيقات أخرى',
  importFromOtherApps: 'استيراد من تطبيقات أخرى 📲',
  importFromOtherAppsTitle: 'استيراد التدوينات واليوميات',
  importFromOtherAppsDesc: 'دعم ملفات JSON و CSV و TXT',
  importerSuccessMsg: 'تم استيراد البيانات بنجاح! 🎉',

  // Tags & Badges
  generalTag: 'عام 📌',
  diaryBadge: 'يوميات 📔',
  thoughtBadge: 'خواطر 💭',
  editedBadge: 'مُعدل ✍️',
  liveInteractionBadge: 'تفاعل مباشر ⚡',
  readyToInsertBadge: 'جاهز للإدراج 📥',
  filterTagsLabel: 'التصنيفات والوسوم:',
  checkSpellingOrFilter: 'يرجى مراجعة كلمة البحث أو الفلتر المختار.',

  // Symptoms
  symptomHeadache: 'صداع 🤕',
  symptomFatigue: 'إرهاق خفيف 😴',
  symptomBackTension: 'شد الظهر والأكتاف 🧘',
  symptomPoorSleep: 'أرق وقلة نوم 🌙',
  symptomRapidHeart: 'تسارع نبضات القلب 💓',
  symptomShortnessBreath: 'ضيق تنفس خفيف 🫁',
  symptomStomach: 'انزعاج المعدة 🤢',
  symptomTremors: 'رجفة أو توتر 🫨',
  waterConsumed: 'المشروب:',
  waterRemaining: 'المتبقي:',

  // Growth Tree
  psychologicalGrowthTreeTitle: 'شجرة النمو والاتزان النفسي 🌳',
  treeStage1: 'شتلة الأمل 🌱',
  treeStage2: 'برعم الصمود 🌿',
  treeStage3: 'شجرة الفضفضة 🪴',
  treeStage4: 'شجرة السكينة 🌳',
  treeStage5: 'شجرة الحكمة المثمرة 🍎',
  treeDesc1: 'بداية رحلة العناية بذاتك واكتشاف مشاعرك.',
  treeDesc2: 'تواصل التدوين اليومي يبني مرونتك النفسية.',
  treeDesc3: 'أفكارك تجد متنفساً آمنياً وتنمو بعمق.',
  treeDesc4: 'استقرار عاطفي واطمئنان يملأ يومك.',
  treeDesc5: 'توازن نفسي تام ورؤية حكيمة لذاتك.',

  // Feedback, Contact, Backup & PIN
  rateAppModalTitle: '⭐ تقييم تطبيق حياة AI',
  rateAppQuestion: 'كيف تجد تجربتك مع حياة AI؟',
  rateAppPlaceholder: 'اكتب انطباعك أو اقتراحاتك للتحسين...',
  rateAppFeedbackLabel: 'ملاحظاتك واقتراحاتك:',
  rateAppSubmit: 'إرسال التقييم ⭐',
  rateAppThankYou: 'شكراً جزيلاً لتقييمك! ❤️',
  rateAppThankYouDesc: 'رأيك يساعدنا على جعل التطبيق أفضل وأسهل للجميع.',
  contactOwnerModalTitle: 'تواصل مع المطوّر 📬',
  contactOwnerModalDesc: 'يسعدنا استقبال آرائك وملاحظاتك المباشرة لتطوير التطبيق',
  contactOwnerMessage: 'رسالتك أو ملاحظتك:',
  copyEmail: 'نسخ البريد الإلكتروني 📋',
  backupSyncTitle: 'النسخ الاحتياطي والمزامنة ☁️',
  backupSyncDesc: 'احفظ نسختك الاحتياطية أو استرجع بياناتك في أي وقت',
  restoreDataBtn: 'استعادة البيانات من ملف JSON 📥',
  howToExportTitle: 'كيفية تصدير واستعادة البيانات:',
  howToStep1: '1. اضغط تصدير للحصول على ملف JSON مشفر يحوي يومياتك.',
  howToStep2: '2. احفظ الملف في مكان آمن على جهازك أو السحابة.',
  howToStep3: '3. للاستعادة على جهاز آخر، اختر الملف واضغط استعادة.',
  pinPadSub: 'أدخل رمز PIN المكون من 4 أرقام لفتح التطبيق',
  pinHint: 'رمز PIN يحمي مذكراتك بخصوصية تامة',
  incorrectPin: 'رمز PIN غير صحيح، حاول مجدداً ❌',

  // Nested structures for t.section.key lookups
  common: {
    appName: 'حياة AI',
    yes: 'نعم',
    no: 'لا',
    closeBtn: 'إغلاق',
    retryBtn: 'إعادة المحاولة',
    homeTab: 'الرئيسية',
    diariesTab: 'اليوميات',
    advisorTab: 'المستشار',
    analyticsTab: 'التقدم والبيانات',
    settingsTab: 'الإعدادات'
  },
  auth: {
    personalAccountTitle: 'الحساب الشخصي 👤',
    guestUser: 'مستخدم زائر 👤',
    registeredUser: 'مستخدم موثق 👤',
    accountSubGuest: 'حساب محلي آمن',
    accountSubUser: 'مفعل ومزامن سحابياً'
  },
  cbt: {
    cbtExercisesTab: 'تمارين العلاج المعرفي السلوكي',
    cbtWorksheets: 'استمارات تفكيك الأفكار',
    thoughtRecord: 'سجل الأفكار التلقائية'
  },
  analytics: {
    behavioralCorrelationsTitle: 'محرك التحليلات السلوكية',
    behavioralCorrelationsSub: 'اكتشاف العلاقات بين عاداتك والمزاج',
    balanceIndex: 'مؤشر الاتزان النفسي',
    sleepQuality: 'جودة النوم',
    exerciseActivity: 'النشاط البدني'
  },
  modals: {
    rateModalTitle: '⭐ تقييم التطبيق',
    rateModalThanks: 'شكراً لتقييمك! ❤️',
    contactOwnerTitle: 'تواصل مع المطوّر 📬',
    welcomeModalTitle: 'مرحباً بك في حياة AI 👋'
  },
  settings: {
    settingsTitle: 'الإعدادات العامة',
    settingsSubtitle: 'تخصيص المساعد الذكي والأمان واللغة',
    apiKeyTitle: 'مفتاح API الخاص بك 🔑',
    languagesTitle: 'لغات التطبيق 🌐',
    darkModeTitle: 'الوضع الداكن ☀️/🌙'
  }
};

// All language codes route to the Arabic single source of truth dictionary
export const BASELINE_DICTIONARIES: Record<string, any> = {
  ar: AR_DICT,
  en: AR_DICT,
  fr: AR_DICT,
  de: AR_DICT,
  es: AR_DICT,
  tr: AR_DICT,
  ur: AR_DICT,
  ru: AR_DICT,
  zh: AR_DICT,
  ja: AR_DICT
};

// Key lookup helper searching in AR_DICT with safe fallback
function resolveKeyInDicts(key: string): string {
  if (!key || typeof key !== 'string') return '';

  if (AR_DICT[key] !== undefined && typeof AR_DICT[key] === 'string') {
    return AR_DICT[key];
  }

  if (key.includes('.')) {
    const parts = key.split('.');
    let curr: any = AR_DICT;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        curr = undefined;
        break;
      }
    }
    if (typeof curr === 'string') return curr;
  }

  return key;
}

// Proxy wrapper for dictionary objects so direct property access (e.g. dict.dhikrTitle) resolves safely
function createSafeTranslationProxy(targetDict: Record<string, any>) {
  return new Proxy(targetDict, {
    get(target, prop: string) {
      if (typeof prop !== 'string') return target[prop];
      if (prop in target && target[prop] !== undefined) return target[prop];
      return resolveKeyInDicts(prop);
    }
  });
}

export const MULTI_TRANSLATIONS: Record<string, any> = new Proxy(BASELINE_DICTIONARIES, {
  get(target) {
    return createSafeTranslationProxy(AR_DICT);
  }
});

export function getTranslation(lang?: string | AppLanguage | null): any {
  return createSafeTranslationProxy(AR_DICT);
}

export interface LanguageContextType {
  currentLanguage: AppLanguage;
  setLanguage: (lang: AppLanguage | string) => void;
  t: any;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialLanguage = 'ar' }: { children: ReactNode; initialLanguage?: AppLanguage; }) {
  const [currentLanguage, setCurrentLanguageState] = useState<AppLanguage>(initialLanguage);

  const setLanguage = (lang: string) => {
    const validLang = (SUPPORTED_LANGUAGES.some((l) => l.code === lang) ? lang : 'ar') as AppLanguage;
    setCurrentLanguageState(validLang);
  };

  const isRTL = true; // Arabic is RTL

  const translateFn = (key: string): string => {
    return resolveKeyInDicts(key);
  };

  // Attach proxy onto translation function so t.key and t('key') work interchangeably
  const t = new Proxy(translateFn, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      return resolveKeyInDicts(prop);
    }
  });

  return React.createElement(LanguageContext.Provider, { value: { currentLanguage, setLanguage, t, isRTL } }, children);
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context) return context;

  const defaultT = new Proxy(((key: string) => resolveKeyInDicts(key)) as any, {
    get(target, prop: string) {
      return resolveKeyInDicts(prop);
    }
  });

  return {
    currentLanguage: 'ar',
    setLanguage: () => {},
    t: defaultT,
    isRTL: true
  };
}
