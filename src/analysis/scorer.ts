// src/analysis/scorer.ts
// Source: domain benchmarks from Microsoft Speaker Coach (100–165 wpm), academic
//         presentation research (120–160 wpm sweet spot), and Phase 2 event schema.

import type { SessionEvent } from '../db/db';

export interface DimensionScore {
  score: number;     // 0–100
  label: string;     // human-readable, e.g. "82 / 100"
  detail?: string;   // supporting stat, e.g. "3 breaks in 5 min"
}

export interface ScorecardResult {
  overall: number;
  dimensions: {
    eyeContact: DimensionScore;
    expressiveness: DimensionScore;
    gestures: DimensionScore;
    fillers: DimensionScore;
    pacing: DimensionScore;
    openingClosing: DimensionScore;
  };
}

// --- Eye Contact ---
// Metric: fraction of session time spent in 'direct' state (no eye_contact_break active)
// Score: eye contact ratio mapped linearly to 0–100; 100% direct = 100, 0% direct = 0
function scoreEyeContact(events: SessionEvent[], durationMs: number): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };

  const breaks = events.filter(e => e.type === 'eye_contact_break');

  // Calculate total time "away"
  let awayMs = 0;
  let breakStart = 0;
  let inBreak = false;
  for (const e of events.filter(
    e => e.type === 'eye_contact_break' || e.type === 'eye_contact_resume'
  ).sort((a, b) => a.timestampMs - b.timestampMs)) {
    if (e.type === 'eye_contact_break' && !inBreak) {
      breakStart = e.timestampMs;
      inBreak = true;
    } else if (e.type === 'eye_contact_resume' && inBreak) {
      awayMs += e.timestampMs - breakStart;
      inBreak = false;
    }
  }
  if (inBreak) awayMs += durationMs - breakStart; // session ended while looking away

  const ratio = Math.max(0, 1 - awayMs / durationMs);
  const score = Math.round(ratio * 100);
  return {
    score,
    label: `${score} / 100`,
    detail: `${breaks.length} break${breaks.length !== 1 ? 's' : ''}`,
  };
}

// --- Expressiveness ---
// Metric: average of per-segment scores from 'expressiveness_segment' events (label = score string)
// Score: average segment score mapped to 0–100 (segment scores are already 0–1 from Phase 2)
function scoreExpressiveness(events: SessionEvent[]): DimensionScore {
  const segs = events.filter(e => e.type === 'expressiveness_segment');
  if (segs.length === 0) return { score: 50, label: '50 / 100', detail: 'No data' };

  const avg = segs.reduce((sum, e) => sum + parseFloat(e.label ?? '0'), 0) / segs.length;
  const score = Math.min(100, Math.round(avg * 100));
  return {
    score,
    label: `${score} / 100`,
    detail: `${segs.length} segment${segs.length !== 1 ? 's' : ''} analyzed`,
  };
}

// --- Gestures ---
// Metric: count of face_touch + body_sway events; penalty curve (each event = -8 points)
// Score: 100 - (eventCount * 8), floor at 0
function scoreGestures(events: SessionEvent[]): DimensionScore {
  const nervousEvents = events.filter(
    e => e.type === 'face_touch' || e.type === 'body_sway'
  );
  const count = nervousEvents.length;
  const score = Math.max(0, 100 - count * 8);
  return {
    score,
    label: `${score} / 100`,
    detail: `${count} nervous gesture${count !== 1 ? 's' : ''}`,
  };
}

// --- Filler Words ---
// Metric: filler events per minute; penalty curve
// Score: 100 at 0 fillers/min; degrades to 0 at 6+ fillers/min
// Reference: presentations with >4 fillers/min are rated as distracting by audiences
// NOTE: Chrome Web Speech API under-counts fillers (Phase 1 finding) — score is an upper bound
function scoreFillers(events: SessionEvent[], durationMs: number): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };
  const fillers = events.filter(e => e.type === 'filler_word');
  const fillersPerMin = fillers.length / (durationMs / 60000);
  // Linear mapping: 0 fillers/min = 100, 6+ fillers/min = 0
  const score = Math.max(0, Math.round(100 - (fillersPerMin / 6) * 100));
  return {
    score,
    label: `${score} / 100`,
    detail: `${fillers.length} filler${fillers.length !== 1 ? 's' : ''} (~${fillersPerMin.toFixed(1)}/min)`,
  };
}

