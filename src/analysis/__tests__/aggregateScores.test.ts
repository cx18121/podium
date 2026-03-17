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
// scoreOpeningClosing
// ---------------------------------------------------------------------------
describe('scoreOpeningClosing', () => {
  it('durationMs=0 returns score=50 with "No data" detail', () => {
    const result = aggregateScores([], 0);
    expect(result.dimensions.openingClosing.score).toBe(50);
    expect(result.dimensions.openingClosing.detail).toBe('No data');
  });

  it('session < 60s returns score=50 with "Session too short" detail', () => {
    const events: SessionEvent[] = [{ type: 'filler_word', timestampMs: 5000, label: 'um' }];
    const result = aggregateScores(events, 45000);
    expect(result.dimensions.openingClosing.score).toBe(50);
    expect(result.dimensions.openingClosing.detail).toMatch(/too short/i);
  });

  it('clean opening + clean closing in 120s session → score = 100', () => {
    const events: SessionEvent[] = [{ type: 'wpm_snapshot', timestampMs: 120000, label: '130' }];
    const result = aggregateScores(events, 120000);
    expect(result.dimensions.openingClosing.score).toBe(100);
  });

  it('strong opening + weak closing → 60', () => {
    const closingEvents: SessionEvent[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'filler_word' as const, timestampMs: 90000 + (i + 1) * 1000, label: 'um',
    }));
    const result = aggregateScores(closingEvents, 120000);
    expect(result.dimensions.openingClosing.score).toBe(60);
  });

  it('weak opening + strong closing → 40', () => {
    const openingEvents: SessionEvent[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'filler_word' as const, timestampMs: (i + 1) * 1000, label: 'um',
    }));
    const result = aggregateScores(openingEvents, 120000);
    expect(result.dimensions.openingClosing.score).toBe(40);
  });

  it('exactly 60s session: no short-session guard, score=100 with no events', () => {
    const result = aggregateScores([], 60000);
    expect(result.dimensions.openingClosing.detail).not.toMatch(/too short/i);
    expect(result.dimensions.openingClosing.score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// aggregateScores overall
// ---------------------------------------------------------------------------
describe('aggregateScores', () => {
  it('all dimension scores = 100 → overall = 100', () => {
    // 0ms away (eyeContact=100), 0 fillers (fillers=100), wpm=130 (pacing=100),
    // expressiveness_segment=1.0 (expressiveness=100), 0 gestures (gestures=100)
    // openingClosing=100: 60s session, no negative events in either window
    const events: SessionEvent[] = [
      { type: 'wpm_snapshot', timestampMs: 60000, label: '130' },
      { type: 'expressiveness_segment', timestampMs: 30000, label: '1.0' },
    ];
    const result = aggregateScores(events, 60000);
    expect(result.overall).toBe(100);
  });

  it('mixed scores → overall = 65', () => {
    // overall = round(80*0.22 + 60*0.22 + 100*0.18 + 50*0.14 + 44*0.14 + 33*0.10)
    //         = round(17.6 + 13.2 + 18 + 7 + 6.16 + 3.3) = round(65.26) = 65
    //
    // openingClosing=33: Opening window (0-30000ms): 1 filler_word at 25000 + 1 eye_contact_break at 5000 = 2 negatives
    //   negPerMin = 2/0.5 = 4; score = round(100 - (4/6)*100) = 33
    //   Closing window (270000-300000ms): 1 filler_word at 275000 + 1 face_touch at 280000 = 2 negatives
    //   negPerMin = 2/0.5 = 4; score = 33
    //   Composite: round(33*0.6 + 33*0.4) = 33
    //
    // eyeContact=80: break at 5000, resume at 65000 → awayMs=60000/300000=0.2, ratio=0.8, score=80
    // fillers=60: 12 fillers in 300000ms (5min) → fillersPerMin=2.4 → round(100-(2.4/6)*100)=60
    // pacing=100: wpm=130 (in 120–160 range)
    // expressiveness=50: no segments (no-data default)
    // gestures=44: 7 nervous events → 100 - 7*8 = 44

    const events: SessionEvent[] = [
      // eyeContact=80: break at 5000, resume at 65000 → awayMs=60000/300000=0.2 away, ratio=0.8
      { type: 'eye_contact_break', timestampMs: 5000 },
      { type: 'eye_contact_resume', timestampMs: 65000 },

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
    expect(result.overall).toBe(65);
  });
});
