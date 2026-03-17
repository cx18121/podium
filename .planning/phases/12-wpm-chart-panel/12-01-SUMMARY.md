---
phase: 12-wpm-chart-panel
plan: 01
subsystem: ui
tags: [recharts, react, charts, wpm, analytics, vitest, tdd]

# Dependency graph
requires:
  - phase: 08-schema-migration-wpm-windows
    provides: WPMWindow type and session.wpmWindows field in Dexie v3
  - phase: 11-filler-breakdown-panel
    provides: panel container style reference (background, border, borderRadius)
provides:
  - computeWPMChartData pure function converting WPMWindow[] to { label, wpm }[] chart points
  - WPMChart component — recharts LineChart panel with graceful empty state
  - Review.tsx updated to show WPMChart after FillerBreakdown panel
affects: [13-whisper-integration, any future chart panels]

# Tech tracking
tech-stack:
  added: [recharts@^2.x]
  patterns: [TDD red-green for pure function and component, vi.mock('recharts') with ResponsiveContainer stub for jsdom tests]

key-files:
  created:
    - src/analysis/wpmChart.ts
    - src/analysis/wpmChart.test.ts
    - src/components/WPMChart/WPMChart.tsx
    - src/components/WPMChart/WPMChart.test.tsx
  modified:
    - src/pages/Review.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "[12-01] msToLabel uses Math.floor(ms/1000) -> minutes/seconds with padStart('0') — same pattern as existing durationDisplay in Review.tsx"
  - "[12-01] WPMChart empty state: !wpmWindows || chartData.length === 0 — covers both undefined (pre-Phase-8 sessions) and empty array"
  - "[12-01] Tooltip formatter type annotation uses inferred type (not explicit number) — recharts ValueType is number|string|undefined so explicit number causes TS2322"
  - "[12-01] vi.mock('recharts') at top level replacing only ResponsiveContainer with fixed-size div — allows recharts internals to render in jsdom without SVG measurement failures"

patterns-established:
  - "Chart mock pattern: vi.mock('recharts', importOriginal) spreading actual but replacing ResponsiveContainer with fixed div"

requirements-completed: [ANAL-06]

# Metrics
duration: 25min
completed: 2026-03-17
---

# Phase 12 Plan 01: WPM Chart Panel Summary

**recharts LineChart panel showing speaking pace over 30-second windows, with M:SS x-axis labels and graceful empty state for pre-Phase-8 sessions**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-17T15:07:56Z
- **Completed:** 2026-03-17T15:32:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- computeWPMChartData pure function converts WPMWindow[] to { label: 'M:SS', wpm: number }[] — 7 unit tests, all passing
- WPMChart recharts LineChart component with indigo (#5b8fff) line, dark panel styling matching FillerBreakdown — 5 component tests, all passing
- Review.tsx wired with WPMChart after FillerBreakdown, before AnnotatedPlayer, passing session.wpmWindows
- Full vitest suite remains green (65 pass, 9 skipped, 0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD computeWPMChartData + recharts install** - `70e8982` (feat)
2. **Task 2: TDD WPMChart component + Review.tsx integration** - `0e94cf0` (feat)

_Note: TDD tasks — test file written first (RED), then implementation (GREEN), combined into single commit per task_

## Files Created/Modified

- `src/analysis/wpmChart.ts` — WPMChartPoint interface, msToLabel helper, computeWPMChartData function
- `src/analysis/wpmChart.test.ts` — 7 unit tests covering empty input, 0:00/0:30/1:00/1:30/60:00 labels, multi-window output
- `src/components/WPMChart/WPMChart.tsx` — recharts LineChart panel, empty state, dark panel styling
- `src/components/WPMChart/WPMChart.test.tsx` — 5 component tests with recharts ResponsiveContainer mock
- `src/pages/Review.tsx` — Added WPMChart import and panel after FillerBreakdown
- `package.json` / `package-lock.json` — recharts added to dependencies

## Decisions Made

- Tooltip formatter inferred type instead of explicit `number` — recharts ValueType is `number | string | undefined`, explicit annotation causes TS2322
- vi.mock at top level of test file (not inside describe/beforeEach) — required by Vitest hoisting for module mocks
- Empty state condition: `!wpmWindows || chartData.length === 0` — both guards needed: undefined covers pre-Phase-8 sessions, length===0 covers recorded-but-no-transcript edge case

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Tooltip formatter TypeScript type annotation**
- **Found during:** Task 2 (WPMChart component — build verification)
- **Issue:** `formatter={(value: number) => ...}` caused TS2322 because recharts ValueType is `number | string | undefined`, not `number`
- **Fix:** Removed explicit type annotation, let TypeScript infer from recharts generic
- **Files modified:** src/components/WPMChart/WPMChart.tsx
- **Verification:** `npm run build` no longer reports WPMChart.tsx error
- **Committed in:** `0e94cf0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type annotation bug)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

### Deferred Items (Pre-existing Build Errors)

Three pre-existing TypeScript errors exist in files not modified by this plan:
- `src/analysis/fillerDetector.ts` — unused `text` parameter
- `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` — `.at()` requires ES2022 lib
- `src/components/StorageQuotaBar/StorageQuotaBar.test.tsx` — unused `beforeEach` import

Logged to `.planning/phases/12-wpm-chart-panel/deferred-items.md`.

## Issues Encountered

None beyond the Tooltip type annotation (handled as deviation above).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- WPM chart panel is complete and visible on the Review page
- Phase 13 (Whisper integration) can further enhance the chart via transcript-based WPM improvements
- computeWPMChartData is pure and independently testable, ready for future extension

---
*Phase: 12-wpm-chart-panel*
*Completed: 2026-03-17*
