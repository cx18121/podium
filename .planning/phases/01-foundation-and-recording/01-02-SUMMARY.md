---
phase: 01-foundation-and-recording
plan: "02"
subsystem: infra
tags: [mediapipe, webm, web-speech-api, web-worker, spike, architecture]

# Dependency graph
requires:
  - phase: 01-foundation-and-recording
    provides: Vite scaffold, Dexie schema, Vitest config from 01-01
provides:
  - MediaPipe classic-mode Web Worker approach CONFIRMED viable (all 3 models)
  - webmFixDuration CONFIRMED working — fixes Infinity duration to finite seekable value
  - Chrome Web Speech API filler-word behavior empirically documented as PARTIAL SUPPRESSION
  - Spike UI component (SpikeRunner.tsx) and all three spike drivers as reference code
affects:
  - 01-03-recording-pipeline (webmFixDuration usage confirmed)
  - 02-01-ml-worker-pipeline (classic-mode worker pattern confirmed)
  - 02-03-speech-analysis (filler detection must account for under-counting)

# Tech tracking
tech-stack:
  added: [webm-fix-duration (webmFixDuration), @mediapipe/tasks-vision (classic-mode worker)]
  patterns:
    - Classic-mode Web Worker (type 'classic') required for MediaPipe importScripts
    - ?url Vite import to get worker URL without Vite converting to module worker
    - webmFixDuration applied after MediaRecorder stop, before Dexie save

key-files:
  created:
    - public/mediapipe/vision_bundle.js
    - src/workers/mediapipe.worker.js
    - src/spikes/mediapipe-spike.ts
    - src/spikes/webm-spike.ts
    - src/spikes/speech-spike.ts
    - src/spikes/SpikeRunner.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "MediaPipe CONFIRMED: classic-mode Web Worker with importScripts works on Chrome — proceed with this pattern in 02-01"
  - "webmFixDuration CONFIRMED: fixes Infinity WebM duration to finite seekable value — use in 01-03 recording pipeline"
  - "Filler detection CONSTRAINT: Web Speech API partially suppresses um/uh — ML/scoring layer must not rely solely on Web Speech; design for under-counting in 02-03"
  - "Phase 2 filler detection must use a hybrid or conservative approach: count what Web Speech provides but account for suppression; Whisper.wasm fallback (AUD-v2-01) remains a v2 option"

patterns-established:
  - "Classic-mode worker pattern: new Worker(url, { type: 'classic' }) with ?url Vite import — required for MediaPipe importScripts"
  - "webmFixDuration pipeline: record chunks -> new Blob -> webmFixDuration(blob, durationMs) -> store fixed blob"

requirements-completed: []

# Metrics
duration: spike execution + human verification session
completed: 2026-03-12
---

# Phase 1 Plan 2: Architecture Spikes Summary

**MediaPipe classic-mode worker confirmed on Chrome, webmFixDuration fixes Infinity WebM duration, and Web Speech API filler suppression empirically documented as partial — establishing three locked architectural facts for Phase 2**

## Performance

- **Duration:** Multi-session (spike build + human browser verification)
- **Started:** 2026-03-12
- **Completed:** 2026-03-12
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 7

## Accomplishments

- Built and verified MediaPipe classic-mode Web Worker loading all three models (FaceLandmarker, GestureRecognizer, PoseLandmarker) in Chrome without crashing
- Confirmed webmFixDuration converts Infinity WebM blob duration to a finite, seekable value — safe to use in 01-03 recording pipeline
- Empirically established Chrome Web Speech API filler suppression behavior: PARTIALLY PRESERVED — some filler words captured but not all consistently
- Delivered SpikeRunner UI component providing in-browser spike execution and result display

## Spike Findings — Locked Architectural Facts

### Spike A: MediaPipe Classic-Mode Worker

**Status: SUCCESS — CONFIRMED VIABLE**

- **Platform tested:** Chrome (Mac and/or Windows)
- **Approach:** classic-mode Web Worker (`new Worker(url, { type: 'classic' })`) using `importScripts('/mediapipe/vision_bundle.js')`
- **Result:** All three models (FaceLandmarker, GestureRecognizer, PoseLandmarker) initialized and cleaned up without error
- **MediaPipe version:** @mediapipe/tasks-vision@0.10.32
- **Phase 2 implication:** Proceed with classic-mode worker pattern in 02-01. Do NOT use `type: 'module'` workers with MediaPipe. The `?url` Vite import (not `?worker`) is required to get the URL string without Vite wrapping it as a module worker.

