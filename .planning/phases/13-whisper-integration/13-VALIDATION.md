---
phase: 13
slug: whisper-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vite.config.ts` (test block with `environment: 'jsdom'`, `pool: 'vmThreads'`) |
| **Quick run command** | `npx vitest run --reporter=verbose src/analysis/whisperFillerCounter.test.ts src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose src/analysis/whisperFillerCounter.test.ts src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 0 | WHIS-01 | unit | `npx vitest run src/analysis/whisperFillerCounter.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 0 | WHIS-03, WHIS-04 | unit | `npx vitest run src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 0 | WHIS-05 | unit | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ✅ partial | ⬜ pending |
| 13-01-04 | 01 | 1 | WHIS-01 | unit | `npx vitest run src/analysis/whisperFillerCounter.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | WHIS-03, WHIS-04 | unit | `npx vitest run src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | WHIS-02 | manual | Code review — no Whisper imports in App.tsx or recording path | manual-only | ⬜ pending |
| 13-01-07 | 01 | 2 | WHIS-05 | unit | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ✅ partial | ⬜ pending |
| 13-01-08 | 01 | 2 | WHIS-01, WHIS-03, WHIS-04, WHIS-05 | full | `npx vitest run` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/analysis/whisperFillerCounter.ts` — pure `countFillersFromTranscript` function extracted from worker for testability (WHIS-01)
- [ ] `src/analysis/whisperFillerCounter.test.ts` — unit tests: `countFillersFromTranscript('umm yeah like I think')` returns `{ um: 1, like: 1 }`; handles empty string; handles no fillers (WHIS-01)
- [ ] `src/components/WhisperStatusBanner/WhisperStatusBanner.tsx` — stub component with pending/complete/failed/downloading states (WHIS-03, WHIS-04)
- [ ] `src/components/WhisperStatusBanner/WhisperStatusBanner.test.tsx` — tests: renders "Analyzing speech..." when pending; renders null when complete; renders "Downloading speech model (first time only)..." when downloading (WHIS-03, WHIS-04)
- [ ] `src/components/FillerBreakdown/FillerBreakdown.test.tsx` — add test case: `whisperFillers` undefined → shows Web Speech event counts; `whisperStatus === 'failed'` → shows Web Speech fallback (WHIS-05)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Web Speech captions during recording unaffected | WHIS-02 | No Whisper code runs during recording — verified by inspecting App.tsx for absence of Whisper imports and confirmed no behavioural regression | 1. Start a recording session. 2. Verify live captions appear as before. 3. Confirm no Whisper-related imports exist in App.tsx or useRecording hook. |
| `window.crossOriginIsolated === true` in production | WHIS-01 (blocker) | Cannot be automated in jsdom; requires actual browser environment with production headers | 1. Deploy build to production hosting. 2. Open browser DevTools console. 3. Run `console.log(window.crossOriginIsolated)` — must return `true`. |
| Whisper runs and produces non-zero filler counts on real session | WHIS-01 | Requires real recorded audio; cannot be simulated in unit tests | 1. Record a 2-minute session with deliberate filler words (um, uh, like). 2. Open Review page. 3. Wait for WhisperStatusBanner to show "complete". 4. Verify FillerBreakdown shows non-zero Whisper-derived counts. |
| Model download banner shows during first-time download | WHIS-04 | Requires network and real model; cannot be mocked realistically | 1. Clear browser cache (Application > Cache Storage). 2. Open Review page for a session. 3. Verify "Downloading speech model (first time only)..." appears in the banner. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
