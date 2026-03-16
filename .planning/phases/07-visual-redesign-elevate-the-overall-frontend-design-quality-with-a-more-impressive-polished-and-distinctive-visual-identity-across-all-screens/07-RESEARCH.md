# Phase 7: Visual Redesign — Research

**Researched:** 2026-03-16
**Domain:** Frontend visual design — Tailwind v4, CSS custom properties, SVG, micro-interactions
**Confidence:** HIGH

## Summary

Phase 7 is a pure visual uplift with no new logic, no new dependencies, and no new routes. The UI-SPEC.md (07-UI-SPEC.md) is a fully-resolved, detailed design contract produced by the gsd-ui-researcher and gsd-ui-checker pipeline. Every color token, typography rule, spacing value, depth layer, micro-interaction timing, per-screen element spec, and copywriting string is already specified. The planner's job is to break this spec into discrete, reviewable plans — one per natural grouping — not to make design decisions.

The technical surface is plain Tailwind v4 utility classes on an existing React 19 + Vite 6 + TypeScript codebase. There is no design system to install, no component library to initialize, and no new packages to add. The implementation task is: (1) establish the CSS foundation (custom properties, Inter font, body rule), (2) apply updated Tailwind classes component-by-component per the per-screen contracts, (3) implement the two net-new elements that do not yet exist (SVG score ring, animated score bar width), and (4) validate via smoke testing that nothing regresses functionally.

The biggest implementation risk is that this phase touches all 9 UI surfaces in parallel. The planner must structure waves so each plan covers a cohesive surface and tests pass green at each wave boundary. Nothing in the design spec requires logic changes — all changes are className strings, inline SVG, CSS property values, and a font import.

**Primary recommendation:** Structure plans as: (1) CSS foundation + font, (2) Home/Setup screens, (3) RecordingScreen + processing state, (4) ScorecardView with SVG ring + animated bars, (5) AnnotatedPlayer/Timeline, (6) HistoryView + SessionListItem + StorageQuotaBar + SparklineChart, (7) modals (NameSessionModal + DeleteConfirmModal + SpeechSupportBanner).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | ^4.2.1 | Utility-class CSS | Already installed — Tailwind v4 with @tailwindcss/vite plugin (no config file) |
| @tailwindcss/vite | ^4.2.1 | Vite integration | Already installed — compiles Tailwind in the Vite pipeline |
| React | ^19.0.0 | UI rendering | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Inter (Google Fonts) | web font | Typography upgrade | Add `<link>` to index.html, apply in index.css body rule |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties in index.css | tailwind.config.js theme extension | v4 has no tailwind.config.js — CSS variables are the correct v4 pattern |
| Inline SVG score ring | react-circular-progressbar | No external dep needed; the spec calls for a simple circle with stroke-dasharray |
| Google Fonts CDN | Local font hosting | CDN is acceptable for a dev/local app; no privacy concern for single-user local-only app |

**Installation:**
```bash
# No new npm packages required.
# Font loaded via index.html <link> tags only.
```

---

## Architecture Patterns

### Recommended Project Structure
No structural changes needed. All changes are within existing files:
```
src/
├── index.css              # ADD: CSS custom properties, Inter font rule, body base
├── index.html             # ADD: Google Fonts preconnect + Inter @import link
├── pages/
│   ├── Home.tsx           # UPDATE: indigo CTA, feature list accent bars, wordmark
│   ├── Review.tsx         # UPDATE: card layout, indigo CTA, typography tokens
│   └── HistoryView.tsx    # UPDATE: card layout, list header, StorageQuotaBar placement
├── components/
│   ├── SetupScreen/SetupScreen.tsx     # UPDATE: wordmark, indigo CTA, preview card
│   ├── RecordingScreen/RecordingScreen.tsx  # UPDATE: black bg, display-size timer, red stop btn
│   ├── ScorecardView/ScorecardView.tsx # REPLACE overall score div with SVG ring, add width animation
│   ├── AnnotatedPlayer/AnnotatedPlayer.tsx  # UPDATE: player bg, CC button, caption bar
│   ├── AnnotatedPlayer/Timeline.tsx    # UPDATE: track height, colors, marker categories, tooltip style
│   ├── SessionListItem/SessionListItem.tsx  # UPDATE: card tokens, score badge, delete btn
│   ├── SparklineChart/SparklineChart.tsx   # UPDATE: stroke color indigo, no fill
│   ├── StorageQuotaBar/StorageQuotaBar.tsx # UPDATE: height, indigo fill, label placement
│   ├── NameSessionModal/NameSessionModal.tsx  # UPDATE: panel tokens, indigo CTA, skip link
│   ├── DeleteConfirmModal/DeleteConfirmModal.tsx # UPDATE: panel tokens, copywriting
│   └── common/SpeechSupportBanner.tsx  # UPDATE: amber-950 bg, amber-400 border
└── App.tsx                # UPDATE: processing spinner color, naming-screen wrapper bg
```

