// src/workers/mediapipe.worker.js
// CLASSIC MODE WORKER — do not convert to ES module
// importScripts is required by @mediapipe/tasks-vision internals
importScripts('/mediapipe/vision_bundle.js');

const { FaceLandmarker, GestureRecognizer, PoseLandmarker, FilesetResolver } =
  globalThis.$mediapipe;

let faceLandmarker = null;
let gestureRecognizer = null;
let poseLandmarker = null;

// pendingEvents accumulates all SessionEvent objects for the session duration.
// Flushed on 'stop' and returned to the main thread.
let pendingEvents = [];

// busy flag prevents frame backup (Pitfall 4: if a frame takes >150ms to process,
// the next frame must be dropped rather than queued to avoid heap exhaustion)
let busy = false;

// Analysis state — module-level, reset on 'init'
let eyeContactState = 'direct';     // 'direct' | 'away'
let prevShoulderX = null;           // number | null
let prevFaceTouching = false;       // boolean
let expressionFrameScores = [];     // rolling per-frame scores for 5s windows

// ============================================================
// Inlined analysis functions (no ES module imports in classic-mode worker)
// Source: src/analysis/eyeContact.ts, expressiveness.ts, gestures.ts
// ============================================================

// --- eyeContact ---
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 362;
const RIGHT_EYE_INNER = 263;
const GAZE_THRESHOLD = 0.15;

function detectEyeContact(landmarks, timestampMs, prevState) {
  if (!landmarks || landmarks.length < 478) {
    return { event: null, newState: prevState };
  }
  const leftIris = landmarks[LEFT_IRIS_CENTER];
  const leftOuter = landmarks[LEFT_EYE_OUTER];
  const leftInner = landmarks[LEFT_EYE_INNER];
  const eyeWidth = Math.abs(leftInner.x - leftOuter.x);
  const eyeCenterX = (leftInner.x + leftOuter.x) / 2;
  const irisOffset = eyeWidth > 0 ? Math.abs(leftIris.x - eyeCenterX) / eyeWidth : 0;

  const rightIris = landmarks[RIGHT_IRIS_CENTER];
  const rightOuter = landmarks[RIGHT_EYE_OUTER];
  const rightInner = landmarks[RIGHT_EYE_INNER];
  const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x);
  const rightEyeCenterX = (rightInner.x + rightOuter.x) / 2;
  const rightIrisOffset = rightEyeWidth > 0 ? Math.abs(rightIris.x - rightEyeCenterX) / rightEyeWidth : 0;

  const isDirect = irisOffset < GAZE_THRESHOLD && rightIrisOffset < GAZE_THRESHOLD;
  const newState = isDirect ? 'direct' : 'away';

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

// --- expressiveness ---
const EXPRESSION_BLENDSHAPES = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'jawOpen', 'jawForward',
  'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthOpen', 'mouthPucker', 'mouthFunnel',
];

function scoreExpressiveness(blendshapes) {
  if (!blendshapes || blendshapes.length === 0) return 0;
  const relevant = blendshapes.filter(b => EXPRESSION_BLENDSHAPES.includes(b.categoryName));
  if (relevant.length === 0) return 0;
  const sumSq = relevant.reduce((acc, b) => acc + b.score * b.score, 0);
  return Math.min(1, Math.sqrt(sumSq / relevant.length));
}

function aggregateExpressiveness(frameScores) {
  if (frameScores.length === 0) return 0;
  return frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
}

// --- gestures ---
const FACE_TOUCH_THRESHOLD = 0.12;
const SWAY_THRESHOLD = 0.04;
const HAND_CHECK_INDICES = [0, 4, 8, 12, 16, 20];
const NOSE_TIP_INDEX = 1;
const LEFT_SHOULDER_INDEX = 11;
const RIGHT_SHOULDER_INDEX = 12;

