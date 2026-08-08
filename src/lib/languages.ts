import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppLanguage = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'ru' | 'zh' | 'ja';

export interface TranslationKeys {
  common: {
    appName: string;
    yes: string;
    no: string;
    closeBtn: string;
    retryBtn: string;
    homeTab: string;
    diariesTab: string;
    advisorTab: string;
    analyticsTab: string;
    settingsTab: string;
  };
  auth: {
    personalAccountTitle: string;
    guestUser: string;
    registeredUser: string;
    accountSubGuest: string;
    accountSubUser: string;
  };
  cbt: {
    cbtExercisesTab: string;
    cbtWorksheets: string;
    thoughtRecord: string;
  };
  analytics: {
    behavioralCorrelationsTitle: string;
    behavioralCorrelationsSub: string;
    balanceIndex: string;
    sleepQuality: string;
    exerciseActivity: string;
  };
  modals: {
    rateModalTitle: string;
    rateModalThanks: string;
    contactOwnerTitle: string;
    welcomeModalTitle: string;
  };
  settings: {
    settingsTitle: string;
    settingsSubtitle: string;
    apiKeyTitle: string;
    languagesTitle: string;
    darkModeTitle: string;
  };
}

const COMMON_AR = {
  'journal.subtab_journal': 'يومياتي والفضفضة',
  'journal.subtab_tasks': 'المهام اليومية',
  'journal.subtab_gratitude': 'جدار الامتنان',
  'journal.subtab_cbt': 'تمارين العلاج المعرفي CBT',
  'journal.subtab_proscons': 'سجل الإيجابيات والسلبيات',
  'journal.write_new': 'كتابة مذكرة جديدة',
  'journal.import_btn': 'استيراد يوميات',
  'journal.search_placeholder': 'ابحث في اليوميات والخواطر والوسوم...',
  'journal.filter_all': 'جميع التدوينات',
  'journal.filter_diaries': 'اليوميات والفضفضة',
  'journal.filter_thoughts': 'الخواطر والتأملات',
  'journal.filter_archived': 'الأرشيف',
  'journal.filter_trash': 'سلة المهملات',
  'journal.editor_title_new': 'مذكرة جديدة',
  'journal.editor_title_edit': 'تعديل المذكرة',
  'journal.title_placeholder': 'عنوان المذكرة أو العنوان الرئيسي...',
  'journal.content_placeholder': 'اكتب أفكارك بحرية هنا... عبر عما تشعر به...',
  'journal.mood_label': 'كيف تشعر الآن؟',
  'journal.mood_happy': 'سعيد / مبتهج',
  'journal.mood_calm': 'هادئ / مطمئن',
  'journal.mood_neutral': 'طبيعي / عادي',
  'journal.mood_anxious': 'قلق / متوتر',
  'journal.mood_sad': 'حزين / منخفض',
  'journal.category_label': 'التصنيف / الوسم:',
  'journal.cat_family': '#عائلة',
  'journal.cat_study': '#دراسة',
  'journal.cat_hope': '#أمل',
  'journal.cat_health': '#صحة',
  'journal.cat_work': '#عمل',
  'journal.cat_general': '#عام',
  'journal.save_btn': 'حفظ المذكرة',
  'journal.save_success': 'تم حفظ المذكرة بنجاح! 🎉',
  'journal.delete_btn': 'حذف المذكرة',
  'journal.archive_btn': 'أرشفة المذكرة',
  'journal.restore_btn': 'استرجاع المذكرة',
  'journal.empty_title': 'لا توجد مذكرات في هذا العرض بعد',
  'journal.empty_subtitle': 'انقر على "كتابة مذكرة جديدة" لتسجيل أفكارك اليومية.',
  'gratitude.title': 'جدار ممتناتي وبطاقات الرضا النفسي',
  'gratitude.subtitle': 'لحظات السعادة والرضا اليومية تفرغ ذهنك من التوتر',
  'gratitude.add_card': 'إضافة بطاقة امتنان جديدة',
  'gratitude.card_placeholder': 'عن ماذا أنت ممتن اليوم؟ اكتب لحظتك المبهجة...',
  'proscons.modal_title': 'تقرير الإيجابيات والسلبيات اليومية',
  'cbt.title': 'تمارين العلاج المعرفي السلوكي CBT',
  'nav.home': 'الرئيسية',
  'nav.diaries': 'اليوميات',
  'nav.advisor': 'المستشار',
  'nav.progress': 'التقدم والبيانات',
  'nav.settings': 'الإعدادات',
  'nav.hayat_ai': 'حياة AI',
  'nav.active_now': 'نشط الآن',
  'nav.fullscreen': 'ملء الشاشة',
  'nav.subtitle': 'مساعد الصحة النفسية المتكامل',
  'nav.saving': 'جارِ الحفظ...',
  'nav.auto_saved': 'تم الحفظ تلقائياً',
  'nav.switch_language': 'تغيير لغة التطبيق والذكاء الاصطناعي',
  'nav.fullscreen_title': 'تفعيل وضع الشاشة الكاملة وإخفاء شريط المتصفح العلوي',
  'nav.dhikr_title': 'الأذكار والتسبيح',
  'nav.dhikr': 'الأذكار',
  'nav.daily_tasks': 'المهام اليومية',
  'nav.my_thoughts': 'خواطري',
  'nav.therapy_session': 'جلسة العلاج',
  'nav.account_title': 'حسابي الشخصي وتزامن البيانات السحابي',
  'nav.sign_in': 'تسجيل الدخول',
  'nav.lock_app': 'قفل التطبيق لحماية الخصوصية',
  'nav.back_mobile_title': 'رجوع للخلف',
  'nav.back_title': 'الرجوع إلى الشاشة أو الصفحة السابقة',
  'nav.back_btn': 'رجوع للخلف',
  'nav.current_page': 'الصفحة الحالية:',
  'nav.edit_diary': 'تعديل/عرض المذكرة',
  'nav.journal_records': 'سجل المذكرات',
  'nav.tasks': 'المهام',
  'nav.gratitude': 'الامتنان',
  'nav.reveal_header_pill': 'انقر لإظهار الشريط العلوي مجدداً',
  'home.safe_space': 'مساحتك النفسية الآمنة والمشفرة بالكامل',
  'home.greeting_morning': 'صباح الخير والبال المطمئن',
  'home.greeting_afternoon': 'مساء الخير والسكينة',
  'home.greeting_evening': 'ليلة هادئة ونوم مريح',
  'home.greeting_desc': 'اليوم هو يوم جديد للنمو والتصالح مع الذات.',
  'home.direct_upload_title': 'الوصول المباشر لملفات الهاتف ومرفقات اليومية',
  'home.free_write': 'كتابة حرة',
  'home.free_write_sub': 'فتح محرر فارغ',
  'home.attach_photo': 'إرفاق صورة',
  'home.attach_photo_sub': 'من ألبوم الهاتف',
  'home.phone_video': 'فيديو الهاتف',
  'home.phone_video_sub': 'تحميل مقطع مرئي',
  'home.audio_file': 'ملف صوتي',
  'home.audio_file_sub': 'تسجيل أو ملف ريكورد',
  'home.book_doc': 'كتاب أو وثيقة',
  'home.book_doc_sub': 'تحميل PDF أو نص',
  'home.ai_advisor': 'مستشار AI',
  'home.ai_advisor_sub': 'تحليل وتوصيات فورية',
  'home.streak_title': 'سلسلة الالتزام والتدوين',
  'home.day_streak': 'يوم متتالي',
  'home.streak_encouragement': 'رائع! لقد دوّنت أفكارك اليوم.',
  'home.longest_streak': 'أطول سلسلة تاريخية:',
  'home.recent_week': 'متابعة الأسبوع الأخير:',
  'home.select_date_title': 'اختر اليوم لتسجيل أو عرض الأنشطة:',
  'home.quote_title': 'حكمة اليوم لراحة البال والتحفيز النفسي',
  'home.ai_inspiration_btn': 'إلهام ذكي (AI)',
  'home.mood_scale_title': 'مقياس المزاج الرقمي السريع (1 - 10)',
  'home.mood_scale_desc': 'اسحب المؤشر لتوثيق حالتك المزاجية الحالية.',
  'home.mood_rating': 'تقييم المزاج:',
  'home.water_tracker_title': 'عداد كؤوس الماء التفاعلي اليومي',
  'home.water_tracker_desc': 'اضغط على الكؤوس أدناه لتسجيل كميات المياه المستهلكة.',
  'home.water_consumed': 'الكمية المستهلكة:',
  'home.water_remaining': '💡 تبقّى لك بعض الكؤوس لتصل للمعدل المثالي.',
  'home.symptoms_title': 'الأعراض الجسدية المصاحبة لقلقك اليوم',
  'home.symptoms_desc': 'حدد أي من الأعراض الفسيولوجية التالية شعرت بها اليوم.',
  'home.symptom_headache': 'صداع وضغط رأس 🤯',
  'home.symptom_heart': 'تسارع نبضات القلب 💓',
  'home.symptom_breath': 'ضيق وصعوبة تنفس 🫁',
  'home.symptom_muscle': 'شد عضلي وآلام ظهر 🧘',
  'home.symptom_fatigue': 'خمول وإرهاق عام 🔋',
  'home.symptom_insomnia': 'أرق وقلة جودة النوم 😴',
  'home.symptom_stomach': 'اضطراب وتوتر معدة 🤢',
  'home.symptom_tremors': 'تعرق زائد ورجفة أطراف 🥶',
  'home.breathing_title': 'مساعد التنفس الصندوقي الاسترخائي',
  'home.breathing_desc': 'طريقة تنفس متبعة لتهدئة ضربات القلب وتحفيز السلام العصبي.',
  'home.breathing_start': '▶️ بدء تمرين التنفس',
  'home.breathing_stop': '⏹️ إيقاف الجلسة',
  'home.breathing_seconds': 'ثوان متبقية',
  'home.breathing_inhale': '💨 شـهـيـق...',
  'home.breathing_hold1': '🛑 اكـتـم...',
  'home.breathing_exhale': '💨 زفـيـر...',
  'home.breathing_hold2': '🛑 اكـتـم...',
  'home.breathing_cycles': 'عدد الدورات المكتملة:',
  'habit.choose_type': 'اختر نوع العادة الجديدة',
  'habit.choose_type_desc': 'تتبع بسيط بالإنجاز أو قياس كمي برقم ومستهدف',
  'habit.edit': 'تعديل بيانات العادة',
  'habit.create': 'إضافة عادة جديدة',
  'habit.yes_no': 'عادة بسيطة (تم / لم يتم)',
  'habit.yes_no_desc': 'مثال: التأمل، صلاة الفجر، القراءة اليومية',
  'habit.measurable': 'عادة كمية قابلة للقياس',
  'habit.measurable_desc': 'مثال: شرب 8 كؤوس ماء، قراءة 20 صفحة',
  'habit.color': 'لون العادة المميز:',
  'habit.name': 'اسم العادة السلوكية *',
  'habit.icon': 'أيقونة/رمز العادة:',
  'habit.question': 'سؤال التذكير اليومي:',
  'habit.target': 'المستهدف الكمي والوحدة:',
  'habit.unit': 'الوحدة',
  'habit.target_type': 'نوع الهدف:',
  'habit.at_least': 'على الأقل',
  'habit.at_most': 'على الأكثر',
  'habit.exactly': 'بالضبط',
  'habit.periodicity': 'التكرار والجدول الزمني:',
  'habit.daily': 'يومياً',
  'habit.weekly': 'أسبوعياً',
  'habit.monthly': 'شهرياً',
  'habit.quarterly': 'ربع سنوي',
  'habit.semi_annually': 'نصف سنوي',
  'habit.annually': 'سنوياً',
  'habit.custom_range': 'تاريخ محدد',
  'habit.start_date': 'تاريخ البدء:',
  'habit.end_date': 'تاريخ الانتهاء:',
  'habit.category': 'التصنيف / المجال:',
  'habit.cat_health': 'صحة بدنية 🥦',
  'habit.cat_mind': 'تأمل وذهن 🧠',
  'habit.cat_sport': 'رياضة ونشاط 🏃',
  'habit.cat_culture': 'ثقافة وقراءة 📚',
  'habit.cat_other': 'أهداف أخرى 🎯',
  'habit.reminder': 'وقت التذكير اليومي:',
  'habit.time': 'وقت التذكير',
  'habit.notes': 'ملاحظات وتوجيهات نفسية:',
  'habit.notes_placeholder': 'اكتب أي توجيه أو دافع...',
  common: {
    appName: "حياة AI",
    yes: "نعم",
    no: "لا",
    closeBtn: "إغلاق",
    retryBtn: "إعادة المحاولة",
    homeTab: "الرئيسية",
    diariesTab: "اليوميات",
    advisorTab: "المستشار",
    analyticsTab: "التقدم والبيانات",
    settingsTab: "الإعدادات",
  },
  auth: {
    personalAccountTitle: "الحساب الشخصي 👤",
    guestUser: "مستخدم زائر 👤",
    registeredUser: "مستخدم موثق 👤",
    accountSubGuest: "حساب محلي آمن، سجل دخولك للتزامن السحابي",
    accountSubUser: "مفعل ومزامن سحابياً تلقائياً",
  },
  cbt: {
    cbtExercisesTab: "تمارين العلاج المعرفي السلوكي (CBT)",
    cbtWorksheets: "استمارات تفكيك الأفكار",
    thoughtRecord: "سجل الأفكار التلقائية",
  },
  analytics: {
    behavioralCorrelationsTitle: "محرك التحليلات السلوكية المتقدمة",
    behavioralCorrelationsSub: "اكتشاف العلاقات بين عاداتك ونسب التوتر والمزاج",
    balanceIndex: "مؤشر الاتزان النفسي",
    sleepQuality: "جودة النوم",
    exerciseActivity: "النشاط البدني",
  },
  modals: {
    rateModalTitle: "⭐ تقييم التطبيق",
    rateModalThanks: "شكراً لتقييمك! ❤️",
    contactOwnerTitle: "تواصل مع المطوّر 📬",
    welcomeModalTitle: "مرحباً بك في حياة AI 👋",
  },
  settings: {
    settingsTitle: "الإعدادات العامة",
    settingsSubtitle: "تخصيص المساعد الذكي والأمان ولغة التطبيق",
    apiKeyTitle: "مفتاح API الخاص بك 🔑",
    languagesTitle: "لغات التطبيق 🌐",
    darkModeTitle: "الوضع الداكن ☀️/🌙",
  },
};

