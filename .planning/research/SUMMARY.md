# Project Research Summary

**Project:** Cognitive Load Mapper (Browser-based Presentation Coaching Tool)
**Domain:** Client-side ML / real-time video analysis / public speaking practice
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project is a zero-install, fully client-side browser application that records a user's webcam and microphone, runs three MediaPipe ML models (face, hand, pose landmarks) in a Web Worker, analyzes speech via the Web Speech API, and presents annotated video playback with timestamped coaching feedback. The technical approach is well-established — the MediaPipe Tasks Vision API, MediaRecorder, and IndexedDB are all production-grade — but the combination of three concurrent inference models, streaming speech recognition, and seekable video playback in a single browser tab requires careful architectural discipline from day one. The dominant pattern is capture-then-analyze: record everything, analyze in parallel during the session, surface all feedback post-session via an annotated timeline rather than real-time overlays.

The recommended stack is React 19 + TypeScript + Vite 7 + `@mediapipe/tasks-vision` + Web Speech API + Dexie.js + Zustand. There are no better-fit alternatives for the core requirements. The architecture must isolate MediaPipe inference in a Web Worker from the first commit — this is not a refactor that can be deferred. Six critical pitfalls exist, three of which (Chrome filler-word suppression, MediaRecorder unseekable WebM, MediaPipe worker loading bugs) can silently appear "working" in development while being completely broken in practice. Each must be verified with an explicit spike test before any feature work depends on it.

The key market differentiator is the annotated video timeline with timestamped events — no existing lightweight browser tool does this. The privacy story (100% client-side, no upload) is a genuine secondary differentiator versus all cloud-based competitors (Yoodli, Orai, PowerPoint Speaker Coach). The hardest technical signals are nervous gesture detection and facial expressiveness calibration; both are included in v1 per project decision but carry the highest false-positive risk and will likely need iteration after initial user feedback.

---

## Key Findings

### Recommended Stack

The stack is purpose-built around browser-native capabilities with no server dependency. `@mediapipe/tasks-vision@0.10.21` (the unified Tasks API) provides all three landmark detectors from a single package; it runs WASM + WebGL and delivers 60+ FPS on GPU delegate and 10–15 FPS CPU-only. Web Speech API handles real-time transcription at zero dependency cost, but it is Chrome/Edge-only and sends audio to Google servers. Dexie.js wraps IndexedDB for video Blob persistence — localStorage is a hard disqualifier at any realistic video size. One important version friction: npm is stuck at 0.10.21 while GitHub has 0.10.26; this is a known lag and is not a blocker, but worth monitoring.

**Core technologies:**
- React 19 + TypeScript 5.8: UI framework — concurrent rendering keeps UI responsive during heavy WASM inference; full MediaPipe types ship with the package
- Vite 7: Build tool — native ES module HMR, first-class Web Worker support (`worker: { format: 'es' }` required in config)
- `@mediapipe/tasks-vision@0.10.21`: All ML inference — FaceLandmarker (468 pts), HandLandmarker (21 pts), PoseLandmarker (33 pts); single WASM runtime shared across all three
- Web Speech API (browser built-in): Real-time transcription — Chrome/Edge only; `interimResults: true` for word-level filler detection
- MediaRecorder API (browser built-in): Webcam + mic capture — WebM output requires `fix-webm-duration` post-processing before storage
- Dexie.js 4.3.0: IndexedDB persistence — stores video Blobs, session metadata, and timestamped event arrays; `useLiveQuery` for reactive history
- Zustand 5.x: Global UI state — minimal boilerplate for a single-user local app
- `fix-webm-duration`: Required preprocessing step — MediaRecorder WebM output lacks seek metadata; must be applied before any Blob is stored

### Expected Features

The feature dependency graph is critical: recording is the root; everything else flows from it. Annotated video playback is the product's core differentiator and depends on a correct event timestamp log schema established during recording. The scorecard depends on all five analysis dimensions being stable. Session history depends on a locked score schema — schema changes after v1 make historical data incomparable.

**Must have (table stakes):**
- Webcam + mic recording with distraction-free UI — product foundation; users expect graceful permission error handling
- Eye contact tracking via iris landmarks — highest-visibility coaching metric; every competitor has this
- Filler word detection (um, uh, like, you know) — universally understood metric; audio pipeline validator
- Words-per-minute and pause detection — shares transcript with filler words; low marginal cost
- Post-session scorecard with per-dimension scores — closes the feedback loop; without it the session has no payoff
- Annotated video playback with timestamped event markers — the core differentiator; no lightweight browser tool does this
- Session history with trend across sessions — validates the "improvement over time" value proposition

