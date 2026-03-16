---
phase: 06-interactive-ux-improvements
plan: "03"
subsystem: ui
tags: [react, dexie, indexeddb, captions, speech, transcript]

# Dependency graph
requires:
  - phase: 06-01
    provides: Timeline tooltip component (AnnotatedPlayer sibling)
  - phase: 06-02
    provides: Expanded filler word detection with context-aware logic
  - phase: 02-analysis-pipeline
    provides: SpeechCapture hook with TranscriptSegment interface
  - phase: 03-post-session-review
    provides: AnnotatedPlayer component and Review page

provides:
  - Session.transcript?: TranscriptSegment[] field persisted to IndexedDB via Dexie v2 schema
  - CC toggle button below Timeline in AnnotatedPlayer
  - Live caption bar synced to video currentTimeMs via getCurrentCaption()
  - Graceful backward-compat for old sessions with undefined transcript
affects:
  - 07-visual-redesign (caption bar visual design)
  - future phases reading transcript from Session

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dexie multi-version schema: keep version(1) block alongside version(2), only increment version string when schema changes; never index arrays or binary blobs"
    - "getCurrentCaption pure function: filter isFinal segments with timestampMs <= currentTimeMs, take last with .at(-1)"
    - "Optional prop graceful degradation: transcript undefined shows fallback message, empty array renders blank with min-h holding layout"

key-files:
  created: []
  modified:
    - src/db/db.ts
    - src/db/db.test.ts
    - src/App.tsx
    - src/components/AnnotatedPlayer/AnnotatedPlayer.tsx
    - src/pages/Review.tsx

key-decisions:
  - "Dexie v2 stores() string identical to v1 — transcript is unindexed data, not an index column; adding a new version block is still required for Dexie's upgrade machinery"
  - "getCurrentCaption defined at module level (not inside component) for testability; accepts segments + currentTimeMs, returns last isFinal segment at or before current time"
  - "showCaptions defaults to false — CC button must be explicitly clicked; caption bar hidden by default to avoid layout shift on sessions without transcript"
  - "min-h-[2.5rem] on caption bar prevents collapse when caption text is empty (before first segment or between segments)"

patterns-established:
  - "Caption sync pattern: filter isFinal segments by timestampMs <= currentTimeMs, use .at(-1) for last match"
  - "aria-live='polite' + aria-atomic='true' for live caption region accessibility"
  - "aria-pressed on toggle button communicates CC on/off state to assistive tech"

requirements-completed: [REC-05]

# Metrics
duration: 12min
completed: 2026-03-16
---

# Phase 6 Plan 03: Live Caption Display Summary

**Dexie v2 schema persists TranscriptSegment[] to IndexedDB and AnnotatedPlayer renders a CC-toggled caption bar synced to video playback time**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-16T00:39:00Z
- **Completed:** 2026-03-16T00:44:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Dexie schema migrated to v2 with `transcript?: TranscriptSegment[]` on the Session interface — old sessions open without error (undefined)
- `App.tsx` now persists transcript segments from SpeechCapture alongside eventLog on every session save
- AnnotatedPlayer renders a CC button below the Timeline; clicking toggles a caption bar with `aria-live="polite"` and `min-h-[2.5rem]` to hold layout
- `getCurrentCaption()` pure function returns the last `isFinal` segment whose `timestampMs <= currentTimeMs`, syncing captions to playback position

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration (db.ts + db.test.ts) and storage wiring (App.tsx)** - `7979c19` (feat)
2. **Task 2: Caption bar in AnnotatedPlayer.tsx and prop wire in Review.tsx** - `a89b10f` (feat)

## Files Created/Modified
- `src/db/db.ts` - Added TranscriptSegment import, transcript optional field on Session, Dexie version(2) block
- `src/db/db.test.ts` - Added two TDD tests: transcript round-trip and backward compatibility
- `src/App.tsx` - Added `transcript: segments` to db.sessions.add() call in handleSaveName
- `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` - Added transcript prop, showCaptions state, getCurrentCaption helper, CC button, caption bar
- `src/pages/Review.tsx` - Added `transcript={session.transcript}` to AnnotatedPlayer usage

## Decisions Made
- Dexie v2 stores() string intentionally identical to v1 — `transcript` is unindexed data, so the index string doesn't change, but the version block is required for Dexie's upgrade machinery to run on existing v1 databases
- `getCurrentCaption` is a module-level pure function (not inside the component) for testability — takes `(segments, currentTimeMs)` and returns the last `isFinal` segment at or before current time
- `showCaptions` defaults to `false` — CC button must be explicitly clicked; avoids layout surprise on old sessions that show "No transcript available"

## Deviations from Plan

None - plan executed exactly as written.

The worktree branch was at Phase 1 HEAD (commit dd17973) and needed a fast-forward merge to main before Phase 6 code was available. This is a worktree setup concern, not a plan deviation — no plan content was changed.

## Issues Encountered
- Worktree branch `worktree-agent-a380c850` was 79 commits behind main. Fast-forward merge to main HEAD applied before task execution. No conflicts — the worktree branch was a strict ancestor of main.

## Next Phase Readiness
- Phase 6 complete: tooltips (06-01), filler detection expansion (06-02), live captions (06-03) all done
- Sessions recorded from this point forward include transcript arrays in IndexedDB
- Caption bar ready for Phase 7 visual redesign (background, typography, animation polish)

---
*Phase: 06-interactive-ux-improvements*
*Completed: 2026-03-16*
