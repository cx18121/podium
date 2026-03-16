---
phase: 06
slug: interactive-ux-improvements
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `npx vitest run 2>&1 | tail -30` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `npx vitest run 2>&1 | tail -30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | What it tests | Test Type | Automated Command | Status |
|---------|------|------|---------------|-----------|-------------------|--------|
| 06-01-01 | 01 | 1 | Filler regex expansion + "like" context logic | unit | `npx vitest run src/analysis/fillerDetector.test.ts` | ⬜ pending |
| 06-02-01 | 02 | 1 | Timeline tooltip renders on hover | unit | `npx vitest run src/components/AnnotatedPlayer/Timeline.test.tsx` | ⬜ pending |
| 06-03-01 | 03 | 2 | Dexie v2 schema + transcript field | unit | `npx vitest run src/db/` | ⬜ pending |
| 06-03-02 | 03 | 2 | Caption bar renders segments synced to time | unit | `npx vitest run src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is part of Plan 01 (filler detector tests must be extended for new words/logic).
Existing test files cover Timeline and AnnotatedPlayer — stubs will be added inline.

- [ ] `src/analysis/fillerDetector.test.ts` — extended stubs for new filler words + "like" context logic
- [ ] `src/components/AnnotatedPlayer/Timeline.test.tsx` — tooltip visibility stub
- [ ] `src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` — CC toggle + caption display stub

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Tooltip appears above Timeline marker on hover | CSS hover state + absolute positioning can't be triggered in jsdom | Open Review page, hover over any timeline dot — tooltip label should appear above within 150ms |
| Caption bar updates in real-time during playback | Video `timeupdate` events don't fire in jsdom | Play a session, verify caption bar shows transcript text in sync with video |
| CC toggle shows/hides caption bar | CSS visibility change not observable in unit tests | Click CC button, verify bar appears; click again, verify it hides |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
