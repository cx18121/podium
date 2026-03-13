// src/analysis/gestures.test.ts
// VIS-04: Gesture detection tests (face touch + body sway)

import { describe, it, expect } from 'vitest';
import { detectFaceTouch, detectBodySway } from './gestures';

// Build a 478-element face landmark array with default positions
function makeFaceLandmarks(overrides: Record<number, { x: number; y: number }>): { x: number; y: number }[] {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  for (const [idxStr, val] of Object.entries(overrides)) {
    lm[Number(idxStr)] = val;
  }
  return lm;
}

// Build a 21-element hand landmark array (wrist + 20 joints)
function makeHandLandmarks(overrides: Record<number, { x: number; y: number }>): { x: number; y: number }[] {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.0, y: 0.0 }));
  for (const [idxStr, val] of Object.entries(overrides)) {
    lm[Number(idxStr)] = val;
  }
  return lm;
}

// Build a 33-element pose landmark array (PoseLandmarker)
function makePoseLandmarks(overrides: Record<number, { x: number; y: number }>): { x: number; y: number }[] {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
  for (const [idxStr, val] of Object.entries(overrides)) {
    lm[Number(idxStr)] = val;
  }
  return lm;
}

describe('gestures (VIS-04)', () => {
  // Face landmark index 1 = nose tip
  const NOSE_X = 0.5;
  const NOSE_Y = 0.5;

  describe('detectFaceTouch', () => {
    it('returns face_touch event when fingertip (index 4) is within threshold of nose (prevFaceTouching=false)', () => {
      const faceLm = makeFaceLandmarks({ 1: { x: NOSE_X, y: NOSE_Y } });
      // Fingertip at nose position + 0.05 offset (within 0.12 threshold)
      const handLm = makeHandLandmarks({ 4: { x: NOSE_X + 0.05, y: NOSE_Y } });
      const result = detectFaceTouch(faceLm, [handLm], 500, false);
      expect(result.event).not.toBeNull();
      expect(result.event?.type).toBe('face_touch');
      expect(result.event?.timestampMs).toBe(500);
      expect(result.nowTouching).toBe(true);
    });

    it('returns null event when hand is far from face (distance 0.5, prevFaceTouching=false)', () => {
      const faceLm = makeFaceLandmarks({ 1: { x: NOSE_X, y: NOSE_Y } });
      const handLm = makeHandLandmarks({ 4: { x: NOSE_X + 0.5, y: NOSE_Y } });
      const result = detectFaceTouch(faceLm, [handLm], 500, false);
      expect(result.event).toBeNull();
      expect(result.nowTouching).toBe(false);
    });

    it('returns null event (no duplicate) when already touching and still close (prevFaceTouching=true)', () => {
      const faceLm = makeFaceLandmarks({ 1: { x: NOSE_X, y: NOSE_Y } });
      const handLm = makeHandLandmarks({ 4: { x: NOSE_X + 0.05, y: NOSE_Y } });
      const result = detectFaceTouch(faceLm, [handLm], 600, true);
      expect(result.event).toBeNull();
      expect(result.nowTouching).toBe(true);
    });

    it('returns null event and nowTouching=false when no hands present', () => {
      const faceLm = makeFaceLandmarks({ 1: { x: NOSE_X, y: NOSE_Y } });
      const result = detectFaceTouch(faceLm, [], 700, false);
      expect(result.event).toBeNull();
      expect(result.nowTouching).toBe(false);
    });
  });

  describe('detectBodySway', () => {
    // Pose landmarks: left shoulder=11, right shoulder=12
    it('returns body_sway event when shoulder midpoint moves 0.06 (> 0.04 threshold)', () => {
      const prevX = 0.5;
      const newLeftX = 0.56;
      const newRightX = 0.56;
      const newMidX = (newLeftX + newRightX) / 2; // 0.56
      const poseLm = makePoseLandmarks({
        11: { x: newLeftX, y: 0.4 },
        12: { x: newRightX, y: 0.4 },
      });
      const result = detectBodySway(poseLm, prevX, 750);
      expect(result.event).not.toBeNull();
      expect(result.event?.type).toBe('body_sway');
      expect(result.event?.timestampMs).toBe(750);
      expect(result.shoulderX).toBeCloseTo(newMidX, 5);
    });

    it('returns null event when shoulder midpoint moves 0.02 (within 0.04 threshold)', () => {
      const prevX = 0.5;
      const newMidX = 0.52; // delta = 0.02 < 0.04
      const poseLm = makePoseLandmarks({
        11: { x: newMidX, y: 0.4 },
        12: { x: newMidX, y: 0.4 },
      });
      const result = detectBodySway(poseLm, prevX, 800);
      expect(result.event).toBeNull();
      expect(result.shoulderX).toBeCloseTo(newMidX, 5);
    });

    it('returns null event and captures baseline when prevShoulderX=null', () => {
      const midX = 0.5;
      const poseLm = makePoseLandmarks({
        11: { x: midX, y: 0.4 },
        12: { x: midX, y: 0.4 },
      });
      const result = detectBodySway(poseLm, null, 850);
      expect(result.event).toBeNull();
      expect(result.shoulderX).toBeCloseTo(midX, 5);
    });
  });
});
