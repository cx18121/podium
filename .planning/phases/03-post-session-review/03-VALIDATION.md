---
phase: 3
slug: post-session-review
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SCORE-01 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | SCORE-02 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | SCORE-03 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | SCORE-01 | manual | N/A | N/A | ⬜ pending |
| 03-02-02 | 02 | 2 | SCORE-02 | manual | N/A | N/A | ⬜ pending |
| 03-03-01 | 03 | 2 | PLAY-01 | manual | N/A | N/A | ⬜ pending |
| 03-03-02 | 03 | 2 | PLAY-02 | manual | N/A | N/A | ⬜ pending |
| 03-03-03 | 03 | 2 | PLAY-03 | manual | N/A | N/A | ⬜ pending |
| 03-03-04 | 03 | 2 | PLAY-04 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/analysis/__tests__/aggregateScores.test.ts` — stubs for SCORE-01, SCORE-02, SCORE-03

*Existing vitest infrastructure covers framework; only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scorecard visible after stopping session | SCORE-01 | UI rendering | Stop a session; verify scorecard appears with 5 dimension scores + overall |
| Overall score matches formula | SCORE-02 | Visual + formula check | Compare displayed score to manual calculation from event log |
| Scorecard persists on re-open | SCORE-03 | Browser state | Close tab, reopen session from history, verify same scores shown |
| Video playback (no freeze, finite duration) | PLAY-01 | Browser media API | Open review; press play; scrub to middle; verify no freeze |
| Timeline markers visible | PLAY-02 | Visual | Open review with events; verify dots appear at correct proportional positions |
| Clicking marker seeks video | PLAY-03 | Browser interaction | Click a timeline marker; verify video.currentTime matches event timestamp |
| Hover tooltip shows event description | PLAY-04 | Browser interaction | Hover over marker; verify tooltip shows event type and value |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
