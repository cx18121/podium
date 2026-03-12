# Pitfalls Research

**Domain:** Browser-based ML / real-time video analysis / presentation coaching app
**Researched:** 2026-03-12
**Confidence:** HIGH (most pitfalls verified against official docs, GitHub issues, or first-party sources)

---

## Critical Pitfalls

### Pitfall 1: Chrome Suppresses Filler Words in Web Speech API Transcripts

**What goes wrong:**
The core feature — filler word detection (um, uh, like, you know) — silently fails because Chrome's speech recognition backend (Google's servers) is trained to suppress disfluencies and produce "clean" transcripts. The app receives a polished transcript with filler words removed, so no amount of post-processing client-side logic will detect what was never delivered.

**Why it happens:**
Web Speech API in Chrome sends audio to Google's servers for recognition. Google's model is optimized for voice assistant use cases where clean output is desired. The spec offers no configuration to disable this behavior. Developers assume "raw" audio is being transcribed literally; it is not.

**How to avoid:**
Test Chrome's Web Speech API output explicitly with filler-word-heavy speech before building any detection logic on top of it. If Chrome suppresses them (confirmed behavior in practice), two paths exist:
1. Use a client-side Whisper.cpp model (via WASM) as a fallback or replacement — Whisper preserves disfluencies when prompted to do so.
2. Use audio-level heuristics: detect short hesitation sounds via the Web Audio API's AnalyserNode, which operates on raw audio buffers before any recognition occurs.

**Warning signs:**
- Test phrase "um, uh, like, you know what I mean" returns transcript "what I mean" with no disfluencies.
- Filler word count is always zero across multiple test recordings.

**Phase to address:**
Phase covering transcript and pacing analysis. Must be the first thing prototyped — if Web Speech API filler detection is broken, the architecture for that feature needs to change before anything is built around it.

---

### Pitfall 2: MediaRecorder WebM Files Cannot Be Seeked (Missing Duration Metadata)

**What goes wrong:**
Videos recorded with MediaRecorder produce WebM blobs where the `duration` property reports `Infinity` and `currentTime` seeking does not work. The annotated video playback feature — where users scrub to a specific feedback event — is completely broken out of the box.

