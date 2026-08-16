/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Session-Safe Result-Index Commit Architecture:
 * 1. Single source of truth for all voice features.
 * 2. Per-recognition committed result index tracking (Set<number>) to guarantee a browser result index is committed EXACTLY ONCE.
 * 3. Independent interim map (Map<number, string>) ensuring live words update immediately and are cleanly cleared upon finalization.
 * 4. Multi-instance continuous session persistence (committedSegments: string[]) allowing 30+ minute recordings across browser timeouts and restarts without replay duplication.
 * 5. Strict instance ID fencing to discard stale callbacks from aborted/previous recognition objects.
 */

export interface SpeechSessionState {
  sessionId: number;
  finalTranscript: string;
  interimTranscript: string;
  displayTranscript: string;
  isListening: boolean;
}

export type SpeechTranscriptListener = (state: SpeechSessionState) => void;

export interface SpeechManagerCallbacks {
  onTranscriptChange?: SpeechTranscriptListener;
  onStatusChange?: (status: 'idle' | 'listening' | 'analyzing' | 'speaking') => void;
  onError?: (error: any) => void;
  onSpeechEnd?: () => void;
}

export class SpeechRecognitionManager {
  private static instance: SpeechRecognitionManager | null = null;

  // Logical User Session State
  private userSessionId: number = 0;
  private instanceCounter: number = 0;
  private isExplicitlyStopped: boolean = true;
  private isListening: boolean = false;
  private committedSegments: string[] = [];
  private activeInterimMap: Map<number, string> = new Map();
  private activeCommittedIndices: Set<number> = new Set();
  private activeRecognition: any = null;
  private restartTimer: any = null;

  private listeners: Set<SpeechTranscriptListener> = new Set();
  private callbacks: SpeechManagerCallbacks = {};
  private lang: string = 'ar-EG';
  private continuous: boolean = true;

  private constructor() {}

