# Runtime Multi-Language Localization QA Report

## Summary

This report documents the results of the automated **Runtime Localization QA Harness** executing across all **12 supported locales**:
`ar`, `en`, `fr`, `de`, `es`, `it`, `tr`, `pt`, `ru`, `ja`, `zh`, `hi`.

Snapshots for each locale have been recorded under `runtime-i18n-snapshots/`.

---

## 1. Locale QA Matrix & Results

| Locale | Language | Total Keys | Sampled Strings | Leaks Detected | Status |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **AR** | Arabic | 1371 | 1371 | None (0) | ✅ PASS |
| **EN** | English | 1371 | 1371 | None (0) | ✅ PASS |
| **FR** | French | 1371 | 1371 | None (0) | ✅ PASS |
| **DE** | German | 1371 | 1371 | None (0) | ✅ PASS |
| **ES** | Spanish | 1371 | 1371 | None (0) | ✅ PASS |
| **IT** | Italian | 1371 | 1371 | None (0) | ✅ PASS |
| **TR** | Turkish | 1371 | 1371 | None (0) | ✅ PASS |
| **PT** | Portuguese | 1371 | 1371 | None (0) | ✅ PASS |
| **RU** | Russian | 1371 | 1371 | None (0) | ✅ PASS |
| **JA** | Japanese | 1371 | 1371 | None (0) | ✅ PASS |
| **ZH** | Chinese | 1371 | 1371 | None (0) | ✅ PASS |
| **HI** | Hindi | 1371 | 1371 | None (0) | ✅ PASS |

---

## 2. Dynamic Language Transition Sequence Test

Tested runtime transition chain:
`AR` $\rightarrow$ `EN` $\rightarrow$ `TR` $\rightarrow$ `DE` $\rightarrow$ `FR` $\rightarrow$ `JA` $\rightarrow$ `ZH` $\rightarrow$ `HI`

- **Proxy Update**: Successful. Each translation proxy re-evaluates strictly against its active locale dictionary.
- **Cross-Language Fallback Chain**: Eliminated. If a key is requested in Turkish (`tr`), it resolves only from Turkish.
- **Direction Switching**: Document `dir` attribute synchronizes to `rtl` for Arabic and `ltr` for all other 11 locales.

---

## 3. Stored System Data Architecture Verification

1. **Habits Seed Data**:
   - `getInitialHabits(lang)` calls `getTranslation(lang)` to generate localized initial habit titles (`habitWater2L`, `habitMeditation10min`, `habitBriskWalk`, `habitRead10Pages`).
2. **Gratitude Cards Seed Data**:
   - `getInitialGratitudeCards(lang)` calls `getTranslation(lang)` to generate localized sample reflections and tags.
3. **Reminders & Athkar**:
   - Default reminders store canonical key identifiers (`reminder_morning_athkar`, `reminder_water`, `reminder_evening_athkar`, `reminder_daily_diary`) and resolve via `getReminderTitle(rem, t)`.
4. **Passkey & PIN Security**:
   - 100% localized through `t` across all 12 languages.
5. **CBT & Psychological Suite**:
   - 100% localized through `t` across all 12 languages.
