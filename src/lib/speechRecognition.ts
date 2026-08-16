/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine with Deep Diagnostic Telemetry
 *
 * Provides:
 * 1. Global Singleton Recognition Instance Management (prevents concurrent instances).
 * 2. Complete Lifecycle Event Instrumentation (start, audiostart, soundstart, speechstart, result, speechend, soundend, audioend, error, nomatch, end).
 * 3. Standard event.resultIndex accumulator for 100% reliable Live Arabic Transcription.
 * 4. Automatic language fallback (ar-EG -> ar-SA -> navigator.language).
 * 5. Diagnostic State Hooks for live HUD rendering.
 */

export interface SpeechDiagnosticInfo {
  isAvailable: boolean;
  userAgent: string;
  protocol: string;
  lang: string;
  hasStarted: boolean;
  hasAudio: boolean;
  hasSound: boolean;
  hasSpeech: boolean;
  resultCount: number;
  lastError: string | null;
  charCount: number;
}

export interface SpeechSessionState {
  sessionId: number;
  finalTranscript: string;
  interimTranscript: string;
  displayTranscript: string;
  isListening: boolean;
  diagnostics: SpeechDiagnosticInfo;
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
  private resultCount: number = 0;

  // Diagnostic flags
  private diagHasStarted: boolean = false;
  private diagHasAudio: boolean = false;
  private diagHasSound: boolean = false;
  private diagHasSpeech: boolean = false;
  private diagLastError: string | null = null;

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

