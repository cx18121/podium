---
phase: 08-schema-migration-wpm-windows
plan: 02
subsystem: analysis
tags: [typescript, vitest, tdd, pacing, wpm, indexeddb, dexie]

# Dependency graph
requires:
  - phase: 08-01
    provides: WPMWindow type exported from db.ts, Session.wpmWindows? field defined
provides:
  - calculateWPMWindows pure function with 7 unit tests in pacing.ts
  - wpmWindows saved to IndexedDB on every new session via App.tsx handleSaveName
affects:
  - Phase 12 (WPM Chart Panel) — reads wpmWindows from stored sessions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD red-green for pure analysis functions
    - Bucket algorithm using Math.floor(timestampMs / 30000) for 30s window assignment
    - endMs clamped via Math.min((idx + 1) * 30000, durationMs) to avoid over-counting last window

key-files:
  created: []
  modified:
    - src/analysis/pacing.ts
    - src/analysis/pacing.test.ts
    - src/App.tsx

key-decisions:
  - "[08-02] calculateWPMWindows filters to isFinal segments only — matches calculateWPM behavior and avoids double-counting interim text"
  - "[08-02] Missing windows (silent 30s+ gaps) are not gap-filled — Phase 12 chart handles display gaps"
  - "[08-02] wpmWindows computed at save time in handleSaveName (not at read time) — avoids recomputing on every ReviewPage open"

patterns-established:
  - "Pure analysis functions added to pacing.ts alongside calculateWPM — all pacing logic co-located"
  - "TDD: RED commit (failing tests) followed by GREEN commit (implementation) — separate commit per phase"

requirements-completed:
  - FOUND-02

# Metrics
duration: 10min
completed: 2026-03-16
---

# Phase 08 Plan 02: calculateWPMWindows + App.tsx Wiring Summary

**calculateWPMWindows pure function bucketing isFinal segments into 30s windows, wired into App.tsx handleSaveName to persist wpmWindows to IndexedDB on every new session**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-16T15:42:29Z
- **Completed:** 2026-03-16T15:52:00Z
- **Tasks:** 2 (Task 1 had 2 TDD commits: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- Implemented `calculateWPMWindows()` pure function in `src/analysis/pacing.ts` with 30s bucket algorithm and endMs clamping
- 7 unit tests covering: empty array, isFinal-only filter, single window, multi-window bucketing, endMs clamping, boundary at 30000ms, and sort order
- Wired `calculateWPMWindows` into `App.tsx` `handleSaveName` — `wpmWindows` field now persisted to Dexie v3 on every save

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing tests for calculateWPMWindows** - `34a83ec` (test)
2. **TDD GREEN: Implement calculateWPMWindows** - `c2d6bb0` (feat)
3. **Task 2: Wire calculateWPMWindows into App.tsx** - `7e42d1a` (feat)

## Files Created/Modified
- `src/analysis/pacing.ts` - Added `import type { WPMWindow }` and `export function calculateWPMWindows()`
- `src/analysis/pacing.test.ts` - Added `calculateWPMWindows` import and `describe('calculateWPMWindows (FOUND-02)')` block with 7 tests
- `src/App.tsx` - Added `calculateWPMWindows` to pacing import, computed `wpmWindows` in `handleSaveName`, added to `db.sessions.add()` payload

## Decisions Made
- `calculateWPMWindows` filters to `isFinal` segments only — matches `calculateWPM` behavior and avoids double-counting interim text
- Missing windows (silent 30s+ gaps) are not gap-filled — Phase 12 chart will handle display of sparse data
- `wpmWindows` computed at save time in `handleSaveName` (not at read time) — avoids recomputing on every ReviewPage open

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 12 (WPM Chart Panel) can now read `session.wpmWindows` from Dexie — all new sessions will have this field populated
- Existing sessions cleared by Dexie v3 upgrade (from Plan 08-01) — no legacy sessions without `wpmWindows`
- `calculateWPMWindows` is ready for potential reuse in scorecard computation or analytics

---
*Phase: 08-schema-migration-wpm-windows*
*Completed: 2026-03-16*

## Self-Check: PASSED

- src/analysis/pacing.ts: FOUND
- src/analysis/pacing.test.ts: FOUND
- src/App.tsx: FOUND
- commit 34a83ec (TDD RED): FOUND
- commit c2d6bb0 (TDD GREEN): FOUND
- commit 7e42d1a (App.tsx wiring): FOUND
