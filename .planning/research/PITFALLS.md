# Pitfalls Research

**Domain:** Browser-based ML / real-time video analysis / presentation coaching app
**Researched:** 2026-03-16
**Confidence:** HIGH for v1.0 pitfalls (verified in production); HIGH/MEDIUM for v2.0 additions (verified against official docs, GitHub issues, and first-party sources)

---

> **Note:** This file covers both v1.0 (recording pipeline, MediaPipe, storage) and v2.0
> (Whisper.wasm integration, audio extraction/resampling, per-window WPM events, Dexie
> schema migration) pitfalls. v1.0 pitfalls are retained because the new milestone builds on
> top of the same infrastructure.

---

## Critical Pitfalls

### Pitfall 1: Chrome Suppresses Filler Words in Web Speech API Transcripts

**What goes wrong:**
The core feature — filler word detection (um, uh, like, you know) — silently fails because Chrome's speech recognition backend (Google's servers) is trained to suppress disfluencies and produce "clean" transcripts. The app receives a polished transcript with filler words removed, so no amount of post-processing client-side logic will detect what was never delivered.

**Why it happens:**
Web Speech API in Chrome sends audio to Google's servers for recognition. Google's model is optimized for voice assistant use cases where clean output is desired. The spec offers no configuration to disable this behavior. Developers assume "raw" audio is being transcribed literally; it is not.

**How to avoid:**
This is the exact reason Whisper.wasm is being added in v2.0. Whisper preserves disfluencies when prompted to do so. Web Speech API stays for live captions (where polished output is fine), but all filler counts must be derived from the Whisper post-session transcript, not the Web Speech API result.

**Warning signs:**
- Test phrase "um, uh, like, you know what I mean" returns transcript "what I mean" with no disfluencies.
- Filler word count is always zero across multiple test recordings.

**Phase to address:**
Whisper integration phase. The filler count migration from Web Speech API to Whisper output must be the first thing verified — confirm Whisper actually surfaces "um" and "uh" before building any detection logic downstream.

---

### Pitfall 2: Whisper Requires Cross-Origin Isolation Headers — Breaks the Existing App Without Preparation

**What goes wrong:**
Adding any Whisper.wasm library (whisper.cpp WASM, Transformers.js, or @remotion/whisper-web) to the app silently breaks existing functionality unless `SharedArrayBuffer` is available. Without cross-origin isolation, multithreaded WASM silently falls back to single-threaded mode (2-10x slower), or the library fails entirely with a cryptic error. If the headers are added incorrectly, all third-party resources (CDN fonts, analytics, any cross-origin iframe) break because COEP blocks them.

**Why it happens:**
`SharedArrayBuffer` was disabled by default in all browsers after the Spectre vulnerability disclosure and is only re-enabled when the document is cross-origin isolated. Cross-origin isolation requires two HTTP response headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Any cross-origin resource (fonts, scripts, images) that does not carry `Cross-Origin-Resource-Policy: cross-origin` or the appropriate CORS headers will be blocked.

**How to avoid:**
- Before adding any Whisper library, add the COOP/COEP headers to Vite's dev server and confirm `window.crossOriginIsolated === true` in the browser console.
- Audit every cross-origin resource the app loads (Google Fonts, CDN assets, etc.) — they all need `crossorigin` attributes or must be self-hosted.
- In `vite.config.ts`, add the headers under `server.headers` (for dev) and ensure the production host (Vercel, Netlify, etc.) also sends them — Vite dev headers do not carry to production.
- Verify: `console.log('Cross-Origin Isolated:', window.crossOriginIsolated)` must log `true` before Whisper initialization runs.

**Warning signs:**
- `SharedArrayBuffer is not defined` error in the Whisper worker.
- Whisper runs but is dramatically slower than expected (single-threaded fallback).
- Google Fonts or other CDN resources stop loading after adding COOP/COEP.
- `window.crossOriginIsolated` is `false` in production but `true` in dev (headers not deployed).

**Phase to address:**
First task of the Whisper integration phase, before any Whisper code is written. Set up headers, verify isolation, audit cross-origin resources. This is a prerequisite gate — nothing downstream can be validated without it.

---

### Pitfall 3: The Existing Classic-Mode MediaPipe Worker and a Whisper ES-Module Worker Cannot Coexist Without Architecture Planning

**What goes wrong:**
The existing MediaPipe worker was intentionally built as a classic-mode worker (`importScripts`-based) because MediaPipe's WASM loading requires it. Whisper libraries (especially Transformers.js) require ES module workers (`type: 'module'`) because they use top-level `import` statements. Trying to force Transformers.js into a classic worker fails with `SyntaxError: Cannot use import statement outside a module`. Trying to convert the MediaPipe worker to a module worker breaks MediaPipe. The result is two workers that each require incompatible worker types.

**Why it happens:**
The `importScripts()` method is only available in classic workers and throws in module workers. Conversely, top-level ES `import` is only supported in module workers. Transformers.js v3+ is built as an ES module and cannot be loaded with `importScripts`. This is a browser platform constraint, not a library bug.

