# ROOT_CAUSE_REPORT.md — Comprehensive Runtime Localization Audit

This report identifies the exact runtime sources, data models, fallback bypasses, and component-level literals causing mixed-language UI (e.g. Turkish mode displaying Turkish + Arabic + English simultaneously, English mode containing Arabic text, and Arabic mode containing English text).

---

## 1. Executive Root-Cause Summary

| Root Cause ID | Mechanism | Impacted Locales | Runtime Behavior |
| :--- | :--- | :--- | :--- |
| **RC-1: Fallback Chain in `src/lib/languages.ts`** | `resolveKeyInDicts()` fell back to `EN_DICT` $\rightarrow$ `AR_DICT` $\rightarrow$ `formatKeyFallback()` (English Title Case). | All non-EN/non-AR locales (`tr`, `ja`, `de`, `fr`, `es`, `it`, `pt`, `ru`, `zh`, `hi`) | When in Turkish or Japanese, any missing/unmapped key silently rendered as English Title Case or Arabic. |
| **RC-2: Pre-seeded Hardcoded Mock/Default Data** | `INITIAL_DIARIES`, `INITIAL_HABITS`, `DEFAULT_SETTINGS.reminders`, `DEFAULT_SAVED_REPORTS` contained literal Arabic strings stored directly in state and localStorage. | All locales (`en`, `tr`, `ja`, `de`, `fr`, etc.) | When opening the app in English/Turkish/Japanese, the diary cards, habit list, and reminder settings rendered hardcoded Arabic titles, moods, and tags. |
| **RC-3: Hardcoded JSX Text Nodes & Attributes in `App.tsx`** | 809 lines of inline Arabic strings in `src/App.tsx` (modal headers, search placeholders, filter buttons, empty states, toasts). | All non-Arabic locales | Even when language was set to English or Turkish, dozens of dialogs, buttons, and badges remained Arabic because they bypassed `t()`. |
| **RC-4: Sub-Components with Hardcoded Literals** | `DailyProsConsModal.tsx` (181 lines), `FullAthkarModal.tsx` (205 lines), `TasksChecklistSection.tsx` (144 lines), `SmartAdvisor.tsx` (89 lines), `HabitSettingsScreen.tsx` (87 lines), `MonthlyMentalHealthPDFReportModal.tsx` (80 lines), `IntegratedTherapyReport.tsx` (62 lines), `HabitFormModal.tsx` (56 lines), `DhikrCounter.tsx` (47 lines). | All locales | Direct Arabic/English literals rendered inside forms, modals, tables, and reports. |
| **RC-5: Static `t` vs. React Context Reactivity** | Global `t` defaulted to `'ar'` and sub-components not consuming `useLanguage()` retained the initial language proxy across re-renders. | Language switching transitions | Switching from Arabic to English/Turkish left un-rerendered closures in Arabic. |
| **RC-6: AI Service Default Language Fallbacks** | Default parameter `appLanguage = 'ar'` in `src/services/aiService.ts` and missing locale parameters in certain Gemini calls. | All non-Arabic locales | Gemini AI generated Arabic responses when active locale wasn't explicitly provided. |

---

## 2. Detailed Breakdown by File and Component

### A. `src/lib/languages.ts` — Translation Fallback Engine
- **Line/Function**: `resolveKeyInDicts()` & `formatKeyFallback()`
- **Leaked Behavior**:
  - `targetDict[key]` $\rightarrow$ `EN_DICT[key]` $\rightarrow$ `AR_DICT[key]` $\rightarrow$ `formatKeyFallback(key)`
  - If a key was missing in `TR_DICT` or `JA_DICT`, it was replaced with English title case (e.g. `predictiveGuidance` $\rightarrow$ `"Predictive Guidance"`) or Arabic.
- **Architectural Fix**:
  - Remove silent cross-language fallback (`EN_DICT` / `AR_DICT` / `formatKeyFallback`).
  - During validation and development, return `[MISSING:key]` so every key must be defined in all 12 dictionaries with genuine native translations.
  - In production, gracefully resolve key from the active dictionary with a localized generic fallback.

### B. `src/App.tsx` — Data Models & Pre-seeded State
- **Line 74-172**: `INITIAL_DIARIES`
  - *Leaked String*: `title: 'تخطيط للأسبوع الدراسي الجديد وغداء عائلي ومشاعر أمل'`, `moods: ['قلق', 'ممتن', 'سعيد']`, `tags: ['دراسة', 'عائلة', 'أمل']`
  - *Why Validation Missed It*: Dictionary validation only checks `languages.ts`; it did not scan data arrays rendered by JSX as `{diary.title}` and `{m}`.
  - *Architectural Fix*: Convert `INITIAL_DIARIES` to a dynamic function `getInitialDiaries(t)` that resolves titles, contents, moods, and tags from `t`.
