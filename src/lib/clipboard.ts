/**
 * Bulletproof Clipboard Safe Helper for Hayat AI
 * Supports Android APK WebView, iOS WebKit, Mobile & Desktop Browsers.
 */

export async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof text !== 'string' || text.length === 0) {
    return false;
  }

  // 1. Primary: modern Clipboard API in secure contexts
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[Clipboard] navigator.clipboard.writeText failed, falling back to execCommand:', err);
    }
  }

  // 2. Secondary: Fallback using temporary off-screen textarea with execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const activeEl = document.activeElement as HTMLElement | null;
      const textArea = document.createElement('textarea');

      textArea.value = text;
      // Prevent zooming and visual jumps
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.style.fontSize = '16px';
      textArea.style.pointerEvents = 'none';

      document.body.appendChild(textArea);

      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      // Restore previously focused element if appropriate
      if (activeEl && typeof activeEl.focus === 'function') {
        try {
          activeEl.focus({ preventScroll: true });
        } catch (_) {}
      }

      return successful;
    } catch (fallbackErr) {
      console.error('[Clipboard] document.execCommand copy fallback failed:', fallbackErr);
      return false;
    }
  }

  return false;
}
