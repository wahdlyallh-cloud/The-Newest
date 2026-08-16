/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Single-Instance Direct-Mapping Architecture:
 * - One active SpeechRecognition instance per recording session.
 * - Deterministic, stateless reconstruction from event.results (impossible to produce duplicate events/words).
 * - Immediate live interim text rendering with seamless transition to confirmed final text.
 * - Zero automatic restart loops, eliminating background instance races.
 * - Decoupled from MediaRecorder and Gemini.
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

  private currentSessionId: number = 0;
  private activeRecognition: any = null;
  private isListening: boolean = false;
  private confirmedText: string = '';
  private interimText: string = '';

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
    return this.currentSessionId;
  }

  public getFinalTranscript(): string {
    return this.confirmedText.trim();
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
        // ignore already stopped errors
      }
    }
    this.isListening = false;
  }

  /**
   * Starts a new single recognition session.
   */
  public startSession(options: {
    lang?: string;
    continuous?: boolean;
    callbacks?: SpeechManagerCallbacks;
  } = {}): number {
    this.destroyActiveRecognition();

    this.currentSessionId += 1;
    const sessionToken = this.currentSessionId;

    this.confirmedText = '';
    this.interimText = '';
    this.callbacks = options.callbacks || {};
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    const SpeechRec = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRec) {
      if (this.callbacks.onError) {
        this.callbacks.onError({ error: 'not-supported' });
      }
      return sessionToken;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = this.lang;
      rec.continuous = this.continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        if (sessionToken !== this.currentSessionId) return;
        this.isListening = true;
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (sessionToken !== this.currentSessionId) return;

        let confirmed = '';
        let interim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
          const text = (res[0].transcript || '').trim();
          if (!text) continue;

          if (res.isFinal) {
            confirmed = confirmed ? `${confirmed} ${text}` : text;
          } else {
            interim = interim ? `${interim} ${text}` : text;
          }
        }

        this.confirmedText = confirmed.trim();
        this.interimText = interim.trim();
        this.emitState();
      };

      rec.onerror = (event: any) => {
        if (sessionToken !== this.currentSessionId) return;

        if (event.error === 'language-not-supported' && this.lang !== 'ar-SA') {
          this.lang = 'ar-SA';
          this.destroyActiveRecognition();
          this.startSession(options);
          return;
        }

        if (event.error === 'no-speech') {
          return;
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
        this.emitState();
      };

      rec.onspeechend = () => {
        if (sessionToken !== this.currentSessionId) return;
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (sessionToken !== this.currentSessionId) return;
        this.isListening = false;
        this.emitState();
      };

      this.activeRecognition = rec;
      rec.start();
    } catch (err: any) {
      if (this.callbacks.onError) {
        this.callbacks.onError(err);
      }
      this.emitState();
    }

    return sessionToken;
  }

  public start(options?: { lang?: string; continuous?: boolean; callbacks?: SpeechManagerCallbacks }): number {
    return this.startSession(options);
  }

  /**
   * Finalizes recognition and returns the complete final transcript.
   */
  public finalize(): string {
    this.destroyActiveRecognition();
    const finalResult = this.getDisplayTranscript();
    this.confirmedText = finalResult;
    this.interimText = '';
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
    this.destroyActiveRecognition();
    this.confirmedText = '';
    this.interimText = '';
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