- **Line 189-223**: `DEFAULT_SETTINGS.reminders`
  - *Leaked String*: `title: 'منبه كتابة الخواطر واليوميات ✍️'`, `motivationalNote: 'تدوين خواطرك يفرغ طاقة التوتر...'`
  - *Architectural Fix*: Convert `reminders` to dynamic initialization `getDefaultReminders(t)`.
- **Line 226-250**: `INITIAL_HABITS`
  - *Leaked String*: `name: 'شرب 2 لتر ماء دافئ'`, `name: 'تأمل واسترخاء العضلات (10 د)'`
  - *Architectural Fix*: Convert `INITIAL_HABITS` to `getInitialHabits(t)`.
- **Line 10340-10368**: Diary Detail View
  - *Leaked String*: `'العمق والأهمية الذاتية:'`, `'الحالة المزاجية المسجلة:'`, `'لم يتم تحديد مزاج'`, `'مذكرة يومية بدون عنوان'`
  - *Architectural Fix*: Replace all inline Arabic nodes with `t.diaryImportanceLabel`, `t.diaryMoodsRecordedLabel`, `t.noMoodSelected`, `t.untitledDiaryDefault`.

### C. `src/components/DailyProsConsModal.tsx` (181 Hardcoded Lines)
- **Line 50-250**: Hardcoded category labels, suggestions, decision balances, export formats (`'إيجابيات'`, `'سلبيات'`, `'القرار النهائي'`, `'تحميل التقرير'`).
- *Architectural Fix*: Replace with canonical `t.prosCons*` keys and locale-aware export formatters.

### D. `src/components/TasksChecklistSection.tsx` (144 Hardcoded Lines)
- **Line 120-400**: Medication times (`'10:00 ص'`), sport types (`'مشي'`, `'جري'`, `'سباحة'`), calorie estimators, and habit group headers.
- *Architectural Fix*: Map all sport types and medication times dynamically through `t` and `toLocaleDateString`.

### E. `src/components/CBTExercisesSection.tsx` (159 Hardcoded Lines)
- **Line 300-1400**: Exercise steps, downward arrow questions, worry deposit alerts, grounding step descriptions.
- *Architectural Fix*: Map all CBT step strings and distortion categories to `t.cbt*` keys.

### F. `src/components/SmartAdvisor.tsx` (89 Hardcoded Lines)
- **Line 45-60**: Context permissions, voice listening status prompts, and modal descriptions.
- *Architectural Fix*: Use dynamic `t.smartContext*` and `t.voice*` keys.

### G. `src/components/HabitSettingsScreen.tsx` & `HabitFormModal.tsx` (143 Hardcoded Lines)
- **Headers, placeholders, and action buttons**: `'إضافة عادة جديدة'`, `'تصدير نسخة احتياطية (JSON)'`, `'إعادة ضبط العادات'`.
- *Architectural Fix*: Replace with `t.habitSettings*` and `t.habitForm*` keys.

### H. `src/services/aiService.ts` & `src/lib/gemini.ts`
- **Parameter defaults**: `appLanguage = 'ar'` in service functions.
- **Architectural Fix**: Guarantee `activeLanguage` is passed explicitly from the active React context (`useLanguage().currentLanguage`) to all 12 AI features.

---

## 3. Systematic Implementation Strategy

1. **Refactor `src/lib/languages.ts`**:
   - Eliminate all cross-language fallbacks (no English/Arabic leakage when missing).
   - Ensure all 12 dictionaries provide complete, native translations for all 1,050+ master keys.
2. **Refactor Data Models in `src/App.tsx`**:
   - Make `INITIAL_DIARIES`, `INITIAL_HABITS`, and `DEFAULT_SETTINGS.reminders` locale-driven via `getInitialDiaries(t)`, `getInitialHabits(t)`, `getDefaultReminders(t)`.
   - Add dynamic mood translator `getMoodLabel(mood, t)` and tag translator `getTagLabel(tag, t)`.
3. **Comprehensive UI Sweep**:
   - Localize all remaining hardcoded strings in `App.tsx`, `DailyProsConsModal.tsx`, `TasksChecklistSection.tsx`, `CBTExercisesSection.tsx`, `SmartAdvisor.tsx`, `HabitSettingsScreen.tsx`, `HabitFormModal.tsx`, `IntegratedTherapyReport.tsx`, `MonthlyMentalHealthPDFReportModal.tsx`, `DhikrCounter.tsx`, `FullAthkarModal.tsx`, `LockScreenAthkarOverlay.tsx`.
4. **Automate Runtime Localization Verification**:
   - Upgrade `scripts/validate-localization.mjs` to scan both dictionary completeness AND source files for any unlocalized user-facing strings or binary ternaries.
5. **Quality Gates & Production Deployment**:
   - Execute `npm run validate:i18n`, `npx tsc --noEmit`, `npm run build`, `git diff --check`, followed by single commit, push, and production verification.
