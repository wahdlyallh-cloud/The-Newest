# 🔍 RUNTIME LANGUAGE TRUE ROOT-CAUSE FORENSIC REPORT

**Date & Time**: 2026-08-18  
**Audit Scope**: Live Production Site (`https://the-newest.vercel.app`), Source Codebase, LocalStorage Persistence, React Component Hierarchy, Modals, Drawers, and Lifecycle Interactions across all 12 locales: `ar`, `en`, `fr`, `de`, `es`, `it`, `tr`, `pt`, `ru`, `ja`, `zh`, `hi`.

---

## 1. Executive Summary & Why Previous QA Reported False Passes

Previous QA suites (and static linters) suffered from a fundamental blindspot:
1. **Single Static Screen Inspection**: The automated browser tests only evaluated the initial rendered viewport of the Dashboard / Lock screen after unlocking.
2. **Untriggered Interactive States**: Modals, sub-tabs, dropdown menus, drawers, and secondary views were never opened during the test run.
3. **Huge Volume of Unlocalized Sub-components**:
   - `src/App.tsx` contains **744 lines** of hardcoded Arabic literals in secondary tabs (Diary editor, Library/Books section, Settings sections, Athkar Drawer, Export, Analytics).
   - Component files contain **over 900 lines** of hardcoded Arabic literals:
     - `DailyProsConsModal.tsx` (163 Arabic lines)
     - `TasksChecklistSection.tsx` (133 Arabic lines)
     - `HabitSettingsScreen.tsx` (86 Arabic lines)
     - `MonthlyMentalHealthPDFReportModal.tsx` (80 Arabic lines)
     - `IntegratedTherapyReport.tsx` (62 Arabic lines)
     - `HabitFormModal.tsx` (54 Arabic lines)
     - `FullAthkarModal.tsx` (205 Arabic lines)
     - `DhikrCounter.tsx` (46 Arabic lines)
     - `SmartAdvisor.tsx` (39 Arabic lines)
     - `CBTExercisesSection.tsx` (26 Arabic lines)
     - `GeminiKeyModal.tsx` (27 Arabic lines)
     - `GratitudeJournal.tsx` (17 Arabic lines)
     - `BehavioralCorrelationCard.tsx` (15 Arabic lines)
     - `OnboardingTourModal.tsx` (18 Arabic lines)
     - `AIVoiceJournalModal.tsx` (7 Arabic lines)
     - `DrawingCanvas.tsx` (6 Arabic lines)
     - `ContactOwnerModal.tsx` (5 Arabic lines)
     - `ProsConsHistoryLog.tsx` (5 Arabic lines)
     - `PsychologicalGrowthTree.tsx` (4 Arabic lines)
     - `PasskeyAuth.tsx` (9 Arabic lines)
     - `PredictiveHealthInsightsModal.tsx` (6 Arabic lines)

When a real user switched to Turkish, English, German, etc. and clicked on any tab or modal, the hardcoded Arabic strings from these components rendered directly onto the DOM, creating the mixed-language UI.

---

## 2. Categorization of Root Causes

### A. Component-Level Hardcoded Arabic JSX
Components created or expanded during recent feature iterations (e.g. `DailyProsConsModal`, `HabitSettingsScreen`, `IntegratedTherapyReport`, `HabitFormModal`, `TasksChecklistSection`) used raw Arabic string literals in JSX without pulling from `t[key]`.

### B. App.tsx Secondary Views and Modals
Sections inside `App.tsx` such as the Diary editor (formatting toolbar, sentiment tags, photo/audio attachments, drawing integration), the Comprehensive Library (book cards, category tags, reader modals), and Settings panels contained raw Arabic strings.

### C. Seed / Initial State Content
`INITIAL_HABITS`, `INITIAL_DIARIES`, `DEFAULT_SETTINGS`, and demo prompts held Arabic strings in state variables that persisted into `localStorage` upon initialization. When displaying these items, the UI must resolve display names dynamically via locale resolvers (`getHabitDisplayName`, `getCategoryLabel`, etc.) rather than printing the stored initial Arabic label.

### D. Missing `appLanguage` Prop Propagation
Certain components (such as `<DailyProsConsModal>` or `<LifeMap>` previously) were invoked without explicitly passing `appLanguage`, causing them to fallback to `ar` defaults.

---

## 3. Systematic Remediation Plan

1. **Interactive Multi-Screen Browser QA Harness**:
   - Upgrade `scripts/real-browser-localization-qa.mjs` into a comprehensive lifecycle test that unlocks the app, switches tabs (Dashboard, Diaries, Tasks, Habits, Smart Advisor, Analytics, Settings, Calendar/Library), triggers every modal (`HabitFormModal`, `DailyProsConsModal`, `TherapistModal`, `ExportModal`, `GeminiKeyModal`, `AthkarModal`, `LockScreenWidgetModal`), tests both Fresh and Existing User states, and validates DOM text across all 12 languages.

2. **Full Component Extraction & Localization**:
   - Localize all 21 components with hardcoded Arabic lines.
   - Replace all 744 Arabic lines in `src/App.tsx` with dynamic `t` translations.

3. **12-Language Dictionary Expansion**:
   - Add all corresponding translation keys across all 12 languages (`ar`, `en`, `fr`, `de`, `es`, `it`, `tr`, `pt`, `ru`, `ja`, `zh`, `hi`) in `src/lib/languages.ts`.

4. **Zero Fallback & Schema Integrity**:
   - Ensure `npm run validate:i18n` passes with 100% parity across all 12 dictionaries.
   - Verify `vite build` builds with 0 errors.
   - Run interactive browser QA across all 12 locales and confirm 0 leaks.
