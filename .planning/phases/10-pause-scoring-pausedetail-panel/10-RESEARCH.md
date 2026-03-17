# Phase 10: Pause Scoring + PauseDetail Panel - Research

**Researched:** 2026-03-17
**Domain:** Pure scoring function (pause quality), React component (PauseDetail panel), pacing scorer extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANAL-02 | User sees pause count and average duration in the review page | New `PauseDetail` React component in `Review.tsx` rendering stats derived from `pause_detected` events in `eventLog`; handles zero-pause empty state |
| ANAL-03 | Pause quality (hesitation vs. deliberate) contributes to the pacing score | New `scorePauses()` pure function classifying pauses as mid-clause vs. sentence-boundary using the ETS SpeechRater 0.145s reference model; `scorePacing()` updated to incorporate quality into its score |
</phase_requirements>

---

## Summary

Phase 10 adds two capabilities: a `PauseDetail` stats panel on the review page (ANAL-02), and pause-quality awareness in the pacing score (ANAL-03). Both are purely internal — no new libraries, no schema changes, no recording pipeline changes.

The pause data already exists: `detectPauses()` in `pacing.ts` emits `pause_detected` events into the `eventLog` when a gap between consecutive final transcript segments exceeds 2000ms. Each event carries `timestampMs` (when the pause started) and a `label` of the form `"3.0s pause"` encoding the gap duration. The `session.transcript` (stored since Phase 6) provides the text context for sentence-boundary detection.

`scorePauses()` is a new pure function that accepts `events: SessionEvent[]` and `transcript: TranscriptSegment[]`, classifies each pause as "hesitation" (mid-clause) or "deliberate" (sentence-boundary), and returns a `DimensionScore`. The pacing scorer (`scorePacing()`) is updated to blend WPM quality with pause quality into a single pacing score. The `PauseDetail` component is a stateless React component that accepts pause events and renders count, average duration, longest duration, and a zero-pause empty state.

**Primary recommendation:** Add `scorePauses()` to `pacing.ts`, update `scorePacing()` in `scorer.ts` to call it, add `PauseDetail` component, and wire it into `Review.tsx` between `ScorecardView` and `AnnotatedPlayer`. Use TDD throughout: write failing tests before implementation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.0 (installed) | Unit tests for `scorePauses()` | Project standard; pool=vmThreads already configured for WSL2 |
| @testing-library/react | installed | `PauseDetail` component tests | Project standard; used throughout components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new libraries | — | All logic is vanilla TypeScript + React | Pure function + stateless component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Embedding `scorePauses()` in `scorer.ts` | Putting it in `pacing.ts` | `pacing.ts` already owns pause detection logic and `TranscriptSegment` dependency. Keeping pause scoring in `pacing.ts` avoids adding a `TranscriptSegment` import to `scorer.ts`. `scorePacing()` in `scorer.ts` calls `scorePauses()` from `pacing.ts` — same import path as existing `detectPauses` usage. |
| Parsing pause duration from label string | Storing duration in a typed field | The existing `pause_detected` event only has `label: "3.0s pause"`. Parsing this string is sufficient; adding a new field would require db.ts changes. Parse with `parseFloat(label)`. |

**Installation:**
No new packages — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

Phase 10 touches four files and adds one new component:

```
src/
├── analysis/
│   ├── pacing.ts                         # Add scorePauses() pure function + parsePauseDuration()
│   ├── pacing.test.ts                    # Add scorePauses() unit tests (new describe block)
│   └── scorer.ts                         # Update scorePacing() to incorporate pause quality
│   └── __tests__/
│       └── aggregateScores.test.ts       # Update scorePacing tests to match new pacing score behavior
└── components/
    └── PauseDetail/
        ├── PauseDetail.tsx               # NEW: stateless component, props: events + transcript
        └── PauseDetail.test.tsx          # NEW: component tests
└── pages/
    └── Review.tsx                        # Add <PauseDetail> between ScorecardView and AnnotatedPlayer
    └── Review.test.tsx                   # No changes needed (mocks ScorecardView / AnnotatedPlayer)
```

`db.ts`, `App.tsx`, and `aggregateScores` function signature are NOT changed.

