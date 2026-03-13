---
phase: 02-analysis-pipeline
plan: "01"
subsystem: ml-worker-infrastructure
tags: [mediapipe, web-worker, frame-pump, tdd, test-stubs, useRecording]
dependency_graph:
  requires: [01-03]
  provides: [worker-message-protocol, frame-pump, event-accumulation, wave-0-test-stubs]
  affects: [02-02, 02-03]
tech_stack:
  added: []
  patterns:
    - classic-mode Web Worker with importScripts (confirmed Phase 1 spike)
    - ImageBitmap transferable objects for zero-copy frame transfer
    - pendingEvents accumulation pattern for session-scoped event buffering
    - busy flag to prevent frame queue backup in slow inference
    - hidden video element (not in DOM) as createImageBitmap source
key_files:
  created:
    - src/workers/mediapipe.worker.js (replaced spike with production worker)
    - src/hooks/useMLWorker.ts
    - src/workers/mediapipe.worker.test.ts
    - src/analysis/eyeContact.test.ts
    - src/analysis/expressiveness.test.ts
    - src/analysis/gestures.test.ts
    - src/analysis/fillerDetector.test.ts
    - src/analysis/pacing.test.ts
    - src/hooks/useSpeechCapture.test.ts
  modified:
    - src/hooks/useRecording.ts (composed useMLWorker, added visualEvents flush)
    - src/hooks/useRecording.test.ts (added vi.mock for useMLWorker, mocked video.play)
    - src/App.tsx (saves visualEvents to eventLog on session save)
decisions:
  - "Worker tests (VIS-01) remain as it.todo stubs — classic-mode worker cannot run in jsdom; manual gate in 02-VALIDATION.md"
  - "useMLWorker.startWorker is not awaited in startSession — frames dropped until worker ready is acceptable at recording start"
  - "Hidden video element created from stream for frame pump but never appended to DOM (RESEARCH.md Pitfall 7)"
metrics:
  duration: "~11 min"
  completed_date: "2026-03-12"
  tasks_completed: 3
  files_changed: 11
---

# Phase 2 Plan 01: ML Worker Infrastructure and Wave 0 Test Stubs Summary

**One-liner:** Production MediaPipe worker with pendingEvents accumulation, useMLWorker hook with 150ms frame pump using ImageBitmap transfer, useRecording extended with visual event flush before callback, and seven Wave 0 test stub files establishing RED signals for all Phase 2 analysis modules.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Wave 0 test stubs for all Phase 2 analysis modules | 12892c4 | 7 new test files |
| 2 | Production mediapipe.worker.js with pendingEvents accumulation | 2a3362a | src/workers/mediapipe.worker.js |
| 3 | useMLWorker hook + extend useRecording with frame pump and event flush | 2137d15 | useMLWorker.ts, useRecording.ts, App.tsx, useRecording.test.ts |

## What Was Built

### Task 1: Wave 0 Test Stubs (7 files)

All seven test stub files exist with `it.todo()` stubs — they provide automated RED signals waiting for downstream plan implementations:

- `src/workers/mediapipe.worker.test.ts` — VIS-01 protocol tests as todos (classic-mode worker cannot run in jsdom)
- `src/analysis/eyeContact.test.ts` — VIS-02: 3 todos for iris-based eye contact detection
- `src/analysis/expressiveness.test.ts` — VIS-03: 3 todos for blendshape expressiveness scoring
- `src/analysis/gestures.test.ts` — VIS-04: 3 todos for face touch and body sway detection
- `src/analysis/fillerDetector.test.ts` — AUD-02: 3 todos for filler word detection
- `src/analysis/pacing.test.ts` — AUD-03/AUD-04: 3 todos for WPM and pause detection
- `src/hooks/useSpeechCapture.test.ts` — AUD-01: 3 todos for speech capture hook

**Result:** `npx vitest run` shows 20 passing, 21 todo, 0 failures.

### Task 2: Production mediapipe.worker.js

Replaced the Phase 1 spike worker (which only closed bitmaps) with a production worker that:

