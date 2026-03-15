# Phase 3: Post-Session Review - Research

**Researched:** 2026-03-15
**Domain:** Score aggregation from event arrays, custom HTML5 video player with seekable WebM, CSS-positioned timeline markers, Dexie partial update, React rendering strategy for high-frequency video time sync
**Confidence:** HIGH (Dexie API and video APIs verified; scoring formulas are custom design decisions where domain research provides calibration inputs; no new npm dependencies)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCORE-01 | Post-session scorecard shows per-dimension scores (eye contact, fillers, pacing, expressiveness, gestures) | Pure aggregation functions over Phase 2 eventLog; WPM benchmark range (120–160 wpm) and filler rate reference established; scoring formulas are custom design decisions — see Architecture Patterns |
| SCORE-02 | Post-session scorecard shows a single overall score (weighted composite) | Weighted average of per-dimension scores; weights are a design decision; pattern documented below |
| SCORE-03 | Scorecard summary is stored alongside the session in IndexedDB | `db.sessions.update(id, { scorecard })` — partial update pattern confirmed; `Scorecard` interface already in db.ts |
| PLAY-01 | User can watch their recorded session video in a custom player | `URL.createObjectURL(blob)` + `<video src={url}>` — already used in Review.tsx stub; `webmFixDuration` already applied at save time (Phase 1), so duration is finite and seeking works |
| PLAY-02 | Timeline shows event markers at timestamps where feedback events occurred | CSS `position: absolute; left: {(ts / duration) * 100}%` on a relative-positioned bar — pure CSS, no library |
| PLAY-03 | User can click a timestamp marker to jump to that moment in the video | `videoRef.current.currentTime = event.timestampMs / 1000` — direct DOM mutation on click |
| PLAY-04 | Hovering or pausing on a marker shows a description of the event | CSS tooltip via `title` attribute or absolutely-positioned `<div>` revealed on `:hover` / `onMouseEnter` |
</phase_requirements>

---

## Summary

Phase 3 has three separable work items: (1) a pure aggregation layer that turns the existing `eventLog` array into a `Scorecard` record and writes it to Dexie, (2) a scorecard view component that displays per-dimension and overall scores, and (3) an annotated video player component that overlays a custom timeline with clickable event markers.

The video player is the technically richest piece. The `webmFixDuration` post-processing already applied in Phase 1 ensures the recorded blob has a finite duration and is seekable — there is no Infinity-duration problem to solve. The player itself needs: a `<video>` element fed from `URL.createObjectURL`, a custom timeline `<div>` with absolutely-positioned marker dots, click-to-seek on markers, and a tooltip on hover. Video time synchronization for marker highlighting uses `timeupdate` (fired at ~4–250 ms intervals, adequate for scrubbing feedback). `requestVideoFrameCallback` is available as a Baseline 2024 API supported since October 2024 in all major browsers; it gives per-frame metadata including `mediaTime`, but for this use case (highlighting which marker is "current") `timeupdate` is sufficient and simpler. Using `useRef` instead of `useState` for `currentTime` tracking prevents unnecessary React re-renders.

The scoring layer is entirely custom — no library or published formula exists for these five dimensions. Domain research provides calibration benchmarks: the accepted WPM sweet spot for presentations is 120–160 wpm (Microsoft Speaker Coach cites 100–165), face touching and body sway are negative signals, filler word frequency maps to a penalty curve, and eye contact ratio maps directly to score. These are first-pass values; STATE.md already documents that thresholds need post-Phase-3 tuning. No new npm packages are required — all capabilities are already installed or browser-built-in.

**Primary recommendation:** Build 03-01 (aggregator + Dexie write) first, then 03-02 (scorecard view, stateless), then 03-03 (annotated player). Each is independently testable. The aggregator is pure functions with no browser dependencies.

---

## Standard Stack

### Core (no new dependencies — all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie | 4.x | `db.sessions.update(id, { scorecard })` partial write | Already in use; `update()` does partial field replacement — only `scorecard` is touched |
| React | 19 | ScorecardView, AnnotatedPlayer components | Already in use |
| Tailwind v4 | 4.x | Layout and styling | Already in use; `@tailwindcss/vite` plugin, no config file |
| Browser native `<video>` | n/a | Playback of WebM blob | Already used in Review.tsx stub; duration is finite after webmFixDuration |

### No New npm Dependencies

Phase 3 requires zero new npm packages. All capabilities come from:
- `dexie` (already installed) — scorecard persistence
- Browser `<video>` API + `URL.createObjectURL` — video playback
- `requestVideoFrameCallback` / `timeupdate` — time sync (browser built-in)
- Pure CSS `position: absolute` percentage math — timeline markers
- `@testing-library/react` (already installed) — component tests

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)

