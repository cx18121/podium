---
phase: 1
slug: foundation-and-recording
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vite.config.ts` (test block — Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-* | 01 | 1 | REC-01..06, AUD-05 | scaffold/config | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-* | 02 | 2 | Spikes (manual) | manual | N/A — manual spike | N/A | ⬜ pending |
| 1-03-01 | 03 | 3 | REC-01 | unit (mock) | `npx vitest run src/hooks/useRecording.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 3 | REC-02, REC-03 | unit (RTL) | `npx vitest run src/components/RecordingScreen/RecordingScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 3 | REC-04, REC-06 | unit (mock) | `npx vitest run src/hooks/useRecording.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-04 | 03 | 3 | REC-05 | unit (Dexie fake) | `npx vitest run src/db/db.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-05 | 03 | 3 | AUD-05 | unit (RTL) | `npx vitest run src/components/common/SpeechSupportBanner.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/useRecording.test.ts` — stubs for REC-01, REC-03, REC-04, REC-06
- [ ] `src/components/RecordingScreen/RecordingScreen.test.tsx` — stubs for REC-02, REC-03
- [ ] `src/db/db.test.ts` — stubs for REC-05
- [ ] `src/components/common/SpeechSupportBanner.test.tsx` — stubs for AUD-05
- [ ] `src/test-setup.ts` — shared jest-dom setup (`import '@testing-library/jest-dom'`)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] `vite.config.ts` test block with `environment: 'jsdom'`, `globals: true`, `setupFiles`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MediaPipe FaceLandmarker, GestureRecognizer, PoseLandmarker run in classic Web Worker without crashing | VIS-01 precursor (Phase 2 risk) | Requires real browser, camera, GPU — cannot be mocked | Load app in Mac Chrome and Windows Chrome; open DevTools; confirm worker initializes all 3 models without error; record result as spike note |
| Chrome Web Speech API preserves or suppresses "um"/"uh" filler words | AUD-02 precursor (Phase 2 risk) | Requires live microphone + Chrome speech server | Say "um" and "uh" clearly during a test recording; inspect `SpeechRecognitionResultList` transcripts; document exact behavior as locked fact |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