const COMMON_EN = {
  'journal.subtab_journal': 'Daily Journal & Venting',
  'journal.subtab_tasks': 'Daily Tasks Checklist',
  'journal.subtab_gratitude': 'Gratitude Wall',
  'journal.subtab_cbt': 'CBT Exercises',
  'journal.subtab_proscons': 'Pros & Cons Log',
  'journal.write_new': 'Write New Entry',
  'journal.import_btn': 'Import Diaries',
  'journal.search_placeholder': 'Search in diaries, thoughts and tags...',
  'journal.filter_all': 'All Entries',
  'journal.filter_diaries': 'Daily Diaries',
  'journal.filter_thoughts': 'Thoughts & Reflections',
  'journal.filter_archived': 'Archive',
  'journal.filter_trash': 'Trash',
  'journal.editor_title_new': 'New Entry',
  'journal.editor_title_edit': 'Edit Entry',
  'journal.title_placeholder': 'Title or main headline...',
  'journal.content_placeholder': 'Write your thoughts freely here...',
  'journal.mood_label': 'How are you feeling right now?',
  'journal.mood_happy': 'Happy / Joyful',
  'journal.mood_calm': 'Calm / Peaceful',
  'journal.mood_neutral': 'Neutral / Normal',
  'journal.mood_anxious': 'Anxious / Stressed',
  'journal.mood_sad': 'Sad / Low',
  'journal.category_label': 'Category / Tag:',
  'journal.cat_family': '#family',
  'journal.cat_study': '#study',
  'journal.cat_hope': '#hope',
  'journal.cat_health': '#health',
  'journal.cat_work': '#work',
  'journal.cat_general': '#general',
  'journal.save_btn': 'Save Entry',
  'journal.save_success': 'Entry saved successfully! 🎉',
  'journal.delete_btn': 'Delete Entry',
  'journal.archive_btn': 'Archive Entry',
  'journal.restore_btn': 'Restore Entry',
  'journal.empty_title': 'No entries in this view yet',
  'journal.empty_subtitle': 'Click "Write New Entry" to log your thoughts.',
  'gratitude.title': 'My Gratitude Wall & Happy Deck',
  'gratitude.subtitle': 'Everyday joyful moments that clear your mind from stress',
  'gratitude.add_card': 'Add New Gratitude Card',
  'gratitude.card_placeholder': 'What are you grateful for today?',
  'proscons.modal_title': 'Daily Pros & Cons Report',
  'cbt.title': 'CBT Exercises & Cognitive Restructuring',
  'nav.home': 'Home',
  'nav.diaries': 'Journal',
  'nav.advisor': 'Advisor',
  'nav.progress': 'Analytics & Progress',
  'nav.settings': 'Settings',
  'nav.hayat_ai': 'Hayat AI',
  'nav.active_now': 'Active Now',
  'nav.fullscreen': 'Fullscreen',
  'nav.subtitle': 'Comprehensive Mental Health Assistant',
  'nav.saving': 'Saving...',
  'nav.auto_saved': 'Auto Saved',
  'nav.switch_language': 'Switch App & AI Language',
  'nav.fullscreen_title': 'Toggle Fullscreen Mode & Hide Browser Address Bar',
  'nav.dhikr_title': 'Mindfulness & Reflection',
  'nav.dhikr': 'Mindfulness',
  'nav.daily_tasks': 'Daily Tasks',
  'nav.my_thoughts': 'My Thoughts',
  'nav.therapy_session': 'Therapy Session',
  'nav.account_title': 'Personal Account & Cloud Sync',
  'nav.sign_in': 'Sign In',
  'nav.lock_app': 'Lock App for Privacy',
  'nav.back_mobile_title': 'Go Back',
  'nav.back_title': 'Go back to previous screen or page',
  'nav.back_btn': 'Go Back',
  'nav.current_page': 'Current Page:',
  'nav.edit_diary': 'Edit/View Entry',
  'nav.journal_records': 'Journal Entries',
  'nav.tasks': 'Tasks',
  'nav.gratitude': 'Gratitude',
  'nav.reveal_header_pill': 'Tap to reveal header',
  'home.safe_space': 'Your safe, fully encrypted space',
  'home.greeting_morning': 'Good Morning & Peaceful Mind',
  'home.greeting_afternoon': 'Good Afternoon & Tranquility',
  'home.greeting_evening': 'Quiet Night & Restful Sleep',
  'home.greeting_desc': 'Today is a new day for growth and self-compassion.',
  'home.direct_upload_title': 'Direct Phone Uploads & Attachments',
  'home.free_write': 'Free Write',
  'home.free_write_sub': 'Open blank editor',
  'home.attach_photo': 'Attach Photo',
  'home.attach_photo_sub': 'From photo gallery',
  'home.phone_video': 'Video Clip',
  'home.phone_video_sub': 'Upload video',
  'home.audio_file': 'Audio Recording',
  'home.audio_file_sub': 'Voice record or file',
  'home.book_doc': 'Document / PDF',
  'home.book_doc_sub': 'Upload document',
  'home.ai_advisor': 'AI Advisor',
  'home.ai_advisor_sub': 'Instant AI analysis',
  'home.streak_title': 'Journaling Streak & Commitment',
  'home.day_streak': 'Day Streak',
  'home.streak_encouragement': 'Awesome! You logged your thoughts today.',
  'home.longest_streak': 'Longest streak:',
  'home.recent_week': 'Past 7 days:',
  'home.select_date_title': 'Select date to view activities:',
  'home.quote_title': 'Wisdom of the Day',
  'home.ai_inspiration_btn': 'AI Inspiration',
  'home.mood_scale_title': 'Quick Mood Tracker (1 - 10)',
  'home.mood_scale_desc': 'Drag slider to record your mood in seconds.',
  'home.mood_rating': 'Mood Level:',
  'home.water_tracker_title': 'Daily Water Hydration Tracker',
  'home.water_tracker_desc': 'Tap cups to log water intake.',
  'home.water_consumed': 'Consumed:',
  'home.water_remaining': '💡 A few more cups to reach your daily goal.',
  'home.symptoms_title': 'Physical Symptoms Today',
  'home.symptoms_desc': 'Select physiological symptoms felt today.',
  'home.symptom_headache': 'Headache & Tension 🤯',
  'home.symptom_heart': 'Rapid Heartbeat 💓',
  'home.symptom_breath': 'Shortness of Breath 🫁',
  'home.symptom_muscle': 'Muscle Stiffness 🧘',
  'home.symptom_fatigue': 'General Fatigue 🔋',
  'home.symptom_insomnia': 'Insomnia / Poor Sleep 😴',
  'home.symptom_stomach': 'Stomach Distress 🤢',
  'home.symptom_tremors': 'Tremors & Sweating 🥶',
  'home.breathing_title': 'Box Breathing Assistant',
  'home.breathing_desc': 'Proven breathing technique to lower heart rate.',
  'home.breathing_start': '▶️ Start Breathing Session',
  'home.breathing_stop': '⏹️ Stop Session',
  'home.breathing_seconds': 'seconds left',
  'home.breathing_inhale': '💨 Inhale deeply...',
  'home.breathing_hold1': '🛑 Hold breath...',
  'home.breathing_exhale': '💨 Exhale slowly...',
  'home.breathing_hold2': '🛑 Hold breath...',
  'home.breathing_cycles': 'Completed cycles:',
  'habit.choose_type': 'Choose New Habit Type',
  'habit.choose_type_desc': 'Simple completion or target measurement',
  'habit.edit': 'Edit Habit',
  'habit.create': 'Create New Habit',
  'habit.yes_no': 'Simple Habit (Done / Not Done)',
  'habit.yes_no_desc': 'Example: Meditation, Reading',
  'habit.measurable': 'Measurable Habit',
  'habit.measurable_desc': 'Example: Drink 8 cups of water',
  'habit.color': 'Habit Color:',
  'habit.name': 'Habit Name *',
  'habit.icon': 'Habit Icon:',
  'habit.question': 'Daily Question:',
  'habit.target': 'Target & Unit:',
  'habit.unit': 'Unit',
  'habit.target_type': 'Target Type:',
  'habit.at_least': 'At least',
  'habit.at_most': 'At most',
  'habit.exactly': 'Exactly',
  'habit.periodicity': 'Frequency & Schedule:',
  'habit.daily': 'Daily',
  'habit.weekly': 'Weekly',
  'habit.monthly': 'Monthly',
  'habit.quarterly': 'Quarterly',
  'habit.semi_annually': 'Semi-annually',
  'habit.annually': 'Annually',
  'habit.custom_range': 'Custom Date Range',
  'habit.start_date': 'Start Date:',
  'habit.end_date': 'End Date:',
  'habit.category': 'Category:',
  'habit.cat_health': 'Physical Health 🥦',
  'habit.cat_mind': 'Mind & Calm 🧠',
  'habit.cat_sport': 'Fitness 🏃',
  'habit.cat_culture': 'Reading 📚',
  'habit.cat_other': 'Other Goals 🎯',
  'habit.reminder': 'Daily Reminder Time:',
  'habit.time': 'Reminder Time',
  'habit.notes': 'Notes & Guidance:',
  'habit.notes_placeholder': 'Write encouragement or motivation...',
  common: {
    appName: "Hayat AI",
    yes: "Yes",
    no: "No",
    closeBtn: "Close",
    retryBtn: "Retry",
    homeTab: "Home",
    diariesTab: "Journal",
    advisorTab: "Advisor",
    analyticsTab: "Analytics",
    settingsTab: "Settings",
  },
  auth: {
    personalAccountTitle: "Personal Account 👤",
    guestUser: "Guest User 👤",
    registeredUser: "Verified User 👤",
    accountSubGuest: "Local secure mode. Sign in to enable cloud sync",
    accountSubUser: "Active and automatically synced to cloud",
  },
  cbt: {
    cbtExercisesTab: "CBT Exercises",
    cbtWorksheets: "Thought Reframing Worksheets",
    thoughtRecord: "Automatic Thought Record",
  },
  analytics: {
    behavioralCorrelationsTitle: "Behavioral Correlation Engine",
    behavioralCorrelationsSub: "Discover statistical links between health habits and mood/anxiety",
    balanceIndex: "Mental Balance Index",
    sleepQuality: "Sleep Quality",
    exerciseActivity: "Physical Activity",
  },
  modals: {
    rateModalTitle: "⭐ Rate Application",
    rateModalThanks: "Thank you for rating! ❤️",
    contactOwnerTitle: "Contact Developer 📬",
    welcomeModalTitle: "Welcome to Hayat AI 👋",
  },
  settings: {
    settingsTitle: "General Settings",
    settingsSubtitle: "Customize AI advisor, security lock, and app language",
    apiKeyTitle: "Your API Key 🔑",
    languagesTitle: "App Languages 🌐",
    darkModeTitle: "Dark Mode ☀️/🌙",
  },
};

