// src/analysis/pacing.test.ts
// AUD-03/AUD-04: Pacing and pause detection tests

import { describe, it, expect } from 'vitest';
import { detectPauses, calculateWPM } from './pacing';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

describe('pacing (AUD-03/AUD-04)', () => {
  it('calculateWPM returns correct WPM for known word count and duration', () => {
    // 120 words over 60000ms = 1 minute = 120 WPM
    const segments: TranscriptSegment[] = [
      { text: Array(120).fill('word').join(' '), timestampMs: 1000, isFinal: true },
    ];
    expect(calculateWPM(segments, 60000)).toBe(120);
  });

  it('calculateWPM returns 0 when duration is 0ms (no divide by zero)', () => {
    const segments: TranscriptSegment[] = [
      { text: 'hello world', timestampMs: 0, isFinal: true },
    ];
    expect(calculateWPM(segments, 0)).toBe(0);
  });

  it('calculateWPM returns 0 for empty segments', () => {
    expect(calculateWPM([], 60000)).toBe(0);
  });

  it('detectPauses returns pause_detected event for gap > 2000ms between final segments', () => {
    const segments: TranscriptSegment[] = [
      { text: 'first', timestampMs: 1000, isFinal: true },
      { text: 'second', timestampMs: 4000, isFinal: true }, // 3000ms gap
    ];
    const events = detectPauses(segments);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'pause_detected',
      timestampMs: 1000,
      label: '3.0s pause',
    });
  });

  it('detectPauses ignores gaps <= 2000ms', () => {
    const segments: TranscriptSegment[] = [
      { text: 'first', timestampMs: 1000, isFinal: true },
      { text: 'second', timestampMs: 2500, isFinal: true }, // 1500ms gap — below threshold
    ];
    const events = detectPauses(segments);
    expect(events).toHaveLength(0);
  });

  it('detectPauses returns empty array for single segment', () => {
    const segments: TranscriptSegment[] = [
      { text: 'only one', timestampMs: 500, isFinal: true },
    ];
    const events = detectPauses(segments);
    expect(events).toHaveLength(0);
  });
});
