# Phase 9: Opening/Closing Strength - Research

**Researched:** 2026-03-16
**Domain:** Pure scoring function, TypeScript interface extension, React component extension
**Confidence:** HIGH

---

## Summary

Phase 9 adds a sixth scorecard dimension — "Opening/Closing Strength" — by scoring the event density and quality in the first 30 seconds and last 30 seconds of each session's existing `eventLog`. This is an entirely internal computation: no new browser APIs, no new libraries, and no changes to the recording pipeline. The eventLog is already sorted by `timestampMs` and stored in IndexedDB from Phase 2.

The core deliverable is a pure function `scoreOpeningClosing(eventLog, durationMs)` in `src/analysis/scorer.ts` that produces a `DimensionScore`. The function partitions events into an opening window (`0–30000ms`), a closing window (`durationMs - 30000ms` to `durationMs`), scores each half independently, and returns their weighted average. The function must return a meaningful edge-case state when `durationMs < 60000ms` (the two windows would overlap or one is absent).

The second deliverable is extending `ScorecardResult` in `scorer.ts` to include the `openingClosing` dimension and updating `ScorecardView` to render a seventh row. The `aggregateScores()` function gains the new call and the overall score gains a weight contribution for the new dimension.

**Primary recommendation:** Add `scoreOpeningClosing()` to `scorer.ts`, extend `ScorecardResult.dimensions`, update `DIMENSIONS` array in `ScorecardView`, and write TDD unit tests first.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANAL-01 | User sees opening/closing strength as a new scorecard dimension (first/last 30s scored from existing event log) | `scoreOpeningClosing()` pure function over existing `eventLog` + `durationMs`; extending `ScorecardResult` type; adding a row to `ScorecardView`; weight contribution to `aggregateScores()` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.0 (already installed) | Unit tests for `scoreOpeningClosing()` | Project standard; pool=vmThreads already configured for WSL2 |
| @testing-library/react | already installed | ScorecardView component test update | Project standard; used in `ScorecardView.test.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new libraries needed | — | All logic is vanilla TypeScript | Pure function over existing `SessionEvent[]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Adding to `aggregateScores()` weight set | New standalone scorer | A standalone scorer would orphan `openingClosing` from the overall score. Extending the weight map keeps all score aggregation in one place. |
| Scoring opening and closing as a single average | Scoring them independently and compositing | Independent scoring satisfies Success Criterion 2 (strong opening + weak closing = different score than reverse). |

**Installation:**
No new packages needed — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
Phase 9 touches three files and adds no new files:

```
src/
├── analysis/
│   └── scorer.ts              # Add scoreOpeningClosing(), extend ScorecardResult, update aggregateScores()
│   └── __tests__/
│       └── aggregateScores.test.ts  # Add scoreOpeningClosing unit tests (new describe block)
└── components/
    └── ScorecardView/
        └── ScorecardView.tsx  # Add 'openingClosing' to DIMENSIONS array
        └── ScorecardView.test.tsx  # Update fixture + assertions for 6 dimensions
```

`Review.tsx` and `App.tsx` do NOT need changes — `aggregateScores()` is already called with `(eventLog, durationMs)` and its return value is used directly.

### Pattern 1: scoreOpeningClosing() Pure Function

**What:** Partitions the `eventLog` by time into an opening segment (0–30s) and closing segment (last 30s), scores each independently using a consistent penalty metric, then returns a weighted composite `DimensionScore`.

**Scoring metric:** Negative-event density. The opening and closing windows are high-stakes moments — nervous gestures, filler words, and eye contact breaks during them signal a weak delivery. The score starts at 100 and applies per-event penalties scaled to window duration. Positive events (good eye contact coverage) can contribute to keep the score from going to zero on short but clean segments.

**Short-session guard:** When `durationMs < 60000` (less than 60 seconds), the two 30-second windows would overlap. The function returns a `DimensionScore` with `score: null` equivalent — specifically `{ score: 0, label: 'N/A', detail: 'Session too short' }` is insufficient because it would penalize the overall score. The correct approach is to return a sentinel `DimensionScore` with `detail: 'Session too short (< 60s)'` and a neutral score of `50` so the dimension does not unfairly drag down the overall. The `ScorecardView` should render the `detail` string in place of the bar.