**How to avoid:**
Keep the two workers separate and of their respective types:
- MediaPipe worker: remains classic mode (existing, working).
- Whisper worker: new, separate worker file, created with `{ type: 'module' }`.
- In Vite, configure `worker.format: 'es'` to ensure the Whisper worker is bundled as an ES module.
- Never attempt to load both into the same worker file.
- The two workers run independently: MediaPipe runs during recording, Whisper runs post-session on the stored audio blob.

**Warning signs:**
- `importScripts is not defined` error in a module worker that tries to call it.
- `Cannot use import statement outside a module` in the Whisper worker loaded as classic.
- Existing MediaPipe tests break after adding Whisper worker configuration.

**Phase to address:**
Whisper integration phase, worker architecture task. Establish the two-worker structure with a test page before adding any Whisper transcription logic.

---

### Pitfall 4: Audio Extraction from the Recorded VideoBlob — decodeAudioData Resamples to the Wrong Rate

**What goes wrong:**
The pipeline extracts audio from the stored WebM video blob using `AudioContext.decodeAudioData()`, then passes the result to Whisper. Whisper requires a 16kHz mono `Float32Array`. `decodeAudioData()` automatically resamples the decoded audio to the `AudioContext`'s sample rate, which defaults to the device's hardware rate (typically 44.1kHz or 48kHz). If the developer then passes this incorrectly-sampled buffer to Whisper, transcription quality degrades significantly or the library throws.

**Why it happens:**
`AudioContext` has no API to request a specific output sample rate from `decodeAudioData()`. The context's sample rate is set at construction time and matches the hardware. `decodeAudioData()` always resamples to that rate. Developers often miss this because the buffer looks correct (it has audio data) but is at the wrong sample rate.

**How to avoid:**
Use one of two patterns:
1. `OfflineAudioContext` with explicit 16000 Hz sample rate: Construct `new OfflineAudioContext(1, durationInSamples * 16000, 16000)`. Route the decoded source through an `AudioBufferSourceNode`, render with `startRendering()`, and extract the resulting `Float32Array` from the `AudioBuffer`. This handles downsampling in one step.
2. `WebCodecs AudioDecoder` + manual resampling: Decode audio frames with `AudioDecoder`, then resample via a separate resampler. More complex but avoids AudioContext entirely. Remotion's `@remotion/webcodecs` wraps this pattern.

Both approaches work. The `OfflineAudioContext` approach is simpler for this use case. Do not pass a 44.1/48kHz buffer to Whisper and expect clean results.

**Warning signs:**
- Whisper transcription output is garbled, missing words, or nonsensical.
- Audio buffer `sampleRate` property reads 44100 or 48000 instead of 16000 when logging before passing to Whisper.
- `decodeAudioData()` output channel count is greater than 1 (Whisper requires mono).

**Phase to address:**
Whisper integration phase, audio pipeline task. Write a unit test: extract audio from a known recording, verify `sampleRate === 16000` and `numberOfChannels === 1` before integrating with Whisper.

---

### Pitfall 5: The Recorded WebM Blob May Have No Separate Audio Track — Audio Extraction Fails Silently

**What goes wrong:**
`decodeAudioData()` called on the video blob returns an `AudioBuffer` with zero channels or throws `EncodingError`. Whisper receives empty or null input. The post-session analysis completes instantly but produces no transcript.

**Why it happens:**
`MediaRecorder` combines video and audio into a single interleaved WebM container. `decodeAudioData()` can decode the audio from a video container in some browsers (Chrome handles this) but fails in others or when the MIME type doesn't explicitly indicate audio presence. Additionally, if `getUserMedia` was called with `audio: false` or the microphone was denied, no audio track exists in the blob. A related failure: if `MediaRecorder` was created with a video-only MIME type (`video/webm;codecs=vp9` without an audio codec), the audio channel is dropped.

**How to avoid:**
- When creating the `MediaStream`, always verify the audio track exists: `stream.getAudioTracks().length > 0` before starting `MediaRecorder`.
- When creating `MediaRecorder`, use a MIME type that includes an audio codec: `video/webm;codecs=vp9,opus` (check `MediaRecorder.isTypeSupported()` first per existing v1.0 guidance).
- After `decodeAudioData()`, check `audioBuffer.numberOfChannels > 0` and `audioBuffer.length > 0` before proceeding. Emit a recoverable error to the UI if either condition fails.
- As a belt-and-suspenders check: extract and validate the audio blob before kicking off Whisper in the worker to avoid a silent no-op transcription run.

**Warning signs:**
- `decodeAudioData()` throws `DOMException: EncodingError`.
- `audioBuffer.numberOfChannels === 0`.
- Whisper worker completes immediately with an empty transcript.
- Happens consistently on one browser but not another.

**Phase to address:**
Whisper integration phase, audio extraction task. Must be validated on Chrome, Firefox, and Safari before release.

---

### Pitfall 6: Whisper Model Download Size Blocks First-Session UX Without a Loading Strategy

**What goes wrong:**
On first use, the browser downloads the Whisper model file. `whisper-tiny` is ~75MB, `whisper-base` is ~145MB. Without a loading UI and caching strategy, the user finishes their first practice session, clicks "analyze," and then waits 30-120 seconds with no feedback while the model downloads. Users assume the app is broken.

**Why it happens:**
WASM ML models are large binary files. There is no native "download progress" indicator for WASM module loads. Unless the developer explicitly tracks download progress via `fetch()` with a `ReadableStream` and caches the model in IndexedDB or the Cache API, every session triggers a fresh download.

