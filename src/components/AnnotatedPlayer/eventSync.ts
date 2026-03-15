import type { SessionEvent } from '../../db/db';

export function getNearbyEvents(
  events: SessionEvent[],
  currentTimeMs: number,
  windowMs = 1000
): SessionEvent[] {
  return events.filter(
    e => Math.abs(e.timestampMs - currentTimeMs) <= windowMs
  );
}

export function getNearestEvent(
  events: SessionEvent[],
  currentTimeMs: number
): SessionEvent | null {
  if (!events.length) return null;
  return events.reduce((closest, e) =>
    Math.abs(e.timestampMs - currentTimeMs) < Math.abs(closest.timestampMs - currentTimeMs)
      ? e : closest
  );
}
