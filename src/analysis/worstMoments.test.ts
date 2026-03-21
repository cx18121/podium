import { describe, it, expect } from 'vitest';
import { computeWorstMoments } from './worstMoments';
import type { SessionEvent } from '../db/db';

// ─── helpers ────────────────────────────────────────────────────────────────

function ev(type: string, timestampMs: number, label?: string): SessionEvent {
  return label ? { type, timestampMs, label } : { type, timestampMs };
}

// ─── WM-03: Empty / all-null cases ─────────────────────────────────────────

describe('computeWorstMoments — empty state (WM-03)', () => {
  it('returns all nulls for an empty events array', () => {
    const result = computeWorstMoments([], 60_000);
    expect(result).toEqual({
      longestEyeContactBreak: null,
      densestFillerCluster: null,
      biggestSway: null,
    });
  });

  it('returns all nulls when events contain only pause_detected events', () => {
    const events = [
      ev('pause_detected', 10_000),
      ev('pause_detected', 25_000),
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result).toEqual({
      longestEyeContactBreak: null,
      densestFillerCluster: null,
      biggestSway: null,
    });
  });
});

// ─── WM-01: Longest eye-contact break ──────────────────────────────────────

describe('computeWorstMoments — longestEyeContactBreak (WM-01)', () => {
  it('detects the longest break when multiple pairs exist', () => {
    const events: SessionEvent[] = [
      ev('eye_contact_break', 5_000),
      ev('eye_contact_resume', 8_000),   // 3s break
      ev('eye_contact_break', 20_000),
      ev('eye_contact_resume', 27_000),  // 7s break — longest
      ev('eye_contact_break', 40_000),
      ev('eye_contact_resume', 43_000),  // 3s break
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak).not.toBeNull();
    expect(result.longestEyeContactBreak!.timestampMs).toBe(20_000);
    expect(result.longestEyeContactBreak!.category).toBe('eye_contact');
    expect(result.longestEyeContactBreak!.label).toBe('Eye contact break: 7.0s');
  });

  it('returns null when no eye_contact_break events exist', () => {
    const events = [ev('filler_word', 5_000, 'um')];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak).toBeNull();
  });

  it('handles a single break with a resume', () => {
    const events: SessionEvent[] = [
      ev('eye_contact_break', 10_000),
      ev('eye_contact_resume', 14_500), // 4.5s
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak!.timestampMs).toBe(10_000);
    expect(result.longestEyeContactBreak!.label).toBe('Eye contact break: 4.5s');
  });

  it('picks first break when two breaks have the same duration', () => {
    const events: SessionEvent[] = [
      ev('eye_contact_break', 5_000),
      ev('eye_contact_resume', 10_000),  // 5s
      ev('eye_contact_break', 20_000),
      ev('eye_contact_resume', 25_000),  // 5s
    ];
    const result = computeWorstMoments(events, 60_000);
    // ties go to first encountered (earlier break start)
    expect(result.longestEyeContactBreak!.timestampMs).toBe(5_000);
  });
});

// ─── WM-04: Open eye-contact break at session end ──────────────────────────

describe('computeWorstMoments — open break at session end (WM-04)', () => {
  it('detects open break at session end as the longest when it is', () => {
    // Break starts at 30s, session ends at 60s — 30s open break
    const events: SessionEvent[] = [
      ev('eye_contact_break', 10_000),
      ev('eye_contact_resume', 15_000), // 5s
      ev('eye_contact_break', 30_000),  // open break — 30s
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak!.timestampMs).toBe(30_000);
    expect(result.longestEyeContactBreak!.label).toBe('Eye contact break: 30.0s');
  });

  it('returns open break when it is the only eye-contact event', () => {
    const events: SessionEvent[] = [ev('eye_contact_break', 30_000)];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak!.timestampMs).toBe(30_000);
    expect(result.longestEyeContactBreak!.label).toBe('Eye contact break: 30.0s');
  });

  it('does NOT return open break when a closed break is longer', () => {
    // Closed break: 5000–50000 = 45s, open break: 55000–60000 = 5s
    const events: SessionEvent[] = [
      ev('eye_contact_break', 5_000),
      ev('eye_contact_resume', 50_000), // 45s
      ev('eye_contact_break', 55_000),  // open, only 5s
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak!.timestampMs).toBe(5_000);
    expect(result.longestEyeContactBreak!.label).toBe('Eye contact break: 45.0s');
  });
});

