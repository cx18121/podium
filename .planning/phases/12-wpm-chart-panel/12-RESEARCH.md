# Phase 12: WPM Chart Panel - Research

**Researched:** 2026-03-17
**Domain:** recharts line chart, WPMWindow data projection, React component with graceful empty state
**Confidence:** HIGH

---

## Summary

Phase 12 adds a WPM-over-time line chart to the review page. The data source (`wpmWindows?: WPMWindow[]`) was written to IndexedDB in Phase 8; Phase 12 only reads it and renders it. The work is self-contained: one pure function (`computeWPMChartData`) that projects `WPMWindow[]` into recharts-compatible data points, one `WPMChart` component, and a single insertion in `Review.tsx`.

The only new dependency is recharts (latest: **3.8.0**, published 2026-03-06). It supports React 19 via peer dependency `react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'`. The core recharts primtives needed are `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`, and `ResponsiveContainer`.

Testing recharts in jsdom/vitest has one well-documented pitfall: `ResponsiveContainer` requires a real DOM width, which jsdom cannot provide. The solution is to mock `ResponsiveContainer` in the test file with a fixed-width div using `vi.mock('recharts', async (importOriginal) => {...})`. All chart content (axes, lines, dots) still renders in tests once the container is mocked.

**Primary recommendation:** Install recharts 3.8.0. Build a `computeWPMChartData()` pure function that converts `WPMWindow[]` to `{ label: string; wpm: number }[]` with time labels like "0:00", "0:30". Build `WPMChart` as a simple wrapper over recharts `LineChart` with a "no data" empty state for undefined/empty `wpmWindows`. Mock `ResponsiveContainer` in component tests. Wire into `Review.tsx` after `FillerBreakdown` and before `AnnotatedPlayer`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANAL-06 | User sees WPM over time as a chart (30s windows) in review | `wpmWindows?: WPMWindow[]` is already stored in IndexedDB (Phase 8 FOUND-02). recharts `LineChart` renders the data. `computeWPMChartData()` projects windows to `{ label, wpm }`. Empty state handles undefined/missing `wpmWindows` (pre-Phase-8 sessions) and sessions too short to produce any windows. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.0 | React charting library — LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer | The phase description explicitly mandates recharts; it is the ecosystem standard for React charts with full TypeScript types, composable API, and zero build-time dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-is | ^19.0.0 (already installed via react-dom) | Peer dependency required by recharts | Automatically satisfied; recharts declares it as a peer |
| vitest `vi.mock` | ^4.1.0 (already installed) | Mock `ResponsiveContainer` so tests run in jsdom | Required for every recharts component test in jsdom |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | Hand-rolled SVG line chart | SparklineChart in the project is a hand-rolled SVG; recharts is required by the phase spec and provides axes, tooltips, and grid that would need to be custom-built |
| recharts | victory, nivo, chart.js | recharts is the spec requirement; all alternatives add complexity for no gain |

**Installation:**
```bash
npm install recharts
```

**Version verification (confirmed 2026-03-17):**
- `recharts` current: **3.8.0** (published 2026-03-06)
- Peer deps: `react ^16.8+`, `react-dom ^16.0+`, `react-is ^16.8+` — all already in project

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── analysis/
│   └── wpmChart.ts            # computeWPMChartData() pure function
│   └── wpmChart.test.ts       # unit tests for pure function
├── components/
│   └── WPMChart/
│       ├── WPMChart.tsx        # recharts wrapper component
│       └── WPMChart.test.tsx   # component tests (mocks ResponsiveContainer)
└── pages/
    └── Review.tsx              # wire WPMChart after FillerBreakdown
```

This mirrors Phase 11 (FillerBreakdown): pure function in `src/analysis/`, component in `src/components/WPMChart/`.

### Pattern 1: computeWPMChartData() Pure Function
**What:** Converts `WPMWindow[]` → `{ label: string; wpm: number }[]`. The label is a human-readable time string derived from `startMs`, e.g. `"0:00"`, `"0:30"`, `"1:00"`.
**When to use:** Called inside the component to project data before passing to recharts.

**Time label formula:**
```typescript
// Source: standard mm:ss formatting, confirmed in project (durationDisplay in Review.tsx)
function msToLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
```

**Full function:**
```typescript
// Source: WPMWindow interface from src/db/db.ts (Phase 8)
import type { WPMWindow } from '../db/db';

