# Phase 11: Filler Breakdown Panel - Research

**Researched:** 2026-03-17
**Domain:** Pure analysis function, TypeScript interface, React panel component
**Confidence:** HIGH

---

## Summary

Phase 11 adds a `FillerBreakdown` panel to the review page showing: (1) per-type filler counts derived from `SessionEvent` entries with `type === 'filler_word'` and `label` set to the filler word, and (2) which session third (opening, middle, closing) had the highest filler density. The panel is designed from the start to be Whisper-upgradeable: when `whisperFillers?.byType` is available on the session (Phase 13), a prop propagates it to the component so it uses the more accurate Whisper counts instead of Web Speech counts. A zero-filler session shows a graceful empty state.

This phase follows the exact same structural pattern established by Phase 10's `PauseDetail` panel: a pure analysis function in `src/analysis/`, a new component in `src/components/`, and a wiring step in `Review.tsx`. No new libraries are required. The `eventLog` already contains all needed data — `filler_word` events have their `label` field set to the normalized filler type (`'um'`, `'uh'`, `'like'`, etc.) by `detectFillers()`.

The key data-shaping concern is the session thirds. The total session duration in milliseconds is divided into three equal thirds: `[0, dur/3)`, `[dur/3, 2*dur/3)`, `[2*dur/3, dur)`. Filler events are bucketed into thirds, density is computed as events-per-minute, and the highest-density third is reported. When `whisperFillers` is provided, its `byType` counts replace the Web Speech event counts for the per-type breakdown, but session-thirds density continues to use the event log timestamps (Whisper gives counts, not timestamps).

**Primary recommendation:** Add `computeFillerBreakdown()` pure function to `src/analysis/fillerBreakdown.ts`, build `FillerBreakdown` component in `src/components/FillerBreakdown/`, wire into `Review.tsx` below `PauseDetail`, and propagate `session.whisperFillers` as an optional prop.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANAL-04 | User sees filler breakdown by type (um, uh, like, you know...) in review | `computeFillerBreakdown()` reduces `filler_word` events by `label` field; `FillerBreakdown` component renders per-type counts; `WhisperFillerResult.byType` from `db.ts` is the Whisper upgrade path |
| ANAL-05 | User sees which segment of their talk had the most fillers (session thirds) | Session divided into three equal thirds by `durationMs`; filler density per third computed from event timestamps; highest-density third labelled "Opening", "Middle", or "Closing" |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.0 (installed) | Unit tests for `computeFillerBreakdown()` | Project standard; pool=vmThreads configured for WSL2 |
| @testing-library/react | ^16.3.2 (installed) | `FillerBreakdown` component tests | Project standard; used in all existing panel tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new libraries needed | — | Pure TypeScript + React | All logic is array reduction over existing `SessionEvent[]` |

**Installation:**
No new packages needed — all dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure

Phase 11 adds two new files and touches one existing file:

```
src/
├── analysis/
│   ├── fillerBreakdown.ts        # NEW — computeFillerBreakdown() pure function (ANAL-04, ANAL-05)
│   └── fillerBreakdown.test.ts   # NEW — TDD unit tests
└── components/
    └── FillerBreakdown/
        ├── FillerBreakdown.tsx   # NEW — review panel component
        └── FillerBreakdown.test.tsx  # NEW — component tests
src/pages/
└── Review.tsx                    # MODIFY — add FillerBreakdown below PauseDetail
```

`db.ts`, `scorer.ts`, `App.tsx` do NOT need changes. `WhisperFillerResult.byType` is already typed in `db.ts` from Phase 8.

### Pattern 1: computeFillerBreakdown() Pure Function

**What:** Reduces `filler_word` events into a structured result: per-type counts + session-thirds density analysis.

**Input:** `SessionEvent[]`, `durationMs: number`

**Output:**
```typescript
export interface FillerBreakdownResult {
  byType: Record<string, number>;      // e.g. { um: 5, uh: 3, like: 2 }
  total: number;                        // sum of all byType counts
  peakThird: 'opening' | 'middle' | 'closing' | null; // null when durationMs=0 or no fillers
  thirdCounts: [number, number, number]; // [opening_count, middle_count, closing_count]
  thirdDensities: [number, number, number]; // fillers/min per third
}
```

