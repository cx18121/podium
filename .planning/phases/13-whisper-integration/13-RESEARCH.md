# Phase 13: Whisper Integration - Research

**Researched:** 2026-03-17
**Domain:** Browser WASM speech recognition, cross-origin isolation, Web Worker ES modules
**Confidence:** MEDIUM — core patterns verified via official docs and current npm registry; COOP/COEP production path is environment-specific and requires runtime verification

---

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase. Constraints come from locked decisions recorded in STATE.md and ROADMAP.md.

### Locked Decisions (from STATE.md)

- Whisper worker MUST be ES module (`{ type: 'module' }`); existing MediaPipe worker remains classic-mode — two separate workers, never coexisting in memory
- MediaPipe worker MUST be terminated before Whisper worker starts — combined WASM heap (300–600 MB + 100–200 MB) exceeds mid-range tab limits
- FillerBreakdown component is already Whisper-upgradeable — it accepts a `whisperFillers?` prop (type `WhisperFillerResult` from db.ts) and uses it over Web Speech data when present
- `whisperFillers?: WhisperFillerResult` and `whisperStatus?: 'pending' | 'complete' | 'failed'` fields already exist on the Session schema (Dexie v3, Phase 8)
- Live captions during recording are powered by Web Speech API only — Whisper runs ONLY post-session, never during recording

### Out of Scope
- Real-time Whisper during recording (explicitly listed as Out of Scope in REQUIREMENTS.md)
- Server-side processing (privacy requirement, no backend)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WHIS-01 | Filler score uses Whisper-derived counts post-session (more accurate than Web Speech) | `@huggingface/transformers` ASR pipeline with `initial_prompt` for disfluency retention; filler counting from transcript text; `db.sessions.update()` to write `whisperFillers`; re-run `aggregateScores` to upgrade scorecard |
| WHIS-02 | Live captions during recording remain unaffected (Web Speech API unchanged) | Architectural separation: Whisper worker is spawned only in ReviewPage after session save; App.tsx recording flow is not modified |
| WHIS-03 | User sees Whisper analysis status while post-session processing runs | `WhisperStatusBanner` component in Review.tsx reading `whisperStatus` from Dexie (or local React state); banner shows during `pending`, hides/updates on `complete`/`failed` |
| WHIS-04 | First-time model download shows a progress indicator (doesn't silently hang) | `progress_callback` on `pipeline()` receives `{ status, progress, file }` objects; download status emitted from worker via `postMessage`; banner reads "Downloading speech model (first time only)..." |
| WHIS-05 | App falls back to Web Speech counts if Whisper fails or is unsupported | Try/catch around worker init and inference; on error write `whisperStatus: 'failed'`; `whisperFillers` left undefined; FillerBreakdown falls back to Web Speech event counts automatically (existing prop logic) |
</phase_requirements>

---

## Summary

Phase 13 integrates Whisper-based speech recognition to replace Web Speech filler counts with more accurate post-session analysis. The implementation uses `@huggingface/transformers` v3 (package: `@huggingface/transformers`, NOT the older `@xenova/transformers`) running in an ES module Web Worker. The worker is spawned on the Review page after MediaPipe has been terminated, runs the Whisper ASR pipeline on the session audio blob, counts filler words from the resulting transcript, then writes `whisperFillers` and `whisperStatus` to Dexie.

The critical environmental blocker identified in STATE.md is COOP/COEP. `@huggingface/transformers` uses ONNX Runtime Web with a multi-threaded WASM backend that requires `SharedArrayBuffer`, which in turn requires `window.crossOriginIsolated === true`. This means the production hosting environment MUST serve `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`) headers. For static hosts without header control (e.g. GitHub Pages), the `coi-serviceworker` library provides a service-worker-based workaround. Vite's `server.headers` config only covers development — production headers need a separate mechanism.

