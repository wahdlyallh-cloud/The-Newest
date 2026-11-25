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

  // 2. Secondary: Fallback using temporary textarea tailored for Android WebView & iOS Safari
  if (typeof document !== 'undefined') {
    const activeEl = document.activeElement as HTMLElement | null;
    const textArea = document.createElement('textarea');

    try {
      textArea.value = text;
      // In WebView, keep within visible viewport bounds but fully transparent to ensure selection range is valid
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0.01';
      textArea.style.zIndex = '-1';
      textArea.style.fontSize = '16px';
      // Do NOT set pointer-events: none because some Android WebViews disallow focus/selection on pointer-events: none elements
      textArea.setAttribute('aria-hidden', 'true');
      textArea.setAttribute('tabindex', '-1');

      document.body.appendChild(textArea);

      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      // Attempt standard selection range if available
      if (window.getSelection) {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(textArea);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      const successful = document.execCommand('copy');
      return successful;
    } catch (fallbackErr) {
      console.error('[Clipboard] document.execCommand copy fallback failed:', fallbackErr);
      return false;
    } finally {
      if (textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
      // Restore previously focused element if appropriate
      if (activeEl && typeof activeEl.focus === 'function') {
        try {
          activeEl.focus({ preventScroll: true });
        } catch (_) {}
      }
    }
  }

  return false;
}

/**
 * Bulletproof Safe Paste / Read Clipboard Helper
 */
export async function pasteTextSafe(): Promise<string> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.readText === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
  ) {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      console.warn('[Clipboard] navigator.clipboard.readText failed:', err);
    }
  }
  return '';
}