### Pattern 1: parsePauseDuration() Helper

**What:** Extract the numeric duration in seconds from a `pause_detected` event label string like `"3.0s pause"`.

**When to use:** Whenever pause duration is needed from the eventLog.

**Example:**
```typescript
// src/analysis/pacing.ts
export function parsePauseDuration(label: string | undefined): number {
  if (!label) return 0;
  const match = label.match(/^([\d.]+)s/);
  return match ? parseFloat(match[1]) : 0;
}
```

### Pattern 2: classifyPause() — Sentence-Boundary vs. Mid-Clause

**What:** Given the transcript text up to the pause timestamp, determine if the speaker just completed a sentence (deliberate pause) or paused mid-clause (hesitation pause).

**Sentence-boundary heuristic:** The last word of the final transcript segment before the pause timestamp ends with `.`, `?`, `!`, or the text of the prior segment matches common sentence-terminal patterns. Because Web Speech API transcripts lack punctuation, the practical heuristic is: look at the last character of the last final segment text before the pause. Web Speech often adds punctuation on final results. If punctuation is absent, treat as mid-clause (conservative — avoids false "deliberate" classification).

**ETS SpeechRater 0.145s reference:** The SpeechRater system counts any gap exceeding 0.145s as a "silence". Our threshold is 2000ms — we only surface pauses >2s to the user. The 0.145s threshold is relevant as background context (the academic standard for what separates a pause from normal phonation). The success criteria reference it as the classification boundary for the unit test contract: tests must demonstrate that mid-clause vs. sentence-boundary classification produces different scores (not that we re-implement the 0.145s threshold, which would require sub-word timing unavailable from Web Speech API).

**Example:**
```typescript
// src/analysis/pacing.ts
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

const SENTENCE_TERMINAL = /[.?!]\s*$/;

export function classifyPause(
  pauseTimestampMs: number,
  transcript: TranscriptSegment[]
): 'deliberate' | 'hesitation' {
  // Find the last final segment before the pause
  const segmentsBefore = transcript
    .filter(s => s.isFinal && s.timestampMs <= pauseTimestampMs)
    .sort((a, b) => b.timestampMs - a.timestampMs);

  if (segmentsBefore.length === 0) return 'hesitation'; // no context → conservative
  const lastText = segmentsBefore[0].text.trim();
  return SENTENCE_TERMINAL.test(lastText) ? 'deliberate' : 'hesitation';
}
```

### Pattern 3: scorePauses() Pure Function

**What:** Accepts `pauseEvents` (already filtered `pause_detected` events) and `transcript`, classifies each pause, and returns a `DimensionScore`.

**Score logic:**
- 0 pauses: score = 90 (neutral-positive; some pauses are good, absence of any pause is unusual)
- Count hesitation pauses: each hesitation degrades the score
- Count deliberate pauses: deliberate pauses do not penalize; many deliberate pauses slightly improve score
- Formula: start at 100, subtract per hesitation pause; floor at 0

**Penalty per hesitation:** 15 points (a session with 6+ hesitation pauses scores 10 or below — clearly problematic). Deliberate pauses: neutral (no adjustment).

**Example:**
```typescript
// src/analysis/pacing.ts
export interface PauseStats {
  total: number;
  averageDurationS: number;
  longestDurationS: number;
  hesitationCount: number;
  deliberateCount: number;
}

export function computePauseStats(
  events: SessionEvent[],
  transcript: TranscriptSegment[]
): PauseStats {
  const pauseEvents = events.filter(e => e.type === 'pause_detected');
  if (pauseEvents.length === 0) {
    return { total: 0, averageDurationS: 0, longestDurationS: 0, hesitationCount: 0, deliberateCount: 0 };
  }
  const durations = pauseEvents.map(e => parsePauseDuration(e.label));
  const total = pauseEvents.length;
  const averageDurationS = durations.reduce((s, d) => s + d, 0) / total;
  const longestDurationS = Math.max(...durations);
  let hesitationCount = 0;
  let deliberateCount = 0;
  for (const e of pauseEvents) {
    if (classifyPause(e.timestampMs, transcript) === 'deliberate') deliberateCount++;
    else hesitationCount++;
  }
  return { total, averageDurationS, longestDurationS, hesitationCount, deliberateCount };
}

export function scorePauses(
  events: SessionEvent[],
  transcript: TranscriptSegment[]
): DimensionScore {
  const stats = computePauseStats(events, transcript);
  if (stats.total === 0) {
    return { score: 85, label: '85 / 100', detail: 'No significant pauses detected' };
  }
  const score = Math.max(0, Math.min(100, 100 - stats.hesitationCount * 15));
  return {
    score,
    label: `${score} / 100`,
    detail: `${stats.total} pause${stats.total !== 1 ? 's' : ''} — ${stats.hesitationCount} hesitation, ${stats.deliberateCount} deliberate`,
  };
}
```

