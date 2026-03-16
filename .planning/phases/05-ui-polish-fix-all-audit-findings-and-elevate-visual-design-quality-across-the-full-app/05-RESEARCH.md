# Phase 5: UI Polish — Research

**Researched:** 2026-03-15
**Domain:** Tailwind v4 CSS utilities, WCAG accessibility, React component visual polish
**Confidence:** HIGH — all findings based on direct codebase inspection and established UI-SPEC.md contract

---

## Summary

Phase 5 is a pure visual polish phase with no new logic, routes, or data models. Every fix is precisely specified in `05-UI-SPEC.md`, which was approved before this research began. The work is a sweep across 13 components/screens, addressing 12 audit findings (A-01 through A-12) plus a copywriting pass. No external libraries are added.

The codebase uses React 19 + Vite 6 + Tailwind v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js`). All components are hand-rolled with inline SVG; no shadcn, no Radix. The test suite uses Vitest 4 + @testing-library/react in jsdom with `pool: vmThreads`. All changes in this phase are Tailwind class swaps, SVG additions, and copy string changes — no schema, logic, or API changes.

The UI-SPEC.md is the authoritative source of truth for every visual decision. The planner must treat it as a locked contract. This research document maps that contract to specific files and lines the implementer will touch, and identifies subtle implementation risks that the spec describes in principle but not in code detail.

**Primary recommendation:** Plan one wave per logical grouping of components. Accessibility fixes (A-02, A-03) deserve their own wave since they require interaction testing. Color-system fixes (A-01, A-07) can be batched together. Copy changes can be swept in a dedicated pass.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | v4.2.1 | All visual styling | Already in use; v4 via `@tailwindcss/vite`, no config file |
| React | 19.0.0 | Component rendering | Established stack |
| Vitest | 4.1.0 | Test runner | Already configured with jsdom + vmThreads |
| @testing-library/react | 16.3.2 | Component tests | Already in use |

### No New Libraries

Phase 5 introduces zero new dependencies. All solutions use existing Tailwind utilities and inline SVG, consistent with the established SparklineChart pattern.

---

## Architecture Patterns

### Component Isolation

Every fix is scoped to a single file. No fix crosses component boundaries except:
- A-01: `ScorecardView.tsx` score bar colors + `StorageQuotaBar.tsx` critical fill color — conceptually related but separate files
- A-04: Heading sizes span 4 files (Home.tsx, SetupScreen.tsx, Review.tsx, HistoryView.tsx) — must be changed consistently

### Tailwind v4 Class Pattern

This project uses Tailwind v4 with no config file. All classes are standard utilities. There is no `@apply` layer, no custom theme extension. Every fix is a direct class name replacement in JSX. Confidence: HIGH (verified from codebase).

### Inline SVG Pattern

The codebase already uses inline SVG in `SparklineChart.tsx` (path, circle elements). The A-05 spinner and A-09 play/pause overlay follow the same pattern — no SVG file imports, no icon library.

### Recommended Wave Structure

```
Wave 0: Test infrastructure gaps
Wave 1: Color system (A-01, A-07, A-08, A-12) — pure class swaps, no interaction
Wave 2: Accessibility (A-02, A-03) — touch targets, keyboard focus, ARIA
Wave 3: Typography + layout (A-04, A-06, A-11) — heading scale, max-width, nav affordance
Wave 4: Affordances + loading (A-05, A-09, A-10) — spinner, play overlay, modal cleanup
Wave 5: Copywriting sweep — all copy strings per Copywriting Contract
```

---

## File-by-File Fix Map

Every file that must change, with exact current state and required change per UI-SPEC.md.

### `src/pages/Home.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-04 heading | `text-4xl font-bold` | `text-xl font-semibold` |
| A-11 max-width | outer div has no max-width | add `max-w-3xl mx-auto w-full` to outer container |
| A-12 footnote | `text-gray-600 text-xs` | `text-gray-500 text-xs` |

### `src/components/SetupScreen/SetupScreen.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-04 heading | `text-3xl font-bold` | `text-xl font-semibold` |
| A-06 View History | `text-sm text-gray-400 underline hover:text-gray-200` | `text-sm text-gray-400 hover:text-white transition-colors px-4 py-2` + prepend `→ ` arrow character |
| A-06 touch target | no min-height | min 44px height via padding already achieved by `py-2` + font size |

