# Hayat AI — Project Context & Engineering Guide

This document summarizes the core architecture, AI routing model, Android APK WebView constraints, and quality gates for **Hayat AI (حياة AI)**.

---

## 1. Key Project Files & Architecture

- **`src/App.tsx`**: Main application shell, state hub, diary editor, modal manager, audio/file picker handlers, and global toast system.
- **`src/lib/gemini.ts`**: Client-side Gemini AI integration pipeline, audio multimodal transcription (`transcribeAudioWithGemini`), and chat advisors.
- **`src/lib/fetchInterceptor.ts`**: Intercepts AI requests, model routing fallbacks, quota handling, and offline responses.
- **`src/lib/attachmentStore.ts` & `src/lib/mediaStorage.ts`**:
  - IndexedDB storage for binary assets (audio, photos, videos, documents).
  - Offscreen canvas compression for photos prior to storage (`compressImageFile`, max dimension 1600px, 0.82 quality).
  - Prevents localStorage quota exhaustion (5MB limit) by storing blobs in IndexedDB and maintaining metadata in `localStorage`.
- **`src/lib/clipboard.ts` (`copyTextSafe`)**: Bulletproof clipboard copy utility tailored for Android WebView, iOS WebKit, and desktop browsers (modern Clipboard API with fallback to temporary `textarea` + `document.execCommand('copy')`).
- **`src/components/BlomeoDiaryWorkspace.tsx` & `src/components/BlomeoNoteEditor.tsx`**: Flagship adaptive Obsidian (Desktop 3-pane) / Samsung Notes (Mobile) workspace wired live into `src/App.tsx`, replacing the legacy Diary UI with full multi-device ergonomics, rich formatting, 10-trigger paperclip, multi-select preMoods, and 100% normalized AI mood breakdown.
- **`src/components/VoiceVentModal.tsx`**: Quick Voice Venting ("فضفضة صوتية سريعة") with safe MediaRecorder MIME detection, resilient audio recording, optional live speech recognition, and automatic Gemini transcription on stop.
- **`src/components/OnboardingTourModal.tsx`**: Vibrant fast-paced interactive "اكتشف حياة AI" tour featuring 7 dedicated slides with animated gradients, gesture touch swiping, feature chips, and direct action triggers covering offline privacy, live voice venting, token saver mode, Phone ↔ Laptop email sync, long PNG/PDF export & WriteDiary import, and interactive floating reminders.
- **`src/components/GratitudeImportModal.tsx`**: Selective Gratitude Wall Import modal supporting "اليوم" / "كل الأيام" filters, multi-select, and seamless appending to diary entries.
- **`src/lib/languages.ts`**: 12-language localization dictionary (`ar`, `en`, `fr`, `de`, `es`, `it`, `tr`, `pt`, `ru`, `ja`, `zh`, `hi`).

---

## 2. Gemini Routing Rules