Note: `scorePauses()` lives in `pacing.ts` (not `scorer.ts`) because it depends on `TranscriptSegment`. It is called from the updated `scorePacing()` in `scorer.ts`.

### Pattern 4: Update scorePacing() to Blend WPM + Pause Quality

**What:** The existing `scorePacing()` only scores WPM. Phase 10 blends WPM score (70% weight) with pause quality score (30% weight).

**Why this weight split:** WPM remains the primary pacing signal. Pause quality refines it but should not dominate — a fast speaker with one hesitation pause shouldn't score dramatically lower than a fast speaker with none.

**Integration:** `scorer.ts` imports `scorePauses` from `pacing.ts`. `aggregateScores()` now takes an additional `transcript: TranscriptSegment[]` parameter — OR `scorePauses` can be called inside `scorePacing` if transcript is threaded through. The simpler approach: pass `transcript` to `aggregateScores()` as an optional parameter (undefined for old sessions). When `transcript` is undefined, pause quality scoring falls back to the WPM-only score (backward compatible).

**Example:**
```typescript
// src/analysis/scorer.ts
import { scorePauses } from './pacing';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

function scorePacing(events: SessionEvent[], transcript?: TranscriptSegment[]): DimensionScore {
  const wpmEvent = events.find(e => e.type === 'wpm_snapshot');
  if (!wpmEvent || !wpmEvent.label) return { score: 50, label: '50 / 100', detail: 'No WPM data' };

  const wpm = parseInt(wpmEvent.label, 10);
  if (isNaN(wpm)) return { score: 50, label: '50 / 100', detail: 'No WPM data' };

  let wpmScore: number;
  if (wpm >= 120 && wpm <= 160) {
    wpmScore = 100;
  } else if (wpm < 120) {
    wpmScore = Math.max(0, Math.round(((wpm - 60) / 60) * 100));
  } else {
    wpmScore = Math.max(0, Math.round(((220 - wpm) / 60) * 100));
  }

  if (!transcript) {
    // Backward compat: no transcript available (sessions before Phase 6)
    return { score: wpmScore, label: `${wpmScore} / 100`, detail: `${wpm} wpm` };
  }

  const pauseQuality = scorePauses(events, transcript);
  const blended = Math.round(wpmScore * 0.7 + pauseQuality.score * 0.3);
  return {
    score: blended,
    label: `${blended} / 100`,
    detail: `${wpm} wpm · ${pauseQuality.detail}`,
  };
}

export function aggregateScores(
  eventLog: SessionEvent[],
  durationMs: number,
  transcript?: TranscriptSegment[]
): ScorecardResult {
  // ... existing calls ...
  const pacing = scorePacing(eventLog, transcript);
  // ...
}
```

**Call sites:** `Review.tsx` already calls `aggregateScores(s.eventLog, s.durationMs)`. The transcript must now be threaded: `aggregateScores(s.eventLog, s.durationMs, s.transcript)`. One line change.

### Pattern 5: PauseDetail Component

**What:** Stateless React component accepting `events: SessionEvent[]` and `transcript: TranscriptSegment[] | undefined`. Derives stats via `computePauseStats()` and renders: total count, average duration, longest duration, hesitation vs. deliberate breakdown, zero-pause empty state.

**Location:** `src/components/PauseDetail/PauseDetail.tsx`