function detectFaceTouch(faceLandmarks, handLandmarks, timestampMs, prevFaceTouching) {
  if (!faceLandmarks || !faceLandmarks.length || !handLandmarks || !handLandmarks.length) {
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

function detectBodySway(poseLandmarks, prevShoulderXVal, timestampMs) {
  if (!poseLandmarks || !poseLandmarks.length) return { event: null, shoulderX: prevShoulderXVal };
  const leftShoulder = poseLandmarks[LEFT_SHOULDER_INDEX];
  const rightShoulder = poseLandmarks[RIGHT_SHOULDER_INDEX];
  if (!leftShoulder || !rightShoulder) return { event: null, shoulderX: prevShoulderXVal };
  const midX = (leftShoulder.x + rightShoulder.x) / 2;
  if (prevShoulderXVal !== null && Math.abs(midX - prevShoulderXVal) > SWAY_THRESHOLD) {
    return { event: { type: 'body_sway', timestampMs }, shoulderX: midX };
  }
  return { event: null, shoulderX: midX };
}

// ============================================================
// deriveEvents — wired to all three analysis functions (02-02)
// ============================================================
function deriveEvents(faceResult, gestureResult, poseResult, timestampMs) {
  const events = [];

  // Eye contact
  if (faceResult.faceLandmarks && faceResult.faceLandmarks[0]) {
    const { event, newState } = detectEyeContact(
      faceResult.faceLandmarks[0], timestampMs, eyeContactState
    );
    eyeContactState = newState;
    if (event) events.push(event);
  }

  // Expressiveness — accumulate per-frame score; emit segment event every ~5 seconds
  // At 150ms frame interval, 5000ms / 150ms ~= 33 frames per segment
  if (faceResult.faceBlendshapes && faceResult.faceBlendshapes[0]) {
    const score = scoreExpressiveness(faceResult.faceBlendshapes[0]);
    expressionFrameScores.push({ score, timestampMs });
    if (expressionFrameScores.length >= 33) {
      const avg = aggregateExpressiveness(expressionFrameScores.map(f => f.score));
      events.push({ type: 'expressiveness_segment', timestampMs, label: avg.toFixed(2) });
      expressionFrameScores = [];
    }
  }

  // Face touch
  if (faceResult.faceLandmarks && faceResult.faceLandmarks[0]) {
    const handLms = (gestureResult.landmarks != null) ? gestureResult.landmarks : [];
    const { event, nowTouching } = detectFaceTouch(
      faceResult.faceLandmarks[0], handLms, timestampMs, prevFaceTouching
    );
    prevFaceTouching = nowTouching;
    if (event) events.push(event);
  }

  // Body sway
  if (poseResult.landmarks && poseResult.landmarks[0]) {
    const { event, shoulderX } = detectBodySway(
      poseResult.landmarks[0], prevShoulderX, timestampMs
    );
    prevShoulderX = shoulderX;
    if (event) events.push(event);
  }

  return events;
}

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    // Reset events and analysis state on init so a reused worker starts fresh
    pendingEvents = [];
    eyeContactState = 'direct';
    prevShoulderX = null;
    prevFaceTouching = false;
    expressionFrameScores = [];
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
      );

      // FaceLandmarker MUST have outputFaceBlendshapes: true —
      // the default is false and expressiveness analysis will silently get empty blendshapes without it
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      });

      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      self.postMessage({ type: 'ready', models: ['FaceLandmarker', 'GestureRecognizer', 'PoseLandmarker'] });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message, stack: err.stack });
    }
  }

  if (e.data.type === 'frame') {
    const bitmap = e.data.bitmap;

    // Drop frame if any model is uninitialized
    if (!faceLandmarker || !gestureRecognizer || !poseLandmarker) {
      if (bitmap) bitmap.close();
      return;
    }

    // Drop frame if previous frame is still processing (Pitfall 4: prevents frame backup)
    if (busy) {
      if (bitmap) bitmap.close();
      return;
    }

    busy = true;
    try {
      // Use performance.now() at the moment of inference — NOT e.data.timestampMs.
      // Main-thread timestamps arrive late due to transfer overhead (Pitfall 2 from RESEARCH.md).
      const nowMs = performance.now();

      const faceResult = faceLandmarker.detectForVideo(bitmap, nowMs);
      const gestureResult = gestureRecognizer.recognizeForVideo(bitmap, nowMs);
      const poseResult = poseLandmarker.detectForVideo(bitmap, nowMs);

      const derived = deriveEvents(faceResult, gestureResult, poseResult, nowMs);
      if (derived.length > 0) {
        pendingEvents.push(...derived);
      }

      self.postMessage({ type: 'frame_ack' });
    } finally {
      // bitmap.close() MUST be in try/finally — a leaked bitmap = ~4MB WASM heap (Pitfall 3)
      if (bitmap) bitmap.close();
      busy = false;
    }
  }

  if (e.data.type === 'stop') {
    // Flush accumulated events and reset for next session
    self.postMessage({ type: 'events', events: [...pendingEvents] });
    pendingEvents = [];
  }

  if (e.data.type === 'cleanup') {
    try {
      faceLandmarker?.close();
      gestureRecognizer?.close();
      poseLandmarker?.close();
      faceLandmarker = null;
      gestureRecognizer = null;
      poseLandmarker = null;
      self.postMessage({ type: 'cleanup_done' });
    } catch (err) {
      self.postMessage({ type: 'cleanup_error', message: err.message });
    }
  }
};
