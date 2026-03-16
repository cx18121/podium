# Phase 3 — UI Review

**Audited:** 2026-03-15
**Baseline:** 03-UI-SPEC.md (approved design contract)
**Screenshots:** Captured (desktop 1440×900, mobile 375×812) — dev server at localhost:3000

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All contract copy correct; "Back to History" button added post-spec without a matching copywriting contract entry |
| 2. Visuals | 4/4 | Clear focal point hierarchy; score bars, overall score display, and play-on-click video all behave per spec |
| 3. Color | 4/4 | No hardcoded hex values; red/amber accent usage confined to spec-declared elements only |
| 4. Typography | 4/4 | Exactly 3 sizes (text-sm, text-2xl, text-3xl) and 1 weight (font-bold) — within declared scale |
| 5. Spacing | 3/4 | `gap-1` (4px) used for inner rows is off-scale per spec (smallest declared unit is xs=4px/p-1 which is permitted, but `gap-1` is not listed in the spacing table) |
| 6. Experience Design | 4/4 | Loading, error, empty-timeline, no-data dimension, and scorecard persistence states all present with correct ARIA |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **"Back to History" button has no UI-SPEC copywriting entry** — a user navigating from history to review sees this button, but it was added in Phase 3 without being declared in the copywriting contract — add it to 03-UI-SPEC.md copywriting table so Phase 4 checkers have a source of truth, and verify the label matches Phase 4 navigation intent.
2. **`gap-1` (4px) not in declared spacing scale** — `gap-1` appears on the overall-score div and each dimension row's inner layout (`flex flex-col gap-1`); the spec's spacing table starts at xs=4px but maps xs to `p-1` / icon gaps, not `gap-*` — replace with `gap-0` (no gap, rely on block stacking) or declare `gap-1` explicitly in the spacing exception list.
3. **Timeline `role="progressbar"` lacks an `aria-label`** — the outer timeline bar carries `role="progressbar"` with `aria-valuenow/min/max` but no `aria-label` or `aria-labelledby`, making it anonymous for screen readers — add `aria-label="Playback timeline"` to the Timeline outer div per the Accessibility Contract's expected labeling pattern.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

All copywriting contract entries are implemented verbatim:

- "Your Session Scorecard" — `ScorecardView.tsx:28` ✓
- "Overall Score" — `ScorecardView.tsx:35` ✓
- "Calculating scores..." — `ScorecardView.tsx:20` ✓
- "Insufficient data" fallback — `ScorecardView.tsx:45` ✓
- Dimension labels: Eye Contact, Filler Words, Pacing, Expressiveness, Nervous Gestures — `ScorecardView.tsx:8-14` ✓
- `eventLabel()` tooltip strings — `Timeline.tsx:12-21` all match spec exactly ✓
- "Record Another Session" — `Review.tsx:86` ✓
- "Session not found." — `Review.tsx:22` ✓
- "Could not load session. Try recording again." — `Review.tsx:43` ✓

**Minor gap:** `Review.tsx:93` renders a "Back to History" button when the `onBack` prop is provided. This label is not in the UI-SPEC copywriting table. It was introduced as part of Phase 4 integration work (the `onBack?` optional prop). The copy itself is clear and on-voice, but it lacks a spec entry. Score held at 3 rather than 1 because the copy quality is acceptable; the gap is documentation-level.

No generic labels ("Submit", "OK", "Cancel") found. No empty-state copy violations.

### Pillar 2: Visuals (4/4)

Visual hierarchy is well-structured:

- **Focal point:** Overall score renders at `text-3xl font-bold` (Display size) centered above the dimension rows — the largest element on the scorecard card establishes an unambiguous focal point.
- **Icon-only buttons:** No icon-only buttons in Phase 3. All interactive elements have visible text labels or `title`/`aria-label` attributes (marker dots have both `title` and `aria-label`).
- **Visual hierarchy:** Three tiers — session title (`text-2xl font-bold`), metadata line (`text-sm text-gray-400`), scorecard card with nested overall score Display → dimension rows Label. Clear size and color differentiation at each level.
- **Score bars:** `bg-gray-700` track with `bg-red-600` fill provides sufficient contrast on `bg-gray-900` card. `h-2 rounded-full` pill style is consistent with the spec's described shape.
- **Video player:** No native browser controls visible (no `controls` attribute on `<video>` — `AnnotatedPlayer.tsx:41`). Timeline sits below video as a separate row, not overlaid.
- **Marker dots:** `w-3 h-3 rounded-full bg-amber-400 z-10` — amber amber is visually distinct from the red CTA, and `z-10` ensures dots render above the progress fill.

No issues found.

### Pillar 3: Color (4/4)

No hardcoded hex or rgb values in any Phase 3 component file.

Accent color usage is confined to spec-declared elements:

| Accent | Where Used | Spec-declared? |
|--------|-----------|---------------|
| `bg-red-600 hover:bg-red-500` | "Record Another Session" button (`Review.tsx:84`) | Yes — CTA button |
| `bg-red-600` | Score bar fill (`ScorecardView.tsx:55`) | Yes — score bar fill |
| `text-red-400` | Error state text (`Review.tsx:52`) | Yes — error text |
| `bg-amber-400` | Timeline marker dots (`Timeline.tsx:59`) | Yes — marker dots exclusively |
| `focus:ring-amber-300` | Marker focus ring (`Timeline.tsx:60`) | Yes — amber focus ring |

