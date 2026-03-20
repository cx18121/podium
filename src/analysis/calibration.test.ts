// src/analysis/calibration.test.ts
import { describe, it, expect } from 'vitest';
import { computeCalibrationProfile } from './calibration';

describe('computeCalibrationProfile', () => {
  it('returns gazeThreshold between 0.10 and 0.40 for typical gaze offsets', () => {
    const gazeOffsets = Array.from({ length: 100 }, (_, i) => 0.05 + (i % 10) * 0.01);
    const result = computeCalibrationProfile({
      gazeOffsets,
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.gazeThreshold).toBeGreaterThanOrEqual(0.10);
    expect(result.gazeThreshold).toBeLessThanOrEqual(0.40);
  });

  it('returns gazeThreshold = 0.10 (floor) for all-zero gazeOffsets', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0),
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.gazeThreshold).toBe(0.10);
  });

  it('returns gazeThreshold = 0.40 (ceiling) for very large gaze offsets', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(1.0),
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.gazeThreshold).toBe(0.40);
  });

  it('faceTouchThreshold is derived from 5th percentile * 0.8, clamped to [0.06, 0.20]', () => {
    // 5th percentile of [0.15] * 100 = 0.15; 0.15 * 0.8 = 0.12; clamped to [0.06, 0.20] => 0.12
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0.10),
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.faceTouchThreshold).toBeGreaterThanOrEqual(0.06);
    expect(result.faceTouchThreshold).toBeLessThanOrEqual(0.20);
    expect(result.faceTouchThreshold).toBeCloseTo(0.12, 5);
  });

  it('faceTouchThreshold clamps to 0.06 floor for very small distances', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0.10),
      faceTouchDistances: Array(100).fill(0.001),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.faceTouchThreshold).toBe(0.06);
  });

  it('faceTouchThreshold clamps to 0.20 ceiling for very large distances', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0.10),
      faceTouchDistances: Array(100).fill(1.0),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.faceTouchThreshold).toBe(0.20);
  });

  it('swayThreshold is derived from 95th percentile * 1.5, clamped to [0.02, 0.10]', () => {
    // 95th percentile of [0.03] * 100 = 0.03; 0.03 * 1.5 = 0.045; clamped to [0.02, 0.10] => 0.045
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0.10),
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(0.03),
    });
    expect(result.swayThreshold).toBeGreaterThanOrEqual(0.02);
    expect(result.swayThreshold).toBeLessThanOrEqual(0.10);
    expect(result.swayThreshold).toBeCloseTo(0.045, 5);
  });

  it('swayThreshold clamps to 0.02 floor for very small deltas', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0.10),
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(0.001),
    });
    expect(result.swayThreshold).toBe(0.02);
  });

  it('swayThreshold clamps to 0.10 ceiling for very large deltas', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: Array(100).fill(0.10),
      faceTouchDistances: Array(100).fill(0.15),
      shoulderDeltas: Array(100).fill(1.0),
    });
    expect(result.swayThreshold).toBe(0.10);
  });

  it('empty measurement arrays return safe floor values (gazeThreshold = 0.10)', () => {
    const result = computeCalibrationProfile({
      gazeOffsets: [],
      faceTouchDistances: [],
      shoulderDeltas: [],
    });
    expect(result.gazeThreshold).toBe(0.10);
    expect(result.faceTouchThreshold).toBe(0.06);
    expect(result.swayThreshold).toBe(0.02);
  });
});
