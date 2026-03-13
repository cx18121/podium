# Phase 2: Analysis Pipeline - Research

**Researched:** 2026-03-12
**Domain:** MediaPipe tasks-vision Web Worker inference, Web Speech API continuous recognition, IndexedDB event log persistence
**Confidence:** HIGH (stack and APIs confirmed; heuristic thresholds are intentionally uncalibrated — first-pass values only)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | MediaPipe inference runs in a Web Worker (not main thread) | Classic-mode worker pattern confirmed in Phase 1; ImageBitmap transfer pattern documented; detectForVideo API verified |
| VIS-02 | Eye contact events detected (gaze toward vs. away) and timestamped | Iris landmarks 468-472 (left) and 473-477 (right) provide iris center; gaze algorithm uses iris center relative to eye corner bounds |
| VIS-03 | Facial expressiveness scored per-segment from landmark blendshapes | 52 named blendshapes available with outputFaceBlendshapes: true; variance across non-neutral blendshapes quantifies expressiveness |
| VIS-04 | Nervous gesture events detected (face touching, body sway) and timestamped | GestureRecognizer hand landmarks (wrist=0, fingertips=4,8,12,16,20) + FaceLandmarker nose landmark; PoseLandmarker shoulder landmarks 11/12 for sway |
| VIS-05 | Frame capture throttled to 5-10 fps during inference | setInterval(100-200ms) frame pump on main thread; createImageBitmap + transfer to worker; worker drops if busy |
| AUD-01 | Real-time speech transcript captured via Web Speech API | SpeechRecognition continuous=true, interimResults=true; onresult event accumulates transcript segments with timestamps |
| AUD-02 | Filler word occurrences detected and timestamped | Regex scan of final result transcripts; event.timeStamp as timestamp; CONSTRAINT: counts are lower bounds due to Chrome suppression |
| AUD-03 | Words per minute calculated from transcript | Word count from final transcripts / elapsed minutes; sampled at session end or per-segment |
| AUD-04 | Significant pauses (>2s) detected and timestamped | Track lastSpeechTimestamp from onspeechend/onspeechstart events; gaps >2000ms become pause events |
</phase_requirements>

---

## Summary

Phase 2 wires three pre-confirmed models (FaceLandmarker, GestureRecognizer, PoseLandmarker) from the Phase 1 spike into a production worker that runs throughout a recording session. The spike confirmed the architecture: a classic-mode Web Worker receives `ImageBitmap` frames transferred from the main thread, runs `detectForVideo` on each, derives events from the landmark/blendshape data, and bulk-writes events to Dexie at session end. Separately, a `SpeechCapture` wrapper runs on the main thread using the Web Speech API continuously throughout the session, tracking transcript segments with timestamps for filler detection and pacing.

The analysis functions (eye contact, expressiveness, gestures) are pure computations over MediaPipe output — no additional libraries are needed. Eye contact uses iris landmark position relative to eye corner bounds (landmarks 468-477). Expressiveness uses variance of active blendshapes from the 52-blendshape output. Face-touch detection uses normalized proximity between hand wrist/fingertip landmarks and the nose/face region. Body sway uses frame-to-frame delta of shoulder midpoint x-coordinate (PoseLandmarker landmarks 11/12).

The main architectural integration challenge is connecting the worker lifecycle to the existing `useRecording` hook without breaking App.tsx's stateless screen design. The worker must start on `startSession`, accumulate events in memory, and flush to Dexie as part of the `recorder.onstop` chain — before `onRecordingReady` is called. Speech capture runs in parallel on the main thread and flushes its events at the same point.

**Primary recommendation:** Build the production ML worker (02-01) first, wire analysis functions into it (02-02), then add speech capture (02-03). Each plan is independently testable: the worker can be tested by sending mock frames, analysis functions are pure and unit-testable, and speech capture can be tested with mocked SpeechRecognition.

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @mediapipe/tasks-vision | 0.10.32 | FaceLandmarker, GestureRecognizer, PoseLandmarker | Already confirmed working in Phase 1 spike; all three models initialized |
| Dexie | 4.x | Write event log to IndexedDB | Already in use; `db.sessions.update(id, { eventLog })` writes the array at session end |
| Web Speech API (browser built-in) | n/a | SpeechRecognition for transcript | No library needed; Chrome/Edge built-in |

### No New npm Dependencies

Phase 2 requires zero new npm packages. All necessary capabilities are provided by:
- `@mediapipe/tasks-vision` (already installed)
- `dexie` (already installed)
- Browser Web Speech API (built-in, no npm package)
- `createImageBitmap` (browser built-in, no library)