```
src/
├── analysis/
│   └── scorer.ts              # NEW: aggregateScores(eventLog, durationMs) -> Scorecard
├── components/
│   ├── ScorecardView/
│   │   └── ScorecardView.tsx  # NEW: displays Scorecard prop, no data fetching
│   └── AnnotatedPlayer/
│       ├── AnnotatedPlayer.tsx # NEW: video + custom timeline composition
│       ├── Timeline.tsx        # NEW: CSS-positioned marker dots
│       └── eventSync.ts        # NEW: getCurrentEvents(events, currentTimeMs) -> visible state
├── pages/
│   └── Review.tsx             # REPLACE stub: compose ScorecardView + AnnotatedPlayer
└── db/
    └── db.ts                  # NO CHANGE — Scorecard interface already present
```

### Pattern 1: Score Aggregation (aggregateScores pure function)

**What:** Walk the sorted `eventLog` array and compute a 0–100 score for each dimension, then compute a weighted overall score.
**When to use:** Called once per session, after all events are in IndexedDB, in the Review page before saving the scorecard.

**Scoring formulas — first-pass design (calibrate after Phase 3 first recordings):**

```typescript
// src/analysis/scorer.ts
// Source: domain benchmarks from Microsoft Speaker Coach (100–165 wpm), academic
//         presentation research (120–160 wpm sweet spot), and Phase 2 event schema.

import type { SessionEvent } from '../db/db';

export interface DimensionScore {
  score: number;     // 0–100
  label: string;     // human-readable, e.g. "82 / 100"
  detail?: string;   // supporting stat, e.g. "3 breaks in 5 min"
}

export interface ScorecardResult {
  overall: number;
  dimensions: {
    eyeContact: DimensionScore;
    expressiveness: DimensionScore;
    gestures: DimensionScore;
    fillers: DimensionScore;
    pacing: DimensionScore;
  };
}

// --- Eye Contact ---
// Metric: fraction of session time spent in 'direct' state (no eye_contact_break active)
// Score: eye contact ratio mapped linearly to 0–100; 100% direct = 100, 0% direct = 0
function scoreEyeContact(events: SessionEvent[], durationMs: number): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };

  const breaks = events.filter(e => e.type === 'eye_contact_break');
  const resumes = events.filter(e => e.type === 'eye_contact_resume');

  // Calculate total time "away"
  let awayMs = 0;
  let breakStart = 0;
  let inBreak = false;
  for (const e of events.filter(
    e => e.type === 'eye_contact_break' || e.type === 'eye_contact_resume'
  ).sort((a, b) => a.timestampMs - b.timestampMs)) {
    if (e.type === 'eye_contact_break' && !inBreak) {
      breakStart = e.timestampMs;
      inBreak = true;
    } else if (e.type === 'eye_contact_resume' && inBreak) {
      awayMs += e.timestampMs - breakStart;
      inBreak = false;
    }
  }
  if (inBreak) awayMs += durationMs - breakStart; // session ended while looking away

  const ratio = Math.max(0, 1 - awayMs / durationMs);
  const score = Math.round(ratio * 100);
  return {
    score,
    label: `${score} / 100`,
    detail: `${breaks.length} break${breaks.length !== 1 ? 's' : ''}`,
  };
}

// --- Expressiveness ---
// Metric: average of per-segment scores from 'expressiveness_segment' events (label = score string)
// Score: average segment score mapped to 0–100 (segment scores are already 0–1 from Phase 2)
function scoreExpressiveness(events: SessionEvent[]): DimensionScore {
  const segs = events.filter(e => e.type === 'expressiveness_segment');
  if (segs.length === 0) return { score: 50, label: '50 / 100', detail: 'No data' };

  const avg = segs.reduce((sum, e) => sum + parseFloat(e.label ?? '0'), 0) / segs.length;
  const score = Math.min(100, Math.round(avg * 100));
  return {
    score,
    label: `${score} / 100`,
    detail: `${segs.length} segment${segs.length !== 1 ? 's' : ''} analyzed`,
  };
}

// --- Gestures ---
// Metric: count of face_touch + body_sway events; penalty curve (each event = -8 points)
// Score: 100 - (eventCount * 8), floor at 0
function scoreGestures(events: SessionEvent[]): DimensionScore {
  const nervousEvents = events.filter(
    e => e.type === 'face_touch' || e.type === 'body_sway'
  );
  const count = nervousEvents.length;
  const score = Math.max(0, 100 - count * 8);
  return {
    score,
    label: `${score} / 100`,
    detail: `${count} nervous gesture${count !== 1 ? 's' : ''}`,
  };
}

// --- Filler Words ---
// Metric: filler events per minute; penalty curve
// Score: 100 at 0 fillers/min; degrades to 0 at 6+ fillers/min
// Reference: presentations with >4 fillers/min are rated as distracting by audiences
// NOTE: Chrome Web Speech API under-counts fillers (Phase 1 finding) — score is an upper bound
function scoreFillers(events: SessionEvent[], durationMs: number): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };
  const fillers = events.filter(e => e.type === 'filler_word');
  const fillersPerMin = fillers.length / (durationMs / 60000);
  // Linear mapping: 0 fillers/min = 100, 6+ fillers/min = 0
  const score = Math.max(0, Math.round(100 - (fillersPerMin / 6) * 100));
  return {
    score,
    label: `${score} / 100`,
    detail: `${fillers.length} filler${fillers.length !== 1 ? 's' : ''} (~${fillersPerMin.toFixed(1)}/min)`,
  };
}

// --- Pacing ---
// Metric: WPM from wpm_snapshot event; compare to 120–160 wpm target range
// Score: 100 at 130–150 wpm; degrades as WPM moves outside 100–180 range
// Reference: Microsoft Speaker Coach 100–165 wpm; academic sweet spot 120–160 wpm
function scorePacing(events: SessionEvent[]): DimensionScore {
  const wpmEvent = events.find(e => e.type === 'wpm_snapshot');
  if (!wpmEvent || !wpmEvent.label) return { score: 50, label: '50 / 100', detail: 'No WPM data' };

  const wpm = parseInt(wpmEvent.label, 10);
  if (isNaN(wpm)) return { score: 50, label: '50 / 100', detail: 'No WPM data' };

  let score: number;
  if (wpm >= 120 && wpm <= 160) {
    score = 100;
  } else if (wpm < 120) {
    // Below target: 100 → 0 from 120 → 60 wpm
    score = Math.max(0, Math.round(((wpm - 60) / 60) * 100));
  } else {
    // Above target: 100 → 0 from 160 → 220 wpm
    score = Math.max(0, Math.round(((220 - wpm) / 60) * 100));
  }
  return {
    score,
    label: `${score} / 100`,
    detail: `${wpm} wpm`,
  };
}

// --- Weighted Overall ---
// Weights: eyeContact 25%, fillers 25%, pacing 20%, expressiveness 15%, gestures 15%
// Rationale: the core differentiators (eye contact, filler-free speech) carry the most weight
const WEIGHTS = {
  eyeContact: 0.25,
  fillers: 0.25,
  pacing: 0.20,
  expressiveness: 0.15,
  gestures: 0.15,
};

export function aggregateScores(
  eventLog: SessionEvent[],
  durationMs: number
): ScorecardResult {
  const eyeContact = scoreEyeContact(eventLog, durationMs);
  const expressiveness = scoreExpressiveness(eventLog);
  const gestures = scoreGestures(eventLog);
  const fillers = scoreFillers(eventLog, durationMs);
  const pacing = scorePacing(eventLog);

  const overall = Math.round(
    eyeContact.score * WEIGHTS.eyeContact +
    fillers.score * WEIGHTS.fillers +
    pacing.score * WEIGHTS.pacing +
    expressiveness.score * WEIGHTS.expressiveness +
    gestures.score * WEIGHTS.gestures
  );

  return {
    overall,
    dimensions: { eyeContact, expressiveness, gestures, fillers, pacing },
  };
}
```