### Pattern 1: CSS Custom Properties as Color Tokens (Tailwind v4)
**What:** Define all color tokens as CSS custom properties in `@layer base` inside `src/index.css`. Use Tailwind v4 arbitrary value syntax `bg-[var(--color-bg)]` or `bg-[#080c14]` to reference them.
**When to use:** When the same hex value appears in multiple components (prevents typos, enables future theming).
**Example:**
```css
/* src/index.css */
@import "tailwindcss";

@layer base {
  :root {
    --color-bg: #080c14;
    --color-surface: #111827;
    --color-surface-raised: #1a2235;
    --color-accent: #6366f1;
    --color-accent-glow: rgba(99, 102, 241, 0.15);
    --color-border: rgba(255, 255, 255, 0.07);
    --color-border-hover: rgba(255, 255, 255, 0.12);
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #475569;
    --color-destructive: #ef4444;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-text-primary);
    font-family: 'Inter', system-ui, sans-serif;
  }
}
```

### Pattern 2: SVG Score Ring
**What:** Inline SVG `<circle>` with `stroke-dasharray` computed from score percentage. Self-contained in ScorecardView.
**When to use:** For the overall score display — replaces the current plain `<output>` number.
**Example:**
```tsx
// Radius 54, circumference = 2π * 54 ≈ 339.3
const RADIUS = 54;
const CIRC = 2 * Math.PI * RADIUS;

<svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
  {/* Track ring */}
  <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#1a2235" strokeWidth="6" />
  {/* Score fill — indigo, rotated -90deg from top */}
  <circle
    cx="60" cy="60" r={RADIUS}
    fill="none"
    stroke="#6366f1"
    strokeWidth="6"
    strokeLinecap="round"
    strokeDasharray={CIRC}
    strokeDashoffset={CIRC - (score / 100) * CIRC}
    style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px',
             filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.4))' }}
  />
</svg>
{/* Score number centered below/over ring */}
<output aria-label="Overall score"
  className="absolute inset-0 flex items-center justify-center text-5xl font-semibold tabular-nums text-[#f1f5f9]">
  {scorecard.overall}
</output>
```

### Pattern 3: Animated Score Bar Width
**What:** Apply `transition-all duration-300 ease-out` on the score bar fill div. Tailwind handles the CSS transition; the bar starts at `width: 0%` before mount and jumps to the score percentage via a `useEffect`-driven state.
**When to use:** ScorecardView dimension bars — spec requires "animate width from 0 on mount (300ms ease-out)".
**Example:**
```tsx
const [animated, setAnimated] = useState(false);
useEffect(() => {
  // RAF ensures the 0% renders first, then the score triggers the transition
  requestAnimationFrame(() => setAnimated(true));
}, []);

<div
  className="h-1 rounded-full transition-all duration-300 ease-out bg-emerald-500"
  style={{ width: animated ? `${dim.score}%` : '0%' }}
/>
```

### Pattern 4: motion-safe Transitions
**What:** Wrap all transition utilities with `motion-safe:` prefix to respect `prefers-reduced-motion`.
**When to use:** All interactive transitions — card hover, CTA glow, tooltip appear, score bar animation.
**Example:**
```tsx
// Card hover
className="motion-safe:transition-colors motion-safe:duration-150 hover:bg-[#1a2235]"

// CTA button glow on hover
className="motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
```

### Pattern 5: Tailwind v4 Arbitrary Values for Design Tokens
**What:** Tailwind v4 supports `bg-[#080c14]`, `border-[rgba(255,255,255,0.07)]`, `shadow-[0_25px_50px_rgba(0,0,0,0.6)]` without a config file.
**When to use:** Everywhere a custom hex value from the design system appears.
**Note:** CSS variables can also be used: `bg-[var(--color-bg)]` if the variable is defined in index.css.