**Algorithm:**
1. Filter `events` to `type === 'filler_word'`
2. Reduce by `label` to build `byType` counts
3. Compute `total` = sum of `byType` values
4. If `durationMs === 0` or `total === 0`: return with `peakThird: null`, zero thirds
5. Divide duration into three equal thirds:
   - Opening: `[0, durationMs/3)`
   - Middle: `[durationMs/3, 2*durationMs/3)`
   - Closing: `[2*durationMs/3, durationMs)`
6. Count filler events per third, compute density as `count / (durationMs/3 / 60000)`
7. Identify peak third by highest density; tie-break: opening > middle > closing (first wins)

**Example:**
```typescript
// src/analysis/fillerBreakdown.ts
import type { SessionEvent } from '../db/db';

export interface FillerBreakdownResult {
  byType: Record<string, number>;
  total: number;
  peakThird: 'opening' | 'middle' | 'closing' | null;
  thirdCounts: [number, number, number];
  thirdDensities: [number, number, number];
}

export function computeFillerBreakdown(
  events: SessionEvent[],
  durationMs: number
): FillerBreakdownResult {
  const fillerEvents = events.filter(e => e.type === 'filler_word');

  // Per-type counts
  const byType: Record<string, number> = {};
  for (const e of fillerEvents) {
    const label = e.label ?? 'unknown';
    byType[label] = (byType[label] ?? 0) + 1;
  }
  const total = fillerEvents.length;

  // Session thirds
  const THIRD_NAMES = ['opening', 'middle', 'closing'] as const;
  const thirdDurationMs = durationMs > 0 ? durationMs / 3 : 0;
  const thirdCounts: [number, number, number] = [0, 0, 0];

  if (durationMs > 0 && total > 0) {
    for (const e of fillerEvents) {
      const idx = Math.min(2, Math.floor(e.timestampMs / thirdDurationMs));
      thirdCounts[idx]++;
    }
  }

  const thirdDensities: [number, number, number] = [0, 0, 0];
  if (thirdDurationMs > 0) {
    const thirdMin = thirdDurationMs / 60000;
    for (let i = 0; i < 3; i++) {
      thirdDensities[i] = thirdCounts[i] / thirdMin;
    }
  }

  // Peak third (tie-break: first wins = opening > middle > closing)
  let peakThird: 'opening' | 'middle' | 'closing' | null = null;
  if (total > 0 && durationMs > 0) {
    const maxDensity = Math.max(...thirdDensities);
    const peakIdx = thirdDensities.indexOf(maxDensity);
    peakThird = THIRD_NAMES[peakIdx];
  }

  return { byType, total, peakThird, thirdCounts, thirdDensities };
}
```

**Source:** Pattern derived from `computePauseStats()` in `src/analysis/pacing.ts` (same reduce-then-enrich shape).

### Pattern 2: FillerBreakdown Component

**What:** Renders the filler breakdown panel. Accepts Web Speech data by default; upgrades to Whisper when `whisperFillers` prop is provided.

**Whisper upgrade mechanism:** When `whisperFillers?.byType` is present, pass it directly to the per-type display rather than computing from events. Session-thirds analysis always uses event timestamps (Whisper does not provide timestamps). This matches Success Criterion 3.

**Props:**
```typescript
interface FillerBreakdownProps {
  events: SessionEvent[];
  durationMs: number;
  whisperFillers?: WhisperFillerResult; // Phase 13 upgrade — optional
}
```

**Rendering logic:**
- If `total === 0` (both Web Speech and Whisper): render graceful empty state (not blank, not error)
- Otherwise: render per-type counts sorted by frequency (descending), then peak-third indicator

