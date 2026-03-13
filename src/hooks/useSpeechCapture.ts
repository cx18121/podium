// src/hooks/useSpeechCapture.ts
// AUD-01: Wraps Web Speech API for continuous speech capture during a session.
// Accumulates transcript segments with timestamps relative to session start.
// Auto-restarts recognition when Chrome fires onend during active capture.

export interface TranscriptSegment {
  text: string;
  timestampMs: number; // wall clock relative to session start
  isFinal: boolean;
}

export class SpeechCapture {
  private recognition: any | null = null;
  private segments: TranscriptSegment[] = [];
  private active = false;
  private sessionStartMs = 0;

  start(sessionStartMs: number): void {
    this.sessionStartMs = sessionStartMs;
    this.segments = [];
    this.active = true;
    this.startRecognition();
  }

  private startRecognition(): void {
    if (!this.active) return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        this.segments.push({
          text: result[0].transcript,
          timestampMs: Date.now() - this.sessionStartMs,
          isFinal: result.isFinal,
        });
      }
    };

    // Auto-restart on silence timeout.
    // Chrome fires onend after ~7-10s of silence even with continuous=true.
    // CRITICAL: check this.active before restarting — stop() also triggers onend,
    // and without the check, stop() would trigger an infinite restart loop.
    rec.onend = () => {
      if (this.active) this.startRecognition();
    };

    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech' && this.active) this.startRecognition();
    };

    rec.start();
    this.recognition = rec;
  }

  stop(): TranscriptSegment[] {
    this.active = false;
    this.recognition?.stop();
    this.recognition = null;
    return [...this.segments];
  }
}