**Key design notes:**
- All scoring functions are pure — no side effects, easily unit-tested with fixture event arrays
- `Scorecard` interface in `db.ts` uses `Record<string, number>` for dimensions — the aggregator produces this shape
- The `wpm_snapshot` event at `timestampMs = durationMs` (placed by Phase 2 `handleSaveName`) is the source for pacing score — it's always the last event in the sorted log

### Pattern 2: Dexie Partial Update for Scorecard

**What:** After computing the scorecard, write it to the existing session record without touching other fields.
**When to use:** Inside the Review page's `useEffect` on first load, if `session.scorecard === null`.

```typescript
// src/pages/Review.tsx (or a hook)
// Source: Dexie Table.update() does a partial field update — only named fields are replaced.
// The Scorecard interface is already defined in db.ts.

import { db, type Scorecard } from '../db/db';
import { aggregateScores } from '../analysis/scorer';

// Inside a useEffect after session is loaded:
if (session && !session.scorecard) {
  const result = aggregateScores(session.eventLog, session.durationMs);
  const scorecard: Scorecard = {
    overall: result.overall,
    dimensions: {
      eyeContact: result.dimensions.eyeContact.score,
      fillers: result.dimensions.fillers.score,
      pacing: result.dimensions.pacing.score,
      expressiveness: result.dimensions.expressiveness.score,
      gestures: result.dimensions.gestures.score,
    },
  };
  await db.sessions.update(session.id, { scorecard });
}
```

**Critical:** `db.sessions.update(id, { scorecard })` is a partial update — it only writes `scorecard`, leaving `videoBlob`, `eventLog`, and all other fields untouched. This is safe for any session loaded from history (Phase 4).

### Pattern 3: Annotated Video Player

