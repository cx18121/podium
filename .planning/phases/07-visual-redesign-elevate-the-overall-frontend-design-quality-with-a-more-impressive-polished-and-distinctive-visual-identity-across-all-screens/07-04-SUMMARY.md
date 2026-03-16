---
phase: 07-visual-redesign
plan: 04
subsystem: scorecard-ui
tags: [svg-ring, animation, tailwind, react]
dependency_graph:
  requires: [07-01]
  provides: [redesigned-scorecard-with-svg-ring-and-animated-bars]
  affects: [src/components/ScorecardView/ScorecardView.tsx]
tech_stack:
  added: []
  patterns: [svg-stroke-dashoffset-ring, raf-animation-flag, vi-stub-global-raf-jsdom]
key_files:
  created: []
  modified:
    - src/components/ScorecardView/ScorecardView.tsx
    - src/components/ScorecardView/ScorecardView.test.tsx
decisions:
  - "[07-04] SVG ring uses strokeDasharray + strokeDashoffset on a 54px-radius circle (CIRC≈339.3) to fill score arc — clean, no canvas dependency"
  - "[07-04] Animation via useState(false) + requestAnimationFrame: defers setAnimated(true) until next frame so CSS transition fires on mount"
  - "[07-04] Tests stub requestAnimationFrame with vi.stubGlobal to fire synchronously — lets toHaveStyle width assertions work in jsdom without async act()"
metrics:
  duration: 15min
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_modified: 2
---

# Phase 7 Plan 04: ScorecardView SVG Ring and Animated Bars Summary

**One-liner:** SVG score ring (120px, 6px indigo stroke, drop-shadow glow) plus RAF-animated dimension bars replacing plain numeric output and static bars.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add SVG score ring and update card surface | 070d2b5 | ScorecardView.tsx |
| 2 | Animate dimension bars and update bar track typography | a15236a | ScorecardView.test.tsx |

## What Was Built

### SVG Score Ring (Task 1)
- Replaced plain `<output>` number with a 120px SVG ring
- Track ring: `r=54`, `stroke="#1a2235"`, `strokeWidth="6"`
- Score arc: `stroke="#6366f1"` (indigo), `strokeDasharray={CIRC}`, offset computed as `CIRC - (score/100) * CIRC`
- Arc starts at 12 o'clock via `transform: rotate(-90deg)` with `transformOrigin: '60px 60px'`
- Drop-shadow glow: `filter: drop-shadow(0 0 8px rgba(99,102,241,0.4))`
- Score number: `text-5xl font-semibold tabular-nums text-[#f1f5f9]` inside the ring
- Card surface: `bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl`
- Loading state: same surface treatment

### Animated Dimension Bars (Task 2)
- `const [animated, setAnimated] = useState(false)` + `requestAnimationFrame(() => setAnimated(true))`
- Bar track: `h-1` (4px), `bg-[#1a2235]`, `rounded-full`
- Bar fill width: `animated ? \`${dim.score}%\` : '0%'` with `motion-safe:transition-all motion-safe:duration-300`
- Dimension labels: `text-[13px] text-[#94a3b8] tracking-wide`
- Detail text: `text-[13px] text-[#94a3b8]`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] requestAnimationFrame doesn't fire in jsdom — test width assertion failed**
- **Found during:** Task 2 verification
- **Issue:** The existing test `each score bar fill div has style.width matching the dimension score%` expected `width: 82%` immediately after render. The new animated bars start at `width: 0%` until RAF fires, which doesn't happen synchronously in jsdom.
- **Fix:** Added `beforeEach`/`afterEach` in test with `vi.stubGlobal('requestAnimationFrame', cb => { cb(0); return 0; })` — RAF now fires synchronously in test environment, allowing the component to set `animated=true` during render and the bar widths to reach their target values.
- **Files modified:** `src/components/ScorecardView/ScorecardView.test.tsx`
- **Commit:** a15236a

## Self-Check: PASSED

- FOUND: src/components/ScorecardView/ScorecardView.tsx
- FOUND: src/components/ScorecardView/ScorecardView.test.tsx
- FOUND commit: 070d2b5 (Task 1 — SVG ring + card surface)
- FOUND commit: a15236a (Task 2 — animated bars + test fix)
- All 361 tests pass (npm test -- --run exits 0)
