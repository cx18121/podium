---
phase: 9
slug: opening-closing-strength
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vite.config.ts` (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| **Quick run command** | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/analysis/__tests__/aggregateScores.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | ANAL-01 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ✅ | ⬜ pending |
| 9-01-02 | 01 | 1 | ANAL-01 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ✅ | ⬜ pending |
| 9-01-03 | 01 | 1 | ANAL-01 | unit (component) | `npx vitest run src/components/ScorecardView/ScorecardView.test.tsx` | ✅ | ⬜ pending |
| 9-01-04 | 01 | 2 | ANAL-01 | unit | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All new test cases go in existing files. No new test files, no new fixtures, no new config needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Opening / Closing" row renders correctly in the UI after a real session | ANAL-01 | Visual verification of dimension row display in browser | Record a 90s+ session, open Review page, verify "Opening / Closing" row appears with score and detail text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