**What:** A `<video>` element + a custom timeline `<div>` where each event is represented as a dot positioned at `(timestampMs / durationMs) * 100 %` from the left.
**When to use:** `AnnotatedPlayer.tsx` composition.

**Why not use an off-the-shelf video player library:** VideoJS and similar libraries are large (100-300 KB), require separate CSS, and their plugin APIs are complex to integrate with React refs. A custom player requires ~50 lines and gives full control over marker positioning and tooltip behavior. The video element already has built-in controls via the `controls` attribute (used in the current Review.tsx stub); Phase 3 replaces this with a custom control bar + timeline.

```tsx
// src/components/AnnotatedPlayer/AnnotatedPlayer.tsx

import { useRef, useState, useEffect, useCallback } from 'react';
import type { SessionEvent } from '../../db/db';
import Timeline from './Timeline';

interface AnnotatedPlayerProps {
  videoUrl: string;          // result of URL.createObjectURL(session.videoBlob)
  durationMs: number;
  events: SessionEvent[];
}

export default function AnnotatedPlayer({ videoUrl, durationMs, events }: AnnotatedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // currentTimeMs stored in ref — does NOT trigger React re-renders on every timeupdate
  const currentTimeMsRef = useRef(0);
  // A separate state for the timeline progress bar update (coarser re-render is OK)
  const [progressPct, setProgressPct] = useState(0);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    currentTimeMsRef.current = videoRef.current.currentTime * 1000;
    setProgressPct((videoRef.current.currentTime / videoRef.current.duration) * 100);
  }, []);

  const seekTo = useCallback((timestampMs: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timestampMs / 1000;
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        className="w-full rounded-xl bg-black"
        aria-label="Session playback"
      />
      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={progressPct}
        onSeek={seekTo}
      />
    </div>
  );
}
```

```tsx
// src/components/AnnotatedPlayer/Timeline.tsx
// Marker dot position: left = (event.timestampMs / durationMs) * 100 %
// Clicking a marker calls onSeek(event.timestampMs)
// Tooltip: title attribute for simplicity (accessible, no extra library)

import type { SessionEvent } from '../../db/db';

interface TimelineProps {
  events: SessionEvent[];
  durationMs: number;
  progressPct: number;    // 0–100, updated by timeupdate
  onSeek: (timestampMs: number) => void;
}

// Map event type to a human-readable description
function eventLabel(event: SessionEvent): string {
  if (event.type === 'filler_word') return `Filler word: "${event.label ?? ''}"`;
  if (event.type === 'eye_contact_break') return 'Eye contact break';
  if (event.type === 'eye_contact_resume') return 'Eye contact resumed';
  if (event.type === 'face_touch') return 'Face touch';
  if (event.type === 'body_sway') return 'Body sway';
  if (event.type === 'pause_detected') return `Pause: ${event.label ?? ''}`;
  if (event.type === 'expressiveness_segment') return `Expressiveness: ${event.label ?? ''}`;
  return event.type.replace(/_/g, ' ');
}

export default function Timeline({ events, durationMs, progressPct, onSeek }: TimelineProps) {
  if (durationMs <= 0) return null;

  return (
    // Outer bar: relative positioned container, fixed height, click to seek on bar itself
    <div className="relative w-full h-8 bg-gray-800 rounded-full cursor-pointer select-none"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        onSeek(fraction * durationMs);
      }}
    >
      {/* Playback progress fill */}
      <div
        className="absolute left-0 top-0 h-full bg-gray-600 rounded-full pointer-events-none"
        style={{ width: `${progressPct}%` }}
      />

      {/* Event markers */}
      {events.map((event, i) => {
        const leftPct = (event.timestampMs / durationMs) * 100;
        return (
          <button
            key={i}
            title={eventLabel(event)}
            aria-label={eventLabel(event)}
            onClick={(e) => {
              e.stopPropagation(); // don't also trigger bar click
              onSeek(event.timestampMs);
            }}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400
                       hover:scale-150 transition-transform focus:outline-none focus:ring-2
                       focus:ring-amber-300"
            style={{ left: `calc(${leftPct}% - 6px)` }} // -6px centers the 12px dot
          />
        );
      })}
    </div>
  );
}
```

**Why `title` attribute for tooltips:** The `title` attribute gives native browser tooltips on hover with zero implementation cost. For Phase 3 this is sufficient — enhanced CSS tooltips can be added in v2 if desired. Accessibility is maintained (screen readers read `aria-label` on the button).

### Pattern 4: Video Time Sync Strategy

**What:** Two options for tracking `video.currentTime`: `timeupdate` (polling-like, ~4–66 Hz depending on system load) vs `requestVideoFrameCallback` (fires exactly once per decoded frame, Baseline 2024).

