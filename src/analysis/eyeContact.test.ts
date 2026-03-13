// src/analysis/eyeContact.test.ts
// VIS-02: Eye contact detection tests

import { describe, it, expect } from 'vitest';
import { detectEyeContact } from './eyeContact';

// Build a 478-element landmark array with neutral positions (x=0.5, y=0.5, z=0).
// Specific indices are overridden to set up test fixtures.
function makeLandmarks(overrides: Record<number, { x: number; y: number; z: number }>): { x: number; y: number; z: number }[] {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [idxStr, val] of Object.entries(overrides)) {
    landmarks[Number(idxStr)] = val;
  }
  return landmarks;
}

describe('eyeContact (VIS-02)', () => {
  // Key indices
  // LEFT_EYE_OUTER=33, LEFT_EYE_INNER=133, LEFT_IRIS_CENTER=468
  // RIGHT_EYE_OUTER=362, RIGHT_EYE_INNER=263, RIGHT_IRIS_CENTER=473
  //
  // Default positions: outer=0.5, inner=0.5 -> eyeWidth=0, need to set corners apart.
  // We'll set left eye outer=0.3, inner=0.7 -> eyeWidth=0.4, eyeCenterX=0.5
  // iris at center (x=0.5) -> irisOffset = 0 / 0.4 = 0
  // iris off-center at x=0.5 + 0.4*0.20 = 0.58 -> irisOffset = 0.08/0.4 = 0.20

  const EYE_OUTER_X = 0.3;
  const EYE_INNER_X = 0.7;
  const EYE_CENTER_X = 0.5;
  const EYE_WIDTH = 0.4; // abs(inner - outer)

  function makeDirectLandmarks(): { x: number; y: number; z: number }[] {
    // Both irises at center of their respective eyes
    return makeLandmarks({
      33: { x: EYE_OUTER_X, y: 0.5, z: 0 },     // LEFT_EYE_OUTER
      133: { x: EYE_INNER_X, y: 0.5, z: 0 },    // LEFT_EYE_INNER
      468: { x: EYE_CENTER_X, y: 0.5, z: 0 },   // LEFT_IRIS_CENTER — offset 0
      362: { x: EYE_OUTER_X, y: 0.5, z: 0 },    // RIGHT_EYE_OUTER
      263: { x: EYE_INNER_X, y: 0.5, z: 0 },    // RIGHT_EYE_INNER
      473: { x: EYE_CENTER_X, y: 0.5, z: 0 },   // RIGHT_IRIS_CENTER — offset 0
    });
  }

  function makeOffCenterLandmarks(): { x: number; y: number; z: number }[] {
    // Left iris off-center: offset = 0.20 > GAZE_THRESHOLD(0.15)
    const leftIrisOffCenterX = EYE_CENTER_X + EYE_WIDTH * 0.20; // 0.5 + 0.08 = 0.58
    return makeLandmarks({
      33: { x: EYE_OUTER_X, y: 0.5, z: 0 },
      133: { x: EYE_INNER_X, y: 0.5, z: 0 },
      468: { x: leftIrisOffCenterX, y: 0.5, z: 0 }, // irisOffset = 0.20
      362: { x: EYE_OUTER_X, y: 0.5, z: 0 },
      263: { x: EYE_INNER_X, y: 0.5, z: 0 },
      473: { x: EYE_CENTER_X, y: 0.5, z: 0 },   // right iris at center
    });
  }

  it('returns null event and preserves direct state when iris is at center (prevState=direct)', () => {
    const result = detectEyeContact(makeDirectLandmarks(), 1000, 'direct');
    expect(result.event).toBeNull();
    expect(result.newState).toBe('direct');
  });

  it('returns eye_contact_break event and away state when iris is off-center (prevState=direct)', () => {
    const result = detectEyeContact(makeOffCenterLandmarks(), 1000, 'direct');
    expect(result.event).not.toBeNull();
    expect(result.event?.type).toBe('eye_contact_break');
    expect(result.event?.timestampMs).toBe(1000);
    expect(result.newState).toBe('away');
  });

  it('returns eye_contact_resume event and direct state when iris returns to center (prevState=away)', () => {
    const result = detectEyeContact(makeDirectLandmarks(), 2000, 'away');
    expect(result.event).not.toBeNull();
    expect(result.event?.type).toBe('eye_contact_resume');
    expect(result.event?.timestampMs).toBe(2000);
    expect(result.newState).toBe('direct');
  });

  it('returns null event and preserves prevState when landmarks.length < 478', () => {
    const shortLandmarks = Array.from({ length: 100 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    const result = detectEyeContact(shortLandmarks, 500, 'away');
    expect(result.event).toBeNull();
    expect(result.newState).toBe('away');
  });
});