**Installation:** No installation step required for Phase 2.

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── workers/
│   └── mediapipe.worker.js        # REPLACE spike version with production version
├── analysis/
│   ├── eyeContact.ts              # Pure function: FaceLandmarkerResult -> EyeContactEvent | null
│   ├── expressiveness.ts          # Pure function: FaceLandmarkerResult[] (segment) -> score
│   └── gestures.ts                # Pure function: GestureRecognizerResult + PoseLandmarkerResult -> GestureEvent | null
├── hooks/
│   ├── useRecording.ts            # EXTEND: start/stop worker lifecycle alongside MediaRecorder
│   └── useSpeechCapture.ts        # NEW: wraps SpeechRecognition, accumulates events
```

### Pattern 1: Production ML Worker with Frame Pump

**What:** Main thread captures video frames at 5-10 fps via `setInterval`, converts to `ImageBitmap`, transfers to worker. Worker runs all three `detectForVideo` calls synchronously and posts back serializable event data.
**When to use:** Throughout a recording session (start to stop).

The critical constraint: `detectForVideo` requires a monotonically increasing timestamp in milliseconds. Use `performance.now()` inside the worker at inference time, NOT the main thread timestamp. This avoids clock skew from transfer latency.

```javascript
// src/workers/mediapipe.worker.js — production version (replaces spike)
// CLASSIC MODE WORKER — do not convert to ES module

importScripts('/mediapipe/vision_bundle.js');
const { FaceLandmarker, GestureRecognizer, PoseLandmarker, FilesetResolver } =
  globalThis.$mediapipe;

let faceLandmarker = null;
let gestureRecognizer = null;
let poseLandmarker = null;
// Accumulated events during the session — flushed on 'stop'
let pendingEvents = [];

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    // ... initialize all three models (same as spike) ...
    pendingEvents = [];
    self.postMessage({ type: 'ready' });
  }

  if (e.data.type === 'frame') {
    const { bitmap, timestampMs } = e.data;
    if (!faceLandmarker || !gestureRecognizer || !poseLandmarker) {
      bitmap.close();
      return;
    }

    try {
      const faceResult = faceLandmarker.detectForVideo(bitmap, timestampMs);
      const gestureResult = gestureRecognizer.recognizeForVideo(bitmap, timestampMs);
      const poseResult = poseLandmarker.detectForVideo(bitmap, timestampMs);
      bitmap.close(); // Always close after use

      // Derive events and push to pendingEvents
      // (eyeContact, expressiveness, gestures analysis happens here)
      const events = deriveEvents(faceResult, gestureResult, poseResult, timestampMs);
      pendingEvents.push(...events);
    } catch (err) {
      bitmap.close();
    }
  }

  if (e.data.type === 'stop') {
    // Flush all accumulated events to main thread
    self.postMessage({ type: 'events', events: pendingEvents });
    pendingEvents = [];
  }

  if (e.data.type === 'cleanup') {
    faceLandmarker?.close();
    gestureRecognizer?.close();
    poseLandmarker?.close();
    faceLandmarker = gestureRecognizer = poseLandmarker = null;
    self.postMessage({ type: 'cleanup_done' });
  }
};
```

```typescript
// Main thread frame pump (inside useRecording hook or a new useMLWorker hook)
// Source: Phase 1 spike confirmed classic-mode pattern; ImageBitmap transfer pattern
//         verified via ankdev.me and MediaPipe issue #4694

import workerUrl from '../workers/mediapipe.worker.js?url';

const worker = new Worker(workerUrl, { type: 'classic' });

let frameInterval: ReturnType<typeof setInterval> | null = null;
const videoEl = document.querySelector('video'); // hidden video showing camera feed

function startFramePump(videoElement: HTMLVideoElement) {
  // 150ms = ~6.7fps — within the 5-10fps budget
  frameInterval = setInterval(async () => {
    if (videoElement.readyState < 2) return; // not ready yet
    const bitmap = await createImageBitmap(videoElement);
    // Transfer ownership — zero copy
    worker.postMessage(
      { type: 'frame', bitmap, timestampMs: performance.now() },
      [bitmap]
    );
  }, 150);
}

function stopFramePump() {
  if (frameInterval) clearInterval(frameInterval);
  frameInterval = null;
}
```

**Critical details:**
- Use `{ type: 'classic' }` — module workers are incompatible with MediaPipe's `importScripts` (confirmed Phase 1)
- Pass `bitmap` in the transferable array `[bitmap]` — zero-copy transfer, avoids serialization overhead
- Always call `bitmap.close()` in the worker after `detectForVideo` — leaked bitmaps accumulate in WASM heap
- If the worker is busy processing a previous frame, the new `bitmap` is still transferred in but MediaPipe will queue it internally — this is fine at 5-10fps

### Pattern 2: Eye Contact Detection from Iris Landmarks

**What:** Compute iris center position relative to the eye corner bounding box; if the iris is outside a centered threshold band, classify as "gaze away".
**When to use:** Per frame, inside the worker's `deriveEvents` function.

MediaPipe FaceLandmarker with `outputFaceBlendshapes: true` returns 478 landmarks. Indices 468-472 are the **left iris** (center at 468), indices 473-477 are the **right iris** (center at 473). Eye corner landmarks: left eye outer corner ≈ 33, inner corner ≈ 133; right eye outer corner ≈ 362, inner corner ≈ 263.

```typescript
// src/analysis/eyeContact.ts
// Source: landmark indices verified via google-ai-edge/mediapipe GitHub issues #2892 and community documentation

