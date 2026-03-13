// src/analysis/fillerDetector.test.ts
// AUD-02: Filler word detection tests

import { describe, it, expect } from 'vitest';
import { detectFillers } from './fillerDetector';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

describe('fillerDetector (AUD-02)', () => {
  it('detects "um" in a final segment transcript', () => {
    const segments: TranscriptSegment[] = [
      { text: 'I um think so', timestampMs: 500, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'filler_word',
      timestampMs: 500,
      label: 'um',
    });
  });

  it('detects "uh" and related fillers, normalizing "uhh" to "uh"', () => {
    const segments: TranscriptSegment[] = [
      { text: 'uhh like you know', timestampMs: 1000, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(3);
    const labels = events.map(e => e.label);
    expect(labels).toContain('uh');
    expect(labels).toContain('like');
    expect(labels).toContain('you know');
  });

  it('ignores non-final (interim) segments', () => {
    const segments: TranscriptSegment[] = [
      { text: 'um um', timestampMs: 200, isFinal: false },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const events = detectFillers([]);
    expect(events).toHaveLength(0);
  });
});
