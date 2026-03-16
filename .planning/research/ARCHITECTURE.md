# Architecture Research

**Domain:** Browser-based ML analysis / presentation coaching tool — v2.0 deeper analytics
**Researched:** 2026-03-16
**Confidence:** HIGH (existing code is the source of truth; v2 integrations derive from verified patterns)

---

## Context: What Already Exists

This is a subsequent-milestone architecture document. The v1.0 system is built and working. Confidence is HIGH because the integration analysis is based on reading actual source files, not hypotheticals.

**Existing architecture in one sentence:** App.tsx is the single stateful orchestrator; all screens are stateless and prop-driven; analysis runs post-session via pure functions over an in-memory eventLog before Dexie write.

**Existing data flow (recording → review):**

```
handleStart()
  SpeechCapture.start()  +  useRecording.startSession()
       ↓                          ↓
  Web Speech API            MediaRecorder + ML Worker (frame pump)
       ↓                          ↓
  TranscriptSegment[]       visualEvents: SessionEvent[]
                  ↘          ↙
              handleSaveName(title)
                    ↓
            detectFillers(segments) + detectPauses(segments) + calculateWPM(segments)
                    ↓
            eventLog = [...visualEvents, ...speechEvents].sort()
                    ↓
            db.sessions.add({ eventLog, transcript: segments, ... })
                    ↓
            setView('review')  →  ReviewPage.aggregateScores(eventLog, durationMs)
```

---

## System Overview: v2.0 Addition Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UI Layer (Main Thread)                          │
├────────────────────┬──────────────────────────────┬─────────────────────┤
│   ReviewPage       │   ScorecardView               │   AnnotatedPlayer   │
│  [MODIFIED]        │  [MODIFIED: +openingClosing    │  [unchanged shell]  │
│  + whisper state   │   dimension row]               │                     │
│  + loading banner  │                               │                     │
├────────────────────┴──────────────────────────────┴─────────────────────┤
│          New Detail Panels (added to ReviewPage layout)                 │
│  FillerBreakdown  │  PauseDetail  │  WPMChart  │  OpeningClosingDetail  │
│  [NEW component]  │ [NEW comp]    │ [NEW comp] │  [NEW component]       │
└──────────┬────────┴──────┬────────┴─────┬──────┴────────┬──────────────┘
           │               │              │               │
┌──────────┴───────────────┴──────────────┴───────────────┴──────────────┐
│                        Analysis Layer                                   │
│  scorer.ts           │  pacing.ts           │  NEW: openingClosing.ts  │
│  [MODIFIED:          │  [MODIFIED:          │  scores first+last 30s   │
│   +openingClosing    │   +wpm_window events │  from existing events    │
│   dimension,         │   during recording]  │                          │
│   +pauseScore sub-   │                      │                          │
│   dimension,         │                      │                          │
│   Whisper overrides  │                      │                          │
│   filler count]      │                      │                          │
└──────────────────────┴──────────────────────┴──────────────────────────┘
           │
┌──────────┴──────────────────────────────────────────────────────────────┐
│                     Post-Session Analysis                               │
│  useWhisperAnalysis hook                                                │
│  [NEW: Web Worker, runs after db.sessions.add()]                       │
│  Whisper.wasm → filler events → augments stored session in Dexie       │
└─────────────────────────────────────────────────────────────────────────┘
           │
┌──────────┴──────────────────────────────────────────────────────────────┐
│                        Persistence Layer                                │
│                         Dexie v3 schema                                 │
│  sessions: { ...v2, whisperFillers?, wpmWindows?, whisperStatus? }     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feature-by-Feature Integration Analysis

### Feature 1: Whisper.wasm Post-Session Filler Analysis

**The core question: does Whisper output replace or augment the existing eventLog?**

It augments, not replaces. Here is why:

1. The existing `filler_word` events in eventLog carry `timestampMs` derived from `SpeechCapture` — they are positioned on the session timeline. These are needed for the annotated timeline in `AnnotatedPlayer`.
2. Whisper.wasm transcribes the audio blob; it returns word-level timestamps relative to the audio start, not the session wall-clock. Mapping Whisper timestamps back to session-relative milliseconds requires the session start offset, which is stored.
3. Whisper's value is *count accuracy*, not timeline position. Web Speech under-counts fillers (confirmed empirically, STATE.md). Whisper gives the true count. The *score* should use the Whisper count; the *timeline markers* can remain from Web Speech.
4. Replacing eventLog filler events would require a Dexie update that mutates the eventLog array — a write to a non-indexed field of an existing row. This is possible with `db.sessions.update(id, { eventLog: newLog })` but creates complexity around idempotency.

