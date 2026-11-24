// ============================================================================
//  journalTypes.ts — Unified Journal System Metadata & Configurations
//  Hayat AI (حياة AI) — Comprehensive Types, Icons, Color Schemes & Helpers
// ============================================================================

import { JournalEntryType } from '../types';
import { getTranslation } from './languages';

export interface JournalTypeConfig {
  type: JournalEntryType;
  icon: string;
  key: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  pillBadgeClass: string;
}

export const ALL_JOURNAL_TYPES: JournalEntryType[] = [
  'diary',
  'thought',
  'gratitude',
  'wisdom',
  'quote',
  'idea',
  'goal',
  'free_writing',
  'memory'
];

export const JOURNAL_TYPES_CONFIG: Record<JournalEntryType, JournalTypeConfig> = {
  diary: {
    type: 'diary',
    icon: '📔',
    key: 'journal_type_diary',
    colorBg: 'bg-[#EEF1EB]',
    colorBorder: 'border-[#DCE4D8]',
    colorText: 'text-[#556E4F]',
    pillBadgeClass: 'bg-[#EEF1EB] text-[#556E4F] border-[#DCE4D8]',
  },
  thought: {
    type: 'thought',
    icon: '💭',
    key: 'journal_type_thought',
    colorBg: 'bg-[#FCF5DE]',
    colorBorder: 'border-[#E9E1C4]',
    colorText: 'text-[#A67E2E]',
    pillBadgeClass: 'bg-[#FCF5DE] text-[#A67E2E] border-[#E9E1C4]',
  },
  gratitude: {
    type: 'gratitude',
    icon: '❤️',
    key: 'journal_type_gratitude',
    colorBg: 'bg-[#FDF0F0]',
    colorBorder: 'border-[#FAD2D2]',
    colorText: 'text-[#C53030]',
    pillBadgeClass: 'bg-[#FDF0F0] text-[#C53030] border-[#FAD2D2]',
  },
  wisdom: {
    type: 'wisdom',
    icon: '💡',
    key: 'journal_type_wisdom',
    colorBg: 'bg-[#FEF9E7]',
    colorBorder: 'border-[#FCEDB4]',
    colorText: 'text-[#B7791F]',
    pillBadgeClass: 'bg-[#FEF9E7] text-[#B7791F] border-[#FCEDB4]',
  },
  quote: {
    type: 'quote',
    icon: '📌',
    key: 'journal_type_quote',
    colorBg: 'bg-[#F0F5FF]',
    colorBorder: 'border-[#D0E2FF]',
    colorText: 'text-[#2B6CB0]',
    pillBadgeClass: 'bg-[#F0F5FF] text-[#2B6CB0] border-[#D0E2FF]',
  },
  idea: {
    type: 'idea',
    icon: '🧠',
    key: 'journal_type_idea',
    colorBg: 'bg-[#F3E8FF]',
    colorBorder: 'border-[#E9D5FF]',
    colorText: 'text-[#7E22CE]',
    pillBadgeClass: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
  },
  free_writing: {
    type: 'free_writing',
    icon: '✍️',
    key: 'journal_type_free_writing',
    colorBg: 'bg-[#F5F5F4]',
    colorBorder: 'border-[#E7E5E4]',
    colorText: 'text-[#57534E]',
    pillBadgeClass: 'bg-[#F5F5F4] text-[#57534E] border-[#E7E5E4]',
  },
  goal: {
    type: 'goal',
    icon: '🎯',
    key: 'journal_type_goal',
    colorBg: 'bg-[#FEF2F2]',
    colorBorder: 'border-[#FECACA]',
    colorText: 'text-[#DC2626]',
    pillBadgeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  },
  memory: {
    type: 'memory',
    icon: '🖼️',
    key: 'journal_type_memory',
    colorBg: 'bg-[#E0F2FE]',
    colorBorder: 'border-[#BAE6FD]',
    colorText: 'text-[#0369A1]',
    pillBadgeClass: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
  }
};

export function getJournalTypeConfig(type?: JournalEntryType): JournalTypeConfig {
  if (!type || !JOURNAL_TYPES_CONFIG[type]) {
    return JOURNAL_TYPES_CONFIG.diary;
  }
  return JOURNAL_TYPES_CONFIG[type];
}

export function getJournalTypeLabel(type?: JournalEntryType, langOrT?: any): string {
  const cfg = getJournalTypeConfig(type);
  const t = typeof langOrT === 'object' && langOrT !== null ? langOrT : getTranslation(langOrT);
  return t[cfg.key] || cfg.type;
}

export function getJournalTypeBadge(type?: JournalEntryType, langOrT?: any): string {
  const cfg = getJournalTypeConfig(type);
  const label = getJournalTypeLabel(type, langOrT);
  return `${cfg.icon} ${label}`;
}

export function getJournalTypeDescription(type?: JournalEntryType, langOrT?: any): string {
  const cfg = getJournalTypeConfig(type);
  const t = typeof langOrT === 'object' && langOrT !== null ? langOrT : getTranslation(langOrT);
  return t[cfg.key + '_desc'] || '';
}