**Primary recommendation:** Use `@huggingface/transformers@3.8.1` with the `Xenova/whisper-tiny.en` model (quantized, ~40–75 MB), `initial_prompt: "Umm, let me think like, hmm..."` to retain disfluencies, spawn the worker as ES module type after confirming `crossOriginIsolated`, and fall back silently to Web Speech counts if the worker fails or the flag is false.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@huggingface/transformers` | 3.8.1 | Whisper ASR in-browser via ONNX Runtime | Official HuggingFace JS library; replaces deprecated `@xenova/transformers`; wraps ONNX RT + model download + caching |
| `coi-serviceworker` | 0.1.7 | COOP/COEP headers on static hosting | Required when production host has no header control; sets `cross-origin-isolation` via service worker |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `AudioContext` (Web API) | n/a | Decode WebM blob to 16kHz Float32Array | Built-in; no install needed; the only safe cross-browser path to convert recorded WebM to PCM |
| Dexie (existing) | 4.3.0 | Persist `whisperFillers` + `whisperStatus` | Already installed; fields already in schema |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@huggingface/transformers` | `whisper.cpp` WASM (ggml-org) | whisper.cpp WASM requires Emscripten build toolchain; no npm package; manual `importScripts` wiring; harder to update; HuggingFace is pure npm |
| `Xenova/whisper-tiny.en` model | `onnx-community/whisper-tiny` | Both work with transformers.js v3; `Xenova/whisper-tiny.en` is the most tested and has pre-quantized ONNX weights for the library |
| ES module Web Worker | Inline worker via Blob URL | Vite can't tree-shake Blob workers; ES module worker matches project decision and works with Vite 6 |

**Installation:**
```bash
npm install @huggingface/transformers
npm install --save-dev coi-serviceworker
```

**Version verification (confirmed 2026-03-17):**
```bash
npm view @huggingface/transformers version   # 3.8.1
npm view coi-serviceworker version            # 0.1.7
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── workers/
│   ├── mediapipe.worker.js       # existing — classic-mode, unchanged
│   └── whisper.worker.ts         # NEW — ES module worker
├── components/
│   └── WhisperStatusBanner/
│       ├── WhisperStatusBanner.tsx     # NEW
│       └── WhisperStatusBanner.test.tsx # NEW
└── pages/
    └── Review.tsx                # MODIFIED — spawn worker, render banner
public/
└── coi-serviceworker.js          # COPIED from npm dist — must be at root
```

### Pattern 1: ES Module Worker with Vite

**What:** Vite 6 supports ES module workers via `new Worker(new URL('./workers/whisper.worker.ts', import.meta.url), { type: 'module' })`. The `{ type: 'module' }` option is required both to enable ES module imports inside the worker AND to satisfy the project decision that the Whisper worker must be ES module.

**When to use:** Always for the Whisper worker. Never change `mediapipe.worker.js` — it is classic-mode by requirement.

**Example:**
```typescript
// Review.tsx — spawn after MediaPipe has been terminated
const worker = new Worker(
  new URL('../workers/whisper.worker.ts', import.meta.url),
  { type: 'module' }
);
```

### Pattern 2: progress_callback for Model Download Progress

**What:** `pipeline()` accepts a third options object with a `progress_callback` function. The callback receives `{ status, file, progress, loaded, total }` objects. `status === 'progress'` fires during download with `progress` as a 0–100 number. `status === 'ready'` fires when the model is loaded.

**When to use:** Always. Without it, the first-time ~75 MB download silently hangs (violates WHIS-04).

**Example:**
```typescript
// Source: https://huggingface.co/docs/transformers.js/en/pipelines
import { pipeline } from '@huggingface/transformers';

const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny.en',
  {
    progress_callback: (progress) => {
      self.postMessage({ type: 'progress', data: progress });
    },
  }
);
```

### Pattern 3: Audio Blob to Float32Array at 16kHz

**What:** Whisper requires mono Float32Array at exactly 16000 Hz. Web Audio API `AudioContext` with `sampleRate: 16000` handles resampling automatically.

**When to use:** Always — the session video/audio was recorded as WebM via MediaRecorder. This decode step is mandatory.

**Example:**
```typescript
// Source: AssemblyAI browser Whisper implementation pattern
async function audioBlobToFloat32Array(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return audioBuffer.getChannelData(0); // mono, Float32Array, 16kHz
}
```

