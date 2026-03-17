// src/analysis/fillerBreakdown.ts
// ANAL-04, ANAL-05: Computes per-type filler counts and session-thirds peak density.

import type { SessionEvent } from '../db/db';

export interface FillerBreakdownResult {
  byType: Record<string, number>;
  total: number;
  peakThird: 'opening' | 'middle' | 'closing' | null;
  thirdCounts: [number, number, number];
  thirdDensities: [number, number, number];
}

const THIRD_NAMES = ['opening', 'middle', 'closing'] as const;

export function computeFillerBreakdown(
  events: SessionEvent[],
  durationMs: number
): FillerBreakdownResult {
  const fillerEvents = events.filter(e => e.type === 'filler_word');

  const byType: Record<string, number> = {};
  for (const e of fillerEvents) {
    const label = e.label ?? 'unknown';
    byType[label] = (byType[label] ?? 0) + 1;
  }
  const total = fillerEvents.length;

  const thirdDurationMs = durationMs > 0 ? durationMs / 3 : 0;
  const thirdCounts: [number, number, number] = [0, 0, 0];

  if (durationMs > 0 && total > 0) {
    for (const e of fillerEvents) {
      const idx = Math.min(2, Math.floor(e.timestampMs / thirdDurationMs));
      thirdCounts[idx]++;
    }
  }

  const thirdDensities: [number, number, number] = [0, 0, 0];
  if (thirdDurationMs > 0) {
    const thirdMin = thirdDurationMs / 60000;
    for (let i = 0; i < 3; i++) {
      thirdDensities[i] = thirdCounts[i] / thirdMin;
    }
  }

  let peakThird: 'opening' | 'middle' | 'closing' | null = null;
  if (total > 0 && durationMs > 0) {
    const maxDensity = Math.max(...thirdDensities);
    const peakIdx = thirdDensities.indexOf(maxDensity); // indexOf = first match = tie-break
    peakThird = THIRD_NAMES[peakIdx];
  }

  return { byType, total, peakThird, thirdCounts, thirdDensities };
}
