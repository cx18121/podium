---
phase: 02-analysis-pipeline
plan: "02"
subsystem: ml-analysis
tags: [mediapipe, eye-contact, expressiveness, gestures, tdd, pure-functions, web-worker]

requires:
  - phase: 02-01
    provides: production mediapipe.worker.js with pendingEvents accumulation, deriveEvents() stub, Wave 0 test stubs

provides:
  - detectEyeContact pure function with iris-offset gaze algorithm (VIS-02)
  - scoreExpressiveness and aggregateExpressiveness pure functions (VIS-03)
  - detectFaceTouch and detectBodySway pure functions (VIS-04)
  - 16 new passing unit tests across three analysis modules
  - deriveEvents() in mediapipe.worker.js wired to all three analysis functions

affects:
  - 02-03 (audio analysis — gestures/eye-contact/expressiveness now in worker per-frame)
  - 03-scoring (expressiveness_segment, eye_contact_break/resume, face_touch, body_sway events now in eventLog)

tech-stack:
  added: []
  patterns:
    - Pure functions with state-passed-in pattern — analysis state owned by caller (worker), not analysis module
    - Inlined JS analysis functions in classic-mode worker (no ES module imports allowed)
    - RMS of relevant blendshapes for expressiveness scoring (punishes flat delivery)
    - Normalized image coordinates (result.landmarks, not worldLandmarks) for proximity calculations
    - Deduplication via prevState tracking — prevents duplicate event bursts on state persistence

key-files:
  created:
    - src/analysis/eyeContact.ts
    - src/analysis/expressiveness.ts
    - src/analysis/gestures.ts
  modified:
    - src/analysis/eyeContact.test.ts (3 todos -> 4 real tests)
    - src/analysis/expressiveness.test.ts (3 todos -> 6 real tests)
    - src/analysis/gestures.test.ts (3 todos -> 7 real tests)
    - src/workers/mediapipe.worker.js (stub deriveEvents replaced, analysis fns inlined, state vars added)

key-decisions:
  - "Analysis functions inlined as plain JS in worker file — classic-mode Web Worker cannot use ES module imports, so functions from .ts files cannot be imported"
  - "State (eyeContactState, prevShoulderX, prevFaceTouching, expressionFrameScores) owned by worker module level, not inside analysis functions — keeps analysis fns pure and testable"
  - "expressiveness_segment events emitted every 33 frames (~5s at 150ms interval) from worker — not from expressiveness.ts"
  - "GAZE_THRESHOLD=0.15, FACE_TOUCH_THRESHOLD=0.12, SWAY_THRESHOLD=0.04 shipped as uncalibrated heuristics — tune after Phase 3 first recordings"

patterns-established:
  - "Pure analysis function pattern: (data, timestampMs, prevState) -> { event, newState } — stateless, fully testable with fixture landmark arrays"
  - "makeLandmarks helper in tests: creates full-size neutral array, applies overrides at key indices — avoids massive array literals"

requirements-completed:
  - VIS-02
  - VIS-03
  - VIS-04

duration: ~8min
completed: 2026-03-13
---

# Phase 2 Plan 02: Visual Analysis Functions Summary

**Three pure TypeScript analysis modules (eye contact via iris-offset, expressiveness via blendshape RMS, gestures via landmark proximity) with 16 passing unit tests, inlined into mediapipe.worker.js deriveEvents() to produce per-frame visual events throughout recordings.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-13T02:36:32Z
- **Completed:** 2026-03-13T02:44:25Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Implemented `detectEyeContact` — iris offset relative to eye-corner bounding box; state transitions fire `eye_contact_break` / `eye_contact_resume` events with deduplication
- Implemented `scoreExpressiveness` (RMS of 17 expression blendshapes) and `aggregateExpressiveness` (simple average over a window); 5-second segments emitted as `expressiveness_segment` events from the worker
- Implemented `detectFaceTouch` (wrist + fingertip proximity to nose in normalized coordinates) and `detectBodySway` (shoulder midpoint x-drift); both deduplicate via prevState
- Wired `deriveEvents()` in `mediapipe.worker.js` — now calls all four analysis functions per frame, manages state resets on `init`
- Full test suite: 37 passing, 12 todo (remaining todos are 02-03 stubs for AUD-01/02/03/04 and VIS-01), 0 failing

## Task Commits

Each task was committed atomically:

1. **Task 1: detectEyeContact with VIS-02 tests** - `c4cd738` (feat — TDD: test RED + implementation GREEN)
2. **Task 2: expressiveness + gestures with VIS-03/VIS-04 tests** - `b64a3e0` (feat — TDD: test RED + implementation GREEN)
3. **Task 3: Wire deriveEvents() in mediapipe.worker.js** - `25c51ed` (feat)

## Files Created/Modified

- `src/analysis/eyeContact.ts` — detectEyeContact pure function; GAZE_THRESHOLD=0.15; iris offset vs eye-corner bounding box; exports EyeContactEvent interface
- `src/analysis/expressiveness.ts` — scoreExpressiveness (RMS of 17 expression blendshapes) and aggregateExpressiveness; exports BlendshapeScore interface
- `src/analysis/gestures.ts` — detectFaceTouch (normalized proximity, FACE_TOUCH_THRESHOLD=0.12) and detectBodySway (shoulder midpoint, SWAY_THRESHOLD=0.04); exports GestureEvent interface
- `src/analysis/eyeContact.test.ts` — 4 real tests with makeLandmarks helper (replaced 3 todos)
- `src/analysis/expressiveness.test.ts` — 6 real tests covering all-zero, animated, unknown names, aggregation (replaced 3 todos)
- `src/analysis/gestures.test.ts` — 7 real tests (4 face-touch + 3 body-sway) with makeFaceLandmarks/makeHandLandmarks/makePoseLandmarks helpers (replaced 3 todos)
- `src/workers/mediapipe.worker.js` — all 5 analysis functions inlined as plain JS, module-level state vars added, deriveEvents() wired, state vars reset on 'init'

## Decisions Made

- Analysis functions inlined as plain JS in the worker file rather than imported — classic-mode Web Workers cannot use ES module imports, so the TypeScript source files serve as the canonical implementation and the JS worker contains a verbatim translation.
- State variables (`eyeContactState`, `prevShoulderX`, `prevFaceTouching`, `expressionFrameScores`) live at worker module level, not inside the analysis functions — this keeps the pure functions testable in isolation while giving the worker ownership of cross-frame state.
- Expressiveness segments emit from `deriveEvents()` (not from `expressiveness.ts`) — the 33-frame window logic belongs in the worker where timing context lives.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all analysis algorithms matched the RESEARCH.md patterns exactly. No calibration needed for initial pass (thresholds remain as specified: GAZE_THRESHOLD=0.15, FACE_TOUCH_THRESHOLD=0.12, SWAY_THRESHOLD=0.04).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- VIS-02, VIS-03, VIS-04 complete — all visual analysis events now flow through the worker into `pendingEvents` and ultimately into IndexedDB `eventLog`
- Plan 02-03 ready to proceed: speech capture (`SpeechCapture.ts`), filler detection, pacing analysis
- Remaining todos in test suite are for 02-03 scope: `fillerDetector.test.ts`, `pacing.test.ts`, `useSpeechCapture.test.ts`, `mediapipe.worker.test.ts`

---
*Phase: 02-analysis-pipeline*
*Completed: 2026-03-13*