**How to avoid:**
- Use Transformers.js (which handles model caching via the browser's Cache API automatically) rather than raw whisper.cpp WASM. Transformers.js shows download progress callbacks and caches models persistently.
- If using raw whisper.cpp WASM: fetch the model file manually with `fetch()`, pipe through a `ReadableStream` to show progress, and cache in IndexedDB or OPFS.
- OPFS (Origin Private File System) is preferable to IndexedDB for large binary model files — it has better write performance and avoids IndexedDB's serialization overhead for large blobs. The whisper.cpp project itself recommends this (GitHub issue #825).
- Show a "Downloading speech model (first time only)..." progress indicator with percentage during the download. Make it clear this is one-time.
- Do not block the user from reviewing their session while the model downloads — run Whisper asynchronously and update the filler analysis after the model is ready.

**Warning signs:**
- First session: user lands on review page and UI hangs with no feedback.
- Network tab shows a large (>50MB) fetch with no progress indicator.
- Model re-downloads on every page load (caching not configured).

**Phase to address:**
Whisper integration phase, model loading/caching task. This is a UX-critical path — a broken first-use experience will cause users to abandon the feature.

---

### Pitfall 7: Running Whisper Post-Session While MediaPipe Was Active During Recording — Memory Not Released

**What goes wrong:**
Post-session Whisper analysis is triggered immediately after recording stops. At this point, the MediaPipe worker may still be initialized with its three models (FaceLandmarker, HandLandmarker, PoseLandmarker) consuming ~300-600MB of WASM heap. Adding Whisper's model (~150-500MB depending on variant) can push total WASM memory to 700MB-1GB+, causing the tab to OOM-crash or trigger aggressive browser garbage collection that freezes the UI.

**Why it happens:**
WASM memory does not garbage collect automatically. Both MediaPipe and Whisper use separate WASM linear memory heaps. They do not share memory. Browser tabs have practical limits around 1-2GB total for WASM linear memory before instability occurs (the 32-bit WASM address space caps at 4GB but browsers enforce lower limits in practice).

**How to avoid:**
- Establish a strict lifecycle: when `MediaRecorder.stop()` fires, terminate the MediaPipe worker before starting Whisper. The MediaPipe worker is not needed post-session.
- In the recording stop handler: (1) finalize the MediaPipe worker output, (2) call `worker.terminate()` on the MediaPipe worker, (3) then trigger Whisper worker startup.
- Add a measurable gate: do not start Whisper until the MediaPipe worker `terminate()` has been called. A small delay (100-200ms) may be needed for the browser to reclaim the memory.
- Choose `whisper-tiny` or `whisper-base` (quantized int8) as the default model. This is sufficient for filler word detection — the vocabulary of filler words is small and does not require the accuracy of larger models.

**Warning signs:**
- Tab crashes on review page load on mid-range hardware.
- Chrome DevTools Memory snapshot shows two large WASM heaps active simultaneously.
- CPU usage spikes to 100% immediately after recording stops and stays there.
- Users report browser "Aw, Snap" crash page after long sessions.

**Phase to address:**
Whisper integration phase, worker lifecycle management task. Memory budget must be explicitly verified: MediaPipe terminated + Whisper loaded = within safe limits.

---

### Pitfall 8: Dexie Schema Migration — Forgetting to Bump the Version Number Silently Corrupts the DB

**What goes wrong:**
Developer adds new fields (`whisperTranscript`, `wpmWindows`, `openingStrength`, `closingStrength`) to the Dexie table definition without bumping the version number. On an existing database, IndexedDB throws an error because the schema changed without a version upgrade. Dexie catches this internally and depending on the version may either throw `VersionError`, silently ignore the schema change, or open the database with the old schema — meaning new fields are never written and reads silently return `undefined`.

**Why it happens:**
IndexedDB's schema is immutable for a given version. Any structural change requires a version bump with an `onupgradeneeded` handler (which Dexie abstracts as `.version(N).stores()`). Developers who add fields to TypeScript interfaces often forget that the Dexie schema declaration is the source of truth for IndexedDB, not the TypeScript type.

**How to avoid:**
- When adding `whisperTranscript`, `wpmWindows`, `openingStrength`, `closingStrength` to the session table: bump the Dexie version number (e.g., from `1` to `2`).
- Add an `.upgrade()` function that sets the new fields to `null` on all existing session records. Do not skip this — without it, existing records will read back as `undefined` for the new fields, which must be handled gracefully in every consumer.
- Non-indexed fields (anything not listed with a `+` index prefix in the Dexie schema string) do not require schema declaration but still require the version bump if any indexed field changes.
- For `wpmWindows` (a per-window array of objects), do not index it — it is a data field, not a query field. Indexing an array-of-objects in Dexie requires multi-entry indexes and complicates migrations unnecessarily.
- After migration, verify with a test: open the DB in DevTools (Application > IndexedDB), confirm old sessions have the new fields set to `null` (not missing), and new sessions have them populated.

**Warning signs:**
- `Dexie.VersionError` or `DOMException: VersionError` on app load after adding new fields.
- `session.whisperTranscript` is `undefined` on existing sessions even after the migration ran.
- App works fine in a fresh incognito window but fails on a browser with existing sessions.
- TypeScript says the field exists but runtime reads return `undefined`.

**Phase to address:**
Storage migration task, before any v2.0 feature code reads or writes the new fields. Write the migration first, test it on a database seeded with v1 sessions, then proceed.

---

### Pitfall 9: Per-Window WPM Events Emitted During Recording — Event Queue Backpressure

**What goes wrong:**
Per-window WPM events (one event per 30-second window) are emitted from the recording pipeline and written to state/storage incrementally during the session. If the implementation uses a naive `push()` into an IndexedDB record on every event, each write opens a new transaction. On a 30-minute session this is 60 transactions. Each transaction has overhead; on mobile or under load this causes write failures, transaction aborts, or visible jank.

**Why it happens:**
IndexedDB transactions are not designed for high-frequency writes. Every `db.sessions.update()` call inside a recording loop opens a read-write transaction. Frequent small transactions contend with each other and with any concurrent reads from the UI layer.

**How to avoid:**
- Do not write per-window WPM data to IndexedDB during recording. Accumulate it in memory (a JavaScript array in the recording worker or component state).
- Write the entire `wpmWindows` array in a single transaction when `MediaRecorder.stop()` fires, alongside the rest of the session metadata.
- This is consistent with how the existing system works: all session data is written once at the end of recording, not incrementally.
- If real-time WPM display is needed during the session (a future feature), emit events via `postMessage` to the UI layer without touching IndexedDB until recording ends.

**Warning signs:**
- `TransactionInactiveError` or `AbortError` during long sessions.
- IndexedDB write latency increases linearly with session length.
- Noticeable UI jank at each 30-second boundary during recording.

**Phase to address:**
WPM analytics phase. Design the event accumulation pattern before wiring up the 30-second boundary logic.

---

### Pitfall 10: Safari Does Not Support WebCodecs AudioDecoder — Audio Extraction Strategy Needs a Fallback

**What goes wrong:**
If the audio extraction pipeline uses `AudioDecoder` from the WebCodecs API (as recommended by Remotion and other modern tools), it works on Chrome and Chrome-based browsers but fails entirely on Safari. As of early 2026, Safari Technology Preview supports `AudioDecoder` but the stable Safari release does not. Firefox support is also partial.

**Why it happens:**
The WebCodecs API was shipped progressively. `VideoDecoder` shipped widely before `AudioDecoder`. Safari stable as of 2025 supports `VideoDecoder` but not `AudioDecoder`. This is a known browser compatibility gap documented in the W3C WebCodecs issue tracker (issue #378).

**How to avoid:**
- Use `AudioContext.decodeAudioData()` as the primary audio extraction method, not `AudioDecoder`. The Web Audio API is universally supported and handles WebM/Opus audio correctly on all major browsers.
- The `OfflineAudioContext` pattern for 16kHz resampling (described in Pitfall 4) also uses only Web Audio API, which has broad support.
- If `AudioDecoder` is used for performance reasons (e.g., to avoid decoding the entire video), gate it behind a feature check: `typeof AudioDecoder !== 'undefined'` and fall back to `decodeAudioData()`.

**Warning signs:**
- `AudioDecoder is not defined` on Safari.
- Audio extraction silently produces no data on Safari.
- The feature works on Chrome but fails entirely on Safari without an error message.

**Phase to address:**
Whisper integration phase, audio extraction task. Test on Safari before completing the task.

---

### Pitfall 11: Firefox Cannot Load Whisper Model Files Larger Than 256MB

**What goes wrong:**
The Whisper model download or WASM load fails silently on Firefox when the model file exceeds 256MB. The transcription worker initializes but produces no output. This affects `whisper-small` (~244MB, near the limit) and anything above.

**Why it happens:**
Firefox has an internal limit on the size of a single WASM binary or fetched resource that can be loaded in a worker context. This is a known limitation of Firefox's current WASM implementation, documented in the whisper.cpp project discussion boards.

**How to avoid:**
- Target `whisper-tiny` (75MB) or `whisper-base` (145MB, quantized int8 ~75MB) as the default model. Both are well under the Firefox limit.
- For filler word detection and speaking rate analysis, `whisper-tiny` provides sufficient accuracy. Filler words are short, high-frequency tokens that even the smallest model handles correctly.
- Do not offer `whisper-small` or larger as a user-selectable option without first verifying Firefox support.
- Feature-gate larger models with a browser check if multi-model support is ever added.

**Warning signs:**
- Worker initialization appears to succeed but transcription never completes on Firefox.
- No error is thrown — the fetch completes but WASM instantiation silently fails.
- Behavior differs between Chrome (works) and Firefox (silent failure) for the same model size.

**Phase to address:**
Whisper integration phase, model selection task. Lock in `whisper-tiny` or quantized `whisper-base` as the default before wiring up the transcription pipeline.

---

### Pitfall 12: MediaRecorder WebM Files Cannot Be Seeked (Missing Duration Metadata)

**What goes wrong:**
Videos recorded with MediaRecorder produce WebM blobs where the `duration` property reports `Infinity` and `currentTime` seeking does not work. The annotated video playback feature is completely broken out of the box.

**Why it happens:**
MediaRecorder writes WebM metadata first, but duration is only known after recording ends. The browser does not go back to rewrite the metadata with the actual duration, so the resulting blob has no usable `duration` or seek index. This is a known, long-standing browser bug (Firefox Bugzilla #1068001, #1385699) that remains unresolved natively.

**How to avoid:**
Post-process every recorded blob immediately after `MediaRecorder.stop()` fires, before storing to IndexedDB. Use `fix-webm-duration` (npm: `webm-fix-duration` or `fix-webm-duration`) to inject correct duration metadata into the blob. This must be a required step in the recording pipeline — never store the raw blob.

**Warning signs:**
- `videoElement.duration` returns `Infinity` after loading a recorded blob.
- `videoElement.currentTime = 30` has no effect.
- Timeline scrubbing appears non-functional.

**Phase to address:**
Already addressed in v1.0. Remains relevant because the audio extraction pipeline in v2.0 needs a properly structured WebM blob to extract audio cleanly.

---

### Pitfall 13: Running Three MediaPipe Models Simultaneously Saturates the CPU

**What goes wrong:**
Running FaceLandmarker, HandLandmarker, and PoseLandmarker concurrently at 30fps during a live session causes frame drops, inference latency spikes, and main thread jank. On lower-end hardware this escalates to tab crashes.

**Why it happens:**
Each model is a WASM binary running a neural network. Three models competing for CPU time on a single core leaves essentially zero headroom. WebGPU inference is not universally available.

**How to avoid:**
- Cap inference to 5-10fps during live recording.
- Run models in a dedicated Web Worker with `OffscreenCanvas`.
- Use "lite" or "short" model variants.
- Terminate the MediaPipe worker before starting Whisper post-session (see Pitfall 7).

**Warning signs:**
- `console.time` around inference calls shows >40ms per call at 30fps.
- Tab CPU usage above 80% on an M1 Mac during recording.

**Phase to address:**
Already addressed in v1.0. The v2.0 addition is the sequential worker lifecycle: MediaPipe terminates before Whisper starts.

---

### Pitfall 14: IndexedDB Storage Eviction Silently Deletes All Session History

**What goes wrong:**
On Safari, if the user has not interacted with the page in the last 7 days, Safari deletes all IndexedDB data for the origin without warning. On all browsers, if storage quota is exceeded during a session that now includes a Whisper transcript (additional ~10-50KB per session), writes can fail with `QuotaExceededError`.

**Why it happens:**
Safari's storage policy evicts data from origins with no recent user interaction after 7 days. Video blobs are large (100-300MB per session). The v2.0 additions (transcript, wpmWindows array) are small in comparison but still increase per-session storage usage.

**How to avoid:**
- Call `navigator.storage.persist()` during onboarding (already in v1.0 guidance).
- Whisper transcript and wpmWindows data is small enough to store in the same sessions table. Do not store it in a separate table to avoid migration complexity.
- Implement quota estimation before recording starts — v2.0 has more data per session.

**Warning signs:**
- Sessions disappear on Safari after a week of inactivity.
- `QuotaExceededError` thrown during `db.put()` with no UI feedback.

**Phase to address:**
Already addressed in v1.0. Re-verify storage budget estimates after adding Whisper transcript data.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Run MediaPipe on main thread | Simpler setup, no worker messaging | Blocks UI thread, causes recording jank, impossible to refactor away cleanly | Never — architect for worker from day one |
| Store raw MediaRecorder blob without `fix-webm-duration` | Simpler recording pipeline | Seeking broken permanently, annotated playback non-functional | Never — the fix must be applied before storage |
| Use 30fps for MediaPipe inference | Higher accuracy | CPU saturation, tab crashes on mid-range hardware | Never — 5-10fps is sufficient for posture/gesture analysis |
| Skip `navigator.storage.persist()` | Less complexity | Users silently lose all history on Safari | Never — one API call, trivial to add |
| Index large Blobs in Dexie | Simpler schema | Query performance collapses as DB grows | Never — always keep blobs in a non-indexed store |
| Add Whisper to existing classic-mode MediaPipe worker | One worker to manage | Whisper (ES modules) cannot coexist with classic-mode importScripts | Never — keep workers separate by type |
| Skip COOP/COEP headers and run Whisper single-threaded | Avoids header audit complexity | 2-10x slower transcription, SharedArrayBuffer unavailable, some libraries refuse to initialize | Never for production — verify headers before any Whisper work |
| Use `whisper-small` or larger as default | Better accuracy | Exceeds Firefox 256MB limit, increases OOM risk with MediaPipe, 2-4x longer first download | Never as default — use tiny/base; offer upgrade only if needed |
| Write per-window WPM to IndexedDB on every event | Simpler incremental state | Transaction contention, possible aborts on long sessions | Never — accumulate in memory, write once on stop |
| Bump Dexie version without `.upgrade()` function | Faster migration code | Existing records have `undefined` new fields, runtime errors in consumers | Never if existing production data exists |
| Pass raw audio from `decodeAudioData()` (44.1/48kHz) to Whisper | Simpler pipeline | Wrong sample rate → garbled transcription, potential Whisper crashes | Never — always verify and resample to 16kHz mono |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MediaRecorder + MIME types | Hardcode `video/webm;codecs=vp9` without checking support | Call `MediaRecorder.isTypeSupported()` first; include an audio codec in the MIME string (e.g., `vp9,opus`) |
| Whisper + SharedArrayBuffer | Add Whisper library without first confirming cross-origin isolation | Add COOP/COEP headers, verify `window.crossOriginIsolated === true`, audit all cross-origin resources before loading Whisper |
| Whisper worker + Transformers.js | Attempt to load Transformers.js with `importScripts()` in a classic worker | Create a separate module worker (`{ type: 'module' }`); configure `worker.format: 'es'` in Vite |
| Audio extraction + Whisper | Pass `decodeAudioData()` output directly to Whisper | Resample to 16kHz mono via `OfflineAudioContext(1, length, 16000)` before passing to Whisper |
| Whisper model + Firefox | Use `whisper-small` or larger | Target `whisper-tiny` or quantized `whisper-base`; Firefox cannot load WASM > 256MB |
| MediaPipe worker + Whisper worker | Keep MediaPipe worker running while Whisper loads | Terminate MediaPipe worker on recording stop before initializing Whisper worker |
| Dexie schema migration | Add fields to TypeScript interface without bumping DB version | Bump `.version(N)`, add `.upgrade()` with null defaults for all new fields |
| Dexie + large array fields | Index `wpmWindows` array field | Do not index array-of-objects fields; store as non-indexed data |
| Web Speech API + Whisper transcripts | Replace live caption display with Whisper output | Keep Web Speech API for live captions; use Whisper output only for post-session filler analysis |
| MediaPipe + Web Worker | Use ES module worker syntax for MediaPipe | Use classic workers for MediaPipe (existing); keep Whisper in its own separate module worker |
| React StrictMode + workers | Assume cleanup fires only once | Both worker cleanup functions (`worker.terminate()`) must be idempotent; StrictMode mounts/unmounts twice in dev |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running Whisper while MediaPipe WASM heap is still allocated | Tab OOM crash on review page | Terminate MediaPipe worker before starting Whisper | Immediately on mid-range hardware with `whisper-base` or larger |
| Passing entire video blob as a postMessage payload to Whisper worker | Large structured clone on the main thread; UI freeze | Pass an ArrayBuffer transfer (zero-copy) using the transferable second argument to `postMessage()` | At blobs > 10MB (a 5-minute recording is ~50-200MB) |
| Re-downloading Whisper model on every session | 30-120 second wait for every analysis | Use Cache API or OPFS for persistent model storage; Transformers.js handles this automatically | On first use every time without caching |
| Running inference on every camera frame at full resolution | CPU at 100%, video drops frames | Cap inference to 5-10fps; scale down video frame | Immediately on mid-range hardware |
| Writing per-window WPM to IndexedDB inside recording loop | Transaction contention, write failures on long sessions | Accumulate in memory, write once on session stop | Sessions longer than 5 minutes |
| Loading all session blobs from IndexedDB on history page load | History page takes 10+ seconds with 20+ sessions | Never load blobs on history load; load metadata only | At 5+ sessions |
| Browser throttles rAF and timers when tab goes to background | Session timer freezes or drifts if user switches tabs | Derive elapsed time from `performance.now()` deltas, not timer tick counts | Immediately on tab switch |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Displaying raw Web Speech API transcript in innerHTML | XSS if transcript contains injected content | Always use `textContent` not `innerHTML` for transcript rendering |
| Not validating stored session data shape before reading from Dexie | Corrupted or migrated DB schema causes runtime errors | Version Dexie schema migrations; validate session object shape on read; handle `undefined` new fields gracefully |
| Keeping MediaStream tracks alive after recording stops | Camera light stays on permanently | Call `stream.getTracks().forEach(t => t.stop())` when recording stops and on page unload |
| Sending audio blob to Whisper without verifying it contains audio | Silent failure with no user feedback | Check `audioBuffer.numberOfChannels > 0` and `audioBuffer.length > 0` before invoking Whisper |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No camera/microphone permission error handling | User sees a blank recording screen | Detect `NotAllowedError` from `getUserMedia`; show explicit permission instructions |
| No progress indicator for Whisper model download | User thinks app is broken during first-use 30-120s wait | Show "Downloading speech model (first time only)..." with percentage; run asynchronously so session review is available while it downloads |
| Blocking session review while Whisper runs | User cannot review video until transcription completes | Show session review immediately with "Analyzing speech..." placeholder; update filler analysis when Whisper finishes |
| Showing Whisper transcript results as a raw word list | Overwhelming and hard to read | Show filler words highlighted within the transcript text; cluster by time segment; aggregate by type |
| Not explaining why filler counts differ from live captions | User confusion ("why are the numbers different?") | Add tooltip: "Live captions cleaned up speech; this analysis shows your actual filler words" |
| Showing infinite video duration in playback | Scrubber is non-functional | Always apply fix-webm-duration before rendering playback UI |
| No storage quota warning | Users record sessions that silently fail to save | Check `navigator.storage.estimate()` before starting recording; block if <200MB free |
| WPM chart with no baseline | User cannot interpret variance numbers without context | Annotate chart with "ideal range" band (120-150 WPM for presentations); show current session vs. historical average |

---

## "Looks Done But Isn't" Checklist

- [ ] **Whisper cross-origin isolation:** Library loads in dev but `window.crossOriginIsolated` is `false` in production — verify COOP/COEP headers are deployed on the host, not just in Vite dev server config.
- [ ] **Whisper filler detection:** Transcription completes but "um" and "uh" are not in the output — verify Whisper returns disfluencies by testing with a recording that contains known filler words before building detection logic on top.
- [ ] **Audio sample rate:** Audio is extracted and passed to Whisper but transcription is garbled — log `audioBuffer.sampleRate` before Whisper call; must be 16000, not 44100 or 48000.
- [ ] **Audio channel count:** `decodeAudioData()` succeeds but Whisper receives stereo data — verify `audioBuffer.numberOfChannels === 1` (or explicitly mix down to mono before passing).
- [ ] **Dexie migration on existing sessions:** New fields appear correctly in fresh sessions but read as `undefined` on old sessions — test migration by seeding a v1 database, upgrading, and reading all records.
- [ ] **MediaPipe memory released:** Whisper runs post-session but tab becomes unstable — confirm MediaPipe worker `terminate()` is called before Whisper worker starts; check memory profiler shows WASM heap freed.
- [ ] **WPM chart accuracy:** WPM chart renders but values are miscalculated — verify 30-second windows align with actual speech segments, not wall-clock time (pause time should reduce WPM, not be excluded).
- [ ] **Opening/closing strength scoring:** Scores render but are always identical to overall score — verify the scorer is extracting only the first-30s and last-30s segments of the Whisper transcript, not the full transcript.
- [ ] **Filler word detection:** Appears to work in unit tests but returns zero detections on real recordings — verify Chrome Web Speech API output contains "um"/"uh" with a real speech test before declaring feature complete.
- [ ] **Annotated playback scrubbing:** Video loads and plays but seeking to timestamp events does nothing — verify `videoElement.duration !== Infinity` and that seek works after fix-webm-duration is applied.
- [ ] **Session persistence across page reloads:** Sessions appear in history immediately after recording but vanish on Safari after 7 days without interaction — verify `navigator.storage.persist()` is called and granted.
- [ ] **Camera light stays on:** After navigating away from recording page, browser camera indicator remains lit — verify `stream.getTracks().forEach(t => t.stop())` is called in all exit paths.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| COOP/COEP headers not deployed to production | MEDIUM | Add headers to host config (Vercel/Netlify headers file); redeploy; test `window.crossOriginIsolated === true` in prod |
| Audio extracted at wrong sample rate | LOW | Fix `OfflineAudioContext` construction to use 16000Hz; no data loss — reprocess blobs |
| Whisper worker type mismatch (classic vs module) | LOW | Create separate module worker file for Whisper; MediaPipe worker unchanged |
| Dexie migration missing .upgrade() — existing records undefined | MEDIUM | Add upgrade function that sets null defaults; bump version again; users re-open app, migration runs; no data loss |
| Model download blocking first-use UX | LOW | Add progress bar and async loading pattern; already-cached models unaffected |
| MediaPipe + Whisper OOM crash | MEDIUM | Add worker lifecycle management (terminate MediaPipe before Whisper); test memory profile |
| WPM events written to IndexedDB during recording (transaction contention) | LOW | Refactor to accumulate in memory; single write on stop; existing session data unaffected |
| Filler word detection built on Web Speech API (discovered after feature work) | Already mitigated in v2.0 | Whisper integration is the solution; Web Speech API result kept for live captions only |
| MediaRecorder blob stored without fix-webm-duration | HIGH | Must re-encode stored blobs; any stored sessions are permanently unseekable; fix must be applied before first user data |
| IndexedDB data evicted on Safari | MEDIUM | Data is gone; add persist() call and quota monitoring going forward |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| COOP/COEP headers missing | Whisper integration — setup task (phase gate) | `window.crossOriginIsolated === true` in prod before any Whisper code merges |
| Classic vs module worker type mismatch | Whisper integration — worker architecture spike | Load Transformers.js in a module worker; confirm MediaPipe classic worker still works independently |
| Audio sample rate wrong for Whisper | Whisper integration — audio extraction task | Log `audioBuffer.sampleRate` before Whisper call; must read 16000 |
| Audio has no channels (no audio track in blob) | Whisper integration — audio extraction task | Test on Chrome, Firefox, Safari with known video+audio recording |
| WebCodecs AudioDecoder not supported on Safari | Whisper integration — audio extraction task | Feature-check `typeof AudioDecoder`; verify decodeAudioData fallback works on Safari |
| Whisper model too large for Firefox | Whisper integration — model selection task | Lock in tiny/base; verify on Firefox before pipeline is wired up |
| Whisper + MediaPipe concurrent memory | Whisper integration — worker lifecycle task | Memory profiler: record → stop → Whisper analyze; WASM heap should drop after MediaPipe terminates |
| Model download blocking first-use UX | Whisper integration — model caching task | Test first-use on a cleared cache; verify progress UI; verify re-use on second session |
| Dexie version not bumped | Storage migration phase (before v2.0 feature work) | Test migration on a seeded v1 database; all new fields read as `null` on existing records |
| Dexie upgrade without null defaults | Storage migration phase | Read all existing records after migration; none should have `undefined` new fields |
| Per-window WPM events written during recording | WPM analytics phase | No IndexedDB writes inside 30-second event handler; verify in transaction log |
| MediaPipe worker not terminated before Whisper | Worker lifecycle (recording stop handler) | MediaPipe worker.terminate() called before Whisper worker.postMessage('start') |
| Chrome filler word suppression | Whisper integration — filler analysis task | Verify Whisper output contains "um"/"uh" before building detection; do not rely on Web Speech API for filler counts |
| MediaRecorder WebM seek broken | Recording pipeline (v1.0 — already addressed) | After recording, verify `video.duration !== Infinity` and seek works |
| MediaPipe memory leaks from missing .close() | ML inference architecture (v1.0 — already addressed) | Three record/stop cycles; WASM heap returns to baseline |
| IndexedDB eviction on Safari | Storage and persistence (v1.0 — already addressed) | `navigator.storage.persist()` called; quota check before recording |

---

## Sources

**Cross-origin isolation and SharedArrayBuffer:**
- [Making your website cross-origin isolated using COOP and COEP — web.dev](https://web.dev/articles/coop-coep)
- [Understanding SharedArrayBuffer and cross-origin isolation — LogRocket](https://blog.logrocket.com/understanding-sharedarraybuffer-and-cross-origin-isolation/)
- [SharedArrayBuffer updates in Android Chrome 88 and Desktop Chrome 92 — Chrome Developers](https://developer.chrome.com/blog/enabling-shared-array-buffer)

**Whisper WASM browser implementation:**
- [whisper.cpp WASM example README — ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp/blob/master/examples/whisper.wasm/README.md)
- [Transformers.js v3: WebGPU Support, New Models — Hugging Face Blog](https://huggingface.co/blog/transformersjs-v3)
- [Offline speech recognition with Whisper: Browser + Node.js — AssemblyAI Blog](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js)
- [Transformers.js memory leak issue under WebGPU Whisper — GitHub #860](https://github.com/huggingface/transformers.js/issues/860)

**Web Worker type compatibility:**
- [Thread the web with module workers — web.dev](https://web.dev/articles/module-workers)
- [Whisper WASM not working — ggml-org/whisper.cpp Issue #1905](https://github.com/ggml-org/whisper.cpp/issues/1905)
- [WASM WORKERS and ES6 exports — emscripten Issue #17664](https://github.com/emscripten-core/emscripten/issues/17664)

**Audio extraction and resampling:**
- [Resample audio to 16kHz — Remotion docs](https://www.remotion.dev/docs/webcodecs/resample-audio-16khz)
- [Dealing with sample rates for WebCodecs + WebAudio — w3c/webcodecs Issue #378](https://github.com/w3c/webcodecs/issues/378)
- [BaseAudioContext: decodeAudioData() method — MDN](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData)
- [Getting the wave data from an audio file with OfflineAudioContext — Soledad Penadés](https://soledadpenades.com/posts/2024/getting-wave-data-offlineaudiocontext/)

**Browser compatibility:**
- [The State of WebAssembly — 2025 and 2026 — platform.uno](https://platform.uno/blog/the-state-of-webassembly-2025-2026/)
- [WebCodecs API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [Consider using OPFS instead of IndexedDB for Whisper WASM demos — Issue #825](https://github.com/ggml-org/whisper.cpp/issues/825)

**Memory and performance:**
- [MediaPipe memory leak causes Firefox to freeze — Issue #3271](https://github.com/google-ai-edge/mediapipe/issues/3271)
- [Browser crashes when loading MediaPipe models after OpenCV.js — Issue #5442](https://github.com/google-ai-edge/mediapipe/issues/5442)
- [Transferable objects — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [3W for In-Browser AI: WebLLM + WASM + WebWorkers — Mozilla AI Blog](https://blog.mozilla.ai/3w-for-in-browser-ai-webllm-wasm-webworkers/)

**Dexie schema migration:**
- [Version.upgrade() — Dexie.js Documentation](https://dexie.org/docs/Version/Version.upgrade())
- [Migrating existing DB to Dexie — Dexie.js Documentation](https://dexie.org/docs/Tutorial/Migrating-existing-DB-to-Dexie)
- [Primary key change not supported — Dexie.js Issue #1148](https://github.com/dexie/Dexie.js/issues/1148)

**Storage:**
- [Storage quotas and eviction criteria — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [LocalStorage vs IndexedDB vs OPFS — RxDB](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)
- [Origin private file system — MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)

**V1.0 sources (retained):**
- [7 Dos and Don'ts of Using ML on the Web with MediaPipe — Google Developers Blog](https://developers.googleblog.com/7-dos-and-donts-of-using-ml-on-the-web-with-mediapipe/)
- [webm-fix-duration — npm / GitHub](https://github.com/MetaviewAI/webm-fix-duration)
- [Firefox Bugzilla #1068001: Seeking does not work in videos recorded with MediaStreamRecorder](https://bugzilla.mozilla.org/show_bug.cgi?id=1068001)
- [Updates to Storage Policy — WebKit Blog](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [OffscreenCanvas — Speed Up Canvas Operations with a Web Worker — web.dev](https://web.dev/articles/offscreen-canvas)
- [Making Your Website Cross-Origin Isolated Using COOP and COEP — web.dev](https://web.dev/articles/coop-coep)

---
*Pitfalls research for: browser-based ML / Whisper.wasm audio analytics / presentation coaching v2.0*
*Researched: 2026-03-16*
