---
phase: 14-calibration-flow-one-time-baseline-recording-that-tunes-per-user-thresholds-gaze-face-touch-sway-score-weights-stored-in-dexie-so-scoring-is-accurate-for-each-person
plan: 02
subsystem: ui
tags: [react, mediapipe, dexie, calibration, worker, typescript]

# Dependency graph
requires:
  - phase: 14-01
    provides: CalibrationProfile Dexie table, computeCalibrationProfile pure function, worker threshold overrides via init message
provides:
  - Guided 2-step CalibrationScreen UI (30s gaze + posture flow)
  - Worker calibrate_frame and calibrate_stop message handlers accumulating raw measurements
  - App.tsx calibration view state with useLiveQuery profile loading
  - SetupScreen calibrate/re-calibrate link and Calibrated badge
  - useRecording profile forwarding to ML worker init
affects: [future phases that use recording scoring, any phase touching App.tsx views]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Raw Worker (not useMLWorker) used in CalibrationScreen for calibrate_frame/calibrate_stop message protocol
    - Worker accumulates raw measurements without emitting SessionEvents during calibration mode
    - useLiveQuery on calibrationProfiles table for reactive profile state in App.tsx

key-files:
  created:
    - src/components/CalibrationScreen/CalibrationScreen.tsx
    - src/components/CalibrationScreen/CalibrationScreen.test.tsx
  modified:
    - src/workers/mediapipe.worker.js
    - src/App.tsx
    - src/components/SetupScreen/SetupScreen.tsx
    - src/hooks/useRecording.ts

key-decisions:
  - "[14-02] CalibrationScreen uses raw Worker (not useMLWorker) — calibration needs custom calibrate_frame/calibrate_stop protocol that useMLWorker's frame pump doesn't support"
  - "[14-02] calibrationProfile loaded via useLiveQuery with .last() on orderBy('id') — most recent profile wins, old profiles preserved for audit trail"
  - "[14-02] onCalibrate and hasCalibration are required props on SetupScreen (not optional) — all callers must be explicit about calibration state"

patterns-established:
  - "Calibration: raw measurements accumulated in worker accumulators, flushed via calibrate_stop to main thread for computeCalibrationProfile"
  - "Worker dual-mode: standard frame messages emit SessionEvents; calibrate_frame messages only accumulate raw data"

requirements-completed: [CAL-04, CAL-05]

# Metrics
duration: 17min
completed: 2026-03-20
---

# Phase 14 Plan 02: CalibrationScreen UI + Worker Message Handlers + App Wiring Summary

**Guided 30-second calibration flow wired end-to-end: worker accumulates raw gaze/touch/sway measurements, CalibrationScreen guides user through 2 steps, profile saved to Dexie and forwarded to all future recording sessions**

## Performance

- **Duration:** 17 min
- **Started:** 2026-03-20T01:16:46Z
- **Completed:** 2026-03-20T01:33:57Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Worker handles `calibrate_frame` and `calibrate_stop` messages: accumulates raw gaze offsets, face-touch distances, and shoulder deltas without emitting SessionEvents
- CalibrationScreen guides user through Step 1 (Look at camera, 15s) and Step 2 (Hands at sides, 15s) with countdown timer, frame counter, and camera preview overlay
- App.tsx state machine extended with `'calibration'` view; CalibrationProfile loaded reactively via useLiveQuery; profile saved on completion
- SetupScreen shows "Calibrate for accuracy" or "Re-calibrate" link and "Calibrated" badge when profile exists
- useRecording forwards optional CalibrationProfile to startWorker, which overrides thresholds in worker init

## Task Commits

Each task was committed atomically:

1. **Task 1: Worker calibration messages + CalibrationScreen component with tests** - `a45ba56` (feat)
2. **Task 2: App.tsx state machine + SetupScreen calibrate link + useRecording profile forwarding** - `c6d6495` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/workers/mediapipe.worker.js` - Added calibrate_frame handler (accumulates raw measurements), calibrate_stop handler (flushes calibration_data and resets), module-level calibration accumulators
- `src/components/CalibrationScreen/CalibrationScreen.tsx` - Guided 2-step calibration UI with countdown, camera preview, step indicators, cancel button
- `src/components/CalibrationScreen/CalibrationScreen.test.tsx` - Tests for render, cancel, deferred onComplete
- `src/App.tsx` - Added 'calibration' AppView, CalibrationScreen import, useLiveQuery for calibrationProfiles, handleCalibrationComplete, calibration view render block
- `src/components/SetupScreen/SetupScreen.tsx` - Added onCalibrate/hasCalibration props, calibrate/re-calibrate button, Calibrated badge
- `src/hooks/useRecording.ts` - startSession accepts optional CalibrationProfile, forwards to mlWorker.startWorker

## Decisions Made
- CalibrationScreen uses a raw `new Worker(workerUrl, { type: 'classic' })` rather than `useMLWorker` because calibration needs `calibrate_frame`/`calibrate_stop` messages that the standard frame-pump hook doesn't support
- `calibrationProfile` loaded via `useLiveQuery(() => db.calibrationProfiles.orderBy('id').last(), [])` — most recent profile wins; old profiles are preserved in Dexie for audit trail without ever being deleted
- `onCalibrate` and `hasCalibration` are **required** (not optional) props on SetupScreen — forces explicit wiring at every call site

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- vitest vmThreads pool takes 70+ seconds to initialize in WSL2; ran with `sleep 85 && wait` pattern to collect output. All 467 tests passed.

## Next Phase Readiness
- Full calibration flow is operational end-to-end
- Phase 14-03 (if any) or Phase 15 can proceed — scoring is now personalized per user
- Calibration profiles are persisted in Dexie v4 and automatically applied on every new recording

---
*Phase: 14-calibration-flow*
*Completed: 2026-03-20*
