---
phase: 14-calibration-flow
plan: "01"
subsystem: data-layer
tags: [calibration, dexie, pure-functions, worker, scoring]
dependency_graph:
  requires: []
  provides:
    - CalibrationProfile type and calibrationProfiles Dexie v4 table
    - computeCalibrationProfile pure function with percentile-based thresholds
    - aggregateScores optional weights parameter (backward-compatible)
    - Worker threshold injection via init message
    - useMLWorker startWorker accepts optional CalibrationProfile
  affects:
    - src/db/db.ts
    - src/analysis/scorer.ts
    - src/workers/mediapipe.worker.js
    - src/hooks/useMLWorker.ts
tech_stack:
  added:
    - src/analysis/calibration.ts (new pure function module)
    - src/analysis/calibration.test.ts (9 unit tests)
  patterns:
    - Percentile-based threshold computation (p95 for gaze/sway, p05 for face touch)
    - Clamp-to-range safety on all computed thresholds
    - Optional parameter with default for backward-compatible API extension
    - Conditional spread operator for optional worker message fields
key_files:
  created:
    - src/analysis/calibration.ts
    - src/analysis/calibration.test.ts
  modified:
    - src/db/db.ts
    - src/db/db.test.ts
    - src/analysis/scorer.ts
    - src/analysis/__tests__/aggregateScores.test.ts
    - src/workers/mediapipe.worker.js
    - src/hooks/useMLWorker.ts
decisions:
  - "[14-01] computeCalibrationProfile uses p95 of gaze offsets * 1.2 clamped [0.10, 0.40]; p5 of face touch distances * 0.8 clamped [0.06, 0.20]; p95 of shoulder deltas * 1.5 clamped [0.02, 0.10]"
  - "[14-01] Dexie v4 is purely additive (calibrationProfiles table only, no upgrade callback) — preserves all existing sessions"
  - "[14-01] DEFAULT_WEIGHTS exported from scorer.ts; aggregateScores 4th param with default = backward-compatible"
  - "[14-01] Worker threshold override via null-check (not undefined-check) to safely ignore absent fields"
  - "[14-01] useMLWorker uses conditional spread to only include threshold fields when profile is provided"
metrics:
  duration: 16 min
  completed_date: "2026-03-20T01:13:55Z"
  tasks_completed: 2
  files_changed: 8
---

# Phase 14 Plan 01: Calibration Data Layer and Pure Functions Summary

**One-liner:** CalibrationProfile Dexie v4 table, percentile-based computeCalibrationProfile pure function, optional aggregateScores weights parameter, and worker init threshold injection for per-user calibration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dexie v4 schema + CalibrationProfile type + computeCalibrationProfile with tests | db2b89c | src/analysis/calibration.ts, src/analysis/calibration.test.ts, src/db/db.ts, src/db/db.test.ts |
| 2 | aggregateScores optional weights + worker threshold injection + useMLWorker profile forwarding | af8c269 | src/analysis/scorer.ts, src/analysis/__tests__/aggregateScores.test.ts, src/workers/mediapipe.worker.js, src/hooks/useMLWorker.ts |

## What Was Built

### CalibrationProfile Interface and Dexie v4 Schema (db.ts)

Added `CalibrationProfile` interface with `id?`, `createdAt`, `gazeThreshold`, `faceTouchThreshold`, `swayThreshold`. Extended Dexie type assertion to include `calibrationProfiles: EntityTable<CalibrationProfile, 'id'>`. Added v4 schema block — purely additive with no upgrade callback, no session clearing.

### computeCalibrationProfile Pure Function (calibration.ts)

New module `src/analysis/calibration.ts` with:
- `percentile(values, p)` — sort + index helper, returns 0 for empty arrays
- `computeCalibrationProfile(raw)` — accepts `gazeOffsets`, `faceTouchDistances`, `shoulderDeltas` arrays and returns calibrated thresholds:
  - `gazeThreshold`: p95 * 1.2, clamped [0.10, 0.40]
  - `faceTouchThreshold`: p05 * 0.8, clamped [0.06, 0.20]
  - `swayThreshold`: p95 * 1.5, clamped [0.02, 0.10]

### aggregateScores Optional Weights (scorer.ts)

Renamed `WEIGHTS` to `DEFAULT_WEIGHTS` and exported it. Added optional 4th parameter `weights: typeof DEFAULT_WEIGHTS = DEFAULT_WEIGHTS` to `aggregateScores`. All existing call sites continue to work without modification because the default is backward-compatible.

### Worker Threshold Injection (mediapipe.worker.js)

Changed `GAZE_THRESHOLD`, `FACE_TOUCH_THRESHOLD`, `SWAY_THRESHOLD` from `const` to `let`. Added override block in the `init` handler after state reset lines, before the `try` block:
```javascript
if (e.data.gazeThreshold != null) GAZE_THRESHOLD = e.data.gazeThreshold;
if (e.data.faceTouchThreshold != null) FACE_TOUCH_THRESHOLD = e.data.faceTouchThreshold;
if (e.data.swayThreshold != null) SWAY_THRESHOLD = e.data.swayThreshold;
```

### useMLWorker CalibrationProfile Forwarding (useMLWorker.ts)

Imported `CalibrationProfile` from `../db/db`. Updated `startWorker` signature to `(videoEl: HTMLVideoElement, profile?: CalibrationProfile)`. Changed init postMessage to conditionally spread threshold fields when profile is provided.

## Test Results

- New calibration tests: 9 tests all passing (clamps, empty arrays, typical values)
- New Dexie v4 tests: 4 tests all passing (table exists, verno>=4, store/retrieve, sessions still work)
- New aggregateScores custom weights tests: 2 tests all passing
- Full test suite: 461 tests pass, 0 regressions, 39 todo stubs unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- src/analysis/calibration.ts — FOUND
- src/analysis/calibration.test.ts — FOUND
- src/db/db.ts contains `export interface CalibrationProfile` — FOUND
- src/db/db.ts contains `calibrationProfiles: EntityTable<CalibrationProfile, 'id'>` — FOUND
- src/db/db.ts contains `db.version(4).stores(` — FOUND
- src/db/db.ts does NOT contain `.upgrade(` after `version(4)` — CONFIRMED
- src/analysis/scorer.ts contains `export const DEFAULT_WEIGHTS` — FOUND
- src/analysis/scorer.ts contains `weights: typeof DEFAULT_WEIGHTS = DEFAULT_WEIGHTS` — FOUND
- src/workers/mediapipe.worker.js contains `let GAZE_THRESHOLD` — FOUND
- src/workers/mediapipe.worker.js contains `e.data.gazeThreshold` — FOUND
- src/hooks/useMLWorker.ts contains `profile?: CalibrationProfile` — FOUND
- src/hooks/useMLWorker.ts contains `gazeThreshold: profile.gazeThreshold` — FOUND
- Commits db2b89c and af8c269 — FOUND
