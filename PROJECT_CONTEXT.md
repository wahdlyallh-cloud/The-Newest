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