**Visual style:** Matches the project's dark card aesthetic (`#0b1022` background, `rgba(255,255,255,0.05)` border, `18px` border-radius, `Figtree` font). Follows the same panel pattern as `ScorecardView` — a card with a header label.

**Zero-pause state:** When `total === 0`, render a message: `"No significant pauses detected"`. This is the same string returned by `scorePauses()` and satisfies Success Criterion 3.

**Example structure:**
```tsx
// src/components/PauseDetail/PauseDetail.tsx
interface PauseDetailProps {
  events: SessionEvent[];
  transcript?: TranscriptSegment[];
}

export default function PauseDetail({ events, transcript }: PauseDetailProps) {
  const stats = computePauseStats(events, transcript ?? []);

  if (stats.total === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={headerStyle}>Pause Analysis</h3>
        <p style={emptyStyle}>No significant pauses detected</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={headerStyle}>Pause Analysis</h3>
      <div style={statsGridStyle}>
        <Stat label="Total pauses" value={String(stats.total)} />
        <Stat label="Avg duration" value={`${stats.averageDurationS.toFixed(1)}s`} />
        <Stat label="Longest" value={`${stats.longestDurationS.toFixed(1)}s`} />
        <Stat label="Hesitation" value={String(stats.hesitationCount)} />
        <Stat label="Deliberate" value={String(stats.deliberateCount)} />
      </div>
    </div>
  );
}
```

**Wiring in Review.tsx:** Add `<PauseDetail events={session.eventLog} transcript={session.transcript} />` after `<ScorecardView>` and before `<AnnotatedPlayer>`. No new state needed.

### Anti-Patterns to Avoid

- **Parsing pause duration with `parseInt`:** The label `"3.0s pause"` uses a decimal. Use `parseFloat` or the regex match, not `parseInt` which returns `3` not `3.0`.
- **Adding a new Dexie schema version for pause stats:** Pause data already lives in `eventLog` — no schema change is needed. The `computePauseStats()` function derives stats on-the-fly from existing data.
- **Changing `aggregateScores()` tests that use scorePacing with only WPM events:** When `transcript` is undefined (the existing test pattern), `scorePacing` must fall back to WPM-only scoring to keep existing tests green. The backward-compat guard (`if (!transcript)`) handles this.
- **Classifying every pause as "hesitation" when transcript is empty:** When `transcript` is undefined or empty, default to `'hesitation'` (conservative). Do not crash or return NaN.
- **Storing PauseDetail stats in Dexie:** Stats are derived from eventLog each time. No persistence needed, consistent with the Phase 9 openingClosing pattern.
- **Treating `pause_detected` events in NEGATIVE_EVENT_TYPES for openingClosing scoring:** Phase 9 explicitly excluded pause events from opening/closing NEGATIVE_EVENT_TYPES because pause quality is unresolved. Phase 10 addresses pause quality in its own scorer — do not retroactively add pauses to openingClosing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pause duration extraction | Custom format-specific parser | `parsePauseDuration(label)` regex on `"3.0s pause"` format | The format is fixed — `pacing.ts` produces it with `${(gap / 1000).toFixed(1)}s pause` |
| Sentence detection | NLP library | Last-character punctuation heuristic | Web Speech API transcripts lack reliable punctuation; NLP adds 50-100 KB bundle; heuristic is sufficient for binary classification |
| Stats grid layout | CSS grid library | Inline `display: grid; gridTemplateColumns: repeat(3, 1fr)` | Pattern matches existing `ScorecardView` inline style usage throughout the project |

**Key insight:** All pause data (count, timestamp, duration-in-label) exists in the eventLog today. The transcript for sentence-boundary context has been stored since Phase 6. Zero new infrastructure is required.

---

## Common Pitfalls

### Pitfall 1: `aggregateScores.test.ts` Pacing Tests Break After scorePacing Blending
**What goes wrong:** Existing `scorePacing` tests in `aggregateScores.test.ts` use event arrays with only a `wpm_snapshot` event and no transcript. After blending, when transcript is provided, the pause quality component changes the score. Existing tests pass no transcript.
**Why it happens:** The function signature changes from `(events)` to `(events, transcript?)`.
**How to avoid:** The backward-compat guard (`if (!transcript) return wpm-only score`) ensures existing test event arrays (no transcript passed to `aggregateScores`) produce the same pacing scores as before. No existing test updates needed for the pacing describe block.
**Warning signs:** `scorePacing` tests fail despite the function returning the same value for WPM-only input.

