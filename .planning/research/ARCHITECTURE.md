# Architecture Research

**Domain:** Browser-based ML analysis / presentation coaching tool
**Researched:** 2026-03-12
**Confidence:** HIGH (for established patterns), MEDIUM (for worker threading specifics)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI Layer (Main Thread)                      │
├──────────────┬──────────────┬──────────────────┬────────────────────┤
│  Session UI  │  Playback UI │  History/Dashboard│   Scorecard UI     │
│  (record,    │  (video +    │  (past sessions,  │   (per-dimension   │
│   timer,     │   timeline   │   trend charts)   │    scores)         │
│   stop)      │   markers)   │                   │                    │
└──────┬───────┴──────┬───────┴──────────┬────────┴──────────┬─────────┘
       │              │                  │                   │
┌──────┴──────────────┴──────────────────┴───────────────────┴─────────┐
│                      Orchestration Layer                              │
│   SessionController  │  PlaybackController  │  AnalysisAggregator    │
│   (manages recording │  (syncs video to     │  (computes scores from │
│    + analysis flow)  │   event timeline)    │   raw event streams)   │
└──────┬───────────────┴──────────┬────────────┴──────────────┬────────┘
       │                          │                            │
┌──────┴──────────────────────────┴────────────────────────────┴────────┐
│                       Analysis Pipeline Layer                          │
├────────────────────┬──────────────────────┬────────────────────────────┤
│   MediaCapture     │   ML Workers         │   Speech Analyzer          │
│   (getUserMedia,   │   (Web Workers with  │   (Web Speech API,         │
│    MediaRecorder,  │    MediaPipe —        │    transcript, filler      │
│    Blob chunks)    │    face, hands, pose) │    words, pacing)          │
└────────────────────┴──────────────────────┴────────────────────────────┘
       │                          │                            │
┌──────┴──────────────────────────┴────────────────────────────┴────────┐
│                        Persistence Layer                               │
│                      Dexie.js / IndexedDB                              │
│   sessions table   │   events table       │   blobs (video Blobs)     │
│   (metadata,       │   (timestamped       │   stored as ArrayBuffer    │
│    scores)         │    landmarks/words)  │   or Blob in IDB           │
└────────────────────┴──────────────────────┴────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Session UI | Distraction-free recording view (timer, stop button) | React component, no UI during active recording |
| Playback UI | Annotated video playback with timeline markers | `<video>` element + Canvas overlay + custom timeline |
| History/Dashboard | List past sessions, trend charts | Table/list + charting library |
| Scorecard UI | Post-session per-dimension scores | Static render after analysis complete |
| SessionController | Coordinates start/stop, wires media + workers together | Class or context that owns MediaRecorder + worker refs |
| PlaybackController | Syncs `video.currentTime` to event marker visibility | Uses `requestVideoFrameCallback` or `timeupdate` |
| AnalysisAggregator | Folds raw event streams into per-dimension scores | Pure functions run after session ends |
| MediaCapture | Acquires camera + mic, records Blob chunks | `getUserMedia` + `MediaRecorder` |
| ML Workers | Runs MediaPipe face/hand/pose inference off main thread | Web Workers (classic mode) with `importScripts` |
| Speech Analyzer | Produces transcript + detects filler words | Web Speech API `SpeechRecognition` (main thread only) |
| Dexie/IndexedDB | Persists sessions, events, video Blob | Dexie.js tables with versioned schema |

## Recommended Project Structure