**Example structure (visual layout matches PauseDetail styling):**
```tsx
// src/components/FillerBreakdown/FillerBreakdown.tsx
import { computeFillerBreakdown } from '../../analysis/fillerBreakdown';
import type { SessionEvent } from '../../db/db';
import type { WhisperFillerResult } from '../../db/db';

interface FillerBreakdownProps {
  events: SessionEvent[];
  durationMs: number;
  whisperFillers?: WhisperFillerResult;
}

export default function FillerBreakdown({ events, durationMs, whisperFillers }: FillerBreakdownProps) {
  const breakdown = computeFillerBreakdown(events, durationMs);

  // Whisper upgrade: use whisperFillers.byType when available
  const byType = whisperFillers?.byType ?? breakdown.byType;
  const total = whisperFillers
    ? Object.values(whisperFillers.byType).reduce((s, n) => s + n, 0)
    : breakdown.total;

  // Sorted entries (descending by count)
  const sortedEntries = Object.entries(byType).sort(([, a], [, b]) => b - a);

  return (
    <div style={{ /* matches PauseDetail panel styling */ }}>
      <h3>Filler Words</h3>
      {total === 0 ? (
        <p>No filler words detected</p>
      ) : (
        <>
          {/* Per-type breakdown */}
          {sortedEntries.map(([label, count]) => (
            <div key={label}>
              <span>{label}</span>
              <span>{count}</span>
            </div>
          ))}
          {/* Peak third */}
          {breakdown.peakThird && (
            <p>Most fillers in: {breakdown.peakThird}</p>
          )}
        </>
      )}
    </div>
  );
}
```

**Styling:** Inline styles matching the existing panel visual language from `PauseDetail.tsx`:
- Panel: `background: '#0b1022'`, `border: '1px solid rgba(255,255,255,0.06)'`, `borderRadius: '18px'`, `padding: '24px'`
- Heading: uppercase, `fontSize: '14px'`, `color: '#8a9bc2'`, `letterSpacing: '0.06em'`
- Numbers: `fontSize: '28px'`, `fontWeight: 600`, `color: '#e4e9f5'`
- Labels: `fontSize: '12px'`, `color: '#5e6f94'`
- Filler type accent color: amber `#fbbf24` (established in Phase 7 as the filler category color)

### Pattern 3: Wiring into Review.tsx

**What:** Add `FillerBreakdown` below `PauseDetail` in `Review.tsx`. Pass `session.whisperFillers` as the optional prop.

**Change required (minimal):**
```tsx
// src/pages/Review.tsx — add import and one JSX block
import FillerBreakdown from '../components/FillerBreakdown/FillerBreakdown';

// Inside the render, after the PauseDetail block:
<div style={{ width: '100%', maxWidth: '672px' }}>
  <FillerBreakdown
    events={session.eventLog}
    durationMs={session.durationMs}
    whisperFillers={session.whisperFillers}
  />
</div>
```

`Review.tsx` already has `session.eventLog`, `session.durationMs`, and `session.whisperFillers` in scope (the full `Session` object is in state). No additional loading logic required.

### Anti-Patterns to Avoid

- **Storing breakdown in state:** The breakdown is derivable from `session.eventLog` — no `useState` needed in `FillerBreakdown`. Compute in the component body directly from props (same pattern as `PauseDetail`).
- **Using whisperFillers for session-thirds:** Whisper gives aggregate counts without timestamps. Thirds analysis MUST use event log timestamps, not Whisper data. The two data sources serve different purposes in the component.
- **Showing an empty `<div>` or nothing on zero fillers:** Success Criterion 4 requires a "graceful empty state" — render a text message like "No filler words detected", not a blank panel.
- **Using dynamic Tailwind classes for filler-type amber color:** As established in [07-05] decision, Tailwind v4 JIT cannot generate classes from variable strings. Use inline style `color: '#fbbf24'` for amber filler accent.
- **Sorting byType entries without `Object.entries().sort()`:** `Object.keys()` order is insertion order in V8, but the display should show most-frequent first. Always sort descending by count.
- **Forgetting the `Math.min(2, ...)` clamp on third index:** An event at exactly `durationMs` (the wpm_snapshot at the very end) would compute index 3 without the clamp, causing an out-of-bounds write to `thirdCounts[3]`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filler count aggregation | Custom loop tracking state | `Array.filter` + `Record<string, number>` reduce | Same pattern as `computePauseStats` — direct and testable |
| Session thirds boundaries | Complex bucketing library | Simple `Math.floor(timestampMs / thirdDurationMs)` | Division is exact; no edge cases beyond the `Math.min(2, ...)` clamp |
| Whisper data integration | New loading path or Dexie read | Prop passed from `Review.tsx` where `session` is already loaded | `Review.tsx` already has the full `Session` object including `whisperFillers?` |

**Key insight:** The `filler_word` events in `eventLog` already carry the normalized type label from `detectFillers()` (Phase 6). No re-parsing of transcript is needed — the work was already done at recording time.

---

## Common Pitfalls