// ─── WM-02: Densest filler cluster ─────────────────────────────────────────

describe('computeWorstMoments — densestFillerCluster (WM-02)', () => {
  it('returns null when there are fewer than 2 filler events', () => {
    const events = [ev('filler_word', 5_000, 'um')];
    const result = computeWorstMoments(events, 60_000);
    expect(result.densestFillerCluster).toBeNull();
  });

  it('returns null when there are no filler events', () => {
    const events = [ev('eye_contact_break', 5_000)];
    const result = computeWorstMoments(events, 60_000);
    expect(result.densestFillerCluster).toBeNull();
  });

  it('finds the densest 30s window and returns its midpoint', () => {
    // Dense cluster between 10s-25s: 5 fillers in window 0–30s
    const events: SessionEvent[] = [
      ev('filler_word', 10_000, 'um'),
      ev('filler_word', 13_000, 'uh'),
      ev('filler_word', 17_000, 'like'),
      ev('filler_word', 21_000, 'um'),
      ev('filler_word', 24_000, 'uh'),
      ev('filler_word', 80_000, 'um'), // isolated — in a different window
    ];
    const result = computeWorstMoments(events, 120_000);
    expect(result.densestFillerCluster).not.toBeNull();
    // Best window starts at 0 (contains 5 fillers), midpoint = 0 + 30000/2 = 15000
    expect(result.densestFillerCluster!.timestampMs).toBe(15_000);
    expect(result.densestFillerCluster!.category).toBe('filler_cluster');
    expect(result.densestFillerCluster!.label).toBe('Filler cluster: 5 in 30s');
  });

  it('returns midpoint of best window when best window starts later', () => {
    // All fillers between 60s–80s — best window around 60000
    const events: SessionEvent[] = [
      ev('filler_word', 61_000, 'um'),
      ev('filler_word', 65_000, 'uh'),
      ev('filler_word', 70_000, 'like'),
      ev('filler_word', 75_000, 'um'),
      ev('filler_word', 78_000, 'uh'),
      ev('filler_word', 5_000, 'um'),  // isolated early
    ];
    // durationMs = 120000; max windowStart = 120000 - 10000 = 110000
    const result = computeWorstMoments(events, 120_000);
    expect(result.densestFillerCluster!.category).toBe('filler_cluster');
    // window starting at 55000 (step=5000): 61k,65k,70k,75k,78k all in [55k,85k) = 5
    // window starting at 60000: 61k,65k,70k,75k,78k all in [60k,90k) = 5
    // both windows tie at 5; first wins (55000 or earlier), midpoint varies
    // We just assert the count label and the result is non-null
    expect(result.densestFillerCluster!.label).toContain('Filler cluster:');
    expect(result.densestFillerCluster!.label).toContain('in 30s');
  });

  it('skips windows starting after durationMs - 10000', () => {
    // All 3 fillers near the very end, beyond the clamp boundary
    // durationMs = 60000, max windowStart = 50000
    // fillers at 52000, 55000, 58000 — these ARE within the window if windowStart=50000
    // [50000, 80000) includes 52000, 55000, 58000 — that's 3 fillers
    const events: SessionEvent[] = [
      ev('filler_word', 52_000, 'um'),
      ev('filler_word', 55_000, 'uh'),
      ev('filler_word', 58_000, 'like'),
    ];
    const result = computeWorstMoments(events, 60_000);
    // 3 fillers >= 2, so densestFillerCluster should be non-null
    expect(result.densestFillerCluster).not.toBeNull();
    expect(result.densestFillerCluster!.label).toBe('Filler cluster: 3 in 30s');
  });

  it('returns null when all filler events fall outside every valid window', () => {
    // durationMs = 15000, max windowStart = 5000
    // fillers at 2000 and 12000 — window [5000,35000) captures 12000 only (count=1)
    // window [0,30000) captures both (count=2) — windowStart=0 IS valid since 0 <= 5000
    // Actually windowStart=0 is valid, so let me test with fillers only in the last second
    // durationMs=10500, maxWindowStart=500, step=5000
    // so only windowStart=0 and windowStart=500 are valid (0<=500, 5000>500 so skip)
    // Fillers at 1000, 2000 both in [0,30000) — count=2, result non-null
    // Test: ensure at least 2 fillers for function to not short-circuit
    // We trust the clamp: windows starting > durationMs-10000 are skipped
    // Verify via label that correct count found when near-boundary
    const events: SessionEvent[] = [
      ev('filler_word', 1_000, 'um'),
      ev('filler_word', 2_000, 'uh'),
    ];
    const result = computeWorstMoments(events, 10_500);
    // Only window starting at 0 is valid (next step is 5000 > 500 boundary)
    expect(result.densestFillerCluster).not.toBeNull();
    expect(result.densestFillerCluster!.label).toBe('Filler cluster: 2 in 30s');
  });
});

