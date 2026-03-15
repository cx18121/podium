# Phase 4: Session History - Research

**Researched:** 2026-03-15
**Domain:** IndexedDB list queries (Dexie), inline SVG sparklines, React state machine extension, browser Storage API
**Confidence:** HIGH

---

## Summary

Phase 4 adds three screens of behavior on top of already-implemented infrastructure: a session list (HIST-01), navigation back into the existing Review page from history (HIST-02), and per-dimension sparkline trend charts (HIST-03). All data lives in the existing Dexie `sessions` table — no schema changes are required. The scorecard's `dimensions` field stores flat numbers keyed by dimension name (`Record<string, number>`), which is exactly what sparklines need.

The UI-SPEC has been fully approved and prescribes all component names, Tailwind classes, colors, typography, and copy verbatim. Inline SVG is mandated for sparklines — no charting library. The App.tsx state machine needs one new view (`'history'`), a `selectedSessionId` state variable (the current `savedSessionId` only tracks the most-recently-saved session), and two new navigation paths (SetupScreen → history, ReviewPage → history).

The key implementation insight is lazy loading: the session list must query `sessions` WITHOUT loading `videoBlob` (which can be 100s of MB per row). Dexie supports this via `.toArray()` on the full table but the schema currently does not provide a projection; the safe pattern is to fetch all fields and discard `videoBlob` in the component, or use `db.sessions.orderBy('createdAt').toArray()` and rely on the fact that `useLiveQuery` only triggers rerenders when Dexie detects writes. This is acceptable for <100 sessions because IndexedDB loads Blob references lazily — but the UI-SPEC explicitly calls out that video loading must NOT happen until a session is opened.

**Primary recommendation:** Build in three sequential tasks — (1) HistoryView with session list + navigation, (2) SparklineChart + StorageQuotaBar + App.tsx state machine wiring, (3) tests. The state machine extension is the highest-risk change because it touches App.tsx, which owns all recording state.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dexie | ^4.3.0 | IndexedDB ORM — all session reads/deletes | Already in use; `db.sessions.orderBy('createdAt').reverse().toArray()` covers HIST-01 |
| dexie-react-hooks | ^4.2.0 | `useLiveQuery` for reactive session list | Already in use in App.tsx; keeps list automatically up-to-date after deletes |
| react | ^19.0.0 | Component tree, state | Project standard |
| tailwindcss | ^4.2.1 | All styling via utility classes | Project standard, no config file |

### No New Dependencies

The UI-SPEC explicitly mandates inline SVG for sparklines. No charting library (Recharts, Chart.js, Visx) should be added. The `navigator.storage.estimate()` API is built into all modern browsers.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG sparklines | Recharts / Visx | Recharts is a real dependency (~100 KB); inline SVG keeps bundle zero-cost and matches the 32px h-8 compact constraint exactly |
| `useLiveQuery` for list | `useEffect` + manual re-fetch | `useLiveQuery` automatically re-renders after Dexie writes (deletes, new sessions) without manual subscription management |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── pages/
│   ├── Review.tsx           # existing — needs onBack prop added
│   └── HistoryView.tsx      # new page component (Phase 4)
├── components/
│   ├── SessionListItem/
│   │   └── SessionListItem.tsx    # new
│   ├── SparklineChart/
│   │   └── SparklineChart.tsx     # new — inline SVG
│   ├── StorageQuotaBar/
│   │   └── StorageQuotaBar.tsx    # new
│   └── DeleteConfirmModal/
│       └── DeleteConfirmModal.tsx # new
└── App.tsx                  # state machine extension
```

### Pattern 1: Dexie Live Query for Session List

**What:** `useLiveQuery` wraps a Dexie query and re-renders the component whenever the underlying table changes.

**When to use:** Any component that renders data that can be mutated (new sessions added, sessions deleted).

**Example:**
```typescript
// Source: dexie-react-hooks official docs
// https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

