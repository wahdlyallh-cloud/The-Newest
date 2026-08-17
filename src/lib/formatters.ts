import { AppLanguage } from '../types';
import { getLanguageInfo } from './languages';

export const LOCALE_BCP47_MAP: Record<AppLanguage, string> = {
  ar: 'ar-EG',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  tr: 'tr-TR',
  pt: 'pt-BR',
  ru: 'ru-RU',
  ja: 'ja-JP',
  zh: 'zh-CN',
  hi: 'hi-IN'
};

export function getValidBcp47Locale(lang?: AppLanguage | string | null): string {
  if (!lang) return 'ar-EG';
  if (lang in LOCALE_BCP47_MAP) {
    return LOCALE_BCP47_MAP[lang as AppLanguage];
  }
  const info = getLanguageInfo(lang);
  return info.bcp47 || info.speechLang || 'en-US';
}

function parseDateInput(input: Date | string | number | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Locale-aware date formatter using Intl.DateTimeFormat with safe fallback
 */
export function formatDate(
  dateInput: Date | string | number | null | undefined,
  lang?: AppLanguage | string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInput(dateInput);
  if (!date) return '';

  const locale = getValidBcp47Locale(lang);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch (err) {
    try {
      return date.toLocaleDateString(locale, defaultOptions);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }
}

/**
 * Locale-aware time formatter
 */
export function formatTime(
  dateInput: Date | string | number | null | undefined,
  lang?: AppLanguage | string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInput(dateInput);
  if (!date) return '';

  const locale = getValidBcp47Locale(lang);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch (err) {
    try {
      return date.toLocaleTimeString(locale, defaultOptions);
    } catch {
      return date.toTimeString().slice(0, 5);
    }
  }
}

/**
 * Locale-aware date and time formatter
 */
export function formatDateTime(
  dateInput: Date | string | number | null | undefined,
  lang?: AppLanguage | string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInput(dateInput);
  if (!date) return '';

  const locale = getValidBcp47Locale(lang);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch (err) {
    try {
      return date.toLocaleString(locale, defaultOptions);
    } catch {
      return date.toISOString();
    }
  }
}

/**
 * Locale-aware number formatter
 */
export function formatNumber(
  numInput: number | string | null | undefined,
  lang?: AppLanguage | string | null,
  options?: Intl.NumberFormatOptions
): string {
  if (numInput === null || numInput === undefined || numInput === '') return '0';
  const num = typeof numInput === 'number' ? numInput : parseFloat(numInput);
  if (isNaN(num)) return String(numInput);

  const locale = getValidBcp47Locale(lang);
  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Locale-aware pluralization category resolver (zero, one, two, few, many, other)
 */
export function getPluralCategory(
  count: number,
  lang?: AppLanguage | string | null
): Intl.LDMLPluralRule {
  const locale = getValidBcp47Locale(lang);
  try {
    const pr = new Intl.PluralRules(locale);
    return pr.select(count);
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * Formats duration seconds into readable string (e.g. 02:45)
 */
export function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