export interface WPMChartPoint {
  label: string;  // e.g. "0:00", "0:30"
  wpm: number;
}

export function computeWPMChartData(windows: WPMWindow[]): WPMChartPoint[] {
  return windows.map(w => ({
    label: msToLabel(w.startMs),
    wpm: w.wpm,
  }));
}
```

**Edge cases to cover in tests:**
- `[]` (empty windows array) → returns `[]`
- Single window (30–60 second session) → returns 1 point
- Window at exactly 0ms → label is `"0:00"`
- Window at 30000ms → label is `"0:30"`
- Window at 60000ms → label is `"1:00"`
- Window at 90000ms → label is `"1:30"`
- Window at 3600000ms (60 min) → label is `"60:00"`

### Pattern 2: WPMChart Component with recharts
**What:** Renders a `ResponsiveContainer > LineChart` with the projected data points. Renders a "no data" empty state if `wpmWindows` is `undefined` or empty.

**Empty state guard:**
```tsx
// Three conditions require empty state:
// 1. wpmWindows is undefined (pre-Phase-8 session — no wpmWindows field in storage)
// 2. wpmWindows is [] (session was recorded but transcript produced no final segments)
// 3. chartData is [] (computeWPMChartData returned nothing)
const chartData = computeWPMChartData(wpmWindows ?? []);
if (!wpmWindows || chartData.length === 0) {
  return <EmptyState />;
}
```

**Full component:**
```tsx
// Source: recharts official docs — LineChart composed API
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { computeWPMChartData } from '../../analysis/wpmChart';
import type { WPMWindow } from '../../db/db';

interface WPMChartProps {
  wpmWindows?: WPMWindow[];
}