**Why it happens:**
MediaRecorder writes WebM metadata first, but duration is only known after recording ends. The browser does not go back to rewrite the metadata with the actual duration, so the resulting blob has no usable `duration` or seek index. This is a known, long-standing browser bug (Firefox Bugzilla #1068001, #1385699) that remains unresolved natively.

**How to avoid:**
Post-process every recorded blob immediately after `MediaRecorder.stop()` fires, before storing to IndexedDB. Use `fix-webm-duration` (npm: `webm-fix-duration` or `fix-webm-duration`) to inject correct duration metadata into the blob. Alternatively, track elapsed time yourself during recording and pass it to the library. This must be a required step in the recording pipeline — never store the raw blob.

**Warning signs:**
- `videoElement.duration` returns `Infinity` after loading a recorded blob.
- `videoElement.currentTime = 30` has no effect (video stays at position 0).
- Timeline scrubbing appears non-functional.

**Phase to address:**
Recording and playback phase. The fix-webm-duration post-processing step must be baked into the recording pipeline before any annotated playback UI is built, since everything downstream depends on seeking working correctly.

---

### Pitfall 3: Running Three MediaPipe Models Simultaneously Saturates the CPU

**What goes wrong:**
Running FaceLandmarker, HandLandmarker, and PoseLandmarker concurrently at 30fps during a live session causes frame drops, inference latency spikes (>100ms per frame), and main thread jank that makes the recording UI feel broken. On lower-end hardware this escalates to tab crashes.

**Why it happens:**
Each model is a WASM binary running a neural network. At 30fps each model gets 33ms to process a frame. Three models competing for CPU time on a single core (WebAssembly is single-threaded by default) leaves essentially zero headroom. WebGPU acceleration is not universally available, and GPU compute shaders for TFLite inference are not widely usable in browsers, so CPU inference is the common case.

**How to avoid:**
- Cap inference to 5-10fps during live recording (not 30fps). Visual analysis of posture and gestures does not require high frame rates.
- Run models in a dedicated Web Worker with `OffscreenCanvas` to keep the main thread free for MediaRecorder and UI.
- Use the "lite" or "short" model variants in MediaPipe Tasks rather than the full-size models. Evaluate trade-offs in MediaPipe Studio before committing.
- Consider running models sequentially in a single worker rather than in parallel, cycling between FaceLandmarker, HandLandmarker, and PoseLandmarker across frames.
- Warm up each model with a dummy frame before the session starts to amortize initialization cost.

**Warning signs:**
- `console.time` around inference calls shows >40ms per call at 30fps.
- Tab CPU usage above 80% on an M1 Mac during recording.
- MediaRecorder `dataavailable` events arrive late or out of order.
- Video preview stutters during live recording.

**Phase to address:**
The Web Worker / inference pipeline phase. Architecture must be designed with inference rate budgeting from the start. Do not prototype by running models on the main thread and plan to "move to a worker later" — the structural refactor is large.

---

### Pitfall 4: MediaPipe in Web Workers Has Known Crash and Loading Issues

**What goes wrong:**
Attempts to load `@mediapipe/tasks-vision` inside a Web Worker fail with import errors, crash on Mac Chrome, or silently produce no output. The natural architecture (ML in worker, UI on main thread) hits sharp compatibility edges.

**Why it happens:**
MediaPipe tasks-vision uses WASM + optional WebGPU. In module workers, `importScripts` is not supported but ES module workers have their own restrictions. Multiple open GitHub issues (google-ai-edge/mediapipe #4694, #5479, #5257, #5631) confirm that worker loading is still fragile as of 2025, with platform-specific crashes on Mac Chrome.

**How to avoid:**
- Prototype the MediaPipe-in-worker loading pattern in a standalone test page before building any application logic on top of it.
- Use classic workers (`new Worker(url)`, not `{ type: 'module' }`) with bundled WASM if ES module workers fail.
- Test on Mac Chrome, Windows Chrome, and Firefox as early as possible — the crash is platform-specific and may not appear in CI.
- Keep a fallback path: if worker initialization fails, fall back to main-thread inference at reduced frame rate with a user warning.
- Do not use WebGPU delegation in the worker; default to WASM/CPU which has broader compatibility.

**Warning signs:**
- Worker throws on import but no error appears in the main thread (uncaught worker errors are silent by default without `worker.onerror`).
- MediaPipe initializes but `detect()` returns empty results with no error.
- Crash only on certain OS/browser combinations.

**Phase to address:**
Earliest infrastructure phase. This is the highest-risk architectural decision and must be de-risked with a working spike before any feature work depends on it.

---

### Pitfall 5: MediaPipe Memory Leaks From Missing `.close()` Calls

**What goes wrong:**
Memory usage grows monotonically throughout a session. On long sessions (10+ minutes) the tab becomes sluggish and may crash. The growth is invisible in normal profiling because it lives in the WASM heap, not the JS heap.

**Why it happens:**
MediaPipe runs C++ code compiled to WebAssembly. WASM memory is not garbage collected by the JS engine. Task objects (FaceLandmarker, HandLandmarker, etc.) allocate WASM heap memory that must be explicitly freed. If `.close()` is not called when the session ends (or on component unmount), those allocations accumulate.

**How to avoid:**
Call `.close()` on every MediaPipe task instance when recording stops and when the component unmounts. In React, this means the `useEffect` cleanup function must call `.close()`. React 19 StrictMode double-mounts components in development, so cleanup must be robust — if `.close()` is called on an already-closed instance, it must not throw.

**Warning signs:**
- Chrome DevTools Memory tab shows WASM heap growing across sessions without recovery.
- Page becomes unresponsive after 2-3 recording sessions without a page reload.
- Performance gets worse over time within a single long session.

**Phase to address:**
Recording/inference phase. Cleanup must be part of the initial architecture, not an afterthought. Add a lifecycle test: record, stop, record again — measure memory before and after each cycle.

---

### Pitfall 6: IndexedDB Storage Eviction Silently Deletes All Session History

**What goes wrong:**
On Safari, if the user has not interacted with the page in the last 7 days, Safari deletes all IndexedDB data for the origin without warning. All session history is lost with no recovery. On all browsers, if storage quota is exceeded, writes fail with `QuotaExceededError` — which, if unhandled, leaves the database in a partial state.

**Why it happens:**
Safari's storage policy (updated in Safari 17) evicts data from origins with no recent user interaction after 7 days. This is distinct from the normal "clear site data" action — it happens automatically. Additionally, video blobs are large (a 5-minute session at medium quality can be 100-300MB), and browsers have per-origin quota limits (typically 1-5GB but variable).

**How to avoid:**
- Call `navigator.storage.persist()` during onboarding to request persistent storage. Show the browser's permission prompt to the user and explain why it matters. On Safari this upgrades the origin from "best effort" to "persistent" storage.
- Implement quota estimation via `navigator.storage.estimate()` before writes, and surface a warning when storage is >80% full.
- Never store raw video blobs as indexed fields in Dexie — store blob data in a separate, non-indexed object store. Only index metadata (timestamps, scores, session ID).
- Implement a storage management UI: show total storage used and allow users to delete old sessions.

**Warning signs:**
- `QuotaExceededError` thrown during `db.put()` with no UI feedback.
- Sessions disappear on Safari after a week of inactivity.
- Dexie query performance degrades as database size grows — indicates large blobs are being indexed.

**Phase to address:**
Storage and persistence phase. Call `navigator.storage.persist()` on first launch. Add quota monitoring before recording starts.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Run MediaPipe on main thread | Simpler setup, no worker messaging | Blocks UI thread, causes recording jank, impossible to refactor away cleanly | Never — architect for worker from day one |
| Store raw MediaRecorder blob without `fix-webm-duration` | Simpler recording pipeline | Seeking broken permanently, annotated playback non-functional | Never — the fix must be applied before storage |
| Use 30fps for MediaPipe inference | Higher accuracy | CPU saturation, tab crashes on mid-range hardware | Never — 5-10fps is sufficient for posture/gesture analysis |
| Skip `navigator.storage.persist()` | Less complexity | Users silently lose all history on Safari | Never — one API call, trivial to add |
| Index large Blobs in Dexie | Simpler schema | Query performance collapses as DB grows, O(n) first-load time | Never — always keep blobs in a non-indexed store |
| Build filler word detection on top of Web Speech API without testing first | Faster to code | Feature may silently produce zero results if Chrome suppresses filler words | Never — test Chrome output with um/uh speech before building |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MediaRecorder + MIME types | Hardcode `video/webm;codecs=vp9` without checking support | Call `MediaRecorder.isTypeSupported()` first; Safari requires different codec strings or no explicit MIME type |
| Web Speech API + filler words | Assume transcript contains all spoken words | Test Chrome output explicitly with filler-word speech; implement audio-level fallback if suppressed |
| MediaPipe + Web Worker | Use ES module worker syntax (`type: 'module'`) | Use classic workers or test module workers thoroughly; multiple open bugs on Mac Chrome |
| MediaPipe models + initialization | Initialize on first user action | Initialize eagerly at page load; warm up with a dummy frame to avoid cold-start latency on first recording |
| IndexedDB + video blobs | Store blob as indexed field in Dexie schema | Put blob in a separate non-indexed object store; index only metadata |
| `fix-webm-duration` + timing | Post-process after some delay | Post-process synchronously in the `MediaRecorder stop` event handler, using elapsed recording time tracked during the session |
| React StrictMode + MediaPipe | Assume cleanup fires only once | Cleanup (`worker.terminate()`, `.close()`) must be idempotent — StrictMode mounts/unmounts twice in development |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running inference on every camera frame at full resolution | CPU at 100%, video drops frames, MediaRecorder produces corrupted chunks | Cap inference to 5-10fps; scale down video frame before passing to MediaPipe (e.g., 640x480 or smaller) | Immediately on mid-range hardware; on low-end hardware at any rate |
| Passing `ImageData` between worker and main thread via structured clone | Large memory copies on every inference call, GC pressure | Use `OffscreenCanvas.transferControlToOffscreen()` to give the worker direct canvas access | At 10fps with 1080p source frames |
| Storing entire raw transcript string in Dexie and doing string search for pacing | Acceptable at 5min sessions, slow at 60min | Store transcript as structured array of word-with-timestamp objects; derive stats on ingestion | Sessions longer than 30 minutes |
| Browser throttles rAF and timers when tab goes to background | Timer-based session timer freezes or drifts if user switches tabs | Derive elapsed time from `performance.now()` deltas, not timer tick counts; MediaRecorder itself is not affected by tab throttling | Immediately on tab switch |
| Loading all session blobs from IndexedDB on history page load | History page takes 10+ seconds to load with 20+ sessions | Never load the blob on history load; load metadata only; load blob on demand when user clicks a specific session | At 5+ sessions |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Displaying raw Web Speech API transcript in innerHTML | XSS if transcript contains injected content (edge case but possible with adversarial audio) | Always use `textContent` not `innerHTML` for transcript rendering |
| Not validating stored session data shape before reading from Dexie | Corrupted or migrated DB schema causes runtime errors with no user feedback | Version Dexie schema migrations; validate session object shape on read with a Zod schema or manual check |
| Keeping MediaStream tracks alive after recording stops | Camera light stays on permanently, user loses trust | Call `stream.getTracks().forEach(t => t.stop())` when recording stops and on page unload |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No camera/microphone permission error handling | User sees a blank recording screen with no explanation | Detect `NotAllowedError` from `getUserMedia`; show explicit permission instructions with browser-specific screenshots |
| Showing ML analysis results immediately after stop | User sees raw numbers without context | Delay scorecard display while post-processing runs (fix-webm-duration, analysis aggregation); show a clear "analyzing..." state |
| Not indicating that speech recognition requires internet | Users in offline/airplane mode see transcript always empty | Detect navigator.onLine and show warning; note Firefox has no SpeechRecognition support at all |
| Showing infinite video duration in playback | Scrubber is non-functional, users think the feature is broken | Always apply fix-webm-duration before rendering playback UI; show loading state until blob is processed |
| No storage quota warning | Users record sessions that silently fail to save | Check `navigator.storage.estimate()` before starting recording; block recording if <200MB free |

---

## "Looks Done But Isn't" Checklist

- [ ] **Filler word detection:** Appears to work in unit tests but returns zero detections on real recordings — verify Chrome Web Speech API output contains "um"/"uh" with a real speech test before declaring feature complete.
- [ ] **Annotated playback scrubbing:** Video loads and plays but seeking to timestamp events does nothing — verify `videoElement.duration !== Infinity` and that seek works to arbitrary timestamps after fix-webm-duration is applied.
- [ ] **Session persistence across page reloads:** Sessions appear in history immediately after recording but vanish on Safari after 7 days without interaction — verify `navigator.storage.persist()` is called and granted.
- [ ] **MediaPipe in worker:** Worker initializes without error in dev but crashes on Mac Chrome in production — test on actual hardware, not just localhost with a single OS/browser combination.
- [ ] **Memory stability:** App works fine for one session but becomes sluggish after three — run three consecutive record/stop cycles in Chrome DevTools Memory profiler and verify WASM heap returns to baseline.
- [ ] **Recording stops cleanly:** `MediaRecorder.stop()` fires but the blob is missing the last few seconds of audio/video — ensure all `dataavailable` chunks are collected before processing the final blob.
- [ ] **Camera light stays on:** After navigating away from the recording page, the browser camera indicator remains lit — verify `stream.getTracks().forEach(t => t.stop())` is called in all exit paths.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Filler word detection built on unverified Web Speech API | HIGH | Requires feature redesign; evaluate Whisper WASM or Web Audio API heuristics; timeline impact 1-2 weeks |
| MediaRecorder blob stored without fix-webm-duration | HIGH | Must re-encode stored blobs (not possible post-storage without the raw chunks); any stored sessions are permanently unseekable; fix must be applied to pipeline before first user data |
| MediaPipe on main thread (discovered after feature work) | HIGH | Refactoring to Web Worker requires restructuring all inference calls, OffscreenCanvas setup, message passing layer; estimate 3-5 days |
| IndexedDB data evicted on Safari | MEDIUM | Data is gone; add persist() call and quota monitoring going forward; offer export-to-file feature to let users back up sessions |
| Memory leak from missing .close() | LOW | Add cleanup to useEffect returns and recording stop handler; regression test with 3-cycle memory profile |
| WebM duration/seek broken | LOW (if caught early) | Apply fix-webm-duration in recording pipeline; already stored blobs cannot be fixed without the original chunks |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Chrome filler word suppression | Phase: Transcript & Pacing (first task) | Record 30s of speech with um/uh; verify raw transcript contains disfluencies before writing detection logic |
| MediaRecorder WebM seek broken | Phase: Recording pipeline | After recording, set `video.currentTime = duration / 2`; verify position changes |
| Three models saturate CPU | Phase: ML inference architecture (spike) | Profile CPU with all three models at 10fps on a mid-range laptop |
| MediaPipe worker loading bugs | Phase: Infrastructure spike (before any ML feature work) | Load all three models in a worker; run inference on a test frame; verify on Mac + Windows Chrome |
| MediaPipe memory leak | Phase: ML inference architecture | Run 3 record/stop cycles; take heap snapshot before and after; WASM heap must return to baseline |
| IndexedDB eviction / quota | Phase: Storage & persistence | Call `navigator.storage.persist()`; implement quota check before recording start |
| MediaRecorder MIME type cross-browser | Phase: Recording pipeline | Test on Safari (no explicit MIME type); test on Firefox (different codec); test on Chrome |
| React StrictMode + cleanup | Phase: All phases with side effects | Run in dev mode (StrictMode active); verify no double-initialization errors or orphaned workers |

---

## Sources

- [7 Dos and Don'ts of Using ML on the Web with MediaPipe — Google Developers Blog](https://developers.googleblog.com/7-dos-and-donts-of-using-ml-on-the-web-with-mediapipe/)
- [MediaPipe in Web Worker (#4694, #5479, #5257, #5631) — google-ai-edge/mediapipe GitHub](https://github.com/google-ai-edge/mediapipe/issues/4694)
- [webm-fix-duration — npm / GitHub](https://github.com/MetaviewAI/webm-fix-duration)
- [Firefox Bugzilla #1068001: Seeking does not work in videos recorded with MediaStreamRecorder](https://bugzilla.mozilla.org/show_bug.cgi?id=1068001)
- [Firefox Bugzilla #1385699: webm duration is Infinity](https://bugzilla.mozilla.org/show_bug.cgi?id=1385699)
- [A Deep Dive into the Web Speech API — AddPipe Blog](https://blog.addpipe.com/a-deep-dive-into-the-web-speech-api/)
- [Updates to Storage Policy — WebKit Blog](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [Storage Quotas and Eviction Criteria — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [Keep Storing Large Images, Just Don't Index the Binary Data — Dexie.js / Medium](https://medium.com/dexie-js/keep-storing-large-images-just-dont-index-the-binary-data-itself-10b9d9c5c5d7)
- [OffscreenCanvas — Speed Up Canvas Operations with a Web Worker — web.dev](https://web.dev/articles/offscreen-canvas)
- [Heavy Throttling of Chained JS Timers Beginning in Chrome 88 — Chrome Developers](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)
- [Making Your Website Cross-Origin Isolated Using COOP and COEP — web.dev](https://web.dev/articles/coop-coep)
- [React StrictMode Double Mount — github.com/facebook/react #24502](https://github.com/facebook/react/issues/24502)
- [Client-Side AI in 2025: Running ML Models Entirely in the Browser — Medium](https://medium.com/@sauravgupta2800/client-side-ai-in-2025-what-i-learned-running-ml-models-entirely-in-the-browser-aa12683f457f)

---
*Pitfalls research for: browser-based ML / real-time video analysis / presentation coaching*
*Researched: 2026-03-12*