// --- Pacing ---
// Metric: WPM from wpm_snapshot event; compare to 120–160 wpm target range
// Score: 100 at 120–160 wpm; degrades as WPM moves outside that range
// Reference: Microsoft Speaker Coach 100–165 wpm; academic sweet spot 120–160 wpm
function scorePacing(events: SessionEvent[]): DimensionScore {
  const wpmEvent = events.find(e => e.type === 'wpm_snapshot');
  if (!wpmEvent || !wpmEvent.label) return { score: 50, label: '50 / 100', detail: 'No WPM data' };

  const wpm = parseInt(wpmEvent.label, 10);
  if (isNaN(wpm)) return { score: 50, label: '50 / 100', detail: 'No WPM data' };

  let score: number;
  if (wpm >= 120 && wpm <= 160) {
    score = 100;
  } else if (wpm < 120) {
    // Below target: 100 → 0 from 120 → 60 wpm
    score = Math.max(0, Math.round(((wpm - 60) / 60) * 100));
  } else {
    // Above target: 100 → 0 from 160 → 220 wpm
    score = Math.max(0, Math.round(((220 - wpm) / 60) * 100));
  }
  return {
    score,
    label: `${score} / 100`,
    detail: `${wpm} wpm`,
  };
}

// --- Opening / Closing Strength ---
// Metric: negative event density in first 30s (opening) and last 30s (closing) of the session
// Score: opening window weighted 60%, closing window 40%
// Short-session guard: sessions < 60s return neutral score=50 with 'Session too short' detail
const NEGATIVE_EVENT_TYPES = new Set([
  'filler_word', 'face_touch', 'body_sway', 'eye_contact_break',
]);
const OC_WINDOW_MS = 30000;

function scoreSegment(events: SessionEvent[], startMs: number, endMs: number): number {
  const windowMs = endMs - startMs;
  if (windowMs <= 0) return 50;
  const windowEvents = events.filter(e => e.timestampMs >= startMs && e.timestampMs < endMs);
  const negativeCount = windowEvents.filter(e => NEGATIVE_EVENT_TYPES.has(e.type)).length;
  const negPerMin = negativeCount / (windowMs / 60000);
  return Math.max(0, Math.round(100 - (negPerMin / 6) * 100));
}

function scoreOpeningClosing(events: SessionEvent[], durationMs: number): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };
  if (durationMs < OC_WINDOW_MS * 2) {
    return { score: 50, label: '50 / 100', detail: 'Session too short (< 60s)' };
  }
  const openingScore = scoreSegment(events, 0, OC_WINDOW_MS);
  const closingScore = scoreSegment(events, durationMs - OC_WINDOW_MS, durationMs);
  const score = Math.round(openingScore * 0.6 + closingScore * 0.4);
  return { score, label: `${score} / 100`, detail: `Opening ${openingScore}, Closing ${closingScore}` };
}

// --- Weighted Overall ---
// Weights: eyeContact 22%, fillers 22%, pacing 18%, expressiveness 14%, gestures 14%, openingClosing 10%
// Rationale: the core differentiators (eye contact, filler-free speech) carry the most weight
const WEIGHTS = {
  eyeContact: 0.22,
  fillers: 0.22,
  pacing: 0.18,
  expressiveness: 0.14,
  gestures: 0.14,
  openingClosing: 0.10,
};

export function aggregateScores(
  eventLog: SessionEvent[],
  durationMs: number
): ScorecardResult {
  const eyeContact = scoreEyeContact(eventLog, durationMs);
  const expressiveness = scoreExpressiveness(eventLog);
  const gestures = scoreGestures(eventLog);
  const fillers = scoreFillers(eventLog, durationMs);
  const pacing = scorePacing(eventLog);
  const openingClosing = scoreOpeningClosing(eventLog, durationMs);

  const overall = Math.round(
    eyeContact.score * WEIGHTS.eyeContact +
    fillers.score * WEIGHTS.fillers +
    pacing.score * WEIGHTS.pacing +
    expressiveness.score * WEIGHTS.expressiveness +
    gestures.score * WEIGHTS.gestures +
    openingClosing.score * WEIGHTS.openingClosing
  );

  return {
    overall,
    dimensions: { eyeContact, expressiveness, gestures, fillers, pacing, openingClosing },
  };
}
