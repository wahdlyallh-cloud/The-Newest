/**
 * Pure TypeScript 16kHz Mono PCM -> WAV Encoder & Audio Stream Chunker.
 * Zero microphone conflict on Android Capacitor: attaches to the already-running
 * MediaStream via AudioContext and ScriptProcessor/AudioWorklet.
 */

export interface AudioChunkerOptions {
  chunkDurationMs?: number; // e.g. 4000ms (4 seconds)
  energyThreshold?: number; // RMS threshold to detect spoken voice vs dead silence
  onChunkReady: (wavBlob: Blob, rms: number) => void;
}

export class LiveAudioChunker {
  private audioContext: AudioContext | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private pcmBuffers: Float32Array[] = [];
  private totalSamples = 0;
  private targetSampleRate = 16000;
  private chunkDurationMs: number;
  private energyThreshold: number;
  private onChunkReady: (wavBlob: Blob, rms: number) => void;
  private isRunning = false;

  constructor(options: AudioChunkerOptions) {
    this.chunkDurationMs = options.chunkDurationMs || 4000;
    this.energyThreshold = options.energyThreshold || 0.012;
    this.onChunkReady = options.onChunkReady;
  }

  /**
   * Start capturing PCM from an existing active MediaStream
   */
  public start(stream: MediaStream): boolean {
    if (this.isRunning) return true;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('[LiveAudioChunker] AudioContext not supported');
        return false;
      }

      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.mediaSource = this.audioContext.createMediaStreamSource(stream);
      // Buffer size 4096 gives low CPU overhead
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.pcmBuffers = [];
      this.totalSamples = 0;
      this.isRunning = true;

      const samplesPerChunk = Math.floor((this.targetSampleRate * this.chunkDurationMs) / 1000);
      const inputSampleRate = this.audioContext.sampleRate;

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isRunning) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Downsample inputData to 16kHz
        const downsampled = this.downsampleTo16k(inputData, inputSampleRate, this.targetSampleRate);
        if (downsampled.length > 0) {
          this.pcmBuffers.push(downsampled);
          this.totalSamples += downsampled.length;

          if (this.totalSamples >= samplesPerChunk) {
            this.emitChunk();
          }
        }
      };

      this.mediaSource.connect(this.scriptProcessor);
      // Connect to destination to keep processing alive in WebKit/Blink
      this.scriptProcessor.connect(this.audioContext.destination);

      return true;
    } catch (err) {
      console.warn('[LiveAudioChunker] Failed to attach audio processor:', err);
      this.stop();
      return false;
    }
  }

  /**
   * Downsamples arbitrary audio buffer into 16kHz mono PCM Float32Array
   */
  private downsampleTo16k(
    inputBuffer: Float32Array,
    inputRate: number,
    targetRate: number
  ): Float32Array {
    if (inputRate === targetRate) {
      return new Float32Array(inputBuffer);
    }
    const ratio = inputRate / targetRate;
    const newLength = Math.round(inputBuffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < inputBuffer.length; i++) {
        accum += inputBuffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * Calculates Root Mean Square (RMS) energy to detect audible speech
   */
  private calculateRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / (buffer.length || 1));
  }

  /**
   * Flushes and emits current accumulated buffer as WAV if voice energy is sufficient
   */
  public emitChunk(): void {
    if (this.pcmBuffers.length === 0 || this.totalSamples === 0) return;

    // Merge buffers
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const b of this.pcmBuffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    this.pcmBuffers = [];
    this.totalSamples = 0;

    const rms = this.calculateRms(merged);
    // Ignore near-silent chunks to save API quota and avoid hallucinations
    if (rms < this.energyThreshold) {
      return;
    }

    const wavBlob = this.encodeWav(merged, this.targetSampleRate);
    if (wavBlob.size > 100) {
      this.onChunkReady(wavBlob, rms);
    }
  }

  /**
   * Encodes Float32Array to 16-bit Mono WAV format Blob
   */
  private encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF identifier */
    writeString(0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(8, 'WAVE');
    /* format chunk identifier */
    writeString(12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM) */
    view.setUint16(20, 1, true);
    /* channel count (1 mono) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sampleRate * 2) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample (16 bit) */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // Write 16-bit PCM samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  /**
   * Stop processing, flush tail audio, and close AudioContext cleanly
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Flush remaining speech if any
    try {
      this.emitChunk();
    } catch (_) {}

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
        this.scriptProcessor.onaudioprocess = null;
      } catch (_) {}
      this.scriptProcessor = null;
    }

    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (_) {}
      this.mediaSource = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (_) {}
      this.audioContext = null;
    }

    this.pcmBuffers = [];
    this.totalSamples = 0;
  }
}
