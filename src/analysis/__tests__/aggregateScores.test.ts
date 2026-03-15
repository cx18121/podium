import { describe, it, expect } from 'vitest';
import { aggregateScores } from '../scorer';
import type { SessionEvent } from '../../db/db';

// ---------------------------------------------------------------------------
// scoreEyeContact
// ---------------------------------------------------------------------------
describe('scoreEyeContact', () => {
  it('3000ms away in 60000ms session → score = 95', () => {
    const events: SessionEvent[] = [
      { type: 'eye_contact_break', timestampMs: 5000 },
      { type: 'eye_contact_resume', timestampMs: 8000 }, // 3000ms away
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.eyeContact.score).toBe(95);
  });

  it('0ms away (no break events) in 60000ms → score = 100', () => {
    const events: SessionEvent[] = [];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.eyeContact.score).toBe(100);
  });

  it('session ended while in break (no resume): 10000ms break to 60000ms → score = 17', () => {
    // break starts at 10000ms, session ends at 60000ms → awayMs = 50000
    // ratio = 1 - 50000/60000 = 0.1667, score = round(0.1667 * 100) = 17
    const events: SessionEvent[] = [
      { type: 'eye_contact_break', timestampMs: 10000 },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.eyeContact.score).toBe(17);
  });

  it('durationMs = 0 → score = 50 (no-data guard)', () => {
    const events: SessionEvent[] = [];
    const result = aggregateScores(events, 0);
    expect(result.dimensions.eyeContact.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// scoreFillers
// ---------------------------------------------------------------------------
describe('scoreFillers', () => {
  it('5 filler events in 60000ms (1 min) → score = 17', () => {
    // fillersPerMin = 5/1 = 5; score = max(0, round(100 - (5/6)*100)) = max(0, round(16.67)) = 17
    const events: SessionEvent[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'filler_word',
      timestampMs: (i + 1) * 10000,
      label: 'um',
    }));
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.fillers.score).toBe(17);
  });

  it('0 filler events → score = 100', () => {
    const events: SessionEvent[] = [];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.fillers.score).toBe(100);
  });

  it('12 filler events in 60000ms → score = 0 (floor)', () => {
    // fillersPerMin = 12/1 = 12; score = max(0, round(100 - (12/6)*100)) = max(0, -100) = 0
    const events: SessionEvent[] = Array.from({ length: 12 }, (_, i) => ({
      type: 'filler_word',
      timestampMs: (i + 1) * 5000,
      label: 'like',
    }));
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.fillers.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scorePacing
// ---------------------------------------------------------------------------
describe('scorePacing', () => {
  it('wpm_snapshot label="130" → score = 100 (in 120–160 range)', () => {
    const events: SessionEvent[] = [
      { type: 'wpm_snapshot', timestampMs: 60000, label: '130' },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.pacing.score).toBe(100);
  });

  it('wpm_snapshot label="80" → score = 33', () => {
    // wpm=80, below 120: score = max(0, round(((80-60)/60)*100)) = max(0, round(33.33)) = 33
    const events: SessionEvent[] = [
      { type: 'wpm_snapshot', timestampMs: 60000, label: '80' },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.pacing.score).toBe(33);
  });

  it('wpm_snapshot label="190" → score = 50', () => {
    // wpm=190, above 160: score = max(0, round(((220-190)/60)*100)) = max(0, round(50)) = 50
    const events: SessionEvent[] = [
      { type: 'wpm_snapshot', timestampMs: 60000, label: '190' },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.pacing.score).toBe(50);
  });

  it('no wpm_snapshot event → score = 50', () => {
    const events: SessionEvent[] = [];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.pacing.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// scoreExpressiveness
// ---------------------------------------------------------------------------
describe('scoreExpressiveness', () => {
  it('three segments with labels "0.8", "0.6", "1.0" → score = 80', () => {
    // avg = (0.8 + 0.6 + 1.0) / 3 = 0.8; score = round(0.8 * 100) = 80
    const events: SessionEvent[] = [
      { type: 'expressiveness_segment', timestampMs: 10000, label: '0.8' },
      { type: 'expressiveness_segment', timestampMs: 20000, label: '0.6' },
      { type: 'expressiveness_segment', timestampMs: 30000, label: '1.0' },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.expressiveness.score).toBe(80);
  });

  it('no segments → score = 50', () => {
    const events: SessionEvent[] = [];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.expressiveness.score).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// scoreGestures
// ---------------------------------------------------------------------------
describe('scoreGestures', () => {
  it('3 nervous events → score = 76', () => {
    // score = max(0, 100 - 3*8) = 76
    const events: SessionEvent[] = [
      { type: 'face_touch', timestampMs: 5000 },
      { type: 'body_sway', timestampMs: 10000 },
      { type: 'face_touch', timestampMs: 15000 },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.gestures.score).toBe(76);
  });

  it('13 or more events → score = 0 (floor)', () => {
    // score = max(0, 100 - 13*8) = max(0, -4) = 0
    const events: SessionEvent[] = Array.from({ length: 13 }, (_, i) => ({
      type: 'face_touch',
      timestampMs: (i + 1) * 4000,
    }));
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.gestures.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// aggregateScores overall
// ---------------------------------------------------------------------------
describe('aggregateScores', () => {
  it('all dimension scores = 100 → overall = 100', () => {
    // 0ms away (eyeContact=100), 0 fillers (fillers=100), wpm=130 (pacing=100),
    // expressiveness_segment=1.0 (expressiveness=100), 0 gestures (gestures=100)
    const events: SessionEvent[] = [
      { type: 'wpm_snapshot', timestampMs: 60000, label: '130' },
      { type: 'expressiveness_segment', timestampMs: 30000, label: '1.0' },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.overall).toBe(100);
  });

  it('mixed scores → overall = 69', () => {
    // eyeContact=80, fillers=60, pacing=100, expressiveness=50, gestures=40
    // overall = round(80*0.25 + 60*0.25 + 100*0.20 + 50*0.15 + 40*0.15)
    //         = round(20 + 15 + 20 + 7.5 + 6) = round(68.5) = 69

    // eyeContact=80: need ratio=0.8, awayMs/durationMs=0.2, awayMs=12000 out of 60000ms
    // break at 5000, resume at 17000 → awayMs=12000, ratio=0.8, score=80 ✓

    // fillers=60: fillersPerMin = (100 - 60) / (100/6) = 2.4/min → count = 2.4*1 = 2.4 → not integer
    // Back-calculate: score = max(0, round(100 - (count/(durationMs/60000))/6 * 100)) = 60
    // 100 - x = 60 → x = 40 → (fillersPerMin/6)*100 = 40 → fillersPerMin = 2.4 → count = 2.4 in 1 min
    // Use count=2 in 30000ms (0.5 min): fillersPerMin=4, score=max(0,round(100-(4/6)*100))=33 ✗
    // Use count=6 in 90000ms: fillersPerMin=4, score=33 ✗
    // Need exactly score=60: 100 - (n / (dMs/60000))/6 * 100 = 60 → n/(dMs/60000) = 2.4
    // Use durationMs=300000 (5 min) and 12 fillers: fillersPerMin = 12/5 = 2.4, score = max(0, round(100 - (2.4/6)*100)) = max(0, round(60)) = 60 ✓
    // pacing=100: wpm=130 ✓
    // expressiveness=50: no segments ✓
    // gestures=40: count = (100-40)/8 = 7.5 → not integer. Try count=8: 100-64=36 ✗, count=7: 100-56=44 ✗
    // Need exactly score=40: 100 - n*8 = 40 → n=7.5 → not possible with integers
    // Use score=44 (7 gestures) for gestures instead? The plan says gestures=40, so use 7.5…
    // Re-read the plan: "eyeContact=80, fillers=60, pacing=100, expressiveness=50, gestures=40"
    // gestures=40 → 100 - n*8 = 40 → n = 7.5 → impossible with integers
    // The plan intends the formula to work out, so treat it as a design-level check only
    // Let's construct events that produce gestures=40 via 7 events giving 44, but the plan says 40
    // Actually the plan says this is a test case for the final overall calculation.
    // Re-check: if we can't hit exactly 40, we can construct a scenario where the dimensions
    // happen to come out to those exact values through a combination of events.
    //
    // Simpler approach: test the overall calculation directly by creating a scenario where
    // the dimension scores are already known, and check the math is correct.
    // The plan test case says overall = 69. Let's find achievable dimensions close to those.
    //
    // Alternative: use 5 nervous events → gestures = max(0, 100 - 5*8) = 60
    // And adjust fillers/expressiveness to get overall = 69.
    //
    // Actually, let's re-read: the plan note says:
    // "overall = round(80*0.25 + 60*0.25 + 100*0.20 + 50*0.15 + 40*0.15) = round(68.5) = 69"
    // This is a specification for the aggregateScores math. We need events that produce these values.
    //
    // gestures=40: not achievable with integer event count. But gestures=36 (8 events) gives:
    // round(80*0.25 + 60*0.25 + 100*0.20 + 50*0.15 + 36*0.15)
    // = round(20 + 15 + 20 + 7.5 + 5.4) = round(67.9) = 68 ≠ 69
    //
    // So for this test, use different gestures that together give 69.
    // Try gestures=44 (7 events): round(20 + 15 + 20 + 7.5 + 6.6) = round(69.1) = 69 ✓
    //
    // So: eyeContact=80, fillers=60, pacing=100, expressiveness=50, gestures=44
    // = round(0.25*80 + 0.25*60 + 0.20*100 + 0.15*50 + 0.15*44)
    // = round(20 + 15 + 20 + 7.5 + 6.6) = round(69.1) = 69 ✓

    const events: SessionEvent[] = [
      // eyeContact=80: break at 5000, resume at 17000 → awayMs=12000/60000=0.2 away, ratio=0.8
      { type: 'eye_contact_break', timestampMs: 5000 },
      { type: 'eye_contact_resume', timestampMs: 17000 },

      // fillers=60: 12 fillers in 300000ms (5min) → fillersPerMin=2.4 → score=round(100-(2.4/6)*100)=60
      ...Array.from({ length: 12 }, (_, i) => ({
        type: 'filler_word' as const,
        timestampMs: (i + 1) * 25000,
        label: 'um',
      })),

      // pacing=100: wpm in range
      { type: 'wpm_snapshot', timestampMs: 300000, label: '130' },

      // expressiveness=50: no segments

      // gestures=44: 7 nervous events → 100 - 7*8 = 44
      ...Array.from({ length: 7 }, (_, i) => ({
        type: 'face_touch' as const,
        timestampMs: (i + 1) * 40000,
      })),
    ];

    const result = aggregateScores(events, 300000);
    expect(result.overall).toBe(69);
  });
});
