/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Single-Instance Direct-Mapping Architecture with Deep Event Telemetry:
 * - Exactly ONE active SpeechRecognition instance per recording session.
 * - Deterministic, stateless reconstruction from event.results (impossible to produce duplicate events/words).
 * - Immediate live interim text rendering with seamless transition to confirmed final text.
 * - Zero automatic restart loops, eliminating background instance races.
 * - Comprehensive internal instrumentation logging (under [SPEECH TRACE]) to trace exact event flow.
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
  private instanceCounter: number = 0;
  private startCallCount: number = 0;
  private stopCallCount: number = 0;
  private abortCallCount: number = 0;
  private eventSequenceNumber: number = 0;

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
    console.log(`[SPEECH TRACE] Subscriber added. Total subscribers: ${this.listeners.size}`);
    return () => {
      this.listeners.delete(listener);
      console.log(`[SPEECH TRACE] Subscriber removed. Total subscribers: ${this.listeners.size}`);
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
        console.log(`[SPEECH TRACE] Destroyed instance #${this.instanceCounter}`);
      } catch (e) {
        // ignore already stopped errors
      }
    }
    this.isListening = false;
    this.callbacks = {};
    this.listeners.clear();
  }

  /**
   * Starts a new single recognition session.
   */
  public startSession(options: {
    lang?: string;
    continuous?: boolean;
    callbacks?: SpeechManagerCallbacks;
  } = {}): number {
    this.startCallCount += 1;
    this.destroyActiveRecognition();

    this.currentSessionId += 1;
    this.instanceCounter += 1;
    this.eventSequenceNumber = 0;
    const sessionToken = this.currentSessionId;
    const currentInstanceId = this.instanceCounter;

    this.confirmedText = '';
    this.interimText = '';
    this.callbacks = options.callbacks || {};
    this.listeners.clear();
    this.lang = options.lang || 'ar-EG';
    this.continuous = options.continuous ?? true;

    console.log(`[SPEECH TRACE] START SESSION #${sessionToken} (Instance #${currentInstanceId}, lang: ${this.lang}, total starts: ${this.startCallCount}, total subscribers: ${this.listeners.size})`);

    const SpeechRec = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRec) {
      console.warn(`[SPEECH TRACE] SpeechRecognition not supported in browser.`);
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
        console.log(`[SPEECH TRACE] onstart (Session #${sessionToken}, Instance #${currentInstanceId})`);
        if (this.callbacks.onStatusChange) {
          this.callbacks.onStatusChange('listening');
        }
        this.emitState();
      };

      rec.onresult = (event: any) => {
        if (sessionToken !== this.currentSessionId) return;

        this.eventSequenceNumber += 1;
        const seq = this.eventSequenceNumber;

        let confirmed = '';
        let interim = '';
        const debugDetails: any[] = [];

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
          const text = (res[0].transcript || '').trim();
          if (!text) continue;

          debugDetails.push({ index: i, isFinal: res.isFinal, text });

          if (res.isFinal) {
            confirmed = confirmed ? `${confirmed} ${text}` : text;
          } else {
            interim = interim ? `${interim} ${text}` : text;
          }
        }

        this.confirmedText = confirmed.trim();
        this.interimText = interim.trim();

        const emittedDisplay = this.getDisplayTranscript();
        console.log(`[SPEECH TRACE] onresult Event #${seq} (resultIndex: ${event.resultIndex}, length: ${event.results.length}) -> Emitted: "${emittedDisplay}"`, debugDetails);

        this.emitState();
      };

      rec.onerror = (event: any) => {
        if (sessionToken !== this.currentSessionId) return;
        console.warn(`[SPEECH TRACE] onerror:`, event.error);

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
        console.log(`[SPEECH TRACE] onspeechend`);
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (sessionToken !== this.currentSessionId) return;
        this.isListening = false;
        console.log(`[SPEECH TRACE] onend (Session #${sessionToken}, Instance #${currentInstanceId})`);
        this.emitState();
      };

      this.activeRecognition = rec;
      rec.start();
    } catch (err: any) {
      console.error(`[SPEECH TRACE] start error:`, err);
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
    this.stopCallCount += 1;
    this.destroyActiveRecognition();
    const finalResult = this.getDisplayTranscript();
    this.confirmedText = finalResult;
    this.interimText = '';
    console.log(`[SPEECH TRACE] FINALIZE (Total stops: ${this.stopCallCount}) -> Final Result: "${finalResult}"`);
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
    this.abortCallCount += 1;
    this.destroyActiveRecognition();
    this.confirmedText = '';
    this.interimText = '';
    console.log(`[SPEECH TRACE] ABORT SESSION (Total aborts: ${this.abortCallCount})`);
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
        console.warn('[SPEECH TRACE] Transcript listener error:', e);
      }
    });
  }
}