- **Standard Model**: `gemini-3.5-flash-lite` is prioritized across quick conversational, analysis, and multimodal transcription flows for minimal latency and cost efficiency.
- **Fallback Chain**:
  1. Live auto-discovered Google models per API key with task-adaptive routing (`light`, `multimodal`, `deep`).
  2. Fallback models (`gemini-3.8-flash`, `gemini-4-hydrogen`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`) with runtime self-healing on model restriction.
  3. No raw quota sentinel errors leaked to UI; user-friendly localized advisories are surfaced instead.

---

## 3. Android APK WebView Constraints & Conventions

1. **Clipboard**:
   - `navigator.clipboard.writeText` often throws `NotAllowedError` or fails without active user gesture in Android WebView.
   - Always use `copyTextSafe(text)` from `src/lib/clipboard.ts` which uses an off-screen `textarea` and `document.execCommand('copy')` as an automatic fallback.
2. **Text Selection**:
   - Keep `user-select: text !important` and `-webkit-touch-callout: default !important` enabled on editors, readable articles, headings, and input fields in `src/index.css`.
3. **File Inputs & Selection**:
   - Process `File` objects completely (e.g. read Blob or compress) **before** resetting `input.value = ''`.
   - Never store heavy binary data (base64 images/audio) in `localStorage`. All media blobs go through `saveAttachmentBlob` into IndexedDB (`attachmentStore`).
4. **Strict Picker Filters**:
   - Images: `accept="image/*"`
   - Videos: `accept="video/*"`
   - Audio: `accept="audio/*"`
   - PDFs: `accept="application/pdf"`
   - Documents: `accept="application/pdf,.doc,.docx,.txt,.rtf,.odt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"`
5. **Microphone & SpeechRecognition**:
   - Always decouple audio recording (`getUserMedia({ audio: true })` + `MediaRecorder`) from live speech recognition.
   - SpeechRecognition failure must never abort audio capture.
   - Provide a file picker fallback (`accept="audio/*"`) if microphone access is denied.

---

## 4. Quality Gates & Localization Audit Commands

Always run these checks in foreground to ensure zero regressions:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Strict i18n dictionary audit across all 12 languages
node scripts/i18nAudit.cjs

# 3. Codebase localization & UI leak validator
node scripts/validate-localization.mjs

# 4. Production build
npm run build
```

---

## 5. Capacitor Standalone Offline Android Setup & Auto-Updates

1. **Standalone Offline Architecture**:
   - `capacitor.config.ts`: Configured with `appId: 'com.hayatai.app'`, `appName: 'حياة AI'`, `webDir: 'dist'`, and `androidScheme: 'https'`.
   - The web application is bundled directly into the APK assets (`dist/` synced into `android/app/src/main/assets/public`), running completely offline with no external host dependency.
   - Preserves Capacitor's default `BridgeActivity` and `BridgeWebChromeClient` for native media permissions and strict file picker handling.

2. **Fixed PKCS12 Signing Keystore & Dynamic Versioning**:
   - Fixed personal signing keystore located at `android/app/hayat-release.p12` (`storeType "PKCS12"`, alias `hayat`, password `hayat2026`).
   - Every build uses this exact keystore signature, enabling seamless **in-place updates** on Android devices without requiring uninstallation or losing local IndexedDB/localStorage data.
   - `android/app/build.gradle` dynamically reads `versionCode` from `APP_VERSION_CODE` (default 100) and `versionName` from `APP_VERSION_NAME` (default "1.0.0").

3. **Native In-App Android Updater (`AppUpdaterPlugin.java`, `src/lib/appUpdater.ts`, `AppSettingsUpdatesSection.tsx`)**:
   - True native Capacitor plugin (`AppUpdaterPlugin.java`) reading installed `versionCode` and `versionName` directly from Android `PackageManager`.
   - In-app download with background `HttpURLConnection` explicitly following HTTP 301/302/303/307/308 redirects across hosts to GitHub Release asset storage.
   - Checks `REQUEST_INSTALL_PACKAGES` permission on Android 8+ and triggers `Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES` if needed.
   - Emits throttled `downloadProgress` events with live progress bar and launches native `FileProvider` package installer directly without browser redirects.
   - App Settings features a dedicated **التحديثات (Updates)** card directly below the API Key section.

4. **Automated GitHub Actions CI/CD**:
   - `.github/workflows/build-android-apk.yml` triggers on push to `main` and `workflow_dispatch`.
   - Builds web bundle with dynamic version code (`100 + GITHUB_RUN_NUMBER`), compiles signed release APK using Gradle with the fixed keystore, uploads the `.apk` as a workflow artifact, and creates a tagged GitHub Release with the APK attached.

---

## 6. Dynamic Gemini Model Discovery & Adaptive Scoring

- `discoverGoogleModels` queries `GET /v1beta/models` and caches discovered models in `localStorage` with a 24-hour TTL (`yawmiyati_gemini_models_cache`).
- Automatic background invalidation and re-discovery triggered upon encountering `404` / `NOT_FOUND` or exhausting the active candidate list.
- Filters keep strictly `generateContent`-capable endpoints, excluding specialized non-chat endpoints and retired legacy `1.x`/`2.0`/`2.5` models when modern models exist.
- `scoreModelForTask` prioritizes newest lightweight models: newest `flash-lite` -> newest `flash` -> active general models, backed by offline fallback chain (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-4-hydrogen`, `gemini-3.8-flash`).
- Gemini 3.5+/4 payload compatibility ensures sampling params (`temperature`, `top_p`, `top_k`) are stripped and trailing `model` turns are removed.

---

## 7. Emotion Percentages Accuracy & Normalization

- `src/lib/emotionNormalization.ts` implements Largest-Remainder Rounding (Hare-Niemeyer method).
- Canonical mood mapper prevents split buckets caused by Arabic/English variations and mixed casing.
- Guarantees all non-empty distributions sum strictly to `100%` across diary badges, analytics charts, and therapist reports with zero `NaN` or rounding overflow.

---

## 8. Attachment Validity, Persistence & Offline Rehydration

- `sanitizeDiariesForLocalStorage` strips ephemeral `blob:` URLs before writing to `localStorage`, preventing broken links after Android app restart.
- Binary media assets are persisted in `IndexedDB` (`attachmentStore`) with non-zero size validation and explicit MIME types.
- Startup rehydration pass automatically resolves fresh Object URLs for images, audio, and drawings on app boot.

---

## 9. Reliable Local-Midnight (12:00 AM) Daily Report Scheduler & Full-Day Mood Breakdown

- `src/lib/dailyReportScheduler.ts` calculates date keys strictly in device's local timezone (preventing the 2-hour shift in UTC+2).
- Schedules clean local 12:00 AM rollover triggers with automatic catch-up on app startup, visibility change (`document.visibilityState === 'visible'`), and `online` event.
- Strict idempotency per local date key (`yawmiyati_daily_report_done_<DATE>`) prevents duplicate reports.
- In a single midnight job, automatically generates BOTH:
  1. **Daily Pros & Cons (الإيجابيات والسلبيات)** persisted into `yawmiyati_pros_cons_history`.
  2. **Full-Day Mood Percentage Breakdown** combining entry moods and AI emotion analysis, strictly normalized to `100%` via `emotionNormalization.ts`.
- Rendered side-by-side next to the «الإيجابيات والسلبيات» button and in `DailyProsConsModal.tsx`.
- Background execution routed through `backgroundAIManager` guarantees uninterrupted generation across navigation with quota-saving `text-only` default.

---

## 10. Granular Per-Chat & Per-Report AI Media Access Control (Quota & Token Saver)

- `src/lib/aiMediaAccess.ts` and `AIMediaAccessSelector.tsx` provide granular permission control (`text-only`, `by-type`, `selected`).
- **Quota-Saving Default:** Every new chat and report defaults strictly to `text-only`, sending diary text and audio transcripts with ZERO raw binary media blobs unless explicitly allowed by the user.
- **Memory Cap:** Enforces a 20MB payload limit per request on mobile WebView to prevent OOM crashes, skipping oversized items cleanly.
- Integrated into `unifiedAIKnowledgeService.ts`, `aiService.ts`, `fetchInterceptor.ts`, `SmartAdvisor.tsx`, `App.tsx` diary chat, `DailyProsConsModal.tsx`, `MonthlyMentalHealthPDFReportModal.tsx`, and `TherapistReportModal.tsx`.

---

## 13. Blomeo Flagship Advisor Overhaul & True Full-Screen Experience

1. **Dual-Card Selection Hub (`Landing Mode`)**:
   - Replaced the cramped dual-tab header with an elegant Blomeo-styled landing screen presenting two interactive cards:
     1. **`مستشاري الشخصي (Personal Journal Advisor)`**: Analyzes diaries, mood logs, habits, tasks, assessments, and selected media strictly within the user's chosen time range and access permissions.
     2. **`المستشار الذكي العام (General AI — Gemini-Style)`**: Dedicated Gemini-style general assistant for knowledge, study, programming, ideation, and direct device attachments with zero diary clutter.
2. **True Full-Screen Workspaces**:
   - Tapping either card transitions into a dedicated full-screen workspace (`fixed inset-0 z-[9990]`, 100% viewport width/height, safe-area padding).
   - Smooth navigation with Back button wired to `useRegisterBackStep` returning to the Selection Hub.
3. **Dynamic Live Gemini API Model Discovery**:
   - Removed spinning refresh icon from top headers.
   - Upgraded to a two-section Model Picker modal:
     - **Section 1 (Routing Modes)**: `متكيف تلقائي` (Auto-adaptive), `سريع` (Fastest Flash), `دقة عالية Pro` (Highest-tier Pro).
     - **Section 2 (Live Available Models)**: Dynamically queries `GET /v1beta/models`, filters `generateContent` endpoints, sorts newest/highest-tier first, caches in localStorage with timestamp, and supports mid-chat switching with `تحديث القائمة من الـ API ↻`.
4. **Time-Range Limit & Media Scope (`AdvisorScopeModal`)**:
   - Strictly inside Personal Advisor: Time-range presets (`1d`, `7d`, `1m`, `3m`, `6m`, `1y`, `custom` single date or range).
   - Scopes all entries, moods, habits, and media.
   - Three media modes: `text-only` (default token saver), `by-category` (with green `✓ النصوص مدمجة تلقائيًا دائمًا` badge and checkboxes for photos/videos/audio/docs), and `manual` (checkboxes for media within range). Real-time count chip & wide-range quota warning.
5. **Dated Multi-Conversation Drawers**:
   - Completely separate multi-conversation drawers for Personal Advisor and General AI.
   - Each conversation displays title, full date of creation/start, and clean delete action.
6. **Message Full Date+Day Stamps & Gemini-Style Bottom Composer**:
   - Every single message displays localized Day name + full Date + Time (e.g. `السبت، 28 نوفمبر 2026 • 10:45 ص`), copy message button with `تم النسخ ✓` feedback, and TTS on AI replies with `select-text` enabled.
   - Clean Gemini-style bottom composer with auto-expanding textarea, 4 native device pickers (`صور`, `فيديو`, `مستندات`, `صوتيات`), voice dictation, and Gemini-style Live Voice trigger opening `LiveVoiceChatModal` in Blomeo emerald/aquatic dark mode tokens.


- Capacitor native plugin (`FileExportPlugin.java`) registered in `MainActivity.java` and wired in `exportUtils.ts`.
- **Corrupted File Error Root-Cause Resolution:**
  - Strips any Data-URI prefix safely by slicing after the first comma (`commaIdx = raw.indexOf(',')`) and trimming whitespace.
  - Validates binary integrity before writing or sharing: rejects empty payloads, verifies PNG signature (`0x89, 0x50, 0x4E, 0x47`) and PDF header (`%PDF` / `0x25, 0x50, 0x44, 0x46`).
  - Cache file (`cache/exports/<safeFileName>`) written, flushed, and closed via `try-with-resources`.
  - Android 10+ (`Q+`) `MediaStore.Downloads` saving marks `IS_PENDING = 1` during write and resets to `0` upon flush & close, with auto-delete on failure.
  - Native share intent configured with `ACTION_SEND`, `ClipData`, and `FLAG_GRANT_READ_URI_PERMISSION` on both intent and chooser (+ `FLAG_ACTIVITY_NEW_TASK`).
  - Web/desktop fallback cleanly separated; Capacitor native always invokes native plugin with user-friendly Arabic/localized error surfacing.
- **Export Diary Modal (`ExportDiaryModal.tsx`):**
  - **Offline-Safe Image Pre-inlining:** Resolves diary images and drawings from IndexedDB / `attachmentStore` into inline Base64 data-uris and awaits full element decoding prior to canvas capture.
  - **Safe Solid Hex Styling:** Renders inside an offscreen visible container (`position: fixed; left: -10000px; width: 794px`) avoiding CSS variable / `oklch()` rendering crashes in mobile WebView.
  - **Dynamic Scale Protection:** Computes safe `html2canvas` scaling (`1-2x`) based on element height to protect against GPU canvas overflow on tall entries.
  - **Multi-page A4 PDF Slicing:** Neat canvas height slicing with top/bottom margins in `jsPDF`.
  - **Toggleable Attached Images & Tasks (To-Do List):** Interactive checkboxes with live preview, rendering attached images at the bottom of the diary and formatted tasks with completion badges and strike-throughs across both PNG and PDF exports.

---

## 11. Zero-Conflict Live Voice Vent Streaming Transcription (`liveAudioChunker.ts`)

- Overcomes Android WebView `webkitSpeechRecognition` limitations and mic sharing blocks by tapping the active `MediaStream` via `AudioContext` and downsampling PCM to 16kHz mono WAV chunks.
- Every 4 seconds, voice energy (RMS) is evaluated; speech chunks are queued sequentially and transcribed live via `gemini-3.5-flash-lite`, surfacing real-time spoken text alongside an active streaming indicator.
- Recording runs continuously until the user explicitly taps Stop, with full Review & Save steps before any diary insertion.

---

## 12. Mobile Edge-to-Edge Diary Editor Layout (< 768px)

- Maximizes writing area on mobile viewports: eliminates redundant outer padding (`px-0 md:px-6` on main container), renders the composer card edge-to-edge (`rounded-none sm:rounded-3xl border-y sm:border mx-0 w-full`), and provides full-width internal padding (`px-3 py-3 sm:p-5`) with zero horizontal overflow.

---

## 14. Top Header Action Bar Polish & html2canvas-pro Modern Color Migration

- **Decluttered Top Action Bar (`src/App.tsx`):**
  - Streamlined the mobile top expandable header bar (accessed via `+` / `X` toggle button next to the "حياة AI" logo).
  - Removed duplicate shortcuts already accessible from primary bottom tabs or dedicated screens: المستشار الذكي (Advisor tab), جلسة دعم نفسي (Therapy Report session), and خواطري (Diary sub-tab).
  - Arranged remaining essential items in RTL order with uniform height (`h-10 min-h-[40px]`), clean spacing (`gap-2`), crisp typography (`whitespace-nowrap shrink-0`), and smooth hidden horizontal scrolling:
    1. **الأذكار** (Athkar)
    2. **قائمة المهام اليومية** (Daily Tasks Checklist + active count badge)
    3. **جدار الامتنان** (Gratitude Wall)
    4. **تمارين العلاج المعرفي** (CBT Exercises)
    5. **التنبيهات / الإشعارات** (Smart Reminders with active count badge)
    6. **تسجيل الدخول / الحساب** (Login / Account status button)

---

## 15. Native Smart Reminders, Cross-App Floating Card Overlay & Adaptive Icons

- **Native Android Plugin (`SmartReminderPlugin.java`, `ReminderAlarmReceiver.java`, `ReminderOverlayHelper.java`, `ReminderActionReceiver.java`):**
  - Schedules native `AlarmManager` exact alarms with safe Android 12+ `canScheduleExactAlarms()` fallback to avoid `SecurityException`.
  - Dispatches high-importance heads-up system notifications (`hayat_smart_reminders` channel) with custom monochrome status bar icon `ic_stat_hayat`.
  - When the user is outside the app and overlay permission is enabled, renders a floating interactive card via `WindowManager` (`TYPE_APPLICATION_OVERLAY`) with **نعم / لا** interactive actions and **✕** close button.
  - Automatically records responses to `SharedPreferences` and syncs them back to `App.tsx` via `consumePendingResponses()`.
- **In-App Floating Reminder Card (`InAppReminderOverlay.tsx`, `smartReminderBridge.ts`):**
  - Displays top floating banner with instant question actions (`yes`/`no`) or plain alert dismiss inside the app.
- **Adaptive Launcher Icon:**
  - Auto-generated launcher icons across all mipmap densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`) from `resources/icon.png` with comfortable 66% safe inner-zone padding for circular crops.
- **Universal html2canvas-pro Migration (`exportUtils.ts`):**
  - Fully resolved `Attempting to parse an unsupported color function "oklch"` errors stemming from Tailwind CSS v4 color formats (`oklch()`, `oklab()`, `lch()`, `color-mix()`).
  - Added `captureElementToCanvas(element, options)` helper in `src/lib/exportUtils.ts` wrapping `html2canvas-pro` with safe background chaining and `@font-face` preservation.
  - Migrated all direct `html2canvas` calls across the codebase (`ExportDiaryModal.tsx`, `DailyProsConsModal.tsx`, `MonthlyMentalHealthPDFReportModal.tsx`, `ShareableGratitudeCardModal.tsx`, `SmartAdvisor.tsx`, and `App.tsx`) to `captureElementToCanvas`.
  - Upgraded `ExportDiaryModal.tsx` media detection to inspect all visual attachments (including image-typed files and drawings) and preload them into inline Base64 data URIs from `IndexedDB` prior to capture.

---

## 16. React Error #310 Resolution (Unconditional Hook Placement Before Early Returns)

- **Root Cause & Fix:** Resolved `Minified React error #310` ("Rendered more hooks than during the previous render") on startup. The primary culprit was in `src/components/LanguagesModal.tsx` where the custom hook `useRegisterBackStep` was declared *after* the early return guard (`if (!isOpen) return null;`). On fresh launch / cleared storage, `LanguagesModal` rendered with `isOpen=false` (calling 2 hooks), then flipped to `isOpen=true` when the initial language picker opened (calling 3 hooks including `useRegisterBackStep`), triggering error #310.
- **Remediation:** Moved `useRegisterBackStep` along with language initialization unconditionally to the top of `LanguagesModal.tsx` prior to `if (!isOpen) return null;`, and audited all initial-mount components (`OnboardingTourModal.tsx`, `InAppReminderOverlay.tsx`, `StaticNotification.tsx`, `FloatingBall.tsx`, `App.tsx`) to guarantee strict hook call count invariants across all renders.






## 17. UX, Export, Voice Flow, Fullscreen & Olive Adaptive Icon Hardening (2026-11-26)
- Removed the global 44px minimum-height distortion from compact controls through explicit compact-control, switch, pagination-dot, and color-swatch opt-outs; normalized the Smart Advisor consent switch to an 11x6 RTL-safe pill with the Hayat AI olive-emerald active fill.
- Fixed Smart Voice Journal category saving so the flow has no blocking browser alert, persists the full entry and IndexedDB audio attachment, closes cleanly, opens the saved entry in Diaries, applies its category filter, and shows a non-blocking confirmation toast.
- Replaced Daily Pros/Cons Word raw-anchor export and print/iframe PDF fallback with UTF-8 BOM Word export and html2canvas-pro/jsPDF A4 pagination through exportBlobSafe; removed the active diary PDF window.print fallback.
- Calmed the onboarding palette, separated header/progress, scrollable body, and footer zones, and protected pagination dots from touch-target stretching.
- Added Android-back-aware fullscreen toggles to the diary editor, drawing pad, continuous voice vent, and Smart Advisor views.
- Applied the uploaded olive-green artwork pixel-for-pixel as resources/icon.png; regenerated mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi launcher, round, and safe-zone foreground PNGs and switched Android 8-15 adaptive icons to the matching olive diagonal background.
- Quality gates passed: `npx tsc --noEmit`, `node scripts/i18nAudit.cjs`, `node scripts/validate-localization.mjs`, and `npm run build`. No files under `.github/` were changed and Gradle was not run.
- Extended the export audit to the therapist, integrated therapy, and monthly mental-health reports: removed popup/iframe printing and raw anchor downloads, routed HTML/TXT/Word exports through exportBlobSafe, and made PDF failure handling non-blocking.

## 18. Dynamic Gemini Routing, Uploads & Five-Key Diagnostics (2026-11-27)
- `src/lib/geminiModelRouter.ts` discovers active `generateContent` Gemini models per key with a 12-hour cache and routes `auto`, `fast`, `precision`, or explicit model preferences by task.
- `src/lib/geminiFileUpload.ts` uses inline Base64 below 4MB and Gemini resumable File API uploads with processing polling, progress callbacks, the original Blob reference, and key failover.
- Gemini request paths share persisted key cooldown diagnostics for 400/403/429/503 responses and the settings modal can scan all five configured keys while refreshing models.
- Audio prompts now require verbatim Egyptian Arabic, MSA, English, and mixed-speech transcription without summarization or invented wording.

## 19. Advisor Workspace, Multimodal Attachments & Live Voice (2026-11-27)
- `SmartAdvisor.tsx` persists general-chat threads in localStorage, supports rename/delete and Today/Previous grouping, keeps diary context opt-in for general chat, and exposes auto/fast/precision plus discovered Gemini models.
- Advisor attachments and recorded voice messages use `prepareGeminiMedia`: inline payloads below 4MB, Gemini File API for larger media with live progress, and precision-tier generation for media turns.
- `LiveVoiceChatModal.tsx` shares full conversation history, supports browser speech recognition and MediaRecorder transcription, Arabic speech synthesis, instant interruption with a spoken-point note, optional RMS barge-in, and Android-back cleanup.
- Text turns use the selected tier (auto maps to fast); multimodal and audio transcription turns explicitly use precision.

## 20. Native Lock Screen Quick Access & App Security (2026-11-27)
- `PersistentNotificationHelper.java` maintains the enabled state and localized labels for a public, ongoing Android lock-screen notification with write and voice actions; it restores after app resume and boot.
- `BiometricAuthPlugin.java` exposes AndroidX `BiometricPrompt` for strong/weak fingerprint and face authentication, while `src/lib/biometricAuth.ts` keeps the Capacitor bridge typed.
- `SmartReminderPlugin.java` exposes `setLockScreenNotification()` and `getPendingQuickAction()`; `MainActivity.java` captures and clears action intents safely.
- App lock supports the legacy PIN path plus locally hashed alphanumeric passwords through `passwordSecurity.ts`; native biometrics remain an optional fallback and all React hooks stay before early returns.
- Quality gates passed on 2026-11-27: TypeScript, strict 12-locale i18n audit, localization validator, and production build. Gradle was intentionally not run locally.

## 21. Native Six-Group Settings Redesign (2026-11-27)
- Replaced the sprawling Settings tab with `src/components/SettingsPanel.tsx`, a compact RTL-aware native mobile surface built from six expandable groups: الأمان والخصوصية، الذكاء الاصطناعي والمفاتيح، الإشعارات وشاشة القفل، المزامنة والنسخ الاحتياطي، المظهر واللغة، والتطبيق والتحديثات.
- Preserved live wiring for PIN/password and biometric security, five-key Gemini diagnostics, media/token-saving guidance, lock-screen notification, smart reminders, email/account sync, WriteDiary import, backup/export, theme, 12-language selection, in-app updater, and onboarding tour.
- Normalized settings rows and switches to compact `py-3 px-4` grouped-list styling with no browser alerts in the redesigned surface; localized new labels across all 12 supported locales.

## 22. Real Biometrics, 4-Action Lock-Screen Widget, Smart Overlay/Lock Routing & Full Alarm System (2026-11-27)
- **Real Biometric Authentication & Single Lock State:** Removed simulated browser camera Face ID (`getUserMedia`) entirely from `PINLock.tsx`. All biometrics (Fingerprint and Face Unlock) route natively through `BiometricAuthPlugin.java` via `androidx.biometric.BiometricPrompt`. Consolidated master lock toggle into a single source of truth in `localStorage` (`appLockEnabled`). When disabled, lock screen never triggers on cold start or background resume; when enabled, auto-prompts biometrics and secures the app. Cleaned security settings clutter by removing the redundant top row and technical APK text box.
- **4-Action Lock-Screen Notification Widget & Home Polish:** Upgraded `PersistentNotificationHelper.java` to use a fresh channel ID `hayat_lockscreen_quick_v2` with `IMPORTANCE_DEFAULT`, `VISIBILITY_PUBLIC`, and a custom RemoteViews XML layout (`notification_lockscreen_quick.xml`) featuring 4 interactive actions: كتابة (`write`), تسجيل صوتي (`voice`), مزاج (`mood`), and مستشار (`advisor`). Tapping any button launches the app, resolves lock if enabled, and navigates immediately to the destination. Cleaned Home screen by removing the top "التنبيهات نشطة الآن" card, and removed "أداة التحكم السريع" row from settings.
- **Smart Reminders Zero Duplicate & Full Alarm System:** `ReminderAlarmReceiver.java` inspects `KeyguardManager` and `PowerManager`. When unlocked & interactive, it shows ONLY the interactive floating overlay without a status-bar notification; when locked or screen is off, it posts ONLY the lock-screen notification. Added full Alarm Mode (`AlarmSoundManager.java`) using `AudioAttributes.USAGE_ALARM` with repeat count and stop/snooze actions directly on the overlay and notification. Added native Android ringtone picker (`RingtoneManager.ACTION_RINGTONE_PICKER`) and audio file picker (`pickAudioFile`), plus audio preview and stop preview inside the reminder editor.

---

## 23. Navigation Shell, Flexible Floating FAB, Fullscreen Writing & Consultation, and Bulletproof Auto-Save (2026-11-27)
- **Flexible Draggable Floating '+' FAB Menu (`FloatingFabMenu.tsx`):**
  - Converted the quick-tools button into an independent, smooth draggable floating FAB with touch/pointer drag clamping, `localStorage` persistence (`yawmiyati_fab_pos`), and a 6px drag threshold to prevent accidental clicks while dragging.
  - Tapping opens all tools in a compact horizontally scrollable tray (`overflow-x-auto flex-nowrap`). The FAB icon morphs into an `X` button; tapping `X` closes ONLY the tray without dismissing whatever tool was opened.
- **Unstuck Header & Persistent Bottom Navigation:**
  - Removed sticky positioning from the top "حياة AI" header so it scrolls naturally with page content.
  - Upgraded the bottom navigation bar to remain persistent across all regular screens and sub-pages; auto-hides strictly in 3 states: 1) virtual keyboard is open/typing, 2) fullscreen editor or consultation is active, 3) live voice call or voice vent session is active.
