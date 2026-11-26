export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface AudioRecording {
  id: string;
  name: string;
  dataUrl: string;
  blobUrl?: string;
  duration: number; // in seconds
  mimeType?: string;
  transcription?: string;
  attachmentId?: string;
  isAppendedToContent?: boolean;
  speechEmotion?: {
    primaryEmotion: 'joy' | 'anxiety' | 'sadness' | 'anger' | 'calm' | 'normal' | string;
    intensity: 'high' | 'medium' | 'low' | string;
    intensityScore: number; // 0 - 100%
    vocalToneDetails?: string;
    recommendedColor?: 'amber' | 'emerald' | 'blue' | 'red' | 'teal' | 'stone' | string;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl: string;
  attachmentId?: string;
}

export interface ChatLogEntry {
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
  audioUrl?: string; // If recorded/synthesized
}

export interface MedicationTrack {
  id: string;
  name: string;
  time: string;
  taken: boolean;
}

export interface HabitTrack {
  id: string;
  name: string;
  completed: boolean;
}

export interface DiaryEdit {
  id: string;
  content: string;
  timestamp: string; // ISO String or custom formatted timestamp
}

export type JournalEntryType =
  | 'diary'        // 📔 يوميات
  | 'thought'      // 💭 خواطر وأفكار
  | 'gratitude'    // ❤️ امتنانات
  | 'wisdom'       // 💡 حكم قصيرة
  | 'quote'        // 📌 اقتباسات
  | 'idea'         // 🧠 أفكار سريعة
  | 'goal'         // 🎯 أهداف قصيرة
  | 'free_writing' // ✍️ كتابة حرة
  | 'memory';      // 🖼️ ذكريات مصورة      // 🎯 أهداف قصيرة

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  isEdited?: boolean;
  edits?: DiaryEdit[];
  moods: string[]; // Manual selected emojis/mood tags (e.g. "happy", "anxious")
  aiMoodAnalysis?: { mood: string; percentage: number }[]; // Predicted by Gemini
  importance: number; // Importance rating (1 to 5 stars)
  color: string; // Theme/background color for this note (e.g. bg-amber-50)
  images: string[]; // Base64 or Object URLs
  imageAttachmentIds?: string[]; // Persistent IndexedDB Attachment IDs for images
  videos: string[]; // Video links/data
  videoAttachmentIds?: string[]; // Persistent IndexedDB Attachment IDs for videos
  links?: string[]; // Web Links / URLs
  audioRecordings: AudioRecording[];
  files: FileAttachment[];
  drawing?: string; // Base64 data-uri of canvas drawing (backward-compatibility)
  drawingAttachmentId?: string; // Persistent IndexedDB Attachment ID for canvas drawing (backward-compatibility)
  drawings?: string[]; // Multiple canvas drawings data-uris
  drawingAttachmentIds?: string[]; // Multiple canvas drawings IndexedDB attachment IDs
  tasks: TaskItem[];
  tags: string[];
  chatLogs: ChatLogEntry[];
  isLocked: boolean;
  lockPassword?: string;
  // Dynamic life-map elements logged with this diary
  medications?: MedicationTrack[];
  sportsDuration?: number; // Minutes spent on exercise
  sportsType?: string; // Type of workout (e.g., walking, strength, yoga)
  sportsIntensity?: 'light' | 'medium' | 'high'; // Workout intensity
  sportsCalories?: number; // Estimated calories burned
  sportsEnergyBefore?: number; // Energy level before exercise (1-5)
  sportsEnergyAfter?: number; // Energy level after exercise (1-5)
  sportsNotes?: string; // Exercise notes / achievements
  sleepHours?: number; // Hours slept
  customHabits?: HabitTrack[];
  isArchived?: boolean; // Archived entry flag
  isTrash?: boolean; // Trashed entry flag
  deletedAt?: string; // Date when trashed
  waterCups?: number; // Water cups logged
  fastMoodScore?: number; // Daily fast mood score (1-10)
  symptomsChecklist?: string[]; // Logged physical symptoms
  cbtWorksheets?: CBTWorksheet[]; // CBT exercises attached to this day
  diaryType?: JournalEntryType; // Expanded Unified Journal Entry Type
  isFavorite?: boolean; // Direct explicit Favorite flag
}

export interface CBTWorksheet {
  id: string;
  createdAt: string; // ISO string
  triggerEvent: string; // Event or trigger
  negativeThoughts: string; // Automatic negative thoughts
  cognitiveDistortion: string; // Discovered cognitive distortion
  rationalAlternative: string; // Rational alternative thought
  emotionBefore: number; // 1-10
  emotionAfter: number; // 1-10
  exerciseType?: 'thought_record' | 'downward_arrow' | 'worry_box' | 'exposure_ladder' | 'coping_card' | 'grounding';
  evidenceFor?: string; // Evidence supporting thought
  evidenceAgainst?: string; // Evidence against thought
  coreBelief?: string; // Discovered core belief
  healthierBelief?: string; // Healthier alternative belief
  worryCategory?: 'actionable' | 'uncontrollable'; // Category of worry
  actionSteps?: string[]; // Action steps for actionable worries
  exposureSteps?: { id: string; stepNumber: number; situation: string; expectedAnxiety: number; actualAnxiety?: number; completed?: boolean }[];
  copingCardCategory?: 'anxiety' | 'panic' | 'depression' | 'ocd' | 'general';
}

export interface LifeMapEvent {
  id: string;
  type: 'note' | 'audio' | 'photo' | 'mood' | 'medication' | 'sports' | 'sleep';
  title: string;
  time: string; // Date or time label
  description?: string;
  icon?: string;
  moodColor?: string;
}