- **init**: Initializes all three models with correct options (`outputFaceBlendshapes: true` on FaceLandmarker), resets `pendingEvents = []`, posts `{ type: 'ready' }` on success
- **frame**: Checks busy flag, runs `detectForVideo`/`recognizeForVideo` on all three models using `performance.now()` at inference time (not main-thread timestamp), calls `bitmap.close()` in `try/finally`, pushes `deriveEvents()` results to `pendingEvents`, posts `{ type: 'frame_ack' }`
- **stop**: Posts `{ type: 'events', events: [...pendingEvents] }` and resets accumulator
- **cleanup**: Closes all three models, nulls them, posts `{ type: 'cleanup_done' }`

The `deriveEvents()` function is a stub returning `[]` — plan 02-02 populates it with real analysis calls.

### Task 3: useMLWorker Hook + Extended useRecording

**useMLWorker.ts** owns the worker lifecycle:
- `startWorker(videoEl)`: Creates `new Worker(workerUrl, { type: 'classic' })`, waits for `ready` message, then starts 150ms `setInterval` frame pump using `createImageBitmap(videoEl)` with ImageBitmap ownership transfer
- `stopWorker()`: Clears interval immediately, sends `stop`, returns `Promise<SessionEvent[]>` resolving on `events` message
- `cleanupWorker()`: Sends `cleanup`, terminates worker after `cleanup_done` or 500ms timeout

**useRecording.ts** now composes useMLWorker:
- Creates hidden video element from stream on `startSession` (not added to DOM)
- Calls `mlWorker.startWorker(hiddenVideo)` without awaiting (acceptable — frames dropped until ready)
- In `recorder.onstop`: awaits `mlWorker.stopWorker()` to flush visual events BEFORE calling `onRecordingReady`
- `RecordingReadyData` extended with `visualEvents: SessionEvent[]`
- `stopStream` also calls `mlWorker.cleanupWorker()`

**App.tsx** updated to save `visualEvents` to `eventLog`:
```typescript
eventLog: [...(pendingRecording.visualEvents ?? [])],
```

## Verification Results

1. `npx vitest run` — 20 passing, 21 todo, 0 failures
2. `npx tsc --noEmit` — TypeScript compilation clean
3. Seven test stub files exist in `src/analysis/` and `src/hooks/`
4. `mediapipe.worker.js` contains `pendingEvents`, `busy` flag, and `outputFaceBlendshapes: true`
5. `useMLWorker.ts` exports `useMLWorker`
6. `RecordingReadyData` has `visualEvents: SessionEvent[]` field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worker undefined breaks existing useRecording tests**
- **Found during:** Task 3
- **Issue:** After composing `useMLWorker` into `useRecording`, the existing `useRecording.test.ts` tests threw `ReferenceError: Worker is not defined` because jsdom does not implement Web Workers. This was an unhandled rejection that did not fail tests but produced 4 unhandled rejection errors in the test output.
- **Fix:** Added `vi.mock('./useMLWorker', ...)` to `useRecording.test.ts` to stub out the hook with `vi.fn()` implementations. Also added `HTMLVideoElement.prototype.play` mock since jsdom does not implement `play()`.
- **Files modified:** `src/hooks/useRecording.test.ts`
- **Commit:** 2137d15

## Self-Check: PASSED

All files exist and all commits are present in git history:
- FOUND: src/workers/mediapipe.worker.js
- FOUND: src/hooks/useMLWorker.ts
- FOUND: src/hooks/useRecording.ts
- FOUND: src/analysis/eyeContact.test.ts
- FOUND: src/analysis/expressiveness.test.ts
- FOUND: src/analysis/gestures.test.ts
- FOUND: src/analysis/fillerDetector.test.ts
- FOUND: src/analysis/pacing.test.ts
- FOUND: src/hooks/useSpeechCapture.test.ts
- FOUND: commit 12892c4 (test stubs)
- FOUND: commit 2a3362a (production worker)
- FOUND: commit 2137d15 (useMLWorker + useRecording)
