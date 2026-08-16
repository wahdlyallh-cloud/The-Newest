/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Session-Level Result Store Architecture:
 * 1. Single source of truth across all voice features.
 * 2. Result-indexed final segment storage (Map<number, string>) preventing replay duplication.
 * 3. Generation token protection against stale callbacks on restart/stop.
 * 4. Immediate and clean live interim + committed final separation.
 * 5. Continuous multi-minute/long session support across internal browser silence timeouts.
 */

export interface SpeechSessionState {
  sessionId: number;
  finalTranscript: string;
  interimTranscript: string;
  displayTranscript: string;
  isListening: boolean;
}

export interface SpeechManagerCallbacks {
  onTranscriptChange?: (state: SpeechSessionState) => void;
  onStatusChange?: (status: 'idle' | 'listening' | 'analyzing' | 'speaking') => void;
  onError?: (error: any) => void;
  onSpeechEnd?: () => void;
}

export class SpeechRecognitionManager {
  private static instance: SpeechRecognitionManager | null = null;

  private currentSessionId: number = 0;
  private recognitionGeneration: number = 0;
  private activeRecognition: any = null;
  private isExplicitlyStopped: boolean = true;
  private restartTimer: any = null;

  // Session-Level Store
  private finalSegments: Map<number, string> = new Map();
  private globalSequence: number = 0;
  private lastCommittedNormalized: string = '';
  private interimText: string = '';
  private isListening: boolean = false;
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
    return this.currentSessionId;
  }

  public getFinalTranscript(): string {
    return Array.from(this.finalSegments.values()).join(' ').trim();
  }

  public getInterimTranscript(): string {
    return this.interimText.trim();
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
      sessionId: this.currentSessionId,
      finalTranscript: this.getFinalTranscript(),
      interimTranscript: this.getInterimTranscript(),
      displayTranscript: this.getDisplayTranscript(),
      isListening: this.isListening
    };
  }

  /**
   * Forcefully tears down and nullifies any running recognition instance.
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
   * Starts a new logical speech recognition session.
   */
  public startSession(options: {
    lang?: string;
    continuous?: boolean;
    callbacks?: SpeechManagerCallbacks;
  } = {}): number {
    this.destroyActiveRecognition();

    this.currentSessionId += 1;
    const sessionToken = this.currentSessionId;

    this.isExplicitlyStopped = false;
    this.finalSegments.clear();
    this.globalSequence = 0;
    this.lastCommittedNormalized = '';
    this.interimText = '';
    this.callbacks = options.callbacks || {};
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    this.spawnRecognition(sessionToken);
    return sessionToken;
  }

  /**
   * Spawns an active browser SpeechRecognition instance with generation-token protection.
   */
  private spawnRecognition(sessionToken: number): void {
    if (this.isExplicitlyStopped || sessionToken !== this.currentSessionId) {
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

      const rec = new SpeechRec();
      rec.lang = this.lang || 'ar-EG';
      rec.continuous = this.continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (this.recognitionGeneration !== instanceGeneration || this.isExplicitlyStopped) return;
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (this.recognitionGeneration !== instanceGeneration || this.isExplicitlyStopped) {
          return;
        }
        this.processRecognitionEvent(event, instanceGeneration);
      };

      rec.onerror = (event: any) => {
        if (this.recognitionGeneration !== instanceGeneration || this.isExplicitlyStopped) return;

        if (event.error === 'language-not-supported' && this.lang !== 'ar-SA') {
          this.lang = 'ar-SA';
          this.destroyActiveRecognition();
          this.spawnRecognition(sessionToken);
          return;
        }

        if (event.error === 'no-speech' && this.continuous && !this.isExplicitlyStopped) {
          // Normal timeout on silence; let onend handle seamless auto-restart
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
        this.emitState();
      };

      rec.onspeechend = () => {
        if (this.recognitionGeneration !== instanceGeneration || this.isExplicitlyStopped) return;
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (this.recognitionGeneration !== instanceGeneration) return;
        this.isListening = false;

        // Seamless auto-restart while user is still in active session
        if (!this.isExplicitlyStopped && this.continuous) {
          this.interimText = '';
          this.emitState();
          this.destroyActiveRecognition();

          this.restartTimer = setTimeout(() => {
            if (!this.isExplicitlyStopped && this.currentSessionId === sessionToken) {
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
   * Processes incoming Web Speech API results using the Session-Level Result Store.
   */
  public processRecognitionEvent(event: any, generation: number): void {
    if (!event || !event.results || generation !== this.recognitionGeneration || this.isExplicitlyStopped) {
      return;
    }

    let currentInterim = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res || !res[0]) continue;
      const text = (res[0].transcript || '').trim();
      if (!text) continue;

      if (res.isFinal) {
        // Consecutive-final-segment replay protection (normalizing whitespace and punctuation only)
        const normalized = text.replace(/[\s\p{P}]+/gu, ' ').trim();

        if (normalized && normalized !== this.lastCommittedNormalized) {
          this.lastCommittedNormalized = normalized;
          this.globalSequence += 1;
          this.finalSegments.set(this.globalSequence, text);
        }
      } else {
        currentInterim = currentInterim ? `${currentInterim} ${text}` : text;
      }
    }

    this.interimText = currentInterim.trim();
    this.emitState();
  }

  /**
   * Stops recognition and finalizes the transcript.
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    if (this.interimText) {
      const normalized = this.interimText.replace(/[\s\p{P}]+/gu, ' ').trim();
      if (normalized && normalized !== this.lastCommittedNormalized) {
        this.lastCommittedNormalized = normalized;
        this.globalSequence += 1;
        this.finalSegments.set(this.globalSequence, this.interimText.trim());
      }
      this.interimText = '';
    }

    const finalResult = this.getFinalTranscript();
    this.emitState();
    return finalResult;
  }

  /**
   * Stops the active session.
   */
  public stopSession(): string {
    return this.finalize();
  }

  /**
   * Aborts and resets without keeping transcripts.
   */
  public abortSession(): void {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();
    this.finalSegments.clear();
    this.globalSequence = 0;
    this.lastCommittedNormalized = '';
    this.interimText = '';
    this.emitState();
  }

  private emitState(): void {
    if (this.callbacks.onTranscriptChange) {
      this.callbacks.onTranscriptChange(this.getState());
    }
  }
}
