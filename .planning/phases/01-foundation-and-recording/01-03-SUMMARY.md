---
phase: 01-foundation-and-recording
plan: "03"
subsystem: ui
tags: [react, mediarecorder, indexeddb, dexie, webm, vitest, testing-library]

# Dependency graph
requires:
  - phase: 01-01
    provides: Dexie schema (SessionRecord), Vite/React/Tailwind scaffold, test infrastructure
  - phase: 01-02
    provides: webmFixDuration confirmed working, Web Speech API filler suppression documented

provides:
  - useRecording hook — MediaRecorder lifecycle, webmFixDuration patch, IndexedDB save via Dexie
  - useStoragePermission hook — navigator.storage.persist() called after first save
  - NameSessionModal component — optional custom name prompt before save, skip to auto date/time name
  - SetupScreen — camera preview, permission gate, Start Recording button
  - RecordingScreen — timer-only view during recording, Stop button
  - SpeechSupportBanner — warns user if Web Speech API unavailable
  - Home and Review pages wired to App state machine
  - End-to-end recording pipeline verified working in browser (7 tests passed)

affects: [02-01, 02-02, 02-03, 03-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useRecording manages MediaRecorder state machine (idle -> permission -> recording -> saving -> done)
    - webmFixDuration applied synchronously before IndexedDB write to ensure finite video duration
    - NameSessionModal is a controlled component — App owns naming state, modal is purely presentational
    - navigator.storage.persist() called once after first successful save (useStoragePermission)
    - App.tsx is the single state machine — screens are stateless views driven by App props

key-files:
  created:
    - src/hooks/useRecording.ts
    - src/hooks/useStoragePermission.ts
    - src/components/NameSessionModal/NameSessionModal.tsx
    - src/components/NameSessionModal/NameSessionModal.test.tsx
    - src/components/RecordingScreen/RecordingScreen.tsx
    - src/components/RecordingScreen/RecordingScreen.test.tsx
    - src/components/common/SpeechSupportBanner.tsx
    - src/components/common/SpeechSupportBanner.test.tsx
  modified:
    - src/App.tsx
    - src/components/SetupScreen/SetupScreen.tsx
    - src/pages/Home.tsx
    - src/pages/Review.tsx
    - src/hooks/useRecording.test.ts

key-decisions:
  - "webmFixDuration applied before every IndexedDB write — ensures videoBlob duration is always finite and seekable"
  - "NameSessionModal is optional: user can skip and auto date/time name is applied (format: 'March 12, 2026 — 3:41 PM')"
  - "App.tsx owns all recording state — screens are stateless, simplifying future feature additions"
  - "useStoragePermission calls navigator.storage.persist() exactly once after first session save"

patterns-established:
  - "State machine pattern: App.tsx manages phase transitions (setup -> recording -> saving -> review), screens render phase"
  - "Hook separation: useRecording handles media, useStoragePermission handles persistence — single responsibility"
  - "TDD for UI components: NameSessionModal tests written before implementation"

requirements-completed: [REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, AUD-05]

# Metrics
duration: 10min
completed: 2026-03-12
---

# Phase 1 Plan 03: Recording Pipeline Summary

**End-to-end recording pipeline: MediaRecorder + webmFixDuration + IndexedDB save + optional rename modal, verified with 7 browser tests**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-12T21:07:35Z
- **Completed:** 2026-03-12T21:14:16Z
- **Tasks:** 3 implementation tasks + 1 checkpoint (verified)
- **Files modified:** 13

## Accomplishments

- useRecording hook drives the full MediaRecorder lifecycle and applies webmFixDuration before saving to IndexedDB
- NameSessionModal lets users name sessions before save or skip to an auto-generated date/time name
- App.tsx state machine wires SetupScreen, RecordingScreen, and Review page together with zero prop drilling
- All 7 browser tests passed at human-verify checkpoint — recording pipeline confirmed working end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: useRecording hook + useStoragePermission** - `abe4c74` (feat)
2. **Task 2: NameSessionModal component** - `91e4195` (feat, TDD)
3. **Task 3: SetupScreen, RecordingScreen, SpeechSupportBanner, pages, App** - `a447263` (feat)

## Files Created/Modified

- `src/hooks/useRecording.ts` - MediaRecorder lifecycle, webmFixDuration patch, Dexie write
- `src/hooks/useStoragePermission.ts` - Calls navigator.storage.persist() once after first save
- `src/components/NameSessionModal/NameSessionModal.tsx` - Optional rename dialog before save
- `src/components/NameSessionModal/NameSessionModal.test.tsx` - TDD tests for modal behavior
- `src/components/RecordingScreen/RecordingScreen.tsx` - Timer + Stop button (no camera feed)
- `src/components/RecordingScreen/RecordingScreen.test.tsx` - Tests for recording screen
- `src/components/common/SpeechSupportBanner.tsx` - Warning when Web Speech API unavailable
- `src/components/common/SpeechSupportBanner.test.tsx` - Tests for banner render conditions
- `src/App.tsx` - State machine owning all phase transitions
- `src/components/SetupScreen/SetupScreen.tsx` - Camera preview and Start Recording gate
- `src/pages/Home.tsx` - Home route wiring
- `src/pages/Review.tsx` - Review route for saved sessions
- `src/hooks/useRecording.test.ts` - Hook unit tests

## Decisions Made

- webmFixDuration applied before every IndexedDB write — without this, recorded video has Infinity duration and seeking is broken (confirmed in 01-02 spike).
- NameSessionModal is optional by design — skipping produces an auto name in "Month D, YYYY — H:MM AM/PM" format to match the must-have truth.
- App.tsx owns all state — screens are stateless. This keeps the state machine in one file and simplifies adding new phases (e.g., analysis overlay in Phase 2).
- useStoragePermission calls navigator.storage.persist() once after first save, not on every save, to avoid repeated permission dialogs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all 7 browser tests passed at the human-verify checkpoint without additional fixes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 (02-01 through 02-03) can begin: App routes, Dexie schema, and recording pipeline are all in place.
- MediaPipe worker pattern confirmed in 01-02 — Phase 2 can wire the worker directly into the review pipeline.
- Known constraint: Web Speech API under-counts um/uh fillers — Phase 3 scoring must treat filler counts as lower bounds.

---
*Phase: 01-foundation-and-recording*
*Completed: 2026-03-12*