const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
// Eye corners for bounding the iris position
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 362;
const RIGHT_EYE_INNER = 263;

// Fraction of eye width at which iris is considered "off center"
// 0.15 = iris center must be within 15% of center — tune after first recordings
const GAZE_THRESHOLD = 0.15;

export interface EyeContactEvent {
  type: 'eye_contact_break' | 'eye_contact_resume';
  timestampMs: number;
}

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
  const irisOffset = Math.abs(leftIris.x - eyeCenterX) / eyeWidth;

  // Mirror check with right iris
  const rightIris = landmarks[RIGHT_IRIS_CENTER];
  const rightOuter = landmarks[RIGHT_EYE_OUTER];
  const rightInner = landmarks[RIGHT_EYE_INNER];
  const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x);
  const rightEyeCenterX = (rightInner.x + rightOuter.x) / 2;
  const rightIrisOffset = Math.abs(rightIris.x - rightEyeCenterX) / rightEyeWidth;

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
```

**Threshold note:** `GAZE_THRESHOLD = 0.15` is an initial heuristic — no calibrated baseline exists. STATE.md documents: "Expressiveness and gesture thresholds uncalibrated: No documented baseline values exist. Phase 2 implements heuristics; plan for threshold-tuning iteration after first real recordings in Phase 3."

### Pattern 3: Expressiveness Scoring from Blendshapes

**What:** Sum variance of active (non-neutral) blendshapes per frame; average over a time window to get a segment expressiveness score.
**When to use:** Per frame in worker; aggregated to a score in `expressiveness.ts`.

The 52 blendshapes include `_neutral` (index 0) plus 51 expression coefficients. All values are 0-1. A flat delivery has most blendshapes near 0; an animated delivery has higher variance across brow/mouth/cheek blendshapes.

```typescript
// src/analysis/expressiveness.ts
// Blendshapes relevant to expressiveness (excludes eye-look, which is used for eye contact)
const EXPRESSION_BLENDSHAPES = [
  'browDownLeft', 'browDownRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight',
  'cheekPuff', 'cheekSquintLeft', 'cheekSquintRight',
  'jawOpen', 'jawForward',
  'mouthSmileLeft', 'mouthSmileRight', 'mouthFrownLeft', 'mouthFrownRight',
  'mouthOpen', 'mouthPucker', 'mouthFunnel',
];

export interface BlendshapeScore {
  categoryName: string;
  score: number; // 0-1
}

// Returns a single expressiveness score 0-1 for this frame
export function scoreExpressiveness(blendshapes: BlendshapeScore[]): number {
  if (!blendshapes || blendshapes.length === 0) return 0;

  const relevant = blendshapes.filter(b => EXPRESSION_BLENDSHAPES.includes(b.categoryName));
  if (relevant.length === 0) return 0;

  // Sum of squares of all relevant blendshape scores — punishes flat (all near 0)
  const sumSq = relevant.reduce((acc, b) => acc + b.score * b.score, 0);
  // Normalize: sqrt of mean squared value, clamped to 0-1
  return Math.min(1, Math.sqrt(sumSq / relevant.length));
}

// Aggregate frame scores over a segment (e.g., every 5 seconds)
export function aggregateExpressiveness(frameScores: number[]): number {
  if (frameScores.length === 0) return 0;
  return frameScores.reduce((a, b) => a + b, 0) / frameScores.length;
}
```

### Pattern 4: Gesture Detection (Face Touch + Body Sway)

**What:** Face-touch = proximity of hand wrist/fingertips to nose/face region. Body sway = frame-to-frame delta of shoulder midpoint x-position.
**When to use:** Per frame in worker.

**Pose landmark indices (verified):**
- Nose: 0
- Left shoulder: 11, Right shoulder: 12
- Left wrist: 15, Right wrist: 16
- Left elbow: 13, Right elbow: 14

**Hand landmark indices (21 total):**
- Wrist: 0
- Thumb tip: 4, Index tip: 8, Middle tip: 12, Ring tip: 16, Pinky tip: 20

```typescript
// src/analysis/gestures.ts
// Face-touch detection: compare hand fingertip normalized coords to nose position
const FACE_TOUCH_THRESHOLD = 0.12; // normalized image units — tune post-Phase 3

export interface GestureEvent {
  type: 'face_touch' | 'body_sway';
  timestampMs: number;
}

