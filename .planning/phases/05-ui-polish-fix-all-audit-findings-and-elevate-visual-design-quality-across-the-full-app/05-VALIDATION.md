---
phase: 5
slug: ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `vite.config.ts` (vitest configured inline) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | A-01 (missing tests) | unit | `npm test -- --run SessionListItem` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 0 | A-01 (missing tests) | unit | `npm test -- --run StorageQuotaBar` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 0 | A-01 (missing tests) | unit | `npm test -- --run Home` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | A-02 (typography) | visual | `npm test -- --run` | ✅ | ⬜ pending |
| 5-02-02 | 02 | 1 | A-03 (spacing) | visual | `npm test -- --run` | ✅ | ⬜ pending |
| 5-02-03 | 02 | 1 | A-04 (color) | visual | `npm test -- --run` | ✅ | ⬜ pending |
| 5-02-04 | 02 | 1 | A-05 (interactive states) | unit | `npm test -- --run` | ✅ | ⬜ pending |
| 5-03-01 | 03 | 1 | A-06 (timeline marker) | unit | `npm test -- --run` | ✅ | ⬜ pending |
| 5-03-02 | 03 | 1 | A-07 (play/pause overlay) | unit | `npm test -- --run AnnotatedPlayer` | ✅ | ⬜ pending |
| 5-03-03 | 03 | 1 | A-08 (score badge) | unit | `npm test -- --run` | ✅ | ⬜ pending |
| 5-04-01 | 04 | 1 | A-09 (quota bar) | unit | `npm test -- --run StorageQuotaBar` | ❌ W0 | ⬜ pending |
| 5-04-02 | 04 | 1 | A-10 (speech banner) | unit | `npm test -- --run` | ✅ | ⬜ pending |
| 5-04-03 | 04 | 1 | A-11/A-12 (misc) | unit | `npm test -- --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/__tests__/SessionListItem.test.tsx` — stubs for A-01 (session list item rendering)
- [ ] `src/components/__tests__/StorageQuotaBar.test.tsx` — stubs for A-01/A-09 (quota bar rendering and fill color)
- [ ] `src/pages/__tests__/Home.test.tsx` — stubs for A-01 (home page smoke test)

*Note: vitest framework is already installed; only test stubs are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual polish — typography weight/size appearance | A-02, A-03 | Pixel-level visual diff not automatable in vitest | Screenshot before/after; verify font weights look heavier, score numerals are larger |
| Play/pause overlay hover state | A-07 | CSS :hover not reliable in jsdom | Open app, hover over player, verify overlay appears with correct opacity |
| Timeline dot alignment | A-06 | Layout calculation requires real browser | Open session with annotations, verify dot centers on line |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