```
src/
├── capture/                # MediaRecorder + getUserMedia
│   ├── MediaCapture.ts     # Wraps getUserMedia, returns MediaStream
│   └── Recorder.ts         # Wraps MediaRecorder, emits Blob chunks
├── workers/                # Web Worker files (built separately by bundler)
│   ├── mediapipe.worker.ts # Runs face/hand/pose detection
│   └── workerBridge.ts     # Main-thread API for posting to worker
├── speech/                 # Web Speech API integration
│   ├── SpeechCapture.ts    # SpeechRecognition lifecycle
│   └── fillerDetector.ts   # Post-processing: filler word matching
├── analysis/               # Score computation from raw events
│   ├── eyeContact.ts       # Gaze direction from face landmarks
│   ├── expressiveness.ts   # Landmark variance for facial animation
│   ├── gestures.ts         # Hand + pose landmark heuristics
│   ├── pacing.ts           # WPM + pause detection from transcript
│   └── aggregator.ts       # Rolls all dimensions into session scores
├── db/                     # Dexie schema + query helpers
│   ├── schema.ts           # Table definitions and versions
│   ├── sessions.ts         # Session CRUD
│   └── events.ts           # Timestamped event read/write
├── playback/               # Video playback + annotation overlay
│   ├── AnnotatedPlayer.tsx # <video> + Canvas overlay component
│   ├── Timeline.tsx        # Marker timeline below video
│   └── eventSync.ts        # Maps video.currentTime to visible markers
├── ui/                     # View-level React components
│   ├── SessionView.tsx     # Recording screen
│   ├── PlaybackView.tsx    # Post-session annotated review
│   ├── HistoryView.tsx     # Past sessions list
│   └── ScorecardView.tsx   # Final score breakdown
└── session/                # Orchestration
    ├── SessionController.ts  # Wires capture + workers + speech
    └── PlaybackController.ts # Drives playback state
```

### Structure Rationale

- **capture/:** Isolated from everything else — purely acquires media streams and raw Blob chunks, no analysis logic
- **workers/:** Built as separate entry points by Vite (worker: true config); kept separate because they run in a different thread context and cannot import DOM-dependent code
- **speech/:** Web Speech API must run on the main thread (browser requirement); kept separate from workers to make that constraint explicit
- **analysis/:** Pure functions operating on already-captured event data; can be tested without any browser APIs
- **db/:** Single module owns all IndexedDB schema migration; nothing else talks to Dexie directly
- **playback/:** Owns only the replay concern; deliberately separated from capture so they can evolve independently

## Architectural Patterns

### Pattern 1: Capture-then-Analyze (not real-time overlay)

**What:** All ML inference runs during the recording session and results are stored as timestamped events. The UI during recording shows nothing — analysis is revealed only in playback.

**When to use:** When distraction-free recording is a product requirement. Avoids the cost of rendering overlays during capture.

**Trade-offs:** Analysis results are not visible during the session (intended), but everything must be processed and persisted before playback is available. Adds a brief post-processing step when recording stops.

```typescript
// SessionController flow
async stopSession() {
  recorder.stop();                   // finalizes Blob
  speechCapture.stop();              // finalizes transcript
  const events = await workerBridge.flush(); // drain buffered landmarks
  const scores = aggregator.compute(events, transcript);
  await db.sessions.add({ ...metadata, scores });
  await db.events.bulkAdd(events);
  await db.blobs.put(videoBlob, sessionId);
  navigate(`/playback/${sessionId}`);
}
```

### Pattern 2: Main-thread Frame Pump → Worker

**What:** The main thread captures `ImageBitmap` from the live video element each animation frame and transfers it (zero-copy) to the MediaPipe worker. Results (landmark arrays) flow back via `postMessage`.

**When to use:** Required because MediaPipe tasks-vision uses `importScripts` internally and the `HTMLVideoElement` cannot be passed to a worker directly.

**Trade-offs:** Main thread does one `createImageBitmap(video)` call per frame — cheap but not free. Worker handles all WASM/GPU inference. Results arrive asynchronously; buffer them with a timestamp queue.

```typescript
// workerBridge.ts (main thread)
function pumpFrame(video: HTMLVideoElement, timestamp: number) {
  createImageBitmap(video).then(bitmap => {
    worker.postMessage({ type: 'frame', bitmap, timestamp }, [bitmap]);
  });
}

// mediapipe.worker.ts
onmessage = ({ data }) => {
  if (data.type === 'frame') {
    const result = faceLandmarker.detectForVideo(data.bitmap, data.timestamp);
    data.bitmap.close(); // prevent memory leak
    postMessage({ type: 'landmarks', result, timestamp: data.timestamp });
  }
};
```

### Pattern 3: Event Stream → Timestamped Store

**What:** All analysis outputs (landmarks, transcript fragments, filler words) are stored as discrete timestamped events in IndexedDB during the session. The aggregator runs over this stream after recording stops.