const COMMON_ES = {
  ...COMMON_EN,
  'journal.subtab_journal': 'Diario Personal y Desahogo',
  'journal.subtab_tasks': 'Lista de Tareas Diarias',
  'journal.subtab_gratitude': 'Muro de Gratitud',
  'journal.subtab_cbt': 'Ejercicios TCC (CBT)',
  'journal.subtab_proscons': 'Registro de Pros y Contras',
  'journal.write_new': 'Escribir Nueva Entrada',
  'journal.import_btn': 'Importar Diarios',
  'journal.search_placeholder': 'Buscar en diarios, pensamientos y etiquetas...',
  'journal.filter_all': 'Todas las Entradas',
  'journal.filter_diaries': 'Diarios Personales',
  'journal.filter_thoughts': 'Reflexiones y Pensamientos',
  'journal.filter_archived': 'Archivo',
  'journal.filter_trash': 'Papelera',
  'journal.save_btn': 'Guardar Entrada',
  'nav.home': 'Inicio',
  'nav.diaries': 'Diario',
  'nav.advisor': 'Asesor AI',
  'nav.progress': 'Análisis y Progreso',
  'nav.settings': 'Ajustes',
  'home.safe_space': 'Tu espacio seguro y totalmente encriptado',
  'home.greeting_morning': 'Buenos Días y Mente Tranquila',
  'home.greeting_afternoon': 'Buenas Tardes y Serenidad',
  'home.greeting_evening': 'Noche Tranquila y Buen Descanso',
  common: {
    appName: "Hayat AI",
    yes: "Sí",
    no: "No",
    closeBtn: "Cerrar",
    retryBtn: "Reintentar",
    homeTab: "Inicio",
    diariesTab: "Diario",
    advisorTab: "Asesor",
    analyticsTab: "Análisis",
    settingsTab: "Ajustes",
  },
  settings: {
    settingsTitle: "Ajustes Generales",
    settingsSubtitle: "Personalizar asesor AI, candado de seguridad e idioma",
    apiKeyTitle: "Tu Clave API 🔑",
    languagesTitle: "Idiomas de la App 🌐",
    darkModeTitle: "Modo Oscuro ☀️/🌙",
  },
};

