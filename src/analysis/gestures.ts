// src/analysis/gestures.ts
// VIS-04: Gesture detection — face touch and body sway
// Uses normalized image coordinates (result.landmarks) for both face and hand proximity.
// Do NOT use worldLandmarks (meter-scale) — coordinate spaces must match (RESEARCH.md Pitfall 6).

// Normalized image units — tune post-Phase 3 after first real recordings
const FACE_TOUCH_THRESHOLD = 0.12;
const SWAY_THRESHOLD = 0.04;

// Hand landmark indices checked for proximity: wrist (0) + all fingertips (4,8,12,16,20)
const HAND_CHECK_INDICES = [0, 4, 8, 12, 16, 20];

// FaceLandmarker nose tip index in 478-point model
const NOSE_TIP_INDEX = 1;

// PoseLandmarker shoulder indices
const LEFT_SHOULDER_INDEX = 11;
const RIGHT_SHOULDER_INDEX = 12;

export interface GestureEvent {
  type: 'face_touch' | 'body_sway';
  timestampMs: number;
}

/**
 * Pure function: detects face-touch events by checking proximity of hand
 * wrist and fingertip landmarks to the nose tip landmark.
 * State (prevFaceTouching) is passed in and returned out — prevents duplicate events.
 */
export function detectFaceTouch(
  faceLandmarks: { x: number; y: number }[],
  handLandmarks: { x: number; y: number }[][],
  timestampMs: number,
  prevFaceTouching: boolean
): { event: GestureEvent | null; nowTouching: boolean } {
  if (!faceLandmarks?.length || !handLandmarks?.length) {
    return { event: null, nowTouching: false };
  }

  const nose = faceLandmarks[NOSE_TIP_INDEX];

  for (const hand of handLandmarks) {
    for (const idx of HAND_CHECK_INDICES) {
      const pt = hand[idx];
      if (!pt) continue;
      const dist = Math.sqrt((pt.x - nose.x) ** 2 + (pt.y - nose.y) ** 2);
      if (dist < FACE_TOUCH_THRESHOLD) {
        if (!prevFaceTouching) {
          return { event: { type: 'face_touch', timestampMs }, nowTouching: true };
        }
        return { event: null, nowTouching: true };
      }
    }
  }
  return { event: null, nowTouching: false };
}

/**
 * Pure function: detects body sway events by measuring shoulder midpoint x-drift
 * between frames. Returns the new shoulderX for the caller to store as prevShoulderX.
 * On first call (prevShoulderX=null), captures baseline without emitting an event.
 */
export function detectBodySway(
  poseLandmarks: { x: number; y: number }[],
  prevShoulderX: number | null,
  timestampMs: number
): { event: GestureEvent | null; shoulderX: number | null } {
  if (!poseLandmarks?.length) return { event: null, shoulderX: prevShoulderX };

  const leftShoulder = poseLandmarks[LEFT_SHOULDER_INDEX];
  const rightShoulder = poseLandmarks[RIGHT_SHOULDER_INDEX];
  if (!leftShoulder || !rightShoulder) return { event: null, shoulderX: prevShoulderX };

  const midX = (leftShoulder.x + rightShoulder.x) / 2;

  if (prevShoulderX !== null && Math.abs(midX - prevShoulderX) > SWAY_THRESHOLD) {
    return { event: { type: 'body_sway', timestampMs }, shoulderX: midX };
  }
  return { event: null, shoulderX: midX };
}