**When `durationMs === 0`:** Return `{ score: 50, label: '50 / 100', detail: 'No data' }` consistent with all other dimension guards.

**Example:**
```typescript
// src/analysis/scorer.ts
const NEGATIVE_EVENT_TYPES = new Set([
  'filler_word',
  'face_touch',
  'body_sway',
  'eye_contact_break',
]);

function scoreSegment(
  events: SessionEvent[],
  startMs: number,
  endMs: number
): number {
  const windowMs = endMs - startMs;
  if (windowMs <= 0) return 50;

  const windowEvents = events.filter(
    e => e.timestampMs >= startMs && e.timestampMs < endMs
  );

  // Penalty: negative events per minute in window, scaled to 0–100
  // 0 negatives/min = 100; 6+ negatives/min = 0 (same scale as filler scorer)
  const negativeEvents = windowEvents.filter(e => NEGATIVE_EVENT_TYPES.has(e.type));
  const negPerMin = negativeEvents.length / (windowMs / 60000);
  return Math.max(0, Math.round(100 - (negPerMin / 6) * 100));
}

export function scoreOpeningClosing(
  events: SessionEvent[],
  durationMs: number
): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };

  const WINDOW_MS = 30000;

  // Short-session guard: windows would overlap
  if (durationMs < WINDOW_MS * 2) {
    return {
      score: 50,
      label: '50 / 100',
      detail: 'Session too short (< 60s)',
    };
  }

  const openingScore = scoreSegment(events, 0, WINDOW_MS);
  const closingScore = scoreSegment(events, durationMs - WINDOW_MS, durationMs);

  // Weighted: opening 60%, closing 40% (opening matters slightly more)
  const score = Math.round(openingScore * 0.6 + closingScore * 0.4);

  return {
    score,
    label: `${score} / 100`,
    detail: `Opening ${openingScore}, Closing ${closingScore}`,
  };
}
```

**Weight justification:** Opening (60%) weighted higher because first impressions dominate audience perception. This is consistent with public speaking research showing the first impression forms in the opening 30 seconds and is difficult to reverse.

### Pattern 2: Extend ScorecardResult

**What:** Add `openingClosing: DimensionScore` to the `dimensions` object in `ScorecardResult`.

**TypeScript impact:** `ScorecardResult.dimensions` is currently typed as an inline object type with five named fields. Adding `openingClosing` is additive. All consumers that do `Object.entries(result.dimensions)` (e.g. `Review.tsx` when persisting to Dexie) continue to work without changes — they iterate over whatever keys are present.

**The `Scorecard` interface in `db.ts`:** `Scorecard.dimensions` is typed as `Record<string, number>` (not the strongly-typed `DimensionScore` object — only the score numbers are stored in IndexedDB). Adding `openingClosing` to `ScorecardResult` automatically flows into the `db.sessions.update` call in `Review.tsx` because it uses `Object.fromEntries(Object.entries(result.dimensions).map(([k, v]) => [k, v.score]))`. No db.ts changes needed.

**Example:**
```typescript
// src/analysis/scorer.ts
export interface ScorecardResult {
  overall: number;
  dimensions: {
    eyeContact: DimensionScore;
    expressiveness: DimensionScore;
    gestures: DimensionScore;
    fillers: DimensionScore;
    pacing: DimensionScore;
    openingClosing: DimensionScore;  // NEW — ANAL-01
  };
}
```

### Pattern 3: Update aggregateScores() with New Weight

**What:** Call `scoreOpeningClosing()` and include its score in the weighted overall. The existing five weights sum to 1.0. Adding a sixth dimension requires redistributing weights.

**Recommended weight redistribution:**

| Dimension | Old Weight | New Weight | Rationale |
|-----------|-----------|-----------|-----------|
| eyeContact | 0.25 | 0.22 | Slightly reduced — still the primary signal |
| fillers | 0.25 | 0.22 | Slightly reduced |
| pacing | 0.20 | 0.18 | Slightly reduced |
| expressiveness | 0.15 | 0.14 | Slightly reduced |
| gestures | 0.15 | 0.14 | Slightly reduced |
| openingClosing | — | 0.10 | New dimension at modest weight |

Total: 0.22 + 0.22 + 0.18 + 0.14 + 0.14 + 0.10 = 1.00

Note: The existing `aggregateScores.test.ts` has a test that expects `overall = 69` with specific dimension scores. This test will break because weight distribution changed. The test comment documents the computation, so it must be updated with new expected values. This is expected breakage, not a regression.

