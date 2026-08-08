import { getTranslation } from './languages';

export type AppFontFamily = 'cairo' | 'tajawal' | 'almarai' | 'amiri' | 'noto_naskh' | 'jakarta' | 'system';
export type AppLineHeight = 'compact' | 'normal' | 'relaxed' | 'spacious';

export interface FontOption {
  id: AppFontFamily;
  nameAr: string;
  nameEn: string;
  categoryAr: string;
  categoryEn: string;
  fontFamilyCss: string;
  sampleTextAr: string;
  sampleTextEn: string;
  badge?: string;
}

export interface LineHeightOption {
  id: AppLineHeight;
  val: number;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
}

const ar = getTranslation('ar');

export const APP_FONTS: FontOption[] = [
  {
    id: 'cairo',
    nameAr: ar.fontCairoName || 'Cairo Modern',
    nameEn: 'Cairo Modern',
    categoryAr: ar.fontCairoCategory || 'Modern & Balanced',
    categoryEn: 'Modern & Balanced',
    fontFamilyCss: '"Cairo", sans-serif',
    sampleTextAr: ar.fontCairoSample || 'Journaling brings clarity and peace to your mind.',
    sampleTextEn: 'Journaling brings clarity and peace to your mind.',
    badge: '✨',
  },
  {
    id: 'tajawal',
    nameAr: ar.fontTajawalName || 'Tajawal Soft',
    nameEn: 'Tajawal Soft',
    categoryAr: ar.fontTajawalCategory || 'Modern & Soft Geometric',
    categoryEn: 'Modern & Soft Geometric',
    fontFamilyCss: '"Tajawal", sans-serif',
    sampleTextAr: ar.fontTajawalSample || 'Reflect on your daily thoughts and feelings comfortably.',
    sampleTextEn: 'Reflect on your daily thoughts and feelings comfortably.',
  },
  {
    id: 'almarai',
    nameAr: ar.fontAlmaraiName || 'Almarai Clean',
    nameEn: 'Almarai Clean',
    categoryAr: ar.fontAlmaraiCategory || 'Ultra Clean Sans',
    categoryEn: 'Ultra Clean Sans',
    fontFamilyCss: '"Almarai", sans-serif',
    sampleTextAr: ar.fontAlmaraiSample || 'Clear thoughts begin with mindful writing.',
    sampleTextEn: 'Clear thoughts begin with mindful writing.',
  },
  {
    id: 'amiri',
    nameAr: ar.fontAmiriName || 'Amiri Classic Naskh',
    nameEn: 'Amiri Classic Naskh',
    categoryAr: ar.fontAmiriCategory || 'Classic Literary Naskh',
    categoryEn: 'Classic Literary Naskh',
    fontFamilyCss: '"Amiri", serif',
    sampleTextAr: ar.fontAmiriSample || 'Every story written holds wisdom for tomorrow.',
    sampleTextEn: 'Every story written holds wisdom for tomorrow.',
    badge: '📚',
  },
  {
    id: 'noto_naskh',
    nameAr: ar.fontNotoName || 'Noto Naskh Traditional',
    nameEn: 'Noto Naskh Traditional',
    categoryAr: ar.fontNotoCategory || 'Traditional Clear Naskh',
    categoryEn: 'Traditional Clear Naskh',
    fontFamilyCss: '"Noto Naskh Arabic", serif',
    sampleTextAr: ar.fontNotoSample || 'An elegant diary preserving your memories.',
    sampleTextEn: 'An elegant diary preserving your memories.',
  },
  {
    id: 'jakarta',
    nameAr: 'Plus Jakarta Sans',
    nameEn: 'Plus Jakarta Sans',
    categoryAr: 'Modern International Sans',
    categoryEn: 'Modern International Sans',
    fontFamilyCss: '"Plus Jakarta Sans", "Cairo", sans-serif',
    sampleTextAr: 'Modern typography for daily habit tracking & mindfulness.',
    sampleTextEn: 'Modern typography for daily habit tracking & mindfulness.',
    badge: 'Modern 🌐',
  },
  {
    id: 'system',
    nameAr: 'System Default Font',
    nameEn: 'System Default Font',
    categoryAr: 'Native System Typography',
    categoryEn: 'Native System Typography',
    fontFamilyCss: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sampleTextAr: 'Your device native typography font.',
    sampleTextEn: 'Your device native typography font.',
  },
];

export const LINE_HEIGHT_OPTIONS: LineHeightOption[] = [
  {
    id: 'compact',
    val: 1.45,
    nameAr: ar.lineHeightCompactName || 'Compact (1.45x)',
    nameEn: 'Compact (1.45x)',
    descAr: ar.lineHeightCompactDesc || 'Compact view for dense lists and quick stats',
    descEn: 'Compact view for dense lists and quick stats',
  },
  {
    id: 'normal',
    val: 1.65,
    nameAr: ar.lineHeightNormalName || 'Standard (1.65x)',
    nameEn: 'Standard (1.65x)',
    descAr: ar.lineHeightNormalDesc || 'Standard spacing for general navigation',
    descEn: 'Standard spacing for general navigation',
  },
  {
    id: 'relaxed',
    val: 1.85,
    nameAr: ar.lineHeightRelaxedName || 'Relaxed (1.85x)',
    nameEn: 'Relaxed (1.85x) - Recommended',
    descAr: ar.lineHeightRelaxedDesc || 'Optimal comfort for reading long diary entries',
    descEn: 'Optimal comfort for reading long diary entries',
  },
  {
    id: 'spacious',
    val: 2.15,
    nameAr: ar.lineHeightSpaciousName || 'Spacious (2.15x)',
    nameEn: 'Spacious (2.15x)',
    descAr: ar.lineHeightSpaciousDesc || 'Maximum line spacing for immersive reading sessions',
    descEn: 'Maximum line spacing for immersive reading sessions',
  },
];

export function getFontCss(font?: AppFontFamily): string {
  const match = APP_FONTS.find(f => f.id === font);
  return match ? match.fontFamilyCss : '"Cairo", sans-serif';
}

export function getLineHeightCss(lineHeight?: AppLineHeight): number {
  const match = LINE_HEIGHT_OPTIONS.find(l => l.id === lineHeight);
  return match ? match.val : 1.85;
}
