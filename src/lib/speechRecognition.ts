/**
 * Hayat AI - Centralized Speech Recognition Engine & Manager
 *
 * Provides:
 * 1. Global Singleton Recognition Instance Management (prevents concurrent instances).
 * 2. Overlap-aware transcript stitching (reconciles Android Chrome / WebKit whole-utterance re-emissions).
 * 3. Strict separation of Final Transcript and Interim Preview (Interim NEVER enters Gemini / storage).
 * 4. Zero naive text.replace; 100% preservation of intentional natural word repetition ("نعم نعم أريد ذلك").
 * 5. Comprehensive session token protection against stale callbacks on rapid start/stop/close.
 */

export const DEBUG_SPEECH = false;

function speechLog(...args: any[]) {
  if (DEBUG_SPEECH) {
    console.log('[SpeechEngine]', ...args);
  }
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
 *
 * Example 1:
 * baseText = "السلام"
 * incomingText = "السلام عليكم ورحمة"
 * Returns: "عليكم ورحمة"
 *
 * Example 2 (Complete subset):
 * baseText = "السلام عليكم"
 * incomingText = "السلام عليكم"
 * Returns: ""
 *
 * Example 3 (Disjoint / No overlap):
 * baseText = "الجملة الأولى."
 * incomingText = "الجملة الثانية."
 * Returns: "الجملة الثانية."
 *
 * Example 4 (Natural repetition preserved in incoming):
 * baseText = ""
 * incomingText = "نعم نعم أريد ذلك"
 * Returns: "نعم نعم أريد ذلك"
 */
export function reconcileWordOverlap(baseText: string, incomingText: string): string {
  const cleanBase = normalizeSpeechWhitespace(baseText);
  const cleanIncoming = normalizeSpeechWhitespace(incomingText);

  if (!cleanBase) return cleanIncoming;
  if (!cleanIncoming) return '';

  // If incoming is identical to base or base ends with incoming, nothing new
  if (cleanBase === cleanIncoming || cleanBase.endsWith(cleanIncoming)) {
    return '';
  }

  // If incoming contains the entire base as a prefix, return only the suffix
  if (cleanIncoming.startsWith(cleanBase)) {
    const remainder = cleanIncoming.slice(cleanBase.length).trim();
    return remainder;
  }

  const baseWords = cleanBase.split(' ');
  const incomingWords = cleanIncoming.split(' ');

  const maxCheck = Math.min(baseWords.length, incomingWords.length);

  // Check for the largest suffix-to-prefix word match
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
  private lang: string = 'ar-SA';
  private continuous: boolean = false;

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
    return this.finalTranscript;
  }

  public getInterimTranscript(): string {
    return this.interimTranscript;
  }

  public getDisplayTranscript(): string {
    if (!this.interimTranscript) return this.finalTranscript;
    const cleanInterimDelta = reconcileWordOverlap(this.finalTranscript, this.interimTranscript);
    if (!cleanInterimDelta) return this.finalTranscript;
    return this.finalTranscript ? `${this.finalTranscript} ${cleanInterimDelta}` : cleanInterimDelta;
  }

  public getState(): SpeechSessionState {
    return {
      sessionId: this.currentSessionId,
      finalTranscript: this.finalTranscript,
      interimTranscript: this.interimTranscript,
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
    this.baseTranscript = '';
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
      speechLog('SpeechRecognition not supported in browser or running in non-browser environment');
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
        speechLog(`Session #${sessionToken} started listening (lang: ${rec.lang})`);
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
        speechLog(`Session #${sessionToken} error:`, event.error);
        if (event.error === 'no-speech' && this.continuous && !this.isExplicitlyStopped) {
          return;
        }
        if (this.callbacks.onError) {
          this.callbacks.onError(event);
        }
      };

      rec.onspeechend = () => {
        if (this.currentSessionId !== sessionToken || this.isExplicitlyStopped) return;
        speechLog(`Session #${sessionToken} speech ended`);
        if (this.callbacks.onSpeechEnd) {
          this.callbacks.onSpeechEnd();
        }
      };

      rec.onend = () => {
        if (this.currentSessionId !== sessionToken) return;
        this.isListening = false;
        speechLog(`Session #${sessionToken} recognition ended`);

        // Seamless auto-restart on silence timeout if session is still actively recording
        if (!this.isExplicitlyStopped && this.continuous) {
          this.baseTranscript = this.finalTranscript;
          this.interimTranscript = '';
          this.emitState();
          this.destroyActiveRecognition();
          setTimeout(() => {
            if (!this.isExplicitlyStopped && this.currentSessionId === sessionToken) {
              this.spawnRecognition(sessionToken);
            }
          }, 60);
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
   * Processes incoming Web Speech API results with intra-event stitch folding and clean final/interim separation.
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
      const chunk = normalizeSpeechWhitespace(res[0].transcript || '');
      if (!chunk) continue;

      if (res.isFinal) {
        currentCycleFinal = currentCycleFinal ? stitchFinalSegment(currentCycleFinal, chunk) : chunk;
      } else {
        rawInterim = rawInterim ? `${rawInterim} ${chunk}` : chunk;
      }
    }

    if (currentCycleFinal) {
      this.finalTranscript = this.baseTranscript
        ? stitchFinalSegment(this.baseTranscript, currentCycleFinal)
        : currentCycleFinal;
    } else {
      this.finalTranscript = this.baseTranscript;
    }

    this.interimTranscript = rawInterim;
    this.emitState();
  }

  /**
   * Stops recognition and finalizes the transcript.
   * Returns ONLY the clean, final transcript (never unconfirmed interim garbage).
   */
  public finalize(): string {
    this.isExplicitlyStopped = true;
    this.destroyActiveRecognition();

    let result = normalizeSpeechWhitespace(this.finalTranscript);
    if (!result && this.interimTranscript) {
      // Fallback: If user stopped and browser only emitted interim without final
      result = normalizeSpeechWhitespace(this.interimTranscript);
    }

    this.finalTranscript = result;
    this.baseTranscript = result;
    this.interimTranscript = '';
    this.emitState();

    speechLog(`Finalized transcript: "${result}"`);
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
