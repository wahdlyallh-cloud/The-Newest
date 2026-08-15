// ============================================================================
//  journalTypes.ts — Unified Journal System Metadata & Configurations
//  Hayat AI (حياة AI) — Comprehensive Types, Icons, Color Schemes & Helpers
// ============================================================================

import { JournalEntryType } from '../types';

export interface JournalTypeConfig {
  type: JournalEntryType;
  icon: string;
  labelAr: string;
  labelEn: string;
  badgeAr: string;
  badgeEn: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  pillBadgeClass: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const JOURNAL_TYPES_CONFIG: Record<JournalEntryType, JournalTypeConfig> = {
  diary: {
    type: 'diary',
    icon: '📔',
    labelAr: 'يوميات',
    labelEn: 'Journal',
    badgeAr: '📔 يومية',
    badgeEn: '📔 Journal',
    colorBg: 'bg-[#EEF1EB]',
    colorBorder: 'border-[#DCE4D8]',
    colorText: 'text-[#556E4F]',
    pillBadgeClass: 'bg-[#EEF1EB] text-[#556E4F] border-[#DCE4D8]',
    descriptionAr: 'تدوين أحداث ومجريات اليوم والتفاصيل الحياتية',
    descriptionEn: 'Daily events, life experiences & memories'
  },
  thought: {
    type: 'thought',
    icon: '💭',
    labelAr: 'خواطر وأفكار',
    labelEn: 'Thoughts',
    badgeAr: '💭 خاطرة',
    badgeEn: '💭 Thought',
    colorBg: 'bg-[#FCF5DE]',
    colorBorder: 'border-[#E9E1C4]',
    colorText: 'text-[#A67E2E]',
    pillBadgeClass: 'bg-[#FCF5DE] text-[#A67E2E] border-[#E9E1C4]',
    descriptionAr: 'تأملات شخصية وفضفضة حرة',
    descriptionEn: 'Reflections, feelings & inner dialogue'
  },
  gratitude: {
    type: 'gratitude',
    icon: '❤️',
    labelAr: 'امتنانات',
    labelEn: 'Gratitude',
    badgeAr: '❤️ امتنان',
    badgeEn: '❤️ Gratitude',
    colorBg: 'bg-[#FDF0F0]',
    colorBorder: 'border-[#FAD2D2]',
    colorText: 'text-[#C53030]',
    pillBadgeClass: 'bg-[#FDF0F0] text-[#C53030] border-[#FAD2D2]',
    descriptionAr: 'شكر النعم وأشخاص ولحظات تصنع البهجة',
    descriptionEn: 'Counting blessings, joyful moments & thankful notes'
  },
  wisdom: {
    type: 'wisdom',
    icon: '💡',
    labelAr: 'حكم قصيرة',
    labelEn: 'Wisdom',
    badgeAr: '💡 حكمة',
    badgeEn: '💡 Wisdom',
    colorBg: 'bg-[#FEF9E7]',
    colorBorder: 'border-[#FCEDB4]',
    colorText: 'text-[#B7791F]',
    pillBadgeClass: 'bg-[#FEF9E7] text-[#B7791F] border-[#FCEDB4]',
    descriptionAr: 'دروس مستفادة وعِبر وتجارب عميقة',
    descriptionEn: 'Life lessons, deep insights & mindful principles'
  },
  quote: {
    type: 'quote',
    icon: '📌',
    labelAr: 'اقتباسات',
    labelEn: 'Quotes',
    badgeAr: '📌 اقتباس',
    badgeEn: '📌 Quote',
    colorBg: 'bg-[#F0F5FF]',
    colorBorder: 'border-[#D0E2FF]',
    colorText: 'text-[#2B6CB0]',
    pillBadgeClass: 'bg-[#F0F5FF] text-[#2B6CB0] border-[#D0E2FF]',
    descriptionAr: 'كلمات ملهمة وجمل مقتبسة من كتب أو شخصيات',
    descriptionEn: 'Inspiring quotes, excerpts & literary phrases'
  },
  idea: {
    type: 'idea',
    icon: '🧠',
    labelAr: 'أفكار سريعة',
    labelEn: 'Quick Ideas',
    badgeAr: '🧠 فكرة',
    badgeEn: '🧠 Idea',
    colorBg: 'bg-[#F5F0FA]',
    colorBorder: 'border-[#E5D7F2]',
    colorText: 'text-[#6B46C1]',
    pillBadgeClass: 'bg-[#F5F0FA] text-[#6B46C1] border-[#E5D7F2]',
    descriptionAr: 'أفكار مشاريع، حلول إبداعية، وملاحظات عابرة',
    descriptionEn: 'Creative sparks, project ideas & flash brainstorming'
  },
  goal: {
    type: 'goal',
    icon: '🎯',
    labelAr: 'أهداف قصيرة',
    labelEn: 'Short Goals',
    badgeAr: '🎯 هدف',
    badgeEn: '🎯 Goal',
    colorBg: 'bg-[#EDFDFD]',
    colorBorder: 'border-[#C4F1F1]',
    colorText: 'text-[#285E61]',
    pillBadgeClass: 'bg-[#EDFDFD] text-[#285E61] border-[#C4F1F1]',
    descriptionAr: 'أهداف محددة وخطوات إنجاز مرجوة',
    descriptionEn: 'Actionable targets, milestones & next steps'
  }
};

export const ALL_JOURNAL_TYPES: JournalEntryType[] = [
  'diary',
  'thought',
  'gratitude',
  'wisdom',
  'quote',
  'idea',
  'goal'
];

export function getJournalTypeConfig(type?: string): JournalTypeConfig {
  const normalized = (type as JournalEntryType) || 'diary';
  return JOURNAL_TYPES_CONFIG[normalized] || JOURNAL_TYPES_CONFIG.diary;
}
