// src/analysis/eyeContact.ts
// VIS-02: Eye contact detection from FaceLandmarker iris landmarks
// Source: landmark indices verified via google-ai-edge/mediapipe GitHub issues #2892 and community documentation

const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 362;
const RIGHT_EYE_INNER = 263;

// Fraction of eye width at which iris is considered "off center"
// 0.15 = iris center must be within 15% of eye width from center — tune after first recordings in Phase 3
const GAZE_THRESHOLD = 0.15;

export interface EyeContactEvent {
  type: 'eye_contact_break' | 'eye_contact_resume';
  timestampMs: number;
}

/**
 * Pure function: detects eye contact state transitions per frame.
 * State is passed in and returned out — the caller (the worker) owns eyeContactState between frames.
 */
export function detectEyeContact(
  landmarks: { x: number; y: number; z: number }[],
  timestampMs: number,
  prevState: 'direct' | 'away'
): { event: EyeContactEvent | null; newState: 'direct' | 'away' } {
  if (!landmarks || landmarks.length < 478) {
    return { event: null, newState: prevState };
  }

  const leftIris = landmarks[LEFT_IRIS_CENTER];
  const leftOuter = landmarks[LEFT_EYE_OUTER];
  const leftInner = landmarks[LEFT_EYE_INNER];
  const eyeWidth = Math.abs(leftInner.x - leftOuter.x);
  const eyeCenterX = (leftInner.x + leftOuter.x) / 2;
  const irisOffset = eyeWidth > 0 ? Math.abs(leftIris.x - eyeCenterX) / eyeWidth : 0;

  // Mirror check with right iris
  const rightIris = landmarks[RIGHT_IRIS_CENTER];
  const rightOuter = landmarks[RIGHT_EYE_OUTER];
  const rightInner = landmarks[RIGHT_EYE_INNER];
  const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x);
  const rightEyeCenterX = (rightInner.x + rightOuter.x) / 2;
  const rightIrisOffset = rightEyeWidth > 0 ? Math.abs(rightIris.x - rightEyeCenterX) / rightEyeWidth : 0;

  // Both eyes must be direct for isDirect = true; either off-center triggers 'away'
  const isDirect = irisOffset < GAZE_THRESHOLD && rightIrisOffset < GAZE_THRESHOLD;
  const newState: 'direct' | 'away' = isDirect ? 'direct' : 'away';

  if (newState !== prevState) {
    return {
      event: {
        type: newState === 'away' ? 'eye_contact_break' : 'eye_contact_resume',
        timestampMs,
      },
      newState,
    };
  }
  return { event: null, newState };
}
