/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Provides:
 * 1. Global Singleton Recognition Instance Management (prevents concurrent instances).
 * 2. Standard event.resultIndex accumulator for 100% reliable Live Arabic Transcription.
 * 3. Strict separation of Final Transcript and Interim Preview.
 * 4. Controlled restart on mobile WebKit / Chrome silence timeout preserving accumulated words.
 * 5. Comprehensive session token protection against stale callbacks on rapid start/stop/close.
 */

export const DEBUG_SPEECH = true;

function speechLog(...args: any[]) {
  if (DEBUG_SPEECH) {
    console.log('[SpeechEngine]', ...args);
  }
}

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
        // ignore already aborted errors
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
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.callbacks = options.callbacks || {};
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    speechLog(`Starting session #${sessionToken} (lang: ${this.lang}, continuous: ${this.continuous})`);

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
      speechLog('SpeechRecognition not supported in browser');
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
        speechLog(`Session #${sessionToken} onstart (lang: ${rec.lang})`);
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) {
          speechLog(`Discarding stale onresult from older session`);
          return;
        }
        this.processRecognitionEvent(event, sessionToken);
      };

      rec.onerror = (event: any) => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        speechLog(`Session #${sessionToken} onerror:`, event.error);
        if (event.error === 'no-speech' && this.continuous && !this.isExplicitlyStopped) {
          return;
        }
        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
      };

      rec.onspeechend = () => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        speechLog(`Session #${sessionToken} onspeechend`);
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.isListening = false;
        speechLog(`Session #${sessionToken} onend`);

        // Seamless auto-restart on silence timeout if session is still actively recording
        if (!this.isExplicitlyStopped && this.continuous) {
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
    } catch (err) {
      console.error('[SpeechEngine] Failed to start recognition:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
    }
  }

  /**
   * Processes incoming Web Speech API results using the standard event.resultIndex loop.
   */
  public processRecognitionEvent(event: any, sessionToken: number): void {
    if (!event || !event.results || sessionToken !== this.currentSessionId || this.isExplicitlyStopped) {
      return;
    }

    let interim = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res || !res[0]) continue;
      const text = (res[0].transcript || '').trim();
      if (!text) continue;

      if (res.isFinal) {
        this.finalTranscript = this.finalTranscript
          ? `${this.finalTranscript} ${text}`.trim()
          : text;
      } else {
        interim = interim ? `${interim} ${text}` : text;
      }
    }

    this.interimTranscript = interim.trim();
    this.emitState();
  }

  /**
   * Stops recognition and finalizes the transcript.
   * Preserves interim text as final if no other final text exists.
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    let finalResult = (this.finalTranscript || '').trim();
    if (!finalResult && this.interimTranscript) {
      finalResult = this.interimTranscript.trim();
    } else if (this.interimTranscript) {
      finalResult = `${finalResult} ${this.interimTranscript}`.trim();
    }

    this.finalTranscript = finalResult;
    this.interimTranscript = '';
    this.emitState();

    speechLog(`Finalized transcript: "${finalResult}"`);
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
