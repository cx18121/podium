import type { SessionEvent } from '../db/db';

export interface WorstMoment {
  timestampMs: number;
  label: string;
  category: 'eye_contact' | 'filler_cluster' | 'body_sway';
}

export interface WorstMomentsResult {
  longestEyeContactBreak: WorstMoment | null;
  densestFillerCluster: WorstMoment | null;
  biggestSway: WorstMoment | null;
}

const WINDOW_MS = 30_000;
const STEP_MS = 5_000;
const MIN_WINDOW_MS = 10_000;

/**
 * Pure function — no I/O, no side effects.
 *
 * @param events  Full event log for the session (order not assumed)
 * @param durationMs  Total session duration in milliseconds
 */
export function computeWorstMoments(
  events: SessionEvent[],
  durationMs: number,
): WorstMomentsResult {
  return {
    longestEyeContactBreak: computeLongestEyeContactBreak(events, durationMs),
    densestFillerCluster: computeDensestFillerCluster(events, durationMs),
    biggestSway: computeBiggestSway(events),
  };
}

// ─── Eye-contact break ──────────────────────────────────────────────────────

function computeLongestEyeContactBreak(
  events: SessionEvent[],
  durationMs: number,
): WorstMoment | null {
  const contactEvents = events
    .filter(
      (e) => e.type === 'eye_contact_break' || e.type === 'eye_contact_resume',
    )
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (!contactEvents.some((e) => e.type === 'eye_contact_break')) {
    return null;
  }

  let longestDurationMs = 0;
  let longestBreakStart = 0;
  let inBreak = false;
  let breakStart = 0;

  for (const e of contactEvents) {
    if (e.type === 'eye_contact_break' && !inBreak) {
      breakStart = e.timestampMs;
      inBreak = true;
    } else if (e.type === 'eye_contact_resume' && inBreak) {
      const duration = e.timestampMs - breakStart;
      if (duration > longestDurationMs) {
        longestDurationMs = duration;
        longestBreakStart = breakStart;
      }
      inBreak = false;
    }
  }

  // Handle open break at session end
  if (inBreak) {
    const duration = durationMs - breakStart;
    if (duration > longestDurationMs) {
      longestDurationMs = duration;
      longestBreakStart = breakStart;
    }
  }

  return {
    timestampMs: longestBreakStart,
    label: `Eye contact break: ${(longestDurationMs / 1000).toFixed(1)}s`,
    category: 'eye_contact',
  };
}

// ─── Densest filler cluster ─────────────────────────────────────────────────

function computeDensestFillerCluster(
  events: SessionEvent[],
  durationMs: number,
): WorstMoment | null {
  const fillerEvents = events.filter((e) => e.type === 'filler_word');

  if (fillerEvents.length < 2) {
    return null;
  }

  const maxWindowStart = durationMs - MIN_WINDOW_MS;

  let bestCount = 0;
  let bestWindowStart = 0;

  for (let ws = 0; ws <= maxWindowStart; ws += STEP_MS) {
    const count = fillerEvents.filter(
      (e) => e.timestampMs >= ws && e.timestampMs < ws + WINDOW_MS,
    ).length;

    if (count > bestCount) {
      bestCount = count;
      bestWindowStart = ws;
    }
  }

  if (bestCount === 0) {
    return null;
  }

  return {
    timestampMs: bestWindowStart + WINDOW_MS / 2,
    label: `Filler cluster: ${bestCount} in 30s`,
    category: 'filler_cluster',
  };
}

// ─── Body sway ──────────────────────────────────────────────────────────────

function computeBiggestSway(events: SessionEvent[]): WorstMoment | null {
  const swayEvents = events
    .filter((e) => e.type === 'body_sway')
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (swayEvents.length === 0) {
    return null;
  }

  return {
    timestampMs: swayEvents[0].timestampMs,
    label: 'Body sway detected',
    category: 'body_sway',
  };
}
