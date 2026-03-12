# Stack Research

**Domain:** Browser-based client-side ML presentation coaching tool
**Researched:** 2026-03-12
**Confidence:** MEDIUM-HIGH (core ML and browser APIs verified via official docs; version numbers cross-checked via npm/GitHub)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.4 | UI framework | Concurrent rendering keeps the UI responsive while heavy MediaPipe inference runs. React 19's async rendering pipeline is the right tradeoff for a compute-heavy app — Svelte's synchronous model can stall the main thread on heavy workloads. Massive ecosystem for hooks, state, and custom video controls. |
| TypeScript | 5.8+ | Type safety across the entire codebase | MediaPipe's tasks-vision package ships full TypeScript types. Using TS from day one prevents type confusion on landmark coordinate arrays, which are easy to misread. |
| Vite | 7.x (latest 7.3.1) | Build tool and dev server | Native ES module HMR is fast even with large WASM assets. Vite has first-class Web Worker support (`new Worker(url, {type: 'module'})` + `worker: { format: 'es' }` in config) — essential for offloading inference. |
| @mediapipe/tasks-vision | 0.10.21 (latest on npm — see note) | Face landmark, hand landmark, pose landmark detection | The unified Tasks API. One package exposes `FaceLandmarker` (468 points), `HandLandmarker` (21 joints/hand), and `PoseLandmarker` (33 body points). Runs WASM+WebGL in browser. GPU delegate delivers 60+ FPS; CPU-only fallback gives 10–15 FPS. |
| Web Speech API (browser built-in) | Native — no npm package | Real-time speech-to-text transcript | Zero dependency. `SpeechRecognition` with `interimResults: true` streams word-by-word transcription, enabling filler word detection client-side by post-processing the transcript. **Chrome/Edge only** (no Firefox support — see pitfalls). |
| MediaRecorder API (browser built-in) | Native — no npm package | Webcam + microphone capture and WebM recording | Native browser API. `getUserMedia` acquires the combined audio+video `MediaStream`; `MediaRecorder` chunks it into a `Blob[]` that is concatenated to `video/webm` on stop. `URL.createObjectURL()` enables immediate local playback. No library needed. |
| Dexie.js | 4.3.0 | IndexedDB wrapper for session persistence | IndexedDB is mandatory for storing video Blobs (localStorage is capped at ~5–10 MB). Dexie's promise-based API eliminates IndexedDB's verbose cursor patterns. Version 4 adds React hooks (`useLiveQuery`) for reactive session history. Used in production by WhatsApp Web and GitHub Desktop. |
| Zustand | 5.x | Global UI state (recording state, playback cursor, active session) | Minimal boilerplate, no provider wrapping, and selective re-renders without memoization ceremony. The right size for a single-user local app. Redux Toolkit adds structure for large teams — unnecessary here. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb-keyval | 6.x | Lightweight key/value store over IndexedDB | Use for app settings and preferences only (not video Blobs — Dexie handles those). Much simpler API for scalar values like user thresholds. |
| fix-webm-duration | 1.x | Patch missing duration metadata in WebM files | MediaRecorder output often lacks a valid `duration` field in the container header, which breaks video scrubbing. Apply this before storing the Blob in Dexie. Required for the annotation playback feature. |
| react-use | 18.x | Collection of React hooks (useMedia, useRafLoop) | `useRafLoop` is useful for frame-accurate MediaPipe inference during playback review. `useMedia` for responsive layout. |
| Tailwind CSS | 4.x | Utility-first styling | No design system overhead for a solo tool. Tailwind 4 drops the config file by default, making setup faster. |
| Vitest | 3.x | Unit and integration testing | Same Vite config, no separate Jest setup. First-class TypeScript support. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite + `@vitejs/plugin-react` | Dev server with fast HMR | Set `worker: { format: 'es' }` in `vite.config.ts` to enable ES module Web Workers for MediaPipe inference offloading. |
| Chrome DevTools — Performance panel | Profile main thread vs Worker thread | MediaPipe WASM inference should appear in the Worker thread. If it's on the main thread, the architecture is wrong. |
| Chrome DevTools — Application > IndexedDB | Inspect stored sessions and video Blobs | Essential for debugging storage quota issues during development. |
| `navigator.storage.estimate()` | Check available IndexedDB quota before writes | Call before storing session Blobs; warn the user if storage is low. |