**Should have (competitive):**
- Facial expressiveness scoring via MediaPipe blendshapes — differentiator; competitors ignore visual expressiveness
- Nervous gesture detection (face touch, sway) — differentiator; hardest signal, highest false-positive risk; needs baseline calibration
- Timestamped, searchable transcript alongside playback — enhances the annotated playback UX
- Per-dimension trend charts (sparklines) — activates once 5+ sessions accumulate
- Export session data (JSON/CSV) — trust builder before any cloud sync

**Defer (v2+):**
- Cloud sync / user accounts — full backend scope; defer until local-only is proven insufficient
- AI-generated coaching tips — competitors report users stop reading after 2–3 sessions; focus on quantitative data first
- Slide deck integration — significant scope increase; only worth it if users repeatedly request it
- Multi-language filler word lists — defer until non-English users appear

**Anti-features to avoid:**
- Real-time feedback overlay during recording — breaks the simulation; project explicitly rules this out
- Social sharing features — privacy-sensitive data; users practicing sensitive content will not accept this

### Architecture Approach

The architecture is a four-layer system: UI Layer (React views) → Orchestration Layer (SessionController, PlaybackController, AnalysisAggregator) → Analysis Pipeline Layer (MediaCapture, ML Workers, Speech Analyzer) → Persistence Layer (Dexie/IndexedDB). The dominant patterns are capture-then-analyze (not real-time overlay), a main-thread frame pump transferring `ImageBitmap` zero-copy to a Web Worker, an event stream timestamped store written in bulk at session end, and a Canvas overlay synced to video currentTime via `requestVideoFrameCallback` at playback.

**Major components:**
1. SessionController — wires MediaCapture + ML Worker + SpeechCapture together; owns recording lifecycle imperatively (not in React state)
2. ML Worker (mediapipe.worker.ts) — isolated Web Worker running all three landmark models sequentially per frame at 5–10 fps; posts landmark arrays back to main thread
3. SpeechCapture + fillerDetector — Web Speech API runs on main thread only (browser requirement); produces transcript with timestamps and filler event stream
4. AnnotatedPlayer + eventSync — `<video>` element with Canvas overlay; `requestVideoFrameCallback` drives event marker rendering synced to playback position
5. Dexie schema (sessions + events + blobs tables) — schema versioned from day one; blobs stored in non-indexed object store; metadata/events indexed separately
6. AnalysisAggregator — pure functions over in-memory event arrays after session end; stateless and fully testable without browser APIs

### Critical Pitfalls

1. **Chrome suppresses filler words in Web Speech API transcripts** — Test with actual um/uh-heavy speech before writing any detection logic. If suppressed (confirmed behavior), fall back to Whisper.wasm or Web Audio API `AnalyserNode` heuristics. Recovery cost: HIGH (feature redesign + 1–2 weeks).

2. **MediaRecorder WebM output cannot be seeked (duration = Infinity)** — Apply `fix-webm-duration` synchronously in the `MediaRecorder stop` handler, tracking elapsed time during recording, before any Blob is stored in IndexedDB. Raw blobs stored without this fix are permanently unseekable. Recovery cost: HIGH (no retroactive fix possible for stored sessions).

3. **MediaPipe in Web Workers has known loading bugs on Mac Chrome** — Spike test: load all three models in a classic Web Worker, run inference on a test frame, verify on Mac Chrome + Windows Chrome before any feature work. Keep a main-thread fallback path. Recovery cost: HIGH (worker refactor is 3–5 days if deferred).

4. **Three MediaPipe models at 30fps saturate CPU** — Cap inference to 5–10 fps from the start; use sequential per-frame (FaceLandmarker → HandLandmarker → PoseLandmarker) rather than concurrent; use lite model variants. Recovery cost: HIGH if architected wrong (structural refactor).

5. **MediaPipe memory leak from missing `.close()` calls** — Call `.close()` on every task instance in the `useEffect` cleanup and recording stop handler. Make cleanup idempotent because React 19 StrictMode double-mounts in development. Recovery cost: LOW if caught during development.

6. **IndexedDB storage eviction on Safari (7-day inactivity policy)** — Call `navigator.storage.persist()` on first launch. Implement `navigator.storage.estimate()` quota check before recording starts; block recording and warn if < 200MB free. Recovery cost: MEDIUM (data already lost cannot be recovered).

---

## Implications for Roadmap

