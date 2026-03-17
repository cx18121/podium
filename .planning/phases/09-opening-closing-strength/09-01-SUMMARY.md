---
phase: 09-opening-closing-strength
plan: 01
subsystem: analysis
tags: [scorer, scorecard, opening-closing, tdd, vitest, react]

# Dependency graph
requires:
  - phase: 08-schema-migration-wpm-windows
    provides: Dexie v3 schema with SessionEvent type used by scorer

provides:
  - scoreOpeningClosing() pure function scoring first/last 30s of each session
  - ScorecardResult.dimensions.openingClosing: DimensionScore (6th dimension)
  - WEIGHTS redistributed to sum to 1.00 with openingClosing=0.10
  - Opening / Closing row in ScorecardView (6 dimensions total)

affects:
  - Review.tsx (consumes ScorecardResult via aggregateScores)
  - any future phase reading ScorecardResult.dimensions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Negative event density scoring: negPerMin / threshold * 100, floor at 0
    - Window-based segment scoring with scoreSegment() helper
    - Short-session guard: durationMs < 60s returns neutral score=50 with detail

key-files:
  created: []
  modified:
    - src/analysis/scorer.ts
    - src/analysis/__tests__/aggregateScores.test.ts
    - src/components/ScorecardView/ScorecardView.tsx
    - src/components/ScorecardView/ScorecardView.test.tsx

key-decisions:
  - "[09-01] Opening window weighted 60%, closing window 40% — opening impression carries more weight in composite"
  - "[09-01] NEGATIVE_EVENT_TYPES: filler_word, face_touch, body_sway, eye_contact_break only — wpm_snapshot, expressiveness_segment, pause_detected excluded"
  - "[09-01] Short-session threshold: durationMs < 60s (OC_WINDOW_MS*2) returns neutral 50 with 'Session too short (< 60s)' detail"
  - "[09-01] WEIGHTS redistributed: eyeContact=0.22, fillers=0.22, pacing=0.18, expressiveness=0.14, gestures=0.14, openingClosing=0.10 (sum=1.00)"

patterns-established:
  - "scoreSegment() helper: filter events by time window, count NEGATIVE_EVENT_TYPES, apply negPerMin/threshold scoring"
  - "Guard pattern: durationMs<=0 returns 'No data'; durationMs<threshold returns 'Session too short'"

requirements-completed: [ANAL-01]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 09 Plan 01: Opening / Closing Strength Summary

**Sixth scorecard dimension scoring negative-event density in first/last 30s using pure functions scoreSegment() and scoreOpeningClosing(), with weights redistributed to sum to 1.00**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T04:37:24Z
- **Completed:** 2026-03-17T04:42:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added scoreOpeningClosing() pure function with opening 60% / closing 40% composite scoring, short-session guard for < 60s sessions, and 6 unit test cases via TDD
- Extended ScorecardResult interface with openingClosing: DimensionScore as 6th dimension
- Redistributed WEIGHTS to 6 entries summing to 1.00 (eyeContact=0.22, fillers=0.22, pacing=0.18, expressiveness=0.14, gestures=0.14, openingClosing=0.10)
- Added "Opening / Closing" row to ScorecardView DIMENSIONS array with full test coverage

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for scoreOpeningClosing** - `302bc99` (test)
2. **Task 1 GREEN: scoreOpeningClosing() implementation** - `537619c` (feat)
3. **Task 2: Opening / Closing row in ScorecardView** - `53ca9ce` (feat)

_Note: TDD task 1 has two commits (test RED + feat GREEN)_

## Files Created/Modified
- `src/analysis/scorer.ts` - Added NEGATIVE_EVENT_TYPES, OC_WINDOW_MS, scoreSegment(), scoreOpeningClosing(); extended ScorecardResult; updated WEIGHTS; wired into aggregateScores
- `src/analysis/__tests__/aggregateScores.test.ts` - Added describe('scoreOpeningClosing') with 6 tests; updated 'mixed scores' expected overall from 69 to 65
- `src/components/ScorecardView/ScorecardView.tsx` - Added openingClosing entry to DIMENSIONS array (now 6 entries)
- `src/components/ScorecardView/ScorecardView.test.tsx` - Added openingClosing fixture data; updated test name to '6 dimension labels'; added meter/detail assertions

## Decisions Made
- Opening weighted 60%, closing 40%: opening impression (first-contact effect) is more impactful than closing for most audiences
- NEGATIVE_EVENT_TYPES set excludes neutral/positive event types (wpm_snapshot, expressiveness_segment, eye_contact_resume, pause_detected) — only delivery disruptions counted
- Session too short threshold is 60s (2 x 30s windows) — below this, windows would overlap or be empty, making scoring misleading

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all tests passed on first GREEN run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- scoreOpeningClosing() is fully tested and wired into aggregateScores
- ScorecardResult now has 6 dimensions; all consumers (Review.tsx via Object.entries persistence) automatically include openingClosing
- ScorecardView renders 6 rows with correct aria attributes
- Full test suite: 379 passed, TypeScript: no errors — ready for next phase

---
*Phase: 09-opening-closing-strength*
*Completed: 2026-03-17*
