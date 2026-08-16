/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * True continuous live Arabic transcription with seamless auto-restart on browser silence timeout.
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
  private activeRecognition: any = null;
  private isExplicitlyStopped: boolean = true;
  private baseTranscript: string = '';
  private finalTranscript: string = '';
  private interimTranscript: string = '';
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
    return this.finalTranscript.trim();
  }

  public getInterimTranscript(): string {
    return this.interimTranscript.trim();
  }

  public getDisplayTranscript(): string {
    const combined = `${this.finalTranscript} ${this.interimTranscript}`
      .replace(/\s+/g, ' ')
      .trim();
    return combined;
  }

  public getState(): SpeechSessionState {
    return {
      sessionId: this.currentSessionId,
      finalTranscript: this.finalTranscript.trim(),
      interimTranscript: this.interimTranscript.trim(),
      displayTranscript: this.getDisplayTranscript(),
      isListening: this.isListening
    };
  }

  /**
   * Forcefully tears down and nullifies any running recognition instance.
   */
  public destroyActiveRecognition(): void {
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
   * Starts a new speech recognition session, killing any previous instance immediately.
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
    this.baseTranscript = '';
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.callbacks = options.callbacks || {};
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    this.spawnRecognition(sessionToken);
    return sessionToken;
  }

  /**
   * Spawns an active browser SpeechRecognition instance for the specified session.
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
      const rec = new SpeechRec();
      rec.lang = this.lang || 'ar-EG';
      rec.continuous = this.continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) {
          return;
        }
        this.processRecognitionEvent(event, sessionToken);
      };

      rec.onerror = (event: any) => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;

        if (event.error === 'language-not-supported' && this.lang !== 'ar-SA') {
          this.lang = 'ar-SA';
          this.destroyActiveRecognition();
          this.spawnRecognition(sessionToken);
          return;
        }

        if (event.error === 'no-speech' && this.continuous && !this.isExplicitlyStopped) {
          // Expected on silence; let onend handle seamless auto-restart
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
        this.emitState();
      };

      rec.onspeechend = () => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.isListening = false;

        // Seamless auto-restart preserving accumulated base transcript
        if (!this.isExplicitlyStopped && this.continuous) {
          this.baseTranscript = this.finalTranscript;
          this.interimTranscript = '';
          this.emitState();
          this.destroyActiveRecognition();
          setTimeout(() => {
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
   * Processes incoming Web Speech API results with baseTranscript continuity.
   */
  public processRecognitionEvent(event: any, sessionToken: number): void {
    if (!event || !event.results || sessionToken !== this.currentSessionId || this.isExplicitlyStopped) {
      return;
    }

    let currentCycleFinal = '';
    let rawInterim = '';

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res || !res[0]) continue;
      const chunk = (res[0].transcript || '').trim();
      if (!chunk) continue;

      if (res.isFinal) {
        currentCycleFinal = currentCycleFinal ? `${currentCycleFinal} ${chunk}` : chunk;
      } else {
        rawInterim = chunk;
      }
    }

    if (currentCycleFinal) {
      this.finalTranscript = this.baseTranscript
        ? `${this.baseTranscript} ${currentCycleFinal}`
        : currentCycleFinal;
    } else {
      this.finalTranscript = this.baseTranscript;
    }

    this.interimTranscript = rawInterim;
    this.emitState();
  }

  /**
   * Stops recognition and finalizes the transcript.
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    let result = (this.finalTranscript || '').trim();
    if (!result && this.interimTranscript) {
      result = this.interimTranscript.trim();
    } else if (this.interimTranscript) {
      result = `${result} ${this.interimTranscript}`.trim();
    }

    this.finalTranscript = result;
    this.baseTranscript = result;
    this.interimTranscript = '';
    this.emitState();

    return result;
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
    this.baseTranscript = '';
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.emitState();
  }

  private emitState(): void {
    if (this.callbacks.onTranscriptChange) {
      this.callbacks.onTranscriptChange(this.getState());
    }
  }
}