### Pattern 4: initial_prompt for Disfluency Retention

**What:** Whisper's default behavior suppresses disfluencies (um, uh, like) through text normalization. Passing `initial_prompt` with example disfluencies tells the model to retain them in output.

**When to use:** Always. Without this the entire Phase 13 purpose (accurate filler counts) is defeated.

**Example:**
```typescript
const result = await transcriber(audioData, {
  // Source: https://github.com/openai/whisper/discussions/1174
  initial_prompt: 'Umm, let me think like, hmm... Okay, here is what I am, like, thinking.',
});
```

**WARNING (LOW confidence):** Some reports indicate `initial_prompt` can cause timestamp offset bugs and occasionally cause entire sentences to be dropped. Since this implementation only needs filler counts (not per-word timestamps), this risk is low impact. Validate the transcript output in a manual test with a real session before shipping.

### Pattern 5: Worker Message Protocol

**What:** The whisper worker should follow the same init/result/error/progress message pattern used by the existing MediaPipe worker, adapted for ES modules.

**Example protocol:**
```typescript
// whisper.worker.ts messages (outbound from worker)
type WhisperWorkerMessage =
  | { type: 'progress'; data: { status: string; progress?: number; file?: string } }
  | { type: 'ready' }
  | { type: 'result'; fillers: Record<string, number> }
  | { type: 'error'; message: string };
```

### Pattern 6: Filler Counting from Transcript Text

**What:** After ASR produces a text string, count filler words by scanning for tokens. The existing `FILLER_PATTERNS` from `fillerDetector.ts` are Web Speech event-based and should not be reused directly. A simpler regex-based word counter is appropriate for the Whisper transcript.

**When to use:** After Whisper returns the full transcript text — do word-boundary regex matching for `um`, `uh`, `like`, `you know`, etc.

**Example:**
```typescript
const WHISPER_FILLER_PATTERNS: Record<string, RegExp> = {
  um: /\bum+\b/gi,
  uh: /\buh+\b/gi,
  like: /\blike\b/gi,      // note: will over-count — acceptable for post-session
  'you know': /\byou know\b/gi,
  hmm: /\bhmm+\b/gi,
};

function countFillersFromTranscript(text: string): Record<string, number> {
  const byType: Record<string, number> = {};
  for (const [label, pattern] of Object.entries(WHISPER_FILLER_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) byType[label] = matches.length;
  }
  return byType;
}
```

### Pattern 7: COOP/COEP via coi-serviceworker (Static Hosting)

**What:** `coi-serviceworker.js` must be placed at the public root and loaded via a `<script>` tag in `index.html`. It intercepts navigation and response events to add the required headers, then reloads the page once (transparent to the user).

**Example (index.html):**
```html
<!-- Must be the FIRST script tag — before any other scripts -->
<script src="/coi-serviceworker.js"></script>
```

**Copy the file from node_modules after install:**
```bash
cp node_modules/coi-serviceworker/coi-serviceworker.js public/coi-serviceworker.js
```

**Verify in browser console after deployment:**
```javascript
console.log(window.crossOriginIsolated); // must be true
```

### Pattern 8: Guard — Check crossOriginIsolated Before Spawning Worker

**What:** If `crossOriginIsolated` is false (COOP/COEP headers missing), `SharedArrayBuffer` is unavailable and ONNX Runtime's multi-threaded WASM will fail. Detect this before spawning the worker and fall back gracefully.

**Example (Review.tsx):**
```typescript
useEffect(() => {
  if (!window.crossOriginIsolated) {
    // Cannot run Whisper — update status to failed, retain Web Speech counts
    db.sessions.update(sessionId, { whisperStatus: 'failed' });
    return;
  }
  // spawn worker...
}, [sessionId]);
```

**Note:** If ONNX Runtime falls back to single-threaded WASM (no `SharedArrayBuffer`), it may still work but 2–4x slower. Whether this fallback occurs silently depends on the ONNX Runtime version. Do NOT assume single-thread fallback; guard explicitly.

