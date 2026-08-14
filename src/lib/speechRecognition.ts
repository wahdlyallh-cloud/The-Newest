/**
 * Hayat AI - High Precision Speech Recognition Processing Layer
 * 
 * Provides strict separation between FINAL and INTERIM transcripts,
 * idempotent result-index parsing to prevent cumulative repetition (e.g. "السلامالسلام"),
 * space normalization, and session-token protection against stale callbacks.
 */

export interface SpeechParseResult {
  finalTranscript: string;
  interimTranscript: string;
  displayTranscript: string;
}

/**
 * Clean and normalize text by trimming leading/trailing whitespace
 * and collapsing multiple consecutive whitespace characters into a single space.
 */
export function normalizeSpeechWhitespace(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Session-based Speech Recognition Tracker that ensures idempotency,
 * clean spacing, and zero cumulative duplication.
 */
export class SpeechSessionTracker {
  private sessionId: number = 0;
  private finalSegments: Map<number, string> = new Map();
  private lastInterim: string = '';

  /**
   * Starts a new speech recognition session, increments the session ID,
   * and clears previous session data.
   */
  public startNewSession(): number {
    this.sessionId += 1;
    this.finalSegments.clear();
    this.lastInterim = '';
    return this.sessionId;
  }

  public getSessionId(): number {
    return this.sessionId;
  }

  public isSessionActive(id: number): boolean {
    return this.sessionId === id;
  }

  /**
   * Resets the current session buffers.
   */
  public reset(): void {
    this.finalSegments.clear();
    this.lastInterim = '';
  }

  /**
   * Processes a SpeechRecognitionEvent safely.
   * If sessionToken is provided and doesn't match the active session, the event is ignored.
   */
  public processEvent(event: any, sessionToken?: number): SpeechParseResult {
    if (sessionToken !== undefined && sessionToken !== this.sessionId) {
      return this.getCurrentResult();
    }

    if (!event || !event.results) {
      return this.getCurrentResult();
    }

    const interimChunks: string[] = [];

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      if (!res || !res[0]) continue;

      const transcriptChunk = normalizeSpeechWhitespace(res[0].transcript || '');
      if (!transcriptChunk) continue;

      if (res.isFinal) {
        // Confirmed final segment: stored uniquely by its result index
        this.finalSegments.set(i, transcriptChunk);
      } else {
        // Interim segment: accumulated only for the current unconfirmed event
        interimChunks.push(transcriptChunk);
      }
    }

    this.lastInterim = normalizeSpeechWhitespace(interimChunks.join(' '));
    return this.getCurrentResult();
  }

  /**
   * Returns the concatenated and normalized final transcript.
   */
  public getFinalTranscript(): string {
    const sortedIndices = Array.from(this.finalSegments.keys()).sort((a, b) => a - b);
    const finalParts = sortedIndices
      .map(idx => this.finalSegments.get(idx)!)
      .filter(Boolean);
    return normalizeSpeechWhitespace(finalParts.join(' '));
  }

  /**
   * Returns the current interim hypothesis.
   */
  public getInterimTranscript(): string {
    return this.lastInterim;
  }

  /**
   * Returns the current combined result for UI display and AI submission.
   */
  public getCurrentResult(): SpeechParseResult {
    const finalTranscript = this.getFinalTranscript();
    const interimTranscript = this.getInterimTranscript();
    
    let displayTranscript = finalTranscript;
    if (interimTranscript) {
      displayTranscript = finalTranscript 
        ? `${finalTranscript} ${interimTranscript}` 
        : interimTranscript;
    }

    return {
      finalTranscript,
      interimTranscript,
      displayTranscript: normalizeSpeechWhitespace(displayTranscript)
    };
  }

  /**
   * Finalizes the transcript when speech ends.
   * Prefers confirmed final transcript; falls back to interim only if no final was emitted.
   */
  public finalize(): string {
    const finalTxt = this.getFinalTranscript();
    if (finalTxt) return finalTxt;
    return normalizeSpeechWhitespace(this.lastInterim);
  }
}