- **Universal Floating Back Button & Settings Toggle (`FloatingBackButton.tsx`):**
  - Rendered at the top-most portal/root level (`z-[9999]`) with drag clamping and persistence (`yawmiyati_back_btn_pos`), remaining accessible above all pages, sub-pages, and modals while keeping native Android gesture back functional.
  - Added a toggle switch in `SettingsPanel.tsx` (under Appearance) backed by `localStorage` (`yawmiyati_floating_back_enabled`) and `AppSettings.floatingBackButtonEnabled`.
- **Diary Composer Redesign & Fullscreen Writing Mode:**
  - Removed redundant top row ("تدوينة جديدة 📝", expand button, "إلغاء وحفظ كمسودة") so the composer opens directly onto entry fields.
  - Direction-aware swipe hint for category chips (`scrollHintRtl`: "اسحب لليسار لعرض المزيد", `scrollHintLtr`: "Swipe right for more").
  - Localized mood picker heading ("المزاج والشعور الغالب لحظة كتابة اليومية") with all 10 mood pills in a single horizontally scrollable row.
  - Dedicated Expand/Collapse button on the writing box toolbar providing a 100% full-viewport distraction-free writing canvas (`fixed inset-0 z-[9995]`).
  - Audited rich text formatting toolbar: selection preservation on touch/click (`onMouseDown e.preventDefault()`, saved Range restore), Bold, Italic, Underline, Strikethrough, H1, H2, Blockquote, Bullet & Numbered lists, Text Alignment (Right, Center, Left), Highlighter pen, and Clear formatting.