| Property | `timeupdate` | `requestVideoFrameCallback` |
|----------|-------------|----------------------------|
| Fires | Every ~100–250 ms during playback | Every decoded frame (matches video fps) |
| Data | `video.currentTime` (seconds) | `metadata.mediaTime` (seconds, more accurate) |
| Re-register | Persistent event listener | Must call `rvfc()` again in each callback |
| Browser support | All browsers, all time | Baseline 2024 (October 2024+) |
| Use case | Progress bar + marker highlight | Frame-accurate canvas drawing, frame metadata |

**Decision for Phase 3:** Use `timeupdate`. Reason: the requirement is updating a progress bar and highlighting which marker region is "current" — this does not require frame accuracy. `timeupdate` fires at sufficient frequency for smooth visual feedback. If a canvas overlay were needed (e.g., drawing face mesh results on playback), `requestVideoFrameCallback` would be appropriate. `requestVideoFrameCallback` is available in all supported browsers (Chrome 83+, Firefox 132+, Safari 18+) but adds callback re-registration boilerplate for no benefit here.

**Critical: don't put `currentTime` in React state.** Updating React state on every `timeupdate` event causes re-renders at 4–66 Hz, which is acceptable for just the progress bar but wasteful if the component tree is deep. Store in `useRef` and update only the progress bar `<div>` width via direct style mutation or a coarser state update.

### Pattern 5: Review Page Composition

**What:** The existing `Review.tsx` stub is replaced with a composed view: load session, compute+persist scorecard if missing, render `ScorecardView` + `AnnotatedPlayer`.

```tsx
// src/pages/Review.tsx (replace stub)
// Pattern: scorecard is computed lazily on first review of a session.
// If session.scorecard is null (just recorded, or old session before Phase 3), compute and persist it.

export default function ReviewPage({ sessionId, onRecordAgain }: ReviewPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    db.sessions.get(sessionId).then(async (s) => {
      if (!s) return;
      objectUrl = URL.createObjectURL(s.videoBlob);
      setVideoUrl(objectUrl);
      setSession(s);

      // Compute scorecard if not yet persisted
      if (!s.scorecard) {
        const result = aggregateScores(s.eventLog, s.durationMs);
        const dbScorecard: Scorecard = {
          overall: result.overall,
          dimensions: Object.fromEntries(
            Object.entries(result.dimensions).map(([k, v]) => [k, v.score])
          ),
        };
        await db.sessions.update(s.id, { scorecard: dbScorecard });
        setScorecard(result);
      } else {
        // Reconstruct ScorecardResult from stored Scorecard for display
        // (stored as flat scores; reconstruct with details from eventLog)
        setScorecard(aggregateScores(s.eventLog, s.durationMs));
      }
    });
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [sessionId]);

  // ... render ScorecardView + AnnotatedPlayer
}
```

**Note on `URL.revokeObjectURL`:** The current Review.tsx stub has a bug — it captures `videoUrl` in the cleanup closure at mount time (always null), so the object URL leaks. The replacement must capture `objectUrl` as a local variable inside the effect body (shown above).

### Pattern 6: eventSync.ts — Mapping currentTime to Active Events

**What:** Given the current video time and the event list, determine which events are "at or near" the cursor for highlighting.
**When to use:** Called from `AnnotatedPlayer` on `timeupdate` to highlight the nearest marker.

```typescript
// src/components/AnnotatedPlayer/eventSync.ts
import type { SessionEvent } from '../../db/db';

// Returns events within a ±1000ms window of currentTimeMs
// Used to highlight markers "near" the playhead
export function getNearbyEvents(
  events: SessionEvent[],
  currentTimeMs: number,
  windowMs = 1000
): SessionEvent[] {
  return events.filter(
    e => Math.abs(e.timestampMs - currentTimeMs) <= windowMs
  );
}

// Returns the single closest event to currentTimeMs
export function getNearestEvent(
  events: SessionEvent[],
  currentTimeMs: number
): SessionEvent | null {
  if (!events.length) return null;
  return events.reduce((closest, e) =>
    Math.abs(e.timestampMs - currentTimeMs) < Math.abs(closest.timestampMs - currentTimeMs)
      ? e : closest
  );
}
```

### Anti-Patterns to Avoid