const sessions = useLiveQuery(
  () => db.sessions.orderBy('createdAt').reverse().toArray(),
  []
);
// sessions is undefined on first render (loading), then Session[] once resolved
// Automatically re-renders when any session is added or deleted
```

**Critical:** `useLiveQuery` returns `undefined` on the initial render while the query is in flight. Components must guard `if (sessions === undefined)` for the loading state.

### Pattern 2: Dexie Delete with Live Query

**What:** Delete a record by primary key; `useLiveQuery` auto-updates the list.

**Example:**
```typescript
// Source: Dexie.js docs — https://dexie.org/docs/Table/Table.delete()
await db.sessions.delete(sessionId);
// No manual state update needed — useLiveQuery invalidates automatically
```

### Pattern 3: Inline SVG Sparkline

**What:** Render a line chart as inline SVG, computing x/y coordinates from score arrays.

**When to use:** Compact (32px height) trend display where adding a charting library is unwarranted.

**Example:**
```typescript
// Source: SVG path spec — no third-party lib needed
interface SparklineChartProps {
  scores: number[];   // 0–100, one per session (oldest → newest)
  label: string;
}

export function SparklineChart({ scores, label }: SparklineChartProps) {
  const W = 200; // viewBox width; will stretch to container via CSS
  const H = 32;  // matches h-8 = 32px
  const pad = 4;

  if (scores.length < 2) {
    return (
      <div className="h-8 flex items-center">
        <span className="text-xs text-gray-600">Record more sessions to see trends</span>
      </div>
    );
  }

  const pts = scores.map((s, i) => ({
    x: pad + (i / (scores.length - 1)) * (W - pad * 2),
    y: H - pad - ((s / 100) * (H - pad * 2)),
  }));

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full" aria-hidden="true">
        <path d={d} stroke="rgb(251 191 36)" strokeWidth="1.5" fill="none" opacity="0.5" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="rgb(251 191 36)" />
        ))}
      </svg>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
