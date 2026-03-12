# Phase 1: Foundation and Recording - Research

**Researched:** 2026-03-12
**Domain:** Web media capture (getUserMedia/MediaRecorder), IndexedDB persistence, browser ML inference workers, WebM post-processing, Web Speech API compatibility
**Confidence:** MEDIUM-HIGH (core stack HIGH; MediaPipe-in-worker MEDIUM due to known open issues)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Self-view during recording:** Camera feed completely hidden once recording starts. Pre-recording setup screen DOES show the camera so the user can check framing.
- **Session naming:** Auto-named with date + time (e.g., "March 12, 2026 — 3:41 PM"). After stopping, user gets an optional prompt to give a custom name. If skipped, auto name is used. Sessions must be renameable from history view — data model must support rename from day one (Phase 4 builds the UI).
- **Permission denied handling:** Handle gracefully with clear instructions on how to re-enable.
- **Web Speech API unavailable (non-Chrome/Edge):** Non-blocking banner warning on start screen: "Audio analysis requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work." Does NOT block recording.
- **First visit:** Welcome screen with brief intro and "Start Recording" button. No camera shown until setup screen.

### Claude's Discretion

- Permission denied UI design (error message style, retry button behavior)
- Home screen routing once sessions exist
- Self-view corner position (not applicable — feed is hidden)
- Loading/initialization state while MediaPipe models download

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REC-01 | User can start a recording session (webcam + microphone via getUserMedia) | getUserMedia patterns, permission handling, MediaStream management |
| REC-02 | Session UI shows only a timer and a stop button during recording (distraction-free) | React state machine for recording lifecycle; camera feed hidden on start |
| REC-03 | User can stop recording and be taken to the post-session review | MediaRecorder stop event chain; route to review screen after blob assembled |
| REC-04 | Session video blob is post-processed with fix-webm-duration before storage (enables scrubbing) | webm-fix-duration TypeScript library; track startTime/endTime for duration param |
| REC-05 | Session is saved with metadata (date, duration, title) to IndexedDB via Dexie.js | Dexie v4 schema design; EntityTable typing; blob stored without indexing |
| REC-06 | navigator.storage.persist() is called on first session to prevent storage eviction | Storage API persist() call; Chrome auto-approves for engaged sites |
| AUD-05 | User sees a browser support warning when Web Speech API is unavailable | SpeechRecognition feature detection; non-blocking banner component |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire technical foundation for the app: the Vite 7 + React 19 + TypeScript + Tailwind v4 scaffold, a Dexie schema that will serve all four phases, and a working recording pipeline that produces a seekable WebM blob persisted to IndexedDB. Three architecture spikes are deliberately front-loaded here because they are high recovery cost if discovered late: MediaPipe running inside a Web Worker, WebM duration fix, and Chrome filler word suppression behavior.