### Anti-Patterns to Avoid

- **Never run both workers simultaneously:** MediaPipe's WASM heap is 300–600 MB; Whisper's is 100–200 MB. Terminate MediaPipe first, confirm `cleanup_done` message received, then spawn Whisper. Failure causes OOM on mid-range devices.
- **Never convert the Whisper worker to classic-mode:** `@huggingface/transformers` uses ES module imports internally. A classic-mode worker cannot use ES module imports.
- **Never add COOP/COEP only to `vite.config.ts` server.headers:** Those headers apply only to the dev server, not production builds.
- **Never import from `@xenova/transformers`:** That package is deprecated. The current package is `@huggingface/transformers`.
- **Never reuse the filler regexes from fillerDetector.ts directly:** Those regexes operate on Web Speech transcript segments (short strings, one phrase at a time). Whisper returns a single text blob — use word-boundary matching against the full string.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ASR model inference | Custom WASM build pipeline | `@huggingface/transformers` pipeline() | Model download, ONNX compilation, audio preprocessing, quantization handling — all handled by the library |
| Audio resampling to 16kHz | Custom DSP resampling | `AudioContext({ sampleRate: 16000 })` + `decodeAudioData` | Web Audio API resamples on decode; AudioContext constructor parameter sets the output rate |
| COOP/COEP headers on static host | Custom service worker | `coi-serviceworker` | Battle-tested; handles page reload on first register, Safari COEP `credentialless` degradation, and deregistration |
| Model progress UI | Polling mechanism | `progress_callback` on `pipeline()` | The callback is synchronous per-chunk; yields real 0–100% without polling |
| IndexedDB caching of model weights | Custom caching logic | Browser Cache API (used automatically by transformers.js) | transformers.js caches model files in the browser's Cache API by default — subsequent loads are instant |

**Key insight:** Whisper ASR in the browser is a solved problem via `@huggingface/transformers`. The only genuinely novel work in this phase is the application-specific integration: worker lifecycle management, filler counting from transcript text, `whisperStatus` persistence, and the WhisperStatusBanner component.

---

## Common Pitfalls

### Pitfall 1: crossOriginIsolated Is False in Production

**What goes wrong:** Worker spawns, ONNX Runtime Web tries to create a `SharedArrayBuffer`, browser throws `ReferenceError: SharedArrayBuffer is not defined` or silently fails to multi-thread. Worker crashes with no result.

**Why it happens:** COOP/COEP headers are missing from production responses. `vite.config.ts` `server.headers` does not apply to production builds.

**How to avoid:** Test `window.crossOriginIsolated` explicitly before spawning the worker. Use `coi-serviceworker.js` in `public/` with the `<script>` tag in `index.html`. Verify headers are present after any production deployment with browser devtools.

**Warning signs:** `console.log(window.crossOriginIsolated)` returns `false`. Workers crash on first run in production but pass in dev (Vite dev server applies headers from config).

### Pitfall 2: MediaPipe Worker Not Terminated Before Whisper Starts

**What goes wrong:** Both workers load WASM simultaneously; heap exhaustion on mid-range devices (8 GB RAM, integrated GPU), causing the tab to crash or become unresponsive.

**Why it happens:** The review page is opened while MediaPipe is still active (e.g. user navigates directly from a long recording with an in-flight worker).

**How to avoid:** App.tsx already has a `cleanup` message / `cleanup_done` pattern for the MediaPipe worker. The Whisper worker must only be spawned from ReviewPage, which renders AFTER the save flow (post-recording). Review from history (no MediaPipe worker) is safe. Add an explicit check: only spawn Whisper worker when the `recording` → `review` path is confirmed clean.

**Warning signs:** Tab crashes on first Whisper run after a session recording.

### Pitfall 3: Whisper Strips Filler Words Despite initial_prompt

**What goes wrong:** Whisper transcribes the audio but the output has no "um", "uh" even with `initial_prompt`, so Whisper-derived filler counts are 0 for all sessions.

**Why it happens:** The tiny.en model has the best disfluency retention but still normalizes aggressively in certain contexts. Larger models are worse. The behavior is model-version and audio-quality dependent.

