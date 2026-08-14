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

export const APP_FONTS: FontOption[] = [
  {
    id: 'cairo',
    nameAr: 'Cairo Modern',
    nameEn: 'Cairo Modern',
    categoryAr: 'Modern & Balanced',
    categoryEn: 'Modern & Balanced',
    fontFamilyCss: '"Cairo", sans-serif',
    sampleTextAr: 'Journaling brings clarity and peace to your mind.',
    sampleTextEn: 'Journaling brings clarity and peace to your mind.',
    badge: '✨',
  },
  {
    id: 'tajawal',
    nameAr: 'Tajawal Soft',
    nameEn: 'Tajawal Soft',
    categoryAr: 'Modern & Soft Geometric',
    categoryEn: 'Modern & Soft Geometric',
    fontFamilyCss: '"Tajawal", sans-serif',
    sampleTextAr: 'Reflect on your daily thoughts and feelings comfortably.',
    sampleTextEn: 'Reflect on your daily thoughts and feelings comfortably.',
  },
  {
    id: 'almarai',
    nameAr: 'Almarai Clean',
    nameEn: 'Almarai Clean',
    categoryAr: 'Ultra Clean Sans',
    categoryEn: 'Ultra Clean Sans',
    fontFamilyCss: '"Almarai", sans-serif',
    sampleTextAr: 'Clear thoughts begin with mindful writing.',
    sampleTextEn: 'Clear thoughts begin with mindful writing.',
  },
  {
    id: 'amiri',
    nameAr: 'Amiri Classic Naskh',
    nameEn: 'Amiri Classic Naskh',
    categoryAr: 'Classic Literary Naskh',
    categoryEn: 'Classic Literary Naskh',
    fontFamilyCss: '"Amiri", serif',
    sampleTextAr: 'Every story written holds wisdom for tomorrow.',
    sampleTextEn: 'Every story written holds wisdom for tomorrow.',
    badge: '📚',
  },
  {
    id: 'noto_naskh',
    nameAr: 'خط نوتو نسخ التقليدي',
    nameEn: 'Noto Naskh Traditional',
    categoryAr: 'نسخ تقليدي واضح',
    categoryEn: 'Traditional Clear Naskh',
    fontFamilyCss: '"Noto Naskh Arabic", serif',
    sampleTextAr: 'يوميات أنيقة تحفظ أثمن ذكرياتك.',
    sampleTextEn: 'An elegant diary preserving your memories.',
  },
  {
    id: 'jakarta',
    nameAr: 'خط بلس جاكارتا الحديث',
    nameEn: 'Plus Jakarta Sans',
    categoryAr: 'حديث وللإنكليزية',
    categoryEn: 'Modern Sans-Serif',
    fontFamilyCss: '"Plus Jakarta Sans", "Cairo", sans-serif',
    sampleTextAr: 'خط حديث ومريح لمتابعة العادات والتدوين.',
    sampleTextEn: 'Modern typography for daily habit tracking & mindfulness.',
    badge: 'Modern 🌐',
  },
  {
    id: 'system',
    nameAr: 'خط النظام الأفتراضي',
    nameEn: 'System Default Font',
    categoryAr: 'خط الجهاز الخفيف',
    categoryEn: 'Native System Typography',
    fontFamilyCss: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sampleTextAr: 'خط النظام الخاص بجهازك بشكل تلقائي.',
    sampleTextEn: 'Your device native typography font.',
  },
];

export const LINE_HEIGHT_OPTIONS: LineHeightOption[] = [
  {
    id: 'compact',
    val: 1.45,
    nameAr: 'Compact (1.45x)',
    nameEn: 'Compact (1.45x)',
    descAr: 'Compact view for dense lists and quick stats',
    descEn: 'Compact view for dense lists and quick stats',
  },
  {
    id: 'normal',
    val: 1.65,
    nameAr: 'Standard (1.65x)',
    nameEn: 'Standard (1.65x)',
    descAr: 'Standard spacing for general navigation',
    descEn: 'Standard spacing for general navigation',
  },
  {
    id: 'relaxed',
    val: 1.85,
    nameAr: 'Relaxed (1.85x)',
    nameEn: 'Relaxed (1.85x) - Recommended',
    descAr: 'Optimal comfort for reading long diary entries',
    descEn: 'Optimal comfort for reading long diary entries',
  },
  {
    id: 'spacious',
    val: 2.15,
    nameAr: 'Spacious (2.15x)',
    nameEn: 'Spacious (2.15x)',
    descAr: 'Maximum line spacing for immersive reading sessions',
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