### Pitfall 1: Events at Boundary Between Thirds
**What goes wrong:** An event at exactly `durationMs/3` milliseconds could be assigned to index `1.0` (floating point), then `Math.floor` produces `1` (middle). This is correct. But an event at exactly `durationMs` (e.g., a `wpm_snapshot` placed at the end) would compute index `3`, which is out of bounds for a three-element array.
**Why it happens:** `Math.floor(durationMs / thirdDurationMs) === 3` when `timestampMs === durationMs`.
**How to avoid:** Apply `Math.min(2, Math.floor(...))` clamp on the computed index. This is a one-line guard.
**Warning signs:** Runtime error "Cannot set property '3' of array" or silently wrong `thirdCounts`.

### Pitfall 2: Zero Duration Session
**What goes wrong:** If `durationMs === 0`, `thirdDurationMs === 0`, and dividing by it (for density) produces `Infinity` or `NaN`.
**Why it happens:** Not guarding the `durationMs > 0` condition before computing thirds.
**How to avoid:** Early return with all-zero thirds and `peakThird: null` when `durationMs === 0`. The `total === 0` empty-state path in the component also covers this.
**Warning signs:** `NaN` appearing in density display or test failures with `durationMs: 0` fixture.

### Pitfall 3: Whisper byType Keys May Differ From Web Speech Labels
**What goes wrong:** Web Speech labels are normalized by `normalizeLabel()` in `fillerDetector.ts` (e.g., `'umm'` → `'um'`). Whisper may produce different casing or key formats. If the component tries to merge or compare the two, the keys may not match.
**Why it happens:** Two different sources with different normalization pipelines.
**How to avoid:** The component uses one source OR the other — never merges them. When `whisperFillers` is present, display only those keys. When absent, display Web Speech event-derived keys. No merging logic required.
**Warning signs:** Duplicate rows like both `'um'` and `'Um'`, or Whisper keys not rendering because of case mismatch.

### Pitfall 4: Missing `label` on filler events (undefined)
**What goes wrong:** `SessionEvent.label` is typed as `label?: string` (optional). If a `filler_word` event has no label, it would be grouped as `'unknown'` or cause a runtime error.
**Why it happens:** Defensive programming — `detectFillers()` always sets label, but old sessions or edge cases might not.
**How to avoid:** In `computeFillerBreakdown()`, use `e.label ?? 'unknown'` as the fallback key. This is already shown in the Pattern 1 code example.
**Warning signs:** An unexpected `'unknown'` row appearing in the breakdown for certain sessions.

### Pitfall 5: Review.tsx TypeScript Error After Adding FillerBreakdown import
**What goes wrong:** `Review.test.tsx` (if it renders `ReviewPage` fully) may fail TypeScript because `FillerBreakdown` is now imported and expects `durationMs` from session, which must be in the test fixture.
**Why it happens:** `ReviewPage` tests mock the DB — the test fixture `Session` object needs `durationMs` and `whisperFillers` fields.
**How to avoid:** Check `Review.test.tsx` before wiring — the `Session` fixture in that test likely already has `durationMs` since Phase 10. `whisperFillers` is optional so it does not need to be added.
**Warning signs:** TypeScript compile error in `Review.test.tsx` after wiring step.

---

## Code Examples

### computeFillerBreakdown() — Full Implementation
```typescript
// src/analysis/fillerBreakdown.ts
import type { SessionEvent } from '../db/db';

export interface FillerBreakdownResult {
  byType: Record<string, number>;
  total: number;
  peakThird: 'opening' | 'middle' | 'closing' | null;
  thirdCounts: [number, number, number];
  thirdDensities: [number, number, number];
}

const THIRD_NAMES = ['opening', 'middle', 'closing'] as const;

export function computeFillerBreakdown(
  events: SessionEvent[],
  durationMs: number
): FillerBreakdownResult {
  const fillerEvents = events.filter(e => e.type === 'filler_word');

  const byType: Record<string, number> = {};
  for (const e of fillerEvents) {
    const label = e.label ?? 'unknown';
    byType[label] = (byType[label] ?? 0) + 1;
  }
  const total = fillerEvents.length;

  const thirdDurationMs = durationMs > 0 ? durationMs / 3 : 0;
  const thirdCounts: [number, number, number] = [0, 0, 0];

  if (durationMs > 0 && total > 0) {
    for (const e of fillerEvents) {
      const idx = Math.min(2, Math.floor(e.timestampMs / thirdDurationMs));
      thirdCounts[idx]++;
    }
  }

  const thirdDensities: [number, number, number] = [0, 0, 0];
  if (thirdDurationMs > 0) {
    const thirdMin = thirdDurationMs / 60000;
    for (let i = 0; i < 3; i++) {
      thirdDensities[i] = thirdCounts[i] / thirdMin;
    }
  }

  let peakThird: 'opening' | 'middle' | 'closing' | null = null;
  if (total > 0 && durationMs > 0) {
    const maxDensity = Math.max(...thirdDensities);
    const peakIdx = thirdDensities.indexOf(maxDensity); // indexOf = first match = tie-break
    peakThird = THIRD_NAMES[peakIdx];
  }

  return { byType, total, peakThird, thirdCounts, thirdDensities };
}
```

