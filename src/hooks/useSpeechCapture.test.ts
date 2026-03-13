// src/hooks/useSpeechCapture.test.ts
// AUD-01: Speech capture hook tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpeechCapture } from './useSpeechCapture';

// Fake SpeechRecognition class — lets tests manually trigger event handlers
class FakeSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

let fakeInstance: FakeSpeechRecognition;

beforeEach(() => {
  vi.stubGlobal('SpeechRecognition', class extends FakeSpeechRecognition {
    constructor() {
      super();
      fakeInstance = this;
    }
  });
});

describe('useSpeechCapture (AUD-01)', () => {
  it('accumulates final transcript segments with relative timestamps', () => {
    const capture = new SpeechCapture();
    const sessionStart = 1000;
    capture.start(sessionStart);

    // Simulate a final result event
    fakeInstance.onresult!({
      resultIndex: 0,
      results: [
        Object.assign(
          [{ transcript: 'hello world' }],
          { isFinal: true, length: 1 }
        ),
      ],
    });

    const segments = capture.stop();
    expect(segments).toHaveLength(1);
    expect(segments[0].isFinal).toBe(true);
    expect(segments[0].text).toBe('hello world');
    expect(segments[0].timestampMs).toBeGreaterThanOrEqual(0);
  });

  it('stores interim (non-final) segments with isFinal=false', () => {
    const capture = new SpeechCapture();
    capture.start(Date.now());

    fakeInstance.onresult!({
      resultIndex: 0,
      results: [
        Object.assign(
          [{ transcript: 'um...' }],
          { isFinal: false, length: 1 }
        ),
      ],
    });

    const segments = capture.stop();
    expect(segments).toHaveLength(1);
    expect(segments[0].isFinal).toBe(false);
  });

  it('auto-restarts recognition when onend fires while active', () => {
    const capture = new SpeechCapture();
    capture.start(Date.now());

    const firstInstance = fakeInstance;
    // Simulate Chrome's auto-stop on silence
    fakeInstance.onend!();

    // A new recognition instance should have been started
    expect(fakeInstance).not.toBe(firstInstance);
    expect(fakeInstance.start).toHaveBeenCalled();
  });

  it('stop() returns accumulated segments and subsequent onend does NOT restart', () => {
    const capture = new SpeechCapture();
    capture.start(Date.now());

    fakeInstance.onresult!({
      resultIndex: 0,
      results: [
        Object.assign(
          [{ transcript: 'test segment' }],
          { isFinal: true, length: 1 }
        ),
      ],
    });

    const segments = capture.stop();
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('test segment');

    // Capture the current fakeInstance after stop
    const instanceAfterStop = fakeInstance;

    // Trigger onend after stop — should NOT create a new instance
    instanceAfterStop.onend?.();

    // fakeInstance should remain the same (no new instance created)
    expect(fakeInstance).toBe(instanceAfterStop);
  });
});
