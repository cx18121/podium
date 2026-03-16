---
phase: 8
slug: schema-migration-wpm-windows
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | vite.config.ts (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| **Quick run command** | `npx vitest run src/analysis/pacing.test.ts src/db/db.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/analysis/pacing.test.ts src/db/db.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | FOUND-01 | unit (db) | `npx vitest run src/db/db.test.ts` | ✅ exists | ⬜ pending |
| 8-01-02 | 01 | 1 | FOUND-01 | unit (db) | `npx vitest run src/db/db.test.ts` | ✅ exists | ⬜ pending |
| 8-02-01 | 02 | 1 | FOUND-02 | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists | ⬜ pending |
| 8-02-02 | 02 | 2 | FOUND-02 | unit (db) | `npx vitest run src/db/db.test.ts` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New test cases are added to existing files (`pacing.test.ts`, `db.test.ts`), not new files.

*No new test files required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No VersionError on app load after migration | FOUND-01 | Requires real browser + existing IndexedDB state | Open app in Chrome with a v1/v2 DB, check console for VersionError |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