**How to avoid:** Use `whisper-tiny.en` (not small, base, or larger). Test with a real recording that has known fillers. If counts are consistently 0, Whisper filler detection is unreliable for this use case — the fallback to Web Speech counts (WHIS-05) is the safe outcome.

**Warning signs:** Whisper returns a transcript but all count values in `byType` are 0 or the words "um"/"uh" are absent from the text even when they were clearly spoken.

### Pitfall 4: AudioContext.decodeAudioData Fails on Some WebM Files

**What goes wrong:** `decodeAudioData` throws `DOMException: Unable to decode audio data` for some WebM files recorded by MediaRecorder.

**Why it happens:** MediaRecorder sometimes produces WebM files with only video codec headers and no separate audio track that `AudioContext` can parse, or the audio codec (Opus) metadata is malformed.

**How to avoid:** Wrap `decodeAudioData` in a try/catch. If it fails, set `whisperStatus: 'failed'` and fall back to Web Speech counts. Consider whether the session's videoBlob (already fix-webm-duration processed) can be used directly — the fix-webm-duration processing does not affect the audio codec stream.

**Warning signs:** The Whisper worker never returns a result; the error message mentions `DOMException` or `MediaError`.

### Pitfall 5: Model Download on Every Page Visit (Cache Miss)

**What goes wrong:** The ~75 MB model downloads again on each session review, causing WHIS-04 download banner to appear repeatedly.

**Why it happens:** If the origin changes (e.g. PR preview URLs, localhost vs domain), the browser Cache API considers them different origins and re-downloads.

**How to avoid:** This is browser-managed. The user experience copy should say "Downloading speech model (first time only)..." — but in practice it is "first time per origin". This is acceptable behavior and noted as a known limitation.

### Pitfall 6: WhisperStatusBanner Causes Layout Shift

**What goes wrong:** The banner appearing and disappearing causes the page to jump vertically, which is jarring during review.

**Why it happens:** The banner is conditionally rendered and takes up height when present.

**How to avoid:** Reserve a fixed minimum height for the banner slot even when empty, or use `opacity` / `visibility` transitions instead of conditional rendering. Use `min-h-[N]` on the banner container.

---

## Code Examples

### Worker File Skeleton (ES Module)

```typescript
// src/workers/whisper.worker.ts
// ES MODULE WORKER — do not convert to classic mode
// @huggingface/transformers requires ES module imports
import { pipeline } from '@huggingface/transformers';

let transcriber: Awaited<ReturnType<typeof pipeline>> | null = null;

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'init') {
    try {
      transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          progress_callback: (progress: unknown) => {
            self.postMessage({ type: 'progress', data: progress });
          },
        }
      );
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message });
    }
  }

  if (e.data.type === 'transcribe') {
    try {
      const audioData: Float32Array = e.data.audioData;
      const result = await transcriber!(audioData, {
        initial_prompt: 'Umm, let me think like, hmm... Okay, here is what I am, like, thinking.',
      }) as { text: string };
      self.postMessage({ type: 'result', text: result.text });
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message });
    }
  }
};
```

### Review.tsx Whisper Integration (Lifecycle Sketch)

