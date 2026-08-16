/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Architecture:
 * 1. Separation of User Recording Session from Disposable Browser SpeechRecognition Instances.
 * 2. Auto-reconnect with 80ms debounce upon browser onend silence timeout.
 * 3. Generation-token protection ensuring stale callbacks from previous instances are ignored.
 * 4. Incremental result-index commit tracking (Set<number>) per instance to guarantee each final segment is committed exactly once.
 * 5. Persistent committedTranscript across multiple disposable recognition instances for 30+ minute continuous sessions.
 * 6. Decoupled from MediaRecorder and Gemini (Zero API requests during live transcription).
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

  // Logical User Recording Session
  private userSessionId: number = 0;
  private isExplicitlyStopped: boolean = true;
  private committedTranscript: string = '';
  private isListening: boolean = false;
  private restartTimer: any = null;

  // Disposable Recognition Instance State
  private recognitionGeneration: number = 0;
  private activeRecognition: any = null;
  private activeCommittedIndices: Set<number> = new Set();
  private activeInterimMap: Map<number, string> = new Map();

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
    return this.committedTranscript.trim();
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
   * Forcefully tears down any active native recognition instance and cancels restart timers.
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
        // ignore already stopped errors
      }
    }
    this.isListening = false;
  }

  /**
   * Starts a new logical user recording session.
   */
  public startSession(options: {
    lang?: string;
    continuous?: boolean;
    callbacks?: SpeechManagerCallbacks;
  } = {}): number {
    this.destroyActiveRecognition();

    this.userSessionId += 1;
    const sessionToken = this.userSessionId;

    this.isExplicitlyStopped = false;
    this.committedTranscript = '';
    this.activeCommittedIndices.clear();
    this.activeInterimMap.clear();

    this.callbacks = options.callbacks || {};
    this.listeners.clear();
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    this.spawnRecognition(sessionToken);
    return sessionToken;
  }

  public start(options?: { lang?: string; continuous?: boolean; callbacks?: SpeechManagerCallbacks }): number {
    return this.startSession(options);
  }

  /**
   * Spawns a disposable native SpeechRecognition instance.
   */
  private spawnRecognition(sessionToken: number): void {
    if (this.isExplicitlyStopped || sessionToken !== this.userSessionId) {
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
      this.recognitionGeneration += 1;
      const instanceGeneration = this.recognitionGeneration;

      // Each disposable recognition instance has its own local index commit set and interim map
      const instanceCommittedIndices = new Set<number>();
      const instanceInterimMap = new Map<number, string>();
      this.activeCommittedIndices = instanceCommittedIndices;
      this.activeInterimMap = instanceInterimMap;

      const rec = new SpeechRec();
      rec.lang = this.lang;
      rec.continuous = this.continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (instanceGeneration !== this.recognitionGeneration || this.isExplicitlyStopped) return;
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (instanceGeneration !== this.recognitionGeneration || this.isExplicitlyStopped) return;

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
              this.committedTranscript = this.committedTranscript
                ? `${this.committedTranscript} ${text}`
                : text;
            }
          } else {
            instanceInterimMap.set(i, text);
          }
        }

        this.emitState();
      };

      rec.onerror = (event: any) => {
        if (instanceGeneration !== this.recognitionGeneration || this.isExplicitlyStopped) return;

        if (event.error === 'language-not-supported' && this.lang !== 'ar-SA') {
          this.lang = 'ar-SA';
          this.destroyActiveRecognition();
          this.spawnRecognition(sessionToken);
          return;
        }

        if (event.error === 'no-speech') {
          // Expected on silence; let onend handle seamless continuation
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
        this.emitState();
      };

      rec.onspeechend = () => {
        if (instanceGeneration !== this.recognitionGeneration || this.isExplicitlyStopped) return;
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (instanceGeneration !== this.recognitionGeneration) return;
        this.isListening = false;

        // Auto-reconnect after natural pause while user is still in active recording session
        if (!this.isExplicitlyStopped && this.continuous) {
          this.activeInterimMap.clear();
          this.emitState();
          this.destroyActiveRecognition();

          this.restartTimer = setTimeout(() => {
            if (!this.isExplicitlyStopped && this.userSessionId === sessionToken) {
              this.spawnRecognition(sessionToken);
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
   * Finalizes recognition and returns the complete final transcript.
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    // If an interim fragment remains, commit it once
    const remainingInterim = this.getInterimTranscript();
    if (remainingInterim) {
      this.committedTranscript = this.committedTranscript
        ? `${this.committedTranscript} ${remainingInterim}`
        : remainingInterim;
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
    this.committedTranscript = '';
    this.activeCommittedIndices.clear();
    this.activeInterimMap.clear();
    this.callbacks = {};
    this.listeners.clear();
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
