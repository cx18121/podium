// src/analysis/fillerBreakdown.test.ts
import { describe, it, expect } from 'vitest';
import { computeFillerBreakdown } from './fillerBreakdown';
import type { SessionEvent } from '../db/db';

describe('computeFillerBreakdown (ANAL-04, ANAL-05)', () => {
  it('empty events returns all zeros and null peakThird', () => {
    const result = computeFillerBreakdown([], 60000);
    expect(result.total).toBe(0);
    expect(result.byType).toEqual({});
    expect(result.peakThird).toBeNull();
    expect(result.thirdCounts).toEqual([0, 0, 0]);
  });

  it('durationMs=0 returns peakThird null and zero densities', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 0, label: 'um' },
    ];
    const result = computeFillerBreakdown(events, 0);
    expect(result.peakThird).toBeNull();
    expect(result.thirdDensities).toEqual([0, 0, 0]);
  });

  it('counts by type correctly', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
      { type: 'filler_word', timestampMs: 10000, label: 'um' },
      { type: 'filler_word', timestampMs: 15000, label: 'uh' },
      { type: 'eye_contact_break', timestampMs: 8000 }, // non-filler ignored
    ];
    const result = computeFillerBreakdown(events, 60000);
    expect(result.byType).toEqual({ um: 2, uh: 1 });
    expect(result.total).toBe(3);
  });

  it('assigns events to correct third', () => {
    // durationMs=90000 → thirds: 0-30000, 30000-60000, 60000-90000
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 10000, label: 'um' },   // opening
      { type: 'filler_word', timestampMs: 40000, label: 'like' }, // middle
      { type: 'filler_word', timestampMs: 40000, label: 'uh' },   // middle
      { type: 'filler_word', timestampMs: 70000, label: 'so' },   // closing
    ];
    const result = computeFillerBreakdown(events, 90000);
    expect(result.thirdCounts).toEqual([1, 2, 1]);
    expect(result.peakThird).toBe('middle');
  });

  it('event at exactly durationMs is clamped to closing third (not out-of-bounds)', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 90000, label: 'um' }, // exactly at durationMs
    ];
    const result = computeFillerBreakdown(events, 90000);
    expect(result.thirdCounts[2]).toBe(1); // closing
    expect(result.total).toBe(1);
  });

  it('tie-break: when two thirds are equal, earlier third wins', () => {
    // durationMs=60000 → thirds of 20000ms each
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },  // opening
      { type: 'filler_word', timestampMs: 25000, label: 'uh' }, // middle (exactly same density)
    ];
    const result = computeFillerBreakdown(events, 60000);
    expect(result.thirdCounts).toEqual([1, 1, 0]);
    expect(result.peakThird).toBe('opening'); // tie-break: first wins
  });

  it('all fillers in closing: peakThird = closing', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 80000, label: 'um' },
      { type: 'filler_word', timestampMs: 85000, label: 'um' },
    ];
    const result = computeFillerBreakdown(events, 90000);
    expect(result.peakThird).toBe('closing');
  });

  it('label is undefined falls back to "unknown"', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000 }, // no label
    ];
    const result = computeFillerBreakdown(events, 60000);
    expect(result.byType['unknown']).toBe(1);
  });
});
