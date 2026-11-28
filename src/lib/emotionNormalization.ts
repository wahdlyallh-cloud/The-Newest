// src/lib/emotionNormalization.ts
// Robust normalization of emotion/mood percentages using Largest Remainder Rounding (Hare-Niemeyer)

export interface MoodPercentageEntry {
  mood: string;
  percentage: number;
}

/**
 * Normalizes mood labels to prevent split buckets across Arabic/English duplicates and casing.
 */
export function canonicalizeMoodLabel(rawMood: string, preferredLang: 'ar' | 'en' = 'ar'): string {
  if (!rawMood || typeof rawMood !== 'string') return preferredLang === 'ar' ? 'طبيعي' : 'Normal';

  const clean = rawMood.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '');

  // Canonical groupings
  if (/^(سعيد\s*جد[ااً]|very\s*happy|ecstatic|joyful)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'سعيد جدًا' : 'Very Happy';
  }
  if (/^(سعيد|happy|cheerful|content|happiness|سعادة)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'سعيد' : 'Happy';
  }
  if (/^(مرتاح|relaxed|calm|peaceful|serene|راحه|راحة|هدوء)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'مرتاح' : 'Relaxed';
  }
  if (/^(قلق|anxious|nervous|worried|stress|stressed|توتر)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'قلق' : 'Anxious';
  }
  if (/^(حزين|sad|unhappy|depressed|مكتئب|حزن)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'حزين' : 'Sad';
  }
  if (/^(مرهق|exhausted|tired|fatigued|إرهاق|ارهاق|تعبان)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'مرهق' : 'Exhausted';
  }
  if (/^(غاضب|angry|frustrated|irritable|غضب|انزعاج)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'غاضب' : 'Angry';
  }
  if (/^(ممتن|grateful|thankful|appreciative|امتنان)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'ممتن' : 'Grateful';
  }
  if (/^(متحمس|excited|motivated|حماس)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'متحمس' : 'Excited';
  }
  if (/^(عادي|طبيعي|normal|neutral|fine|okay)$/i.test(clean)) {
    return preferredLang === 'ar' ? 'طبيعي' : 'Normal';
  }

  // Fallback: capitalize or return clean original trimmed
  return rawMood.trim();
}

/**
 * Normalizes any array of mood percentages or raw counts into an integer distribution
 * summing strictly to 100% using Largest Remainder Rounding (Hare-Niemeyer).
 */
export function normalizeMoodDistribution(
  input: Array<{ mood: string; percentage?: number; count?: number } | { preMoods?: string[]; moods?: string[]; mood?: string }> | Record<string, number> | string[],
  preferredLang: 'ar' | 'en' = 'ar'
): MoodPercentageEntry[] {
  const aggregatedMap = new Map<string, number>();

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        const canonical = canonicalizeMoodLabel(item, preferredLang);
        aggregatedMap.set(canonical, (aggregatedMap.get(canonical) || 0) + 1);
      } else if (item && typeof item === 'object') {
        const anyObj = item as any;
        if (Array.isArray(anyObj.preMoods) || Array.isArray(anyObj.moods) || typeof anyObj.mood === 'string') {
          const list = Array.isArray(anyObj.preMoods) && anyObj.preMoods.length > 0
            ? anyObj.preMoods
            : Array.isArray(anyObj.moods) && anyObj.moods.length > 0
            ? anyObj.moods
            : typeof anyObj.mood === 'string' && anyObj.mood.trim()
            ? [anyObj.mood.trim()]
            : [];
          for (const m of list) {
            if (m && typeof m === 'string') {
              const canonical = canonicalizeMoodLabel(m, preferredLang);
              aggregatedMap.set(canonical, (aggregatedMap.get(canonical) || 0) + 1);
            }
          }
          continue;
        }
        const rawMood = String(anyObj.mood || '').trim();
        if (!rawMood) continue;
        const canonical = canonicalizeMoodLabel(rawMood, preferredLang);
        const val = typeof anyObj.percentage === 'number'
          ? anyObj.percentage
          : (typeof anyObj.count === 'number' ? anyObj.count : 1);

        if (Number.isFinite(val) && val > 0) {
          aggregatedMap.set(canonical, (aggregatedMap.get(canonical) || 0) + val);
        }
      }
    }
  } else if (input && typeof input === 'object') {
    for (const [rawMood, count] of Object.entries(input)) {
      if (!rawMood || typeof count !== 'number' || !Number.isFinite(count) || count <= 0) continue;
      const canonical = canonicalizeMoodLabel(rawMood, preferredLang);
      aggregatedMap.set(canonical, (aggregatedMap.get(canonical) || 0) + count);
    }
  }

  const entries = Array.from(aggregatedMap.entries()).map(([mood, weight]) => ({
    mood,
    weight
  }));

  // Empty dataset handling
  if (entries.length === 0) {
    return [];
  }

  // Single entry dataset handling
  if (entries.length === 1) {
    return [{ mood: entries[0].mood, percentage: 100 }];
  }

  const totalWeight = entries.reduce((acc, curr) => acc + curr.weight, 0);
  if (totalWeight <= 0) {
    return [];
  }

  // Largest-remainder calculation
  interface IntermediateEntry {
    mood: string;
    exact: number;
    floor: number;
    remainder: number;
    index: number;
  }

  const intermediate: IntermediateEntry[] = entries.map((e, index) => {
    const exact = (e.weight / totalWeight) * 100;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return {
      mood: e.mood,
      exact,
      floor,
      remainder,
      index
    };
  });

  const sumFloors = intermediate.reduce((acc, curr) => acc + curr.floor, 0);
  let deficit = 100 - sumFloors;

  // Sort by remainder descending
  intermediate.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < intermediate.length && deficit > 0; i++) {
    intermediate[i].floor += 1;
    deficit -= 1;
  }

  // Restore original order by sorting by index
  intermediate.sort((a, b) => a.index - b.index);

  return intermediate.map(item => ({
    mood: item.mood,
    percentage: Math.max(0, Math.min(100, item.floor))
  }));
}

/** Converts raw per-day mood counts into integer percentages whose total is exactly 100. */
export function normalizeMoodPercentages(counts: Record<string, number>, preferredLang: 'ar' | 'en' = 'ar'): MoodPercentageEntry[] {
  return normalizeMoodDistribution(counts, preferredLang);
}