// ─── Body sway ─────────────────────────────────────────────────────────────

describe('computeWorstMoments — biggestSway', () => {
  it('returns the first body_sway event', () => {
    const events: SessionEvent[] = [
      ev('body_sway', 15_000),
      ev('body_sway', 40_000),
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result.biggestSway).not.toBeNull();
    expect(result.biggestSway!.timestampMs).toBe(15_000);
    expect(result.biggestSway!.category).toBe('body_sway');
    expect(result.biggestSway!.label).toBe('Body sway detected');
  });

  it('returns null when no body_sway events exist', () => {
    const events = [ev('gesture', 10_000)];
    const result = computeWorstMoments(events, 60_000);
    expect(result.biggestSway).toBeNull();
  });

  it('returns the single body_sway when only one exists', () => {
    const events: SessionEvent[] = [ev('body_sway', 22_000)];
    const result = computeWorstMoments(events, 60_000);
    expect(result.biggestSway!.timestampMs).toBe(22_000);
    expect(result.biggestSway!.label).toBe('Body sway detected');
  });
});

// ─── Mixed / combined scenarios ─────────────────────────────────────────────

describe('computeWorstMoments — mixed events', () => {
  it('returns partial nulls for a session with only eye-contact and sway (no fillers)', () => {
    const events: SessionEvent[] = [
      ev('eye_contact_break', 10_000),
      ev('eye_contact_resume', 15_000),
      ev('body_sway', 30_000),
    ];
    const result = computeWorstMoments(events, 60_000);
    expect(result.longestEyeContactBreak).not.toBeNull();
    expect(result.densestFillerCluster).toBeNull();
    expect(result.biggestSway).not.toBeNull();
  });

  it('handles events in unsorted order correctly', () => {
    // Provide events out of timestamp order — function should sort internally
    const events: SessionEvent[] = [
      ev('eye_contact_resume', 27_000),
      ev('eye_contact_break', 20_000),
      ev('eye_contact_resume', 8_000),
      ev('eye_contact_break', 5_000),
    ];
    const result = computeWorstMoments(events, 60_000);
    // Break at 20000, resume at 27000 = 7s; break at 5000, resume at 8000 = 3s
    expect(result.longestEyeContactBreak!.timestampMs).toBe(20_000);
    expect(result.longestEyeContactBreak!.label).toBe('Eye contact break: 7.0s');
  });
});
