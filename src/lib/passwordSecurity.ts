const FALLBACK_PREFIX = 'fallback:';

export async function hashAppPassword(value: string): Promise<string> {
  const normalized = value.trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${FALLBACK_PREFIX}${(hash >>> 0).toString(16)}`;
}

export async function verifyAppPassword(value: string, expectedHash?: string): Promise<boolean> {
  if (!expectedHash) return false;
  return (await hashAppPassword(value)) === expectedHash;
}
