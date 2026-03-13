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

// deriveEvents — stub that returns [] for now.
// Plan 02-02 will populate this with real analysis calls to eyeContact, expressiveness, gestures.
function deriveEvents(faceResult, gestureResult, poseResult, timestampMs) {
  return [];
}

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    // Reset events on init so a reused worker starts fresh
    pendingEvents = [];
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