### Pattern 4: Extend ScorecardView DIMENSIONS Array

**What:** Add one entry to the `DIMENSIONS` constant array in `ScorecardView.tsx`. The component already maps over this array to render dimension rows, so adding an entry is sufficient.

**Example:**
```typescript
// src/components/ScorecardView/ScorecardView.tsx
const DIMENSIONS: { key: keyof ScorecardResult['dimensions']; label: string }[] = [
  { key: 'eyeContact', label: 'Eye Contact' },
  { key: 'fillers', label: 'Filler Words' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'expressiveness', label: 'Expressiveness' },
  { key: 'gestures', label: 'Nervous Gestures' },
  { key: 'openingClosing', label: 'Opening / Closing' },  // NEW
];
```

### Anti-Patterns to Avoid

- **Adding openingClosing to the DIMENSIONS array before extending ScorecardResult:** TypeScript's `keyof ScorecardResult['dimensions']` constraint will produce a compile error if `openingClosing` is not in the interface. Add to type first, then component.
- **Using a hard zero for short sessions:** `score: 0` on the short-session guard would penalize the overall score for sessions under 60 seconds. Use `score: 50` (neutral) so the dimension does not distort the overall for quick test recordings.
- **Treating `eye_contact_resume` events as positive in the window scorer:** The eventLog has both `eye_contact_break` and `eye_contact_resume` event types. Only break events (and filler_word, face_touch, body_sway) are penalty events. Mistakenly including `eye_contact_resume` as a negative event doubles the penalty for eye contact breaks.
- **Including `wpm_snapshot` or `pause_detected` in NEGATIVE_EVENT_TYPES:** These events are pacing signals, not negative delivery indicators in the opening/closing context. The opening/closing score targets audience impression, not pacing mechanics.
- **Forgetting to update the overall weight calculation test:** The `aggregateScores` describe block's "mixed scores → overall = 69" test hardcodes expected values that depend on the five-dimension weights. It MUST be updated when weights change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event filtering by time window | Custom time-bucketing loop | Simple `Array.filter` on `timestampMs` | The eventLog is small (hundreds of events max) — no optimization needed |
| Opening/closing score persistence | New Dexie field | Existing `Scorecard.dimensions: Record<string, number>` mechanism | `Review.tsx` already persists all dimension scores via `Object.entries(result.dimensions)` — the new dimension flows through automatically |

**Key insight:** Phase 9 requires zero infrastructure changes. Every required piece (eventLog in IndexedDB, aggregateScores pattern, DimensionScore type, ScorecardView DIMENSIONS loop, Scorecard persistence in Review.tsx) was built by earlier phases. The work is purely additive.

---

## Common Pitfalls

### Pitfall 1: Window Overlap for Sessions 30–59 Seconds
**What goes wrong:** For a 45-second session, the opening window is 0–30s and the closing window would be 15–45s. These windows overlap by 15 seconds, so events in that overlap zone get double-counted in both scores.
**Why it happens:** Not checking `durationMs < 60000` before computing closing window start.
**How to avoid:** The short-session guard (`durationMs < WINDOW_MS * 2`) MUST return early before any window computation.
**Warning signs:** Success Criterion 3 fails — sessions under 60s produce scores instead of the "too short" state.

### Pitfall 2: Closing Window Start Calculation Off-By-One
**What goes wrong:** `closingStart = durationMs - 30000` could be negative for very short sessions. Or if `durationMs` is exactly 60000, `closingStart = 30000` and the two windows exactly adjoin (no overlap, no gap) — this is correct and should NOT trigger the short-session guard.
**Why it happens:** Confusion about whether a 60-second session should show the dimension.
**How to avoid:** The guard is `durationMs < 60000` (strictly less than 60s). A 60-second session has exactly two non-overlapping 30-second windows.
**Warning signs:** 60-second test sessions showing "too short" state.

### Pitfall 3: TypeScript Compile Error After ScorecardResult Extension
**What goes wrong:** `ScorecardView.test.tsx` fixture `fixtureScorecard: ScorecardResult` is missing the `openingClosing` field — TypeScript will reject it.
**Why it happens:** The fixture was created before the new dimension existed.
**How to avoid:** Add `openingClosing: { score: X, label: 'X / 100', detail: '...' }` to `fixtureScorecard` in `ScorecardView.test.tsx` as part of the same task that extends `ScorecardResult`.
**Warning signs:** TypeScript compile errors in the test file on CI.