**Recommended data flow for Whisper:**

```
db.sessions.add() completes → sessionId known
    ↓
useWhisperAnalysis(sessionId) called in App.tsx (or ReviewPage)
    ↓
Load session.videoBlob from Dexie
    ↓
Extract audio track from videoBlob (Web Audio API: AudioContext.decodeAudioData)
    ↓
Send audio ArrayBuffer to whisper.worker.ts via postMessage (Transferable)
    ↓
Whisper.wasm runs in worker, returns: { fillerCount, fillersByType, transcript }
    ↓
Worker posts result back to main thread
    ↓
db.sessions.update(sessionId, {
  whisperFillers: { total, byType: { um: N, uh: N, like: N, ... } },
  whisperStatus: 'done'
})
    ↓
ReviewPage reads whisperFillers from session
    ↓
aggregateScores() receives override: whisperFillerCount (if available)
scorer.ts uses whisperFillerCount for filler score instead of eventLog count
```

**What goes into Dexie (new fields on Session):**

```typescript
whisperFillers?: {
  total: number;
  byType: Record<string, number>;  // { um: 3, uh: 1, like: 7, ... }
}
whisperStatus?: 'pending' | 'running' | 'done' | 'failed';
```

The `whisperStatus` field lets ReviewPage show a "Analyzing audio..." banner while Whisper runs, and switch the filler score display when it completes.

**Does Whisper output go into eventLog?** No. Whisper produces accurate *counts* but its timestamps are audio-relative and imprecise enough that inserting new filler events into the timeline would add noisy markers. Keep the Web Speech filler events in eventLog for timeline display; use `whisperFillers.byType` exclusively for the score and the filler breakdown UI.

**What about the transcript field?** Keep the existing `transcript: TranscriptSegment[]` from Web Speech for live captions (AnnotatedPlayer already uses it). Optionally add `whisperTranscript?: string` as a raw text field if Whisper's verbatim text is needed later. Not required for v2.0.

---

### Feature 2: Pause Analytics

**What already exists:**
- `detectPauses()` in `pacing.ts` already produces `pause_detected` events with duration in the `label` field (e.g., `"3.2s pause"`)
- These events are already in `eventLog` — no recording-side changes needed
- `scorePacing()` in `scorer.ts` currently ignores pause events entirely

**Integration point — scorer.ts:**

`scorePacing()` needs to become a composite scorer. Current signature: `scorePacing(events)`. New behavior: reads both `wpm_snapshot` events (existing) and `pause_detected` events (existing) and computes a combined Pacing score with a pause sub-dimension.

Two options:
1. Add pause penalty inside `scorePacing()` — simple, no interface change to `ScorecardResult`
2. Add a `pauseDetail` sub-object to `DimensionScore` — richer but requires changing `ScorecardView`

**Recommended:** Option 1 for scoring, but add `pauseBreakdown` to the returned `DimensionScore.detail` area. Expose pause count and avg duration as a separate computed object passed to the new `PauseDetail` panel. This way `ScorecardResult` doesn't need a structural change.

**What needs to be built:**
- Modify `scorePacing()` to apply pause penalty (pause count × penalty per pause, scaled by duration)
- New `PauseDetail` component: shows count, avg duration, longest pause — reads `pause_detected` events directly from `session.eventLog`
- No Dexie schema change needed

---

### Feature 3: Filler Breakdown

**What already exists:**
- `filler_word` events already have `.label` field containing the specific word (`'um'`, `'uh'`, `'like'`, `'so'`, etc.)
- 13 filler patterns detected by `fillerDetector.ts`

**Integration point:**
- `FillerBreakdown` component: groups `filler_word` events by `.label`, renders sorted bar chart or ranked list
- Uses Whisper counts (`whisperFillers.byType`) when `whisperStatus === 'done'`, falls back to Web Speech eventLog counts otherwise
- Session-segment clustering: group fillers into early/middle/late thirds of the session using `timestampMs / durationMs`

**What needs to be built:**
- New `FillerBreakdown` component — stateless, receives `{ events: SessionEvent[], durationMs, whisperFillers? }`
- New helper `groupFillersByType(events)` pure function in `analysis/` — returns `Record<string, number>`
- No scorer change needed for the breakdown UI (breakdown is display-only)