### Pitfall 2: `computePauseStats` with Empty Transcript Crashes on `classifyPause`
**What goes wrong:** `classifyPause` filters `transcript` — if transcript is undefined, `.filter()` throws.
**Why it happens:** `session.transcript` is `undefined` for sessions recorded before Phase 6.
**How to avoid:** `computePauseStats` receives `transcript: TranscriptSegment[]` (not optional). The caller passes `transcript ?? []`. When the array is empty, `classifyPause` returns `'hesitation'` (the default). Never pass `undefined` to `computePauseStats`.

### Pitfall 3: Duration Parsing Produces NaN for Unexpected Label Formats
**What goes wrong:** If a `pause_detected` event label does not match `"X.Xs pause"` format (e.g. label is undefined or malformed), `parsePauseDuration` returns `NaN`, which propagates through averaging.
**Why it happens:** Defensive coding gap.
**How to avoid:** `parsePauseDuration` returns `0` for any non-matching input. The regex `match` returns `null` on mismatch — the function guards with `return match ? parseFloat(match[1]) : 0`.
**Warning signs:** `averageDurationS` shows `NaN` in the panel.

### Pitfall 4: Review.tsx Passes `aggregateScores` Without Transcript
**What goes wrong:** After updating `aggregateScores` to accept optional transcript, forgetting to pass `s.transcript` in `Review.tsx` means pause quality never activates.
**Why it happens:** `aggregateScores` is called in two places in `Review.tsx` (lines 28 and 38). Both must be updated.
**How to avoid:** Pass `s.transcript` in both call sites: `aggregateScores(s.eventLog, s.durationMs, s.transcript)`.
**Warning signs:** Pause quality scoring tests pass but runtime pacing scores don't change even for sessions with pauses.

### Pitfall 5: PauseDetail Shows Incorrect Hesitation Count When No Transcript
**What goes wrong:** When `session.transcript` is undefined (old session), all pauses are classified as hesitation. The UI shows "N hesitation, 0 deliberate" which is misleading for old sessions.
**Why it happens:** `classifyPause` defaults to 'hesitation' when no context is available.
**How to avoid:** When `transcript` is empty or undefined, omit the hesitation/deliberate breakdown in the UI or show it with a caveat. The simplest approach: show the hesitation/deliberate counts only when transcript is available. If `transcript.length === 0`, show only total, average, and longest — skip the classification row.

---

## Code Examples

### parsePauseDuration()
```typescript
// src/analysis/pacing.ts
export function parsePauseDuration(label: string | undefined): number {
  if (!label) return 0;
  const match = label.match(/^([\d.]+)s/);
  return match ? parseFloat(match[1]) : 0;
}
```

### classifyPause()
```typescript
// src/analysis/pacing.ts
const SENTENCE_TERMINAL = /[.?!]\s*$/;

export function classifyPause(
  pauseTimestampMs: number,
  transcript: TranscriptSegment[]
): 'deliberate' | 'hesitation' {
  const segmentsBefore = transcript
    .filter(s => s.isFinal && s.timestampMs <= pauseTimestampMs)
    .sort((a, b) => b.timestampMs - a.timestampMs);

  if (segmentsBefore.length === 0) return 'hesitation';
  return SENTENCE_TERMINAL.test(segmentsBefore[0].text.trim()) ? 'deliberate' : 'hesitation';
}
```