### Pitfall 4: Existing "mixed scores → overall = 69" Test Breaks
**What goes wrong:** The test in `aggregateScores.test.ts` hardcodes `expect(result.overall).toBe(69)`. When weights change to accommodate the new dimension, this value changes.
**Why it happens:** Weight redistribution changes all weighted contributions.
**How to avoid:** Recompute the expected overall using the new weights. The comment in the test already documents the per-dimension scores (eyeContact=80, fillers=60, pacing=100, expressiveness=50, gestures=44) — the openingClosing score for that event set can be computed and added to the expected value calculation.
**Warning signs:** `aggregateScores` overall test fails after weight update.

### Pitfall 5: "Session too short" State Shows Bar at 0% Width
**What goes wrong:** The `ScorecardView` dimension bar renders with `width: 50%` (for the neutral score 50) but the `detail` text says "Session too short (< 60s)". The bar at 50% with a "too short" message is visually misleading.
**Why it happens:** The component uses `dim.score` for bar width without checking for the short-session state.
**How to avoid:** Two acceptable approaches: (1) Accept the bar at 50% and rely on the `detail` text to communicate the state — simple, no special casing. (2) Use a distinctive `detail` string that clearly reads as a non-score state. Option 1 is preferred for its simplicity. The `detail: 'Session too short (< 60s)'` string in the `dim.detail` position clearly communicates the state.

---

## Code Examples

### scoreOpeningClosing() — Full Implementation
```typescript
// src/analysis/scorer.ts
const NEGATIVE_EVENT_TYPES = new Set([
  'filler_word',
  'face_touch',
  'body_sway',
  'eye_contact_break',
]);

const OC_WINDOW_MS = 30000;

function scoreSegment(
  events: SessionEvent[],
  startMs: number,
  endMs: number
): number {
  const windowMs = endMs - startMs;
  if (windowMs <= 0) return 50;
  const windowEvents = events.filter(
    e => e.timestampMs >= startMs && e.timestampMs < endMs
  );
  const negativeCount = windowEvents.filter(e => NEGATIVE_EVENT_TYPES.has(e.type)).length;
  const negPerMin = negativeCount / (windowMs / 60000);
  return Math.max(0, Math.round(100 - (negPerMin / 6) * 100));
}

export function scoreOpeningClosing(
  events: SessionEvent[],
  durationMs: number
): DimensionScore {
  if (durationMs <= 0) return { score: 50, label: '50 / 100', detail: 'No data' };
  if (durationMs < OC_WINDOW_MS * 2) {
    return { score: 50, label: '50 / 100', detail: 'Session too short (< 60s)' };
  }
  const openingScore = scoreSegment(events, 0, OC_WINDOW_MS);
  const closingScore = scoreSegment(events, durationMs - OC_WINDOW_MS, durationMs);
  const score = Math.round(openingScore * 0.6 + closingScore * 0.4);
  return {
    score,
    label: `${score} / 100`,
    detail: `Opening ${openingScore}, Closing ${closingScore}`,
  };
}
```

### ScorecardResult Extension
```typescript
// src/analysis/scorer.ts
export interface ScorecardResult {
  overall: number;
  dimensions: {
    eyeContact: DimensionScore;
    expressiveness: DimensionScore;
    gestures: DimensionScore;
    fillers: DimensionScore;
    pacing: DimensionScore;
    openingClosing: DimensionScore;
  };
}
```

### aggregateScores() Updated Weights
```typescript
// src/analysis/scorer.ts
const WEIGHTS = {
  eyeContact: 0.22,
  fillers: 0.22,
  pacing: 0.18,
  expressiveness: 0.14,
  gestures: 0.14,
  openingClosing: 0.10,
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
  const openingClosing = scoreOpeningClosing(eventLog, durationMs);

  const overall = Math.round(
    eyeContact.score * WEIGHTS.eyeContact +
    fillers.score * WEIGHTS.fillers +
    pacing.score * WEIGHTS.pacing +
    expressiveness.score * WEIGHTS.expressiveness +
    gestures.score * WEIGHTS.gestures +
    openingClosing.score * WEIGHTS.openingClosing
  );

  return {
    overall,
    dimensions: { eyeContact, expressiveness, gestures, fillers, pacing, openingClosing },
  };
}
```

