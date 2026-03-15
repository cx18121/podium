---
phase: quick
plan: 260315-j5e
subsystem: recording-pipeline
tags: [bug-fix, race-condition, git]
dependency_graph:
  requires: [02-03]
  provides: [visual-events-in-indexeddb]
  affects: [useRecording.ts, git-remote]
tech_stack:
  added: []
  patterns: [await-before-cleanup]
key_files:
  modified:
    - src/hooks/useRecording.ts
  created: []
decisions:
  - "stopWorker() must always be awaited before stopStream()/cleanupWorker() — worker ref becomes null after cleanup"
metrics:
  duration: ~5min
  completed_date: "2026-03-15"
  tasks_completed: 2
  files_changed: 1
---

# Quick Task 260315-j5e: Fix Missing Events in IndexedDB and Update Git Remote

**One-liner:** Fix race condition where cleanupWorker() nulled workerRef before stopWorker() could flush pendingEvents, causing empty IndexedDB eventLog; update git remote to renamed pitch-practice repo.

## What Was Done

### Task 1: Fix stop-sequence race condition in useRecording.ts

The `recorder.onstop` handler had an incorrect call order:

**Before (broken):**
```
stopTimer();
stopStream();           // called cleanupWorker() — set workerRef.current = null
const visualEvents = await mlWorker.stopWorker();  // workerRef was null → resolved []
```

`stopStream()` calls `mlWorker.cleanupWorker()` which immediately sets `workerRef.current = null`. When `stopWorker()` ran next, it found `workerRef.current === null` and resolved with an empty array. Every session saved with an empty `eventLog`.

**After (fixed):**
```
stopTimer();
const visualEvents = await mlWorker.stopWorker();  // worker alive, flushes pendingEvents
stopStream();           // now safe to cleanup — events already collected
```

The worker is still alive when `stopWorker()` posts the `stop` message and awaits the `events` response. `cleanupWorker()` runs afterward with a 500ms grace period, which is irrelevant since `stopWorker()` has already resolved.

**Commit:** 7251ed9

### Task 2: Update git remote URL to renamed repository

The remote pointed to the old repository name `cognitive-load-mapper`. Updated to `pitch-practice`:

```bash
git remote set-url origin git@github.com:cx18121/pitch-practice.git
```

`git fetch origin` confirmed SSH connectivity succeeds without "Repository not found" error.

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Check

- `src/hooks/useRecording.ts`: `await mlWorker.stopWorker()` appears on line 111, `stopStream()` on line 114 — correct order confirmed.
- `npx tsc --noEmit`: zero errors.
- Git remote: `git@github.com:cx18121/pitch-practice.git` for both fetch and push.
- `git fetch origin`: succeeded without error.

## Self-Check: PASSED

- src/hooks/useRecording.ts: FOUND
- Commit 7251ed9: FOUND