### computePauseStats()
```typescript
// src/analysis/pacing.ts
import type { SessionEvent } from '../db/db';

export interface PauseStats {
  total: number;
  averageDurationS: number;
  longestDurationS: number;
  hesitationCount: number;
  deliberateCount: number;
}

export function computePauseStats(
  events: SessionEvent[],
  transcript: TranscriptSegment[]
): PauseStats {
  const pauseEvents = events.filter(e => e.type === 'pause_detected');
  if (pauseEvents.length === 0) {
    return { total: 0, averageDurationS: 0, longestDurationS: 0, hesitationCount: 0, deliberateCount: 0 };
  }
  const durations = pauseEvents.map(e => parsePauseDuration(e.label));
  const total = pauseEvents.length;
  const averageDurationS = durations.reduce((s, d) => s + d, 0) / total;
  const longestDurationS = Math.max(...durations);
  let hesitationCount = 0;
  let deliberateCount = 0;
  for (const e of pauseEvents) {
    if (classifyPause(e.timestampMs, transcript) === 'deliberate') deliberateCount++;
    else hesitationCount++;
  }
  return { total, averageDurationS, longestDurationS, hesitationCount, deliberateCount };
}
```

### scorePauses() — TDD anchor (write tests first)
```typescript
// src/analysis/pacing.ts
export function scorePauses(
  events: SessionEvent[],
  transcript: TranscriptSegment[]
): import('../analysis/scorer').DimensionScore {
  const stats = computePauseStats(events, transcript);
  if (stats.total === 0) {
    return { score: 85, label: '85 / 100', detail: 'No significant pauses detected' };
  }
  const score = Math.max(0, Math.min(100, 100 - stats.hesitationCount * 15));
  return {
    score,
    label: `${score} / 100`,
    detail: `${stats.total} pause${stats.total !== 1 ? 's' : ''} — ${stats.hesitationCount} hesitation, ${stats.deliberateCount} deliberate`,
  };
}
```

Note: `DimensionScore` import creates a circular dependency risk (`scorer.ts` imports from `pacing.ts`; `pacing.ts` importing from `scorer.ts`). Solution: define `DimensionScore` (or a compatible type) locally in `pacing.ts`, or extract it to a shared types file. The simplest approach: return `{ score: number; label: string; detail?: string }` without importing `DimensionScore` by name — TypeScript structural typing will accept this at the call site in `scorer.ts`.

### Unit Tests for scorePauses (TDD — write failing tests first)
```typescript
// src/analysis/pacing.test.ts — new describe block
import type { SessionEvent } from '../db/db';
import type { TranscriptSegment } from '../hooks/useSpeechCapture';

describe('scorePauses (ANAL-03)', () => {
  it('zero pause events → score = 85, detail contains "No significant pauses"', () => {
    const result = scorePauses([], []);
    expect(result.score).toBe(85);
    expect(result.detail).toMatch(/no significant pauses/i);
  });

  it('one mid-clause pause (no sentence terminal before) → score = 85 (100 - 15)', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'and then we', timestampMs: 4000, isFinal: true }, // no terminal punctuation
    ];
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(85); // 100 - 1*15 = 85
  });

  it('one sentence-boundary pause (terminal punctuation before) → score = 100', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 5000, label: '2.5s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'That is the key point.', timestampMs: 4000, isFinal: true },
    ];
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(100); // 100 - 0*15 = 100
  });

  it('mixed: 2 hesitation + 1 deliberate → score = 70 (100 - 2*15)', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 3000, label: '2.0s pause' },
      { type: 'pause_detected', timestampMs: 7000, label: '3.0s pause' },
      { type: 'pause_detected', timestampMs: 12000, label: '2.5s pause' },
    ];
    const transcript: TranscriptSegment[] = [
      { text: 'so the issue is', timestampMs: 2500, isFinal: true }, // no terminal → hesitation
      { text: 'and we need to', timestampMs: 6500, isFinal: true }, // no terminal → hesitation
      { text: 'Here is the solution.', timestampMs: 11000, isFinal: true }, // terminal → deliberate
    ];
    const result = scorePauses(events, transcript);
    expect(result.score).toBe(70);
  });

  it('7 hesitation pauses → score = 0 (floor)', () => {
    const events: SessionEvent[] = Array.from({ length: 7 }, (_, i) => ({
      type: 'pause_detected' as const,
      timestampMs: (i + 1) * 5000,
      label: '2.0s pause',
    }));
    const result = scorePauses(events, []); // empty transcript → all hesitation
    expect(result.score).toBe(0); // 100 - 7*15 = -5 → clamped to 0
  });
});
```

