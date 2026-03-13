---
phase: 2
slug: analysis-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already installed; `vitest` script in package.json) |
| **Config file** | `vite.config.ts` (test block) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | VIS-01 | unit (Worker mock) | `npx vitest run src/workers/mediapipe.worker.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | VIS-05 | manual browser test | n/a — timing test in real browser | manual-only | ⬜ pending |
| 2-01-03 | 01 | 1 | VIS-01 | unit (Worker mock) | `npx vitest run src/workers/mediapipe.worker.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | VIS-02 | unit (pure fn) | `npx vitest run src/analysis/eyeContact.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | VIS-03 | unit (pure fn) | `npx vitest run src/analysis/expressiveness.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 2 | VIS-04 | unit (pure fn) | `npx vitest run src/analysis/gestures.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | AUD-01 | unit (mock SpeechRecognition) | `npx vitest run src/hooks/useSpeechCapture.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | AUD-02 | unit (pure fn) | `npx vitest run src/analysis/fillerDetector.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 2 | AUD-03, AUD-04 | unit (pure fn) | `npx vitest run src/analysis/pacing.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-04 | 03 | 2 | memory leak | manual browser test | n/a — DevTools memory profiler | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/analysis/eyeContact.test.ts` — stubs for VIS-02 (pure function tests with fixture landmark arrays)
- [ ] `src/analysis/expressiveness.test.ts` — stubs for VIS-03 (flat vs animated blendshape fixtures)
- [ ] `src/analysis/gestures.test.ts` — stubs for VIS-04 (face-touch and sway with fixture landmark arrays)
- [ ] `src/analysis/fillerDetector.test.ts` — stubs for AUD-02 (filler regex tests)
- [ ] `src/analysis/pacing.test.ts` — stubs for AUD-03 and AUD-04 (WPM and pause detection)
- [ ] `src/hooks/useSpeechCapture.test.ts` — stubs for AUD-01 (mock SpeechRecognition + auto-restart)
- [ ] `src/workers/mediapipe.worker.test.ts` — stubs for VIS-01 (worker message protocol with mocked MediaPipe)

No new framework installation needed — Vitest and all test utilities are already installed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frame pump fires at ~6-7fps; main thread timer + stop button remain responsive | VIS-05 | Timing and responsiveness require real browser; impossible to unit test | Record 30s session; open Chrome DevTools Performance tab; verify main thread shows no long tasks >16ms during recording |
| WASM heap returns to baseline after 3 session start/stop cycles | memory leak | Requires Chrome DevTools memory profiler across multiple browser sessions | Open DevTools Memory tab; start/stop recording 3 times; take heap snapshots before/after; verify heap returns within 10% of baseline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