### Pattern 6: Font Loading via index.html
**What:** Add Google Fonts preconnect and stylesheet link in `<head>` of `index.html`.
**Example:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
```
Then in index.css body rule: `font-family: 'Inter', system-ui, sans-serif;`

### Pattern 7: Timeline Marker Color by Category
**What:** The current Timeline.tsx uses a single `bg-amber-400` for all markers. The spec requires category-based colors (filler=amber-400, eye_contact=indigo-400, gesture=red-400, pause=slate-400).
**When to use:** In Timeline.tsx marker rendering.
**Example:**
```tsx
function markerColor(event: SessionEvent): string {
  if (event.type === 'filler_word') return '#fbbf24';         // amber-400
  if (event.type === 'eye_contact_break' || event.type === 'eye_contact_resume') return '#818cf8'; // indigo-400
  if (event.type === 'face_touch' || event.type === 'body_sway') return '#f87171'; // red-400
  if (event.type === 'pause_detected') return '#94a3b8';      // slate-400
  return '#94a3b8'; // default slate-400
}
// Use as inline style: style={{ backgroundColor: markerColor(event) }}
// (Tailwind JIT cannot generate from dynamic string interpolation)
```

### Anti-Patterns to Avoid
- **Dynamic Tailwind class names via string interpolation:** Tailwind v4 JIT cannot detect `bg-${colorVar}` — use inline `style` prop or pre-defined class strings for data-driven colors (marker categories, score bar colors).
- **Stacking box-shadows:** Spec explicitly forbids shadow stacking. One glow max per element.
- **Using red for CTAs:** red-600 is retired as a CTA color. Red is strictly for the Stop Recording button and destructive actions only.
- **Adding JS animation libraries:** Spec mandates CSS transitions via Tailwind only for this phase.
- **Weight creep beyond 400/600:** Spec permits only two weights. Do not introduce 700 or 500.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular progress ring | Custom canvas animation | Inline SVG with stroke-dasharray | SVG stroke-dasharray is the standard pattern; simple, no dependencies |
| Width animation | JS-driven requestAnimationFrame loop | CSS transition with single `useEffect` RAF trigger | Simpler, respects reduced-motion, no overhead |
| Tabular numerals | Custom digit rendering | `tabular-nums` Tailwind class (CSS font-variant-numeric) | Native CSS, zero cost |
| Focus ring | Custom :focus CSS | Tailwind `focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2` | Already the established pattern in the codebase |
| Responsive font size | JS viewport calculation | Tailwind `text-5xl` / `text-sm` utilities | CSS is sufficient |

**Key insight:** Every spec'd visual element has a native CSS or minimal JSX solution. No element in this phase justifies an external library.

---

## Common Pitfalls

### Pitfall 1: Dynamic Tailwind Class Strings Not Purged
**What goes wrong:** Writing `className={`bg-${semanticColor}`}` results in the class never being generated by Tailwind v4's JIT.
**Why it happens:** Tailwind scans source text statically — it cannot resolve template literal expressions.
**How to avoid:** For data-driven colors (marker category colors, score badge colors), use the `style` prop with inline hex values OR use a function that returns a full static class string from a predefined map.
**Warning signs:** Class is applied but color doesn't render in browser.

### Pitfall 2: Tailwind v4 No-Config Surprises
**What goes wrong:** Trying to use `@apply` with custom theme tokens or adding a `tailwind.config.js` alongside v4 plugin.
**Why it happens:** v4 uses a different architecture — configuration lives in CSS, not JS.
**How to avoid:** Use CSS custom properties in `@layer base` as established in the spec. Do not create `tailwind.config.js`. Use `@import "tailwindcss"` as the sole entry point (already in index.css).
**Warning signs:** Custom tokens not resolving, `@apply` failing on custom values.

### Pitfall 3: Score Ring Coordinate System
**What goes wrong:** The SVG circle ring appears to start at the wrong position (3 o'clock instead of 12 o'clock).
**Why it happens:** SVG stroke-dashoffset draws from the 3 o'clock position by default.
**How to avoid:** Apply `transform: rotate(-90deg)` centered on the circle's origin (transform-origin must be the circle center, not 0,0). The spec pattern shows `transformOrigin: '60px 60px'` for a 120px viewBox.
**Warning signs:** Ring starts filling from the right side instead of the top.

### Pitfall 4: `motion-safe:` Class + Paired Transition Property
**What goes wrong:** Using `motion-safe:transition-colors` without also specifying `motion-safe:duration-*` — duration defaults vary.
**Why it happens:** Tailwind separates transition shorthand into individual utilities.
**How to avoid:** Always pair `motion-safe:transition-{property}` with `motion-safe:duration-{ms}`.
**Warning signs:** Transitions appear instant or overly long.

### Pitfall 5: Score Bar Animation on Re-render
**What goes wrong:** Bar re-animates from 0% every time the parent re-renders.
**Why it happens:** State reset on each render cycle.
**How to avoid:** The `animated` state in the ScorecardView should be local to the component and triggered once on mount via `useEffect(() => { requestAnimationFrame(() => setAnimated(true)); }, [])`. Empty dependency array ensures single trigger.
**Warning signs:** Bar flashes to 0 and re-draws when clicking around the review page.

### Pitfall 6: Inter Font Not Loading in Tests
**What goes wrong:** Vitest/jsdom does not load web fonts — font-related snapshot tests may fail or show system font.
**Why it happens:** jsdom has no font rendering capability.
**How to avoid:** Tests should not snapshot computed font rendering. Font loading is a smoke/visual concern only — verify in browser, not in Vitest.
**Warning signs:** Tests pass but visual inspection shows system font.

### Pitfall 7: `#080c14` Background Not Full-Viewport
**What goes wrong:** Some screens have a lighter gray-950 fallback in a wrapper div that shows through at the edges.
**Why it happens:** The `bg-gray-950` class on wrapper divs remains from prior phases.
**How to avoid:** Each per-screen component's outermost div must use `bg-[#080c14]` (or `bg-[var(--color-bg)]` if CSS variable is set). The body rule in index.css also provides a base layer.
**Warning signs:** Visible color seam between body background and component background.