### Unit Tests for scoreOpeningClosing (TDD — write before implementation)
```typescript
// src/analysis/__tests__/aggregateScores.test.ts (new describe block)
describe('scoreOpeningClosing', () => {
  it('session < 60s returns score=50 with "Session too short" detail', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
    ];
    const result = aggregateScores(events, 45000);
    expect(result.dimensions.openingClosing.score).toBe(50);
    expect(result.dimensions.openingClosing.detail).toMatch(/too short/i);
  });

  it('durationMs=0 returns score=50 with "No data" detail', () => {
    const result = aggregateScores([], 0);
    expect(result.dimensions.openingClosing.score).toBe(50);
    expect(result.dimensions.openingClosing.detail).toBe('No data');
  });

  it('clean opening + clean closing in 120s session → score near 100', () => {
    // No negative events in either 30s window → both segments score 100
    const events: SessionEvent[] = [
      { type: 'wpm_snapshot', timestampMs: 120000, label: '130' },
    ];
    const result = aggregateScores(events, 120000);
    expect(result.dimensions.openingClosing.score).toBe(100);
  });

  it('strong opening (score 100) + weak closing (score 0) in 120s → weighted composite', () => {
    // Opening: no negatives → 100
    // Closing (90000–120000): many fillers → 0
    // Composite: round(100 * 0.6 + 0 * 0.4) = 60
    const closingEvents: SessionEvent[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'filler_word' as const,
      timestampMs: 90000 + (i + 1) * 1000,
      label: 'um',
    }));
    const result = aggregateScores(closingEvents, 120000);
    expect(result.dimensions.openingClosing.score).toBe(60);
  });

  it('weak opening + strong closing produces different score than reversed', () => {
    // Opening: many fillers → 0; Closing: no negatives → 100
    // Composite: round(0 * 0.6 + 100 * 0.4) = 40
    const openingEvents: SessionEvent[] = Array.from({ length: 20 }, (_, i) => ({
      type: 'filler_word' as const,
      timestampMs: (i + 1) * 1000,
      label: 'um',
    }));
    const result = aggregateScores(openingEvents, 120000);
    expect(result.dimensions.openingClosing.score).toBe(40);
    // The reversed scenario (from above) = 60; this = 40 — confirms they differ
  });

  it('exactly 60s session: opening is 0–30s, closing is 30–60s (no overlap, no short-session guard)', () => {
    const events: SessionEvent[] = [];
    const result = aggregateScores(events, 60000);
    expect(result.dimensions.openingClosing.detail).not.toMatch(/too short/i);
    expect(result.dimensions.openingClosing.score).toBe(100);
  });
});
```