### Spike B: WebM Duration Fix

**Status: SUCCESS — CONFIRMED WORKING**

- **Approach:** MediaRecorder records chunks with 500ms timeslice; raw blob has `duration = Infinity`; `webmFixDuration(rawBlob, durationMs)` rewrites the WebM header
- **Result:** Fixed blob reports finite, positive duration (was `Infinity`; became a correct value in seconds)
- **Phase 2 implication:** Include `webmFixDuration` call in 01-03 recording pipeline immediately after `recorder.onstop`, before storing the blob in Dexie. This is a hard requirement for seekable playback in Phase 3.

### Spike C: Speech Filler Words

**Status: PARTIALLY PRESERVED — CONSTRAINT DOCUMENTED**

- **Finding:** Some filler words (um, uh, like, you know) were captured in Chrome Web Speech API transcripts, but NOT all consistently. Chrome applies disfluency suppression that is non-deterministic.
- **Locked fact:** Web Speech API CANNOT be relied upon as the sole source of filler word detection. The suppression rate is unknown and may vary by microphone, ambient noise, and Chrome version.
- **Phase 2 implication (CONSTRAINT):**
  - `fillerDetector.ts` in 02-03 must count fillers from what Web Speech provides but treat the count as a lower bound, not an exact count
  - Scoring in Phase 3 must account for systematic under-counting when computing the filler word dimension score
  - Do NOT build a system that assumes all filler words will appear in the transcript
  - Whisper.wasm fallback (`AUD-v2-01`) remains a v2 option if higher fidelity filler detection is needed post-launch

## Task Commits

Each task was committed atomically:

1. **Task 1: Build MediaPipe classic-mode worker and WebM duration spike** - `af95a6a` (feat)
2. **Task 2: Build speech filler spike and SpikeRunner UI — wire into App** - `88ffbd1` (feat)
3. **Task 3: Checkpoint — human browser verification** - (no code commit; human-verified findings recorded here)

**Plan metadata:** (docs commit — this SUMMARY + state updates)

## Files Created/Modified

- `public/mediapipe/vision_bundle.js` - MediaPipe tasks-vision bundle patched to expose globalThis.$mediapipe for importScripts usage
- `src/workers/mediapipe.worker.js` - Classic-mode Web Worker initializing all three MediaPipe models
- `src/spikes/mediapipe-spike.ts` - Main-thread spike driver for Spike A; uses `{ type: 'classic' }` Worker constructor
- `src/spikes/webm-spike.ts` - Spike B driver; records 3-second clip, applies webmFixDuration, checks finite duration
- `src/spikes/speech-spike.ts` - Spike C driver; captures 15 seconds of speech, scans for filler words in transcript
- `src/spikes/SpikeRunner.tsx` - Temporary browser UI for running all three spikes and displaying results
- `src/App.tsx` - Temporarily renders SpikeRunner (will be replaced in 01-03 with real routing)

## Decisions Made

1. **Classic-mode worker confirmed as the MediaPipe pattern.** `type: 'module'` workers are incompatible with MediaPipe's `importScripts` internal loading. This is now a locked implementation constraint for 02-01.

2. **webmFixDuration confirmed as the WebM fix mechanism.** No alternative approach needed. Will be applied in 01-03 recording pipeline immediately after `recorder.onstop`.

3. **Filler detection must be designed for under-counting.** Web Speech API suppresses some filler words. Phase 2 filler detection (02-03) must treat Web Speech transcript counts as lower bounds. Scoring in Phase 3 must account for this systematic under-reporting. Whisper.wasm is deferred to v2.

## Deviations from Plan

None — plan executed exactly as written. The checkpoint was reached and the human verifier ran all three spikes and reported findings.

## Issues Encountered

None during code execution. The human verification step revealed the partial filler suppression behavior, which was the expected uncertainty this spike was designed to resolve.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **01-03 is unblocked.** webmFixDuration is confirmed working; use it in the recording pipeline. MediaPipe worker pattern is confirmed; 01-03 does not build the ML worker but benefits from knowing the approach is valid.
- **02-01 is unblocked on MediaPipe approach.** Classic-mode worker with importScripts is the confirmed pattern.
- **02-03 filler detection must be designed with the under-counting constraint.** Do not assume Web Speech captures all filler words. Design scoring to account for this from the start.
- **AUD-v2-01 (Whisper.wasm)** remains a valid v2 enhancement if higher-fidelity filler detection is needed post-launch.

---
*Phase: 01-foundation-and-recording*
*Completed: 2026-03-12*