export function detectFaceTouch(
  faceLandmarks: { x: number; y: number }[],       // from FaceLandmarkerResult
  handLandmarks: { x: number; y: number }[][],      // from GestureRecognizerResult.landmarks
  timestampMs: number,
  prevFaceTouching: boolean
): { event: GestureEvent | null; nowTouching: boolean } {
  if (!faceLandmarks?.length || !handLandmarks?.length) {
    return { event: null, nowTouching: false };
  }

  const nose = faceLandmarks[1]; // FaceLandmarker nose tip (approx)

  for (const hand of handLandmarks) {
    // Check wrist (0) and fingertips (4, 8, 12, 16, 20)
    for (const idx of [0, 4, 8, 12, 16, 20]) {
      const pt = hand[idx];
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

// Body sway: shoulders midpoint x-drift across frames
const SWAY_THRESHOLD = 0.04; // normalized — tune post-Phase 3

export function detectBodySway(
  poseLandmarks: { x: number; y: number }[],
  prevShoulderX: number | null,
  timestampMs: number
): { event: GestureEvent | null; shoulderX: number | null } {
  if (!poseLandmarks?.length) return { event: null, shoulderX: prevShoulderX };

  const leftShoulder = poseLandmarks[11];
  const rightShoulder = poseLandmarks[12];
  if (!leftShoulder || !rightShoulder) return { event: null, shoulderX: prevShoulderX };

  const midX = (leftShoulder.x + rightShoulder.x) / 2;

  if (prevShoulderX !== null && Math.abs(midX - prevShoulderX) > SWAY_THRESHOLD) {
    return { event: { type: 'body_sway', timestampMs }, shoulderX: midX };
  }
  return { event: null, shoulderX: midX };
}
```

### Pattern 5: Speech Capture (SpeechCapture.ts + fillerDetector.ts + pacing.ts)

**What:** Wrap `SpeechRecognition` for continuous capture during a session. Accumulate final transcript segments with event timestamps. Derive filler events and pacing metrics at session end.
**When to use:** Start alongside recording; stop and flush when recording stops.

**Critical constraint from Phase 1 spike:** Web Speech API partially suppresses um/uh in Chrome. Filler counts are lower bounds, not exact. Design for under-counting from day one.

**Chrome auto-stop behavior:** Chrome stops continuous recognition after ~7-10 seconds of silence. The `onend` event fires. Must auto-restart inside the capture wrapper to maintain continuous capture throughout the session.

```typescript
// src/hooks/useSpeechCapture.ts
export interface TranscriptSegment {
  text: string;
  timestampMs: number; // wall clock when the result fired
  isFinal: boolean;
}

export class SpeechCapture {
  private recognition: SpeechRecognition | null = null;
  private segments: TranscriptSegment[] = [];
  private active = false;
  private sessionStartMs = 0;

  start(sessionStartMs: number) {
    this.sessionStartMs = sessionStartMs;
    this.segments = [];
    this.active = true;
    this.startRecognition();
  }

  private startRecognition() {
    if (!this.active) return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        this.segments.push({
          text: result[0].transcript,
          timestampMs: Date.now() - this.sessionStartMs, // relative to session start
          isFinal: result.isFinal,
        });
      }
    };

    // Auto-restart on silence timeout — Chrome stops recognition after ~7-10s of silence
    rec.onend = () => {
      if (this.active) this.startRecognition();
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech' && this.active) this.startRecognition();
    };

    rec.start();
    this.recognition = rec;
  }

  stop(): TranscriptSegment[] {
    this.active = false;
    this.recognition?.stop();
    this.recognition = null;
    return [...this.segments];
  }
}
```

```typescript
// src/analysis/fillerDetector.ts
// NOTE: counts are LOWER BOUNDS due to Chrome's partial filler suppression (Phase 1 spike finding)
const FILLER_PATTERNS = /\b(um+|uh+|like|you know)\b/gi;

export interface FillerEvent {
  type: 'filler_word';
  timestampMs: number;
  label: string; // 'um', 'uh', 'like', 'you know'
}

export function detectFillers(segments: TranscriptSegment[]): FillerEvent[] {
  const events: FillerEvent[] = [];
  const finalSegments = segments.filter(s => s.isFinal);

  for (const seg of finalSegments) {
    let match: RegExpExecArray | null;
    FILLER_PATTERNS.lastIndex = 0;
    while ((match = FILLER_PATTERNS.exec(seg.text)) !== null) {
      events.push({
        type: 'filler_word',
        timestampMs: seg.timestampMs,
        label: match[0].toLowerCase().replace(/(.)\1+/g, '$1'), // normalize 'umm' -> 'um'
      });
    }
  }
  return events;
}
```

```typescript
// src/analysis/pacing.ts
export interface PacingEvent {
  type: 'pause_detected' | 'wpm_snapshot';
  timestampMs: number;
  label?: string; // e.g. "45 wpm", "3.2s pause"
}

const PAUSE_THRESHOLD_MS = 2000;

export function detectPauses(segments: TranscriptSegment[]): PacingEvent[] {
  const events: PacingEvent[] = [];
  const finalSegments = segments.filter(s => s.isFinal).sort((a, b) => a.timestampMs - b.timestampMs);

  for (let i = 1; i < finalSegments.length; i++) {
    const gap = finalSegments[i].timestampMs - finalSegments[i - 1].timestampMs;
    if (gap > PAUSE_THRESHOLD_MS) {
      events.push({
        type: 'pause_detected',
        timestampMs: finalSegments[i - 1].timestampMs,
        label: `${(gap / 1000).toFixed(1)}s pause`,
      });
    }
  }
  return events;
}

export function calculateWPM(segments: TranscriptSegment[], sessionDurationMs: number): number {
  const allText = segments
    .filter(s => s.isFinal)
    .map(s => s.text)
    .join(' ');
  const wordCount = allText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = sessionDurationMs / 60000;
  return minutes > 0 ? Math.round(wordCount / minutes) : 0;
}
```

### Pattern 6: Dexie Event Log Bulk Write at Session End

**What:** At session end, write the complete event log (visual events from worker + speech events) to the existing session record.
**When to use:** Inside `recorder.onstop` chain, after visual events arrive from worker and speech events are collected.

```typescript
// src/db/db.ts — no schema change needed; eventLog is already in v1 schema

// Usage in App.tsx or useRecording.ts after collecting all events:
await db.sessions.update(sessionId, {
  eventLog: [...visualEvents, ...speechEvents].sort((a, b) => a.timestampMs - b.timestampMs)
});
```

`db.sessions.update(id, changes)` does a partial update — only the specified fields are touched. The `eventLog` array is not indexed, so replacing it with a complete array is the correct approach (no need to read-modify-write, since all events are accumulated in memory during the session and written once at the end).

### Anti-Patterns to Avoid

- **Writing events to Dexie during recording:** IndexedDB writes during active recording compete with MediaRecorder and cause I/O jitter. Accumulate all events in memory (in the worker's `pendingEvents` and `SpeechCapture.segments`) and write once at session end.
- **Passing HTMLVideoElement to worker:** Workers have no DOM access. Only `ImageBitmap` (via `createImageBitmap`) can be passed via transferable. The video element stays on the main thread.
- **Calling `detectForVideo` without an increasing timestamp:** MediaPipe's VIDEO running mode requires monotonically increasing timestamps. If the same timestamp is passed twice, the model may throw or silently skip. Use `performance.now()` in the worker at inference time.
- **Not calling `bitmap.close()` after inference:** Each unclosed bitmap leaks ~4MB of WASM heap. Over a 10-minute session at 6.7fps this equals ~16GB of heap pressure and will crash the tab.
- **Relying on filler counts as exact:** The Phase 1 spike confirmed partial Chrome suppression. `fillerDetector.ts` should comment this constraint; Phase 3 scoring must apply a correction factor.
- **Trusting `continuous: true` alone for full-session capture:** Chrome auto-stops SpeechRecognition after 7-10 seconds of silence. `onend` must trigger `recognition.start()` again while `active === true`.
- **Using `outputFaceBlendshapes: false` (the default):** Blendshapes are disabled by default. Must explicitly set `outputFaceBlendshapes: true` when creating FaceLandmarker options.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face landmark detection | Custom face mesh model | MediaPipe FaceLandmarker | Full 478-point model with iris, pre-WASM compiled, handles all browser edge cases |
| Hand pose estimation | Custom CNN | MediaPipe GestureRecognizer | 21-point hand landmarks + gesture classification built-in |
| Body pose | Custom skeleton tracker | MediaPipe PoseLandmarker | 33-point model with world coordinates; lite model is adequate for sway detection |
| Speech-to-text | Microphone + custom ASR | Web Speech API | Zero latency, no server round-trips, handles noise cancellation; Chrome/Edge native |
| Filler word ML model | Custom classifier | Regex over Web Speech transcript | No ML model needed; filler words are lexically identifiable; simplicity wins |
| Pause detection | Audio level monitoring | Gap between SpeechRecognition result events | Already available from the transcript event stream; no AudioContext needed |

**Key insight:** The expressiveness scoring, eye contact algorithm, face-touch proximity, and sway detection are all custom heuristics on top of MediaPipe output — they ARE hand-rolled by design. The "don't hand-roll" table covers the data acquisition layer, not the analysis layer.

---

## Common Pitfalls

### Pitfall 1: bitmap.close() Omitted After detectForVideo

**What goes wrong:** WASM heap grows steadily during recording, eventually crashing the tab or causing severe slowdown.
**Why it happens:** `ImageBitmap` objects hold GPU/memory resources. Transferring ownership to the worker moves responsibility for cleanup there. `detectForVideo` does not auto-close the bitmap.
**How to avoid:** `bitmap.close()` must be called in every code path in the worker after inference — including error paths. Wrap in try/finally.
**Warning signs:** Memory tab in Chrome DevTools shows linear growth of WASM heap during recording. Phase 2 success criterion 5 explicitly requires verifying no memory leak across 3 sessions.

### Pitfall 2: detectForVideo Timestamp Must Be Monotonically Increasing

**What goes wrong:** Calling `detectForVideo(bitmap, t)` where `t <= previous_t` causes silent wrong results or a MediaPipe exception.
**Why it happens:** VIDEO running mode uses timestamps to build temporal consistency models. Out-of-order timestamps break the internal state.
**How to avoid:** Use `performance.now()` captured inside the worker at the exact moment of inference call. Do NOT reuse the `timestampMs` sent from the main thread (it arrives late due to transfer time).
**Warning signs:** Eye contact or blendshape values suddenly freeze or snap to wrong values mid-session.

### Pitfall 3: Chrome SpeechRecognition Auto-Stops on Silence

**What goes wrong:** After 7-10 seconds of silence, Chrome fires `onend` and recognition stops. The rest of the session produces no transcript.
**Why it happens:** Chrome's cloud speech service has a silence timeout that fires `onend` even in `continuous: true` mode.
**How to avoid:** Restart recognition in `onend` handler while `active === true`. The `SpeechCapture` class pattern above implements this.
**Warning signs:** After a long pause, no more filler or WPM events appear in the event log.

### Pitfall 4: Worker Frame Queue Backup

**What goes wrong:** At 6.7fps, if inference takes >150ms (which is possible on slow devices), frames queue up in the worker's message channel, causing ever-increasing lag.
**Why it happens:** `setInterval` on the main thread fires even if the worker hasn't finished the previous frame.
**How to avoid:** The worker should maintain a `busy` flag and skip (close + discard) incoming frames when busy. Alternatively, use a request-response pattern where main thread only sends the next frame after receiving `frame_ack`.
**Warning signs:** Event timestamps diverge from actual recording time as the session progresses.

### Pitfall 5: FaceLandmarker Not Configured for Blendshapes

**What goes wrong:** `result.faceBlendshapes` is undefined or empty even though FaceLandmarker is working.
**Why it happens:** `outputFaceBlendshapes` defaults to `false` in the FaceLandmarker options.
**How to avoid:** Set `outputFaceBlendshapes: true` in `FaceLandmarker.createFromOptions`.
**Warning signs:** `faceResult.faceBlendshapes` is `[]` or `undefined` on every frame.

### Pitfall 6: GestureRecognizer Returns Hand World Coordinates, Not Image Coordinates

**What goes wrong:** Face-touch proximity calculation gives wrong results because hand and face landmark coordinates are in different spaces.
**Why it happens:** `GestureRecognizerResult` has both `landmarks` (normalized image 0-1) and `worldLandmarks` (meters from camera). FaceLandmarker similarly has both. The proximity check must use the same coordinate space.
**How to avoid:** Use `result.landmarks` (normalized image coordinates) for both face and hand proximity calculation.
**Warning signs:** Face-touch events fire when hands are clearly away from the face, or never fire when hands are touching.

### Pitfall 7: No Camera Feed Available for createImageBitmap

**What goes wrong:** `createImageBitmap(videoElement)` returns a blank/black image if the video element is not visible or has no srcObject.
**Why it happens:** The Phase 1 design hides the camera feed (`RecordingScreen` shows no video). The raw `MediaStream` must be assigned to a hidden `<video>` element whose `srcObject` is set to the stream, even though it's not displayed to the user.
**How to avoid:** In `useRecording`, after `getUserMedia` succeeds, create a hidden `<video>` element (or use a ref), set `srcObject = stream`, call `video.play()`. This provides the frame source for `createImageBitmap` without showing the camera feed.
**Warning signs:** All frames produce zero/empty MediaPipe results; WASM processes black frames correctly but finds no face.

---

## Code Examples

### FaceLandmarker Init with Blendshapes Enabled

```javascript
// src/workers/mediapipe.worker.js
// Source: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFaceBlendshapes: true,      // REQUIRED for expressiveness analysis
  outputFacialTransformationMatrices: false, // not needed
});
```

### detectForVideo Call Pattern

```javascript
// Inside worker, with timestamp captured in worker scope
// Source: ankdev.me guide + MediaPipe issue #4694
const timestampMs = performance.now(); // NOT e.data.timestampMs — avoid clock skew
const faceResult = faceLandmarker.detectForVideo(bitmap, timestampMs);
// faceResult.faceLandmarks[0][468] = left iris center (x, y, z)
// faceResult.faceBlendshapes[0] = array of { categoryName, score } objects
```

### Dexie Update at Session End

```typescript
// Source: https://dexie.org/docs/Table/Table.update()
// Replaces eventLog array in one atomic write — no read-then-write needed
await db.sessions.update(sessionId, {
  eventLog: allEvents.sort((a, b) => a.timestampMs - b.timestampMs),
});
```

### Hidden Video Element for Frame Capture

```typescript
// In useRecording.ts startSession():
// After getUserMedia succeeds, wire stream to a hidden video for createImageBitmap
const hiddenVideo = document.createElement('video');
hiddenVideo.srcObject = stream;
hiddenVideo.muted = true;
hiddenVideo.playsInline = true;
await hiddenVideo.play();
// hiddenVideo is not added to the DOM — only used for createImageBitmap
videoRef.current = hiddenVideo;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Face Mesh (legacy MediaPipe) | FaceLandmarker (tasks-vision) | 2022 | Now has 478 pts with iris; blendshapes; VIDEO mode with temporal consistency |
| Polling video at RAF (~60fps) | Throttled setInterval (150ms = ~6.7fps) | Design intent | CPU budget: 3 models × ~50ms each = ~150ms/frame; 6.7fps fills the budget |
| Main-thread MediaPipe | Web Worker with ImageBitmap transfer | Phase 1 confirmed | Keeps UI (timer + stop button) fully responsive during recording |
| SpeechRecognition.onresult only | onresult + onend auto-restart | Known Chrome behavior | Prevents silent failure after 7-10s silence |