### ScorecardView.test.tsx Fixture Update
```typescript
// src/components/ScorecardView/ScorecardView.test.tsx
const fixtureScorecard: ScorecardResult = {
  overall: 78,
  dimensions: {
    eyeContact: { score: 82, label: '82 / 100', detail: '3 breaks' },
    fillers: { score: 65, label: '65 / 100', detail: '5 fillers (~1.0/min)' },
    pacing: { score: 100, label: '100 / 100', detail: '130 wpm' },
    expressiveness: { score: 70, label: '70 / 100', detail: '4 segments analyzed' },
    gestures: { score: 84, label: '84 / 100', detail: '2 nervous gestures' },
    openingClosing: { score: 75, label: '75 / 100', detail: 'Opening 85, Closing 60' },
  },
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 5-dimension scorecard (eyeContact, fillers, pacing, expressiveness, gestures) | 6-dimension scorecard adds openingClosing | Phase 9 | Gives users actionable insight on the two highest-stakes delivery moments |
| Five weights summing to 1.0 | Six weights summing to 1.0 with openingClosing at 0.10 | Phase 9 | Existing overall scores change slightly — expected; old scorecard data in IndexedDB is re-computed on each open (Review.tsx calls aggregateScores on load) |

**Deprecated/outdated:**
- Nothing is removed. The existing five dimension scores remain unchanged.

---

## Open Questions

1. **Weight redistribution — exact values**
   - What we know: Existing weights (eyeContact=0.25, fillers=0.25, pacing=0.20, expressiveness=0.15, gestures=0.15) sum to 1.0. Adding a sixth dimension requires stealing from existing weights.
   - What's unclear: Whether to take weight equally from all five, or favor taking from the lower-weight dimensions.
   - Recommendation: Use the redistribution shown in the code examples (0.22, 0.22, 0.18, 0.14, 0.14, 0.10). These numbers keep eyeContact and fillers as the top signals and add openingClosing at a modest 10% so it is meaningful but not dominant.

2. **Opening vs. closing split (60/40)**
   - What we know: Presentations research suggests the opening forms a stronger first impression than the closing. The closing still matters (recency effect).
   - What's unclear: Whether 60/40 is the right split or if 50/50 is more defensible.
   - Recommendation: Use 60/40 (opening-weighted) as the first-pass heuristic. This satisfies Success Criterion 2 (a strong opening with a weak closing produces a different score than the reverse). The split can be tuned after real recordings.

3. **Which events count as "negative" in opening/closing context**
   - What we know: Filler words, face touch, body sway, and eye contact breaks are all clear negative delivery signals in any segment.
   - What's unclear: Whether `pause_detected` events should count. A deliberate pause in the opening could be powerful, but the event data does not distinguish deliberate from hesitation pauses (Phase 10 addresses this).
   - Recommendation: Exclude `pause_detected` from NEGATIVE_EVENT_TYPES for Phase 9. Phase 10 will add pause quality to pacing scoring. Including pauses now would double-penalize what might be deliberate emphasis.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | vite.config.ts (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| Quick run command | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANAL-01 | `scoreOpeningClosing()` returns correct score for clean opening+closing | unit (pure) | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ✅ exists, needs new describe block |
| ANAL-01 | Short session (< 60s) returns neutral score + "too short" detail | unit (pure) | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ✅ exists, needs new case |
| ANAL-01 | Strong opening + weak closing differs from weak opening + strong closing | unit (pure) | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ✅ exists, needs new case |
| ANAL-01 | ScorecardView renders "Opening / Closing" dimension row | unit (component) | `npx vitest run src/components/ScorecardView/ScorecardView.test.tsx` | ✅ exists, needs fixture update + assertion |
| ANAL-01 | Overall score includes openingClosing weight contribution | unit (pure) | `npx vitest run src/analysis/__tests__/aggregateScores.test.ts` | ✅ exists, existing "all 100 → 100" test confirms |

### Sampling Rate
- **Per task commit:** `npx vitest run src/analysis/__tests__/aggregateScores.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. All new test cases go in existing files. No new test files, no new fixtures, no new config needed.

---

## Sources

### Primary (HIGH confidence)
- `src/analysis/scorer.ts` (codebase) — existing `DimensionScore`, `ScorecardResult`, `aggregateScores()` patterns that Phase 9 extends
- `src/analysis/__tests__/aggregateScores.test.ts` (codebase) — existing test patterns and fixture structure
- `src/components/ScorecardView/ScorecardView.tsx` (codebase) — `DIMENSIONS` array pattern; the component already maps over it generically
- `src/components/ScorecardView/ScorecardView.test.tsx` (codebase) — fixture shape and assertion patterns
- `src/pages/Review.tsx` (codebase) — confirms `aggregateScores(s.eventLog, s.durationMs)` call site and `Scorecard.dimensions: Record<string, number>` persistence pattern
- `src/db/db.ts` (codebase) — `Scorecard` interface (Record<string, number>) confirms new dimension flows automatically

### Secondary (MEDIUM confidence)
- Public speaking research consensus: first 30 seconds of a presentation forms the dominant first impression (widely cited in presentation training literature, e.g. Carmine Gallo "Talk Like TED", Toastmasters materials)
- Recency effect in audience recall: closing moments are the second most-remembered segment after the opening

### Tertiary (LOW confidence)
- 60/40 opening/closing split is a judgment call — no quantitative study found that precisely validates this ratio

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns exist in the codebase
- Architecture: HIGH — every required touch point is identified; pure function with no side effects
- Scoring algorithm: MEDIUM — the penalty curve and window weights are first-pass heuristics, not empirically calibrated, but follow the same pattern as existing `scoreFillers()`
- Pitfalls: HIGH — TypeScript compile path is fully traced; edge cases are confirmed from reading the codebase

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (pure TypeScript, no external dependencies)