Based on the dependency graph from FEATURES.md and the build order from ARCHITECTURE.md, and front-loading pitfall mitigation from PITFALLS.md, the following phase structure is recommended:

### Phase 1: Infrastructure Spike and Foundation
**Rationale:** The three highest-recovery-cost pitfalls (MediaPipe worker bugs, filler word suppression, WebM seek) must be verified as solvable before any feature work depends on them. This phase de-risks the entire architecture. The build order from ARCHITECTURE.md also places schema and media capture first — nothing else can be built without them.
**Delivers:** Working project scaffold (Vite + React + TS + Tailwind), verified MediaPipe-in-worker spike (all 3 models loading and inferring on Mac + Windows Chrome), confirmed Web Speech API filler word output behavior with um/uh test, Dexie schema v1 (sessions + events + blobs tables with proper non-indexed blob store), `navigator.storage.persist()` called on app load.
**Addresses:** Webcam + mic permission handling, Dexie schema design
**Avoids:** MediaPipe worker loading crash (Pitfall 4), filler word suppression discovery late (Pitfall 1), schema migration pain (lock schema early)

### Phase 2: Recording Pipeline
**Rationale:** Recording is the root of the feature dependency graph. No other feature can be built until recording produces a correctly formed, seekable video Blob and a working event timestamp log. The event log schema established here cannot change without breaking history.
**Delivers:** Distraction-free recording UI (timer + stop only), `MediaCapture` + `Recorder` producing WebM Blob chunks, `fix-webm-duration` applied synchronously on stop before IndexedDB write, in-memory event timestamp buffer (the schema for landmark/filler/transcript/pause events), session saved to Dexie on stop, MediaStream tracks stopped on exit (camera light off).
**Uses:** MediaRecorder API, Dexie sessions/blobs tables, `fix-webm-duration`, SessionController (imperative, not React state)
**Avoids:** Unseekable WebM (Pitfall 2), React state storing MediaRecorder refs (Architecture anti-pattern 4)

### Phase 3: ML Inference Worker Pipeline
**Rationale:** The Worker architecture established in Phase 1 spike becomes production-ready here. All three landmark models must run in the Worker before speech analysis (Phase 4) integrates, because SessionController wires all three together. Frame throttling and memory cleanup must be correct before any analysis code runs on top.
**Delivers:** Production `mediapipe.worker.ts` with `ImageBitmap` transfer pattern, `workerBridge.ts` on main thread, frame pump throttled to 5–10 fps via configurable frame skip, all three landmarkers initialized with lazy loading and warm-up dummy frame, `.close()` called in all cleanup paths (idempotent), Worker-produced landmark events written to in-memory buffer and bulk-committed to Dexie `events` table at session end, memory stability verified (3 record/stop cycles, WASM heap returns to baseline).
**Uses:** `@mediapipe/tasks-vision`, Web Worker (classic mode), `ImageBitmap` Transferable, Dexie events table
**Implements:** ML Worker component, workerBridge, frame pump pattern, event stream → timestamped store pattern
**Avoids:** MediaPipe on main thread (Pitfall 3), memory leak from missing .close() (Pitfall 5), 30fps inference saturation (Pitfall 3)

### Phase 4: Speech Analysis
**Rationale:** Speech analysis runs on the main thread (Web Speech API browser constraint) and integrates into SessionController alongside the ML worker. Pacing and filler word detection share the same transcript — they must be built together in a single pass.
**Delivers:** `SpeechCapture.ts` wrapping `SpeechRecognition` lifecycle, `fillerDetector.ts` matching against configurable filler word list, pacing analysis (WPM + pause detection from word timestamps), transcript events with ms-offset timestamps written to event buffer, navigator.onLine check with offline warning, verification that Chrome actually preserves um/uh in transcripts (or fallback decision executed).
**Uses:** Web Speech API, `speech/SpeechCapture.ts`, `speech/fillerDetector.ts`, `analysis/pacing.ts`
**Avoids:** Building filler detection on unverified Chrome output (Pitfall 1 — must be confirmed in Phase 1 spike and handled here definitively)