export interface BackupSettings {
  autoBackup: 'hourly' | 'daily' | 'weekly' | 'onWrite' | 'off';
  lastBackupTime?: string;
}

export interface AppReminder {
  id: string;
  title: string;
  time: string; // "HH:MM"
  active: boolean;
  type?: 'habit' | 'diary' | 'custom' | 'motivational' | 'meditation';
  frequency: 'daily' | 'weekly' | 'custom_days';
  selectedDays?: number[]; // [0,1,2,3,4,5,6] (0 = Sunday, 6 = Saturday)
  motivationalNote?: string;
  categoryIcon?: string;
  createdAt?: string;
  isQuestion?: boolean; // whether to present as interactive question (Yes/No)
  yesLabel?: string;
  noLabel?: string;
  showOverlay?: boolean; // whether to show cross-app overlay
}

export interface HabitSettings {
  singleTapToggle: boolean; // Toggle habit with single tap
  extendDayPastMidnight: boolean; // Extend day past midnight
  enableSkipDays: boolean; // Enable skip days
  showMissingDataMark: boolean; // Show missing data mark
  reverseDayOrder: boolean; // Reverse day order
  pureBlackDarkMode: boolean; // Pure black dark mode
  disableAnimations: boolean; // Disable confetti/animations
  widgetOpacity: number; // Widget opacity (0.1 - 1.0)
  firstDayOfWeek: 'saturday' | 'sunday' | 'monday'; // First day of week
  persistentNotifications: boolean; // Persistent notifications
  lockScreenWidgetEnabled?: boolean; // Pinned lock screen widget
  fullscreenModeEnabled?: boolean; // Fullscreen mode
  autoHideHeaderOnScroll?: boolean; // Auto-hide header on scroll
}

export type AppLanguage = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'tr' | 'pt' | 'ru' | 'ja' | 'zh' | 'hi';
export type AppFontFamily = 'cairo' | 'tajawal' | 'almarai' | 'amiri' | 'noto_naskh' | 'jakarta' | 'system';
export type AppLineHeight = 'compact' | 'normal' | 'relaxed' | 'spacious';

export type ApiKeyStatus = 'ready' | 'rate_limited' | 'quota_exhausted' | 'invalid' | 'standby';

export interface ApiKeyPoolEntry {
  id: string;
  name: string;
  key: string;
  status: ApiKeyStatus;
  cooldownUntil?: number;
  cooldownReason?: string;
  isEnabled: boolean;
  priority: number; // 1 to 5
  requestsToday: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsedAt?: string;
  lastErrorMsg?: string;
  rateLimitResetAt?: number; // timestamp ms
  verifiedModel?: string; // Subtle verified active model ID (e.g. gemini-3.5-flash-lite)
  createdAt: string;
}

export interface AppSettings {
  isDarkMode: boolean;
  notificationsEnabled: boolean;
  lockScreenWidgetEnabled?: boolean; // Pinned lock screen widget
  fullscreenModeEnabled?: boolean; // Fullscreen mode
  autoHideHeaderOnScroll?: boolean; // Auto-hide header on scroll
  appLanguage: AppLanguage;
  appFont?: AppFontFamily; // App font family
  appLineHeight?: AppLineHeight; // App line height
  floatingBallEnabled: boolean;
  appPinCode?: string; // Screen Lock PIN
  isAppLocked: boolean;
  biometricCredentialId?: string; // WebAuthn Passkey Credential ID
  isBiometricEnabled?: boolean; // Toggle for Biometrics (Fingerprint / Face ID)
  backupSettings: BackupSettings;
  userApiKey?: string; // Custom client API Key for standalone / APK usage (legacy single key)
  apiKeys?: ApiKeyPoolEntry[]; // Gemini API Key Pool (up to 5 keys)
  activeKeyId?: string; // Selected active API Key ID
  reminders?: AppReminder[]; // Added scheduled reminders
  habitSettings?: HabitSettings;
}

export interface HabitHistoryEntry {
  completed: boolean;
  value?: number;
  skipped?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  icon?: string; // Expressive custom icon chosen by user
  category: 'health' | 'mind' | 'sport' | 'culture' | 'custom';
  habitType?: 'boolean' | 'measurable'; // 'boolean' or 'measurable'
  question?: string; // Habit prompt
  color?: string; // Habit accent color
  unit?: string; // Habit measurement unit
  targetValue?: number; // Target numeric value
  targetType?: 'at_least' | 'at_most' | 'exactly'; // Target comparator type
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom';
  customStartDate?: string; // "YYYY-MM-DD"
  customEndDate?: string; // "YYYY-MM-DD"
  reminderTime?: string; // "HH:MM" format
  reminderEnabled: boolean;
  notes?: string;
  isArchived?: boolean;
  isCompleted?: boolean;
  order?: number;
  createdAt: string; // ISO string
  history: { [dateStr: string]: boolean | number | HabitHistoryEntry }; // YYYY-MM-DD -> completion / value
}

export interface GratitudeCard {
  id: string;
  text: string;
  color: string;
  createdAt: string;
  likes?: number;
  tags?: string[];
  category?: string;
}

export interface Book {
  id: string;
  title: string;
  notes: string;
  rating: number;
  pdfPath?: string;
  referenceLink?: string;
  audioAttachment?: string;
  coverAttachment?: string;
  videoAttachment?: string;
  hasMindMap: boolean;
  createdAt: string;
  tags?: string[];
  category?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  token?: string;
  createdAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface MultimodalAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'audio' | 'video' | 'file';
  mimeType: string;
  sizeBytes: number;
  base64Data?: string;
  fileUri?: string;
  previewUrl?: string;
  status?: 'uploading' | 'ready' | 'error' | string;
}
