---
phase: 3
slug: post-session-review
status: draft
nyquist_compliant: true
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
| 03-01-T1 | 01 | 1 | SCORE-01 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts 2>&1 \| head -20` | ❌ W0 | ⬜ pending |
| 03-01-T2 | 01 | 1 | SCORE-02 | unit | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts --reporter=verbose` | ❌ W0 | ⬜ pending |
| 03-02-T1 | 02 | 2 | SCORE-01 | unit | `npx vitest run src/components/ScorecardView/ScorecardView.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 03-03-T1 | 03 | 3 | PLAY-01..04 | unit | `npx vitest run src/components/AnnotatedPlayer/ --reporter=verbose` | ❌ W0 | ⬜ pending |
| 03-03-T2 | 03 | 3 | SCORE-03 | unit | `npx vitest run --reporter=verbose && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 03-03-T3 | 03 | 3 | SCORE-03 | unit | `npx vitest run src/pages/Review.test.tsx --reporter=verbose` | ❌ W0 | ⬜ pending |
| 03-03-T4 | 03 | 3 | PLAY-01..04 + SCORE-03 | human | N/A — browser verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/analysis/__tests__/aggregateScores.test.ts` — stubs for SCORE-01, SCORE-02 (03-01-T1)
- [ ] `src/components/ScorecardView/ScorecardView.test.tsx` — stubs for SCORE-01 rendering (03-02-T1)
- [ ] `src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` — stubs for PLAY-01 (03-03-T1)
- [ ] `src/components/AnnotatedPlayer/Timeline.test.tsx` — stubs for PLAY-02..04 (03-03-T1)
- [ ] `src/pages/Review.test.tsx` — SCORE-03 persistence test using fake-indexeddb (03-03-T3)

*Existing vitest infrastructure covers framework; only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scorecard visible after stopping session | SCORE-01 | UI rendering | Stop a session; verify scorecard appears with 5 dimension scores + overall |
| Overall score matches formula | SCORE-02 | Visual + formula check | Compare displayed score to manual calculation from event log |
| Video playback (no freeze, finite duration) | PLAY-01 | Browser media API | Open review; press play; scrub to middle; verify no freeze |
| Timeline markers visible | PLAY-02 | Visual | Open review with events; verify dots appear at correct proportional positions |
| Nearest marker highlights during playback | PLAY-02 | Visual | Play video; verify the nearest marker dot shows ring highlight |
| Clicking marker seeks video | PLAY-03 | Browser interaction | Click a timeline marker; verify video.currentTime matches event timestamp |
| Hover tooltip shows event description | PLAY-04 | Browser interaction | Hover over marker; verify tooltip shows event type and value |

*Note: SCORE-03 persistence (scorecard written to Dexie on first view) is covered by the automated Review.test.tsx test (03-03-T3). The human checkpoint confirms visual consistency only.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (including Review.test.tsx for SCORE-03)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
