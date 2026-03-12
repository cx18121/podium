// src/workers/mediapipe.worker.js
// CLASSIC MODE WORKER — do not convert to ES module
// importScripts is required by @mediapipe/tasks-vision internals
importScripts('/mediapipe/vision_bundle.js');

const { FaceLandmarker, GestureRecognizer, PoseLandmarker, FilesetResolver } =
  globalThis.$mediapipe;

let faceLandmarker = null;
let gestureRecognizer = null;
let poseLandmarker = null;

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
      );

      // Initialize all three models — each has a different init path
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
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
    // Spike: just close the bitmap to prove it transfers without error
    if (e.data.bitmap) e.data.bitmap.close();
    self.postMessage({ type: 'frame_ack' });
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