```

### Pattern 4: App.tsx State Machine Extension

**What:** Adding a `'history'` view to the existing `AppView` union type and wiring bidirectional navigation.

**Key concern:** `savedSessionId` tracks the most-recently-saved session. For history navigation, any session can be opened — a second state variable `selectedSessionId` or a unified `activeSessionId` is needed.

**Recommended approach:** Keep `savedSessionId` for the post-recording flow. Add `historySessionId: number | null` state for opening sessions from history. ReviewPage receives either, selected via whichever is non-null.

**Alternative:** Unify into a single `activeSessionId: number | null` and set it on both the save path and the history-open path. This is cleaner but requires renaming `savedSessionId` — a small refactor.

**Navigation additions required:**
- SetupScreen needs an `onViewHistory?: () => void` prop (optional, only shown when `hasExistingSessions`)
- ReviewPage needs an `onBack?: () => void` prop to return to history (only shown when opened from history)
- The current "Record Another Session" button in ReviewPage always goes to setup; when opened from history, a "Back to History" link should also be present

### Pattern 5: Storage Quota Query

**What:** `navigator.storage.estimate()` returns quota and usage in bytes.

**Example:**
```typescript
// Source: MDN Web Docs — https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
useEffect(() => {
  if (!navigator.storage?.estimate) return;
  navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
    setUsedMB(Math.round(usage / 1_048_576));
    setTotalMB(Math.round(quota / 1_048_576));
  });
}, []);
```

The API is available in all modern browsers (Chrome 55+, Firefox 57+, Safari 15.2+). The UI-SPEC says to hide the bar entirely if the API is unavailable — no error state.

### Anti-Patterns to Avoid

- **Loading videoBlob in the history list:** Each blob can be hundreds of MB. The session list must never trigger blob loading — only display metadata (title, createdAt, durationMs, scorecard.overall).
- **Manual Dexie subscription with useEffect:** Do not replicate the `useLiveQuery` pattern with `useEffect` + `db.sessions.toArray()` — it won't auto-update on deletes.
- **Inline sparkline points as React state:** Compute sparkline SVG coordinates directly in render from the `scores` prop array — no need to store computed geometry in state.
- **Forgetting the `undefined` guard for useLiveQuery:** On the first render, `useLiveQuery` returns `undefined`. Treating it as an empty array causes the empty state to flash before data loads.
- **Mutating App.tsx AppView type without updating all branches:** The `return null` fallback at the bottom of App.tsx will silently render nothing if a new view is added but not handled. Every new view needs a corresponding `if (view === '...')` branch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive list that updates after delete | `useEffect` + manual re-fetch | `useLiveQuery` from dexie-react-hooks | Built-in Dexie reactivity; manual subscriptions require cleanup and miss concurrent updates |
| Storage estimate | Custom calculation | `navigator.storage.estimate()` | Browser API handles quota variations across Chrome/Firefox/Safari; custom tracking would require summing all blob sizes manually |

**Key insight:** The Dexie and browser APIs cover all novel data access in this phase. The real implementation work is UI composition and state machine wiring.

---

## Common Pitfalls

### Pitfall 1: videoBlob Eagerly Loaded by useLiveQuery

**What goes wrong:** `db.sessions.orderBy('createdAt').reverse().toArray()` fetches entire Session objects, including the `videoBlob` Blob. With 10+ sessions of 30MB each that is 300MB+ resident in memory just to render a list.

**Why it happens:** Dexie has no built-in projection (column selection) for its fluent API. `toArray()` always returns full objects.

**How to avoid:** Two options:
1. Accept full objects but never create an ObjectURL from them in the list component. The Blob object itself (without `URL.createObjectURL`) does not cause memory pressure from decompressed video frames — it is just a handle to IndexedDB storage.
2. Use `db.sessions.orderBy('createdAt').reverse().toArray()` and immediately destructure to omit `videoBlob` in the mapping step.

The UI-SPEC interaction contract already mandates "Renders metadata only — videoBlob NOT loaded until user opens the session." This means option 1 is correct: do not call `URL.createObjectURL` anywhere in the history list — only in `ReviewPage` on mount.

**Warning signs:** Memory usage spikes when the history list mounts with many sessions.

### Pitfall 2: Scorecard May Be Null for Old Sessions

**What goes wrong:** `scorecard` is `null` until the user opens a session for the first time (Review.tsx computes and persists it on first open — SCORE-03). A session that was saved but never reviewed will have `scorecard: null` in the list.

**Why it happens:** SCORE-03 was designed to compute lazily on first review, not at save time.

**How to avoid:** The SessionListItem must handle `scorecard === null` gracefully. The score badge should show `"—"` or `"N/A"` when scorecard is null, not crash. Do not compute scores in the list view — only show stored values.

**Warning signs:** TypeScript will catch `session.scorecard.overall` if the null check is missing, but only if types are strict.

### Pitfall 3: useLiveQuery Returns undefined Before Data Is Ready

**What goes wrong:** Component renders before Dexie resolves the query. If `sessions` is treated as `[]`, the empty state ("No sessions yet") flashes briefly even when sessions exist.

**Why it happens:** `useLiveQuery` is async — the initial value is `undefined` while the IndexedDB request is pending.

**How to avoid:** Always check `if (sessions === undefined)` first and render the loading state ("Loading sessions...").

**Warning signs:** Users with sessions see a brief empty-state flash on load.

### Pitfall 4: App.tsx State Machine Return null Trap

**What goes wrong:** Adding `'history'` to `AppView` but forgetting to add the corresponding `if (view === 'history')` branch in App.tsx. The final `return null` silently renders a blank screen.

**Why it happens:** TypeScript's exhaustive check does not apply to `if` chains — only to `switch` with type narrowing. The current code uses `if` chains.

**How to avoid:** Add the `'history'` branch immediately after adding the type. Also update the comment at the top of App.tsx describing the state machine.

### Pitfall 5: Sparkline With Fewer Than 2 Sessions

**What goes wrong:** An SVG line requires at least 2 points. With 0 or 1 sessions, the path computation divides by `(scores.length - 1)` = 0.

**Why it happens:** Division by zero in the x-coordinate formula.

**How to avoid:** Guard `if (scores.length < 2)` and render the "Record more sessions to see trends" message instead. The UI-SPEC already specifies this fallback.

### Pitfall 6: History-Opened Review Page Has No Back Path

**What goes wrong:** User opens a session from history, watches it, then clicks "Record Another Session" which goes to `'setup'` — the history list is gone and they must navigate back from scratch. On the current codebase, there is no way to get back to history from setup.

**Why it happens:** ReviewPage was designed post-recording only; `onRecordAgain` always goes to `'setup'`.

**How to avoid:** Add a context parameter or a second callback prop to ReviewPage. When opened from history, show "Back to History" in addition to (or instead of) "Record Another Session". The planner must decide which callback signature to use.

---

## Code Examples

Verified patterns from the existing codebase and official sources:

### Reading Sessions for History List (Dexie)
```typescript
// Source: dexie-react-hooks — https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
const sessions = useLiveQuery(
  () => db.sessions.orderBy('createdAt').reverse().toArray(),
  []
);
// Handle undefined (loading), then map over sessions — never access session.videoBlob
```

### Sparkline Data Extraction from Stored Scorecard
```typescript
// The Scorecard type stored in Dexie:
// { overall: number; dimensions: Record<string, number> }
// For sparklines, gather per-dimension scores across N sessions:
const dimensionKeys = ['eyeContact', 'fillers', 'pacing', 'expressiveness', 'gestures'];

