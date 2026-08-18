# Runtime Multi-Language True Root-Cause Forensic Report

## Executive Summary

A deep forensic analysis of the rendered application in a clean mobile Incognito environment revealed why real users encountered mixed languages (Arabic + English + Turkish / German / French) despite dictionary validation scripts passing.

The root cause was twofold:
1. **QA Harness Blind Spot**: The previous browser automation test captured only the top-level **Lock/Splash Screen** (341 characters) and did not unlock or navigate into the core application tabs, modals, and drawers.
2. **Component-Level Unlocalized Strings & Binary `isRtl` Fallbacks**:
   - [`src/components/TasksChecklistSection.tsx`](file:///c:/Users/JMN-UK/OneDrive/Desktop/The-Newest-App/The-Newest-main/src/components/TasksChecklistSection.tsx): **144 hardcoded Arabic strings** (medications, sport types, periodicity filters, checklist headers).
   - [`src/components/SleepMoodCorrelationChart.tsx`](file:///c:/Users/JMN-UK/OneDrive/Desktop/The-Newest-App/The-Newest-main/src/components/SleepMoodCorrelationChart.tsx): **30 hardcoded Arabic strings** (sleep-mood correlation title, time filters, tooltips, axis labels).
   - [`src/components/PsychologicalGrowthTree.tsx`](file:///c:/Users/JMN-UK/OneDrive/Desktop/The-Newest-App/The-Newest-main/src/components/PsychologicalGrowthTree.tsx): **18 binary `isRtl ? 'Arabic' : 'English'` ternaries**, rendering English whenever Turkish, German, French, or Japanese was active.
   - [`src/components/ShareableGratitudeCardModal.tsx`](file:///c:/Users/JMN-UK/OneDrive/Desktop/The-Newest-App/The-Newest-main/src/components/ShareableGratitudeCardModal.tsx): **20 binary `isRtl ? 'Arabic' : 'English'` ternaries**, rendering English for card themes, signatures, and placeholders.
   - [`src/App.tsx`](file:///c:/Users/JMN-UK/OneDrive/Desktop/The-Newest-App/The-Newest-main/src/App.tsx): **Floating Habit & Gratitude Reminder Banners** rendered hardcoded Arabic headers and action buttons.

---

## Forensic Trace of Detected Runtime Leaks

| Leaked Visible Text | Active Locale | Screen / Section | Source Component & Line | Root Cause |
| :--- | :---: | :---: | :---: | :---: |
| `"تنبيه العادات السلوكية اليومي"` | `tr` / `de` / `en` | Floating Habit Banner | `src/App.tsx:4809` | Hardcoded Arabic JSX literal |
| `"افتح مفكرة الامتنان الآن 🌸"` | `tr` / `de` / `en` | Floating Gratitude Banner | `src/App.tsx:4858` | Hardcoded Arabic JSX literal |
| `"الربط البياني: ساعات النوم وجودة المزاج"` | `tr` / `de` / `fr` | Analytics / Sleep Mood Chart | `SleepMoodCorrelationChart.tsx:196` | Hardcoded Arabic JSX literal |
| `"30 يوماً (الشهر)"`, `"14 يوماً"` | `tr` / `de` / `ja` | Analytics / Time Filter | `SleepMoodCorrelationChart.tsx:207` | Hardcoded Arabic JSX literal |
| `"Seedling (Lvl 1)"`, `"Sprout (Lvl 2)"` | `tr` / `de` / `fr` | Growth Tree Widget | `PsychologicalGrowthTree.tsx:477` | Binary ternary `isRtl ? 'Ar' : 'En'` evaluates to English in non-Arabic |
| `"Card Text or Quote:"`, `"Author:"` | `tr` / `de` / `ja` | Gratitude Card Share Modal | `ShareableGratitudeCardModal.tsx:505` | Binary ternary `isRtl ? 'Ar' : 'En'` evaluates to English in non-Arabic |
| `"مكمل فيتامين D اليومي"` | `tr` / `de` / `fr` | Tasks / Medications | `TasksChecklistSection.tsx:334` | Hardcoded Arabic default task item |
| `"نطاق ظهور وتتبع العادات والتاسكات"` | `tr` / `de` / `ru` | Tasks / Periodicity Filter | `TasksChecklistSection.tsx:535` | Hardcoded Arabic JSX literal |

---

## Architectural Remediation Plan

1. **Unify all component strings under dynamic `t`**:
   - Replace all binary `isRtl ? ... : ...` ternaries and hardcoded Arabic strings in `TasksChecklistSection.tsx`, `SleepMoodCorrelationChart.tsx`, `PsychologicalGrowthTree.tsx`, `ShareableGratitudeCardModal.tsx`, and `src/App.tsx` with dynamic properties on `t`.
2. **Synchronize all 12 Locale Dictionaries**:
   - Add all new keys to `src/lib/languages.ts` across `ar`, `en`, `fr`, `de`, `es`, `it`, `tr`, `pt`, `ru`, `ja`, `zh`, `hi`.
3. **Upgrade Real Browser QA Harness**:
   - Ensure `scripts/real-browser-localization-qa.mjs` unlocks the app, navigates through Home, Diaries, Tasks, CBT, Habits, Analytics, Settings, and Modals, and verifies that the rendered DOM contains 0 foreign characters for every locale.
