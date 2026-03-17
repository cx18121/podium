// src/analysis/pacing.test.ts
// AUD-03/AUD-04: Pacing and pause detection tests

import { describe, it, expect } from 'vitest';
import { detectPauses, calculateWPM, calculateWPMWindows, parsePauseDuration, classifyPause, computePauseStats, scorePauses } from './pacing';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';
import type { SessionEvent } from '../db/db';

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

describe('parsePauseDuration', () => {
  it('parsePauseDuration("3.0s pause") returns 3.0', () => {
    expect(parsePauseDuration('3.0s pause')).toBe(3.0);
  });

  it('parsePauseDuration(undefined) returns 0', () => {
    expect(parsePauseDuration(undefined)).toBe(0);
  });

  it('parsePauseDuration("malformed") returns 0', () => {
    expect(parsePauseDuration('malformed')).toBe(0);
  });
});

describe('classifyPause', () => {
  it('returns "deliberate" when last final segment ends with a period', () => {
    const transcript: TranscriptSegment[] = [
      { text: 'That is the point.', timestampMs: 4000, isFinal: true },
    ];
    expect(classifyPause(5000, transcript)).toBe('deliberate');
  });

  it('returns "deliberate" when last final segment ends with a question mark', () => {
    const transcript: TranscriptSegment[] = [
      { text: 'Are you sure?', timestampMs: 4000, isFinal: true },
    ];
    expect(classifyPause(5000, transcript)).toBe('deliberate');
  });

  it('returns "deliberate" when last final segment ends with an exclamation mark', () => {
    const transcript: TranscriptSegment[] = [
      { text: 'That is amazing!', timestampMs: 4000, isFinal: true },
    ];
    expect(classifyPause(5000, transcript)).toBe('deliberate');
  });

  it('returns "hesitation" when last final segment has no terminal punctuation', () => {
    const transcript: TranscriptSegment[] = [
      { text: 'and then we', timestampMs: 4000, isFinal: true },
    ];
    expect(classifyPause(5000, transcript)).toBe('hesitation');
  });

  it('returns "hesitation" when transcript is empty (conservative default)', () => {
    expect(classifyPause(5000, [])).toBe('hesitation');
  });
});

describe('computePauseStats', () => {
  it('returns zeros for empty event array', () => {
    const stats = computePauseStats([], []);
    expect(stats.total).toBe(0);
    expect(stats.averageDurationS).toBe(0);
    expect(stats.longestDurationS).toBe(0);
    expect(stats.hesitationCount).toBe(0);
    expect(stats.deliberateCount).toBe(0);
  });

  it('computes average and longest from label strings (2.0s + 4.5s => avg 3.25, longest 4.5)', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 3000, label: '2.0s pause' },
      { type: 'pause_detected', timestampMs: 8000, label: '4.5s pause' },
    ];
    const stats = computePauseStats(events, []);
    expect(stats.total).toBe(2);
    expect(stats.averageDurationS).toBe(3.25);
    expect(stats.longestDurationS).toBe(4.5);
  });

  it('counts hesitation vs deliberate correctly', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
      { type: 'pause_detected', timestampMs: 12000, label: '3.0s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'That is the point.', timestampMs: 4000, isFinal: true },
      { text: 'and then we', timestampMs: 11000, isFinal: true },
    ];
    const stats = computePauseStats(events, transcript);
    expect(stats.deliberateCount).toBe(1);
    expect(stats.hesitationCount).toBe(1);
  });
});

describe('scorePauses (ANAL-03)', () => {
  it('0 pause events returns score=85, detail matches /no significant pauses/i', () => {
    const result = scorePauses([], []);
    expect(result.score).toBe(85);
    expect(result.detail).toMatch(/no significant pauses/i);
  });

  it('1 mid-clause pause (no terminal punctuation) returns score=85 (100 - 1*15)', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'and then we', timestampMs: 4000, isFinal: true },
    ];
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(85);
  });

  it('1 sentence-boundary pause (terminal punctuation) returns score=100', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'That is the point.', timestampMs: 4000, isFinal: true },
    ];
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(100);
  });

  it('2 hesitation + 1 deliberate returns score=70 (100 - 2*15)', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
      { type: 'pause_detected', timestampMs: 12000, label: '3.0s pause' },
      { type: 'pause_detected', timestampMs: 18000, label: '2.0s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'and then we', timestampMs: 4000, isFinal: true },
      { text: 'That is the point.', timestampMs: 11000, isFinal: true },
      { text: 'so basically', timestampMs: 17000, isFinal: true },
    ];
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(70);
  });

  it('7 hesitation pauses returns score=0 (floor)', () => {
    const events: SessionEvent[] = Array.from({ length: 7 }, (_, i) => ({
      type: 'pause_detected' as const,
      timestampMs: (i + 1) * 5000,
      label: '2.5s pause',
    }));
    const transcript: TranscriptSegment[] = Array.from({ length: 7 }, (_, i) => ({
      text: 'and then we',
      timestampMs: (i + 1) * 5000 - 1000,
      isFinal: true,
    }));
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(0);
  });
});