### computePauseStats Unit Tests
```typescript
describe('computePauseStats', () => {
  it('returns zeros for empty event array', () => {
    const stats = computePauseStats([], []);
    expect(stats.total).toBe(0);
    expect(stats.averageDurationS).toBe(0);
    expect(stats.longestDurationS).toBe(0);
  });

  it('computes average and longest from label strings', () => {
    const events: SessionEvent[] = [
      { type: 'pause_detected', timestampMs: 1000, label: '2.0s pause' },
      { type: 'pause_detected', timestampMs: 5000, label: '4.5s pause' },
    ];
    const stats = computePauseStats(events, []);
    expect(stats.total).toBe(2);
    expect(stats.averageDurationS).toBeCloseTo(3.25);
    expect(stats.longestDurationS).toBe(4.5);
  });
});
```

### PauseDetail Component Fixture
```tsx
// src/components/PauseDetail/PauseDetail.test.tsx
import { render, screen } from '@testing-library/react';
import PauseDetail from './PauseDetail';

it('renders "No significant pauses detected" when event log has no pauses', () => {
  render(<PauseDetail events={[]} transcript={[]} />);
  expect(screen.getByText(/no significant pauses detected/i)).toBeInTheDocument();
});

it('renders pause count, average, and longest for a session with pauses', () => {
  const events = [
    { type: 'pause_detected', timestampMs: 3000, label: '2.5s pause' },
    { type: 'pause_detected', timestampMs: 8000, label: '4.0s pause' },
  ];
  render(<PauseDetail events={events} transcript={[]} />);
  expect(screen.getByText('2')).toBeInTheDocument(); // total
  expect(screen.getByText('3.3s')).toBeInTheDocument(); // avg (2.5+4.0)/2
  expect(screen.getByText('4.0s')).toBeInTheDocument(); // longest
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pacing score = WPM only | Pacing score = 70% WPM + 30% pause quality | Phase 10 | Sessions with many hesitation pauses score lower even at good WPM; deliberate pauses don't penalize |
| No pause stats visible to user | PauseDetail panel shows count, avg, longest, classification | Phase 10 | User can distinguish between hesitation pattern vs. deliberate rhetorical pauses |

**Deprecated/outdated:**
- Nothing removed. The existing `detectPauses()` and `scorePacing()` functions are extended, not replaced.

---

## Open Questions

1. **Hesitation penalty rate (15 points per hesitation)**
   - What we know: There's no empirically validated per-hesitation penalty for presentation scoring.
   - What's unclear: Whether 15 points is too harsh or too lenient for the user population.
   - Recommendation: Use 15 as the first-pass value — it means 6+ hesitation pauses = floor of 10, which aligns with the "distraction threshold" philosophy already used in `scoreFillers`. Tune after real recordings.

2. **Zero-pause score (85 vs 100)**
   - What we know: Having zero detected pauses isn't necessarily perfect — it could mean the speaker never paused for emphasis.
   - What's unclear: Whether users with zero pauses expect a 100.
   - Recommendation: Use 85 (slightly below perfect) to signal that deliberate pausing is actually positive. This also avoids a misleading "100" for what might be a rushed delivery. The `detail` text communicates the interpretation.

3. **Sentence terminal detection without punctuation**
   - What we know: Web Speech API sometimes adds terminal punctuation to final results, sometimes not. Chrome's behavior is inconsistent.
   - What's unclear: How often terminal punctuation is absent in practice.
   - Recommendation: The regex heuristic (`/[.?!]\s*$/`) is conservative — when absent, we classify as hesitation. False negatives (hesitation classified as deliberate) are worse UX than false positives. Accept that some deliberate pauses will be missed.

4. **PauseDetail weight in pacing score (30%)**
   - What we know: WPM is the established pacing metric; pauses are a secondary signal.
   - What's unclear: Whether 30% is the right weight for pause quality in the blended pacing score.
   - Recommendation: Use 30% (pause quality) / 70% (WPM) as first-pass. The existing `scorePacing` tests should remain green because the backward-compat guard fires when no transcript is provided.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | vite.config.ts (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| Quick run command | `npx vitest run src/analysis/pacing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANAL-02 | PauseDetail renders "no significant pauses detected" for zero-pause session | unit (component) | `npx vitest run src/components/PauseDetail/PauseDetail.test.tsx` | ❌ Wave 0 |