const sparklineData = dimensionKeys.map(key => ({
  label: key,
  scores: sessions
    .filter(s => s.scorecard !== null)
    .map(s => s.scorecard!.dimensions[key] ?? 0),
}));
```

### Deleting a Session
```typescript
// Source: Dexie.js docs — Table.delete()
await db.sessions.delete(sessionId);
// useLiveQuery will automatically re-render the list
```

### Storage Quota Bar
```typescript
// Source: MDN StorageManager.estimate()
const [storageInfo, setStorageInfo] = useState<{ usedMB: number; totalMB: number } | null>(null);

useEffect(() => {
  if (!navigator.storage?.estimate) return;
  navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
    setStorageInfo({
      usedMB: Math.round(usage / 1_048_576),
      totalMB: Math.round(quota / 1_048_576),
    });
  });
}, []);
// If storageInfo is null, hide the bar entirely
```

### Extending App.tsx AppView
```typescript
// Existing:
type AppView = 'home' | 'setup' | 'recording' | 'processing' | 'naming' | 'review';
// Extended:
type AppView = 'home' | 'setup' | 'recording' | 'processing' | 'naming' | 'review' | 'history';

// New state for history-opened session:
const [historySessionId, setHistorySessionId] = useState<number | null>(null);

// ReviewPage branch — handles both post-recording and history-open:
if (view === 'review') {
  const sessionId = savedSessionId ?? historySessionId;
  if (sessionId === null) return null;
  return (
    <ReviewPage
      sessionId={sessionId}
      onRecordAgain={() => setView('setup')}
      onBack={historySessionId !== null ? () => {
        setHistorySessionId(null);
        setView('history');
      } : undefined}
    />
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual IndexedDB with addEventListener | Dexie + useLiveQuery | Dexie 3.x / dexie-react-hooks 1.x | Reactive updates without manual subscription cleanup |
| SVG charts via D3 | Inline SVG with computed path strings | N/A — always been possible | Eliminates D3 dependency for simple sparklines; D3 still justified for interactive charts |

---

## Open Questions

1. **ReviewPage onBack callback signature**
   - What we know: ReviewPage currently only has `onRecordAgain: () => void` and `sessionId: number`
   - What's unclear: Whether to add `onBack?: () => void` as optional prop or use a `source: 'recording' | 'history'` discriminant
   - Recommendation: Add `onBack?: () => void`. When defined, show "Back to History" button. When undefined (post-recording flow), omit it. Simpler than a discriminant.

2. **SetupScreen "View History" link placement**
   - What we know: UI-SPEC says "History accessible from: SetupScreen (returning user flow — 'View History' link)"
   - What's unclear: Exact position — below the camera preview, above Start Recording, or as a text link?
   - Recommendation: Small text link (`text-sm text-gray-400 underline`) below the primary "Start Recording" button. Does not compete with the primary CTA.

3. **Trend direction label computation**
   - What we know: UI-SPEC specifies "↑ improving", "→ stable", "↓ declining" labels with green/gray/red colors
   - What's unclear: The threshold for "stable" vs. "improving/declining" (e.g., less than 5-point change = stable?)
   - Recommendation: Use a ±5 point threshold over the last 3 sessions vs. the 3 sessions before that. If fewer than 4 sessions exist, show no trend label. Implement in a pure function `computeTrendDirection(scores: number[]): 'improving' | 'stable' | 'declining'`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 + @testing-library/react ^16.3.2 |
| Config file | `vite.config.ts` (test block, pool: vmThreads) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Session list renders sessions from Dexie with correct metadata (title, date, duration, score) | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 |
| HIST-01 | Empty state renders when no sessions exist | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 |
| HIST-01 | Loading state renders while useLiveQuery resolves | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 |
| HIST-01 | Scorecard null renders "—" gracefully | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 |
| HIST-01 | Delete flow: confirm modal appears, session removed from list | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 |
| HIST-02 | Clicking a session row calls navigation to review view | unit | `npx vitest run src/pages/HistoryView.test.tsx` | ❌ Wave 0 |
| HIST-03 | SparklineChart renders SVG path when ≥2 scores provided | unit | `npx vitest run src/components/SparklineChart/SparklineChart.test.tsx` | ❌ Wave 0 |
| HIST-03 | SparklineChart renders empty message when <2 scores | unit | `npx vitest run src/components/SparklineChart/SparklineChart.test.tsx` | ❌ Wave 0 |
| HIST-03 | computeTrendDirection returns correct direction values | unit | `npx vitest run src/components/SparklineChart/SparklineChart.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/pages/HistoryView.test.tsx` — covers HIST-01, HIST-02
- [ ] `src/components/SparklineChart/SparklineChart.test.tsx` — covers HIST-03
- [ ] `src/components/DeleteConfirmModal/DeleteConfirmModal.test.tsx` — optional unit test for modal isolation

*(StorageQuotaBar and SessionListItem are pure presentational — test via HistoryView integration test rather than isolated unit tests)*

---

## Sources

### Primary (HIGH confidence)
- Dexie.js official docs — `useLiveQuery`, `orderBy`, `reverse`, `toArray`, `delete` APIs verified at https://dexie.org/docs/
- dexie-react-hooks — `useLiveQuery` hook signature and undefined-on-loading behavior verified at https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
- MDN Web Docs — `navigator.storage.estimate()` browser compatibility and return type at https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
- Existing codebase — `db.ts` schema, `App.tsx` state machine, `Review.tsx` patterns, `scorer.ts` Scorecard type — all read directly

### Secondary (MEDIUM confidence)
- SVG path `M`/`L` commands for polyline rendering — standard SVG 1.1 spec, no library needed
- Inline SVG `viewBox` + CSS `width: 100%` responsive scaling — well-established pattern

### Tertiary (LOW confidence)
- Trend direction ±5 point threshold — heuristic recommendation, no authoritative source; should be validated after first real use

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new dependencies
- Architecture: HIGH — all patterns verified against existing codebase and Dexie/MDN docs
- Pitfalls: HIGH — pitfalls 1–5 verified against actual code; pitfall 6 is a design gap confirmed by reading App.tsx and ReviewPage
- Test map: HIGH — test file paths follow existing project conventions (co-located with component/page)

**Research date:** 2026-03-15
**Valid until:** 2026-05-15 (Dexie 4.x is stable; no imminent breaking changes expected)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | User can view a list of past sessions with date, duration, and overall score | `useLiveQuery` on `db.sessions.orderBy('createdAt').reverse()` provides reactive list; `scorecard.overall` is the stored overall score; null guard pattern for sessions never reviewed |
| HIST-02 | User can open any past session to view its scorecard and annotated playback | Extend App.tsx with `historySessionId` state + `'history'` view; ReviewPage already accepts `sessionId` prop and renders full scorecard + AnnotatedPlayer; only needs `onBack` prop added |
| HIST-03 | Progress trends are shown per dimension across sessions (chart or sparkline) | Inline SVG sparkline from `scorecard.dimensions` Record values; `db.sessions.orderBy('createdAt').limit(10).toArray()` for last 10 sessions; `computeTrendDirection` pure function for ↑/→/↓ label |
</phase_requirements>