**When to use:** This project — enables flexible post-session scoring without re-processing video.

**Trade-offs:** Requires buffering events in memory during recording and bulk-writing at session end. IndexedDB writes are async but can be batched. Event volume is manageable (one landmark event per frame at ~5–10 fps analysis rate, transcript events as they arrive).

```typescript
// Schema pattern in db/events.ts
interface AnalysisEvent {
  id?: number;
  sessionId: string;
  timestamp: number;         // ms from session start
  type: 'landmark' | 'filler' | 'transcript' | 'pause';
  payload: unknown;          // type-narrowed on read
}
```

### Pattern 4: Annotated Playback with Canvas Overlay

**What:** A `<video>` element plays back the recorded Blob URL. A `<canvas>` is positioned absolutely over it. On each frame tick (`requestVideoFrameCallback` or `timeupdate`), visible events are fetched from the event store and rendered on the canvas.

**When to use:** Any project needing per-frame or per-timestamp annotations without re-encoding video.

**Trade-offs:** `requestVideoFrameCallback` gives the most accurate frame timing but has limited browser support (Chrome/Edge). `timeupdate` fires ~4x/sec — sufficient for coarse markers. Timeline scrubbing requires querying events by timestamp range.

```typescript
video.requestVideoFrameCallback((_, { mediaTime }) => {
  const active = events.filter(e =>
    e.timestamp >= mediaTime * 1000 - WINDOW &&
    e.timestamp <= mediaTime * 1000 + WINDOW
  );
  renderOverlay(ctx, active);
  video.requestVideoFrameCallback(...); // re-queue
});
```

## Data Flow

### Recording Flow

```
User clicks "Start"
    ↓
SessionController.start()
    ↓
MediaCapture.acquire()     →  MediaStream (video + audio tracks)
    ↓                              ↓
Recorder.start(stream)     workerBridge.init()   SpeechCapture.start()
    ↓                              ↓                     ↓
Blob chunks buffered        Frame pump loop       SpeechRecognitionEvents
    ↓                              ↓                     ↓
User clicks "Stop"
    ↓
SessionController.stop()
    ├─→ Blob assembled from chunks
    ├─→ Worker drains landmark buffer
    ├─→ SpeechCapture finalizes transcript
    └─→ AnalysisAggregator.compute(events + transcript)
            ↓
        Scores computed
            ↓
        Dexie.sessions.add()  +  Dexie.events.bulkAdd()  +  Dexie.blobs.put()
            ↓
        Navigate → PlaybackView
```

### Playback Flow

```
User opens PlaybackView(sessionId)
    ↓
Load session metadata + events from Dexie
Load video Blob → createObjectURL() → video.src
    ↓
video plays
    ↓
requestVideoFrameCallback fires per frame
    ↓
eventSync queries events near current timestamp
    ↓
Canvas overlay renders active markers
Timeline renders all markers as positioned dots
    ↓
User scrubs → video.currentTime updates → overlay re-renders
```

### State Management

```
App-level state (React context or Zustand):
  - currentSession: { id, status: 'idle'|'recording'|'processing'|'done' }
  - playbackSession: { id, events[], scores }

No global realtime state during recording — SessionController owns it imperatively.
Playback is read-only: load once from Dexie, pass as props.
```

### Key Data Flows

1. **Landmark events:** Worker posts landmarks → main thread receives, timestamps, buffers in memory array → bulk-written to Dexie at session end
2. **Speech events:** `SpeechRecognition.onresult` on main thread → filter for filler words → append to in-memory transcript buffer → written to Dexie at session end
3. **Video Blob:** `MediaRecorder.ondataavailable` → push chunks to array → `new Blob(chunks)` on stop → stored in IndexedDB as Blob → retrieved via `createObjectURL` at playback
4. **Scores:** `AnalysisAggregator` reads full event arrays in memory post-session → returns score object → stored in session row → displayed in Scorecard

## Build Order (Component Dependencies)

The dependency graph implies this build sequence:

