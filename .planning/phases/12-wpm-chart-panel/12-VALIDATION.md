---
phase: 12
slug: wpm-chart-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vite.config.ts` (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| **Quick run command** | `npx vitest run src/analysis/wpmChart.test.ts src/components/WPMChart/WPMChart.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/analysis/wpmChart.test.ts src/components/WPMChart/WPMChart.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | ANAL-06 | unit | `npx vitest run src/analysis/wpmChart.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 0 | ANAL-06 | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | ANAL-06 | unit | `npx vitest run src/analysis/wpmChart.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | ANAL-06 | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 1 | ANAL-06 | unit (component) | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/analysis/wpmChart.ts` — stubs for `computeWPMChartData` + `WPMChartPoint` interface
- [ ] `src/analysis/wpmChart.test.ts` — unit test stubs for ANAL-06
- [ ] `src/components/WPMChart/WPMChart.tsx` — component stub with empty state
- [ ] `src/components/WPMChart/WPMChart.test.tsx` — component test stubs with `vi.mock('recharts', ...)` at top level
- [ ] `npm install recharts` — recharts not yet in package.json

*recharts is not installed — Wave 0 must install it before any tests can import recharts.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart renders at correct responsive width in browser | ANAL-06 | jsdom has no layout engine — ResponsiveContainer mocked in tests | Open review page in browser, resize window, verify chart fills panel width |
| Tooltip appears on hover with correct WPM value | ANAL-06 | Pointer events not reliably testable in jsdom | Hover over a data point in the browser, verify tooltip shows "N wpm" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