- **Bulletproof Continuous Auto-Save Engine:**
  - Debounced auto-save at ~800ms on any change across title, rich text, rating, category, mood, tags, tasks, attachments, or chat logs.
  - Synchronous flush on `visibilitychange` (hidden), `pagehide`, `beforeunload`, Capacitor `appStateChange` (background), navigation switch, or Back press. Live status pill (`تم الحفظ تلقائيًا ✓`) displayed next to the final Save & Close button.
- **Inline Smart Consultation Upgrade ("جلسة استشارة ومحادثة ذكية"):**
  - Dedicated Fullscreen toggle button expanding consultation to full viewport.
  - Moved `AIMediaAccessSelector` bar to the top (directly under header, above chat messages).
  - Gemini-style multiline auto-expanding composer (`<textarea rows={1}>` up to 140px) with circular Up-Arrow (`↑`) send button and loading spinner.
  - Single horizontal scrollable row with 8 practical localized psychological analysis suggestions (summarize, cognitive errors, tomorrow's plan, deep feelings, strengths, cognitive reframing, quick calm, 3 reflection questions).
- **Localization & Quality Gates:**
  - 14 new keys added across all 12 supported languages (`ar, en, fr, de, es, it, tr, pt, ru, ja, zh, hi`).
  - Passed all 4 quality gates: TypeScript, strict 12-locale i18n audit (2629/2629 keys), localization validator, and production Vite build. Zero modifications to `.github/` or `android/`.



## 24. Phase 3: Mood Clarity, Per-Day Media, and Official Calendar-Day Reports
- Diary cards explicitly distinguish manual mood tags (“Mood before writing”) from AI-inferred writing analysis. Daily mood weights use `normalizeMoodDistribution` / `normalizeMoodPercentages` largest-remainder rounding; non-empty distributions total exactly 100%, and empty days do not receive a synthetic mood.
- Daily Pros/Cons media settings are persisted by local `YYYY-MM-DD` in `prosConsMediaPrefByDate`; untouched dates use text-only. By-category/manual permissions select date-scoped diary attachments, with media encoded through the existing Gemini multimodal pipeline.
- `collectDailyContextForDate` is strictly bounded to one device-local calendar date. It includes diary content, dated inline consultation highlights, tasks, touched daily metrics, habits, and gratitude records; it never reads standalone General Advisor conversations. Untouched trackers are described neutrally as not tracked in the app today.
- `dailyReportScheduler.ts` generates only official completed-day reports, binds each to `officialProsConsByDate`, guards in-flight dates, and checks the prior seven calendar dates on startup, reconnect, resume, visibility change, and midnight rollover. A manual report for today before midnight is a temporary preview and cannot be saved as the official report.
- Quality gates: `npx tsc --noEmit`, `node scripts/i18nAudit.cjs`, `node scripts/validate-localization.mjs`, and `npm run build`. No `.github/` or `android/` files are part of this phase.

## 25. Blomeo Topographic Launch Splash
- `src/components/BlomeoSplashScreen.tsx` provides a ~3-second inline-SVG brand animation over a forest-green radial background with drifting topographic contours, awakening head/brain artwork, botanical stroke draw-in, LTR `blomeo` wordmark reveal, and rising mist.
- `App.tsx` gates the overlay to once per browser session using `sessionStorage`, supports tap/keyboard skip, honors `prefers-reduced-motion` with a static 0.8-second fade, and keeps the existing PINLock beneath it until its normal unlock flow completes.
- Animation styling lives in `src/index.css`; no animation package or video asset was added. Standard TypeScript, localization, and production build quality gates apply.

## 26. Blomeo App & Web Branding Assets
- `public/blomeo-icon.png` is the image-based splash mark cropped from the supplied Blomeo logo; the splash now reveals the original raster icon first and letter-animates the centered LTR `blomeo` wordmark while preserving topographic contours, once-per-session behavior, skip, and reduced-motion support.
- Web favicon, Apple touch icon, PWA 192/512 icons, manifest colors, Android density launcher PNGs, adaptive foregrounds, and launcher background resources now use the forest-green Blomeo identity. The HTML root/body background is set inline to prevent a white WebView flash.
- Android resource updates are limited to launcher icon PNGs and `ic_launcher_background.xml`; no Gradle build was run.

## 27. Blomeo Topographic UI, Dual-Mode Side Nav, Scroll-Aware Bottom Nav & Decluttered 9-Card Home
- **Dual-Mode Glassmorphic Side Navigation (`src/components/BlomeoSideNav.tsx`):**
  - Features emerald gradient rail (`linear-gradient(180deg, #1E5F48 0%, #113B2D 55%, #0A221A 100%)`) with curved cutout active pill highlight and hardware back step support via `useRegisterBackStep`.
  - Supports High-Load (full names, username trigger, and live global search across diaries, tasks, habits, gratitude, CBT, and consultations) and Low-Load (compact vertical rail with icons only), toggleable smoothly via bottom `−` / `+` circular button.
  - Quick action entries: Daily Tasks, Calendar, Gratitude Wall, and CBT Exercise.
- **Top Header Bar & Bottom Navigation:**
  - Non-sticky top header displays the exact `/blomeo-icon.png` badge and `blomeo` wordmark which opens the Side Nav in High-Load mode, alongside Smart Reminders Bell and Dark/Light Mode toggle.
  - Floating Plus (`+`) FAB removed completely.
  - Floating Back Button defaults to OFF (`false`), toggleable in Settings.
  - Facebook-style Bottom Nav Bar contains 5 primary icons only (Home, Diary, Advisor, Analytics, Settings) with directional scroll-aware hide/show (12px hysteresis).
- **Home Screen & Blomeo Topographic Light/Dark Theme:**
  - Unified topographic theme CSS tokens in `src/index.css` (soft sage-linen `#F3F7F4` in Light Mode vs deep forest-charcoal `#0B1611` with 3-level matte dark-pine surfaces `#11211A` and muted-mint `#74C69D` borders in Dark Mode).
  - Home screen decluttered to keep ONLY the exact 9 real cards in order (Greeting Hero Banner, Commitment Streak Card, Daily Inspiration Quote Card, Mood Scale Tracker, Water Bottle Tracker, Physical Symptoms Checklist, Box Breathing Exercise, Self-Care Trackers, and Life Map Timeline) preserving zero-default tracker logic.
- **Quality Gates & i18n:**
  - 36 new keys fully localized across all 12 locales (`ar, en, fr, de, es, it, tr, pt, ru, ja, zh, hi`).
  - Passed all 4 quality gates: TypeScript, strict 12-locale i18n audit (2665/2665 keys), localization validator, and production Vite build. Zero modifications to `.github/` or `android/`.

## 28. Blomeo Unified Topographic Color System, Home Mind-Map Architecture & Zero-Default Clean Slate
- **Unified Design Tokens (`src/index.css`):**
  - **Light Mode Palette:** Soft sage/teal/warm sand topographic system (`--blomeo-bg: #EFF4F1` canvas gradient with fixed SVG contour lines, `--blomeo-surface: #FFFFFF` cards with `rgba(45, 106, 79, 0.14)` border, `--blomeo-surface-nested: #F3F8F5`, `--blomeo-hero-gradient: linear-gradient(135deg, #1E4D3B 0%, #15382B 55%, #0F291F 100%)`, accents `#2D6A4F`, `#3A8E7D`, `#EDE6D6`, `#D4A359`, text `#12261D`, secondary `#4A6357`, muted `#718A7D`).
  - **Dark Mode Palette:** Deep Aquatic-Emerald / Forest-Teal luminous system (`--blomeo-bg: linear-gradient(180deg, #071614 0%, #0A1D1A 52%, #071412 100%)` with faint aquatic-teal contour lines, `--blomeo-surface: linear-gradient(160deg, rgba(16, 40, 36, 0.94), rgba(10, 26, 23, 0.98))` with `rgba(72, 184, 159, 0.18)` border, `--blomeo-surface-nested: #14302B`, accents `#48B89F`, `#2D8C76`, `#E9C46A`, text `#EBF5F2`, secondary `#9EC2B8`, muted `#6C9187`).
  - **Zero-Leak Enforcement:** Authoritative CSS rules preventing unstyled white cards or hardcoded light borders from leaking in dark mode.
- **Global Header Bar & Navigation Enhancements:**
  - Header end-side actions: One-Click Reset button (`RotateCcw`), Smart Reminders bell (`Bell`), and global Dark/Light toggle (`Sun`/`Moon`).
  - Reset confirmation modal cleanly wipes all default/demo entries (`yawmiyati_diaries`, `yawmiyati_habits`, `yawmiyati_gratitude_cards`, `yawmiyati_daily_metrics_touched`, `yawmiyati_medications_list`) to guarantee a pristine 0-streak, untouched clean slate.
  - Side Nav rail updated with aquatic-emerald dark theme styling (`#0A2923 -> #061815` with luminous `#48B89F` border).
- **Home Screen Interactive Mind-Map & Show All View:**
  - Top wisdom quote card badge refined to `إلهام ✨` exclusively (removed "الذكاء الاصطناعي").
  - Segmented pill switcher: **الخريطة الذهنية (Mind-Map View)** featuring 4 connected organic capsule nodes (`01` Commitment & Mood, `02` Self-Care & Meds, `03` Daily Life Map, `04` Chronological Timeline) with smooth in-place expansions vs **عرض الكل (Show All View)** displaying stacked cards.
  - Week strip in streak card updated with high-contrast day names and active day indicators.
  - Unlimited interactive animated water cup with rising aquatic-teal wave levels and custom amount addition input (`+ إضافة عدد مخصص`).
  - Upgraded Medication & Vitamins Schedule manager with entry addition (name, dose, time), per-date taken checkboxes, and deletion.
- **Quality Gates & i18n:**
  - 35 new translation keys fully localized across all 12 locales (`ar, en, fr, de, es, it, tr, pt, ru, ja, zh, hi`).
  - Passes all 4 quality gates: `npx tsc --noEmit`, `node scripts/i18nAudit.cjs` (2700/2700 keys, 0 leaks), `node scripts/validate-localization.mjs`, and `npm run build`. Zero modifications to `.github/` or `android/`.

## 29. Blomeo Brand Unification, Pen-Nib Splash Lockup, Discover Tour Overhaul & Global Changelog Updates
- **Complete Brand Unification to Blomeo / بلوميو:**
  - Replaced visible legacy names ("حياة AI", "Hayat AI", "اكتشف حياة AI") across `index.html`, `public/manifest.json`, header/navbar titles, and all 12 locales in `src/lib/languages.ts`.
  - Preserved all `localStorage` and `IndexedDB` storage keys intact (`yawmiyati_*`, `hayat_*`) to guarantee zero data loss for returning users.
- **Pen-Nib `b` Brand Icon Extraction & Baseline-Aligned Splash Animation:**
  - Extracted the ivory fountain-pen nib `b` emblem from master art onto clean transparent background with unclipped golden ink-spark dots, head silhouette, and golden brain into `public/blomeo-icon.png` (512x512) and `public/blomeo-icon-master.png` (1024x1024), regenerating `favicon.ico`, `favicon.png`, `apple-touch-icon.png`, `icon-192.png`, and `icon-512.png`.
  - Refactored `src/components/BlomeoSplashScreen.tsx` for bottom baseline typography alignment (`align-items: flex-end`) in an LTR flex lockup: reveals `b` emblem centered, then reveals only the 5 remaining letters `l o m e o` letter-by-letter in warm ivory serif matching the emblem bowl height (zero duplicate `b`), followed by a subtle golden aura glow and cross-fade out.
- **First-Launch Onboarding Sequence & Discover Blomeo Overhaul:**
  - Strictly sequenced fresh-install flow: (1) Language Selection Screen -> (2) Blomeo Splash Animation -> (3) Interactive "اكتشف بلوميو" Guided Tour with Top Skip ("تخطي"). Returning users bypass steps 1 & 3.
  - Overhauled `src/components/OnboardingTourModal.tsx` into 5 calm slides styled strictly with Blomeo tokens (`--blomeo-bg`, `--blomeo-surface`, `--blomeo-surface-nested`, `--blomeo-hero-gradient`, `--blomeo-accent`) in both Light and Aquatic-Emerald Dark Mode:
    1. أهلاً بك في بلوميو (Topographic workspace, Mind-Map vs Show All, water cup, meds scheduler, reset clean slate).
    2. المستشار المزدوج والذكاء الاصطناعي (Personal Scoped Advisor with custom time range & media control vs General AI Advisor + live two-way voice).
    3. السحابة والمزامنة بالإيميل (Cloud sync via email, cross-device automatic restore).
    4. الاستيراد والتصدير والنسخ الاحتياطي (Local device backup, import/export anytime).
    5. الأمان، البصمة، التذكيرات والإعدادات (PIN/biometrics, lockscreen quick shortcuts, smart reminders).
  - Added "اكتشف بلوميو ✨" quick-access button to `BlomeoSideNav.tsx`.
  - Implemented 1-hour smart discovery nudge banner in `App.tsx` (`blomeo_first_launch_ts`, `blomeo_discover_opened`, `blomeo_discover_nudge_dismissed`).
- **Global In-App Update Notification & Release Changelog:**
  - Overhauled `src/components/AppUpdateBanner.tsx` and `src/lib/appUpdater.ts` to operate globally on both Web and Android above all tabs.
  - Parses real GitHub release changelog bullets into an interactive accordion ("ما الجديد في التحديث"), tracks direct APK download/install on native, provides direct Web release button, and allows session-only dismissal.
- **Quality Gates:**
  - Passed all 4 quality gates cleanly: `npx tsc --noEmit` (0 errors), `node scripts/i18nAudit.cjs` (2795/2795 keys, 0 leaks across all 12 locales), `node scripts/validate-localization.mjs`, and `npm run build` (exit code 0).
  - Strictly respected guardrails: zero changes to `.github/` and `android/`, no temporary scripts left on disk.




## 30. Task-Aware Gemini Routing, Hybrid Voice Dictation & Responsive Workspaces (2026-11-28)
- **Task-aware AI model routing:** Unified `fast-utility`, `audio-multimodal`, and `deep-reflection` tiers discover active Gemini models for the user's API key and apply a healthy fallback on transient/model availability errors while retaining explicit Advisor overrides.
- **Voice reliability:** Hybrid Gemini Audio transcription and locale-aware Web Speech fallback support verbatim Arabic/Egyptian colloquial and English dictation; recording UI, microphone errors, resource cleanup, Live Voice turn-taking, interruption, and timestamped Advisor exchange persistence are covered.
- **Responsive architecture:** Mobile-first layouts adapt across tablets, desktop browsers, and resized Windows windows, with dockable navigation, centered bottom navigation/content grids, desktop Advisor conversation panes, and Blomeo theme tokens for both light and Aquatic-Emerald dark modes.


## Prompt 3 — Blomeo Android branding, biometrics, and lock-screen shortcuts

Android launcher naming now resolves to **بلوميو** for Arabic and **Blomeo** otherwise, while retaining the existing application ID. The pen-nib `b` master artwork supplies legacy and adaptive launcher assets and emerald splash art. Native Android biometrics use `BIOMETRIC_STRONG | BIOMETRIC_WEAK` and expose enrollment status for face/fingerprint guidance. A quiet, persistent four-shortcut lock-screen bar routes quick diary, voice, advisor, and check-in actions through the app, deferring pending actions until app unlock; all new UI strings are localized across the 12 supported languages.


## 31. Adaptive Blomeo Diary Workspace & Multi-Device Obsidian/Samsung Notes Overhaul (2026-11-28)
- **Adaptive Workspace Architecture:** Multi-device diary experience adapting across Mobile (< 768px, Samsung Notes ergonomics) and Tablet/Desktop (>= 768px, Obsidian multi-pane style).
- **Day-Grouped Feed (`BlomeoDayCard.tsx`):** Chronological day-card grouping with normalized 100% daily mood breakdown bar, day star rating, scoped Daily Pros & Cons trigger (`DailyProsConsModal`), and rich entry cards with pre-writing mood pills, AI sentiment badges, and attachment indicators.
- **Multi-Select Pre-Writing Moods:** Added `preMoods?: string[]` to `DiaryEntry` with backwards-compatible fallback chain (`preMoods` -> `moods` -> `mood`), verified via `extractEntryPreMoods()` and `normalizeMoodDistribution()`.
- **Enhanced Voice Vent & SER Processing:** Added universal audio file routing (`initialAudioFile`), Gemini transcription, Speech Emotion Recognition (SER) with manual theme overrides, and AI vent polish via Gemini assistant.
- **Strict 12:00 AM Daily Pros/Cons Scheduler:** Enforced `text-only` quota-saver mode (`AIMediaAccessPermission`) for automated midnight catch-up reports.
- **Responsive Modal Footers:** Anti-squish responsive layouts for `ExportDiaryModal` and `DailyProsConsModal`.
- **Quality Gates:** Passed TypeScript compilation (`tsc --noEmit`), i18n audit (`i18nAudit.cjs`), schema validation (`validate-localization.mjs`), and production build (`npm run build`).