---

### Feature 4: Speaking Rate Variance (WPM-over-time chart)

**What does not exist yet:**
- `calculateWPM()` in `pacing.ts` computes a single session-end WPM from all final segments
- There is no per-window WPM computation during recording
- `wpm_snapshot` is a single event at `timestampMs = durationMs`

**Required recording-side change:**

During recording, App.tsx calls `calculateWPM(segments, durationMs)` once at `handleSaveName` time. To get per-window WPM, segments need to be bucketed into 30-second windows and WPM computed per bucket. This can be done at the same `handleSaveName` moment — it doesn't require live emission during recording.

**Integration point — App.tsx `handleSaveName`:**

```
Before db.sessions.add():
  const wpmWindows = calculateWPMWindows(segments, durationMs, windowSizeMs=30000)
  // returns: [{ windowStart: 0, windowEnd: 30000, wpm: 145 }, ...]
```

These windows are stored as a new Dexie field `wpmWindows?: WPMWindow[]`, not as eventLog entries. Reason: they are derived analytics, not timeline events, and inserting 30+ `wpm_window` events into eventLog would pollute the timeline display without adding timeline value.

**Dexie change:**

```typescript
wpmWindows?: Array<{ windowStart: number; windowEnd: number; wpm: number }>;
```

**New files:**
- `calculateWPMWindows()` in `pacing.ts` (or a new `analysis/wpmWindows.ts`)
- `WPMChart` component — receives `wpmWindows`, renders SVG line chart or bar chart

**No scorer change needed** — WPM variance is display-only for v2.0 (could inform a future "consistency" sub-score).

---

### Feature 5: Opening/Closing Strength

**What already exists:**
- All `filler_word`, `eye_contact_break`, `expressiveness_segment`, `face_touch`, `body_sway` events carry `timestampMs`
- `durationMs` is stored per session
- `aggregateScores()` accepts the full eventLog

**Integration point — new scorer dimension:**

`openingClosing` is a new dimension in `ScorecardResult`. It scores the first 30s and last 30s separately, then averages (or takes the minimum). It uses existing events filtered by `timestampMs < 30000` and `timestampMs > durationMs - 30000`.

**Changes required:**

1. **`scorer.ts`:** New `scoreOpeningClosing(events, durationMs)` function. Returns `DimensionScore` with `.detail` string like "Opening: 85 / Closing: 72". Add `openingClosing` to `ScorecardResult.dimensions` type. Update `WEIGHTS` — fillers/pacing/eyeContact weights each drop slightly to accommodate new dimension.

2. **`ScorecardView.tsx`:** Add `openingClosing` to the `DIMENSIONS` array. The component is data-driven (maps over DIMENSIONS), so this is a one-line addition plus the label string.

3. **`db.ts`:** The `Scorecard` type uses `Record<string, number>` for dimensions — no schema change needed for stored scorecard. `ScorecardResult.dimensions` type needs `openingClosing` added.

**Edge case:** Sessions shorter than 60 seconds have overlapping first/last 30s windows. Score should use full session if `durationMs < 60000`. Flag this in the scorer with a guard.

---

## Component Inventory

### New Components

| Component | File | Receives | Renders |
|-----------|------|----------|---------|
| `FillerBreakdown` | `src/components/FillerBreakdown/FillerBreakdown.tsx` | `events: SessionEvent[]`, `durationMs`, `whisperFillers?` | Filler count by type, session thirds heatmap |
| `PauseDetail` | `src/components/PauseDetail/PauseDetail.tsx` | `events: SessionEvent[]`, `durationMs` | Pause count, avg duration, longest pause |
| `WPMChart` | `src/components/WPMChart/WPMChart.tsx` | `wpmWindows: WPMWindow[]` | SVG line/bar chart of WPM per 30s window |
| `OpeningClosingDetail` | `src/components/OpeningClosingDetail/OpeningClosingDetail.tsx` | `events: SessionEvent[]`, `durationMs` | Opening score, closing score, what hurt each |
| `WhisperStatusBanner` | `src/components/WhisperStatusBanner/WhisperStatusBanner.tsx` | `status: WhisperStatus` | Loading/done/failed banner in ReviewPage |