const COMMON_FR = {
  ...COMMON_EN,
  'journal.subtab_journal': 'Journal Intime et Expression',
  'journal.subtab_tasks': 'Tâches Quotidiennes',
  'journal.subtab_gratitude': 'Mur de Gratitude',
  'journal.subtab_cbt': 'Exercices TCC',
  'journal.write_new': 'Écrire une Nouvelle Note',
  'nav.home': 'Accueil',
  'nav.diaries': 'Journal',
  'nav.advisor': 'Conseiller AI',
  'nav.progress': 'Statistiques',
  'nav.settings': 'Paramètres',
  'home.safe_space': 'Votre espace sécurisé et chiffré',
  common: {
    appName: "Hayat AI",
    yes: "Oui",
    no: "Non",
    closeBtn: "Fermer",
    retryBtn: "Réessayer",
    homeTab: "Accueil",
    diariesTab: "Journal",
    advisorTab: "Conseiller",
    analyticsTab: "Analyse",
    settingsTab: "Paramètres",
  },
};

const COMMON_DE = {
  ...COMMON_EN,
  'journal.subtab_journal': 'Tagebuch & Gedanken',
  'journal.subtab_tasks': 'Tägliche Aufgaben',
  'journal.subtab_gratitude': 'Dankbarkeitswand',
  'journal.subtab_cbt': 'KVT Übungen',
  'journal.write_new': 'Neuen Eintrag Schreiben',
  'nav.home': 'Startseite',
  'nav.diaries': 'Tagebuch',
  'nav.advisor': 'AI Berater',
  'nav.progress': 'Fortschritt',
  'nav.settings': 'Einstellungen',
  'home.safe_space': 'Ihr sicherer und verschlüsselter Bereich',
  common: {
    appName: "Hayat AI",
    yes: "Ja",
    no: "Nein",
    closeBtn: "Schließen",
    retryBtn: "Wiederholen",
    homeTab: "Startseite",
    diariesTab: "Tagebuch",
    advisorTab: "Berater",
    analyticsTab: "Analyse",
    settingsTab: "Einstellungen",
  },
};