**Deprecated/outdated:**
- MediaPipe Face Mesh (legacy, `@mediapipe/face_mesh`): Replaced by FaceLandmarker in `@mediapipe/tasks-vision`. Do not use.
- `recognizeForVideo(video, timestamp, callback)` callback-style: The tasks-vision package returns results synchronously from `recognizeForVideo`; the callback parameter is optional and not needed in VIDEO mode.

---

## Open Questions

1. **Hidden video element ownership — hook vs. App**
   - What we know: `useRecording` owns the `MediaStream`. The hidden video must be wired to this stream. `App.tsx` must not need to know about the video element.
   - What's unclear: Whether the hidden video element lives inside `useRecording` (cleaner encapsulation) or is a new `useMLWorker` hook that wraps `useRecording`.
   - Recommendation: Keep in `useRecording` — it already owns the stream lifecycle. Add a `videoRef` internally.

2. **Worker lifecycle integration point — useRecording vs. separate hook**
   - What we know: The worker must start on session start and stop (flush) on session stop. Both trigger points are inside `useRecording`.
   - What's unclear: Whether the worker logic should live directly in `useRecording` (simpler) or in a new `useMLWorker` hook that `useRecording` calls (better separation of concerns).
   - Recommendation: New `useMLWorker` hook composed inside `useRecording`. Each hook is unit-testable independently.