### New Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useWhisperAnalysis` | `src/hooks/useWhisperAnalysis.ts` | Manages Whisper worker lifecycle, updates Dexie when done, exposes `status` |

### New Workers

| Worker | File | Purpose |
|--------|------|---------|
| `whisper.worker.js` | `src/workers/whisper.worker.js` | Classic-mode Web Worker running Whisper.wasm; receives audio ArrayBuffer, posts filler results |

### New Analysis Functions

| Function | File | Purpose |
|----------|------|---------|
| `scoreOpeningClosing()` | `src/analysis/openingClosing.ts` | Scores first/last 30s using existing event types |
| `calculateWPMWindows()` | `src/analysis/pacing.ts` (or `wpmWindows.ts`) | Buckets segments into 30s windows, returns WPM per window |
| `groupFillersByType()` | `src/analysis/fillerDetector.ts` (or `fillerBreakdown.ts`) | Aggregates filler events into `Record<string, number>` |
| `scorePauses()` | `src/analysis/pacing.ts` | Penalty function on pause count + duration (sub-feeds into pacing score) |

### Modified Existing Files

| File | What Changes |
|------|-------------|
| `src/db/db.ts` | Dexie v3 schema with new fields: `whisperFillers?`, `whisperStatus?`, `wpmWindows?` on `Session` |
| `src/analysis/scorer.ts` | Add `openingClosing` dimension; modify `scorePacing()` to include pause penalty; update `ScorecardResult` type; optionally accept `whisperOverrides` param for filler count |
| `src/analysis/pacing.ts` | Add `calculateWPMWindows()` |
| `src/App.tsx` | Call `calculateWPMWindows()` inside `handleSaveName`; pass `wpmWindows` to `db.sessions.add()`; call `useWhisperAnalysis` after save; pass `whisperStatus` to ReviewPage |
| `src/pages/Review.tsx` | Add detail panels below AnnotatedPlayer; show `WhisperStatusBanner`; re-run `aggregateScores` with Whisper override when `whisperStatus` changes |
| `src/components/ScorecardView/ScorecardView.tsx` | Add `openingClosing` to `DIMENSIONS` array |

---

## Data Flow: v2.0 Complete Picture

### Recording → Save (additions in bold)

```
handleSaveName(title)
    ↓
segments = speechCaptureRef.current.stop()
fillerEvents = detectFillers(segments)         (unchanged)
pauseEvents  = detectPauses(segments)          (unchanged)
wpm          = calculateWPM(segments, durationMs)  (unchanged)
wpmEvent     = { type: 'wpm_snapshot', ... }   (unchanged)
**wpmWindows = calculateWPMWindows(segments, durationMs, 30000)**  (NEW)
    ↓
eventLog = [...visualEvents, ...speechEvents].sort()  (unchanged)
    ↓
sessionId = await db.sessions.add({
  eventLog,
  transcript: segments,
  **wpmWindows,**           (NEW field)
  **whisperStatus: 'pending',**  (NEW field)
  ...
})
    ↓
**useWhisperAnalysis kicks off** (async, non-blocking)
    setView('review')      (unchanged — review visible immediately)
```

### Whisper Analysis (async, after save)

```
useWhisperAnalysis(sessionId)
    ↓
session = await db.sessions.get(sessionId)
audioBuffer = await extractAudio(session.videoBlob)   (Web Audio API)
    ↓
db.sessions.update(sessionId, { whisperStatus: 'running' })
    ↓
whisperWorker.postMessage({ type: 'analyze', audio: audioBuffer }, [audioBuffer])
    ↓
worker responds: { fillerCount, byType: { um, uh, like, ... } }
    ↓
db.sessions.update(sessionId, {
  whisperFillers: { total: fillerCount, byType },
  whisperStatus: 'done'
})
    ↓
ReviewPage (subscribed via useLiveQuery or re-fetch on status change)
    ↓
aggregateScores(eventLog, durationMs, { fillerOverride: whisperFillers.total })
Filler score re-renders with accurate count
```

### ReviewPage State

```
ReviewPage mounts
    ↓
Load session from Dexie (one-time)
Compute scorecard = aggregateScores(eventLog, durationMs)  [initial, Web Speech counts]
    ↓
If session.whisperStatus === 'pending' or 'running':
    Show WhisperStatusBanner("Analyzing audio for accurate filler count...")
    Poll or subscribe for whisperStatus change
    ↓
When whisperStatus === 'done':
    Re-compute scorecard with whisperFillers override
    Update filler score display
    Hide banner / show "Updated" indicator
    ↓
Detail panels always use eventLog directly (no re-compute needed for breakdown UI)
```

