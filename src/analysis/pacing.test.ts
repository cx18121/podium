// src/analysis/pacing.test.ts
// AUD-03/AUD-04: Pacing and pause detection tests

import { describe, it, expect } from 'vitest';
import { detectPauses, calculateWPM, calculateWPMWindows } from './pacing';
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

describe('calculateWPMWindows (FOUND-02)', () => {
  it('returns empty array for empty segments', () => {
    expect(calculateWPMWindows([], 60000)).toEqual([]);
  });

  it('returns empty array when no segments are isFinal', () => {
    const segments: TranscriptSegment[] = [
      { text: 'interim text', timestampMs: 5000, isFinal: false },
    ];
    expect(calculateWPMWindows(segments, 60000)).toEqual([]);
  });

  it('returns one window for a 30s session with 60 words', () => {
    const segments: TranscriptSegment[] = [
      { text: Array(60).fill('word').join(' '), timestampMs: 5000, isFinal: true },
    ];
    const windows = calculateWPMWindows(segments, 30000);
    expect(windows).toHaveLength(1);
    expect(windows[0].wpm).toBe(120); // 60 words / 0.5 min
    expect(windows[0].startMs).toBe(0);
    expect(windows[0].endMs).toBe(30000);
    expect(windows[0].wordCount).toBe(60);
  });

  it('buckets segments into two windows for a 60s session', () => {
    const segments: TranscriptSegment[] = [
      { text: Array(30).fill('word').join(' '), timestampMs: 10000, isFinal: true },
      { text: Array(15).fill('word').join(' '), timestampMs: 40000, isFinal: true },
    ];
    const windows = calculateWPMWindows(segments, 60000);
    expect(windows).toHaveLength(2);
    expect(windows[0].startMs).toBe(0);
    expect(windows[0].wordCount).toBe(30);
    expect(windows[1].startMs).toBe(30000);
    expect(windows[1].wordCount).toBe(15);
  });

  it('clamps last window endMs to durationMs', () => {
    const segments: TranscriptSegment[] = [
      { text: Array(10).fill('word').join(' '), timestampMs: 65000, isFinal: true },
    ];
    const windows = calculateWPMWindows(segments, 75000);
    expect(windows).toHaveLength(1);
    expect(windows[0].startMs).toBe(60000);
    expect(windows[0].endMs).toBe(75000); // clamped, not 90000
    // 10 words / (15000ms / 60000) = 10 / 0.25 = 40 wpm
    expect(windows[0].wpm).toBe(40);
  });

  it('assigns segment at exactly 30000ms to window index 1', () => {
    const segments: TranscriptSegment[] = [
      { text: 'hello world', timestampMs: 30000, isFinal: true },
    ];
    const windows = calculateWPMWindows(segments, 60000);
    expect(windows).toHaveLength(1);
    expect(windows[0].startMs).toBe(30000);
    expect(windows[0].endMs).toBe(60000);
  });

  it('returns windows sorted by startMs', () => {
    const segments: TranscriptSegment[] = [
      { text: 'late words', timestampMs: 95000, isFinal: true },
      { text: 'early words', timestampMs: 5000, isFinal: true },
      { text: 'mid words', timestampMs: 45000, isFinal: true },
    ];
    const windows = calculateWPMWindows(segments, 120000);
    expect(windows).toHaveLength(3);
    expect(windows[0].startMs).toBeLessThan(windows[1].startMs);
    expect(windows[1].startMs).toBeLessThan(windows[2].startMs);
  });
});