---

## Installation

```bash
# Create project
npm create vite@latest presentation-coach -- --template react-ts

# Core runtime
npm install react@19 react-dom@19

# MediaPipe Tasks
npm install @mediapipe/tasks-vision

# Local storage
npm install dexie

# State management
npm install zustand

# Video duration fix
npm install fix-webm-duration

# Utility hooks
npm install react-use idb-keyval

# Styling
npm install tailwindcss @tailwindcss/vite

# Dev dependencies
npm install -D typescript@5 vitest @testing-library/react @testing-library/user-event
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React 19 | Svelte 5 | If bundle size is a primary constraint (Svelte starts at ~3KB vs React's ~40KB). Not recommended here: React's async concurrent rendering keeps the UI responsive during heavy WebGL inference better than Svelte's synchronous rendering. |
| @mediapipe/tasks-vision | TensorFlow.js (face-landmarks-detection, pose-detection) | If MediaPipe's npm lag becomes blocking (GitHub is at 0.10.26 but npm is stuck at 0.10.21). TF.js models exist for all three tasks but require separate packages and have lower out-of-box performance. Complexity is higher. |
| Dexie.js (IndexedDB) | OPFS (Origin Private File System) | OPFS is 2x faster for large binary writes and is a better long-term fit for video files. However, Firefox support is incomplete as of early 2026. IndexedDB via Dexie covers all modern browsers. Revisit OPFS for v2 if performance becomes a bottleneck. |
| Web Speech API | Whisper.cpp compiled to WASM | Use Whisper.wasm if Firefox support is required, if offline operation (airplane mode) is a goal, or if transcript accuracy needs to be higher than the Chrome cloud speech backend. Whisper adds ~150 MB WASM download and significant CPU load on top of MediaPipe. |
| Zustand | Jotai | Functionally equivalent for this app size. Jotai's atomic model is marginally simpler for highly granular subscriptions (e.g., per-timestamp feedback). Either is fine — Zustand has slightly more community momentum in 2025–2026. |
| Vite 7 | webpack 5 | Only if the project already exists on webpack. Vite 7 is dramatically faster for dev iteration. No reason to use webpack for a greenfield project. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| MediaPipe Legacy JavaScript API (`@mediapipe/face_mesh`, `@mediapipe/holistic`) | These are the pre-Tasks legacy packages. They are deprecated, unmaintained, and require a different initialization pattern. Google's docs now direct all new projects to `@mediapipe/tasks-vision`. | `@mediapipe/tasks-vision` |
| localStorage for video Blobs | Hard 5–10 MB browser limit. A 2-minute presentation at 30fps WebM will be 50–150 MB. localStorage writes will silently fail or throw `QuotaExceededError`. | Dexie.js (IndexedDB) |
| Server-side video upload + processing | The PROJECT.md requirement is explicit: all ML inference runs client-side. Server uploads break the privacy guarantee and add infrastructure cost. | Client-side MediaPipe + Web Speech API |
| React Player / Video.js for annotation playback | These are general-purpose video players not designed for programmatic timestamp annotation. You need pixel-accurate control over the progress bar for coaching markers. Build a thin custom player around the native `<video>` element using `timeupdate` events. | Custom `<video>` element + Canvas or CSS absolute-positioned overlay |
| SharedArrayBuffer for Worker ↔ Main thread communication | Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers which complicate deployment. Use `postMessage` with Transferable objects (ArrayBuffer) instead unless you benchmark a real bottleneck. | `postMessage` + Transferables |
| AssemblyAI / Deepgram for transcription | Sends audio to third-party servers, violating the no-upload privacy constraint. | Web Speech API (Chrome/Edge); Whisper.wasm as fallback |

---

## Stack Patterns by Variant

**If you need Firefox support for speech transcription:**
- Use Whisper.cpp compiled to WASM via `@xenova/transformers` (Whisper Tiny model)
- Expect a ~150 MB initial WASM download and significant CPU overhead
- Run Whisper in a Web Worker to avoid blocking MediaPipe's rendering loop

**If MediaPipe inference drops below 20 FPS on target hardware:**
- Move `FaceLandmarker`/`HandLandmarker`/`PoseLandmarker` calls into a Web Worker using `OffscreenCanvas`
- Transfer `VideoFrame` objects via `postMessage` (they are Transferable)
- Main thread only handles React rendering; inference Worker sends back landmark arrays

**If IndexedDB video storage becomes a user UX problem (large sessions):**
- Migrate Blob storage to OPFS (Origin Private File System) using synchronous `FileSystemSyncAccessHandle` in a Worker
- Keep metadata (session timestamps, scores, events) in Dexie
- OPFS is 2x faster for binary file I/O and has improved browser support in 2026

**If you want to run all three landmark models simultaneously:**
- Run them sequentially per frame (FaceLandmarker → HandLandmarker → PoseLandmarker) within a single `requestAnimationFrame` Worker loop
- Holistic-style simultaneous detection is a legacy API pattern — the Tasks API does not have a combined holistic task
- Benchmark: all three models sequential on GPU delegate typically maintains 25–30 FPS on a mid-range laptop

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@mediapipe/tasks-vision@0.10.21` | Chrome 88+, Edge 88+, Safari 15.4+ (WebAssembly SIMD required) | Firefox is unsupported for MediaPipe Tasks Vision as of early 2026. SIMD support is the gating requirement. |
| `dexie@4.3.0` | All modern browsers (Chrome, Firefox, Safari, Edge) | Dexie 4 requires IndexedDB v2 — available in all browsers since 2020. |
| `fix-webm-duration@1.x` | WebM recordings from MediaRecorder | Only needed for Chrome's MediaRecorder output. Firefox generates WebM with duration metadata correctly. |
| React 19.2.4 | Vite 7.x, TypeScript 5.8+ | React 19 concurrent features are compatible with Vite 7. Strict Mode is recommended — it will expose double-invocation issues in MediaPipe initialization hooks. |
| Vite 7.x | Node.js 20.19+ or 22.12+ | Node 18 is end-of-life; Vite 7 dropped support. |