- **Storing `video.currentTime` in React state:** Fires re-renders at timeupdate frequency (~66 Hz peak). Store in `useRef`, only update state for the progress bar indicator which needs a render.
- **Leaking object URLs:** `URL.createObjectURL` must be matched with `URL.revokeObjectURL` in the `useEffect` cleanup. The current Review.tsx stub leaks because `videoUrl` (state) is `null` when the cleanup closure captures it — fix by using a local variable in the effect.
- **Computing scorecard on every render:** `aggregateScores` walks the entire event log. Call it once in a `useEffect`, memoize with `useMemo`, or persist to Dexie (once) and read from there.
- **Calling `db.sessions.update` with the full session object:** `Table.update(id, changes)` only writes the fields in `changes`. Passing the whole session object would be equivalent but reads unnecessarily. Only pass `{ scorecard }`.
- **Placing event markers with `position: relative` on the `<video>` element:** The video element's intrinsic aspect ratio changes layout; the timeline should be a separate `<div>` below the video, not an overlay on it, to avoid z-index and resize complications.
- **Using `video.duration` before `loadedmetadata` fires:** `video.duration` is `NaN` before metadata loads. Guard all duration-dependent calculations with a check. Pass `durationMs` from the session record (already known from the Dexie record) instead of reading from the video element.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video player UI | VideoJS, Plyr, react-player | Custom 50-line component | These libraries add 100–300 KB, require separate CSS, and their marker APIs fight React's unidirectional data flow |
| Timeline / progress scrubbing | Custom time-range drag handler | `<input type="range">` or click-fraction math on a `<div>` | Click-fraction math (`(e.clientX - rect.left) / rect.width`) is 3 lines; no dragging state machine needed for Phase 3 |
| Tooltip on marker hover | Tooltip library (Radix, Floating UI) | HTML `title` attribute | Native tooltip, zero bundle cost, accessible; enough for Phase 3 |
| Score normalization library | Custom normalization utils | Hand-written pure functions | The scoring domain is simple enough (linear clamp + weighted sum); a library adds no value |
| Scorecard CSS | A charting library | Tailwind utility classes + percentage widths | A score bar is a `<div>` with `width: {score}%`; no chart needed for Phase 3 |

**Key insight:** Phase 3's UI is fundamentally simple — numbers displayed in boxes and colored dots on a bar. All complexity is in the data layer (event log → scorecard), which is pure functions. Resist the urge to reach for React animation libraries, chart libraries, or full-featured video players.

---

## Common Pitfalls

### Pitfall 1: Object URL Leak in Review Page

**What goes wrong:** `URL.createObjectURL(blob)` allocates a memory handle. If `URL.revokeObjectURL` is never called, the blob stays in memory for the lifetime of the browser tab.
**Why it happens:** The current `Review.tsx` stub captures `videoUrl` (React state) in the `useEffect` cleanup. At mount time `videoUrl` is `null`, so the cleanup is a no-op. The fix is to create a local variable `let objectUrl` inside the effect body, assign it before setting state, and revoke that local variable in the cleanup.
**Warning signs:** Memory grows across repeated navigations to the review screen.

### Pitfall 2: `video.duration` is NaN Before Metadata Loads

**What goes wrong:** `Timeline.tsx` tries to compute marker positions using `durationMs / 1000` as the total duration, but uses `videoRef.current.duration` instead of the prop, which is `NaN` until `loadedmetadata` fires.
**How to avoid:** Pass `durationMs` from the Dexie session record as a prop to `AnnotatedPlayer` and `Timeline`. This value is always available before the video element loads and equals the actual duration (set correctly by `webmFixDuration` in Phase 1).
**Warning signs:** All markers appear stacked at `left: NaN%` or at position 0.

### Pitfall 3: Scorecard Computed on Every Review (Performance)

**What goes wrong:** `aggregateScores` iterates the entire event log on every render or every navigation to the review screen.
**How to avoid:** Check `session.scorecard !== null` first. If scorecard is already persisted in Dexie, use the stored values. Only compute when `scorecard` is `null` (first review of a new session). This also satisfies SCORE-03.
**Warning signs:** Noticeable delay every time the review screen opens for an already-reviewed session.

### Pitfall 4: Missing `wpm_snapshot` Event Causes Pacing Score to Default

**What goes wrong:** If Phase 2's `handleSaveName` did not save the `wpm_snapshot` event (e.g., due to the bug fixed in quick task 260315-j5e), `scorePacing` returns `{ score: 50, detail: 'No WPM data' }`.
**Why it happens:** STATE.md quick task 260315-j5e fixed a silent data-loss bug (stopWorker before stopStream). Sessions recorded before that fix may have incomplete or empty event logs.
**How to avoid:** `scorePacing` already handles missing `wpm_snapshot` gracefully (returns 50). Log a warning in development. No special recovery needed for Phase 3.
**Warning signs:** Pacing dimension always shows 50/100 for all sessions.

### Pitfall 5: Marker Click Propagating to Timeline Bar

**What goes wrong:** Clicking a marker dot also triggers the timeline bar's click handler, causing the video to seek to the bar click position (which equals the marker position only approximately) rather than the exact marker timestamp.
**How to avoid:** Call `e.stopPropagation()` in the marker button's `onClick` handler. See the `Timeline.tsx` pattern above.
**Warning signs:** Clicking a marker seeks to a slightly wrong position.

### Pitfall 6: Scorecard `dimensions` Field Shape Mismatch