---

## Code Examples

### Inter Font in index.html
```html
<!-- Source: Google Fonts documentation -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

### CSS Foundation in index.css
```css
/* Source: Tailwind v4 CSS-first configuration pattern */
@import "tailwindcss";

@layer base {
  :root {
    --color-bg: #080c14;
    --color-surface: #111827;
    --color-surface-raised: #1a2235;
    --color-accent: #6366f1;
    --color-border: rgba(255, 255, 255, 0.07);
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #475569;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-text-primary);
    font-family: 'Inter', system-ui, sans-serif;
  }
}
```

### CTA Button (indigo with hover glow)
```tsx
// Source: 07-UI-SPEC.md CTA button contract
<button
  onClick={onStart}
  className="px-8 h-[52px] bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold rounded-xl
             motion-safe:transition-shadow motion-safe:duration-200
             hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]
             active:scale-[0.98] motion-safe:active:transition-transform motion-safe:active:duration-75
             focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-2"
>
  Start Recording
</button>
```

### Card Layout Token
```tsx
// Source: 07-UI-SPEC.md Depth and Layering Contract
<div className="bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl p-4
                motion-safe:transition-colors motion-safe:duration-150
                hover:bg-[#1a2235] hover:border-[rgba(255,255,255,0.12)]">
  {/* card content */}
</div>
```

### Score Badge (semantic color at 15% opacity)
```tsx
// Source: 07-UI-SPEC.md HistoryView / SessionListItem
function scoreBadgeStyle(score: number): React.CSSProperties {
  if (score >= 70) return { backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' };
  if (score >= 40) return { backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
  return { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' };
}
```

### Timeline Marker with Category Color
```tsx
// Source: 07-UI-SPEC.md AnnotatedPlayer / Timeline
function markerBg(event: SessionEvent): string {
  if (event.type === 'filler_word') return '#fbbf24';
  if (event.type.startsWith('eye_contact')) return '#818cf8';
  if (event.type === 'face_touch' || event.type === 'body_sway') return '#f87171';
  return '#94a3b8';
}

// In the button element:
style={{ left: `calc(${leftPct}% - 8px)`, backgroundColor: markerBg(event) }}
// Remove static bg-amber-400 class
```

### SpeechSupportBanner (amber warning)
```tsx
// Source: 07-UI-SPEC.md SpeechSupportBanner contract
<div
  role="status"
  className="w-full bg-[#451a03] border-l-[3px] border-amber-400 text-amber-200 text-sm px-4 py-3 rounded-r-lg"
>
  {/* content */}
  <button className="text-amber-400 text-xs -mx-[14px] -my-[14px] px-[14px] py-[14px]" aria-label="Dismiss">×</button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js theme config | CSS custom properties in @layer base | Tailwind v4 (2024) | No config file needed |
| `bg-gray-950` as dark base | `bg-[#080c14]` arbitrary or CSS var | Phase 7 | More distinctive brand color |
| `bg-red-600` primary CTA | `bg-[#6366f1]` indigo CTA | Phase 7 | Red freed for destructive-only |
| Plain `<output>` overall score | SVG ring with stroke-dasharray | Phase 7 | Visual hierarchy |
| Flat `bg-amber-400` all markers | Category-colored markers | Phase 7 | Information density |
| Static score bars | Animated width on mount | Phase 7 | Polish |
| System font stack | Inter 400 + 600 | Phase 7 | Typographic identity |

**Deprecated/outdated:**
- `bg-gray-950` as the page background: replaced by `bg-[#080c14]` / `var(--color-bg)` — gray-950 = #030712, spec wants #080c14 (warmer blue-slate)
- `bg-red-600` on CTA buttons: retired; red is strictly destructive from Phase 7 forward (STATE.md [05-02] decision extended)
- `text-8xl font-mono font-light` on RecordingScreen timer: replaced by Display size `text-5xl font-semibold tabular-nums`
- `bg-gray-800`/`bg-gray-900` card surfaces: replaced by `bg-[#111827]` (surface) and `bg-[#1a2235]` (surface-raised)

---

## Current Component Inventory (Before Phase 7)

Complete map of what needs to change per file, derived from reading each component:

| File | Current State | Phase 7 Change Needed |
|------|--------------|----------------------|
| `index.html` | No font link | Add Inter preconnect + font link |
| `src/index.css` | `@import "tailwindcss"` only | Add @layer base with CSS custom props + body rule |
| `src/pages/Home.tsx` | gray-950 bg, red-600 CTA, plain feature list | Indigo CTA, indigo accent bars on `<li>`, wordmark with 2px indigo underline |
| `src/pages/Review.tsx` | gray-950 bg, red-600 CTA, underlined Back link | Indigo CTA, remove underline from Back link, add card wrapper for ScorecardView |
| `src/pages/HistoryView.tsx` | gray-950 bg, red-600 CTAs, column header row | Indigo CTAs, remove column header row, list header with storage bar right-aligned |
| `src/components/SetupScreen/SetupScreen.tsx` | gray-950 bg, red-600 CTA, plain h1 | Indigo CTA, wordmark with indigo accent, preview card update |
| `src/components/RecordingScreen/RecordingScreen.tsx` | gray-950 bg, text-8xl mono timer, gray-800 stop btn | Black bg, text-5xl semibold tabular-nums timer, red-500 stop btn |
| `src/components/ScorecardView/ScorecardView.tsx` | text-3xl overall score, static bars | SVG ring (120px, indigo stroke, glow), animated bar width |
| `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx` | bg-black rounded video, gray-700 CC btn | #111827 player bg, indigo CC active state, caption bar overlay style |
| `src/components/AnnotatedPlayer/Timeline.tsx` | 44px h-11 track, bg-gray-800, all-amber markers | 8px h-2 track, #1a2235 bg, category colors via inline style, tooltip restyle |
| `src/components/SessionListItem/SessionListItem.tsx` | gray-900 card, colored badge classes, gray-600 delete | #111827 card, 1px border, badge as inline style, red-500 delete text |
| `src/components/SparklineChart/SparklineChart.tsx` | amber-400 stroke | #6366f1 indigo stroke, indigo dots |
| `src/components/StorageQuotaBar/StorageQuotaBar.tsx` | h-1 track, gray-600 fill (normal state) | h-1.5 (6px) track, indigo fill for normal, label below bar |
| `src/components/NameSessionModal/NameSessionModal.tsx` | gray-900 panel, red-600 save btn, red focus border | #111827 panel, 1px border, 20px radius, indigo save btn, indigo focus ring |
| `src/components/DeleteConfirmModal/DeleteConfirmModal.tsx` | gray-900 panel, red-600 confirm btn, gray-700 cancel | #111827 panel, 1px border, updated copywriting per spec |
| `src/components/common/SpeechSupportBanner.tsx` | yellow-900/60 bg, yellow-600 border | #451a03 bg, amber-400 left border 3px, amber-200 text |
| `src/App.tsx` | gray-400 spinner, gray-950 naming wrapper | Spinner color update, naming wrapper bg update |

---

## Open Questions

1. **Timeline height change: regression risk**
   - What we know: Current Timeline is `h-11` (44px) with markers centered in the full-height click area. Spec calls for 8px visual track with 48px scrubber hit area.
   - What's unclear: Existing click-to-seek logic hits the outer div — changing to 8px track height changes where click events register.
   - Recommendation: Keep the outer clickable div at h-12 (48px) for hit area, but visually style only an 8px inner bar. Use absolute positioning for the 8px track within a taller transparent wrapper. The existing negative-margin tap-area expansion on markers (STATE.md [05-03]) should be preserved.

2. **SpeechSupportBanner dismiss button**
   - What we know: Current implementation has no dismiss button — it's always visible when shown.
   - What's unclear: The spec's "Dismiss: amber-400 text, 13px, '×' button with 44px tap target" implies a dismiss button should be added.
   - Recommendation: Add a `useState<boolean>` dismissed state and render null when dismissed. This is a small logic addition required to honor the spec.

3. **Font weight 600 vs. existing `font-bold` (700)**
   - What we know: Spec caps weights at 400 and 600. Several components currently use `font-bold` (700): NameSessionModal h2, DeleteConfirmModal h2, SessionListItem score badge.
   - What's unclear: None — these must be changed to `font-semibold` (600).
   - Recommendation: Track down all `font-bold` occurrences and replace with `font-semibold` during the per-component passes.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 + @testing-library/react ^16.3.2 |
| Config file | `vite.config.ts` (test section, pool: vmThreads) |
| Quick run command | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

This phase has no new functional requirements — all changes are visual. Testing strategy is:

| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| All existing tests continue to pass after className changes | regression | `npx vitest run` | Critical gate — verify after each plan |
| SVG ring renders with correct aria-label | unit | `npx vitest run --reporter=verbose src/components/ScorecardView/ScorecardView.test.tsx` | Update existing test for new markup |
| Score bar renders with role="meter" | unit | same as above | Existing test coverage |
| Timeline markers have correct aria-labels | unit | `npx vitest run --reporter=verbose src/components/AnnotatedPlayer/Timeline.test.tsx` | Existing coverage; marker color change is inline style — no label change |
| NameSessionModal dismiss/skip interactions | unit | `npx vitest run --reporter=verbose src/components/NameSessionModal/NameSessionModal.test.tsx` | No logic change; visual only |
| SpeechSupportBanner dismiss button (new) | unit | `npx vitest run --reporter=verbose src/components/common/SpeechSupportBanner.test.tsx` | Wave 0 gap if dismiss is added |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose 2>&1 | tail -30` — confirm no regressions
- **Per wave merge:** `npx vitest run` — full suite green
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] If SpeechSupportBanner gains dismiss button: add test for click-to-dismiss in `SpeechSupportBanner.test.tsx`

---

## Sources

### Primary (HIGH confidence)
- `07-UI-SPEC.md` — Complete per-screen design contracts, color system, typography, depth layers, micro-interactions, copywriting
- `src/` codebase audit — Full read of all 17 affected files, complete understanding of current className state
- `STATE.md` decisions — Locked tech choices: Tailwind v4, no tailwind.config.js, Inter system font, red-strictly-destructive rule
- `package.json` — Confirmed versions: Tailwind v4.2.1, React 19, Vite 6.3.1, Vitest 4.1.0
- Tailwind v4 documentation pattern — CSS-first configuration via `@layer base` in index.css

### Secondary (MEDIUM confidence)
- Google Fonts CDN pattern — Standard `<link rel="preconnect">` + stylesheet approach
- SVG stroke-dasharray circular progress pattern — Well-established CSS/SVG technique

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Current codebase state: HIGH — all files read directly
- Design spec: HIGH — UI-SPEC.md is complete and checker-reviewed
- Implementation patterns: HIGH — all patterns are standard Tailwind v4 / React / SVG
- Test strategy: HIGH — existing test infrastructure is known; this phase adds no new logic

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable tech stack)