The recording pipeline itself (getUserMedia → MediaRecorder → fix-webm-duration → Dexie) is well-understood with available libraries. The MediaPipe-in-worker spike is the highest-risk item: the `@mediapipe/tasks-vision` package uses `importScripts` internally, which requires classic-mode workers, and until late 2024 had a Mac Chrome crash bug (#5631) related to `document` access in worker scope. Issue #5631 was fixed in a merged PR in September 2024 (version ~0.10.16+). Issue #5479 (general worker loading) remains open as of January 2026 with no official solution — the workaround is the classic-mode blob URL pattern with a CDN-downloaded mediapipe bundle. This spike must be empirically confirmed on both Mac Chrome and Windows Chrome before Phase 2 proceeds.

**Primary recommendation:** Build the scaffold and Dexie schema first (plan 01-01), run all three spikes in plan 01-02 before any production recording code, then implement the recording pipeline in plan 01-03 only after spikes confirm the viable paths.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 7.x | Build tool + dev server | Current major; requires Node 20.19+; "baseline-widely-available" default target |
| React | 19.x | UI framework | Current major; concurrent features, new hooks API |
| TypeScript | 5.x | Type safety | Standard companion to React 19 |
| Tailwind CSS | 4.x | Utility CSS | v4 is the current release; Vite plugin replaces postcss config |
| @vitejs/plugin-react | 4.x | React Fast Refresh in Vite | Official plugin for React + Vite |
| @tailwindcss/vite | 4.x | Tailwind Vite integration | Replaces postcss.config.js; add @import "tailwindcss" to index.css |

### Persistence

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dexie | 4.x | IndexedDB wrapper | All session storage — metadata, blob, event log, scorecard |
| dexie-react-hooks | 1.x | useLiveQuery hook | Reactive queries in React components |

### Media & Post-processing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| webm-fix-duration | 1.0.1 | Fix seekability of MediaRecorder output | Always — MediaRecorder WebM blobs have duration: Infinity without this |

### Architecture Spikes Only (Phase 1)

| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| @mediapipe/tasks-vision | 0.10.32 | FaceLandmarker, GestureRecognizer, PoseLandmarker | Spike only in Phase 1; production use in Phase 2 |

### Dev / Test

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 2.x | Test runner | Integrated with Vite; no separate config needed |
| @testing-library/react | 16.x | Component tests | Standard for React |
| @testing-library/jest-dom | 6.x | DOM matchers | Extends vitest expect |
| jsdom | 25.x | Browser environment for tests | Required by @testing-library/react |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| webm-fix-duration (TypeScript fork) | fix-webm-duration (original, callback) | Original is v1.0.6, last published 2023, no TypeScript; prefer the Promise-based TS fork |
| webm-fix-duration | @remotion/webcodecs fixMediaRecorderVideo | Remotion brings large dependency; overkill for this use case |
| Dexie 4 | idb | Dexie has React hooks, schema versioning, and TypeScript EntityTable typing; idb is lower-level |
| Vitest | Jest | Vitest shares Vite config; no separate babel transform; faster |

**Installation:**
```bash
npm create vite@latest cognitive-load-mapper -- --template react-ts
npm install dexie dexie-react-hooks
npm install webm-fix-duration
npm install @mediapipe/tasks-vision
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @tailwindcss/vite tailwindcss
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── db/                  # Dexie schema and typed db instance
│   └── db.ts
├── workers/             # Web Worker scripts (classic mode)
│   └── mediapipe.worker.js   # spike worker; Phase 2 refines
├── hooks/               # Custom React hooks
│   ├── useRecording.ts       # MediaRecorder lifecycle
│   └── useStoragePermission.ts
├── components/
│   ├── SetupScreen/     # Pre-recording: camera preview + start button
│   ├── RecordingScreen/ # Timer + stop button only (camera hidden)
│   └── common/          # Shared UI components
├── pages/
│   ├── Home.tsx
│   └── Review.tsx       # Post-recording review (Phase 2+ content)
└── main.tsx
public/
├── mediapipe/           # CDN-downloaded mediapipe bundle for worker spike
│   └── vision_bundle.js
```

### Pattern 1: Dexie Schema v1 Design

**What:** Single versioned schema that must support all four phases without breaking migrations.
**When to use:** Define once in Phase 1; increment `db.version()` in later phases.

The schema must store: session metadata (id, title, date, duration), the video Blob, an event log array (Phase 2 will append entries), and a scorecard (Phase 3 will add). **Do not index Blob columns** — this causes IndexedDB to slow and crash.

```typescript
// Source: https://dexie.org/docs/Tutorial/React
// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie';

interface Session {
  id: number;
  title: string;           // auto date/time or user custom name
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;         // NOT indexed — never put in stores() index list
  eventLog: SessionEvent[];  // Phase 2 will push to this array
  scorecard: Scorecard | null; // Phase 3 will write this
}

interface SessionEvent {
  type: string;
  timestampMs: number;
  label?: string;
}

interface Scorecard {
  overall: number;
  dimensions: Record<string, number>;
}

const db = new Dexie('CognitiveLoadMapper') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
};

// v1 schema: index only metadata columns, never binary
db.version(1).stores({
  sessions: '++id, createdAt, title',
  // videoBlob, eventLog, scorecard are stored but not indexed
});

export type { Session, SessionEvent, Scorecard };
export { db };
```

### Pattern 2: MediaRecorder Recording Lifecycle

**What:** Track recording start time explicitly; assemble chunks on stop; pass calculated duration to fix-webm-duration.
**When to use:** Every recording session.

```typescript
// Based on MDN MediaStream Recording API docs
// src/hooks/useRecording.ts (sketch)
let startTime: number;
let chunks: Blob[] = [];

function startRecording(stream: MediaStream) {
  chunks = [];
  startTime = Date.now();
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9,opus',
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = async () => {
    const durationMs = Date.now() - startTime;
    const rawBlob = new Blob(chunks, { type: 'video/webm' });
    const fixedBlob = await webmFixDuration(rawBlob, durationMs);
    // save fixedBlob to Dexie
  };
  recorder.start(1000); // 1-second timeslice keeps chunks small
}
```

**Key:** Pass `timeslice` to `recorder.start()` so `ondataavailable` fires incrementally. Without a timeslice, the entire recording is buffered in memory.

### Pattern 3: MediaPipe Classic-Mode Web Worker (Spike)

**What:** The only working approach for running `@mediapipe/tasks-vision` off the main thread given that it calls `importScripts` internally.
**When to use:** Required for VIS-01 (Phase 2); Phase 1 spike must confirm this works on Mac + Windows Chrome.

```javascript
// public/mediapipe/vision_bundle.js — downloaded from CDN, end of file modified:
// Replace: export { ... }
// With:    globalThis.$mediapipe = { FaceLandmarker, GestureRecognizer, PoseLandmarker, FilesetResolver };

// src/workers/mediapipe.worker.js — classic mode worker
importScripts('/mediapipe/vision_bundle.js');

const { FaceLandmarker, FilesetResolver } = globalThis.$mediapipe;

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );
    // initialize tasks...
    self.postMessage({ type: 'ready' });
  }
  if (e.data.type === 'frame') {
    // e.data.bitmap is an ImageBitmap transferred from main thread
    // process and postMessage results back
    e.data.bitmap.close();
  }
};
```

```typescript
// Main thread — must use Blob URL to force classic mode in Vite dev
// Source: https://thethoughtfulkoala.com/posts/2021/07/10/vite-js-classic-web-worker.html
import workerUrl from './workers/mediapipe.worker.js?url';
const worker = new Worker(workerUrl, { type: 'classic' });

// Send frames as ImageBitmap (transferable — zero copy)
const bitmap = await createImageBitmap(videoElement);
worker.postMessage({ type: 'frame', bitmap }, [bitmap]);
```

**Critical detail from Vite docs:** Using `?url` suffix imports the worker script as a URL string. Pair with `{ type: 'classic' }` in the Worker constructor. Do NOT use `?worker` suffix (that creates a module worker, which breaks `importScripts`).

### Pattern 4: navigator.storage.persist()

**What:** Request persistent storage on first save so IndexedDB data is not silently evicted.
**When to use:** Call once after the first session is saved.

```typescript
// Source: https://web.dev/articles/persistent-storage
async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const already = await navigator.storage.persisted();
  if (already) return true;
  return navigator.storage.persist(); // Chrome auto-approves for engaged sites
}
```

**Chrome behavior:** Chrome and Edge auto-approve or auto-deny based on engagement heuristics — no user prompt is shown. Firefox shows a permission popup. The return value (boolean) should be logged but not used to block the user.

### Pattern 5: Web Speech API Feature Detection (AUD-05)

**What:** Detect SpeechRecognition availability before showing warning banner.
**When to use:** On the home/start screen render.

```typescript
// Source: MDN Web Speech API
const isSpeechSupported =
  'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

// If false → render the non-blocking banner:
// "Audio analysis requires Chrome or Edge. Eye contact, expressiveness,
//  and gesture analysis will still work."
```

### Anti-Patterns to Avoid

- **Indexing Blob columns in Dexie:** `sessions: '++id, videoBlob'` will cause IndexedDB to slow catastrophically. The Blob field must NOT appear in the stores() index string.
- **Module-mode Web Worker with MediaPipe:** `new Worker(url, { type: 'module' })` will fail because `@mediapipe/tasks-vision` calls `importScripts`, which is forbidden in module workers.
- **Passing HTMLVideoElement to worker:** Workers have no DOM access. Transfer `ImageBitmap` via `createImageBitmap(videoElement)` instead.
- **Forgetting timeslice on MediaRecorder.start():** Without a timeslice, no `dataavailable` event fires until `stop()` — the entire session is held in memory.
- **Not tracking startTime before recording:** `webmFixDuration` requires a `durationMs` parameter. Calculate it as `Date.now() - startTime` at stop time.
- **Using `@import "tailwindcss"` AND a tailwind.config.js:** Tailwind v4 with the Vite plugin needs only the CSS import; a `tailwind.config.js` or `postcss.config.js` is not needed and can cause conflicts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebM seekability | Custom EBML parser to inject duration | `webm-fix-duration` | EBML binary format is non-trivial; existing library handles edge cases including already-present metadata |
| IndexedDB wrapper | Raw IDBRequest callbacks | `Dexie` | Schema versioning, TypeScript types, transaction management, React hooks |
| Worker-safe ML inference | Custom tensor pipeline | MediaPipe classic-worker pattern | Models, WASM runtimes, and model loading are all handled; only wiring needed |
| Storage eviction prevention | Custom cache eviction logic | `navigator.storage.persist()` | This is the only browser-supported mechanism |

**Key insight:** The EBML binary format that WebM uses is complex enough that hand-rolling a duration injector introduces subtle seek bugs on edge-case recordings (variable bitrate, hardware encoder quirks). The library handles these correctly.

---

## Common Pitfalls

### Pitfall 1: WebM Duration is Infinity Without Post-processing

**What goes wrong:** A video recorded with `MediaRecorder` plays fine but cannot be scrubbed — seeking jumps to the end or doesn't work at all. `video.duration` returns `Infinity`.
**Why it happens:** MediaRecorder writes metadata headers first without knowing the final duration; the duration field is left as 0 or "unknown" in the EBML structure.
**How to avoid:** Always pipe the assembled Blob through `webmFixDuration(blob, durationMs)` before saving to Dexie.
**Warning signs:** `video.duration === Infinity` or `isNaN(video.duration)` in the browser console.

### Pitfall 2: MediaPipe Worker Crashes on Mac Chrome (pre-fix)

**What goes wrong:** Worker throws `ReferenceError: document is not defined` when initializing any MediaPipe Vision task.
**Why it happens:** `@mediapipe/tasks-vision` had a platform detection bug that called `"ontouchend" in document` without checking if `document` exists in the worker scope.
**How to avoid:** Use `@mediapipe/tasks-vision` version **0.10.16 or later** (PR #5636 merged September 23, 2024). During the spike, confirm the version in `node_modules` and test on both Mac Chrome and Windows Chrome.
**Warning signs:** Worker `onerror` event fires immediately on initialization before any inference runs.

### Pitfall 3: MediaPipe Won't Load as ES Module Worker

**What goes wrong:** `new Worker(url, { type: 'module' })` causes the worker to throw `importScripts is not defined` or similar errors.
**Why it happens:** `@mediapipe/tasks-vision` internally calls `importScripts()` to load its WASM runtime. This is only available in classic workers.
**How to avoid:** Use `{ type: 'classic' }` in the `Worker` constructor. In Vite, import the worker script with `?url` suffix to get the URL without Vite transforming it into a module worker.
**Warning signs:** Worker fails to initialize; error references `importScripts`.

### Pitfall 4: Vite Dev vs. Production Worker Behavior Differs

**What goes wrong:** Worker works in `npm run build` output but crashes in `npm run dev`.
**Why it happens:** Vite processes worker imports differently in dev mode (transforms to module workers by default).
**How to avoid:** Use the explicit Blob URL or `?url` approach from the start, not the `?worker` Vite shorthand.
**Warning signs:** Worker-related errors only appear in dev mode.

### Pitfall 5: Chrome Filler Word Suppression (Unknown Until Spike)

**What goes wrong:** The Web Speech API transcript silently omits "um" and "uh" — filler detection in Phase 2 finds no fillers even when the speaker says them.
**Why it happens:** Chrome's Speech Recognition backend may apply disfluency filtering. This is NOT documented officially for the Web Speech API. The behavior may differ between Chrome versions or regional servers.
**How to avoid:** The Phase 1 spike must empirically test this by saying known filler words and checking the transcript. Record the finding as a locked fact before Phase 2 plans filler detection.
**Warning signs:** AUD-02 implementation in Phase 2 shows 0 fillers in test recordings that contain obvious "um" and "uh".

### Pitfall 6: Session Schema Not Forward-Compatible

**What goes wrong:** Phase 2 needs to add an `eventLog` column, requiring a Dexie migration that loses existing data or requires complex upgrade code.
**How to avoid:** Include `eventLog` (as an empty array `[]`) and `scorecard` (as `null`) in the Phase 1 schema. Dexie migrations only need to run when indexed columns change; non-indexed fields can be added to existing records without a version bump.

---

## Code Examples

### Setting up Dexie v1 Schema

```typescript
// Source: https://dexie.org/docs/Tutorial/React
// src/db/db.ts
import Dexie, { type EntityTable } from 'dexie';

interface Session {
  id: number;
  title: string;
  createdAt: Date;
  durationMs: number;
  videoBlob: Blob;           // NOT indexed
  eventLog: SessionEvent[];  // NOT indexed
  scorecard: Scorecard | null; // NOT indexed
}

const db = new Dexie('CognitiveLoadMapper') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
};

db.version(1).stores({
  sessions: '++id, createdAt, title',
  // NEVER include videoBlob in this index string
});
```

### Saving a Session

```typescript
// src/hooks/useRecording.ts
import { webmFixDuration } from 'webm-fix-duration';
import { db } from '../db/db';

async function saveSession(chunks: Blob[], durationMs: number, title: string) {
  const rawBlob = new Blob(chunks, { type: 'video/webm' });
  const fixedBlob = await webmFixDuration(rawBlob, durationMs);

  const id = await db.sessions.add({
    title,
    createdAt: new Date(),
    durationMs,
    videoBlob: fixedBlob,
    eventLog: [],
    scorecard: null,
  });

  await requestPersistentStorage(); // REC-06
  return id;
}
```

### Vite Config for Tailwind v4

```typescript
// Source: https://tailwindcss.com/docs (official Vite guide)
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css — entire Tailwind setup */
@import "tailwindcss";
```

### Vitest Configuration

```typescript
// vite.config.ts (add test block)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom';
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js + postcss | @tailwindcss/vite plugin + CSS @import | Tailwind v4 (Jan 2025) | Remove postcss.config.js entirely |
| @tailwind base/components/utilities directives | @import "tailwindcss" | Tailwind v4 | Single line replaces three directives |
| Fix-webm-duration callback API | webm-fix-duration Promise API | 2022 (TS fork) | Async/await compatible; TypeScript types |
| Dexie class extension pattern | Dexie with EntityTable typing | Dexie v4 | Cleaner TypeScript; no class extension required |
| Jest for Vite projects | Vitest | 2022+ | No babel transform needed; shares vite.config |

**Deprecated/outdated:**
- `fix-webm-duration` (original, callback-based): Last published 2023, no TypeScript. Use `webm-fix-duration` (mat-sz fork) instead.
- Tailwind `@tailwind base; @tailwind components; @tailwind utilities` directives: Do not use with v4.
- `?worker` Vite import suffix for MediaPipe workers: Produces module workers; incompatible with `importScripts`.

---

## Open Questions

1. **MediaPipe worker spike outcome — classic mode pattern confirmed?**
   - What we know: Issue #5631 (Mac Chrome document crash) was fixed in Sept 2024. Issue #5479 (general worker loading) remains open as of Jan 2026. The CDN bundle + importScripts pattern is the documented workaround.
   - What's unclear: Whether the workaround is stable on Windows Chrome and Mac Chrome at `@mediapipe/tasks-vision` 0.10.32. The spike must confirm on both platforms.
   - Recommendation: Spike worker must test all three models (FaceLandmarker, GestureRecognizer, PoseLandmarker) — not just one — since each model has a slightly different initialization path.

2. **Chrome filler word suppression — suppressed or preserved?**
   - What we know: Third-party APIs (Rev AI, Azure Speech) have explicit disfluency removal settings. Chrome's Web Speech API has no documented filler filtering. Community reports are mixed.
   - What's unclear: Whether Chrome's server-side speech model silently filters um/uh before returning transcript results.
   - Recommendation: The empirical spike must test: 1) say "um" and "uh" clearly and check `SpeechRecognitionResultList`, 2) test multiple Chrome versions if possible, 3) document the exact observed behavior as a locked fact before Phase 2.

3. **Dexie version migration path if schema needs to change**
   - What we know: The Phase 1 schema includes placeholder columns (`eventLog: []`, `scorecard: null`) to avoid future migrations.
   - What's unclear: Whether Phase 2 or 3 will need new indexed columns.
   - Recommendation: Include `eventLog` and `scorecard` as non-indexed fields in v1. If Phase 2 needs a new indexed compound key, it will call `db.version(2).stores(...)` — Dexie handles this without data loss.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vite.config.ts` (test block) — see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-01 | getUserMedia called with video+audio constraints | unit (mock) | `npx vitest run src/hooks/useRecording.test.ts` | Wave 0 |
| REC-02 | Recording screen renders only timer + stop button | unit (RTL) | `npx vitest run src/components/RecordingScreen/RecordingScreen.test.tsx` | Wave 0 |
| REC-03 | Stopping recording triggers route to review screen | unit (RTL + mock) | `npx vitest run src/components/RecordingScreen/RecordingScreen.test.tsx` | Wave 0 |
| REC-04 | webmFixDuration called before db.sessions.add | unit (mock) | `npx vitest run src/hooks/useRecording.test.ts` | Wave 0 |
| REC-05 | Session saved with correct metadata fields | unit (Dexie fake) | `npx vitest run src/db/db.test.ts` | Wave 0 |
| REC-06 | navigator.storage.persist() called after first save | unit (mock) | `npx vitest run src/hooks/useRecording.test.ts` | Wave 0 |
| AUD-05 | Banner renders when SpeechRecognition absent | unit (RTL) | `npx vitest run src/components/common/SpeechSupportBanner.test.tsx` | Wave 0 |

Note: MediaPipe spike (VIS-01 precursor) and Chrome filler word suppression spike are **manual-only** — they require a real browser with a real camera/microphone. Automated tests cannot substitute. Document findings in spike notes.

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All test files are missing — this is a greenfield project. Wave 0 must create:

- [ ] `src/hooks/useRecording.test.ts` — covers REC-01, REC-03, REC-04, REC-06
- [ ] `src/components/RecordingScreen/RecordingScreen.test.tsx` — covers REC-02, REC-03
- [ ] `src/db/db.test.ts` — covers REC-05
- [ ] `src/components/common/SpeechSupportBanner.test.tsx` — covers AUD-05
- [ ] `src/test-setup.ts` — shared jest-dom setup
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Sources

### Primary (HIGH confidence)

- Vite official blog — `https://vite.dev/blog/announcing-vite7` — Vite 7 release notes, Node requirements, baseline-widely-available target
- Tailwind CSS official docs — `https://tailwindcss.com/docs` — v4 Vite plugin setup, @import "tailwindcss" syntax
- Dexie.js official docs — `https://dexie.org/docs/Tutorial/React` — EntityTable typing, v4 schema, useLiveQuery
- MDN Web Storage API — `https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria` — persist() behavior
- web.dev persistent storage — `https://web.dev/articles/persistent-storage` — Chrome/Firefox behavior differences
- MDN MediaStream Recording API — `https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API` — MediaRecorder lifecycle, timeslice, chunks
- Vitest official docs — `https://vitest.dev/guide/` — jsdom, globals, setupFiles config

### Secondary (MEDIUM confidence)

- webm-fix-duration GitHub (mat-sz) — `https://github.com/mat-sz/webm-fix-duration` — TypeScript API: `webmFixDuration(blob, durationMs): Promise<Blob>`
- MediaPipe issue #5631 (closed) — `https://github.com/google-ai-edge/mediapipe/issues/5631` — Mac Chrome document crash fixed Sept 2024, PR #5636
- MediaPipe issue #5479 (open) — `https://github.com/google-ai-edge/mediapipe/issues/5479` — General worker loading, no official solution as of Jan 2026
- ankdev.me MediaPipe worker guide — `https://ankdev.me/blog/how-to-run-mediapipe-task-vision-in-a-web-worker` — CDN bundle + importScripts workaround
- Thoughtful Koala Vite classic worker — `https://thethoughtfulkoala.com/posts/2021/07/10/vite-js-classic-web-worker.html` — ?url + classic mode pattern

### Tertiary (LOW confidence)

- Chrome filler word suppression: No authoritative source found. Community reports are mixed. Treat as unknown until empirically tested in the spike.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Vite 7, React 19, Tailwind v4, Dexie 4, webm-fix-duration all verified against official docs and npm
- Architecture (recording pipeline): HIGH — getUserMedia, MediaRecorder, webm-fix-duration pattern well-documented
- Architecture (MediaPipe worker): MEDIUM — CDN bundle workaround documented but issue #5479 remains open; must be confirmed by spike
- Pitfalls: HIGH — Most from official issue trackers or MDN documentation
- Chrome filler suppression: LOW — No official documentation; empirical spike required

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days; MediaPipe issues evolve; check for new releases before Phase 2)