### TDD Tests for computeFillerBreakdown (write before implementation)
```typescript
// src/analysis/fillerBreakdown.test.ts
import { describe, it, expect } from 'vitest';
import { computeFillerBreakdown } from './fillerBreakdown';
import type { SessionEvent } from '../db/db';

describe('computeFillerBreakdown (ANAL-04, ANAL-05)', () => {
  it('empty events returns all zeros and null peakThird', () => {
    const result = computeFillerBreakdown([], 60000);
    expect(result.total).toBe(0);
    expect(result.byType).toEqual({});
    expect(result.peakThird).toBeNull();
    expect(result.thirdCounts).toEqual([0, 0, 0]);
  });

  it('durationMs=0 returns peakThird null and zero densities', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 0, label: 'um' },
    ];
    const result = computeFillerBreakdown(events, 0);
    expect(result.peakThird).toBeNull();
    expect(result.thirdDensities).toEqual([0, 0, 0]);
  });

  it('counts by type correctly', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
      { type: 'filler_word', timestampMs: 10000, label: 'um' },
      { type: 'filler_word', timestampMs: 15000, label: 'uh' },
      { type: 'eye_contact_break', timestampMs: 8000 }, // non-filler ignored
    ];
    const result = computeFillerBreakdown(events, 60000);
    expect(result.byType).toEqual({ um: 2, uh: 1 });
    expect(result.total).toBe(3);
  });

  it('assigns events to correct third', () => {
    // durationMs=90000 → thirds: 0-30000, 30000-60000, 60000-90000
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 10000, label: 'um' },   // opening
      { type: 'filler_word', timestampMs: 40000, label: 'like' }, // middle
      { type: 'filler_word', timestampMs: 40000, label: 'uh' },   // middle
      { type: 'filler_word', timestampMs: 70000, label: 'so' },   // closing
    ];
    const result = computeFillerBreakdown(events, 90000);
    expect(result.thirdCounts).toEqual([1, 2, 1]);
    expect(result.peakThird).toBe('middle');
  });

  it('event at exactly durationMs is clamped to closing third (not out-of-bounds)', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 90000, label: 'um' }, // exactly at durationMs
    ];
    const result = computeFillerBreakdown(events, 90000);
    expect(result.thirdCounts[2]).toBe(1); // closing
    expect(result.total).toBe(1);
  });

  it('tie-break: when two thirds are equal, earlier third wins', () => {
    // durationMs=60000 → thirds of 20000ms each
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },  // opening
      { type: 'filler_word', timestampMs: 25000, label: 'uh' }, // middle (exactly same density)
    ];
    const result = computeFillerBreakdown(events, 60000);
    expect(result.thirdCounts).toEqual([1, 1, 0]);
    expect(result.peakThird).toBe('opening'); // tie-break: first wins
  });

  it('all fillers in closing: peakThird = closing', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 80000, label: 'um' },
      { type: 'filler_word', timestampMs: 85000, label: 'um' },
    ];
    const result = computeFillerBreakdown(events, 90000);
    expect(result.peakThird).toBe('closing');
  });

  it('label is undefined falls back to "unknown"', () => {
    const events: SessionEvent[] = [
      { type: 'filler_word', timestampMs: 5000 }, // no label
    ];
    const result = computeFillerBreakdown(events, 60000);
    expect(result.byType['unknown']).toBe(1);
  });
});
```