export const BASELINE_DICTIONARIES: Record<string, any> = {
  ar: COMMON_AR,
  en: COMMON_EN,
  es: COMMON_ES,
  fr: COMMON_FR,
  de: COMMON_DE,
  tr: COMMON_EN,
  ur: COMMON_AR,
  ru: COMMON_EN,
  zh: COMMON_EN,
  ja: COMMON_EN,
};

export interface LanguageContextType {
  currentLanguage: AppLanguage;
  setLanguage: (lang: AppLanguage | string) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function getTranslation(lang: string | AppLanguage): any {
  const code = (lang || 'ar') as string;
  return BASELINE_DICTIONARIES[code] || BASELINE_DICTIONARIES['en'] || BASELINE_DICTIONARIES['ar'];
}

export function LanguageProvider({
  children,
  initialLanguage = 'ar',
}: {
  children: ReactNode;
  initialLanguage?: AppLanguage;
}) {
  const [currentLanguage, setCurrentLanguageState] = useState<AppLanguage>(initialLanguage);

  const setLanguage = (lang: string) => {
    const validLang = (SUPPORTED_LANGUAGES.some((l) => l.code === lang) ? lang : 'ar') as AppLanguage;
    setCurrentLanguageState(validLang);
  };

  const isRTL = (getLanguageInfo(currentLanguage)?.dir || 'rtl') === 'rtl';

  const t = (key: string): string => {
    if (!key || typeof key !== 'string') return '';
    try {
      const targetDict = getTranslation(currentLanguage);

      if (targetDict && typeof targetDict[key] === 'string') {
        return targetDict[key];
      }

      if (key.includes('.')) {
        const parts = key.split('.');
        let curr: any = targetDict;
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

      const enDict = getTranslation('en');
      if (enDict && typeof enDict[key] === 'string') {
        return enDict[key];
      }
      if (key.includes('.')) {
        const parts = key.split('.');
        let curr: any = enDict;
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

      if (currentLanguage === 'ar') {
        const arDict = getTranslation('ar');
        if (arDict && typeof arDict[key] === 'string') {
          return arDict[key];
        }
      }

      return key;
    } catch (e) {
      console.error('Safe t() lookup fallback for key:', key, e);
      return String(key || '');
    }
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { currentLanguage, setLanguage, t, isRTL } },
    children
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      currentLanguage: 'ar',
      setLanguage: () => {},
      t: (key: string) => key,
      isRTL: true,
    };
  }
  return context;
}

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
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    speechLang: 'ar-SA',
    aiPromptLang: 'Arabic (العربية)',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    speechLang: 'en-US',
    aiPromptLang: 'English',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    speechLang: 'fr-FR',
    aiPromptLang: 'French (Français)',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    speechLang: 'de-DE',
    aiPromptLang: 'German (Deutsch)',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    speechLang: 'es-ES',
    aiPromptLang: 'Spanish (Español)',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
    dir: 'ltr',
    speechLang: 'tr-TR',
    aiPromptLang: 'Turkish (Türkçe)',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    dir: 'rtl',
    speechLang: 'ur-PK',
    aiPromptLang: 'Urdu (اردو)',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    dir: 'ltr',
    speechLang: 'ru-RU',
    aiPromptLang: 'Russian (Русский)',
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    dir: 'ltr',
    speechLang: 'zh-CN',
    aiPromptLang: 'Chinese (中文)',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    speechLang: 'ja-JP',
    aiPromptLang: 'Japanese (日本語)',
  },
];

export function getLanguageInfo(lang: string | AppLanguage): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang);
}