export default function WPMChart({ wpmWindows }: WPMChartProps) {
  const chartData = computeWPMChartData(wpmWindows ?? []);

  const panelStyle: React.CSSProperties = {
    background: '#0b1022',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '18px',
    padding: '24px',
    width: '100%',
    fontFamily: 'Figtree, system-ui, sans-serif',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#8a9bc2',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 16px 0',
  };

  if (!wpmWindows || chartData.length === 0) {
    return (
      <div style={panelStyle}>
        <h3 style={headingStyle}>Speaking Pace</h3>
        <p style={{ fontSize: '14px', color: '#5e6f94', margin: 0 }}>
          No data available
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <h3 style={headingStyle}>Speaking Pace</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#5e6f94', fontSize: 11, fontFamily: 'Figtree' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#5e6f94', fontSize: 11, fontFamily: 'Figtree' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
            unit=" wpm"
          />
          <Tooltip
            contentStyle={{
              background: '#0d1526',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '10px',
              fontFamily: 'Figtree',
              fontSize: '13px',
              color: '#e4e9f5',
            }}
            formatter={(value: number) => [`${value} wpm`, 'Pace']}
          />
          <Line
            type="monotone"
            dataKey="wpm"
            stroke="#5b8fff"
            strokeWidth={2}
            dot={{ fill: '#5b8fff', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Styling decisions:**
- Accent color: `#5b8fff` (indigo — project primary per Phase 7 color scheme; SparklineChart uses `#5b8fff`)
- Panel background/border/radius: matches `PauseDetail` and `FillerBreakdown` panels verbatim
- Heading: matches all other review panels (14px, `#8a9bc2`, uppercase, `0.06em` spacing)

### Pattern 3: Testing WPMChart with Mocked ResponsiveContainer
**What:** `ResponsiveContainer` measures DOM width via `ResizeObserver` which jsdom cannot provide. Mock it in test file with a fixed-width div.

**Vitest mock pattern (TypeScript):**
```typescript
// Source: vitest.dev/guide/mocking + recharts/recharts issue #2268
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 200 }}>{children}</div>
    ),
  };
});
```

**Key rule:** The `vi.mock` call must be at the top level of the test file (vitest hoists it). It must use `async (importOriginal)` to spread the real recharts exports so other components (LineChart, Line, etc.) work normally — only `ResponsiveContainer` is replaced.

### Pattern 4: Review.tsx Insertion
**What:** WPMChart goes after FillerBreakdown, before AnnotatedPlayer (continuing the review panel order).

**Current Review.tsx order (lines ~113–131):**
```
<ScorecardView scorecard={scorecard} />
<div ...><PauseDetail .../></div>
<div ...><FillerBreakdown .../></div>   ← after Phase 11
<!-- INSERT WPMChart HERE -->
<div ...><AnnotatedPlayer .../></div>
```

**Insertion:**
```tsx
import WPMChart from '../components/WPMChart/WPMChart';

// After FillerBreakdown wrapper div:
<div style={{ width: '100%', maxWidth: '672px' }}>
  <WPMChart wpmWindows={session.wpmWindows} />
</div>
```

`session.wpmWindows` is `WPMWindow[] | undefined` — passes through as-is; component handles both cases.

### Anti-Patterns to Avoid
- **Rendering `ResponsiveContainer` width="100%" in tests without mocking:** Results in `"Maybe you don't need ResponsiveContainer"` warning and chart renders with 0px width, making assertions unreliable.
- **Accessing `wpmWindows.length` without null guard:** `wpmWindows` is `undefined` for sessions loaded from IndexedDB before Phase 8 — always check `!wpmWindows` before accessing `.length`.
- **Hardcoding chart height in pixels without `ResponsiveContainer`:** The chart must respond to panel width. `ResponsiveContainer width="100%"` handles this; removing it produces a chart wider than its container.
- **Gap-filling missing windows:** `wpmWindows` only contains windows with speech data (as documented in Phase 8 RESEARCH.md Open Questions). Do not gap-fill in Phase 12. Recharts will render the points it has; sparse sessions simply have fewer data points.
- **Using dynamic Tailwind classes for chart colors:** Phase 7 decision — inline CSSProperties only for dynamic/variable colors. Confirmed by `[07-05]` and `[07-06]` STATE.md decisions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line chart with axes, tooltip, grid | Custom SVG path (like SparklineChart) | recharts `LineChart` | SparklineChart is 80 lines of SVG math and has no axes, tooltip, or grid — replicating all of that is hundreds of lines with ResizeObserver complexity |
| Responsive chart width | Manual `useRef` + `ResizeObserver` | recharts `ResponsiveContainer` | ResponsiveContainer handles ResizeObserver, cleanup, and reflow automatically |
| Tooltip positioning | Manual DOM positioning | recharts `Tooltip` | Recharts tooltip handles viewport clamping, pointer tracking, and keyboard accessibility |

**Key insight:** The SparklineChart in the project is appropriate for its use case (tiny history sparklines with no axes). The WPM chart requires axes, labeled ticks, and an interactive tooltip — this is precisely recharts' value proposition.

---

## Common Pitfalls

### Pitfall 1: ResponsiveContainer Renders 0-Width in jsdom
**What goes wrong:** `ResponsiveContainer` with `width="100%"` produces a 0x0 chart in jsdom. Chart children may not render, making `getByText` and `getByRole` assertions fail silently.
**Why it happens:** jsdom has no layout engine. `ResizeObserver` (used internally by `ResponsiveContainer`) reports `contentRect.width = 0`.
**How to avoid:** Mock `ResponsiveContainer` in every test file that renders `WPMChart` using `vi.mock('recharts', async (importOriginal) => {...})` with a fixed-width div replacement.
**Warning signs:** Tests pass with `.toBeInTheDocument()` assertions but fail to find SVG elements or chart labels.

### Pitfall 2: Crash on undefined wpmWindows (Pre-Phase-8 Sessions)
**What goes wrong:** Passing `session.wpmWindows` directly to recharts `data` prop as `undefined` causes a runtime error or produces no render.
**Why it happens:** `session.wpmWindows` is `undefined` on sessions recorded before Phase 8 ran (the schema v3 upgrade clears old data, but this is still the documented graceful-degradation contract per success criterion 3).
**How to avoid:** In the component, check `if (!wpmWindows || chartData.length === 0)` before rendering the `LineChart`. Show "No data available" text in the empty state.
**Warning signs:** Success criterion 3 fails — blank chart or console error when opening a session without `wpmWindows`.

### Pitfall 3: Single-Window Session Chart Renders as a Dot, Not a Line
**What goes wrong:** A 30–60 second session has exactly one `WPMWindow`, producing one data point. recharts `LineChart` renders it as an isolated dot with no connecting line.
**Why it happens:** A line requires at least two points. One-point data is a valid edge case (success criterion 4 mentions "as short as one window").
**How to avoid:** This is acceptable behavior — a single dot with the correct WPM value satisfies the requirement. Do NOT add artificial data points or error-suppress single-window sessions. Ensure the `dot` prop is configured on `Line` so the single point is visible (e.g. `dot={{ r: 3 }}`).
**Warning signs:** Single-session review shows an empty chart area with no visible data mark.

### Pitfall 4: YAxis Unit Label Overflows Panel
**What goes wrong:** `unit=" wpm"` on the `YAxis` tick adds 4+ characters to each tick label, pushing the label outside the chart's left margin.
**Why it happens:** recharts calculates tick label width at render time; small `margin.left` values clip the text.
**How to avoid:** Set `margin={{ top: 4, right: 4, left: -20, bottom: 0 }}` and use `tick={{ fontSize: 11 }}` to keep labels compact. Alternatively, omit `unit` and label the axis with a static text element.
**Warning signs:** Y-axis numbers appear clipped or overlapping the chart area.

### Pitfall 5: vi.mock Hoisting Requires Top-Level Placement
**What goes wrong:** Placing `vi.mock('recharts', ...)` inside a `describe` block or `beforeEach` causes it to run after the module is imported, so the real `ResponsiveContainer` runs instead of the mock.
**Why it happens:** Vitest hoists `vi.mock` calls to the top of the file during transformation — this only works for top-level calls.
**How to avoid:** Always put `vi.mock('recharts', ...)` at the module scope (top level of the test file), not inside any function or block.
**Warning signs:** Tests intermittently pass/fail depending on import order; `vi.mock` warnings in console.

---

## Code Examples

Verified patterns from official sources and project codebase:

### recharts LineChart Full Usage
```tsx
// Source: recharts composable API (recharts.org — LineChart docs)
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
    <XAxis dataKey="label" tick={{ fill: '#5e6f94', fontSize: 11 }} tickLine={false} />
    <YAxis tick={{ fill: '#5e6f94', fontSize: 11 }} tickLine={false} unit=" wpm" />
    <Tooltip
      contentStyle={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px' }}
      formatter={(value: number) => [`${value} wpm`, 'Pace']}
    />
    <Line type="monotone" dataKey="wpm" stroke="#5b8fff" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
  </LineChart>
</ResponsiveContainer>
```

### Vitest Mock for ResponsiveContainer
```typescript
// Source: vitest.dev/guide/mocking + recharts/recharts issue #2268
// Must be top-level in test file (vi.mock is hoisted)
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 200 }}>{children}</div>
    ),
  };
});
```

### computeWPMChartData Pure Function
```typescript
// Source: WPMWindow interface from src/db/db.ts (Phase 8 FOUND-02)
import type { WPMWindow } from '../db/db';

export interface WPMChartPoint {
  label: string;
  wpm: number;
}

function msToLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function computeWPMChartData(windows: WPMWindow[]): WPMChartPoint[] {
  return windows.map(w => ({
    label: msToLabel(w.startMs),
    wpm: w.wpm,
  }));
}
```

### Empty State Pattern (matching project panels)
```tsx
// Source: PauseDetail.tsx + FillerBreakdown.tsx panel style — identical panel container
if (!wpmWindows || chartData.length === 0) {
  return (
    <div style={{ background: '#0b1022', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#8a9bc2', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px 0' }}>
        Speaking Pace
      </h3>
      <p style={{ fontSize: '14px', color: '#5e6f94', margin: 0 }}>
        No data available
      </p>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SparklineChart (hand-rolled SVG, no axes) | recharts LineChart (composable, axes + tooltip + grid) | Phase 12 (first recharts use in project) | recharts is first external charting library; SparklineChart remains for session history sparklines |
| Single average WPM figure (wpm_snapshot event) | Per-window WPM array (`wpmWindows`) | Phase 8 FOUND-02 | Phase 12 can now display temporal pacing variation |

**Deprecated/outdated:**
- Nothing removed. The wpm_snapshot event in eventLog still drives `scorePacing()`. Phase 12 reads `wpmWindows` in parallel; no changes to scoring.

---

## Open Questions

1. **Gap-filling silent windows**
   - What we know: Phase 8 does not gap-fill missing windows (documented in 08-RESEARCH.md Open Questions section). A 3-minute session where the speaker is silent from 1:00–2:00 will have no window for that range.
   - What's unclear: Whether the chart should show an explicit gap or simply skip to the next spoken window.
   - Recommendation: Do not gap-fill. recharts will render only the windows present. For the chart to show a visual gap, explicit zero-WPM points would need to be inserted — this adds complexity and the spec does not require it. A sparse chart is acceptable.

2. **Heading label: "Speaking Pace" vs "WPM Over Time"**
   - What we know: Success criterion 2 says "y-axis shows words per minute." No heading text is specified in the requirement.
   - What's unclear: Whether a short title ("Speaking Pace") or a literal title ("Words Per Minute") is preferred.
   - Recommendation: Use "Speaking Pace" — consistent with the coaching framing of the product and avoids the jargon of "WPM" in the panel heading. The y-axis unit clarifies the metric.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vite.config.ts` (`test.pool = 'vmThreads'`, `environment = 'jsdom'`) |
| Quick run command | `npx vitest run src/analysis/wpmChart.test.ts src/components/WPMChart/WPMChart.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANAL-06 | computeWPMChartData returns correct labels and wpm values | unit | `npx vitest run src/analysis/wpmChart.test.ts` | ❌ Wave 0 |
| ANAL-06 | WPMChart renders heading "Speaking Pace" | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ Wave 0 |
| ANAL-06 | WPMChart renders "No data available" when wpmWindows is undefined | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ Wave 0 |
| ANAL-06 | WPMChart renders "No data available" when wpmWindows is empty array | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ Wave 0 |
| ANAL-06 | WPMChart renders X-axis time labels from chart data | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ Wave 0 |
| ANAL-06 | WPMChart renders for single-window session (30–60s) | unit (component) | `npx vitest run src/components/WPMChart/WPMChart.test.tsx` | ❌ Wave 0 |
| ANAL-06 | Review.tsx imports and renders WPMChart with session.wpmWindows | unit (component) | `npx vitest run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/analysis/wpmChart.test.ts src/components/WPMChart/WPMChart.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/analysis/wpmChart.ts` — `computeWPMChartData` + `WPMChartPoint` — covers ANAL-06 pure function
- [ ] `src/analysis/wpmChart.test.ts` — unit tests for `computeWPMChartData`
- [ ] `src/components/WPMChart/WPMChart.tsx` — recharts component with empty state
- [ ] `src/components/WPMChart/WPMChart.test.tsx` — component tests with `vi.mock('recharts', ...)` at top level
- [ ] Framework install: `npm install recharts` — recharts is not yet in `package.json`

---

## Sources

### Primary (HIGH confidence)
- `src/db/db.ts` (project codebase) — `WPMWindow` interface shape confirmed: `{ startMs, endMs, wpm, wordCount }`
- `src/pages/Review.tsx` (project codebase) — insertion point confirmed: after `FillerBreakdown`, before `AnnotatedPlayer`; `session.wpmWindows` available in scope
- `src/components/PauseDetail/PauseDetail.tsx` and `src/components/FillerBreakdown/FillerBreakdown.tsx` (project codebase) — panel inline style tokens confirmed
- `.planning/phases/08-schema-migration-wpm-windows/08-RESEARCH.md` — gap-fill decision (do not gap-fill), `wpmWindows` undefined contract documented
- npm registry — recharts 3.8.0 confirmed as latest (published 2026-03-06), React 19 peer dep satisfied

### Secondary (MEDIUM confidence)
- [recharts/recharts GitHub issue #2268](https://github.com/recharts/recharts/issues/2268) — ResponsiveContainer jsdom testing pitfall and mock solution confirmed by multiple contributors
- [vitest.dev/guide/mocking](https://vitest.dev/guide/mocking.html) — `vi.mock(module, async (importOriginal) => {...})` TypeScript pattern

### Tertiary (LOW confidence)
- WebSearch results for recharts dark theme styling — supplementary, not required (project panel styles are the authoritative source)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts version confirmed on npm registry (2026-03-06); peer deps confirmed; React 19 compatible
- Architecture: HIGH — `WPMWindow` interface confirmed in codebase; insertion point confirmed in Review.tsx; panel style tokens confirmed in PauseDetail and FillerBreakdown
- Pitfalls: HIGH — ResponsiveContainer jsdom pitfall confirmed by multiple GitHub issues and project test pattern; `wpmWindows` undefined case confirmed by Phase 8 schema contract
- Testing pattern: HIGH — `vi.mock` hoisting behavior is documented in vitest.dev; GitHub issue #2268 confirms the exact mock shape

**Research date:** 2026-03-17
**Valid until:** 2026-06-17 (recharts 3.x is stable; algorithm is deterministic; valid until next major version)