### Phase 5: Analysis Aggregation and Scorecard
**Rationale:** The scorecard is a downstream aggregation and cannot be reliable until all five analysis dimensions (eye contact, expressiveness, gestures, filler words, pacing) produce stable output. Building the scorecard before individual metrics are stable risks surfacing bad scores. This phase also locks the score schema for history.
**Delivers:** `analysis/eyeContact.ts` (gaze direction from iris landmarks), `analysis/expressiveness.ts` (blendshape variance scoring), `analysis/gestures.ts` (hand-to-face proximity + hip/shoulder sway heuristics), `analysis/aggregator.ts` (pure functions folding all event streams into per-dimension scores), `ScorecardView.tsx` displaying per-dimension scores with what drove them, score schema locked in Dexie sessions table.
**Uses:** Analysis pure functions (testable without browser APIs), ScorecardView
**Implements:** AnalysisAggregator component
**Research flag:** Expressiveness scoring and gesture detection heuristics are empirically driven — threshold values will need tuning after first real recordings. Plan for iteration.

### Phase 6: Annotated Playback
**Rationale:** Annotated playback is the product's core differentiator. It depends on Phase 2 (seekable video Blob), Phase 3 (landmark events in Dexie), and Phase 4 (speech events in Dexie). Building it last ensures all data it needs to display is correct and stable.
**Delivers:** `AnnotatedPlayer.tsx` with Canvas overlay, `Timeline.tsx` with positioned event marker dots, `eventSync.ts` mapping `video.currentTime` to visible events, `PlaybackView.tsx` tying it together, `requestVideoFrameCallback` for frame-accurate marker sync (with `timeupdate` fallback), confirmed seekable playback (video.duration !== Infinity), scrubbing to arbitrary timestamps verified.
**Uses:** `<video>` element + Canvas, Dexie events read-only queries, `requestVideoFrameCallback`, eventSync
**Implements:** Annotated playback with Canvas overlay pattern
**Avoids:** Infinite duration broken scrubber UX (confirmed fixed by Phase 2)

### Phase 7: Session History and Persistence Polish
**Rationale:** History is the final downstream consumer. It requires a stable score schema (locked in Phase 5) and correct persistence (established in Phase 2). Storage quota management and the "looks done but isn't" checklist items belong here.
**Delivers:** `HistoryView.tsx` with session list (metadata only, no blob preload), per-dimension trend sparklines across last N sessions, storage quota display + delete-session flow, `navigator.storage.estimate()` quota warning before recording, Safari 7-day eviction protection verified, export session data (JSON).
**Uses:** Dexie sessions + events (metadata queries only), charting library for trends
**Avoids:** Loading all session blobs on history page (performance trap), silent quota failure (Pitfall 6)

### Phase Ordering Rationale

- **Spike first:** Three architectural risks (MediaPipe worker loading, filler word suppression, WebM seek) have HIGH recovery cost if discovered late. Front-loading them as Phase 1 makes every subsequent phase build on verified foundations.
- **Recording before analysis:** The event timestamp log schema is established in Phase 2. Any analysis that depends on it (Phases 3–7) cannot be built on a schema that will change. Lock it early.
- **Workers before speech:** Phase 3 (ML worker) and Phase 4 (speech) both integrate into SessionController. Workers go first because the worker architecture is the bigger structural risk.
- **Aggregator before playback:** Annotated playback in Phase 6 renders whatever data is in the event store. That data needs to be correct and meaningful before the playback UX is built on top of it.
- **History last:** History is pure reads on already-accumulated data. No other phase depends on it.

### Research Flags