### FillerBreakdown Component Tests (write before implementation)
```typescript
// src/components/FillerBreakdown/FillerBreakdown.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FillerBreakdown from './FillerBreakdown';

describe('FillerBreakdown (ANAL-04, ANAL-05)', () => {
  it('renders heading "Filler Words"', () => {
    render(<FillerBreakdown events={[]} durationMs={60000} />);
    expect(screen.getByText('Filler Words')).toBeInTheDocument();
  });

  it('shows graceful empty state when no filler events', () => {
    render(<FillerBreakdown events={[]} durationMs={60000} />);
    expect(screen.getByText(/no filler words detected/i)).toBeInTheDocument();
  });

  it('shows per-type counts from event log', () => {
    const events = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
      { type: 'filler_word', timestampMs: 10000, label: 'um' },
      { type: 'filler_word', timestampMs: 15000, label: 'uh' },
    ];
    render(<FillerBreakdown events={events} durationMs={60000} />);
    expect(screen.getByText('um')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('uh')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows peak third label when fillers present', () => {
    const events = [
      { type: 'filler_word', timestampMs: 70000, label: 'um' },
    ];
    render(<FillerBreakdown events={events} durationMs={90000} />);
    expect(screen.getByText(/closing/i)).toBeInTheDocument();
  });

  it('uses whisperFillers.byType when provided, not event counts', () => {
    // Event log has 1 um; whisperFillers says 3 um + 2 uh
    const events = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
    ];
    const whisperFillers = { byType: { um: 3, uh: 2 } };
    render(<FillerBreakdown events={events} durationMs={60000} whisperFillers={whisperFillers} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // Whisper count, not event count (1)
    expect(screen.getByText('uh')).toBeInTheDocument();
  });

  it('shows empty state when whisperFillers.byType is empty record', () => {
    const events = [
      { type: 'filler_word', timestampMs: 5000, label: 'um' },
    ];
    const whisperFillers = { byType: {} };
    render(<FillerBreakdown events={events} durationMs={60000} whisperFillers={whisperFillers} />);
    expect(screen.getByText(/no filler words detected/i)).toBeInTheDocument();
  });
});
```

### Review.tsx Wiring (minimal diff)
```tsx
// Add import at top of src/pages/Review.tsx:
import FillerBreakdown from '../components/FillerBreakdown/FillerBreakdown';

// Add after the PauseDetail block inside the return:
<div style={{ width: '100%', maxWidth: '672px' }}>
  <FillerBreakdown
    events={session.eventLog}
    durationMs={session.durationMs}
    whisperFillers={session.whisperFillers}
  />
</div>
```

---

## Data Shape Reference

### Existing filler events in eventLog
`detectFillers()` in Phase 2 writes events shaped as:
```typescript
{
  type: 'filler_word',
  timestampMs: number,   // timestamp of the transcript segment containing the filler
  label: string          // normalized: 'um', 'uh', 'like', 'so', 'actually', 'basically',
                         //             'right', 'okay', 'you know', 'you know what',
                         //             'kind of', 'sort of', 'i mean'
}
```
These are the inputs to `computeFillerBreakdown()`. No re-parsing needed.

### WhisperFillerResult from db.ts
```typescript
export interface WhisperFillerResult {
  byType: Record<string, number>; // e.g. { um: 5, uh: 3 }
}
```
This is already defined in `db.ts` (Phase 8 stub). `Session.whisperFillers?: WhisperFillerResult` is already typed. Phase 13 populates it; Phase 11 reads it if present.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Filler score = single number (rate per minute) | Filler score + breakdown panel showing per-type counts and peak third | Phase 11 | User can target "um" specifically rather than treating all fillers as one problem |
| Whisper data stored but unused | FillerBreakdown panel Whisper-upgradeable via prop | Phase 11 | Phase 13 wires in Whisper with zero component changes |

---

## Open Questions

1. **Display order for per-type rows**
   - What we know: Sorted descending by count is the most useful display.
   - What's unclear: Whether to show all filler types (including those with 0 occurrences from the known FILLER_PATTERNS set) or only types that actually appeared.
   - Recommendation: Show only types that appeared (non-zero counts). Showing all 13 possible filler types with zeros would be noisy and misleading. The `byType` Record will naturally contain only detected types.