```typescript
// Review.tsx additions — source: project patterns from existing ReviewPage
useEffect(() => {
  if (!session) return;
  if (!window.crossOriginIsolated) {
    db.sessions.update(session.id!, { whisperStatus: 'failed' });
    return;
  }
  if (session.whisperStatus === 'complete') return; // already ran

  const worker = new Worker(
    new URL('../workers/whisper.worker.ts', import.meta.url),
    { type: 'module' }
  );

  db.sessions.update(session.id!, { whisperStatus: 'pending' });

  worker.onmessage = async (e) => {
    if (e.data.type === 'progress') {
      // update local state for banner
    }
    if (e.data.type === 'ready') {
      // decode audio and send transcribe message
    }
    if (e.data.type === 'result') {
      const fillers = countFillersFromTranscript(e.data.text);
      const whisperFillers: WhisperFillerResult = { byType: fillers };
      await db.sessions.update(session.id!, {
        whisperFillers,
        whisperStatus: 'complete',
      });
      // re-read session to trigger re-render
    }
    if (e.data.type === 'error') {
      await db.sessions.update(session.id!, { whisperStatus: 'failed' });
    }
  };

  worker.postMessage({ type: 'init' });

  return () => worker.terminate();
}, [session?.id]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@xenova/transformers` | `@huggingface/transformers` | Transformers.js v3 (Sept 2024) | Package rename; new import path; v3 adds WebGPU, new quantization formats, 120 model architectures |
| `require-corp` COEP only | `credentialless` COEP as alternative | 2023 (Chrome 98+) | Looser COEP — no CORP header required on subresources. Safari still unsupported. Not a complete solution. |
| Separate worker.js generated by Emscripten | Worker embedded in main JS (Emscripten 3.1.58+) | April 2024 | whisper.cpp WASM: no separate worker.js file exists; only relevant if using whisper.cpp directly (not HuggingFace path) |

**Deprecated/outdated:**
- `@xenova/transformers`: superseded by `@huggingface/transformers`; old package still exists on npm but no longer updated

---

## Open Questions

1. **Production COOP/COEP headers — hosting environment unknown**
   - What we know: The project has no `.github/workflows/`, no `netlify.toml`, no `_headers` file, and no server configuration files. The `public/` directory is local only.
   - What's unclear: Where this app will be deployed in production. The STATE.md note flags this explicitly as `[Phase 13 — NEEDS RESEARCH] COOP/COEP production headers`.
   - Recommendation: Before writing Whisper code, verify `window.crossOriginIsolated === true` on the production host. If the host supports custom headers (Netlify, Vercel, Cloudflare Pages), add them in a `netlify.toml` / `vercel.json` / `_headers` file. If not (GitHub Pages), use `coi-serviceworker` in `public/`. The plan task should include a validation step that checks this before any Whisper code is run.

2. **MediaPipe worker lifecycle at review time**
   - What we know: MediaPipe worker is managed in App.tsx / useRecording. It is terminated via `cleanup` message + `cleanup_done` response.
   - What's unclear: Whether `cleanup_done` is awaited before setting `view: 'review'` in the current App.tsx flow (the handleSaveName handler calls `setView('review')` synchronously after Dexie write, without waiting for MediaPipe cleanup).
   - Recommendation: Verify in the code that by the time ReviewPage mounts, the MediaPipe worker is fully terminated. If not, the plan must include an explicit termination gate.

3. **Whisper filler detection reliability on tiny.en model**
   - What we know: Community reports confirm disfluency retention is best with `whisper-tiny.en` + `initial_prompt` containing disfluencies, but the behavior is non-deterministic and model-version dependent.
   - What's unclear: Whether the quantized ONNX version used by transformers.js in-browser has the same disfluency retention as the Python whisper-tiny model.
   - Recommendation: The fallback path (WHIS-05) is architecturally guaranteed by the existing FillerBreakdown prop logic. The plan should explicitly state that Whisper filler counts being "worse than zero" (all zeros) is acceptable because the fallback to Web Speech is automatic. Manual human verification with a real session is the gate.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vite.config.ts` (test block with `environment: 'jsdom'`, `pool: 'vmThreads'`) |
| Quick run command | `npx vitest run --reporter=verbose src/workers/whisper.worker.test.ts src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| WHIS-01 | `countFillersFromTranscript('umm yeah like I think')` returns `{ um: 1, like: 1 }` | unit | `npx vitest run src/workers/whisper.worker.test.ts` | ❌ Wave 0 |
| WHIS-01 | `db.sessions.update` writes `whisperFillers.byType` correctly | integration | `npx vitest run src/pages/Review.test.tsx` | partial — needs WHIS extension |
| WHIS-02 | Recording flow in App.tsx does not import or instantiate Whisper worker | unit/smoke | manual code review — cannot be automated | manual-only |
| WHIS-03 | WhisperStatusBanner renders when `whisperStatus === 'pending'` | unit | `npx vitest run src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` | ❌ Wave 0 |
| WHIS-03 | WhisperStatusBanner hides/updates when `whisperStatus === 'complete'` | unit | same command | ❌ Wave 0 |
| WHIS-04 | Banner text includes "Downloading speech model" when progress < 100 | unit | same command | ❌ Wave 0 |
| WHIS-05 | When `whisperStatus === 'failed'`, FillerBreakdown uses Web Speech counts | unit | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | partial — FillerBreakdown.test.tsx exists; add WHIS-05 case |
| WHIS-05 | `whisperFillers` undefined → FillerBreakdown shows Web Speech breakdown | unit | same | partial |

