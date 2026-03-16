---
phase: 06-interactive-ux-improvements
plan: "01"
subsystem: ui
tags: [react, tailwind, timeline, tooltip, hover, accessibility]

# Dependency graph
requires:
  - phase: 05-ui-polish
    provides: Timeline.tsx component with event markers

provides:
  - Custom React tooltip on Timeline marker hover (removes native OS title tooltip)
  - aria-label preserved on all marker buttons for screen reader compatibility
  - Viewport-safe tooltip positioning via CSS clamp()

affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useState<number | null> index pattern for hover-tracking in lists"
    - "pointer-events-none on tooltip div to prevent onMouseLeave interference"
    - "CSS clamp() for viewport-safe absolute positioning of tooltips"

key-files:
  created: []
  modified:
    - src/components/AnnotatedPlayer/Timeline.tsx
    - src/components/AnnotatedPlayer/Timeline.test.tsx
    - src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx

key-decisions:
  - "Used span wrapper instead of React.Fragment for marker+tooltip pair to avoid key prop issues in older jsdom"
  - "pointer-events-none on tooltip prevents mouse-leave event on button when cursor moves to tooltip area"
  - "clamp(0px, calc(${leftPct}% - 8px), calc(100% - 120px)) keeps tooltip within container bounds at extreme positions"

patterns-established:
  - "Hover tooltip pattern: useState index + onMouseEnter/onMouseLeave on each item, conditional render of sibling tooltip div"

requirements-completed: [PLAY-04]

# Metrics
duration: ~4min
completed: 2026-03-16
---

# Phase 06 Plan 01: Timeline Custom Tooltip Summary

**Custom React hover tooltip on Timeline event markers using useState index, replacing the native OS title tooltip with a styled dark rounded div that stays within container bounds.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-16T00:38:00Z
- **Completed:** 2026-03-16T00:41:36Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Replaced `title={eventLabel(event)}` on all Timeline marker buttons with a custom React-controlled tooltip div
- Tooltip renders above the hovered marker (`bottom-full`, `mb-2`) with dark styling (`bg-gray-800 text-white text-xs rounded`)
- `pointer-events-none` on tooltip div prevents triggering button's `onMouseLeave` as cursor moves between button and tooltip
- `clamp(0px, calc(${leftPct}% - 8px), calc(100% - 120px))` ensures tooltip stays within the Timeline container at leftmost and rightmost markers
- `aria-label` preserved on each button for full screen reader accessibility
- Updated tests to use `getByRole('button', { name: ... })` instead of deprecated `getByTitle`

## Task Commits

1. **Task 1: Add custom tooltip state and render in Timeline.tsx** - `24b7deb` (feat)

## Files Created/Modified

- `src/components/AnnotatedPlayer/Timeline.tsx` - Added `useState<number | null>` tooltipIndex, removed `title` attr, added `onMouseEnter`/`onMouseLeave`, wrapped marker+tooltip in `<span>` fragment, rendered conditionally-visible tooltip div
- `src/components/AnnotatedPlayer/Timeline.test.tsx` - Updated "each button has the correct title attribute" → aria-label test; updated nearest-event test to use `getByRole('button', {name})`
- `src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` - Updated `getByTitle` → `getByRole('button', {name})` in highlights-nearest-event test

## Decisions Made

- Used `<span>` wrapper instead of `React.Fragment` with `key` prop — both work, but span avoids any jsdom Fragment key edge cases while remaining semantically neutral
- `pointer-events-none` is the standard pattern preventing tooltip div from consuming hover events that should belong to the button
- 120px cap in clamp is a conservative estimate for tooltip max-width; prevents overflow at right edge

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated tests that used `getByTitle` to use `getByRole('button', {name})`**
- **Found during:** Task 1 (verification — `npx vitest run`)
- **Issue:** 3 tests used `screen.getByTitle(...)` which required the `title` attribute being removed. After removing `title`, those tests failed.
- **Fix:** Updated `Timeline.test.tsx` (2 tests) and `AnnotatedPlayer.test.tsx` (1 test) to query by accessible button name via `getByRole('button', { name: '...' })`, which uses `aria-label` — semantically stronger and accessibility-testing best practice
- **Files modified:** `src/components/AnnotatedPlayer/Timeline.test.tsx`, `src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx`
- **Verification:** `npx vitest run` — 20 test files pass, 116 tests pass
- **Committed in:** `24b7deb` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — tests testing removed behavior)
**Impact on plan:** Necessary and correct — test queries now reflect the actual accessible API (aria-label) rather than the removed native title attribute. No scope creep.

## Issues Encountered

- The worktree branch (`worktree-agent-a6c64537`) was 79 commits behind `main` and did not have the `AnnotatedPlayer` component. Merged `main` into the worktree branch before proceeding. Clean merge, no conflicts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Timeline tooltip is fully functional; no further marker/tooltip work needed
- `aria-label` preserved — screen readers unaffected
- Ready for 06-02 (filler word detection expansion) and 06-03 (live captions)

---
*Phase: 06-interactive-ux-improvements*
*Completed: 2026-03-16*