---

## Dexie Schema Changes

**Current:** db version 2 (stores string identical to v1, adds unindexed `transcript` field).

**v3 additions:** Three new unindexed fields. The stores() index string remains identical — Dexie version bump is required for Dexie upgrade machinery, but no index changes.

```typescript
// db.ts — new Session fields
whisperFillers?: {
  total: number;
  byType: Record<string, number>;
};
whisperStatus?: 'pending' | 'running' | 'done' | 'failed';
wpmWindows?: Array<{
  windowStart: number;
  windowEnd: number;
  wpm: number;
}>;

// db version bump
db.version(3).stores({
  sessions: '++id, createdAt, title',  // identical index string — required for Dexie upgrade
});
```

**Historical sessions** (recorded before v2.0) will have all three fields as `undefined`. All consumers must treat them as optional and degrade gracefully:
- `WPMChart` renders nothing or a "No data" state if `wpmWindows` is undefined
- `WhisperStatusBanner` does not appear if `whisperStatus` is undefined
- Filler score falls back to Web Speech count if `whisperFillers` is undefined

---

## Suggested Build Order

Dependencies drive this order. Each step produces a testable increment.

### Step 1 — Dexie v3 schema + wpmWindows (no UI)
**Files:** `db.ts`, `pacing.ts` (add `calculateWPMWindows`), `App.tsx` (call it + store result)
**Why first:** All downstream features read from Dexie. Schema migration must exist before any feature reads the new fields. `wpmWindows` computation is a pure function with no external deps — easy to test and get right before building UI.
**Testable:** Unit test `calculateWPMWindows` against known transcript segments. Verify Dexie v3 upgrade doesn't break existing sessions.

### Step 2 — Opening/Closing scorer + ScorecardView row
**Files:** `src/analysis/openingClosing.ts` (new), `scorer.ts` (add dimension + rebalance weights), `ScorecardView.tsx` (add row)
**Why second:** Pure scoring logic with no new data dependencies — works entirely from existing eventLog. Delivers a visible new scorecard dimension immediately. No worker, no Dexie changes, no new UI panels.
**Testable:** Unit test `scoreOpeningClosing` with synthetic eventLogs. ScorecardView renders correctly with 6 dimensions.

### Step 3 — Pause scoring + PauseDetail panel
**Files:** `scorer.ts` (modify `scorePacing`), `src/components/PauseDetail/PauseDetail.tsx` (new), `Review.tsx` (add panel)
**Why third:** Pause events already exist in eventLog — no recording changes needed. Pause scoring and the detail panel are independent of Whisper. Delivers visible pacing sub-detail.
**Testable:** Unit test `scorePauses`. PauseDetail renders correct count/duration from a fixture eventLog.

### Step 4 — Filler breakdown panel (Web Speech counts)
**Files:** `src/analysis/fillerDetector.ts` or new `fillerBreakdown.ts` (add `groupFillersByType`), `src/components/FillerBreakdown/FillerBreakdown.tsx` (new), `Review.tsx` (add panel)
**Why fourth:** Filler breakdown works from existing eventLog filler events — no Whisper dependency yet. Delivers the UI shell that Whisper will later update. Building it before Whisper lets you validate the layout and data grouping logic independently.
**Testable:** Unit test `groupFillersByType`. FillerBreakdown renders correct bars from fixture events.

### Step 5 — WPMChart panel
**Files:** `src/components/WPMChart/WPMChart.tsx` (new), `Review.tsx` (add panel, read `session.wpmWindows`)
**Why fifth:** `wpmWindows` field is already being written (Step 1). This step is purely UI — read the stored windows, render a chart. No analysis code needed.
**Testable:** WPMChart renders SVG/bars from a fixture `wpmWindows` array. Graceful "no data" state for old sessions.