Phases likely needing deeper research or spiking during planning:
- **Phase 1 (Infrastructure Spike):** The MediaPipe-in-worker loading issue has multiple open GitHub bugs as of early 2026 (issues #4694, #5479, #5257, #5631). The exact initialization pattern for classic workers with bundled WASM needs a working prototype, not just documentation reading. The Chrome filler-word suppression behavior also needs empirical confirmation — it is documented in community sources but not in the official Web Speech API spec.
- **Phase 5 (Analysis Aggregation):** Expressiveness blendshape thresholds and gesture heuristic parameters (hand-to-face proximity distance, sway amplitude threshold) are not documented anywhere — they require empirical calibration on real recordings. Plan for explicit threshold-tuning iteration after first integration.
- **Phase 4 (Speech Analysis — filler detection fallback):** If Chrome suppresses filler words (Pitfall 1), the fallback decision (Whisper.wasm vs. Web Audio API heuristics) needs a separate spike. Whisper.wasm adds ~150 MB download and significant CPU overhead on top of three running MediaPipe models — the combination may not be feasible on mid-range hardware.

Phases with standard, well-documented patterns (can skip research-phase):
- **Phase 2 (Recording Pipeline):** `getUserMedia` + `MediaRecorder` + `fix-webm-duration` are all well-documented. The only non-obvious step (`fix-webm-duration`) is explicitly documented in this research.
- **Phase 6 (Annotated Playback):** `requestVideoFrameCallback` + Canvas overlay is a standard pattern with MDN documentation and community examples.
- **Phase 7 (Session History):** Dexie queries + charting library are straightforward; no novel patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core libraries verified via npm, official docs, and GitHub. Version numbers confirmed. One gap: MediaPipe npm vs GitHub lag (0.10.21 vs 0.10.26) is a known issue with no workaround beyond manual download. |
| Features | MEDIUM | Competitor analysis is comprehensive and cross-referenced. Feature priorities reflect project decisions. The hardest signals (gesture detection, expressiveness) are educated estimates — actual threshold values unknown until calibrated on real data. |
| Architecture | HIGH (established patterns) / MEDIUM (worker threading specifics) | The layered architecture and data flow are well-supported by official docs. The exact MediaPipe worker initialization pattern has open GitHub bugs — confirmed fragile; needs spike to verify. |
| Pitfalls | HIGH | Most pitfalls verified against official documentation, GitHub issues (with issue numbers), and MDN. The Chrome filler-word suppression is documented in community sources and requires empirical confirmation. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Chrome filler word suppression confirmation:** Must be tested empirically with real um/uh speech during Phase 1 spike before any filler detection logic is written. Outcome determines whether Web Speech API or Whisper.wasm is the implementation path.
- **MediaPipe worker loading on Mac Chrome:** Known fragile with open bugs. Must prototype classic worker + bundled WASM before any feature work. Do not assume it works from documentation alone.
- **Expressiveness and gesture thresholds:** No documented baseline values exist. Plan explicit calibration iteration in Phase 5. Consider a per-user baseline/calibration session feature (FEATURES.md v1.x item) as mitigation for false positives.
- **Whisper.wasm feasibility on mid-range hardware:** If needed as filler detection fallback, the combination of Whisper (high CPU) + three MediaPipe models may saturate CPU on target hardware. Needs a performance budget spike if this path is chosen.
- **`requestVideoFrameCallback` browser support:** Chrome/Edge only. The `timeupdate` fallback fires ~4x/second — may produce visible annotation lag on fast scrubbing. Evaluate whether this is acceptable during Phase 6.

---

## Sources

### Primary (HIGH confidence)
- `https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js` — FaceLandmarker API, WASM init pattern, synchronous blocking behavior
- `https://developers.googleblog.com/7-dos-and-donts-of-using-ml-on-the-web-with-mediapipe/` — lazy init, model caching, resource cleanup
- `https://www.npmjs.com/package/@mediapipe/tasks-vision` — confirmed npm version 0.10.21
- `https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API` — API overview, Chrome/Edge-only support
- `https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API` — MediaRecorder, WebM format, Blob workflow
- `https://dexie.org` — Dexie.js v4, React hooks, Blob storage guidance
- `https://react.dev/blog/2025/10/01/react-19-2` — React 19.2.4 current
- `https://vite.dev/releases` — Vite 7.3.1, Node.js requirements
- `https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback` — frame-accurate annotation sync
- `https://webkit.org/blog/14403/updates-to-storage-policy/` — Safari 7-day eviction policy
- `https://github.com/MetaviewAI/webm-fix-duration` — fix-webm-duration library
- `https://bugzilla.mozilla.org/show_bug.cgi?id=1068001` — WebM seek broken (confirmed browser bug)

### Secondary (MEDIUM confidence)
- `https://github.com/google-ai-edge/mediapipe/issues/4694` (and #5479, #5257, #5631) — MediaPipe worker loading bugs on Mac Chrome
- `https://ankdev.me/blog/how-to-run-mediapipe-task-vision-in-a-web-worker` — classic worker + `importScripts` pattern
- `https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html` — OPFS vs IndexedDB performance comparison
- `https://blog.addpipe.com/a-deep-dive-into-the-web-speech-api/` — Chrome filler word suppression behavior
- `https://orai.com/`, `https://yoodli.ai/`, `https://virtualspeech.com/`, `https://speeko.co/` — competitor feature analysis
- WebSearch: React vs Svelte for compute-heavy apps (2025) — multiple sources agree on React async advantage

### Tertiary (LOW confidence — needs validation)
- MediaPipe WASM SIMD GPU delegate FPS benchmarks (10–15 FPS CPU-only, 60+ FPS GPU) — corroborated across multiple community sources but hardware-dependent; validate on actual target hardware
- Chrome filler word suppression — documented in community sources; requires empirical confirmation before implementation

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
