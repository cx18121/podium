---
phase: 4
slug: session-history
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 + @testing-library/react ^16.3.2 |
| **Config file** | `vite.config.ts` (test block, pool: vmThreads) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | HIST-01, HIST-02, HIST-03 | unit | `npx vitest run src/pages/HistoryView.test.tsx src/components/SparklineChart/SparklineChart.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 04-01-02 | 01 | 1 | HIST-01 | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 04-01-03 | 01 | 1 | HIST-03 | unit | `npx vitest run src/components/SparklineChart/SparklineChart.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 04-01-04 | 01 | 2 | HIST-02 | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/pages/HistoryView.test.tsx` — stubs for HIST-01, HIST-02 (session list, empty state, loading state, scorecard-null, delete flow, click-to-open)
- [ ] `src/components/SparklineChart/SparklineChart.test.tsx` — stubs for HIST-03 (SVG path ≥2 scores, empty message <2 scores, computeTrendDirection)
- [ ] `src/components/DeleteConfirmModal/DeleteConfirmModal.test.tsx` — optional modal isolation unit test

*StorageQuotaBar and SessionListItem are pure presentational — tested via HistoryView integration test.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Storage quota bar displays correct MB values | HIST-01 | `navigator.storage.estimate()` returns device-specific values that can't be reliably mocked | Open history view in browser, check bar shows non-zero usage and total |
| Video does NOT load in history list (no memory spike) | HIST-01 | Memory profiling not automatable with Vitest | Open DevTools Memory tab, load history view with 5+ sessions, confirm JS heap < 50MB increase |
| "Back to History" appears when session opened from history | HIST-02 | Navigation context-dependent rendering | Open a session from history, confirm "Back to History" button is visible; open same session from post-recording, confirm button is absent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
