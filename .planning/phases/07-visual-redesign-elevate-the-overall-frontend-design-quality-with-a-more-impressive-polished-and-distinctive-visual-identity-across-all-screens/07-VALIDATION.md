---
phase: 7
slug: visual-redesign-elevate-the-overall-frontend-design-quality-with-a-more-impressive-polished-and-distinctive-visual-identity-across-all-screens
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.ts` (vitest inline config) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | CSS Foundation | smoke | `npm test -- --run` | ✅ | ⬜ pending |
| 7-02-01 | 02 | 1 | Home/Setup screens | smoke | `npm test -- --run` | ✅ | ⬜ pending |
| 7-03-01 | 03 | 1 | RecordingScreen | smoke | `npm test -- --run` | ✅ | ⬜ pending |
| 7-04-01 | 04 | 2 | ScorecardView SVG ring | smoke | `npm test -- --run` | ✅ | ⬜ pending |
| 7-05-01 | 05 | 2 | AnnotatedPlayer/Timeline | smoke | `npm test -- --run` | ✅ | ⬜ pending |
| 7-06-01 | 06 | 2 | HistoryView + components | smoke | `npm test -- --run` | ✅ | ⬜ pending |
| 7-07-01 | 07 | 2 | Modals | smoke | `npm test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 7 is a pure visual uplift — no new logic, no new routes, no new dependencies. Existing vitest smoke tests will catch regressions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual polish (colors, spacing, typography) | UI-SPEC.md | CSS appearance cannot be automatically verified | Open app in browser, compare each screen against UI-SPEC.md per-screen contracts |
| SVG score ring renders correctly | UI-SPEC.md § ScorecardView | SVG rendering requires visual inspection | Navigate to a completed session scorecard, verify ring displays with correct color and filled arc |
| Animated score bars | UI-SPEC.md § ScorecardView | CSS transitions require visual inspection | Navigate to scorecard, verify bars animate in on load |
| Inter font loads | UI-SPEC.md § Typography | Font rendering requires visual inspection | Open DevTools Network tab, confirm Inter font files loaded from Google Fonts CDN |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
