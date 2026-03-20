// src/analysis/calibration.ts
// Pure functions for computing per-user calibration thresholds from baseline measurements.

/**
 * Returns the value at percentile p (0–1) of the given values array.
 * Empty array returns 0.
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return sorted[idx];
}

/**
 * Compute calibration thresholds from raw baseline measurement arrays.
 *
 * - gazeThreshold: 95th percentile of natural gaze offsets * 1.2, clamped [0.10, 0.40]
 * - faceTouchThreshold: 5th percentile of hand-to-nose distances * 0.8, clamped [0.06, 0.20]
 * - swayThreshold: 95th percentile of shoulder deltas * 1.5, clamped [0.02, 0.10]
 */
export function computeCalibrationProfile(raw: {
  gazeOffsets: number[];
  faceTouchDistances: number[];
  shoulderDeltas: number[];
}): { gazeThreshold: number; faceTouchThreshold: number; swayThreshold: number } {
  // gazeThreshold: 95th percentile of natural gaze offsets * 1.2, clamped [0.10, 0.40]
  const p95Gaze = percentile(raw.gazeOffsets, 0.95);
  const gazeThreshold = Math.min(0.40, Math.max(0.10, p95Gaze * 1.2));

  // faceTouchThreshold: 5th percentile of hand-to-nose distances * 0.8, clamped [0.06, 0.20]
  const p05Touch = percentile(raw.faceTouchDistances, 0.05);
  const faceTouchThreshold = Math.min(0.20, Math.max(0.06, p05Touch * 0.8));

  // swayThreshold: 95th percentile of shoulder deltas * 1.5, clamped [0.02, 0.10]
  const p95Sway = percentile(raw.shoulderDeltas, 0.95);
  const swayThreshold = Math.min(0.10, Math.max(0.02, p95Sway * 1.5));

  return { gazeThreshold, faceTouchThreshold, swayThreshold };
}