### Step 6 — Whisper.wasm worker + useWhisperAnalysis hook
**Files:** `src/workers/whisper.worker.js` (new), `src/hooks/useWhisperAnalysis.ts` (new), `src/components/WhisperStatusBanner/WhisperStatusBanner.tsx` (new), `App.tsx` (integrate hook), `Review.tsx` (show banner, re-score on done), `scorer.ts` (accept `fillerOverride` param)
**Why last:** Whisper is the highest-risk item — WASM loading in a worker, audio extraction from a video Blob, memory pressure from a large model. Everything else is already working and provides value even if Whisper is delayed or descoped. Whisper upgrades the filler score and breakdown counts without changing any earlier UI structures.
**Testable:** Whisper worker can be tested independently by posting a fixture audio ArrayBuffer and asserting the returned filler counts. Integration test: record a session, verify `whisperStatus` transitions to `'done'` and `whisperFillers` is populated.

---

## Architectural Patterns

### Pattern 1: Augment Dexie, Don't Mutate EventLog

**What:** Store Whisper results as separate top-level fields (`whisperFillers`, `whisperStatus`) rather than inserting new events into the existing `eventLog` array.

**When to use:** When post-session analysis produces counts/aggregates rather than timeline-positioned events. The eventLog is a timeline; Whisper produces a count correction, not a new event stream.

**Trade-offs:** Slightly wider Session type, but consumers have clean separation: timeline display reads `eventLog`, filler score computation reads `whisperFillers` (with `eventLog` as fallback). Avoids needing to deduplicate or mark events as "from Whisper vs Web Speech."

### Pattern 2: Async Analysis After Save, Reactive UI Update

**What:** Dexie save happens immediately after recording stops. Whisper analysis starts after save but before the user has finished looking at the scorecard. ReviewPage initially shows Web Speech scores, then silently upgrades when Whisper finishes.

**When to use:** When analysis is expensive and the product can show a useful-but-incomplete state immediately. The user sees a score within milliseconds of the recording ending; Whisper corrects it within 10–30 seconds.

**Trade-offs:** Need a status field and a banner. The score visibly changes after the page loads — need to communicate this to the user clearly. The `WhisperStatusBanner` is the mechanism. Avoid re-running `aggregateScores` on every Dexie update — only re-run when `whisperStatus` transitions to `'done'`.

### Pattern 3: Pure Functions Receive Override Parameters

**What:** Rather than modifying `scoreFillers()` to internally query Dexie for Whisper data, `aggregateScores()` accepts an optional overrides parameter: `aggregateScores(eventLog, durationMs, { fillerCount?: number })`.

**When to use:** When a scoring function needs to be called with different inputs depending on data availability (Web Speech count vs. Whisper count), but the function itself must remain a pure function with no I/O.

**Trade-offs:** Callers (ReviewPage) decide which count to pass. Keeps scorer.ts testable without mocking Dexie. Passing `undefined` falls back to the eventLog count — backward compatible with all existing tests.

### Pattern 4: Detail Panels Are Stateless Components Below AnnotatedPlayer

**What:** All five new detail panels (`FillerBreakdown`, `PauseDetail`, `WPMChart`, `OpeningClosingDetail`, `WhisperStatusBanner`) are stateless components that receive their data as props from ReviewPage.

**When to use:** ReviewPage already fetches the full session from Dexie — there is no need for each panel to make its own Dexie query. Props flow downward. Components are individually testable with fixture data.

**Trade-offs:** ReviewPage becomes slightly more complex as a data-fetching and distribution node. Acceptable at this scale — adding a context or hook-based solution would be premature.

---

## Integration Points

### Whisper.wasm Worker Boundary

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Main thread ↔ Whisper worker | `postMessage` with Transferable `ArrayBuffer` | Audio must be extracted from videoBlob as PCM ArrayBuffer before sending; Web Audio `AudioContext.decodeAudioData` needed |
| App.tsx → useWhisperAnalysis | Custom hook exposes `{ status, fillers }` | Hook starts analysis, writes Dexie, ReviewPage reads Dexie (not hook state) to avoid prop-threading |
| ReviewPage ↔ Dexie | Re-fetch on whisperStatus change | Use `useLiveQuery(() => db.sessions.get(sessionId))` — Dexie's reactive query fires when `db.sessions.update()` is called from useWhisperAnalysis |

### Scorer.ts → ScorecardView Boundary

The existing `ScorecardResult.dimensions` is typed with named keys. Adding `openingClosing` requires updating the TypeScript type. `ScorecardView.tsx`'s `DIMENSIONS` constant drives rendering — adding the new key there is the only component change needed.

The `Scorecard` type in `db.ts` (the persisted form) uses `Record<string, number>` — no migration needed, the new dimension key just gets added to the persisted object naturally.

