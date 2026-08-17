# RUNTIME_LOCALIZATION_FAILURE_REPORT.md

## 1. Concrete Remaining Failure Findings

Our forensic audit across all 65 source files in `src/` revealed the exact mechanical sources of why Turkish, Arabic, English, and other locales still contain foreign-language text:

| ID | Issue Category | Frequency | Concrete Evidence & Root Cause |
| :--- | :--- | :--- | :--- |
| **FAIL-1** | **Literal Fallback Bypasses (`\|\| '...'`)** | **317 instances** across 34 files | Code like `{t.someKey \|\| 'English Text'}` or `{t.someKey \|\| 'نص عربي'}`. In Turkish (`tr`) or Japanese (`ja`), whenever `t.someKey` is unmapped or empty, it immediately evaluates the literal fallback and displays English or Arabic. |
| **FAIL-2** | **Direct Hardcoded Arabic JSX & Attributes** | **2,727 lines** across 44 files | Components contain direct Arabic strings in buttons, headings, modals, table headers, toasts, and alerts instead of resolving through `t`. E.g., `App.tsx` (836 lines), `FullAthkarModal.tsx` (205 lines), `DailyProsConsModal.tsx` (181 lines), `CBTExercisesSection.tsx` (159 lines), `TasksChecklistSection.tsx` (144 lines), `SmartAdvisor.tsx` (89 lines), `HabitSettingsScreen.tsx` (87 lines). |
| **FAIL-3** | **Pre-seeded Hardcoded Content Stored in State/LocalStorage** | Data constants in `App.tsx` & models | `INITIAL_DIARIES`, `INITIAL_HABITS`, and `DEFAULT_SETTINGS.reminders` store raw Arabic text strings (`'شرب 2 لتر ماء'`, `'قلق'`, `'تأمل'`, etc.). When rendered via `{habit.name}` or `{diary.title}`, the UI displays Arabic regardless of whether Turkish or English is chosen. |
| **FAIL-4** | **Backend/Interceptor & Knowledge Services** | 393 lines (`fetchInterceptor.ts`, `unifiedAIKnowledgeService.ts`, `aiAthkarSync.ts`) | Mock network interceptors and AI services generate mock Arabic/English responses hardcoded in TypeScript. |
| **FAIL-5** | **Text Overlap & Directional Clashing (RTL/LTR)** | Flex containers without `min-w-0` or `flex-wrap` | Fixed widths and hardcoded margins in Arabic/English badges cause horizontal overflow on mobile screens in languages with longer words (e.g. German, Russian, Turkish). |

---

## 2. File-by-File Breakdown of Leaks

### 1. `src/App.tsx` (836 Hardcoded Arabic Lines, 80 Literal Fallbacks)
- **Lines 74–172**: `INITIAL_DIARIES` with Arabic title, content, task names, and medication names.
- **Lines 189–224**: `DEFAULT_SETTINGS.reminders` with Arabic reminder titles and motivational notes.
- **Lines 226–250**: `INITIAL_HABITS` with Arabic habit names and categories.
- **Lines 2500–12190**: Timeline filters, search labels, mood selectors, drawer action buttons, dialogs.

### 2. `src/components/FullAthkarModal.tsx` (205 Hardcoded Arabic Lines)
- Athkar categories, card titles, and count badges hardcoded in Arabic.

### 3. `src/components/DailyProsConsModal.tsx` (181 Hardcoded Arabic Lines, 5 Fallbacks)
- Analysis sections, decision balance cards, and export dialogs with hardcoded Arabic text.

### 4. `src/components/CBTExercisesSection.tsx` (159 Hardcoded Arabic Lines, 4 Fallbacks)
- Distortion descriptions, 5-4-3-2-1 sensory grounding cards, worry container labels.

### 5. `src/components/TasksChecklistSection.tsx` (144 Hardcoded Arabic Lines, 7 Fallbacks)
- Water tracker units, sports inputs, calorie estimators, medication frequencies.

### 6. `src/components/SmartAdvisor.tsx` (89 Hardcoded Arabic Lines, 13 Fallbacks)
- Context knowledge sources, chip prompts, voice recording state messages.

### 7. `src/components/HabitSettingsScreen.tsx` & `HabitFormModal.tsx` (143 Hardcoded Arabic Lines, 14 Fallbacks)
- Habit form inputs, periodicities, backup modal headers.

### 8. `src/components/MonthlyMentalHealthPDFReportModal.tsx` & `IntegratedTherapyReport.tsx` (142 Hardcoded Arabic Lines, 29 Fallbacks)
- Clinical diagnostic metrics, symptom tables, PDF preview headers.

---

## 3. Correct Architectural Fixes

1. **Eliminate All 317 Literal Fallbacks (`\|\| '...'`)**:
   - Replace `{t.key \|\| 'Fallback'}` with `{t.key}` or `{t('key')}`.
   - Ensure the master translation dictionaries contain 100% of all required keys across all 12 supported locales.
2. **Eliminate All 2,727 Hardcoded Arabic Literals**:
   - Convert every user-visible string in `App.tsx` and all 44 component/service files to canonical `t` keys.
3. **Data Model Migration & Dynamic Resolvers**:
   - Store canonical IDs for predefined habits, moods, tags, reminders, and report types.
   - Dynamically translate stored entries at render time via `getMoodLabel(mood, t)`, `getTagLabel(tag, t)`, and `getHabitName(habit, t)`.
4. **Layout & Directional Hardening**:
   - Add `min-w-0`, `flex-wrap`, `break-words`, and `<bdi>` tags to all badges, cards, and data metrics to eliminate text clipping on mobile viewports across all 12 locales.
