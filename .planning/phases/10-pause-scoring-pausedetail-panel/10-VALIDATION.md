---
phase: 10
slug: pause-scoring-pausedetail-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vite.config.ts` (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| **Quick run command** | `npx vitest run src/analysis/pacing.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/analysis/pacing.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | ANAL-03 | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists, new describe block | ⬜ pending |
| 10-01-02 | 01 | 0 | ANAL-02 | unit (component) | `npx vitest run src/components/PauseDetail/PauseDetail.test.tsx` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | ANAL-03 | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ | ⬜ pending |
| 10-01-04 | 01 | 1 | ANAL-03 | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ | ⬜ pending |
| 10-01-05 | 01 | 2 | ANAL-02 | unit (component) | `npx vitest run src/components/PauseDetail/PauseDetail.test.tsx` | ❌ W0 | ⬜ pending |
| 10-01-06 | 01 | 2 | ANAL-02 | unit (component) | `npx vitest run src/components/PauseDetail/PauseDetail.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/PauseDetail/PauseDetail.test.tsx` — stubs for ANAL-02 (zero-pause empty state, stat rendering)
- [ ] `src/components/PauseDetail/PauseDetail.tsx` — component stub (can be created alongside test in Wave 0)
- [ ] `src/analysis/pacing.test.ts` — new `describe('scorePauses')` block with failing tests for ANAL-03

*Existing Vitest + jsdom + vmThreads infrastructure covers all phase requirements — no new framework config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PauseDetail panel visually appears between ScorecardView and AnnotatedPlayer | ANAL-02 | Layout position requires visual inspection | Load a session with ≥1 pause event in Review page; confirm PauseDetail renders between ScorecardView and AnnotatedPlayer |
| Pacing scorecard dimension reflects blended WPM + pause quality | ANAL-03 | Integration of scorer blend requires real session data | Record a session with deliberate sentence-boundary pauses vs. one with mid-clause hesitations; confirm pacing scores differ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