### `src/App.tsx` (processing view — lines 145-151)

| Fix | Current | Target |
|-----|---------|--------|
| A-05 processing | plain `<p>Processing recording...</p>` | spinner SVG + `"Processing your recording..."` text below |

The processing view is inlined directly in `App.tsx`, not a standalone component. The spinner is `animate-spin` on an inline SVG circle arc.

### `src/components/NameSessionModal/NameSessionModal.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-10 border noise | `border border-gray-700` on inner dialog div | remove the border classes entirely |
| A-10 focus ring | `focus:border-red-500` | `focus:border-red-600` |
| copy: Save button | `"Save"` | `"Save Session"` |
| copy: Skip button | `"Skip"` | `"Use auto name"` |

### `src/pages/Review.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-04 heading | `text-2xl font-bold` | `text-xl font-semibold` |
| A-11 max-width | outer `flex flex-col items-center` div — no max-width | add `max-w-3xl mx-auto w-full` |
| copy: error | `'Could not load session. Try recording again.'` | `'Could not load this session. Try recording a new one.'` |

### `src/components/ScorecardView/ScorecardView.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-01 score bars | `bg-red-600` flat for all scores | three-tier: `>= 70: bg-emerald-500`, `40-69: bg-amber-400`, `< 40: bg-red-500` |

Score bar class must be computed from `dim.score` at render time. The logic is: a helper function or inline ternary — e.g. `dim.score >= 70 ? 'bg-emerald-500' : dim.score >= 40 ? 'bg-amber-400' : 'bg-red-500'`.

### `src/components/AnnotatedPlayer/Timeline.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-02 container height | `h-8` (32px) | `h-11` (44px) |
| A-02 marker dot size | `w-3 h-3` (12px) | `w-4 h-4` (16px) |
| A-02 marker touch target | no padding expansion | negative margin trick: `-mx-[14px] -my-[14px]` so tap area = 44×44px while dot stays 16px |

The `-mx-[14px] -my-[14px]` approach uses Tailwind v4 arbitrary value syntax. This is valid in v4. The `left` style offset must also update from `calc(${leftPct}% - 6px)` to `calc(${leftPct}% - 8px)` since the dot is now 16px wide (half = 8px).

### `src/components/SessionListItem/SessionListItem.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-03 delete visibility | `opacity-0 group-hover:opacity-100` | remove opacity-0, always visible, subdued: `text-gray-600 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500` |
| A-03 aria | no aria-label | add `aria-label="Delete session"` |
| A-07 score badge | `bg-gray-700 text-white` flat | three-tier: `>= 70: bg-emerald-900 text-emerald-300`, `40-69: bg-amber-900 text-amber-300`, `< 40: bg-red-900 text-red-300`, `'—': bg-gray-700 text-gray-400` |

Score badge: `scoreDisplay` is either `'—'` (string) or a number. The ternary must handle both.

### `src/components/SparklineChart/SparklineChart.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-08 path opacity | `opacity="0.5"` | `opacity="0.9"` |
| copy: insufficient data | `"Record more sessions to see trends"` | `"Need more sessions"` |

Note: `opacity` is an SVG attribute on the `<path>` element, not a Tailwind class. It must be changed as a JSX attribute value, not a className.

### `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-09 play affordance | bare `<video>` with `cursor-pointer` only | wrap in `relative group` div; add absolutely-positioned overlay `div` with play/pause icon SVG, `opacity-0 group-hover:opacity-100 transition-opacity duration-150` |

