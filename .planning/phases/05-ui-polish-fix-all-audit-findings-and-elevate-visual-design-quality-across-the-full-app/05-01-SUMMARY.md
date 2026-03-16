---
phase: 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app
plan: 01
subsystem: testing
tags: [vitest, react-testing-library, test-stubs, wave-0]

# Dependency graph
requires:
  - phase: 04-session-history
    provides: SessionListItem, StorageQuotaBar, Home components under test
provides:
  - Wave 0 test stubs for Plans 02–05 audit fixes (SessionListItem, StorageQuotaBar, Home)
affects:
  - 05-02 (SessionListItem A-03/A-07 fixes will make stubs green)
  - 05-03 (StorageQuotaBar A-01 copy/fill fixes will make stubs green)
  - 05-04 (Home A-04/A-11/A-12 fixes will make stubs green)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 stub pattern — write failing tests first, fixes in later plans turn them green
    - mockStorageEstimate helper for navigator.storage API in jsdom
    - makeSession factory for Session fixtures in SessionListItem tests

key-files:
  created:
    - src/components/SessionListItem/SessionListItem.test.tsx
    - src/components/StorageQuotaBar/StorageQuotaBar.test.tsx
    - src/pages/Home.test.tsx
  modified: []

key-decisions:
  - "Wave 0 stubs: tests written against future fixed behavior, current failures are intentional and confirm tests are meaningful"
  - "StorageQuotaBar tests use Object.defineProperty on navigator.storage — configurable:true required for reset between tests"
  - "SessionListItem aria-label test uses getByRole('button', { name: 'Delete session' }) — will fail until Plan 02 adds aria-label"

patterns-established:
  - "makeSession factory pattern: Partial<Session> overrides over a complete default fixture"
  - "navigator.storage mock: Object.defineProperty with configurable:true for test isolation"

requirements-completed: [A-03, A-07, A-01, A-04, A-11, A-12]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 05 Plan 01: Wave 0 Test Stubs Summary

**Three missing test files created as wave 0 stubs — 20 tests total, 13 intentionally failing against current code to prove they test the right behavior, unlocked by Plans 02-04 fixes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T22:24:42Z
- **Completed:** 2026-03-15T22:29:36Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created SessionListItem.test.tsx with 8 tests covering delete button visibility (opacity-0), aria-label, and score badge color-coding (null/low/mid/high)
- Created StorageQuotaBar.test.tsx with 5 tests covering storage bar render, critical/warning copy strings, and fill color class
- Created Home.test.tsx with 7 tests covering null render, h1 heading class, footnote color, max-w container, and button behavior
- Confirmed 123 previously-passing tests remain green (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SessionListItem.test.tsx** - `198c6dd` (test)
2. **Task 2: Create StorageQuotaBar.test.tsx** - `4684ce5` (test)
3. **Task 3: Create Home.test.tsx** - `0069921` (test)

## Files Created/Modified
- `src/components/SessionListItem/SessionListItem.test.tsx` - 8 tests for delete button aria-label, opacity-0 fix, and score badge color tiers
- `src/components/StorageQuotaBar/StorageQuotaBar.test.tsx` - 5 tests for copy strings and fill color class
- `src/pages/Home.test.tsx` - 7 tests for heading class, footnote color, container width, and Start Recording button

## Decisions Made
- Wave 0 stub pattern: tests written targeting future fixed behavior intentionally fail now, confirming they are meaningful rather than trivially passing
- StorageQuotaBar mock uses `Object.defineProperty` with `configurable: true` so each test can independently set navigator.storage state
- SessionListItem aria-label query (`getByRole('button', { name: 'Delete session' })`) is the primary probe — when the aria-label is absent the query throws, making the failure clear

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- All 3 test files are in place as automated verification gates for Plans 02–04
- Plan 02 can run its A-03/A-07/A-01 fixes and expect the SessionListItem and StorageQuotaBar stubs to turn green
- Plan 04 can run its A-04/A-11/A-12 fixes and expect the Home stubs to turn green

---
*Phase: 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app*
*Completed: 2026-03-15*

## Self-Check: PASSED

- FOUND: src/components/SessionListItem/SessionListItem.test.tsx
- FOUND: src/components/StorageQuotaBar/StorageQuotaBar.test.tsx
- FOUND: src/pages/Home.test.tsx
- FOUND: commit 198c6dd
- FOUND: commit 4684ce5
- FOUND: commit 0069921