---

## Key Architecture Note: Inference Timing

MediaPipe Tasks Vision runs inference **synchronously** when called from the main thread. For a 60Hz capture loop, each `FaceLandmarker.detectForVideo()` call can block rendering. The correct pattern is:

1. `getUserMedia` stream → `<video>` element (main thread)
2. Inference Worker receives `VideoFrame` via `postMessage` transfer
3. Worker calls `detectForVideo()` and returns landmark arrays
4. Main thread receives landmarks, updates React state, drives annotation overlay

This keeps the React UI at 60 FPS regardless of inference speed. Do not call MediaPipe inside `useEffect` on the main thread for the production inference path.

---

## Sources

- `https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js` — FaceLandmarker initialization pattern, WASM CDN path (MEDIUM confidence — official docs, version not pinned)
- `https://www.npmjs.com/package/@mediapipe/tasks-vision` — Confirmed latest npm version 0.10.21 and npm-vs-GitHub lag issue (HIGH confidence — primary source)
- `https://github.com/google-ai-edge/mediapipe/issues/6098` — Confirmed npm release lag; GitHub is at 0.10.26 (HIGH confidence)
- `https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API` — API overview and Chrome/Edge-only support (HIGH confidence)
- `https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API` — MediaRecorder API, WebM format, Blob workflow (HIGH confidence)
- `https://dexie.org` — Dexie.js v4.3.0 current, React hooks, production usage (HIGH confidence)
- `https://react.dev/blog/2025/10/01/react-19-2` — React 19.2 release; current version 19.2.4 (HIGH confidence)
- `https://vite.dev/releases` — Vite 7.3.1 current version, Node.js requirements (HIGH confidence)
- `https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html` — OPFS vs IndexedDB performance comparison (MEDIUM confidence — third-party benchmarks)
- WebSearch: React vs Svelte compute-heavy 2025 — Multiple sources agree on React async rendering advantage (MEDIUM confidence)
- WebSearch: MediaPipe WASM SIMD GPU delegate FPS — 10–15 FPS CPU-only, 60+ FPS GPU delegate (MEDIUM confidence — corroborated across multiple sources)

---

*Stack research for: Browser-based client-side ML presentation coaching tool*
*Researched: 2026-03-12*