**Note on worker testing:** The Whisper ES module worker itself cannot be tested in jsdom (same constraint as the MediaPipe classic-mode worker). Worker-internal logic (`countFillersFromTranscript`) should be extracted as a pure function exported from a separate module file and tested in isolation.

### Wave 0 Gaps

- [ ] `src/workers/whisper.worker.test.ts` — covers `countFillersFromTranscript` pure function (WHIS-01)
- [ ] `src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` — covers pending/complete/failed states (WHIS-03, WHIS-04)
- [ ] `src/components/FillerBreakdown/FillerBreakdown.test.tsx` — add WHIS-05 case for failed whisper with Web Speech fallback (file exists, needs new test case)
- [ ] `src/analysis/whisperFillerCounter.ts` — pure function extracted from worker for testability (WHIS-01); this enables unit testing without worker constraints

---

## Sources

### Primary (HIGH confidence)
- `@huggingface/transformers` npm registry — version 3.8.1 confirmed 2026-03-17
- `coi-serviceworker` npm registry — version 0.1.7 confirmed 2026-03-17
- [Transformers.js Pipeline API docs](https://huggingface.co/docs/transformers.js/en/pipelines) — progress_callback API, ASR pipeline usage, model loading
- [Transformers.js v3 blog post](https://huggingface.co/blog/transformersjs-v3) — package rename, WebGPU, quantization formats
- [MDN COEP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy) — header values and browser requirements
- [MDN COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy) — header values
- Project source (db.ts, App.tsx, mediapipe.worker.js, FillerBreakdown.tsx, Review.tsx) — existing schema, worker patterns, integration points

### Secondary (MEDIUM confidence)
- [blog.tomayac.com — COOP/COEP on static hosting](https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/) — service worker approach; verified 2026-03-17
- [gzuidhof/coi-serviceworker GitHub](https://github.com/gzuidhof/coi-serviceworker) — usage pattern; confirmed active and on npm
- [AssemblyAI — Browser Whisper](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js) — audio decode pipeline pattern (AudioContext + decodeAudioData + getChannelData)
- [web.dev — COOP/COEP guide](https://web.dev/articles/coop-coep) — header values, crossOriginIsolated property
- ONNX Runtime Web single-thread fallback behavior — from Transformers.js GitHub issues (unverified in official docs)

### Tertiary (LOW confidence)
- Whisper disfluency retention via `initial_prompt` — community reports on GitHub discussions (openai/whisper#1174, faster-whisper#901); behavior non-deterministic, not in official Whisper docs as a guaranteed feature
- Whisper-tiny.en encoder size 32.9 MB — from Xenova/whisper-tiny.en HuggingFace model page; total model size (encoder + decoder quantized) ~40–75 MB range based on community reports; exact download size depends on quantization chosen by transformers.js at runtime

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions confirmed from npm registry 2026-03-17; official HuggingFace docs verified
- Architecture: MEDIUM — worker ES module + progress_callback patterns from official docs; audio decode pipeline from verified secondary source; COOP/COEP via coi-serviceworker verified
- Pitfalls: MEDIUM — COOP/COEP pitfall verified from official docs; MediaPipe termination from project decisions; filler word retention via initial_prompt is LOW (non-deterministic, community-sourced)
- Whisper filler accuracy: LOW — fundamental limitation acknowledged; fallback path is HIGH confidence

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30 days — transformers.js is actively developed; verify version before implementation)
