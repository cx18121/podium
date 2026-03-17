---
phase: 11
slug: filler-breakdown-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run src/analysis/fillerBreakdown.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/analysis/fillerBreakdown.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | ANAL-04 | unit | `npx vitest run src/analysis/fillerBreakdown.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | ANAL-04 | unit | `npx vitest run src/analysis/fillerBreakdown.test.ts` | ✅ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | ANAL-05 | unit + integration | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | ANAL-04, ANAL-05 | integration | `npx vitest run` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/analysis/fillerBreakdown.test.ts` — stubs for ANAL-04 (computeFillerBreakdown pure function)
- [ ] `src/components/FillerBreakdown/FillerBreakdown.test.tsx` — stubs for ANAL-05 (component rendering + Whisper upgrade prop)

*Existing vitest infrastructure covers all phase requirements; no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FillerBreakdown panel visible in Review page with real session data | ANAL-05 | Requires recorded session in browser | Record a session with filler words; open Review page; verify panel shows per-type counts and peak third |
| Empty state renders when session has zero filler events | ANAL-05 | Requires zero-filler session in browser | Record a session with no filler words; open Review page; verify graceful empty state shows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