### Pacing Score → PauseDetail Boundary

`scorePacing()` currently uses only the `wpm_snapshot` event. After modification it will also read `pause_detected` events. The `PauseDetail` component reads `pause_detected` events independently for display purposes. Both compute from the same eventLog — no shared state needed.

---

## Risks and Edge Cases

| Risk | Severity | Mitigation |
|------|----------|------------|
| Whisper.wasm memory footprint (~100–200MB) | HIGH | Load worker on-demand after recording; terminate and GC after analysis completes; test on lower-memory devices |
| Audio extraction from video Blob may not work in all browsers | MEDIUM | `AudioContext.decodeAudioData` is well-supported; fallback: skip Whisper, set `whisperStatus: 'failed'` silently |
| Whisper runtime exceeds user patience (>60s for long sessions) | MEDIUM | Show progress estimate based on audio duration; "Skip — use quick count" escape hatch |
| Sessions shorter than 60s break opening/closing scorer | LOW | Guard: if `durationMs < 60000`, use entire session for both opening and closing score |
| Dexie v3 migration breaks existing sessions | LOW | v3 stores() string is identical to v2; new fields are optional; Dexie handles upgrade gracefully |
| wpmWindows undefined for old sessions | LOW | `WPMChart` renders "Record a new session to see speaking rate over time" |

---

## Anti-Patterns

### Anti-Pattern 1: Storing Whisper Results as New EventLog Entries

**What people do:** Insert new `filler_word` events with `label: 'whisper:um'` into the existing eventLog for the session.

**Why it's wrong:** EventLog is a timeline. Whisper's timestamps are imprecise relative to session wall-clock — injecting them creates confusing duplicate or misaligned markers on the annotated timeline. Existing tests for `detectFillers`, `scoreFillers`, and timeline rendering all assume Web Speech filler events; mutating eventLog after the fact breaks that contract.

**Do this instead:** Store Whisper results in a separate `whisperFillers` field. Pass the Whisper count as an override to `aggregateScores`. Leave eventLog immutable after the initial save.

### Anti-Pattern 2: Re-running Whisper on Every ReviewPage Load

**What people do:** Check if `whisperStatus === 'done'` is absent and trigger Whisper analysis inside ReviewPage's `useEffect`.

**Why it's wrong:** If the user navigates history to an old session, Whisper would re-run (wasting CPU/memory) even though it was never requested for that session. ReviewPage is also used for post-recording review where App.tsx manages Whisper — having ReviewPage also trigger it creates a race condition.

**Do this instead:** Trigger Whisper analysis once in App.tsx immediately after `db.sessions.add()`. ReviewPage only reads `whisperStatus` from Dexie reactively — it never initiates analysis.

### Anti-Pattern 3: Blocking the Review Transition on Whisper

**What people do:** Add Whisper analysis to the `handleSaveName` async chain before `setView('review')`.

**Why it's wrong:** Whisper.wasm on a 5-minute session can take 20–60 seconds. Blocking the view transition on Whisper means the user stares at the processing spinner for a minute. The Web Speech scores are immediately available and useful.

**Do this instead:** Set `setView('review')` immediately after `db.sessions.add()`. Start Whisper analysis in parallel (fire-and-forget with `useWhisperAnalysis`). The review page shows Web Speech scores first, then updates silently.

---

## Sources

- Source code analysis: `src/App.tsx`, `src/analysis/scorer.ts`, `src/db/db.ts`, `src/analysis/pacing.ts`, `src/hooks/useSpeechCapture.ts`, `src/pages/Review.tsx`, `src/components/ScorecardView/ScorecardView.tsx`, `src/hooks/useMLWorker.ts`, `src/hooks/useRecording.ts` (HIGH confidence — first-party source of truth)
- `.planning/STATE.md` — confirmed Web Speech filler under-counting, classic-mode worker constraint (HIGH confidence)
- `.planning/PROJECT.md` — v2.0 feature requirements (HIGH confidence)
- Dexie.js versioning docs: https://dexie.org/docs/Tutorial/Design — stores() string must be present for each version block even when unchanged (HIGH confidence)
- Web Audio API `AudioContext.decodeAudioData`: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData — supported in all modern browsers (HIGH confidence)

---

*Architecture research for: browser-based ML analysis / presentation coaching tool — v2.0 analytics*
*Researched: 2026-03-16*