  public static getInstance(): SpeechRecognitionManager {
    if (!SpeechRecognitionManager.instance) {
      SpeechRecognitionManager.instance = new SpeechRecognitionManager();
    }
    return SpeechRecognitionManager.instance;
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public getSessionId(): number {
    return this.userSessionId;
  }

  public getFinalTranscript(): string {
    return this.committedSegments.join(' ').replace(/\s+/g, ' ').trim();
  }

  public getInterimTranscript(): string {
    return Array.from(this.activeInterimMap.values()).join(' ').replace(/\s+/g, ' ').trim();
  }

  public getDisplayTranscript(): string {
    const finalPart = this.getFinalTranscript();
    const interimPart = this.getInterimTranscript();
    if (!finalPart) return interimPart;
    if (!interimPart) return finalPart;
    return `${finalPart} ${interimPart}`.replace(/\s+/g, ' ').trim();
  }

  public getState(): SpeechSessionState {
    return {
      sessionId: this.userSessionId,
      finalTranscript: this.getFinalTranscript(),
      interimTranscript: this.getInterimTranscript(),
      displayTranscript: this.getDisplayTranscript(),
      isListening: this.isListening
    };
  }

  public getTranscript(): string {
    return this.getDisplayTranscript();
  }

  public subscribe(listener: SpeechTranscriptListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Forcefully destroys any active native recognition instance.
   */
  public destroyActiveRecognition(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.activeRecognition) {
      try {
        const rec = this.activeRecognition;
        this.activeRecognition = null;
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.onspeechend = null;
        rec.stop();
        rec.abort();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
  }

  /**
   * Starts a new logical user speech session.
   */
  public startSession(options: {
    lang?: string;
    continuous?: boolean;
    callbacks?: SpeechManagerCallbacks;
  } = {}): number {
    this.destroyActiveRecognition();

    this.userSessionId += 1;
    const currentSession = this.userSessionId;

    this.isExplicitlyStopped = false;
    this.committedSegments = [];
    this.activeInterimMap.clear();
    this.activeCommittedIndices.clear();
    this.callbacks = options.callbacks || {};
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    this.spawnRecognition(currentSession);
    return currentSession;
  }

  public start(options?: { lang?: string; continuous?: boolean; callbacks?: SpeechManagerCallbacks }): number {
    return this.startSession(options);
  }

  /**
   * Spawns a native SpeechRecognition instance dedicated to a specific session turn.
   */
  private spawnRecognition(userSession: number): void {
    if (this.isExplicitlyStopped || userSession !== this.userSessionId) {
      return;
    }

    const SpeechRec = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRec) {
      if (this.callbacks.onError) {
        this.callbacks.onError({ error: 'not-supported' });
      }
      return;
    }

    try {
      this.instanceCounter += 1;
      const instanceId = this.instanceCounter;

      // Each native recognition instance has its own local index commit set and interim map
      const instanceCommittedIndices = new Set<number>();
      const instanceInterimMap = new Map<number, string>();
      this.activeCommittedIndices = instanceCommittedIndices;
      this.activeInterimMap = instanceInterimMap;

      const rec = new SpeechRec();
      rec.lang = this.lang || 'ar-EG';
      rec.continuous = this.continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (instanceId !== this.instanceCounter || this.isExplicitlyStopped) return;
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (instanceId !== this.instanceCounter || this.isExplicitlyStopped) return;

        // Process only using event.resultIndex as boundary
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const text = (result[0].transcript || '').trim();
          if (!text) continue;

          if (result.isFinal) {
            instanceInterimMap.delete(i);

            // A browser result index in this instance may be committed EXACTLY ONCE
            if (!instanceCommittedIndices.has(i)) {
              instanceCommittedIndices.add(i);
              this.committedSegments.push(text);
            }
          } else {
            instanceInterimMap.set(i, text);
          }
        }

        this.emitState();
      };

      rec.onerror = (event: any) => {
        if (instanceId !== this.instanceCounter || this.isExplicitlyStopped) return;

        if (event.error === 'language-not-supported' && this.lang !== 'ar-SA') {
          this.lang = 'ar-SA';
          this.destroyActiveRecognition();
          this.spawnRecognition(userSession);
          return;
        }

        if (event.error === 'no-speech' && this.continuous && !this.isExplicitlyStopped) {
          // Expected on silence; let onend handle seamless continuation
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
        this.emitState();
      };

      rec.onspeechend = () => {
        if (instanceId !== this.instanceCounter || this.isExplicitlyStopped) return;
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (instanceId !== this.instanceCounter) return;
        this.isListening = false;

        // Seamless auto-restart preserving committed transcript
        if (!this.isExplicitlyStopped && this.continuous) {
          this.activeInterimMap.clear();
          this.emitState();
          this.destroyActiveRecognition();

          this.restartTimer = setTimeout(() => {
            if (!this.isExplicitlyStopped && this.userSessionId === userSession) {
              this.spawnRecognition(userSession);
            }
          }, 80);
        }
      };

      this.activeRecognition = rec;
      rec.start();
    } catch (err: any) {
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
      this.emitState();
    }
  }

  /**
   * Finalizes recognition and returns the complete, non-repeating transcript.
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    // If an interim fragment remains, commit it once
    const remainingInterim = this.getInterimTranscript();
    if (remainingInterim) {
      this.committedSegments.push(remainingInterim);
      this.activeInterimMap.clear();
    }

    const finalResult = this.getFinalTranscript();
    this.emitState();
    return finalResult;
  }

  public stop(): string {
    return this.finalize();
  }

  public stopSession(): string {
    return this.finalize();
  }

  public abort(): void {
    this.abortSession();
  }

  public abortSession(): void {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();
    this.committedSegments = [];
    this.activeInterimMap.clear();
    this.activeCommittedIndices.clear();
    this.emitState();
  }

  public reset(): void {
    this.abortSession();
  }

  private emitState(): void {
    const state = this.getState();
    if (this.callbacks.onTranscriptChange) {
      this.callbacks.onTranscriptChange(state);
    }
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn('Transcript listener error:', e);
      }
    });
  }
}