```
Phase 1 — Foundation (no ML, no analysis)
  db/schema.ts               (no deps)
  capture/MediaCapture.ts    (no deps)
  capture/Recorder.ts        (depends on MediaCapture)
  ui/SessionView.tsx         (depends on Recorder)

Phase 2 — Storage + Playback
  db/sessions.ts, db/events.ts, db/blobs.ts   (depends on schema)
  playback/AnnotatedPlayer.tsx                (depends on db reads, Blob URL)
  playback/Timeline.tsx
  playback/eventSync.ts

Phase 3 — ML Worker Pipeline
  workers/mediapipe.worker.ts     (isolated, no app deps)
  workers/workerBridge.ts         (depends on worker)
  session/SessionController.ts    (depends on Recorder + workerBridge)

Phase 4 — Speech Analysis
  speech/SpeechCapture.ts
  speech/fillerDetector.ts
  (integrate into SessionController)

Phase 5 — Scoring & Scorecard
  analysis/eyeContact.ts
  analysis/expressiveness.ts
  analysis/gestures.ts
  analysis/pacing.ts
  analysis/aggregator.ts
  ui/ScorecardView.tsx

Phase 6 — History
  ui/HistoryView.tsx   (depends on db/sessions.ts)
```

**Rationale:** Foundation first means you can test recording before any ML. Workers are isolated — they can be developed and tested in parallel with speech analysis. Scoring is last because it depends on all event sources being finalized.

## Scaling Considerations

This is a fully client-side, single-user app. Scaling considerations are about browser resource limits, not server load.

| Concern | At 10 sessions | At 100 sessions | At 1000+ sessions |
|---------|----------------|-----------------|-------------------|
| Video storage | Fine — IndexedDB quota ~500MB+ on desktop | May hit storage pressure; show warnings | Need session pruning / export flow |
| Event query speed | Fine — full scan over small table | Add timestamp index in Dexie schema | Range queries by sessionId + timestamp |
| Analysis time | <1s for a 5-min session | Same — per-session, not cumulative | Same |
| Worker memory | ~200MB for 3 MediaPipe models | Same — models loaded once per session | Same |

### Scaling Priorities

1. **First bottleneck:** IndexedDB storage quota for video Blobs — mitigate by offering session export and delete, and warning when storage > 80% full
2. **Second bottleneck:** Model load time at session start (~2–4 seconds for 3 MediaPipe models) — mitigate by lazy-loading and caching WASM/model files via service worker or `Cache API`

## Anti-Patterns

### Anti-Pattern 1: Running MediaPipe on the Main Thread

**What people do:** Call `detectForVideo()` synchronously in a `requestAnimationFrame` loop on the main thread.

**Why it's wrong:** MediaPipe WASM inference blocks the JS event loop. At 30fps this freezes the UI and audio processing. The MediaPipe docs explicitly warn that `detect()` and `detectForVideo()` are synchronous and block the UI thread.

**Do this instead:** Initialize MediaPipe inside a classic Web Worker. Send `ImageBitmap` (transferable, zero-copy) from main thread. Receive landmark results via `postMessage`. Main thread remains free for UI and speech recognition.

### Anti-Pattern 2: Storing Video as Base64 in localStorage

**What people do:** Convert recorded video Blob to a base64 data URL and store in `localStorage`.

**Why it's wrong:** `localStorage` is synchronous and limited to ~5–10MB. A 5-minute 720p recording at even low bitrate can be 50–200MB. Base64 encoding adds ~33% overhead. App will throw `QuotaExceededError` after a few sessions.

**Do this instead:** Store the raw `Blob` directly in IndexedDB using Dexie. IndexedDB stores Blobs natively without encoding overhead and the quota is orders of magnitude larger.

### Anti-Pattern 3: Analyzing on Every Video Frame

**What people do:** Run all three MediaPipe models (face, hand, pose) on every frame of the 30fps video stream during recording.

**Why it's wrong:** Three concurrent model inferences at 30fps saturates the worker thread and GPU, causing frame drops and landmark buffer overflow. For behavioral coaching, 5–10 fps analysis is sufficient — human movement during a presentation changes slowly.

**Do this instead:** Throttle the frame pump. Process every 3rd–6th video frame (configurable). Interpolate landmark positions between analyzed frames if smooth playback overlay is desired.

### Anti-Pattern 4: Merging Recording State into React State

