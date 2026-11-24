/**
 * Hayat AI - Centralized Native Web Speech Recognition Engine
 *
 * Suffix-Prefix Overlap-Aware Continuous Recognition Architecture:
 * 1. Separation of User Recording Session from Disposable Browser SpeechRecognition Instances.
 * 2. Auto-reconnect with 80ms debounce upon browser onend silence timeout (continuous 30+ minute recording).
 * 3. Overlap-aware transcript merging (mergeTranscriptWithNewSegment):
 *    - Resolves Android Chrome / WebKit expanding result re-emits ("السلام عليكم" -> "السلام عليكم ورحمة الله").
 *    - Resolves exact and partial audio buffer replays across reconnects.
 *    - Preserves 100% of user's intentional repetitions within utterances (e.g. "أنا أنا كنت بفكر").
 * 4. Generation-token protection ensuring stale callbacks from previous instances are ignored.
 * 5. Decoupled from MediaRecorder and Gemini (Zero API requests during live transcription).
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

/**
 * Normalizes whitespace: collapses multiple consecutive spaces into a single space and trims edges.
 */
export function normalizeSpeechWhitespace(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Finds the maximum word-level overlap where the end of baseText matches the beginning of incomingText.
 * Returns the non-overlapping remaining part of incomingText.
 */
export function reconcileWordOverlap(baseText: string, incomingText: string): string {
  const cleanBase = normalizeSpeechWhitespace(baseText);
  const cleanIncoming = normalizeSpeechWhitespace(incomingText);

  if (!cleanBase) return cleanIncoming;
  if (!cleanIncoming) return '';

  if (cleanBase === cleanIncoming || cleanBase.endsWith(cleanIncoming)) {
    return '';
  }

  if (cleanIncoming.startsWith(cleanBase)) {
    const remainder = cleanIncoming.slice(cleanBase.length).trim();
    return remainder;
  }

  const baseWords = cleanBase.split(' ');
  const incomingWords = cleanIncoming.split(' ');
  const maxCheck = Math.min(baseWords.length, incomingWords.length);

  for (let overlapLen = maxCheck; overlapLen > 0; overlapLen--) {
    const baseSuffix = baseWords.slice(baseWords.length - overlapLen).join(' ');
    const incomingPrefix = incomingWords.slice(0, overlapLen).join(' ');

    if (baseSuffix.toLowerCase() === incomingPrefix.toLowerCase()) {
      const remainingWords = incomingWords.slice(overlapLen);
      return remainingWords.join(' ');
    }
  }

  return cleanIncoming;
}

/**
 * Pure function to stitch a new final segment into the accumulated final transcript.
 */
export function stitchFinalSegment(currentFinal: string, newSegment: string): string {
  const cleanCurrent = normalizeSpeechWhitespace(currentFinal);
  const cleanSegment = normalizeSpeechWhitespace(newSegment);

  if (!cleanCurrent) return cleanSegment;
  if (!cleanSegment) return cleanCurrent;

  const delta = reconcileWordOverlap(cleanCurrent, cleanSegment);
  if (!delta) return cleanCurrent;

  return `${cleanCurrent} ${delta}`;
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

  /**
   * Intelligently merges an incoming speech segment into an existing transcript,
   * detecting and stripping suffix-prefix overlaps generated by WebKit/Android Chrome.
   */
  public mergeTranscriptWithSegment(existingText: string, newSegment: string): string {
    const existingTrimmed = existingText.trim();
    const segmentTrimmed = newSegment.trim();
    if (!existingTrimmed) return segmentTrimmed;
    if (!segmentTrimmed) return existingTrimmed;

    const existingWords = existingTrimmed.split(/\s+/);
    const newWords = segmentTrimmed.split(/\s+/);

    const normWord = (w: string) => w.replace(/[\p{P}\s]+/gu, '').toLowerCase();
    const normExisting = existingWords.map(normWord);
    const normNew = newWords.map(normWord);

    const maxOverlap = Math.min(existingWords.length, newWords.length);
    let overlapLen = 0;

    for (let len = maxOverlap; len > 0; len--) {
      let match = true;
      for (let i = 0; i < len; i++) {
        const existIdx = existingWords.length - len + i;
        if (normExisting[existIdx] !== normNew[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        overlapLen = len;
        break;
      }
    }

    if (overlapLen === newWords.length) {
      return existingTrimmed;
    }

    const nonOverlappingNewWords = newWords.slice(overlapLen).join(' ');
    return `${existingTrimmed} ${nonOverlappingNewWords}`;
  }

  public getDisplayTranscript(): string {
    const interimPart = this.getInterimTranscript();
    if (!interimPart) return this.getFinalTranscript();
    return this.mergeTranscriptWithSegment(this.committedTranscript, interimPart);
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
        this.processRecognitionEvent(event, sessionToken);
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
   * Processes incoming Web Speech API results using the standard event.resultIndex loop.
   */
  public processRecognitionEvent(event: any, sessionToken?: number): void {
    const targetSession = sessionToken ?? this.userSessionId;
    if (!event || !event.results || targetSession !== this.userSessionId || this.isExplicitlyStopped) {
      return;
    }

    const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;
    for (let i = startIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (!result || !result[0]) continue;
      const text = (result[0].transcript || '').trim();
      if (!text) continue;

      if (result.isFinal) {
        this.activeInterimMap.delete(i);

        // A browser result index in this instance may be processed exactly once
        if (!this.activeCommittedIndices.has(i)) {
          this.activeCommittedIndices.add(i);
          this.committedTranscript = this.mergeTranscriptWithSegment(this.committedTranscript, text);
        }
      } else {
        this.activeInterimMap.set(i, text);
      }
    }

    this.emitState();
  }

  /**
   * Finalizes recognition and returns the complete final transcript.
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    // If an interim fragment remains, merge it cleanly
    const remainingInterim = this.getInterimTranscript();
    if (remainingInterim) {
      this.committedTranscript = this.mergeTranscriptWithSegment(this.committedTranscript, remainingInterim);
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