**What goes wrong:** `db.ts` declares `dimensions: Record<string, number>` but `ScorecardResult.dimensions` is typed with `DimensionScore` objects. The shape that goes into Dexie must be the flat `{ eyeContact: 82, ... }` shape, not the `{ eyeContact: { score: 82, label: '82 / 100' } }` shape.
**How to avoid:** Map `ScorecardResult.dimensions` to `Record<string, number>` before writing to Dexie (see Pattern 5). The rich `DimensionScore` type lives only in memory; only `score: number` is persisted.

---

## Code Examples

### Scoring an Eye Contact Event Array

```typescript
// Source: custom design — see Pattern 1 above
const events: SessionEvent[] = [
  { type: 'eye_contact_break', timestampMs: 5000 },
  { type: 'eye_contact_resume', timestampMs: 8000 }, // 3s away
];
const dim = scoreEyeContact(events, 60000); // 60s session
// awayMs = 3000; ratio = 1 - 3000/60000 = 0.95; score = 95
```

### Persisting Scorecard with Dexie Partial Update

```typescript
// Source: Dexie Table.update() API — partial field replacement
// Only 'scorecard' field is written; videoBlob and eventLog are untouched
await db.sessions.update(session.id, { scorecard: { overall: 78, dimensions: { ... } } });
```

### Marker Position Math

```typescript
// Source: MDN clientX / getBoundingClientRect pattern
// Event at 30s in a 120s session = left: 25%
const leftPct = (event.timestampMs / durationMs) * 100;
// style={{ left: `calc(${leftPct}% - 6px)` }} — -6px centers a 12px dot
```

### Seeking to a Timestamp

```typescript
// Source: MDN HTMLMediaElement.currentTime
videoRef.current.currentTime = event.timestampMs / 1000; // convert ms → seconds
```

### requestVideoFrameCallback (reference only — not needed for Phase 3)

```typescript
// Source: MDN requestVideoFrameCallback (Baseline 2024, October 2024+)
// metadata.mediaTime is in seconds, equivalent to video.currentTime
video.requestVideoFrameCallback((now, metadata) => {
  const currentMs = metadata.mediaTime * 1000;
  // ... update canvas overlay
  video.requestVideoFrameCallback(updateCanvas); // must re-register every frame
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<video controls>` (browser default controls) | Custom player with `<video>` + custom timeline | This phase | Enables event marker dots and click-to-seek on timeline |
| Storing `currentTime` in React state | `useRef` for currentTime, state only for progress bar | React 18+ best practice | Prevents 66 Hz re-renders |
| Computing scorecard on every page load | Compute once, persist to Dexie, read from DB on subsequent loads | This phase (SCORE-03) | O(events) computation runs once per session, not every view |
| `video.src = URL.createObjectURL(blob)` (VideoJS style) | `<video src={objectUrl}>` with `useEffect` + `revokeObjectURL` cleanup | React idiom | Prevents memory leaks |
| Complex timeline libraries | CSS `position: absolute; left: N%` | Always available | Zero bundle cost, no API to learn |

**Deprecated/outdated patterns:**
- `<video controls>` for the review page: Replaced by a custom player without browser chrome, giving space for the event marker timeline below the video.
- Large video player libraries (VideoJS, Plyr) for this use case: Overkill for a single-source, single-format (WebM) player with a custom marker bar. No CDN, no plugin system needed.

---

## Open Questions

1. **Marker density on a short timeline**
   - What we know: Events cluster around the same timestamps (e.g., multiple filler words in a 30-second window). On a short session (<2 min), many markers may overlap.
   - What's unclear: Whether overlapping dots need visual treatment (offset, cluster count badge) for Phase 3.
   - Recommendation: Ship Phase 3 with raw dots (overlap is acceptable for v1). If markers overlap significantly in real recordings, add a cluster badge in a follow-up.

2. **Scorecard weight calibration**
   - What we know: The weights (eyeContact 25%, fillers 25%, pacing 20%, expressiveness 15%, gestures 15%) are first-pass design decisions. No empirical basis yet.
   - What's unclear: Whether these weights reflect user-perceived importance.
   - Recommendation: Ship with these weights. STATE.md already documents that thresholds need tuning after first recordings. Add a note to VALIDATION.md to check "does the overall score feel right?" in the human checkpoint.

3. **Scorecard for sessions with sparse events (very short session or Phase 2 failure)**
   - What we know: A <10-second session or a session where Phase 2 worker failed will have few or no events. All dimension defaults return 50.
   - What's unclear: Whether 50/100 is a good default for no-data vs. reporting "insufficient data".
   - Recommendation: Return 50 for Phase 3 (neutral score). Display "insufficient data" in the detail field when event count is zero. Do not show a 0 score for missing data.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed) |
