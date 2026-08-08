import { SupportedLanguage } from '../types';

export interface Translation {
  appTitle: string;
  welcomeMessage: string;
  selectLanguage: string;
  chooseLanguagePlaceholder: string;
  continueButton: string;
  home: string;
  diary: string;
  habits: string;
  books: string;
  settings: string;
  profile: string;
  statistics: string;
  lifeMap: string;
  cbtTools: string;
  gratitude: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  close: string;
  confirm: string;
  back: string;
  next: string;
  done: string;
  loading: string;
  retry: string;
  newEntry: string;
  entryTitle: string;
  entryContent: string;
  writeYourThoughts: string;
  addMood: string;
  addTags: string;
  lockEntry: string;
  unlockEntry: string;
  archiveEntry: string;
  moveToTrash: string;
  restoreEntry: string;
  permanentlyDelete: string;
  entrySaved: string;
  entryDeleted: string;
  noEntriesYet: string;
  startWriting: string;
  moodTracking: string;
  howAreYouFeeling: string;
  happy: string;
  sad: string;
  anxious: string;
  angry: string;
  calm: string;
  excited: string;
  tired: string;
  motivated: string;
  newHabit: string;
  habitName: string;
  habitCategory: string;
  habitFrequency: string;
  habitReminder: string;
  markComplete: string;
  habitCompleted: string;
  habitStreak: string;
  dailyGoal: string;
  weeklyGoal: string;
  monthlyGoal: string;
  myBooks: string;
  addBook: string;
  bookTitle: string;
  bookNotes: string;
  bookRating: string;
  readingProgress: string;
  appSettings: string;
  generalSettings: string;
  appearance: string;
  darkMode: string;
  lightMode: string;
  systemTheme: string;
  language: string;
  font: string;
  notifications: string;
  enableNotifications: string;
  disableNotifications: string;
  privacy: string;
  security: string;
  changePin: string;
  enableBiometrics: string;
  backupData: string;
  exportData: string;
  importData: string;
  clearCache: string;
  aboutApp: string;
  version: string;
  focusMode: string;
  focusModeEnabled: string;
  focusModeDisabled: string;
  focusModeActive: string;
  exitFocusMode: string;
  distractionsHidden: string;
  thoughtRecord: string;
  negativeThoughts: string;
  rationalResponse: string;
  cognitiveDistortions: string;
  emotionRating: string;
  completeExercise: string;
  gratefulFor: string;
  addGratitude: string;
  todayGratitude: string;
  weeklyReport: string;
  monthlyReport: string;
  moodTrends: string;
  habitCompletion: string;
  sleepAnalysis: string;
  exerciseStats: string;
  reminderTitle: string;
  reminderTime: string;
  addReminder: string;
  dailyReminder: string;
  customReminder: string;
  errorOccurred: string;
  tryAgain: string;
  noInternet: string;
  dataSavedLocally: string;
  syncPending: string;
  successMessage: string;
  errorMessage: string;
  aiAnalysis: string;
  aiSuggestion: string;
  generatingResponse: string;
  askAI: string;
  login: string;
  logout: string;
  signUp: string;
  email: string;
  password: string;
  forgotPassword: string;
  resetPassword: string;
  pinCode: string;
  enterPin: string;
  biometricAuth: string;
  today: string;
  yesterday: string;
  tomorrow: string;
  thisWeek: string;
  thisMonth: string;
  lastWeek: string;
  lastMonth: string;
  createdAt: string;
  updatedAt: string;
  sleepHours: string;
  waterIntake: string;
  exerciseDuration: string;
  caloriesBurned: string;
  symptoms: string;
  medications: string;
  typeHere: string;
  optional: string;
  required: string;
  noResultsFound: string;
  comingSoon: string;
}

