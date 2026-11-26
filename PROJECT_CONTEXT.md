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
- **`src/components/VoiceVentModal.tsx`**: Quick Voice Venting ("فضفضة صوتية سريعة") with safe MediaRecorder MIME detection, resilient audio recording, optional live speech recognition, and automatic Gemini transcription on stop.
- **`src/components/OnboardingTourModal.tsx`**: Vibrant fast-paced interactive "اكتشف حياة AI" tour featuring 7 dedicated slides with animated gradients, gesture touch swiping, feature chips, and direct action triggers covering offline privacy, live voice venting, token saver mode, Phone ↔ Laptop email sync, long PNG/PDF export & WriteDiary import, and interactive floating reminders.
- **`src/components/GratitudeImportModal.tsx`**: Selective Gratitude Wall Import modal supporting "اليوم" / "كل الأيام" filters, multi-select, and seamless appending to diary entries.
- **`src/lib/languages.ts`**: 12-language localization dictionary (`ar`, `en`, `fr`, `de`, `es`, `it`, `tr`, `pt`, `ru`, `ja`, `zh`, `hi`).

---

## 2. Gemini Routing Rules

- **Standard Model**: `gemini-2.5-flash-lite` / `gemini-3.5-flash-lite` is prioritized across all conversational, analysis, and multimodal transcription flows for minimal latency and cost efficiency.
- **Fallback Chain**:
  1. Primary API key / custom key with `gemini-2.5-flash-lite` / `gemini-3.5-flash-lite`.
  2. Fallback models (`gemini-2.5-flash`, `gemini-1.5-flash`) on quota exhaustion (429 / RESOURCE_EXHAUSTED).
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

## 11. Native Android File Export Plugin (`FileExportPlugin.java`) & Bulletproof Diary Exporter

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

- **Root Cause & Fix:** Resolved `Minified React error #310` ("Rendered more hooks than during the previous render") by ensuring all React hooks, initializations, and event callbacks in initial launch components (`OnboardingTourModal.tsx`, `InAppReminderOverlay.tsx`, `App.tsx`, `StaticNotification.tsx`) are declared unconditionally at the top of each component body prior to any conditional branching or early `return` guards.