2. **Session thirds label capitalization**
   - What we know: The three thirds are "Opening", "Middle", "Closing" — aligns with the existing "Opening / Closing" scorecard dimension vocabulary.
   - What's unclear: Whether to show all three thirds with their counts, or just call out the peak.
   - Recommendation: Show the peak third prominently (e.g., "Peak: Closing") and optionally show all three count values. The Success Criteria only require showing "which session third had the highest filler density" — a simple labelled callout is sufficient.

3. **Whisper empty byType handling**
   - What we know: If `whisperFillers.byType === {}`, the Whisper analysis found no fillers — this is a valid result.
   - What's unclear: Whether to fall back to Web Speech counts when Whisper found zero, or trust the Whisper result.
   - Recommendation: Trust Whisper when present — show empty state even if Web Speech found fillers. This is consistent with WHIS-01's intent: Whisper supersedes Web Speech for filler counts. The component test (Pitfall 3 avoidance) confirms this behavior.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vite.config.ts` (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| Quick run command | `npx vitest run src/analysis/fillerBreakdown.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANAL-04 | `computeFillerBreakdown()` counts by type correctly | unit (pure) | `npx vitest run src/analysis/fillerBreakdown.test.ts` | ❌ Wave 0 |
| ANAL-04 | `FillerBreakdown` renders per-type counts | unit (component) | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ❌ Wave 0 |
| ANAL-04 | Empty state when no fillers | unit (component) | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ❌ Wave 0 |
| ANAL-04 | Whisper byType used when prop provided | unit (component) | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ❌ Wave 0 |
| ANAL-05 | Events bucketed into correct thirds | unit (pure) | `npx vitest run src/analysis/fillerBreakdown.test.ts` | ❌ Wave 0 |
| ANAL-05 | Peak third identified correctly | unit (pure) | `npx vitest run src/analysis/fillerBreakdown.test.ts` | ❌ Wave 0 |
| ANAL-05 | Peak third label shown in component | unit (component) | `npx vitest run src/components/FillerBreakdown/FillerBreakdown.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/analysis/fillerBreakdown.test.ts src/components/FillerBreakdown/FillerBreakdown.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/analysis/fillerBreakdown.ts` — covers ANAL-04, ANAL-05 (pure function)
- [ ] `src/analysis/fillerBreakdown.test.ts` — TDD tests for `computeFillerBreakdown()`
- [ ] `src/components/FillerBreakdown/FillerBreakdown.tsx` — review panel component
- [ ] `src/components/FillerBreakdown/FillerBreakdown.test.tsx` — component tests

All four files are new. No changes to existing test infrastructure required (no new config, no new fixtures in shared files).

---

## Sources

### Primary (HIGH confidence)
- `src/analysis/fillerDetector.ts` (codebase) — confirms `FillerEvent.label` is always set to normalized filler type; `FILLER_PATTERNS` documents all 13 possible label values
- `src/analysis/pacing.ts` (codebase) — `computePauseStats()` is the direct structural analog for `computeFillerBreakdown()` (filter → aggregate → enrich pattern)
- `src/components/PauseDetail/PauseDetail.tsx` (codebase) — panel structure, inline style values, empty-state pattern to replicate
- `src/components/PauseDetail/PauseDetail.test.tsx` (codebase) — test structure and assertion patterns to replicate
- `src/db/db.ts` (codebase) — `WhisperFillerResult.byType: Record<string, number>` already typed; `Session.whisperFillers?: WhisperFillerResult` already in schema
- `src/pages/Review.tsx` (codebase) — exact insertion point and `session` object fields available at render time
- `.planning/STATE.md` decisions — `[v2.0 roadmap]: FillerBreakdown (Phase 11) is Whisper-upgradeable by design — built on Web Speech baseline with a whisperFillers? prop that Phase 13 populates`

### Secondary (MEDIUM confidence)
- `src/analysis/__tests__/aggregateScores.test.ts` (codebase) — test fixture patterns; confirms `SessionEvent` shape used in all existing analysis tests

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns exist in codebase
- Architecture: HIGH — every touch point identified; follows established PauseDetail pattern exactly
- Pure function algorithm: HIGH — straightforward array operations; edge cases (durationMs=0, boundary clamp, tie-break) fully specified
- Whisper upgrade path: HIGH — already designed into db.ts; prop threading is trivial
- Component styling: HIGH — inline style values extracted directly from PauseDetail.tsx

**Research date:** 2026-03-17
**Valid until:** 2026-09-17 (pure TypeScript, no external dependencies)
