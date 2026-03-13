---
phase: 02-analysis-pipeline
plan: "03"
subsystem: speech-analysis
tags: [web-speech-api, filler-detection, pacing, speech-capture, tdd, react-hooks]

requires:
  - phase: 02-01
    provides: ML worker infrastructure, useMLWorker, visualEvents in RecordingReadyData
  - phase: 02-02
    provides: visual analysis functions (eyeContact, expressiveness, gestures) wired into worker
provides:
  - SpeechCapture class with start/stop and Chrome auto-restart
  - detectFillers pure function extracting filler events from final transcript segments
  - detectPauses and calculateWPM pure functions for pacing analysis
  - App.tsx wired to merge visual + speech events into sorted eventLog on Dexie write
affects: [03-scoring-engine, 04-review-ui]

tech-stack:
  added: []
  patterns:
    - SpeechCapture as plain class (not hook) — no React re-renders, ref-held by App
    - useRef for speechCaptureRef and sessionStartMsRef — lifecycle values, not render state
    - Global regex lastIndex=0 reset per segment to prevent stateful exec() bug
    - wpm_snapshot event at durationMs position for Phase 3 scorer access
    - Speech events merged with visualEvents and sorted before single Dexie write

key-files:
  created:
    - src/hooks/useSpeechCapture.ts
    - src/hooks/useSpeechCapture.test.ts
    - src/analysis/fillerDetector.ts
    - src/analysis/fillerDetector.test.ts
    - src/analysis/pacing.ts
    - src/analysis/pacing.test.ts
  modified:
    - src/App.tsx

key-decisions:
  - "pacing.test.ts times out when run in isolation (same Vitest worker pool behavior as mediapipe.worker.test.ts) but all 6 pacing tests pass in the full suite — not a code bug, a Vitest parallelism behavior on WSL2"
  - "wpm_snapshot event placed at timestampMs=durationMs (session end) so Phase 3 scorer can find it without scanning the entire eventLog"
  - "SpeechCapture implemented as a plain class, not a React hook — held via useRef to avoid re-renders on transcript accumulation"

requirements-completed: [AUD-01, AUD-02, AUD-03, AUD-04]

duration: ~18min
completed: 2026-03-13
---

# Phase 2 Plan 03: Speech Capture and Analysis Summary

**SpeechCapture class with Chrome auto-restart, detectFillers/detectPauses/calculateWPM pure functions, and App.tsx wired to merge visual + speech events into a single sorted eventLog before the Dexie write.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-03-13T03:01:05Z
- **Completed:** 2026-03-13T03:19:05Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint — awaiting browser verification)
- **Files modified:** 7

## Accomplishments

- SpeechCapture accumulates final and interim transcript segments with relative timestamps and auto-restarts Chrome recognition on silence timeout
- detectFillers extracts filler events from final segments only, normalizing 'umm'→'um' and 'uhh'→'uh'; LOWER BOUNDS comment added per Phase 1 spike constraint
- detectPauses flags gaps >2000ms between consecutive final segments; calculateWPM computes words-per-minute with zero-division guard
- App.tsx now creates SpeechCapture on handleStart, stops it in handleSaveName, merges all events (visual + speech) sorted by timestampMs into the Dexie eventLog write
- 14 new unit tests across 3 files — all passing; full suite: 51 passing, 3 todo, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: SpeechCapture + fillerDetector + pacing** - `e4029fc` (feat)
2. **Task 2: Wire SpeechCapture into App.tsx** - `50aca59` (feat)
3. **Task 3: Human verify — complete Phase 2 event log in IndexedDB** - awaiting checkpoint

## Files Created/Modified

- `src/hooks/useSpeechCapture.ts` - SpeechCapture class: start/stop/auto-restart, TranscriptSegment type
- `src/hooks/useSpeechCapture.test.ts` - 4 unit tests (AUD-01): final segments, interim, auto-restart, stop()
- `src/analysis/fillerDetector.ts` - detectFillers pure function with FILLER_PATTERNS regex and normalization
- `src/analysis/fillerDetector.test.ts` - 4 unit tests (AUD-02): um detection, uh normalization, non-final skip, empty
- `src/analysis/pacing.ts` - detectPauses and calculateWPM pure functions with PAUSE_THRESHOLD_MS=2000
- `src/analysis/pacing.test.ts` - 6 unit tests (AUD-03/AUD-04): WPM calculation, zero-division, pause detection
- `src/App.tsx` - Added speechCaptureRef/sessionStartMsRef, SpeechCapture start in handleStart, speech event derivation + merge in handleSaveName

## Decisions Made

- `wpm_snapshot` event is placed at `timestampMs: durationMs` (the session end position) so Phase 3 scorer can locate it as the final event without scanning
- SpeechCapture is a plain class held in `useRef`, not a React hook — transcript accumulation doesn't need to trigger re-renders
- `FILLER_PATTERNS.lastIndex = 0` reset before each segment's exec loop to prevent the global regex state bug where alternating calls skip matches
- `pacing.test.ts` times out when run in isolation via `npx vitest run src/analysis/pacing.test.ts` — same Vitest pool startup behavior as the pre-existing mediapipe.worker.test.ts timeout on WSL2. All 6 pacing tests pass in the full suite.

## Deviations from Plan

None — plan executed exactly as written. All implementation patterns followed from RESEARCH.md Pattern 5.

## Issues Encountered

- Vitest worker pool timeout when running `pacing.test.ts` in isolation (not a new issue — pre-existing behavior on this WSL2 environment, documented in 02-01 SUMMARY for mediapipe.worker.test.ts). Running the full suite works correctly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 2 automated implementation complete (Tasks 1 and 2)
- Awaiting human browser verification (Task 3 checkpoint): real Chrome session must produce an IndexedDB eventLog with events from at least 3 different types
- Phase 3 scoring engine can read: `eye_contact_break`, `eye_contact_resume`, `face_touch`, `body_sway`, `expressiveness_score` (visual) + `filler_word`, `pause_detected`, `wpm_snapshot` (speech)
- All event types carry `timestampMs` (relative to session start) and `label` where applicable

---
*Phase: 02-analysis-pipeline*
*Completed: 2026-03-13*