3. **Expressiveness segment boundary — time-based vs. event-based**
   - What we know: The roadmap says "per-segment" expressiveness. No segment definition is specified.
   - What's unclear: Whether segments are fixed time windows (e.g., every 5 seconds) or natural speech segments.
   - Recommendation: Use 5-second rolling windows for Phase 2 simplicity. Phase 3 scorer can re-aggregate.

4. **GAZE_THRESHOLD and FACE_TOUCH_THRESHOLD calibration**
   - What we know: No published baseline values for these heuristics. STATE.md documents this as an open concern.
   - Recommendation: Ship Phase 2 with conservative defaults (GAZE_THRESHOLD = 0.15, FACE_TOUCH_THRESHOLD = 0.12). After first real recordings in Phase 3, tune based on false positives/negatives.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed; `vitest` script in package.json) |
| Config file | `vite.config.ts` (test block) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | Worker receives frames and posts results back without blocking main thread | unit (Worker mock) | `npx vitest run src/workers/mediapipe.worker.test.ts` | Wave 0 |
| VIS-02 | detectEyeContact returns 'eye_contact_break' when iris is off-center | unit (pure fn) | `npx vitest run src/analysis/eyeContact.test.ts` | Wave 0 |
| VIS-03 | scoreExpressiveness returns higher value for animated vs flat blendshapes | unit (pure fn) | `npx vitest run src/analysis/expressiveness.test.ts` | Wave 0 |
| VIS-04 | detectFaceTouch fires event when hand landmark near nose landmark | unit (pure fn) | `npx vitest run src/analysis/gestures.test.ts` | Wave 0 |
| VIS-04 | detectBodySway fires event when shoulder midpoint moves > threshold | unit (pure fn) | `npx vitest run src/analysis/gestures.test.ts` | Wave 0 |
| VIS-05 | Frame pump fires at ~6-7fps; main thread remains unblocked | manual browser test | n/a — timing test in real browser | manual-only |
| AUD-01 | SpeechCapture accumulates transcript segments with timestamps | unit (mock SpeechRecognition) | `npx vitest run src/hooks/useSpeechCapture.test.ts` | Wave 0 |
| AUD-01 | SpeechCapture auto-restarts after onend fires while active | unit (mock SpeechRecognition) | `npx vitest run src/hooks/useSpeechCapture.test.ts` | Wave 0 |
| AUD-02 | detectFillers returns filler events from transcript segments | unit (pure fn) | `npx vitest run src/analysis/fillerDetector.test.ts` | Wave 0 |
| AUD-03 | calculateWPM returns correct WPM for known word count and duration | unit (pure fn) | `npx vitest run src/analysis/pacing.test.ts` | Wave 0 |
| AUD-04 | detectPauses returns pause events for gaps > 2000ms between segments | unit (pure fn) | `npx vitest run src/analysis/pacing.test.ts` | Wave 0 |
| memory leak | 3 session start/stop cycles leave WASM heap at baseline | manual browser test | n/a — DevTools memory profiler | manual-only |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/analysis/eyeContact.test.ts` — covers VIS-02 (pure function tests with fixture landmark arrays)
- [ ] `src/analysis/expressiveness.test.ts` — covers VIS-03 (flat vs animated blendshape fixtures)
- [ ] `src/analysis/gestures.test.ts` — covers VIS-04 (face-touch and sway with fixture landmark arrays)
- [ ] `src/analysis/fillerDetector.test.ts` — covers AUD-02 (filler regex tests)
- [ ] `src/analysis/pacing.test.ts` — covers AUD-03 and AUD-04 (WPM and pause detection)
- [ ] `src/hooks/useSpeechCapture.test.ts` — covers AUD-01 (mock SpeechRecognition + auto-restart)
- [ ] `src/workers/mediapipe.worker.test.ts` — covers VIS-01 (worker message protocol with mocked MediaPipe)

No new framework installation needed — Vitest and all test utilities are already installed.

---

## Sources

### Primary (HIGH confidence)

- MediaPipe FaceLandmarker Web guide — https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js — detectForVideo API, blendshapes configuration, Web Worker recommendation
- MediaPipe GestureRecognizer Web guide — https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js — recognizeForVideo, GestureRecognizerResult structure
- MediaPipe PoseLandmarker Web guide — https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js — detectForVideo, 33 landmark output
- MediaPipe blendshapes source (GitHub) — https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/cc/vision/face_landmarker/face_blendshapes_graph.cc — authoritative 52 blendshape names
- Dexie.js Table.update() docs — https://dexie.org/docs/Table/Table.update() — partial update pattern, non-indexed field replacement
- MDN Web Speech API — https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API — SpeechRecognition continuous, interimResults, onresult event
- Phase 1 spike SUMMARY (01-02-SUMMARY.md) — locked architectural facts: classic-mode worker confirmed, filler suppression confirmed

### Secondary (MEDIUM confidence)

- ankdev.me MediaPipe worker guide — https://ankdev.me/blog/how-to-run-mediapipe-task-vision-in-a-web-worker — ImageBitmap transfer pattern, performance.now() for timestamps
- MediaPipe issue #4694 — https://github.com/google-ai-edge/mediapipe/issues/4694 — worker ImageBitmap transfer, serializable result data constraint
- Iris landmark indices (community verified) — indices 468-472 = left iris, 473-477 = right iris — confirmed via multiple sources (MediaPipe issue #2892, community articles)
- PoseLandmarker 33 landmark indices — shoulder=11/12, wrist=15/16, nose=0 — confirmed via multiple sources

### Tertiary (LOW confidence)

- GAZE_THRESHOLD = 0.15, FACE_TOUCH_THRESHOLD = 0.12, SWAY_THRESHOLD = 0.04 — initial heuristics with no calibrated baseline; must be tuned after Phase 3 first recordings
- Chrome SpeechRecognition 7-10s silence timeout — observed community behavior, not officially documented; restart pattern is the standard workaround
- Chrome SpeechRecognition 5-minute instability — reported in community issues; mitigated by auto-restart on `onend`

---

## Metadata

**Confidence breakdown:**

- Standard stack (no new deps): HIGH — all required APIs are already installed or browser-built-in
- Architecture (worker frame pump): HIGH — confirmed in Phase 1 spike; ImageBitmap transfer well-documented
- API specifics (detectForVideo, blendshapes): HIGH — verified against official Google AI Edge documentation
- Iris landmark indices (468-477): MEDIUM — confirmed via multiple community sources + GitHub issues; not in main official guide page
- Analysis heuristics (thresholds): LOW — no calibrated baseline exists; design intent is to tune in Phase 3

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days; MediaPipe issues and Chrome Speech API behavior may evolve)