The AnnotatedPlayer wraps `<video>` in `flex flex-col gap-2`. The video element must be wrapped in a `relative group` div to enable the hover overlay. The overlay contains an inline SVG play icon (when paused) or pause icon (when playing), requires paused state from `videoRef.current?.paused`. The overlay button must have `aria-label` that updates between `"Play"` and `"Pause"`. This requires a `isPlaying` React state piece (or read from ref on render — but ref reads don't trigger re-renders). **Implementation note:** a `useState<boolean>` for `isPlaying`, updated in `onPlay`/`onPause` video events, is needed to set the aria-label correctly and conditionally render the icon.

### `src/components/StorageQuotaBar/StorageQuotaBar.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-01 critical fill | `bg-red-600` when critical | change to a non-accent color. UI-SPEC palette shows critical state uses `red-400` for error text, and the fill bar can stay `bg-red-600` OR switch to a separate visual — SPEC says storage critical no longer uses red-600 as accent. Safest interpretation: leave bar fill as-is but the critical WARNING text is `text-red-400` (already correct). The issue is `fillClass` uses `bg-red-600` for critical, which collides with the CTA accent. Change to `bg-red-500` or `bg-red-400` for the bar fill to distinguish from CTA buttons. |
| copy: critical | `"Storage is almost full. Delete sessions to avoid losing new recordings."` | `"Storage almost full. Delete older sessions to keep recording."` |
| copy: warning | `"Storage is nearly full. Consider deleting older sessions."` | `"Storage getting full. Consider deleting older sessions."` |

### `src/components/common/SpeechSupportBanner.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| Warning color | `bg-yellow-900/60 border-yellow-600 text-yellow-200` | consolidate to `border-yellow-600 text-yellow-600` per SPEC warning token (`yellow-600` for border and text) |

### `src/pages/HistoryView.tsx`

| Fix | Current | Target |
|-----|---------|--------|
| A-04 heading | `text-xl font-bold` | `text-xl font-semibold` |
| A-11 max-width | outer div has `max-w-2xl` on inner sections but no constraint on the page container | outer `flex flex-col items-center` div needs `max-w-3xl mx-auto w-full`. The inner `max-w-2xl` on the list and sparkline sections is appropriate and should remain. |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spinner animation | Custom CSS keyframes | `animate-spin` Tailwind utility | Already available in Tailwind v4, no custom CSS needed |
| Play/pause icon | External icon library | Inline SVG (two paths) | Established pattern from SparklineChart, no new dependency |
| Score color logic | CSS-only approach | Inline ternary in JSX className | Dynamic thresholds (40/70) can't be static CSS without custom Tailwind config |
| Focus ring styling | Custom outline CSS | `focus-visible:outline-*` utilities | Tailwind v4 has these as first-class utilities |

---

## Common Pitfalls

### Pitfall 1: Timeline marker offset not updated with new dot size

**What goes wrong:** Developer changes `w-3 h-3` to `w-4 h-4` but forgets to update the `left: calc(${leftPct}% - 6px)` style. The old offset was half of 12px = 6px; new offset must be half of 16px = 8px.
**Why it happens:** The style attribute is in a separate expression from the className.
**How to avoid:** When updating the dot size, always update the inline style offset in the same edit.
**Warning signs:** Markers visually shifted right by 2px.

### Pitfall 2: AnnotatedPlayer play/pause aria-label doesn't update

**What goes wrong:** Developer uses `videoRef.current?.paused` in render to determine aria-label, but ref reads don't trigger re-renders — label is stale.
**Why it happens:** React refs are mutable objects that bypass the render cycle.
**How to avoid:** Track `isPlaying` as `useState<boolean>`, updated via `onPlay` and `onPause` video event handlers. Use this state for both the aria-label and the icon selection.
**Warning signs:** Accessibility tree shows wrong label after clicking play.

### Pitfall 3: Score badge null-vs-string handling in SessionListItem

**What goes wrong:** `scoreDisplay` is `'—'` (string) when `session.scorecard === null`. If the ternary only checks `typeof scoreDisplay === 'number'`, it works. If it checks truthiness, `'—'` is truthy and gets classified as a score.
**Why it happens:** The value is either a number or the literal string `'—'`.
**How to avoid:** Gate the three-tier color logic on `session.scorecard !== null` (the raw source), not on `scoreDisplay`. Apply `bg-gray-700 text-gray-400` when `scorecard` is null.
**Warning signs:** Unscored sessions show emerald/amber/red badge instead of neutral gray.

### Pitfall 4: Tailwind v4 arbitrary value syntax for negative margin

**What goes wrong:** `-mx-[14px]` may not work in Tailwind v4 if the negative arbitrary value syntax differs.
**Why it happens:** Tailwind v4 changed some syntax from v3.
**How to avoid:** Verify with the established `w-3` → `w-4` change approach. If negative arbitrary margins don't work, use explicit padding instead: `p-[14px]` inside the button and `overflow-visible` on the parent. The goal is a 44×44px click area — padding approach is equally valid.
**Warning signs:** Build-time class not applied (check DevTools).

### Pitfall 5: Heading font-bold vs font-semibold in HistoryView h1

**What goes wrong:** HistoryView h1 already uses `text-xl` but still has `font-bold`. The spec changes it to `font-semibold`. Missing this makes typography inconsistent across pages.
**Why it happens:** HistoryView already happened to use the right size but the wrong weight.
**How to avoid:** Search all h1 elements for `font-bold` and replace with `font-semibold` uniformly.

### Pitfall 6: Processing spinner is inlined in App.tsx, not a component

**What goes wrong:** Developer creates a `ProcessingSpinner` component in a new file when the processing view is 6 lines of JSX inlined in App.tsx.
**Why it happens:** Instinct to componentize, but the view is not reused anywhere.
**How to avoid:** Edit the inline JSX block in App.tsx directly. No new file needed.

---

## Code Examples

### Score bar three-tier color (A-01)

```tsx
// src/components/ScorecardView/ScorecardView.tsx
function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

// In the render:
<div
  className={`h-2 rounded-full ${scoreBarColor(dim.score)}`}
  style={{ width: `${dim.score}%` }}
/>
```

### Timeline 44px touch target (A-02)

```tsx
// src/components/AnnotatedPlayer/Timeline.tsx
// Container: h-8 -> h-11
// Marker button with expanded tap area:
<button
  className={[
    "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400",
    "-mx-[14px] -my-[14px] px-[14px] py-[14px]",   // 16px visual + 28px padding = 44px total
    "z-10 hover:scale-150 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-300",
    nearest === event ? "ring-2 ring-amber-200 scale-125" : "",
  ].join(" ")}
  style={{ left: `calc(${leftPct}% - 8px)` }}   // offset = half of 16px
/>
```

### Delete button always-visible, keyboard-accessible (A-03)

```tsx
// src/components/SessionListItem/SessionListItem.tsx
<button
  type="button"
  aria-label="Delete session"
  onClick={(e) => { e.stopPropagation(); onDelete(); }}
  className="text-gray-600 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-colors text-lg leading-none px-2"
>
  ×
</button>
```

Note: `opacity-0 group-hover:opacity-100` and `transition-opacity` are removed.

### Processing spinner (A-05)

```tsx
// src/App.tsx — processing view
<div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 gap-4">
  <svg
    className="animate-spin w-8 h-8 text-gray-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
  <p className="text-sm text-gray-400">Processing your recording...</p>
</div>
```

### Play/pause overlay (A-09)

```tsx
// src/components/AnnotatedPlayer/AnnotatedPlayer.tsx
// Add isPlaying state:
const [isPlaying, setIsPlaying] = useState(false);

// Wrap video in relative+group div:
<div className="relative group w-full max-w-2xl">
  <video
    ref={videoRef}
    src={videoUrl}
    onTimeUpdate={handleTimeUpdate}
    onClick={handleVideoClick}
    onPlay={() => setIsPlaying(true)}
    onPause={() => setIsPlaying(false)}
    className="w-full rounded-xl bg-black cursor-pointer"
    aria-label="Session playback"
  />
  <button
    onClick={handleVideoClick}
    aria-label={isPlaying ? "Pause" : "Play"}
    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
  >
    {/* Inline SVG play or pause icon */}
    {isPlaying ? (
      <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
    ) : (
      <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    )}
  </button>
</div>
```

### Score badge color (A-07)

```tsx
// src/components/SessionListItem/SessionListItem.tsx
function scoreBadgeClass(scorecard: Session['scorecard']): string {
  if (scorecard === null) return 'bg-gray-700 text-gray-400';
  const s = scorecard.overall;
  if (s >= 70) return 'bg-emerald-900 text-emerald-300';
  if (s >= 40) return 'bg-amber-900 text-amber-300';
  return 'bg-red-900 text-red-300';
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `vite.config.ts` (test section inline) |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

Phase 5 has no new requirements IDs (UI polish sweeps existing components). Testing is verification that existing component tests still pass after class changes, plus new render assertions for the new interactive elements.

| Component Changed | Test Type | Automated Command | File Exists? |
|------------------|-----------|-------------------|--------------|
| ScorecardView (A-01) | unit/render | `npx vitest run src/components/ScorecardView/` | ✅ ScorecardView.test.tsx |
| Timeline (A-02) | unit/render | `npx vitest run src/components/AnnotatedPlayer/` | ✅ Timeline.test.tsx |
| SessionListItem (A-03, A-07) | unit/render | `npx vitest run src/components/SessionListItem/` | ❌ Wave 0 gap |
| AnnotatedPlayer (A-09) | unit/render | `npx vitest run src/components/AnnotatedPlayer/` | ✅ AnnotatedPlayer.test.tsx |
| SparklineChart (A-08) | unit/render | `npx vitest run src/components/SparklineChart/` | ✅ SparklineChart.test.tsx |
| StorageQuotaBar (A-01 copy) | unit/render | `npx vitest run src/components/StorageQuotaBar/` | ❌ Wave 0 gap |
| NameSessionModal (A-10, copy) | unit/render | `npx vitest run src/components/NameSessionModal/` | ✅ NameSessionModal.test.tsx |
| Home.tsx (A-04, A-12) | unit/render | `npx vitest run src/pages/` | ❌ Wave 0 gap |
| Review.tsx (A-04, A-11) | unit/render | `npx vitest run src/pages/` | ✅ Review.test.tsx |
| HistoryView.tsx (A-04, A-11) | unit/render | `npx vitest run src/pages/` | ✅ HistoryView.test.tsx |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=dot`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/SessionListItem/SessionListItem.test.tsx` — covers A-03 aria-label, A-07 score badge color logic
- [ ] `src/components/StorageQuotaBar/StorageQuotaBar.test.tsx` — covers copy strings, critical/warning color class presence
- [ ] `src/pages/Home.test.tsx` — covers A-04 heading class, A-12 footnote class, A-11 max-width class

---

## Open Questions

1. **StorageQuotaBar critical bar fill color**
   - What we know: UI-SPEC says "storage critical no longer uses red-600" (A-01). Current code uses `bg-red-600` for the critical fill bar.
   - What's unclear: The spec doesn't explicitly state the replacement color for the fill bar itself (only the warning text color is specified as `red-400`).
   - Recommendation: Use `bg-red-500` for the critical fill (one step lighter than CTA red-600, clearly distinct but still communicates urgency). This is a safe interpretation of the "not red-600" constraint.

2. **SpeechSupportBanner warning color consolidation**
   - What we know: Current is `bg-yellow-900/60 border-yellow-600 text-yellow-200`. SPEC says use `yellow-600` for border and text.
   - What's unclear: Whether to keep the `bg-yellow-900/60` background or remove it.
   - Recommendation: Keep the `bg-yellow-900/60` background for visual containment but change text from `text-yellow-200` to `text-yellow-600` per the SPEC warning token. If `yellow-600` on `yellow-900/60` has insufficient contrast, use `text-yellow-400` instead (still within warning palette). Verify visually.

3. **AnnotatedPlayer overlay button vs div**
   - What we know: The spec says "overlay button" with aria-label.
   - What's unclear: Whether the outer click handler on `<video>` and the overlay `<button>` will both fire on click, causing double-toggle.
   - Recommendation: Attach `handleVideoClick` only to the overlay button, and remove the `onClick` from the `<video>` element directly. The button covers the full video area, so all video clicks will route through the button.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — all component files read verbatim
- `05-UI-SPEC.md` — approved design contract with exact class-level specifications
- `vite.config.ts` — test runner configuration verified
- `package.json` — dependency versions verified

### Secondary (MEDIUM confidence)

- Tailwind v4 arbitrary value syntax (`-mx-[14px]`) — verified as valid v4 syntax from project's existing use of arbitrary values in the codebase

### Tertiary (LOW confidence)

- WCAG 2.5.8 target size minimum (24px minimum, 44px recommended) — cited in UI-SPEC; not independently re-verified against WCAG 2.2 spec in this research session

---

## Metadata

**Confidence breakdown:**
- Fix specifications: HIGH — UI-SPEC.md is fully locked and was approved before research
- File locations: HIGH — all source files read directly
- Tailwind v4 syntax: HIGH — project already uses v4, pattern established in codebase
- Test gap identification: HIGH — test directory inspected directly

**Research date:** 2026-03-15
**Valid until:** 2026-04-14 (stable stack — 30-day window)
