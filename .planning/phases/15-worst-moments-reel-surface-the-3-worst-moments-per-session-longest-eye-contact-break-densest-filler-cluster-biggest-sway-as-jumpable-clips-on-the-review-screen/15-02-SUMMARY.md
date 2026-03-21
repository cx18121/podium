---
phase: 15-worst-moments-reel
plan: "02"
subsystem: ui
tags: [component, forwardRef, useImperativeHandle, seek-channel, review-page]
dependency_graph:
  requires: [15-01]
  provides: [WorstMomentsReel, AnnotatedPlayerHandle]
  affects:
    - src/components/AnnotatedPlayer/AnnotatedPlayer.tsx
    - src/components/WorstMomentsReel/WorstMomentsReel.tsx
    - src/pages/Review.tsx
tech_stack:
  added: []
  patterns: [forwardRef, useImperativeHandle, fireEvent-click-testing]
key_files:
  created:
    - src/components/WorstMomentsReel/WorstMomentsReel.tsx
    - src/components/WorstMomentsReel/WorstMomentsReel.test.tsx
  modified:
    - src/components/AnnotatedPlayer/AnnotatedPlayer.tsx
    - src/pages/Review.tsx
decisions:
  - "[15-02] AnnotatedPlayer converted to forwardRef — additive only, internal seekTo useCallback and Timeline onSeek unchanged"
  - "[15-02] @testing-library/user-event not installed; used fireEvent.click from @testing-library/react — consistent with all other test files in the project"
  - "[15-02] JumpButton extracted as inner component to encapsulate hover state via useState without polluting the parent"
metrics:
  duration_seconds: 1625
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 15 Plan 02: WorstMomentsReel UI + Review.tsx Wiring Summary

**One-liner:** WorstMomentsReel panel component with category dot + label + timestamp + Jump-to button rows, wired into Review.tsx via forwardRef/useImperativeHandle seek channel through AnnotatedPlayer.

## What Was Built

`src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` (modified):
- Added `export interface AnnotatedPlayerHandle { seekTo: (ms: number) => void; }`
- Converted from plain function component to `forwardRef<AnnotatedPlayerHandle, AnnotatedPlayerProps>`
- Added `useImperativeHandle(ref, ...)` exposing external `seekTo` — internal `seekTo` useCallback and Timeline `onSeek` prop unchanged

`src/components/WorstMomentsReel/WorstMomentsReel.tsx` (created):
- Panel card matching FillerBreakdown/PauseDetail pattern (background `#0b1022`, 18px border-radius, 24px padding)
- Heading: "WORST MOMENTS" (14px, 600, `#8a9bc2`, uppercase, letter-spacing 0.06em)
- Renders 0–3 non-null moment rows: 10px category dot + label (15px/600/`#e4e9f5`) + timestamp (13px/400/`#5e6f94`, flex:1) + "Jump to" button
- Category colors match Timeline.tsx markerBg: eye_contact=`#5b8fff`, filler_cluster=`#f59e0b`, body_sway=`#f43f5e`
- Empty state: "No significant issues detected" when all moments null
- "Jump to" button: min-height 44px (WCAG touch target), hover state via onMouseEnter/onMouseLeave, focus-visible outline

`src/components/WorstMomentsReel/WorstMomentsReel.test.tsx` (created):
- 10 tests across 3 describe blocks: WM-05 (all 3 moments), WM-06 (all null), partial (1 moment)
- Uses `getAllByRole('button', { name: 'Jump to' })` and `fireEvent.click`

`src/pages/Review.tsx` (modified):
- Added imports: `useRef`, `computeWorstMoments`, `WorstMomentsReel`, `AnnotatedPlayerHandle`
- Added `playerRef = useRef<AnnotatedPlayerHandle>(null)`
- Computed `worstMoments = computeWorstMoments(session.eventLog, session.durationMs)` after loading guards
- Inserted WorstMomentsReel wrapper div immediately before AnnotatedPlayer wrapper
- Added `ref={playerRef}` to AnnotatedPlayer
- Wired `onSeek={(ms) => playerRef.current?.seekTo(ms)}` seek channel

## Panel Order in Review.tsx

WhisperStatusBanner -> ScorecardView -> PauseDetail -> FillerBreakdown -> WPMChart -> **WorstMomentsReel** -> AnnotatedPlayer -> Record Again button -> Back to History link

## Commits

| Hash | Type | Description |
|------|------|-------------|
| dd98c51 | feat | AnnotatedPlayer forwardRef + WorstMomentsReel component + tests |
| 91480ef | feat | Wire WorstMomentsReel into Review.tsx with seek channel |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @testing-library/user-event not installed**
- **Found during:** Task 1 (first test run)
- **Issue:** Test used `userEvent.setup()` + `user.click()` but `@testing-library/user-event` is not in node_modules. All other test files in the project use `fireEvent` from `@testing-library/react`.
- **Fix:** Replaced `userEvent.setup()` / `await user.click()` with `fireEvent.click()` — no behavior change for the test assertions
- **Files modified:** src/components/WorstMomentsReel/WorstMomentsReel.test.tsx
- **Commit:** dd98c51

## Known Stubs

None — all three category rows are fully wired to computeWorstMoments output and the seek channel is live.

## Self-Check: PASSED
