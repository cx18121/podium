---
phase: 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app
plan: "05"
subsystem: ui
tags: [react, tailwind, animation, accessibility, copywriting]

# Dependency graph
requires:
  - phase: 05-01
    provides: stub tests for copywriting contract
  - phase: 05-02
    provides: score bar colors, delete button visibility
  - phase: 05-03
    provides: tap area expansion on timeline markers
  - phase: 05-04
    provides: heading normalization, max-width consistency, View History affordance

provides:
  - A-05 resolved: animated SVG spinner in processing view with "Processing your recording..." copy
  - A-09 resolved: play/pause overlay on AnnotatedPlayer video with hover opacity and aria-label
  - A-10 resolved: NameSessionModal inner div border removed, focus ring red-600, buttons renamed
  - Copywriting contract fulfilled: all 5 copy strings updated across StorageQuotaBar, SparklineChart, SpeechSupportBanner, Review
  - All 12 audit findings A-01 through A-12 resolved across Phase 05

affects: [future review/playback flows, any component that inherits NameSessionModal or AnnotatedPlayer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hover overlay pattern: relative+group wrapper div, absolute overlay button with opacity-0 group-hover:opacity-100"
    - "Video play state tracking: onPlay/onPause events update isPlaying state, aria-label changes accordingly"
    - "Processing spinner: inline SVG with animate-spin class, no separate component"

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/AnnotatedPlayer/AnnotatedPlayer.tsx
    - src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx
    - src/components/NameSessionModal/NameSessionModal.tsx
    - src/components/NameSessionModal/NameSessionModal.test.tsx
    - src/components/SparklineChart/SparklineChart.tsx
    - src/components/SparklineChart/SparklineChart.test.tsx
    - src/components/common/SpeechSupportBanner.tsx
    - src/pages/Review.tsx

key-decisions:
  - "[05-05] onClick removed from video element and attached only to overlay button — prevents double-toggle on click"
  - "[05-05] isPlaying state driven by onPlay/onPause video events (not onClick toggle) — authoritative video state"
  - "[05-05] Processing spinner inlined in App.tsx — no ProcessingSpinner component per RESEARCH.md Pitfall 6"
  - "[05-05] StorageQuotaBar copy already correct from earlier plan — no change needed"

patterns-established:
  - "Overlay affordance: absolute inset-0 button inside relative group wrapper, opacity controlled by group-hover"
  - "Video state sync: React state follows video events (onPlay/onPause) not user intent (onClick)"

requirements-completed: [A-05, A-09, A-10]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 05 Plan 05: Processing Spinner, Play/Pause Overlay, Modal Cleanup, Copywriting Sweep Summary

**Animated SVG processing spinner, play/pause hover overlay with accessibility, NameSessionModal border removal + copy updates, and full copywriting contract fulfilled — all 12 audit findings resolved**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-15T23:06:00Z
- **Completed:** 2026-03-15T23:11:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- A-05: Processing view now shows `animate-spin` SVG spinner above "Processing your recording..." text
- A-09: AnnotatedPlayer video wrapped in `relative group` div with absolute overlay button — shows play/pause icon on hover, aria-label tracks `isPlaying` state; onClick moved from video to button (prevents double-toggle)
- A-10: NameSessionModal inner dialog border removed, focus ring changed to `red-600`, buttons renamed to "Save Session" / "Use auto name"
- Copywriting sweep: SparklineChart "Need more sessions", SpeechSupportBanner `text-yellow-600`, Review error "Could not load this session. Try recording a new one." — StorageQuotaBar was already correct
- All 136 tests pass (13 todo, 3 skipped files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Processing spinner, play/pause overlay, modal cleanup** - `248a145` (feat)
2. **Task 2: Copywriting sweep** - `5ec52ee` (feat)

## Files Created/Modified
- `src/App.tsx` - Processing view: static text → animated SVG spinner + updated copy
- `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` - isPlaying state, relative/group wrapper, overlay button with hover + aria-label
- `src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` - No changes needed (aria-label still on video element)
- `src/components/NameSessionModal/NameSessionModal.tsx` - Removed border, red-600 focus, "Save Session" / "Use auto name"
- `src/components/NameSessionModal/NameSessionModal.test.tsx` - Updated skip button query from /skip/i to /use auto name/i
- `src/components/SparklineChart/SparklineChart.tsx` - Insufficient-data text shortened to "Need more sessions"
- `src/components/SparklineChart/SparklineChart.test.tsx` - Updated assertions to match new copy
- `src/components/common/SpeechSupportBanner.tsx` - text-yellow-200 → text-yellow-600
- `src/pages/Review.tsx` - Error string updated to "Could not load this session. Try recording a new one."

## Decisions Made
- onClick removed from `<video>` element and placed only on overlay button — if both were wired, clicking the video area would fire twice (once on video, once bubbling through button), toggling back to original state
- `isPlaying` state driven by `onPlay`/`onPause` native video events rather than inferring from `handleVideoClick` — ensures state is authoritative even when video auto-pauses or is controlled externally
- Processing spinner inlined in App.tsx per RESEARCH.md Pitfall 6 — avoids creating a ProcessingSpinner component that would only be used once
- StorageQuotaBar was already showing correct copy from an earlier plan edit — confirmed as no-op

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated NameSessionModal test for renamed "Skip" button**
- **Found during:** Task 1 (NameSessionModal copywriting — "Skip" → "Use auto name")
- **Issue:** Test used `screen.getByRole('button', { name: /skip/i })` which would not match "Use auto name"
- **Fix:** Updated test query to `/use auto name/i`
- **Files modified:** src/components/NameSessionModal/NameSessionModal.test.tsx
- **Verification:** npm test — all 136 tests pass
- **Committed in:** 248a145 (Task 1 commit)

**2. [Rule 1 - Bug] Updated SparklineChart test for renamed insufficient-data copy**
- **Found during:** Task 2 (SparklineChart copy change)
- **Issue:** Test asserted `screen.getByText('Record more sessions to see trends')` which would fail after the copy change
- **Fix:** Updated both test assertions to `'Need more sessions'`
- **Files modified:** src/components/SparklineChart/SparklineChart.test.tsx
- **Verification:** npm test — all 136 tests pass
- **Committed in:** 5ec52ee (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test assertions for renamed copy strings)
**Impact on plan:** Both fixes necessary to keep tests green after copy changes. No scope creep.

## Issues Encountered
None — plan executed cleanly. All acceptance criteria verified.

## Next Phase Readiness
- All 12 audit findings A-01 through A-12 are resolved
- Phase 05 UI polish is complete
- App is ready for v1.0 milestone delivery
- Manual browser verification recommended: hover over video player to confirm overlay, record a session to confirm processing spinner

---
*Phase: 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app*
*Completed: 2026-03-15*