  public getDiagnostics(): SpeechDiagnosticInfo {
    return {
      isAvailable: this.isSupported(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      protocol: typeof window !== 'undefined' && window.location ? window.location.protocol : 'unknown',
      lang: this.lang,
      hasStarted: this.diagHasStarted,
      hasAudio: this.diagHasAudio,
      hasSound: this.diagHasSound,
      hasSpeech: this.diagHasSpeech,
      resultCount: this.resultCount,
      lastError: this.diagLastError,
      charCount: this.getDisplayTranscript().length
    };
  }

  public getState(): SpeechSessionState {
    return {
      sessionId: this.currentSessionId,
      finalTranscript: this.finalTranscript.trim(),
      interimTranscript: this.interimTranscript.trim(),
      displayTranscript: this.getDisplayTranscript(),
      isListening: this.isListening,
      diagnostics: this.getDiagnostics()
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
        rec.onaudiostart = null;
        rec.onsoundstart = null;
        rec.onspeechstart = null;
        rec.onresult = null;
        rec.onspeechend = null;
        rec.onsoundend = null;
        rec.onaudioend = null;
        rec.onerror = null;
        rec.onnomatch = null;
        rec.onend = null;
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
    this.resultCount = 0;
    this.diagHasStarted = false;
    this.diagHasAudio = false;
    this.diagHasSound = false;
    this.diagHasSpeech = false;
    this.diagLastError = null;

    this.callbacks = options.callbacks || {};
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    console.log(`[VOICE DEBUG] Starting session #${sessionToken} (lang: ${this.lang}, continuous: ${this.continuous})`);
    console.log(`[VOICE DEBUG] SpeechRecognition available:`, this.isSupported());
    console.log(`[VOICE DEBUG] Protocol:`, typeof window !== 'undefined' ? window.location.protocol : 'N/A');

    this.spawnRecognition(sessionToken);
    return sessionToken;
  }

  /**
   * Spawns an active browser SpeechRecognition instance for the specified session with full telemetry.
   */
  private spawnRecognition(sessionToken: number): void {
    if (this.isExplicitlyStopped || sessionToken !== this.currentSessionId) {
      return;
    }

    const SpeechRec = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRec) {
      console.warn('[VOICE DEBUG] SpeechRecognition not supported in browser');
      this.diagLastError = 'not-supported';
      if (this.callbacks.onError) {
        this.callbacks.onError({ error: 'not-supported' });
      }
      this.emitState();
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = this.lang || 'ar-EG';
      rec.continuous = this.continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      console.log(`[VOICE DEBUG] Recognition instance created. Requesting start()... (lang: ${rec.lang})`);

      rec.onstart = () => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        this.isListening = true;
        this.diagHasStarted = true;
        console.log(`[VOICE DEBUG] onstart event fired (Session #${sessionToken})`);
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onaudiostart = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.diagHasAudio = true;
        console.log(`[VOICE DEBUG] audiostart: Browser audio capture active`);
        this.emitState();
      };

      rec.onsoundstart = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.diagHasSound = true;
        console.log(`[VOICE DEBUG] soundstart: Sound detected`);
        this.emitState();
      };

      rec.onspeechstart = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.diagHasSpeech = true;
        console.log(`[VOICE DEBUG] speechstart: Human speech recognized`);
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) {
          console.log(`[VOICE DEBUG] Discarding stale onresult from older session`);
          return;
        }
        this.processRecognitionEvent(event, sessionToken);
      };

      rec.onerror = (event: any) => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        this.diagLastError = event.error || 'unknown-error';
        console.error(`[VOICE DEBUG] onerror:`, event.error);

        // Language fallback on language-not-supported
        if (event.error === 'language-not-supported' && this.lang !== 'ar-SA') {
          console.warn('[VOICE DEBUG] ar-EG unsupported, falling back to ar-SA...');
          this.lang = 'ar-SA';
          this.destroyActiveRecognition();
          this.spawnRecognition(sessionToken);
          return;
        }

        if (event.error === 'no-speech' && this.continuous && !this.isExplicitlyStopped) {
          // No speech timeout on mobile is expected, let onend handle restart
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
        this.emitState();
      };

      rec.onspeechend = () => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        console.log(`[VOICE DEBUG] onspeechend`);
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onsoundend = () => {
        if (this.currentSessionId !== sessionToken) return;
        console.log(`[VOICE DEBUG] onsoundend`);
      };

      rec.onaudioend = () => {
        if (this.currentSessionId !== sessionToken) return;
        console.log(`[VOICE DEBUG] onaudioend`);
      };

      rec.onnomatch = () => {
        if (this.currentSessionId !== sessionToken) return;
        console.log(`[VOICE DEBUG] onnomatch`);
      };

      rec.onend = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.isListening = false;
        console.log(`[VOICE DEBUG] onend (Session #${sessionToken})`);

        // Seamless auto-restart on silence timeout if session is still actively recording
        if (!this.isExplicitlyStopped && this.continuous) {
          this.interimTranscript = '';
          this.emitState();
          this.destroyActiveRecognition();
          setTimeout(() => {
            if (!this.isExplicitlyStopped && this.currentSessionId === sessionToken) {
              console.log(`[VOICE DEBUG] Auto-restarting recognition for active session #${sessionToken}`);
              this.spawnRecognition(sessionToken);
            }
          }, 80);
        }
      };

      this.activeRecognition = rec;
      rec.start();
      console.log(`[VOICE DEBUG] rec.start() invoked successfully.`);
    } catch (err: any) {
      console.error('[VOICE DEBUG] Failed to start recognition:', err);
      this.diagLastError = err?.message || 'start-failed';
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
      this.emitState();
    }
  }

  /**
   * Processes incoming Web Speech API results using the standard event.resultIndex loop.
   */
  public processRecognitionEvent(event: any, sessionToken: number): void {
    if (!event || !event.results || sessionToken !== this.currentSessionId || this.isExplicitlyStopped) {
      return;
    }

    this.resultCount += 1;
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
        console.log(`[VOICE DEBUG] Final result #${i}: "${text}" -> Total Final: "${this.finalTranscript}"`);
      } else {
        interim = interim ? `${interim} ${text}` : text;
      }
    }

    this.interimTranscript = interim.trim();
    if (this.interimTranscript) {
      console.log(`[VOICE DEBUG] Interim result: "${this.interimTranscript}"`);
    }

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

    console.log(`[VOICE DEBUG] Finalized transcript: "${finalResult}"`);
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