| Config file | `vite.config.ts` (test block) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCORE-01 | `aggregateScores` returns correct per-dimension scores for fixture event arrays | unit (pure fn) | `npx vitest run src/analysis/scorer.test.ts` | Wave 0 — create in 03-01 |
| SCORE-02 | `aggregateScores` returns weighted overall score matching formula | unit (pure fn) | `npx vitest run src/analysis/scorer.test.ts` | Wave 0 — create in 03-01 |
| SCORE-03 | `db.sessions.update(id, { scorecard })` persists scorecard; re-loading session has non-null scorecard | unit (fake-indexeddb) | `npx vitest run src/pages/Review.test.tsx` | Wave 0 — create in 03-02 |
| PLAY-01 | `AnnotatedPlayer` renders a `<video>` element with the correct `src` | component (RTL) | `npx vitest run src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` | Wave 0 — create in 03-03 |
| PLAY-02 | `Timeline` renders one marker button per event, positioned at correct `left` percentage | component (RTL) | `npx vitest run src/components/AnnotatedPlayer/Timeline.test.tsx` | Wave 0 — create in 03-03 |
| PLAY-03 | Clicking a marker button calls `onSeek` with the event's `timestampMs` | component (RTL) | `npx vitest run src/components/AnnotatedPlayer/Timeline.test.tsx` | Wave 0 — create in 03-03 |
| PLAY-04 | Each marker button has `title` attribute matching the event description | component (RTL) | `npx vitest run src/components/AnnotatedPlayer/Timeline.test.tsx` | Wave 0 — create in 03-03 |
| Scoring calibration | Visual spot-check: 5 filler words in 5 minutes = ~67 score, 130 wpm = 100 | manual | n/a — verify in human checkpoint | manual-only |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/analysis/scorer.test.ts` — covers SCORE-01 and SCORE-02 (pure function unit tests with fixture event arrays)
- [ ] `src/pages/Review.test.tsx` — covers SCORE-03 (Dexie update with fake-indexeddb)
- [ ] `src/components/AnnotatedPlayer/AnnotatedPlayer.test.tsx` — covers PLAY-01
- [ ] `src/components/AnnotatedPlayer/Timeline.test.tsx` — covers PLAY-02, PLAY-03, PLAY-04

**Existing infrastructure:** Vitest, `@testing-library/react`, `fake-indexeddb`, and `@testing-library/jest-dom` are all already installed and configured via `vite.config.ts` + `src/test-setup.ts`. No new packages needed.

---

## Sources

### Primary (HIGH confidence)

- MDN `HTMLVideoElement.requestVideoFrameCallback()` — https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback — browser support (Baseline 2024, October 2024+), `metadata.mediaTime` parameter
- MDN `HTMLMediaElement.currentTime` — https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime — seeking by writing `currentTime`
- MDN `HTMLMediaElement: timeupdate event` — https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/timeupdate_event — event frequency behavior
- Dexie Table.update() pattern — already verified in Phase 2 research; partial field update confirmed
- Phase 1 confirmed: `webmFixDuration` produces finite, seekable WebM — no Infinity duration issue in Phase 3
- Phase 2 confirmed: `wpm_snapshot` event at `timestampMs = durationMs` is the pacing data source
- `src/db/db.ts` (project file) — `Scorecard` interface (`overall: number; dimensions: Record<string, number>`) already defined, `scorecard: Scorecard | null` already in `Session` interface

### Secondary (MEDIUM confidence)

- Microsoft Speaker Coach documentation — https://support.microsoft.com/en-us/office/suggestions-from-speaker-coach-25e7d866-c895-4aa1-9b90-089b70a4ea38 — 100–165 wpm recommendation
- VirtualSpeech WPM article — https://virtualspeech.com/blog/average-speaking-rate-words-per-minute — 120–160 wpm presentation sweet spot
- Mux React video heatmap article — https://www.mux.com/blog/react-video-heatmap-track-playback-progress — `useRef` pattern for currentTime to avoid re-renders
- Freshman.tech custom HTML5 video player — https://freshman.tech/custom-html5-video/ — click-fraction seek pattern

### Tertiary (LOW confidence)

- Scoring weights (eyeContact 25%, fillers 25%, pacing 20%, expressiveness 15%, gestures 15%) — custom design decision; no published standard
- Filler word penalty curve (6 fillers/min = 0 score) — derived from general presentation coaching guidance; no published formula
- Gesture penalty curve (8 points per event) — custom design; no published standard

---

## Metadata

**Confidence breakdown:**

- Standard stack (no new deps): HIGH — all APIs already in use or browser-native
- Video player pattern (timeupdate, currentTime, createObjectURL): HIGH — verified against MDN
- requestVideoFrameCallback availability: HIGH — Baseline 2024, documented in MDN
- Dexie partial update: HIGH — confirmed in Phase 2 research, same `update()` call
- Scoring formulas: MEDIUM for benchmarks (WPM range from authoritative sources); LOW for weight values and penalty curves (design decisions with no calibrated baseline)
- Timeline CSS positioning: HIGH — standard CSS pattern, no library required

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (30 days; stable APIs, no fast-moving dependencies)