export const translations: Record<SupportedLanguage, Translation> = {
  ar: {
    appTitle: 'يومياتي AI',
    welcomeMessage: 'مرحباً بك في يومياتي AI',
    selectLanguage: 'اختر اللغة',
    chooseLanguagePlaceholder: 'اختر لغة التطبيق',
    continueButton: 'متابعة',
    home: 'الرئيسية',
    diary: 'اليوميات',
    habits: 'العادات',
    books: 'الكتب',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    statistics: 'الإحصائيات',
    lifeMap: 'خريطة الحياة',
    cbtTools: 'أدوات العلاج المعرفي',
    gratitude: 'الامتنان',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    close: 'إغلاق',
    confirm: 'تأكيد',
    back: 'رجوع',
    next: 'التالي',
    done: 'تم',
    loading: 'جاري التحميل...',
    retry: 'إعادة المحاولة',
    newEntry: 'مشاركة جديدة',
    entryTitle: 'عنوان المشاركة',
    entryContent: 'محتوى المشاركة',
    writeYourThoughts: 'اكتب أفكارك هنا...',
    addMood: 'إضافة مزاج',
    addTags: 'إضافة وسوم',
    lockEntry: 'قفل المشاركة',
    unlockEntry: 'فتح المشاركة',
    archiveEntry: 'أرشفة المشاركة',
    moveToTrash: 'نقل إلى سلة المهملات',
    restoreEntry: 'استعادة المشاركة',
    permanentlyDelete: 'حذف نهائي',
    entrySaved: 'تم حفظ المشاركة',
    entryDeleted: 'تم حذف المشاركة',
    noEntriesYet: 'لا توجد مشاركات بعد',
    startWriting: 'ابدأ الكتابة',
    moodTracking: 'تتبع المزاج',
    howAreYouFeeling: 'كيف تشعر اليوم؟',
    happy: 'سعيد',
    sad: 'حزين',
    anxious: 'قلق',
    angry: 'غاضب',
    calm: 'هادئ',
    excited: 'متحمس',
    tired: 'متعب',
    motivated: 'متحفز',
    newHabit: 'عادة جديدة',
    habitName: 'اسم العادة',
    habitCategory: 'تصنيف العادة',
    habitFrequency: 'تكرار العادة',
    habitReminder: 'تذكير العادة',
    markComplete: 'تحديد كمكتمل',
    habitCompleted: 'تم إكمال العادة',
    habitStreak: 'سلسلة العادة',
    dailyGoal: 'الهدف اليومي',
    weeklyGoal: 'الهدف الأسبوعي',
    monthlyGoal: 'الهدف الشهري',
    myBooks: 'كتبي',
    addBook: 'إضافة كتاب',
    bookTitle: 'عنوان الكتاب',
    bookNotes: 'ملاحظات الكتاب',
    bookRating: 'تقييم الكتاب',
    readingProgress: 'تقدم القراءة',
    appSettings: 'إعدادات التطبيق',
    generalSettings: 'الإعدادات العامة',
    appearance: 'المظهر',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    systemTheme: 'مظهر النظام',
    language: 'اللغة',
    font: 'الخط',
    notifications: 'الإشعارات',
    enableNotifications: 'تفعيل الإشعارات',
    disableNotifications: 'تعطيل الإشعارات',
    privacy: 'الخصوصية',
    security: 'الأمان',
    changePin: 'تغيير رمز PIN',
    enableBiometrics: 'تفعيل القياسات الحيوية',
    backupData: 'نسخ احتياطي للبيانات',
    exportData: 'تصدير البيانات',
    importData: 'استيراد البيانات',
    clearCache: 'مسح الذاكرة المؤقتة',
    aboutApp: 'عن التطبيق',
    version: 'الإصدار',
    focusMode: 'وضع التركيز',
    focusModeEnabled: 'وضع التركيز مفعّل',
    focusModeDisabled: 'وضع التركيز معطّل',
    focusModeActive: 'وضع التركيز نشط',
    exitFocusMode: 'الخروج من وضع التركيز',
    distractionsHidden: 'تم إخفاء المشتتات',
    thoughtRecord: 'سجل الأفكار',
    negativeThoughts: 'الأفكار السلبية',
    rationalResponse: 'الاستجابة العقلانية',
    cognitiveDistortions: 'التشوهات المعرفية',
    emotionRating: 'تقييم المشاعر',
    completeExercise: 'إكمال التمرين',
    gratefulFor: 'أنا ممتن لـ',
    addGratitude: 'إضافة امتنان',
    todayGratitude: 'امتنان اليوم',
    weeklyReport: 'التقرير الأسبوعي',
    monthlyReport: 'التقرير الشهري',
    moodTrends: 'اتجاهات المزاج',
    habitCompletion: 'إكمال العادات',
    sleepAnalysis: 'تحليل النوم',
    exerciseStats: 'إحصائيات التمارين',
    reminderTitle: 'عنوان التذكير',
    reminderTime: 'وقت التذكير',
    addReminder: 'إضافة تذكير',
    dailyReminder: 'تذكير يومي',
    customReminder: 'تذكير مخصص',
    errorOccurred: 'حدث خطأ',
    tryAgain: 'حاول مرة أخرى',
    noInternet: 'لا يوجد اتصال بالإنترنت',
    dataSavedLocally: 'تم حفظ البيانات محلياً',
    syncPending: 'المزامنة قيد الانتظار',
    successMessage: 'تم بنجاح',
    errorMessage: 'حدث خطأ',
    aiAnalysis: 'تحليل الذكاء الاصطناعي',
    aiSuggestion: 'اقتراح الذكاء الاصطناعي',
    generatingResponse: 'جاري إنشاء الرد...',
    askAI: 'اسأل الذكاء الاصطناعي',
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    signUp: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور',
    resetPassword: 'إعادة تعيين كلمة المرور',
    pinCode: 'رمز PIN',
    enterPin: 'أدخل رمز PIN',
    biometricAuth: 'المصادقة البيومترية',
    today: 'اليوم',
    yesterday: 'أمس',
    tomorrow: 'غداً',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    lastWeek: 'الأسبوع الماضي',
    lastMonth: 'الشهر الماضي',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'تاريخ التحديث',
    sleepHours: 'ساعات النوم',
    waterIntake: 'تناول الماء',
    exerciseDuration: 'مدة التمرين',
    caloriesBurned: 'السعرات المحروقة',
    symptoms: 'الأعراض',
    medications: 'الأدوية',
    typeHere: 'اكتب هنا...',
    optional: 'اختياري',
    required: 'مطلوب',
    noResultsFound: 'لا توجد نتائج',
    comingSoon: 'قريباً',
  },
  en: {
    appTitle: 'My Diary AI',
    welcomeMessage: 'Welcome to My Diary AI',
    selectLanguage: 'Select Language',
    chooseLanguagePlaceholder: 'Choose app language',
    continueButton: 'Continue',
    home: 'Home',
    diary: 'Diary',
    habits: 'Habits',
    books: 'Books',
    settings: 'Settings',
    profile: 'Profile',
    statistics: 'Statistics',
    lifeMap: 'Life Map',
    cbtTools: 'CBT Tools',
    gratitude: 'Gratitude',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    loading: 'Loading...',
    retry: 'Retry',
    newEntry: 'New Entry',
    entryTitle: 'Entry Title',
    entryContent: 'Entry Content',
    writeYourThoughts: 'Write your thoughts here...',
    addMood: 'Add Mood',
    addTags: 'Add Tags',
    lockEntry: 'Lock Entry',
    unlockEntry: 'Unlock Entry',
    archiveEntry: 'Archive Entry',
    moveToTrash: 'Move to Trash',
    restoreEntry: 'Restore Entry',
    permanentlyDelete: 'Permanently Delete',
    entrySaved: 'Entry Saved',
    entryDeleted: 'Entry Deleted',
    noEntriesYet: 'No entries yet',
    startWriting: 'Start Writing',
    moodTracking: 'Mood Tracking',
    howAreYouFeeling: 'How are you feeling?',
    happy: 'Happy',
    sad: 'Sad',
    anxious: 'Anxious',
    angry: 'Angry',
    calm: 'Calm',
    excited: 'Excited',
    tired: 'Tired',
    motivated: 'Motivated',
    newHabit: 'New Habit',
    habitName: 'Habit Name',
    habitCategory: 'Habit Category',
    habitFrequency: 'Habit Frequency',
    habitReminder: 'Habit Reminder',
    markComplete: 'Mark Complete',
    habitCompleted: 'Habit Completed',
    habitStreak: 'Habit Streak',
    dailyGoal: 'Daily Goal',
    weeklyGoal: 'Weekly Goal',
    monthlyGoal: 'Monthly Goal',
    myBooks: 'My Books',
    addBook: 'Add Book',
    bookTitle: 'Book Title',
    bookNotes: 'Book Notes',
    bookRating: 'Book Rating',
    readingProgress: 'Reading Progress',
    appSettings: 'App Settings',
    generalSettings: 'General Settings',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    systemTheme: 'System Theme',
    language: 'Language',
    font: 'Font',
    notifications: 'Notifications',
    enableNotifications: 'Enable Notifications',
    disableNotifications: 'Disable Notifications',
    privacy: 'Privacy',
    security: 'Security',
    changePin: 'Change PIN',
    enableBiometrics: 'Enable Biometrics',
    backupData: 'Backup Data',
    exportData: 'Export Data',
    importData: 'Import Data',
    clearCache: 'Clear Cache',
    aboutApp: 'About App',
    version: 'Version',
    focusMode: 'Focus Mode',
    focusModeEnabled: 'Focus Mode Enabled',
    focusModeDisabled: 'Focus Mode Disabled',
    focusModeActive: 'Focus Mode Active',
    exitFocusMode: 'Exit Focus Mode',
    distractionsHidden: 'Distractions Hidden',
    thoughtRecord: 'Thought Record',
    negativeThoughts: 'Negative Thoughts',
    rationalResponse: 'Rational Response',
    cognitiveDistortions: 'Cognitive Distortions',
    emotionRating: 'Emotion Rating',
    completeExercise: 'Complete Exercise',
    gratefulFor: 'I am grateful for',
    addGratitude: 'Add Gratitude',
    todayGratitude: "Today's Gratitude",
    weeklyReport: 'Weekly Report',
    monthlyReport: 'Monthly Report',
    moodTrends: 'Mood Trends',
    habitCompletion: 'Habit Completion',
    sleepAnalysis: 'Sleep Analysis',
    exerciseStats: 'Exercise Stats',
    reminderTitle: 'Reminder Title',
    reminderTime: 'Reminder Time',
    addReminder: 'Add Reminder',
    dailyReminder: 'Daily Reminder',
    customReminder: 'Custom Reminder',
    errorOccurred: 'An error occurred',
    tryAgain: 'Try Again',
    noInternet: 'No Internet Connection',
    dataSavedLocally: 'Data saved locally',
    syncPending: 'Sync Pending',
    successMessage: 'Success',
    errorMessage: 'Error',
    aiAnalysis: 'AI Analysis',
    aiSuggestion: 'AI Suggestion',
    generatingResponse: 'Generating response...',
    askAI: 'Ask AI',
    login: 'Login',
    logout: 'Logout',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    pinCode: 'PIN Code',
    enterPin: 'Enter PIN',
    biometricAuth: 'Biometric Authentication',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    sleepHours: 'Sleep Hours',
    waterIntake: 'Water Intake',
    exerciseDuration: 'Exercise Duration',
    caloriesBurned: 'Calories Burned',
    symptoms: 'Symptoms',
    medications: 'Medications',
    typeHere: 'Type here...',
    optional: 'Optional',
    required: 'Required',
    noResultsFound: 'No results found',
    comingSoon: 'Coming Soon',
  },
  de: {} as Translation,
  fr: {} as Translation,
  es: {} as Translation,
  it: {} as Translation,
  ru: {} as Translation,
  zh: {} as Translation,
  ja: {} as Translation,
  tr: {} as Translation,
};