**What people do:** Store `MediaRecorder`, `MediaStream`, `Worker` references, and recording status all in React `useState` or a Redux store.

**Why it's wrong:** React state triggers re-renders. Storing heavyweight objects (streams, workers) in state causes unexpected cleanup on re-renders and makes lifecycle management fragile. `MediaRecorder` must be stopped before the stream is released — React's lifecycle doesn't guarantee the right order.

**Do this instead:** Own the session lifecycle imperatively in a `SessionController` class (or a custom hook with refs). Expose only the minimal status (`idle | recording | processing | done`) to React state for UI rendering. Wire start/stop explicitly.

### Anti-Pattern 5: Loading All MediaPipe Models at App Start

**What people do:** Initialize all three MediaPipe landmarkers in a `useEffect` when the app first loads.

**Why it's wrong:** Three models total ~10–20MB of WASM + model weights. Loading on cold start adds 3–8 seconds before the user can do anything, including just browsing history.

**Do this instead:** Lazy-initialize workers when the user navigates to the recording view. Show a brief "Getting ready..." state. Cache WASM and model files using the `Cache API` so subsequent sessions are near-instant.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) | NPM package loaded in Web Worker via `importScripts` (classic worker) | Must bundle as UMD/IIFE for worker context; Vite worker config needed |
| Web Speech API | Browser built-in, main thread only; `SpeechRecognition` or `webkitSpeechRecognition` | Chrome sends audio to Google's servers — cannot be fully offline; Firefox lacks support |
| IndexedDB / Dexie.js | NPM package, used in main thread and service worker | Schema versioning required from day one; migrations are painful to retrofit |
| getUserMedia / MediaRecorder | Browser built-in, main thread | Requires HTTPS in production; localhost works without HTTPS in dev |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Main thread ↔ ML Worker | `postMessage` + Transferable (`ImageBitmap`) | Worker must be classic mode (not ES module) for MediaPipe `importScripts` |
| SessionController ↔ Dexie | Direct async calls | No abstraction needed at v1 scale; add repository pattern if testing becomes complex |
| SessionController ↔ React UI | Minimal: exposes status string + callback refs | React should not own the controller; controller drives UI via status updates |
| Playback ↔ Dexie | Read-only queries at load time; no live subscription | Load events once for a session, hold in component memory during playback |
| Analysis functions ↔ event arrays | Pure functions, no I/O | Keep stateless for testability |

## Sources

- [MediaPipe Face Landmarker Web Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js) — official docs confirming synchronous blocking + worker recommendation (HIGH confidence)
- [How to run @mediapipe/tasks-vision in a web worker](https://ankdev.me/blog/how-to-run-mediapipe-task-vision-in-a-web-worker) — concrete worker pattern with `importScripts` constraint (MEDIUM confidence — community blog, verified against MediaPipe source behavior)
- [Run Holistic in a Web Worker — GitHub Issue #2506](https://github.com/google/mediapipe/issues/2506) — `ImageBitmap` transfer pattern, OffscreenCanvas limitations (MEDIUM confidence)
- [7 Dos and Don'ts of Using ML on the Web with MediaPipe](https://developers.googleblog.com/7-dos-and-donts-of-using-ml-on-the-web-with-mediapipe/) — lazy init, model caching, resource cleanup (HIGH confidence — official Google Developers Blog)
- [Web Speech API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — continuous recognition, interim/final results (HIGH confidence)
- [OffscreenCanvas in Web Workers — DEV Community](https://dev.to/sachinchaurasiya/how-to-use-canvas-in-web-workers-with-offscreencanvas-5540) — `createImageBitmap` transfer pattern (MEDIUM confidence)
- [requestVideoFrameCallback — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback) — accurate frame timing for annotation sync (HIGH confidence)
- [Dexie.js](https://dexie.org) — Blob storage in IndexedDB (HIGH confidence — official docs)
- [MediaPipe Web Integration — DeepWiki](https://deepwiki.com/google-ai-edge/mediapipe/4.3-web-integration) — GraphRunner, WASM bridge architecture overview (MEDIUM confidence)

---
*Architecture research for: browser-based ML analysis / presentation coaching tool*
*Researched: 2026-03-12*