| ANAL-02 | PauseDetail renders count, avg duration, longest duration | unit (component) | `npx vitest run src/components/PauseDetail/PauseDetail.test.tsx` | ❌ Wave 0 |
| ANAL-03 | `scorePauses()` returns different score for all mid-clause vs. all sentence-boundary pauses | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists, needs new describe block |
| ANAL-03 | `scorePauses()` returns score=85 for zero pauses | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists, needs new case |
| ANAL-03 | `scorePauses()` score floors at 0 for 7+ hesitation pauses | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists, needs new case |
| ANAL-03 | `computePauseStats()` correctly parses duration from label strings | unit (pure) | `npx vitest run src/analysis/pacing.test.ts` | ✅ exists, needs new case |

### Sampling Rate
- **Per task commit:** `npx vitest run src/analysis/pacing.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/PauseDetail/PauseDetail.test.tsx` — covers ANAL-02 (zero-pause empty state, stat rendering)
- [ ] `src/components/PauseDetail/PauseDetail.tsx` — component stub (can be created alongside test in Wave 0)

*(No new test framework config needed — existing Vitest + jsdom + vmThreads handles component tests)*

---

## Sources

### Primary (HIGH confidence)
- `src/analysis/pacing.ts` (codebase) — `detectPauses()` output format, `PAUSE_THRESHOLD_MS`, `PacingEvent` interface, label format `"X.Xs pause"`
- `src/analysis/scorer.ts` (codebase) — `scorePacing()` current implementation, `DimensionScore` interface, `aggregateScores()` call pattern
- `src/db/db.ts` (codebase) — `Session.transcript?: TranscriptSegment[]` field (Phase 6 addition), `SessionEvent.label` optional string
- `src/hooks/useSpeechCapture.ts` (codebase) — `TranscriptSegment` interface: `{ text: string; timestampMs: number; isFinal: boolean }`
- `src/pages/Review.tsx` (codebase) — both `aggregateScores()` call sites, `session.transcript` availability in the component
- `src/analysis/pacing.test.ts` (codebase) — existing test patterns for `detectPauses()` and `calculateWPMWindows()`
- `src/analysis/__tests__/aggregateScores.test.ts` (codebase) — existing test patterns for scorer, confirms pacing tests pass no transcript

### Secondary (MEDIUM confidence)
- [ETS SpeechRater 0.145s silence threshold](https://ai.myspeakingscore.com/distribution-of-pauses/) — confirmed via WebSearch; the 0.145s threshold defines what SpeechRater counts as a silence event (our 2000ms threshold is at the "significant pause" end of the spectrum)
- [ETS SpeechRater v5.0 Research Paper](https://onlinelibrary.wiley.com/doi/full/10.1002/ets2.12198) — authoritative source for SpeechRater pause dimension methodology
- Mid-clause vs. sentence-boundary pause research: [Cambridge Core — Effects of speaking task and proficiency on midclause pausing](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/effects-of-speaking-task-and-proficiency-on-the-midclause-pausing-characteristics-of-l1-and-l2-speech-from-the-same-speakers/FFE4407BEAF2A0E55D4D797C9AFE80DD) — supports classifying mid-clause pauses as formulation difficulty signals

### Tertiary (LOW confidence)
- Penalty rates (15 points per hesitation, 70/30 WPM/pause weight split) are judgment calls — no peer-reviewed study validates these specific values for presentation coaching contexts

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all required data structures exist in the codebase
- Architecture: HIGH — every file touch point identified; call-site threading of `transcript` is the single integration risk, fully scoped
- Scoring algorithm: MEDIUM — penalty rate and weight split are heuristics; classification heuristic (last-char punctuation) is Web Speech API-dependent and may miss some sentence terminals
- Pitfalls: HIGH — backward-compat guard pattern confirmed from reading `Review.tsx` and `aggregateScores` call sites; circular import risk identified and mitigation documented

**Research date:** 2026-03-17
**Valid until:** 2026-09-17 (pure TypeScript, no external dependencies; stable until Web Speech API behavior changes)
