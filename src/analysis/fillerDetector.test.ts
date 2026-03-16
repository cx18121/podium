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

  // --- Phase 6 expansion: new single-word fillers ---

  it('detects new single-word fillers: so, actually, basically, right, okay', () => {
    const segments: TranscriptSegment[] = [
      { text: 'so actually I think basically right okay', timestampMs: 100, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(5);
    const labels = events.map(e => e.label);
    expect(labels).toContain('so');
    expect(labels).toContain('actually');
    expect(labels).toContain('basically');
    expect(labels).toContain('right');
    expect(labels).toContain('okay');
  });

  it('detects multi-word fillers: you know what, kind of, sort of, i mean', () => {
    const segments: TranscriptSegment[] = [
      { text: 'you know what kind of sort of i mean', timestampMs: 200, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(4);
    const labels = events.map(e => e.label);
    expect(labels).toContain('you know what');
    expect(labels).toContain('kind of');
    expect(labels).toContain('sort of');
    expect(labels).toContain('i mean');
  });

  it('does NOT double-match "you know what" as both "you know" and "you know what"', () => {
    const segments: TranscriptSegment[] = [
      { text: 'you know what I mean', timestampMs: 300, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('you know what');
  });

  // --- Phase 6 expansion: context-aware "like" suppression ---

  it('does NOT flag "like" after linking verb ("was like")', () => {
    const segments: TranscriptSegment[] = [
      { text: 'it was like magic', timestampMs: 400, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(0);
  });

  it('does NOT flag "like" before article — preference context ("I like the pizza")', () => {
    const segments: TranscriptSegment[] = [
      { text: 'I like the pizza', timestampMs: 500, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(0);
  });

  it('DOES flag "like" at start of clause ("like I was saying")', () => {
    const segments: TranscriptSegment[] = [
      { text: 'like I was saying', timestampMs: 600, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('like');
  });

  it('DOES flag "like" mid-sentence when not suppressed ("and like um")', () => {
    const segments: TranscriptSegment[] = [
      { text: 'and like um', timestampMs: 700, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(2);
    const labels = events.map(e => e.label);
    expect(labels).toContain('like');
    expect(labels).toContain('um');
  });

  it('does NOT flag "like" after "feels" (linking verb inflection)', () => {
    const segments: TranscriptSegment[] = [
      { text: 'it feels like something', timestampMs: 800, isFinal: true },
    ];
    const events = detectFillers(segments);
    expect(events).toHaveLength(0);
  });
});