Color distribution across page: `bg-gray-950` dominant background, `bg-gray-900` card, `bg-gray-800` timeline bar, `bg-gray-700` score track, `bg-gray-600` progress fill — all within the declared secondary palette. No accent bleed onto decorative elements.

### Pillar 4: Typography (4/4)

Font sizes in Phase 3 scope (excluding pre-existing components):

| Class | Count | Declared Role |
|-------|-------|--------------|
| `text-sm` (14px) | 6 | Label — dimension names, detail, metadata line, scorecard heading |
| `text-3xl` (32px) | 2 | Display — overall score number |
| `text-2xl` (24px) | 1 | Heading — session title |

Three sizes is within the declared 4-size maximum. `text-4xl` (Home.tsx) is out of scope for Phase 3 and is not present here.

Font weights: only `font-bold` (700) found — 3 instances on overall score, session title, and CTA button. The spec declares `font-bold` for all three of these elements. No `font-semibold`, `font-medium`, or other off-spec weights.

"Record Another Session" button correctly uses `font-bold` (not `font-semibold` which was the prior stub value — `Review.tsx:84`).

### Pillar 5: Spacing (3/4)

Spacing tokens in use across Phase 3 components:

| Class | Tailwind | Pixel | In Spec? |
|-------|----------|-------|---------|
| `p-6` | 24px | lg | Yes |
| `p-8` | 32px | xl | Yes |
| `px-6 py-3` | 24px/12px | lg/— | px-6 Yes; py-3 = 12px, off-scale |
| `gap-6` | 24px | lg | Yes |
| `gap-4` | 16px | md | Yes |
| `gap-2` | 8px | sm | Yes |
| `gap-1` | 4px | xs | Not listed in gap tokens |

**`py-3` (12px):** The spec explicitly notes "do not use `py-2.5` (not a multiple of 4)" but `py-3` (12px) is also not a multiple of 4 and is not in the spacing scale. It appears on the CTA button (`Review.tsx:84`). Impact is low (visual button height is acceptable), but it is a minor spacing scale deviation.

**`gap-1` (4px):** Used for inner-card layout at `ScorecardView.tsx:31` and `ScorecardView.tsx:42`. The spec lists xs=4px but maps it to `p-1` and icon gaps — `gap-1` is not explicitly in the spacing table. The intent is clearly correct (tight inner stacking), but it should be added to the exceptions list or swapped for a spec-listed value.

No arbitrary `[Npx]` or `[Nrem]` values found. Overall spacing is highly consistent and within the spirit of the spec.

### Pillar 6: Experience Design (4/4)

All five required state categories are covered:

**Loading states:**
- `ScorecardView.tsx:19` — `aria-busy="true"` div with "Calculating scores..." while scorecard prop is null
- `Review.tsx:60` — `aria-busy="true"` loading screen while session/videoUrl are null

**Error states:**
- `Review.tsx:52` — `role="alert"` container for both "Session not found." and "Could not load session. Try recording again."

**Empty states:**
- Timeline renders bar-only when `events.length === 0` — no crash, no empty message (correct per spec: "No copy — render bar only")
- ScorecardView renders "Insufficient data" detail string when `dim.detail` is nullish

**No-data defaults:**
- `aggregateScores` returns score=50 for all dimensions when no relevant events exist — avoids penalizing short sessions

**Scorecard persistence (SCORE-03):**
- First view: computes + persists to Dexie; subsequent views: re-runs aggregation for rich display objects without overwriting stored flat numbers — correct idempotent pattern at `Review.tsx:27-42`

**Object URL cleanup:**
- `URL.revokeObjectURL(objectUrl)` called in useEffect cleanup using local variable, not stale state closure — no memory leak (`Review.tsx:46`)

**ARIA coverage:**
- `role="meter"` on all 5 score bar fills with `aria-valuenow/min/max/label` ✓
- `<output aria-label="Overall score">` for computed overall score ✓
- `role="progressbar"` on timeline with `aria-valuenow/min/max` ✓ — **missing `aria-label`** (see Top 3 Fix #3)
- `aria-label="Session playback"` on video element ✓
- `role="alert"` on error container ✓
- `aria-busy="true"` on both loading containers ✓
- Marker buttons: `title` + `aria-label` identical, both use `eventLabel()` ✓

---

## Registry Safety

Registry audit: no shadcn initialized (`components.json` not found). No third-party registries declared in UI-SPEC. Audit skipped — not applicable.

---

## Files Audited

- `src/components/ScorecardView/ScorecardView.tsx`
- `src/components/AnnotatedPlayer/AnnotatedPlayer.tsx`
- `src/components/AnnotatedPlayer/Timeline.tsx`
- `src/components/AnnotatedPlayer/eventSync.ts`
- `src/pages/Review.tsx`
- `.planning/phases/03-post-session-review/03-UI-SPEC.md`
- `.planning/phases/03-post-session-review/03-01-SUMMARY.md`
- `.planning/phases/03-post-session-review/03-02-SUMMARY.md`
- `.planning/phases/03-post-session-review/03-03-SUMMARY.md`
- Screenshots: `.planning/ui-reviews/03-20260315-202646/desktop.png`, `mobile.png`
