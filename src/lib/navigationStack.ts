import { useEffect } from 'react';

export type NavigationStepType = 'modal' | 'sheet' | 'tab' | 'subTab' | 'edit';

export interface NavigationStep {
  id: string;
  type: NavigationStepType;
  title?: string;
  onBack: () => void | boolean;
}

class NavigationStackManager {
  private stack: NavigationStep[] = [];
  private lastBackPressTime = 0;
  private exitToastCallback: (() => void) | null = null;
  private subscribers: Set<() => void> = new Set();

  public push(step: NavigationStep) {
    // Avoid immediate duplicate push of same id
    this.stack = this.stack.filter(s => s.id !== step.id);
    this.stack.push(step);
    this.notify();
  }

  public remove(id: string) {
    const prevLen = this.stack.length;
    this.stack = this.stack.filter(s => s.id !== id);
    if (this.stack.length !== prevLen) {
      this.notify();
    }
  }

  public size(): number {
    return this.stack.length;
  }

  public getStack(): readonly NavigationStep[] {
    return this.stack;
  }

  public setExitToastCallback(cb: () => void) {
    this.exitToastCallback = cb;
  }

  public subscribe(cb: () => void) {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify() {
    this.subscribers.forEach(cb => {
      try { cb(); } catch (_) {}
    });
  }

  /**
   * Universal step-by-step back handler.
   * Returns:
   *  - 'handled': A modal, sheet, or sub-view/tab was stepped back. Android event consumed.
   *  - 'exit': Root reached and user pressed back twice within 2 seconds. Native finish() should execute.
   *  - 'warn_exit': Root reached, exit warning toast triggered.
   */
  public handleStepBack(): 'handled' | 'exit' | 'warn_exit' {
    if (this.stack.length > 0) {
      const topStep = this.stack.pop();
      this.notify();
      if (topStep) {
        try {
          const res = topStep.onBack();
          // If onBack explicitly returned false, it means it didn't handle it
          if (res !== false) {
            return 'handled';
          }
        } catch (err) {
          console.error('[NavigationStack] Error in step onBack:', err);
          return 'handled';
        }
      }
      return 'handled';
    }

    // Root screen reached (empty history)
    const now = Date.now();
    if (now - this.lastBackPressTime < 2000) {
      return 'exit';
    }

    this.lastBackPressTime = now;
    if (this.exitToastCallback) {
      this.exitToastCallback();
    }
    return 'warn_exit';
  }
}

export const navigationStack = new NavigationStackManager();

/**
 * React hook to register an active modal/drawer/sheet to the navigation stack.
 * When mounted with active=true, pushes the step. When unmounted or active=false, removes it.
 */
export function useRegisterBackStep(
  id: string,
  type: NavigationStepType,
  active: boolean,
  onBack: () => void,
  title?: string
) {
  useEffect(() => {
    if (!active) {
      navigationStack.remove(id);
      return;
    }

    navigationStack.push({
      id,
      type,
      title,
      onBack
    });

    return () => {
      navigationStack.remove(id);
    };
  }, [id, active, onBack, title, type]);
}
